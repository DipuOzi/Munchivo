/**
 * Runtime build-version check.
 *
 * The site is a single-file bundle — a browser holding a cached (or
 * long-open) tab can keep running OLD code after a deploy. That is harmless
 * for visitors, but the admin panel WRITES data: an outdated admin must never
 * publish, or it can commit content the current code would have handled
 * differently. This module compares the running build id with the freshly
 * deployed one.
 */

declare const __BUILD_ID__: string;

/** True while running on a dev server (no deployed build id to compare with). */
export function isDevRuntime(): boolean {
  return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
}

let cachedRemoteId: string | null = null;
let lastCheck = 0;

/** Fetches the deployed build id (cached for a short while). */
export async function deployedBuildId(): Promise<string | null> {
  if (lastCheck && Date.now() - lastCheck < 30_000) return cachedRemoteId;
  try {
    const response = await fetch(`/build-id.txt?=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return null;
    cachedRemoteId = (await response.text()).trim();
    lastCheck = Date.now();
    return cachedRemoteId;
  } catch {
    return null;
  }
}

/** "ok" | "stale" — "ok" also when the check cannot run (dev, offline, missing file). */
export async function buildFreshness(): Promise<"ok" | "stale" | "unknown"> {
  if (typeof __BUILD_ID__ === "undefined") return "unknown";
  const remote = await deployedBuildId();
  if (!remote) return "unknown";
  return remote === __BUILD_ID__ ? "ok" : "stale";
}

export const runningBuildId = (): string => (typeof __BUILD_ID__ === "undefined" ? "dev" : __BUILD_ID__);
