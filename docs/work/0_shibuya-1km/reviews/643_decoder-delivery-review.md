# Decoder delivery review

Independent worker: decoder_delivery_review. Recorded 2026-10-11. Read-only diagnosis of Vite preview, HTTP delivery and browser request reporting under the fixed reproduction and disqualifiers in [641](641_decoder-search-plan.md). No browser, server, build, install, GPU work or Git command ran. This authored review is the only edit. Source-reader lease is closed. Root owns runtime admission and integration.

## Finding and bound

No causal Vite delivery defect is established. The current canonical certificate does not answer whether its decoder request emitted the same failure: the canonical error collector listens to console errors and uncaught errors, not `requestfailed`. Its green result remains valid within that bound. It cannot serve as a zero-request-failure control for 631/636.

Tree 636 retains a main-frame GET/fetch request at 07:28:52.001Z, response 200 at .086Z, then `net::ERR_ABORTED` at .101Z, with no requestfinished event. Its main document did not navigate again before page closure at 07:29:07.132Z. At 07:29:07.128Z its retained observation reports ready:true, frame 204, error:null, loaded 67, failed 0, pending 0, idle:true and 44 prepared final leaves. The strict assertion then refuses the capture on the recorded error. The abort is real evidence; it is neither proof of failed decoder initialization nor a teardown event. No original or geometry comparison was produced.

Cache 631 retains its startup refusal at 07:26:37.327Z, about 2.088 s after startup entry. The failure observation has ready:false, frame 28, loaded 6, failed 0 and pending 61. Page closure begins later at 07:26:37.562Z. Its top-level failure stack points to the final cleanup assertion, while the nested startup.failure preserves the earlier request-error refusal. It has no decoder event record for the prerequisite context; decoderRequestSequence 0 does not mean no request occurred. No measured ABBA arm ran.

## Source facts

- Installed Vite 7.3.6 CLI `preview` calls the same exported `preview()` API used by the private runners (`node_modules/vite/dist/node/cli.js:665`; `dist/node/chunks/config.js:35150`). Native CLI config loading and importing the config with configFile:false differ in entry plumbing, but both pass a resolved plugin list through configurePreviewServer before compression/static asset middleware. A distinct programmatic HTTP implementation is absent.
- The mount resolves three.js's installed `gltf` decoder directory through createRequire. For this GET it emits 200, application/wasm, content-length and no-store, then pipes createReadStream into the response (`tools/vite/serve-scene-data.ts`, serveSceneData/middleware). The same code serves preview and dev. Dist location, publicDir:false and Vite cacheDir do not change that decoder mount. The source supplies no stream-error/completion receipts, so a successful stat and response 200 do not establish complete delivery.
- Provenance correction: actual 631 imports workspace vite.config.ts and workspace serve-scene-data.ts; actual 636 imports their PRIMARY counterparts. The actual importedTs records confirm this. Config SHA-256 is identical. The scene-server source differs only in CRLF versus LF: workspace 5,146 bytes/127 CRLF, PRIMARY 5,019 bytes/127 LF, with the same normalized SHA-256 `0cffde0bdce85e5b72fceff1d430c17b57171744f9aef14a9f7bf77a995b8b9d`. Workspace data is a real directory; its node_modules is a junction to PRIMARY. Do not describe 631 as importing the PRIMARY path, or infer identical scene mounts solely from config text.
- Installed three 0.180.0 DRACOLoader starts wrapper/text and wasm/arraybuffer FileLoader promises together, awaits both, puts wasmBinary into worker configuration and only then creates the worker blob (`examples/jsm/loaders/DRACOLoader.js`, _loadLibrary/_initDecoder/_getWorker). This path does not use instantiateStreaming. FileLoader receives the response, reads its stream and resolves an arraybuffer (`src/loaders/FileLoader.js`, load). MIME or an absent wasm mount is not demonstrated by a 200 response followed by successful scene readiness. Application cancellation logic is another worker's scope.
- Installed Playwright 1.63.0 maps Chromium Network.loadingFailed into requestfailed, retaining errorText while passing canceled separately to its frame manager (`playwright-core/lib/coreBundle.js:36376`, `:23325`). The public failure object here exposes only errorText. These receipts do not identify who cancelled, a server-side stream error, the exact consumed bytes, or the decoder promise outcome.
- Canonical `tools/visual/page-errors.ts`, collectPageErrors, has only console/pageerror listeners. The checked primary certificate run `dc500f31f40a7746` names RTX 4090/driver 616.64. No retained canonical decoder event sequence was found in the reviewed certificate or collector. No claim about canonical requestfailed behavior follows from their green result.

