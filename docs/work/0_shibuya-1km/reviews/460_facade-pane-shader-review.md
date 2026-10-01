# 460 — facade pane shader and integration review

2026-10-01. Independent reviewer435. ACCEPT for457 source integration, with no material finding in this complementary scope. Base `4100853b33435c2ef67048d223ddad457298c40d`; actual handoff SHA `f296de6b346d74ed29dc71f903a100002da7760a6bec88e7b776e2be9650d2a3`. Review456 separately owns source/UV/GML/plane admission. This verdict does not qualify rendered appearance or bypass450 approval.

The new feature stays in the existing idempotent material hook. Its captured photo/corner/pane flags distinguish program cache keys. Preparation precedes patching, so the pane flag is established before compilation. Shared photographic materials receive the scalar attribute on every mesh using them; repeated identical preparation retains the same attribute. No second hook, texture, fetch or material owner appears.

The GLSL additions have consistent scalar/vector types and local scopes. UV derivatives are computed before varying region admission. A positive footprint floor protects divisions; filtered finite source lines provide bounded coverage and opposite slopes, with normal detail retiring across broad footprints. This is an axis-box approximation. Static reading cannot establish shader compilation or sparkle under motion.

The rigid view transform recovers the world normal. The along/up basis and downward UV-v sign agree with the two supplied source triangle mappings; the perturbed normal returns to view space. Satellite photographic admission excludes its overlapping generic grid. Cartographic and untextured branches retain their existing paths. No new source-RGB overlay or emission term is added; the existing photographic color curve remains. The emission-hook tail is logically unchanged, and the pane UV regions exclude the lower corner/sign locations. Useful relief and roughness strength remain rendered hypotheses.

The texture plugin differs logically only by its import and preparation call. Attributes belong to existing geometries, before renderer byte accounting. The existing transaction captures those geometries and releases them on failure/cancellation; ordinary disposal includes the added attribute. No new asynchronous lifetime, draw/control path or error suppression appears. Named pane-preparation failures reject before pane attribute attachment and atlas replacement.

| Reviewed path | SHA-256 |
| --- | --- |
| `src/scene/facade-textures.ts` | `6c1ecd0c8cf0ab4aa93b33d45e8e4fb03d8abba498378fd53548ce63366d60cb` |
| `src/scene/tile-materials.ts` | `ed69778a6d4f1eb392387e7395760ef162a5b3008e92ab70fe73f0d474564165` |
| `src/scene/facade-pane-relief.ts` | `b758d16a7fc726b9095a65b5befc6383ff4fb859d930b3db2b1704d7b837bd43` |
| `test/facade-pane-relief.test.ts` | `868c24e4632d2846650b324cc4f27c2c54573c0d08f2f39d0970dc0e906822be` |

All four actual lengths/hashes match the frozen handoff. No product import, automated gate, GLSL execution, native image, CIM, Git operation or source edit ran. Required CPU, native, appearance and final integrated acceptance remain pending.
