# 993 — focused commercial corner source re-review

Reviewer: corner_source_review, GPT-6 Astra at xhigh, read-only. Date: 2026-10-14. Target: nine active handoff pins in data/commercial-work/handoff-pins.json, receipt SHA-256 e0f73bb87570c8ad96c047b83ac06879f5ca09e4d296412a228f72d82600d89d;992 records repairs and991 retains the pre-fix target. All nine pins and seven pre-fix snapshot files matched before/after review.

**Verdict: CC-1 and CC-2 are resolved in the frozen source. No further blocking code findings. Runtime and appearance acceptance remain pending.**

**CC-1 — resolved.** buildings.ts:393 preserves constructor shadow policy only for authoredFrontage.source===false. Ordinary/source meshes keep prior defaults. Repository-wide inspection found two producers of that marker: the commercial assembly and existing crossing surround, which explicitly retains castShadow=true at unchanged crossing-frontage.ts:102. commercial-corner.test.ts:177 dispatches the installed TilesRenderer’s actual load-model event and checks glazing, fittings, opaque cladding, source meshes and loaded counter. It exercises the original failing integration boundary.

**CC-2 — resolved.** commercial-corner.ts:327 makes only glazing’s registered normal material invisible and disables depth writes. Unchanged normal-pass.ts:28–40 installs that material, clears the scene override for drawing and restores originals in finally. Installed WebGLRenderer.js:1801–1803 excludes invisible materials from its render list, preventing pane submission. Opaque room/frame/source normals remain visible and depth-writing. commercial-corner.test.ts:200 covers both styles, successful/throwing swaps, beauty restoration and retained source-suppression uniforms.

The repair adds no geometry, textures, lights or material objects. Geometry generation, source binding, threshold, shared atlas ownership and disposal remain unchanged. Invisible glazing normals remain registered and owned by existing disposal. Seven beauty meshes,11,248 triangles and1,805,880 geometry bytes remain applicable construction bounds; no measured performance improvement follows.

The retained old-behavior control log has all three new cases failing at intended CC-1/CC-2 assertions. The retained green log reports21 passing commercial/normal-pass tests. The reviewer did not execute either suite. Evidence limit:992 names data/commercial-work/pass-repair-typecheck.log, but it is absent; worker-reported typecheck pass is not an inspected receipt. Root’s complete integrated type gate remains required before any code commit.

Exact repaired files: buildings.ts29624B/f7675e72b9e24dbd0d5d6d8579d82bbf42ccabc887126496cd65436f1e93495d; commercial-corner.ts27069B/4151274f6fd9768c4efda836cbb514d081f1099e637c4ee62e71ddfb44ea9bf9; commercial-corner.test.ts21354B/e0b01b3651ed60bfd68c22469429f071e59443d2fbcc890b62c20e4d3d030e42.

No files, index, caches or inputs changed; no tests, gates, browser or server launched. Candidate released to root. Noon/dusk appearance, actual controls, browser tile lifetime, final integrated gates and independent integrated acceptance remain open.

Root disposition: source findings accepted as resolved; retain the missing-receipt limit and obtain the actual integrated type result. Code remains uncommitted in the owned worktree pending native qualification and all required gates.
