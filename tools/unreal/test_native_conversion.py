"""Exact source conversion and independent synthetic render-buffer controls.

Bound: Python admission/comparison logic; no Unreal render, collision or ray claim.
"""
import ast
from collections import Counter
import hashlib
import json
import math
import os
from pathlib import Path
import struct
import types
import unittest


HELPER = Path(os.environ.get("SHIBUYA_SUPPORT_HELPER", Path(__file__).parents[2] / "Content/Python/shibuya_tools.py"))


def functions():
    tree = ast.parse(HELPER.read_text(encoding="utf-8"))
    names = {"_support_integer", "_support_point_key", "_support_geometry_digest", "_support_glb", "_support_compare_native_geometry"}
    body = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in names]
    environment = dict(Counter=Counter, hashlib=hashlib, json=json, math=math, struct=struct)
    exec(compile(ast.Module(body=body, type_ignores=[]), str(HELPER), "exec"), environment)
    return environment


def glb(positions, triangles):
    positions = b"".join(struct.pack("<3f", *point) for point in positions)
    indices = b"".join(struct.pack("<3I", *face) for face in triangles)
    binary = positions + indices
    doc = {"asset": {"version": "2.0"}, "buffers": [{"byteLength": len(binary)}], "bufferViews": [{"buffer": 0, "byteOffset": 0, "byteLength": len(positions)}, {"buffer": 0, "byteOffset": len(positions), "byteLength": len(indices)}], "accessors": [{"bufferView": 0, "componentType": 5126, "count": len(positions) // 12, "type": "VEC3"}, {"bufferView": 1, "componentType": 5125, "count": len(indices) // 4, "type": "SCALAR"}], "meshes": [{"primitives": [{"attributes": {"POSITION": 0}, "indices": 1}]}], "nodes": [{"mesh": 0}], "scenes": [{"nodes": [0]}], "scene": 0}
    metadata = json.dumps(doc, separators=(",", ":")).encode()
    metadata += b" " * (-len(metadata) % 4)
    return struct.pack("<III", 0x46546C67, 2, 28 + len(metadata) + len(binary)) + struct.pack("<II", len(metadata), 0x4E4F534A) + metadata + struct.pack("<II", len(binary), 0x004E4942) + binary


class Mesh:
    def __init__(self, vertices, indices, description=None):
        self.vertices = [types.SimpleNamespace(x=x, y=y, z=z) for x, y, z in vertices]
        self.indices = indices
        self.description = description

    def get_path_name(self):
        return "/Game/SyntheticSupport"

    def get_num_sections(self, lod):
        return 1

    def get_static_mesh_description(self, lod):
        return self.description


class NativeConversionTests(unittest.TestCase):
    def setUp(self):
        self.env = functions()
        self.env["unreal"] = types.SimpleNamespace(TriangleID=int, VertexID=int, ProceduralMeshLibrary=types.SimpleNamespace(get_section_from_static_mesh=lambda mesh, lod, section: (mesh.vertices, mesh.indices, [], [], [])))
        self.regular_source = [(0, 0, 0), (1, 0, 0), (0, 1, 0)]
        self.regular_native = [(0, 0, 0), (100, 0, 0), (0, 0, 100)]

    def geometry(self, points=None, faces=None):
        return self.env["_support_glb"](glb(points or self.regular_source, faces or [(0, 1, 2)]), native_geometry=True)

    def compare(self, mesh, geometry):
        return self.env["_support_compare_native_geometry"](mesh, geometry)

    def test_noncollapsed_preserves_strict_raw_count(self):
        geometry = self.geometry()
        self.assertEqual(geometry["source"]["triangles"], 1)
        self.assertEqual(geometry["excluded"], [])
        self.assertEqual(sum(geometry["retained"].values()), 1)
        result = self.compare(Mesh(self.regular_native, [0, 1, 2]), geometry)
        self.assertEqual((result["raw_source_triangles"], result["exact_coincident_endpoint_exclusions"], result["expected_retained_triangles"], result["native_render_triangles"]), (1, 0, 1, 1))

    def collapsed_geometry(self):
        # Adjacent source float32 values whose fixed100 products are identical.
        low = struct.unpack("<f", struct.pack("<I", 0x3FA3D70B))[0]
        high = struct.unpack("<f", struct.pack("<I", 0x3FA3D70C))[0]
        self.assertNotEqual(low, high)
        points = [(low, 0, 0), (high, 0, 0), (0, 1, 0), (0, 0, 0), (1, 0, 0)]
        faces = [(0, 1, 2), (3, 4, 2)]
        geometry = self.geometry(points, faces)
        source_points = [types.SimpleNamespace(x=x, y=y, z=z) for x, y, z in [(128.00001525878906, 0, 0), (128.00001525878906, 0, 0), (0, 0, 100), (0, 0, 0), (100, 0, 0)]]
        description = types.SimpleNamespace(get_triangle_count=lambda: 2, get_vertex_count=lambda: 5, get_triangle_vertex_instance=lambda face, corner: (face, corner), get_vertex_instance_vertex=lambda instance: types.SimpleNamespace(id_value=faces[instance[0]][instance[1]]), get_vertex_position=lambda vertex: source_points[vertex])
        return geometry, description, source_points

    def test_float32_collapse_requires_actual_native_source_positions_and_full_render_match(self):
        geometry, description, _ = self.collapsed_geometry()
        self.assertEqual(geometry["source"]["triangles"], 2)
        self.assertEqual(geometry["excluded"], [(0, (0, 1, 2))])
        result = self.compare(Mesh(self.regular_native, [0, 1, 2], description), geometry)
        self.assertEqual((result["raw_source_triangles"], result["exact_coincident_endpoint_exclusions"], result["expected_retained_triangles"], result["excluded_native_source_faces_verified"]), (2, 1, 1, 1))

    def test_collinear_but_distinct_is_never_excluded(self):
        geometry = self.geometry([(0, 0, 0), (1, 0, 0), (2, 0, 0)])
        self.assertEqual(geometry["excluded"], [])
        self.compare(Mesh([(0, 0, 0), (100, 0, 0), (200, 0, 0)], [0, 1, 2]), geometry)

    def test_duplicate_occurrences_are_preserved(self):
        geometry = self.geometry(faces=[(0, 1, 2), (0, 1, 2)])
        self.assertEqual(sum(geometry["retained"].values()), 2)
        self.compare(Mesh(self.regular_native, [0, 1, 2, 2, 1, 0]), geometry)
        with self.assertRaisesRegex(RuntimeError, "1 missing"):
            self.compare(Mesh(self.regular_native, [0, 1, 2]), geometry)

    def test_same_count_moved_vertex_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "1 missing and 1 unexpected"):
            self.compare(Mesh([(0, 0, 0), (100, 0, 0), (0, 0, 99)], [0, 1, 2]), self.geometry())

    def test_changed_excluded_native_source_position_is_rejected(self):
        geometry, description, points = self.collapsed_geometry()
        points[0].x = 128.0
        with self.assertRaisesRegex(RuntimeError, "source vertex 0 differs"):
            self.compare(Mesh(self.regular_native, [0, 1, 2], description), geometry)

    def test_changed_excluded_source_index_set_is_rejected(self):
        geometry, description, _ = self.collapsed_geometry()
        description.get_vertex_instance_vertex = lambda instance: types.SimpleNamespace(id_value=instance[1] + 1)
        with self.assertRaisesRegex(RuntimeError, "source face 0 changed"):
            self.compare(Mesh(self.regular_native, [0, 1, 2], description), geometry)

    def test_missing_render_buffers_fail(self):
        with self.assertRaisesRegex(RuntimeError, "missing or incomplete"):
            self.compare(Mesh(self.regular_native, []), self.geometry())

    def test_missing_source_description_cannot_admit_an_exclusion(self):
        geometry, _, _ = self.collapsed_geometry()
        with self.assertRaisesRegex(RuntimeError, "lost its source LOD0 population"):
            self.compare(Mesh(self.regular_native, [0, 1, 2]), geometry)

    def test_signed_zero_and_face_order_have_identical_geometry(self):
        self.compare(Mesh([(-0.0, 0, 0), (100, -0.0, 0), (0, 0, 100)], [2, 1, 0]), self.geometry())


if __name__ == "__main__":
    unittest.main()
