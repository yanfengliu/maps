# Review 265 — first visible pedestrian, native pixels

2026-09-28. Independent read-only review of immutable candidate 264 capture `native261-assets264-20260928-4`. All 17 unique PNGs were opened individually at their original 1280×720 resolution. No contact sheet, resized proxy, decoded-video color, source-geometry reconstruction or new render was used. Evidence root: `artifacts/native-capture261-20260928/runs/native261-assets264-20260928-4/`.

## Decision and limits

**Continue the bounded first-visible-actor activation. Do not call full motion, three-LOD appearance, photoreal quality, or default-product acceptance complete.** The actor is visibly present before Start and remains a coherent person through the sampled near poses in both styles. No sampled frame shows an exploded rig, missing limb, gross body distortion, or obvious shoe penetrating the pavement. The next useful work is the actual default activation plus focused resolution of the evidence and appearance issues below, not another source/numerical rig proof.

1. **Far appearance is unreviewed because the witness is occluded.** Frame 1398 is dominated by close building surfaces and an overhead black slab; the actor cannot be seen. The recorded far LOD at 74.56 m is telemetry, not pixel coverage. Replace this witness with an unobstructed controls-driven view before asserting three-LOD appearance. Frame 1262 at 39.67 m provides only a roughly 25-pixel human silhouette: enough to reject a gross blob or missing actor, insufficient for shoe, skin or cloth quality. There are no Cartographic medium/far witnesses.
2. **Grounding is visually weak.** In the largest near samples, 2392, 2401 and 2556, the red shoes meet the pavement but there is little readable local contact darkening and no readable cast shadow. This makes the person appear pasted onto the plaza. The appropriate improvement is consistent contact/shadow presentation, followed by the same near view; these pixels do not establish incorrect physical sole height. The single-pixel scale near the soles cannot verify millimetre contact, drift or continuous sliding.
3. **Continuous motion is not accepted by this review.** The native poses show changing stride, a front-to-back turn, return and standing handback. Body volume and clothing remain intact. The arms remain fairly close to the sides in the samples, which gives a stiff impression, but this is not sufficient evidence of a motion defect. I did not watch the full WebM: no direct model video playback tool was available and neither ffmpeg nor ffprobe resolved on PATH. No decoder was installed and no derived images were made. The clip remains available for a separate temporal review; sampled stills do not prove smooth turning, natural arm swing, landing, absence of foot sliding, encoder continuity or the unobserved intervals.
4. **Surrounding image stability needs separate tracking.** The held frame 1578 has smoother crossing stripes than moving frame 1642 at the same view; the moving frames show conspicuous serration/striping on the diagonal crosswalks. This is visible in the native PNGs, not the recording color artifact. It does not invalidate the actor's sampled body shape, and this review does not determine the post-processing cause. The broad flat plaza and blurry blue building textures also keep the total scene below a photoreal-quality claim; whole-city appearance is outside this assignment.

The near person has plausible adult proportions, readable hair, a blue graphic tee, textured jeans and distinct red shoes in Satellite. The Cartographic frames simplify and desaturate that treatment without a visible geometry break. Face and finger detail are too small for a detailed anatomical verdict. This is acceptable evidence of a first visible person, not supreme finished character quality.

## Temporal sampling actually inspected

The five setup stills are held at sampled time zero. The twelve later unique stills have sampled times 0.23697, 0.42087, 4.80057, 4.87207, 6.00257, 8.00327, 12.00357, 18.00447, 19.21027, 20.13567, 22.11367 and 38.40507 seconds. Successive gaps from time zero are 0.23697, 0.18390, 4.37970, 0.07150, 1.13050, 2.00070, 4.00030, 6.00090, 1.20580, 0.92540, 1.97800 and 16.29140 seconds. The last frame serves two event labels; it is one image. Its root clock is 38.41667 s but drawn pose is 38.40507 s, 11.6 ms before the later event request. It cannot prove that exact requested phase.

Capture records report RTX 4090/D3D11, two root cycles, 2305 fixed ticks, 1150 capture-track frames, no capture errors and completed owned cleanup. Those are capture facts, not my motion or performance verdict. I created no browser, server, GPU process, or temporary media. Main still uses the static rail path; default activation, full gates, integration and 3000-pedestrian/200-vehicle performance remain outside this review.

## Native frame index

Every row was inspected individually at 1280×720. Times are drawn/sample seconds, not inferred video positions. C = Cartographic, S = Satellite. LOD names are observed metadata; visibility is the independent pixel judgment.

