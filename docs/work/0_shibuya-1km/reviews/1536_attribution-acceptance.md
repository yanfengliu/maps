# A12 attribution acceptance audit — 2026-10-17

Verdict: HOLD final A12 closure for one narrow rendered-evidence gap. No source defect found. This audits existing repo contracts, not legal compliance or the full deliverable.

Reviewed main `0bae7fe46db75acd02b79efba805e6dbf952df99` (executable `e1097edd4f0d65f41e6d6c157def4d51fa877318`). `src/world/sources.ts`, `src/ui/attribution.ts`, main boot and index are unchanged between them and have no working diff. Sources SHA-256 `a785cba3829f7b36f0e36718d955771136524c02bdad74d12c5fa259ac8cea48`; attribution UI `af899a8764a12d8b5eda17e69bf75c487dab8a0fb143405c28934d807be6e3dd`. Authority: plan A12; local-rules World and source authority; design Licences. No new requirements inferred.

- PLATEAU: PASS. Summary names PDL 1.0/CC BY 4.0; expanded panel has permitted alternative, MLIT/dataset credit, English modifications, separate Japanese source and processing lines. Native original shows these lines.
- OSM: PASS. Summary names OpenStreetMap/ODbL; expanded panel names Open Database Licence, qualifies map data ownership and links copyright terms. Native original shows them. Publication database-offer acceptance is outside A12.
- GSI: content PASS; rendered completion UNPROVEN. Summary names GSI; expanded DOM has PDL 1.0, cross-check/decoded-and-sampled disclosure, source and separate processing lines, and the expected licence href. Native original shows its heading and English disclosure, but the licence/Japanese required lines lie below the panel fold.

Actual ordinary `/`, 1280×720, same owned run as three peripheral originals: real summary clicks opened and closed it. Panel clientHeight452/scrollHeight584; required GSI source/processing top y743.3125/761.25 exceeds panel bottom692.0625. `checkVisibility:true` is not a clipping/intersection test. CSS `overflow-y:auto` provides a scrollable panel, but no real scroll or bottom-state native inspection occurred. Minimal remaining evidence: real-input panel scroll and native bottom state in a future authorized ordinary run. No code change or proof framework is needed.

Evidence under ignored `artifacts/peripheral1534/run1/payload/`, inspected at native size:

- `attribution.json`: `4ff039e0708768dc64a5f64d4696bf9c1cc0669daaee3a5979dacf34e2159601`.
- `attribution-open.png`: `6489e9f72f2a7d1dd81ffb98c88137350dec4b4ab9f42d10e0ff09ef2b5a9b34`.
- `elevated.png` closed footer: `3f8d860877968ae61776291728d28d5d4cf8c5a63960b5dd0d3bcfee077ed60d`.
- `capture.json`: `08bd8a192820d6a229df418c30341ba588ef2ed29c5997f7a89d575d5b35250a`.

Certificate run7f403f3841a95a62, SHA `9ac73ddecd91e219310aa0da16d37bf621c936b5bec74102bfb600fe93d13547`. Actual served HTML/main JS/CSS hashes match its build rows; disk pins unchanged before/after. Overall capture FAIL remains: three unidentified response bodies evicted from inspector cache. This does not erase the retained UI observations or establish complete served-scene verification. No gates/browser/server launched by this auditor; no Git mutations or product edits.
