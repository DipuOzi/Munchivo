// One-off: check whether this PC's Chrome profile holds the uploaded image,
// then drive the admin "Sync everything to the live site" flow.
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const EXEC = fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
  ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  : "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const USER_DATA = "C:\\Users\\pc11\\AppData\\Local\\Google\\Chrome\\User Data";

(async () => {
  console.log("launch");
  const browser = await puppeteer.launch({ executablePath: EXEC, headless: "new", userDataDir: USER_DATA });
  console.log("launched");
  try {
    const page = await browser.newPage();
    console.log("page opened");
    await page.setViewport({ width: 1500, height: 900 });
    await page.goto("https://munchivo.vercel.app/", { waitUntil: "domcontentloaded", timeout: 30000 });
    console.log("site loaded");
    await new Promise((r) => setTimeout(r, 4000));

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
    console.log("storage:", JSON.stringify(info));
    await browser.close();
    console.log("done");
  } catch (e) {
    console.error("ERR", e.message);
    await browser.close();
    process.exit(1);
  }
})();
