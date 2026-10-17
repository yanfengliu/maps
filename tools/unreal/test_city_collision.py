"""Actual helper control flow on synthetic bodies; excludes native physics/cooking/movement acceptance."""
import ast
import copy
import json
import math
import os
from pathlib import Path
from types import SimpleNamespace as V
import unittest

HELPER = Path(os.environ.get("SHIBUYA_SUPPORT_HELPER", Path(__file__).parents[2] / "Content/Python/shibuya_tools.py"))


class Body:
    def __init__(self):
        self.flag = "SIMPLE_AND_COMPLEX"
        self.aggregate = {"convex": [[(-200, -200, 0), (200, 200, 1000)]], "box": [(1, 2, 3)]}
        self.active = self.flag
        self.calls = []
        self.on_refresh = lambda: None
    def get_editor_property(self, name):
        return self.flag if name == "collision_trace_flag" else copy.deepcopy(self.aggregate)
    def set_editor_property(self, name, value, notify=None):
        self.calls.append((name, copy.deepcopy(value), notify))
        if name == "collision_trace_flag": self.flag = value
        elif name == "agg_geom":
            self.aggregate = copy.deepcopy(value)
            if notify == "ALWAYS": self.active = self.flag; self.on_refresh()
        else: raise AssertionError("Unexpected geometry/material mutation: " + name)


class Component:
    def __init__(self, mesh): self.static_mesh = mesh; self.visibility = "BLOCK"
    def get_collision_enabled(self): return "QUERY_AND_PHYSICS"
    def get_collision_profile_name(self): return "BlockAll"
    def get_collision_object_type(self): return "WORLD_STATIC"
    def get_collision_response_to_channel(self, channel): return self.visibility if channel == "Visibility" else "BLOCK"


class Mesh:
    def __init__(self, index): self.body = Body(); self.path = f"/Game/City/Mesh{index}.Mesh{index}"; self.triangles = 2
    def get_path_name(self): return self.path
    def get_editor_property(self, name): return self.body if name == "body_setup" else None
    def get_num_triangles(self, lod): return self.triangles
    def get_num_sections(self, lod): return 1
    def get_bounds(self): return V(origin=V(z=300), box_extent=V(z=300))


class Actor:
    def __init__(self, index): self.index = index; self.static_mesh_component = Component(Mesh(index))
    def get_actor_label(self): return f"City_{self.index:03}"
    def actor_has_tag(self, tag): return True
    def get_actor_transform(self): return V(transform_location=lambda point: point)


