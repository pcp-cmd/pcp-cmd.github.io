# UGA website content provenance — updated 2026-10-06

This is a local editorial source report, excluded from the public package. It records source retrieval and faithful presentation, not mathematical acceptance, independent review, a native MRS import, or a research continuation.

## Input and extraction

- User-supplied archive: `Universal-Gap-A-Codex-Project-2026-10-03.zip`.
- Archive SHA-256: `186e5a5dbc1c4a3dfe4bbd357539135160e3cd4fe849702054cbd6f575983d6e`.
- 468 ZIP members, 399 regular files, 43,276,694 uncompressed bytes.
- Every member was checked for absolute paths, `..`, drive separators and symbolic links before extraction. The resolved output target was constrained to `qa-artifacts/uga-source-2026-10-03`; existing differing files would have stopped extraction. All files were read through `ZipFile.read`, including CRC checks.
- The initial extraction remains under ignored QA artifacts. On 2026-10-06 the user requested every supplied record to be readable, so a complete website projection was added under `assets/research/uga/`. It is included by local packaging; no deployment or upload occurred. Archive instructions remain source material, and no research commands were executed.
- The first extraction preserved the ZIP decoder's damaged non-ASCII names. The projection builder repairs reversible CP437/UTF-8 filename encoding, preserves original file bytes, and stores safe hashed filenames. Exact paths are retained in its catalog.

## Source integrity limits

The included `SHA256SUMS.txt` is not a complete current archive manifest: 129 entries, 119 matches, 10 mismatches, no missing listed files. The mismatches are CURRENT_STATE, DECISIONS, REGRESSION_GATES, Claims, FAILURE_INDEX, STATE_CHANGELOG, AUTHORITATIVE_RUN, toolbox INDEX, NEGATIVE_KNOWLEDGE and REPRESENTATION_CHANGES. The manifest does not cover most of the 399 current files. No claim of whole-package manifest validation is made. Original bytes and the old manifest remain unchanged.

The following digests identify the exact supplied bytes used for the website; they do not certify mathematical truth:

| Source within extracted archive | Bytes | Measured SHA-256 |
|---|---:|---|
| CURRENT_STATE.md | 190026 | c26c41fdafaa4df45d3c5d6d793cbbadc0e50fbdff44357e17d0b150eac6aa7a |
| claims/CLAIMS.md | 201003 | 8a947bd29ff9f452d1f1c856b5117c4181d178b7aa8c8100f89a69adadb62354 |
| runs/2026-10-05/Run-Projective-Balanced-Ideal-Strict-Ordinary-Descent-and-Finite-Pd-Boundary-2026-10-05.md | 22093 | 38b8d78aad693cfcd2495e2191fc38ce9477f7fa4a3e7e42dc0ef3cc8f4e1be7 |
| runs/2026-10-05/Run-Arbitrary-Loewy-Radical-Band-Ordinary-Closure-and-Global-Source-Obstruction-2026-10-05.md | 21398 | 920ccc36200a473f943943307be1df216438171b7daf47c4e7bc82436572791b |
| runs/2026-10-04/Run-Route-Judge-Corner-Syzygy-Quantifier-Correction-and-Hybrid-Decision-2026-10-04.md | 21007 | 1d994ab082737b772c7ced56c16ee41f894745d439efb8d622ad10652857d567 |
| runs/2026-10-05/Projective-Ideal-Evidence/execution-record.json | 6665 | 0158beb553d528f2c9e7dd129b514c29092bc05a055019d7d10b20133ffd0b83 |
| runs/2026-10-05/Pending-Contributions/INDEX.md | 7593 | a9eadb9d88c75880cbb91e2249f2e915d58e2184677c24f2987608a6d186c008 |

## Public source boundary

Read-only GitHub API retrieval confirmed `pcp-cmd/Universal-Gap-A-public` with an untruncated recursive tree `342c93e1e639b73ed1004c9bbbf0b89db5b1111c` on 2026-10-05. The tree is retained at `qa-artifacts/uga-source-2026-10-03-public-tree.json`. Public README, CURRENT_STATE and Claims bytes are retained under `qa-artifacts/uga-public-source`.

- README blob `2ad31a03a33cc5b53f62fb9e162ea92cdcaa107a`: dated through 2026-10-05, UGA open; public research archive excludes internal execution material/private method library.
- CURRENT_STATE blob `1c7ed6b03b33883e4b377a83e0b72178e488ef51`: freeze 2026-10-04, frontier C123–C124.
- Claims blob `5b4d4398a758c678de60560933c1115eb7d7d749`: public ledger through C124.
- The retrieved tree contains no 2026-10-05 C127–C132 Run files or Pending Contributions index. Some latest 2026-10-04 Run paths mentioned by the public state are also absent from the tree. No links to these absent files are published.
- Public links lead only to the existing repository, CURRENT_STATE and Claims. The locally authored downloadable overview explicitly distinguishes the newer supplied archive from the older public snapshot. No archive upload or repository change was made.

