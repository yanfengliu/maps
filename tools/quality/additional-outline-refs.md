# FEMA outline comparison

The frozen November 21, 2026 audit at the geometry batch contained 112 source IDs with an unnamed label and an unverified evidence status. The matcher compared each against FEMA USA Structures, then checked every positive intersection with the leading FEMA polygon against all 648 local geometries. Three matched outlines have distinct OSM and ORNL source records. The review found 42 without a positive-area intersection, 36 partial overlaps, 24 inside a larger outline, two edge slivers, one containing a smaller outline, and four strong geometric matches with uncertain source independence.

The [FEMA program](https://gis-fema.hub.arcgis.com/pages/usa-structures) and [Esri's federal data catalog entry](https://www.arcgis.com/home/item.html?id=0ec8512ad21e4bb987d7e848d14e7e24) describe a nationwide building inventory generally covering structures larger than 450 square feet. The catalog snapshot has a September 13, 2026 data currency. California was outside that update cycle. Image acquisition dates for individual polygons come from the source fields, not the publication date. Small outbuildings, covered walkways, roof details and annexes frequently have no equivalent polygon in this inventory. Absence does not establish physical absence.

The 1,284 polygons in the Stanford envelope come from three ORNL Maxar scenes acquired on August 29, 2016 (13 polygons), August 18, 2018 (46), and May 13, 2024 (919), and one NGA dataset labeled `Li241-San Fransico- Oakland`, dated October 1, 2012 (306). All three accepted polygons come from the 2024 scene `10400100963EE500` and carry a manual validation field. The paired OSM source changesets document the 2013 City of Palo Alto import for two ways and Bing imagery in 2021 for the third. Four other close NGA matches come from the same 2013 municipal OSM import. The 2012 NGA source's upstream relationship to the City of Palo Alto survey could not be established. They retain the uncertain-lineage disposition.

For a positive match, each polygon must cover at least 80% of the other and their intersection divided by their union must reach 70%. Another external polygon covering 20% of the local polygon, another local polygon covering 20% of the external polygon, or a competitor in either direction reaching 35% intersection over union prevents acceptance. The matcher checks full unrounded areas in a common local affine projection. It records the source IDs of any invalid geometries repaired with Shapely and excludes repaired target pairs from acceptance. The three accepted overlays also received an individual visual and OSM lineage check. The register describes horizontal geometry at the acquisition date only.

## Reproduce the comparison

Download the bounded source and request its count separately. Both November 21 requests returned 1,284 features, below the service's 2,000-feature limit. Preserve the raw response under ignored artifacts. The checked-in comparison includes the SHA-256 hashes of that response, the local geometry, and the sorted intake IDs. The intake can be read from the original audit or reconstructed from the comparison for replay.

```sh
service='https://services2.arcgis.com/FiaPA4ga0iQKduv3/arcgis/rest/services/USA_Structures_View/FeatureServer/0/query'
common='where=1%3D1&geometry=-122.1862,37.4202,-122.1548,37.4415&geometryType=esriGeometryEnvelope&inSR=4326&spatialRel=esriSpatialRelIntersects'
mkdir -p artifacts/outlines
curl -fsSL "$service?$common&returnCountOnly=true&f=json" -o artifacts/outlines/count.json
curl -fsSL "$service?$common&outSR=4326&outFields=BUILD_ID,UUID,SOURCE,IMAGE_DATE,IMAGE_NAME,VAL_METHOD,PROD_DATE&returnGeometry=true&f=geojson" -o artifacts/outlines/footprints.geojson
python3 tools/quality/match-additional-outlines.py public/data/stanford-buildings.geojson artifacts/outlines/footprints.geojson artifacts/outlines/count.json tools/quality/additional-outline-results.json artifacts/outlines/replayed.json
```

The optional offline replay uses Python and Shapely 2. The application and audit read checked-in data without these tools. On replay with a new service response, verify the fetched count and all per-record capture and OSM source histories before publishing any new match. The register pins the manually examined pairs.

Each result row stores its OSM ID, disposition, external intersections and reverse intersections for the top external candidate. Each intersection stores the other feature's ID, coverage of the query geometry, coverage of the other geometry and intersection divided by union. Candidates are sorted by descending intersection over union. The catalog associates an external building ID with its UUID, source creator, image name, capture date, validation method and production date. Tiny positive intersections can round to zero at six decimals.
