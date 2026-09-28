# Fresh rail review 246

2026-09-28. Read-only native/strategy review. **Redirect from the bearing corridor to the four gap exteriors. Do not spend another capture or bespoke qualification on 236d.** It reveals a shaft but does not close a required exterior chain. There is also a concrete, small observer improvement available: exact transformed-vertex bounds can exclude the source building causing these five unknowns without relaxing winding thresholds. Neither finding justifies changing rail geometry.

## Native observations made before reading prior opinions

I opened the first two originals individually at 1280×720 before reading the design or reviews. After that context, I opened one existing gap original, also at native size. No other images were inspected.

| Original | SHA-256 | Observation and bound |
| --- | --- | --- |
| `C:/Users/38909/.codex/worktrees/rail-integration/maps/artifacts/rail-support236d-native-20260928/run-01/B146060273-from-lower-2-reachable-satellite-noon.png` | `213389d4e7866d9bdf78146ce18f7602ce2e56bec913ece5514133ebe8ebd996` | A central rectangular shaft is visible from an apparent foot on the green ground patch to an upper emergence. Two nearly full-height walls dominate the frame; a dark overhead surface hides the larger structural relationship. I cannot identify both lower chords or follow their relationship through the deck to the shaft. This is useful diagnostic evidence that a shaft can be seen, not exterior-chain acceptance. Its saved eligibility remains false. |
| `C:/Users/38909/.codex/worktrees/shibuya-quality/maps/artifacts/rail-finish236b-native-20260927/run-01/N0-satellite-noon.png` | `1a26fb575c20057150f93d6cd97feeebdc55720ded45bf420c9c26983461a118` | Rails, ties and ballast are distinct and lead coherently through opaque rectangular returns. This is a useful material/separation view. Thick sidewalls obscure supports. The surrounding source facades are visibly coarse; this frame supports the bounded finish judgment, not a whole-map photoreal claim. |
| `C:/Users/38909/.codex/worktrees/shibuya-quality/maps/artifacts/rail-capture-url-repair-20260927/run-01/G146060273-side-satellite-noon.png` | `40fc068e27afeb33dc8ff43b4d788f5f03f60cfdec348d90824d02580cb355da` | The road, median, facades and crossing trusses give substantially better spatial context. The trusses occupy a small central band and buildings hide their ends. I cannot uniquely assign the overlapping members to the named track or accept its bearings. This is an old diagnostic, not newly eligible evidence. |

I see no demonstrated new rail construction defect in these three images. The immediate failure is coverage and composition. The new corridor is materially less informative about the whole structure than its visible shaft suggests. Three images do not prove that a useful exterior view is impossible.

## What went wrong with the strategy

The preparation succeeded at placing the camera and exposing selected target points. That success criterion is too weak: visibility of a base/top/chord sample does not establish a readable structural relationship at native resolution. A shaft-first pilot also reverses Review209's cheaper ordering: gaps first, bearing details only for remaining exposed contacts. Qualifying every mechanically reachable slot before asking whether it is visually useful spends effort on evidence that cannot settle acceptance.

The original requirement for side and oblique gap views is sensible. Requiring one photograph to explain the entire foundation→shaft→deck→both-chords chain is not necessary when complementary views and admitted geometry establish different parts. A far chord may be hidden by the near deck; buried mating faces are never an appearance subject. However, an exterior surface hidden by a building is **occluded**, not automatically a buried interface, and 236d does not establish permanent unobservability.

## At most two next approaches

### 1. Recommended: finish the static scope with gap-first exterior coverage

Root should explicitly record this acceptance correction before further capture: eligible complementary side/oblique views may jointly cover each gap's naturally exposed exterior; admitted Review156 geometry covers internal contact; a named occluded exterior remains a disclosed visibility limitation, with no claim that it was visually accepted. Preserve R205-C2 until each residual has a reviewed disposition. This changes the appearance claim transparently rather than relabeling the old images as passes.

The exact residual roster is:

