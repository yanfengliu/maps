# Review 247 — focused follow-up on R247-C1

Verdict: **R247-C1 is closed.** The test-only repair satisfies the required fixture junction cleanup discipline. No remaining material finding was found in this focused re-review. The bounded static activation candidate may proceed to its required integrated gates and visual acceptance; this is not final product acceptance.

The repaired `test/rail-install.test.ts` records the resolved fixture root and its device/inode identity, and each created junction's resolved target identity and complete non-following file/directory/link counts. Teardown first restores mocks, checks the owned temporary root, enumerates all fixture links without following them or swallowing errors, reports and compares the exact found/created roster, verifies their targets, explicitly unlinks each junction with `rmdirSync`, verifies target identity/counts again, and confirms no links remain before recursively removing the checked fixture root. A failed prerequisite leaves that fixture for investigation. The two installer junction-refusal cases use the same registration and cleanup path. This closes the missing-discipline finding; no shared-source loss was observed or claimed in either review.

Independently checked identities:

| Item | SHA-256 |
| --- | --- |
| Repaired test and `after.test.ts` | `abe34533020cd98c9f2fea11ed8cdb14deeb51be13ab9f8102f0b22685ba2c16` |
| `repair.diff` | `cbd0f3888531827cd4d2c0fb3eb6b644e66b03920a47a645d97c8e0ad6383187` |
| `repair-freeze.json` | `eecdb9cb80edae8679388fe0beda05890e10c865bc2df8e126e701a448e5682e` |
| Updated 32-file source digest | `b3b703edac309435fe27738822005def3ba67d0bb9c6b4be61f7393db71e6347` |
| Primary `REPAIR236g-HANDOFF.md` | `5762c89c249e3327d9187ce12a1a3071d1839612d2147f1a94718d04f97b181f` |

All 31 other source files match the original 236f freeze. `before.test.ts` matches its original file hash, and the original freeze still hashes to `48f8f58d8cf313d11ad5760a3d1641c02d4cd67155d09f4e06ebda5e3fc0430a`. All six repair receipt/config/diff hashes match the repair freeze. No large data corpus was rehashed.

The inspected worker log records 12/12 installer checks passing in 1.99 seconds with all twelve cleanup rosters matching: eleven with one junction, one with none. Those passing teardowns exercised unlink, protected-target verification, link absence and owned-root removal. The repair freeze reports zero remaining fixture roots. The configured `tsc --noEmit` receipt records exit 0 on Node 24.12.0. These are inspected and hash-bound worker results, not reviewer reruns. The owned Vitest configuration disables cache and uses a dedicated cache directory.

Only this follow-up report was written. No suite, browser, GPU, server, process census, Git operation or product edit was performed. The original review's full-gate, 44-native-image, actual default/style/lifecycle and wider exterior/actor/temporal limitations remain unchanged. No additional preactivation camera search is required by this finding.
