# Aleksi Lab v1.7.2 Clean Audit

Version: `v1.7.2-clean-reset`

## Structural gates

- [x] Formal CSS imports only
- [x] No root fix notes
- [x] No dead Works motion helpers
- [x] One literal Works definition per item
- [x] Canonical Works slugs and asset paths
- [x] No malformed `#U...` content paths
- [x] No duplicate public Math entries
- [x] Unified version strings

## Automated verification

- [x] `npm run qa`
- [x] `npm run build`
- [x] `npm run qa:browser`

## Browser verification

- [x] Works: 1440px
- [x] Works: 1366px
- [x] Works: 1024px
- [x] Works: 390px
- [x] Work detail score panel
- [x] Math
- [x] Manuscripts
- [x] Protocol
- [x] Reduced motion

## Delivery

- [x] ZIP generated
- [x] ZIP contents audited
- [x] Desktop handoff copied

## Verification evidence

Verified on 2026-06-20:

- Clean install: `npm install` — PASS; 1 package audited, 0 vulnerabilities.
- Static QA: `npm run qa` — PASS; 1,599 assertions.
- Content build: `npm run build` — PASS; 52 Markdown files and 5 JSON files bundled.
- Reproducible build: two consecutive builds produced identical SHA-256 hashes and no tracked output drift.
- Browser QA: `npm run qa:browser` — PASS; 496 assertions and 21 screenshots.
- Browser viewports: 1440 × 1000, 1366 × 900, 1024 × 900, and 390 × 844 — PASS.
- Work detail: canonical slug, legacy alias, missing-work state, score separation, and mobile one-column score grid — PASS.
- Works interaction: 13 cards, hover, focus toggle, active/muted state, Escape reset, semantic controls, and card containment — PASS.
- Reduced motion: card transition duration at or below 0.001 seconds — PASS.
- Manual screenshot review: no clipped card copy, CTA overlap, hidden active navigation, score overlap, horizontal overflow, illegible desktop collisions, or tablet/mobile absolute-position remnants.
- Handoff ZIP: 191 entries at the archive root and below; required runtime, documentation, QA, and lock files present — PASS.
- ZIP exclusions: `.git`, `.superpowers`, `node_modules`, `qa-artifacts`, and root `FIX_NOTES_*` files absent — PASS.
- Desktop copy: workspace and Desktop ZIP SHA-256 hashes matched — PASS.
