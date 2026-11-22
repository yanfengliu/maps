"""Match a frozen anonymous-building intake to FEMA USA Structures. Requires Shapely 2.
Usage: python match-additional-outlines.py <buildings.geojson> <fema.geojson> <count.json> <intake-audit.json> <output.json>
"""
import hashlib
import json
import math
import sys
from datetime import datetime, timezone
from pathlib import Path

from shapely import STRtree, make_valid
from shapely.affinity import affine_transform
from shapely.geometry import shape

X_SCALE = 111320 * math.cos(math.radians(37.43))
Y_SCALE = 111320
PROJECTION = [X_SCALE, 0, 0, Y_SCALE, 122.17 * X_SCALE, -37.43 * Y_SCALE]


def projected(feature, repaired):
    # Overlap ratios remain invariant under this common affine local mapping.
    polygon = shape(feature["geometry"])
    if not polygon.is_valid:
        repaired.append(feature.get("id", str(feature["properties"].get("BUILD_ID"))))
        polygon = make_valid(polygon)
    polygon = affine_transform(polygon, PROJECTION)
    if polygon.is_empty or not polygon.is_valid or polygon.area <= 0:
        raise ValueError(f"Invalid source geometry {feature.get('id', feature['properties'])}")
    return polygon


def overlaps(polygon, others, index):
    hits = []
    for i in index.query(polygon):
        other = others[i]
        area = polygon.intersection(other).area
        if area > 0:
            hits.append((int(i), area / polygon.area, area / other.area, area / (polygon.area + other.area - area)))
    return sorted(hits, key=lambda hit: (-hit[3], hit[0]))


def classify(best, rivals, neighbors, source):
    if best is None:
        return "no-overlap"
    _, local, external, iou = best
    if iou >= 0.70 and min(local, external) >= 0.80:
        if any(hit[1] >= 0.20 or hit[3] >= 0.35 for hit in rivals):
            return "multiple-external"
        # hits[1] is the fraction of FEMA's polygon occupied by a competing OSM feature.
        if any(hit[1] >= 0.20 or hit[3] >= 0.35 for hit in neighbors):
            return "multiple-local"
        if source != "ORNL":
            return "uncertain-lineage"
        return "matched-outline"
    if local >= 0.80 and external < 0.65:
        return "inside-larger-outline"
    if external >= 0.80 and local < 0.65:
        return "contains-smaller-outline"
    if max(local, external) < 0.05:
        return "edge-only"
    return "partial-overlap"


def date(value):
    return datetime.fromtimestamp(value / 1000, timezone.utc).date().isoformat() if value is not None else None


def rounded(hit):
    return [round(value, 6) for value in hit[1:]]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main(osm_path, fema_path, count_path, audit_path, destination):
    osm = json.loads(osm_path.read_bytes())["features"]
    fema = json.loads(fema_path.read_bytes())["features"]
    if len(fema) != json.loads(count_path.read_bytes())["count"]:
        raise ValueError("FEMA count differs from the geometry response; check service pagination")
    if len(fema) != len({feature["properties"]["BUILD_ID"] for feature in fema}):
        raise ValueError("FEMA geometry response contains duplicate BUILD_IDs")
    intake = json.loads(audit_path.read_bytes())
    if "intakeIdSha256" in intake:
        targets = {r[0] for r in intake["rows"]}
    else:
        targets = {r["id"] for r in intake["rows"] if r["evidenceStatus"] == "unverified" and r["name"] == "(unnamed)"}
    fixed_local, fixed_external = [], []
    local = [projected(feature, fixed_local) for feature in osm]
    external = [projected(feature, fixed_external) for feature in fema]
    local_index, external_index = STRtree(local), STRtree(external)
    catalog = {}
    output = []
    for index, feature in enumerate(osm):
        if feature["id"] not in targets:
            continue
        hits = overlaps(local[index], external, external_index)
        best = hits[0] if hits else None
        rivals = hits[1:]
        neighbors = []
        source = None
        if best:
            neighbors = [r for r in overlaps(external[best[0]], local, local_index) if r[0] != index]
            source = fema[best[0]]["properties"]["SOURCE"]
        ext_hits = []
        for hit in hits:
            fields = fema[hit[0]]["properties"]
            building_id = str(fields["BUILD_ID"])
            catalog[building_id] = [fields["UUID"], fields["SOURCE"], fields["IMAGE_NAME"], date(fields["IMAGE_DATE"]), fields["VAL_METHOD"], date(fields["PROD_DATE"])]
            ext_hits.append([building_id, *rounded(hit)])
        # Retain ALL positive-area intersections in each direction, including small slivers.
        local_hits = [[osm[r[0]]["id"], *rounded(r)] for r in neighbors]
        status = classify(best, rivals, neighbors, source)
        if status == "matched-outline" and (feature["id"] in fixed_local or ext_hits[0][0] in fixed_external):
            status = "repaired-geometry"
        output.append([feature["id"], status, ext_hits, local_hits])
    if len(targets) != len(output):
        raise ValueError("Audit IDs missing from the local geometry")
    data = {"localSha256": digest(osm_path), "externalSha256": digest(fema_path), "externalCount": len(fema),
            "intakeIdSha256": hashlib.sha256("\n".join(sorted(targets)).encode()).hexdigest(),
            "repaired": {"local": fixed_local, "external": fixed_external}, "catalog": catalog, "rows": output}
    # One record per line keeps the generated file compact and diffs reviewable.
    header = json.dumps({k: v for k, v in data.items() if k not in ("catalog", "rows")}, indent=2)[:-2]
    compact = lambda value: json.dumps(value, separators=(",", ":"))
    source_lines = [f"    {compact(k)}:{compact(v)}" for k, v in sorted(catalog.items())]
    row_lines = ["    " + compact(row) for row in output]
    destination.write_text(header + ',\n  "catalog": {\n' + ",\n".join(source_lines) + '\n  },\n  "rows": [\n' + ",\n".join(row_lines) + "\n  ]\n}\n")


if __name__ == "__main__":
    main(*(Path(arg) for arg in sys.argv[1:]))
