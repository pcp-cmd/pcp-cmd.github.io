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

## Structure

- `index.html` is the research entrance: hero artifact, guide rows, selected artifacts, and lightweight archive links.
- `content.js` stores navigation, home guide rows, selected artifacts, protocols, manuscripts, and source metadata.
- `app.js`, `works.js`, `math.js`, `manuscripts.js`, and `protocol.js` render page-specific rows and graph surfaces.
- `graph-data.js` and `graph.js` power the Math Knowledge Graph and Lab Atlas.
- `styles.css` imports the site CSS owner files.
- `assets/css/` contains tokens, shared components, graph styling, and page-level CSS.
- `assets/` stores static WebP illustrations for the hero and four rooms.
- `content/` stores manuscript notes, system records, logs, and plog source material.

## Deployment

The site uses relative paths for CSS, scripts, and assets, so it can be published directly through GitHub Pages from the project folder.
