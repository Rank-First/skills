// Clip screenshot spanning from the TOP of one section to the BOTTOM of another.
// Usage: node clip-shot.mjs <url> "<startSel>" "<endSel>" <out.png> [--w 1440]
// Great for judging background contrast across a stretch of sections.
import { chromium } from "playwright";

const args = process.argv.slice(2);
const [url, startSel, endSel, out] = args;
const getFlag = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const width = parseInt(getFlag("--w", "1440"), 10);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
await page.evaluate(async () => {
  window.scrollTo(0, document.body.scrollHeight);
  await new Promise((r) => setTimeout(r, 500));
  window.scrollTo(0, 0);
  await new Promise((r) => setTimeout(r, 300));
});
await page.waitForTimeout(400);

const box = await page.evaluate(([s, e]) => {
  const top = document.querySelector(s);
  const bot = document.querySelector(e);
  if (!top || !bot) return null;
  const t = top.getBoundingClientRect().top + window.scrollY;
  const b = bot.getBoundingClientRect().bottom + window.scrollY;
  return { x: 0, y: Math.round(t), width: document.documentElement.clientWidth, height: Math.round(b - t) };
}, [startSel, endSel]);

if (!box) {
  console.error("SELECTOR NOT FOUND:", startSel, endSel);
  process.exit(2);
}

// Size the viewport to the region and scroll it to the top, then shoot the
// viewport — clip beyond the viewport fails on a non-fullPage screenshot.
await page.setViewportSize({ width, height: Math.min(box.height, 4000) });
await page.evaluate((y) => window.scrollTo(0, y), box.y);
// Let the now-visible region lazy-load + decode its images before shooting.
await page.evaluate(async () => {
  const imgs = Array.from(document.images).filter((i) => !i.complete || i.naturalWidth === 0);
  await Promise.race([
    Promise.all(imgs.map((i) => new Promise((r) => { i.addEventListener("load", r, { once: true }); i.addEventListener("error", r, { once: true }); }))),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
});
await page.waitForTimeout(700);
await page.screenshot({ path: out });
const meta = await page.evaluate(() => ({
  overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
}));
console.log(JSON.stringify({ out, ...box, ...meta }));
await browser.close();