class CityCollisionTests(unittest.TestCase):
    def setUp(self):
        self.actors = [Actor(index) for index in range(3)]
        self.mode = "pass"
        self.queries = []
        self.sections_enabled = True
        self.state = {"manifest": {"native_roads": []}, "rays": {"samples": [
            {"id": f"road-{i}", "expected_hit": True, "expected": {"mesh_role": "road", "actor_label": f"road-{i}", "position_m": [10, 100 + i, 0]}} for i in range(3)]}}
        point = lambda *p: V(x=p[0], y=p[1], z=p[2])
        def sections(mesh, lod, section):
            i = next(i for i, actor in enumerate(self.actors) if actor.static_mesh_component.static_mesh is mesh)
            return ([point(0, i * 1000 - 300, 0), point(0, i * 1000 + 300, 0), point(0, i * 1000, 600)], [0, 1, 2], [], [], [])
        def query(*args):
            shape = "ray" if len(args) == 8 else "capsule"
            world, start, end = args[:3]
            self.queries.append((shape, args))
            if start.y >= 10000:
                if self.mode != "blocked-road": return None
                actor = self.actors[0]
            else:
                actor = min(self.actors, key=lambda a: abs(start.y - a.index * 1000))
                if self.mode == "missing-wall": return None
            return V(to_dict=lambda: {"hit_actor": self.actors[-1] if self.mode == "wrong-wall" else actor,
                "hit_component": actor.static_mesh_component, "initial_overlap": self.mode == "initial-overlap",
                "time": float("nan") if self.mode == "nonfinite-time" else .5, "impact_point": point(0, start.y, start.z), "impact_normal": point(-1, 0, 0)})
        self.unreal = V(StaticMeshActor=Actor, StaticMeshComponent=Component,
            StaticMeshEditorSubsystem="mesh", UnrealEditorSubsystem="world",
            CollisionChannel=V(ECC_VISIBILITY="Visibility", ECC_PAWN="Pawn"), CollisionTraceFlag=V(CTF_USE_COMPLEX_AS_SIMPLE="COMPLEX_AS_SIMPLE"),
            PropertyAccessChangeNotifyMode=V(ALWAYS="ALWAYS"), Vector=point,
            TraceTypeQuery=V(TRACE_TYPE_QUERY1="Visibility"), DrawDebugTrace=V(NONE=None),
            ProceduralMeshLibrary=V(get_section_from_static_mesh=sections),
            SystemLibrary=V(line_trace_single=query, capsule_trace_single_by_profile=query),
            get_editor_subsystem=lambda kind: V(is_section_collision_enabled=lambda *args: self.sections_enabled,
                get_simple_collision_count=lambda mesh: 1, get_convex_collision_count=lambda mesh: 1) if kind == "mesh" else V(get_editor_world=lambda: object()))
        self.tree = ast.parse(HELPER.read_text(encoding="utf-8"))
        wanted = {"_city_collision_component", "_prepare_city_collision", "_city_collision_hit", "_city_collision_witnesses", "_city_collision_world_points", "_abort_support_update", "_vector"}
        self.env = dict(unreal=self.unreal, math=math, json=json, _support_update=None,
                        _actors=lambda: V(get_all_level_actors=lambda: self.actors))
        exec(compile(ast.Module(body=[n for n in self.tree.body if isinstance(n, ast.FunctionDef) and n.name in wanted], type_ignores=[]), str(HELPER), "exec"), self.env)

    def configure(self): return self.env["_prepare_city_collision"](self.state)

    def test_disconnected_building_hull_gap_uses_existing_triangles_in_both_modes(self):
        # Two real walls atx=-100/+100 leave a street atx=0; one convex includes it.
        # Model the native shape-selector seam, not an independent physics solver.
        def gap_hit(body, complex_query): return None if complex_query or body.active == "COMPLEX_AS_SIMPLE" else "coarse-tile-hull"
        for actor in self.actors:
            self.assertEqual(gap_hit(actor.static_mesh_component.static_mesh.body, False), "coarse-tile-hull")
        receipt = self.configure()
        self.assertEqual(receipt["building_actor_count"], 3)
        for actor in self.actors:
            body = actor.static_mesh_component.static_mesh.body
            self.assertIsNone(gap_hit(body, False)); self.assertIsNone(gap_hit(body, True))
            self.assertEqual(body.calls[-1][::2], ("agg_geom", "ALWAYS"))
            self.assertEqual(body.aggregate, self.state["city_collision_restore"][actor.index][3])
        self.assertTrue(all(row["component_before"] == row["component_after"] for row in receipt["meshes"]))
        json.dumps(receipt, allow_nan=False)

    def test_rollback_restores_original_flag_and_full_convex_data(self):
        originals = [(a.static_mesh_component.static_mesh.body.flag, copy.deepcopy(a.static_mesh_component.static_mesh.body.aggregate)) for a in self.actors]
        self.configure()
        self.state.update(terrain=V(static_mesh_component=V(set_static_mesh=lambda value: None), set_actor_transform=lambda *args: None), old_mesh=object(), transform=object())
        self.env["_support_update"] = self.state
        self.env["_abort_support_update"]("original query refusal")
        self.assertEqual(self.state["failure"], "original query refusal")
        for actor, (flag, aggregate) in zip(self.actors, originals):
            body = actor.static_mesh_component.static_mesh.body
            self.assertEqual((body.flag, body.active, body.aggregate), (flag, flag, aggregate))

    def test_partial_refresh_failure_keeps_original_error_and_restorable_geometry(self):
        body = self.actors[0].static_mesh_component.static_mesh.body
        original = copy.deepcopy(body.aggregate)
        count = []
        def fail_once():
            count.append(1)
            if len(count) == 1: raise RuntimeError("primary native refresh failed")
        body.on_refresh = fail_once
        with self.assertRaisesRegex(RuntimeError, "primary native refresh failed"): self.configure()
        self.state.update(terrain=V(static_mesh_component=V(set_static_mesh=lambda value: None), set_actor_transform=lambda *args: None), old_mesh=object(), transform=object())
        self.env["_support_update"] = self.state
        self.env["_abort_support_update"]("primary native refresh failed")
        self.assertEqual((body.flag, body.active, body.aggregate), ("SIMPLE_AND_COMPLEX", "SIMPLE_AND_COMPLEX", original))
        self.assertEqual(self.state["failure"], "primary native refresh failed")
        self.assertNotIn("live_restore_errors", self.state)

    def test_missing_body_external_mesh_or_disabled_section_are_refused(self):
        self.sections_enabled = False
        with self.assertRaisesRegex(RuntimeError, "own nonempty collision-enabled"): self.configure()
        self.sections_enabled = True
        self.actors[0].static_mesh_component.static_mesh.path = "/Game/Foreign/Mesh"
        with self.assertRaisesRegex(RuntimeError, "own nonempty collision-enabled"): self.configure()

    def test_component_filter_mutation_during_refresh_is_refused(self):
        self.actors[0].static_mesh_component.static_mesh.body.on_refresh = lambda: setattr(self.actors[0].static_mesh_component, "visibility", "IGNORE")
        with self.assertRaisesRegex(RuntimeError, "changed native geometry/filtering"): self.configure()

    def test_three_facades_and_three_open_roads_require_all18_queries(self):
        self.configure(); result = self.env["_city_collision_witnesses"](self.state)
        self.assertTrue(result["passed"]); self.assertEqual(result["query_count"], 18)
        self.assertEqual(sum(row["kind"] == "facade-capsule" for row in result["queries"]), 6)
        self.assertEqual(sum(row["kind"] == "open-road-capsule" for row in result["queries"]), 6)
        self.assertTrue(all(args[5] == "Pawn" and args[3:5] == (28.0, 88.0) for shape, args in self.queries if shape == "capsule"))

    def test_wall_miss_wrong_actor_initial_overlap_and_nonfinite_time_refuse(self):
        self.configure()
        for mode in ("missing-wall", "wrong-wall", "initial-overlap", "nonfinite-time"):
            with self.subTest(mode=mode):
                self.mode = mode
                with self.assertRaises((RuntimeError, ValueError)): self.env["_city_collision_witnesses"](self.state)

    def test_blocked_open_road_capsule_refuses(self):
        self.configure(); self.mode = "blocked-road"
        with self.assertRaisesRegex(RuntimeError, "open-road capsule clearance"): self.env["_city_collision_witnesses"](self.state)

    def test_actual_install_orders_all_validation_before_city_package_and_map_save(self):
        tools = next(n for n in self.tree.body if isinstance(n, ast.ClassDef) and n.name == "ShibuyaCityTools")
        apply = next(n for n in tools.body if isinstance(n, ast.FunctionDef) and n.name == "apply_photo_roads")
        calls = [(n.lineno, ast.unparse(n.func)) for n in ast.walk(apply) if isinstance(n, ast.Call)]
        line = lambda name: min(lineno for lineno, called in calls if called == name)
        self.assertLess(line("_prepare_city_collision"), line("_validate_support_installation"))
        self.assertLess(line("_validate_support_installation"), line("_city_collision_witnesses"))
        city_save = next(n for n in ast.walk(apply) if isinstance(n, ast.Call) and ast.unparse(n.func) == "unreal.EditorAssetLibrary.save_loaded_asset" and ast.unparse(n.args[0]) == "city_mesh")
        self.assertLess(line("_city_collision_witnesses"), city_save.lineno)
        self.assertLess(city_save.lineno, line("unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).save_current_level"))


if __name__ == "__main__": unittest.main()
