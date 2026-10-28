"""Blender-side half of the medieval asset generator.

Run by tools/blender/build_assets.py as::

    blender --background --factory-startup --python tools/blender/blender_build.py -- \
        --out <directory> [--previews --preview-dir <directory>]

It turns each :class:`asset_definitions.MeshData` into one triangulated object
with material slots, exports a glTF binary, writes inventory.json, and can
render a three-angle preview strip per asset.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))

import asset_definitions as assets  # noqa: E402  (needs the path above)

EXPECTED_BLENDER = (5, 2)
PREVIEW_WIDTH = 1200
PREVIEW_HEIGHT = 400
# Object yaw per preview panel, left to right: front three-quarter, side, rear
# three-quarter. The camera sits on the +Y side looking towards -Y, so these
# yaws turn the +Y facade towards it first and away from it last.
PREVIEW_YAW_DEG = (140.0, -90.0, -40.0)
UV_METRES_PER_TILE = 2.0


class BuildError(RuntimeError):
    """A failure worth printing on its own and exiting non-zero for."""


# ---------------------------------------------------------------------------
# environment
# ---------------------------------------------------------------------------
def check_blender_version() -> str:
    version = bpy.app.version
    if version[:2] != EXPECTED_BLENDER:
        raise BuildError(
            f"this script targets Blender {EXPECTED_BLENDER[0]}.{EXPECTED_BLENDER[1]} but is "
            f"running under {bpy.app.version_string}; run it with the Blender 5.2 LTS "
            "executable named in docs/work/2_medieval-city/design.md"
        )
    return f"{version[0]}.{version[1]}.{version[2]}"


def parse_args(argv: list[str]) -> dict[str, object]:
    if "--" in argv:
        argv = argv[argv.index("--") + 1 :]
    else:
        argv = []
    options: dict[str, object] = {"out": None, "previews": False, "preview_dir": None}
    index = 0
    while index < len(argv):
        token = argv[index]
        if token == "--out":
            options["out"] = argv[index + 1]
            index += 2
        elif token == "--preview-dir":
            options["preview_dir"] = argv[index + 1]
            index += 2
        elif token == "--previews":
            options["previews"] = True
            index += 1
        else:
            raise BuildError(
                f"unrecognised argument {token!r}; this script accepts --out <dir>, "
                "--previews and --preview-dir <dir>"
            )
    if not options["out"]:
        raise BuildError("--out <directory> is required so the exporter knows where to write")
    return options


def wipe_scene() -> None:
    """Empty the factory scene so only the asset under construction exists."""
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)
    for collection in (
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
        bpy.data.images,
    ):
        for item in list(collection):
            try:
                collection.remove(item, do_unlink=True)
            except (RuntimeError, ReferenceError):
                pass


# ---------------------------------------------------------------------------
# materials
# ---------------------------------------------------------------------------
def make_materials() -> dict[str, bpy.types.Material]:
    made: dict[str, bpy.types.Material] = {}
    for name in sorted(assets.MATERIALS):
        spec = assets.MATERIALS[name]
        material = bpy.data.materials.new(name=name)
        if material.name != name:
            raise BuildError(
                f"Blender renamed material {name!r} to {material.name!r}, so the exported glTF "
                "would not carry the exact name design.md fixes; clear the scene first"
            )
        if material.node_tree is None:
            material.use_nodes = True
        bsdf = material.node_tree.nodes.get("Principled BSDF")
        if bsdf is None:
            raise BuildError(
                f"material {name} has no 'Principled BSDF' node; nodes present are "
                + ", ".join(sorted(node.name for node in material.node_tree.nodes))
            )
        colour = spec["base_color"]
        bsdf.inputs["Base Color"].default_value = (colour[0], colour[1], colour[2], 1.0)
        bsdf.inputs["Roughness"].default_value = spec["roughness"]
        bsdf.inputs["Metallic"].default_value = spec["metallic"]
        material.diffuse_color = (colour[0], colour[1], colour[2], 1.0)
        material.roughness = spec["roughness"]
        material.metallic = spec["metallic"]
        made[name] = material
    return made


# ---------------------------------------------------------------------------
# mesh construction
# ---------------------------------------------------------------------------
def build_object(
    name: str, data: assets.MeshData, materials: dict[str, bpy.types.Material]
) -> bpy.types.Object:
    slots = data.materials()
    slot_index = {material: index for index, material in enumerate(slots)}

    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(list(data.verts), [], [list(face) for face in data.faces])
    mesh.update()
    if len(mesh.polygons) != len(data.faces):
        raise BuildError(
            f"{name}: Blender kept {len(mesh.polygons)} of {len(data.faces)} polygons, so some "
            "faces were degenerate or duplicated; check the generator for zero-area faces"
        )
    for material in slots:
        mesh.materials.append(materials[material])
    for polygon, material in zip(mesh.polygons, data.face_materials, strict=True):
        polygon.material_index = slot_index[material]

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    triangulate(name, mesh)
    add_box_uvs(name, mesh)

    if obj.modifiers:
        raise BuildError(
            f"{name} carries {len(obj.modifiers)} modifier(s); the generator builds final "
            "geometry so there is nothing to apply"
        )
    if tuple(obj.scale) != (1.0, 1.0, 1.0) or tuple(obj.location) != (0.0, 0.0, 0.0):
        raise BuildError(
            f"{name} has scale {tuple(obj.scale)} and location {tuple(obj.location)}; both must "
            "be identity so the exported metres match the inventory"
        )
    return obj


def triangulate(name: str, mesh: bpy.types.Mesh) -> None:
    bm = bmesh.new()
    bm.from_mesh(mesh)
    try:
        bmesh.ops.triangulate(
            bm, faces=bm.faces[:], quad_method="FIXED", ngon_method="EAR_CLIP"
        )
    except (TypeError, ValueError) as exc:
        bm.free()
        raise BuildError(
            f"{name}: bmesh.ops.triangulate rejected quad_method='FIXED' / "
            f"ngon_method='EAR_CLIP' under {bpy.app.version_string}: {exc}"
        ) from exc
    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    bad = [len(polygon.vertices) for polygon in mesh.polygons if len(polygon.vertices) != 3]
    if bad:
        raise BuildError(
            f"{name}: {len(bad)} polygon(s) still have {sorted(set(bad))} vertices after "
            "triangulation; every face must be a triangle"
        )


def add_box_uvs(name: str, mesh: bpy.types.Mesh) -> None:
    """One UV set from a per-face box projection, so every triangle is mapped."""
    layer = mesh.uv_layers.new(name="UVMap")
    uvs = layer.data
    for polygon in mesh.polygons:
        normal = polygon.normal
        axis = max(range(3), key=lambda index: abs(normal[index]))
        for loop_index in polygon.loop_indices:
            vertex = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            if axis == 2:
                u, v = vertex.x, vertex.y
            elif axis == 0:
                u, v = vertex.y, vertex.z
            else:
                u, v = vertex.x, vertex.z
            uvs[loop_index].uv = (u / UV_METRES_PER_TILE, v / UV_METRES_PER_TILE)
    if len(mesh.uv_layers) != 1:
        raise BuildError(
            f"{name} ended up with {len(mesh.uv_layers)} UV sets; design.md asks for one"
        )


def measure(obj: bpy.types.Object) -> dict[str, object]:
    mesh = obj.data
    xs = [vertex.co.x for vertex in mesh.vertices]
    ys = [vertex.co.y for vertex in mesh.vertices]
    zs = [vertex.co.z for vertex in mesh.vertices]
    low = [min(xs), min(ys), min(zs)]
    high = [max(xs), max(ys), max(zs)]
    return {
        "bounds_min_m": [round(value, 6) for value in low],
        "bounds_max_m": [round(value, 6) for value in high],
        "footprint_m": [round(high[0] - low[0], 6), round(high[1] - low[1], 6)],
        "height_m": round(high[2] - low[2], 6),
        "triangles": len(mesh.polygons),
        "materials": sorted(material.name for material in mesh.materials),
    }


# ---------------------------------------------------------------------------
# export
# ---------------------------------------------------------------------------
def gltf_export_options() -> dict[str, object]:
    """Export settings checked against this Blender's own exporter properties."""
    wanted = {
        "export_format": "GLB",
        "export_apply": True,
        "use_selection": False,
        "use_visible": False,
        "use_renderable": False,
        "use_active_collection": False,
        "export_cameras": False,
        "export_lights": False,
        "export_animations": False,
        "export_skins": False,
        "export_morph": False,
        "export_normals": True,
        "export_tangents": False,
        "export_texcoords": True,
        "export_materials": "EXPORT",
        "export_image_format": "NONE",
        "export_yup": True,
        "export_extras": False,
        "export_copyright": "",
        "export_keep_originals": False,
        "export_draco_mesh_compression_enable": False,
        "export_hierarchy_flatten_objs": False,
        "export_gpu_instances": False,
        "export_shared_accessors": False,
        "export_try_sparse_sk": False,
        "export_attributes": False,
        "export_all_vertex_colors": False,
        "export_vertex_color": "NONE",
        "will_save_settings": False,
    }
    available = {prop.identifier for prop in bpy.ops.export_scene.gltf.get_rna_type().properties}
    missing = sorted(set(wanted) - available)
    if missing:
        raise BuildError(
            "the glTF exporter in "
            f"{bpy.app.version_string} has no propert{'y' if len(missing) == 1 else 'ies'} "
            f"{', '.join(missing)}; the names it does accept are: "
            + ", ".join(sorted(available))
        )
    return wanted


