"""The layout/Unreal frame mapping, the street regions, and the geometry both
editor steps and their launchers reason about.

Pure standard library: the editor-side scripts import this under Unreal's
embedded CPython, and the launchers import it under the system CPython, so it
must never import `unreal`.

Frames, from docs/work/2_medieval-city/design.md:

* The layout frame is right-handed, Z up, metres. x is east, y is north. Yaw is
  degrees counter-clockwise seen from above, so an asset's front at yaw t points
  along (-sin t, cos t). Yaw 0 faces north.
* Unreal is left-handed, Z up, centimetres, X forward, and its yaw turns the
  other way.

design.md called its first mapping nominal and said to measure it. It was
measured, it differed, and design.md has since been corrected to the measured
one. What the engine actually does:

* The import scales by 100 and keeps each axis in place, except that the
  authored Y is negated: an authored metre point (x, y, z) arrives as the Unreal
  mesh-local centimetre point (100x, -100y, 100z). `MEASURED_MAPPING_EVIDENCE`
  names the measurements and the engine code behind every part of that.
* So an asset's authored +Y front arrives as Unreal mesh-local -Y, not +X as
  design.md's nominal mapping assumed.
* Placing the town therefore uses the same map for the world: layout metres
  (x, y, z) become Unreal centimetres (100x, -100y, 100z), and Unreal yaw is
  minus the layout yaw, which is the rule design.md already states.

design.md's nominal location mapping, (100y, 100x, 100z), is a 90 degree
rotation away from that and is not implemented anywhere. `NOMINAL_MAPPING` keeps
it written down so the two can be compared, and the import and verify steps
report measured against expected numbers rather than quietly compensating.
"""

import json
import math

SCHEMA_VERSION = 1

# One authored metre is this many Unreal units.
METRES_TO_UNREAL = 100.0

# Sign applied to each authored axis on the way into Unreal. Measured, not
# assumed: see MEASURED_MAPPING_EVIDENCE.
AXIS_SIGNS = (1.0, -1.0, 1.0)

NOMINAL_MAPPING = {
    "source": "docs/work/2_medieval-city/design.md, 'Layout and Unreal frames'",
    "location_cm_from_layout_m": "(100*y, 100*x, 100*z)",
    "unreal_yaw_from_layout_yaw": "-yaw",
    "authored_front_arrives_as": "Unreal +X",
    "implemented": False,
}

MEASURED_MAPPING = {
    "location_cm_from_layout_m": "(100*x, -100*y, 100*z)",
    "unreal_yaw_from_layout_yaw": "-yaw",
    "authored_front_arrives_as": "Unreal -Y",
    "mesh_local_cm_from_authored_m": "(100*x, -100*y, 100*z)",
    "implemented": True,
}

MEASURED_MAPPING_EVIDENCE = {
    "scale_and_permutation": (
        "Imported mesh bounds equal the inventory's metre bounds times 100 on every axis in "
        "place, checked for every asset by prepare_project.py and build_level.py --verify. "
        "house_a measures x +/-357.0 cm against an authored +/-3.57 m and y +/-308.075 cm "
        "against an authored +/-3.080755 m, so no axis is swapped."),
    "y_sign_engine_code": (
        "Engine/Plugins/Interchange/Runtime/Source/Parsers/GLTFCore/Private/GLTF/"
        "ConversionUtilities.h GLTF::ConvertVec3 returns {Vec.X, Vec.Z, Vec.Y}, and "
        "tools/blender/blender_build.py exports with export_yup=True, which writes authored "
        "(x, y, z) as glTF (x, z, -y). Composing the two gives Unreal (x, -y, z)."),
    "y_sign_measured": (
        "build_level.py --verify traces downward beside each house_c actor at mesh-local "
        "y -305 cm and +305 cm. house_c carries its shopfront awning on the authored +Y "
        "facade, past the roof eaves, so only the side the authored +Y maps to has geometry "
        "at awning height."),
    "x_sign_measured": (
        "build_level.py --verify traces downward over the church actor at mesh-local x -650 "
        "cm and +650 cm. The church's west tower sits at authored x -9.0 to -4.0 m and "
        "reaches 19 m, far above the nave roof, so the taller side is where authored -X went."),
}

# Package paths, fixed by design.md "Unreal project".
MESH_PACKAGE_ROOT = "/Game/Generated/Meshes"
MATERIAL_PACKAGE_ROOT = "/Game/Generated/Materials"
IMPORT_STAGING_ROOT = "/Game/Generated/Import"
LEVEL_PACKAGE = "/Game/Maps/MedievalCity"

