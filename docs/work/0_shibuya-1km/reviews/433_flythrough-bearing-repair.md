# Flythrough bearing repair 433

Prepared 2026-09-30 by worker camera433 in `C:/Users/38909/.codex/worktrees/crossing-frontage/maps`, base HEAD `e060d3059ef607f10dcfbbce174d842da5fbb315`. The checkout also carries the preserved train/material/error increment and camera431. Root owns integration and gate scheduling. Only this checkout is writable, so root assigned disjoint planner/test ownership here rather than another worktree. No other worker writes these two files.

## Observed defect and root cause

The actual final CPU attempt in [423](423_clean-city-final-gates.md#renewed-final-cpu-attempt--bearing-candidate-red) passed build/types and reported 1,060/1,061 units. Its sole failure was the existing flythrough bearing regression check: the approach delivered azimuth -0.2618 rad while the unchanged crowd entry needed 0.1309 rad. The 0.3926990817 rad gap exceeded the unchanged 0.05 rad criterion. The actual red log is `artifacts/verify423/final-cpu-20260930T231213750Z/unit.log`, SHA-256 `6bbc21b2a578a9245ec58ec34cd24f727fc9980b9b5a6144174ccd1798715fcf`. Worker433 read that failure and the actual planner, driver and test before editing. The existing `rotateStepRadians` route check answers this arithmetic question without a browser; it does not prove pointer delivery or appearance.

The approach kept its old six-turn schedule after the approved opening changed to -3π/4. The unchanged crowd bearing is 7.5°, so that schedule now asks for a 142.5° swing. Six unchanged 40 px gestures at the capture's 720 px canvas can deliver 120°. The shortfall is 22.5° (0.3926990817 rad), matching the observed red result. This is a plan capacity defect. The camera input code and crowd anchor do not need to change.

## Prepared repair and checks

The only planner behavior change is `const swing = index < 4 ? 0 : (index - 3) / 8`, replacing `index < 6 ? 0 : (index - 5) / 6`. The swing begins at the existing 78 m rung instead of the 52 m rung, using eight existing descent frames. Each planned turn is 17.8125° (0.3109 rad), below the unchanged 20° (0.3491 rad) driver cap. Comments and the approach's recorded expectation now describe this schedule. No new planner abstraction was added.

The existing end-bearing test, its 0.05 rad criterion and all driver limits remain unchanged. The test's existing route helper now permits a read-only observation of each delivered turn. One additional class check requires every approach request to arrive in its own unchanged driver gesture and requires every nonzero delivered turn to follow the shortest path's sign. It checks the route through the actual `shortestAngle` and `rotateStepRadians`, rather than asserting a new start index. The existing red end-bearing case is the observed failing class control. The new case has not been executed or claimed as proved.

The overview distances, twelve approach rungs/heights, crowd target and push, eleven ascent targets, route capture cadence, waits and simulation are unchanged. The ascent's capped route remains a separate assertion in the existing end-bearing case; no ascent code was edited. Browser controls, damping, clearance, framing and native appearance still need the orchestrator's affected-flow verification. No acceptance claim follows from the planned angle budget alone.

## Byte pins and execution handoff

Exact before/after copies of both edited files are retained under `artifacts/verify433/before/` and `after/`; their byte lengths, line-ending observations and the unchanged driver/camera/input-test/config pins are in `before-pins.json` and `after-pins.json`. Both edited tracked files retain CRLF. No old red evidence was changed.

| Path | Before SHA-256 | Prepared SHA-256 |
| --- | --- | --- |
| `tools/flythrough/plan.ts` | `79704b3d0c73b4ff1133a8f6a1b76a8ed53643084fd386a8aed02b70c044292d` | `b56cd3717142b6398e07df5510bfc5f7a00dddd233775a87993f2c8dd9838319` |
| `test/flythrough-plan.test.ts` | `445ca25c15fcd5ee971de000edc01bbca39361080b8989126f09b27050faa28d` | `b2c5004aa8121294c7e722400ecb2bc90fff2398df4c3bf3534f7ab9573a75ee` |

The approved camera remains `2319a949fcf2a54525f52a3a8e2530a3dab714cf83f5a3ec7a6fe6d590f63ecc`; its input test remains `f7ffc5985d45c68cbd4d4f3348d981980d8efcd6a250f5f489248fe349cb6a3c`; the unedited driver remains `d97c1951d26b494a01a0a7669565899d6658672a2c462e531611cdb7b21a4b4d`. All three were rehashed after the patch and match their before pins.

Prospective focused command: `node node_modules/vitest/vitest.mjs run --config artifacts/verify433/vitest.config.mjs --configLoader runner`. The prepared config SHA-256 is `f1aafca96a39bd539c4684ba8d2aa282c81291efa3f2b7d14a6e71867bc5cedb`. It selects seven files: flythrough plan/crowd-anchor/stand/aim and camera input/rest/settling. It disables Vitest cache and assigns Vite's cache to owned `artifacts/verify433/cache/vite`, with four workers as in the admitted full CPU config. Execution must use the root-admitted owned observer, exact external TEMP and cleanup path; the prepared config does not itself launch or own those processes.

No test, import, build, typecheck, dependency command, GPU/browser/server operation or Git command ran in this preparation lease. No task-owned browser, server or helper was created. Only the authored report and ignored before/after/config evidence are retained for independent admission and later verification. The repair is prepared and uncommitted; independent review, focused CPU evidence, final all-five gates and main integration remain with root.
