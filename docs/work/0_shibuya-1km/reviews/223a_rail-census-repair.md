# Rail223 census repair for R227-1

2026-09-27. Prepared and frozen for independent reviewer217. Only the artifact executor changed. No product, geometry, copy method, source data, dependency package, browser, server, GPU, capture, full gate, Git commit or push was changed or run.

The new executor digest is 492faef5ef841be5c1ed5aa5fd0f8a1ce3becd8063ea75be44d38bd431a43d64. executor-freeze.json SHA-256 is b22e5ac2dfd0f40fb2f1e3542bc95484e91010e7e953a79e210fb2f266b21a9e. The previous eaa808efb76e6a1ebcb80a3746e24e86fc3affe122d48ce113c60e8f9428cf5b freeze and exact original executor files, runtime freeze, report and evidence seal are retained in source-before/ with before.json. delta.json records every changed/new file hash and verifies unchanged source, build, overlay, served scene, native.ts and capture.spec.ts. The exact 3635-character retained-handle launch/finally-cleanup section is unchanged.

## Repair

preflight.ps1 and run-owned.ps1 now call the small port-census.ps1 helper. It runs Get-NetTCPConnection -ErrorAction Stop without provider filters, then locally selects port 4333 listening rows only after the complete query succeeds. Thus a legitimate absent target port is an empty successful census; no provider no-match exception needs to be interpreted as success. Denied, unavailable and other failed queries record completed:false, listeners:null and the error category, ID and message. Denial is distinguished where the OS error provides PermissionDenied/SecurityError or UnauthorizedAccessException; every unclassified error is still a refusal.

Preflight writes this census before refusing on error. The final owner receipt includes the census and sets completed:false on any query failure, after the unchanged retained-handle cleanup. An occupied port remains a distinct refusal. No failed or unavailable inventory becomes[] or a completed cleanup claim.

The only other frozen input edits are adding the helper to envelope.mjs's explicit freeze roots, regenerating dependency-inventory.json, and recording the required future require_escalated invocation in CAPTURE-CONTRACT.md. dependency-closure.json is unchanged; dependency-delta.json shows the regenerated inventory differs only for C:/Users/38909/.codex/worktrees/shibuya-quality/maps/artifacts/rail-still223-20260927/envelope.mjs. The native command remains inadmissible without independent review and a root execution lease, and must be invoked using exec_command with require_escalated. No native command was authorized or run in this repair.

## Executed checks and limits

controls-02.txt passes seven cases through the actual helper, the full actual preflight and the extracted actual final owner receipt clause: an empty TCP table, an unrelated listener, a target-port non-listening connection, an actual 4333 listener, access denial, provider failure and an unavailable command. OS census calls are stubbed; these are real caller-path tests, not live capture/process-termination tests. Each witness is written before assertions. Both exact original query statements reproduce the denied-to-empty defect under the same stub, retained in old-red.json.

The first control attempt is preserved in controls-01.txt and controls-attempt01/. Its stub used script scope, which changed when the full preflight was invoked. The preflight correctly reported query failure instead of falsely clearing. The corrected task-specific global stub lives only in its foreground control subprocess. The first seal attempt is preserved in seal-attempt01.json: an arbitrary >4000-character guard refused the actual 3635-character section before either freeze was written. Corrected boundary checks found the complete same section and verified exact equality; seal-final.txt records successful frozenExecutor verification.

All four changed/control PowerShell files parse without errors. The actual escalated read-only preflight also passed: live-readonly/qualification.json reports completed:true, zero 4333 listeners and zero task-scoped native processes, while retaining the unrelated protected Edge identity. This is a current census, not permission to omit the launch-time census. The actual no-lease command still exits1 before launching a child. Dependency binding and complete frozen executor validation pass. No product gates were rerun because source/build/data/copy bytes are unchanged.

The initial write request was not executed when automatic approval review hit an account limit. On resumption, inspection confirmed no repair file or preservation folder existed; only then was the authorized repair applied. That interruption supplied no completed-work evidence.

## Cleanup and next step

cleanup.json records no remaining 223-scoped node/browser/helper processes. All repair/control commands were foreground; no browser/server/GPU process or watcher was launched and no process was terminated. No disposable browser profile or cache was created. The retained controls, original freeze, narrow diff and failure attempts support review and are intentionally kept. Root/reviewer217 should inspect this immutable delta, then root alone may issue the still-pending single-N0 execution lease.
