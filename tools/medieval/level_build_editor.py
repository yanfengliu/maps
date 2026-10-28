"""Build or verify /Game/Maps/MedievalCity inside the editor.

Launched by `build_level.py` through `level_editor_session.py`. MEDIEVAL_MODE is
`build` or `verify`.

`build` makes the level from the layout: one actor per placement, a player start,
a directional light at the layout's sun angles, a sky atmosphere, a sky light and
height fog, then saves.

`verify` re-opens the saved level and measures it. Every check names its bound in
the message it fails with.

It refuses to save any world but /Game/Maps/MedievalCity. Writing a level the
editor merely happened to have open is how this project's engine install got a
house in its default map.
"""

import json
import math
import os
import sys
import traceback

import unreal

sys.path.insert(0, os.environ["MEDIEVAL_TOOLS_DIR"])
import level_frames as frames  # noqa: E402 - the path above has to come first

INVENTORY_PATH = os.environ["MEDIEVAL_INVENTORY"]
LAYOUT_PATH = os.environ["MEDIEVAL_LAYOUT"]
REPORT_PATH = os.environ["MEDIEVAL_REPORT"]
MODE = os.environ["MEDIEVAL_MODE"]

# One each. A second sun or a missing fog is a defect, not a preference.
WORLD_ACTORS = (
    ("sun", "DirectionalLight"),
    ("sky_atmosphere", "SkyAtmosphere"),
    ("sky_light", "SkyLight"),
    ("height_fog", "ExponentialHeightFog"),
    ("player_start", "PlayerStart"),
)
PLAYER_START_LABEL = "player_start"
SUN_LABEL = "sun"

# Classes the undeclared-actor check tolerates besides the world actors above.
# Empty on purpose: EditorActorSubsystem.get_all_level_actors() returns exactly
# the 193 placements and the 5 world actors for this saved level, with no engine
# furniture among them, so anything else appearing is a real change and should go
# red rather than be waved through. Adding a class here needs that evidence.
ALLOWED_ENGINE_ACTOR_CLASSES = frozenset()

# How far above the entry point the headroom sweep looks for an obstruction.
TRACE_TOP_CM = 3000.0
# The walkable check: the ground under the player start has to be within this of
# the layout's z for the character to stand on it rather than fall.
GROUND_TOLERANCE_CM = 5.0

report = {
    "schema_version": 1,
    "generator": "tools/medieval/level_build_editor.py",
    "mode": MODE,
    "level": frames.LEVEL_PACKAGE,
    "measured_mapping": frames.MEASURED_MAPPING,
    "nominal_mapping": frames.NOMINAL_MAPPING,
    "mapping_evidence": frames.MEASURED_MAPPING_EVIDENCE,
    "bounds": {
        "mesh_bounds_tolerance_cm": frames.BOUNDS_TOLERANCE_CM,
        "actor_location_tolerance_cm": frames.LOCATION_TOLERANCE_CM,
        "actor_yaw_tolerance_deg": frames.YAW_TOLERANCE_DEG,
        "sun_angle_tolerance_deg": frames.SUN_ANGLE_TOLERANCE_DEG,
        "house_front_tolerance_deg": frames.HOUSE_FRONT_TOLERANCE_DEG,
        "ground_under_player_start_tolerance_cm": GROUND_TOLERANCE_CM,
    },
    "problems": [],
}


def flush():
    with open(REPORT_PATH, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2, sort_keys=True, default=str)


def fail(message):
    report["problems"].append(message)
    unreal.log_error(f"MEDIEVAL_LEVEL_PROBLEM {message}")


def level_subsystem():
    return unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)


def actor_subsystem():
    return unreal.get_editor_subsystem(unreal.EditorActorSubsystem)


def editor_world():
    return unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()


def current_world_package():
    world = editor_world()
    return None if world is None else world.get_path_name().split(".")[0]


def save_the_town():
    """Save the current level, but only when it is the town."""
    package = current_world_package()
    if package != frames.LEVEL_PACKAGE:
        raise RuntimeError(
            f"refusing to save: the editor's current world is {package!r}, not "
            f"{frames.LEVEL_PACKAGE!r}. Saving whatever happens to be open is how an engine "
            f"default map ends up with a house in it.")
    if not level_subsystem().save_current_level():
        raise RuntimeError(f"Unreal refused to save {frames.LEVEL_PACKAGE}.")
    return True


