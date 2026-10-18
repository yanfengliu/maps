"""Pure import admission/path/ray/failure checks; Unreal execution is excluded."""
import ast
import copy
import hashlib
import json
import math
import os
from pathlib import Path
import re
import stat
import struct
import tempfile
import types
import unittest
from unittest.mock import patch


HELPER = Path(os.environ.get("SHIBUYA_SUPPORT_HELPER", Path(__file__).parents[2] / "Content/Python/shibuya_tools.py"))


def functions():
    tree = ast.parse(HELPER.read_text(encoding="utf-8"))
    wanted = {"_native_frame_record", "_require_native_frame", "_source_to_native_cm", "_native_to_source_m", "_source_normal_to_native", "_native_actor_tag", "_native_scene_frame", "_support_oriented_key", "_support_integer", "_support_identity", "_support_read", "_support_glb", "_admit_support_surface", "_support_check_hit", "_abort_support_update", "_require_complete_support", "_local_file"}
    body = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in wanted]
    tools = next(node for node in tree.body if isinstance(node, ast.ClassDef) and node.name == "ShibuyaCityTools")
    for node in tools.body:
        if isinstance(node, ast.FunctionDef) and node.name in {"configure_daylight", "apply_photo_terrain", "apply_photo_roads"}:
            node.decorator_list = []
            body.append(node)
    environment = dict(hashlib=hashlib, json=json, math=math, Path=Path, re=re, stat=stat, struct=struct, _support_update=None, _support_completed=None)
    exec(compile(ast.Module(body=body, type_ignores=[]), str(HELPER), "exec"), environment)
    environment["_native_scene_frame"] = lambda **kwargs: {"admitted":True}
    return environment


class AdmissionTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory(prefix="support-consumer-")
        self.addCleanup(self.folder.cleanup)
        self.root = Path(self.folder.name)
        self.data = self.root / "data"
        self.data.mkdir()
        self.file = self.data / "source.bin"
        self.file.write_bytes(b"actual source bytes")
        self.env = functions()
        self.env["PROJECT"] = self.root

    def record(self):
        payload = self.file.read_bytes()
        return {"path": "data/source.bin", "bytes": len(payload), "sha256": hashlib.sha256(payload).hexdigest()}

    def test_same_read_hash_admits_and_binds_actual_bytes(self):
        bindings = {}
        self.assertEqual(self.env["_support_read"](self.record(), bindings), b"actual source bytes")
        self.assertEqual(bindings["data/source.bin"], self.record())

    def test_changed_source_is_rejected(self):
        record = self.record()
        self.file.write_bytes(b"poison source bytes")
        with self.assertRaisesRegex(RuntimeError, "digest"):
            self.env["_support_read"](record, {})

    def test_missing_source_is_not_a_pass(self):
        record = self.record()
        self.file.unlink()
        with self.assertRaises(FileNotFoundError):
            self.env["_support_read"](record, {})

    def test_executing_code_path_is_not_a_data_snapshot(self):
        record = {**self.record(), "path": "tools/data/source.py"}
        with self.assertRaisesRegex(RuntimeError, "data path"):
            self.env["_support_read"](record, {})

    def test_traversal_is_rejected_even_when_it_resolves_inside_project(self):
        with self.assertRaises(RuntimeError):
            self.env["_local_file"]("data/../data/source.bin")

    def test_windows_relative_path_stays_valid(self):
        self.assertEqual(self.env["_local_file"]("data\\source.bin"), self.file)

    def test_reparse_ancestor_is_rejected_before_file_open(self):
        original = Path.lstat
        def observed(path):
            if path == self.data:
                return types.SimpleNamespace(st_mode=stat.S_IFDIR, st_file_attributes=stat.FILE_ATTRIBUTE_REPARSE_POINT)
            return original(path)
        with patch.object(Path, "lstat", observed), patch.object(Path, "read_bytes", side_effect=AssertionError("opened before ancestor admission")):
            with self.assertRaisesRegex(RuntimeError, "reparse"):
                self.env["_local_file"]("data/source.bin")

    def test_held_schema1_is_not_support_authority(self):
        manifest = self.data / "support.json"
        manifest.write_text(json.dumps({"schema_version": 1}), encoding="utf-8")
        with self.assertRaisesRegex(RuntimeError, "schema2"):
            self.env["_admit_support_surface"](manifest)

    def test_wrong_frame_is_rejected_before_source_import(self):
        manifest = self.data / "support.json"
        manifest.write_text(json.dumps({"schema_version": 2, "frame": {"glb": "centimetres"}}), encoding="utf-8")
        with self.assertRaisesRegex(RuntimeError, "frames"):
            self.env["_admit_support_surface"](manifest)

    def test_schema2_dispatch_uses_derived_branch(self):
        manifest = self.data / "support.json"
        manifest.write_text('{"schema_version":2}', encoding="utf-8")
        self.env["_prepare_support_terrain"] = lambda path: {"selected": str(path), "status": "pending-road-validation"}
        result = json.loads(self.env["apply_photo_terrain"]("data/support.json"))
        self.assertEqual(result["status"], "pending-road-validation")
        self.assertEqual(result["selected"], str(manifest))

    def test_oversized_dispatch_is_rejected_before_open_read_or_parse(self):
        manifest = self.data / "oversized-support.json"
        with manifest.open("wb") as stream:
            stream.write(b'{"schema_version":2,"padding":"')
            for _ in range(16):
                stream.write(b"x" * (1024 * 1024))
            stream.write(b'"}')
        self.assertGreater(manifest.stat().st_size, 16 * 1024 * 1024)
        self.env["_prepare_support_terrain"] = lambda path: self.fail("imported oversized dispatch")
        with patch.object(Path, "open", side_effect=AssertionError("opened oversized dispatch")) as opened, patch.object(Path, "read_text", side_effect=AssertionError("read oversized dispatch")) as read_text, patch.object(Path, "read_bytes", side_effect=AssertionError("read oversized dispatch")) as read_bytes, patch.object(json, "loads", side_effect=AssertionError("parsed oversized dispatch")) as parsed:
            with self.assertRaisesRegex(RuntimeError, "16MiB"):
                self.env["apply_photo_terrain"]("data/oversized-support.json")
            for operation in (opened, read_text, read_bytes, parsed):
                operation.assert_not_called()


