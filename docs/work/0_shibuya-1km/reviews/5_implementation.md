# Review 5: implementation

## Target

Repository: `maps`. Base: main `277a8332e61bd29189fa65eae7271f952b04df33`. Reviewed on 2026-09-11: the uncommitted Phase 6 F5 boundary lifecycle and supported vehicle-body candidate. Candidate manifest: `artifacts/network/phase6-review5-candidate.json`, SHA-256 `611b82612bd360a9815855a1d187fc3c8d90c53a2d1f32d043653a7e520b1545`. Exact source and evidence remain under ignored `artifacts/network/phase6-review5-frozen/`.

All 43 candidate source/document/dependency files, 21 evidence files, the graph and the vehicle manifest matched both their live and frozen bytes at initial and final verification: 132 file/hash/length checks. The graph is 10,239,410 bytes, SHA-256 `314fac843392de12c8264cbf6b1647935d2b7e9d7194a3c29835e46445537677`. The generated vehicle manifest is 5,918 bytes, SHA-256 `4cd6e59b891abec4c4ce48fa03e8f90edf746097f9e532c9f3557be1f20e4257`.

The reviewed `network-contract.md` has SHA-256 `a586067def4f9ad35ad6cab5b34ae45936321cb52ce68656b4477ca6dd9bf1e3`. Preserve these reviewed bytes as the next permanent contract snapshot before editing. Review 0, Review 1 and Review 3 remain unchanged. The complete previous Review 3 graph and its 32 frozen files were independently rechecked. Later source changes do not inherit this review.

Critical source hashes are `src/network/admissions.ts` = `78c91ab4497f353cfd4def6f1e87d9cab82d0dc11f5a64bbc6bf147eed318569`, `src/network/passages.ts` = `fc10c79f4789610f6a2d328718cd178b50781c4483f1afc8772ca6580c1d06e5`, `src/network/footprints.ts` = `d96fa7c1ac9d6feda911ac9513ea92489d6b8c41fbeec0dc61e28524c4f3ed08`, `src/network/boundaries.ts` = `ca38328e6ca4b6f5f44c5c57a7967411a5bf3f741e399f53e25fc3964008837d`, and the shared `src/world/agent-poses.ts` = `9f40e173a0756dfc103077ce32575394df35b4e4b5188a1c2817adbc6b01e8b2`.

## Reviewers and coverage

Independent read-only reviewer: Codex worker `/root/network_review5`. The scoped goal is this review, not Phase 6 integration or the Shibuya deliverable. No nested reviewer slot was available. Review covered the public lifecycle, admission/passage interactions, exact body projection, the full-source portal census, preservation of previous physical facts and graph geometry, and the correction to Review 3's pedestrian graph instrument.

Executable probes imported the frozen implementation. Writes were confined to this report and ignored `artifacts/network/review5-independent/`. No production source, generated data, dependency, Git, browser, GUI, server or external model CLI was changed or launched. Concurrent renderer and asset edits were outside this review.

## Reports

### Codex network reviewer

**F5 is resolved within the reviewed controller/lifecycle contract.** A complete legal route may now end in a controlled AOI terminal. `createRoutePassage` preserves the actual terminal occurrence and supplies explicit boundary metadata instead of requiring a fabricated outside successor. Retirement remains a separate operation from route progress. The source retains all 77 vehicle exits, 78 vehicle entrances and 33 walking entrances/exits.

`bindBoundaryActor` binds an opaque frozen identity to actor, kind, stable slot, generation and complete directed route. Boundary activation checks the inactive current pose, actual displayed vehicle class/scale and projected body, supported wheel residuals, matching route commitment and fresh grant. An initially contacting vehicle cannot materialize without admission. Failed validation precedes the synchronous active-byte and lease changes. Physical-only incoming tails use a boundary prefix with `lastConflictIndex: -1`; this does not invent a conflict edge or mapped stop. They release only after the initial full hull clears.

At egress, an observation must name the last actual route occurrence and its exact terminal distance, match the current core-owned pose and remain in the outward envelope with nondecreasing outward progress. When a lease remains, it must be entered and have satisfied its mapped controls. Every projected hull vertex must be beyond the chosen actual AOI side before retirement. The implementation then clears the active byte and lease without an intervening callback or await. Failed retirement leaves presence and lease unchanged. The binding cannot be reused after retirement. These checks rely on the documented core ownership of pose buffers and truthful route observations; they do not infer whether a trajectory was physically traversed.

The frozen seven-file suite passed 64 tests, including all eleven F5 tests. Those tests exercise the six promoted terminal cases, physical-only entry, stale/copied bindings, changed generation, mismatched current pose, displayed class/scale, bad wheel residuals, backwards/out-of-bounds egress, pending signal expiry and atomic retirement. The copied full-source boundary instrument changed only imports and input/output paths to use the frozen target. It produced a byte-identical report to the candidate: 264 retirement traces, 264 reachable entry/class cases, 49 initial authorities, six physical-only prefixes and 28 ordinary-authority handoffs. Before each observed handoff, the full old hull clears; the next ordinary lease is obtained before entry; sampled bodies never contact an unheld third owner. One existing source dead-end/no-U-turn entry, `lane:138385061:0:0:ground0:f:0`, remains excluded from demand and remains present in the graph.

