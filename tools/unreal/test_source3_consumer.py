"""Actual native-admission/runtime-closure Python entries on tiny files; no engine, cooking or C++ execution."""
import ast
from collections import Counter
import copy
import hashlib
import importlib.util
import json
import math
import os
from pathlib import Path
from types import SimpleNamespace
import re
import stat
import struct
import tempfile
import unittest

ROOT = Path(os.environ.get("SHIBUYA_CANONICAL_ROOT", Path(__file__).parents[2]))
HELPER = Path(os.environ.get("SHIBUYA_SUPPORT_HELPER", ROOT / "Content/Python/shibuya_tools.py"))
RUNNER = Path(os.environ.get("SHIBUYA_RUNNER_UNDER_TEST", ROOT / "tools/runtime/run_native.py"))


def tiny_glb(faces=1, primitives=1):
    binary = b""
    doc = {"asset": {"version": "2.0"}, "buffers": [], "bufferViews": [], "accessors": [],
           "meshes": [{"primitives": []}], "nodes": [{"mesh": 0}], "scenes": [{"nodes": [0]}], "scene": 0}
    for part in range(primitives):
        points = struct.pack("<9f", 2*part, 0, 0, 2*part+1, 0, 0, 2*part, 0, 1)
        indices = struct.pack("<3I", 0, 1, 2) * faces
        view = len(doc["bufferViews"]); accessor = len(doc["accessors"])
        doc["bufferViews"].extend([{"buffer": 0, "byteOffset": len(binary), "byteLength": len(points)}, {"buffer": 0, "byteOffset": len(binary)+len(points), "byteLength": len(indices)}])
        doc["accessors"].extend([{"bufferView": view, "componentType": 5126, "count": 3, "type": "VEC3"}, {"bufferView": view+1, "componentType": 5125, "count": 3*faces, "type": "SCALAR"}])
        doc["meshes"][0]["primitives"].append({"attributes": {"POSITION": accessor}, "indices": accessor+1})
        binary += points + indices
    doc["buffers"] = [{"byteLength": len(binary)}]
    metadata = json.dumps(doc).encode(); metadata += b" " * (-len(metadata) % 4)
    return struct.pack("<III", 0x46546C67, 2, 28 + len(metadata) + len(binary)) + struct.pack("<II", len(metadata), 0x4E4F534A) + metadata + struct.pack("<II", len(binary), 0x004E4942) + binary


