# Third-party sources

## assistant-ui Claude reading presentation

Source: https://github.com/assistant-ui/assistant-ui/tree/0bdf05066fcb83a64a07d542dde4fea0e8f99b76

The reading stylesheet adapts the documented Claude color, width, spacing and
font mappings. It does not import chat runtime components. Copyright (c) 2026
AgentbaseAI Inc. The full MIT license is preserved in assistant-ui-MIT.txt.

## Niku home source

Reference: https://github.com/NikuKikai/NikuKikai.github.io/tree/18cad16b438792bf0d8d0842efac70819415db17/src/pages/index

At the user's request, assets/vendor/niku-home.js includes the original vertex
and fragment shader strings from MangaRadialBackdrop.tsx and the executable
force-solver code from canvasForceSolver.ts at the reference commit. The two
shader strings are unchanged. In the solver, TypeScript imports, type
declarations, annotations, private modifier, exports and the Map generic type
are removed; the solver's executable logic is unchanged. A JavaScript wrapper
exposes the shaders and ForceLayoutEngine to this site's runtime.

The reference commit's recursive Git tree contains no LICENSE, COPYING, or
NOTICE file; its README does not provide a reuse grant. This record identifies
the source and does not label it MIT. licenses/Niku-source-record.json records
the exact commit, source paths and SHA-256 of the shader strings.

home.js integrates the original ForceLayoutEngine for desktop layout, with
this site's fixed photo, size interpolation, camera interpolation and drag
suppression. Viewport bounds, keyboard operation and two-step touch navigation
adapt the interaction to this site.
Within a narrow canvas, deterministic free-space targets use an added attraction
strength of 4 to prevent cards getting trapped beside the fixed photo. This is
a responsive adaptation, not an upstream default; movement still uses the same
continuous integration, gap forces and speed cap, without resampling positions.
Desktop positions start from this site's reference composition and use gap
forces plus a central attraction field with strength 1. Attraction is suppressed
on an axis opposing separation, following the reference's mechanism. Reduced
motion omits the desktop attraction animation; narrow screens retain the
deterministic targets described above.
The photo belongs to the world and moves with the camera, but is excluded from
layout forces and scaling. The user confirmed this world-relative behavior
in the local dynamic preview on 2026-10-05.

The user subsequently selected the reference's black-and-white radial halftone
background, later extending that visual direction to all five section pages.
site-backdrop.js supplies the canvas lifecycle and uniforms to the original
WebGL2 shaders, with a 12px grid, 120px central radius, 700px fade range,
1.3 maximum dot scale and dither strength 1. The original shader's hashCell
function determines the per-cell noise. The closed-window frame, inner black tile and DotGothic16 font
follow the reference's visual mapping; this site keeps its own photo slot and
five section names.

home.js supplies the world-relative center and camera; section pages use a
viewport-relative field behind clear white content windows. The same grid,
radial coverage and noise function are used across these entry surfaces.

## DotGothic16

Copyright 2020 The DotGothic16 Project Authors
(https://github.com/fontworks-fonts/DotGothic16).

The unmodified font at assets/fonts/DotGothic16-Regular.ttf was obtained from
the official Google Fonts repository:
https://github.com/google/fonts/tree/main/ofl/dotgothic16

Distributed under the SIL Open Font License 1.1. Full license:
DotGothic16-OFL.txt. It is used for entrance labels, section navigation, headings
and interface controls. Article reading is deferred and keeps its prior fonts.

## Marked 12.0.2

Distribution: https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js

Used for Markdown rendering, locally hosted so the reading layout does not
depend on a CDN. Full license: marked-MIT.txt.

## DOMPurify 3.1.6

Distribution: https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js

Used to sanitize Markdown output. Full upstream dual-license text:
DOMPurify-LICENSE.txt. The distributed library retains its upstream notice.

## Existing optional remote dependencies

The article reader retains its existing pinned KaTeX 0.16.11 CDN stylesheet
and runtime for legacy mathematical articles. No new chat transport or API
provider is introduced. Existing archive pages retain their own dependencies.

## lottie-web 5.12.2

Official package: https://registry.npmjs.org/lottie-web/-/lottie-web-5.12.2.tgz

Upstream: https://github.com/airbnb/lottie-web/tree/v5.12.2

The unmodified `build/player/lottie.min.js` from the pinned npm package is
hosted locally as `assets/vendor/lottie-5.12.2.min.js` for the Writing list
page's existing `assets/lottie/overview-dark.json` animation. The player no
longer needs a CDN request on that page. This integration uses the original
player version and does not change article or Room behavior.

The package was fetched using `npm pack lottie-web@5.12.2 --ignore-scripts`;
no package scripts were executed or application dependencies installed.
Package metadata confirms version 5.12.2 and the MIT license. Copyright (c)
2015 Bodymovin. The full original `LICENSE.md` is preserved byte-for-byte as
`lottie-web-MIT.txt`.

Runtime SHA-256:
`a0757321f974527bda3cc2593bf56cc7ffe4578421249ced6ae49ffb1c529f90`.
Tarball SHA-1:
`579ca9fe6d3fd9e352571edd3c0be162492f68e5`.
