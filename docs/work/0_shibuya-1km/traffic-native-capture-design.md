# Preparation201 — bounded native traffic design

Historical experiment; no active assignment. [The plan](plan.md) owns current status; [local rules](../../policies/local-rules.md) own current verification.

Design only. Root approved one continuous two-style flow in principle. No executor has been implemented or launched. Accept this exact design before artifact-only executor preparation; native execution needs a later exclusive lease after200 releases the GPU. Product/harness stay frozen.

## Exact input and clock

Primary base is ba3a0d7412b8fbf8e9360c75a17726da1a6458fd. integration195.json binds fourteen candidate files to befd10547a02829e0b4f80b4078bdd3f9a47b337ed7ab9c37537ce37f70d0d14;201 independently matched all fourteen. Later capture binds its actual final build, complete runtime graphs, served files, harness and GPU separately.

Use one fresh headless1280x720/DPR1 context and public URL `http://127.0.0.1:<leased-port>/?agents=1&pedestrians=0&vehicles=6&seed=5970698&time=noon&style=satellite`. Assign and freeze the strict localhost port before executor admission. Existing populationFromQuery reads these counts/seed; unchanged spawnIntervalTicks defaults to1. The CPU replay used exactly0pedestrians/6requestedvehicles/seed5970698/spawnIntervalTicks1/dt1/60. No class, scale, route, gate, demand or clock override. Requested6 does not mean6active; preserve waiting/pending demand and every named refusal, including bus refusals.

The clock origin is source-established, then live-checked. src/app.ts:195–196 holds fixed steps before loop.start at390. At278–301 it constructs the population, mounts its asset renderer and only then releases the clock. RenderLoop clears the accumulator while held/on release; fixed steps are1/60, capped at5per rendered frame with excess backlog discarded. Population update at tick.ts:1850 increments its own tick count and records that shared simulatedSeconds. Page-load time is not this clock.

Record the first observed attached population plus attached renderer with browser epoch/pageMs, ticks/simulatedSeconds/frame and Node brackets. This is first-observed attachment, not its exact instant. Require abs(simulatedSeconds-ticks/60)<=0.000001 and one unchanged document epoch throughout. End only after BOTH actual population.ticks>=7200 and browser pageMs has advanced>=120000 since that first observed attachment. Normal load may make this longer; no wall-time-to-tick estimate, rewind, clock scaling, pause or state injection.

## Available evidence and pose

The frozen bridge supplies status,camera,tiles/revision,style,lighting,post,population and signals. Population supplies requested/active/waiting/pending, time/ticks, lifecycle totals, crossed/completed, grants, boundarySpawns, refusals and renderer-wide counts. It has no per-actor ID, generation, XYZ, route or travelled distance. Root chose aggregate continuity plus directly inspected native body motion; no new observation seam. Source setStyle applies presentation consumers/post invalidation without reconstructing population, but this does not replace live controls checks. Renderer-wide counts are not visible-body counts.

The relevant existing instruments are OrbitDriver and PopulatedDriver for actual mouse/wheel pan/orbit/zoom, tools/flicker/burst.ts for synchronous real-RAF canvas copy, and retained populated-locator/rail native preparations for binding and ownership. Older populated/flythrough plans are not current event witnesses.

The one authorized201 CPU replay completed7200updates in769.7373ms, disposed in finally and reproduced10activations(3kei/7taxi),8retirements,20releases,4497grant returns,zero authorityViolations/retiredInPlace, ending2active/4waiting/0pending. Source/test/tools, actual network/fleet and declared shared-cache inventories were equal before/after. Compute was released before200 gates. positions.json SHA256:2dae6726de469684f347d59a7da3eed7c81f11ab6b3cf0fd69e1b75da51f1374. These are historical CPU references, not guaranteed browser event times or pixels.

Its useful late taxi slot1/generation3 enters tick5853 at XYZ(491.198944,27.616205,-498.588623), changes heading near(456,24.6,-456) around6990–7050, and continues to(464.467834,25.012182,-449.215576) at7200. Sharp quarter-second heading reversals remain visible in the CPU record; native review must judge them, not assume a smooth turn. That actor does not retire by7200. Its exit is not claimed. Other retirements are aggregate evidence only.

