# Aleksi Lab v1.1.5 — Chain Atlas & Math Notes Visibility Fix

## Fixed

1. **Revision Chain atlas card density**
   - The atlas no longer forces all seven cards into one cramped desktop row.
   - Cards now use `repeat(auto-fit, minmax(230px, 1fr))` and a 4-column desktop cap.
   - Card min-height, padding, title line-height, and overflow behavior were adjusted.
   - Long titles such as `Compression` now stay inside the card.

2. **Chain card typography**
   - Atlas titles use a stronger display serif setting.
   - Card text remains readable with improved spacing and less cramped layout.

3. **Math notes visibility**
   - `math.js` now supplements `manifest.json` with `markdown-index.json` and `content/content-bundle.js`.
   - Notes under `content/math/analysis/chapter-01/notes/`, `web-latex/`, and `cards/` can be discovered through generated indexes/bundles.
   - Added `scripts/build-content-bundle.js`.
   - `npm run build` now regenerates the markdown index, manifest, and file:// fallback content bundle.

## Important workflow

After adding new Markdown files under:

```text
content/math/analysis/chapter-01/notes/
```

run:

```bash
npm run build
```

Then preview with:

```bash
npm run dev
```

and open:

```text
http://127.0.0.1:4177/math.html
```

If you directly double-click an HTML file and open it through `file://`, the site can only see files that are already included in `content/content-bundle.js`, so running `npm run build` is required after adding notes.

## QA

`npm run build` and `npm run qa` both pass.