def export_glb(name: str, path: Path, options: dict[str, object]) -> tuple[str, int]:
    if path.exists():
        path.unlink()
    result = bpy.ops.export_scene.gltf(filepath=str(path), **options)
    if "FINISHED" not in result:
        raise BuildError(f"{name}: the glTF exporter returned {result} instead of FINISHED")
    if not path.exists():
        raise BuildError(f"{name}: the exporter reported success but {path} does not exist")
    payload = path.read_bytes()
    return hashlib.sha256(payload).hexdigest(), len(payload)


# ---------------------------------------------------------------------------
# previews
# ---------------------------------------------------------------------------
def setup_render() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = PREVIEW_WIDTH
    scene.render.resolution_y = PREVIEW_HEIGHT
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.film_transparent = False
    if hasattr(scene, "eevee"):
        scene.eevee.taa_render_samples = 32
        if hasattr(scene.eevee, "use_shadows"):
            scene.eevee.use_shadows = True
    try:
        scene.view_settings.view_transform = "Standard"
    except TypeError:
        pass
    world = scene.world
    if world is None:
        world = bpy.data.worlds.new("PreviewWorld")
        scene.world = world
    if world.node_tree is None:
        world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    if background is not None:
        background.inputs["Color"].default_value = (0.35, 0.37, 0.4, 1.0)
        background.inputs["Strength"].default_value = 0.85


