# 1206 streamed ledger diagnosis

PASS_DIAGNOSIS_ONLY. A known-indentation byte projection was validated against full JSON.parse of the small1198 files: all237 row headers/row slices and1232 top-field blocks matched; all179 host entry/post pairs matched. It then streamed and SHA-256-pinned the existing1203 files, reconciling all237 literal plan IDs/targets/statuses and all219 entry/post pairs unchanged. Counts remain214PASS/oneRUNNING/22DID_NOT_RUN. Only311062bytes of the host prefix were parsed; the176MB benchmark subtree was not loaded or copied.

| Serialized ledger region | Bytes |
| --- | ---: |
| Whole ledger |160241718|
| native/duplicate-domain-key row |157230158|
| Its actual / result blocks, each |78614950|
| changedFacts, each copy |51725472|
| changedFacts.before / after, each copy |25831206 /25894117|
| restoration.actualRestoredFacts, each copy |26878899|
| Events field |71502|

One row is98.1206% of the ledger. Its actual/result value blocks are byte-identical. Sixteen rows have identical actual/result blocks; the duplicate result blocks total79285813bytes. These field counts include serialized property/comma/newline bytes; nested regions overlap and must not be summed.

The direct cause is binding-calibration.mjs:12–13: duplicate keys disable arrayKey, then unequal lengths fall through to a whole before/after value. The duplicate is authored at line36. Line26 materializes the full restored array through readPath(line14). The baseline file itself is referenced by pin; large changed/restored array witnesses dominate. calibration-status.mjs:66–67 stores the same evidence in actual/result, and line43 rewrites the accumulated ledger. That recorder behavior remains unchanged.

The proposed narrow repair uses a keyed recursive diff only for the same unique selector on both sides, with exact key-sequence/order facts; otherwise positional max-length differences plus length and explicit presence facts. No Map may collapse duplicates. Restoration must resolve one selected value, prove fresh equality/presence before a thin baseline reference, and retain full actual mismatch evidence. Fresh signatures/rebuild/native predicates remain. Root1208 selects implementation separately; this diagnosis makes no source repair or subject run.

Attempt1 refused a quoted array value mistaken for a property key:6.6814ms algorithm wall,31.25ms direct Node CPU; its source/result/receipt remain. The metadata-only variant corrected classification and added bounded error context. It passed in1115.8652ms algorithm wall/1469ms pre-report CPU; direct Node1515.625ms CPU, native controller156.25ms CPU, controller span1313.7669ms. Both Nodes exited with complete streams/disposal; exact births are in handoff.json for independent root closure. No giant payload was parsed/copied; source-layout assumptions and unknown reporting/tool/model costs remain explicit.
