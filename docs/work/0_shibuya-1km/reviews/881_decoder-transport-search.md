# 881 — independent decoder transport search

2026-10-12. Fresh read-only owner for the preview/HTTP/server mechanism family. Fixed contract: [879](../879_decoder-body-search.md), qualified PRIMARY main815d9c3d, frozen866 A/B sources/builds, strict actual served bodies, four paired native dusk originals, unchanged scene/GPU and owned cleanup. No favored explanation or earlier diagnosis was used. This review does not adopt a product or instrument change.

The strongest proved result is that the failed B wrapper reached a normal Node response finish with the advertised size and an open socket, while Chromium subsequently reported cancellation. The evidence rules out an observed premature Node response close, an incorrect advertised wrapper length, ordinary Vite compression of this route, and planned arm teardown as the immediate trigger. It does not prove that B received the exact wrapper bytes or identify who canceled their consumption. No transport repair is supported yet.

## Inspected evidence and identity

Raw878 is `artifacts/sign869-preparation/run-diagnostic-9646e93e61ff44a1b93f3e2d43e4bd4f/run.json`, 351,712 bytes, SHA-256 `f0e30e29f347541ea17d241c5418b198bd2b9fd9e02a749b67dc79f7fabd8e08`. The passive diagnostic caller is 38,775 bytes / `6d46078cbc6528b27131d46351dd1d2e78dc86e1200defff618018f85e8d1b4b`. Both pins match879. `artifacts/decoder881-transport/receipt.json` binds all directly inspected local sources and the derived rows to this report.

The caller actually imports PRIMARY `vite.config.ts` and installed Vite through PRIMARY's package resolution. Inspected PRIMARY and FRONTAGE copies of `tools/vite/serve-scene-data.ts` match at 7,239 bytes / `51a4705dba74eda520da12edacaa1168e929e9c52c5d6b77a6f5105858abd1aa`; config copies match at 2,430 bytes / `ca6db04746d2d8798dfebfc153edff07716e03b69646451871d953f9c2984baf`. Installed Vite7.3.6's `dist/node/chunks/config.js` is 1,336,507 bytes / `c2fcfa51206dc1f8d22120ef4a82af8b9acdc02f4476520b6a0897d12a724ba3`.

The inspected wrapper is 58,456 bytes / `8bb2952d2ba7d67e1414f8df819410cb0434a666be53f671fff75f68843d76f6`; WASM is 192,420 bytes / `a680d927bed9cb864ddbd63521868891af2bfbe755092761b4837487618df8ac`. A's actual CDP body witness matches those bytes. B's WASM witness also matches; B's wrapper has `bodyIdentityClaim:false`, without an actual retained body. Source hashes cannot fill that missing witness.

## Actual server and browser ledger

| Observation | A1 wrapper | B1 wrapper |
| --- | --- | --- |
| Server request receipt, caller monotonic ms | 3090.1093 | 23939.8055 |
| Server finish, caller monotonic ms | 3092.0342 | 23944.5667 |
| Server close, caller monotonic ms | 3092.0856 | 23944.5906 |
| At finish/close | status200; length58456; finished/sent/GET-complete true; request-aborted/socket-destroyed false | same |
| Socket write-counter interval | 58667; remote50842 | 58667; remote62024 |
| Browser terminal event receipt, caller monotonic ms | loadingFinished3169.1669 | loadingFailed24140.8078; ERR_ABORTED; canceled true |
| CDP data event totals | data58456; encoded58456 | data58456; encoded3885 |
| Retained wrapper body | exact length/hash | absent |
| Context close receipt, caller monotonic ms | 22193.1436 | 38598.0274 |

A has18 decoder timeline events; B has19. Both have two server decoder requests, zero discarded events/requests and no diagnostic listener error. Both wrapper responses have `content-length:58456`, `content-type:text/javascript; charset=utf-8`, `cache-control:no-store`, HTTP/1.1 and keep-alive. Neither has Content-Encoding or Transfer-Encoding. The wrapper's advertised length equals the inspected file size. B's server finish precedes its cancellation receipt by196.2411ms in the same caller clock; B context close follows cancellation by14,457.2196ms. These receipt intervals are upper observation gaps, not network or consumer execution times.

A's wrapper and WASM used the same server-side connection,50842, and CDP connection60. B used separate server-side connections,62024 and60910, with CDP connections575 and565; all were reported reused. Those are observed layout differences, not a cause. There is no counterfactual connection experiment.

Raw878 has130 response records per arm. A has130 successful body witnesses and two originals. B has129 successful witnesses, the wrapper cancellation/retention error pair and zero originals. The run remains RED, with `httpBodyIdentityVerified:false` and `appearanceCaptured:false`. Native pixels were not inspected in this transport review.

## What the implementation establishes

