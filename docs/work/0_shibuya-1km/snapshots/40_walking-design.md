# Continuous pedestrian route placement proposal

Owner: route_continuity. Integration owner: root. Base `244632ca8d88dc464a162fad3782baa91f59f136`. This worktree has no production edits. Read-only junctions point to primary data and dependencies; no install, data writer, browser or server was run.

## Reproduced cause

`reproduce.ts` names the shipped occupancy instrument, runs its ordinary population/admission/RenderLoop path for 200 ticks, and recovers the initial generation-1 route objects. It then calls unchanged `sampleRoute` at the three saved full-precision stations from the prevention experiment. All six resulting float32 XYZ poses exactly equal the saved event poses. No solver candidate was imported. `reproduced.json` records the input network hash `314fac843392de12c8264cbf6b1647935d2b7e9d7194a3c29835e46445537677`, complete route IDs, starts, offsets, adjacent source edges and numeric results.

| Slot | Source station advance, m | Actual horizontal advance, m, before float32 | Limit jump at shared source node, m |
| --- | ---: | ---: | ---: |
| 95 | 0.01955693691149918 | 1.5208849173266064 | 1.5292786953237498 |
| 138 | 0.017786604593766242 | 1.0060979292041763 | 1.0140494376543217 |
| 133 | 0.017752250808257486 | 0.48772297380232127 | 0.5049095435223286 |

All three pass from 2.7548473466352683 m of `walk:977916826:0:0:ground0:f`, width 2.5 m, heading -1.7584706738432971, to `walk:authored:scramble-diagonal:r`, width 5 m, heading -0.883285747074092. The shared centreline node is identical. Slot 95 changes lateral offset from 0.8486352471866063 m to 1.927429531808442 m. `sampleRoute` applies each offset along its own occurrence heading, so the two one-sided limits differ.

Across the first 150 planned routes, 3,214 of 3,215 occurrence joins differ by more than 1e-7 m. All centreline joins agree within that same tolerance. The largest offset jump is 4.516943018519362 m, slot 67's immediate forward/reverse traversal of a 3.531278771106174 m edge. Filtering this turn would change the chosen route, not repair its motion.

The integration mismatch is independent of avoidance: `tick.ts` advances `state.travelledM` by horizontal speed times step, then `placePedestrian` resamples the offset route. The amount named travelled is centreline station. Its increment is not physical arc length. Blending the offsets alone would remove the jump but would still permit physical speed amplification on curves.

## Proposed bounded next increment

Approve an isolated **path construction prototype**, then review its delivered-route refusals before production integration. The smallest useful object is a per-actor immutable physical path attached to the existing plan. It is not a new network or a dynamic corridor solver. The original edge list, passage objects, starts, gates, source heights and seeded lane fractions retain their identities.

1. Represent each physical path as ordered support points with two distances: physical arc distance and monotone source station, plus the source occurrence on either side of an occurrence boundary. Keep physical arc length out of `PlannedRoute.starts` and `RoutePassage.starts`. The two quantities must never be accepted interchangeably.
2. Retain the seeded preferred offset on each straight interior. Replace a bounded neighbourhood of each heading/width join with a tangent-continuous cubic joining its incoming and outgoing offset tracks. Each transition's trimming stays within its two source segments; overlapping trims become a named refusal in this first prototype, not a hidden shortcut. Include immediate reversals explicitly. Do not globally zero offsets, filter turns, draw more random numbers, or change topology.
3. Materialize the curve into a sufficiently fine physical polyline with measured maximum chord and tangent-angle errors. **The polyline is the actual path**, so its cumulative Euclidean segment lengths are exact for the runtime representation. The integrator advances a physical arc budget, and can cross several small segments while consuming that same budget. Euclidean centre displacement can never exceed consumed physical arc. The physical tangent supplies preferred direction. Heading follows the same path, with an explicit curvature/turn-rate bound; a degenerate cubic or unbounded turn is a named construction failure rather than a cusp or heading snap.
4. Keep the first and final pose equal to the existing source endpoint plus that endpoint's seeded right offset and source tangent. No transition extends beyond the final occurrence. This preserves the lease worker's conservative terminal envelope over every allowed offset and the actual scaled square. Interior transitions do not decide retirement.
5. Carry the original source station monotonically through each transition, locally between its incoming and outgoing source segments; never project against the whole route, where a repeated edge or self-intersection could skip occurrences. The interpolation is route bookkeeping, not evidence that a physical gate was obeyed. Before admission, stop at the earlier of the original source hold mapped onto the path and first full-footprint contact with the governed physical disk. A held passage admits its original compound only. No transition may physically enter a different compound before its own grant.
6. Validate constructed points and the sampled footprint against the actual read-only walking support near the route's level. Production receives a required support-query input; there is no optional silent bypass. Synthetic tests explicitly provide analytic support. Missing, ambiguous or wrong-level support returns a named path refusal including source occurrence and world position. Never reuse paint's 10 mm seam exception or select the highest unrelated layer.

