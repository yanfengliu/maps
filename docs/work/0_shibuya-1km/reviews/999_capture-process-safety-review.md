# 999 — Capture process safety review

Date: 2026-10-14. Independent focused review of the frozen private capture caller. Root disposition: accepted ADMIT FOR RUNTIME with the bounds below. This file retains the completed review; no reviewed implementation or evidence was changed.

**999 verdict: ADMIT FOR RUNTIME** for the frozen private caller. No blocking finding remains in the reviewed safety changes.

- **Inspector refusal addresses GW1:** [capture.mjs:20](C:/Users/38909/Documents/github/maps/artifacts/commercial-corner-20261014/capture/capture.mjs:20) and [run-owned.ps1:8](C:/Users/38909/Documents/github/maps/artifacts/commercial-corner-20261014/capture/run-owned.ps1:8) reject nonempty `PWDEBUG`, `npm_config_pwdebug`, and `npm_package_config_pwdebug` before output admission or capture-resource launch. The caller still explicitly launches headlessly. Installed Playwright reads these environment aliases.
- **Final census closes the reviewed gap:** [run-owned.ps1:149](C:/Users/38909/Documents/github/maps/artifacts/commercial-corner-20261014/capture/run-owned.ps1:149) supplies a fresh, unfiltered CIM snapshot to the actual shared [process-safety.ps1:12](C:/Users/38909/Documents/github/maps/artifacts/commercial-corner-20261014/capture/process-safety.ps1:12) predicate. It checks retained identities, all recorded omissions, and recursively discovered current descendant edges through census time. Remaining processes or unavailable identity/census evidence prevent certification and preserve temporary files. Unadmitted processes are never terminated.
- **997's contract remains intact:** exclusive output admission, fresh measured-navigation teardown after real Start/style/progress, the pinned app-free terminal page, canonical error collection through replacement/closure, source/build/data/decoder/harness/GPU bindings, and `capture-completion.json` sealing after cleanup remain in place.

The automatic approval rejection arose while review998 concerned the separate canonical wrapper and cited GW1/GW2 against the proposed private capture dispatch. Cross-checking established that GW1's Playwright inspector-alias risk also applied to the private caller; the actual caller and wrapper source changes above now address that shared risk. GW2's precise timestamp-filter defect was specific to the canonical wrapper. The private caller's final-census enhancement has the bounded scope described here; it does not resolve or certify the separate canonical-wrapper repair.

I inspected the actual control wiring and retained results: **31 caller controls, including 26 refusals**, plus **11 shared-predicate controls**. The six new alias cases invoke the actual caller and wrapper as subprocesses and require refusal with unchanged empty output. Process-census controls use synthetic records through the actual shared predicate. I did not rerun controls, launch processes or browsers, modify files, or use Git during the review. The only subsequent write is this explicitly authorized report retention.

Before/after verification matched all **14 active pins**, with manifest SHA-256: `8172655b2192008c3b382567af855004485f8dfd9bac4ded77ebb7e6b4131949` at `artifacts/commercial-corner-20261014/capture/prepared-freeze.json`.

All **11 preserved pre999 files** matched the retained manifest: `758cf67849996a84702ef056b52cae540d55885939e606262fedb6efc7bde829` at `artifacts/commercial-corner-20261014/capture/frozen-pre999-runner/prepared-freeze.json`. The preserved runner and its manifest remain the recoverable pre-change target.

The failed raw records remain unchanged:

- `artifacts/commercial-corner-20261014/capture/baseline/capture.json`: `13c31bbf20b810290978d81b5dc61db351a7f7d5f348cbfadf0899d0cad5a24c`.
- `artifacts/commercial-corner-20261014/capture/baseline2/capture.json`: `324fc124a37b16624dfafb1faac49941ddace814b6091fd73dfdc50e6371fb9d`.

This admits a runtime attempt; it does not establish successful runtime cleanup or appearance acceptance. The census proves its recorded-identity/current-edge scope within one non-atomic snapshot; missing identity information can conservatively refuse a run. Root must inspect the resulting ownership and cleanup evidence. The separately repaired canonical wrapper and mandatory 44-frame/three-lifecycle gate remain outside this verdict. Custom HTTP delivered-body/request-completion certification remains **not established**, and request218 remains **RED/unclassified**. Reviews994, 996 and 997 retain their historical scope and uncertainty.
