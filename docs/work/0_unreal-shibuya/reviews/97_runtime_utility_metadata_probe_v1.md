# Utility metadata probe v1 independent static review — HOLD

Reviewer /root/native_watchdog_record_repair; Root integration owner. RuntimeW base33d386299ff7bd02d91bca38f655f41597ddb756. This read-only source/data/parser review grants no execution lease, Utility-binding conclusion, private18 retry, helper/compiler result, physical fault proof or product credit. Candidate and old evidence are unchanged.

## Material finding

**UMETA-IO-PRIMARY-1 (P2): new probe close failures can replace the original error or skip a remaining close.** In utility-module-metadata-probe.ps1, ReadLiteralBytes35 has one sequential finally: if the stream exists, dispose it, then dispose memory. An operation/read failure followed by a stream-dispose exception propagates the latter without retaining the original; the remaining memory close is skipped. No accumulator retains both exceptions. This is source-established control flow; no read/dispose fault was executed.

PublishReport121 similarly disposes its stream in finally without retaining an earlier exclusive-open/write failure separately. If write and close both fail, publication catch169 receives the close error and the earlier write cause is lost. An earlier record.primary cannot reconstruct this intervening publication error. The path still refuses; this is causal attribution, not a false success.

The adjacent process-wrapper finally158 has the same class. Its catch first stores a collection/identity primary in record.primary, then an uncaught process.Dispose can escape before the later source-admission/error assignment and bounded refusal publication160–173. A Dispose failure134 can also leave the wrapper non-null for its finally. No such OS/.NET failure, leaked process or exceptional cleanup success is observed.

Required correction is confined to these new probe resources: retain the original read/write/collection exception, attempt every independent remaining close, retain later actual close errors in causal order, and reach bounded refusal publication where possible. A recording/sink failure cannot suppress another close. Preserve complete metadata/null/error observations, guards, exact imports, held serializer, limits and physical caller. No new injected population, generic framework, E9 ownership change or opaque-fault claim is requested. Root confirmed this one focused class finding. A fresh immutable minimal repair and independent rereview are required before any later lease.

## Metadata and source checks

The complete probe18824/0cfbcbd538403b83d1b819603b7ac1776d5d2ad4172c6acef9d813791a66eb00 and caller26000/bb8d75087e4a26b5893fcf16f9b347d8ccf1085646dc775aeef1d51beb62ba8c were read. Before-code5231/4c960da8 and original proposal3952/966ba453 match the metadata-only scope. Independent PowerShell Parser.ParseInput finds zero errors and16 function definitions; no probe definition was installed or invoked.

Exactly two CommandAst import sites136/144 match the original literal E9 expressions: direct absolute pinned DLL, then exact325-byte fresh manifest. The installed manifest/DLL/fresh manifest/host are admitted before each import, with fresh regular-leaf checks at the import boundary. No target outer/pack import or function copy, Add-Type invocation, helper compile or private18 test is introduced.

Every returned object index/type retains explicit property presence/null/type/value/error facts for Name, Path, ModuleBase, ModuleType, Version, Guid, RootModule and immediate NestedModules. All four requested export observations per returned module retain command/implementing type/assembly and owning module facts. Count, Name and Path conditions are separately evaluated on actual object properties, with unavailable/error explicit. The failed composite is not enforced; values are not inferred from filenames.

Four frozen names produce eight qualified/unqualified lookup rows. Every GetCommands candidate is indexed and retained, separately from actual GetCommand choice/null/error. Collection errors refuse. No actual returned metadata, failing conjunct or command resolution is known from this review.

The sole Utility invocation site111 uses a held real ConvertTo-Json CmdletInfo from direct-DLL exports, selected before the bad binder. CmdletInfo/name/ImplementingType.Assembly.Location and fresh three-source regular-leaf checks precede each use. Report/terminal call that holder at162/165; no named serializer fallback or target test-command invocation exists. Full metadata refuses above65536 bytes without truncating candidates or projecting a smaller accepted report. Normal/error output-size fit and import/serializer/discovery behavior are UNRUN.

CreateNew publication reads back complete saved bytes and compares them before returning their actual hash. One FINALLY descriptor binds that pin and actual host PID/full creation FILETIME/executable. Missing/oversize/partial/failed publication refuses. The material finding concerns original-cause retention on those refusing paths; this source inspection proves no API latency, physical failure or successful publication.