def segment_hits(world, start, end, ignore=()):
    """Is there geometry on this segment, on the Visibility channel?

    Only the hit-or-miss is read. Unreal 5.8 gives Python no way into the hit
    itself: FHitResult's fields are bare UPROPERTY() with no Blueprint
    specifier, so there is no hit.location and no hit.hit_actor, and
    UGameplayStatics.BreakHitResult is not exported to Python either. The checks
    here are therefore phrased as bracketed segments, and `ignore` is used to
    leave exactly one actor answering, so a hit needs no further identification.
    `line_trace_single` returns the hit on a hit and None on a miss.

    TRACE_TYPE_QUERY1 is Visibility. That is the right channel for asking where
    an asset's geometry is, which is all the axis-sign probes ask. A question
    about standing goes through `segment_blocks_pawn` instead.
    """
    hit = unreal.SystemLibrary.line_trace_single(
        world, unreal.Vector(*start), unreal.Vector(*end),
        unreal.TraceTypeQuery.TRACE_TYPE_QUERY1, True, list(ignore),
        unreal.DrawDebugTrace.NONE, True)
    return hit is not None


def segment_blocks_pawn(world, start, end, ignore=()):
    """Would this segment block a pawn?

    The Pawn collision profile, so the answer is about the collision a walking
    character meets rather than about what a camera can see. A mesh can answer
    one channel and not the other.
    """
    hit = unreal.SystemLibrary.line_trace_single_by_profile(
        world, unreal.Vector(*start), unreal.Vector(*end), "Pawn", True, list(ignore),
        unreal.DrawDebugTrace.NONE, True)
    return hit is not None


def spawn_mesh_actor(mesh, placement):
    location = frames.layout_location_to_unreal(placement["location_m"])
    yaw = frames.layout_yaw_to_unreal(placement["yaw_deg"])
    actor = actor_subsystem().spawn_actor_from_object(
        mesh, unreal.Vector(*location), unreal.Rotator(0.0, 0.0, yaw))
    if actor is None:
        raise RuntimeError(
            f"Unreal spawned no actor for {placement['id']} from {mesh.get_path_name()}. In a "
            f"commandlet the editor has no actor factories, so this step needs a full editor "
            f"started with -ExecutePythonScript.")
    actor.set_actor_label(placement["id"])
    # Static mobility: nothing in the town moves, and it lets the renderer treat
    # the whole town as it would any baked scene.
    component = actor.static_mesh_component
    component.set_mobility(unreal.ComponentMobility.STATIC)
    component.set_collision_profile_name("BlockAll")
    component.set_collision_enabled(unreal.CollisionEnabled.QUERY_AND_PHYSICS)
    return actor


def open_empty_level():
    """An open, empty /Game/Maps/MedievalCity, whether or not one existed.

    `new_level` refuses a path that already holds an asset, and deleting a world
    the editor still has in memory does not take, so a rebuild opens the existing
    level and clears out everything a previous build put in it. The level is then
    the layout's contents and nothing else, which is what `--verify` requires.
    """
    if unreal.EditorAssetLibrary.does_asset_exist(frames.LEVEL_PACKAGE):
        if not level_subsystem().load_level(frames.LEVEL_PACKAGE):
            raise RuntimeError(f"Unreal could not open the existing {frames.LEVEL_PACKAGE} to "
                               f"rebuild it.")
        report["reused_existing_level"] = True
        built = (unreal.StaticMeshActor, unreal.DirectionalLight, unreal.SkyAtmosphere,
                 unreal.SkyLight, unreal.ExponentialHeightFog, unreal.PlayerStart)
        stale = [actor for actor in actor_subsystem().get_all_level_actors()
                 if isinstance(actor, built)]
        report["cleared_actors"] = len(stale)
        for actor in stale:
            actor_subsystem().destroy_actor(actor)
        # Nothing of any class may survive, not just the classes a build makes:
        # the level has to end up holding the layout's contents and nothing else,
        # which is the same bound --verify applies to the saved result.
        left = [{"label": actor.get_actor_label(), "class": type(actor).__name__}
                for actor in actor_subsystem().get_all_level_actors()
                if type(actor).__name__ not in ALLOWED_ENGINE_ACTOR_CLASSES]
        report["actors_after_clear"] = left
        if left:
            named = [entry["label"] + " (" + entry["class"] + ")" for entry in left[:10]]
            raise RuntimeError(f"{len(left)} actors survived clearing {frames.LEVEL_PACKAGE}: "
                               f"{named}. Rebuilding on top of them would leave the level holding "
                               f"actors the layout does not declare.")
    else:
        if not level_subsystem().new_level(frames.LEVEL_PACKAGE):
            raise RuntimeError(f"Unreal refused to create a new level at {frames.LEVEL_PACKAGE}.")
        report["reused_existing_level"] = False
    package = current_world_package()
    if package != frames.LEVEL_PACKAGE:
        raise RuntimeError(f"after opening the level the editor's world is {package!r}, not "
                           f"{frames.LEVEL_PACKAGE!r}, so the build would fill the wrong level.")
    return package


