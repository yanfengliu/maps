# Handoff — the Shibuya 1km deliverable, 2026-09-17 23:15 local

This note is the session-to-session delta. The canonical status document is [`plan.md`](plan.md) in this same folder — long, dense and current, carrying the evidence each claim rests on. Read it after this note, not instead of it.

## 0. Where the deliverable stands, in one paragraph

**The five gates are green for the exact revision.** Four of them (`build`, `typecheck`, `npm test` 60 files / 444 tests, `audit`) were re-run by the coordinator on `740beca`; the fifth — the visual gate — **certified on `654fcc5`** as runId `94fc1aa78b0af8f9`: 44 fresh native-resolution frames with matching hashes, three hardware lifecycle records, and a certificate naming the GPU (`NVIDIA GeForce RTX 4090`, driver `616.64` from `nvidia-smi`), the scene digest `ddd21ee1b4feb7f7…` (84 files, 214,114,015 bytes, the agent-free payload) and the harness digest. Everything is pushed; `main` is the only branch. The human set is restored and verified (33 of 33 by name and digest), the populated lane ran green with 38 frames, and the controls-driven flythrough ran for the first time in this deliverable's history — 46 frames over four legs — and **failed its own check**, which is now the most substantive open item. Inspection of the 44 certified frames is running in two lanes.

## 1. What changed since the previous handoff, and why it matters

**The appearance gate now draws on the GPU, and it is the single biggest cost reduction in this deliverable.** The owner's instruction — "why does it take 3 hours? That is ridiculous and unacceptable", then "if you can use multi-core, don't just use single core. If you can use GPU, don't use CPU" — overrode a *recorded, deliberate* exception in `docs/policies/local-rules.md` that kept the 44 appearance frames on SwiftShader for machine-independent pixels. The measurement that made it a defect: the software lane held **7.7 of 32 cores continuously**, about 54 core-minutes of CPU rasterization per 1280x720 frame, with an RTX 4090 idle. Landed as `f741fa7`, merged `740beca`, 31 files (+726/−364). The numbers, all measured with one instrument against both renderers at the same pose and build:

- whole gate **283.2 s and 309.8 s certified** against an estimate of 3–3.7 h; ten hero captures **4,438.2 s → 88–91 s**
- per capture: frames 1,035 ms → 207 ms; tile refinement 64.9 s → 1.1 s; the controls' corrections 342.7 s → 2.7 s; settle 26.4 s (190 frames) → 0.22 s (204); screenshot 55.7 s → 0.23 s
- concurrency measured, not assumed: `workers: 1` **238.9 s** against `workers: 3` **144.0 s**, which landed; `--fully-parallel --workers: 4` a further **114.7 s**, measured and deliberately not adopted
- **pixels**: 2.4–8.4% of pixels move beyond 6 summed RGB between the preserved software frames and the hardware frames at the same pose (mean channel difference 0.4–1.0 of 255), against **90.5%** for a real style change and 0.000% for a file against itself; both arms agree exactly on sun position, clock and `tiles.cachedBytes`, so it is edge coverage and resolve rather than a different scene. **Consequence a reviewer must weigh: the certified frames are now this GPU's pixels, and the reviews written against software frames are no longer reviews of these bytes.** The certificate pays for that by binding the adapter and driver, and `tools/visual/gpu-identity.ts` refuses a frame set drawn elsewhere — the software-fallback refusal and the wrong-adapter refusal were each watched red.
- `playwright.hardware.config.ts` and `npm run visual:hardware` are **deleted**, because two lanes claiming to be the appearance gate was the outcome to avoid.
- what now dominates the five minutes: page boot and first tile refinement at 30–36 s per specification file across three page loads, 1.4–4.3 s per capture, and the PNG checks at 30–35 s per file. GPU duty is 15–41% throughout; rasterization is no longer the critical path.

