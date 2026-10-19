/**
 * Vercel serverless function: pushes admin content to the GitHub repository
 * that backs this deployment (Vercel then rebuilds automatically).
 *
 * Two actions, both guarded by the admin access code:
 *   - stage-image  {base64, mime}          -> creates a git blob, returns {sha}
 *   - commit-content {content, files[]}    -> one tree/commit/ref update with
 *                                             the images + site-content.json
 *
 * Required Vercel env vars:
 *   GITHUB_TOKEN   a token with write access to this repo (contents: read & write)
 *   ADMIN_SECRET   optional — defaults to the built-in access code
 */

const OWNER = process.env.GITHUB_OWNER || "DipuOzi";
const REPO = process.env.GITHUB_REPO || "Munchivo";
const BRANCH = process.env.GITHUB_BRANCH || "main";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "SAD1999";

const UPLOAD_DIR = "public/uploads";
const CONTENT_PATH = "public/content/site-content.json";
const UPLOAD_PATH_RE = new RegExp(`^${UPLOAD_DIR}/[A-Za-z0-9][A-Za-z0-9._-]*\\.(jpg|jpeg|png|webp|gif|svg)$`);

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

class ResponseError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function headCommit() {
  const ref = await github(`git/ref/heads/${BRANCH}`);
  const commit = await github(`git/commits/${ref.object.sha}`);
  return { parentSha: ref.object.sha, baseTreeSha: commit.tree.sha };
}

async function createBlob(base64) {
  const blob = await github("git/blobs", { method: "POST", body: JSON.stringify({ content: base64, encoding: "base64" }) });
  return blob.sha;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.GITHUB_TOKEN) return res.status(500).json({ error: "GITHUB_TOKEN is not configured on this deployment." });

  const code = req.headers["x-admin-code"];
  if (typeof code !== "string" || code !== ADMIN_SECRET) return res.status(401).json({ error: "Unauthorized" });

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const { action } = body || {};

  try {
    if (action === "stage-image") {
      const { base64, mime } = body;
      if (typeof base64 !== "string" || !base64) return res.status(400).json({ error: "Empty image payload" });
      if (base64.length > 5_500_000) return res.status(413).json({ error: "Image too large (about 4 MB limit after compression)" });
      if (!/^image\/(jpeg|jpg|png|webp|gif|svg\+xml)$/.test(String(mime || ""))) {
        return res.status(400).json({ error: "Unsupported image type" });
      }
      const sha = await createBlob(base64);
      return res.status(200).json({ sha });
    }

    if (action === "commit-content") {
      const { content, files, message } = body;
      if (!content || typeof content !== "object" || !("site" in content)) {
        return res.status(400).json({ error: "Invalid content payload" });
      }

      const staged = Array.isArray(files) ? files : [];
      for (const file of staged) {
        if (!UPLOAD_PATH_RE.test(file.path)) return res.status(400).json({ error: `Unsafe upload path: ${file.path}` });
        if (!/^[0-9a-f]{40}$/.test(file.sha)) return res.status(400).json({ error: "Invalid blob sha" });
      }

      // Everything lands in one commit: the upload payloads + the content JSON.
      const json = JSON.stringify(content, null, 2);
      const contentBlobSha = await createBlob(Buffer.from(json, "utf-8").toString("base64"));
      const treeEntries = [
        ...staged.map((file) => ({ path: file.path, mode: "100644", type: "blob", sha: file.sha })),
        { path: CONTENT_PATH, mode: "100644", type: "blob", sha: contentBlobSha },
      ];

      const { parentSha, baseTreeSha } = await headCommit();
      const tree = await github("git/trees", {
        method: "POST",
        body: JSON.stringify({ base_tree: baseTreeSha, tree: treeEntries }),
      });
      const commit = await github("git/commits", {
        method: "POST",
        body: JSON.stringify({ message: String(message || "Admin content update").slice(0, 200), tree: tree.sha, parents: [parentSha] }),
      });
      await github(`git/refs/heads/${BRANCH}`, { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) });

      return res.status(200).json({ ok: true, commit: commit.sha });
    }

    return res.status(400).json({ error: "Unknown action" });
  } catch (error) {
    const status = error instanceof ResponseError ? error.status : 500;
    return res.status(status).json({ error: error?.message || "Unexpected error" });
  }
}