def build(layout, inventory):
    """Make the level from the layout and save it."""
    report["new_level_world"] = open_empty_level()

    meshes = {}
    for asset in sorted(inventory["assets"]):
        path = frames.mesh_package(asset)
        mesh = unreal.load_asset(path)
        if mesh is None:
            raise RuntimeError(f"{path} does not exist, so {asset} cannot be placed. Run "
                               f"python tools/medieval/prepare_project.py first.")
        if not isinstance(mesh, unreal.StaticMesh):
            raise RuntimeError(f"{path} is a {type(mesh).__name__}, not a StaticMesh.")
        meshes[asset] = mesh

    placed = []
    for placement in layout["placements"]:
        actor = spawn_mesh_actor(meshes[placement["asset"]], placement)
        placed.append({"id": placement["id"], "asset": placement["asset"],
                       "label": actor.get_actor_label()})
    report["placed"] = len(placed)

    start = layout["player_start_m"]
    start_location = frames.layout_location_to_unreal(start["location"])
    # Lift the capsule clear of the ground so the character settles rather than
    # starting intersecting it. The probe applies its own capsule offset.
    start_actor = actor_subsystem().spawn_actor_from_class(
        unreal.PlayerStart,
        unreal.Vector(start_location[0], start_location[1], start_location[2] + 100.0),
        unreal.Rotator(0.0, 0.0, frames.layout_yaw_to_unreal(start["yaw_deg"])))
    if start_actor is None:
        raise RuntimeError("Unreal spawned no PlayerStart, so the level has nowhere to enter it.")
    start_actor.set_actor_label(PLAYER_START_LABEL)

    sun = layout["sun"]
    # design.md: the sun angles pass straight through as the light's pitch and yaw.
    sun_actor = actor_subsystem().spawn_actor_from_class(
        unreal.DirectionalLight, unreal.Vector(0.0, 0.0, 2000.0),
        unreal.Rotator(0.0, sun["pitch_deg"], sun["yaw_deg"]))
    if sun_actor is None:
        raise RuntimeError("Unreal spawned no DirectionalLight, so the town would be unlit.")
    sun_actor.set_actor_label(SUN_LABEL)
    light = sun_actor.light_component
    light.set_mobility(unreal.ComponentMobility.MOVABLE)
    light.set_intensity(6.0)
    # Warm, slightly off-white: a low afternoon sun, matching the layout's pitch.
    light.set_light_color(unreal.LinearColor(1.0, 0.969, 0.910, 1.0))
    light.set_editor_property("atmosphere_sun_light", True)
    light.set_editor_property("dynamic_shadow_distance_movable_light", 20000.0)
    light.set_editor_property("cast_shadows", True)

    atmosphere = actor_subsystem().spawn_actor_from_class(
        unreal.SkyAtmosphere, unreal.Vector(0.0, 0.0, 0.0), unreal.Rotator(0.0, 0.0, 0.0))
    if atmosphere is None:
        raise RuntimeError("Unreal spawned no SkyAtmosphere, so there would be no sky.")
    atmosphere.set_actor_label("sky_atmosphere")

    sky_light = actor_subsystem().spawn_actor_from_class(
        unreal.SkyLight, unreal.Vector(0.0, 0.0, 1500.0), unreal.Rotator(0.0, 0.0, 0.0))
    if sky_light is None:
        raise RuntimeError("Unreal spawned no SkyLight, so shadowed surfaces would be black.")
    sky_light.set_actor_label("sky_light")
    sky_component = sky_light.light_component
    sky_component.set_mobility(unreal.ComponentMobility.MOVABLE)
    # Capture the atmosphere itself each frame rather than baking a cubemap, so
    # the ambient light actually matches the sky above the town.
    sky_component.set_editor_property("source_type",
                                      unreal.SkyLightSourceType.SLS_CAPTURED_SCENE)
    sky_component.set_editor_property("real_time_capture", True)
    sky_component.set_intensity(1.0)

    fog = actor_subsystem().spawn_actor_from_class(
        unreal.ExponentialHeightFog, unreal.Vector(0.0, 0.0, 0.0), unreal.Rotator(0.0, 0.0, 0.0))
    if fog is None:
        raise RuntimeError("Unreal spawned no ExponentialHeightFog.")
    fog.set_actor_label("height_fog")
    fog_component = fog.get_component_by_class(unreal.ExponentialHeightFogComponent)
    if fog_component is None:
        raise RuntimeError("the ExponentialHeightFog actor has no fog component to configure.")
    # Thin distance haze, no volumetrics: it should soften the far wall and the
    # hills past it without fogging the street the character walks down.
    for name, value in (("fog_density", 0.012), ("fog_height_falloff", 0.15),
                        ("start_distance", 1500.0), ("fog_max_opacity", 0.85),
                        ("enable_volumetric_fog", False)):
        fog_component.set_editor_property(name, value)
        written = fog_component.get_editor_property(name)
        # These are float32 in the engine, so a readback of 0.012 is
        # 0.0120000001; the check is that the value took, not that it round
        # trips bit for bit.
        took = (written == value if isinstance(value, bool)
                else math.isclose(float(written), float(value), rel_tol=1e-6, abs_tol=1e-9))
        if not took:
            raise RuntimeError(f"the fog component's {name} reads back as {written!r} after being "
                               f"set to {value!r}.")

    report["world_actors"] = [label for label, _ in WORLD_ACTORS]
    report["saved"] = save_the_town()
    report["level_exists"] = unreal.EditorAssetLibrary.does_asset_exist(frames.LEVEL_PACKAGE)
    unreal.log(f"MEDIEVAL_LEVEL_BUILT placements={len(placed)} saved={report['saved']}")


