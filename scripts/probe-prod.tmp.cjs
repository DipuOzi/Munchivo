// One-off: inspect the Products tab in #/admin.
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const EXEC = fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
  ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  : "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
(async () => {
  const browser = await puppeteer.launch({ executablePath: EXEC, headless: "new", defaultViewport: { width: 1500, height: 900 } });
  const page = await browser.newPage();
  await page.goto("http://localhost:5173/#/admin", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  const needsLogin = !!(await page.$(".adm-login"));
  if (needsLogin) {
    await page.type('.adm-login input[type="password"]', "SAD1999");
    await page.click(".adm-login .adm-btn");
    await new Promise((r) => setTimeout(r, 1000));
  }
  await page.evaluate(() => { [...document.querySelectorAll(".adm-tab")].find((b) => b.textContent.includes("Products")).click(); });
  await new Promise((r) => setTimeout(r, 500));
  const info = await page.evaluate(() => ({
    items: document.querySelectorAll(".adm-item").length,
    uploadButtons: [...document.querySelectorAll(".adm-btn")].filter((b) => b.textContent.includes("Upload")).length,
    imageFields: document.querySelectorAll(".adm-image-field").length,
    firstItemHead: document.querySelector(".adm-item-head strong")?.textContent,
  }));
  console.log(JSON.stringify(info));
  await page.screenshot({ path: "probe-products.png" });
  // Change first product's photo URL via the input and confirm the menu card updates.
  await page.goto("http://localhost:5173/menu", { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  const firstMenuImg = await page.evaluate(() => document.querySelector(".product-card--menu img")?.getAttribute("src"));
  console.log("menu first img:", firstMenuImg);
  await browser.close();
})().catch((e) => { console.error("ERR", e); process.exit(1); });
