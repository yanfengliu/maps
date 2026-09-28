# Native capture261 executor review

**REFUSE a hardware launch of freeze `97fc70468584faec99d69954de1bdc7d22e9b07d390c8904d22b450d57b6ef78` until the three bounded executor corrections below are applied and focused re-review passes.** The accepted style260 source, native plan, rig/controller and numerical mechanism remain unchanged and accepted within their prior bounds. This review does not reopen them. Root's fresh host census and exact admission remain required after executor review; no pixel, motion or performance acceptance is given here.

## Material corrections

1. **[P2] Handle only the browser's exact favicon housekeeping request — `capture.mjs:60-64`.** The retained style260 index contains no favicon declaration, and the sealed HTTP registry contains no `/favicon.ico`. A browser favicon request therefore reaches the strict response handler and fails as an unbound resource even when all product resources and drawing are correct. Add the proposed executor-only exact GET `http://127.0.0.1:4334/favicon.ico` route returning empty 204, record it separately as housekeeping, and keep every product response subject to the existing exact URL/hash/status checks. Do not broadly permit unsealed requests or edit the accepted product HTML.

2. **[P2] Read the complete TCP inventory before filtering — `owned-launch.ps1:14` and its final `listenersAtEnd` query.** Both use `Get-NetTCPConnection -State Listen` before filtering the port. The assigned host census contract requires a successful unfiltered `Get-NetTCPConnection -ErrorAction Stop`, followed by State/port filtering of that completed inventory, so an absent filtered result is not confused with a failed inventory operation. Use that same full-inventory pattern for prelaunch and final checks. A census error remains a failure; it must not become zero listeners.

3. **[P2] Require the actual motion artifact and track telemetry before certifying completion — `capture.mjs:88,93-94,102`; `observer.mjs:69-75`.** `measurementComplete` currently depends on reaching cycle 2 and no recorded errors. `finish` legitimately returns null WebM when no nonempty chunks arrive, and capture.mjs makes writing motion.webm optional. Empty trackFrames also produces harmless empty statistics. Consequently a stopped recorder with no data or delivered timing frames can still produce a passing capture and outer certificate from PNGs/RAF observations alone, despite the required motion clip and actual capture-track evidence being absent. Require a retained nonempty motion artifact and nonempty valid capture-track telemetry before completion/success. Keep actual partial output and explicitly fail missing/did-not-run evidence. This needs no FPS threshold, encoder performance benchmark, decoder install or extra motion cycle.

Root and executor261 already identified the first two corrections; I independently confirmed their source locations and the absent favicon descriptor. I reported the third promptly and root accepted it. These are the complete material findings from this frozen executor review. The exact current freeze must remain retained; a corrected successor gets focused re-review rather than a new source audit.

## Inspected and independently bound

I read READY.md and the complete observer.mjs, capture.mjs, owned-launch.ps1 and seal.mjs; the actual preflight receipt; the reused exact process identity/time helpers; and relevant real-control, read-only bridge and GPU-binding paths. I inspected the delivered index and style order needed by the runner. No browser, server, GPU, numerical simulation, build or test suite ran.

A small read-only metadata check verified the 109,399-byte freeze hash, 19 selected key-file hashes and the registry structure. The registry has 240 distinct file paths and 166 distinct served URLs, with each served descriptor exactly represented in the sealed file records. The key checks include the accepted260 freeze, plan, review and private config; current executor source/preflight; process helpers; and existing OrbitDriver, settling, style-control, PNG and GPU identity helpers. I did not rehash all 372,381,028 served bytes or the complete browser/runtime corpus during this read-only review. Runtime pre/post verification and response hashing are written in the runner but have not executed.

Principal exact bindings:

| File | SHA-256 |
| --- | --- |
| capture.mjs | 24ba21f6c3b3efe473719760a3b91f61f59449e1ca48e713830ac68b00195023 |
| observer.mjs | 9c4a9bb3e5f74cb9dd5eb226b4149d487c4a2daa20fc9cf082f662b0a485d31f |
| owned-launch.ps1 | 1e9bb9e22638f67eda74ad63aea081d18018fc2a825c836b3b383aa85a5b7364 |
| seal.mjs | b98542976713b84c078cdb54791485278de8921a5f851cabf054b7eccb8304d0 |
| READY.md | a9fdbb7400cd72df04eb2ce27a5a2cbe651fe8e1628c5a294ae445ac08ed7da7 |
| preflight.json | 1a68738ecf35dea96ab6636c82e4f3ad700a0fdbfa3f2e05bbadc0a9f55eaba8 |

