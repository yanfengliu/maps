"""Synthetic actual-helper failure receipts; no native collision or source acceptance claim."""
import ast
import copy
import hashlib
import json
import math
import os
from pathlib import Path
import stat
import struct
import tempfile
from types import SimpleNamespace as V
import unittest
from unittest.mock import patch
import uuid

HELPER = Path(os.environ.get("SHIBUYA_SUPPORT_HELPER", Path(__file__).parents[2] / "Content/Python/shibuya_tools.py"))


class SupportRayDiagnosticTests(unittest.TestCase):
    def setUp(self):
        self.folder = tempfile.TemporaryDirectory()
        self.addCleanup(self.folder.cleanup)
        self.project = Path(self.folder.name)
        (self.project / "artifacts/unreal").mkdir(parents=True)
        self.calls = []
        self.mode = "none"
        self.world = object()
        point = lambda x, y, z: V(x=x, y=y, z=z)
        self.points = [point(100, -200, 300), point(101, -200, 300), point(100, -199, 300)]
        body = V(get_path_name=lambda: "/Game/Road.BodySetup", get_editor_property=lambda name: False if name == "double_sided_geometry" else "USE_COMPLEX_AS_SIMPLE")
        description = V(get_triangle_vertex_instance=lambda face, corner: corner, get_vertex_instance_vertex=lambda corner: corner,
                        get_vertex_position=lambda index: self.points[index])
        mesh = V(get_editor_property=lambda name: body, get_path_name=lambda: "/Game/Road", get_num_triangles=lambda lod: 1,
                 get_num_sections=lambda lod: 1, get_static_mesh_description=lambda lod: description)
        class Component:
            static_mesh = mesh
            def get_editor_property(self, name): return self.static_mesh
            def get_collision_enabled(self): return "QUERY_AND_PHYSICS"
            def get_collision_profile_name(self): return "BlockAll"
            def get_collision_object_type(self): return "WORLD_STATIC"
            def get_collision_response_to_channel(self, channel): return "BLOCK"
        self.component = Component()
        self.actor = V(get_actor_label=lambda: "Expected", get_path_name=lambda: "/Game/Expected", static_mesh_component=self.component)
        self.other_actor = V(get_actor_label=lambda: "Wrong")
        def trace(*args):
            self.calls.append(args[4])
            if self.mode == "throw": raise RuntimeError("native query failed")
            if self.mode == "none": return None
            fields = {"hit_component": self.component, "hit_actor": self.other_actor if self.mode == "wrong" or (self.mode == "late-wrong" and len(self.calls)>128) else self.actor,
                      "impact_point": self.points[0], "impact_normal": point(0, 0, 1)}
            return V(to_dict=lambda: fields)
        world_type, mesh_type = object(), object()
        unreal = V(UnrealEditorSubsystem=world_type, StaticMeshEditorSubsystem=mesh_type,
            get_editor_subsystem=lambda kind: V(get_editor_world=lambda: self.world) if kind is world_type else V(is_section_collision_enabled=lambda *args: True),
            Vector=point, TraceTypeQuery=V(TRACE_TYPE_QUERY1="VisibilityTrace"), DrawDebugTrace=V(NONE=None),
            StaticMeshComponent=Component, SystemLibrary=V(line_trace_single=trace), TriangleID=lambda face: face,
            CollisionChannel=V(ECC_VISIBILITY="VISIBILITY"),
            ProceduralMeshLibrary=V(get_section_from_static_mesh=lambda *args: (self.points, [0, 1, 2], [], [], [])))
        names = {"_native_frame_record", "_require_native_frame", "_source_to_native_cm", "_native_to_source_m", "_source_normal_to_native", "_native_actor_tag", "_native_scene_frame", "_support_oriented_key", "_support_point_key", "_vector", "_support_check_hit", "_support_native_rays", "_support_ray_collision_state", "_support_save_ray_failure", "_support_ray_failure_packet"}
        functions = [node for node in ast.parse(HELPER.read_text(encoding="utf-8")).body if isinstance(node, ast.FunctionDef) and node.name in names]
        self.env = dict(PROJECT=self.project, math=math, hashlib=hashlib, json=json, struct=struct, stat=stat, uuid=uuid,
                        unreal=unreal, _actors=lambda: V(get_all_level_actors=lambda: [self.actor]))
        exec(compile(ast.Module(body=functions, type_ignores=[]), str(HELPER), "exec"), self.env)
        self.state = {"manifest_path": "data/support.json", "manifest_sha256": "a"*64, "bindings": {"road.glb": {"path": "road.glb", "bytes": 123, "sha256": "b"*64}}, "manifest": {"native_roads": [{"actor_label": "Expected", "native_mesh_path": "/Game/Road"}],
            "native_assignment": {"replacement_mesh_path": "/Game/Terrain"}, "native_ray_samples": {"path": "rays.json", "bytes": 456, "sha256": "c"*64}},
            "rays": {"samples": [{"id": f"ray-{index}", "start_m": [1, 2, 4], "end_m": [1, 2, 2], "expected_hit": True,
                "expected": {"actor_label": "Expected", "mesh_role": "road", "position_m": [1, 2, 3], "normal_enu": [0, 0, 1],
                    "source_path": "road.glb", "source_triangle_index": 67}} for index in range(141)]},
            "collision": {"complete_rendered_geometry_multiset_equal": True},
            "road_collision_receipts": [{"actor": f"road-{index}", "collision": {"complete_rendered_geometry_multiset_equal": True}} for index in range(25)]}

    def failure(self):
        with self.assertRaises(RuntimeError) as error:
            self.env["_support_native_rays"](self.state)
        self.last_failure_error = str(error.exception)
        files = list((self.project / "artifacts/unreal").glob("support-rays-failed-*.json"))
        self.assertEqual(len(files), 1)
        content = files[0].read_bytes()
        self.assertIn(hashlib.sha256(content).hexdigest(), str(error.exception))
        return json.loads(content)

    def test_all282_nohits_are_counted_with_bounded_failed_rows_and_never_admitted(self):
        receipt = self.failure()
        self.assertEqual(self.calls, [False, True] * 141)
        self.assertEqual(receipt["query_count"], 282)
        self.assertEqual(receipt["failed_query_count"], 282)
        self.assertEqual(receipt["selected_failed_query_count"],16)
        self.assertEqual(receipt["omitted_failed_query_count"],266)
        self.assertEqual(len(receipt["queries"]),16)
        self.assertEqual(receipt["did_not_run"]["query_count"],0)
        self.assertEqual(receipt["observed_succeeded_query_count"],0)
        self.assertEqual(receipt["query_modes"]["simple"]["executed"],141)
        self.assertFalse(receipt["passed"])
        self.assertFalse(receipt["map_saved"])
        self.assertEqual(len(receipt["road_collision_receipts"]), 25)
        self.assertTrue(all(row["actual"] is None and row["query_ran"] and row["query_returned_none"] for row in receipt["queries"]))
        collider = receipt["expected_colliders"]["Expected"]
        self.assertEqual(collider["visibility_response"], "BLOCK")
        self.assertIs(collider["body_double_sided"], False)
        self.assertEqual(collider["lod0_section_collision_enabled"], [True])
        self.assertEqual(collider["native_source_triangle_id"], 67)
        self.assertEqual(collider["matching_render_face_orientation_samples"][0]["right_handed_cross_normal"], [0, 0, 1])

    def test_wrong_native_hit_retains_actor_mesh_position_normal_and_expected_source(self):
        self.mode = "wrong"
        receipt = self.failure()
        row = receipt["queries"][0]
        self.assertEqual(row["actual"], {"actor_label": "Wrong", "mesh_path": "/Game/Road", "position_cm": [100, -200, 300], "normal_enu": [0, 0, 1], "normal_native": [0, 0, 1]})
        self.assertEqual(row["expected"]["source_triangle_index"], 67)
        self.assertFalse(row["query_returned_none"])

    def test_all282_strict_positives_keep_original_success_and_write_no_failure(self):
        self.mode = "correct"
        result = self.env["_support_native_rays"](self.state)
        self.assertTrue(result["passed"])
        self.assertEqual(result["query_count"], 282)
        self.assertEqual(list((self.project / "artifacts/unreal").iterdir()), [])

    def test_native_query_or_world_failure_stays_fatal_before_remaining_queries(self):
        self.mode = "throw"
        with self.assertRaisesRegex(RuntimeError, "native query failed"):
            self.env["_support_native_rays"](self.state)
        self.assertEqual(len(self.calls), 1)
        self.calls.clear()
        self.world = None
        with self.assertRaisesRegex(RuntimeError, "world is unavailable"):
            self.env["_support_native_rays"](self.state)
        self.assertEqual(self.calls, [])
        self.assertEqual(list((self.project / "artifacts/unreal").iterdir()), [])

    def test_optional_metadata_failure_is_explicit_and_cannot_mask_hit_refusal(self):
        self.component.get_collision_enabled = lambda: (_ for _ in ()).throw(RuntimeError("metadata unavailable"))
        receipt = self.failure()
        self.assertIn("metadata unavailable", receipt["expected_colliders"]["Expected"]["collision_observation_error"])
        self.assertEqual(receipt["failed_query_count"], 282)

    def test_failure_publication_is_exclusive_and_preserves_original_refusal(self):
        target = self.project / "artifacts/unreal/support-rays-failed-controlled.json"
        target.write_bytes(b"previous evidence")
        with patch.object(uuid, "uuid4", return_value=V(hex="controlled")):
            with self.assertRaisesRegex(RuntimeError, "wrong native.*failed ray diagnostic publication"):
                self.env["_support_native_rays"](self.state)
        self.assertEqual(target.read_bytes(), b"previous evidence")

    def test_source3_sized_failure_retains_patch64_actual_and_all_population_digests(self):
        template=self.state["rays"]["samples"][0]
        self.state["rays"]["samples"]=[{**copy.deepcopy(template),"id":f"source3-patch-{index}"} for index in range(1040)]
        for sample in self.state["rays"]["samples"]:sample["expected"]["diagnostic_padding"]="x"*3000
        self.mode="late-wrong"
        original=self.env.get("_support_ray_failure_packet")
        if original:
            def observe(receipt,state):
                self.full_receipt=copy.deepcopy(receipt)
                return original(receipt,state)
            self.env["_support_ray_failure_packet"]=observe
        receipt=self.failure()
        self.assertEqual(receipt["declared_query_count"],2080);self.assertEqual(receipt["query_count"],2080)
        self.assertEqual(receipt["observed_succeeded_query_count"],128);self.assertEqual(receipt["failed_query_count"],1952)
        self.assertEqual(receipt["omitted_failed_query_count"],1936);self.assertEqual(receipt["did_not_run"]["query_count"],0)
        self.assertEqual([r["trace_complex"] for r in receipt["queries"][:2]],[False,True])
        row=receipt["queries"][0];self.assertEqual(row["id"],"source3-patch-64")
        self.assertEqual(row["actual"]["actor_label"],"Wrong");self.assertEqual(row["expected"]["source_triangle_index"],67)
        self.assertEqual(row["start_m"],[1,2,4]);self.assertEqual(row["end_m"],[1,2,2]);self.assertTrue(row["query_ran"])
        self.assertEqual(receipt["source_bindings"],self.state["bindings"]);self.assertEqual(receipt["support_surface"]["sha256"],"a"*64)
        raw=json.dumps(self.full_receipt["queries"],sort_keys=True,separators=(",",":"),allow_nan=False).encode("utf-8")
        self.assertGreater(len(raw),2*1024*1024);self.assertEqual(receipt["all_executed_query_rows_sha256"],hashlib.sha256(raw).hexdigest())
        saved=next((self.project/"artifacts/unreal").glob("support-rays-failed-*.json"));self.assertLess(saved.stat().st_size,2*1024*1024)
        self.assertFalse(receipt["passed"]);self.assertFalse(receipt["map_saved"])

    def test_partial_execution_counts_not_run_separately_from_observed_outcomes(self):
        self.state["rays"]["samples"]=self.state["rays"]["samples"][:2];self.mode="correct"
        row=self.env["_support_native_rays"](self.state)["queries"][0];row["actual"]=None
        full={"queries":[row],"failures":[{"id":row["id"],"trace_complex":False,"error":"observed miss"}],"expected_colliders":{}}
        packet=self.env["_support_ray_failure_packet"](full,self.state)
        self.assertEqual(packet["declared_query_count"],4);self.assertEqual(packet["query_count"],1)
        self.assertEqual(packet["failed_query_count"],1);self.assertEqual(packet["observed_succeeded_query_count"],0)
        self.assertEqual(packet["did_not_run"]["status"],"DID_NOT_RUN");self.assertEqual(packet["did_not_run"]["query_count"],3)
        self.assertEqual(packet["query_modes"]["complex"],{"declared":2,"executed":0,"observed_failed":0,"observed_succeeded":0,"did_not_run":2})

    def test_omitted_actual_record_changes_digest_without_claiming_record_retention(self):
        original=self.env["_support_ray_failure_packet"]
        def observe(receipt,state):self.full_receipt=copy.deepcopy(receipt);return original(receipt,state)
        self.env["_support_ray_failure_packet"]=observe;first=self.failure()
        self.full_receipt["queries"][-1]["actual"]={"position_cm":[math.nan,0,0]}
        second=original(self.full_receipt,self.state)
        self.assertEqual(first["queries"],second["queries"]);self.assertNotEqual(first["all_executed_query_rows_sha256"],second["all_executed_query_rows_sha256"])
        saved=self.env["_support_save_ray_failure"](second);self.assertTrue((self.project/saved["path"]).exists())

    def test_failure_receipt_is_bounded_and_nonfinite_values_are_explicit(self):
        saved = self.env["_support_save_ray_failure"]({"bad_native_scalar": math.nan})
        self.assertEqual(json.loads((self.project / saved["path"]).read_text())["bad_native_scalar"], "nan")
        with self.assertRaisesRegex(RuntimeError, "2MiB"):
            self.env["_support_save_ray_failure"]({"oversize": "x" * (2 * 1024 * 1024)})


if __name__ == "__main__":
    unittest.main()
