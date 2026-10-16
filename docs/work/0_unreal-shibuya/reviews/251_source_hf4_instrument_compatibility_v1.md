# HF4 legacy instrument compatibility proposal v2 — independent review

Verdict: ACCEPT proposal v2 for Root's separate adoption decision. No implementation, candidate-source write or execution lease is authorized by this review. V1 remains held history; the existing legacy tests remain unmodified.

Current proposal:24714 / ca8209ab331e9220b7c049744d4d0e5163dbf76bb8890c667dc880c83ce4b096; audit-v2:921 / d6eb8f7322ec0c3bcfac3fbe22050231dcbe92a7793bbaf974a549cf80d752d8. The proposed complete unit24 source is17785 / e67db0b76673071d908dd4db8484de1905bb9f4571e627b34edc44fa614c350f and prior108 source is24992 / 052e754142ce4bbc8452a4f729a642f16bf12a9a9781387385ed000ecf80273e. These are in-memory proposal reconstructions, not emitted or executed candidate files.

## V1 finding and exact successor resolution

The immutable v1 proposal23269 / f8257d926c5c43a2ec32d97f0f968cc47fe43616e1624161ce9f7ae8d5c1555c unconditionally used s.finder._raw_function in E04/E15. The actual unit OLD authority selects I6 loader46381 / 02167ee3e74809160061222525c7da44a4fd6822560eff7738dca1400a40b9b6, whose ClosedFinder AST has no such method. E15's OLD baseline may complete, so that new helper call could cause an unrelated AttributeError/UNEXPECTED_ERROR instead of the original descriptor mutation. E04's currently earlier-blocked OLD path cannot supply targeted helper compatibility proof. Root has not adopted or executed v1.

V2 uses the exact real s.arm=='NEW' selector for both expressions. Only NEW invokes its existing actual _raw_function. Each OLD else expression is AST-identical to the complete original raw.__func__ extractor. There is no hasattr/exception fallback, inferred arm or replacement OLD implementation. The actual raw lookup remains identical, and staticmethod still constructs a fresh raw descriptor around the actual function. The mutation still tests descriptor identity after a genuine positive baseline; it does not weaken the ownership check or derive an expected function.

## Registered NEW ordinary bootstrap

The proposed source helper acquires/hash-checks the same complete actual loader bytes, compiles them once, and retains that actual code object. Its default unregistered route still executes the actual code and returns the module for OLD/legacy callers. The new explicit registered route is limited to absent selected_loader, uses a fresh actual ModuleType/spec/loader marker, installs that exact module and executes the retained actual code in its namespace. No expected helper functions or synthetic CodeType authority are generated.

The ordinary NEW arm captures original selected_loader presence/value and refuses a pre-existing entry before creating its unit resources. It then passes the exact strong module/row/marker/compiled-code tuple in source_context['source_bindings'] to the unchanged ClosedFinder interface. The actual selected-loader helper guard can therefore check callback code ancestry, globals, module registration and self against real acquired code, rather than a matching filename or ad hoc namespace.

The teardown checks source-binding tuple identity, actual spec/loader/origin and current registered module identity. It removes only the exact helper module it installed. Foreign/lost entries or changed binding metadata produce explicit cleanup errors and are not overwritten or relabeled success. Original registration absence and identity are observed after removal. The helper identity fields added to the result are actual within-unit IDs and restoration observations; they do not change case verdicts.

Both actual prior108 OLD13784 and current precursor NEW55120 constructors already accept optional context=None and preserve None as the original empty-context behavior. Passing explicit None on OLD therefore introduces no unsupported constructor keyword. The NEW source route is the only branch registering selected_loader; all prior108 hunks are byte-identical between proposals v1 and v2.

These are source-level recipe checks. Actual bootstrap, frame authority, error paths, module cleanup and unit outcomes still require the future exact implementation and separately leased run. No negative bootstrap runtime coverage is claimed from these static guards.

## Z01 normal restoration expectation

The single expected-value amendment is inside the NEW Z01 branch of the52-arm method. It changes the exact restoration phase list from successful-wrap-return plus outer-exec-finally to the singleton successful-wrap-return. OLD Z01 and every semantic case verdict remain unchanged.

This amendment is justified by adopted behavior and actual HF4 evidence, rather than by dropping a failing predicate. Accepted HF4 H06 executes whole original build_city with a complete receipt and one real normal restoration row. The adopted helper performs generation evidence and the unchanged full original Zip.check at outer finalization, checks actual hooks and the child token where applicable, and finalizes without invoking original restore a second time. HF4's actual missing-export negative proves that the late original guard remains and grants no new row/token when it refuses.

The singleton expectation still requires receipt_complete and exact phase/cardinality. The52 method's other source-acquisition, semantic result, targeted phase/message, original error identity, configuration, sys.path, runtime restoration and cleanup assertions remain byte-exact. Z17 still requires its actual outer-exec-finally error restoration. No historical prior52 evidence is changed and no duplicate successful restore row is fabricated to satisfy the old lifecycle shape.

## Frozen populations and passive checks

107 passive assertions passed over19 unique inspected file pins. Both complete proposed source files reconstruct from unique actual before hunks, match their declared full bytes/SHA, parse as AST and invert byte-for-byte to the complete current originals. No proposed Python file was written or invoked.

All24 E/R IDs and the unit method's semantic/phase/cleanup assertions are unchanged. The actual26-record and28-record original vectors match their full independently serialized vector pins, preserving52+56 arms and their original semantic fields. The legacy56 method is byte-exact; the52 method differs only by the declared Z01 expectation. The original legacy unit, authority and population files remain exact. G/F and causal diagnostics are not merged into these populations or replaced by this compatibility work.

The actual accepted HF4 source146273 / 1dc1109fd921fbbdf1f4e6454f79c0663b40ca9351ae2426c74c2722811b7caf is unchanged. This proposal adds no product guard, factory/provider/native trust role, source origin, payload cohort, quota, cap, physical clock, output permission or Source credit. Its new setup only allows the existing instrument to supply the actual source-binding contract already required by HF4.

## Next boundary and resources

Root must adopt or reject these exact v2 hunks, then obtain a fresh integrated candidate/metadata/inverse/Ready review before any sole ordinary lease. The proposed unit24 and prior108 runs remain UNRUN. H's actual12/41 success remains separate from original24x2/prior108 and the still outstanding G/F/cause-graph work. P2, P1, full1022/startup17, Source32/Source2 and Unreal acceptance remain unproved.

Only this fresh ignored review namespace was written. No selected import/compile/eval/helper, test/probe, native API, process query, full1022/payload walk, Git/canonical mutation, Unreal process or GUI ran. Candidate source mutations occurred only as bounded bytes in reviewer memory and were parsed, never executed. All passive shell commands are terminal; no persistent resource or execution lease remains. Input-conservation.json rechecks the reviewed source/proposal/evidence pins at handoff.
