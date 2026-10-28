"""Import the medieval glTF assets and author their materials, inside the editor.

Launched by `prepare_project.py` through `level_editor_session.py`; it runs under
Unreal's embedded CPython, so it is the only file here that imports `unreal`.

What it produces, per design.md "Unreal project":

* one static mesh per inventory asset at /Game/Generated/Meshes/SM_<asset>,
* the twelve contract materials at /Game/Generated/Materials/<name>,
* each mesh slot carrying the contract material its glTF material name asks for,
* collision a walking character cannot fall through,
* every package saved.

Three things it does not take on faith. Nanite, which Interchange enables by
default, replaces LOD0 with a decimated fallback that complex-as-simple collision
would then use, so it is turned off and the triangle count is read back. The
import scale and axes are measured against the inventory rather than assumed. A
material is only accepted once Unreal reports real shader instruction counts for
it, because a material whose shader map never compiled has none.
"""

import json
import os
import sys
import traceback

import unreal

sys.path.insert(0, os.environ["MEDIEVAL_TOOLS_DIR"])
import level_frames as frames  # noqa: E402 - the path above has to come first

INVENTORY_PATH = os.environ["MEDIEVAL_INVENTORY"]
ASSET_DIR = os.environ["MEDIEVAL_ASSET_DIR"].replace("\\", "/")
REPORT_PATH = os.environ["MEDIEVAL_REPORT"]

# How each material breaks up: the noise scale in inverse centimetres, how far
# the grain swings either side of one, and how far the per-actor tint does.
# Cobbles and thatch want small busy features; plaster wants broad patches.
SURFACE_GRAIN = {
    "M_Plaster": (0.016, 0.10, 0.10),
    "M_Timber": (0.040, 0.14, 0.05),
    "M_RoofTile": (0.055, 0.16, 0.09),
    "M_Thatch": (0.070, 0.20, 0.07),
    "M_Stone": (0.030, 0.13, 0.06),
    "M_Cobble": (0.085, 0.22, 0.03),
    "M_Dirt": (0.050, 0.18, 0.03),
    "M_Grass": (0.045, 0.24, 0.04),
    "M_Wood": (0.045, 0.12, 0.06),
    "M_Iron": (0.060, 0.10, 0.03),
    "M_Canvas": (0.035, 0.12, 0.10),
    "M_Leaf": (0.055, 0.22, 0.08),
}
# The per-actor tint reads object position, so its features must be the size of a
# building rather than of a brick.
TINT_SCALE = 0.004

# Opened only so the town is not the current level while its meshes are replaced.
# It is read, never saved: this step writes no level at all.
DETACH_MAP = "/Engine/Maps/Entry"

report = {
    "schema_version": 1,
    "generator": "tools/medieval/import_assets_editor.py",
    "inventory_path": INVENTORY_PATH,
    "asset_dir": ASSET_DIR,
    "measured_mapping": frames.MEASURED_MAPPING,
    "nominal_mapping": frames.NOMINAL_MAPPING,
    "mapping_evidence": frames.MEASURED_MAPPING_EVIDENCE,
    "bounds_tolerance_cm": frames.BOUNDS_TOLERANCE_CM,
    "materials": {},
    "assets": {},
    "problems": [],
}


def flush():
    with open(REPORT_PATH, "w", encoding="utf-8") as handle:
        json.dump(report, handle, indent=2, sort_keys=True, default=str)


def fail(message):
    report["problems"].append(message)
    unreal.log_error(f"MEDIEVAL_IMPORT_PROBLEM {message}")
    flush()


def library():
    return unreal.MaterialEditingLibrary


def connect(material, source, source_output, target, target_input, label):
    if not library().connect_material_expressions(source, source_output, target, target_input):
        raise RuntimeError(
            f"Unreal refused to wire {label} in {material.get_path_name()}: "
            f"{type(source).__name__} output {source_output or '(default)'} into "
            f"{type(target).__name__} input {target_input!r}. The available inputs are "
            f"{[str(name) for name in library().get_material_expression_input_names(target)]}.")