That census uses one selected route per reachable entrance and a selected preceding-control prefix per exit, all three generated vehicle classes, quarter-metre entry/transition samples and half-metre interior exit samples. Outward retirement uses quarter-metre samples. Route headings and smooth authored support tilt are supplied; the tilt reaches about 16.43 degrees. Eligibility values for dwell, yield and receiving space are supplied. After the named signal retirement, all signals complete at least three cycles over 360 seconds with no held clearance. These are controller traces and sampling bounds, not real traffic, continuous collision or speed measurements.

**The pedestrian instrument correction is valid and does not erase the actual F5 cases.** Independent traversal derives exits from boundary `to` nodes. It constructs 3,444 vehicle and 408 pedestrian passages from exit-reaching controlled edges, with zero failures. Repeating the inherited mistake of treating `portals.pedestrian` entrance IDs as exits reproduces exactly six reversed-terminal failures and 402 successful pedestrian passages. Every listed walking entrance has a boundary `from` node and an interior `to` node. The six failures therefore cannot establish six defective real exits. The old report and unchanged inherited result remain historical counterevidence.

Separately, the independent lifecycle probe uses the actual controlled terminal edges `walk:1286510249:0:0:ground0:r` and `walk:1464521701:0:0:ground0:f`. The frozen Review 3 factory rejects both true terminal routes. The repaired factory accepts both. Each new controller retains an entered lease at the route terminus and rejects retirement there without changing the active byte or lease. With 0.01 m outward samples, they retire at 0.33 m and 0.34 m respectively, setting active to zero and removing the lease. Reusing the retired binding fails. Thus the previous controlled-pedestrian F5 condition was real even though its additional six-failure graph count used the wrong terminal convention.

**The supported body contract now includes tilted three-dimensional bounds.** Projection consumes generated model bounds, collision padding and the shared ±0.05 model-metre wheel travel, then calls the same `writeSupportBasis` used for displayed orientation. It transforms the expanded box and retains its X/Z convex hull and shifted collision centre. No nominal vehicle body dimensions or body cap replace those generated bounds. Class scale is checked against the displayed pose at boundary operations.

Independent analytic projections, without using `writeSupportBasis` as the oracle, checked all three assets at pure roll and pure pitch angles of -80, -60, -30, 0, 30, 60 and 80 degrees: 42 projections. Hull X/Z minima and maxima match the independently transformed box corners, including height and centre shift. Every checked hull point lies within half the three-dimensional diameter of its projected collision centre. The computed diameters are 4.5246829231 m for kei, 5.4233135151 m for taxi and 11.5803634127 m for bus. Bus scale 1.003 is rejected. The full expanded-box diameter is an orientation-independent mathematical bound; these checks do not establish that the tested large tilts have a valid road support surface.

At the authored 7.5 m envelope limit, the sampled supported bus hull is outside at all 77 vehicle exits, with a minimum side margin of 1.409835 m. This is a geometric feasibility check for lifecycle poses. It is not a steering or contact proof. The reversed terminal tangent and near-tangent 44.236 m straight-extension counterexample remain disclosed in the candidate. The API does not move or turn an actor. A future core must supply a continuous supported outbound trajectory and pass swept-body/turn checks before these routes can be described as physically driveable.

**F4 remains resolved within the enlarged body contract.** Independent raw-successor traversal, without importing the grouping implementation, finds 475 directed vehicle authority pairs and 290 walking pairs. Their minimum outside route gaps are 12.5212230186 m and 23.0194560043 m; minimum original-disk separations are 12.2712471004 m and 12.9923296608 m. They exceed the new 12.5 m route and 12.1 m primitive thresholds. The supported body diameter is at most 11.6 m, with a 0.5 m stop gap. The full-box diameter bounds simultaneous contact across those primitive gaps regardless of body orientation.

Independent exact comparisons preserve all nodes, route coordinates, widths, successor/lateral topology, portals, diagnostics, physical crossings, tactile paths and mapped source positions/tags. All 299 original controller members and all 401 complete original disk records remain. The graph has 213 controllers: 35 signals and 178 reservations. Its largest compound is the scramble, with twelve original disks and four sectors, a 193.1439831 m by 85.0206690 m bounding box and 211.0287003 m diagonal. That box describes a union; it is not a replacement conflict disk. Existing signal and compound tests retain the 88-second first pedestrian phase and 116-second empty scramble cycle.

