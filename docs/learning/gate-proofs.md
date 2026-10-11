# Fresh Unreal gate proofs

These are observed bounded red/green controls from the fresh branch. They do not establish rendered quality, independent survey accuracy, motion, or performance. Raw fixtures and receipts remain ignored while final review needs them.

## Native image import and measurement readiness, 2026-10-11

The retained WebP-only source control is `data/validation/webp-only-control.glb`, SHA-256 `035ad8bef6e7d5458b854b9dd90691d3d8496dbf39f51f41a5073f43d20a3bea`. Its native red receipt is `artifacts/unreal/build-20261011-002135/report.json`, SHA-256 `b7b6ffc0730d285db88513d9bd7b35c5522c3365b6bd0aef5f21abcf91281fd2`, with the error: `Cannot import sample-crossing.glb: source has 1 images but Unreal imported 0 textures. Provide native JPEG/PNG glTF images and core textures.source references.` The failed receipt itself has no input manifest digest. Its association with the retained WebP control comes from worker records, not a fully automated failed-input binding.

**Correction to the earlier draft:** `artifacts/unreal/build-20261011-002331/report.json`, SHA-256 `b9dc0de1136f87a2a023f9951d2faa61b373766a10c4378509c1736a6328c734`, was a later PNG import with one texture asset. The material query ran before native compilation finished and returned zero used textures. Its reported binding failure was an instrument-readiness failure; it does not prove actual missing PNG material bindings and is not the WebP missing-asset control. This failed receipt also lacks an input manifest digest.

The PNG-normalized sample is `data/prepared/sample-crossing.glb`, SHA-256 `709ae5759924150398251b41f01f1ae341732a1ac875acd8b4f8f602086e4388`. After native compilation finished, it passed import with one mesh actor and one texture asset bound through the imported material. Its green receipt is `artifacts/unreal/build-20261011-002455/report.json`, SHA-256 `00d8bfea2162f73484d9b6a4158f13744e44bcf438a7145f4d204cd2a65fc5e0`, bound to sample manifest SHA-256 `46ad31a3e96eebad4788ee8c2df578a81fa7c72b7366d70787bb015067cd1884`. The later full import reported 43 native textures. All three receipts report graceful editor cleanup, exit code 0, and the owned editor stopped.

Bound: this records rejection of the worker-linked WebP sample with zero imported textures, the intervening invalid readiness measurement, and admission of the pinned PNG sample after compilation on installed Unreal 5.8.3. It does not prove an actual PNG binding-loss defect, fully automated failed-input identity, support for every image extension or texture slot, pixel fidelity, or facade appearance.

## Exact-version dependency audit, 2026-10-11

The original DracoPy 2.1.0, NumPy 2.4.2, Pillow 12.2.0 query returned vulnerabilities for Pillow. Its retained red response is `data/prepared/dependency-audit-red-pillow12.2.0.json`, SHA-256 `e5d40d2077ce361d959a0301a819a8e60864b04d66f4bdf1910cd68f773bf0ef`.

The repaired hash-pinned set uses Pillow 12.3.0 with the same DracoPy and NumPy versions. The official OSV query returned no entries for all three exact pins. Its green response is `data/prepared/dependency-audit.json`, SHA-256 `99a3cdafc95afe4faa7faf226ec6d419af6fecb8085fc9759b410672d52c2bb3`, checked at `2026-10-11T07:24:54.667903+00:00`.

Bound: known OSV records for these exact PyPI versions at query time. No absence-of-vulnerabilities claim extends to unqueried dependencies, future disclosures, wheel provenance beyond the recorded hashes, or package safety generally.