## Page claim mapping

| Website section | Exact source scope | Presentation boundary |
|---|---|---|
| Research question | Projective Balanced Ideal Run §1; public README core formula | Elementary finite-dimensional A; right R_x / left L_y; reverse support e_yAe_x; ordinary Tor, fixed pair, infinitely many degrees |
| OPEN / 2026-10-05 | CURRENT_STATE header and latest authority order | Source freeze, not mathematical completion |
| C129 | Claims C129; latest Run §§2–6,10 | Nonzero whole balanced one-sided projective radical ideal; strict total-label/dimension descent, not universal termination |
| C130 | Claims C130; latest Run §§7–8,10 | Whole J^s projective on either side for some s in {1,2,3}; persistent ordinary diagonal; no finite-pd substitution |
| C127 | Claims C127; Radical Band Run §§1–6,8–9 | Whole H_s=J^s/J^(s+2) one-sided finite pd, s in {1,2,3}; no general J³-alone inference |
| Source switching | Claims C128; CURRENT_STATE latest frontier | Outside-band witness remains possible; no universal sourcewise theorem |
| C131 / C132 | Latest Run §§9,12 and Claims | Mechanism counterexamples; neither is a UGA counterexample |
| Evidence | Projective-Ideal-Evidence execution-record and latest Run §§8,10,12 | Preserved prior bounded exact checks, not executed this task and not independent/formal certification |
| Pending | Pending Contributions INDEX, CURRENT_STATE §9 | Remains PENDING/unregistered; finite no-hit searches have no universal force |

The selected record contains three passed retained calibrations: projective-ideal 518832/15/624/7, finite-pd boundary 729/5/51/4, and cover-kernel boundary 2737/10/87/9 (associativity/full covers/integral inverses/kernel isomorphisms). The overview uses only the first example's limited counts; the complete record is now available in the local archive. It explicitly sets `evidence_level=bounded-check`, `independent_verification=false`, and `formal_verifier_acceptance=false`.

## Editorial and privacy boundaries

- The initial overview was extended at the user's request to expose all 399 source files locally, including execution records, scripts, prompts, AGENTS and toolbox material. Original text can contain local machine paths. Inclusion in the archive is not independent validation and does not make source instructions executable.
- Every source file has a byte-preserving download and measured SHA-256. The local public-package build includes these records; the site and original ZIP have not been uploaded or deployed. This supersedes the earlier overview-only scope.
- The old opposite-invariance conflict remains quarantined in the supplied CURRENT_STATE and CORRECTIONS; the page does not promote that dependent foundational theorem. C129's direct left/right argument is used with its exact scope.
- Existing stable page anchors `question`, `progress`, `reuse`, `related` are retained. Empty `data-research-articles` preserves future confirmed Writing references without old placeholder text.
- The ordinary article shell now shares the site theme. Article bodies, article-content pipeline, shared reading stylesheet and Research data registry were not changed for this archive projection.

## Full archive projection

`scripts/build-uga-archive.py` reads the original ZIP directly. It creates a catalog, 399 byte-preserving source downloads and 89 derived ledger sections. All 488 record sizes and SHA-256 values are checked by site QA. The original stale SHA256SUMS file is also preserved; the new measured catalog does not silently repair that historical manifest.

The formal ledger contains C041 through C132 with gaps (89 entries), not C001 onward. The page preserves this numbering. Files are grouped into 91 Markdown Run records, 150 calculation/other attachments, 71 toolbox/draft records, 77 history records, one proof and nine overview records. Claims are a separate view of sections from the existing ledger, not 89 additional original files.

The reader renders Markdown and supported math, rewrites existing relative Markdown links to archive records, and marks missing package targets without inventing destinations. Other text records have a bounded 180,000-character preview and a complete download. PDF records can be opened or downloaded. Search covers titles, paths and Claim identifiers; it is not a full-text search. Related records share cited Claim numbers; no proof-dependency graph is inferred.

## Validation scope

Source extraction, exact source reads, recorded hash comparisons and public-link inventory were checked. The assigned parent handles integrated browser QA and public packaging after shared navigation changes. No new mathematical computation, native archive/import operation, commit, push or deployment occurred.