**The human set is restored and verified rather than assumed.** `npm run data:agents` baked all nine variants (worst sole drift 0.001167 m, contacts inside their bounds) and `npm run data:agents:set` — the verifier built this session — reports **"Human agent set complete: 33 of 33 files on disk, every manifest parsed, and every file a manifest names present and non-empty, matching each digest the manifest records"**. `data/scene/agents` now holds 37 files (33 human plus the vehicle fleet). **The scene digest has therefore moved** from the `ddd21ee1…` the certificate binds to a larger payload, which is correct and expected: the certified frames are of the agent-free city, and the population never loads without `?agents=`.

**The populated lane ran green**: `npm run visual:populated`, exit 0, 5 minutes, 38 frames over four poses (crossing, walkers, corridor, boundary) at 3,000 pedestrians plus traffic, with the frames differing between ticks at three of the four poses. **It carries a finding worth adjudicating**: at the `crossing` pose **13 of 14 consecutive frames are byte-identical**, so nothing moved there — the same crowd-occupancy problem the plan records as queueing (2,247 of 3,000 queued at 365 s, hundreds of metres from the origin). `walkers`, `corridor` and `boundary` do move.

## 2. The open item that matters most: the flythrough failed its own check

`npm run visual:flythrough` ran for the first time ever (port 4323, hardware renderer). It wrote **46 frames across four legs** — `frames/{approach 12, ascent 11, crowd 12, overview 11}` in `artifacts/flythrough2/frames/` — and then failed:

```
the frame sequence does not show a camera driven through the controls:
- 8 of 46 frame pairs moved the camera less than 1 mm (frames/overview/overview-000.png,
  frames/approach/approach-000.png, frames/crowd/crowd-000.png, frames/crowd/crowd-008.png, ...).
  A pair of frames taken from two poses is the only evidence that the input path reaches the
  controls at all: identical frames from a moving route mean the route was not flown.
- 1 of 12 frames in approach have under 5% of their pixels showing structure
  (frames/approach/approach-005.png), which is a frame filled by one surface: a wall, a roof or
  the sky. A leg that is mostly such frames is a leg aimed at the inside of a building.
```

Two readings are possible and must be separated before this is either fixed or recorded as unmet: **the check may be too strict about the first pair of each leg** (every `*-000.png` pair is named, which is the shape of a warm-up pair captured before the camera starts moving), or **the route really does stall at the start of legs and aim one frame into a building**. The frames exist to settle it — look at `overview-000` against `overview-001` and at `approach-005` — and the route's own arithmetic is in `tools/flythrough/plan.ts` with its aim tool at `tools/flythrough/aim.ts`. This is a Phase 10 criterion ("a flythrough driven through the real controls comes back clean") and it is **not met** as it stands.

## 3. What is owed, in order

1. **Adjudicate the flythrough failure** (above), then either fix the aim/route and re-run — it is now a five-minute lane — or record the criterion as unmet with the frames as evidence.
2. **The frame inspection in flight.** Two lanes are cutting all 44 certified frames into eight tiling crops each with `tools/inspect/crops.ts` and reading them at native resolution: `artifacts/inspection-gpu/hero/` (the eight hero frames plus both return frames) and `artifacts/inspection-gpu/sweep/` (all 36 sweep frames, 288 crops). Their reports are the native-resolution acceptance evidence the plan owes, and each must bind its conclusions to the frame SHA-256 in `artifacts/visual/complete.json`.
3. **Inspect the populated frames** (`artifacts/populated-capture/frames/`, 38 frames over four poses) — the evidence for "populated vehicles and pedestrians on one shared signal clock" and for the crossing's surge. The byte-identical crossing frames are the first thing to look at.
4. **Inspect the flythrough frames** at their own size, whatever happens to the check.
5. **Re-measure performance on this revision and pin the ceiling.** The old numbers describe the pre-tick-lever code; the ceiling is only bracketed between 500 and 1,000 drawn pedestrians. Both are wall-clock measurements and must not overlap each other or any capture.
6. **Independent read-only review** of the integrated revision against the acceptance criteria, findings resolved, with focused re-review of whatever the fixes invalidate.
7. **Housekeeping**: remove `artifacts/gpu-lane/wt` (branch `gpu-lane/pixel-lane-hardware`, merged — unlink its `data` and `node_modules` junctions with `cmd /c rmdir` first) and delete the merged branch. Left undone deliberately at handoff so the removal could not disturb a running lane.

