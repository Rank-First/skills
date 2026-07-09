// Screenshot helper. Usage:
//   node shot.mjs <url> <outPath> [--w 1440] [--sel "#pricing"] [--full] [--h 900]
// Default: viewport 1440x900, waits for network idle + all images decoded,
// then either clips to a selector (--sel) or captures the full page (--full)
// or just the viewport. Lives in scratchpad/lib; run with NODE_PATH set to the
// playwright package dir (the runner script sets this for you).
import { chromium } from "playwright";

const args = process.argv.slice(2);
const url = args[0];
const out = args[1];
const getFlag = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : def;
};
const has = (name) => args.includes(name);

const width = parseInt(getFlag("--w", "1440"), 10);
const height = parseInt(getFlag("--h", "900"), 10);
const sel = getFlag("--sel", null);
const full = has("--full");

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
// domcontentloaded + short idle wait: `networkidle` never fires on dev servers
// with an open HMR websocket (and hangs on heavy marketing sites).
await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
// Nudge lazy content + wait for every <img> to actually decode.
await page.evaluate(async () => {
  window.scrollTo(0, document.body.scrollHeight);
  await new Promise((r) => setTimeout(r, 400));
  window.scrollTo(0, 0);
  // Bounded: a lazy off-screen image can fire neither load nor error — cap the wait.
  const decoded = Promise.all(
    Array.from(document.images).map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise((res) => {
            img.addEventListener("load", res, { once: true });
            img.addEventListener("error", res, { once: true });
          })
    )
  );
  await Promise.race([decoded, new Promise((r) => setTimeout(r, 2500))]);
});
await page.waitForTimeout(500);

if (sel) {
  const el = await page.$(sel);
  if (!el) {
    console.error("SELECTOR NOT FOUND:", sel);
    process.exit(2);
  }
  await el.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await el.screenshot({ path: out });
} else {
  await page.screenshot({ path: out, fullPage: full });
}

// Report overflow + page height so agents can catch horizontal-scroll bugs.
const meta = await page.evaluate(() => ({
  overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  pageHeight: document.documentElement.scrollHeight,
}));
console.log(JSON.stringify({ out, width, ...meta }));
await browser.close();
