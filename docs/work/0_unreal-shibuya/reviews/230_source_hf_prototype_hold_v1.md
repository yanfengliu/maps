# Source H-F prototype independent review v1

Verdict: HOLD. Do not release the ordinary 12-method / 29-subcell command from this packet. Five material findings remain. No selected source was imported, compiled, evaluated or executed in this review.

This review concerns the exact prototype seal `9780 / fbae0e644cf0d8247ca5571e7334e4afbe88219f3fed744ba6556e314e63889d`, loader `119771 / a5b6c732fccb48a88383fe96ca9a20e3026a2278d885ae76691b5bf012efb4d2`, Ready `14240 / 4d6d5b9c23cc1d511cada381f640c23b4d0d5318bfcda7e2da0bc0ca3d5045cc`, instrument `5264 / 22e8a1cc1b97b61489594930bb12773e897e572171b8a1cd6ccbc93837ddbfb0` and Root adoption `6768 / 6d4172565b7318bc646355e2eeb6b13e62ae9c225a82c89c54f97cadcf621ad3`. Source-only findings below are static causal arguments, not observed test outcomes.

## Material findings

### HF-R1 — Zip alone rejects its normal successful restoration

Location: `roles/unit-v1/selected/selected_loader.py:749–756` (`hf_fragment.py:99–106`), original Zip `selected_loader.py:501–510, 626–635`.

The byte-exact original `_ZipReceipt._event` calls `self.restore('successful-wrap-return', None)` when actual decoration completes. Its original restore sets the profile back to its saved prior None and checks that state. A successful ordinary Zip therefore returns to the new outer envelope with `getprofile() is None`, `complete=True`, and `capture_error is None`. New `_FactoryReceipt.restore_zip` allows None only when capture_error is non-None. It calls this normal successful state an unknown current hook and raises. H06 and the Zip portion of H09 cannot complete through this path.

Required resolution: recognize the exact live Zip owner's actual successful restoration/retirement and its verified owned None state, using retained actual restoration evidence and source ownership. Do not accept arbitrary None or overwrite a foreign hook. Keep the complete original Zip body byte-exact. Required witness: whole original build_city H06 succeeds with its actual complete Zip receipt, normal original successful-wrap restoration, checked outer finalization and no hook left; unknown hook and unproved None negatives remain RED.

### HF-R2 — A successful Zip parent retires the installed finite child

Location: original `selected_loader.py:635`, finite `selected_loader.py:827–835, 813–825` (`hf_fragment.py:177–185, 163–175`), H07 `tests/hf_cases.py:87–92`.

H07 installs a finite callback over the real Zip callback and forwards every event parent-first. At the actual wrap-return event, the unchanged Zip parent restores None inside that forwarded call. The finite child does not notice or re-arm after the parent's normal retirement. Subsequent selected events are lost. The child's nominal prior still points to the now retired Zip callback. Normal child restoration also rejects current None because self.primary is None. Fixing only HF-R1 cannot resolve this composition defect.

Required resolution: explicitly handle the actual known parent retirement, child continuation and effective restoration owner without weakening parent-first exactly-once event delivery or the exclusive original Zip protocol. Root must settle that state transition before another coherent packet is prepared. Required witness: H07 retains a complete actual Zip receipt, observes the actual retirement event and child continuation, reaches the selected exec end, restores the correct effective owner, and closes all task hooks. Preserve actual missing/duplicate-forward mutants and show their required Zip event refusals; an effective-prior assertion that merely expects the original nominal callback is insufficient.

### HF-R3 — Typed NamedTuple annotations are read from the wrong storage

Location: `selected_loader.py:1011` (`hf_fragment.py:361`).

The validator reads `vars(owner.__new__).get('__annotations__')`. Python function annotations live in the function's dedicated `__annotations__` attribute, not its ordinary user attribute dictionary. The pinned provider source `C:/Users/38909/miniconda3/Lib/typing.py:2979–2986` assigns `nm_tpl.__annotations__ = nm_tpl.__new__.__annotations__ = types`. Nothing on that source path writes a user dictionary item named __annotations__. The actual nonempty annotation dict cannot satisfy the current predicate. H02's typed fixture and whole ModeDescriptor both require this path.

Required resolution: read and bind the actual function annotation attribute, retaining the same dictionary relationship to the actual _make_nmtuple frame and final class. Keep the check on the permitted annotation assignment phase and preserve actual function/code/globals/default/closure identity. Required witnesses: actual typed defaults/user methods, explicit generic unit variation and whole original ModeDescriptor pass; changed function annotation identity or contents refuse at that relation.

### HF-R4 — A selected execution error is mistaken for callback ownership evidence

Location: `selected_loader.py:38–42, 52–58, 813–825` (`hf_fragment.py:163–175`).