def check_meshes(inventory):
    """Imported mesh bounds, materials and collision, against the inventory."""
    checked = {}
    static_subsystem = unreal.get_editor_subsystem(unreal.StaticMeshEditorSubsystem)
    for asset in sorted(inventory["assets"]):
        entry = inventory["assets"][asset]
        path = frames.mesh_package(asset)
        mesh = unreal.load_asset(path)
        if mesh is None:
            fail(f"{path} does not exist, so placement {asset} has no mesh. Run "
                 f"python tools/medieval/prepare_project.py.")
            continue
        box = mesh.get_bounds()
        origin, extent = box.origin, box.box_extent
        measured_min = [origin.x - extent.x, origin.y - extent.y, origin.z - extent.z]
        measured_max = [origin.x + extent.x, origin.y + extent.y, origin.z + extent.z]
        expected_min, expected_max = frames.inventory_bounds_to_unreal(
            entry["bounds_min_m"], entry["bounds_max_m"])
        record = {"path": mesh.get_path_name(),
                  "measured_bounds_min_cm": measured_min, "measured_bounds_max_cm": measured_max,
                  "expected_bounds_min_cm": expected_min, "expected_bounds_max_cm": expected_max,
                  "triangles": mesh.get_num_triangles(0),
                  "inventory_triangles": entry.get("triangles"),
                  "nanite_enabled": bool(static_subsystem.get_nanite_settings(mesh).enabled),
                  "mapping": frames.measured_mapping(entry["bounds_min_m"], entry["bounds_max_m"],
                                                     measured_min, measured_max)}
        worst = 0.0
        for axis, name in enumerate("xyz"):
            for measured, expected, side in ((measured_min[axis], expected_min[axis], "min"),
                                             (measured_max[axis], expected_max[axis], "max")):
                difference = abs(measured - expected)
                worst = max(worst, difference)
                if difference > frames.BOUNDS_TOLERANCE_CM:
                    fail(f"{path} {name} {side} measures {measured:.4f} cm but the inventory's "
                         f"metre bounds times {frames.METRES_TO_UNREAL:g} expect "
                         f"{expected:.4f} cm, a difference of {difference:.4f} cm over the "
                         f"{frames.BOUNDS_TOLERANCE_CM:g} cm allowed. Measured factors: "
                         f"{record['mapping']}.")
        record["worst_bounds_difference_cm"] = worst

        body = mesh.get_editor_property("body_setup")
        flag = None if body is None else body.get_editor_property("collision_trace_flag")
        record["collision_trace_flag"] = str(flag)
        if flag != unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE:
            fail(f"{path} has collision trace flag {flag}, not CTF_USE_COMPLEX_AS_SIMPLE, so its "
                 f"authored triangles would not block a walking capsule.")
        if record["nanite_enabled"]:
            fail(f"{path} has Nanite enabled, so its LOD0 is a decimated fallback and the "
                 f"complex collision a character walks on would be that fallback, not the "
                 f"authored {entry.get('triangles')} triangles.")
        # The triangle count is the check, not the Nanite setting. Complex as
        # simple collides against LOD0, so any route to a reduced LOD0 puts a
        # character on geometry the inventory never described, whether Nanite,
        # an import reduction setting or a future Interchange default did it.
        if record["triangles"] != record["inventory_triangles"]:
            fail(f"{path} has {record['triangles']} triangles at LOD0 but the inventory declares "
                 f"{record['inventory_triangles']} for {asset}, a difference of "
                 f"{record['triangles'] - record['inventory_triangles']}. The two have to be equal: "
                 f"complex-as-simple collision uses LOD0, so a reduced LOD0 is the geometry a "
                 f"character would walk on. Nanite is "
                 f"{'enabled' if record['nanite_enabled'] else 'disabled'} on this mesh.")

        slots = []
        for index, slot in enumerate(mesh.get_editor_property("static_materials")):
            material = slot.material_interface
            name = str(slot.material_slot_name)
            path_name = None if material is None else material.get_path_name()
            slots.append({"index": index, "slot_name": name, "material": path_name})
            if material is None:
                fail(f"{path} slot {index} ({name}) carries no material, so it draws with the "
                     f"engine default instead of one of design.md's "
                     f"{len(frames.MATERIAL_NAMES)} materials.")
                continue
            expected = f"{frames.material_package(name)}.{name}"
            if path_name != expected:
                fail(f"{path} slot {index} is named {name!r} but carries {path_name}, not the "
                     f"contract material {expected}.")
        record["slots"] = slots
        resolved = sorted({str(slot["slot_name"]) for slot in slots})
        record["resolved_materials"] = resolved
        if resolved != sorted(entry["materials"]):
            fail(f"{path} carries material slots {resolved} but the inventory declares "
                 f"{sorted(entry['materials'])} for {asset}.")
        checked[asset] = record
    report["meshes"] = checked


