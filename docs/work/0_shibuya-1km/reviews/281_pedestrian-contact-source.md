# Independent review281 — contact279

Verdict: HOLD. One material source finding blocks the proposed native A/B until a narrow correction and focused regression are reviewed. The reviewer did not author this prototype and changed no implementation. No tests, gate, build, browser, server or GPU run was performed. Shader compilation, rendered contact quality, continuous lift/landing behavior and GPU cost remain unverified regardless of source review.

## P1 — Contact receiver is behind the pavement depth it must overlay

`src/agents/render/local-walk-contact.ts:89–91` creates a transparent, depth-tested, non-depth-writing mesh with polygon offset factor=-1, units=-1. Its vertices are the original pavement triangle positions (line86), with no height lift. But the real receiver is `createSurfaceMaterial('sidewalk', style)` in `src/scene/roads.ts:68–73`; `src/scene/surface-materials.ts:235` enables polygon offset with factor=-2, units=-4. That opaque material keeps normal depth writing. Style application at lines255–259 does not change its depth policy.

The opaque pavement therefore writes a depth closer to the camera than the contact mesh's coplanar depth. The later transparent contact pass still tests depth, so its weaker offset can fail against its own receiver. This prevents the intended contact shading or leaves it dependent on depth quantization/precision accidents. Merely rendering the helper later does not fix the depth comparison. The default renderer does not enable reverse depth, and Three maps the material's default LessEqualDepth to LEQUAL.

Correct the helper's depth relationship to the actual pavement policy while retaining original receiver vertices, depth testing, no depth writes, and the normal/shadow exclusions. Add a focused regression importing the actual receiver material policy, so it fails for the current weaker offset and for a future incompatible receiver change. The six existing CPU tests assert the helper's depthTest/depthWrite flags but never compare receiver/helper offset policies; they cannot catch this defect. A later native A/B must still establish that the cue appears without painting through shoes, markings, unrelated surfaces or seams.

## Other scoped observations

The sampled `foot.p`, `home`, `ground` and yaw agree with the existing normalized world foot frame and rigid-foot yaw solve. Conversion applies context scale/origin once; the ellipse shader reverses the same XZ rotation. Inverting the actual parent matrix keeps retained world-coordinate pavement stationary. Missing support hides the cue; the helper adds neither triangles across holes nor modified pavement heights. The 1–4mm plane band is presentation clipping, not proof of physical support or unique receiver ownership.

The integration updates style and contact from the existing draw sample, without a second clock or controller change. Per-fragment maximum avoids summing the two foot ellipses; overlapping source triangles remain an acknowledged native risk. The registered discard material follows the actual normal-pass adapter, writes no depth, and is restored afterward. The helper casts no shadow. Disposal unregisters the normal material and disposes its geometry/materials once. No other actionable finding arose in this narrow review. These observations do not replace shader or pixel verification.

## Exact reviewed bytes and supplied evidence

All three live files and candidate snapshots match these SHA-256 values:

- `src/agents/render/local-walk-draw.ts`:87fcc0fe13ae30c940a58de72c842472b1afad2717dba0cd56f6b40401308ed3
- `src/agents/render/local-walk-contact.ts`:a71b4f9d3afc95504baf9499da5d294c9b137bee2aa76a60628bf74a8a861d62
- `test/local-walk-contact.test.ts`:7492edafcb2b03ba6ee6050bf8ed0209ce2e4c99a34829230ea7672a77920be1
- `artifacts/contact279-20260928/manifest.json`:15619aaffe961ada8079d54aaf57bc2c92c7fb6316dcd73d3a92a2ea58e78042
- `artifacts/contact279-20260928/candidate.patch`:099ca188daf721822d7e22f26845635812f68406f855e56f5154ad20f78e69b0

The supplied receipts were read and their manifest hashes verified: focused-tests.json c276c31203015db533cca37e763b32af043d2a24cad7a41869b19d6e3c77c240 reports six passing cases, focused-config.json binds only the requested test, and typecheck.json e28c8f87ad3155b33478f57bddadd9cb0ee635f5d316a5aa935522446b06e49e reports Node24.12.0 exit0. The runner and cleanup receipt were inspected; this reviewer did not rerun them. Their bound is CPU input/geometry/material-registration/lifecycle and types, not compiled shaders or images.

Existing264 gait proofs and the full actor were not re-reviewed. No default266, autostart, controller, installer, global shadow/AO or other product change is authorized by this review. Original279 snapshots, report and receipts remain preserved. Return only the local depth-policy correction and its regression for focused re-review before any hardware admission.
