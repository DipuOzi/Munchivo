import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";
import fs from "fs";

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

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile(), buildVersionPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
});