def connect_property(material, source, prop, label):
    if not library().connect_material_property(source, "", prop):
        raise RuntimeError(f"Unreal refused to wire {label} into {prop} in {material.get_path_name()}.")


def noise_expression(material, x, y, scale, swing, levels):
    """A noise node centred on one, swinging `swing` either side."""
    noise = library().create_material_expression(material, unreal.MaterialExpressionNoise, x, y)
    noise.set_editor_property("scale", scale)
    noise.set_editor_property("levels", levels)
    noise.set_editor_property("quality", 1)
    noise.set_editor_property("turbulence", False)
    noise.set_editor_property("noise_function", unreal.NoiseFunction.NOISEFUNCTION_GRADIENT_TEX)
    noise.set_editor_property("output_min", 1.0 - swing)
    noise.set_editor_property("output_max", 1.0 + swing)
    return noise


def build_material(name, settings):
    """One contract material: inventory colour, broken up so it is not flat."""
    path = frames.material_package(name)
    tools = unreal.AssetToolsHelpers.get_asset_tools()
    existing = unreal.load_asset(path)
    if existing is not None:
        if not isinstance(existing, unreal.Material):
            raise RuntimeError(f"{path} already exists and is a {type(existing).__name__}, "
                               f"not a Material, so this step will not overwrite it.")
        material = existing
        # Clear the old graph from a snapshot: UE 5.8's bulk delete mutates the
        # live expression range while iterating it.
        for expression in list(library().get_material_expressions(material)):
            library().delete_material_expression(material, expression)
        remaining = len(library().get_material_expressions(material))
        if remaining:
            raise RuntimeError(f"{path} still holds {remaining} expressions after clearing its old "
                               f"graph, so a rebuilt graph would be mixed with the previous one.")
    else:
        material = tools.create_asset(name, frames.MATERIAL_PACKAGE_ROOT, unreal.Material,
                                      unreal.MaterialFactoryNew())
    if material is None:
        raise RuntimeError(f"Unreal did not create a material at {path}.")

    colour = settings["base_color"]
    roughness = float(settings["roughness"])
    metallic = float(settings["metallic"])
    grain_scale, grain_swing, tint_swing = SURFACE_GRAIN[name]

    base = library().create_material_expression(material, unreal.MaterialExpressionConstant3Vector,
                                                -1000, -200)
    base.set_editor_property("constant", unreal.LinearColor(colour[0], colour[1], colour[2], 1.0))

    world_position = library().create_material_expression(
        material, unreal.MaterialExpressionWorldPosition, -1400, 100)
    grain = noise_expression(material, -1000, 100, grain_scale, grain_swing, 2)
    connect(material, world_position, "", grain, "World Position", "world position into the grain noise")

    object_position = library().create_material_expression(
        material, unreal.MaterialExpressionObjectPositionWS, -1400, 420)
    tint = noise_expression(material, -1000, 420, TINT_SCALE, tint_swing, 1)
    connect(material, object_position, "", tint, "World Position",
            "object position into the per-actor tint noise")

    grained = library().create_material_expression(material, unreal.MaterialExpressionMultiply, -640, -140)
    connect(material, base, "", grained, "A", "base colour into the grain multiply")
    connect(material, grain, "", grained, "B", "grain noise into the grain multiply")

    tinted = library().create_material_expression(material, unreal.MaterialExpressionMultiply, -400, -140)
    connect(material, grained, "", tinted, "A", "grained colour into the tint multiply")
    connect(material, tint, "", tinted, "B", "tint noise into the tint multiply")
    connect_property(material, tinted, unreal.MaterialProperty.MP_BASE_COLOR, "the tinted colour")

    roughness_constant = library().create_material_expression(
        material, unreal.MaterialExpressionConstant, -640, 700)
    roughness_constant.set_editor_property("r", roughness)
    rough = library().create_material_expression(material, unreal.MaterialExpressionMultiply, -400, 700)
    connect(material, roughness_constant, "", rough, "A", "the roughness constant into its multiply")
    connect(material, grain, "", rough, "B", "grain noise into the roughness multiply")
    connect_property(material, rough, unreal.MaterialProperty.MP_ROUGHNESS, "the grained roughness")

    metallic_constant = library().create_material_expression(
        material, unreal.MaterialExpressionConstant, -400, 900)
    metallic_constant.set_editor_property("r", metallic)
    connect_property(material, metallic_constant, unreal.MaterialProperty.MP_METALLIC,
                     "the metallic constant")

    library().layout_material_expressions(material)

    errors = library().recompile_material(material)
    if errors:
        raise RuntimeError(f"Unreal could not compile {path}: "
                           + "; ".join(str(error) for error in errors))
    # GetStatistics finishes this material resource's compilation. A missing
    # resource or a failed shader map reports no instructions at all.
    stats = library().get_statistics(material)
    vertex = stats.num_vertex_shader_instructions
    pixel = stats.num_pixel_shader_instructions
    if vertex <= 0 or pixel <= 0:
        raise RuntimeError(
            f"Unreal has no compiled shader resource for {path}: vertex={vertex}, pixel={pixel}. "
            f"The editor must run with commandlet rendering on D3D12, never NullRHI.")
    if not unreal.EditorAssetLibrary.save_loaded_asset(material, False):
        raise RuntimeError(f"Unreal refused to save {path}.")

    record = {"path": material.get_path_name(), "base_color": list(colour), "roughness": roughness,
              "metallic": metallic, "grain_scale": grain_scale, "grain_swing": grain_swing,
              "tint_swing": tint_swing, "vertex_instructions": vertex, "pixel_instructions": pixel,
              "expressions": len(library().get_material_expressions(material))}
    report["materials"][name] = record
    unreal.log(f"MEDIEVAL_IMPORT_MATERIAL {name} vertex={vertex} pixel={pixel}")
    return material


