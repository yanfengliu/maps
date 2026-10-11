# Independent bootstrap review

Reviewer: `branch_review`, independent read-only subagent of the orchestrator.

Date: 2026-10-11.

Target: uncommitted bootstrap on `codex/shibuya-unreal-5.8`, based on `5661d0c35761f9ccbbd906a7bd8ee4cb8a7c2cca`, at `C:/Users/38909/Documents/github/maps/artifacts/shibuya-unreal-5.8/worktree`. The byte digests below identify the reviewed files. Engine, MCP, source, importer, motion, and generated asset work were outside this review and still in progress.

## Verdict and bound

No material findings in the reviewed bootstrap. The documentation preserves the owner's requested geographic crop and clean Unreal branch, distinguishes requirements from observed state, and explains the necessary overrides of the historical Vite gates and merge-to-main rule. The separate branch is the requested deliverable; merging its replacement tree into main would exceed this instruction.

This verdict covers the initial policy, plan, ignore rules, instruction preservation, branch/index identity, and observed absence of reparse points. It is not engine, MCP, city, source, runtime, performance, rendered appearance, final revision, or primary checkout preservation acceptance. The orchestrator must compare the primary against its pre-task baseline and bind the final inventory and executed checks to the committed experimental revision.

## Evidence

- The branch is `codex/shibuya-unreal-5.8` and HEAD is the stated base revision.
- The base tree has 1,177 tracked paths. The reviewed branch index has exactly `AGENTS.md` and `CLAUDE.md`, excluding the other 1,175 paths. New bootstrap files are not committed yet.
- The two retained instruction files match the current primary files' SHA-256 values. Their unfiltered Git blob IDs match their staged blobs: `a3535299902884322318afad8e81f527327b5bcc` and `43c994c2d3617f947bcb5adf1933e21dabe46bb5` respectively.
- `git check-attr text` reports `unset` for both files under the new `.gitattributes`. That preserves their exact bytes through Git instead of normalizing line endings.
- A recursive read-only census with errors fatal observed zero reparse points. No old cache or dependency link was observed. Worker files were deliberately not read during concurrent implementation.
- The new branch-local registry assigns `0_unreal-shibuya`. Reusing the primary allocator or registry would conflict with the explicit instruction to inherit only the two instruction files; their absence is appropriate here.
- README and plan disclose that installed-engine identity is not MCP connectivity, a built city, rendered acceptance, or population/performance verification.

## Reviewed SHA-256 values

| File | SHA-256 |
| --- | --- |
| `AGENTS.md` | `20a0a9529ffad04a2fc72ffe4cef72cc65eb0b1b41b15c72dd33f0de89d73206` |
| `CLAUDE.md` | `336cc4fbf19beaada7ccf9986414fa91851a8d7a07dfb3ccbe800a69eed0ab49` |
| `.gitignore` | `fa3030071369f9133709e7b7cf31feb3503d6a27a15fafccdccada5376654522` |
| `.gitattributes` | `eb53754bb51e5bcea16c177e13b6a6d3c65e2a13078f3a79edcc2468a81e7088` |
| `README.md` | `814026cde4bb19a856b72def894d1c54cc7126852e580a6586d2d694f6079749` |
| `docs/policies/local-rules.md` | `8313879d41c8a3558a5c48488d424ba5a865a1765051922fe5479496938bbda1` |
| `docs/work/0_unreal-shibuya/plan.md` | `1abdaa46557707b6c511f9ee856fb6a0a570f1cb6ef56e1791e7be65a0e92ce1` |
| `docs/work/registry.json` | `adb57cba53ab441b84e4747e71cfb4773c01b32fd8943f7858f1fcf4a5b2972d` |
| `docs/devlog/summary.md` | `9db3c76cd4bdc49196bc2b3db850007d561e9d00043b086344981db446783952` |

## Dispositions and checks

The orchestrator should refresh the plan's future source-worker and engine-worker status as current assignments complete. This is an expected active-plan update, not a blocking bootstrap finding. A focused final review of the frozen implementation and final documentation is still required.

No runtime gate, engine process, browser, dependency install, data download, commit, index edit, or primary checkout mutation was performed by this reviewer. Historical Node gates were deliberately not run because their project implementation was excluded. Initial Git metadata checks failed because a reviewer command used an invalid PowerShell replacement pattern; they were corrected and rerun with the exact command-local safe directory. No failed probe was treated as evidence of success.