The preflight records syntax passes for the three JavaScript files, a PowerShell parse pass, exact private configuration/import checks, and actual missing-admission refusal with exit 1 after helper imports. That proves those preparation paths ran, not that a browser/recorder/cleanup path works. Preparation failures remain retained and are not converted to passes by this review.

## Executor contracts otherwise consistent at source level

The runner and launcher require the exact freeze hash, fresh root admission under two minutes old, one uniquely named run, strict 127.0.0.1:4334 and the admitted GPU identity. They refuse existing output or an occupied port. The new preview reads the accepted260 private dist/config and unchanged253 packet. Every sealed file is checked before/after the attempted capture; actual browser responses are hashed against their exact URL descriptors. Software fallback, app-id mismatch, console/page/request errors, runtime refusal and absent setup conditions fail the attempt.

The held rig-far request occurs after the factory has captured Satellite. The actual picker changes to Cartographic while the actor observation remains absent, then the unchanged request is released. This exercises the real loading window without calling an app setter. Pointer and keyboard picker paths use the control's own listbox bindings, check the chosen id and closure, and record camera/generation/progress preservation. The initial 1800 m view, ordinary 620 m zoom and at most three close requests use the existing OrbitDriver pointer/wheel path. Projected midpoint and selected LOD are explicitly limited to composition checks; only retained native pixels can establish a visible actor.

Time-zero checks cover actor started/tick/root time/drawn sample through setup. The initial near PNG is copied and retained before real Start input. The observer copies only selected actual RAF samples, with before/after state equality for each newly copied canvas; no app, clock, camera, control-angle, actor or render setter is called. Requested event targets use first actual sampled time at or after the target, with the final cycle-2 observation explicitly allowed to carry an earlier interpolated draw sample. Shared-frame labels share a canvas. Actual times, signed lateness, foot/contact state, adjacent observations and gaps remain retained. The eighteen-row ceiling is conservative for the required four supplements, twelve main labels and two style witnesses; there is no every-frame image buffer.

Native PNGs and the separate MediaRecorder clip remain explicitly different evidence. RAF/render observations and cloned-track timestamps support their stated delivery/gap bounds; they do not prove encoded-video FPS or encoder-only drops/duplicates. The runner does not mislabel requested 30 fps as measured output. Independent native PNG/color/contact and clip-motion inspection remain required, even after a successful capture certificate.

The motion loop has its finite 90-second wall backstop and the owned outer process has a 480-second backstop. Individual input/setup/retention operations have bounded waits. A failed attempt reaches finally with partial evidence preserved; there is no automatic second attempt or full-cycle retry. The source must gain the missing-motion refusal above before these error paths can certify complete output.

## Ownership bound

The inner and outer paths use retained handles and exact PID, creation time, executable path and name. Child discovery requires an exact live parent from the same inventory, and fallback stops re-observe exact identity. They do not broadly stop Chrome/Edge or target the protected unrelated Edge identity. Finally releases the held route, attempts recorder/track retention and closure, closes page/context/browser/browser server/preview, then checks and stops only confirmed owned leftovers. A rejected recorder finish still leads to page/context closure and outer process cleanup; it cannot establish successful recorder closure by itself. The outer final census, port check and owned-temp removal must pass separately. Recursive scratch removal checks the intended run descendant path and rejects reparse entries rather than traversing them.

These are inspected cleanup paths, not observed host cleanup. The TCP inventory correction remains necessary for the stated census contract. Root must perform its own fresh full host census/admission and inspect the actual final certificate after the single eventual hardware experiment.

No product or executor bytes, Git state, prior review, frozen evidence, shared data/cache or active resource changed during this review. Only this assigned report was written. All short read-only commands completed; no process-inventory absence is inferred from a denied or unperformed census.