def check_placements(layout):
    """Every placement present at its mapped transform, and nothing extra."""
    actors = {}
    duplicates = []
    for actor in actor_subsystem().get_all_level_actors():
        label = actor.get_actor_label()
        if label in actors:
            duplicates.append(label)
        actors[label] = actor
    if duplicates:
        fail(f"the saved level has more than one actor labelled {sorted(set(duplicates))}, so a "
             f"placement cannot be matched to exactly one actor.")
    report["actor_labels"] = sorted(actors)

    declared = {placement["id"]: placement for placement in layout["placements"]}
    checked = {}
    for identifier, placement in sorted(declared.items()):
        actor = actors.get(identifier)
        if actor is None:
            fail(f"layout placement {identifier} ({placement['asset']}) has no actor in the saved "
                 f"{frames.LEVEL_PACKAGE}.")
            continue
        if not isinstance(actor, unreal.StaticMeshActor):
            fail(f"actor {identifier} is a {type(actor).__name__}, not a StaticMeshActor.")
            continue
        mesh = actor.static_mesh_component.static_mesh
        expected_mesh = f"{frames.mesh_package(placement['asset'])}.{frames.MESH_PREFIX}{placement['asset']}"
        location = actor.get_actor_location()
        rotation = actor.get_actor_rotation()
        scale = actor.get_actor_scale3d()
        expected_location = frames.layout_location_to_unreal(placement["location_m"])
        expected_yaw = frames.layout_yaw_to_unreal(placement["yaw_deg"])
        measured = [location.x, location.y, location.z]
        record = {"asset": placement["asset"], "tag": placement.get("tag"),
                  "mesh": None if mesh is None else mesh.get_path_name(),
                  "measured_location_cm": measured, "expected_location_cm": expected_location,
                  "measured_yaw_deg": rotation.yaw, "expected_yaw_deg": expected_yaw,
                  "measured_pitch_deg": rotation.pitch, "measured_roll_deg": rotation.roll,
                  "scale": [scale.x, scale.y, scale.z],
                  "layout_location_m": frames.unreal_location_to_layout(measured),
                  "layout_yaw_deg": frames.unreal_yaw_to_layout(rotation.yaw)}
        if mesh is None or mesh.get_path_name() != expected_mesh:
            fail(f"actor {identifier} holds mesh {record['mesh']}, not the {expected_mesh} its "
                 f"layout asset {placement['asset']} names.")
        worst = max(abs(measured[axis] - expected_location[axis]) for axis in range(3))
        record["location_difference_cm"] = worst
        if worst > frames.LOCATION_TOLERANCE_CM:
            fail(f"actor {identifier} stands at {measured} cm but the layout's "
                 f"{placement['location_m']} m maps to {expected_location} cm, off by "
                 f"{worst:.4f} cm over the {frames.LOCATION_TOLERANCE_CM:g} cm allowed.")
        yaw_difference = abs(frames.normalise_degrees(rotation.yaw - expected_yaw))
        record["yaw_difference_deg"] = yaw_difference
        if yaw_difference > frames.YAW_TOLERANCE_DEG:
            fail(f"actor {identifier} is at Unreal yaw {rotation.yaw:.4f} deg but the layout's "
                 f"{placement['yaw_deg']} deg maps to {expected_yaw:.4f} deg, off by "
                 f"{yaw_difference:.4f} deg over the {frames.YAW_TOLERANCE_DEG:g} deg allowed.")
        for angle, name in ((rotation.pitch, "pitch"), (rotation.roll, "roll")):
            if abs(frames.normalise_degrees(angle)) > frames.YAW_TOLERANCE_DEG:
                fail(f"actor {identifier} has {name} {angle:.4f} deg; a placement on the ground "
                     f"carries yaw only, within {frames.YAW_TOLERANCE_DEG:g} deg.")
        if max(abs(scale.x - 1.0), abs(scale.y - 1.0), abs(scale.z - 1.0)) > 1e-6:
            fail(f"actor {identifier} is scaled {record['scale']}; the import already carries the "
                 f"metre-to-centimetre scale, so an actor scale would apply it twice.")
        checked[identifier] = record
    report["placements"] = checked

    # Anything the layout did not declare and the world-actor set does not name
    # is a failure, whatever its class. Narrowing this to static meshes is how an
    # eight-actor contamination of an engine map went unnoticed on this branch.
    world_classes = {class_name for _, class_name in WORLD_ACTORS}
    unexpected = []
    for label, actor in sorted(actors.items()):
        if label in declared:
            continue
        class_name = type(actor).__name__
        if class_name in world_classes or class_name in ALLOWED_ENGINE_ACTOR_CLASSES:
            continue
        unexpected.append({"label": label, "class": class_name})
    report["other_actors"] = unexpected
    if unexpected:
        named = [entry["label"] + " (" + entry["class"] + ")" for entry in unexpected]
        allowed = sorted(ALLOWED_ENGINE_ACTOR_CLASSES) or "none, measured"
        fail(f"the saved level holds {len(unexpected)} actors the layout does not declare and that "
             f"are neither a world actor {sorted(world_classes)} nor engine furniture "
             f"({allowed}): {named}. The level has to hold the layout's contents and nothing else.")


