"""Small project toolset. Calls are dispatched by native MCP on the editor thread."""
import hashlib
import json
from pathlib import Path
import re
import struct

import unreal
import toolset_registry
from toolset_registry.registration import Registration


PROJECT = Path(unreal.Paths.project_dir()).resolve()
MAP = "/Game/Maps/Shibuya"


def _actors():
    return unreal.get_editor_subsystem(unreal.EditorActorSubsystem)


def _vector(value):
    return [value.x, value.y, value.z]


def _material_bindings(mesh):
    result = []
    for index, slot in enumerate(mesh.static_materials):
        material = slot.material_interface
        result.append({"slot": index, "material": material.get_path_name() if material else None,
                       "textures": [texture.get_path_name() for texture in unreal.MaterialEditingLibrary.get_material_used_textures(material)] if material else []})
    return result


def _exposure():
    settings = unreal.PostProcessSettings()
    settings.override_auto_exposure_method = True
    settings.auto_exposure_method = unreal.AutoExposureMethod.AEM_MANUAL
    settings.override_auto_exposure_apply_physical_camera_exposure = True
    settings.auto_exposure_apply_physical_camera_exposure = False
    settings.override_auto_exposure_bias = True
    settings.auto_exposure_bias = 0.0
    return settings


def _daylight():
    actors = _actors().get_all_level_actors()
    for actor in actors:
        if isinstance(actor, unreal.DirectionalLight):
            actor.light_component.set_mobility(unreal.ComponentMobility.MOVABLE)
            actor.light_component.set_intensity(8.0)
        if isinstance(actor, unreal.SkyLight):
            actor.light_component.set_mobility(unreal.ComponentMobility.MOVABLE)
            actor.light_component.set_editor_property("source_type", unreal.SkyLightSourceType.SLS_SPECIFIED_CUBEMAP)
            actor.light_component.set_editor_property("cubemap", unreal.load_asset("/Engine/MapTemplates/Sky/DaylightAmbientCubemap.DaylightAmbientCubemap"))
            actor.light_component.set_intensity(1.5)
            actor.light_component.recapture_sky()
    volume = next((actor for actor in actors if actor.get_actor_label() == "Shibuya_Exposure"), None)
    if not volume:
        volume = _actors().spawn_actor_from_class(unreal.PostProcessVolume, unreal.Vector(0, 0, 0))
        volume.set_actor_label("Shibuya_Exposure")
    volume.set_editor_property("unbound", True)
    volume.set_editor_property("settings", _exposure())


def _snapshot():
    actors = _actors().get_all_level_actors()
    meshes = [actor for actor in actors if isinstance(actor, unreal.StaticMeshActor)]
    unique_meshes = {actor.static_mesh_component.static_mesh.get_path_name(): actor.static_mesh_component.static_mesh for actor in meshes if actor.static_mesh_component.static_mesh}
    city_assets = [unreal.load_asset(path) for path in unreal.EditorAssetLibrary.list_assets("/Game/City", recursive=True, include_folder=False)]
    return {
        "engine_version": unreal.SystemLibrary.get_engine_version(),
        "map": unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).get_current_level().get_outermost().get_name(),
        "actor_count": len(actors),
        "static_mesh_actor_count": len(meshes),
        "unique_static_mesh_count": len(unique_meshes),
        "nanite_enabled_mesh_count": sum(mesh.get_editor_property("nanite_settings").get_editor_property("enabled") for mesh in unique_meshes.values()),
        "nanite_input_vertices": sum(mesh.get_num_nanite_vertices() for mesh in unique_meshes.values()),
        "nanite_input_triangles": sum(mesh.get_num_nanite_triangles() for mesh in unique_meshes.values()),
        "lod0_vertices": sum(mesh.get_num_vertices(0) for mesh in unique_meshes.values()),
        "lod0_triangles": sum(mesh.get_num_triangles(0) for mesh in unique_meshes.values()),
        "city_material_assets": [asset.get_path_name() for asset in city_assets if isinstance(asset, unreal.MaterialInterface)],
        "city_texture_assets": [asset.get_path_name() for asset in city_assets if isinstance(asset, unreal.Texture)],
        "static_mesh_actors": [
            {
                "label": actor.get_actor_label(),
                "asset": actor.static_mesh_component.static_mesh.get_path_name(),
                "location_cm": _vector(actor.get_actor_location()),
                "bounds_origin_cm": _vector(actor.get_actor_bounds(False)[0]),
                "bounds_extent_cm": _vector(actor.get_actor_bounds(False)[1]),
                "material_bindings": _material_bindings(actor.static_mesh_component.static_mesh),
            }
            for actor in meshes if actor.static_mesh_component.static_mesh
        ],
        "coordinate_frame": {"units": "centimetres", "x": "east", "y": "north", "z": "up"},
    }


