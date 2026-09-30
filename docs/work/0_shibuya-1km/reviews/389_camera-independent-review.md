# Camera controls independent review 389

2026-09-30 UTC. Read-only review of camera388 against base `398ea36643786eea85f6b99304a0c41073bd5fa5`. Verdict: no material source finding; approve these camera paths for the remaining browser and integration checks. This is not product acceptance.

I inspected the actual diff, all three candidate files, installed three.js 0.180.0 OrbitControls pan/update/pointer/disposal handlers, the unchanged rest wrapper, and the existing render loop. SHA-256 of the inspected candidate bytes, also matched against the retained camera388 copies:

| Path | SHA-256 |
| --- | --- |
| `src/render/camera.ts` | `6ae2a0a89520043c0c740dad89b7c58c71dc028e93d613f9321b8a2ace97169b` |
| `src/render/camera-keyboard.ts` | `cf5bccc2f483f5135b68164c88096f9c68dc0be1d78cbb30617dcbe82845aecd` |
| `test/camera-input.test.ts` | `9de24e9738baf3882c1fce04efb49b8ce6c7f64506dfc914399499fed0086a16` |

Held WASD queues normalized ground pan once outside the rest wrapper. The checked `_pan` seam preserves OrbitControls ownership of the pose and uses camera-relative ground directions. Pointer-handler updates without frame delta cannot enqueue additional keyboard time. The quarter-second clamp matches the existing render-loop stall bound. Middle drag uses the existing rotation handler; left rotation, right pan and wheel zoom retain their mappings. Focus, modifiers, hidden state and blur suppress or clear held input; owned listeners and previous canvas tabindex are restored on disposal. The upstream private seam remains a dependency bound, checked at installation rather than a new pose writer.

I read and rehashed receipt `artifacts/camera388/receipt.json` (`c23a300e1dc3a79bea8a3a8909c094e5496b624e18f453dee62060e0b702e1e6`), its red/green logs and owned Vitest config. The logs show original 18 failures and eight passes, then 51 passes across three files. The recorded original camera hash equals primary's baseline bytes. The CPU fixtures use actual OrbitControls handlers, but dispatch keys directly on a mock window and emulate focus; they do not prove native event bubbling, middle-click autoscroll suppression or browser pointer capture. Empty type output alone is not independent evidence of its reported exit status.

No browser, GPU, server, new probe, gate or test rerun was launched. Real-browser held keys at street/block/aerial zooms, UI-to-canvas focus, blur/release, middle drag, retained controls and native appearance remain required, followed by all five gates. Current app lines 186–187 pass frame delta, but app restoration and startup integration are ongoing; that app is outside this frozen review and needs final revision review.
