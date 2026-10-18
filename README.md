# maps

Turn real-world 3D map data into a simulated Shibuya scene with Vite, three.js and TypeScript.

[The Shibuya plan](docs/work/0_shibuya-1km/plan.md) owns the current outcome, acceptance criteria, progress and next work. The deliverable is incomplete; dated searches, handoffs, reviews, snapshots and devlogs preserve their original evidence and instructions, not a second current queue.

## Run locally

Use Node 24 from `.nvmrc`. Run `npm ci`, restore the reviewed runtime data, then run `npm run dev` at `http://127.0.0.1:5319`. `npm run build` builds the application; `npm run preview` serves it at `http://127.0.0.1:4319`.

The runtime cache is separate from the bundle. Follow [scene preparation](docs/policies/local-rules.md#scene-preparation-and-presentation-bounds), including the external rail packet, before viewing the scene. Fresh `data:setup` output does not inherit reviewed cache identity and does not recreate the rail packet. See [AGENTS.md](AGENTS.md#gates) for verification prerequisites and the five code gates.

## Documentation

- [Local rules](docs/policies/local-rules.md) — current repository requirements; [AGENTS.md](AGENTS.md) owns fleet workflow and world invariants.
- [Data and coordinate provenance](docs/work/0_shibuya-1km/design.md) — source decisions and dated measurements.
- [Reference contracts](docs/reference/network-contract.md), [pavement recipe](docs/reference/pavement-recipe.md), [facade emission](docs/reference/facade-emission.md) and [agent assets](docs/reference/agent-assets.md) — bounded implementation details and their history.
- [Defect register](docs/learning/defect-register.md), [queued lessons](docs/learning/lessons.md) and [gate proofs](docs/learning/gate-proofs.md) — symptoms, unresolved regression checks and observed failing controls.
- [Devlog](docs/devlog/summary.md) — dated product history, newest first; authored review rounds remain beside [the plan](docs/work/0_shibuya-1km/plan.md).

## Cached local walker

Ordinary startup includes one held walker with the default seed 5970698. Use the real **Start walking** button after the scene is visible. `?agents=0` keeps the appearance lane free of actors; explicit generic population requests and other seeds remain separate. This singleton does not establish the 3,000-pedestrian/200-vehicle performance target.

Prepare its durable cached packet with `npm run data:local-walk` after the scene, network, vehicle assets and control hardware are ready. `data:setup` runs this step last. An exact existing packet is verified and reused; a missing packet is generated from the reviewed cache, using Blender 5.2 selected by `MAPS_BLENDER_PATH`. Different or partial output is refused and preserved. Preserve a previous reference/packet run before retrying preparation.

Windows offline extraction also requires PowerShell 7 or newer, with its `pwsh.exe` directory on `PATH`. The command refuses a missing host before creating extraction output and refuses an older host before starting Blender. Add the correct host directory to `PATH`, preserve any diagnostic or partial run, and retry with fresh owned output. The Windows helper creates Blender inside an owned process job and confirms that job is empty before accepting completion. Timeout or interruption always refuses completion. Ordinary scene viewing uses the prepared packet and does not start PowerShell or Blender.

Required cached inputs are the reviewed scene/network bytes, `data/scene/agents/commuter-female-source.blend`, the female manifest and all three delivered GLB/position/normal LODs, plus the exact baker and source tuple named by `tools/agents/local-walk/profile.mjs` and `input-contract.mjs`. Missing or changed inputs refuse with their paths. Restore those reviewed bytes before preparation; fresh remote map data does not inherit their acceptance. The command extracts references from the cached blend and does not call the human baker. [811](docs/work/0_shibuya-1km/reviews/811_walker-cached-reproduction.md) and [812](docs/work/0_shibuya-1km/reviews/812_walker-packet-review.md) record the cached reproduction and its bounds.

The packet stays in gitignored `data/scene/local-walk/packet`, outside the bundle. Vite dev/preview serve only five hash-verified buffers through `/local-walk/`; `/scene/local-walk/` aliases and receipts are refused. A non-Vite host must provide the same verified service along with the scene/decoder mounts. Preparation retains `productionReady:false`, height refusals, the conservative obstacle overlap and provenance caveats. Source correspondence is not terrain-contact, collision or continuous-gait acceptance.