def import_one(asset, entry, materials):
    """Import one glTF binary and bring it up to the contract."""
    record = {"asset": asset, "file": entry["file"]}
    source = f"{ASSET_DIR}/{entry['file']}"
    if not os.path.isfile(source):
        raise RuntimeError(f"{source} is missing, so {asset} cannot be imported. Run "
                           f"tools/blender/build_assets.py first.")
    record["source"] = source
    record["source_bytes"] = os.path.getsize(source)

    staging = f"{frames.IMPORT_STAGING_ROOT}/{asset}"
    task = unreal.AssetImportTask()
    task.set_editor_property("filename", source)
    task.set_editor_property("destination_path", staging)
    task.set_editor_property("automated", True)
    task.set_editor_property("replace_existing", True)
    task.set_editor_property("save", False)
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
    imported = [str(path) for path in task.get_editor_property("imported_object_paths")]
    record["imported_object_paths"] = imported
    loaded = [(path, unreal.load_asset(path)) for path in imported]
    meshes = [(path, obj) for path, obj in loaded if isinstance(obj, unreal.StaticMesh)]
    if len(meshes) != 1:
        raise RuntimeError(
            f"Importing {entry['file']} produced {len(meshes)} static meshes, not the one "
            f"design.md requires per asset. Interchange returned {imported}.")

    mesh = meshes[0][1]
    target = frames.mesh_package(asset)
    if mesh.get_path_name().split(".")[0] != target:
        if unreal.EditorAssetLibrary.does_asset_exist(target):
            if not unreal.EditorAssetLibrary.delete_asset(target):
                raise RuntimeError(f"Unreal refused to delete the previous {target}, so this run "
                                   f"cannot move the freshly imported {asset} into place.")
        if not unreal.EditorAssetLibrary.rename_asset(mesh.get_path_name().split(".")[0], target):
            raise RuntimeError(f"Unreal refused to move {mesh.get_path_name()} to {target}.")
        mesh = unreal.load_asset(target)
        if mesh is None:
            raise RuntimeError(f"Nothing loads from {target} after the move.")
    record["path"] = mesh.get_path_name()

    static_subsystem = unreal.get_editor_subsystem(unreal.StaticMeshEditorSubsystem)

    # Nanite replaces LOD0 with a decimated fallback, and complex-as-simple
    # collision then uses that fallback, so a character would walk on reduced
    # geometry. Off, then read back.
    settings = static_subsystem.get_nanite_settings(mesh)
    if settings.get_editor_property("enabled"):
        settings.set_editor_property("enabled", False)
        static_subsystem.set_nanite_settings(mesh, settings, True)
    record["nanite_enabled"] = bool(static_subsystem.get_nanite_settings(mesh).enabled)
    if record["nanite_enabled"]:
        raise RuntimeError(f"{target} still has Nanite enabled, so its LOD0 is a decimated "
                           f"fallback and its collision would be too.")

    record["triangles"] = mesh.get_num_triangles(0)
    record["vertices"] = mesh.get_num_vertices(0)
    record["sections"] = mesh.get_num_sections(0)
    record["inventory_triangles"] = entry["triangles"]
    if record["triangles"] <= 0:
        raise RuntimeError(f"{target} imported with no triangles, so it has nothing to collide "
                           f"with or draw.")
    # The triangle count is the check, not the Nanite setting above. Complex as
    # simple collides against LOD0, so any route to a reduced LOD0 puts a
    # character on geometry the inventory never described, whether Nanite, an
    # import reduction setting or a future Interchange default did it.
    if record["triangles"] != record["inventory_triangles"]:
        raise RuntimeError(
            f"{target} imported with {record['triangles']} triangles at LOD0 but the inventory "
            f"declares {record['inventory_triangles']} for {asset}, a difference of "
            f"{record['triangles'] - record['inventory_triangles']}. The two have to be equal: "
            f"complex-as-simple collision uses LOD0, so a reduced LOD0 is the geometry a character "
            f"would walk on.")

    # Complex as simple: the authored triangles answer the capsule sweeps a
    # walking character makes, so it cannot fall through a 193-actor town that
    # carries no authored collision primitives.
    body = mesh.get_editor_property("body_setup")
    if body is None:
        raise RuntimeError(f"{target} has no body setup, so no collision can be configured on it.")
    body.set_editor_property("collision_trace_flag",
                             unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE)
    flag = body.get_editor_property("collision_trace_flag")
    record["collision_trace_flag"] = str(flag)
    if flag != unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE:
        raise RuntimeError(f"{target} reports collision trace flag {flag} after being set to "
                           f"CTF_USE_COMPLEX_AS_SIMPLE, so its triangles would not block a capsule.")
    if mesh.get_editor_property("complex_collision_mesh") is not None:
        raise RuntimeError(f"{target} takes its complex collision from another mesh, so its own "
                           f"triangles would not be the ones a character hits.")
    disabled = [index for index in range(mesh.get_num_sections(0))
                if not static_subsystem.is_section_collision_enabled(mesh, 0, index)]
    for index in disabled:
        static_subsystem.enable_section_collision(mesh, True, 0, index)
    still_off = [index for index in range(mesh.get_num_sections(0))
                 if not static_subsystem.is_section_collision_enabled(mesh, 0, index)]
    record["sections_collision_enabled_now"] = not still_off
    record["sections_collision_was_off"] = disabled
    if still_off:
        raise RuntimeError(f"{target} sections {still_off} still have collision disabled, so a "
                           f"character could pass through those faces.")

    # Materials by their glTF material name. Interchange names each slot after
    # the source material, so the slot name is the key; the material Interchange
    # made for that slot is the fallback, and the resolved set has to be the one
    # the inventory declares for this asset.
    slots = mesh.get_editor_property("static_materials")
    resolved = []
    for index in range(len(slots)):
        slot = slots[index]
        slot_name = str(slot.material_slot_name)
        imported_material = slot.material_interface
        imported_name = None if imported_material is None else imported_material.get_name()
        keys = [name for name in (slot_name, imported_name) if name in frames.MATERIAL_NAMES]
        if not keys:
            raise RuntimeError(
                f"{target} slot {index} is named {slot_name!r} and carries "
                f"{imported_name!r}, neither of which is one of design.md's materials "
                f"{list(frames.MATERIAL_NAMES)}. The glTF material name has to match one.")
        if len(set(keys)) > 1:
            raise RuntimeError(f"{target} slot {index} names {slot_name!r} but carries "
                               f"{imported_name!r}; they must agree on one contract material.")
        key = keys[0]
        slot.set_editor_property("material_interface", materials[key])
        slot.set_editor_property("material_slot_name", key)
        slots[index] = slot
        resolved.append(key)
    mesh.set_editor_property("static_materials", slots)

    # Read the slots back: assigning into a copy of the array is a silent no-op.
    written = []
    for index, slot in enumerate(mesh.get_editor_property("static_materials")):
        material = slot.material_interface
        if material is None:
            raise RuntimeError(f"{target} slot {index} ({resolved[index]}) carries no material "
                               f"after assignment, so it would draw with the engine default.")
        written.append({"index": index, "slot_name": str(slot.material_slot_name),
                        "material": material.get_path_name()})
        expected = frames.material_package(resolved[index])
        if material.get_path_name() != f"{expected}.{resolved[index]}":
            raise RuntimeError(
                f"{target} slot {index} carries {material.get_path_name()} but should carry "
                f"{expected}; assigning into the slot array did not take.")
    record["slots"] = written
    record["resolved_materials"] = sorted(set(resolved))
    declared = sorted(entry["materials"])
    if record["resolved_materials"] != declared:
        raise RuntimeError(
            f"{target} resolved to materials {record['resolved_materials']} but the inventory "
            f"declares {declared} for {asset}, so a slot was matched to the wrong material.")

    # Bounds: measured against the inventory, not assumed from the importer.
    box = mesh.get_bounds()
    origin, extent = box.origin, box.box_extent
    measured_min = [origin.x - extent.x, origin.y - extent.y, origin.z - extent.z]
    measured_max = [origin.x + extent.x, origin.y + extent.y, origin.z + extent.z]
    expected_min, expected_max = frames.inventory_bounds_to_unreal(
        entry["bounds_min_m"], entry["bounds_max_m"])
    record["measured_bounds_min_cm"] = measured_min
    record["measured_bounds_max_cm"] = measured_max
    record["expected_bounds_min_cm"] = expected_min
    record["expected_bounds_max_cm"] = expected_max
    record["mapping"] = frames.measured_mapping(entry["bounds_min_m"], entry["bounds_max_m"],
                                                measured_min, measured_max)
    worst = 0.0
    for axis, name in enumerate("xyz"):
        for measured, expected, side in ((measured_min[axis], expected_min[axis], "min"),
                                         (measured_max[axis], expected_max[axis], "max")):
            worst = max(worst, abs(measured - expected))
            if abs(measured - expected) > frames.BOUNDS_TOLERANCE_CM:
                raise RuntimeError(
                    f"{target} {name} {side} measures {measured:.4f} cm but the inventory's "
                    f"{entry['bounds_min_m'] if side == 'min' else entry['bounds_max_m']} metres "
                    f"times {frames.METRES_TO_UNREAL:g} expects {expected:.4f} cm, a difference of "
                    f"{abs(measured - expected):.4f} cm over the "
                    f"{frames.BOUNDS_TOLERANCE_CM:g} cm allowed. Measured per-axis factors: "
                    f"{record['mapping']}.")
    record["worst_bounds_difference_cm"] = worst

    mesh.modify()
    if not unreal.EditorAssetLibrary.save_loaded_asset(mesh, False):
        raise RuntimeError(f"Unreal refused to save {target}.")
    unreal.log(f"MEDIEVAL_IMPORT_MESH {asset} triangles={record['triangles']} "
               f"worst_bounds_cm={worst:.4f}")
    return record


