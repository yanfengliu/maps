# maps

Build an Apple Maps-inspired Bay Area map with 3D buildings only at Stanford University. The current scope and source rules are in [local rules](docs/policies/local-rules.md); acceptance is in [the plan](docs/work/0_bay-area-stanford/plan.md).

Use Node 24 as pinned in `.nvmrc`, `npm ci`, and the package scripts for build, types, tests and audit. Check changed map flows in a headless browser using actual controls and inspect native screenshots. Own and close every browser/server process; preserve unrelated processes and cached source data. Keep task output under ignored `artifacts/`.

The previous Shibuya project is preserved on `codex/shibuya-archive-2026-10-19`. Do not resume its goals or change its archived branch. Publishing or deployment needs a user instruction.
