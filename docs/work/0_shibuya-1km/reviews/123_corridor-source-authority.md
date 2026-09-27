# Corridor source authority and bounded treatment proposal

The three witnessed points fall within an OSM-mapped rail corridor north of Shibuya Station. Four parallel ways explicitly say `railway=rail`, `embankment=yes`, `gauge=1067`, `electrified=contact_line`, and `level=2`. All three points are between their outermost centre lines. This is source-backed classification, replacing the earlier unresolved hypothesis; it is not inferred from the olive appearance. The source does not establish the exact ballast boundary, track surface height or bridge deck elevation. `level=2` is a level identifier, never a height in metres. [OSM railway tag](https://wiki.openstreetmap.org/wiki/Tag:railway%3Drail), [level definition](https://wiki.openstreetmap.org/wiki/Key:level).

This investigation used the root-supplied frozen visual revision `13ef7e83c56202a17aa56975ef5786825bfcff2f`. No product, scene cache, network cache, source file or Git state was changed. No browser, GPU, server, build, gate or data producer ran. Writes are confined to this ignored evidence directory. Root separately selected the 1800 m context opening and accepted the facade native-source limits; neither decision was changed here.

## Exact source and point relationship

The numerical inverse calls the canonical forward [projection:100](C:/Users/38909/Documents/github/maps/tools/geo/plane-rectangular.ts:100) and [world transform:74](C:/Users/38909/Documents/github/maps/src/world/frame.ts:74), with the existing AOI origin. The roundtrip residual is below 0.00001 m; this checks the numerical inverse, not survey accuracy. Source alignment, imagery tracing and WGS84/JGD2011 epoch differences can still produce metre-scale uncertainty. No synthetic shift was fitted to make the tracks line up.

| Witness | Latitude, longitude | Nearest above-ground rail centre | Distance | Position between outer track centres |
| --- | --- | --- | --- | --- |
| Middle(889,318), world(66.9618,20.1286,-72.3452) |35.6601529146,139.7012384991|146060426|2.110 m|3.508 m inside nearest outer centre; span14.473 m|
| Near(876,372), world(70.3330,17.1209,-12.2560) |35.6596113276,139.7012766249|146060426|2.426 m|9.590 m inside nearest outer centre; span20.573 m|
| Far(944,271), world(80.1442,20.0833,-195.2035) |35.6612604853,139.7013822744|155269600|0.930 m|4.947 m inside nearest outer centre; span11.963 m|

These distances and cross-sections concern horizontal centre lines, not surveyed track beds. No enclosing area polygon was returned for these points by this bounded extract; that does not prove no larger containing OSM polygon exists beyond the query. The four line objects provide the decisive evidence.

| OSM source object | Version/date of way edit | Name | Full projected x extent | Full projected z extent |
| --- | --- | --- | --- | --- |
|[146060273](https://api.openstreetmap.org/api/0.6/way/146060273.json)|v42,2026-01-04|Yamanote Line|59.292…77.561|-278.704…-11.147|
|[146060426](https://api.openstreetmap.org/api/0.6/way/146060426.json)|v39,2026-01-04|Yamanote Line|67.639…81.895|-277.122…-11.724|
|[155269600](https://api.openstreetmap.org/api/0.6/way/155269600.json)|v18,2025-08-25|Yamanote Freight Line; Saikyo/Shonan-Shinjuku aliases|73.660…85.814|-276.174…-12.237|
|[155269603](https://api.openstreetmap.org/api/0.6/way/155269603.json)|v24,2025-08-25|Yamanote Freight Line; Saikyo/Shonan-Shinjuku aliases|77.552…89.760|-275.270…-12.018|

The four direct OSM API URLs were fetched successfully with HTTP 200; their versions, tags and node references equal the fresh Overpass objects. `url-verification.json` records bytes/hashes. Actual tagged objects, geographic geometry, node IDs, projected polylines, cross-sections and the proposed clip are retained in `geometry-evidence.json` and the raw extracts. Underground rail and nearby paths remain distinguishable by their source tags in `current-classification.json`; proximity to an underground line was not used to classify the visible ground.

## Source vintage and instrument bound

The first extract was fetched 2026-09-27T10:47:11Z with database timestamp 2026-09-27T10:45:37Z,203,329 bytes,141 objects. The query is only a roughly 100×260 m envelope around the witnesses; full geometry of matching ways is returned. Response SHA-256: `c08818afdd201078690ca79b4e480b941329d7339ad75ba28fe10f9f860d2771`.

A second bounded query used `[date:"2026-09-07T03:23:56Z"]`, exactly the scene network's recorded OSM vintage. It returned 201,724 bytes and139 objects, SHA-256 `f0d5a78ea07ac0550ebb3d5180ad29c422c4958ddbc9a68c19a893641b852ace`. This is a newly fetched historical reconstruction, not restoration of the original AOI extract whose recorded SHA is `9923a9ae93afbc73f82332bb5a03f06f76ed587cbc143541158d4c192b4b8671`. The response's `timestamp_osm_base` remains the server's current replication timestamp; the saved query selects the historical state. [Overpass date semantics](https://wiki.openstreetmap.org/wiki/Overpass_API/Overpass_QL#Date).

The date filter demonstrably changes the result: two footways edited/created 2026-09-12 are present only in the fresh response, and no historical object has a timestamp later than the requested date (`date-effect.json`). All four implicated embankment ways and checked adjacent bridge ways have identical tags and coordinates in the two vintages (`vintage-comparison.json`). This checks geometry as well as way versions because unchanged way metadata alone would not exclude moved nodes. Queries, headers, times and hashes are preserved in the two fetch receipts. Total source transfer was about 411 KB including four direct OSM metadata objects. No PLATEAU archive was downloaded.

## Minimal proposed contract for independent design review

Propose a static rail treatment only for the four named source centre lines on the current ground. The first candidate envelope is x 25…125 m, z -230…-30 m, a 200 m interior run. This rectangle is an authored scope clip, not permission to fill the whole rectangle or a claim about railway-land ownership. Exact clipped source polylines are in `geometry-evidence.json`; no 3D geometry was created.

Use paired rails with source gauge 1067 mm and restrained sleeper/bed detail following those four lines. Sleeper dimensions, bed width, colour, lift and spacing are presentation choices requiring review; OSM does not supply them. Keep any granular bed narrow around the lines rather than painting the whole bare strip as an authoritative land-use polygon. Conform the treatment to the existing terrain only as an explicitly authored visual approximation, retaining source horizontal positions and the shared world frame. Do not infer a new elevation from `level=2`, regrade the terrain, add train behavior, or modify simulation authority.

Exclude the south transition and all `bridge=yes`/tunnel ways. Bridge ways 146060265,146060331,155269553 and155269569 meet the embankment near z-11.147…-12.237 m. The proposed z=-30 stop is at least 17.76 m north of those observed transition endpoints. The near witness at z=-12.256 is therefore deliberately outside the first candidate; its deck/transition treatment remains unresolved. The north clip stops about 45 m short of the full source-way ends. Endpoint visibility and any artificial cutoff must be judged in the block/aerial views; this is a bounded candidate, not permission to hide an obvious cutoff or call the complete rail corridor finished.

The acceptance contract should require terrain-supported treatment with no road/pavement/building overlap; the four source identities and horizontal alignment preserved; no bridge segment accidentally draped to terrain; both styles at the saved block pose plus an oblique overview and the affected close surroundings through real controls. Inspect at native size and during movement for thin-rail aliasing and terminal cutoffs. A passing candidate may close the middle/far bare-ground presentation concern only. Near bridge-transition fidelity and any visible endpoint problem remain explicit until separately accepted or repaired.

## Licence and handoff

The extracts and derived centre lines are OSM data under ODbL 1.0. Keep them in a separate provenance-bearing OSM-derived asset rather than merging them irreversibly into PLATEAU geometry. Preserve credit to OpenStreetMap contributors and a link to the licence; review the existing in-app attribution for the added rendered role. Distribution of derived database assets must follow the project's existing ODbL policy. [OSM copyright and attribution requirements](https://www.openstreetmap.org/copyright), [repo policy:69](C:/Users/38909/Documents/github/maps/docs/policies/local-rules.md:69). No licence or attribution source claims these authored widths/heights are surveyed.

Root should obtain independent review of this source/extent/presentation contract before authoring the rail treatment. The source-class question is settled within the stated mapping bound; metric elevation and bed footprint are not. No further download is needed for this first design decision. Evidence remains ignored and intentionally retained for that review. Web browsing could read the documentation pages but could not open the individual API objects; the recorded direct HTTP 200 fetches provide their URL/data verification. Matplotlib was unavailable for an optional plan plot; no plot is delivered or needed for the numeric classification.
