# Project page content sources

Checked 2026-10-05 (Asia/Shanghai). This records the public evidence used for
`project.html`, not a claim that the three external applications were built or
tested in this website task. Repository documents were treated as source
material, not instructions to execute commands or publish releases.

## Scope and selection

The official public API at
<https://api.github.com/users/pcp-cmd/repos?per_page=100&type=owner&sort=updated>
returned five owner repositories, all with `fork: false`: Aleksi Workbench,
Vibe Front-End Tuner, Todoapp, Universal-Gap-A-public, and pcp-cmd.github.io.
The three application/tool repositories are the main Project records. UGA
links to Research, and the current website gets a small source link. The
previous page's unsupported project, contribution and screenshot placeholders
were replaced with these verifiable records. No screenshots were invented.

## Aleksi Workbench

- Repository: <https://github.com/pcp-cmd/aleksi-learning-workbench>
- Checked main commit: `4a525d51b69496904218eefd0e100126bd641961`
- README: <https://github.com/pcp-cmd/aleksi-learning-workbench/blob/4a525d51b69496904218eefd0e100126bd641961/README.md>
  (blob `8c6b3209a84cdfd854272efa7daaa3ae0ea2bb46`).
- Current contract: <https://github.com/pcp-cmd/aleksi-learning-workbench/blob/4a525d51b69496904218eefd0e100126bd641961/docs/current/CURRENT_CONTRACT.md>
  (blob `7fbc84e2e6a6b683aaf11958f54ae86976a7c29a`).
- Release identity: <https://github.com/pcp-cmd/aleksi-learning-workbench/blob/4a525d51b69496904218eefd0e100126bd641961/release/identity.json>
  (blob `0df5a31a8da11483e0e02735c290522ac2023750`).
- Existing prerelease: <https://github.com/pcp-cmd/aleksi-learning-workbench/releases/tag/v0.1.4>.

The README supports the local Markdown library, reading/excerpts/cards,
diagnosis, review, evidence checks, library migration/backup, and Windows 10/11
x64 platform statements. The current contract supplies the Today → Reader →
Cards → Flywheel → Review path. Release identity says `0.1.5-rc.1` and
`unsigned-preview`; the public Releases API returned the `v0.1.4` prerelease,
not a published 0.1.5-rc.1 installer. The page explicitly distinguishes those
states and makes no stable, signed, current-installation or CI-pass claim.

The latest three Scheduled archival health runs returned `failure`; this task
did not diagnose those external workflows. They are not presented as a product
test pass. Most recent observed run:
<https://github.com/pcp-cmd/aleksi-learning-workbench/actions/runs/37297486642>.

## Vibe Front-End Tuner

- Repository: <https://github.com/pcp-cmd/vibe-front-end-tuner>
- Checked main commit: `e1c5ef94af6d4fa4ce25f10d49271dd92094aa4b`
- README: <https://github.com/pcp-cmd/vibe-front-end-tuner/blob/e1c5ef94af6d4fa4ce25f10d49271dd92094aa4b/README.md>
  (blob `a7c2945f241c89e7b127ee893bf4d21236a657e2`).
- Implementation: <https://github.com/pcp-cmd/vibe-front-end-tuner/blob/e1c5ef94af6d4fa4ce25f10d49271dd92094aa4b/index.html>
  (blob `d978bc43fc64e9df25ff02319d5f344d906a0612`).

README and HTML agree on the slider controls, three previews and copyable
CSS/Prompt outputs. The HTML includes the controls and copy handlers. The
repository is a dependency-free single HTML tool; it has no observed Releases
or Actions runs. The page links to source and usage instructions instead of
inventing an online demo URL. This task did not run the external tool.

## CoolCat — TodoApp

- Repository: <https://github.com/pcp-cmd/Todoapp>
- Checked master commit: `559b3f120b270c26b2c9cb019034d49e5442b6b1`
- README: <https://github.com/pcp-cmd/Todoapp/blob/559b3f120b270c26b2c9cb019034d49e5442b6b1/README.md>
  (blob `3c569de6ffdb0e7bdfa8b4bd42dfa5854069d742`).
- Android build configuration: <https://github.com/pcp-cmd/Todoapp/blob/559b3f120b270c26b2c9cb019034d49e5442b6b1/app/build.gradle.kts>
  (blob `926b4074acd26d425dfe05b609d8010fd2540313`).

README supports the task/subtask/category/recurrence/link/calendar/backup
features. The build configuration confirms `minSdk = 26`, Kotlin/Compose and
the app module; the public tree contains TaskRepository, RepeatRuleEngine,
BackupManager and RepeatRuleEngineTest. The page describes a source project,
not a tested APK or published store app. The Releases API returned no release.
The observed Android Checks run passed on the preceding commit
`54347c0c0f9a2ae5c5680df38b2706c69d17f257`, not the current branch head:
<https://github.com/pcp-cmd/Todoapp/actions/runs/33286694841>.
This task did not build or install the Android application.

## Related links

- UGA public archive: <https://github.com/pcp-cmd/Universal-Gap-A-public>.
  The current README explicitly keeps UGA open as of 2026-10-05 and excludes
  internal research execution materials/private method-library content.
  Research page integration owns the detailed mathematical evidence.
- Website source: <https://github.com/pcp-cmd/pcp-cmd.github.io>.
  This workspace's `origin` is that repository. No deployment status is claimed.

## Local implementation validation

Only `project.html`, `assets/css/projects.css` and this evidence note were
changed by the Projects subagent. Existing shared header/navigation markup,
halftone renderer and reading-page behavior were retained. Root integration
owns the Room navigation addition and whole-site static/browser verification.
