# 1427 — mounted-light direction review

Date: 2026-10-17. Author: independent fresh-context `lighting1427_direction`. Target: the first two east-wall visibility attempts on `b1e4dcf3eb77a79468b3adfe8cb42de94e70b61b`, before any light implementation. Read-only review; no browser, gate or product writes.

## Decision

**REDIRECT the selected wall; continue the mounted-light milestone.**

1. The current dusk near view is almost entirely blocked by large wall masses. It provides no readable frontage-plus-receiver composition in which a small fitting could improve the ordinary street experience.
2. The current noon alley view exposes a narrow slot between those masses. Another carefully tuned camera might reveal the proposed face, but that would not establish useful visibility from nearby ordinary views. These are failures of the selected presentation opportunity, not evidence against mounted lighting.
3. The earlier east block view shows an exposed junction and pale street edges with little local illumination. That is a useful visual opportunity. The image does not identify an eligible source wall or supported receiver.

## Next bounded action

Choose one exposed road-facing surface adjoining that visible junction, confirm its wall and adjacent receiver together through ordinary controls, then implement one supported housing/recessed warm lens and conservative bounded light. Judge matched noon/dusk near and oblique captures plus one untuned nearby view before expanding. Bind only this candidate to its exact current source geometry and photography.

Root should refuse further camera rescue of `bldg_4ca4f012…`, a broad source search, west/south expansion, fixture multiplication, or a full acceptance sweep before the one-light experiment produces a useful visible result.

## Remaining acceptance gap

No implemented fitting or receiver response has been inspected. Mount contact, meaningful falloff, preserved source/signage, noon appearance, nearby visibility and roof/rear containment all remain unproved.

## Inspected evidence and bounds

Exactly three native 1280×720 originals were inspected. Their recorded hashes match independently read bytes:

| Native original under `artifacts/` | SHA-256 |
| --- | --- |
| `peripheral-lighting1426/runner/baseline1/payload/dusk-02-east-near.png` | `c3b66aca97e56d79ddc825b98f86a5fb82fe1a18417998dc22b0d899ac4296c4` |
| `peripheral-lighting1426/runner/baseline2-alley/payload/noon-02-east-south-alley.png` | `feed40854e4e7c1bf83cdc63155f1655688991068e04b227586a543027cc949f` |
| `square1420-critique/runner/run1/payload/dusk-08-east-block.png` | `c7d533c6095c561355f63d582e14509427cc90e7f6ec2750f766df76d3b320f2` |

Both current views record revision `b1e4dcf`, settled tiles and RTX 4090 rendering. The block image is older `c42c526` evidence, useful for direction only. No source, temporal, full-map or performance acceptance; no writes or resident processes created.

## Root disposition

Accepted the redirect. The original east wall is rejected after two visibility attempts. Root inspected the replacement data498/GML `bldg_07a23c05-99d6-439c-bd98-f0f873f8a470` exterior baseline and source photograph, then authorized one east-only trial. This accepts a test site, not a fitting or illumination result. Implementation and current status remain in [the plan](../plan.md) and the forthcoming 1426 report.
