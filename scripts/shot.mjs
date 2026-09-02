// Screenshot the prototype page with headless Chromium (SwiftShader GL).
// Usage: node scripts/shot.mjs [url] [out] [width] [height]
import { chromium } from "playwright";

const [
  url = "http://127.0.0.1:4173/prototype/?ui=0",
  out = "shot.png",
  w = "1440",
  h = "900",
] = process.argv.slice(2);

const browser = await chromium.launch({
  args: [
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const page = await browser.newPage({
  viewport: { width: +w, height: +h },
  deviceScaleFactor: 1,
});
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: "networkidle" });
await page.mouse.move(+w * 0.62, +h * 0.55);
await page.waitForTimeout(2500);
await page.screenshot({ path: out });
const fps = await page.textContent("#fps").catch(() => "n/a");
console.log(JSON.stringify({ out, fps, errors }));
await browser.close();