MESH_PREFIX = "SM_"

# The twelve material names design.md fixes. The importer creates exactly these.
MATERIAL_NAMES = ("M_Plaster", "M_Timber", "M_RoofTile", "M_Thatch", "M_Stone", "M_Cobble",
                  "M_Dirt", "M_Grass", "M_Wood", "M_Iron", "M_Canvas", "M_Leaf")

# Street and plaza regions in layout metres, from design.md's shared table. The
# cross street runs across the flat box, whose x half-width is FLAT_BOX_HALF_X.
FLAT_BOX_HALF_X = 60.0
STREET_REGIONS = (
    ("plaza", -19.0, 19.0, -19.0, 7.0),
    ("main_street", -3.5, 3.5, 7.0, 68.0),
    ("cross_street", -FLAT_BOX_HALF_X, FLAT_BOX_HALF_X, -9.5, -2.5),
)

# The two sign measurements. Each names a place on a real asset where the
# authored mesh is much taller on one side than the other, with the offsets in
# authored metres: the verify step maps them into the level through the mapping
# it implements, so a wrong sign sends the tall samples to the short side, where
# they find nothing. The reference heights were read out of the glTF binaries by
# ray-casting straight down against their triangles.
#
# Each probe traces one height band straight down, with its floor between the two
# authored heights, so the tall side is inside the band and the short side is
# below it. Only the hit-or-miss is used, because that is all Unreal 5.8 lets
# Python read of a trace: FHitResult's fields are bare UPROPERTY() with no
# Blueprint specifier and UGameplayStatics.BreakHitResult is not exported, so
# there is no readable hit height and no readable hit actor. The trace ignores
# every actor but the one being measured, so a hit can only be its geometry.
X_SIGN_PROBE = {
    "asset": "church",
    "feature": ("the west tower at authored x -9.0 to -4.0 m reaches 18.3 to 18.9 m, far above the "
                "12.3 m nave roof at authored x +5 to +8 m"),
    "tall_offsets_m": [(-7.0, 0.0), (-6.5, 0.0), (-6.0, 0.0)],
    "short_offsets_m": [(5.0, 0.0), (6.5, 0.0), (8.0, 0.0)],
    "authored_tall_reference_cm": [1845.4, 1893.3, 1831.9],
    "authored_short_reference_cm": [1231.8, 1233.1, 1235.2],
    "band_top_cm": 2000.0,
    "band_floor_cm": 1400.0,
}
Y_SIGN_PROBE = {
    "asset": "house_c",
    "feature": ("the roof edge on the authored -Y side reaches 5.8 m, while the authored +Y facade "
                "carries only the shopfront awning at about 2.0 m"),
    "tall_offsets_m": [(-1.0, -3.05), (-0.5, -3.05), (0.0, -3.05), (0.5, -3.05), (1.0, -3.05)],
    "short_offsets_m": [(-1.0, 3.05), (-0.5, 3.05), (0.0, 3.05), (0.5, 3.05), (1.0, 3.05)],
    "authored_tall_reference_cm": [575.3, 576.0, 576.9, 577.0, 577.0],
    "authored_short_reference_cm": [198.7, 198.7, 203.7, 198.7, 198.7],
    "band_top_cm": 1000.0,
    "band_floor_cm": 400.0,
}
SIGN_PROBES = (X_SIGN_PROBE, Y_SIGN_PROBE)

# Bounds of the checks, named here so every error message can quote them.
BOUNDS_TOLERANCE_CM = 1.0
LOCATION_TOLERANCE_CM = 0.1
YAW_TOLERANCE_DEG = 0.05
SUN_ANGLE_TOLERANCE_DEG = 0.05
HOUSE_FRONT_TOLERANCE_DEG = 25.0
# A house more than this far from every street region stands on no street at all.
HOUSE_STREET_RADIUS_M = 20.0
# Two regions count as equally plausible when the farther one is within this of
# the nearest, so a house wedged between a plaza edge and a street mouth may
# face either. Anything farther is not the street the house stands on.
HOUSE_STREET_AMBIGUITY_FACTOR = 1.5
HOUSE_STREET_AMBIGUITY_MARGIN_M = 1.0


def mesh_package(asset):
    return f"{MESH_PACKAGE_ROOT}/{MESH_PREFIX}{asset}"


def material_package(material):
    return f"{MATERIAL_PACKAGE_ROOT}/{material}"