def check_world_actors(layout):
    """The lighting, sky and entry point the town needs to be lit and walkable."""
    by_class = {}
    for actor in actor_subsystem().get_all_level_actors():
        by_class.setdefault(type(actor).__name__, []).append(actor)
    found = {}
    for label, class_name in WORLD_ACTORS:
        instances = by_class.get(class_name, [])
        found[label] = [actor.get_actor_label() for actor in instances]
        if not instances:
            fail(f"the saved level has no {class_name}, so it is missing its {label}; a town "
                 f"without one is not lit and walkable.")
        elif len(instances) > 1:
            fail(f"the saved level has {len(instances)} {class_name} actors "
                 f"({found[label]}); design.md's level carries exactly one {label}.")
    report["world_actors_found"] = found

    suns = by_class.get("DirectionalLight", [])
    if suns:
        rotation = suns[0].get_actor_rotation()
        sun = layout["sun"]
        report["sun"] = {"measured_pitch_deg": rotation.pitch, "measured_yaw_deg": rotation.yaw,
                         "expected_pitch_deg": sun["pitch_deg"], "expected_yaw_deg": sun["yaw_deg"]}
        for measured, expected, name in ((rotation.pitch, sun["pitch_deg"], "pitch"),
                                         (rotation.yaw, sun["yaw_deg"], "yaw")):
            difference = abs(frames.normalise_degrees(measured - expected))
            report["sun"][f"{name}_difference_deg"] = difference
            if difference > frames.SUN_ANGLE_TOLERANCE_DEG:
                fail(f"the sun is at {name} {measured:.4f} deg but the layout's sun {name} is "
                     f"{expected:.4f} deg, off by {difference:.4f} deg over the "
                     f"{frames.SUN_ANGLE_TOLERANCE_DEG:g} deg allowed. design.md passes the "
                     f"layout's sun angles straight through.")
        component = suns[0].light_component
        report["sun"]["intensity"] = component.get_editor_property("intensity")
        report["sun"]["atmosphere_sun_light"] = bool(
            component.get_editor_property("atmosphere_sun_light"))
        if not report["sun"]["atmosphere_sun_light"]:
            fail("the sun is not marked as the atmosphere's sun light, so the sky would not be "
                 "lit by it.")

    sky_lights = by_class.get("SkyLight", [])
    if sky_lights:
        component = sky_lights[0].light_component
        report["sky_light"] = {
            "source_type": str(component.get_editor_property("source_type")),
            "real_time_capture": bool(component.get_editor_property("real_time_capture")),
            "intensity": component.get_editor_property("intensity")}
        if not report["sky_light"]["real_time_capture"]:
            fail("the sky light does not capture the scene in real time, so with no baked cubemap "
                 "it would contribute no ambient light and shadowed walls would read black.")