One vehicle per signal compound remains the explicit provisional policy. Nothing here measures acceptable queues, waits or completed trips for 200 vehicles. The core still needs receiving-space reservations, actual dwell and yield measurements, class-width routing, swept turns, actual wheel/contact support, accepted pavement support near the authoritative route level, collision avoidance and realistic-scale performance. Projection alone satisfies none of those later obligations. The current contract keeps them pending and does not claim a running agent core.

## Findings and disposition

| ID | Finding | Disposition | Remaining bound |
|---|---|---|---|
| F0–F3 | Earlier continuation, lateral geometry, physical facts and mapped-control findings | Preserve Review 1's scoped dispositions. This candidate preserves the repaired physical and topology records. | Renderer and traffic integration still need their own acceptance. |
| F4 | Close authorities cannot admit and clear a complete body | Resolved within the 11.6 m supported three-dimensional body envelope and reviewed graph. | Actual support, route/class compatibility, continuous swept motion and populated throughput remain unverified. |
| F5 | Legal boundary routes cannot construct or complete safe retirement | Resolved within the public boundary lifecycle, bound-slot operations and stated full-source route samples. No material new finding was reproduced. | Core must supply continuous truthful supported poses and complete downstream dynamics and capacity checks. |
| Instrument correction | Review 3 used walking entrance IDs as graph-census terminal exits | Independently confirmed. Corrected census has 408 successful walking passages and zero failures. | Preserve the old instrument/result and report; the separate real controlled-terminal defect remains valid historical evidence. |

## Verification and retained evidence

Node 24.12.0. `node node_modules/vitest/vitest.mjs run --configLoader native --config artifacts/network/review5-independent/vitest.config.mjs` passed seven frozen files and 64 tests: network 11, network-review 10, network-mesh 3, network-compound 19, network-boundaries 11, signals 4 and signals-reservations 6. The custom config changes test selection and cache location only. The complete graph passed `validateShibuyaNetwork`. Independent binding/graph, lifecycle/body and evidence-audit probes passed. The frozen full-source boundary instrument rerun passed and its output digest equals the candidate report.

All eight author-supplied F5 mutation logs were inspected and bound to the manifest. Their unchanged control has eleven passing tests. Each mutant exits one with the stated semantic failure: controlled terminal rejection, early retirement with a live body, retaining active, retaining the lease, materialization before admission, ignored generation, omitted vertical projection and ignored displayed class. The reviewer did not rerun source mutations. These logs are mutation evidence within the eleven-test boundary suite, not proof of every possible failure mode.

The root's separate typecheck and 72-test run are integration-owner evidence, not checks independently repeated by this reviewer. No complete build, audit, HTTP serving test, graph regeneration, visual gate, asset render, populated simulation or performance gate was run here. No pixel acceptance is claimed. This review does not replace the repository's five gates or final integrated review.

Retained proofs below are under ignored `artifacts/network/review5-independent/`.

| Evidence file | SHA-256 |
|---|---|
| `verify-graph.mjs` | `4c722d0cff57abe0089703a8012cbe3e64cd487da94642876caef6c015064523` |
| `binding-graph.json` | `c067f57910279650f428943729cb80c8cf725bcf13dc7522dd386419f5905473` |
| `lifecycle-body.mjs` | `8719dea9a08d5c24337c0463eb908b9356542120f82965056201cc91c11654fd` |
| `lifecycle-body.json` | `7c965d1227f5b3f6a9fcebc69e0949d4bec7804324c22ae414f44d710231a137` |
| `full-boundary-rerun.ts` | `101cae1eb7415fb2f9c3c1f600beaa3d919d822bffae3e3a745cfe39d4c3e7f5` |
| `full-boundary-rerun.json` | `bc3519ae355d739c8f6577b0d6f5d9f3673b778163a1df66fd1868906b111011` |
| `evidence-audit.mjs` | `cd7a1d677794e02851e465be8634363028fbf9d6417007b83f8467b1a14b9613` |
| `evidence-audit.json` | `ed78f1674a2ea6e8fe68d2fe61eeab3924b6788d9fab4c23735971b6c83034a8` |
| `vitest.config.mjs` | `586586d2ad9f1c0c5b689dbe2472c062f6e61bc52b3aa58ecbbdf93635bb825b` |

All task commands finished. The task-owned Vitest cache was removed after resolving and checking its exact path. Probe sources, results and configuration remain intentionally retained for handoff and recoverability. This review launched no browser, GUI or server. The final process-enumeration attempt was denied by the sandbox (`Get-CimInstance Win32_Process`: `Access denied`), so system-wide verification of process state was unavailable; no shared process was stopped.

## Round outcome

Accept this exact Phase 6 F5 candidate for the scoped boundary lifecycle and supported-body contract. The acceptance includes the retained F4 graph separation and physical preservation checks, and the corrected pedestrian instrument interpretation. No material finding remains open within this review's scope. The root must inspect the handoff, run the required integration gates and land the verified milestone on main. This review is complete; the broader Shibuya deliverable and unimplemented traffic core are not complete, verified, committed or merged by this report.