class Source3ConsumerTests(unittest.TestCase):
    def setUp(self):
        output = Path(os.environ.get("SHIBUYA_SOURCE3_TEST_OUTPUT", ROOT / "Artifacts/source3-consumer-unit")).absolute()
        output.mkdir(parents=True, exist_ok=True)
        self.folder = tempfile.TemporaryDirectory(dir=output)
        self.project = Path(self.folder.name)
        assert self.project.resolve().is_relative_to(output.resolve())
        self.addCleanup(self.folder.cleanup)
        names = {"_native_frame_record", "_require_native_frame", "_source_to_native_cm", "_native_to_source_m", "_source_normal_to_native", "_native_actor_tag", "_native_scene_frame", "_support_oriented_key", "_support_integer", "_support_identity", "_support_read", "_support_glb", "_support_point_key", "_support_geometry_digest", "_support_compare_native_geometry", "_local_file", "_admit_support_surface", "_admit_support_surface3", "_support3_record", "_support_selected_road"}
        tree = ast.parse(HELPER.read_text(encoding="utf-8"))
        self.env = dict(PROJECT=self.project, Path=Path, hashlib=hashlib, json=json, math=math, re=re, stat=stat, struct=struct, Counter=Counter)
        exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in names], type_ignores=[]), str(HELPER), "exec"), self.env)
        spec = importlib.util.spec_from_file_location("source3_actual_runner", RUNNER)
        self.runner = importlib.util.module_from_spec(spec); spec.loader.exec_module(self.runner)
        self.runner.ROOT = ROOT

    def put(self, name, value):
        raw = value if isinstance(value, bytes) else json.dumps(value, separators=(",", ":")).encode()
        path = self.project / name; path.parent.mkdir(parents=True, exist_ok=True); path.write_bytes(raw)
        return {"path": name, "bytes": len(raw), "sha256": hashlib.sha256(raw).hexdigest()}

    def snapshot(self, role, value):
        raw = json.dumps(value).encode(); sha = hashlib.sha256(raw).hexdigest()
        return self.put("data/source/provenance/" + role + "-" + sha + ".json", raw)

    def fixture(self, schema=3, multi_roads=False):
        source, photos, native = [], [], []
        for i in range(25):
            parts = 2 if multi_roads and i in (5, 23) else 1
            raw = self.put(f"data/prepared/roads/data{i}.glb", tiny_glb(primitives=parts))
            photo = self.put(f"data/prepared/surface/roads/data{i}.glb", tiny_glb(primitives=parts))
            source.append({**raw, "kind": "roads"}); photos.append({"original": raw, "generated": photo})
            native.append({"source_index": i, "road_index": i, "source_path": photo["path"], "source": photo, "original_source": raw,
                "actor_label": f"City_{i:03}_data{i}", "native_mesh_path": f"/Game/Surface/Roads/Tile_{i:03}/data{i}/StaticMeshes/data{i}.data{i}", "triangles": parts})
        original = self.put("data/prepared/terrain.glb", tiny_glb())
        base = self.put("data/prepared/manifest.json", {"origin": {"latitude": 35.6595, "longitude": 139.7005}, "vertical_reference": {"source": "synthetic"}, "outputs": [*source, {**original, "kind": "terrain"}]})
        atlas = self.put("data/prepared/surface/terrain-aerial.png", b"atlas")
        photo_terrain = self.put("data/prepared/surface/terrain-photo.glb", tiny_glb())
        road_photos = self.put("data/prepared/surface/road-photo-manifest.json", {"base_manifest_sha256": base["sha256"], "shared_atlas": atlas, "outputs": photos})
        osm = self.put("data/source/osm.xml", b"<osm/>")
        frozen = [self.put("data/frozen/" + name + ".json", {"name": name}) for name in ("network", "source", "movement", "rays")]
        config = {"base_manifest_sha256": base["sha256"], "osm": osm, "support_surface": {"original_terrain_photo": photo_terrain, "atlas": atlas, "policy": "schema2",
            "frozen_network": frozen[0], "frozen_source_manifest": frozen[1], "frozen_movement_manifest": frozen[2], "native_ray_inputs": [frozen[3]],
            "native_material": "/Game/Surface/Material.Material", "native_texture": "/Game/Surface/Texture.Texture"}}
        algorithm = self.snapshot("geometry", {"role": "geometry"})
        algorithm.update({name: self.snapshot(name, {"role": name}) for name in ("integration", "topology", "build_city")})
        configurations = {"surface_network": self.snapshot("configuration", config), "city": self.snapshot("city", {"origin": "fixed"})}
        roles = (("geometry", "tools/data/support_surface.py", algorithm), ("integration", "tools/data/surface_network.py", algorithm["integration"]),
                 ("topology", "tools/data/support_topology.py", algorithm["topology"]), ("build_city", "tools/data/build_city.py", algorithm["build_city"]),
                 ("surface_configuration", "sources/surface_network.json", configurations["surface_network"]), ("city_configuration", "sources/shibuya.json", configurations["city"]))
        inventory = [base, photo_terrain, atlas, road_photos, *frozen, original, *[r["original"] for r in photos], *[r["generated"] for r in photos], osm,
                     *[{"path": execution, "bytes": row["bytes"], "sha256": row["sha256"]} for _, execution, row in roles]]
        data_bindings = [{"role": role, "execution_path": execution, "snapshot": {key: row[key] for key in ("path", "bytes", "sha256")}} for role, execution, row in roles]
        geometry = self.env["_support_glb"](tiny_glb())
        derived = {**self.put("data/prepared/surface/generations/parent/terrain-support.glb", tiny_glb()), **geometry}
        assignment = {"material_path": config["support_surface"]["native_material"], "texture_path": config["support_surface"]["native_texture"], "original_actor_label": "City_069_terrain", "original_mesh_path": "/Game/Surface/TerrainPhoto/terrain-photo/StaticMeshes/terrain-photo.terrain-photo", "replacement_mesh_path": "/Game/Surface/TerrainSupport/terrain-support/StaticMeshes/terrain-support.terrain-support", "replace_original_terrain_actor_only": True, "preserve_material_packages": True, "collision_source_tolerance_cm": .1}
        rays = self.rays(native, frozen[3], multi_roads=multi_roads)
        preservation = self.put("data/source/provenance/parent-preservation.json", {"schema_version": 1, "inputs_before": inventory, "inputs_after": inventory, "unchanged": True, "data_bindings": data_bindings})
        parent = {"native_frame": self.env["_native_frame_record"](), "coordinate_model":"native-esu-float32-centimetres-v2", "schema_version": 2, "frame": {"glb": "metres-Xeast-Yup-Znorth", "runtime": "metres-Xeast-Ynorth-Zup", "unreal": "centimetres-Xeast-Ysouth-Zup"},
            "origin": {"latitude": 35.6595, "longitude": 139.7005}, "vertical_reference": {"source": "synthetic"},
            "inputs": {"base_manifest": base, "original_terrain_photo": photo_terrain, "original_terrain": original, "roads": [row["original"] for row in photos], "road_photo_manifest": road_photos},
            "atlas": atlas, "attribution": ["synthetic"], "native_assignment": assignment, "native_roads": native,
            "algorithm": algorithm, "configuration_inputs": configurations, "policy": "schema2", "derived_terrain": derived,
            "native_ray_samples": rays, "source_preservation": preservation, "terrain_source_triangle_indices": [0],
            "topology_provenance": {"record": self.put("data/proof.bin", b"proof"), "original_parent_count": 1, "output_triangle_count": 1}}
        if schema == 2:
            return self.put("data/schema2.json", parent), parent
        parent_record = self.put("data/prepared/surface/generations/parent/support-surface-manifest.json", parent)
        missing = lambda name: {"path": "data/producer-only/" + name, "bytes": 10, "sha256": "b" * 64}
        ledger = {"native_frame": self.env["_native_frame_record"](), "schema_version": 1, "coordinate_model": "native-esu-float32-centimetres-v2", "output_order": "parent-triangles-minus-deletions-then-patch-faces",
            "parent_support_surface": parent_record, "parent_derived_terrain": derived, "terrain_patch": missing("terrain-patch.glb"), "patch_faces": [], "deleted_parent_triangles": [],
            "terrain_edits": [], "regions": [{"id": "road-region", "native_xy_polygons_cm": [[[0, 0], [1, 0], [0, 1]]]}],
            "road_overrides": [{"source": 5, "replacement": missing("road-patch.glb")}], "recipe": {"algorithm": missing("constructor.py"), "source_inputs": [], "candidate_inputs": []}}
        edits = self.put("data/derived/surface-edits.json", ledger)
        writer = self.snapshot("source3-writer", {"writer": "source3"}); algorithm = copy.deepcopy(algorithm); algorithm["edits"] = writer
        native = copy.deepcopy(native)
        replacement = self.put("data/derived/roads/data5.glb", tiny_glb(1, 2) if multi_roads else tiny_glb(2)); native[5].update(source=replacement, source_path=replacement["path"], triangles=2)
        face_map = [{"source": 5, "mesh": 0, "primitive": 0, "triangle": 0, "source_triangle_index": 0, "kind": "road", "original_triangle": 0},
                    {"source": 5, "mesh": 0, "primitive": 1 if multi_roads else 0, "triangle": 0 if multi_roads else 1, "source_triangle_index": 1, "kind": "derived-road", "original_triangle": 0, "patch_triangle": 0, "region_id": "road-region"}]
        producer = [derived, ledger["terrain_patch"], ledger["road_overrides"][0]["replacement"], ledger["recipe"]["algorithm"]]
        inventory += [parent_record, edits, *producer, {"path": "tools/data/support_source3.py", "bytes": writer["bytes"], "sha256": writer["sha256"]}]
        preservation = self.put("data/source/provenance/source3-preservation.json", {"schema_version": 1, "inputs_before": inventory, "inputs_after": inventory, "unchanged": True, "data_bindings": data_bindings, "source3_writer": writer})
        manifest = {key: parent[key] for key in ("frame", "origin", "vertical_reference", "inputs", "atlas", "attribution", "native_assignment")}
        manifest.update(native_frame=self.env["_native_frame_record"](), schema_version=3, coordinate_model=ledger["coordinate_model"], parent_support_surface=parent_record, surface_edits=edits,
            derived_terrain={**self.put("data/derived/terrain-support.glb", tiny_glb()), **geometry}, derived_roads=[{"source": 5, "record": replacement, "face_map": face_map}],
            native_roads=native, algorithm=algorithm, configuration_inputs=configurations, source_preservation=preservation, native_ray_samples=self.rays(native, frozen[3], {5: face_map}, multi_roads))
        # The consumer must not allocate/read parent or patch geometry from this inventory.
        (self.project / derived["path"]).unlink()
        return self.put("data/schema3.json", manifest), manifest

    def rays(self, native, input_record, face_maps=None, multi_roads=False):
        samples = []
        for i, row in enumerate(native):
            flat = 1 if multi_roads and i in (5, 23) else 0
            ref = (face_maps or {}).get(i, [])[flat] if i in (face_maps or {}) else {"source": i, "mesh": 0, "primitive": flat, "triangle": 0, "source_triangle_index": flat, "kind": "road", "original_triangle": 0}
            x = 2.1 if flat else .1
            samples.append({"id": f"ray-{i}", "start_m": [x, .1, 1], "end_m": [x, .1, -1], "expected_hit": True,
                "expected": {"actor_label": row["actor_label"], "mesh_role": "road", "source_path": row["source_path"], "source_triangle_index": flat, "position_m": [x, .1, 0], "normal_enu": [0, 0, 1], "layer_ref": ref}})
        return self.put("data/derived/rays-" + str(native[5]["triangles"]) + ".json", {"native_frame": self.env["_native_frame_record"](), "schema_version": 1, "frame": "metres-Xeast-Ynorth-Zup", "position_tolerance_cm": .1, "normal_dot_min": .999,
            "inputs": [input_record], "road_coverage": {"source_roads": 25, "covered_actor_labels": sorted(row["actor_label"] for row in native), "uncovered_roads": []},
            "samples": samples})

    def admit(self, record): return self.env["_admit_support_surface"](self.project / record["path"])

    def runtime_state(self, record, manifest, admitted):
        source = self.put("data/runtime/source.json", {"native_frame": self.env["_native_frame_record"](), "support_surface": record, "derived_terrain": manifest["derived_terrain"], "roads": [row["source"] for row in manifest["native_roads"]], "raw_roads": manifest["inputs"]["roads"], "dem": {}, "osm": "c" * 64})
        network = self.put("data/runtime/network.json", {"native_frame": self.env["_native_frame_record"](), "source_manifest_sha256": source["sha256"]})
        movement = self.put("data/runtime/movement-manifest.json", {"movement": {"native_frame": self.env["_native_frame_record"](), "network": network, "source_manifest": source, "support_surface": record, "derived_terrain": manifest["derived_terrain"]}})
        values = [*admitted["bindings"].values(), source, network, movement]
        bindings = {row["path"]: row["sha256"] for row in values}; roles = {name: "source" for name in bindings}
        roles[record["path"]] = "support_manifest"; roles[manifest["derived_terrain"]["path"]] = "derived_terrain"
        for value in (manifest["algorithm"], *[manifest["algorithm"][key] for key in ("integration", "topology", "build_city", "edits")]): roles[value["path"]] = "code_snapshot"
        for value in manifest["configuration_inputs"].values(): roles[value["path"]] = "configuration_snapshot"
        return {"native_frame": self.env["_native_frame_record"](), "actual_input_sha256": bindings, "actual_input_roles": roles, "source_manifest_path": source["path"], "source_manifest_sha256": source["sha256"], "network_sha256": network["sha256"], "movement_manifest_sha256": movement["sha256"]}

    def test_schema2_actual_entry_remains_admitted(self):
        record, _ = self.fixture(2); self.assertEqual(self.admit(record)["manifest"]["schema_version"], 2)

    def test_schema3_actual_entry_reads_only_current_geometry_and_selects_replacement(self):
        record, manifest = self.fixture(); state = self.admit(record)
        self.assertEqual(len(state["manifest"]["native_roads"]), 25)
        self.assertNotIn(manifest["parent_support_surface"]["path"].replace("support-surface-manifest.json", "terrain-support.glb"), state["bindings"])
        entry = {"generated": {"path": "old", "sha256": "old"}}
        self.assertEqual(self.env["_support_selected_road"](entry, state, manifest["native_roads"][5]["actor_label"]), manifest["derived_roads"][0]["record"])
        self.assertEqual(self.env["_support_selected_road"](entry, None, "unused"), entry["generated"])

    def test_schema3_actual_entry_accepts_later_unchanged_and_changed_primitive_local_faces(self):
        record, manifest = self.fixture(multi_roads=True); state = self.admit(record)
        for source in (5, 23):
            actor = manifest["native_roads"][source]["actor_label"]
            self.assertEqual(state["road_geometry"][actor]["face_ids"], [(0, 0, 0), (0, 1, 0)])
            expected = state["rays"]["samples"][source]["expected"]
            self.assertEqual((expected["source_triangle_index"], expected["layer_ref"]["primitive"], expected["layer_ref"]["triangle"]), (1, 1, 0))
        self.runner.verify_source_inputs(self.project, self.runtime_state(record, manifest, state))

    def test_road_primitive_counter_preserves_all_occurrences_and_terrain_stays_single(self):
        payload = tiny_glb(primitives=2)
        with self.assertRaisesRegex(RuntimeError, "one complete terrain primitive"): self.env["_support_glb"](payload)
        geometry = self.env["_support_glb"](payload, native_geometry=True, road=True)
        parts = [[SimpleNamespace(x=x, y=y, z=0) for x, y in ((0, 0), (100, 0), (0, -100))],
                 [SimpleNamespace(x=x, y=y, z=0) for x, y in ((200, 0), (300, 0), (200, -100))]]
        mesh = SimpleNamespace(get_path_name=lambda: "/Game/Road", get_num_sections=lambda _: 2)
        self.env["unreal"] = SimpleNamespace(ProceduralMeshLibrary=SimpleNamespace(get_section_from_static_mesh=lambda _, lod, section: (parts[section], [0, 2, 1], [], [], [])))
        receipt = self.env["_support_compare_native_geometry"](mesh, geometry)
        self.assertEqual((receipt["raw_source_triangles"], receipt["native_render_triangles"]), (2, 2))
        self.assertTrue(receipt["complete_rendered_geometry_multiset_equal"])
        parts[1] = parts[0]
        with self.assertRaisesRegex(RuntimeError, "1 missing and 1 unexpected"): self.env["_support_compare_native_geometry"](mesh, geometry)

    def test_source3_road_flat_local_mismatch_is_refused_by_actual_admission(self):
        record, manifest = self.fixture(multi_roads=True)
        manifest["derived_roads"][0]["face_map"][1]["source_triangle_index"] = 0
        self.put(record["path"], manifest)
        with self.assertRaisesRegex(RuntimeError, "face map"): self.admit(record)

    def test_source3_unchanged_later_road_ray_cannot_relabel_local_face_as_flat(self):
        record, manifest = self.fixture(multi_roads=True)
        path = manifest["native_ray_samples"]["path"]; rays = json.loads((self.project / path).read_bytes())
        rays["samples"][23]["expected"]["source_triangle_index"] = 0
        manifest["native_ray_samples"] = self.put(path, rays); self.put(record["path"], manifest)
        with self.assertRaisesRegex(RuntimeError, "flattened output"): self.admit(record)

    def test_source3_wrong_native_road_role_is_refused(self):
        record, manifest = self.fixture(); manifest["native_roads"][5]["source"] = manifest["native_roads"][4]["source"]
        self.put(record["path"], manifest)
        with self.assertRaisesRegex(RuntimeError, "declared full replacement"): self.admit(record)

    def test_source3_mismatched_parent_and_overflow_refuse(self):
        record, manifest = self.fixture(); manifest["coordinate_model"] = "metres"
        self.put(record["path"], manifest)
        with self.assertRaisesRegex(RuntimeError, "native float32"): self.admit(record)
        manifest["coordinate_model"] = "native-esu-float32-centimetres-v2"; manifest["derived_terrain"]["bytes"] = 64 * 1024 * 1024 + 1
        self.put(record["path"], manifest)
        with self.assertRaisesRegex(RuntimeError, "67108864"): self.admit(record)

    def test_source3_parent_geometry_cannot_be_relabelled_current(self):
        record, manifest = self.fixture()
        parent = json.loads((self.project / manifest["parent_support_surface"]["path"]).read_bytes())
        manifest["derived_terrain"] = parent["derived_terrain"]
        self.put(record["path"], manifest)
        with self.assertRaisesRegex(RuntimeError, "producer-only parent geometry role"): self.admit(record)

    def test_source3_bool_output_index_is_not_a_triangle_identity(self):
        record, manifest = self.fixture(); manifest["derived_roads"][0]["face_map"][0]["triangle"] = False
        self.put(record["path"], manifest)
        with self.assertRaisesRegex(RuntimeError, "face map"): self.admit(record)

    def test_runtime_source3_closure_keeps_one_terrain_role_and_actual25_roads(self):
        record, manifest = self.fixture(); state = self.runtime_state(record, manifest, self.admit(record))
        self.runner.verify_source_inputs(self.project, state)
        self.assertEqual(sum(role == "derived_terrain" for role in state["actual_input_roles"].values()), 1)
        parent = json.loads((self.project / manifest["parent_support_surface"]["path"]).read_bytes())["derived_terrain"]
        bad = copy.deepcopy(state); bad["actual_input_sha256"][parent["path"]] = parent["sha256"]; bad["actual_input_roles"][parent["path"]] = "derived_terrain"
        with self.assertRaisesRegex(ValueError, "Only the Source2 pair"): self.runner.source_digest_limits(self.project, bad)

    def test_runtime_mismatched_movement_generation_is_refused(self):
        record, manifest = self.fixture(); state = self.runtime_state(record, manifest, self.admit(record))
        path = "data/runtime/movement-manifest.json"; value = json.loads((self.project / path).read_bytes()); value["movement"]["derived_terrain"]["sha256"] = "a" * 64
        changed = self.put(path, value); state["actual_input_sha256"][path] = changed["sha256"]; state["movement_manifest_sha256"] = changed["sha256"]
        with self.assertRaisesRegex(ValueError, "different derived generations"): self.runner.source_digest_limits(self.project, state)

    def test_runtime_rejects_allocated_producer_patch_role(self):
        record, manifest = self.fixture(); state = self.runtime_state(record, manifest, self.admit(record))
        ledger = json.loads((self.project / manifest["surface_edits"]["path"]).read_bytes()); patch = ledger["terrain_patch"]
        state["actual_input_sha256"][patch["path"]] = patch["sha256"]; state["actual_input_roles"][patch["path"]] = "source"
        with self.assertRaisesRegex(ValueError, "producer-only geometry/intermediate"): self.runner.source_digest_limits(self.project, state)


if __name__ == "__main__": unittest.main()
