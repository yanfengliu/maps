# Source characterization diagnostics v1: independent static review

Verdict: HOLD. One material caller cleanup defect must be repaired before Root considers execution readiness. This review grants no execution lease, Source32 credit, Source adoption, actual16179 result, or Unreal verification. Reviewed by /root/source_characterization_review on 2026-10-15; integration owner remains /root.

Scope is the frozen diagnostics-v1 candidate in SourceW base 33d386299ff7bd02d91bca38f655f41597ddb756. All four new source bodies were fully read. Exact selected source, agreed v4 designs, before-code contract, finite authorities/recipes/commands, frozen indexes and conservation were inspected using guarded data reads, hashes and AST parsing only. The reviewed v4 source is unchanged. No target definition, pack, physical caller, selected Utility binder, Job, compiler, helper, Source case, parser child, process query or gate was invoked.

## Material finding

SRC-DIAG1-STOP (P2), root_diag_dispatch.py:154–157. The cleanup block places `process.poll()` and `process.kill()` in one try, with kill reachable only after poll returns None. If the status/API query raises, cleanup records `kill-held-owned-object` and proceeds directly to wait, drain and closes. It never attempts the independent stop through the retained owned Popen object. A repeated status-query failure can therefore leave an owned live process without a stop attempt and consume the shared wait/drain budget. A red report does not satisfy the before-code contract's always-attempt resource cleanup requirement.

Repair only this control dependency: preserve the status-query failure as an ordered cleanup fact and still independently attempt retained-object stop when exit is not positively known. Preserve the operation primary, independent kill/wait/drain/all close attempts, partial captures, and one shared TOTAL15. Do not add a PID-based fallback or treat a failed query as proof that the process exited. No new diagnostic population, injected fault claim, generic framework or historical Source26 invalidation follows from this finding. Focused independent source rereview is required after a fresh immutable candidate and exact updated pins are available.

The earlier identity concern has a different bound: Popen is retained before PID/GetProcessTimes identity acquisition, and that acquisition is already inside the held try/finally. An identity exception does enter cleanup. The later poll-to-stop dependency above remains material despite that correct ownership entry.

## Source and population checks

The implemented population matches exactly the agreed 12 names/order: two Job rows, four clock rows, two worker rows and four stream rows. Frozen original API tables, ctypes last-error operations, handle/close order, full clock consumer sequences, requested sleeps, refusal/exhaustion rules and literal expected observations remain the authority. The pack consumes those pinned design records, with unexpected calls refused and first harness failure retaining partial records and leaving remaining records DID-NOT-RUN. There is no extra zero-length/schema/Source/26/UnitD row.

All 22 selected Python definitions match the agreed source descriptors, top-level names, start/end line and column, ast.dump SHA-256, text SHA-256 and actual acquired source bytes. They contain no import statements. Only the selected AST nodes are compiled by the unrun packs, into explicit injected namespaces; the whole Source module/native top-level initialization is not imported. Worker rows invoke the original selected main pending branch with six injected Thread objects and exact start/join/alive/clock tables; synchronous injection grants no physical scheduling/join evidence. Stream rows invoke the original selected LiveIO methods with exact attributes/raw-open/read/real-empty-EOF/close injections; no unconsumed EOF tail is credited as observed.

All four old/new binding slices match the agreed descriptors and actual source spans. Parent arms use the actual emitted child descriptor chain and current child_summary_pin plus original selected LiveIO read/check/close code. The stable arm retains A. In the causal changed-summary arm, old code computes B, while current code retains emitted pin A and must refuse B before parsing. The current arm does not manufacture a matching B descriptor. These remain source decisions over injected raw I/O, not a physical race proof.

The Root pack selects ten actual transitive functions and all eleven actual assignment AST nodes from v4 Root lines 6–13. This includes O/F/N/recipePath/out, Utility manifest/DLL/CmdletInfo/module globals, Problem, Secondary and record.secondary. PowerShell Parser.ParseInput independently found those exact extents/assignments and no parse errors in v4 Root or the new Root pack. The unrun pack calls the real guarded v4 Utility binder before its first JSON consumer and before fixture-only ReadOwned interception. Both historical/current acquisition slices share the same admitted actual ParseJSON, CmdletInfo and metadata guard chain. Only the exact declared fixture path/cap is intercepted. No historical unadmitted module-qualified JSON consumer is imported into this proof.

The original full Source setup/case/meter/stop boundary, the prior acquisition and child-pin source repairs, original1005/runtime3383 populations, role/module/native descriptors and Source budgets are unchanged inputs. This review does not rerun them or convert source readiness into Source execution credit.

## Finite physical caller and limits

The caller has exactly three literal slots, each with an exact authority, recipe, target, host vector and four exclusive direct output leaves. All complete outer and inner argv arrays equal frozen source payloads and pins; outer cwd is SourceW, inner cwd is diagnostics-v1. The recipe host vectors are 13/20/13 files and input vectors 6/5/7 files. There are no missing-parent grants. The Windows serialized command sizes including NUL are outer 19577/19581/19583 and inner 31122/518/13594 UTF-16 code units; these calculated lengths are below 32767, not observations of process creation.

The held code requests CREATE_NO_WINDOW without CREATE_SUSPENDED, retains the Popen object, and obtains actual PID/creation FILETIME from its handle. The hard10 clock starts before final source/authority/host admission and Popen, and deadlines precede ordinary poll and success. Initial preflight and post-admission have separate cooperative15 allowances; no whole-caller10 guarantee is asserted. Cleanup uses one shared15 for stop/wait/drain/closes, subject to the material skipped-stop defect. Synchronous opaque OS/API/read/close calls remain outside a proven hard interruption bound.

