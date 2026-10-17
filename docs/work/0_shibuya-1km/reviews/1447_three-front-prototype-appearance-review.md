# 1447 — independent native three-front prototype review

2026-10-17. **STOP / NO ADOPTION for the frozen 1445 prototype.** The four matched native pairs do not establish the agreed obvious coherent architectural improvement across the three representative fronts. Stop before broader production-source review, repairs, focused tests or expensive gates for these bytes. This is an appearance decision on one finite prototype, not a general rejection of shallow facade relief or the accepted 1444 benchmark. All 14 final criteria remain OPEN.

## Decision and visible reasons

**1447-F1 — TSUTAYA's interrupted grid reads as separate applied panels.** In the noon lower candidate, the continuous photographed curtain wall has acquired a conspicuous dark upper rectangle and a separate short row of vertical bars between the SHIBUYA and TOKYO boards. Broad wall bands on both sides of the signs retain only the much softer photographic grid. The hard stops run across the whole treated width, although the boards occupy only part of it. At block scale the upper section still reads as a cage-like panel applied to a continuous curtain wall. Dusk retains these breaks. This is visible in the native lower images around x800–940, y0–250 and block images around x724–795, y210–330; coordinates identify evidence, not crops used instead of full-image inspection. The source photograph for batch63 has continuous vertical mullions and curved horizontal divisions. The conservative full-Y omissions preserve the signs but make the treatment's patch boundaries a new architectural feature. More visible outlines alone do not resolve that coherence problem.

**1447-F2 — the three-front group still mainly increases line definition over the photographic sheets.** The east office has the clearest useful gain: its selected grid becomes easier to read as repeated narrow bays in both lower views, and it remains perceptible behind TSUTAYA at block scale. Southwest window surrounds also sharpen several window edges; their visible highlights and darker sides are a real local change. They remain modest at block scale, where the broad photographed wall and its blurry insets still dominate. I am not requiring equal improvement on all three fronts, every face in every view, surveyed depths, or new glazing. The problem is the group's resulting appearance: the strongest new feature on TSUTAYA is discontinuous paneling, and the other changes do not turn that group into the agreed obvious coherent architectural improvement. Counting three meshes or 1,260 triangles cannot supply that missing result.

The selected window/grid motifs broadly follow the photographed features. In the eight rendered originals, the turquoise southwest sign, existing hero boards, Coca-Cola field, lower shop imagery and adopted TSUTAYA storefront remain recognizable and unobscured. I saw no new road, pavement or surrounding building change attributable to this treatment. This is bounded visual preservation, not a byte-level geometry/UV preservation or lifetime proof. Source masks, complete interfaces, normal passes and ownership were deliberately not audited after the stop decision.

## Exact target and evidence

PRIMARY readback: `42976c06ad1cab112e1bb77e21bb4be558f30a49`; adopted product supplied by the assignment: `ce107fc619e93c85d98616ea0134abb387668df4`. Candidate checkout readback: `e8c4952795887b70750a9a7ef36225f5cf18d030` plus the three frozen uncommitted files below. The actual source SHA-256 values matched `artifacts/frontage1445/code-freeze.json`; literal copies are retained in this review's `frozen-source/` before candidate retirement. Copying and hash-checking is not substantive code review.

| Frozen source | SHA-256 |
| --- | --- |
| `src/scene/crossing-frontage.ts` | `5cecc62a6776ce799da4de26341b7ba984b5e7d80ccc11930f2a5189823892aa` |
| `src/scene/crossing-relief-recipes.ts` | `bae0f8ebe56c0c9d4456478624ed6cae3f77ac3a7a2b29d01e9467fdfef39202` |
| `src/scene/facade-textures.ts` | `8bf9bd9ca0e98c956d2614b92373fd59a67f6d927c7d6651376a2b6b78f452b2` |

The source proposal was freshly hashed as `cc405b1b7b3094e482e7203f6b7f9c55b8e844bd419ad90e590b1a57cea78f95`. I read the compact plan, local rules, accepted 1444 clarification and review, three-front selection and fixed-prototype record. The first decision instrument was the existing native image evidence and capture records; no new runtime probe was needed.

Every image below was opened individually at its original 1280×720 resolution and freshly hashed. Baselines are under `artifacts/frontage1445/runner/selection1/payload/`; candidates are under `artifacts/frontage1445/runner/prototype1/payload/`.

