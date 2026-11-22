# Stanford public facility references

The footprint inventory compares all 648 OSM records at revision 5a1c696 with Stanford’s published visitor-map polygons. It preserves the source geometry and labels. Two neighboring buildings can share an institutional name, and one facility can encompass several mapped parts. Use the recorded overlap and individual photograph before attributing an architectural detail to a part.

## Reproducing the footprint inventory

The visitor map declares separate KML archives for high and low zoom. The primary May 2026 archive includes 1,365 placemarks. The October 2026 archive independently confirms the 204 direct named facility matches among the 521 parts that lacked prior individual comparisons. Dates come from the KML members in the published archives. [Stanford visitor map](https://campus-map.stanford.edu/) · [Detailed footprints](https://campus-map.stanford.edu/kml/Stanford_Buildings.kmz?z=45) · [Overview footprints](https://campus-map.stanford.edu/kml/stanford_bldgs_z15.kmz?z=45)

Download the archives into an ignored directory. In an analysis environment with Python 3.9+ and Shapely 2.0.7, run the following commands from the repository root. The matcher checks the known file digests and uses the included holes and multipart boundaries.

```sh
python tools/quality/facility-refs-match.py artifacts/facilities/stanford-buildings.kmz public/data/stanford-buildings.geojson artifacts/facilities/detailed.json
python tools/quality/facility-refs-match.py artifacts/facilities/stanford-z15.kmz public/data/stanford-buildings.geojson artifacts/facilities/overview.json
cmp artifacts/facilities/detailed.json tools/quality/facility-refs-footprints.json
```

Each record includes the intersection as a fraction of the modeled footprint and of the Stanford facility, plus intersection over union. A direct match requires at least 72% of the model, 65% of the facility and 57% intersection over union, with at most 15% of the model covered by a second candidate. Contained parts require at least 80% coverage and at most 15% competition. Remaining overlaps above 20% supply location context only. Anonymous official polygons retain their own placemark IDs. Nearness alone does not qualify. Of the 521 original outstanding parts, 204 match a named footprint, 53 lie within a larger named facility, 105 have competing or partial named overlaps, 12 match anonymous plan outlines, 5 have partial anonymous overlaps, and 142 lack a dependable match on the detailed plan.

The October overview changes one previously unmatched feature, way/985734161, to a partial overlap with 09-011. It has no corresponding overlap for three small parts of the May 06-760 footprint, ways 1302742360, 1302742362 and 1302742371. These differences establish uncertainty in each part’s facility assignment.

## Photograph and model evidence

The photo index records 304 building codes from the original outstanding facilities, significant competing footprints and codes present in OSM names. The public building-information and accessibility pages supplied 228 distinct, decoded and visually inspected exterior images for 227 codes. Thirty other cards displayed the same gray “No Image Available” JPEG. The manifest retains its hash. Seven cards contained no linked image. Forty lookup attempts produced an unavailable public response. Source availability has no bearing on whether the building exists. [Stanford visitor map FAQ](https://campus-map.stanford.edu/faq/FAQ.html)

Among the original 521, 165 parts have a direct reciprocal footprint match and an actual facility photograph, including 42 previously unnamed parts. A photo of a group or neighboring facility gives a narrower claim. The observation module includes all 42 previously unnamed parts with a direct photograph and footprint match. In total it records 62 direct elevation comparisons and 8 qualified context observations from 77 control-driven captures. The observations include two facility-label conflicts at the educational farm and visitor center. It captures what the photograph shows and a visible property of the map at the recorded zoom, pitch and bearing. Source and map views may face different elevations. The campus visitor map, the reference image and its SHA-256 are recorded in the manifest. The JPEGs themselves remain in ignored research output.