def authored_to_unreal(point):
    """An authored metre point to the Unreal centimetre point it becomes.

    The same map serves the mesh-local frame and the world: the assets are
    authored in the layout's own frame, so placing the town with any other map
    would turn every asset away from the street the layout put it on.
    """
    return [point[axis] * AXIS_SIGNS[axis] * METRES_TO_UNREAL for axis in range(3)]


def unreal_to_authored(point):
    return [point[axis] / (AXIS_SIGNS[axis] * METRES_TO_UNREAL) for axis in range(3)]


# The layout frame is the authored frame, so these are the same map under the
# names the two steps use.
layout_location_to_unreal = authored_to_unreal
unreal_location_to_layout = unreal_to_authored


def layout_yaw_to_unreal(yaw_deg):
    """Unreal yaw turns the other way, so it is the negated layout yaw.

    With the authored front arriving as Unreal mesh-local -Y, an actor at Unreal
    yaw -t points its front along the mapped layout front direction for layout
    yaw t. design.md states this rule and the measurement agrees with it.
    """
    return -yaw_deg


def unreal_yaw_to_layout(yaw_deg):
    return -yaw_deg


def unreal_front_vector(unreal_yaw_deg):
    """Where an actor's authored front points, in the Unreal XY plane.

    The authored front is Unreal mesh-local -Y, and a yaw of u sends local
    (0, -1) to world (sin u, -cos u).
    """
    radians = math.radians(unreal_yaw_deg)
    return (math.sin(radians), -math.cos(radians))


def layout_front_vector(yaw_deg):
    """The direction an asset's front faces, in the layout frame."""
    radians = math.radians(yaw_deg)
    return (-math.sin(radians), math.cos(radians))


def normalise_degrees(angle):
    """Fold an angle into (-180, 180]."""
    folded = math.fmod(angle, 360.0)
    if folded <= -180.0:
        folded += 360.0
    elif folded > 180.0:
        folded -= 360.0
    return folded


def angle_between_degrees(first, second):
    """Unsigned angle between two 2D directions, in degrees."""
    dot = first[0] * second[0] + first[1] * second[1]
    cross = first[0] * second[1] - first[1] * second[0]
    return abs(math.degrees(math.atan2(cross, dot)))


def inventory_bounds_to_unreal(bounds_min_m, bounds_max_m):
    """Authored metre bounds to the Unreal mesh-local box they must import as."""
    first = authored_to_unreal(bounds_min_m)
    second = authored_to_unreal(bounds_max_m)
    low = [min(first[axis], second[axis]) for axis in range(3)]
    high = [max(first[axis], second[axis]) for axis in range(3)]
    return low, high


def measured_mapping(bounds_min_m, bounds_max_m, measured_min_cm, measured_max_cm):
    """What the engine actually did, as per-axis factors against the authored box.

    Reported whether or not it matched, so a surprise arrives as numbers rather
    than as a silent compensation somewhere else. Each factor is a measured
    Unreal extent over the authored metre extent it would have come from, which
    is METRES_TO_UNREAL for the mapping that holds and something else for the
    others. The extents are unsigned, so this identifies the permutation and the
    scale; the signs are measured separately by the trace checks named in
    MEASURED_MAPPING_EVIDENCE.
    """
    authored = [abs(bounds_max_m[axis] - bounds_min_m[axis]) for axis in range(3)]
    measured = [abs(measured_max_cm[axis] - measured_min_cm[axis]) for axis in range(3)]

    def factors(sources):
        return [None if authored[source] == 0 else measured[axis] / authored[source]
                for axis, source in enumerate(sources)]

    return {"authored_extent_m": authored,
            "measured_extent_cm": measured,
            "axis_sources_measured": [0, 1, 2],
            "factor_under_measured_permutation": factors((0, 1, 2)),
            "axis_sources_nominal": [1, 0, 2],
            "factor_under_nominal_permutation": factors((1, 0, 2))}


def point_to_region(point, region):
    """Distance in metres from a layout point to a rectangle, and the nearest point."""
    _, min_x, max_x, min_y, max_y = region
    nearest_x = min(max(point[0], min_x), max_x)
    nearest_y = min(max(point[1], min_y), max_y)
    return math.hypot(nearest_x - point[0], nearest_y - point[1]), (nearest_x, nearest_y)