- Four gaps: 146060273 Z186–230, 146060426 Z180–224, 155269600 Z178–222, and 155269603 Z178–256. In both styles, review readable open truss sides, deck relationships, endpoint transitions and the eastern curvature. Views can serve several tracks only when the visible members are identifiable.
- Eight bearings: use the gap views to inspect exposed shaft/terrain or shaft/cap emergence and exposed upper continuity. A detail is owed only for a named exposed part still unreadable. Do not require an excavated footprint or a view through the deck.
- The retained-support/140d14bc composite at X151.245–170.717, Z265.515–275.001: exposed emergence plus adjacent facade, deck and ground in both styles. The internal Y14 overlap remains geometric evidence.
- Preserved static floor surroundings and the exposed portions of the ten cut returns: give each changed object an explicit covered/occluded/unresolved disposition. Do not infer all-ten coverage from N0 or create a hidden-face camera quota. Actors beneath spans and temporal behavior remain the existing later population/motion scope.

Reuse existing source-bound projection/occlusion preparation, the actual camera limits and the current collector. Rank gap views by projected readable **surface regions and surroundings**, not isolated point rays. Do not build another selection framework. Reuse the existing bounded local candidate allowance; choose one best gap overview, inspect its first retained native original for usefulness, and only then collect its second style and the remaining named residuals. Eight gap pose classes × two styles remains a ceiling for the initial roster, not sixteen mandatory pictures or an automatic entitlement to extra details.

**Stop conditions:** reject 236d now on usefulness; do not salvage it solely because qualification is cheap. Stop a local search when its existing finite candidates cannot expose a useful region, retaining the exact occluders and unmet claim. Do not infer global impossibility or launch a broader sweep. Root must then accept a specifically narrower static appearance claim with that limitation, or leave that item open. Stop capture once the residual table has reviewed dispositions and no actual visible defect remains. Then perform the already approved activation delta, its focused checks, the existing integrated gates/native review and main integration. Do not hold static rail for actor research or claim whole-map quality from it.

### 2. Bounded enabling fix: tighten the observer once, not per camera

Root asked whether the winding refusals miss a simple separating bound. **Yes, for the retained 236d bytes.** `rail-camera-clearance.ts:124` transforms a local axis-aligned box; lines138 and143 use the resulting loose world box for broadphase and containment candidacy. It does not recompute a tight world box from the transformed vertices. `rail-still-snapshot.ts:110` reuses that kernel.

I decoded only the named source identity's retained indexed triangles, respected its stored draw ranges and batch membership, and transformed their vertices by the saved matrices. Across two mesh records and 17,814 referenced vertices, its world bounds are X117.74651828595707..197.40060603191588, Y14.596673187072923..245.55805779134414, Z82.5601490633158..165.37425987813225. The actual eye and four near corners have X114.70112781287206..116.38056663398493 and Z198.41831731001594..199.77397558949207. They are strictly separated by **1.3659516519721393 m on X** and **33.04405743188369 m on Z**. These are independent axis exclusions of the whole eye/near-rectangle query, not small winding values treated as zero.

A bounded implementation can tighten the existing candidate group's bounds using those same transformed referenced vertices and retain all unsupported-geometry refusals and the unchanged narrow-phase threshold. Review it once with a rotated loose-box false-candidate case plus genuine contact/containment controls. Use it for useful future poses instead of manufacturing one source-building exception per camera. No convex-hull framework, source reconstruction, geometry hiding or winding tolerance change is necessary for this case. Its bounds must cover the complete retained group and transformations, not merely a material fragment or selected visible triangles.

This calculation does not requalify 236d, certify all other members, or make its picture more useful. Keep the original false result unchanged. Implement this only as a small reusable classifier correction on the path to useful views, not a new prerequisite research campaign.

## Evidence and execution limits

The saved snapshot hash was independently checked as `c777d4b4befc33da1819f68ef98acaf4726a0d70958d3f05ae9cf73e6ac3bb8e`. Inspected integration kernel SHA-256: `08f5c4760789406e3deecb3055e6b07aadc2cbed97e64b1b8c1cd6ae06ec2689`; snapshot consumer: `09f37ed335a3097d1d73ccc61d081ea2e85f4dfbcb7bbf029cca0ba6710de438`. This was a small read-only calculation, not a full snapshot evaluation or fresh capture.

Context read: AGENTS.md, applicable local rules and lessons, current rail-integration-design.md, Reviews209 and232, selected205 metadata, and the236d diagnostic handoff. No deep history or source-data audit. Existing primary modifications were observed and untouched. No browser, GUI, GPU, server, gate, source edit, agent or background process was launched. Foreground readers completed; only this report was written. Root owns any permanent review promotion and contract decision.
