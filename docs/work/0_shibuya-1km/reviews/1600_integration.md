# Review 1600: integration — diagnostic import boundary repair

## Target

The private1610 diagnostic, not product code. Original nine runtime files are preserved in artifacts/taa1610/pre-import-fix/. Run1 failed before Vite/browser/GPU because importing the evaluator consumed runner argument --dispatch as a filename. Exact attempt and repair are retained in run1-failure-import-repair-handoff.md, SHA40937073154f0ce3db0631222f2d8b67716133d53079b9b90b16c5764680cd01.

## Reviewers and coverage

Independent native1616 inspected the one-line guard change and actual import/CLI controls. Root read the complete report below. Original report SHAd8cff50ee5dbfb86b32b2f9a77e6dca0c9e473286b4d9b613ac00f798fa3c9f0; receipt129f6b7d84395445686893342995d545f1835078d7cf6bb5c34a1eff318feb8f.

## Reports

# 1616 — Evaluator import repair focused review

2026-10-18 UTC. CONDITIONAL GO for one future diagnostic with a fresh Root lease, after the held-out baseline releases the sole GPU lane. No material finding remains in this focused repair. Previous1611 readiness conditions otherwise apply unchanged; no launch was authorized or performed by this review.

I inspected the actual before/after evaluator diff and the repaired preparation manifest. The only executable change is the CLI guard from if(process.argv[2]) to if(import.meta.main&&process.argv[2]). All eight other runtime files match the preserved pre-import-fix copies, and all nine current runtime files match adapters.json. The evaluator algorithm, exports, observer, fixed ROI/pair, actual setup.png path,96/8s copy contract,150s+30s bounds, launcher/controller, application and dependencies did not change.

Current evaluator SHA2567f66a2458162ad6572b1f6a025b363361c90d1a3eacddafafe187231b61c1876; adapters0bbfd2792d736a81977dfb92416c4ffc755924d4c676e756a7f1df8d15acc80f; contract814651523f6e92b457b5dad1af984423d8a8196e8d10adb33932f0c435f0b932 unchanged. Exact runtime/context hashes are in receipt.json. Original bytes and failed run1 remain preserved.

I independently reproduced the import boundary using actual canonical module files and runner-like argv on installed Nodev24.12.0. Original module: one attempted '--dispatch' read and ENOENT, with zero writes/CLI outputs. Repaired module: zero CLI reads, zero writes, zero CLI outputs, no error, and the expected evaluate/half/invert/mul/project/ulp/unpack exports. The fresh import checks used isolated short-lived CPU children; write interception forbade file writes.

I also invoked the repaired evaluator as an actual CLI against the retained literal packet/frames: PASS,2/2 eligible blend samples and48/48 native channels. Independent in-memory mutations still refused current-only output (0/2 blend-correct,2 current-only) and wrong-native output (blend remains2/2 correct, native0/48). Node syntax passed. These actual checks confirm main-versus-import behavior and preserve the discriminator. They do not run the app or prove ordinary-scene contribution.

My original1611 readiness review missed this import side effect because syntax and isolated evaluator controls did not exercise the runner's argv during canonical import. The present red/green caller-argument check covers that specific missed boundary. The failed run1 never reached Vite/browser/GPU or setup/capture; it is not scene-quality or history-rejection evidence.

Source-mode boot, actual canonical app hook sharing, formats,008/009 alignment, nonempty independent eligible pixels, blend/native transfer, deadlines and process/profile cleanup remain runtime conditions for the one future attempt. Empty eligibility remains NOT_ESTABLISHED. Success would apply only to the fixed region and pair; perceived crawl, scene-wide coverage, quality, cost/FPS, full gates andA6 remain open. No364MB runtime cache hash was needlessly repeated. This review launched no browser/server/GPU and wrote only its ignored report/receipt; it created no lease or capture resources and transferred no source to model CLIs.
## Findings and disposition

The caller-argument gap is fixed in the private diagnostic. Independent original RED/restored GREEN and actual CLI checks pass. This does not change the A source or retire a public regression gate.

## Verification

Run1 exited1 in2.502s without acquiring browser/GPU resources; exact cleanup passed. A separately leased run2 reached real source-mode capture and retained96frames, but the original all-eligible blend assertion returned NOT_ESTABLISHED. Do not transfer import readiness to contribution acceptance. Full product gates did not run.

## Round outcome

Accept the bounded import repair only. Retain the failed attempts and original results. The raw discrepancy and remaining A6 requirements stay open in the canonical plan; no A source adoption or further GPU lease follows.