PeekNamedPipe/os.read acquisition is bounded and EOF is required from the actual stream; overflow/error state is sticky. Success requires total == retained, no overflow/error, actual EOF, exit0, actual creation identity, child self-PID match, full strict UTF-8 single-LF JSON record, exact ordered names/status and Source/main26/UnitD DID-NOT-RUN. Raw outputs and full result are exclusively written, read back and pinned. Publication failure cannot reconstruct acceptance from a projection or truncated prefix. Each raw stream/full result remains capped at 1048576 and authority/source read cap at 32000000. Neither normal complete observer/error/Utility-name result sizes nor all fault/error shapes have been physically shown to fit; oversize is a fail-closed result, not a permitted fit claim. Generated Source 1MiB summaries/readers/dispatch/phase and32M graph bounds are not widened.

## Exact principal pins

All entries are byte count / SHA-256 under the respective frozen namespace.

| Input | Bytes | SHA-256 |
| --- | ---: | --- |
| diagnostics-v1/handoff.md | 4832 | 05adbc2331ef85caa52bf7922a69ffc3d3788bef95dd86e7707675c647215f88 |
| diagnostics-v1/handoff.json | 38896 | 51d3ea7063b65b4c75a192fa7c9497222cdc12595a5be9dbbcf3e8c0fcb488b4 |
| diagnostics-v1/before-code-contract.json | 6064 | d34c138b6064dfe679a0cf7f5f8ecc3140ba4b90e26f174431b8b01e6ffcd515 |
| diagnostics-v1/decision_pack.py | 30808 | b739a28740a177260a9d62895fd4b7e39b802f1fa7e47c08b8e7c043ad2e74b5 |
| diagnostics-v1/root_binding_pack.ps1 | 11907 | 92b729eaffb092990be9e202d066a78ffa81a3f8f9c4e16034f97fbd21bb0a70 |
| diagnostics-v1/parent_binding_pack.py | 13274 | 9fae1922deeaba218dccb9cb741b9aa67923a6145d60f6970a1e7b74a89a5384 |
| diagnostics-v1/root_diag_dispatch.py | 19260 | 61695991123921a40d157c3f740ce6c3da8422630e3df2174480a69c2d572f67 |
| diagnostics-v1/selected-ast.json | 201112 | cca80d2f83c472784d0da3cf57d62a7a8b8e50ab794dcb62a02408d56c51eef4 |
| diagnostics-v1/ready-commands.json | 67943 | 6e504f80cb1a861bfff62342867e8cb32defa52103a071fe6fed35c06f2c47c9 |
| diagnostics-v1/static.json | 30936 | c63048144d5bffffcf52952ac5f3638571bc57a13d8e9a87c7c93a0f17cd78c3 |
| v4/diagnostic-design.json | 56051 | 60348154e2f57a35de4a23291cd7f8cbe8bf77427912c918bcf5f6e25c247bbd |
| v4/binding-design.json | 15109 | 0b44b9eb0684eb480ed11230db5378cb0f6411d5fc1e1609219a1ab864cf0595 |
| v4/root-dispatch.ps1 | 30797 | f1982158e71cca78183ffc97282ebdfd56a21ed49b01f5be98d7aec391a8b4c4 |

## Independent conservation and resources

Both independent phases matched all 4773 protected ordered occurrences / 574378061 bytes: original_inputs1005, source67, runtime3383, protected305, native13. The original4747 /563481921-byte prefix remains exact in each role, with the22v4 and4review additions preserved in order. Every one of the20 sealed candidate files also matched its exact descriptor. Both pre-existing cache inventories remain empty; all56 prior plus13 candidate absence leaves remain absent with real existing parents. The review's own __pycache__ is absent. Old deleted-pyc ownership remains UNKNOWN. No old pin, cache, receipt, source, canonical document or Git data was changed.

Each phase independently read/hash-checked4671 distinct identical descriptor keys with a maximum of six fully joined stdlib utility workers, preserving all occurrence rows in the receipts. There was no reuse of measured bytes across phases. Before took5.206528100003197s and after4.914330599996902s, excluding utility startup. Fresh lexical volume-root/ancestor/leaf guards preceded owned I/O; absence permits only exact declared leaves. Before receipt:2903714/fba52ee4ce4715d8a135c21b6e4cea51c0465985802c622b59eda78414b4d1eb. After receipt:2904017/b3d18c123b97c00b225feba858a32943e7b2b5f43c7150e9daa02e72c1e9fc49. These ignored review receipts are authoring evidence and do not consume or widen generated target output caps.

Review utilities used isolated no-site/no-bytecode Python stdlib, finite joined hash threads and the tool shell's PowerShell7.6.5 builtin data parser. One data-check utility had an incorrect local ancestor index for SourceW and stopped on its own assertion before further reads; the corrected exact cwd check then passed. No target process, browser, GUI, server or persistent worker was launched. All utility calls completed, joined workers ended and file streams closed. Intentionally retained outputs are this review, handoff and the two conservation receipts only.

Required next scope is the focused fresh caller cleanup repair and rereview. Subsequently Root may separately decide whether to issue a new exact command and sole lease for a finite diagnostic slot. All12+4+4 injected decisions, normal physical execution, physical cleanup/fault behavior, actual output-size fit, opaque OS timing, Source execution/native gates and Unreal crossing/controls/pedestrian/vehicle acceptance remain unrun or unproven. This review scope is sealed and released; no semantic execution lease is held.