| PNG | Time / style / LOD | Pixel observation | SHA-256 |
| --- | --- | --- | --- |
| frame-824.png | 0 / C / near | Standing figure visible; simplified grey-blue clothing; no obvious gross distortion. | d2df6f9ab1285ac1c7a4ea4ac118ba891df1db26a94f429843990d558a80236f |
| frame-1018.png | 0 / S / near | Secondary angle; complete figure at left; blue tee and red shoes readable. | 94cf4804ab887554a1b00851a5d5dcb10cffd21f8c45cf5f905a1aa18cff42ca |
| frame-1262.png | 0 / S / medium | Small visible person near image centre; silhouette only, about 25 px high. | c4b73d190014fcef58cb970f4be867c6906ddf1a83f5b1de854e9914d075a8de |
| frame-1398.png | 0 / S / far | Actor hidden by building surfaces; no far appearance evidence. | 749e55c8a024f3945ca2659c79c5cb8b5aa4f32fbf54271691f90caf7c7a30a8 |
| frame-1578.png | 0 / S / near | Initial actor visibly present at 12.17465 m; intact standing pose. | 213c563d343d100892b5ec087738a40d4f943fd7cc1d81fbb727fc727819370d |
| frame-1642.png | 0.23697 / S / near | Early movement, still near standing; crosswalk edges visibly rougher than 1578. | 925524d9174bce53d8d273a986d7a0ce09838b22b5b39ad0ac25f82203372b4d |
| frame-1672.png | 0.42087 / S / near | Forward step visible; leg silhouette changes coherently. | 0053390e7bb141b9d3fcddbb145c57f678c5130a98b36d1ce92bae5e8a449a56 |
| frame-2392.png | 4.80057 / S / near | Largest front/three-quarter stance; intact face, tee, jeans and shoes; weak grounding. | b8d5bf640d7aff632d5717a1430d9b8eaa49b92100a66562ecbb35301f3ea65a |
| frame-2401.png | 4.87207 / S / near | Closely spaced pose after 2392; no gross landing break; precise contact unresolved. | fb50163ca57123c9aed4ca1064508b0ea82e8e8b2385769c3d4e81ca52d4bcb7 |
| frame-2556.png | 6.00257 / S / near | Turned side/back; torso and shoulder silhouette stays coherent; weak grounding. | ddc161b0a74a17edf344183a36855eb209d03b8a0d5eca265c8efeb8b43adb68 |
| frame-2870.png | 8.00327 / S / near | Back/side stride near left edge; separate legs and intact shoes. | 01a3560650d5dfafc91b5f88a741cedc5d390292f1e48b43ca7f60258a8fbd34 |
| frame-3474.png | 12.00357 / S / near | Returning back view; jeans, waist and shoulders coherent. | d614e4837faf76b89e0313749b00b16a1458482a00df1fa207fcd2bac8a14a0a |
| frame-4414.png | 18.00447 / S / near | Small side stride near original location; intact limb silhouette. | d67fe65334d9a2bc6a66dec92da80a31a5479985fd0ead7a6bd4d9036d30e9ff |
| frame-4559.png | 19.21027 / S / near | Standing return pose; no visible gross body discontinuity against initial. | 88508a25a33cd1356ee40fc138ff1e169ff1764d081c16ef992faa0e3118018c |
| frame-4703.png | 20.13567 / C / near | Moving Cartographic person visible with separated stride; style simplification coherent. | 5cca3d23d832909dd28778faf5361442b573b4b179452721431e5919fbb01a08 |
| frame-5022.png | 22.11367 / S / near | Satellite stride restored, colored outfit and complete body readable. | 363e126de078921cb3392a1bfc637d5267b410ebdb47d0949e7f84b758707209 |
| frame-7357.png | 38.40507 / S / near | Standing handback near initial pose; exact later requested phase not drawn. | e5f1a36c56043a30bf39505cf838a72d7b8c6a7bd3c6f50969df4760c0f8d12c |

## Supporting evidence digests

Recomputed directly from the final files after executor261 confirmed immutability. `stills.json` also binds all 17 native file digests above.

| File | SHA-256 |
| --- | --- |
| capture.json | dae8c14cdf343e999956be6c1b4f72c86f60240ca352bfb81c7d87cb27107e53 |
| stills.json | 64bd7abf28ac9aacb6a3c9672b6bc83d803f1ddf48ff729407bf9a3d448e238f |
| event-times.json | e89fe39346e0690d7eef5ffa5a3f2ca6849579650c9cc5830118c0a4f9004090 |
| observations.json | 1c7aa8f8f96e0ba8a61ecad5851ce62a752f78bca4df3dc81722b99e4cacdacc |
| complete.json | accf4bd990eb78effdfcb692d8fc3c7002cdb6996039a8423f570f15bb12974e |
| motion.webm, retained but not watched | 0131fe59070d929c561cdea17b46289a53a7b4883aea6cb135dd371355ec7002 |
