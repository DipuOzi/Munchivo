/**
 * Vercel serverless function: visitor review submissions.
 *
 * Uses the same GitHub-as-database pattern as api/publish.js, but stores
 * pending reviews in `data/pending-reviews.json` at the repo root (NOT in
 * public/ — that keeps reviewer emails out of the deployed static site).
 *
 * Actions:
 *   - submit (open to visitors)        -> appends to the pending queue
 *   - list-pending (admin code)        -> { reviews: [...] }
 *   - delete-pending {id} (admin code) -> removes one entry (after approval
 *                                        + publish, or on rejection)
 *
 * Required Vercel env vars: GITHUB_TOKEN (already used by /api/publish).
 * Optional: ADMIN_SECRET, GITHUB_OWNER, GITHUB_REPO, GITHUB_BRANCH.
 */

const OWNER = process.env.GITHUB_OWNER || "DipuOzi";
const REPO = process.env.GITHUB_REPO || "Munchivo";
const BRANCH = process.env.GITHUB_BRANCH || "main";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "SAD1999";

const PENDING_PATH = "data/pending-reviews.json";
const MAX_PENDING = 150;
const NAME_RE = /^[\p{L}\p{N} .'\u2019-]{2,60}$/u;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class ResponseError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function github(path, init = {}) {
  const response = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new ResponseError(response.status, `GitHub ${response.status} on ${path}: ${detail.slice(0, 220)}`);
  }
  return response.json();
}

/** Reads the pending queue (on main). Returns { reviews, fileSha }. */
async function readPending() {
  let payload;
  try {
    payload = await github(`contents/${PENDING_PATH}?ref=${BRANCH}`);
  } catch (error) {
    if (error instanceof ResponseError && error.status === 404) return { reviews: [] };
    throw error;
  }
  if (payload.type !== "file" || typeof payload.content !== "string") {
    throw new ResponseError(500, "pending-reviews.json is not a plain file");
  }
  const decoded = Buffer.from(payload.content.replace(/\n/g, ""), "base64").toString("utf-8");
  const parsed = JSON.parse(decoded);
  const reviews = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.reviews) ? parsed.reviews : [];
  return { reviews };
}

async function writePending(reviews, message) {
  const json = Buffer.from(JSON.stringify({ reviews }, null, 2), "utf-8").toString("base64");
  const blob = await github("git/blobs", { method: "POST", body: JSON.stringify({ content: json, encoding: "base64" }) });

  const ref = await github(`git/ref/heads/${BRANCH}`);
  const commit = await github(`git/commits/${ref.object.sha}`);
  const tree = await github("git/trees", {
    method: "POST",
    body: JSON.stringify({ base_tree: commit.tree.sha, tree: [{ path: PENDING_PATH, mode: "100644", type: "blob", sha: blob.sha }] }),
  });
  const created = await github("git/commits", {
    method: "POST",
    body: JSON.stringify({ message: String(message || "Review queue update").slice(0, 200), tree: tree.sha, parents: [ref.object.sha] }),
  });
  await github(`git/refs/heads/${BRANCH}`, { method: "PATCH", body: JSON.stringify({ sha: created.sha, force: false }) });
}

/** Collapse whitespace and strip control characters. */
function cleanText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.GITHUB_TOKEN) return res.status(500).json({ error: "GITHUB_TOKEN is not configured on this deployment." });

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const { action } = body || {};

  try {
    /* --------------------------- open to visitors --------------------------- */
    if (action === "submit") {
      const name = cleanText(body.name, 60);
      const email = cleanText(body.email, 120);
      const text = cleanText(body.text, 800);
      const rating = Math.round(Number(body.rating));
      if (!NAME_RE.test(name)) return res.status(400).json({ error: "Write your name (2–60 characters)." });
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: "Add a valid email." });
      if (!(rating >= 1 && rating <= 5)) return res.status(400).json({ error: "Pick a rating from 1 to 5 stars." });
      if (text.length < 10) return res.status(400).json({ error: "The review needs at least 10 characters." });

      const { reviews } = await readPending();
      if (reviews.length >= MAX_PENDING) {
        return res.status(429).json({ error: "The review queue is full right now — please try again later." });
      }
      // Small flood guard: any successful submission pauses the queue briefly.
      const newest = reviews[0] ? Date.parse(reviews[0].date) || 0 : 0;
      const now = Date.now();
      if (now - newest < 12_000) {
        return res.status(429).json({ error: "Hold on for a few seconds, then try again." });
      }
      if (reviews.some((review) => review.email === email && review.text === text)) {
        return res.status(200).json({ ok: true, duplicate: true });
      }

      const entry = {
        id: `pr-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        email,
        rating,
        text,
        date: new Date(now).toISOString(),
      };
      await writePending([entry, ...reviews], `New website review — waiting for approval (${name})`);
      return res.status(200).json({ ok: true });
    }

    /* ------------------------------ admin only ----------------------------- */
    const code = req.headers["x-admin-code"];
    if (typeof code !== "string" || code !== ADMIN_SECRET) return res.status(401).json({ error: "Unauthorized" });

    if (action === "list-pending") {
      const { reviews } = await readPending();
      return res.status(200).json({ reviews });
    }

    if (action === "delete-pending") {
      const { id } = body;
      if (typeof id !== "string" || !id) return res.status(400).json({ error: "Missing review id" });
      const { reviews } = await readPending();
      const remaining = reviews.filter((review) => review.id !== id);
      if (remaining.length !== reviews.length) {
        await writePending(remaining, `Review queue update — ${reviews.length - remaining.length} removed`);
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (error) {
    const status = error instanceof ResponseError ? error.status : 500;
    return res.status(status).json({ error: error?.message || "Unexpected error" });
  }
}