class RayTests(unittest.TestCase):
    def setUp(self):
        self.check = functions()["_support_check_hit"]
        self.sample = {"id": "retained-failing-centre", "expected_hit": True, "expected": {"actor_label": "City_053_data66", "native_mesh_path": "/Game/Surface/Roads/road.road", "position_m": [1, 2, 3], "normal_enu": [0, 0, 1]}}
        self.actual = {"actor_label": "City_053_data66", "mesh_path": "/Game/Surface/Roads/road.road", "position_cm": [100, -200, 300], "normal_enu": [0, 0, 1]}

    def test_actual_source_plane_is_accepted(self):
        self.check(self.sample, self.actual)

    def test_previous_buried_terrain_height_is_rejected(self):
        self.actual["position_cm"][2] += 23.94
        with self.assertRaisesRegex(RuntimeError, "0.1cm"):
            self.check(self.sample, self.actual)

    def test_right_height_wrong_actor_or_mesh_is_rejected(self):
        for key in ("actor_label", "mesh_path"):
            actual = {**self.actual, key: "wrong-source"}
            with self.subTest(key=key), self.assertRaisesRegex(RuntimeError, "wrong native"):
                self.check(self.sample, actual)

    def test_wrong_normal_or_missing_query_is_rejected(self):
        with self.assertRaises(RuntimeError):
            self.check(self.sample, {**self.actual, "normal_enu": [0, 0, -1]})
        with self.assertRaises(RuntimeError):
            self.check(self.sample, None)

    def test_expected_miss_cannot_hide_a_native_hit(self):
        sample = {"id": "source-miss", "expected_hit": False}
        self.check(sample, None)
        with self.assertRaises(RuntimeError):
            self.check(sample, self.actual)


class SequencingTests(unittest.TestCase):
    def test_pending_installation_refuses_daylight_before_mutation(self):
        env = functions()
        env["_support_update"] = {"status": "pending-road-validation"}
        env["_daylight"] = lambda: self.fail("daylight mutated before admission")
        with self.assertRaisesRegex(RuntimeError, "unfinished"):
            env["configure_daylight"]()

    def test_failed_road_preflight_restores_live_terrain_and_stays_failed(self):
        env = functions()
        calls = []
        actor = types.SimpleNamespace(static_mesh_component=types.SimpleNamespace(set_static_mesh=lambda mesh: calls.append(("mesh", mesh))), set_actor_transform=lambda transform, sweep, teleport: calls.append(("transform", transform)))
        state = dict(terrain=actor, old_mesh="old", transform="source-transform", status="pending-road-validation")
        env["_support_update"] = state
        def missing(path):
            raise FileNotFoundError(path)
        env["_local_file"] = missing
        with self.assertRaises(FileNotFoundError):
            env["apply_photo_roads"]("missing.json")
        self.assertEqual(calls, [("mesh", "old"), ("transform", "source-transform")])
        self.assertIn("failed-not-saved", state["status"])
        self.assertIn("not rolled back", state["status"])

    def test_new_process_refuses_saved_pending_support(self):
        env = functions()
        class Actor:
            def get_actor_label(self):
                return "City_069_terrain"
        actor = Actor()
        actor.static_mesh_component = types.SimpleNamespace(static_mesh=types.SimpleNamespace(get_path_name=lambda: "/Game/Surface/TerrainSupport/terrain-support/StaticMeshes/terrain-support.terrain-support"))
        env["unreal"] = types.SimpleNamespace(StaticMeshActor=Actor, EditorAssetLibrary=types.SimpleNamespace(get_metadata_tag=lambda mesh, key: "pending"))
        env["_actors"] = lambda: types.SimpleNamespace(get_all_level_actors=lambda: [actor])
        with self.assertRaisesRegex(RuntimeError, "completed"):
            env["_require_complete_support"]()


if __name__ == "__main__":
    unittest.main()
