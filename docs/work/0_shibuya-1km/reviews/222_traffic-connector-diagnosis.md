#222 — the retained event drives a backwards connector loop

**Confirmed source geometry defect; pause scored native preparation.** The camera now shows the turn, but the cached path asks the car to turn the wrong long way around a2.8m connector. This is source attribution for the retained CPU event, not identification of a live slot from pixels. No browser, GPU, replay, source edit or data rebuild ran.

The affected source edge is`turn:lane:41857226:0:0:ground0:f:0>lane:41857228:1:0:ground0:f:0`,occurrence2 of the retained slot1/generation3 route. It occupies route arc56.109950–58.917221m. The current private`bezier` constructor in tools/network/generate.ts:387, called at:187, reproduces all nine cached XZ points exactly. The diagnostic executes that actual function body extracted from the current file; it does not substitute a new curve formula. Drape changes height, not those XZ points.

| Source quantity | Result |
| --- | --- |
| Incoming / outgoing heading |−38.836894° /44.844159°|
| Intended shortest turn |+83.681054°, classified`left` by the generator|
| Direction dot product |0.110063; the ordinary U-turn filter`dot<−0.7` does not reject it|
| Endpoint spacing |2.001179m|
| Endpoint chord along incoming direction |−1.490887m: outgoing start is behind the incoming endpoint|
| Connector arc length |2.807271m|
| Unwrapped heading change including joins |−276.318946°, one full revolution away from the intended turn|
| Heading discontinuity at each join |−24.169908°|

The constructor connects the already offset lane endpoints without trimming back the incoming approach or advancing the outgoing exit. Here those endpoint/tangent constraints force a tight reverse-facing curl. Sampling the cubic at eight segments also leaves its chord heading different from the adjacent lane tangent. Runtime`sampleRoute` takes current-edge`headingAt`; that helper probes±0.2m only within the current edge and cannot bridge a join. `placeVehicle` publishes that path and yaw. Renderer interpolation covers adjacent fixed poses but does not repair the path. Using the actual`sampleEdge` and`headingAt` helpers reproduces the retained Float32 positions/yaws at all seven samples6960–7050 exactly. Their apparent reversal therefore has a concrete source cause.

## Smallest coherent repair scope

Repair junction geometry where lane offsets meet: choose approach/exit positions that admit the intended turn, trim the connected lane sections consistently, generate a tangent-compatible connector, then recompute arc lengths and dependent passages/controls. Validate turn sign, no extra full revolution or cusp, endpoint/tangent continuity and body/corridor fit across the affected class. Use this exact cached connector as a regression witness. First prototype the geometry against the same source without publishing new data; source audit must establish road/support constraints before adoption.

That change reaches the offline network and its authoritative route distances. Gate positions, mapped controls, jurisdiction sections, receiving-space checks, source pins and dependent generated assets need revalidation. Existing195 source/build and200/202 static evidence remain unchanged today, but event schedules, network-bound checks and populated evidence cannot transfer across a rebuilt graph. Root should assign one isolated implementation owner plus independent review.

An explicit non-drivable-connector refusal is a smaller interim correctness guard, but leaves this visible route undelivered and may reduce active demand. It must remain a named refusal. Changing only displayed yaw, lowering speed or selecting another camera does not repair the backwards position path. Changing only edge-join heading sampling would address the two boundary jumps while leaving the central curl.

Wheel contact remains a separate question. `vehicleRoutePose` uses centerlineY; `placeVehicle` calls`placeSlot`, which writes an upright support normal and zero default wheel offsets/steering. That establishes the absence of fitted tire support, not penetration or floating at this event. No terrain-intersection claim follows from this diagnosis. The high pilot view still cannot judge contact.

## Evidence and next native boundary

connector-diagnosis.json pins eight current source/reference inputs and records exact constructor correspondence, headings, knots, boundary discontinuities and seven sample matches. The finite check took83.051ms internally; input bytes matched before/after. Earlier failed probes210/212 remain untouched. No generated network bytes or frozen195 files changed.

After the corrected source route is admitted, use its timing to target the worst turn interval with30fps native copying and6–10 selected frames per style. A closer exterior contact view needs a tiny visibility pilot before scored capture. Existing entry/style observations can transfer only where their exact bindings remain applicable. No final-event executor is frozen or native run authorized by this finding.