def check_house_fronts(layout):
    """Does each house's front point at the street it stands on?

    Measured from the saved level's actual actor transforms, mapped back into the
    layout frame.
    """
    actors = {actor.get_actor_label(): actor for actor in actor_subsystem().get_all_level_actors()}
    checked = {}
    for placement in layout["placements"]:
        if placement.get("tag") != "house":
            continue
        actor = actors.get(placement["id"])
        if actor is None:
            continue
        location = actor.get_actor_location()
        rotation = actor.get_actor_rotation()
        layout_location = frames.unreal_location_to_layout([location.x, location.y, location.z])
        layout_yaw = frames.unreal_yaw_to_layout(rotation.yaw)
        result = frames.house_front_check(layout_location[:2], layout_yaw)
        result["layout_location_m"] = layout_location
        result["layout_yaw_deg"] = layout_yaw
        result["unreal_front_vector"] = list(frames.unreal_front_vector(rotation.yaw))
        checked[placement["id"]] = result
        if not result["passed"]:
            fail(f"house {placement['id']} ({placement['asset']}) at layout "
                 f"{[round(value, 3) for value in layout_location[:2]]} m, yaw "
                 f"{layout_yaw:.2f} deg: {result['reason']}.")
    report["house_fronts"] = checked
    report["house_front_count"] = len(checked)
    if not checked:
        fail("the layout declares no house placements, so the front-to-street check measured "
             "nothing.")


def check_axis_signs(layout):
    """Measure the import's axis signs against the authored geometry.

    The transform checks above only prove this step agrees with itself: they read
    back what it wrote. These two traces go to the geometry instead, at places
    where the authored meshes are lopsided, so a wrong sign shows up as the
    lopsidedness being on the other side.
    """
    world = editor_world()
    if world is None:
        fail("the editor has no world, so the axis signs could not be measured.")
        return
    all_actors = actor_subsystem().get_all_level_actors()
    actors = {actor.get_actor_label(): actor for actor in all_actors}
    results = {}
    for probe in frames.SIGN_PROBES:
        candidates = [placement for placement in layout["placements"]
                      if placement["asset"] == probe["asset"] and placement["id"] in actors]
        if not candidates:
            fail(f"the layout places no {probe['asset']}, so the axis-sign measurement that "
                 f"relies on it ({probe['feature']}) could not run.")
            continue
        placement = candidates[0]
        actor = actors[placement["id"]]
        location = actor.get_actor_location()
        yaw = actor.get_actor_rotation().yaw
        # Everything except this actor is ignored, so a hit is its own geometry
        # and nothing else: not a neighbour, not the ground.
        ignore = [other for other in all_actors if other is not actor]
        hits = {"tall": [], "short": []}
        samples = []
        for side, start, end in frames.sign_probe_segments(
                probe, [location.x, location.y, location.z], yaw):
            found = segment_hits(world, start, end, ignore=ignore)
            hits[side].append(found)
            samples.append({"side": side, "start": start, "end": end, "hit": found})
        verdict = frames.sign_probe_verdict(probe, hits["tall"], hits["short"])
        verdict["actor"] = placement["id"]
        verdict["actor_yaw_deg"] = yaw
        verdict["ignored_actors"] = len(ignore)
        verdict["samples"] = samples
        results[probe["asset"]] = verdict
        if not verdict["passed"]:
            fail(f"axis signs measured against {placement['id']}: {verdict['reason']}.")
    report["axis_signs"] = results


