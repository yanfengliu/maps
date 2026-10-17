"""Failure receipt controls; no native bounds, renderer or support claim."""
import ast
import copy
import hashlib
import json
import math
import os
from pathlib import Path
from types import SimpleNamespace as Value
import unittest


HELPER = Path(os.environ.get("SHIBUYA_SUPPORT_HELPER", Path(__file__).parents[2] / "Content/Python/shibuya_tools.py"))


def vector(x=0, y=0, z=0):
    return Value(x=x, y=y, z=z)


def transform():
    return Value(translation=vector(), rotation=Value(x=0, y=0, z=0, w=1), scale3d=vector(1, 1, 1))


class TerrainConservationReceiptTests(unittest.TestCase):
    def setUp(self):
        functions = [node for node in ast.parse(HELPER.read_text(encoding="utf-8")).body if isinstance(node, ast.FunctionDef) and node.name in {"_support_terrain_failure", "_vector", "_support_transform_values", "_support_transforms_equal"}]
        self.environment = dict(hashlib=hashlib, json=json, math=math)
        exec(compile(ast.Module(body=functions, type_ignores=[]), str(HELPER), "exec"), self.environment)
        self.before = {f"City_{index:03}_source": {"asset": f"/Game/City/Source{index}", "location_cm": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]} for index in range(111)}
        self.after = copy.deepcopy(self.before)
        self.excluded_arguments = []
        def source_state(excluded):
            self.excluded_arguments.append(excluded)
            return self.after
        self.environment["_source_actor_state"] = source_state
        self.native_transform = transform()
        self.collision = {"raw_source_triangles": 20, "exact_coincident_endpoint_exclusions": 1, "expected_retained_triangles": 19, "native_render_triangles": 19, "complete_rendered_geometry_multiset_equal": True, "geometry_multiset_sha256": "a" * 64}
        self.state = {"manifest": {"derived_terrain": {"bounds_glb_m": [[-1, -3, -2], [1, 3, 2]]}}, "transform": transform(), "unaffected": self.before, "collision": self.collision}
        self.mesh = Value(get_bounds=lambda: Value(origin=vector(), box_extent=vector(100, 200, 300)), get_editor_property=lambda _: vector())
        self.terrain = Value(get_actor_transform=lambda: self.native_transform, static_mesh_component=Value(static_mesh=self.mesh, get_editor_property=lambda _: 1.0))

    def receipt(self, centre=None):
        return json.loads(self.environment["_support_terrain_failure"](self.state, self.terrain, centre or vector(), vector(100, 200, 300)))

    def test_matching_fields_and_full_collision_receipt_are_json_safe(self):
        result = self.receipt()
        self.assertTrue(all(result[key] for key in ("bounds_match", "transform_unchanged", "other_source_actors_unchanged")))
        self.assertEqual(result["terrain_collision"], self.collision)
        self.assertFalse(result["map_saved"])
        self.assertEqual(result["changed_source_actor_labels"], [])
        self.assertEqual(result["other_source_actor_count_after"], 111)

    def test_bounds_failure_retains_actual_expected_and_collision(self):
        result = self.receipt(vector(.101, 0, 0))
        self.assertFalse(result["bounds_match"])
        self.assertTrue(result["transform_unchanged"])
        self.assertTrue(result["other_source_actors_unchanged"])
        self.assertAlmostEqual(result["maximum_bounds_error_cm"], .101)
        self.assertEqual(result["expected_bounds_cm"], [[-100, -200, -300], [100, 200, 300]])
        self.assertEqual(result["terrain_collision"], self.collision)

    def test_transform_failure_reports_before_and_after(self):
        self.native_transform.translation.x = .25
        result = self.receipt()
        self.assertFalse(result["transform_unchanged"])
        self.assertEqual(result["transform_before"]["translation_cm"], [0, 0, 0])
        self.assertEqual(result["transform_after"]["translation_cm"], [.25, 0, 0])

    def test_only_changed_source_actor_states_are_reported(self):
        self.after["City_055_source"]["asset"] = "/Game/Changed"
        result = self.receipt()
        self.assertFalse(result["other_source_actors_unchanged"])
        self.assertEqual(result["changed_source_actor_labels"], ["City_055_source"])
        self.assertEqual(set(result["changed_source_actors"]), {"City_055_source"})
        self.assertEqual(result["changed_source_actors"]["City_055_source"]["before"]["asset"], "/Game/City/Source55")
        self.assertEqual(result["changed_source_actors"]["City_055_source"]["after"]["asset"], "/Game/Changed")
        self.assertEqual(self.excluded_arguments, [{"City_069_terrain"}])
        self.assertEqual(result["intentionally_excluded_source_actor_labels"], ["City_069_terrain"])

    def test_all_failed_branches_are_visible_without_short_circuiting(self):
        self.native_transform.scale3d.z = 2
        self.after.pop("City_010_source")
        result = self.receipt(vector(1, 0, 0))
        self.assertFalse(any(result[key] for key in ("bounds_match", "transform_unchanged", "other_source_actors_unchanged")))
        self.assertIsNone(result["changed_source_actors"]["City_010_source"]["after"])

    def test_optional_bounds_metadata_failure_cannot_mask_guard_receipt(self):
        def fail():
            raise RuntimeError("native metadata unavailable")
        self.mesh.get_bounds = fail
        result = self.receipt(vector(1, 0, 0))
        self.assertEqual(result["bounds_metadata_read_error"], "native metadata unavailable")
        self.assertFalse(result["bounds_match"])
        self.assertEqual(result["terrain_collision"], self.collision)

    def test_oversize_changed_states_keep_all_ids_and_explicit_omission(self):
        self.after["City_055_source"]["asset"] = "x" * (130 * 1024)
        result = self.receipt()
        self.assertEqual(result["changed_source_actor_labels"], ["City_055_source"])
        self.assertIn("changed_source_actor_states_omitted", result)
        self.assertNotIn("changed_source_actors", result)
        self.assertLess(len(json.dumps(result).encode()), 128 * 1024)
        self.assertFalse(result["other_source_actors_unchanged"])


