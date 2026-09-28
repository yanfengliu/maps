# Review 247 — bounded static rail activation

Verdict: **changes required for one cleanup finding**, then focused re-review. No other material activation, restoration, runtime ownership, style or served-data binding defect was found in this bounded read-only review. This is not final product or appearance acceptance.

## R247-C1 — installer test teardown omits required junction cleanup (P2)

`test/rail-install.test.ts:16-18` creates each ordinary fixture with a `data/scene` junction to the shared source cache. `test/rail-install.test.ts:24` then calls `fs.rmSync(root, { recursive: true, force: true })` over that containing tree without first enumerating/unlinking its junctions or verifying the shared target. The `data` and `rail` refusal cases also create junctions within their fixture roots. This conflicts with the explicit preservation procedure at `docs/policies/local-rules.md:129`: enumerate reparse points without hiding errors, unlink every junction, verify primary target counts, then delete the owned directory. Node's normal recursive removal unlinks junctions; no shared-source loss was observed or inferred here. The finding is the missing required cleanup discipline and verification in the newly added tests, not a demonstrated Node filesystem defect.

Repair only this fixture teardown: keep source target identities/counts, enumerate fixture reparse points without following them or swallowing errors, explicitly unlink the junctions, verify the protected target counts, and only then remove the checked owned fixture roots. Run the focused installer checks with owned cache/TEMP/TMP and bind the repaired file/logs for re-review. No broader filesystem-concurrency redesign is requested.

## Exact reviewed candidate and verification

The frozen workspace is `C:/Users/38909/.codex/worktrees/rail-integration/maps`, declared base `d7a3642e2f21bec7866b2e7ad972785c0160c4bd`. No Git command, source mutation, browser, server, GPU work or test suite was run by this reviewer. Small read-only calculations independently matched all 32 physical source files to both `freeze.json` and its candidate copies; all six excluded pedestrian files match their physical freeze hashes. All 27 original quality source files also match their recorded hashes.

| Identity | Independently matched SHA-256 |
| --- | --- |
| `freeze.json` | `48f8f58d8cf313d11ad5760a3d1641c02d4cd67155d09f4e06ebda5e3fc0430a` |
| Sorted 32-file physical source digest | `b993afdce4a051c6bc0b26dbfdc5d9d4a8e9824e0301e62b3e3b3d09fdb3c7d5` |
| `owned-32.diff` | `b5ce8863be78666e01be3720041f6bfbcfefaad13a234cadbd7e7e2f58663a4f` |
| `activation-and-bounds.diff` | `4d9eaf34b0cbc9b115b4f4b5c885c3383dbf593d036dd244a6c334912d1e2e25` |
| Accepted external manifest | `e8e41c2944601c5d574fb1596c89a4ee4bb2b6bbb8bac54d240863ffdb3ff707` |

The real owned `data/rail` directory has exactly the 34 admitted entries, 52,950,963 bytes; all 33 referenced asset lengths/hashes and all three original scene tile lengths/hashes match. Every retained check log matches `checks.json`. The inspected receipts report 77/77 focused checks, the new default-mount digest check 1/1 with 41 intentionally unselected cases, and configured `tsc --noEmit` exit 0 on Node 24.12.0. These are reviewed worker results, not reviewer reruns.

The product path unconditionally binds the fixed packet in ordinary Vite configuration, buffers and whitelists exactly verified assets, and fails rather than silently omitting rail. Installer validation precedes writes; it refuses differing/partial/linked destinations, writes the manifest last, and owns its failure cleanup. Runtime checks source tile bytes and exact source face identity before replacement, retains source materials for kept fragments, and gives generated returns/layers explicit style and disposal ownership. The installed TilesRenderer implementation was inspected against the transaction wrapper. The complete-world-vertex bound correction remains scoped to observation; winding/contact thresholds are unchanged. The visual digest now covers `/rail-trial/` as well as the existing scene/network mounts. Historical geometry-generation acceptance was not re-litigated; the admitted packet and preserved generator bytes were checked for identity.

## Limits and integration requirements

Root's final narrow-static decision controls this review. All five configured gates, 44 native image inspections, actual default startup with 20 layers/10 replacements, real style controls and lifecycle checks, and final integrated independent review remain owed. Promote the external-packet restoration prerequisite into permanent preparation documentation; `data:setup` cannot reconstruct the admitted packet. Full A5/R205-C2, four-gap/eight-bearing/ten-return/composite exterior, actor-under-span and temporal acceptance remain open. This report does not require another preactivation camera search.

Only this report was written. No browser, GUI or server was launched and no persistent tool session was created. The final scoped CIM process query was denied access, so it did not establish a zero-process result; there is no known task-owned persistent process to clean up. Preserve the report for root's repair and canonical review promotion.
