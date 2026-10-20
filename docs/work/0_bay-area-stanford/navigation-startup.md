# Navigation and embedded-browser startup

Started: 2026-10-20. Integration owner: root. Base: `dd60061` after restoring the fleet constitution from `../fleet/FLEET.md` with the canonical fingerprinted renderer. The local map rules remain outside the generated block; `CLAUDE.md` imports `AGENTS.md`.

The requested outcome adds WASD panning, gentler right-drag rotation and vertical middle-button dragging for tilt, while retaining native navigation and search input behavior. A separate investigation addresses the user's built-in-browser blank/loading state and “This page crashed. Localhost crashed unexpectedly.” Chrome loads the same app. The archive, data sources, map palette and architectural geometry are unchanged.

| Outcome | Owner | State and dependency |
| --- | --- | --- |
| Fleet rules | root | Local documentation commit `dd60061`; push rejected by automatic approval review, explicit user approval requested. |
| Navigation implementation | root | Integrated before delegation; exact source hashes frozen for independent verification and review. |
| Real-input controls verification | controls_verify | All 21 real-input checks pass. Focused navigation capture and all 7 final integrated primary checks pass; auxiliary port 5324 and browser processes closed. |
| Browser diagnostics and bounded startup mitigation | browser_crash | Source handoff inspected and integrated. All 25 worker tests and types pass; a failing-old/passing-new regional shader regression is retained. Actual host recovery remains unverified. |
| Integration, review and acceptance | root | Build, types, 25 tests and audit pass. Independent source review has no material finding; final authored report is retained with this increment. Embedded-browser recovery still requires a user retest. |

Acceptance checks actual map focus and all four WASD directions, search isolation, right-drag rate, middle-drag pitch/bearing isolation and bounds, release behavior, native pan/zoom, Stanford flight/detail readiness and rendered screenshots. The startup regression must prove no custom shader allocation/compilation in the regional view and intact warmup/context recovery on approach. Required package gates run after integration. These independent headless checks cannot establish recovery of the policy-blocked built-in-browser tab; that limitation must remain explicit.

The user requested localhost to remain available. Primary hidden Vite PID 8132 serves `http://localhost:5173`; task state and logs are under ignored `artifacts/navigation-controls/`. Test browsers and auxiliary servers are owned, isolated and closed in cleanup. Existing user processes and old source caches are preserved.

## Verified result and limits

The unchanged control bytes passed actual map-click focus, W/A/S/D and uppercase panning, search typing and Ctrl shortcut isolation, native arrow/left-drag/wheel navigation, 100-pixel right-drag rotation of 25°, middle-drag pitch changes of +5°/−20° without center/bearing drift, 0°/65° clamps and release outside the canvas. The earlier optional capture failed twice because a prior building selection replaced the expected panel. These were probe-state assumptions; an explicit overview → Stanford → Main Quad flow passed without a product fix. Reports preserve those failed attempts rather than relabeling them complete passes.

The final integrated primary check starts with no architectural shader, geometry or GPU buffer work in the regional view, then reaches all 100,514 triangles and two draws through the real Stanford control. Middle tilt, overview return, campus reentry and actual test-owned WebGL context loss/restoration pass with no page/map errors. Native screenshots of the regional view, campus, Main Quad and restored Quad were inspected. Their hashes, scripts, reports and cleanup census are retained under ignored `artifacts/navigation-controls/verification/`; the failing-old/passing-new allocation regression and redacted host metadata are under `artifacts/browser-startup/`.

At 1920×1080, DPR 1, verified RTX 4090 through ANGLE/D3D11, the first real Stanford flight records 400 moving render events over 2,384.8 ms: p95 interval 7.3 ms, maximum 22 ms, two intervals over 16.7 ms and none over 33.4 ms. Maximum measured initial main-thread detail setup/upload slice is 4.2 ms. These are bounded MapLibre render-event observations, not physical display FPS or a claim about other GPUs or the embedded browser.

Final primary `npm run typecheck`, `npm test` (25/25), `npm run audit` (zero vulnerabilities) and `npm run build` pass. The first build attempt was blocked by sandbox parent-directory read permissions; the same build passed with normal access. Vite retains its existing >500 KB MapLibre chunk warning. No dependency, source-data, palette or geometry changes accompany this increment. Actual embedded-browser recovery, low-end GPUs, physical mobile hardware and Safari are unverified. The push remains subject to the explicit permission requested after automatic approval review rejected it; remote verification is not claimed.
