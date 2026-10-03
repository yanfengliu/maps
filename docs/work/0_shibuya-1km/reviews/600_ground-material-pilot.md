# 600 — private ground-material pilot

Native 597 baseline block and both obliques show broad smooth asphalt and paving. Existing 4m asphalt noise concentrates grain around 3cm; mip filtering averages it away. Paving joints are already coverage filtered. Neither material supplies shading relief. Inspected PNG digests are retained in `artifacts/ground600/inspected597.json`.

One untuned private candidate changes `surface-materials.ts` and adds `surface-relief.ts`: restrained authored 3mm asphalt grain and paving bevel response, derivative-based frequency fading, top-face normal perturbation bounded below 8.1°, and correlated roughness. This is authored material response, not measured physical height. Existing seeded textures, albedo, source geometry, supported paint, contacts and Cartographic response are preserved. No lighting or facade changes.

Both arms derive from immutable curtain566 baseline131, raw-main `79d0a03375943121c9f67529b61cb79dabc87ee2`, containing accepted product `39ba67b84d6c099a887921e8466e92e12550094c`; all 131 originals matched. Frozen564 and rejected589 are excluded.

CPU evidence: 47 focused cases passed, private types and both builds passed; disabling the actual relief activation made its integration assertion red, then exact source bytes were restored. Ten deadline controls passed. Initial assertion/timeout/type failures and their test-only corrections remain recorded. The unchanged owner prefix checked 458 inputs under pinned PowerShell 7.6.5 Core. Final owned-process census found zero remaining. No runtime launched; CPU slot released.

Additional draws, triangles, textures and decoded geometry bytes: zero. Asphalt adds three texture reads; paving adds none. Compiled-program memory, startup and frame costs remain unmeasured; adoption requires ≤0.2ms median frame increment.

Frozen preparation: `handoff.json` pins source, helpers, recipe and host. Four matched views cover fixed crossing and seed600 side-street close/block at noon/dusk, eight originals maximum, real controls, zero population, 220/240/300s deadlines. Visibility and quality remain unqualified. Root source review and exclusive GPU/4335 admission precede dispatch. Reject weak structure or regressions; motion, style returns, cost and full gates remain later requirements. Active product/Git/index/PRIMARY were untouched.
