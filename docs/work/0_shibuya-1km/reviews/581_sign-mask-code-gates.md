# 581 — canonical gate checkout refusal

Bound: attempted candidate qualification on FRONTAGE, Node v24.12.0, HEAD bfecaeae65eaceadf02b52122c31965bfe817388. Product changes remain uncommitted; no main adoption.

The exact unchanged `npm run visual` command exited 1 after 5210 ms under a 45,000 ms probe limit. `tools/visual/checkout.ts` refused this linked checkout. `verify-output.ts` checks it before reset, build, Playwright or browser launch. The repository requires canonical certification in PRIMARY; this assignment excluded PRIMARY. The guard remains unchanged.

| Required command | Actual result |
| --- | --- |
| `npm run build` | Unrun after admission refusal. |
| `npm run typecheck` | Unrun. |
| `npm test` | Unrun. |
| `npm run visual` | Exit 1: primary-checkout admission refusal. |
| `npm run audit` | Unrun; finding counts unavailable. |

The 449-file source/config snapshot, staged-content witness, raw index SHA a8b3d9aadf0f1c7304b6519ad2da4d81f16ed58b80675f5b3ca20d6e67ed2c11 and owned index flags match before/after. Signage SHA is e39d0d2e3334877e910a9a9fc81234773458610d056ba8721a89540ca4153318; test SHA is f829e3f96308fe1f67efa8712242f5808f4714f900a64856dac67106aefa1e3e. Git emitted a read-only global-ignore permission warning; metadata commands returned successfully.

FRONTAGE had no `artifacts/visual` before or after. No certificate, 44 captures or three lifecycle records were produced or transferred. Existing PRIMARY evidence was untouched. No screenshot or appearance acceptance is claimed.

Available final CIM census found no matching 581/canonical-visual processes and no listener on 4319. No browser, server or GPU was dispatched or terminated; user port 5319 was untouched. The first empty-temp cleanup refused Node compile-cache contents; a complete zero-reparse census then permitted deletion of only those exact owned files/directories. Npm refusal logs and source/index witnesses remain under `artifacts/mask581`. GPU/port lease released. Parent owns reassignment of the four independent checks and resolution of PRIMARY qualification.
