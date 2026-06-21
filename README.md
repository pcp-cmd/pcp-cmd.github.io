# Aleksi Lab

Current release: `v1.7.2-clean-reset`

Aleksi Lab is a static warm-editorial research and works archive. The v1.7.2
clean reset uses formal CSS owner files, canonical Works data, generated Markdown
indexes, and executable QA instead of versioned hotfix layers.

## Preview

```powershell
node server.js
```

Open `http://127.0.0.1:4177/`.

## Verification

The default verification chain is dependency-free and suitable for a clean checkout:

```bash
npm run verify
```

Browser QA is intentionally separate:

```bash
npm install -D playwright
npx playwright install chromium
npm run verify:browser
```

Playwright is optional and is only required for `verify:browser`; it is not part of
the dependency-free default `npm run verify` chain.

## Local source build

The public repository does not contain private source paths. To refresh the local
Revision Protocol and Math Analysis inputs, set both environment variables and run
the cross-platform wrapper:

```text
ALEKSI_REVISION_SKILL=<path to the local revision skill directory>
ALEKSI_MATH_CHAPTER_01=<path to the local chapter-01 directory>
```

```bash
npm run build:local
```

The wrapper reports missing variables before changing generated content.

## Structure

- `index.html` is the research entrance: hero artifact, guide rows, selected artifacts, and lightweight archive links.
- `content.js` stores navigation, home guide rows, selected artifacts, protocols, manuscripts, and source metadata.
- `app.js`, `works.js`, `math.js`, `manuscripts.js`, and `protocol.js` render page-specific rows and graph surfaces.
- `graph-data.js` and `graph.js` power the Math Knowledge Graph and Lab Atlas.
- `styles.css` imports the site CSS owner files.
- `assets/css/` contains tokens, shared components, graph styling, and page-level CSS.
- `assets/` stores static WebP illustrations for the hero and four rooms.
- `content/` stores manuscript notes, system records, logs, and plog source material.
- `scripts/maintenance/` stores historical one-off maintenance tools that are not part of the normal build pipeline.

## Deployment

The site uses relative paths for CSS, scripts, and assets, so it can be published directly through GitHub Pages from the project folder.
