# Stanford source data

`stanford-buildings.geojson` contains 648 actual OpenStreetMap building and building-part footprints, selected within Stanford University's mapped campus perimeter (`way/29268613`, version 52). It includes the academic core, campus housing, athletics and medical facilities inside that perimeter. This is an OSM campus area, not a cadastral or legal university land boundary. Surrounding Palo Alto buildings are excluded. Complete outer edges must remain inside the campus polygon; clipping never invents a replacement footprint. Polygon courtyards remain holes.

The data is © OpenStreetMap contributors, available under [ODbL 1.0](https://www.openstreetmap.org/copyright). Display that attribution in the map. Keep the database license and source notice when redistributing this data. No Apple map data or artwork is included.

The four source extracts came directly from the official OSM API on 2026-10-20, between the per-input UTC retrieval times recorded in `stanford-provenance.json`. The final input arrived at `2026-10-20T06:13:20.820Z` (October 19 in California). Each source has its exact query URL, length and SHA-256 recorded. `fetchedAt` is the last input's retrieval time, not an OSM replication timestamp or generation time.

The 81 `osm-height` features retain recorded OSM heights. The 80 `osm-levels` features estimate height as recorded storeys × 3 metres, plus recorded roof height or roof storeys × 3 metres. The 487 `estimated` features have illustrative type-based default heights. `base` is an OSM minimum-height or minimum-level extrusion offset, otherwise zero; it is not terrain elevation. Colors are an authored sandstone and terracotta palette. Recorded OSM tags are retained under `osm:*` properties, and every feature carries its OSM ID and version. The Main Quad source records five levels plus one roof level, which produces 18 m under this policy; that tag is retained transparently rather than represented as a measured architectural height.

The Main Quad retains its seven courtyard holes. Memorial Church uses its actual building-part footprint and an explicitly estimated 24 m height. Hoover Tower uses eight actual stepped building parts with recorded heights up to 87 m; a full 87 m outline would hide those parts, so the presentation selection omits that outline and inherits its name onto the highest part. A simple outline is suppressed only when a contained mapped part covers at least 80% of it. The provenance lists the omitted outline and every retained part. Explicit `height=0` outlines are not turned into default-height buildings. Explicit OSM building relations and multipolygon members also prevent duplicate outlines. This is a source-based extrusion model, not a detailed roof/texture reconstruction or survey.

The 427,316-byte building asset is intentionally larger than 256 KiB because the product requires real footprint vertices and courtyard holes. It remains below 512 KiB. Compact JSON retains original OSM coordinate precision without geometry simplification. The campus boundary is 2,496 bytes. SHA-256 values and exact byte counts are in the provenance file and pinned independently by the data tests.

Run the dependency-free Node 24 fetch and conversion script from the repository root:

```sh
node tools/data/fetch-stanford.mjs
node --test test/campus-data.test.mjs
```

The script fetches four small API map tiles sequentially to stay below OSM's 50,000-node request limit and retains raw XML in ignored `artifacts/stanford-source/`. It fails on incomplete source geometry or output exceeding 512 KiB. OpenStreetMap is editable, so a later network fetch can produce changed output; review new geometry, heights, names and provenance before updating literal test pins.

For deterministic offline processing of the same retained source bytes:

```sh
node tools/data/fetch-stanford.mjs --cached --source-dir artifacts/stanford-source --output-dir artifacts/stanford-rebuilt
```

Cache file modification times record individual retrieval times. If copying source XML changed those timestamps, pass the original provenance's `--fetched-at` value to preserve its final retrieval time. Geometry bytes depend only on source elements and the checked-in converter; they do not depend on retrieval time, file iteration order or randomness. The fetch cache is temporary evidence, not a public runtime dependency. Tests use retained output bytes and synthetic independent negative cases, so they do not download or require the raw cache.

## Campus environment

The separate `stanford-environment.geojson` contains 1,002 features: 726 tree positions, 80 lamps, 163 original bench points, 25 mapped bench paths and eight derived circular seat walls. Its 196 seating entries are feature assemblies, not a physical-seat inventory. Point and line source coordinates/tags stay intact; the eight seat walls interpret exact mapped Quad planting boundaries using the Stanford Gardens guide. Their width/height are estimates. Five photo-supported point benches use a courtyard family; 127 material-unknown points and 23 material-unknown paths remain neutral markers. Provenance `retained` counts source nodes only, so it equals `beforeExclusions` less `excluded`; the 25 paths and eight seat walls are counted in `benchLines`. Without a direction tag, `modeledFacing` is estimated from the nearest mapped footpath that does not touch the bench: a footpath with a segment within 5 cm of it is set aside whole. A bench path faces across its own overall line toward that footpath's side; a closed ring, having no such line, faces the footpath. A bench point lying on a footpath faces across it, and any other point faces the footpath. The 249,297-byte asset remains below 256 KiB; provenance distinguishes mapped facts, authored interpretation and source exclusions. Reproduce with `node tools/data/build-campus-environment.mjs --source-dir <cached extract directory>`; the four pinned extracts reproduce it byte for byte. Original building/campus inputs are preserved. See [bench source bounds](../../docs/work/0_bay-area-stanford/bench-accuracy.md) and, for trees and lamps, [the environment record](../../docs/work/0_bay-area-stanford/campus-environment.md).

The 610-byte `stanford-sculptures.geojson` contains two source-verified OSM point anchors: The Burghers of Calais and Angel of Grief. Its separate provenance pins identities, coordinates, source hashes and Stanford reference photographs. Authored 3D poses, dimensions, orientation and relative figure placement are estimates. No photographs or third-party scanned meshes ship with the map. See [sculpture source bounds](../../docs/work/0_bay-area-stanford/campus-sculptures.md). Both local side inputs load only with the existing near-campus geometry worker.