def _local_file(value):
    path = (PROJECT / value).resolve()
    if not path.is_relative_to(PROJECT) or not path.is_file():
        raise RuntimeError(f"Cannot use {value!r}: provide an existing file inside this Unreal project.")
    return path


def _new_map():
    levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
    if unreal.EditorAssetLibrary.does_asset_exist(MAP):
        if not levels.load_level(MAP):
            raise RuntimeError(f"Cannot load {MAP}: the generated level could not be reopened.")
        for actor in _actors().get_all_level_actors():
            if actor.actor_has_tag("ShibuyaSource"):
                _actors().destroy_actor(actor)
        if not levels.save_current_level():
            raise RuntimeError(f"Cannot save {MAP}: the editor did not write the cleared generated geometry.")
        return
    if not levels.new_level(MAP):
        raise RuntimeError(f"Cannot create {MAP}: the editor refused to create the level.")
    sun = _actors().spawn_actor_from_class(unreal.DirectionalLight, unreal.Vector(0, 0, 30000))
    sun.set_actor_label("Shibuya_Sun")
    sun.set_actor_rotation(unreal.Rotator(-45, -30, 0), False)
    sun.light_component.set_editor_property("intensity", 8.0)
    sky = _actors().spawn_actor_from_class(unreal.SkyLight, unreal.Vector(0, 0, 0))
    sky.set_actor_label("Shibuya_SkyLight")
    sky.light_component.set_editor_property("intensity", 1.0)
    atmosphere = _actors().spawn_actor_from_class(unreal.SkyAtmosphere, unreal.Vector(0, 0, 0))
    atmosphere.set_actor_label("Shibuya_Atmosphere")
    if not levels.save_current_level():
        raise RuntimeError(f"Cannot save {MAP}: the editor did not write the level.")


def _glb_image_count(path):
    with path.open("rb") as source:
        header = source.read(20)
        if len(header) != 20 or struct.unpack_from("<I", header)[0] != 0x46546C67:
            raise RuntimeError(f"Cannot import {path.name}: expected a glTF binary file.")
        metadata = json.loads(source.read(struct.unpack_from("<I", header, 12)[0]))
    return len(metadata.get("images", []))


def _import_glb(path, destination, require_textures=True):
    task = unreal.AssetImportTask()
    task.filename = str(path)
    task.destination_path = destination
    task.automated = True
    task.replace_existing = True
    task.save = True
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
    assets = [unreal.load_asset(name) for name in task.imported_object_paths]
    meshes = [asset for asset in assets if isinstance(asset, unreal.StaticMesh)]
    if not meshes:
        # Interchange reports assets through the registry on some import paths.
        paths = unreal.EditorAssetLibrary.list_assets(destination, recursive=True, include_folder=False)
        meshes = [asset for name in paths if isinstance(asset := unreal.load_asset(name), unreal.StaticMesh)]
    if not meshes:
        raise RuntimeError(f"Cannot import {path.name}: Interchange produced no static meshes in {destination}.")
    expected_images = _glb_image_count(path)
    paths = unreal.EditorAssetLibrary.list_assets(destination, recursive=True, include_folder=False)
    textures = [asset for name in paths if isinstance(asset := unreal.load_asset(name), unreal.Texture)]
    if require_textures and len(textures) < expected_images:
        raise RuntimeError(f"Cannot import {path.name}: source has {expected_images} images but Unreal imported {len(textures)} textures. Provide native JPEG/PNG glTF images and core textures.source references.")
    if require_textures and expected_images:
        world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
        unreal.SystemLibrary.execute_console_command(world, "Editor.AsyncAssetCompilationFinishAll")
        bound = {texture for mesh in meshes for binding in _material_bindings(mesh) for texture in binding["textures"] if texture.startswith(destination)}
        if len(bound) < expected_images:
            raise RuntimeError(f"Cannot import {path.name}: {len(textures)} textures exist but only {len(bound)} source textures are bound to mesh materials; expected at least {expected_images}.")
    return meshes