class TerrainTransformValueTests(unittest.TestCase):
    setUp = TerrainConservationReceiptTests.setUp
    receipt = TerrainConservationReceiptTests.receipt
    def test_wrapper_identity_inequality_cannot_reject_identical_components(self):
        class Wrapper(Value):
            def __eq__(self, other):
                return NotImplemented
            def __ne__(self, other):
                return NotImplemented
        self.native_transform = Wrapper(**vars(transform()))
        self.state["transform"] = Wrapper(**vars(transform()))
        self.assertNotEqual(self.native_transform, self.state["transform"])
        result = self.receipt()
        self.assertTrue(result["transform_unchanged"])
        self.assertEqual(result["transform_before"], result["transform_after"])

    def test_each_scalar_change_rejects_exactly_without_epsilon(self):
        compare = self.environment["_support_transforms_equal"]
        for field, components in (("translation", "xyz"), ("rotation", "xyzw"), ("scale3d", "xyz")):
            for component in components:
                with self.subTest(field=field, component=component):
                    before, after = transform(), transform()
                    value = getattr(getattr(after, field), component)
                    setattr(getattr(after, field), component, math.nextafter(float(value), math.inf))
                    self.assertFalse(compare(before, after))
                    self.assertFalse(compare(after, before))

    def test_nonfinite_or_bool_scalar_rejects_even_when_both_objects_share_it(self):
        compare = self.environment["_support_transforms_equal"]
        for field, components in (("translation", "xyz"), ("rotation", "xyzw"), ("scale3d", "xyz")):
            for component in components:
                for invalid in (math.nan, math.inf, -math.inf, True):
                    with self.subTest(field=field, component=component, invalid=invalid):
                        before, after = transform(), transform()
                        setattr(getattr(before, field), component, invalid)
                        setattr(getattr(after, field), component, invalid)
                        self.assertFalse(compare(before, after))
        self.native_transform.translation.x = math.nan
        result = self.receipt()
        self.assertFalse(result["transform_unchanged"])
        self.assertEqual(result["transform_after"]["translation_cm"][0], "nan")
        json.dumps(result, allow_nan=False)

    def test_live_guard_and_diagnostic_use_the_same_exact_predicate(self):
        tree = ast.parse(HELPER.read_text(encoding="utf-8"))
        for name in ("_prepare_support_terrain", "_validate_support_installation", "_support_terrain_failure"):
            function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == name)
            calls = [node for node in ast.walk(function) if isinstance(node, ast.Call)
                     and isinstance(node.func, ast.Name) and node.func.id == "_support_transforms_equal"]
            self.assertEqual(len(calls), 1, name)


    def test_no_support_function_directly_compares_native_transform_wrappers(self):
        tree = ast.parse(HELPER.read_text(encoding="utf-8"))
        def native_operand(node, aliases):
            return any((isinstance(item, ast.Call) and isinstance(item.func, ast.Attribute) and item.func.attr == "get_actor_transform")
                or (isinstance(item, ast.Subscript) and isinstance(item.slice, ast.Constant) and item.slice.value == "transform")
                or (isinstance(item, ast.Name) and item.id in aliases) for item in ast.walk(node))
        for function in (node for node in ast.walk(tree) if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))):
            aliases = set()
            changed = True
            while changed:
                prior = set(aliases)
                for node in ast.walk(function):
                    if isinstance(node, (ast.Assign, ast.AnnAssign)) and node.value is not None and native_operand(node.value, aliases):
                        targets = node.targets if isinstance(node, ast.Assign) else [node.target]
                        aliases.update(item.id for target in targets for item in ast.walk(target) if isinstance(item, ast.Name))
                changed = aliases != prior
            for node in ast.walk(function):
                if isinstance(node, ast.Compare) and any(isinstance(op, (ast.Eq, ast.NotEq)) for op in node.ops):
                    self.assertFalse(any(native_operand(value, aliases) for value in [node.left, *node.comparators]),
                        function.name + ": native wrapper comparison must use the exact finite-component predicate")


