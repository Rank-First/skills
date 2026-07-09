// Generate an image with Gemini (optionally conditioned on input images). Usage:
//   node gemini-image.mjs <outPath.png> "<prompt>" [--ar 16:9] [--in ref1.png ref2.png ...]
// Reads GEMINI_API_KEY from env. Gemini returns JPEG bytes; we re-encode to a
// true PNG via a headless-canvas pass so strict PNG consumers (e.g. Next.js's
// next/image, or any optimizer that rejects mislabeled JPEGs) accept it.
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const key = process.env.GEMINI_API_KEY;
if (!key) { console.error("Set GEMINI_API_KEY"); process.exit(1); }
const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image-preview";

const args = process.argv.slice(2);
const out = args[0];
const prompt = args[1];
const getFlag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const ar = getFlag("--ar", "16:9");
const inIdx = args.indexOf("--in");
const refs = inIdx >= 0 ? args.slice(inIdx + 1) : [];
if (!out || !prompt) { console.error("usage: gemini-image.mjs <out.png> <prompt> [--ar 16:9] [--in refs...]"); process.exit(1); }

const mime = (f) => (f.endsWith(".jpg") || f.endsWith(".jpeg") ? "image/jpeg" : "image/png");
const parts = [
  { text: prompt },
  ...refs.map((f) => ({ inline_data: { mime_type: mime(f), data: readFileSync(f).toString("base64") } })),
];

const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
  {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: ar } },
    }),
  }
);
const json = await res.json();
if (!res.ok) { console.error("HTTP", res.status, JSON.stringify(json).slice(0, 800)); process.exit(1); }
const partsOut = json.candidates?.[0]?.content?.parts || [];
const imgPart = partsOut.find((p) => p.inlineData || p.inline_data);
if (!imgPart) { console.error("No image in response:", JSON.stringify(json).slice(0, 800)); process.exit(1); }
const data = (imgPart.inlineData || imgPart.inline_data).data;
const rawJpeg = Buffer.from(data, "base64");
const tmpJpg = out.replace(/\.png$/, ".raw.jpg");
writeFileSync(tmpJpg, rawJpeg);

// Re-encode to true PNG via canvas.
const browser = await chromium.launch();
const page = await browser.newPage();
const b64 = rawJpeg.toString("base64");
const pngB64 = await page.evaluate(async (src) => {
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; });
  const c = document.createElement("canvas");
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  c.getContext("2d").drawImage(img, 0, 0);
  return c.toDataURL("image/png").split(",")[1];
}, `data:image/jpeg;base64,${b64}`);
writeFileSync(out, Buffer.from(pngB64, "base64"));
await browser.close();
console.log(JSON.stringify({ out, bytes: Buffer.from(pngB64, "base64").length, ar }));
