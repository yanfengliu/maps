# 1501 — Flow diagnosis

Diagnosis: the longest queues are caused by an inherited conservative receiving-space check, exposed by the new central routes.

- Vehicles **1 and 21** mutually block at `junction:walk:622021124:0:0:ground0`. Their actual requests remain `receivingSpace:false` across all 61 recorded ticks. Each passes the production clearance function when the other is absent.
- Their generated oriented envelopes have **1.0153 m lateral clearance**, exceeding the **0.5 m** stop gap. Enclosing circles nevertheless overlap. The refusal originates in [vehicle-clearance.ts:61](C:/Users/38909/Documents/github/maps/artifacts/traffic1499/worktree/src/agents/population/vehicle-clearance.ts:61), unchanged from the base revision.
- Waits of **559.98 s and 550.42 s are continuous current halts**, not accumulated waiting. Two true boundary retirements occurred; total exit deadlock is disproved.
- Vehicle **7** is separate. Its final recorded requests have clear receiving space but correctly face a pedestrian signal phase. The cause of its preceding **291.87 s** halt remains **UNKNOWN**.

I support the owner’s proposed narrow correction: use conservative swept oriented envelopes on qualified straight source edges and continuous aligned seams, retaining existing circle checks on curves and other seams. Requiring an entirely straight passage would miss this witness because the compound curves farther ahead. This is design judgment, not implementation acceptance.

Evidence: [600-second result](C:/Users/38909/Documents/github/maps/artifacts/traffic1499/cpu-central-first.json), [actual request trace](C:/Users/38909/Documents/github/maps/artifacts/traffic1499/cpu-central-halts.json). Source pins matched; retained-pose reconstruction matched all 20 active routes. No edits, gates, browser sessions, or new artifacts. Final flow and visual acceptance remain open.
