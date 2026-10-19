# Munchivo website

A React/Vite multi-page food-cart website with a persistent cart and WhatsApp-only ordering.

## Business details to add

- `src/config/site.ts`: set the WhatsApp number with country code, phone, location, opening hours, currency label, and social URLs.
- `src/data/products.ts`: replace each `price: null` with its actual numeric price. Only the six listed products are defined here.
- `src/config/site.ts` `logoSrc`: the project did not contain a logo asset. Put the supplied logo in `public/` and set this path to it. Until then, the header and footer show plain brand text rather than a replacement logo.
- `public/images/`: replace illustrative food images with approved product photography if available.

Customers review their selections on `/order`, then use the standard `wa.me` link to open a prefilled message. The site does not submit an order or take payment. While the WhatsApp number is a placeholder, the button explains why it cannot open a chat and lets the customer copy the message instead.

For production hosting with clean page URLs, configure the server to serve `index.html` for client-side routes such as `/menu` and `/order`.

## Admin panel & publishing (how content becomes permanent)

The admin lives at `/admin` (access code required). Edits saves to this browser instantly,
then quietly publishes them so **every browser/device sees the change**:

1. New/changed images are staged as git blobs via `api/publish.js` (a Vercel serverless function).
2. The content JSON is committed to `public/content/site-content.json` (+ images under `public/uploads/`)
   in **one commit** to `main`.
3. Vercel notices the push and redeploys — the live site then serves the updated content to everyone
   (site load fetches `/content/site-content.json` and falls back to defaults if absent).

**One-time setup (required before publishing works):**

1. Create a GitHub token: GitHub → Settings → Developer settings →
   **Fine-grained personal access tokens** → generate new one for `DipuOzi/Munchivo`
   with **Repository permission: Contents → Read and write** (everything else off).
   Or a classic token with the `repo` scope.
2. Add it on Vercel: Project → Settings → Environment Variables → add
   `GITHUB_TOKEN` = `<the token>` (apply to Production, Preview and Development).
   Optionally set `ADMIN_SECRET` to a new admin access code (defaults to `SAD1999`)
   — if you change it, also update the code in `src/admin/adminCode.ts` — and
   `GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_BRANCH` if the repo changes.
3. Redeploy so the function picks the token up.

**Using it:**

- Open the admin once on a browser and press **"Sync everything to the live site"**
  (Settings tab) to upload that browser's stored content/images to the repo.
- After that, every edit auto-publishes ~2.6s after you stop typing; the status line in the
  header shows `Saved · pushing to the live site…` → `Saved · live site updates in 1–2 min`.
- If a publish fails (bad token, network), the status shows the error and a **Retry publish**
  button appears.

Note: visitor-submitted reviews stay on the visitor's own browser (they are merged into the
committed wall only when an admin adds/approves them in the admin Reviews tab and publishes).