def detach_from_the_town():
    """Close the town before replacing the meshes it is built from.

    The project's EditorStartupMap is /Game/Maps/MedievalCity, so a fresh editor
    opens the town with every placement referencing the very meshes this step
    replaces. Deleting an asset a loaded level still points at either fails or
    nulls the reference, so the town is closed first. Nothing is saved here: this
    step never writes a level, and the map it opens instead is only read.
    """
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    opened = None if world is None else world.get_path_name().split(".")[0]
    report["world_at_startup"] = opened
    if opened != frames.LEVEL_PACKAGE:
        report["detached_from_town"] = False
        return
    unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).load_level(DETACH_MAP)
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    report["world_after_detach"] = None if world is None else world.get_path_name().split(".")[0]
    report["detached_from_town"] = report["world_after_detach"] != frames.LEVEL_PACKAGE
    if not report["detached_from_town"]:
        raise RuntimeError(
            f"the editor still has {frames.LEVEL_PACKAGE} open after being asked to open "
            f"{DETACH_MAP}, so replacing the meshes it references would null those references.")
    unreal.log(f"MEDIEVAL_IMPORT_DETACHED from {opened} to {report['world_after_detach']}")


def main():
    report["engine_version"] = unreal.SystemLibrary.get_engine_version()
    try:
        detach_from_the_town()
    except Exception as error:  # noqa: BLE001
        fail(f"could not close the town before importing: {error}")
        report.setdefault("tracebacks", {})["detach"] = traceback.format_exc()
        flush()
        return
    try:
        inventory = frames.check_inventory(frames.load_json(INVENTORY_PATH), INVENTORY_PATH)
    except (OSError, ValueError, json.JSONDecodeError) as error:
        fail(f"{INVENTORY_PATH} cannot be used: {error}")
        return
    report["inventory_assets"] = sorted(inventory["assets"])

    materials = {}
    for name in sorted(frames.MATERIAL_NAMES):
        try:
            materials[name] = build_material(name, inventory["materials"][name])
        except Exception as error:  # noqa: BLE001 - every failure is reported, not raised
            fail(f"material {name}: {error}")
            report.setdefault("tracebacks", {})[f"material_{name}"] = traceback.format_exc()
    if len(materials) != len(frames.MATERIAL_NAMES):
        fail(f"only {len(materials)} of design.md's {len(frames.MATERIAL_NAMES)} materials were "
             f"built, so no mesh can be given its full slot set.")
        flush()
        return

    for asset in sorted(inventory["assets"]):
        try:
            report["assets"][asset] = import_one(asset, inventory["assets"][asset], materials)
        except Exception as error:  # noqa: BLE001
            fail(f"asset {asset}: {error}")
            report.setdefault("tracebacks", {})[f"asset_{asset}"] = traceback.format_exc()
        flush()

    unreal.SystemLibrary.execute_console_command(None, "Editor.AsyncAssetCompilationFinishAll")
    # Re-read the statistics after compilation drains: a count that was real
    # before and empty now would mean the shader map never finished.
    for name, record in report["materials"].items():
        stats = library().get_statistics(unreal.load_asset(frames.material_package(name)))
        record["vertex_instructions_after_finish"] = stats.num_vertex_shader_instructions
        record["pixel_instructions_after_finish"] = stats.num_pixel_shader_instructions
        if stats.num_vertex_shader_instructions <= 0 or stats.num_pixel_shader_instructions <= 0:
            fail(f"material {name} reported shader instructions during the build but "
                 f"vertex={stats.num_vertex_shader_instructions}, "
                 f"pixel={stats.num_pixel_shader_instructions} once asset compilation drained, so "
                 f"its shader map did not finish.")

    # The staging folder only ever held Interchange's own material instances and
    # the mesh before it moved; nothing in the level refers to it.
    if unreal.EditorAssetLibrary.does_directory_exist(frames.IMPORT_STAGING_ROOT):
        report["staging_removed"] = unreal.EditorAssetLibrary.delete_directory(
            frames.IMPORT_STAGING_ROOT)
        if not report["staging_removed"]:
            report["staging_left"] = [str(path) for path in unreal.EditorAssetLibrary.list_assets(
                frames.IMPORT_STAGING_ROOT, True, False)]

    report["meshes_written"] = sorted(str(path) for path in unreal.EditorAssetLibrary.list_assets(
        frames.MESH_PACKAGE_ROOT, True, False))
    report["materials_written"] = sorted(str(path) for path in unreal.EditorAssetLibrary.list_assets(
        frames.MATERIAL_PACKAGE_ROOT, True, False))
    report["passed"] = not report["problems"]
    flush()
    unreal.log(f"MEDIEVAL_IMPORT_DONE passed={report['passed']} problems={len(report['problems'])}")


main()
