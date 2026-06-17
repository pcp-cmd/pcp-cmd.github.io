# Aleksi Lab

Personal research laboratory for `Aleksi Lab / 未完手稿`.

## Preview

```powershell
node server.js
```

Open `http://127.0.0.1:4177/`.

## Structure

- `index.html` is the research entrance: hero artifact, guide rows, selected artifacts, and lightweight archive links.
- `content.js` stores navigation, home guide rows, selected artifacts, protocols, manuscripts, and source metadata.
- `app.js`, `works.js`, `math.js`, `manuscripts.js`, and `protocol.js` render page-specific rows and graph surfaces.
- `graph-data.js` and `graph.js` power the Math Knowledge Graph and Lab Atlas.
- `styles.css` imports the v1.6 CSS stack: legacy first, then dark tokens/base/layout/components/graph/page overrides.
- `assets/css/` contains Claude tokens, row/card components, graph styling, and page-level CSS.
- `assets/` stores static WebP illustrations for the hero and four rooms.
- `content/` stores manuscript notes, system records, logs, and plog source material.

## Current Version

v1.6 rebuilds the site as a dark research archive with a wider 1480px stage, portfolio-grade Works entries, score rubrics, related articles, real Math filters, a Protocol method engine, and smaller Obsidian-like knowledge graph nodes.

## Deployment

The site uses relative paths for CSS, scripts, and assets, so it can be published directly through GitHub Pages from the project folder.
