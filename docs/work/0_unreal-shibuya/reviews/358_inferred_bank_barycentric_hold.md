# Independent review: HOLD

Bound: exact two-file candidate only, additive inferred bank barycentric admission. No implementation, full producer, ordinary city Source admission, engine, native gate or full canonical 130-test run was performed. Candidate geometry v3 remains independently RED. Base revision supplied: 73cf9de. Exact reviewed bytes and current integration Source bytes are in pins.json; this verdict does not assume a future HEAD.

Candidate support_source3.py: 61,782 bytes, SHA-256 936e86ba59387c156c3259e15bb11ef6e886e9bd2f1774fd1d5e037318852422. Candidate test_support_source3.py: 68,532 bytes, SHA-256 1cc1870659f4fa75aa20451f6c4930d04b81a071ed7c24919832560228884efc. Export file-map.json: 6,385 bytes, SHA-256 b1e6044f59db88a2e84b1e05ac6c6adf815bca03b85226f4b5918ffdda7c9997.

## [P1] Incident inferred aliases escape across different baseline triangles

support_source3.py lines 717-719 includes the complete sorted three-anchor baseline in inferred_bindings. Two faces may share the same original packed native point on raw edge B-C while naming baseline triangles [A,B,C] and [D,B,C]. Their consistency checks then belong to different groups. One face can move the shared point by 0.00024845132369442896 m and the other can retain the original point; validate_local_geometry returns changed_face_coverage true and inferred_faces 2. This contradicts the proposed every-incident-binding rule and permits the physical seam the change is intended to prevent. Each occurrence still has individually truthful raw anchors, valid barycentrics and at most 1 mm movement, so checking the per-face anchor authority does not close this gap.

The independent control used the candidate's literal two-face GLB fixture (SHA-256 81ce2dbe6ac959c3e74ef330c1e74cb14422a09d93ee5e82723b5ee24b19a0a4). The fixture already has an admitted synthetic zero raw vertex 0 in source 14. In face 2 only, replace the unused third anchor A with that D, retain B and C and the B-C interpolation weights, remove its stitch, put its first output vertex at D, and keep its shared output vertex at original_native_cm / 100. The unchanged shared point's native cm are [-11574.755859375,1497.9385986328125,73.46736907958984]; face 1 consumes [-11574.7783203125,1497.94921875,73.46736907958984]. Candidate validate_local_geometry accepts both. The modified face also passes actual admit_new_face_winding after float32 GLB packing and after native cm conversion, and revalidation still accepts it. This is a small formal control over the actual validator, not a claim about source 14 city vertex 0 or a full city output.

Required repair: unify every incident inferred occurrence by its physical original native point across baseline aliases, while independently retaining the exact raw-anchor/barycentric authority per occurrence. Add a regression for a moved/unchanged and a moved/differently-moved shared B-C point in [A,B,C] and [D,B,C]. Keep baseline permutation and raw-road incident controls. The implementation owner decides whether an explicit safe incidence contract is needed to avoid grouping unrelated coincident geometry.

## Observed checks

- Independently executed exported run_focused.py against candidate: 34 tests PASS in 1.862 seconds (process 2.334 seconds). Includes actual tiny Surface reader identity admission/invalid weights, raw bank binding, malformed shape/sum/negative/nonfinite weights, exact stitch originals/replacements and bound, same-baseline shared aliases including unchanged faces, legacy stitches, UV/winding/region and lineage controls.
- Independently executed same concrete new test against unchanged baseline: 1 test ERROR in 0.003 seconds, expected refusal: Source3 inferred stitch must retain its exact original raw bank anchor. This verifies the new fixture reaches the old actual validator.
- Independent cross-baseline control: reproduced false acceptance, then repeated with modified face packed to float32 and actual packed/native winding admission. Both returned changed_face_coverage true, inferred_faces 2, deleted_parent_faces 0.
- Read actual interpolation and stitch math: original point interpolates packed native bank cm, repacks once to float32 cm, and checks exact original/replacement vectors plus Euclidean 0.1 cm maximum. Missing vertex_barycentric uses identity and legacy stitch authority. Existing raw-road incident checks remain. Full inferred consistency is incomplete as above.
- Inspected unchanged assembly/readback: new-face winding runs on packed GLB and native cm; parent attributes and retained indices remain; reader compares complete assembled attributes and indices, and inferred references remain distinct from GSI lineage. Optional interpolation does not change the GLB/native coordinate format.
- Verified current native consumer packet hashes and read actual anchors/ledger call sites in Content/Python/shibuya_tools.py, tools/runtime/run_native.py and SupportSource3Admission.h. They bind ledger/face lineage and final GLB metadata rather than independently decoding interpolation anchors. This agrees with the packet's narrow compatibility claim and increases the importance of producer validation; it provides no native admission verdict.

## Required follow-up and resource bounds

HOLD this exact candidate until the incidence finding is fixed and focused review reruns. Integration still owes the full canonical 130 tests, ordinary Source admission of the final complete geometry, and every separate product/native/collision/performance gate. Focused green tests do not replace those gates. No Source, Surface, config, export or native files were changed by this reviewer. Only report.md and pins.json were written under artifacts/source-bank-bary-review-20261017. No browser, server, GUI, engine, subprocess daemon or other persistent task-owned process was launched; all Python processes exited. Inputs/output were checked through lstat ancestry without following reparse points before final pin/report I/O.

Reproduction body after executing the exported runner prefix before `tests = sys.modules` into a scope whose __file__ is the runner path:

```python
t = sys.modules['numeric_grade_tests'].Source3Tests()
s = sys.modules['support_source3']; np = sys.modules['numpy']
ledger, output, admit = t.inferred_barycentric_fixture()
f = ledger['patch_faces'][1]
f['anchors'][0] = {'source':14, 'mesh':0, 'primitive':0, 'vertex':0, 'raw_enu_m':[0.,0.,0.]}
original = f.pop('vertex_edits')[0]['original_native_cm']
output[1, 0] = [0.,0.,0.]
output[1, 1] = np.asarray(original)/100
rows = np.zeros((3,8)); rows[:,:3] = output[1]; rows[:,6] = 1
rows = rows.astype(np.float32).astype(np.float64)
s.admit_new_face_winding(rows, 'cross-baseline alias control', inferred=True)
output[1] = s.native_metres(rows[:,:3])
print(admit())  # Wrongly accepts inconsistent incident inferred point.
```
