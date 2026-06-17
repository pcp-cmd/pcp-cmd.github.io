# Aleksi Lab v1.3.0

## Changed

- Added `works.html` as a Works carousel for the visual artifacts in `content/design/works`.
- Added `work-detail.html` for a manuscript-like detail view of each work.
- Added `works-data.js`, `works.js`, and `work-detail.js` so the portfolio stays static-upload friendly for GitHub Pages.
- Added Works to the primary navigation and kept the v1.2.5 warm graphite card material.

## Motion

- Uses GSAP timeline, ScrollTrigger batch reveal, and small hover response.
- Keeps carousel movement user-driven through native horizontal scroll and Prev/Next buttons.
- Respects `prefers-reduced-motion`.

## Notes

- No Swiper, no 3D carousel, no autoplay, and no infinite loop.
- Detail pages use GPT Review / AI-assisted Critique as auxiliary visual and structural review, not an official score.