Frozen single view: target(466.1369044166964,15.2,-485.8630955833036),distance80m,azimuth pi/4,polar0.8. Derived eye(506.71669292873844,70.93653674777323,-445.28330707126156). pose-plan.json SHA256:edd0e37d9b2535f8bd85aaf73f8228ec63671abf892a92c314e2cc517bcc02b8. Post-update CPU origins project to x302–924/y330–487,range62.5–70.4m at actual55degree FOV. Terrain-vertex clearance within8m is43.5065m. Nearby building-centre/roof context does not establish line of sight or full-body visibility.

Reach once through existing real controls: zoom620 for travel, PopulatedDriver.aimAt(target,1),zoom80,orbit pi/4,.8,tiles-idle,preservation settle. Require completion before5700, horizontal target error<=1m,distance error<=2percent,angular errors<=.012rad,target-Y drift<=.005m. These are driver arrival limits; style preservation remains independently<.005m. Record actual pose/ticks. After arrival no canvas input. A hidden, clipped, missed or unrecognizable body means insufficient view; retain it without same-run retarget/retry or inference from projection.

## Exact output and event denominator

One page/context, one fixed pose,19single-frame native copies plus2bursts of12consecutive app frames:43native PNGs total, two actual style changes, no video. Entry/movement is Satellite; continued movement/turn is Cartographic; keyboard return is Satellite. Root does not require every event repeated in both styles.

| Phase | Required outputs |
| --- | --- |
| Qualified aim |1Satellite still before5700 |
| Entry context |5Satellite stills at/after5760,5820,5850,5880,5940 |
| Entry movement |1Satellite12-frame burst after5940still, before switch |
| Pointer change |1Satellite still at/after6000before real selection,1Cartographic still after |
| Continued movement |1Cartographic12-frame burst at/after6120,then2stills at/after6480,6840 |
| Turn window |7Cartographic stills at/after6960,6990,7005,7020,7035,7050,7080 |
| Keyboard return/end |1Cartographic still at/after7180before selection,1Satellite final still after7200ticks AND120real-seconds |

Labels are thresholds, not exact captured ticks. Read current live ticks before every wait/copy and record actual lateness. Capture overhead may pass a fine threshold; use the next actual frame, never fill two outputs with one frame ID. Entry images must include an actual pre5853frame and a later frame at/above5853but<=6000. Turn images must start<=6990,end>=7050,and include>=3distinct actual observations within[6990,7080]. If overhead consumes these windows, preserve partial/insufficient coverage rather than manufacture late duplicates.

Required live observations: attached population/renderer; requested0/6; pedestrian active/rendered0; requested=active+waiting; actual conservation spawned=retired+active+vehiclePending+pedestrianPending; zero authorityViolations/retiredInPlace. Ticks,simulatedSeconds,spawned,retired,reused,generations,grants,completed,crossed must not decrease. Record every refusal and all waiting/queued/pending values without a6active floor.

Before/after the entry window, require positive live deltas in BOTH spawned and retired (CPU reference8/6to9/7). After pointer selection require another positive spawned/retired delta by the end (reference9/7to10/8), positive crossed progress and advancing ticks. Compare and disclose reference mismatches; do not force actual totals to a historical answer. Each burst requires rendered.vehicles>0 and positive tick advance; final status needs active/rendered vehicles>0, crossed/completed/grants>0 and named route refusal(s). These checks establish actual aggregate flow, not the selected body or a turn. Native reviewers must separately see recognizable entry, movement and turning behavior; a positive counter cannot rescue an empty frame.

## Same-frame copies and styles

Artifact-local adaptation of the qualified synchronous RAF copy is allowed in principle. tools/flicker/burst.ts lacks population/signals; rail186/native.ts requires cameraClearance absent here, so neither is an unchanged drop-in. Use only existing readonly snapshots. Copy #scene to detached2D canvases inside real requestAnimationFrame after the app callback, encode after each burst, preserve partial successful copies on failure and release canvases/RAF/timers in finally. No render call, app setter, RAF interception, fake DOM event or camera/actor assignment.

