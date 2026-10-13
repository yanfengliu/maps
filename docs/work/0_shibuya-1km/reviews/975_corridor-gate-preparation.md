# 975 — corridor gate helper preparation

2026-10-13. Source-only worker preparation in FG, base `ac2ddc42292e3b34516b2fc56f515a892ad20df1`. Root's 975 assignment sets the fresh owner root to `artifacts/corridor975-gates/`, replacing 974's proposed nested location. [974's contract](974_corridor-integration-gate-contract.md) and its JSON remain unchanged. Integration, gates, adoption and runtime admission are false. Root/focused independent review must inspect these exact copies before execution; adoption waits for root acceptance of actual 973's twelve native originals.

Copied exactly the five sign866 helpers, renaming only `sign866-cpu.ps1` to `corridor975-cpu.ps1`. Ordered literal substitutions are the slash and backslash `.../artifacts/sign866-gates` roots to `.../artifacts/corridor975-gates`, `sign866-cpu.ps1` to `corridor975-cpu.ps1`, `maps-sign866-` to `maps-corridor975-`, then remaining task label `sign866` to `corridor975`. Counts below use that order. All other bytes remain exact; reversing these substitutions restores the source bytes, including mixed line endings. All six borrowed helper/command-contract pins still match 974.

| Copy | Bytes | SHA-256 | Substitution counts | CRLF / bare LF |
| --- | ---: | --- | --- | --- |
| `run-cpu-observed.ps1` | 18496 | `60c7e73974c79b12af6883214db4603c984c208cb8dde4195dc7b3d938183640` | 1,0,2,1,1 | 3 / 254 |
| `run-visual-observed.ps1` | 18692 | `25ccb5159f1f8363e942b0ffd00cdec628c26c743751b5a5052f967455619bff` | 1,0,0,1,1 | 225 / 34 |
| `corridor975-cpu.ps1` | 3387 | `6715d86ff99bacb551068799dac676bb23ef16745135f7c450ce96532c3cda96` | 1,0,0,1,1 | 2 / 43 |
| `vitest.config.mjs` | 304 | `9479e9b13a707872e3724a6d429ce35f4c156a281e6a39bef36800d2c84ed64e` | 1,0,0,0,0 | 0 / 2 |
| `cache-cleanup.ps1` | 2793 | `e95b83d658a560779b9f9790e02ed622fbfb0e1d3cb29ab94a1fd0f813d63d24` | 1,1,0,0,1 | 0 / 21 |

Four PowerShell AST-only parses report zero errors. `C:/Program Files/nodejs/node.exe --check` passes the config without import/evaluation. PRIMARY's canonical config selects `test/**/*.test.ts` in the Node environment; the copied config still imports/spreads it and changes only the owned cache settings. No helper was imported or invoked.

The unchanged 974 run contract is serial build/types/unit/audit/visual at 120/120/240/120/900 s, each with 120 s absolute cleanup allowance, fresh `<phase>-owned` outputs and positive available empty six-category census plus TEMP removal before cache cleanup. Canonical commands, full test selection, assertions, retained-handle identity/termination checks and deadlines are preserved. [836](836_ordinary-five-gate-verification.md) proves normal closure only; [969](969_support-query-cost-route.md)'s private ignored-taskkill failure is separate. No deadline-branch proof is claimed. Synchronous CIM/port queries still cannot be preempted by between-iteration clock checks.

Only these five helpers, ignored `preparation.json` (9624 bytes; SHA-256 `9b40eb675ad74af596567e8a04cb3860b40a417eb40f02fd5b3d842b09be2850`) and this report were written. The receipt records exact source/copy pins, literal deltas, syntax results and all false admissions. `artifacts/.gitignore:5` ignores the fresh root; the read-only Git check also reported an inaccessible global ignore file. Old866 evidence/seal/cache/output are untouched. No new wrapper, inventory, worktree, dependency, product/source/test/data/PRIMARY/board or Git mutation ran. No gate, build, test, browser, GPU, CIM or port query ran. No runtime lease, persistent process, gate output/cache or owned TEMP was created. The helper copies and receipt remain intentionally retained for root's active handoff.
