# Native pipe v2 design handoff

F35's bounded amendment is ready for root inspection and focused independent Review68. This is **design-only**, at `86c08b210d67a68261cd2cad3c2310caea9f4d83`; no implementation or execution admission is implied. The retained isolated worktree is `C:/Users/38909/Documents/github/maps/artifacts/native-pipe-design-v2/wt`. All authored output is ignored under `artifacts/design/`, tracked status is clean, and no primary change or rebase occurred.

The amendment specifies native cleanup dependency order, separate TSFN authority and native lifetime leases, and exact release points for accepted, failed, closing and null-env payload paths. The hook joins native work and removes itself without waiting for JS or a later finalizer. Exact Node 24.12.0 source calls the addon channel finalizer before draining queued null-env callbacks; the control block therefore survives via queued-payload and other outstanding leases, including its per-environment instance lease.

The proposed roster is now **11 = 7 Chromium cases / 6 public SDK attempts + 4 native controls**. C01 adds natural Node process exit. N04 actually destroys a test Worker's environment while the Node parent and native outer owner remain alive, with two fixed accepted callback payloads plus real pending read/write before termination. Native receipts must show finalizer-before-both-discards and state destruction after all lease releases. Whole-process kill, ordinary JS stop and an empty queue do not satisfy it. All cases remain unexecuted.

C02–C07 and N01–N03 are unchanged case objects; C01 only gains the natural-exit requirement. The original launch contract is unchanged. No original design or native evidence was altered, and none of the old launcher/capture obligations was reduced.

| Artifact | SHA-256 |
| --- | --- |
| DESIGN.md | `0717684ddd63f204e62ccf94e31bc49d17c437a7bc4fc4f8c8eee913bf9fe087` |
| proposed-checks.json | `cb6ec75baf8f9938ed4cc62f90c65c83b786a5fc949c6b0c4cab705b3cdd6738` |
| input-references.json | `c57990731db1fe04e8341e59265b755d335a70b344aad5d8e82babf6445c0ac3` |
| verification-final.json | `851c671bb07c5210fff2fd110edce9d72554379f87721f76e3af128d6edb5d31` |

The final file/hash/schema command completed with actual tool exit 0. It reverified original design 54, Review65 67, original native 63, original local inputs 16, installed browser files 249, Node 1 and new exact Node source snapshots 3; 450 unique external references remain pinned without duplicating their content. It also checked the exact nine unchanged case objects, C01's sole addition, N04, counts and unchanged launch/environment assumptions. These checks establish retained bytes and proposal consistency only.

Approved read-only task census at `2026-09-20T07:27:49.8049924Z` found zero matches. No browser, SDK attach, Worker, addon, native fixture, GPU work, GUI, server, model run, build, install or data mutation occurred. No resource lease is held. The worktree and referenced evidence intentionally remain for review; no commit or push occurred.

Remaining prerequisites and unknowns are unchanged in kind: exact Node header/import-library preparation remains unadmitted; native build/API compatibility, real hook/payload lifetime behavior, actual N04 queue/barrier ordering, all 11 outcomes, browser interoperability and later controller fidelity require separately authorized work. Queue-full/closing ownership is specified, but this proposal does not claim both statuses have been observed or will necessarily occur in N04. Stop for Review68 and root's separate decision before implementation.
