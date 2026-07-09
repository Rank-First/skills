---
name: gemini-visuals
description: >-
  Create, edit, and iterate on-brand marketing/landing visuals with Google Gemini:
  generate flat doodle-annotated illustrations, stage real screenshots (of your own
  app or any site) as clean illustrations with hand-drawn arrows/labels, edit existing
  images with targeted changes, and run competitor visual research where Gemini reviews
  screenshots and picks a design direction. Automatically adapts to the host project's OWN
  brand (colors, fonts, logo) — resolves them from the project's theme/tokens and asks only
  if it can't find them. Use whenever the task is producing or refining images/section art
  for a landing site, or deciding a section's look from competitor screenshots. Runs a
  screenshot -> Gemini review -> generate/edit -> repeat loop.
---

# Gemini visuals workflow

A repeatable loop for producing on-brand landing imagery with Gemini:
**screenshot → Gemini review → generate/edit → screenshot → review → …** until it looks great.
Covers three jobs: (a) generate flat illustrations, (b) stage a real screenshot as a
doodled illustration, (c) research competitors and let Gemini choose the direction.

**The illustration style is fixed; the palette and fonts are the HOST PROJECT'S OWN.** Do
**Brand setup** (below) once per project before generating — it resolves the project's brand
tokens so everything comes out on-brand out of the box, whatever product you're in.

You are the orchestrator: prepare the prompt, run the tool, LOOK at the result yourself
(Read the PNG), send it to Gemini for critique, apply the fix, repeat. Spawn parallel
sub-agents (one per image) for independent pieces when producing a set.

## Setup (once per environment)
```bash
bash scripts/setup.sh   # makes Playwright resolvable
export GEMINI_API_KEY="<your key — never commit it>"
# optional: export GEMINI_IMAGE_MODEL to override the default image model
```
Run all `.mjs` from the `scripts/` dir (Playwright resolves from its `node_modules`).
The site you want to screenshot must be running/reachable.

### Preflight — run BOTH of these before starting real work (fail fast, don't stall mid-task)
1. **Test the key actually generates an image.** The Gemini **free tier has zero image quota** (`limit: 0`,
   `429 RESOURCE_EXHAUSTED`) — image models need a **billing-enabled** key. Verify with one tiny call:
   ```bash
   curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent?key=$GEMINI_API_KEY" \
     -H 'Content-Type: application/json' -d '{"contents":[{"parts":[{"text":"a red circle"}]}]}' \
     | grep -oE 'inlineData|RESOURCE_EXHAUSTED|"code": [0-9]+'
   ```
   `inlineData` = good. If it's exhausted, **stop and get a billing-enabled key now** — don't
   start generating and get interrupted waiting for a new key. Tell a *hard* quota from a *transient*
   rate-limit: on a hard cap the `retry in ~Ns` hint **stays constant** (and says `limit: 0`); on a real
   cooldown it **shrinks**. Don't burn a long retry loop on a hard cap.
2. **Test Playwright + the target is up** before the screenshot→review loop. Confirm the frontend you'll shoot
   actually serves (right URL/port), then do one throwaway `node shot.mjs <url> /tmp/_ping.png --w 800`.
   If it 500s / hangs / hits the wrong app, sort the URL first — otherwise every review iteration fails.

## The scripts
| Script | What it does | Usage |
| --- | --- | --- |
| `gemini-image.mjs` | Generate OR edit an image; condition on reference image(s) with `--in` | `node gemini-image.mjs <out.png> "<prompt>" [--ar 4:3] [--in ref1.png ref2.png ...]` |
| `gemini-review.mjs` | Ask Gemini to critique image(s); prints text | `node gemini-review.mjs "<critique prompt>" <img.png> [img2 ...]` |
| `shot.mjs` | Screenshot a page: viewport, `--sel "<css>"`, or `--full` | `node shot.mjs <url> <out.png> [--w 1440] [--sel "#id"] [--full]` |
| `section-shot.mjs` | Screenshot ONE section element by selector (zoom-safe); auto-hides fixed/sticky overlays | `node section-shot.mjs <url> "<sel>" <out.png> [--w 1440] [--hide "<css>"]` |
| `app-shot.mjs` | Log into a web app, open a route, screenshot it — for authenticated in-app screens | `APP_EMAIL=.. APP_PASSWORD=.. node app-shot.mjs <base> <path> <out.png> [--tab "Label"] [--sel css] [--fill '[["css","text"],...]']` |
| `clip-shot.mjs` | Clip a screenshot from the top of one section to the bottom of another | `node clip-shot.mjs <url> "<startSel>" "<endSel>" <out.png> [--w 1440]` |
| `cap.mjs` | Robust full-page capture sliced into tiles (heavy/marketing sites) | `node cap.mjs <url> <outDir>` → `outDir/full.png` + `tile-NN.png` |
| `crop.mjs` | Crop a PNG to the top N pixels (strip navbars / repeated titles) | `node crop.mjs <in.png> <out.png> <cropHeight>` |