class FinalSupportTransformGuardTests(unittest.TestCase):
    def setUp(self):
        functions = [node for node in ast.parse(HELPER.read_text(encoding="utf-8")).body if isinstance(node, ast.FunctionDef)
                     and node.name in {"_validate_support_installation", "_vector", "_support_transform_values", "_support_transforms_equal"}]
        class Wrapper(Value):
            def __eq__(self, other):
                return NotImplemented
            def __ne__(self, other):
                return NotImplemented
        class Actor:
            tags = ["ShibuyaSource"]
            def __init__(self, index):
                self.label = "City_069_terrain" if index == 69 else f"City_{index:03}_source"
            def get_actor_label(self):
                return self.label
            def get_path_name(self):
                return "/Game/Maps/Shibuya." + self.label
            def actor_has_tag(self, tag):
                return tag in self.tags
        self.actors = [Actor(index) for index in range(112)]
        self.native_transform = Wrapper(**vars(transform()))
        self.terrain = self.actors[69]
        self.terrain.get_actor_transform = lambda: self.native_transform
        self.unaffected = {actor.label: {"asset": "unchanged"} for actor in self.actors if actor is not self.terrain}
        self.material = {"parameters": "unchanged"}
        self.packages = {"path": "unchanged"}
        self.ray_calls, self.read_calls = [], []
        self.state = {"terrain": self.terrain, "transform": Wrapper(**vars(transform())), "unaffected": copy.deepcopy(self.unaffected),
            "actor_pins": {actor.label: (actor.get_path_name(), list(actor.tags)) for actor in self.actors},
            "material": object(), "material_state": dict(self.material), "material_packages": dict(self.packages),
            "manifest": {"native_assignment": {}, "derived_terrain": {"path": "terrain.glb"}},
            "bindings": {"terrain.glb": {"path": "terrain.glb"}, "road.glb": {"path": "road.glb"}}}
        def rays(state):
            self.ray_calls.append(state)
            return {"passed": True, "bound": "synthetic ray dispatch only"}
        self.environment = dict(math=math, unreal=Value(StaticMeshActor=Actor), _actors=lambda: Value(get_all_level_actors=lambda: self.actors),
            _source_actor_state=lambda excluded: self.unaffected, _material_parameter_state=lambda material: self.material,
            _support_material_packages=lambda assignment: self.packages, _support_native_rays=rays,
            _support_read=lambda record, bindings, limit: self.read_calls.append((record["path"], limit)))
        exec(compile(ast.Module(body=functions, type_ignores=[]), str(HELPER), "exec"), self.environment)

    def test_actual_final_guard_accepts_equal_components_despite_wrapper_identity_inequality(self):
        self.assertNotEqual(self.state["transform"], self.native_transform)
        result = self.environment["_validate_support_installation"](self.state)
        self.assertTrue(result["passed"])
        self.assertEqual(self.ray_calls, [self.state])
        self.assertEqual(self.read_calls, [("terrain.glb", 64 * 1024 * 1024), ("road.glb", 32 * 1024 * 1024)])

    def test_actual_final_guard_keeps_all_original_conservation_operands(self):
        for mutation in ("identity", "tags", "count", "translation", "rotation", "scale", "nonfinite", "other_source", "material", "package"):
            with self.subTest(mutation=mutation):
                self.setUp()
                if mutation == "identity": self.state["actor_pins"][self.actors[0].label] = ("changed", ["ShibuyaSource"])
                elif mutation == "tags": self.actors[0].tags = ["ShibuyaSource", "changed"]
                elif mutation == "count": self.actors.pop()
                elif mutation == "translation": self.native_transform.translation.x = math.nextafter(0.0, 1.0)
                elif mutation == "rotation": self.native_transform.rotation.x = math.nextafter(0.0, 1.0)
                elif mutation == "scale": self.native_transform.scale3d.x = math.nextafter(1.0, 2.0)
                elif mutation == "nonfinite": self.native_transform.translation.x = math.nan
                elif mutation == "other_source": self.unaffected[self.actors[0].label]["asset"] = "changed"
                elif mutation == "material": self.material["parameters"] = "changed"
                elif mutation == "package": self.packages["path"] = "changed"
                with self.assertRaisesRegex(RuntimeError, "Cannot save support surface"):
                    self.environment["_validate_support_installation"](self.state)
                self.assertEqual(self.ray_calls, [])
                self.assertEqual(self.read_calls, [])


if __name__ == "__main__":
    unittest.main()