def check_ground_under_player_start(layout):
    """Can a character stand at the entry point, in the open?

    Two bracketed traces rather than a measured height, because the trace result
    itself is not readable from Python. The first brackets the layout's z by the
    tolerance, so a hit means the ground is there and within it. The second
    sweeps the column above, so a miss means the start is in the open rather than
    inside a building.

    Both go through the Pawn profile, the collision a walking character actually
    meets. A Visibility trace would answer a different question: a mesh can block
    one channel and not the other.
    """
    world = editor_world()
    if world is None:
        return
    start = layout["player_start_m"]
    expected = frames.layout_location_to_unreal(start["location"])
    # Ignore the entry point itself: what matters is the ground under it, not
    # whether its own capsule answers a visibility trace.
    ignore = [actor for actor in actor_subsystem().get_all_level_actors()
              if isinstance(actor, unreal.PlayerStart)]
    ground = segment_blocks_pawn(world,
                                 [expected[0], expected[1], expected[2] + GROUND_TOLERANCE_CM],
                                 [expected[0], expected[1], expected[2] - GROUND_TOLERANCE_CM],
                                 ignore=ignore)
    headroom = segment_blocks_pawn(
        world,
        [expected[0], expected[1], expected[2] + TRACE_TOP_CM],
        [expected[0], expected[1], expected[2] + GROUND_TOLERANCE_CM + 1.0],
        ignore=ignore)
    report["player_start_ground"] = {
        "world_xy": expected[:2], "expected_height_cm": expected[2],
        "ground_within_tolerance": ground, "obstructed_above": headroom,
        "tolerance_cm": GROUND_TOLERANCE_CM, "headroom_checked_to_cm": TRACE_TOP_CM,
        "collision_profile": "Pawn"}
    if not ground:
        fail(f"a Pawn-profile trace at the player start, Unreal {expected[:2]} cm, finds nothing "
             f"blocking between {expected[2] + GROUND_TOLERANCE_CM:g} and "
             f"{expected[2] - GROUND_TOLERANCE_CM:g} cm, so there is no ground within "
             f"{GROUND_TOLERANCE_CM:g} cm of the layout's z for a character to stand on and it "
             f"would fall out of the town.")
    if headroom:
        fail(f"a Pawn-profile trace at the player start, Unreal {expected[:2]} cm, is blocked "
             f"between {expected[2] + GROUND_TOLERANCE_CM + 1:g} and "
             f"{expected[2] + TRACE_TOP_CM:g} cm, so the entry point is inside or under a "
             f"placement rather than on open ground.")


def verify(layout, inventory):
    if not unreal.EditorAssetLibrary.does_asset_exist(frames.LEVEL_PACKAGE):
        fail(f"{frames.LEVEL_PACKAGE} does not exist, so there is nothing to verify. Run "
             f"python tools/medieval/build_level.py first.")
        return
    if not level_subsystem().load_level(frames.LEVEL_PACKAGE):
        fail(f"Unreal could not open {frames.LEVEL_PACKAGE}.")
        return
    report["opened_world"] = current_world_package()
    if report["opened_world"] != frames.LEVEL_PACKAGE:
        fail(f"after loading, the editor's world is {report['opened_world']!r}, not "
             f"{frames.LEVEL_PACKAGE!r}, so the checks would measure the wrong level.")
        return
    check_meshes(inventory)
    check_placements(layout)
    check_world_actors(layout)
    check_house_fronts(layout)
    check_axis_signs(layout)
    check_ground_under_player_start(layout)


def main():
    report["engine_version"] = unreal.SystemLibrary.get_engine_version()
    try:
        inventory = frames.check_inventory(frames.load_json(INVENTORY_PATH), INVENTORY_PATH)
        layout = frames.check_layout(frames.load_json(LAYOUT_PATH), LAYOUT_PATH, inventory)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        fail(f"the inputs cannot be used: {error}")
        flush()
        return
    report["inventory_sha256_in_layout"] = layout.get("inventory_sha256")
    report["placements_declared"] = len(layout["placements"])

    try:
        if MODE == "build":
            build(layout, inventory)
        elif MODE == "verify":
            verify(layout, inventory)
        else:
            fail(f"MEDIEVAL_MODE is {MODE!r}; it has to be 'build' or 'verify'.")
    except Exception as error:  # noqa: BLE001 - reported, so the launcher sees the reason
        fail(f"{MODE} stopped: {type(error).__name__}: {error}")
        report["traceback"] = traceback.format_exc()

    report["passed"] = not report["problems"]
    flush()
    unreal.log(f"MEDIEVAL_LEVEL_DONE mode={MODE} passed={report['passed']} "
               f"problems={len(report['problems'])}")


main()
