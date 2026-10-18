# Review 1613: implementation — static-pilot dependency-provider repair

## Target

Private curb1637 launcher setup repair after the first candidate attempt failed preflight, on maps documentation base `67abb9734a0e0da67382603658880d3c7cde35ff`. Only `artifacts/curb1637/run-owned.ps1` changed:12,559 B, SHA-256 `0c6a9b60e6c1bce447cde0109e803f3a919beb025dc59043d017af3430abc3b1`. The exact narrow patch is `artifacts/curb1637/setup-provider.diff`:2,067 B, SHA-256 `8b583f30250802096745bdcc402f6d56c1c4c9ef906c62d8fa6ea74a4b6080a4`. The checked provider receipt is `artifacts/curb1637/setup-provider-receipt.json`:6,208 B, SHA-256 `199a497b71ffba3526f8d51c21a506e4f40331afa4747e887cd2f01b7c0689c6`; the16-file preservation receipt is `artifacts/curb1637/preflight1/archive-receipt.json`:5,345 B, SHA-256 `95b28972279a4167f9bb7e19a4c1d97d2893d2de011c8730f5a225f7d7f095b5`. Private originals remain retained. This is not a repository product change. The uncommitted curb geometry remains [1611](1611_implementation.md), with unchanged author freeze `5e82b1bc99c6c41d20935c0cfdbe1994db0139e98e2c62b73e0a4098c96896fd`.

## Reviewers and coverage

Implementation owner `/root/curb1637_capture_prep` diagnosed the actual setup refusal, preserved its raw evidence and changed only the dependency-provider operands. Its authored local checks below cover actual CPU resolution, registry/executable existence, PowerShell syntax and exact inverse. This handoff is not independent runtime, cleanup or appearance review. Root owns independent recheck, fresh release/lease binding, serial dispatch and native inspection.

## Reports

### 1637 capture preparation owner

Original authored report: `artifacts/curb1637/setup-provider-fix.md`;2,424 B, SHA-256 `d57d33f9274b2382aaf7b08f22226aeeb2746fc5ed6747be8f91eba9951bc3a0`. Exact authored bytes retained below.

```markdown
# 1637 dependency-provider setup repair

The failed candidate attempt is preserved before the edit in `preflight1/`: 16 raw files, including the old launcher, both releases/leases, source binding, readiness review/receipt, candidate error/log/supervisor/resources and paired handoff. `preflight1/archive-receipt.json` binds original paths, lengths and identical copy SHA-256. Baseline originals/results remain in place. Old current releases, leases and binding were not overwritten.

Cause: candidate `node_modules` holds only Vite caches. The prototype used valid ancestor package resolution, but the launcher required workspace-local registry/esbuild paths. Actual `capture.mjs` static imports resolve primary Playwright 1.63.0 and Vite 7.3.6; Vite resolves primary esbuild 0.28.2. Copying guard files would not change those providers.

Fix: only `run-owned.ps1` changed. It now declares the actual primary dependency root and uses it for the Playwright browser registry and esbuild executable allow-list. Selected workspace still owns scene/build/config/source/harness paths. `setup-provider.diff` is the exact narrow diff. No package installation/copy or adapter expansion was needed.

CPU checks PASS: actual ESM/provider resolution, registry revision1243, executable existence/hashes, PowerShell ParseInput with zero errors, and an exact inverse comparison to archived launcher bytes. Capture, external supervisor, safety predicates, release/import tools, existing releases/leases/binding and candidate author-freeze bytes remain unchanged. Query, recipes, deadlines and ownership logic are byte-identical. The first author inverse check exposed an added-block newline mismatch; final insertion uses the archived anchor-local newline and exact inverse now passes. No assertions were relaxed.

Current launcher SHA-256: `0c6a9b60e6c1bce447cde0109e803f3a919beb025dc59043d017af3430abc3b1`. `setup-provider-receipt.json` records resolved entrypoints and all checked source/registry/executable hashes. No whole-runtime rehash, product/cache/build/WT/dependency edit, browser/server/GPU launch, retry or full gate occurred.

Frozen for independent focused review. Root must create a new candidate release/lease before dispatch; old bindings correctly name the old launcher. Strict profile-support failure and stale ordinary walking packet remain OPEN. This setup repair grants no product adoption or runtime-success claim.

```

## Findings and disposition

The initial candidate FAILED_PREFLIGHT because the launcher required a candidate-local Playwright registry, while actual imports resolve the primary providers. No candidate Node/browser/capture/pixels ran in that failed attempt. Baseline's completed four-image static result remains separate. Root accepts the narrow setup repair for independent recheck: add the actual primary dependency root and use it for the registry and esbuild allow-list; selected workspace still owns scene/build/config/source/harness inputs. Copying registry files or installing another provider was unnecessary.

The report's unchanged old releases/leases describe its authoring boundary. They must not authorize the corrected launcher. Subsequently, root's release generator refused overwrite; root preserved the old candidate release byte-for-byte at `artifacts/curb1637/preflight1/candidate-release.original.json`, SHA-256 `a114de85bfa42113b9f784ae427d27d6ddc04d3192e57d2a0ea0b1ccb14947e3`, before generating fresh candidate release `9b97234a0a8dde784282c3532df0cea845e9c2f1929b4578c3abcfd42c8dac5b`. This later binding action does not rescore the failed preflight or establish successful execution. The initial author inverse collector's newline mismatch was corrected against the archived anchor-local bytes; no subject assertion was relaxed.

## Verification

Documentation preparation verifies the original report and named diff/receipt/archive/release hashes, preserves the authored body verbatim, and checks standard sections, local links, exact staged scope and whitespace. It does not rerun provider resolution, syntax, the inverse control or any launcher. Author CPU checks retain their stated bounds. Product source/cache/build/dependencies, runtime aggregate, GPU/browser/server, corrected capture, cleanup and full gates DID_NOT_RUN in this implementation handoff. No product adoption or default/Start acceptance follows; strict profile-support FAIL and stale walking dependencies remain OPEN.

## Round outcome

Narrow private setup repair prepared for the independent [1614](1614_integration.md) recheck and a newly bound controlled-static attempt. Old failed evidence remains retained; actual corrected execution and paired appearance remain separate later outcomes. All35 plan identities and14 criteria remain intact; none closes here.
