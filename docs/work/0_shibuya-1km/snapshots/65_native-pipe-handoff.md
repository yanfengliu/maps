# Native pipe design handoff

Ready for the root-reserved independent Review65. This is a design-only handoff at detached base `d7c8eea43c1cbfc6e85bcd01306fd43898be6b66`. No implementation, build, SDK attachment, browser/native proof run, app/controller edit, commit or push occurred. The retained worktree is `C:/Users/38909/Documents/github/maps/artifacts/native-pipe-design/wt`; its tracked status is clean and all new output is ignored under `artifacts/design/`.

The concrete proposal is one in-process Node-API owner, a thin public Playwright transport and a test-only outer driver/peer. Exact Chromium `153.0.8010.12` source supports two explicit inherited HANDLEs through `--remote-debugging-io-pipes`; that flag is the sole proposed argv addition to 48 statically pinned existing arguments. Exact installed Playwright 1.63.0 code requires deferred response callbacks because it registers request callbacks after transport.send returns. Its optional open hook is not called by this Chromium path, and a failed-attach cleanup catch can swallow a close exception. The independent owner therefore retains errors and separate process, job, settled I/O, native handle, callback-worker, SDK and directory receipts.

The proposed roster is **7 actual Chromium cases, including 6 public SDK attach attempts, plus 3 native controls**. C05 deliberately stops before SDK attachment. The native controls distinguish job zero from retained pipe drainage, require a genuinely pending write before cancellation, and preserve the outside-inner-job limitation. All 10 cases are unexecuted. Original launcher 22+11, baseline 28, survivor 6, controller 36 and later capture 44 denominators remain separate and unchanged. The unavailable kernel creation cut and job-at-creation OS premise remain named.

`DESIGN.md` carries concrete handle mapping, framing, callback timing, stop/join ownership, case expectations, prerequisites and the future exclusive resource plan. `proposed-checks.json` is the frozen proposed roster. `SOURCES.md` distinguishes exact-version source snapshots from general API documentation and from unexecuted inferences. `launch-contract.json` is a static transcription, not an executed default-generator comparison; that comparison is a later preparation prerequisite. The owner supplies the public artifactsDir option to avoid the SDK's unregistered temporary-directory allocation.

| Artifact | SHA-256 |
| --- | --- |
| DESIGN.md | `b5359a6fa66da2a4b7b4f21dcd9048d4550c4c80da00a1afba525657ca65c2de` |
| proposed-checks.json | `e23c4b995c9e323ab029e17e86fe06793524656b96603e0af2ac7bf9bc1aa89a` |
| input-pins.json | `b0d69cc7bd5a886784c30e0b71528adfc441167cc6a45198050f948100691cf4` |
| installed-runtime-pins.json | `1d984c720a9460f805e609b614ac028b9181d601e802941b06f6d5113f9d4ba2` |
| launch-contract.json | `6deced51334c6d21fcc8793df23e789d6668060abb89483b9830312af1baac30` |
| SOURCES.md | `b5d2057be9367199358e3f072dd80d78a27a8e07782b19be1b3ecd778f0c7d0d` |
| verification.json | `8d2f3e919a1521d68b7ef0d44d58b3573302e4eb6911ad97e92840b7e452d36f` |

The final read-only verification completed with actual tool exit 0: 16 copied inputs and their originals, 7 installed source fragments, 14 official source snapshots, all 249 installed Chromium runtime files, the pinned Node executable and all 63 original native run03 members matched. It also checked the 48-to-49 argument prefix/delta, environment assumptions, separate case counts and existing denominators. This validates retained bytes and design consistency only. No SDK generator or simulation model was executed. The original run03 freeze is still `bf4ac79911596e7d0314c279c3e89c75c098cf9f112946f518f7d7634cee8068`.

Approved read-only exact-task process census at `2026-09-20T06:55:03.8119878Z` found zero matches. It is supplementary snapshot evidence, not handle or universal ancestry authority. This design launched no browser, native fixture, GPU program, GUI or server. No resource lease is held. Git read-only inspection succeeded using a command-local safe.directory setting; its unrelated global-ignore read warnings remain recorded in the handoff context and did not prevent the repository's own ignore rule from matching.

The exact missing conventional build inputs are the Node 24.12.0 x64 header kit and matching node.lib. The proposed smallest build route is the official same-release header archive and win-x64 import library, verified against its checksum manifest, then direct MSVC /LD with the retained toolchain. Neither archive nor import library was acquired here; two exact source headers were retained only as API documentation. Node-API remains a proposed tooling boundary for Review65. Environment teardown, real installed pipe interoperability, actual callback timing, the ten outcomes, complete browser descendant coverage and later controller fidelity remain unproved.

Next dependency: independent design review, then separate root admission for any prerequisite acquisition or implementation, exact-source review, a separately admitted single execution and independent results review. The proposed command shape is intentionally not runnable yet. Preserve this worktree and the original native evidence for that review; no next-stage action is automatic.
