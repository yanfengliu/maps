# Defect register

## 2026-09-11 — network routes and physical facts disagreed with source meaning

Independent review found internal and cross-way continuations treated as forbidden turns, lateral links inside conflicts, and movement corridors misread as painted crossings, tactile pavement and physical signal heads. These were implementation errors, not source-unreachable routes. The repaired source graph and separate physical records preserve IDs, restrictions, mapped marks and unknowns. `test/network-review.test.ts` and source fixtures cover both directions, actual branches, tactile/shared nodes and stop metadata. Reviews 0 and 1 record the rejected and accepted scope.

## 2026-09-11 — adjacent controllers and AOI terminals retained deadlocked leases

Independent controller traces showed car/bus bodies bridging close authorities, commitments released in internal physical gaps, and complete legal AOI routes rejected or permanently occupied at their terminal point. Fixed-point compound grouping, route-occurrence commitments, exact body clearance and bound-slot activation/retirement now cover these classes. `test/network-compound.test.ts`, `test/network-boundaries.test.ts` and the full-source admission/boundary tools include actual source cases and deliberate regression failures. Reviews 3 and 5 distinguish accepted controller/lifecycle bounds from unimplemented continuous traffic and contact dynamics.

## 2026-09-11 — valid Node Buffer decoded header bytes as mesh positions

The offline graph builder exercised the same mesh decoder with Node Buffer and received a position of 7.185598589700907e+22 instead of zero. Buffer.slice shared the backing storage where browser Uint8Array.slice copied. `test/network-mesh.test.ts` covers ordinary bytes, nonzero offsets and Buffer; the copied byte view fixes the shared decoder rather than only its offline caller. The failing old decoder remains documented in the network contract and gate proof.
