# FIX NOTES v1.5.0

## Summary

Rebuilt Aleksi Lab from the v1.4 research entrance into the v1.5 Claude / Anthropic / Obsidian direction.

## Changes

- Moved the old monolithic stylesheet into `assets/css/legacy.css`.
- Added the v1.5 CSS stack under `assets/css/`: tokens, base, layout, components, graph, and page overrides.
- Established Claude neutral, clay, oat, and illustration-panel tokens.
- Reduced page and section title scale and normalized Chinese copy rhythm.
- Reworked Home into a dark guide entrance with one hero artifact, four guide rows, and three selected artifacts.
- Reworked Works into three selected Claude cards plus archive index rows.
- Reworked Math Lab into a dark Math Knowledge Graph plus current manuscript and revision-note index rows.
- Reworked Manuscripts into reading list rows with a Claude segmented control.
- Reworked Protocol into numbered guide rows with a Lab Atlas entrance.
- Added `atlas.html`, `graph-data.js`, and `graph.js` for the whole-site Lab Atlas.
- Replaced legacy QA with v1.5 checks for CSS structure, card budgets, graph structure, typography, and banned visual effects.

## Verification

- `npm.cmd run build`
- `npm.cmd run qa`
- `node --check app.js`
- `node --check works.js`
- `node --check math.js`
- `node --check manuscripts.js`
- `node --check protocol.js`
- `node --check graph-data.js`
- `node --check graph.js`
- Browser QA on desktop and mobile for Home, Works, Math Lab, Manuscripts, Protocol, and Lab Atlas.