`gemini-image.mjs` returns JPEG bytes and re-encodes to a true PNG (so strict PNG consumers —
e.g. Next.js `next/image`, or any optimizer that rejects mislabeled JPEGs — accept it).
Same script does generation and editing — editing is just generation `--in`'d on the current image.

## Brand setup (once per project — do this before generating)
The illustration style is fixed; the **colors and fonts are the host project's own**. Resolve them
once so every image is on-brand out of the box:
1. Open `reference/style-prompt.md` and follow **Brand discovery** — read the project's theme/tokens
   (`tailwind.config.*`, CSS `:root` custom properties, a theme object, `tokens.json`), app manifest
   `theme_color`, logo/brand assets, or a `BRANDING.md`. Map them to the six tokens (`{{accent}}`,
   `{{background}}`, `{{text}}`, `{{fill}}`, `{{highlight}}`, `{{ui_font}}`).
2. **If you can't confidently find `{{accent}}` + `{{background}}`, ASK the user** — primary color,
   background (light/cream/white/dark), an optional sparing second color, UI font. Don't guess a brand.
3. Fill the STYLE BLOCK with the resolved tokens and **cache it to `reference/brand.local.md`**
   (git-ignored) so the whole set stays consistent and later sessions reuse it. That cached STYLE
   BLOCK is what every recipe below prepends.