## Smallest discriminating probe contract — PREPARED, UNRUN

Before another candidate campaign, root can admit one ordinary startup of the already certified canonical dist on its canonical CLI preview/browser path, adding only selected request metadata and the unchanged strict request-error refusal. This is a diagnosis, not a replacement certificate or candidate qualification. No build, application copy, source/cache/decoder change, retry, body refetch, body reader or CDP session is needed.

1. Pin current canonical dist against the certificate and pin the installed graph/decoder plus scene mounts before entry. Run on PRIMARY, canonical port 4319, the existing headless hardware launch flags and canonical context shape. Use `/` and retain the actual query. An input change refuses reuse of the original-graph control; a deliberately changed graph must be recorded as a separate diagnostic.
2. Before navigation, attach request/response/requestfinished/requestfailed listeners for `/draco/draco_decoder.wasm`, main-document navigation/close metadata and all existing console/pageerror checks. Preserve every failure before asserting. Poll the existing ready/tiles/hardware observations without modifying state. Capture no originals and run no comparison arms.
3. Keep the inherited 220/240/300 s finite owned work/cleanup/outer bounds, one browser/server/GPU owner and finally cleanup. Before deliberate teardown, retain the ready/status/decoder event record and assert all request errors empty. Teardown errors remain separately timed and still refuse. Check the exact owned process identities/listener and TEMP cleanup after exit.
4. If the same pre-teardown decoder abort occurs, the canonical green-versus-private-red difference is an observation-coverage difference within this input, so a programmatic-only delivery explanation loses its current support. If canonical startup has no abort, record that bounded control; it does not yet isolate preview API from private entry/observers, browser-server connection, URL or scheduling differences. The next discriminator must change one of those, rather than rerun a whole campaign.

Server completion remains the next precise gap if the canonical control reproduces. A selected-request observer placed before the existing mount can record response finish/close/error and writableFinished, with request aborted/error and monotonic ordering, without rewriting bytes or fetching them again. Finish means server output completed, not browser consumption. Close-before-finish distinguishes an incomplete response; finish-before-browser-failure shifts the gap to browser/consumer cancellation. Neither result alone names the cancellation call. This conditional probe is proposed only; no implementation or dispatch is claimed.

## Evidence bindings

Paths below are relative to the workspace unless marked PRIMARY (`C:/Users/38909/Documents/github/maps`). Hashes bind the actual raw files read; no raw evidence was changed.

| Input | SHA-256 |
| --- | --- |
| artifacts/cache631/native.mjs | 5c768ac22f92c1f0fdfd39f3587d7cd942822a8044676b87614f1fb7030186e6 |
| artifacts/cache631/native-inspection.json | 8403720515280ce3d542c42da460de5777848d1b8c8cac9a933a4e8af6035171 |
| artifacts/cache631/run.log | d562f1e7463e9ed5b63acfed83518cb6bdb0fef892052c628742634f4dd2ec62 |
| artifacts/tree636/pilot/native.mjs | ce812da34bf38a297de53965bcb1dc45ac5d8bbc968995f6138757d4e236ac68 |
| artifacts/tree636/pilot/native-inspection.json | 5fb87599ccbbedcfe703c7e0461e8e3985150fb436daaf29a727975f422dc308 |
| artifacts/tree636/pilot/run.log | 6931d7491b6df92139714c437f7d8c5596216d8e3aadf66af32fafbf2ed536d6 |
| PRIMARY vite.config.ts | 900afe81bc4580d4e20a9fafbcebe8d4747368fabe35e007ad3949417f4e7165 |
| workspace tools/vite/serve-scene-data.ts | 5b31926fe7335ffbd8c450f183345de3c6fd2383f71150e832f3b68f433e29cb |
| PRIMARY tools/vite/serve-scene-data.ts | 0cffde0bdce85e5b72fceff1d430c17b57171744f9aef14a9f7bf77a995b8b9d |
| PRIMARY node_modules/vite/dist/node/chunks/config.js | c2fcfa51206dc1f8d22120ef4a82af8b9acdc02f4476520b6a0897d12a724ba3 |
| PRIMARY node_modules/vite/dist/node/cli.js | 6b9001816eb5fb0979cbe380ed2116db93e315ff22ebf7fe55a4fc60458fa067 |
| PRIMARY node_modules/three/examples/jsm/loaders/DRACOLoader.js | 7a4a51c694a6c9f983be452cc82b365e69ce08424654e3f245b4115e6efef258 |
| PRIMARY node_modules/three/src/loaders/FileLoader.js | 848679ec402f63cfa73ee7d4ba23b250e2a460be41d1f7160dcc2ec0262f0336 |
| PRIMARY node_modules/playwright-core/lib/coreBundle.js | 549070af3acabb3efcc4f55bfe6210f9f7c2fcf633cf7eaa59bfe60719969171 |
| PRIMARY tools/visual/page-errors.ts | c41a83bf4367c09c02f336a0c81092ba0c4b7d314f1901af302d059a4fb2887d |
| PRIMARY artifacts/visual/complete.json | 5f7aea7474c798763c8cfdd28849a92954b26b218980f89ccf6b22de2b48ac69 |

