"""Offline checks of the actual native MCP envelopes observed on Unreal 5.8.3."""
import ast
import copy
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
import re
import stat
import struct
import tempfile
import time
from types import SimpleNamespace
import unittest
from unittest.mock import patch
import zlib

import mcp_run
from mcp_run import UnrealMcp, png_darkness_metrics, scene_identity, score_capture, tool_value, verify_native_renderer, verify_lumen_scene


def constant_png(path, value, width=32, height=32):
    def chunk(kind, payload):
        return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xffffffff)
    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    raw = (b"\x00" + bytes([value, value, value]) * width) * height
    path.write_bytes(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b""))


def capture_state(camera=(35, -45, 35), target=(0, 0, 15), frames=1):
    direction = [b - a for a, b in zip(camera, target)]
    length = math.sqrt(sum(value * value for value in direction))
    forward = [value / length for value in direction]
    return {"started": True, "persistent_state": True, "render_target_matches_capture": True, "full_crop_coverage": False,
            "lumen_gi_override": True, "lumen_reflections_override": True,
            "lumen_gi": "<DynamicGlobalIlluminationMethod.LUMEN: 1>",
            "lumen_reflections": "<ReflectionMethod.LUMEN: 1>",
            "capture_source": "<SceneCaptureSource.SCS_FINAL_COLOR_LDR: 2>",
            "render_target_format": "<TextureRenderTargetFormat.RTF_RGBA8: 2>",
            "target_gamma": 2.200000047683716, "post_process_blend_weight": 1.0,
            "width": 1280, "height": 720, "actual_camera_cm": [value * 100 for value in camera],
            "actual_component_cm": [value * 100 for value in camera],
            "forward_vector": forward, "component_forward_vector": list(forward),
            "capture_component": "/Game/Maps/Test.PersistentLevel.Capture.Component",
            "native_capture_flags": {"component": "/Game/Maps/Test.PersistentLevel.Capture.Component",
                                     "requests_persistent_state": True, "captures_every_frame": False,
                                     "gi_flag": True, "lumen_gi_flag": True, "sky_lighting_flag": True, "lighting_flag": True},
            "capture_frames": frames, "native_start_frame": 100,
            "native_current_frame": 100 if frames == 1 else 100 + frames * 2,
            "native_frames_elapsed": 0 if frames == 1 else frames * 2}


class CaptureAdmissionTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.project = Path(self.directory.name)
        self.addCleanup(patch.stopall)
        patch.object(mcp_run, "PROJECT", self.project).start()
        self.relative = "artifacts/unreal/fresh/crossing.png"
        self.started_ns = time.time_ns()
        self.readiness, self.warmup, self.final = [capture_state(frames=value) for value in (1, 60, 80)]
        for state, relative in ((self.warmup, self.relative.replace(".png", "-warmup.png")), (self.final, self.relative)):
            path = self.project / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            constant_png(path, 80, 1280, 720)
            state.update(path=relative, sha256=hashlib.sha256(path.read_bytes()).hexdigest(), native_pixel_prefix_unchanged=True)

    def score(self, readiness=None, warmup=None, final=None):
        return score_capture(self.readiness if readiness is None else readiness,
                             self.warmup if warmup is None else warmup,
                             self.final if final is None else final,
                             [35, -45, 35], [0, 0, 15], 2.2, self.relative, self.started_ns)

    def test_complete_capture_is_admitted_and_dark_pixels_still_fail(self):
        admitted = self.score()
        self.assertTrue(admitted["readiness_verified"])
        self.assertTrue(admitted["pixel_metrics"]["passed"])
        path = self.project / self.relative
        constant_png(path, 0, 1280, 720)
        self.final["sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
        dark = self.score()
        self.assertTrue(dark["readiness_verified"])
        self.assertFalse(dark["pixel_metrics"]["passed"])

    def test_missing_false_or_wrong_native_witnesses_never_reach_brightness_scoring(self):
        mutations = [{}, {"started": False}, {"persistent_state": False}, {"render_target_matches_capture": False},
                     {"lumen_gi_override": False}, {"lumen_reflections_override": False},
                     {"lumen_gi": "NONE"}, {"lumen_reflections": "NONE"}, {"native_capture_flags": {}},
                     {"capture_source": "HDR"}, {"render_target_format": "RGBA32F"}, {"target_gamma": 1.0},
                     {"target_gamma": float("nan")}, {"post_process_blend_weight": 0.0},
                     {"width": 640}, {"actual_camera_cm": [3500, -4400, 3500]},
                     {"actual_component_cm": [3500, -4500, 3600]}, {"forward_vector": [1, 0, 0]},
                     {"component_forward_vector": [float("nan"), 0, 0]},
                     {"capture_frames": 0}, {"native_start_frame": -1}, {"native_current_frame": 99}]
        for mutation in mutations:
            with self.subTest(mutation=mutation):
                state = copy.deepcopy(self.readiness)
                state = {} if not mutation else {**state, **mutation}
                with patch.object(mcp_run, "png_darkness_metrics", side_effect=AssertionError("scoring must not run")):
                    with self.assertRaises(RuntimeError):
                        self.score(readiness=state)
        for field in ("gi_flag", "lumen_gi_flag", "sky_lighting_flag", "lighting_flag", "requests_persistent_state"):
            state = copy.deepcopy(self.readiness)
            state["native_capture_flags"][field] = False
            with self.subTest(flag=field), self.assertRaises(RuntimeError):
                self.score(readiness=state)

    def test_export_state_is_checked_again_and_native_frames_must_advance(self):
        for arm, mutation in (("warmup", {"capture_frames": 59}), ("final", {"capture_frames": 79}),
                              ("final", {"persistent_state": False}), ("final", {"render_target_format": "RGBA32F"}),
                              ("final", {"actual_camera_cm": [0, 0, 0]}),
                              ("final", {"native_start_frame": 101, "native_current_frame": 261}),
                              ("final", {"native_frames_elapsed": 0, "native_current_frame": 100}),
                              ("final", {"native_frames_elapsed": 120, "native_current_frame": 220})):
            state = {**copy.deepcopy(getattr(self, arm)), **mutation}
            with self.subTest(arm=arm, mutation=mutation), self.assertRaises(RuntimeError):
                self.score(**{arm: state})

    def test_wrong_paths_hashes_missing_or_stale_files_cannot_pass(self):
        for arm in ("warmup", "final"):
            state = copy.deepcopy(getattr(self, arm))
            for mutation in ({"path": "artifacts/unreal/old/crossing.png"}, {"sha256": "0" * 64}, {"native_pixel_prefix_unchanged": False}):
                with self.subTest(arm=arm, mutation=mutation), self.assertRaises(RuntimeError):
                    self.score(**{arm: {**state, **mutation}})
            path = self.project / state["path"]
            original = path.read_bytes()
            path.unlink()
            with self.assertRaisesRegex(RuntimeError, "absent or predates"):
                self.score()
            path.write_bytes(original)
            os.utime(path, ns=(1, 1))
            with self.assertRaisesRegex(RuntimeError, "absent or predates"):
                self.score()
            os.utime(path, ns=(time.time_ns(), time.time_ns()))

    def test_only_the_complete_validated_native_prefix_population_is_scored(self):
        path = self.project / self.relative
        for width, height, tail in ((32, 32, b""), (1280, 720, b"spare native allocation")):
            constant_png(path, 80, width, height)
            path.write_bytes(path.read_bytes() + tail)
            self.final["sha256"] = hashlib.sha256(path.read_bytes()).hexdigest()
            with self.subTest(dimensions=(width, height), tail=tail), self.assertRaisesRegex(RuntimeError, "complete1280x720"):
                self.score()


def helper_function(name, namespace):
    """Compile the authored helper boundary without importing an unavailable Unreal runtime."""
    default = Path(__file__).resolve().parents[2] / "Content/Python/shibuya_tools.py"
    source = Path(os.environ.get("SHIBUYA_HELPER_CONTROL_PATH", default))
    tree = ast.parse(source.read_text(encoding="utf-8"))
    functions = [node for node in tree.body if isinstance(node, ast.FunctionDef)]
    functions += [node for item in tree.body if isinstance(item, ast.ClassDef) for node in item.body if isinstance(node, ast.FunctionDef)]
    wanted = next(node for node in functions if node.name == name)
    wanted.decorator_list = []
    exec(compile(ast.Module(body=[wanted], type_ignores=[]), str(source), "exec"), namespace)
    return namespace[name]


class PhotoRoadSaveTests(unittest.TestCase):
    def exercise_helper(self, save_result):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        project = Path(directory.name)
        class Material:
            def get_path_name(self):
                return "/Game/Surface/TerrainPhoto/OfficialPhoto.OfficialPhoto"
        shared = Material()
        texture = SimpleNamespace(get_path_name=lambda: "/Game/Surface/TerrainPhoto/Atlas.Atlas")
        class Mesh:
            def __init__(self, path, material=None):
                self.path = path
                self.static_materials = [SimpleNamespace(material_interface=material)]
            def get_path_name(self):
                return self.path
            def set_editor_property(self, name, value):
                setattr(self, name, value)
        class Actor:
            def __init__(self, label, mesh):
                self.label = label
                self.static_mesh_component = SimpleNamespace(static_mesh=mesh)
                self.static_mesh_component.set_static_mesh = lambda mesh: setattr(self.static_mesh_component, "static_mesh", mesh)
            def get_actor_label(self):
                return self.label
            def actor_has_tag(self, _tag):
                return True
            def get_actor_bounds(self, _collision):
                return (SimpleNamespace(x=1, y=2, z=3), SimpleNamespace(x=4, y=5, z=6))
        actors, outputs, base, imported, saved = [], [], [], [], []
        for index in range(25):
            original = f"data/prepared/road-{index}.glb"
            generated = f"data/prepared/surface/road-{index}.glb"
            for relative in (original, generated):
                file = project / relative
                file.parent.mkdir(parents=True, exist_ok=True)
                file.write_bytes(f"geometry-{index}".encode())
            digest = hashlib.sha256((project / original).read_bytes()).hexdigest()
            base.append({"path": original})
            outputs.append({"original": {"path": original, "sha256": digest}, "generated": {"path": generated, "sha256": digest}})
            actors.append(Actor(f"City_{index:03}_road-{index}", Mesh(f"/Game/City/Road{index}")))
        original_meshes = [actor.static_mesh_component.static_mesh for actor in actors]
        terrain = Actor("City_069_terrain", Mesh("/Game/Surface/TerrainPhoto/Terrain.Terrain", shared))
        actors.append(terrain)
        base_path = project / "data/prepared/manifest.json"
        base_path.write_text(json.dumps({"glbs": base}), encoding="utf-8")
        atlas_path = project / "data/prepared/surface/atlas.png"
        atlas_path.write_bytes(b"admitted source photo fixture")
        metadata = {"base_manifest_sha256": hashlib.sha256(base_path.read_bytes()).hexdigest(), "shared_atlas": {"path": atlas_path.relative_to(project).as_posix(), "sha256": hashlib.sha256(atlas_path.read_bytes()).hexdigest()}, "outputs": outputs}
        manifest = project / "data/prepared/surface/road-manifest.json"
        manifest.write_text(json.dumps(metadata), encoding="utf-8")
        def import_glb(_path, destination):
            mesh = Mesh(destination + "/Road.Road")
            imported.append(mesh)
            return [mesh]
        def save(mesh):
            saved.append(mesh)
            return save_result
        unreal_stub = SimpleNamespace(StaticMeshActor=Actor,
            EditorAssetLibrary=SimpleNamespace(save_loaded_asset=save), LevelEditorSubsystem=object(),
            get_editor_subsystem=lambda _: SimpleNamespace(save_current_level=lambda: True),
            MaterialEditingLibrary=SimpleNamespace(get_material_used_textures=lambda material: [texture] if material is shared else []))
        namespace = {"PROJECT": project, "json": json, "hashlib": hashlib, "unreal": unreal_stub, "re": re, "stat": stat,
                     "_support_update": None, "_support_completed": None,
                     "_prepare_nanite_material": lambda material: {"bound": "covered separately by actual Nanite material boundary tests"},
                     "_actors": lambda: SimpleNamespace(get_all_level_actors=lambda: actors),
                     "_import_glb": import_glb, "_glb_geometry": lambda path: path.read_bytes(),
                     "_source_actor_state": lambda excluded: {"unaffected": True}}
        for name in ("_local_file", "_vector", "_material_bindings"):
            helper_function(name, namespace)
        function = helper_function("apply_photo_roads", namespace)
        return function, manifest.relative_to(project).as_posix(), actors, original_meshes, imported, saved, shared

    def test_apply_photo_roads_refuses_failed_asset_save(self):
        function, manifest, actors, original, imported, saved, _shared = self.exercise_helper(False)
        with self.assertRaisesRegex(RuntimeError, r"did not save shared-atlas.*?/Game/Surface/Roads/Tile_000/Road.Road"):
            function(manifest)
        self.assertEqual(len(saved), 1)
        self.assertEqual(len(imported), 1)
        self.assertEqual([actor.static_mesh_component.static_mesh for actor in actors[:25]], original)

    def test_apply_photo_roads_reports_success_only_after_all25_saves(self):
        function, manifest, actors, _original, imported, saved, shared = self.exercise_helper(True)
        result = json.loads(function(manifest))
        self.assertEqual(len(saved), 25)
        self.assertEqual(len(result["roads"]), 25)
        self.assertEqual([actor.static_mesh_component.static_mesh for actor in actors[:25]], imported)
        self.assertTrue(all(mesh.static_materials[0].material_interface is shared for mesh in saved))


class NativeMcpContractTests(unittest.TestCase):
    def test_populated_actual_lumen_scene_is_required_before_scoring(self):
        native = 'LogRenderer: *** LumenScene Stats ***\nLogRenderer: Mesh SDF Objects: 112\nLogRenderer: Mesh cards: 25\nLogRenderer: Cards: 150\n'
        self.assertEqual(verify_lumen_scene(native)["cards"], 150)
        for invalid in ("", "asset card count: 654", native.replace("Mesh cards: 25", "Mesh cards: 0"), native.replace("Cards: 150", "Cards: 0"), native.split("Mesh SDF Objects")[0]):
            with self.subTest(log=invalid), self.assertRaisesRegex(RuntimeError, "Cannot score native capture"):
                verify_lumen_scene(invalid)

    def test_native_renderer_must_observe_sm6_not_only_capable_hardware(self):
        native = 'LogRHI: Using Highest Feature Level of D3D12: SM6\nLogCsvProfiler: Metadata set : rhifeaturelevel="SM6"\nLogCsvProfiler: Metadata set : shaderplatform="PCD3D_SM6"\n'
        self.assertEqual(verify_native_renderer(native)["shader_platform"], "PCD3D_SM6")
        for invalid in ("", 'Max supported shader model6.7; D3D12 requested', native.replace("SM6", "SM5"), native.replace('shaderplatform="PCD3D_SM6"', 'shaderplatform="PCD3D_SM5"'), native.splitlines()[0]):
            with self.subTest(log=invalid), self.assertRaisesRegex(RuntimeError, "actual D3D12 SM6"):
                verify_native_renderer(invalid)

    def test_dark_or_blown_out_images_cannot_pass_as_readable(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "pixels.png"
            for value in (0, 255):
                constant_png(path, value)
                self.assertFalse(png_darkness_metrics(path)["passed"])
            constant_png(path, 80)
            metrics = png_darkness_metrics(path)
            self.assertTrue(metrics["passed"])
            self.assertAlmostEqual(metrics["mean_luma"], 80)
            path.write_bytes(path.read_bytes() + b"native trailing bytes are not pixel chunks")
            with_trailer = png_darkness_metrics(path)
            for key in ("mean_luma", "median_luma", "black_fraction", "white_fraction", "pixel_population", "passed"):
                self.assertEqual(with_trailer[key], metrics[key])
            self.assertGreater(with_trailer["ignored_trailer_bytes"], 0)

    def test_missing_or_corrupt_pixels_are_measurement_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "pixels.png"
            path.write_bytes(b"not a PNG")
            with self.assertRaisesRegex(RuntimeError, "native PNG"):
                png_darkness_metrics(path)
            constant_png(path, 80)
            content = bytearray(path.read_bytes())
            content[-1] ^= 1
            path.write_bytes(content)
            with self.assertRaisesRegex(RuntimeError, "checksum failed"):
                png_darkness_metrics(path)

    def test_incomplete_or_hidden_native_pixel_payloads_are_rejected(self):
        def chunk(kind, payload):
            return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xffffffff)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "pixels.png"
            constant_png(path, 80)
            complete = path.read_bytes()
            path.write_bytes(complete[:-12])
            with self.assertRaisesRegex(RuntimeError, "IEND is missing"):
                png_darkness_metrics(path)
            path.write_bytes(complete[:-12] + chunk(b"IEND", b"invalid"))
            with self.assertRaisesRegex(RuntimeError, "IEND is not empty"):
                png_darkness_metrics(path)
            header = struct.pack(">IIBBBBB", 32, 32, 8, 6, 0, 0, 0)
            hidden = (b"\x00" + bytes([80, 80, 80, 0]) * 32) * 32
            path.write_bytes(complete[:8] + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(hidden)) + chunk(b"IEND", b""))
            with self.assertRaisesRegex(RuntimeError, "fully opaque"):
                png_darkness_metrics(path)
            visible = (b"\x00" + bytes([80, 80, 80, 255]) * 32) * 32
            for compressed in [zlib.compress(visible)[:-5], zlib.compress(visible) + zlib.compress(b"extra")]:
                path.write_bytes(complete[:8] + chunk(b"IHDR", header) + chunk(b"IDAT", compressed) + chunk(b"IEND", b""))
                with self.assertRaisesRegex(RuntimeError, "compressed pixel payload"):
                    png_darkness_metrics(path)

    def test_non_native_transparency_metadata_and_chunk_order_are_rejected(self):
        def chunk(kind, payload):
            return struct.pack(">I", len(payload)) + kind + payload + struct.pack(">I", zlib.crc32(kind + payload) & 0xffffffff)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "pixels.png"
            constant_png(path, 80)
            original = path.read_bytes()
            for extra in (chunk(b"tRNS", struct.pack(">HHH", 80, 80, 80)), chunk(b"FAKE", b"invalid")):
                path.write_bytes(original[:33] + extra + original[33:])
                with self.assertRaisesRegex(RuntimeError, "unexpected native PNG chunk"):
                    png_darkness_metrics(path)
            path.write_bytes(original[:33] + original[8:33] + original[33:])
            with self.assertRaisesRegex(RuntimeError, "one initial"):
                png_darkness_metrics(path)
            path.write_bytes(original[:8] + original[33:-12] + original[8:33] + original[-12:])
            with self.assertRaisesRegex(RuntimeError, "precede the image header"):
                png_darkness_metrics(path)

    def test_probe_identity_detects_actor_deletion_without_depending_on_rhi(self):
        before = {"map": "/Game/Maps/Shibuya", "static_mesh_actor_count": 1, "static_mesh_actors": [{"label": "City_000", "asset": "/Game/City/Mesh.Mesh", "location_cm": [0, 0, 0], "bounds_origin_cm": [10, 20, 30], "bounds_extent_cm": [10, 20, 30], "material_bindings": []}]}
        deleted = {"map": "/Game/Maps/Shibuya", "static_mesh_actor_count": 0, "static_mesh_actors": []}
        self.assertNotEqual(scene_identity(before), scene_identity(deleted))
        before["static_mesh_actors"][0]["material_bindings"] = [{"textures": ["/Game/City/Photo"]}]
        self.assertEqual(scene_identity(before)["static_mesh_actor_count"], 1)

    def test_native_return_value_envelope(self):
        # Captured from the project's real inspect_scene tool, not an assumed MCP shape.
        payload = {"returnValue": '{"engine_version":"5.8.3-58210709+++UE5+Release-5.8","static_mesh_actor_count":2}'}
        response = {"content": [{"type": "text", "text": json.dumps(payload)}]}
        self.assertEqual(tool_value(response)["static_mesh_actor_count"], 2)
        self.assertEqual(tool_value(response)["engine_version"], "5.8.3-58210709+++UE5+Release-5.8")

    def test_native_tool_failure_cannot_be_decoded_as_success(self):
        client = UnrealMcp(18758)
        client.request = lambda *_args, **_kwargs: {"isError": True, "content": [{"type": "text", "text": "source has 1 images but Unreal imported 0 textures"}]}
        with self.assertRaisesRegex(RuntimeError, "imported 0 textures"):
            client.project_tool("build_city")

    def test_mismatched_response_id_is_rejected(self):
        client = UnrealMcp(18758)
        client._send = lambda *_args, **_kwargs: {"jsonrpc": "2.0", "id": 99, "result": {"tools": []}}
        with self.assertRaisesRegex(RuntimeError, "no matching response"):
            client.request("tools/list")

    def test_protocol_error_is_rejected(self):
        client = UnrealMcp(18758)
        client._send = lambda *_args, **_kwargs: {"jsonrpc": "2.0", "id": 1, "error": {"code": -32601, "message": "Unknown method"}}
        with self.assertRaisesRegex(RuntimeError, "Unknown method"):
            client.request("unsupported_method")


if __name__ == "__main__":
    unittest.main()
