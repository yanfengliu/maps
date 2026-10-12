# 795 — physical facade native appearance review

2026-10-11, fresh independent critic795. **REJECT_APPEARANCE.** The candidate makes window rows readable, but the six supplied originals do not show convincing glazing, room depth or photographic richness. Further qualification of this appearance is not justified.

## Scope and method

Read-only appearance review of the actual authored792 baseline and candidate at three noon Satellite views: fixed close, fixed block and seed721 held-out north. I opened all six PNGs individually with `view_image` at `detail: original`, 1280×720. No contact sheet, crops, editing, additional capture or prior-trial images were used. I recomputed all six file lengths and SHA-256 values and matched them to `native-inspection.json` before inspection. The manifest itself is 2,683,789 bytes, SHA-256 `759f79e68209b9c8fad421d3ce3ae695de41d33aa50247d68343780be5a1411d`.

The assignment identifies baseline compiled715/query0 and candidate790 compiled788/query1, on main `45edd0469a32ff594733f599a3595600fbac7b7f` after executable base `c428b6c`. This review does not independently establish source-to-draw identity. Observations refer to the visibly changed tall, narrow building near image centre. The manifest marks target four-face/room signature, per-material GPU identity and source GPU draw identity unavailable. I cannot identify a displayed pane with a particular face, room, GML feature or physical material from these pixels.

## Pair verdicts

| Pair | Native observation | Verdict |
| --- | --- | --- |
| Fixed corner close | The baseline wall is dark and blurred. Candidate windows introduce orderly rows, thin dark rims and a more readable two-face corner. Most panes are pale, nearly uniform rectangles; minor tonal streaks do not resolve into separate glass, a room beyond it or recognizable occupation. The rims add edge definition without convincing room depth at this view. The face treatment reads as a clean generic grid against surrounding photographic buildings. The broad dark corner pillar is coherent, with no obvious upper-corner tear, but it does not add persuasive material detail. The rows stop below a conspicuously tall blank cap; the unchanged roof and cap remain visually disconnected from the regular window treatment. | Reject. Better aperture legibility is insufficient for believable glass and depth. |
| Fixed corner block | The new grid is easy to find, and its row rhythm survives distance. It compresses into bright repeated marks on a dark box. Interior detail and glass response are not readable, so the strong contrast makes the simple treatment conspicuous without establishing material realism. The blank upper termination remains legible. The surrounding roof masses, alleys and neighboring facades show no obvious gross change in this paired inspection. | Reject. More visible windows do not produce a convincing building at block scale. |
| Seed721 held-out north | The baseline exposes a dark, largely featureless narrow face. The candidate adds repeated pale triplets. They again read as flat inserts, with no persuasive visible reflection, room separation or varied occupancy. The tall empty cap remains prominent. Foreground roofs obscure the lower face, so the treatment's lower continuity cannot be assessed. No obvious surrounding architectural regression is visible in this still pair. | Reject. The alternate view confirms the same weak material reading. |

The baseline is itself poor; rejecting this candidate does not accept the baseline. Within the supplied apertures, the candidate exchanges indistinct photographic information for crisp but mostly blank-looking pane content. The retained surroundings still exhibit blurred facade and roof texture. These are bounded visual observations, not proof of lost source bytes, material causality or exact unchanged surrounding pixels.

## Direction and efficiency

The reported physical room construction is a different implementation, but the visible result remains a pale regular grid with weak glazing and depth. On these originals it repeats the weak visible idea described in the assignment. I did not reopen the earlier rejected trials, so this is not a fresh image-to-image ranking against715 or751. A genuinely different visible material/content direction is justified before more capture or qualification: the result needs readable separation between glass and space behind it, believable variation and a coherent upper termination at the already-used close and block scales. More hidden geometry or proof volume does not answer the present appearance failure. Preserve this bounded trial and redirect; do not expand it across the city on this evidence.

## Inspected originals

Paths below are relative to `artifacts/authored792/originals/`. Every row was inspected individually at native resolution and its live bytes matched the bound manifest.

| Original | Bytes | SHA-256 |
| --- | ---: | --- |
| `baseline/noon-fixed-corner-close.png` | 855,811 | `ee232f25c6227526b9e5df08d397dc1b11c9673978c02b51df5ad5e301505761` |
| `candidate/noon-fixed-corner-close.png` | 869,965 | `067f5f5dc2b27cb714784f45c58708abe4738f1330fddc385bf0b4175dc9664d` |
| `baseline/noon-fixed-corner-block.png` | 1,186,771 | `1c7cfa97d7d4bd66160c56938c83a95282766b2d39853a8bf75f26f2d7dc33e9` |
| `candidate/noon-fixed-corner-block.png` | 1,190,022 | `a4dd79bd9b1cea3f01fa5cdf0e5f4014482efd932b580b1f7b1fb163949160c7` |
| `baseline/seed721-held-out-north.png` | 840,352 | `a4e3a05f3e919c92ee62f01dcab29b6be98c44cd840f33b17e06ea39559b34f4` |
| `candidate/seed721-held-out-north.png` | 842,641 | `dc650f3ccfcc10b6471bdc9b218f0812fce3eb97f33600b1593a222253a0c88f` |

## Unrun checks and closure

This reviewer ran no build, types, unit tests, audit, renderer, browser, server, full visual gate, motion, lifecycle, style return, dusk, lower-frontage, population/FPS or whole-map checks. These stills establish none of those outcomes, and do not resolve the reported771 cache-error adoption blocker. The manifest reports zero raw errors, unchanged inputs, instrumentPassed true and page/context/browser/browserServer/preview/esbuild cleanup true; I read those fields but did not independently audit instrument or process closure. Worker794 owns that separate review. Full runtime lifecycle, HTTP browser-body identity, resource disposal and causal depth/reflection remain outside this verdict.

Critic795 launched no browser, GUI, server or persistent child process and created no temporary artifacts. Its short read/hash command processes completed. The only retained write is this review; no source, shared progress or Git state was changed. Root owns acceptance and integration.
