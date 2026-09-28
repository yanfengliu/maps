# Certificate BOM follow-up 271c

Accept272's narrow correction for a fresh, separately admitted A→B pair. No actionable finding. Historical271b remains unchanged: it missed the real cross-language boundary where Windows PowerShell wrote UTF-8 BOM bytes and Node's JSON.parse rejected them. A270 succeeded; B stopped at capture.mjs:31 before browser/server. Both cleanup certificates report no remaining owned resources.

The actual A certificate starts EF BB BF and retains SHA-256 `50b57d0de6445a63ad8a6d365a5ff892bc42548d0cc4efce579bea314676b4a4`. I reconfirmed its old raw parse fails and the corrected UTF-8 decode plus one leading-U+FEFF removal succeeds. The delta is exactly two certificate reads in capture.mjs and compare.mjs; comparison applies decoding only to complete.json. Raw file hashes, strict passed=true, admission/freeze/arm checks and all other consumers are unchanged. Observer, contract and both launchers are byte-identical270 copies. The374 prior descriptors and arm bindings are retained; all14 added descriptors were hash/length checked.

Inspected21 recorded controls executing the exact old/new consumer source sections against the retained certificate: both old boundaries fail, both corrected boundaries and BOM-free input pass; malformed JSON, BOM after whitespace, double BOM, non-boolean/false success, wrong admission/freeze and wrong comparison arm are refused. The comparison probe substitutes its directory/context only; it does not execute native code. Its initial missing admissionPath variable failure is retained and corrected without runtime edits. Syntax/import-refusal/PowerShell preflight passes. No new framework, source change, GPU/browser/server run or default266 implementation occurred in this review.

Accepted SHA-256 identities:

- 272 binding-index.json: `44a469daf938a18ae94343d04794fc52cf9d4b1d6befb26647b1c2fc299b4fe3`
- 272 delta.patch: `fccf8430769990616efca709a56d041ddd738c596a3bdd3b12402e54cc63e2f9`
- 272 bom-check.json: `f8525d5e136a9814333e9bb0ae7e009b4e5401e92e2a4d0ce1ae14d7ef1fb5e7`
- 272 preflight.json: `f25da944d3f49ed8847be778e9d29ac1caa61a4b8dba43576339c3cd77f41e14`
- 272 capture.mjs: `c5c4b5c223a3c4b27410099e93c0f87d42dde2c82648e8e04c812d9e8980165a`
- 272 compare.mjs: `4855c7512df945159d8d47ec25758782c0cf383b54b8a7e80771dc860bb6cf13`

Final sealing may add this report/index only. Native results and root admission remain separate. Only this follow-up was written; no persistent resources were created.
