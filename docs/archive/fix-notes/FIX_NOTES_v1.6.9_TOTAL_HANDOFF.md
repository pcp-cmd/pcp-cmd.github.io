# FIX_NOTES v1.6.9｜Total Handoff Implementation

Applied according to `CODEX_HANDOFF_TOTAL_HOME_WORKS_MANUSCRIPTS_20260617`.

## Completed

- Restored the dark Works / Work Detail system and avoided visible English placeholder fallbacks.
- Added a final homepage cover fallback so the first screen no longer exposes Guide Rows too early.
- Added unified navigation current-page markers with `aria-current="page"`.
- Added unified hover / active / selected states for guide rows, index rows, reading rows, and archive links.
- Added Manuscripts reading-row selected state with `sessionStorage` recovery after returning to the page.
- Rebuilt Works exhibition card motion around CSS variables (`--x`, `--y`, `--rot`, `--scale`, `--opacity`, `--z`).
- Improved Works card material quality with subtle paper texture, inner image framing, and restrained dock state.
- Increased active Works card height and fixed the action area so `进入作品` remains visible.
- Added Work Detail score rendering and Chinese metadata labels.
- Updated source fallbacks in `works-data.js` to avoid visible `Source pending review` entries.

## QA

- `npm run qa` passed.
