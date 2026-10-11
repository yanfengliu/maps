# 685 — Storefront source feasibility

2026-10-11. **Conditionally feasible; root owns admission.** Actual tile/batch metadata agrees with the pinned retained decode: GML `bldg_5f7ff4f3-a620-4fd0-a380-3ec46435cd27`, batch 63, node 0/primitive 1, triangles 494/495. No new decode ran.

The plane contains existing jamb anchors x281/314/347/379 and header y3549 in atlas pixels. Interpolate UVs for three apertures between inner jamb faces, below the header and above `floorY`; retain jamb dimensions/pavement grades.

Native source photography shows a dark lower band with vertical divisions. Doors, interior depth and occupancy are unresolved observations. Rooms/reveals/ceiling strips and unequal brightness, including one dark bay, are explicitly authored.

The current wall remains opaque behind the surround. Rooms alone would be hidden. Require one Satellite-only aperture mask across beauty/normal/AO/shadow passes; preserve original buffers, collision, photograph outside apertures, labels, structure, roads and global lighting. Added resources belong to the tile transaction; Cartographic restores the complete wall and hides additions. Exact mask containment and disposal remain implementation obligations, not verified behavior.

Use 679's eight matched originals: noon/dusk fixed block, dusk close, seeded dusk oblique. Accept visible occupation and depth; reject blank inserts, glow ribbons, borders, label loss or road regression.

Necessary SHA-256 pins matched before/after reads:

| Input | SHA-256 |
| --- | --- |
| `src/scene/crossing-frontage.ts` | `662c7772fa5bd9c52fe5703a76d650223a131a772a70b8ca6deaa4e0cb304b90` |
| `src/scene/crossing-corner-material.ts` | `2a7d5a5d940715c441ed068a2ab3b1c5cc9a8f3285562c68f0c0032b055e1991` |
| `src/scene/lighting.ts` | `776fcd55b719c7d90273c85d88501aefebcedad039bf39d33d45d32de6116219` |
| `data/scene/buildings/data/data518.b3dm` | `5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b` |
| `C:/Users/38909/Documents/github/maps/artifacts/graphics-facade-source-study/source-study.json` | `af5ed8a3571f5b481b3403dff94b2bbf35ef5f02bbfd94cad1f913742b4ada20` |
| `artifacts/frontage348-20260928/source-frontage-native.png` | `6c14b22f717dd9e10230a68bba76df937ba78069832e23a4a2fd28dfe6ad8aaf` |
| Embedded/retained `artifacts/frontage348-20260928/source-atlas-0.webp` | `eed564fded549988afc20edc49a5bc67c19590c4ea53b4324eaee34ac76179fb` |

Only this report written. Readers released; no runtime/process or shared-input mutation.
