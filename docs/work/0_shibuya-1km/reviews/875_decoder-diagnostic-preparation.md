# 875 — passive decoder diagnostic preparation

**Frozen private diagnostic caller; runtime remains unrun and withheld.** This implements874's bounded passive timeline on the unchanged866 A/B source/build assembly. It does not fix or establish the cause of873's baseline wrapper abort. Frozen869 caller/wrapper/template/receipt and all historical862 evidence remain unchanged.

The three new capture files are beside869 under `artifacts/sign869-preparation/`; patch/check/receipt are under `artifacts/sign875-diagnostic/`. Both are ignored FRONTAGE paths.

| New file | Bytes | SHA-256 |
| --- | ---: | --- |
| `caller-diagnostic.mjs` | 38,775 | `6d46078cbc6528b27131d46351dd1d2e78dc86e1200defff618018f85e8d1b4b` |
| `run-diagnostic-owned.ps1` | 8,172 | `9b77ea61ccdc1c570312db15ea48cd6e2db15b2347045f914642ebd2ae7ff7e5` |
| `diagnostic-template.json` | 15,599 | `7090c2eb34f825697fc6b6668f4aebaf89b494066203182be9cba023d239d17b` |
| `diagnostic.patch` | 13,901 | `b19f1e4103c11484399a1a4aa0956fe9f151acf9b76a0caaa88243d6293a61c2` |
| `static-check.log` | 325 | `098018a5c8a930a114173a494d0516f68e7e6970d9138e755a5d52bc255f0c06` |

The caller adds one Node errorMonitor import, one private passive block and three registration calls. The existing strict Playwright/CDP callbacks remain in their original order. Passive CDP callbacks register afterward, before the existing Network.enable/navigation boundary. The original response/hash/body populations,32MiB/512MiB/256-response/serial limits, refusals, four native controls, held singleton/TAA32/44-leaf requirements, zero PointLight delta and cleanup remain unchanged. No interception, replay, refetch, header/source alteration or body consumption was added.

Only `/draco/draco_wasm_wrapper.js` and `/draco/draco_decoder.wasm` receive decoder events. CDP records requestId/timestamp/wallTime, initiator, loader/frame/type/document IDs, response headers/cache/service-worker/connection/timing metadata, accumulated dataReceived counts/lengths/timestamps and raw loadingFinished/loadingFailed fields. Ordinary Playwright requestfailed and main-frame navigation, plus context-close events, receive Node receipt timestamps. Protocol timestamps and Node wall/monotonic receipt clocks are kept distinct; the log does not assume they share an origin.

The preview server observes only those two request paths. It appends listeners after Vite's existing handler, reading request/response end/finish/close/error state, Content-Length, writableFinished, status and available socket counters. Error listeners use Node errorMonitor, which observes errors without handling an otherwise unhandled error. No stream is read or resumed. Socket deltas run from the passive request-listener snapshot to its event; synchronous earlier bytes may already be outside that interval, and connection reuse may include headers or other requests. These counters are not response-body proof and cannot replace actual CDP body hashes.

Each arm retains at most128 diagnostic events and16 requests per CDP/server surface. JSON fields cap at4,096 characters; dataReceived is aggregated rather than storing every chunk. Truncation/discard counters and up to eight bounded logging errors remain visible. A partial timeline cannot establish cause. Logging failures do not waive any existing capture refusal. These bounds cover added diagnostic records, not whole-process RSS, protocol payload memory or performance overhead.

The wrapper is byte-identical to869 except that its invocation names `caller-diagnostic.mjs`. It retains the869 environment/marker/output namespace, exact borrowed ownership AST, headless/hidden launch and220/240/300-second work/cleanup bounds. The template changes exactly the two caller/wrapper helper pins. Assembly112,259/`7f8c5ed9439e25058a55cd5ddd378044570ee66eb58e3c8dccfebb4b2dfcb5e2`, all478 source rows per arm, all six saved A/B sources and distinct six-file build roots are unchanged. Admissions remain false; output/port/marker remain null.

Node syntax and wrapper AST parsing pass. One exact source-only diagnostic caller dispatch passed exit0, A478/B478/builds6/6/runtimeAdmission:false, using the actual diagnostic-template hash and restoring its environment afterward. The diff was inspected; no old callback, assertion, control or cleanup body changed. The five new frozen outputs total76,772 bytes before receipt, below the512MiB owned-output bound. A draft wrapper filename substitution missed because its search string expanded a PowerShell variable; the corrected literal matched before syntax/static checks. This never launched runtime or changed the frozen wrapper.

Only these private outputs and this authored record were written. No build, browser/GPU/server, product/Git/data mutation, capture or retry ran; no browser/GUI/server resource was created. `artifacts/sign875-diagnostic/receipt.json` pins the outputs and preserved869 originals. Independent source review and root's one fresh finite lease remain before diagnostic capture. If it passes,873's abort cause remains unresolved. If the same abort repeats, join the actual browser/server timeline and stop before any production change or tuning. No current pixels, cost, adoption or full-map acceptance follows from preparation.