## Recipe A — generate a flat on-brand illustration
1. Take the resolved STYLE BLOCK (from Brand setup — the project's palette/fonts already filled in),
   append your subject (which UI, what each doodle says + points at). Say the EXACT label text and
   target, and pin the count ("exactly N labels, each once, no repeats").
2. `node gemini-image.mjs out.png "<STYLE BLOCK> <subject>" --ar 4:3`
3. Read `out.png`. Then `node gemini-review.mjs "<check spelling of every word; is the flow clear; on-style?>" out.png`.
4. Apply feedback → regenerate. **3–4 rounds.** If a label keeps garbling, simplify its wording.

## Recipe B — stage a REAL screenshot as a doodled illustration
Gemini garbles real screenshots if given too much. The trick is to **crop first**, then let
Gemini re-render faithfully + add doodles.
1. Capture: `node shot.mjs <url> raw.png --w 1440` (or `cap.mjs` for tiles). For a specific
   section use `section-shot.mjs`.
2. Clean the crop so Gemini can't duplicate/garble: `node crop.mjs raw.png clean.png <H>` to
   drop the navbar band and any *repeated* title/body below the hero. To remove a navbar that
   is a real `<header>`, hide it in a Playwright pass filtered by nav text (e.g. contains
   "Sign up") — do NOT blanket-remove `<header>`, the article's own title is often a `<header>` too.
3. Stage + doodle: `node gemini-image.mjs staged.png "<recreate this screenshot faithfully on
   warm cream, tilted, soft shadow, keep ALL text exactly, add these doodles: ...>" --ar 4:3 --in clean.png`
   - To keep a whole set's handwriting identical, add a sibling image as a second `--in` and say
     "the SECOND image is ONLY a handwriting style reference; copy the script, not the content."
4. Review for spelling + arrow targeting, iterate.
(If Gemini distortion is unacceptable and the screenshot MUST stay pixel-perfect, fall back to an
HTML composite: real screenshot as `<img>` tilted on cream + canvas-drawn arrows + an embedded
handwriting webfont, then `element.screenshot`. Slower; most people prefer the Gemini-created look.)

**Authenticated in-app screens:** use `app-shot.mjs` (logs in with `APP_EMAIL`/`APP_PASSWORD`, opens a
route, optional `--tab "Label"` to click an in-page tab, `--sel main` to drop a left rail). Adapt the
login selectors in the script to your app. If a screen is empty in demo data (e.g. an unfilled form),
**stage it "in use"** by injecting realistic content with `--fill '[["css selector","text"],...]'` before
the shot — a populated screen makes a far stronger card than an empty one.

**No-doodle staging** (clean screenshot on cream, no annotations): reuse the STYLE BLOCK but drop every
doodle clause and add "Absolutely NO handwriting, NO arrows, NO labels, NO doodles". Gemini keeps
large/medium text crisp; only tiny text (dense calendar/table cells) garbles, which is illegible at card
size anyway. When two cards would draw from the same source, pick a genuinely different screen for one of
them so the set doesn't read as repetitive.

## Recipe C — targeted EDIT of an existing image
Feed the current good image as `--in` and describe the ONE change; tell it to keep everything else
pixel-identical. Great for "remove these arrows", "make arrows simple, no swirls", "drop label X".
```bash
node gemini-image.mjs edited.png "Keep EVERYTHING pixel-identical: <describe scene>. The ONLY change: <edit>. Do not alter any text/colors/layout." --ar 4:3 --in current.png
```
Then Read + review; Gemini may re-render, so re-check text hasn't garbled.

**Reframing / removing negative space:** name the *space*, not the content. "Delete the header text"
leaves an ugly blank band where it was; what works is "shrink the card to hug its text, first line at the
very top, no empty band anywhere, a single card (no duplicate behind)." Editing (`--in`) to
reposition/retone/recompose is far lower garble-risk than regenerating from the raw source, so keep
iterating on the last GOOD png. One real tension: Gemini **resists tilting a dense-text panel** (it
straightens the card to protect text integrity) — for text-heavy screenshots, accept a near-straight card
or prioritize legibility over the tilt rather than burning rounds fighting it.

## Brand icons & logos — embed them, don't always overlay
The current image model renders **well-known brand marks recognizably** — you usually do NOT need the old
workaround of leaving empty badges and compositing real SVGs in code over them.
- **Third-party marks:** name them explicitly and Gemini embeds them into the scene — e.g. "next to the label
  embed the multicolor Google 'G', the Microsoft Bing 'b', the ChatGPT/OpenAI mark, the Claude mark, the
  Perplexity mark." Say WHERE each goes and keep the list short.
- **Your own (or any exact) logo:** pass the asset as an extra `--in` reference and point at it by position —
  e.g. `--in scene_ref.png logo-app.png` with "embed the logo provided as the SECOND image, small, keeping its
  exact colors." This gets the real mark, not an approximation.
- **Always verify in the review pass.** If a specific mark garbles, THEN fall back to the code-overlay: ask
  Gemini to leave an empty circular badge at that spot and position the real SVG over it in the component.

## Recipe D — competitor research → Gemini decides the direction
1. Screenshot competitor + benchmark sections with `cap.mjs` (heavy sites hang on `networkidle`;
   `cap.mjs` uses `domcontentloaded`). Read the tiles, copy the best into a `refs/selected/` shortlist.
   (Parallel sub-agents work well: one agent per batch of sites.)
2. Feed the shortlist + your current section + your brand/constraints to `gemini-review.mjs` and ask it
   to CHOOSE one layout direction and return a concrete spec (structure, copy, whether an image is
   needed). Show the picks + Gemini's decision before building.
3. Build to the spec, then run the review loop above.

## Ship the result (any stack — Next.js, Vite, Astro, plain HTML, etc.)
- **Cache-bust:** many image pipelines (Next.js `next/image`, CDNs, build-time optimizers) cache
  optimized output by src filename — overwriting a PNG keeps serving the old one. Deploy image updates
  under a **NEW filename** and update the component/`<img>` `src`.
- Put landing art in your site's static/public image dir; update the section component + its `alt`.
- **`--ar 4:3` actually outputs 1200×896** (not a nominal 1376×1032). Set the rendered `width`/`height`
  (the `next/image` props, the `<img>` attributes, whatever your stack uses) to the *real* output dims —
  check with `sharp(f).metadata()` — so a card grid aligns and the image isn't subtly stretched.
  Generating a whole set at the same `--ar` keeps every card the same ratio.
- **Delete the `.raw.jpg` sibling** `gemini-image.mjs` drops next to each PNG (the pre-encode JPEG), plus any
  orphaned versions, so they don't linger as untracked files.
- Verify: type-check your site, and re-`section-shot` the live section to confirm.

## Gotchas (all hit for real)
- **ESM ignores NODE_PATH** — Playwright must resolve from a real `node_modules` next to the scripts
  (`setup.sh` symlinks one). Don't set NODE_PATH and expect `import` to find it. Corollary: **any helper
  `.mjs` you write yourself must live in `scripts/`** (or be copied there before running) — run it from
  elsewhere and it throws `ERR_MODULE_NOT_FOUND: Cannot find package 'playwright'`.
- **`networkidle` hangs** on heavy marketing sites → use `cap.mjs` (`domcontentloaded` + scroll waits).
- **A sticky/fixed header composites over `section-shot`** captures (navbar baked over the section's top).
  `section-shot.mjs` now auto-hides fixed/sticky nodes; pass `--hide "<css>"` for any other overlay.
- **A right-aligned number column in a generated table drifts up one row** — Gemini floats the whole column
  so every row pairs with the *wrong* number, and it's near-unbeatable across retries. Fix: glue each row's
  values *inline* ("`seo content writing · 520 clicks · 18.2K impressions`") so there's no separate
  column to misalign. (This alone can save ~10 wasted rounds.)
- **`gemini-review` OCR is unreliable on dense/tiny text** (monospace code, long URLs, small table cells) —
  it both false-passes real garble and false-flags correct text as wrong. For that class of image, trust
  your OWN zoomed `Read` (crop first) over Gemini's critique.
- **Gemini duplicates the page title** when the source screenshot itself repeats it (many blogs render
  the title twice) → crop to the top before `--in`.
- **Label duplication/drops** → always pin "exactly N labels, each once, no extras".
- **Handwriting drift across a set** → pass a sibling as a style-only `--in` reference.
- **Global body `zoom`** breaks viewport-clip math → use `section-shot.mjs` (element.screenshot).
- **Keep the palette tight** — background + one accent + a rare highlight. Even if the brand ships
  many colors, pick ONE for the doodles; more than one accent reads as generic.

## Style
`reference/style-prompt.md` holds the STYLE BLOCK template, the **brand-discovery** procedure, the
doodle rules, and the six brand tokens. It auto-adapts to whatever project the skill lives in —
resolve the tokens once via **Brand setup** (they cache to `reference/brand.local.md`); it asks you
only when the project's brand can't be detected.
