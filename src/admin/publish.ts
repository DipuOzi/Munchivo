/* ------------------------------------------------------------------------ */
/* Publish pipeline: admin changes -> GitHub -> live site                    */
/*                                                                            */
/* The deployment is static (Vercel), so the only shared storage any visitor  */
/* can see is the git repository the site is built from. When the admin       */
/* edits, this module:                                                        */
/*   1. turns every image the content references (`@idb:` blobs or legacy     */
/*      inline data URLs) into a staged git blob on GitHub,                   */
/*   2. rewrites those references to permanent `/uploads/...` file paths,     */
/*   3. commits the content JSON to `public/content/site-content.json`.       */
/* Vercel then rebuilds automatically and every browser loads the new content.*/
/*                                                                            */
/* localStorage keeps working exactly as before so edits appear instantly in  */
/* the current browser while the deploy runs in the background.               */
/* ------------------------------------------------------------------------ */

import { blobForRef, REF_PREFIX } from "./imageStore";
import { ADMIN_CODE } from "./adminCode";
import type { SiteContent } from "../content/defaults";

const API_URL = "/api/publish";
const REGISTRY_KEY = "munchivo-upload-registry-v1";
/** Debounce: don't fire a commit for every keystroke burst. */
const PUBLISH_DEBOUNCE_MS = 2600;

export type PublishState = {
  state: "idle" | "uploading" | "committing" | "published" | "failed" | "local-only";
  message?: string;
};

type StagedFile = { path: string; sha: string };
type Registry = Record<string, StagedFile>;

/* ------------------------------- status ------------------------------- */

let status: PublishState = { state: "idle" };
const listeners = new Set<(next: PublishState) => void>();

function setStatus(next: Partial<PublishState> & Pick<PublishState, "state">) {
  status = { ...status, ...next };
  for (const listener of listeners) listener(status);
}

/** Subscribes (for React). Returns an unsubscribe function. */
export function onPublishStatus(listener: (next: PublishState) => void): () => void {
  listeners.add(listener);
  listener(status);
  return () => listeners.delete(listener);
}

/* ------------------------------ registry ------------------------------ */

function readRegistry(): Registry {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    return raw ? (JSON.parse(raw) as Registry) : {};
  } catch {
    return {};
  }
}

function writeRegistry(registry: Registry) {
  try {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry));
  } catch {
    // Registry persistence is best-effort: a lost entry just re-uploads the file.
  }
}

/** Ref ids whose staged file paths appear in a content object (for image-store pruning). */
export function registeredPathsInUse(): Array<{ refId: string; path: string }> {
  const registry = readRegistry();
  return Object.entries(registry).map(([refId, file]) => ({ refId, path: file.path }));
}

/* ------------------------------- crypto-ish ---------------------------- */

function hashString(value: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function extensionFor(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("svg")) return "svg";
  return "jpg";
}

