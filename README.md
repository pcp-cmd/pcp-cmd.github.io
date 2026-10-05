# Aleksi Lab

The local redesign now has a cat avatar and six home entrances: Writing,
Project, Research, About, Works and Room. The home, section pages and ordinary reader share
Niku's noisy radial halftone, DotGothic16 interface text, white content windows
and black frames. Artwork retains its colors.

The WebGL2 vertex and fragment shader strings come directly from Niku commit
`18cad16b438792bf0d8d0842efac70819415db17`. The desktop `ForceLayoutEngine`
preserves the original executable logic with TypeScript syntax removed.
`licenses/Niku-source-record.json` records the source and shader hashes.
No upstream license grant was found at that commit; it is not labelled MIT.
Source and font notices are in `licenses/THIRD-PARTY.md`.

- `index.html`: cat avatar plus six entrances. The photo window is fixed in
  world coordinates and moves with canvas dragging; it does not yield or scale.
  On phones the Aleksi brand sits inside its upper-right corner to avoid overlap.
  Each expanded entrance contains an original black-and-white manga scene and
  an explicit entry link. The six scenes share ink lines and screentones while
  the central cat photo retains its original color. Prompts and asset hashes
  are recorded in `docs/home-manga-art.json`.
- `writing.html`: 41 approved essays about AI collaboration, first published
  on 2026-10-06, with long-form / short-note filters. The complete list is
  generated into HTML before JavaScript runs. The former overview animation
  uses the original Lottie Web 5.12.2 player, hosted locally and loaded after
  list initialization; desktop shows it beside the introduction, mobile above.
- `project.html`: three real public projects — Aleksi Workbench,
  Vibe Front-End Tuner and CoolCat — with purposes, features, current status
  and verified repository links.
- `research.html`: the supplied Universal Gap A materials, including the
  2026-10-05 C127–C132 frontier, precise hypotheses, evidence levels and open
  questions. UGA remains open. The newer supplied snapshot is distinguished
  from the public repository's older C124 snapshot.
  The searchable archive exposes all 399 supplied files, 89 original Claim
  sections and 91 Markdown Run records. `research-record.html` reads each
  record with original provenance, status and a complete download.
- `about.html`: confirmed motivations and pending personal background.
- `works.html`: 13 works with restored titles, summaries, layout notes and
  visual-system descriptions. Staggered entry, hover enlargement and full-image
  viewing remain on this page, with next/previous controls and keyboard support.
  Work 07 uses a reversible display adjustment: brightness `.92`, contrast
  `1.18`; the viewer can switch back to its unchanged original image.
- `room.html`: compatibility entry to `magic-cabin/index.html?view=shelf`,
  with a usable fallback link when JavaScript is unavailable.
- `article.html`: ordinary reading in the common halftone/window theme;
  existing content and source-return behavior remain compatible.
  `work-detail.html` retains legacy URL compatibility. Book-room runtime
  implementation remains with the other window.

`site-data.js` stores six-section navigation and confirmed Writing records;
`works-catalog.js` stores the active 13-work catalog. Add a Writing article with
`approved: true`, `title`, `date`, `description`, `type` (`long` or `note`) and
its Markdown `source`. Research's `researchArticles` references the same source
records. The local synthetic sample at `article.html?sample=reading` remains
explicitly unpublished and excluded from the public package. It appears in
the local list only when no approved articles exist. `npm run build:writing`
refreshes the HTML list from `site-data.js`; `npm run build` includes this step.
The same 41 records populate two Room shelves (36 and 5 books), without changing
the reader or page-turning implementation. Source preservation and publication
authorization are recorded in `docs/writing-content-sources.md`.

Desktop entrance windows use the original central attraction and gap forces.
Narrow screens retain deterministic reachable targets, two-step entry and
reduced-motion handling. The ordinary reader's shell now uses the shared theme;
the separate book-room implementation is unchanged. Publication of the current
site and the 41 supplied Writing essays was authorized on 2026-10-06.