def render_preview(name: str, obj: bpy.types.Object, info: dict[str, object], path: Path) -> None:
    low = info["bounds_min_m"]
    high = info["bounds_max_m"]
    size_x = high[0] - low[0]
    size_y = high[1] - low[1]
    height = high[2] - low[2]

    def projected(elevation_deg: float) -> tuple[float, float]:
        elevation = math.radians(elevation_deg)
        widest = 0.0
        tallest = 0.0
        for yaw_deg in PREVIEW_YAW_DEG:
            yaw = math.radians(yaw_deg)
            span_x = abs(size_x * math.cos(yaw)) + abs(size_y * math.sin(yaw))
            span_y = abs(size_x * math.sin(yaw)) + abs(size_y * math.cos(yaw))
            widest = max(widest, span_x)
            tallest = max(tallest, height * math.cos(elevation) + span_y * math.sin(elevation))
        return widest, tallest

    elevation_deg = 18.0
    widest, tallest = projected(elevation_deg)
    if tallest < 0.45 * widest:
        # A broad flat asset such as the ground reads better from above.
        elevation_deg = 52.0
        widest, tallest = projected(elevation_deg)
    panel = max(widest * 1.14, tallest * 1.16)
    elevation = math.radians(elevation_deg)

    copies = []
    for index, yaw_deg in enumerate(PREVIEW_YAW_DEG):
        if index == 0:
            panel_obj = obj
        else:
            panel_obj = obj.copy()
            bpy.context.scene.collection.objects.link(panel_obj)
            copies.append(panel_obj)
        panel_obj.rotation_euler = (0.0, 0.0, math.radians(yaw_deg))
        panel_obj.location = (
            (index - 1) * panel - 0.5 * (low[0] + high[0]),
            -0.5 * (low[1] + high[1]),
            0.0,
        )

    backdrop_mesh = bpy.data.meshes.new("PreviewBackdrop")
    reach = 6.0 * panel
    backdrop_mesh.from_pydata(
        [(-reach, -reach, 0.0), (reach, -reach, 0.0), (reach, reach, 0.0), (-reach, reach, 0.0)],
        [],
        [[0, 1, 2, 3]],
    )
    backdrop_mesh.update()
    backdrop_material = bpy.data.materials.new("PreviewBackdropMaterial")
    if backdrop_material.node_tree is None:
        backdrop_material.use_nodes = True
    backdrop_bsdf = backdrop_material.node_tree.nodes.get("Principled BSDF")
    if backdrop_bsdf is not None:
        backdrop_bsdf.inputs["Base Color"].default_value = (0.46, 0.47, 0.48, 1.0)
        backdrop_bsdf.inputs["Roughness"].default_value = 0.92
    backdrop_mesh.materials.append(backdrop_material)
    backdrop = bpy.data.objects.new("PreviewBackdrop", backdrop_mesh)
    backdrop.location = (0.0, 0.0, -0.004 * panel - 0.01)
    bpy.context.scene.collection.objects.link(backdrop)

    target = Vector((0.0, 0.0, 0.52 * height))
    lens = 85.0
    sensor = 36.0
    half_fov = math.atan(0.5 * sensor / lens)
    distance = 1.5 * panel / math.tan(half_fov)
    camera_data = bpy.data.cameras.new("PreviewCamera")
    camera_data.lens = lens
    camera_data.sensor_width = sensor
    camera_data.clip_end = max(1000.0, distance * 4.0)
    camera = bpy.data.objects.new("PreviewCamera", camera_data)
    camera.location = target + Vector(
        (0.0, distance * math.cos(elevation), distance * math.sin(elevation))
    )
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.collection.objects.link(camera)
    bpy.context.scene.camera = camera

    sun_data = bpy.data.lights.new("PreviewSun", type="SUN")
    sun_data.energy = 2.5
    sun_data.angle = math.radians(3.0)
    sun_data.color = (1.0, 0.96, 0.89)
    sun = bpy.data.objects.new("PreviewSun", sun_data)
    sun.location = (panel, panel * 1.6, panel * 2.4)
    sun.rotation_euler = (math.radians(50.0), math.radians(10.0), math.radians(145.0))
    bpy.context.scene.collection.objects.link(sun)

    fill_data = bpy.data.lights.new("PreviewFill", type="SUN")
    fill_data.energy = 0.6
    fill_data.color = (0.82, 0.88, 1.0)
    fill = bpy.data.objects.new("PreviewFill", fill_data)
    fill.rotation_euler = (math.radians(70.0), 0.0, math.radians(-40.0))
    bpy.context.scene.collection.objects.link(fill)

    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        path.unlink()
    bpy.context.scene.render.filepath = str(path)
    result = bpy.ops.render.render(write_still=True)
    if "FINISHED" not in result:
        raise BuildError(f"{name}: rendering the preview returned {result} instead of FINISHED")
    if not path.exists() or path.stat().st_size == 0:
        raise BuildError(f"{name}: the preview render wrote no bytes to {path}")

    for item in copies + [backdrop, camera, sun, fill]:
        bpy.data.objects.remove(item, do_unlink=True)
    bpy.data.meshes.remove(backdrop_mesh, do_unlink=True)
    bpy.data.materials.remove(backdrop_material, do_unlink=True)
    bpy.data.cameras.remove(camera_data, do_unlink=True)
    bpy.data.lights.remove(sun_data, do_unlink=True)
    bpy.data.lights.remove(fill_data, do_unlink=True)
    obj.rotation_euler = (0.0, 0.0, 0.0)
    obj.location = (0.0, 0.0, 0.0)


