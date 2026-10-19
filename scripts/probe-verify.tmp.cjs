// One-off: verify the fresh deploy serves the build id and clean content JSON.
(async () => {
  const [a, b, c] = await Promise.all([
    fetch("https://munchivo.vercel.app/build-id.txt"),
    fetch("https://munchivo.vercel.app/content/site-content.json"),
    fetch("https://munchivo.vercel.app/"),
  ]);
  console.log("build-id:", await a.text());
  const json = await b.json();
  console.log("product images:", json.products.map((p) => `${p.name}=${p.image}`).join(", "));
  const html = await c.text();
  console.log("meta build-id in html:", html.match(/build-id" content="([^"]+)"/)?.[1]);
})().catch((e) => { console.error("ERR", e.message); process.exit(1); });
