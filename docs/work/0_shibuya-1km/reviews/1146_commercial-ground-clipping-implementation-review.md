# 1146 — Correct closed-halfspace partitioning and finite contact admission

2026-10-15 UTC. **REVISE.** Static review of the frozen entered1145 implementation under unchanged1141/1140. Canonical Astra/xhigh dispatch was requested; serving identity is not independently introspectable. No constructor, probe, runtime import or new control ran. Root reports final1145 HOLD intake admitted; this review does not repeat that intake.

**1146-F1 — Admit outside fragments only where there is strict exterior.** `owned-boundaries.mjs:14` clips every remainder against both closed halfspaces; `patch-union.mjs:22` retains zero-valued vertices on either side. A whole polygon on the constraint therefore becomes both outside and retained remainder. The actual south/bay0 lamp bottom at Y19.512200457389596 has signed projected area −0.4761808354588505 m²; the retained four fragments total exactly twice that. Its first outside fragment equals the source. The east/bay0 lamp overlaps by magnitude0.023756373190716582 m², with both signs of its bottom constraint zero across that source face. The recorded comparator rejects duplication and accepts removal of the extra complete copy.

The smallest coherent correction is in `cut`: emit the negative closed clip only when at least one current remainder vertex has a strictly negative evaluation. All-zero and entirely nonnegative remainders stay inside once; a strictly exterior remainder goes outside once; a proper crossing produces both closed fragments sharing their boundary. Keep `clip3`, exact coordinates, winding and conservation unchanged. Do not make clipping globally strict, skip a whole fixture, or weaken conservation. The fixture supporting-plane orientation/stable-owner decision at `owned-boundaries.mjs:33` remains separate from this partition operation.

**1146-F2 — Owner labels do not certify the entire contact.** Inherited `surface-interiors.mjs:9` tests independent-room membership only at `points[0]`, then accepts any same-owner room/luminaire contact before testing positive area or boundary membership. A region extending beyond the finite partition can pass on its first point; a same-owner duplicate wall or transverse face-interior crossing can be labeled a required enclosure contact. The earlier logical room audit checks original joins, not this complete exposed contact. This is a source-backed admission gap; no such additional actual1145 defect is claimed because its downstream census did not run.

Require the full contact segment/region inside the certified finite partition, with both owners/supports and required residuals preserved. Admit own-room/fixture contacts through checked native boundary incidence or another explicit selected finite relation. Reject unsupported positive-area duplicates and proper self-crossings before accepting owner labels. Preserve required structural-cover and fixture/separator cut routing.

Before another constructor, exercise the actual production split and classifier using independently authored all-zero, coincident cooriented/opposed, strictly inside/outside, touching and proper-crossing cases on all three projection axes and both windings. Check exact regions, disjoint interiors, oriented chains and restoration. Retain the actual lamp witness and reject missing, duplicated and reversed positive-area fragments; its missing-fragment mutation remains unrun. For F2, reject first-point-only partition containment, duplicate same-owner walls and transverse same-owner crossings; accept real native joins, complete finite opposed partitions and valid structural/fixture cuts. Preserve both lower22/1679 controls and original residual intervals. These are required **unexecuted** controls.

No missing-code-binding finding: constructor `.inputs` omits `owned-boundaries.mjs`, but dispatch `.files` and calibration `.inputs` bind its exact entered bytes; the union was checked. Source pins match before/after. No mesh, lifetime, public, native, final-gate or product acceptance follows. No persistent resource was created; reviewer native process census was unavailable/not run, never claimed empty. Root owns correction, intake and cleanup; this packet/report remain unlanded.

Exact reviewed pins (paths relative to producer `1110-worktree/data/commercial-work/`; absolute descriptors are in the packet):

| Input | Bytes | SHA-256 |
| --- | ---: | --- |
| 1145/owned-boundaries.mjs | 17548 | 7572efb5522c322b2eea5033be2cf720121ed7dba60d26156c74e3646792455b |
| 1145/patch-union.mjs | 34480 | b99322833ab9b90d36edc0569b9f0b4d6b754267b5c35295b0163dfe814bb80a |
| 1145/provenance.mjs | 21046 | 9f49adba1ca453814c04ca6504d7ff5335dc8479c617eca3837820235738e274 |
| 1142/surface-interiors.mjs | 7163 | b20cb7e5b017fe941d6072093576b3620e561bdddd376b06f6016e93964450a0 |
| 1145/candidate.ts | 32750 | 0b6911b94afdafadc0f1d768499aa127c48e9262e30050dbb7aac431928150c5 |
| 1145/observation.json | 22746 | b3ee69f06618b0133994219d5a15ea034bcf91c46d98d3f082041d890c9acb75 |

Outside the clipping change, `candidate.ts:271,368–378` binds the lamp material category and creates its material/passes; `provenance.mjs:26` preserves each solid's generating owner, domain and source-face identities. Recorded child calibration184.2739ms PASS, constructor2365.075ms REFUSED, observation106.4462ms PASS retain their original bounds. New review execution cost is unmeasured; no new runtime performance measurement is claimed.
