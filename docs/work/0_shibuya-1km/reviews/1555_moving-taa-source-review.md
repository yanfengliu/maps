# 1555 — Moving TAA frozen source review

2026-10-18 UTC. Independent read-only review of prototype1554, base b0bc935c248ce0bdfeb7932ea55093589cbec0fd. Verdict: HOLD before GPU release. A6/all35/all14 remain unchanged and unaccepted. Root owns acceptance.

All six paths in artifacts/taa1554/freeze.json matched their recorded byte lengths and SHA-256 before and after review. Helper SHA-256 b38faf5544663feedf2cb9a12e77db43d01c25145f8f78e9542a7112241d4ced. Read canonical plan,1552,AGENTS,local rules,lessons,full changed production/helper/tests and installed SSAA/TAA/GTAO plus adjacent normal/actor/contact/lifecycle source. Existing focused tests were not rerun. No browser,GPU,server,build,full gates,data,index or Git operation. No runtime owned.

## F1 — P1: moving receiver shading is eligible history

C:/Users/38909/Documents/github/maps/artifacts/taa1554/worktree/src/render/reprojected-history.ts:102 reuses the AO normal registry as rejection coverage. The same worktree's src/agents/render/local-walk-contact.ts:69 registers an invisible/discard normal material at line98, while lines87–91 draw changing transparent contact shading into scene colour. Its changing footprint therefore contributes to neither current nor previous rejection mask. This is deliberate AO exclusion, not valid colour-history exclusion.

The helper also hides static receivers at line100. Dynamic cast-shadow footprints extend beyond actor silhouettes: src/scene/rail-trains.ts:140 casts train-body shadows; local-walk-draw.ts:43 and humans.ts:141 cast near-walker shadows. Ground depth remains unchanged. At helper lines30–40 an unmasked receiver with current=.4,prior=.3,3x3 range[.2,.8] and equal depth retains valid=1 and resolves .3125 instead of required current-only .4. Arithmetic was independently evaluated; no GPU severity is claimed. Neighbourhood clipping does not reject this literal counterexample. The one-pixel mask dilation supplies no bound for these receiver effects.

Correct the missing dynamic-colour authority without hiding actors,contact shading or shadows or discarding all motion history. Add actual-production GPU rejection controls for changing contact and cast-shadow receivers outside both body masks. Body-only same-depth motion cannot close F1.

## GPU proof plan

The pass is connected before GTAO/bloom/Output; the existing G-buffer is drawn once before resolve. Two current-pose2x/MSAA sample sites and actual registered VAT/local differential materials are retained. Integer physical sizing,history invalidation on resize/apply/explicit invalidate and helper teardown have source support. Scoped mask restoration is in finally. No major dependency or renderer replacement appears.

The proposed .4 current/.6 prior => .575 linear pre-GTAO pixel is a useful contribution control, but spatially uniform colours cannot distinguish correct reprojection from a plain accumulator. Use a position-coded prior field and actual camera displacement with an independent expected previous UV, so wrong-current-UV sampling goes RED too. Exercise depth disocclusion,body masks,F1 receivers,first frame,resize,style/lighting and teardown through actual createPostChain; preserve old moving-branch RED. Record actual h.post/h.trains/frameCount/pageMs/poses.

Shader/linking,edge/depth/MSAA coverage,actual previous-frame eligibility,native adjacent S0/S1/held-out quality,AO/bloom stability and complete-frame cost remain UNKNOWN. The extra two2x mask draws,three full-screen history draws and100B/native-pixel format estimate are not measured GPU cost. Complete native sequence inspection and final integrated five gates remain owed; CPU spies establish no pixels.