Before and after drawImage in one synchronous task read cloned epoch,pageMs,URL,app-id,DPR/viewport,status,camera,tiles,style,lighting,post,population,signals. Require identical app-frame ID and identical immutable observations apart from clocks; status ready=true/contextLost=false/error=null,post active=true/error exactly null,tiles idle/pending0/failed0/error-null,expected style/noon,native1280x720/DPR1 and the pinned hardware adapter/driver. Each burst has exactly12 app-frame IDs advancing by1 and taaAccumulating=false. Gaps, partials and blank copies refuse. Independently decode PNGs with existing native dimensions/spread/colour checks; retain bytes,length,SHA256 and actual state. Pixel change alone is not actor motion.

Pointer change clicks World style, asserts its listbox expanded, then clicks its own scoped Cartographic option. Keyboard return focuses/Enter,asserts expanded,End/Enter toSatellite. Require selected data-style-id,closed listbox,bridge style and URL agreement. Before each use OrbitDriver.settle('preservation'); assert position/target displacement each<.005m,unchanged epoch,nondecreasing frames/ticks/cumulative progress and unchanged requested demand. Then observe fresh progress/native bodies. No mechanical individual-actor preservation is claimed.

URL checks permit only the declared leased origin/path/query keys,one value each,unchanged agents/count/seed/time and current selected style. src/main.ts changes the style query via history.replaceState; require that real behavior, not initial-string equality or parameter order. Retain188 as the wrong-predicate counterexample.

## Execution envelope and acceptance

Adapt the proven populated-locator retained-handle owner with exact path/marker/port-only transfer where justified, not a new general launcher. Explicit primary cwd,strict localhost port,reuseExistingServer=false,hardware flags,headless,DPR1,workers1,retries0. Node24; owned cache-free/effective-equivalent preview config,owned Playwright/npm/Vite caches and TEMP/TMP outside every Git checkout. No build/install/data/gate in201; consume200's completed exact-compatible build after inspection.

Before any launch, independent review covers exact copier,policy,denominator,owner transfer and dependency freeze. CPU qualification exercises the actual adapted methods: positive/partial copy,error preservation,same-frame population/signals mismatch,gap,blank/missing/duplicate outputs,short duration,insufficient windows/lifecycle delta,URL/style mismatch and cleanup. These qualify the instrument, not real RAF delivery. No such executor/qualification has run yet.

Bind exact candidate,complete source/build,served scene/network/agent files,actual harness dependencies,GPU/driver,pose and CPU reference before/after. No changed graph is silently transferred. Root-authored docs outside runtime graphs need not become pixel inputs. This is observed-instant binding,not continuous mutation monitoring.

Use600s retained-owner and480s test backstops,120s startup/renderer bound and existing8s hardware native-burst bound. The real120s observation is intentional. No retry,window reduction or deadline extension. Fresh run directory/predeclared43labels/partial ledger. Write each actual native record as it lands; preserve partial failure.

Finally close context/browser/server; fallback only through retained verified creation/path handles with live pinned-parent admission. Independently inspect retained/scoped/unadmitted survivors and leased listener, then remove closed owned temp/cache only. Never admit protected foreign Edge29932 creation2026-09-26T20:40:54.268535-07:00. No PID-only ancestry or broad shared-application termination.

`collection-complete.json` requires all19singles+24burst files,hashes/dimensions,state/window/clock/lifecycle/style predicates,no page/console errors,unchanged bindings and empty final resource arrays. It is collection completion only,awaiting independent visual review,never artifacts/visual/complete.json. Reviewer opens all43images individually at native resolution,binds judgments to digests,and judges visible entry/movement/turn,style/camera continuity and obvious motion/occlusion defects. The selected actor's full lifecycle,continuous120s pixels,smooth turns,support/contact,bus delivery,default populated scene,3000/200population,full-city safety and60fps remain outside this milestone. No native frame or appearance verdict exists yet.
