# Fixed-six native appearance review: REJECTED

Root inspected all six original native1280x720 PNGs individually at native size. Bytes were checked before and after inspection against input-pins.json2378/0eb3194ab82802472eca8b14ecdb9d87be906371d90ca58ef9dcb78cc6119fa3.
Normal render report8be728a3 passed readiness6/6 and darkness on D3D12/SM6/RTX4090. These instrument checks do not establish appearance quality.

Crossing and crossing-west: the pavement is washed out and blurry; crossing markings are hard to read. Dark facades and ground shadows remain heavy. The apparent reversed TSUTAYA lettering is a hypothesis for source/native UV and texture verification, not grounds to flip geometry.
Block and block-north: recognizable building detail remains, but lit ground/facades are pale and shadows have a harsh split. Crop and crop-opposite show the overall crop; the sun-facing view is strongly washed out.
No ordinary Game controls, pedestrians/vehicles or1080p/performance acceptance is supplied by these static720p views.

| Image | SHA-256 |
| --- | --- |
| crossing | 31634d1516cb35555a5f789ad614f6208cca446fe7300022892dba9cc096e6ca |
| crossing-west | a503062d9214636f3d7806f3db4bfc21a292ff9aafd2a68e40fe3cfc89406af0 |
| block | d7392444d89d026e3bbb8a9ac0e624f251e346b00c128b75725ffc69af99e147 |
| block-north | d1d299295cc3d7b7935fad3e8c0791129e5e63bf35cf1c9b9b85110e9014b79f |
| crop | 63218f1095626b398054c68bd69bf4dcb9cef82a013c5feccfbf062ba5d56e1f |
| crop-opposite | ca0eee6d71808facd7f997e941a72516d6b6bf865f5fda730ec15aab63478e3b |

The outer protected-input check is false because Root appended only the workflow paragraph to local-rules.md during the run. The exact doc delta is retained in the handoff9f5284b2; executing code/config/Source/AGENTS/CLAUDE stayed unchanged. Do not claim all protected inputs were stable.
Ground26contexts/2080rays/18citycontrols and checked map saving remain accepted separately. Appearance is REJECTED; city_surface owns a bounded material/UV/lighting diagnosis before a repair proposal.