def house_front_check(location_m, yaw_deg):
    """Does this house's front point at the street it stands on?

    Bound: measured in the layout frame from the actor transform the caller read
    back, against design.md's fixed street rectangles. It judges direction only,
    not whether anything blocks the view.
    """
    front = layout_front_vector(yaw_deg)
    candidates = []
    for region in STREET_REGIONS:
        distance, nearest = point_to_region(location_m, region)
        candidates.append({"region": region[0], "distance_m": distance, "nearest_m": list(nearest)})
    for candidate in candidates:
        nearest = candidate["nearest_m"]
        toward = (nearest[0] - location_m[0], nearest[1] - location_m[1])
        length = math.hypot(*toward)
        if length <= 1e-9:
            # The house centre is inside the region, so there is no direction to
            # the street: it stands in it.
            candidate["angle_deg"] = None
            candidate["inside"] = True
            continue
        candidate["inside"] = False
        candidate["angle_deg"] = angle_between_degrees(front, (toward[0] / length, toward[1] / length))

    nearest_distance = min(candidate["distance_m"] for candidate in candidates)
    if nearest_distance > HOUSE_STREET_RADIUS_M:
        return {"passed": False, "front_vector": list(front), "nearest_distance_m": nearest_distance,
                "candidates": candidates, "chosen": None,
                "reason": (f"stands {nearest_distance:.2f} m from the nearest street region, beyond the "
                           f"{HOUSE_STREET_RADIUS_M:.1f} m within which a house counts as standing on one")}

    limit = max(nearest_distance * HOUSE_STREET_AMBIGUITY_FACTOR,
                nearest_distance + HOUSE_STREET_AMBIGUITY_MARGIN_M)
    considered = [candidate for candidate in candidates
                  if candidate["distance_m"] <= min(limit, HOUSE_STREET_RADIUS_M)]
    inside = [candidate for candidate in considered if candidate["inside"]]
    if inside:
        return {"passed": False, "front_vector": list(front), "nearest_distance_m": nearest_distance,
                "candidates": candidates, "chosen": inside[0]["region"],
                "reason": f"stands inside the {inside[0]['region']} region, so it has no front-to-street direction"}

    ranked = sorted(considered, key=lambda candidate: candidate["angle_deg"])
    best = ranked[0]
    passed = best["angle_deg"] <= HOUSE_FRONT_TOLERANCE_DEG
    return {"passed": passed, "front_vector": list(front), "nearest_distance_m": nearest_distance,
            "candidates": candidates, "considered": [candidate["region"] for candidate in considered],
            "chosen": best["region"], "angle_deg": best["angle_deg"],
            "reason": None if passed else (
                f"front points {best['angle_deg']:.1f} deg away from the {best['region']} it stands on "
                f"({best['distance_m']:.2f} m away), over the {HOUSE_FRONT_TOLERANCE_DEG:.0f} deg allowed")}


def actor_local_to_world(actor_location_cm, actor_yaw_deg, local_cm):
    """Where a mesh-local centimetre point lands, for an unscaled actor.

    Unreal yaw sends local (1, 0) to (cos u, sin u) and local (0, 1) to
    (-sin u, cos u).
    """
    radians = math.radians(actor_yaw_deg)
    cosine, sine = math.cos(radians), math.sin(radians)
    return [actor_location_cm[0] + local_cm[0] * cosine - local_cm[1] * sine,
            actor_location_cm[1] + local_cm[0] * sine + local_cm[1] * cosine,
            actor_location_cm[2] + local_cm[2]]


def sign_probe_segments(probe, actor_location_cm, actor_yaw_deg):
    """World trace segments for one sign probe against one actor.

    Yields ("tall"/"short", start point, end point). The authored offsets become
    mesh-local points through the mapping this module implements, so the labels
    only hold if that mapping's signs are the engine's: a wrong sign sends the
    tall samples to the short side, where the band finds nothing.
    """
    segments = []
    for side in ("tall", "short"):
        for offset in probe[f"{side}_offsets_m"]:
            local = authored_to_unreal((offset[0], offset[1], 0.0))
            world = actor_local_to_world(actor_location_cm, actor_yaw_deg, local)
            segments.append((side,
                             [world[0], world[1], actor_location_cm[2] + probe["band_top_cm"]],
                             [world[0], world[1], actor_location_cm[2] + probe["band_floor_cm"]]))
    return segments