| Pair | Baseline file / SHA-256 | Candidate file / SHA-256 |
| --- | --- | --- |
| Noon lower | `noon-02-crossing-lower.png` / `dadcff1b824753fa6a86c8f14328420464925b48de5d8f1f6894496415c5c797` | `noon-01-crossing-lower.png` / `140be8a7b212bc15b98995a7ddd93253a83b49afcda5c2551cb4cfc6607c5c95` |
| Noon block | `noon-03-crossing-block.png` / `01d5a4945d9a8389dab7577b1b7457856cd5b67e7a69f2d00f1c4946a49c8ca6` | `noon-02-crossing-block.png` / `3ecf3a458f2234ad0231c68c3b87faef127200d0aa3b440749279d77f7efcdb8` |
| Dusk lower | `dusk-02-crossing-lower.png` / `7c5f716e11bcdcec897a43394f1f9d6ebdf91211c09568fc29e392f1f7295132` | `dusk-01-crossing-lower.png` / `79838792d69583d1a6cc0c7759c3b8af1df748bfe251fec7f14d563b5935d191` |
| Dusk block | `dusk-03-crossing-block.png` / `8bd8422e6aadedef7213d84a8393376434d0aa3240cbc53a9e4a50ab5218c471` | `dusk-02-crossing-block.png` / `829c5e535e44077aa5034554f5279da851df04297320e3aab264f84a4036533e` |

All three native source photographs were also opened at original size: batch26 256×256, SHA-256 `22e21f3b2802a7a62d4a299178e250d0d46b4654a5fce2400cd5006994165ccd`; batch62 256×256, `f86a901e51d7b646b804e637338bdf1d87aaa3b01867936fc3cf6391b4b0e977`; batch63 128×512, `30f6489d3294eccfc9e141aa6ba63fcc4101e49828a26e42ed3d8234b5c3aa67`. These fresh hashes match their photo records. No rescaling, derived crop, contact sheet or image editing was used for the verdict.

I read `matched-prototype-readback.json` and independently recomputed its four position differences from the actual capture records. Maximum difference is `8.14493994363778e-13` metres; every target difference is zero. Lower poses have approximately 95 m distance/polar1.48; block poses approximately180 m/polar1.15, both azimuth pi/4 and target(-35,15.2,-20). Actual `localWalk.actor.seed` is5970698 at both runs' default precheck and all eight matched image observations. Each candidate observation has three more drawn meshes and1,260 more drawn triangles than its baseline. `independent-image-readback.json` retains exact actual poses, seeds, counts and image digests. This confirms the comparison's recorded bounds; it does not rerun controls or measure GPU allocation, performance or temporal stability.

The readback file SHA-256 is `ecbec26981ad9a988f49eea3072c4db0d23dca0966fd193e333417ceafe56176`; selection capture record `d4147caadbae889c76f28553dcd58dce8b9d64ef3c3ca90f11e96d730b66d3ae`; candidate capture record `1b789c497546d7cd3dd58693255d9daefced0139d60a9cd9f76b19513504b021`. Renderer is recorded as RTX4090 D3D11; no independent browser run or GPU verification was performed here.

## Limits, provenance and closeout

Independent native subagent `/root/review1447`; requested review pin is Astra/xhigh from the current fleet review runbook. No separate CLI or CLI/model telemetry is claimed. No subagents were needed. Aggregate model tokens, CPU cost and total elapsed review work were not measured.

The already reported double-disposal concern remains OPEN and unreviewed here. No build, types, unit, lifecycle, visual or audit gate ran. No final source, shader-normal, ownership, canonical-regression, held-out, motion, integrated-revision or whole-AOI PASS is claimed. Root must preserve this finite prototype with its negative result. The later repair triage below does not revise that verdict.

## Prospective repair triage requested after the stop verdict

Root accepted STOP/NO ADOPTION for P1 and asked whether one correction replacing full-width board-Y omissions with finite actual board-footprint exclusions would be a meaningful discriminator. **Yes, one such scoped prospective prototype would answer a new question.** F1 is the concrete material defect: the full-width omissions manufacture disconnected TSUTAYA panels and remove otherwise source-supported southwest rows. Exact board-footprint exclusions could restore a continuous photographed grid. P1 therefore does not establish that this construction family is exhausted; its coherence defect confounds that conclusion.

This is not a counterfactual PASS. F2 remains unresolved: even a continuous grid may still read as lines over a flat photograph. Keep all signs/photos, the same three fronts, sealed native lower/block noon/dusk views, depths/materials and cost ceiling; no new source selection, camera rescue, depth, colour or power tuning. The next comparison must show whether the restored surrounds yield believable bay/reveal structure at those useful scales, not merely more visible lines. If it still reads as an applied line grid, stop this construction family instead of escalating depth or adding more examples. No broader source review or gate work was added to this review; root owns any new assignment.

## Resource closeout

Only this ignored review directory was written. Product, cache, test, PRIMARY index, canonical status, AGENTS and historical worktrees were untouched. No worktree, browser, GUI, server, GPU lane, watcher or persistent helper was created. Short shell reads completed; initial Git ownership refusals were resolved with per-command exact `safe.directory` options, without configuration mutation. The first sandbox process census returned Access denied; an approved read-only elevated census at18:03:21UTC found zero scoped review1447 survivors. `resource-closeout.json` retains that result. The authored report, frozen source copies and compact readback remain as evidence for root's preservation; there is no task-owned product work to merge.
