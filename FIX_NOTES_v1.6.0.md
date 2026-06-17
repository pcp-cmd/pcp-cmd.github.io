# Aleksi Lab v1.6.0 Fix Notes

## Scope

- Rebase the working site on the v1.5.1 dark works and skill patch.
- Move the dark visual system into the main CSS stack instead of relying on a late patch file.
- Expand the site stage to 1480px for Home, Works, Article, Math, Manuscripts, Protocol, and Atlas.
- Upgrade Works into a portfolio archive with thumbnails, hero images, score rubrics, and related articles.
- Add the Gravy Raven / Starlight Fade Away archive entry with article and lightweight SVG media.
- Convert Home Selected Artifacts into a real scroll-snap carousel with auto advance and pause states.
- Tighten Article, Math, Protocol, and Atlas layouts for dark research-archive use.

## Verification Target

- `npm run build`
- `npm run qa`
- `node --check` across active JavaScript files
- desktop and mobile browser screenshot pass