Current check results and limits are recorded in `docs/aleksi-redesign-acceptance.md`.
Logs and current captures are under `qa-artifacts/room-archive/`.
See `docs/aleksi-redesign-acceptance.md` for scope and `design-qa.md` for visual
review. UGA source provenance is in `docs/uga-content-sources.md`.

Current release: `v1.7.2-clean-reset`

Aleksi Lab is a static personal site with research and works sections. The v1.7.2
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

Browser QA is a formal release check. Install the declared development dependency
and Chromium once per clean environment:

```bash
npm install
npx playwright install chromium
npm run verify:browser
```

The default `npm run verify` remains the fast static gate. Run
`npm run verify:browser` before public delivery.
Run these two commands sequentially: the static QA temporarily exercises and
restores generated indexes. Local dependencies and `qa-artifacts/` remain
ignored and untracked, and are excluded from the public package.

## Public deployment package

The GitHub repository keeps `.git`, archival notes, source references, and build
tools. Generate a separate public-only directory for deployment:

```bash
npm run pack:public
```

The default output is `dist/public`. It excludes `.git`, `docs/archive`, source
Lottie files, QA scripts, build scripts, and non-public content. Validate the
same packaging rules with:

```bash
npm run qa:public
```

## Local source build

To refresh the local Revision Protocol and Math Analysis inputs, set both
environment variables and run the cross-platform wrapper:

```text
ALEKSI_REVISION_SKILL=<path to the local revision skill directory>
ALEKSI_MATH_CHAPTER_01=<path to the local chapter-01 directory>
```

```bash
npm run build:local
```

The wrapper reports missing variables before changing generated content.

## Structure

- `home.js` and `assets/css/entrance.css` implement the cat-avatar window and six section entrances.
- `assets/vendor/niku-home.js` preserves Niku's original shader strings and the force solver with TypeScript types removed.
- `site-backdrop.js` integrates the original WebGL2 shaders across the entrance and section pages; `assets/css/site-theme.css` supplies their shared interface styling.
- `works-catalog.js`, `gallery.js` and `assets/css/gallery.css` implement the current Works exhibition and in-page descriptions.
- `assets/css/research.css` and `content/research/uga-overview.md` support the research overview and its curated download.
- `research-archive.js`, `research-record.html`, `assets/css/research-archive.css` and `assets/research/uga/` provide the complete source archive; `scripts/build-uga-archive.py` regenerates it from the user-supplied ZIP.
- `room.html` forwards to the existing book-room shelf; the book-room implementation is maintained independently.
- `reading.js` and `assets/css/reading.css` implement the shared reader and inline mobile controls.
- `content.js` stores navigation, home guide rows, selected artifacts, protocols, manuscripts, and source metadata.
- `app.js`, `works.js`, `math.js`, `manuscripts.js`, and `protocol.js` render page-specific rows and graph surfaces.
- `graph-data.js` and `graph.js` power the Math Knowledge Graph and Lab Atlas.
- `styles.css` imports the site CSS owner files.
- `assets/css/` contains tokens, shared components, graph styling, and page-level CSS.
- `assets/` preserves archive illustrations and local Markdown rendering dependencies.
- `content/` stores manuscript notes, system records, logs, and plog source material.
- `scripts/maintenance/` stores historical one-off maintenance tools that are not part of the normal build pipeline.

## Deployment

The public site uses the existing GitHub Pages deployment from remote `main`.
Only the verified `npm run pack:public` output belongs in that branch. Keep
development sources, editorial notes, fixtures and local QA in the local source
branch; do not push the source branch as the website root.

`scripts/prepare-pages-release.js` prepares an isolated Git index and a release
commit whose sole parent is the reviewed remote `main`. It checks every Git
blob against the packed bytes, records the source/release commits in
`qa-artifacts/pages-release/prepared.json`, and never pushes. The release is
then pushed normally as `<release-sha>:main`, without force. If `main` advances,
review the new changes before preparing another release. Do not merge the
artifact branch into the local source branch. Confirm the matching Pages run
and live content after the push.