def sign_probe_verdict(probe, tall_hits, short_hits):
    """Did the authored lopsidedness land where the implemented signs say?

    Each list holds one boolean per sample: whether the band found the actor's
    own geometry there.
    """
    result = {"asset": probe["asset"], "feature": probe["feature"],
              "tall_hits": list(tall_hits), "short_hits": list(short_hits),
              "authored_tall_reference_cm": probe["authored_tall_reference_cm"],
              "authored_short_reference_cm": probe["authored_short_reference_cm"],
              "band_top_cm": probe["band_top_cm"], "band_floor_cm": probe["band_floor_cm"]}
    tall_found = sum(1 for hit in tall_hits if hit)
    short_found = sum(1 for hit in short_hits if hit)
    result["tall_found"] = tall_found
    result["short_found"] = short_found
    result["passed"] = bool(tall_hits) and tall_found == len(tall_hits) and short_found == 0
    if not result["passed"]:
        result["reason"] = (
            f"a band from {probe['band_top_cm']:.0f} to {probe['band_floor_cm']:.0f} cm above "
            f"{probe['asset']} found its geometry at {tall_found} of {len(tall_hits)} samples "
            f"where the authored mesh is tall and at {short_found} of {len(short_hits)} samples "
            f"where it is short; it has to be all of the first and none of the second. The "
            f"authored heights are {probe['authored_tall_reference_cm']} against "
            f"{probe['authored_short_reference_cm']} cm, so the import's axis signs are not the "
            f"{list(int(sign) for sign in AXIS_SIGNS)} this step applies: {probe['feature']}")
    return result


def load_json(path):
    with open(path, "r", encoding="utf-8") as handle:
        return json.load(handle)


def check_inventory(inventory, path):
    """Refuse an inventory this step cannot act on, naming what is missing."""
    if inventory.get("schema_version") != SCHEMA_VERSION:
        raise ValueError(f"{path} has schema_version {inventory.get('schema_version')!r}; "
                         f"this step reads schema_version {SCHEMA_VERSION}.")
    if inventory.get("units") != "metres":
        raise ValueError(f"{path} declares units {inventory.get('units')!r}; this step converts from "
                         f"'metres' at {METRES_TO_UNREAL:g} Unreal units each.")
    assets = inventory.get("assets")
    if not isinstance(assets, dict) or not assets:
        raise ValueError(f"{path} lists no assets, so there is nothing to import.")
    materials = inventory.get("materials")
    if not isinstance(materials, dict):
        raise ValueError(f"{path} has no materials table, so no material can be created.")
    missing = [name for name in MATERIAL_NAMES if name not in materials]
    if missing:
        raise ValueError(f"{path} is missing the contract materials {missing}; design.md fixes all "
                         f"{len(MATERIAL_NAMES)} of {list(MATERIAL_NAMES)}.")
    extra = sorted(set(materials) - set(MATERIAL_NAMES))
    if extra:
        raise ValueError(f"{path} declares materials {extra} that design.md does not list; the "
                         f"contract set is {list(MATERIAL_NAMES)}.")
    for name, entry in sorted(assets.items()):
        for field in ("file", "sha256", "bounds_min_m", "bounds_max_m", "materials", "triangles"):
            if field not in entry:
                raise ValueError(f"{path} asset {name!r} has no {field!r}, which the import step needs.")
        if not isinstance(entry["triangles"], int) or entry["triangles"] <= 0:
            raise ValueError(f"{path} asset {name!r} declares triangles {entry['triangles']!r}; the "
                             f"import and level steps compare it to the imported LOD0 count, so it "
                             f"has to be a positive whole number.")
        unknown = sorted(set(entry["materials"]) - set(MATERIAL_NAMES))
        if unknown:
            raise ValueError(f"{path} asset {name!r} uses materials {unknown}, which are not in the "
                             f"contract set {list(MATERIAL_NAMES)}.")
    return inventory


def check_layout(layout, path, inventory=None):
    if layout.get("schema_version") != SCHEMA_VERSION:
        raise ValueError(f"{path} has schema_version {layout.get('schema_version')!r}; "
                         f"this step reads schema_version {SCHEMA_VERSION}.")
    for field in ("placements", "player_start_m", "sun", "vantages_m"):
        if field not in layout:
            raise ValueError(f"{path} has no {field!r}, which the level builder needs.")
    placements = layout["placements"]
    if not placements:
        raise ValueError(f"{path} declares no placements, so the level would be empty.")
    identifiers = [placement["id"] for placement in placements]
    duplicates = sorted({name for name in identifiers if identifiers.count(name) > 1})
    if duplicates:
        raise ValueError(f"{path} repeats placement ids {duplicates}; each actor label must be unique.")
    if inventory is not None:
        unknown = sorted({placement["asset"] for placement in placements} - set(inventory["assets"]))
        if unknown:
            raise ValueError(f"{path} places assets {unknown} that the inventory does not contain.")
    sun = layout["sun"]
    for field in ("pitch_deg", "yaw_deg"):
        if field not in sun:
            raise ValueError(f"{path} sun has no {field!r}; the directional light takes both angles.")
    return layout