The attempt is a source diagnosis with a prepared discriminator, not a fix. Current failure causality remains unknown. Strongest proved part: canonical and private request-error verdicts are not comparable from the existing collector/certificate, while the Vite preview/decoder serving code contains no identified private-only delivery mechanism. Shared baseline requirements and failed receipts remain intact. Total runtime work: 0. Source-review elapsed time and token cost were not independently measured.

## 644 preparation — unrun

Root authorized preparation of the single canonical probe after accepting 642/643's common gap. Five files now live under ignored `artifacts/decoder644/`: prepared.json, rebind.mjs, playwright.config.mjs, probe.spec.mjs and run-owned.ps1. Prepared manifest SHA-256: `c6cb01a651048a30a87e4bdcb7e858226a495c1a607b39c19f76d02eeaae8070`. It seals the four helpers and the unchanged process-ownership.ps1 helper. No dispatch.json or runtime receipt exists.

The private config derives the canonical Playwright chromium fixture/device/hardware arguments and `npm run preview`, with server cwd PRIMARY and strict port 4319. Explicit headless mode is retained. Trace, body capture, images and comparison arms are absent. The spec keeps the complete observed pose/readiness/error state before assertion, retains selected wasm Request objects in a WeakMap, records response/finish/failure/document timestamps and refuses every console/page/request error without filtering. Unobserved transfer/consumed/decoded byte counts remain null; missing request completion refuses. Metadata does not establish decoder consumption or promise completion.

The owner is a minimal adaptation of accepted cache631/run-owned.ps1 (source SHA-256 `808a36331c7a2b20558dbd0d623e548b131d752495b8c1ab9ce7dd2b331be4fe`). It retains live-parent handles and uses the same process-ownership classifier. Bounds are 80 s native work, 90 s fixture/runner closure and 120 s outer cleanup, superseding the earlier proposed 220/240/300 s diagnostic bounds. Available preflight/final CIM inventories, an empty exact owned process/listener census and TEMP removal are mandatory. Playwright/npm caches are assigned owned paths. No broad process termination is added.

Only after root closes the installation, inspects all five successful gate outcomes and freezes writers may rebind.mjs run with `--gates-closed --prepared-sha256 <the hash above> --certificate-sha256 <post-install certificate hash> --build-receipt <path> --types-receipt <path> --unit-receipt <path> --visual-receipt <path> --audit-receipt <path>`. It pins the new canonical build, source/helpers, installed files, mounts, executables, certificate and receipts. It refuses changed prepared helpers. Receipt hashing is not proof that a gate passed; root must inspect the outcomes. Mutable .cache/.vite/.vite-temp directories are excluded from the installed-source claim. The fresh dispatch.json SHA is then the required `-PreparedSha256` argument to `pwsh -NoProfile -File artifacts/decoder644/run-owned.ps1 -HumanApproved` from FRONTAGE cwd.

All three JavaScript files passed Node's parse-only `--check`; the owner passed PowerShell AST parsing. No module imports, dependency reads, actual browser/server/build/install/GPU work or Git command ran during this preparation. The source-reader lease is closed. Configuration collection, actual request timing/readiness/hardware, immutable-input closure and available owned cleanup remain unrun observations. Root must review the sealed preparation before dispatch; no instrument qualification, correction or appearance acceptance is claimed.
