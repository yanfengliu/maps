# Focused Native Python P2 source review — HOLD

Independent reviewer: /root/native_watchdog_record_repair. Author: /root/runtime_wire_repair_review. Integration owner: Root. Candidate: C:\Users\38909\Documents\github\maps\artifacts\unreal-support-v2\worktree\Artifacts\support-v2\native-formal-python-consumer-repair-v1, supplied NativeW base af8bdbd34228c69dea45dd99af4ae20d7c2a9798. This review covers the changed six-source integration only; the reviewer's authored P1 baseline is not independently re-reviewed or adopted here. The previously accepted P1 review/evidence is retained as immutable selected input.

Verdict: HOLD for three material source findings. No candidate edits, target/module definition or import, API/helper/compiler/control/fixture/materialization/process query/gate/Git/canonical write ran. Passive source acquisition, data/hash comparison and ast.parse only. The source traces below are static reasoning about handled paths, not physical race/exception/cleanup proof or new semantic test cases.

## NPY2-CLOCK-1 — first TOTAL15 publication is not atomic

Source: C:\Users\38909\Documents\github\maps\artifacts\unreal-support-v2\worktree\Artifacts\support-v2\native-formal-python-consumer-repair-v1\physical_creator.py, ResourceReport.failure287–312 and begin_cleanup314–327. Caller edges: physical_game_helper.py157–162 and run_materialization_owned.py263–264.

failure uses the existing RLock, but direct begin_cleanup does not. The main normal-cleanup path and observer.failure can both enter it. Main can pass the cleanup_deadline-is-None test317 and pause; observer then holds the lock, records its failure and first tB+15 deadline; main resumes318–321 and overwrites the start/deadline with later tA+15. The return/public facts now describe the later start. No source mechanism preserves the first clock in this schedule.

This violates one TOTAL15 from the first resource failure/normal cleanup entry and can understate cleanup_seconds. The separate parent120/pipeline180 bounds do not repair this smaller obligation. Use the already declared RLock to make first-start/deadline publication and any shortening/mismatch update atomic; preserve the first start and same-or-earlier deadline. No cap/API/architecture change is needed. Actual interleaving was not run.

## NPY2-CLOSE-SINK-1 — error reporting can interrupt later independent closes

Source: physical_creator.py287–312; close edges505–513,551–575,610–619. Census edges: physical_game_helper.py167–169 and244–282.

ResourceReport.failure retains the primary object before formatting and protects str(failure), which is useful. It does not protect acquisition of winerror/errno at307–308, owned_secondary_errors at309, or the mutable errors sink/recursive publication. A reachable Exception property that raises, or a rejecting/mutated error sink, can throw from failure itself. No allocator/OOM or whole-machine fault assumption is required.

release_startup calls this sink directly from each close except. If that publication raises after the attribute-list or first inherited close error, the remaining inherited handles and null stream are skipped. Its unguarded invocation in the constructor finally can also bypass the original-primary rethrow. Census.attempt catches an owned operation, then calls the same sink without protecting against its exception; when used inside cleanup finally, a sink exception can skip later primary, member and Job closes. This is an all-independent-close defect even though the private original primary was initially retained.

Retain actual primary and ordered close references before report access and ensure the sink cannot interrupt remaining independent cleanup. Retain property/sink errors as actual ordered secondary objects, preserve original Exception identity and complete bounded facts/refusal, and do not replace the primary with a reporting exception. A local deferred or guarded publication change is sufficient; this review proposes no new framework or control population. No actual close/sink fault was executed.

## NPY2-OBSERVER-1 — local ownership readiness can miss an observed unjoined thread

Source: physical_game_helper.py210–285 and preserved ownership_local_ready69–84; consumer run_materialization_owned.py263–269.

The handled join-failure/alive path records errors and observer_joined=False only in ResourceReport. The cleanup row snapshots identity_observer_error from census.error earlier at233–240, and census.error may remain None when watch itself did not throw. Final join/alive refusal255–258 does not update the consumer row. The runner then calls the unchanged predicate on row.cleanup alone; it does not conjoin report.cleanup_complete/errors/observer_joined.

Thus the handled path can carry passing member/queue/handle fields and a None observer error to that predicate while the actual final thread observation is unjoined. physical_local_ready can contradict that retained observation. Overall materialization stays RED via resources.primary; this is a false local-closure field, not a whole-gate escape. Continuing an unlocked member-handle snapshot/sweep while an in-flight retain remains possible also risks a newly retained handle appearing after the sweep snapshot.

Preserve ownership_local_ready byte-for-byte. Make its consumer row/refusal or an explicit caller conjunction include the actual join result, and make member publication/sweeping stable before claiming closure. Keep unresolved resources retained and all applicable independent closes attempted under the same finite deadline. Do not turn a failed join into a closure claim or silently expand time. No actual join failure/race was run.

## Source checks that held