The None restoration branch requires only `self.primary is not None`. The outer ExactSource exception handlers also assign self.primary for ordinary selected-source failures. Thus self.primary does not prove that an actual callback exception cleared the callback. A selected fixture can call sys.setprofile(None), then raise an ordinary source error, and receive the same allowed None branch as a genuine callback error. The current foreign-hook test covers a replacement callback, not this unproved None state. This violates the adopted ownership rule and can hide loss of the callback.

Required resolution: retain a distinct actual callback-failure/clear witness, separate from selected execution primary state. Accept None only for a specifically proved owned transition, including any separately adopted normal Zip retirement transition, and record other callback loss as an ownership failure. Preserve original primary and ordered secondary restoration evidence. Required witnesses: a real callback error that clears profiling restores its correct owner; source-owned hook-clear plus source error remains RED with the source primary preserved and restoration/ownership secondary; unexpected None without such proof stays RED.

### HF-R5 — Cached Generic wrapper code is mistaken for the underlying helper

Location: `selected_loader.py:660–672, 695–708, 846–849, 888–922, 1001–1005` (`hf_fragment.py:10–22, 45–58, 196–199, 238–272, 351–355`), `tests/hf_cases.py:39–49`.

The actual pinned typing source decorates _generic_class_getitem with @_tp_cache at typing.py:1207. _tp_cache returns the shared-code inner wrapper from typing.py:426–433; that wrapper delegates through _caches[func]. H-F adopts the wrapper's function/code/globals/default/closure objects. The closure binding retains the underlying func object by identity but does not retain or recheck that object's own code/globals/default/closure, the corresponding cached callable or the actual delegation relation. The event classifier selects a role from frame code alone. The same _tp_cache inner code can execute for other wrappers with different closure cells, so this does not identify the intended invocation. Nor does it prove the actual _generic_class_getitem body, result alias, parameter objects or native Generic delegation requested by the adopted contract. Current H03 only asserts some _generic_init_subclass call exists. It does not discriminate this gap.

Required resolution: retain the actual finite wrapped/delegated function chain before selected use, verify the real frame closure/arguments and actual underlying helper code/globals on the creation path, and bind the returned alias/bases/parameter objects. Recheck those bindings on continued ownership validation. Do not create an expected function, infer a native Python frame, or silently widen the three adopted native capsules. Cache-hit invisibility remains UNKNOWN/RED unless a separate concrete retained relation is reviewed; no blanket wrapper exemption follows from an observed cache hit. Any needed scope adjustment belongs to Root. Required witnesses: actual generic Protocol and generic NamedTuple show the real underlying helper relation; a same-wrapper-code/different-closure invocation, changed underlying function code with unchanged wrapper/closure object identities, or a wrong alias/parameter relation refuses for that specific reason.

## Checks completed and retained boundaries

All 33 sealed member pins match, with exactly those files plus seal.json in the candidate namespace. All 15 HR sealed members match. Ready's 38 input descriptors, closure's 9 dependencies / 38 inputs / 43 selected-site source pins, the 5 provider source pins and the actual ordinary live_io / selected_loader / build_city / Pillow source descriptors were read and checked in a bounded pass. Verification retains every unique inspected descriptor and file metadata; input-preservation.json compares them again before handoff.

All 23 candidate Python files parse as AST. The six declared full raw inverses reconstruct the complete original 55,120-byte loader exactly. All 26,222 bytes of _ZipReceipt match that donor. Adapter and producer remain byte-exact. The appended role/site constants match the frozen manifest: 48 provider rows, 69 production sites in 31 modules, 18 fixture sites in 12 whole fixture files. Every one of the 87 declared sites was checked against its actual source AST, fixed line/end and class or direct namedtuple arguments. Both forward mutants are exact single-location raw replacements. The 12 method names and ordered 29 subcell IDs match Ready/instrument; the one-shot directory is absent and the three output leaves agree with policy.

The H01/H04/H05/H08/H10/H11/H12 definitions use actual candidate acquisition and actual helpers, with fixed primitive expectations, real source-owned mutations and setup outside the narrow refusal catch. Whole original build_city and both whole Pillow files are registered without a positive vendor rewrite or producer seam. Missing-forward and duplicate-forward controls operate on the actual parent invocation; this is useful structure, not evidence that either control has run. The original function collector is unchanged; conditional Flag bound-method state is separate from the collected FunctionType population. The candidate's flags, aliases and native raw kinds remain unobserved.

No ordinary method or subcell ran. No P2, P1, original A-D/24x2/prior108, proposed G/F cells, full Source32, Source2, producer main, DOM/CIM, payload census, native mechanism, Unreal process or GUI was started. Static assertions do not establish runtime event delivery, actual native visibility, raw kinds, complete imports, cleanup behavior, clock fit or vendor/source-versus-pyc proof. This review grants no execution lease. All later gates remain HELD.

The review owns only its fresh ignored output directory and finite passive Python shell commands, all terminal. No long-running process, server, GUI or hook was created. Root owns subsequent design, implementation delegation, exact re-review, lease, observed readback and canonical record promotion.
