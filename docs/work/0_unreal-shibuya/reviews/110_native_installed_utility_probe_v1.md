# Native installed-Utility probe independent review

HOLD. Four material findings remain. Do not open the proposed ordinary metadata lease for these bytes. This is a different worker's source/data review of Native-authored implementation at Root-declared base af8bdbd34228c69dea45dd99af4ae20d7c2a9798. It is not an actual probe, PowerShell syntax parse, fault/race proof, CLI audit, formal Native gate or product acceptance.

Reviewed exact sources are installed-utility-metadata-probe.ps1,28206/SHA3eee3c852c46720af5dbbc00cfe492864a1ab87d253de0b20c14f236cf8f7bc0, and root-installed-utility-caller.py,33883/SHA5f2ab20910d946861d9c75dd7b59f4e729cd406f76ca47d2ddf4fdb7bdf37640, under NativeW/Artifacts/support-v2/native-installed-utility-probe-v1. Implementation seal7664/SHA912e80948c62751ac383f103ba79b40692a0880bbf4fa0eefe9b2d804cab1ce5 matches all20 members plus itself.

The agreed contract is proposal-v1/before-code-contract.json22463/SHA16bc174fafd8e703881a7829c255bfd38f29134b9ca699be58c14e48e21ec6fe, proposal.md11667/SHA46576b32187325df218489a15866f6e7ed018c682624f5da3dc50de225153888, context-and-retention-amendment.json1878/SHA58395b0b022199df37dd727f543df3784dc981f80b2a6c30a7cff7416967d612 and implementation/named-sites-amendment.json1232/SHAe7aad939af1eef8abf91e44d36fd37187585b6f4ab6c3ec2fe650fb0f2db1cec. The adjacent drain and fdopen changes were explicitly included in Root's agreement. These contracts and both complete sources were read.

1. P1 NI-OPTIONAL-NULL-1 — String-constrained null sentinel selects new-output mode for ordinary inspections.

Source: installed-utility-metadata-probe.ps1, lines 24,35,42,48,70,94,233,253. PowerShell string-constrained parameter binding converts a null default to the empty string. InspectNative declares [string]$newLeaf=$null but tests $null-ne$newLeaf to select exact-new-leaf mode. The omitted third argument is therefore not a null discriminator.

Main253 calls InspectNative $NativeRoot 2 without a third argument. It reaches line35 with kind2 and a non-null empty newLeaf, so the exact-new-report predicate fails before source admission/import. Existing-file inspection callers in ReadLiteralBytes/AdmitImportSources and post-create report checks have the same default-sentinel class.

The intended ordinary metadata probe refuses before import. Guards/publication cannot be accepted as callable under their two modes. This is a static language/flow finding, not an observed run.

Required bounded correction: Use an actually nullable untyped/object sentinel or explicit presence/mode distinction before converting the explicitly supplied leaf to string. Keep independently literal ReportPath authority, kind checks, existing/new leaf distinction and full lexical chain; do not weaken new-leaf admission or infer missing ancestors. Audit all omitted/explicit InspectNative consumers as one local class. No probe/new controls required to establish this static fix.

2. P1 NI-EARLY-CLOSE-PRIMARY-2 — Retained early close failures do not enter teardown and may lose primary attribution.

Source: root-installed-utility-caller.py, lines 135,140,145,150,180,195,200,214,285,286,291,304,305,307,377,379,381,382. close_parent_ends and close_thread remember failures but do not start begin_cleanup or signal the failed release to their caller. start therefore returns and main can perform identity/Job assignment/resume; resume_owned can return after its initial-thread close fails. begin_cleanup is called early only for constructor/fdopen exceptions, not these swallowed failures. If a later operation fails, main records that later exception in primary_actual; publish_error_facts explicitly selects its index instead of the earlier retained close failure.

CreateProcess succeeds -> closing an owned parent write handle fails and is retained -> start returns -> identity or later EOF/deadline operation fails -> primary_actual points to that later exception -> first begin_cleanup may be at main307 -> later exception becomes primary at381–382 and the original close failure is secondary. A failed parent write-end release can itself prevent EOF while execution waits against60 before teardown. The same start-of-first-cleanup gap applies to close_thread failures after ResumeThread.

Original failure causality and the first shared TOTAL15 boundary are not preserved for these approved adjacent close sites. The final result stays RED through ERRORS, but that does not repair late cleanup/incorrect primary.

Required bounded correction: After independently attempting each applicable early release, enter the existing first shared cleanup budget and stop normal admission/resume/capture progression on the first actual release failure. Retain the earliest actual triggering reference as primary, with later identity/timeout/close/formatter refs ordered secondary. Preserve any already-established constructor/fdopen primary. Keep failed FD/handle ownership until actual close success and preserve factual successful CreateProcess/ResumeThread facts. Reuse the same begin_cleanup deadline and existing owned Job/process stop paths, without a reset/extension/new framework/cases.

3. P2 NI-REFUSAL-BYTES-3 — Plain-refusal byte cap excludes the newline actually written.

Source: installed-utility-metadata-probe.ps1, lines 323,324,325. The implementation encodes the joined refusal into $refusal and checks its length<=65536, then writes it with Console.Error.WriteLine. WriteLine appends a newline that is absent from the checked bytes.

