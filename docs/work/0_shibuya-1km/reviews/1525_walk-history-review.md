# 1525 — Independent complete-history source review

Date: 2026-10-18 UTC. Status: PASS for the frozen three-file implementation and focused evidence. No material source finding. Native benefit, full gates and integration remain pending; this report does not adopt traffic candidate3.

## Exact subject

Reviewed retained `artifacts/traffic1499/worktree`, branch `codex/traffic1499`, based on `0681715632e66ad825a3d78ac7d9282c5cb038b5`, with the narrow 1524 change over candidate3. I read [1523](1523_aged-cost-source-diagnosis.md), [1524](1524_walk-history-implementation.md), the actual three files, their diff, the unchanged controller and every production consumer of local gait samples/history. Initial hashes at 03:04 UTC and the later readback match the writer's sealed handoff exactly:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| src/agents/population/local-walk-gait.ts | 13490 | 46a8a11de55c30a32a9ca3dc961d15a3b156ccaa4d53ecbb590baf2fd29ca657 |
| src/agents/local-walk-prototype.ts | 8208 | 6f7eef4952db753d79c3c55158eea70374b2d9e698c52568fa7d916d34ab5109 |
| test/local-walk-history.test.ts | 6104 | 1f7b78463640a6e6c8fab6f1c882d688b1c3e666e1eae7ba7f17bea0da05578f |

The actual controller remains SHA-256 `17c01366d56c9285e8fb1892b80cd0b3bec9eb2f52d20364eb72797e106d3c6e`, matching its historical input-contract pin. No controller arithmetic, renderer, clock, route, source cache or quality setting is changed by these files.

## Implementation reasoning

`local-walk-gait.ts:37-60` stores owned, deeply frozen event payloads in immutable prefix chunks. Appending copies only the current update's new events. Complete history remains retained; there is no clipping or cap. Flattening walks the prefix chain iteratively, so history length does not increase call-stack depth. Recursive freezing applies to the new event payload, not the history chain.

Published immutable gait views expose enumerable `events` getters. Their complete arrays are cached only by that particular view's closure. The private WeakMaps associate a view with bounded motion and its history head; their keys do not keep dead views alive. History nodes contain chunks and previous nodes, not materialized prefix arrays or gait views. Thus ordinary motion ownership does not retain every previously materialized diagnostic array. A consumer that deliberately retains many complete snapshots can still retain their arrays; this is not a general memory cap.

The cloneable motion object has `events: []`. `current()` and interpolation copy that bounded motion. The view is already frozen before the enclosing recursive freeze sees it, which avoids evaluating its lazy getter on the production hot path. Nested motion fields are deeply frozen first. Public JSON, enumeration and structuredClone still evaluate the complete ordered history. The internal property descriptor changes from a data property to a getter; inspected consumers require values, not writable descriptors.

`advance()` at lines 83-98 saves/restores the history head with the motion transaction. Newly proposed events become the next prefix only after accepted interval admission. Refusal restores the previous history and exposes the previous sample; an exception restores the old tick and state for retry. Interpolated samples use the previous sample's history, preserving the prior implementation's convention; current/generation-mismatched endpoints expose the current prefix. Old snapshots retain their immutable prefix even after later steps.

For `admission.foot`, the unchanged controller passes an independently cloned draft at controller lines 308 and 343. The adapter publishes its full diagnostic prefix through a mutable view and clones event payloads on first access. Mutating that callback draft therefore cannot alter committed history or motion. Frozen input/forecast ownership remains unchanged. The controller's complete source only appends events and does not consume their historical prefix; resumeWalking only deletes its aligned turn control. Supplying an empty per-update events list preserves its actual decision inputs.

`local-walk-prototype.ts:60-61` replaces only the two history-length checks with the WeakMap-backed count. The fallback retains ordinary `.events.length` behavior for foreign samples. The explicit status snapshot at line 72 still requests the complete history and clones it for callers. I also read local-walk draw/contact/support and the actual scenePose route: they consume current motion and do not need historical events. The change removes a verified history-dependent copying/traversal mechanism; these source observations do not quantify its share of native frame loss.

## Evidence and bounds

I read the retained literal-old RED log. The selected regression reaches its intended assertion: 204800 historical event payload copies versus expected 0 over 100 fixed steps and 300 interpolations with an independent 256-event seed. It imports LocalWalkGait directly, so a missing count-helper export cannot explain the failure. The three unrelated cases were deliberately not selected in that RED run. The final source hashes match the saved restored candidate.

The focused GREEN log reports 51 tests in 6 files, 10.31 seconds. I inspected the new ownership/ordering/rollback tests and the existing independently pinned 1320-tick physical/current-controller-history digest assertion, including its literal expected hash `febdf9a2bfc7902a7a43fb89e92bfae7e29b45c52a1a215245d77e72c9a13d59`. Actual four-leg support, interpolation/phase, native draw and app lifetime cases pass in the retained bundle. These are finite tests; they do not prove long-run FPS, GC collection timing, whole-population behavior or continuous native appearance.

Typecheck is writer-reported PASS/exit0 in 5.25 seconds. At review time the claimed `artifacts/performance1524/typecheck.log` was absent; I asked the writer to correct that report reference rather than rerun a successful check solely to create an empty log. I independently read the nonempty focused/RED logs, not an absent typecheck artifact. The writer corrected 1524 to state that empty-output Tee-Object created no file, removed that artifact reference, and retained the independent full gate requirement; corrected report SHA-256 is e16545a7c4d69961764c0941534431eb17183d7d77ec3e4ca15aa940c1b840b0. The later required full type gate remains necessary.

Historical preparation bindings remain unchanged as requested. `tools/agents/local-walk/input-contract.mjs` pins the old gait and `ensure.mjs` validates owner inputs through assertInputProfile, so this new gait is not automatically admitted by that frozen preparation profile. Fresh packet generation/data:setup is not established by 1524. There is also a pre-existing distinct controller pin in the current preparation profile; this review does not relabel that inherited limitation as a new production failure. Ordinary cached runtime checks the admitted packet and live data inputs, not those historical source hashes. No historical pin relaxation is proposed.

Retained evidence under ignored `artifacts/performance1524/`: handoff.json SHA-256 `9bf8d65673aec2de09d9d1b3c779cba62ccba2adb1e49a0d6edfd47e9a2b0d5a`; old-history-red.log `0625f510d7ac81a96cc6c2494b6f0bda96e8c77b985ff3afe2658885f53167cc`; focused-green.log `42ae8f12d9bb1c0ae4373de71f9caca3f91cd209687e118d1fcb2faf80ac7c4d`. Preserved before/after gait bytes make the reviewed change recoverable; hashes alone are not a substitute for those files.

This reviewer ran no tests, probes, browser, GUI or GPU work and changed no source, cache, Git index or helpers. Native qualification/aged comparison, the five public code gates, exact integrated review and main merge remain outstanding. The source is still unmerged and unadopted.
