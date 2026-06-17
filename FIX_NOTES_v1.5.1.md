# Aleksi Lab v1.5.1 Patch Notes

## Added

- Added new Works entry: `Gravy Raven / Starlight Fade Away`.
- Added cover image: `content/design/works/gravy-raven-starlight-fade-away.jpg`.
- Added paired article: `content/design/works/gravy-raven-starlight-fade-away.md`.
- Added score rubric rendering on `work-detail.html` / `work-detail.js`.
- Added article link rendering for work detail pages.
- Archived uploaded learning diagnosis skill under `content/skills/learning-diagnosis-protocol/`:
  - `SKILL.md`
  - `openai.yaml`
  - `README.md`
- Updated `content/system/revision-protocol/index.md` to publicly package the skill as Revision Protocol / 可迭代修订协议.

## Fixed / Revised

- Added `assets/css/99-dark-patch.css` to enforce an all-dark editorial baseline across primary pages.
- Restored Works carousel as a horizontal scroll-snap carousel with auto-advance and hover/focus pause.
- Reduced graph node scale toward an Obsidian-like atlas style.
- Added interactive Math Lab filters.
- Fixed Chapter 01 manifest paths so referenced math Markdown files exist.
- Updated QA checks to protect the new constraints instead of the older 3-card static grid assumption.

## Visual Diagnosis for Protocol Screenshot

The Protocol page in the previous state still read as a light page with black modules, not a real dark editorial system. The worst issues were: excessive white canvas, weak internal-engine contrast, oversized top spacing, and no clear relationship between Re-enter and the engine block. The fix direction is to make dark the default surface, not a section-level decoration.