function bytesToBase64(bytes: Uint8Array | ArrayBuffer): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < view.length; i += chunk) {
    binary += String.fromCharCode(...view.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function blobToBase64(blob: Blob): Promise<string> {
  return bytesToBase64(await blob.arrayBuffer());
}

/* ------------------------------ git staging ---------------------------- */

async function stageBlob(payload: { base64: string; mime: string }): Promise<string> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-code": ADMIN_CODE },
    body: JSON.stringify({ action: "stage-image", base64: payload.base64, mime: payload.mime }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error ?? `Image upload failed (${response.status})`);
  return result.sha as string;
}

/**
 * Returns the staged {path, sha} for an image payload, uploading it once.
 * Files already staged (recorded in the registry) are skipped.
 */
async function ensureStaged(key: string, mime: string, base64: string): Promise<StagedFile> {
  const registry = readRegistry();
  const known = registry[key];
  if (known?.sha && known?.path) return known;

  const sha = await stageBlob({ base64, mime });
  const file: StagedFile = { path: `public/uploads/${key.replace(REF_PREFIX, "")}.${extensionFor(mime)}`, sha };
  const next = readRegistry();
  next[key] = file;
  writeRegistry(next);
  return file;
}

/**
 * Rewrites image references into repository file paths. Returns the content
 * tree ready for commit plus every file that needs to be committed with it.
 */
async function materialize(content: SiteContent): Promise<{ files: StagedFile[]; serverContent: SiteContent }> {
  const filesByPath = new Map<string, StagedFile>();

  const walk = async (value: unknown): Promise<unknown> => {
    if (typeof value === "string") {
      // Uploaded images stored in IndexedDB on this browser.
      if (value.startsWith(REF_PREFIX)) {
        const existing = readRegistry()[value];
        if (existing?.sha && existing?.path) return existing.path;
        const record = await blobForRef(value);
        if (!record) return value; // Blob lost locally; keep the ref untouched.
        const file = await ensureStaged(value, record.type || "image/jpeg", await blobToBase64(record.blob));
        filesByPath.set(file.path, file);
        return file.path;
      }
      // Legacy inline data URLs (only present when storage-shrinking failed).
      if (value.startsWith("data:image/") && value.length > 8_000) {
        const mime = value.slice(5, value.indexOf(";")) || "image/jpeg";
        const staged = await ensureStaged(`${REF_PREFIX}sha-${hashString(value)}`, mime, value.slice(value.indexOf(",") + 1));
        filesByPath.set(staged.path, staged);
        return staged.path;
      }
      return value;
    }
    if (Array.isArray(value)) return Promise.all(value.map(walk));
    if (value && typeof value === "object") {
      const result: Record<string, unknown> = {};
      for (const [childKey, child] of Object.entries(value)) result[childKey] = await walk(child);
      return result;
    }
    return value;
  };

  const serverContent = (await walk(content)) as SiteContent;
  return { files: [...filesByPath.values()], serverContent };
}

async function commit(content: SiteContent): Promise<void> {
  setStatus({ state: "uploading", message: undefined });
  const { files, serverContent } = await materialize(content);
  setStatus({ state: "committing", message: files.length ? `${files.length} image${files.length === 1 ? "" : "s"} uploading…` : undefined });

  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-code": ADMIN_CODE },
    body: JSON.stringify({
      action: "commit-content",
      content: serverContent,
      files,
      message: `Admin update — content edit (${new Date().toISOString().slice(0, 16).replace("T", " ")})`,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error ?? `Commit failed (${response.status})`);
}

/* --------------------------- queue orchestration ----------------------- */

/** Serial writer so bursty edits produce one commit at a time, always last-wins. */
const queue = { running: false, pending: null as SiteContent | null, timer: null as ReturnType<typeof setTimeout> | null };
let lastPublishedJson: string | null = null;
let lastRequested: SiteContent | null = null;

function processQueue() {
  if (queue.running) return;
  if (!queue.pending) return;
  const content = queue.pending;
  queue.pending = null;
  queue.running = true;
  void (async () => {
    try {
      if (isLocalPreview()) {
        setStatus({ state: "local-only" });
      } else if (JSON.stringify(content) !== lastPublishedJson) {
        await commit(content);
        lastPublishedJson = JSON.stringify(content);
        lastRequested = content;
      } else {
        setStatus({ state: "published" });
      }
    } catch (error) {
      setStatus({ state: "failed", message: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      queue.running = false;
      if (queue.pending) processQueue();
    }
  })();
}

function isLocalPreview(): boolean {
  return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
}

/** Schedules a publish of the given content (debounced, last-wins). */
export function requestPublish(content: SiteContent) {
  if (status.state === "failed" || status.state === "published" || status.state === "local-only") {
    // A new edit re-opens the pipeline.
    if (lastRequested !== content) setStatus({ state: "idle" });
  }
  lastRequested = content;
  if (queue.timer) clearTimeout(queue.timer);
  queue.timer = setTimeout(() => {
    queue.timer = null;
    queue.pending = content;
    processQueue();
  }, PUBLISH_DEBOUNCE_MS);
}

/** Publishes immediately (sync button): bypasses the debounce but keeps the queue. */
export function requestPublishNow(content: SiteContent) {
  lastRequested = content;
  if (queue.timer) clearTimeout(queue.timer);
  queue.timer = null;
  queue.pending = content;
  processQueue();
}
