# A12 attribution completion review — 2026-10-17

Verdict: PASS explicit A12 on main `0bae7fe46db75acd02b79efba805e6dbf952df99`, executable `e1097edd4f0d65f41e6d6c157def4d51fa877318`. Recommend root closes only A12 for this revision. This supplements [1536 HOLD](1536_attribution-acceptance.md); its original missing evidence and failed full-scene capture remain history.

The contract is plan A12 and the existing source/licence requirements in local-rules, design Licences and `src/world/sources.ts`. No broader legal or publication conclusion is made. Relevant attribution sources/main/index have no working diff. Sources SHA `a785cba3829f7b36f0e36718d955771136524c02bdad74d12c5fa259ac8cea48`; UI SHA `af899a8764a12d8b5eda17e69bf75c487dab8a0fb143405c28934d807be6e3dd` match both runs.

1536 independently inspected native PLATEAU/PDL1.0/CCBY4 permitted, OSM/ODbL, the all-source footer and separate PLATEAU source/processing lines. Its actual expanded DOM contains all three credits and expected licence hrefs. 1537 completes the only missing rendered state: GSI PDL1.0, attribution and separate processing line.

Actual ordinary `/`, 1280×720: real click open, pointer over panel and wheel(0,600), then real click closed. ScrollTop0→132; clientHeight452/scrollHeight584. Actual clip x741..1271, y239.0625..691.0625 contains the complete GSI licence y577.4375..609.3125, source y611.3125..627.25 and processing y629.25..645.1875. Independently inspected the original at native size: all three are readable, including `出典：国土地理院ウェブサイト` and `地理院タイル（標高タイル（基盤地図情報数値標高モデル））を加工して作成`. The summary remains visible after close. Default camera stayed identical; Start remained false.

Evidence under ignored `artifacts/attribution1537/run1/`:

- `payload/attribution-bottom.png`, 1,455,647B: `afd460445395fb08afc810eaa9ec1c30b51748aa595a980de074dac68e1ec98c`.
- `payload/capture.json`, 210,771B: `65f316b1c2772a575bad9ab91be0127f9ff477e723ebe533cf7d68a1bfa60780`; retains full before/open/bottom/after DOM, hrefs, input, clip and served-body rows.
- `temporary-cleanup.json`: `80db22642546c22b48d0831839cdc704f4b56aff79d223bde4391c9f9304c4f4`; fresh census empty, preview port closed, exact temp absent.

Certificate run7f403f3841a95a62 SHA `9ac73ddecd91e219310aa0da16d37bf621c936b5bec74102bfb600fe93d13547`. Actual served HTML/mainJS/CSS exactly match its three build rows; disk pins/certificate unchanged before/after. No UI console/page errors. Overall1537 instrument FAIL is retained for `/draco/draco_decoder.wasm` `net::ERR_ABORTED`; the UI bindings and completed credit observations pass independently. No full-scene HTTP, performance or whole-deliverable acceptance transfers from this review. No gates, product edits or Git mutations by this auditor.
