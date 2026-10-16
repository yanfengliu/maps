# Source H-F prototype independent review v3

Verdict: HOLD. The HF2-R1 production phase split is correct in the scoped source review, but one new control reporting defect prevents releasing the ordinary 12-method / 41-cell preparation. No candidate or control executed.

Reviewed candidate: seal 12157 / 4d463ccc2d02f0d0f93ca619d55fc41e476420d4ceec2f7c1e5ec6e5087c90e5; selected loader 146273 / 1dc1109fd921fbbdf1f4e6454f79c0663b40ca9351ae2426c74c2722811b7caf; Ready 40583 / 67f0f83873722daf25bb4874b40e23639649d94b2ae3d263bd08e195c934740e. The Root phase adoption is 3620 / b51cef0ac1ea9398c19fe3cefa7273978e5402ff1ca61febc3b1cc22145961ea. This review reuses the byte-exact v2 evidence and examines the entire changed phase/control path independently.

## HF3-R1 — The missing-export control inventories the missing owner before restoring it

Locations: tests/hf_cases.py:165–166, tests/scope.py:60–65; actual selected_loader.py:276–301 (ClosedFinder.retain_module).

H07.export-missing-at-finalization starts from a genuinely completed positive, removes namespace['ZipMember'], calls the real phase-valid evidence helper and then calls actual restore_zip. It correctly requires the unchanged original export guard to refuse, retains that actual error and verifies no new successful row or token.

Its return expression then calls s.inventory() inside the try while the export is still absent. The finally restores namespace['ZipMember'] only after Python evaluates that return expression. Scope.inventory walks each loaded module's saved functions and, for a dotted class slot, executes owner=vars(saved['module']).get(parts[0]) followed by vars(owner).get(parts[1]).

The real retain_module collects the generated ZipMember methods and keeps them in saved['functions']; the ZipMember exemption affects generic-slot retention/checking, not this saved function population or the ordinary inventory loop. Thus an actual build_city ZipMember.<slot> has owner=None during this return expression. vars(None) raises TypeError. The export is restored by finally, but the cell is still an ERROR from its own evidence reader after reaching its intended guard.

This is a static causal conclusion from the actual saved-slot construction, actual inventory expression and Python try/finally evaluation order. No observed failure, unit outcome, frame visibility or clock result is claimed.

Required resolution: restore the exact export in finally before invoking the ordinary complete inventory reader. Retain the actual intended ImportError and every restoration error, row, token and historical ledger state across that restoration, then build the evidence from the restored real module. Do not make the generic inventory silently skip missing owners, clear failure history, normalize the candidate into success, or replace the actual finalization call with a predicate. A before-mutation snapshot alone would not capture the newly retained finalization error.

The same 41-cell contract can remain, with the second finalization still explicitly a continued-validation negative. Root owns the fresh instrument repair and exact focused review. V3 remains immutable and UNRUN; no execution lease follows.

## HF2-R1 resolution and control path review

The actual fragment matches all four existing-method after hunks and the one new helper in the adopted design. No other H-F method changes. zip_evidence now invokes zip_generated_evidence, whose entire body after the phase-valid complete/no-errors guard is AST-identical to every original Zip.check statement after its first export guard, changing only self to receipt. Original _runtime, class, field, generated function, annotation and closure checks remain; those helpers do not require the future export.

restore_zip unconditionally calls the complete unchanged original receipt.check on its successful normal-retirement branch before current-hook/child-token checks and finalized=True. The actual ExactSource envelope calls it after exec and the finite child's restoration attempt. The original late exported-name guard is preserved rather than selectable or omitted.

retire_zip only adds a strong-reference observation of actual module export presence/value. The unchanged parent-first event/frame/code/globals/argument and leaf chain guards precede retirement. The child rearms the actual verified leaf, changes its effective prior to None, and continues through Tail without forwarding to retired Zip. The strengthened positive checks actual absent export at retirement, same wrap-return frame/arg, eventual export, actual Tail eval completion and genuine owned effective-None restoration token. These are prepared assertions, not actual outcomes.

The premature-export mutant is an exact one-line raw source replacement of the new common-helper call with receipt.check. Its control inspects the genuine retirement-rearm primary, actual callback witness, real original successful row, absent export, Tail DNR and no finite admission/finalization. The narrow cleanup checks the actual currently installed task-owned Zip callback, actual source/code/self, unchanged restore binding, original None priors and identical primary before calling unchanged Zip.restore. It retains the real appended cleanup row and existing errors. No unknown hook override, fabricated row or success token appears in the reviewed cleanup path.

The late missing-export control reaches the intended common-generation and full finalization functions in source, and explicitly calls the latter as a second validation of a true positive. Its TypeError reporting defect above is separate from the candidate's retained export guard. Historical finalized=True is identified as history, not a verdict for the failed second call.

## Passive verification and preserved bounds

1057 passive assertions passed across 204 unique inspected file pins. All 41 candidate sealed members match, with exactly those files plus seal.json in the closed namespace. Ready's 132 inputs, the declared closure/dependencies, adopted design/Root adoption and retained earlier review inputs match their actual bytes. All 28 Python files parse as AST. The prior v2 review's full inspected-file vector remains unchanged; that is the reused evidence for unchanged source-site contracts rather than a new full payload walk.

The 29 v3 source/readme inverse rows bind actual retained v2 bytes or explicit old absence; the retained v2-to-v1 and v1-to-original rows also match. Complete v3-to-v2-to-v1-to55120 and independent direct reconstruction recover the same full original loader. Its entire 26222-byte Zip class remains byte-exact, as do adapter 17161 / e7cbe5232096fdb1171b4e84aed5cd189dd04cbad657239941061aaaa17ce0d7 and producer 29952 / f3354879e981dc711e108e4592234d7c60c66a1610d52e027a8bf6c420cc5fe0.

Every one of the 16 fixture files remains byte-exact to v2. The 93 site rows and 48 logical role vectors are unchanged, preserving production69/31, unit24/16 and three native startup capsules. The new helper participates in the actual finite install's captured compile-code/helper bindings. The bootstrap still retains actual selected-loader functions. No provider or eligibility broadening is introduced.

Independent literal AST decoding yields the actual 12 ordered methods and 41 ordered cells, with all original39 in order and exactly the two adopted H07 additions. The omission and duplication variants remain single-location actual parent-call mutations; the premature-check variant is the exact new call replacement. The fresh ordinary output directory and its outputs remain absent.

All ordinary cells, actual hooks/frames/raw kinds/native visibility/cleanup, complete imports and timing remain UNKNOWN. Strict Generic cache-only and unregistered delegation remain RED by design. No P2, P1, original G/F/24x2/prior108, full1022/Source32/Source2 or Unreal acceptance follows from this preparation review.

Only this fresh ignored reviewer namespace was written. No selected helper/import/compile/eval, unit, probe, API, process census, full payload inventory, Git mutation, canonical edit, Unreal process or GUI was started. Finite passive shell commands are terminal; no persistent resources or execution lease remain. Input-conservation.json rechecks every inspected pin, the exact candidate namespace and output absence at handoff.
