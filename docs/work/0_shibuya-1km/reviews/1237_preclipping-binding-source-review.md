# 1237 — Pre-clipping binding source review

**HOLD — one material binding gap.** This is a read-only source assessment of frozen 1236, with no parser, import, control, constructor or geometry execution. All twenty proposed controls remain DID_NOT_RUN. No old constructor or geometry result is changed.

**F1: lower-box alias identity is copied without validation.** In part-bindings.mjs:40, connect() checks each lower row's index, nodes and origin, then returns `aliasBoxKey: r.aliasBoxKey ?? null`. It never resolves that key against an actual box generator or independently retained checked alias binding. Holding every other field constant and changing an existing key to a nonexistent string therefore passes all these source predicates and publishes a dangling reference. Removing the key or substituting a different box is the same omitted-fact class. The positive fixture supplies four opaque box keys without any box records; its alias-count and duplicate-index checks cannot discriminate this defect.

The existing physical-membership collector does validate the aliases it originally constructs. That does not establish the new exported bridge's later alias-drift or dangling-reference checks. This is a gap in the prepared table's claimed binding contract, not evidence that the current producer emitted a bad alias, nor that downstream full registry validation would accept one.

Minimum correction: bind lower aliases to the actual checked per-construction generator/context facts and require exact agreement when connecting or verifying, including missing, changed and dangling alias identities. Retain the referenced box identity and its relevant nodes, heights, source/output binding as checked references; preserve the existing geometric facet checks rather than adding another geometry engine. Add independent literal box/alias records and mutations of the alias value itself, plus restoration. A source-only revision must state which checked authority supplies those facts and where freshness is verified. Do not merely tighten the expected string pattern or count four aliases.

The remaining producer assumptions are compatible on inspection. candidate.ts:271–276 registers six actual Assemblies and their material semantics before construction. Its prism helper supplies effective priority 2, and other roof pushes explicitly supply 0, 1, 2 or 3. Height inputs to the roof array are numbers. The retained small metadata identifies part 20 with zero source faces and priority 3. The new capture traverses all 63 original arguments before clipping, so it retains this part independently of survivors. It separates category-registration Assembly IDs from sourceAuthority numeric output IDs and checks their bidirectional consistency by actual object reference. Per-part color remains distinct from shared output semantics.

Snapshots contain detached, deeply frozen plain descriptors, exact node/rational strings and local plan/part/continuation aliases. Assembly buffers remain private references, not serialized data. verify() freshly rebuilds the producer projection and checks the published snapshot; object/plan/output substitutions, material and producer-value drift are inspected. begin() clears the capture, and there is no cross-call verdict cache. These properties do not repair F1's omitted source-context alias value.

I independently reversed all five declared provenance text edits and reconstructed both full source spellings exactly: 21,868-byte baseline and 22,655-byte variant. The mathematical, clipping and existing refusal bodies remain unchanged. The additions reset capture, capture/observe before clipping, and verify/connect after the existing collector. Absolute references retain the old membership/patch pipeline. The original candidate and probe still select old P; future composition must select one consistent P instance and bind the new closure before any run.

The twenty literal rows meaningfully cover hidden parts, output-ID distinction, values, producer mutations, missing/duplicate rows, snapshot detachment and restoration, but their lower-alias positives are incomplete as described. Source compatibility and exact inverse evidence are not runtime controls. Complete union coverage/links, glazing, emitted geometry and public/full35 acceptance remain open. Root owns the separate correction and release decision.

Pins: EARLY is `C:/Users/38909/Documents/github/maps/artifacts/commercial-corner-20261014/recovery/binding1236-early`; PREP is `C:/Users/38909/Documents/github/maps/artifacts/commercial-corner-20261014/ground1098/search1109/1110-worktree/data/commercial-work/1236`; REVIEW is `C:/Users/38909/Documents/github/maps/artifacts/commercial-corner-20261014/ground1098/search1109/1111-worktree/data/commercial-work/1237`. All 13 consumed small input pins matched at entry/final verification; larger/transitive inputs were not independently rehashed.

| Object | Bytes / SHA-256 |
| --- | --- |
| EARLY/part-bindings.mjs | 9499 / bf38c7f3292ba3f6b712d6cda8287e095f0ff598f2d5284e206bc4663f3a833c |
| EARLY/provenance.mjs | 22655 / 7c27547d7114e077ac769df2d67b8d06fce20bd8597e867bea3af954ebda007b |
| EARLY/part-binding-controls.mjs | 8868 / a7d4e1f40271bdb4a9c3d6049030d821972ed7742a1c0ef9a7aa42a61cc28a68 |
| PREP/source-handoff.json | 13645 / f14fb50c8b836b54b75d43d5db618939abb6816756a4347d543f28c3aa7ae89c |
| PREP/preparation-index.json | 9005 / a397d72c458c1c993adfceb23f7fc8926518ec419c6f30c7be7ef9d2c1ecb620 |
| REVIEW/consumed-input-pins.json | 4466 / 6cd82e42e116a61dd7b9a9c3ad8ed99c6f67f2bc665b43ec63c6d6793998e82c |