The prototype must decide and record its constants from actual construction errors and body dimensions, before a production patch: maximum physical segment length, maximum tangent change, curvature/turn-rate bound, support height residual and footprint sampling grid. Passing discrete support probes is a finite coverage claim; it does **not** prove continuous swept-area coverage over sub-grid holes. A continuous guarantee would require clipping each swept footprint against level-selected source triangles, and should not be claimed from point samples. If the finite support bound is insufficient for acceptance, implement that exact swept-polygon check as a small support validator rather than inventing an unrelated global motion system.

## Exact interface and scope proposal

`src/agents/population/pedestrian-path.ts` owns construction and pure sampling:

```ts
interface WalkingSupportQuery {
  contact(x: number, z: number, expectedY: number):
    { y: number; triangleId: number; mesh: 'roads' | 'pavements' } | undefined;
}
interface PedestrianPathPoint {
  readonly physicalM: number;
  readonly sourceM: number;
  readonly occurrence: number;
  readonly x: number; readonly y: number; readonly z: number;
  readonly heading: number;
}
interface PedestrianPath {
  readonly points: readonly PedestrianPathPoint[];
  readonly physicalLengthM: number;
  readonly sourceRoute: PlannedRoute;
}
type PedestrianPathResult =
  | { path: PedestrianPath; refusal?: never }
  | { path?: never; refusal: { occurrence: number; reason: string; x: number; y: number; z: number } };
```

The support query is shared through `createPopulation`'s constructor, and comes from the scene's already loaded mesh data. It must be supplied in ordinary app startup and every shipped population tool. The terrain, unrelated highest surface, or an always-true production fallback is forbidden. A production implementation therefore touches startup/input wiring as well as the route module; that is an explicit root interface decision, not an incidental helper.

The state gains `physicalTravelledM`; existing `travelledM` stays source station for admission and diagnostics. Animation distance must use actual physical distance, and exposed pose fields must distinguish the two. `sampleRoute` remains unchanged for vehicles and callers without a physical pedestrian path. Pedestrian placement and preferred direction use `samplePedestrianPath`; source sampling remains available to the planner. This prevents a silent vehicle-geometry change.

Expected production file list after prototype acceptance: new `pedestrian-path.ts` and narrow support-query module; `routes.ts` attachment after the lease worker's final route assembly; `slots.ts` physical distance; pedestrian placement in `pedestrians.ts`; isolated preferred-direction/integration regions in `tick.ts`; `agents.ts` and existing scene startup support wiring; shipped population tool setup; focused path/motion/authority tests. No solver, source data, persistent format, dependency, route-choice or network-authority change. This scope is larger than changing `sampleRoute`, because speed, animation and authority currently share the wrongly named distance.

## Actual support evidence and its bounds

`support-probe.ts` uses the shipped strict, level-aware `tools/scene/hardware-support.ts` contact query and binary mesh decoder. It reads roads and pavements only. It tries a tangent-matched cubic between each pair of discontinuous endpoint poses, solely to test whether the actual surfaces immediately rule out a physical connector. At 31, 61 and 92 parameter samples (control-polygon spacing at most 5 cm), each centre and four rotated square corners has strict mesh support, with no paint seam fill. Maximum source-height residual is 25.503, 25.738 and 25.995 mm. Estimated physical arcs are 0.678526993, 1.363664064 and 2.055874140 m. These curves are not accepted production geometry: general equal-heading width changes need a trimmed transition rather than a stationary-source loop, and no continuous swept-support proof was run. `support-probe.json` records exact control points, hits, triangle identities and mesh hashes.

## Acceptance and red controls

- Preserve the three exact old-pose reproductions as red controls, then require no discontinuity and physical distance spent equal to actual polyline arc. Source-station delta is reported separately.
- Synthetic straight, width increase/decrease, left/right bend, acute corner, exact and near reversal, repeated edge, zero/short segment and adjacent transition windows. Sample either side of every join and assert matching XYZ, finite bounded heading, physical speed budget, monotone local source occurrence, and unchanged first/last endpoints.
- Independently compute actual displacement and polyline distance; do not compare two calls to the same path helper as the entire motion check. A deliberately blended-but-unreparameterized sharp bend must fail the speed check.
- Support fixtures include a hole, a missing seam, a sloped surface, close competing levels and an elevated crossing. Missing required support input must fail startup by name. Every successful result states exactly the support sampling or clipping bound it satisfies.
- Actual red/green gate entry, committed clearing on red, internal compound gap, a later different authority, and final physical clearance. Request and post-step observation footprints must equal their phase's actual XYZ/yaw. Constant or slowly changing source station must never release an occupied body.
- Census all 150 delivered initial routes with the exact seed and record accepted/refused paths, unchanged edge IDs/passages/offset fractions, worst transition geometry and cost. A refusal is not counted as a solved route. Full crowd counters, moving native views and performance remain later integrated acceptance.

The immediate useful approval is the bounded path-construction and support prototype on these real routes. Shipping it before seeing refusals would risk replacing a teleport with a missing crowd.
