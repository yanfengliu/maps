# Review140 support decision — finite handoff

**Recommend an independently reviewed trial of option A below after the Y14 cuts and their foundations are closed and proved. No additional structural geometry has been generated.** Option B uses the same measured obstruction envelope and is a visibly heavier alternative. Neither is an engineering design or an accepted native appearance. The east track's long span remains an explicit design risk, not something the 0.4 m deck or a topology pass resolves.

The source-aligned four tracks, approved 4 m cut width and Y14..24.9 cut remain fixed. No other building, source surface outside those cuts, terrain, road, pavement, graph or actor height changes are proposed. Outer source tracks are 15–17 m from their nearest neighbor in this area; broad transverse members between them are excluded. The rejected Y8 widening and earlier short endpoint counterexamples remain preserved.

## Actual protected footprint and candidate foundations

`support-layout-exact.json` retains all 9,902 full floor/graph intersection fragments. Their disjoint diagnostic partition has 2,552 pieces and area 1,613.3547377364 m². Re-subtraction reports 0.000003172585 m² of aggregate numerical residue; that partition is therefore not a lossless replacement for the original fragments. The proposed layout's decisions use the original physical-floor fragments expanded by an explicit 0.5 m square setback, original graph segments with their reviewed width/2 + 0.5 m and an authored 8 m extension **along each segment**, and source bridge ranges extended 2 m. The old 8 m world-Z shadow across every floor is retained as a conservative diagnostic, not treated as a physical law. This remains a static envelope, not rendered swept-body certification.

The candidate columns are **0.8 m across the track by 1.2 m along it**, sampled on a 2 m station grid at lateral offsets -1/0/+1 m. Of 305 floor-free locations under the proposed explicit setback, 201 have positive retained-building face intersections when a column starts at terrain. The current Y14 source-cap coverage diagnostic identifies 150 locations fully covered by upward-facing Y14 returns. The others must not receive such a column. No-hit terrain locations are candidates only: final source-solid containment and support continuity remain to be proved. Cap-covered locations require both actual cap closure and continuous retained solid below the whole footprint; an area test alone does not establish that foundation.

The selected long-gap limits below prefer central columns when available. They describe support-centre arc distance along the actual source chain, not an artificially straight Z span. Full footprints, lateral offsets, actual intersected source/output faces and cap triangles are retained in `support-final-options.json`.

| Track | Candidate station limits | Source arc between support centres | Foundation at limits |
|---|---|---:|---|
| 146060273 | Z186 to Z230 | 49.475925 m | Terrain candidate / Y14-cap candidate |
| 146060426 | Z180 to Z224 | 48.792305 m | Terrain candidate / terrain candidate |
| 155269600 | Z178 to Z222 | 48.796750 m | Terrain candidate / terrain candidate |
| 155269603 | Z178 to Z256 | **85.766146 m** | Y14-cap candidate / Y14-cap candidate |

The eastern apparent intermediate opportunities at Z212/214 do not satisfy the current complete cap-foundation coverage check. They were not promoted into piers to shorten the span. Earlier broad-Z tests gave a 92 m gap; resolving the actual polygon layout does not turn that into four adjacent tracks or eliminate the eastern long span.

## Two bounded structural choices

**A — Two narrow through trusses per track.** Keep the current deck, ballast and rails. Place two authored side trusses with centre offsets ±1.5 m and a 0.20 m horizontal member envelope: total width 3.20 m, inside the complete 3.4 m support. Their complete vertical envelope is Y20.25..23.85, 3.60 m deep. A concrete trial uses 0.20 x 0.30 m upper/lower chord envelopes and diagonals within a 0.16 x 0.16 m envelope, with source-arc panels at most 6 m. The ends bear on the approved column/abutment candidates, with each footing meeting either untouched terrain or a fully admitted Y14 retained-solid cap. There are no overhead cross-track beams or connections to the outer neighboring tracks. This keeps the rail visible through the sides and makes the authored support mechanism visible. The 85.77 m curved eastern span and its span/depth ratio about 23.82 are mandatory independent design/native-review issues; these dimensions do not establish stiffness, capacity or actual railway practice.

**B — Two continuous side box/plate girders in the same envelope.** Use the same span limits, foundations, 3.20 m total width, and Y20.25..23.85 envelope. Model continuous outer and inner side faces with 0.20 m overall girder width and transverse diaphragms inside each girder envelope at at most 6 m arc spacing. This is the heavier authored presentation. It obscures the rail at low lateral views and may fail the visual goal by looking like tall walls. It has exactly the same measured obstacle bound as A because the diagnostic already uses the **entire solid side band**, not only thin truss members. No structural sufficiency is inferred from making those faces opaque.

These are appearance-trial alternatives within the existing corridor, not permission to choose unsupported pier positions, widen cuts, claim cap topology already works, or hide a rail endpoint. If independent review finds neither plausible at the eastern span under the fixed corridor, the concrete unresolved condition is that span/support contract. Return that condition rather than inventing source authority or a broad new station structure.

## Measured obstruction bound for both choices

The probe builds 20 complete solid side-band segments from original-source miters and interpolated miter sections. The 3.2 m envelope leaves nominal 0.4 m per side inside the existing 4 m cut and 1.05 m below its Y24.9 top. It intersects **zero retained building faces** in the current Y14 outputs. This is a positive surface-intersection bound; the current cut outputs still contain open seams, so it does not certify a source solid or future generated members.

Against complete cached road/pavement triangles, no side-band volume intersects a retained floor. The minimum separation from the band underside to a floor below is **5.346696 m for roads** and **4.210762 m for pavements**. There are also upper decks: their minimum clearance above the Y23.85 band top is **6.183234 m for roads** and **6.219037 m for pavements**. The preliminary signed-height result that mixed those upper decks with floors below is preserved as `support-final-options-unclassified-floors.json`; it was not treated as an actual intersection or silently discarded.

The exact below-road witness is roads face20948 at approximately (127.808646,14.903304,179.765549). The below-pavement witness is pavements face133740 at (116.885760,16.039238,206.151731). The JSON pins both cached meshes and every building/candidate input. Rendered moving-body contact, terrain/source-solid foundation containment, connections at bearings, mesh topology and native appearance remain required checks after a choice. The four long spans above are the only alternatives being offered now; this lane is frozen for root's decision.