@unreal.uclass()
class ShibuyaCityTools(unreal.ToolsetDefinition):
    """Build and inspect the fresh Shibuya crop in Unreal Engine centimetres."""

    @toolset_registry.tool_call
    @staticmethod
    def inspect_scene() -> str:
        """Return the actual loaded map, mesh actor counts and bounds in centimetres."""
        return json.dumps(_snapshot())

    @toolset_registry.tool_call
    @staticmethod
    def create_probe_map(probe_name: str) -> str:
        """Create a separate validation level without clearing or saving the built city.

        Args:
            probe_name: Unique Probe_ name containing letters, digits and underscores.
        """
        if not re.fullmatch(r"Probe_[A-Za-z0-9_]{1,60}", probe_name):
            raise RuntimeError(f"Cannot create {probe_name!r}: use a unique Probe_ name with letters, digits and underscores.")
        path = f"/Game/Validation/{probe_name}"
        levels = unreal.get_editor_subsystem(unreal.LevelEditorSubsystem)
        if unreal.EditorAssetLibrary.does_asset_exist(path) or not levels.new_level(path):
            raise RuntimeError(f"Cannot create {path}: choose a fresh validation level name.")
        if not levels.save_current_level():
            raise RuntimeError(f"Cannot save {path}: the validation level was not written.")
        return json.dumps(_snapshot())

    @toolset_registry.tool_call
    @staticmethod
    def load_city_map() -> str:
        """Reopen the saved city for inspection without clearing actors or saving the map."""
        if not unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).load_level(MAP):
            raise RuntimeError(f"Cannot load {MAP}: build the city map before inspecting it.")
        return json.dumps(_snapshot())

    @toolset_registry.tool_call
    @staticmethod
    def import_axis_probe(relative_glb: str) -> str:
        """Import a project-local glTF axis fixture and return its measured Unreal bounds.

        Args:
            relative_glb: Path inside the project to the asymmetric metre-scale fixture.
        """
        meshes = _import_glb(_local_file(relative_glb), "/Game/Validation/AxisProbe")
        result = []
        for mesh in meshes:
            bounds = mesh.get_bounds()
            result.append({"asset": mesh.get_path_name(), "origin_cm": _vector(bounds.origin), "extent_cm": _vector(bounds.box_extent)})
        return json.dumps({"meshes": result})

    @toolset_registry.tool_call
    @staticmethod
    def build_city(relative_manifest: str) -> str:
        """Import fresh, cropped, local GLBs and save the real source geometry in Shibuya.

        Args:
            relative_manifest: Project-local JSON containing glbs with path and sha256 fields.
        """
        manifest_path = _local_file(relative_manifest)
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        inputs = manifest.get("glbs", [])
        if not inputs:
            raise RuntimeError(f"Cannot build {relative_manifest!r}: manifest needs a non-empty glbs array.")
        checked = []
        for entry in inputs:
            path = _local_file(entry["path"])
            with path.open("rb") as source:
                digest = hashlib.file_digest(source, "sha256").hexdigest()
            if digest != entry["sha256"]:
                raise RuntimeError(f"Cannot import {entry['path']!r}: SHA-256 changed; regenerate or restore the reviewed manifest.")
            checked.append((entry, path))
        _new_map()
        if unreal.EditorAssetLibrary.does_directory_exist("/Game/City"):
            if not unreal.EditorAssetLibrary.delete_directory("/Game/City"):
                raise RuntimeError("Cannot replace generated /Game/City assets: Unreal refused their deletion after clearing source actors.")
        imports = []
        for index, (entry, path) in enumerate(checked):
            destination = f"/Game/City/Tile_{index:03d}"
            meshes = _import_glb(path, destination)
            for mesh in meshes:
                actor = _actors().spawn_actor_from_object(mesh, unreal.Vector(0, 0, 0))
                if not actor:
                    raise RuntimeError(f"Cannot place {mesh.get_path_name()}: static mesh actor creation failed.")
                actor.set_actor_label(f"City_{index:03d}_{mesh.get_name()}")
                actor.tags = ["ShibuyaSource"]
            imports.append({"source": entry["path"], "sha256": entry["sha256"], "mesh_count": len(meshes)})
        unreal.EditorAssetLibrary.save_directory("/Game/City", only_if_is_dirty=False, recursive=True)
        _daylight()
        if not unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).save_current_level():
            raise RuntimeError("Cannot save Shibuya: imported city map was not written.")
        result = _snapshot()
        result["imports"] = imports
        result["manifest_sha256"] = hashlib.sha256(manifest_path.read_bytes()).hexdigest()
        result["source_geometry_only"] = True
        return json.dumps(result)

    @toolset_registry.tool_call
    @staticmethod
    def configure_daylight() -> str:
        """Save fixed exposure and a built-in daylight cubemap so shadow facades remain readable."""
        _daylight()
        if not unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).save_current_level():
            raise RuntimeError("Cannot save Shibuya: daylight setup was not written.")
        return json.dumps(_snapshot())

    @toolset_registry.tool_call
    @staticmethod
    def capture_view(relative_output: str, east_m: float, north_m: float, height_m: float, target_east_m: float = 0.0, target_north_m: float = 0.0, target_height_m: float = 15.0) -> str:
        """Capture one fixed viewpoint through Unreal's native renderer into a PNG.

        Args:
            relative_output: PNG output path below artifacts/unreal inside this project.
            east_m: Camera east coordinate in metres.
            north_m: Camera north coordinate in metres.
            height_m: Camera up coordinate in metres.
            target_east_m: Look-at east coordinate in metres.
            target_north_m: Look-at north coordinate in metres.
            target_height_m: Look-at up coordinate in metres.
        """
        output = (PROJECT / relative_output).resolve()
        if not output.is_relative_to(PROJECT / "artifacts/unreal") or output.suffix != ".png":
            raise RuntimeError(f"Cannot capture {relative_output!r}: use a .png path below artifacts/unreal.")
        output.parent.mkdir(parents=True, exist_ok=True)
        world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
        unreal.SystemLibrary.execute_console_command(world, "Editor.AsyncAssetCompilationFinishAll")
        for light in _actors().get_all_level_actors():
            if isinstance(light, unreal.SkyLight):
                light.light_component.recapture_sky()
        location = unreal.Vector(east_m * 100, north_m * 100, height_m * 100)
        target = unreal.Vector(target_east_m * 100, target_north_m * 100, target_height_m * 100)
        actor = _actors().spawn_actor_from_class(unreal.SceneCapture2D, location)
        try:
            actor.set_actor_rotation(unreal.MathLibrary.find_look_at_rotation(location, target), False)
            component = actor.capture_component2d
            texture = unreal.RenderingLibrary.create_render_target2d(world, 1280, 720, unreal.TextureRenderTargetFormat.RTF_RGBA8)
            component.texture_target = texture
            component.capture_source = unreal.SceneCaptureSource.SCS_FINAL_COLOR_LDR
            component.capture_every_frame = False
            component.capture_on_movement = False
            component.fov_angle = 60.0
            component.set_editor_property("post_process_settings", _exposure())
            component.capture_scene()
            unreal.RenderingLibrary.export_render_target(world, texture, str(output.parent), output.name)
            if not output.is_file() or output.stat().st_size == 0:
                raise RuntimeError(f"Cannot capture {relative_output!r}: Unreal did not export the render target.")
            return json.dumps({"path": output.relative_to(PROJECT).as_posix(), "sha256": hashlib.sha256(output.read_bytes()).hexdigest(), "width": 1280, "height": 720, "camera_m": [east_m, north_m, height_m], "target_m": [target_east_m, target_north_m, target_height_m]})
        finally:
            _actors().destroy_actor(actor)

    @toolset_registry.tool_call
    @staticmethod
    def shutdown_editor() -> str:
        """Request a graceful exit of this task-owned editor after the runner saved its map."""
        unreal.SystemLibrary.quit_editor()
        return "Graceful editor exit requested."


_registration = Registration([ShibuyaCityTools])


def register():
    if not _registration.register():
        raise RuntimeError("Cannot register ShibuyaCityTools: enable the native ToolsetRegistry plugin.")
    unreal.log("ShibuyaCityTools registered with the native Unreal MCP registry.")
