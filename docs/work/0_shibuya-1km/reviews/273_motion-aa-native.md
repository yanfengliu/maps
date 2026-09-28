# Native motion AA visual review 273

ACCEPT the narrow moving AA0-to-AA1 change in this view and both styles. All 16 original canvas PNGs below were opened individually at native 1280×720, without resizing, crops or enhancement. The comparison is one ordered hardware A/B pair of the same frozen264 opt-in actor; it is not default-startup evidence.

The crossing stripes show a meaningful reduction in jagged, broken-looking edges in all three B moving frames of each style, most clearly in satellite at A975/B969 and A987/B980. The coloured facade window lines and diagonal roof edges also look less harsh in B1211/1216/1222. B still falls short of the smoother 32-sample pre-start references; distant thin stripes retain aliasing.

Thin sign lettering and the small actor silhouette show at most a subtle improvement, not a separate meaningful readability or character-quality gain. Main SHIBUYA/TOKYO lettering remains legible; tiny lower lettering remains limited in both arms. B slightly softens high-contrast outlines without a material loss of facade, paving, clothing or sign detail. No visible duplicate limbs, trailing outline, ghost actor or surrounding regression appears in either sparse three-frame sequence. The two pre-start pairs are visually consistent. Contact grounding is unchanged and is not accepted by this review.

Metadata confirms unchanged camera to within 2.52e-13 m, but sampled gait times differ by up to 3.267 ms; these are not identical poses. Satellite sampled seconds are A0.300467/0.335867/0.371767 versus B0.303733/0.333733/0.369233; coloured seconds are A1.802167/1.836567/1.872667 versus B1.805433/1.834333/1.870433. All pre-start frames report level0/32 accumulated samples; moving frames report Alevel0 versus Blevel1 and zero temporal samples.

Observed frame intervals, including capture overhead: satellite mean 6.228→6.432 ms and p95 9.8→12.0 ms; coloured mean 6.073→6.108 ms and p95 8.3→8.5 ms. The satellite p95 increase is retained evidence, not dismissed. One ordered RTX4090 pair does not isolate GPU cost or establish crowd FPS. No claim is made about uninterrupted clip quality, encoded-frame delivery, close shoe contact or the unreviewed static44 set. No video decoding or new browser/GPU/test run occurred in this review.

Both capture records pass with 130 hashed HTTP responses each. Both final cleanup certificates pass with no remaining owned processes, no listeners and no retained temporary directory. This review launched no persistent resources; only this report was written.

Comparison SHA-256: `30ced7cb9df96e991b3441b6ae07cf0961fdf0cbb4d09bb91942d7245fee560d`. Runner freeze: `22c617f4db3dd784e2ff2954f8abd8887610c2711bcfd3582b1ec2846779ff4a`. Cleanup certificate A: `dbed19a2b7dab8f3d42fa658822f8fc85770c7003c35eea024dbc7cabac77183`; B: `cab373046c5be31c0aae6fe37b7b5f456ae931760da12d9c9d582a39e8c5ef5c`.

All image byte lengths and SHA-256 values were verified against the comparison before sealing this report. Paths are relative to `artifacts/motion-aa272-20260928/runs/`; S means satellite, C means coloured/cartographic.

| Label | Native PNG | SHA-256 |
| --- | --- | --- |
| S-pre-start | motion270-aa269-20260928-2-A/frame-783.png | `b401007840fe47a047bef94af363835627aa8e70ddb6ddced5100627cdb5e9a4` |
| S-pre-start | motion270-aa269-20260928-2-B/frame-785.png | `85fd4063011b9c3e2258a713cf915f5564f89b9a01be97692e4fefb0e95abd68` |
| C-pre-start | motion270-aa269-20260928-2-A/frame-859.png | `e5cc269ceaf6b68c31c552c5de45ad4c4662d3f21d0b58d466bedb631d18dd8a` |
| C-pre-start | motion270-aa269-20260928-2-B/frame-859.png | `7f6832842d007d4c9d16373deca7f519b03e8b79d0174a624f92ab6e62d5ac75` |
| S-motion-1 | motion270-aa269-20260928-2-A/frame-975.png | `b3a4431b83fcc710702bc1bf96abd936be677a684bd8923a9046e86286528473` |
| S-motion-1 | motion270-aa269-20260928-2-B/frame-969.png | `35255f96533c262c580b5e0d6d90c90ca3b261d826afb258e285bae6b6581a0c` |
| S-motion-2 | motion270-aa269-20260928-2-A/frame-981.png | `b650dd98b3cc8ffb4a5ab62e636e1c351742645b03480ef1220be19b0ea444f3` |
| S-motion-2 | motion270-aa269-20260928-2-B/frame-974.png | `2a31daede73c2aa22586e9d99535f50336e71553964cd0d01305eeb241d53947` |
| S-motion-3 | motion270-aa269-20260928-2-A/frame-987.png | `bca7a448572594f6a7b88473c9dd576d3f676511eeae1c4fc7d7696b049ad11a` |
| S-motion-3 | motion270-aa269-20260928-2-B/frame-980.png | `91ab7106b66e9dc99416ada241406592247627083aa772aa41478f7bacdb8692` |
| C-motion-1 | motion270-aa269-20260928-2-A/frame-1219.png | `b499381a9615f654709aaedf057d909bc3a8763056d2fddfd92842f4224b1813` |
| C-motion-1 | motion270-aa269-20260928-2-B/frame-1211.png | `a8e7f559ab641f3306b12790f1eed139957cb6f9a66639fa126bd2a59cf9b931` |
| C-motion-2 | motion270-aa269-20260928-2-A/frame-1225.png | `cac1aa8c6fc63b85710b5aace0ab072a62ab227edad0f13a127cf17de342e2d6` |
| C-motion-2 | motion270-aa269-20260928-2-B/frame-1216.png | `801b079d4273aa25ab1d3d0632fa440da79ae111e97bffb79fa78c2d22c812a8` |
| C-motion-3 | motion270-aa269-20260928-2-A/frame-1231.png | `7f562eda4da58f463a208a3a377ae35065d1a3e7dae6600e7021c83f8e7ff357` |
| C-motion-3 | motion270-aa269-20260928-2-B/frame-1222.png | `c3904815efd116a327bad165f478a106be1735f2300133239c4127206b494445` |
