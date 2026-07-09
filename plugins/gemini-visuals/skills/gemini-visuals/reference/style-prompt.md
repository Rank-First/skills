# On-brand flat-doodle style prompt (auto-adapts to the host project's branding)

The look is fixed (flat, playful, doodle-annotated UI on a clean background); the **colors and
fonts are not** — they come from the project you're working in. Before generating anything, resolve
the six brand tokens below from the current project, fill them into the **STYLE BLOCK**, then append
your subject. Same discipline (tight palette, one idea per doodle, pin the counts) regardless of brand.

## The six tokens to resolve
| Token | Role | Fallback if none found |
| --- | --- | --- |
| `{{background}}` | Page/staging background the UI floats on | warm cream `#faf8f3` (or white; dark charcoal for dark brands) |
| `{{accent}}` | The ONE brand color — buttons, handwriting, arrows, cursor | deep green `#14664a` |
| `{{highlight}}` | Rare second touch, used sparingly (a star, an underline) | gold `#c8a04e` — or omit entirely |
| `{{text}}` | UI text color (near-black foreground) | charcoal `#1a1a1a` |
| `{{fill}}` | Pale tint of the accent for highlight fills / success states | pale mint `#eef3ee` |
| `{{ui_font}}` | Geometric/clean sans for the UI text | any clean geometric sans |

(The doodle handwriting is always a fluid handwritten **script** font — it's illustration, not brand,
so you don't need a project font for it.)

## Brand discovery — run this FIRST, in this order (stop when you can fill accent + background)
1. **Theme / design tokens.** Read the project's theme config: `tailwind.config.*`
   (`theme.extend.colors`, `fontFamily`), CSS custom properties in `:root` / `@theme` (`globals.css`,
   `app.css`, `index.css`), SCSS `$variables`, a JS/TS theme object (Chakra/MUI/styled-components),
   or a `tokens.json` / `design-tokens.*` / `theme.json`. Map `primary`/`brand` → `{{accent}}`,
   `background`/`bg` → `{{background}}`, `foreground`/`text` → `{{text}}`, the sans family → `{{ui_font}}`.
2. **App metadata.** `manifest.json` / `site.webmanifest` `theme_color` + `background_color`; the
   favicon / logo accent.
3. **Brand assets & docs.** A logo in `public/` / `assets/` / `static/` (sample its dominant color for
   `{{accent}}`); a `BRANDING.md` / `STYLEGUIDE.md` / brand kit; brand notes in `CLAUDE.md`.
4. **The live site.** If tokens are still unclear, `node shot.mjs <url> /tmp/_brand.png --w 1440`,
   Read it, and pull the dominant background + accent by eye; or read the hero/section component's
   color classes directly.

**If after all that you can't confidently fill `{{accent}}` and `{{background}}`, ASK the user** (don't
guess a brand): primary/accent color (hex), background (light/cream/white/dark + hex), an optional
sparing second color, and the UI font. Keep it to those; everything else has a sane fallback.

**Cache the result.** Write the resolved tokens + the assembled STYLE BLOCK to
`reference/brand.local.md` (git-ignored) so an entire image set stays consistent and later sessions
reuse it. Re-derive only when the project's brand actually changes.

## STYLE BLOCK — fill the `{{tokens}}`, then append the subject
> Flat, modern, playful product illustration in a clean vector UI style. A real app-screenshot or
> crisp mock UI fragment is the only subject, staged on a bright `{{background}}` background with lots
> of negative space. UI panels have solid flat fills, thin 1px light borders, generously rounded
> corners (14–20px), lifted by soft diffuse drop shadows so they appear gently floating — no 3d bevels,
> no glossy renders, no clay, no grain, no painterly texture, everything smooth and sharp. Add
> hand-drawn doodle annotations: short casual handwritten marker phrases plus thin wobbly freehand
> curved arrows with a little curl at the tail, drawn in `{{accent}}`. Optionally drop a single small
> solid `{{accent}}` triangular mouse cursor on a primary button. Strictly limited palette:
> `{{background}}` background, one accent `{{accent}}` for buttons/handwriting/cursor/arrows, tiny
> sparing `{{highlight}}` touches, `{{text}}` UI text, muted success states, pale `{{fill}}` highlight
> fills; keep most surfaces light/neutral so the accent pops. `{{ui_font}}`-style clean geometric
> sans-serif for UI text, a fluid handwritten script only for the doodle labels. Organized, modern,
> friendly, a little informal. No soft-3d, no photoreal people, no busy background.

> **Dark brands:** if `{{background}}` is dark, say "dark charcoal background, panels a touch lighter
> than the bg, keep the accent and handwriting bright so they pop" and use a light `{{text}}`.

## Rules that keep it clean (learned the hard way)
- **One idea per doodle.** 1 label + 1 arrow (or bracket) per point. 2–4 doodles max per image.
- **State the exact label text and its target** ("`published today` → arrow to the date").
- **Pin the count:** say "there must be EXACTLY N labels, each appearing ONCE, no repeats,
  no extras" — Gemini otherwise duplicates or drops labels.
- **Spell it out:** for any real text that must survive (titles, tags), quote it verbatim
  and add "do not misspell, duplicate, or invent any text." Then verify with a review pass.
- **Bracket/loop** around a whole area = good for "this whole block is X" (e.g. a callout
  on a Key Takeaways box).
- **Match handwriting across a set:** pass a sibling image as a *second* `--in` reference and
  say "the SECOND image is ONLY a style reference for the handwriting — copy that script,
  not its content."
- **Keep the palette tight:** background + one accent + a rare highlight. Even if the brand has more
  colors, pick ONE accent for the doodles — more than one reads as generic.
