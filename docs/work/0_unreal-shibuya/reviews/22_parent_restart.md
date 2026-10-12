# Round 22 — R27 parent-package restart admission

Independent focused read-only review, 2026-10-11, assigned Astra/xhigh pin. Canonical workspace: `C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree`, source HEAD `e0d33fe504d103b83b39aa0b2d2efc8bb0b2ccec` plus the explicitly frozen uncommitted integrations. The scope is the R27 driver repair, its adjacent admission/final-integrity flow and actual retained original/repaired offline controls. No reviewer engine, build, compiler, test, browser or network request ran, and no implementation or asset was changed.

## Verdict

No new material finding. R27's missing code contract is repaired in the exact driver reviewed here: verify requires the complete discovered parent inventory to equal the successful apply receipt's final parent inventory before admitting finished native material resources. The retained old-red/new-green controls support the narrow admission claim. This closes the implementation/offline portion of R27; native verification using the repaired driver remains pending. Earlier native observations do not constitute a run of these new bytes. This review grants no appearance, photographic-tone, hardware-tracing, controls, population, performance or final integration acceptance.

## Exact inputs and retention

Receipt `artifacts/unreal/nanite-materials/parent-offline-20261011-125309/report.json`, SHA-256 `e2fc5fb60f3bd18cc77cc633b7dbb015c641260f6e233d847779abce8d7231fb`, binds the following target. Live and retained-copy digests match on entry and at completion.

| Target | SHA-256 |
| --- | --- |
| `artifacts/unreal/nanite-materials/run_native_materials.py` | `490b67773ed1f893cf8e5680f048744804cdfb804e8154c9766b4ed2f30c5774` |
| `artifacts/unreal/nanite-materials/test_parent_inventory.py` | `becb2b21e0043f4952566a3e0674b96ac0ce8edfdc4bd0a7c512a9379e81bed4` |
| `docs/work/0_unreal-shibuya/visual-parent-restart-repair.md` | `d50dc9edd937d604f798585356bbcc5047e20fdbde2c54630959486f7d23d622` |

The receipt and unit log are retained with those three files under ignored `tmp/review-runs/parent-round22/target/`. Initial inventory SHA-256 is `91c2e01ba03152493f4c8858cfe7df2de0f4bb6d86b9b43dd5f83336834f4336`; final inventory is `e33e1194a26dbc4c56706cce10508ca3ba684df51fb2af020b9086b22bb43469`. All five entries match their initial live/copy digests. The separately retained original-driver/actual-apply dependencies have inventory SHA-256 `2a9397c87abec1972e65cf34002d1b914bb328b00730eb108e5db99df0c0a993`.

The original driver remains SHA-256 `82b7cc638e6d6edde638fe31a8b8c45874314a2ee22312c9aeb8ce39ca07aee5` at `artifacts/unreal/nanite-materials/freeze-20261011-123941/target/artifacts/unreal/nanite-materials/run_native_materials.py`. The source-bound native apply receipt is `artifacts/unreal/nanite-material-apply-20261011-124004/report.json`, SHA-256 `eecdf5933e2e0cf48361444533b537d5569b0154077ef5436d672fddb2fce668`. Both were independently hashed and copied into this review's retention. The helper remains the round21 SHA-256 `41da6c748858d88be5a6d32f8a7696a8f8369eeb636ac0875720e51f768a37d3`; it has no delta in this review. Round21's coordinator-only R27 ID update was observed as report SHA-256 `9883a3789d8f9b3f2a7a10ee6ac657092e4c4db213e2217a193cb9f7a8bde249`.

## Admission and adjacent flow

The new `verify_parent_inventory` requires each expected/discovered inventory to be an actual nonempty dictionary, with absolute string paths and lowercase 64-hex SHA-256 strings. Missing, empty or malformed inventories fail. Dictionary equality requires exact membership and digest identity; a changed, missing or newly discovered parent is refused with the differing path names.

The live caller at `run_native_materials.py:227–229` reads the previously parsed successful apply receipt's final parent inventory and compares it with hashes of all freshly discovered ancestry packages. This occurs before the `inspect_city_nanite_materials(finish_resources=True)` call at `:244`. The successful comparison retains expected/discovered inventories and the apply receipt digest. Existing strict project-input/asset receipt admission, parameter/usage comparisons, within-process parent checks, final parent hashing, failure reporting and owned cleanup remain in place. Parent-file absence during discovery/hash reading fails rather than supplying an empty successful measurement.

The repair also records total Content package changes from the original operation baseline, including allowed material saves. That record is distinct from the existing final unexpected-drift comparison against the admitted post-operation asset inventory. It does not weaken the allowlist or reset a failed operation to success. The review inspected both additions and their complete surrounding admission/finally paths.

The strict preflight at `:59–60` still compares the entire successful apply input map with current bytes. `Path(__file__)` remains an input at `:33`, so an apply receipt carrying driver `82b7cc63...` cannot be used silently with current driver `490b6777...`. No old-driver allowance, ignored-delta filter or alternate admission was introduced. A native acceptance run needs a new matching apply/verify pair, or a separately reviewed explicit delta contract.

## Retained controls and their limits

The unit log SHA-256 `979d24a52f5bfde6e8171c2f28f7335c02752e2e00ee8c84ab70b1938a37a546` records five tests passing in 0.199 seconds. The receipt records Python PID60608 stopped with exit0, syntax success and unchanged frozen files. These are inspected author-run results, not reviewer reruns.

The harness pins the actual original driver digest and the actual successful native apply receipt digest. It obtains the expected two parent names/digests from that independent receipt, then changes a digest, removes a parent and introduces a new parent. It executes the real original/repaired AST admission block through the native-resource call with only that call and its returned resource payload mocked. The old driver reaches the resource call for all three defective inventories; the repaired driver raises before that call. The receipt retains each old/new admission result and refusal message. This tests the production control flow rather than reproducing its comparison in a separate test implementation.

Additional cases admit the actual unchanged inventory, reject missing/empty/malformed apply inventories, and show that an allowed material save appears in the total package difference. The positive resource payload is explicitly mocked; none of these controls compiles a shader, mutates a parent package or proves native runtime material selection.

The independently read source apply receipt names `M_Default.uasset` SHA-256 `3635a3774bc649b5a66026aee66ba866c2ad11f4beba9983f3247019277387df` and `MI_Default_Opaque.uasset` SHA-256 `cf3848eaa98a42f6ef1f804ada37dd5c76ad550a9f7ff632a54d818b11ac3ef8`, both beneath the installed Interchange glTF content. It reports apply success with the old driver and restart `did-not-run`. The coordinator separately inspected equality of the older actual apply/restart parent inventories; that observation bounds those historical runs but does not establish native execution of the repaired contract.

## Remaining acceptance

The code/offline R27 repair is accepted for the exact target above. Keep repaired-driver native status pending until a matching actual apply/restart receipt pair satisfies this new check and its existing resource, asset/source, shutdown and cleanup checks. Ordinary Game fallback rejection and visual outcomes remain their own gates. The retained evidence remains needed for the active task and focused native follow-up. The reviewer launched no engine or GUI resources and has none to leave running.
