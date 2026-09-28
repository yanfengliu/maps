# Review 342 — fresh Satellite direction

Date: 2026-09-28. **REDIRECT after landing the accepted 338 corner: the next visible milestone should establish coherent Satellite daylight and dusk lighting across street and aerial views. Stop further paving and lower-frontage response tuning unless a material regression appears.** The current pixels still read as an empty textured city model. Another better paver does not change that first impression.

## Evidence and limits

Read the project instructions, local rules, lessons, current queue's first 30 lines, review 337 and 338's integration report. Inspected exactly three existing original 1280x720 PNGs at native resolution, without crops, enhancement, new captures or contact sheets. All supplied SHA-256 pins matched:

| Existing338 image under artifacts/corner338-integration-20260928/native/ | SHA-256 |
| --- | --- |
| hero/hero-satellite-noon-crossing.png | ddebd68a00f31d91f822a07302f576313b68da87c3e2a282c2427afa2530300d |
| hero/hero-satellite-dusk-approach.png | 2f9dd7d37df192651ead54a3101d8bcee2ef19c995c625b31b344b259ce4afe7 |
| sweep/satellite/overhead-az000.png | cdfe40a8c8c3186ca617032cc7ca219def010cc3be88bbd134bdb3f44bf9b00b |

Root reports 338's all-five success with 983 tests and certificate cddea198f0b9fc7e. I did not independently revalidate those gates. The initial integration report still says gates pending; this strategy review neither substitutes for 339 nor reopens 337's bounded paving acceptance. These three stills establish no motion, contact-over-time, runtime or FPS result. No Cartographic quality review was performed.

## Three observable gaps, in priority order

1. **Lighting does not give the scene a persuasive hierarchy of solid surfaces.** Noon-crossing is broadly subdued grey, from paving through facades, with little convincing distinction between daylight, shade and reflected light at native scale. Dusk-approach has a recognizable warm sky, but much of the city becomes similarly cool and flat; small bright sign rectangles and isolated pavement light pools carry disproportionate attention. The overhead image likewise leaves large dark street regions and muted building volumes. This is visible appearance. Whether exposure, light balance, material response or baked source photographs dominate is an implementation question, not established by these stills.
2. **Close source facades remain the realism ceiling.** The crossing's lower TSUTAYA face, adjacent retail bands and large photographed walls remain smeared, flat surfaces. The new foreground paving reads clearly, which makes the mismatch easier to see. Neither a roughness tweak nor stronger sharpening can reconstruct missing storefront depth or source information. Review 337 independently places the accepted gain mainly in paving.
3. **The presentation lacks inhabited scale.** These default captures show empty crossing and road space. The large foreground tree and clean open paved area read as isolated scene assets rather than a busy street. Overhead shows the bounded city against a dark void, reinforcing the model impression. These observations do not invalidate the separately accepted opt-in walker or authorize default activation. They also do not establish any traffic or rail defect.

## One bounded next assignment

**Outcome:** Satellite reads as one consistently illuminated city: convincing readable daylight at the crossing, legible building volumes and ground relationships at dusk, and no loss of aerial readability. This is a lighting milestone, not a claim of completed photorealism.

Give one implementation owner the accepted 338 main revision once committed, and reuse a suitable isolated checkout. Inspect the current lighting, environment, exposure and common Satellite material-response path first. Use their existing controls and rendering features to form one coherent candidate. Keep camera, geometry, source atlases, markings and actor state fixed for comparison. Correct a shared response error if demonstrated; do not add a shader framework, procedural facade detail, invented light sources, per-building masks or another atlas policy. Source geometry research, physical storefront reconstruction, streetlife, world-edge presentation, vehicle contact, buses and rail qualification remain separate work.

The first comparison uses only these same three existing compositions, captured through the established real controls and existing instrument. No new camera search, proof harness or per-image agent is justified. The noon goal is readable facade and ground detail with a clear daylight/shade relationship, preserving signage and paint rather than merely making every pixel brighter. The dusk goal is coherent street-to-facade illumination and separated building masses while retaining the evening character, not scattered bright spots on an otherwise uniformly dim scene. The overhead frame protects broad readability and checks that the local gain survives at city scale.

Accept only if an independent reviewer can name a clear improvement in both hero frames from the full native A/B images, without crops, difference maps or explanation of the changed parameter. Reject crushed or washed-out photographic detail, lost signage, excessive paint glare, halos and newly conspicuous surface boundaries. The overhead frame must remain coherent. One existing short 30 fps controls-driven sequence may check any affected moving-light/post behavior; use sparse samples and keep its unobserved intervals outside claims. After the candidate wins this comparison, run the normal integrated gates once and retain the required final Satellite coverage and basic style-switch regression check. This small comparison is an iteration decision, not a replacement final certificate.

## Efficiency and stopping rules

- The reported accumulation of roughly 340 reports and 70 worktrees is root-provided context, not a census I repeated. Together with the current queue's nested evidence chains and the modest visible paving gain, it suggests the unit of work has become a proof component instead of a recognizable improvement to the scene. Preserve existing correctness gates; choose larger coherent visual outcomes for those gates to certify.
- Freeze the accepted corner. Do not reopen its paver noise, seam, source-blur or contact evidence without a new material finding. A successful bounded result is finished work even when the whole city remains incomplete.
- Permit at most two candidate comparisons for this lighting outcome. If neither clearly improves both hero views, stop parameter sweeping and record which visible requirement failed. That result should move the next choice toward one source-supported physical frontage, not a third lighting-proof subsystem or broader simulation research.
- Use one implementation owner and one independent reviewer, one shared comparison packet and one final gate run after a winning candidate. Re-review only changed conclusions. Finish integration and task-owned resource retirement before opening another visual worktree.
- Stop this milestone when the stated three-view acceptance and required final checks pass. Do not add Cartographic polish, a default-population change, controller-history changes, installer work or a public-origin push. Their existing authorization boundaries remain.

Lighting is the best next bounded bet because it affects all three inspected scales with the existing scene. Physical detail is the next structural ceiling; streetlife would matter greatly but its default activation is outside the authorized scope here. More shader/paver micro-polish has poor expected value at the present visual state. No browser, server, render, gate, process fleet, source or data mutation was launched for this review. Only this authored report was created; no temporary artifact needs cleanup.
