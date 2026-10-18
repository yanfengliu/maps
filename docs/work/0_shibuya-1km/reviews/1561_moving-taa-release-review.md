# 1561 — Moving TAA source and GPU release review

2026-10-18 UTC. Source1560: READY FOR BOUNDED GPU PROOF. Frozen1559 protocol: HOLD. No GPU release or A6/all35/all14 acceptance. Root owns release/acceptance;1555/1557 historical findings remain preserved.

Source receipt4234ac63cbebf29f4f27214dd0f74f213be698bce86f66881a28e69a532cca70 pins13files. Fixture receipt82e1e80ac571229f5087a5188384ea762e5080c6d0babbebbf26b038a68b338f pins9files;browser aa70adbc86b4435950eed54e3d0e8867537653bfe41f96f9de03e8e2ea3b446b,runner be9516f64120df97fe0ede15bb0c975439908ce94e25ed8b43fbe1c6105307a4. All source/fixture pins matched before/after review. Preserved1556 twelve files and original1559 seven files also match their earlier pins. No browser/GPU/server/build/test/data/source/index/Git mutation; no owned runtime.

## Source1560

C:/Users/38909/Documents/github/maps/artifacts/taa1554/worktree/src/render/post.ts:325–330 invalidates history inside the actual sampling-mode edge before either source changes. Exact diff against preserved1556 is one executable line and two comments. Both transitions reset; repeatedfalse and repeatedstill do not. Toggles without an intervening render correctly leave source provenance unchanged. Other helpers/production paths match1556 pins.

New actual-createPostChain CPU case covers3still→firstmoving0→repeatedmoving1, reverse edge0, repeatedstill1 and another cycle. Read retained literal1556 RED (firstmoving received1,expected0), same-test restored GREEN554ms and reported25CPU/types PASS; no rerun. These are state/dataflow evidence, not GPU pixels.1557 mode gap is resolved in source; no further material source finding established.

## F1 — P1: receiver denominator does not exclude actual body rejection

C:/Users/38909/Documents/github/maps/artifacts/taa1559/browser.js:33 and :49–56 exclude only centre rays intersecting body Box3. Production body rejection includes2x jitter/MSAA coverage plus a3x3 native mask neighbourhood. A centre ray can miss the box while these samples still reject history. The>=4/all-correct receiver assertions never require any qualified pixels outside both actual dilated body masks. A pass could therefore credit body rejection to receiver authority. Require a positive effect-pixel denominator after read-only mask qualification or independently conservative projected bounds covering every sample/filter/dilation site. Preserve changed-radiance and clamp-separation requirements; do not weaken assertions.

## F2 — P1: cleanup admits unchecked PID ancestry

C:/Users/38909/Documents/github/maps/artifacts/taa1559/runner.mjs:23 expands descendants using PID alone; lines33,40–43 union that set with birth-qualified identities, then line41 taskkills unchecked trees. A new task child may reuse the PID of an unrelated survivor's dead parent; the older survivor then appears as its child. Birth-qualified retained matches do not repair this unchecked union, and /T expands unchecked ancestry again. Use existing identity-safe ownership or validate parent-instance birth relations and revalidate exact identities immediately before narrowly scoped termination. Never terminate the unrelated survivor.

## F3 — P2: timeout/resource attribution remains incomplete

runner.mjs:29–39 races non-cancellable createServer/listen/browser launch against150s. A launch can settle after finally has already inspected undefined context/server. The stipulated external180s root supervisor is mandatory and must own this in-flight creation/cleanup case; internal finally alone is insufficient. Lines27,42 also probe4349 only after cleanup, so a pre-existing busy port is falsely called an owned leftover. Preflight the port and retain actual listener ownership before attributing closure. These are release conditions; no actual leak or foreign termination occurred.

## Remaining proof bounds

Actual production AA and pre-GTAO target readbacks call originals without history/shader mutation. The32 predeclared position-coded pixels use independently analytic priorUV with actual camera displacement, measured prior/current frames and wrong-currentUV/old-moving RED expectations. Contact/shadow scenes,still-edge/continuedmoving,eligible background,physical161x121/sample322x242 and reset controls are meaningfully connected, subject to F1–F3. Fix/freeze/re-review the protocol before dispatch. GPU linking/readback/rejection/native S0/S1/held-out quality,AO/bloom stability,cost and full lifecycle/five gates remain UNKNOWN or owed.