PRIMARY `serve-scene-data.ts`148–155 sets200, MIME type, `Content-Length` from stat and no-store, then pipes the read stream to the response. The matching mount does not call `next`. Installed Vite config.js35194–35207 registers CORS/host validation, runs configurePreviewServer hooks, and only afterwards installs its compression middleware. Thus the scene/decoder mount stops the Connect chain before the compression wrapper. The compression implementation would add Content-Encoding and remove Content-Length when active; neither change appears in these decoder responses. Small B `encodedDataLength` is not evidence of server gzip.

The passive server observer records response finish/close and request end/close/error but does not record socket close/error or read-stream events. A response close after finish while the socket is not destroyed is consistent with normal per-response completion. It is not evidence that the connection was shut. On Node, finish means the response bytes have been handed to the operating system, without promising receipt by the client; request `complete` describes the incoming GET message. Those are distinct bounds. [Node24.12 HTTP semantics](https://nodejs.org/download/release/v24.12.0/docs/api/http.html#event-finish_1).

The current Node executable at the actual owner-receipt path is version24.12.0, 89,935,872 bytes / `2ffe3acc0458fdde999f50d11809bbe7c9b7ef204dcf17094e325d26ace101d8`. Raw878 pins its process path, not this binary digest/version; this fresh witness must not be mislabeled as the run's historic binary pin. Installed Playwright metadata names Chromium153.0.8010.12/revision1243, matching the process path's1243 directory. No executable was launched to obtain either observation.

The caller's closeArm disables/detaches body CDP, closes the context, then closes the preview server. Its ordinary control flow reaches that closure after captures/drain; the failure finally path also begins closeArm. The B abort was already recorded14.46s before context close, so that planned closure cannot explain the immediate abort. No page navigation after initial B navigation is in the recorded decoder timeline.

The CDP body observer only calls `getResponseBody` after loadingFinished. It never requested B's wrapper body after loadingFailed. Its absence is therefore a failed strict witness, not proof that Chromium had no body storage. Data counters do not prove byte identity. Also, A's protocol loadingFinished timestamp1217113.657956 precedes responseReceived1217113.674566 and dataReceived1217113.703578, although their receipt order differs. Do not sort these mixed protocol emission points into a causal story; retain their raw fields and compare the caller receipt clock separately.

## Hypotheses, confidence and one discriminating check

High confidence within the inspected trace: the Node response did not report premature completion, the HTTP wrapper length/header policy was consistent across arms, and planned teardown came later. High confidence: Chromium reported cancellation rather than a successful wrapper loadingFinished. Low confidence: any claim that bytes were lost between kernel handoff and Chromium, or that a particular application reader/loader canceled them. The current trace does not contain the necessary socket or cancellation-owner evidence. No inference here establishes a harmless abort, a retention-cap cause, or a B actual-body identity.

One minimal next check is a passive Chromium NetLog on one root-leased, unchanged strict A/B run: add only `--log-net-log=<owned ignored run>/netlog.json` at the existing headless launch; keep default capture mode, source/builds/requests/controls/body assertions/deadlines and cleanup unchanged. Verify the emitted constants/capture mode, preserve the complete file after browser closure, and trace each wrapper URL request through its `source_dependency` links to the HTTP transaction and socket. Inspect response headers, HTTP_TRANSACTION_READ_BODY completion/errors, CANCELLED/FAILED and SOCKET_READ_ERROR/SOCKET_CLOSED in the log's own clock. This uses the network stack's existing instrument, without refetching, intercepting or consuming a second response. Chromium documents startup logging and the relevant network events. [Startup NetLog](https://www.chromium.org/for-testers/providing-network-details/), [event definitions](https://chromium.googlesource.com/chromium/src/+/HEAD/net/log/net_log_event_type_list.h).

The discriminator is whether the network transaction/socket records a read or framing failure before cancellation, or instead completes the HTTP body before a later URL-request cancellation. The first supports a transport mechanism; the second sends causal ownership above transport. A missing, unmatched or incomplete NetLog leaves the question unresolved. Default NetLog byte counters do not meet actual-body identity; this probe earns no acceptance by itself, and a warm or failure-free run alone does not resolve the original abort. Do not change headers, compression, timeouts or connection policy without that evidence.

## Remaining gap and closure

Exact remaining gap: B's actual wrapper body is unretained, and no recorded event identifies the socket-to-browser delivery boundary or cancellation owner. The frozen four-original comparison remains incomplete. A server implementation patch is not justified by this search.

This owner launched zero browser/server/GPU/product processes and ran no build, gate, fetch or runtime capture. All tool commands completed; no owned background process was created. Only this authored review and its ignored receipt were written. Raw878's cleanup files were inspected: six native closures true, available census with admitted-live/omitted-live/descendant/ownership-unavailable/marker/port populations empty, and owned TEMP removed. That is historic878 closure evidence, not a new census. Existing experiments, evidence, Git state and shared inputs were preserved. Search cost: one finite read-only investigation; fresh runtime attempts0; total wall time/compute not measured.
