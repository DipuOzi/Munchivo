// One-off: check whether this browser profile (puppeteer's own profile is fresh, so
// instead we just report) — and drive the admin "Sync everything to the live site"
// flow on the deployed site using a persistent profile if provided.
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const EXEC = fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
  ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  : "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

// Use the real user profile so IndexedDB/localStorage of the Vercel origin is available.
const USER_DATA = "C:\\Users\\pc11\\AppData\\Local\\Google\\Chrome\\User Data";

(async () => {
  const useProfile = process.argv.includes("--profile");
  const browser = await puppeteer.launch({
    executablePath: EXEC,
    headless: "new",
    ...(useProfile ? { userDataDir: USER_DATA } : {}),
  });
  const page = await browser.newPage();
  page.setDefaultTimeout(30000);
  await page.setViewport({ width: 1500, height: 900 });
  await page.goto("https://munchivo.vercel.app/", { waitUntil: "domcontentloaded", timeout: 30000 });
  await new Promise((r) => setTimeout(r, 3000));

  const info = await page.evaluate(async () => {
    const stored = localStorage.getItem("munchivo-content-v1");
    const refs = stored ? (stored.match(/@idb:[^"]+/g) || []) : [];
    const blobs = stored ? (stored.match(/blob:[^"]+/g) || []) : [];
    let idbCount = -1;
    try {
      idbCount = await new Promise((resolve) => {
        const req = indexedDB.open("munchivo-images-v1", 1);
        req.onsuccess = () => {
          const db = req.result;
          const tx = db.transaction("images", "readonly");
          const countReq = tx.objectStore("images").count();
          countReq.onsuccess = () => { resolve(countReq.result); db.close(); };
          countReq.onerror = () => { resolve(-1); db.close(); };
        };
        req.onerror = () => resolve(-1);
      });
    } catch {}
    return { hasStored: !!stored, refs, blobUrls: blobs, idbCount };
  });
  console.log(JSON.stringify(info, null, 2));

  if (useProfile) {
    // Open admin, log in, go to Settings, press Sync.
    await page.goto("https://munchivo.vercel.app/admin", { waitUntil: "networkidle0" });
    await new Promise((r) => setTimeout(r, 1500));
    const needsLogin = !!(await page.$(".adm-login"));
    if (needsLogin) {
      await page.type('.adm-login input[type="password"]', "SAD1999");
      await page.click(".adm-login .adm-btn");
      await new Promise((r) => setTimeout(r, 1200));
    }
    await page.evaluate(() => { [...document.querySelectorAll(".adm-tab")].find((b) => b.textContent.trim() === "Site settings")?.click(); });
    await new Promise((r) => setTimeout(r, 600));
    const clicked = await page.evaluate(() => {
      const btn = [...document.querySelectorAll(".adm-btn")].find((b) => b.textContent.includes("Sync everything"));
      if (btn) { btn.click(); return true; }
      return false;
    });
    console.log("sync clicked:", clicked);
    // Wait for publish status to settle.
    let finalStatus = "";
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      finalStatus = await page.evaluate(() => document.querySelector(".adm-save-status")?.textContent || "");
      console.log("status:", finalStatus);
      if (/live site updates in|publish failed/i.test(finalStatus)) break;
    }
    await page.screenshot({ path: "probe-sync.png" });
  }

  await browser.close();
})().catch((e) => { console.error("ERR", e); process.exit(1); });