At the declared boundary the complete plain stderr can exceed65536 (the ordinary Windows newline adds two bytes), contrary to the fixed serializer/refusal contract. This never grants accepted metadata but violates the hard refusal-output bound.

Required bounded correction: Include the exact final newline in the byte array before its full-byte count/hash decision and write exactly that complete representation, or avoid the added newline. Preserve the existing oversized count/SHA refusal, full metadata cap and no truncation/projection/alternate accepted serializer. No new control population.

4. P2 NI-CONJUNCT-SCHEMA-4 — Type and implementing-DLL diagnostic conjuncts omit the agreed structured facts.

Source: installed-utility-metadata-probe.ps1, lines 156,170,183,284,290. Before-code metadata_schema.conjuncts requires each diagnostic conjunct to retain actual/expected/evaluated/result or explicit null/error. Name/module/count predicates follow that structure, but CommandMetadata emits is_CmdletInfo as a bare bool and implementing_DLL as bare bool/null. Their complete evaluated/expected/error fact is absent from the declared conjunct objects.

A report can claim METADATA_CAPTURED_NOT_BINDING_ACCEPTANCE while the promised fixed diagnostic-conjunct schema is incomplete. Actual type/assembly fields elsewhere preserve useful metadata, but do not satisfy the agreed per-conjunct structure. This does not mean false conjuncts must be rejected as binding failures.

Required bounded correction: Represent these existing two diagnostic predicates with the same agreed actual/expected/evaluated/result and null/error structure using already retained type/assembly observations and the fixed expected CmdletInfo/DLL authority. Adapt the existing caller serializer-field read if its shape changes while preserving its exact predicate. Do not add binding predicates, require diagnostic truth, invoke commands or add cases.

findings.json binds each issue to its whole source pin, exact lines, byte range, source-slice SHA/text and bounded correction. The early-close path is a static causal witness, not an injected fault. The four issues are a focused local finding set, not permission to replace the caller or add a generic resource/error framework.

The following passed static checks do not waive the findings. There is one literal installedPSD1 Import-Module with PassThru/ErrorAction, with no StrictMode, direct DLL import, custom manifest, Force/Global, fallback or second import. The fixed three names use six qualified/unqualified ALL-candidate queries and actual GetCommand choices in order. No Add-Type/converter test is invoked. Only the held actual unqualified ConvertTo-Json choice may serialize report/terminal after existing CmdletInfo/name/implementing-DLL checks. Root/nested/export/candidate loops retain indexes and actual nullable fields; deeper nonempty nesting refuses; no sorting or candidate filtering is added.

The child alone has the selected process PSModulePath setter/readback, inherited module-path/env preference facts and actual Native-header autoloadNone context. Caller source has no environment setter or runtime mkdir. This is only the census bootstrap context; mechanism launch context, later CIM binding and full staged Native ENV stay HOLD. The before/after autoload fields describe the applied Native header preference around the module-path setter; no inherited pre-header preference proof is credited.

Python source AST parsing passed without importing/defining it. The caller recursive map is honestly19 exact/12 changed/4 added over35 entries; the probe27-entry union is11 changed/10 added/6 removed. All declared extents and44 caller/34 probe equal ranges match their actual whole sources. Every inverse patch reconstructs its exact original RP2 source. The full first-order authority/recipe/ready descriptor edges match current bytes and the reviewed graph has no cycle. Fixed6/7 argv, NativeW held cwd, caller cwd and four flat output leaves agree. Inlined caller AUTH equals the actual acquired descriptor. None of this transfers RP2 fault/race evidence.

Independent passive pre/post checks matched all175 original role occurrences/154 unique pinned files, all20 frozen members plus seal, all18 exact real-parent absent leaves and exact implementation21 names. This preserves the declared Native106 plus P2v224/consumed proposal/method inputs and cache absences. It is not Native299/full-payload or Runtime1027/38-cache/43-range conservation. Current mutable C contexts are excluded; no expectation was repinned. Inspections use fresh original lexical volume-root/ancestor/leaf no-reparse checks, with at most six fully joined passive hash workers. Original sources/evidence, Native, Source, E11, Git and C documents were not modified.

No PowerShell parser host, selected definitions, imports, GetCommand, serializer, helper/compiler, controls, process query or actual process run/stop was used. Lexical extents do not prove PowerShell syntax. One reviewer-side extent check was corrected for the authored PowerShell convention excluding its final newline; all original declared hashes then matched. Tool setup/composition refusals occurred before their scripts ran and never launched selected code. No failed target result is being hidden.

Whole60/startup accounting, first remaining TOTAL15, metadata65536, raw/caller1MiB, one normal attempt/no retry, full real-EOF/same-snapshot/exclusive/readback and task-owned handle/Job rules remain fixed. Root must bind its external actual fullwall/identity/exit/EOF/readback/conservation observer and settle PowerShell syntax acceptance before any later normal lease. A saved provisional receipt cannot certify its own actual caller exit. No exceptional cleanup/timing/platform-transitive claim follows from static review or prior RP2 normal mechanics.

Release scope: keep this implementation/seal unchanged, prepare one fresh copy repairing the four local classes and dependent pins/maps, then obtain focused independent re-review before Root's full-read/sole ordinary lease. This review grants no execution or adoption. Native formal/P1/P2/materialization/FIRST/Native82/Class6, Source, Runtime and Unreal acceptance remain open.
