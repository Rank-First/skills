import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const args = process.argv.slice(2);
const url = args[0];
const outDir = args[1];
const width = 1440, tileH = 900;
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: tileH }, deviceScaleFactor: 1.25 });
try {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 40000 });
  } catch (e) { console.error("goto warn:", e.message); }
  await page.waitForTimeout(2500);
  // scroll to trigger lazy content
  try {
    await page.evaluate(async () => {
      const h = document.body.scrollHeight;
      for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); }
      window.scrollTo(0, 0);
    });
  } catch (e) { console.error("scroll warn:", e.message); }
  await page.waitForTimeout(1500);

  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight).catch(() => tileH * 10);
  await page.screenshot({ path: `${outDir}/full.png`, fullPage: true }).catch(e => console.error("full warn:", e.message));

  const nTiles = Math.min(Math.ceil(pageHeight / tileH), 22);
  for (let i = 0; i < nTiles; i++) {
    const y = i * tileH;
    const h = Math.min(tileH, pageHeight - y);
    if (h <= 0) break;
    await page.evaluate((yy) => window.scrollTo(0, yy), y).catch(() => {});
    await page.waitForTimeout(180);
    await page.screenshot({ path: `${outDir}/tile-${String(i).padStart(2, "0")}.png`, clip: { x: 0, y: 0, width, height: h } }).catch(e => console.error("tile warn:", e.message));
  }
  console.log(JSON.stringify({ url, outDir, pageHeight, nTiles }));
} finally {
  await browser.close();
}
