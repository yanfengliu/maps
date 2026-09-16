# 2026-09-16 — the acceptance state on main, and a digest I quoted without measuring

## Where the deliverable stands

Measured on main at `966930e`, acceptance command
`node tools/agents/population-run.ts --pedestrians 3000 --vehicles 200 --ticks 21600`:

| | |
| --- | --- |
| simulation digest | `2b4f9619e3f0c40a29a710de2ad4da9346705da4789762d9c3601cf7c6156072` |
| `authorityViolations` | 0 |
| `retiredInPlace` | 0 |
| pedestrians | 1,815 crossed / 309 completed |
| vehicles | 311 crossed / 203 completed |
| tick | p05 8.328 / median 16.033 / p95 31.452 ms |

The tick figures were taken with three other lanes holding the CPU and are contended;
they are recorded as the state of this machine at this moment, not as a performance
claim. Earlier quieter readings of the same revision family were median 12.65 and p95
16.46 ms.

## The correction

The commit that moved the crowd's instance composition into one shared attribute
(`dcd3a95`) says in its message that the simulation digest is `4a8e5169…` **before and
after**. That number is stale: it is the digest of a build 34 commits old, and the
current revision prints `2b4f9619…`.

What the change actually touches is `src/agents/render/humans.ts` and
`src/agents/render/pose.ts` — both under `src/agents/render/`, neither on any path the
simulation executes — so a digest difference is not attributable to it and the claim's
*conclusion* is right. But the claim as written asserts a measurement that was not
taken: nobody ran the acceptance command before applying that change, and the value
quoted for "before" came from the passage-window lane's record rather than from this
revision.

The lane itself caught the same class of error and said so: its own report notes that
the digest in its brief "is stale — not what this base revision produces". The brief
was mine, and it carried the stale value forward.

## Why this is worth a devlog entry rather than a quiet fix

A digest is evidence and a commit message is not queryable. Anyone auditing whether the
render change altered the simulation would find the sentence, believe the number, and
have no way to check it — the same shape as the stale plan statements and the gate
header that described an assertion as red while it was green, both of which this
session has already had to correct in place.

The practice that follows: **a repeated constant belongs in a file that can be read,
not only in a message that records one moment.** The tree already carries this state in
`tools/agents/population-run.ts`'s own output and in the tool digests other lanes
record; what it lacks is one place that says what the acceptance revision currently
prints, which is what this entry is.

The commit message is left as it stands, because rewriting history needs the owner's
authorization and the message is a record of what was believed at the time. This entry
is the correction.
