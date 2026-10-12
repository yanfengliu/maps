# Crossing camera trial, 2026-10-11

Bound: root inspected the retained manual and histogram crossing PNGs individually at their original 1280×720 size. This is visual rejection of this editor SceneCapture trial; it proves no ordinary Game camera behavior or six-view acceptance.

The manual final image `artifacts/unreal/metered-camera-control-20261011-170448-0c68d733/crossing-manual.png` has SHA-256 `23904b01adf12497436d86576bfd0e3dd379f2b2ae7b4dbdc43c3130903c69cc`. Shadow facades are almost black, while sunlit ground remains visible. Its measured median luminance is 1.1444 and black fraction is 0.630911; its warmup/final convergence check fails.

The histogram final image `artifacts/unreal/metered-camera-control-20261011-170448-0c68d733/crossing-metered.png` has SHA-256 `0b7746bf52d9dc55efef9024bda90f5cb202c555ef54b427a67c84a8aa5de10c`. Some facade texture becomes visible, but most sunlit pavement and a bright facing wall clip to white. Large shadow facades remain very dark. This image is not acceptable as the lighting repair.

Receipt `e413fd0b7cb8cdd263ffef0e5ef4eb48bc774eb82e6d012d0a92ee579d9c5128` records metering admission as did-not-run: the parser did not establish positive histogram generation and eye adaptation under the same measured owner. The other five views were not dispatched. A later raw-profile or parser repair cannot rewrite this experiment into a pass, and exposure alone has not resolved the visible dynamic range problem.

The receipt binds 621 input records and 326 asset records before and after with no drift, plus unchanged engine material parents. Editor PID 77488 exited 0; the owned Job became quiescent after explicitly draining four remaining child processes. Root checked an empty task Unreal process census and restored the original helper and engine config under transaction receipt `0591a4f3c7a26b85aa6859022d342a42a6893db558616fe50ab769bde4fd7d00`. No saved assets or Game camera policy were adopted.