## Caller and separate attribution correction

All30 non-main E9 definition extents are independently byte-exact:24 functions including nested secondary, plus six classes. Thus the exact population is30 definitions, not30 ordinary FunctionDef nodes. The complete main held-process/capture/cleanup region is exact after removing only the agreed factual-exit insertion. Retained hp/ht/pid/tid, suspended creation, owned kill-on-close Job before resume, identity-independent stop/fallback, bounded capture and one remaining TOTAL15 remain. This does not reopen the accepted E9 ownership correction or physically exercise it.

Removing the two inserted lines from the separate26231/07883c88e9406586345be08a4de9efb9ff13086b257555211e4a23b2a2d32638 .py.txt yields byte-exact original25930 E9 caller. The insertion retains factual nonzero held exit only when primary is absent. No earlier primary is overwritten, typed PowerShell exception fabricated, or success/raw/ownership/path/argv logic changed. Consumed E9 paths remain; no runnable private18 recipe exists.

The metadata caller applies that same rule, retains complete raw stderr, and binds the actual emitted report pin to the same acquired validated JSON bytes. It checks actual held PID/full creation identity, exact source-admission order, two imports, eight lookup rows, all exports and ordinary closure. False conjuncts remain observations, never binding acceptance. Source AUTH/BASE constants, full recipe/authority argv/cwd/output/bounds agree. Caller argv has six entries, held-host argv seven;14 first-order roles and11 caller inputs are pinned.

Whole60, one remaining TOTAL15, raw1MiB each, report65536 and caller1MiB are unchanged. A pending saved record cannot pass Root's separate duties: freshly admit initial caller executable/script/authority/cwd, own and observe its actual identity/exit/full EOF/whole60 and compare original inputs/caches/ranges before/after. Opaque Python/PowerShell/.NET/import/discovery/OS internals remain qualified platform boundaries, not transitive loaded-byte, detached-child, process/thread-census or whole-machine closure claims.

## Independent conservation and resources

Both current phases match all1718 original expected protected files, preserving every1698 baseline expectation without repinning. Including all16 frozen probe files gives1734 unique current checks per phase. All38 cache memberships,43 production ranges and candidate1027 occurrences/1026 unique/83989869 aggregate bytes match. The original v3 inventory reference remains separately outside its own candidate role vector. All14 selected role pins and late frozen artifacts match.

All13 phase/cache absences were checked at exact leaves with real parents. The four new output leaves are structurally absent because their exact attempt directories are absent; no nested leaf was inspected through a missing ancestor. Consumed E9 caller membership remains its original three files/pins. Mutable canonical docs/HEAD are excluded; no canonical/source/cache/old evidence/expectation was changed.

Before604845/7702fe623aa564b19463ccc3b39960f7bf61a0fc6d69c0f60f506f29582787f8 and after604842/c12656f1e863acd258a3d601f69f3b597b08d959388c730b52e22508069efb51 retain all current rows. Each phase used at most six fully joined workers and took2.6121888/2.6085222s after utility startup. No observed source bytes were reused across phases. Static receipt7573/f5e053853c4b6d0fb6e02bba3201c13facb445a318843014990f4d50c9e85e7a binds extents, exact attribution reversal, literal imports and source/recipe checks.

Reviewer utilities initially lost an in-memory prefix, counted definition shapes as functions only and looked for sha256 instead of the saved expected_sha256. They stopped before complete evidence publication; corrected checks retain the actual field and24-function/six-class shape. A final authoring call also stopped on tool-language quoting before execution. None changed target code or invoked a selected body.

Only finite headless guarded reads/hashes/membership/range comparisons and Python AST/PowerShell source parsing ran. No selected definition/import/serializer/lookup/Add-Type/helper/compiler/caller/probe/private18/gate/process query or fault injection ran. No CLI review is claimed. Utilities ended, streams closed and workers joined; no owned browser/GUI/server/target process or persistent worker remains. Retained review artifacts are confined to the fresh ignored review sibling.

Disposition: HOLD for UMETA-IO-PRIMARY-1. Other proved source/metadata/conservation facts remain usable within their static bounds. Root must full-read this sealed finding before a fresh minimal repair. No actual probe lease, binding fix, retry, exceptional proof, E5 timing, full reader/wire/FIRST, Source/Native/product or Unreal acceptance follows. Scope released.