The exact Root-agreed before-code contract is5428/5c9ff9d37b8b4a6662c18c053ac016b8b260a8152bb1df5a4f44bcf645bbe750. The four public signatures plus explicit ResourceReport/initialize_api/identity/held_termination interfaces match the agreed graph. Handles/PID/TID are registered on caller-attached objects before optional later queries: Job before SetInformation, process/initial thread before identity, completion port before association/thread start, and opened member handle before membership/identity. Partial FILETIME facts do not manufacture complete admitted members. Retained Job/primary stop is attempted when optional state/identity fails; destructive cleanup does not reopen numeric PIDs.

The supplementary literal C:\Windows\System32\kernel32.dll861992/e132eba4166256e2f414b91fe7d5386590bc5ea8626aee5af9c9738383cf2ae1 is checked by supplied P1 checked_bytes under1048576 plus a fresh full lexical guard before absolute WinDLL. Native signatures are selected explicitly rather than by a module-global loader. Error-return sites capture GetLastError before later API/close calls; attribute sizing retains the expected actual insufficient-buffer response. Null input remains an explicit device role, exactly two handles are inherited, and CreateProcess flags/None environment behavior are preserved. Missing closed spawn_authority refuses before process creation; no runnable authority is synthesized.

All twelve old/new source bytes were acquired and ast.parse-clean. Independently regenerated six full diffs match the frozen saved diffs exactly. Gate and child whole bytes are exact after reversing only declared path maps. The three ModuleType loader bodies are exact under the same reversal; all fixture function extents, including both existing len/SHA/strict_json acquisitions, are exact. The runner has26 helper extents exact and changes only loader/main. The original ownership_local_ready is exact. This is conservation of accepted P1 extents, not a fresh self-review of P1 correctness.

The unchanged source populations/limits remain:1748 pairs, source1631 files/893 directories, fresh1629/892, class120/67;1MiB copy buffer/eight joined workers;4096 identities/20000 events;child60, parent ENTRY-through-publication120,pre8,CIM10,census20,Root pipeline180,oneTOTAL15,mechanism60;decimal proof1000000,materialization/input32000000,diagnostic8192. Member/event and NEW/EXIT/ZERO reporting obligations remain. No predicate relaxation, typed helper adoption or semantic population/case change was found in this increment. Copied legacy launch/main functions are unadopted; both copied helper __main__ routes refuse. They are not runnable selected entries.

## Pin and conservation evidence

Selected handoff.md6515/66c37155cb892d2eac0e4fc5cdb83707d130414db6cbbd944d5a70d85d5b8039 and handoff.json18744/67291660836a730c18172050ed253ddd962370be19ab363f6ee2aa2d065ffd1a match. Full six-source map5684/336071095a801e9d259badd48a4d81aa0a5c729b156df4245d9fe895d8f9ca24, author extent proof90321/1b6ff86a7666c8f5685b3a0b9147bddf64abe25de08f509cd8bc37b5efa38f01 and boundary9091/b11882599e16a12ea5c8daf88b34854be4fbac6a2c0904952ba8bbf27580f492 are preserved. Our independent static-source-checks.json records exact extents and comparisons; findings.json supplies source pins/line edges.

Before and after current comparisons matched the original79 selected occurrences/78 unique paths plus20 sealed candidate artifacts/handoffs,99 occurrences total. Original expected pins were not repinned. The eight old absence leaves and this review's own cache leaf are absent with all real parents; no missing ancestor was treated as positive admission. One serial hash worker completed all work. This is selected-file/absence conservation only, not a full1631/893 payload/discovery/cache census. Canonical changing context is excluded. Before31933/3f42897bb59b3e96ebb2b6c05750a3fb443fc71804c045a8a60e61674a39949f; after31930/87319581d93b848b9817ec3524b631cef18655a84101f6db96ab57b202ec7a6d.

## Open integration boundary and release

Candidate stays UNARMED. Fresh inventory/source32/executing DAG/spec/output vectors, staged ENV/spawn authority, PowerShell source/IO/binding/stage/environment adapters, physical Root supervisor and downstream Native82/Class6 graph are absent/unselected. Original spec SHA is retained; no fn2/fn2c fixture or metadata is invented. Full original proof/InventorySHA/OuterSHA/saved actual Manifest/typed AND canonical obligations remain; isolated controls and these source checks cannot substitute. Known pre8/normal report sizing/whole-envelope fit remain unproved or RED, not fixed by adding measured times.

System loader/API forwarders and installed Python/PowerShell/.NET/compiler/runtime transitive IO are qualified platform boundaries, not whole-machine closure requirements. The guarded owned code still must satisfy the three findings. Actual resource/error/observer/notification/ENV behavior, physical race/fault/reference proof, materialization, original real31, FIRST/Native82/Class6/Source32 and Unreal remain UNRUN/unleased here. No new semantic test population or ready argv exists.

Only C:\Users\38909\Documents\github\maps\artifacts\unreal-support-v2\worktree\Artifacts\support-v2\native-formal-python-consumer-review-v1 was authored. No candidate/old evidence/cache/Git/canonical writes. All finite passive utilities completed; no semantic/GUI/browser/server resource was launched. Scope and slot released. Root should agree a minimal repair contract before the independent author changes a fresh candidate; exact fixes require focused rereview, then any separate Root-only execution lease.
