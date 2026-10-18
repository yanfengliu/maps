# 1551 - Moving TAA gap

2026-10-18 UTC. CPU diagnosis of unchanged executable e1097edd and street1549 evidence captured on main9bb5eb9. A6 remains OPEN: "Dusk uses ACES, neon bloom, SSAO and TAA without flicker/crawl over a moving sequence." No appearance capture is released.

artifacts/street1549/run1/payload/frames.json records street-setup frames328-340, started=false/refusal=null/tick0; after-start1882-1896, true/null/14; movement1 1999-2012, true/null/133; movement2 3568-3581, true/null/1702. Observer keys are at,epoch,status,camera,tiles,style,lighting,population,localWalk,frozen; h.post() and h.trains() are omitted. Thus1549 has ZERO actual GPU AA-mode, post-active, accumulated-sample or train-speed observations. Empty error lists do not supply them. Setup AA mode before Start is unknown.

The after-Start source implication is conditional on the active composer. src/agents/local-walk-prototype.ts:70 defines moving() as started&&!refusal; recorded true/null makes it true. src/app.ts:244 requires !localWalker?.moving() and !railScene?.trains?.moving(), plus camera/tiles/agents stillness, before setStill(true). Camera motion also prevents accumulation. src/render/post.ts:300-303 selects moving sampleLevel1/accumulate=false and resets history; :175-179 doubles physical sample-target dimensions.

Installed node_modules/three/examples/jsm/postprocessing/TAARenderPass.js:84-89 delegates accumulate=false to SSAARenderPass and resets accumulateIndex=-1. SSAARenderPass.js:200-245 combines two jittered scene draws within ONE rendered frame. RenderLoop.advance runs fixed/frame callbacks before rendering, not between submissions. The active moving branch uses current-pose spatial sampling, with requested4xMSAA, and ZERO previous-frame image history. Requested MSAA is not measured driver coverage. The class name does not establish TAA. test/post-motion-sampling.test.ts:63-105 checks moving zero-history and separate still-history behavior under a renderer spy, not GPU pixels. Source permits a direct fallback, which1549 did not observe separately.

Product gap: cross-frame TAA during ordinary moving dusk is missing. A96-frame appearance capture could judge spatial quality but cannot close literal A6. Do not waive TAA or merely enable the installed non-reprojecting accumulator during movement.

Unproved direction: prototype depth-reprojected history using the accepted current-pose image as fresh input/fallback; reject disocclusion and current/previous actor coverage and clamp history. Preserve5af's anti-crawl input, fractional-DPR sizing and lifecycle gains; own/reset/dispose history explicitly. Feasibility, actual previous-frame contribution, rejection, pixels and cost remain unproved. Root freezes reproduction/disqualifiers before independent mechanism search and implementation.

No browser/server/GPU/gate/build/source/cache/harness/index/Git mutation occurred. Only this authored review was saved; no owned runtime resource remains.
