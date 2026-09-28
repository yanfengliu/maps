# Focused review 281b — contact depth successor

ACCEPT the narrow correction; close review 281's P1 source finding. Native shader compilation, rasterized contact visibility/quality, precision, shoe/marking occlusion, seams and GPU cost remain unverified. This is readiness for a separately admitted native comparison, not native acceptance.

Read the committed review 281, actual successor patch, helper and real sidewalk factory/use in roads.ts. Verified the three supplied handoff hashes, all three live source files and candidate copies, all seven evidence hashes, receiver source and predecessor manifest. The helper delta is exactly the adjacent comment plus (-1,-1)→(-2,-5); local-walk-draw.ts is unchanged. A direct before/candidate test diff confirms only the actual receiver import, LessEqualDepth import and two style cases were added.

The actual opaque sidewalk retains polygon offset(-2,-4), depth testing/writing and LessEqualDepth through style application. The helper now matches that slope factor and precedes its constant offset by one unit, while keeping original vertices, depth testing and no depth writes. For the current conventional depth policy this corrects the weaker-offset ordering identified in 281. It does not guarantee visible pixels across GPU precision or overlapping receivers; those remain native questions.

The added cases call createSurfaceMaterial('sidewalk', style), apply both styles, and compare actual material flags/functions/offsets without copying receiver constants into the test. The old-red binding matches the retained original helper. Actual red receipt reports six original passes and exactly two new failures, both “expected -1 to be less than or equal to -2”; exit1. Successor receipt reports8/8 passed, zero pending/todo, exit0. Owned typecheck reports Node24.12.0, exit0, empty stderr. Configs restrict the run to this file, disable cache and bind owned cache/TEMP paths; cleanup reports zero owned checker processes. I did not rerun any test, typecheck, build, browser, server or GPU.

| Accepted file/evidence | SHA-256 |
| --- | --- |
| local-walk-contact.ts | 9c0c1ee57ac7ef76342244fbc8f080f9cc611e72f26942b61a6bfd6bf689c590 |
| local-walk-contact.test.ts | 0c0daacb2c2bbeb3e1db8b8176e40d6971281fc460aa2db18198f265a26d5eac |
| unchanged local-walk-draw.ts | 87fcc0fe13ae30c940a58de72c842472b1afad2717dba0cd56f6b40401308ed3 |
| actual surface-materials.ts | 22a14fadb886221eb63813a916325aa5b185fa891d20608dece38e0cf95ab3d4 |
| successor manifest.json | 1291a9c646b4cbfb9926d884c21fad5ded6ff368ad1f3b94dbb6458c20c45bcd |
| depth-fix.patch | 0a40c99a392b71e4e89609b97882a0a63764bc7d89deee86c83355cc8df3ac47 |
| successor REPORT.md | 9bfa8373ae7d3b25186f67ea10ab7c5bcc772dff4566ef63c4a9a3e6690c84a7 |
| old-red-tests.json | df1afd91d3f145b334f0161ed5560ee62e9b6a74cba12e439674622515e41856 |
| new-green-tests.json | b9534c3776bad1dc222f073b2024d0888237405f76707ede000ce766cd9a32d1 |
| typecheck.json | 32fb8338d2cd0240f202e9f625829d711d837f3f5afb3d48c3ec7261f1b4c7da |

Successor artifacts are under C:/Users/38909/.codex/worktrees/pedestrian-render/maps/artifacts/contact279-depth-20260928. Original review 281 and279 evidence remain unchanged. No broader264 proof was repeated or default266 work performed. Only this follow-up was written; no persistent resource was launched.
