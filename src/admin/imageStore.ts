// IndexedDB-backed image store used by the admin panel.
//
// localStorage can only hold a few inline data-URL images before it fills up.
// Instead, uploaded images are kept as Blobs in IndexedDB (quota is a large
// fraction of the disk), and the content object only stores a tiny reference
// like "@idb:<id>". At runtime the reference is swapped for a blob object URL
// so every <img src={...}> in the site keeps working unchanged.
//
// The conversion is invisible to components:
//   - content in memory holds short-lived `blob:` object URLs (render fast);
//   - persistence swaps `blob:` back to `@idb:<id>` refs before saving;
//   - loading swaps refs back to fresh object URLs (and migrates any legacy
//     inline `data:image` payloads into the store).

const DB_NAME = "munchivo-images-v1";
const STORE = "images";
/** Prefix of the references stored inside the content object. */
export const REF_PREFIX = "@idb:";

/** Longest edge of an uploaded image after compression. */
const MAX_DIM = 1600;
/** JPEG quality used for photo uploads. */
const JPEG_QUALITY = 0.85;
const KEEP_PNG_LIMIT = 120 * 1024;

type StoredImage = { id: string; blob: Blob; type: string; name: string; ts: number };

const urlToRef = new Map<string, string>();

export function refForUrl(url: string): string | undefined {
  return urlToRef.get(url);
}

/* ----------------------------- IndexedDB core ----------------------------- */

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB unavailable"));
  });
}

async function putImage(record: StoredImage): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not store image"));
  });
  db.close();
}

async function getImage(id: string): Promise<StoredImage | undefined> {
  const db = await openDb();
  const record = await new Promise<StoredImage | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => resolve(request.result as StoredImage | undefined);
    request.onerror = () => reject(request.error ?? new Error("Could not read image"));
  });
  db.close();
  return record;
}

async function listIds(): Promise<string[]> {
  const db = await openDb();
  const ids = await new Promise<string[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAllKeys();
    request.onsuccess = () => resolve(request.result.map(String));
    request.onerror = () => reject(request.error ?? new Error("Could not list images"));
  });
  db.close();
  return ids;
}

async function deleteImage(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Could not delete image"));
  });
  db.close();
}

/* --------------------------------- Uploads -------------------------------- */

/** Compresses an uploaded file into a stored Blob and returns a display URL. */
export async function fileToImageSource(file: File): Promise<string> {
  const blob = await compress(file);
  const id = `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  await putImage({ id, blob, type: blob.type || file.type, name: file.name, ts: Date.now() });
  const ref = `${REF_PREFIX}${id}`;
  const url = URL.createObjectURL(blob);
  urlToRef.set(url, ref);
  return url;
}

/** Legacy path: keeps an inline data-URL payload (used only for migration). */
export async function migrateDataUrl(dataUrl: string): Promise<string | null> {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const id = `img-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    await putImage({ id, blob, type: blob.type, name: "migrated", ts: Date.now() });
    return `${REF_PREFIX}${id}`;
  } catch {
    return null;
  }
}

async function compress(file: File): Promise<Blob> {
  if (file.size <= KEEP_PNG_LIMIT && file.type === "image/png") return file;

  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  } finally {
    bitmap.close?.();
  }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), type, quality));
}

/** Fetches the Blob behind a ref and mints a fresh display URL for it. */
export async function urlForRef(ref: string): Promise<string | null> {
  const id = ref.slice(REF_PREFIX.length);
  const record = await getImage(id);
  if (!record) return null;
  const url = URL.createObjectURL(record.blob);
  urlToRef.set(url, ref);
  return url;
}

/* ------------------------------ walkers ----------------------------------- */

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Replaces every inline data-URL (and every blob URL) with an `@idb:` ref. */
export function replacementForSrc(src: string): string {
  if (src.startsWith(REF_PREFIX)) return src;
  const mapped = urlToRef.get(src);
  if (mapped) return mapped;
  return src;
}

/* ------------------------------ maintenance ------------------------------- */

/**
 * Removes stored images that no longer appear anywhere in the content
 * (e.g. after Reset or after a replace). Pass the refs currently in use.
 */
export async function pruneImages(inUseRefs: Iterable<string>): Promise<void> {
  const keep = new Set<string>(inUseRefs);
  try {
    const ids = await listIds();
    for (const key of ids) {
      if (!keep.has(`${REF_PREFIX}${key}`)) await deleteImage(key);
    }
  } catch {
    // Store cleanup is best-effort.
  }
}