## 4. The workflow that worked here

- **Orchestrator + goal mode, with lanes as subagents.** The main thread reads enough to write an assignment and to accept or reject a handoff; it does not implement. Every assignment named owner, outcome, base revision, workspace, allowed and excluded paths, verification, resource limits and the shape of the report wanted.
- **A visible task ledger** of the steps to the goal, marked done as lanes land — an explicit owner rule.
- **Land immediately, in the same session**: merge to main, run the gates, push. Work on a branch does not count.
- **Lanes work in worktrees** (`artifacts/<lane>/wt`, junctions to the primary's `data` and `node_modules` created with `cmd /c mklink /J`). **Never remove a worktree without unlinking those junctions with `cmd /c rmdir` first** — an earlier session ran `git worktree remove --force` without that step and emptied the primary's `data/` and `node_modules/`. Enumerate a worktree's ignored files before removing it: lanes write evidence under `<wt>/artifacts/`, invisible to `git status` and to any ancestry check, and one cleanup destroyed evidence that reviews cite by digest.
- **Verification rules that paid for themselves tonight, three times over**: a lane's "exit 0" is about the lane's tree, not yours — re-run the gate on the merged revision; read a gate's output whole rather than through `Select-Object -Last 2`, which hid four of six type errors; a mutation arm proves nothing unless the file it writes is inside the lane's own worktree (one lane's script wrote into the primary and broke a tracked test file); and a check that can find its own needle is not a check (three self-satisfying checks were found tonight by two lanes).
- **One expensive gate at a time**, and timing measurements never overlap each other or a capture.

## 5. Facts the next session needs

- **Machine**: 32 logical cores, RTX 4090 (Windows driver 32.0.16.1664, vendor numbering 616.64). A sibling `3d-maker` checkout runs its own suites and keeps 16–18 `chrome-headless-shell` processes alive; they are not ours to kill, and the box is shared.
- **Ports**: 4319 verdict/lifecycle, 4320 hardware, 4321 populated, 4322 render-defects, 4323 flythrough, 4330 post-chain, 4335 frame-budget, 4336 smoke, 5199 the sibling's dev server.
- **Data**: `data/scene` plus `data/network` were the 84-file payload the certificate binds; `data/scene/agents` now adds the 33-file human set. `data/agents/source` holds both archives at their pinned hashes.
- **Evidence**: `artifacts/visual/complete.json` (the certificate), `artifacts/verdict-run6-stopped/` (the software arm: eight hero frames, the return frame, the ledger), `artifacts/populated-capture/frames/`, `artifacts/flythrough2/frames/`, `artifacts/inspection-gpu/`, `artifacts/gpu-lane/REPORT.md`, `artifacts/tick-cost/REPORT.md`, `artifacts/population-counts/`, `artifacts/worktree-evidence/`.
- **Open measured findings the deliverable carries**, all in the plan with their numbers: the bus class is never drawn (refused at spawn for its footprint radius); the vehicle population drains (24.24 → 8.96 mean active over 240 s); no vehicle ever enters a governed junction, so the traffic half of the shared-clock criterion is unmeasurable in this fixture; **the population's throughput collapsed at the crossing change** (pedestrians 309 completed / 1,815 crossing events at `966930e` against 219 / 180 at `a800cee` and at HEAD, with 2,247 of 3,000 queued at 365 s); and the crossing pose's frames do not move.
- **Known gate bounds**: three failure paths in the visual instrument are written and reachable but have never been watched to fire — WebGL unavailable, the render loop stopping mid-sweep, and the camera never settling. Treat them as code, not evidence.
