import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin, type Connect } from "vite";
import type { ServerResponse } from "node:http";
import { viteSingleFile } from "vite-plugin-singlefile";
import fs from "fs";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Stable id for each build, embedded in the app (meta tag) and served as
 * /build-id.txt. The runtime version check compares the two so a stale,
 * cached admin tab can never publish content with outdated code — it warns
 * and blocks the publish instead (that exact staleness is what once wrote
 * unusable `blob:` image URLs into the published content).
 */
const BUILD_ID = Date.now().toString(36);

function buildVersionPlugin(): Plugin {
  return {
    name: "munchivo-build-version",
    transformIndexHtml(html) {
      return html.replace(
        "</title>",
        `</title>\n    <meta name="build-id" content="${BUILD_ID}" />`,
      );
    },
    closeBundle() {
      fs.writeFileSync(path.resolve(__dirname, "dist/build-id.txt"), BUILD_ID);
      fs.writeFileSync(path.resolve(__dirname, "public/build-id.txt"), BUILD_ID);
    },
  };
}

declare const __BUILD_ID__: string;
export { __BUILD_ID__ };

/**
 * Dev mirror of the production serverless APIs (api/reviews.js + api/publish.js).
 *
 * Vite has no serverless runtime, so while developing:
 *   - /api/reviews works against a local JSON file (.local-data/, gitignored),
 *   - /api/publish "commits" directly into the repo worktree — it writes
 *     public/content/site-content.json and staged uploads exactly like the
 *     real pipeline would deploy them. That makes the full pending-review ->
 *     approve -> Save & publish flow testable on localhost.
 */
function devApiPlugin(): Plugin {
  const dataDir = path.resolve(__dirname, ".local-data");
  const pendingFile = path.join(dataDir, "pending-reviews.json");
  const stagedDir = path.join(dataDir, "staged");
  const contentFile = path.resolve(__dirname, "public/content/site-content.json");

  const respond = (res: ServerResponse, status: number, payload: unknown) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(payload));
  };

  const readBody = (req: Connect.IncomingMessage) =>
    new Promise<string>((resolve) => {
      let raw = "";
      req.on("data", (chunk) => {
        raw += chunk;
      });
      req.on("end", () => resolve(raw));
    });

  const parseJson = (raw: string) => {
    try {
      return JSON.parse(raw || "{}") || {};
    } catch {
      return {};
    }
  };

  const readPending = async (): Promise<Array<Record<string, unknown>>> => {
    try {
      const parsed = JSON.parse(await fs.promises.readFile(pendingFile, "utf-8"));
      return Array.isArray(parsed.reviews) ? parsed.reviews : [];
    } catch {
      return [];
    }
  };

  const writePending = async (reviews: Array<Record<string, unknown>>) => {
    await fs.promises.mkdir(dataDir, { recursive: true });
    await fs.promises.writeFile(pendingFile, JSON.stringify({ reviews }, null, 2));
  };

  /** Same as the server: collapse whitespace, strip control chars, cap length. */
  const cleanText = (value: unknown, maxLength: number) =>
    String(value ?? "")
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength);

  return {
    name: "munchivo-dev-api",
    configureServer(server) {
      const handler: Connect.NextHandleFunction = async (req, res, next) => {
        if (req.method !== "POST" || !req.url) return next();
        try {
          /* ---------------------------- /api/reviews ---------------------------- */
          if (req.url === "/api/reviews") {
            const body = parseJson(await readBody(req));
            if (body.action === "submit") {
              const reviews = await readPending();
              if (reviews.length >= 150) return respond(res, 429, { error: "The review queue is full right now — please try again later." });
              const now = Date.now();
              const newest = reviews[0] ? Date.parse(String(reviews[0].date)) || 0 : 0;
              if (now - newest < 12_000) return respond(res, 429, { error: "Hold on for a few seconds, then try again." });
              const email = cleanText(body.email, 120);
              const text = cleanText(body.text, 800);
              if (reviews.some((review) => review.email === email && review.text === text)) {
                return respond(res, 200, { ok: true, duplicate: true });
              }
              const entry = {
                id: `pr-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
                name: cleanText(body.name, 60),
                email,
                rating: Math.max(1, Math.min(5, Math.round(Number(body.rating)) || 5)),
                text,
                date: new Date(now).toISOString(),
              };
              await writePending([entry, ...reviews]);
              return respond(res, 200, { ok: true });
            }
            if (body.action === "list-pending") return respond(res, 200, { reviews: await readPending() });
            if (body.action === "delete-pending") {
              await writePending((await readPending()).filter((review) => review.id !== body.id));
              return respond(res, 200, { ok: true });
            }
            return respond(res, 400, { error: "Unknown action" });
          }

          /* ----------------------------- /api/publish --------------------------- */
          if (req.url === "/api/publish") {
            const body = parseJson(await readBody(req));
            if (body.action === "stage-image") {
              const bytes = Buffer.from(String(body.base64 || ""), "base64");
              const sha = crypto.createHash("sha1").update(bytes).digest("hex");
              await fs.promises.mkdir(stagedDir, { recursive: true });
              await fs.promises.writeFile(path.join(stagedDir, sha), bytes);
              return respond(res, 200, { sha });
            }
            if (body.action === "commit-content") {
              await fs.promises.mkdir(path.dirname(contentFile), { recursive: true });
              await fs.promises.writeFile(contentFile, JSON.stringify(body.content, null, 2));
              for (const file of (body.files ?? []) as Array<{ sha: string; path: string }>) {
                try {
                  const bytes = await fs.promises.readFile(path.join(stagedDir, file.sha));
                  const target = path.resolve(__dirname, file.path);
                  if (!target.startsWith(path.resolve(__dirname, "public") + path.sep)) continue;
                  await fs.promises.mkdir(path.dirname(target), { recursive: true });
                  await fs.promises.writeFile(target, bytes);
                } catch {
                  // Staged bytes missing: skip the file, the content is still written.
                }
              }
              return respond(res, 200, { ok: true, commit: "local-dev" });
            }
            return respond(res, 400, { error: "Unknown action" });
          }
        } catch (error) {
          return respond(res, 500, { error: (error as Error)?.message || "Dev API error" });
        }
        return next();
      };
      server.middlewares.use(handler);
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), buildVersionPlugin(), devApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
});
