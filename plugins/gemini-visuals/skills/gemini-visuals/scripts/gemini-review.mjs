// Ask Gemini to critique one or more screenshots. Usage:
//   node gemini-review.mjs "<review prompt>" <img1> [img2 ...]
// Reads the API key from env GEMINI_API_KEY. Prints Gemini's text critique.
import { readFileSync } from "node:fs";

const key = process.env.GEMINI_API_KEY;
if (!key) { console.error("Set GEMINI_API_KEY"); process.exit(1); }
const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image-preview";

const prompt = process.argv[2];
const imgs = process.argv.slice(3);
if (!prompt || imgs.length === 0) { console.error("usage: gemini-review.mjs <prompt> <img...>"); process.exit(1); }

const mime = (f) => (f.endsWith(".jpg") || f.endsWith(".jpeg") ? "image/jpeg" : "image/png");
const parts = [
  { text: prompt },
  ...imgs.map((f) => ({ inline_data: { mime_type: mime(f), data: readFileSync(f).toString("base64") } })),
];

const res = await fetch(
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
  {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseModalities: ["TEXT"] },
    }),
  }
);
const json = await res.json();
if (!res.ok) { console.error("HTTP", res.status, JSON.stringify(json).slice(0, 800)); process.exit(1); }
const text = (json.candidates?.[0]?.content?.parts || [])
  .map((p) => p.text)
  .filter(Boolean)
  .join("\n");
console.log(text || JSON.stringify(json).slice(0, 800));
