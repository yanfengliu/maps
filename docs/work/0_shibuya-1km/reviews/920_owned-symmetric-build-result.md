# 920 — owned symmetric build result

The coordinator-authorized CPU-only symmetric build completed successfully under the admitted 918 lease. Both A and B produced six files, and Vite loaded all four pinned runtime overrides in both arms. The Vite logs include the existing chunk-size warning for bundles above 500 kB; neither arm failed.

`fresh-build.json` records `passed: true`, `stage: COMPLETE`, `primaryWritten: false`, `primaryAndInheritedPinsUnchanged: true`, and `esbuildStopCalled: true`. The exact A/B output hashes, sizes and loaded override hashes are retained in the ignored build artifact and in `artifacts/checker920/result.json`.

The retained Windows process census was available. It reports zero live admitted processes, zero live omitted processes, zero remaining descendants, zero ownership-unavailable records, no marker processes and no port listeners. The dedicated TEMP directory was removed. The owner recorded successful termination confirmation for Node and esbuild.

This result admits only the one CPU build. It does not establish browser, GPU, visual, or runtime qualification. Those remain outside this lease and were not run. No repository source or Git state was changed by this execution. Before this run, an initial read-only `git status` probe was refused by Git's dubious-ownership guard; no Git configuration or repository mutation followed, and the coordinator independently verified HEAD/ref/index authority.