# ---------------------------------------------------------------------------
# main
# ---------------------------------------------------------------------------
def main() -> int:
    options = parse_args(list(sys.argv))
    blender_version = check_blender_version()
    out_dir = Path(str(options["out"])).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    preview_dir = (
        Path(str(options["preview_dir"])).resolve() if options["preview_dir"] else None
    )
    export_options = gltf_export_options()

    wipe_scene()
    if options["previews"]:
        setup_render()

    inventory: dict[str, object] = {}
    for name in assets.ASSET_ORDER:
        data = assets.build(name)
        materials = make_materials()
        obj = build_object(name, data, materials)
        if len(bpy.data.objects) != 1:
            raise BuildError(
                f"{name}: the scene holds {len(bpy.data.objects)} objects "
                f"({', '.join(sorted(o.name for o in bpy.data.objects))}); exactly one is exported"
            )
        info = measure(obj)
        digest, byte_count = export_glb(name, out_dir / f"{name}.glb", export_options)
        info["file"] = f"{name}.glb"
        info["sha256"] = digest
        info["bytes"] = byte_count
        inventory[name] = info
        print(
            f"[asset] {name:14s} tris={info['triangles']:6d} "
            f"footprint={info['footprint_m'][0]:.3f}x{info['footprint_m'][1]:.3f} m "
            f"height={info['height_m']:.3f} m bytes={byte_count} materials={len(info['materials'])}",
            flush=True,
        )
        if options["previews"]:
            if preview_dir is None:
                raise BuildError("--previews needs --preview-dir <directory>")
            render_preview(name, obj, info, preview_dir / f"{name}.png")
            print(f"[preview] {name} -> {preview_dir / f'{name}.png'}", flush=True)
        wipe_scene()

    document = {
        "schema_version": 1,
        "generator": "tools/blender/build_assets.py",
        "blender_version": blender_version,
        "units": "metres",
        "axis": "Z up, +Y front, origin at footprint centre with the lowest point at Z=0",
        "materials": {
            name: {
                "base_color": list(assets.MATERIALS[name]["base_color"]),
                "roughness": assets.MATERIALS[name]["roughness"],
                "metallic": assets.MATERIALS[name]["metallic"],
            }
            for name in sorted(assets.MATERIALS)
        },
        "assets": inventory,
    }
    text = json.dumps(document, indent=2, sort_keys=True) + "\n"
    (out_dir / "inventory.json").write_text(text, encoding="utf-8", newline="\n")
    print(f"[inventory] {out_dir / 'inventory.json'} ({len(inventory)} assets)", flush=True)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except BuildError as error:
        print(f"ERROR: {error}", file=sys.stderr, flush=True)
        sys.stdout.flush()
        os._exit(2)
