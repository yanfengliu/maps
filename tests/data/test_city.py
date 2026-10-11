"""Bound: coordinate order, source format, geographic crop, and prepared bytes.

Source-dependent checks require the freshly prepared, gitignored crop. They never
download implicitly, skip missing source, or claim that data on disk looks right.
"""
from __future__ import annotations

import hashlib
import io
import importlib.util
import json
import math
import pathlib
import struct
import sys
import tempfile
import subprocess
import unittest
import zipfile
import zlib
from unittest import mock

ROOT = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("fresh_city", ROOT / "tools/data/build_city.py")
city = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = city
spec.loader.exec_module(city)
import numpy as np


class Coordinates(unittest.TestCase):
    def test_wgs84_independent_equator_and_pole_references(self):
        self.assertTrue(np.allclose(city.ecef(0, 0), [6378137, 0, 0], atol=1e-8))
        self.assertTrue(np.allclose(city.ecef(0, 90), [0, 6378137, 0], atol=1e-8))
        self.assertTrue(np.allclose(city.ecef(90, 0, 100), [0, 0, 6356852.314245179], atol=1e-7))
        reference = city.geodetic([[6378137, 0, 0], [0, 6378237, 0]])
        self.assertTrue(np.allclose(reference, [[0, 0, 0], [0, 90, 100]], atol=1e-8))

    def test_local_origin_and_geographic_directions(self):
        o = city.CONFIG["origin"]
        origin = city.ecef(o["latitude"], o["longitude"], 52)
        east = city.ecef(o["latitude"], o["longitude"]+.00001, 52)
        north = city.ecef(o["latitude"]+.00001, o["longitude"], 52)
        up = city.ecef(o["latitude"], o["longitude"], 53)
        local = city.localize([origin, east, north, up], 52)
        self.assertTrue(np.allclose(local[0], [0, 0, 0], atol=1e-8))
        self.assertGreater(local[1, 0], .9)
        self.assertLess(abs(local[1, 2]), 1e-4)
        self.assertGreater(local[2, 2], 1.1)
        self.assertLess(abs(local[2, 0]), 1e-4)
        self.assertTrue(np.allclose(local[3], [0, 1, 0], atol=1e-8))
        self.assertAlmostEqual(np.linalg.det(city.local_basis()), -1, places=12)

    def test_region_hit_is_geographic_and_inclusive(self):
        region = [math.radians(v) for v in [139.695, 35.655, 139.706, 35.664]]+[0, 100]
        self.assertTrue(city.region_intersects(region, city.CONFIG["bounds"]))
        other = [math.radians(v) for v in [140, 35.655, 140.1, 35.664]]+[0, 100]
        self.assertFalse(city.region_intersects(other, city.CONFIG["bounds"]))
        with self.assertRaises(ValueError):
            city.region_intersects(region[:4], city.CONFIG["bounds"])

    def test_nested_tile_transform_uses_column_major_and_parent_order(self):
        region = [math.radians(v) for v in [139.695, 35.655, 139.706, 35.664]]+[0, 100]
        parent = np.eye(4)
        parent[:3, 3] = [10, 20, 30]
        child = np.eye(4)
        child[:3, 3] = [1, 2, 3]
        node = {"boundingVolume": {"region": region}, "transform": parent.flatten(order="F").tolist(), "children": [{"boundingVolume": {"region": region}, "transform": child.flatten(order="F").tolist(), "content": {"uri": "a.b3dm"}}]}
        leaves = list(city.tile_leaves(node))
        self.assertEqual(len(leaves), 1)
        self.assertTrue(np.allclose(leaves[0][1][:3, 3], [11, 22, 33]))


class Formats(unittest.TestCase):
    def test_glb_and_b3dm_fail_on_truncation_or_wrong_length(self):
        for payload in [b"", b"glTF"+bytes(60), struct.pack("<4sII", b"glTF", 2, 12)]:
            with self.assertRaises(ValueError):
                city.read_glb(payload)
        for payload in [b"", struct.pack("<4s6I", b"b3dm", 1, 30, 0, 0, 0, 0), struct.pack("<4s6I", b"nope", 1, 28, 0, 0, 0, 0)]:
            with self.assertRaises(ValueError):
                city.unwrap_b3dm(payload)

    def test_exported_triangle_winding_and_1m_2m_3m_dimensions(self):
        with tempfile.TemporaryDirectory(dir=ROOT / "data") as directory:
            writer = city.GlbWriter()
            writer.doc["materials"] = [{}]
            writer.primitive({"POSITION": np.array([[0, 0, 0], [1, 0, 0], [0, 0, 3], [0, 2, 0]]), "NORMAL": np.array([[0, 1, 0]]*4)}, np.array([[0, 2, 1]]))
            target = pathlib.Path(directory) / "probe.glb"
            writer.save(target)
            doc, binary = city.read_glb(target.read_bytes())
            position = doc["accessors"][doc["meshes"][0]["primitives"][0]["attributes"]["POSITION"]]
            self.assertEqual(position["max"], [1, 2, 3])
            view = doc["bufferViews"][position["bufferView"]]
            points = np.frombuffer(binary, dtype="<f4", count=12, offset=view["byteOffset"]).reshape(-1, 3)
            self.assertGreater(np.cross(points[2]-points[0], points[1]-points[0])[1], 0)


class ZipCacheBoundary(unittest.TestCase):
    @staticmethod
    def archive(module, name, cache, payload=b"bounded test tile"):
        # Construct the wire bytes directly. Python ZipInfo normalizes Windows
        # backslashes, which would remove the malformed input before this gate.
        encoded = name.encode("utf-8")
        crc = zlib.crc32(payload)
        local = struct.pack("<4s5H3L2H", b"PK\x03\x04", 20, 2048, 0, 0, 0, crc, len(payload), len(payload), len(encoded), 0)+encoded+payload
        central = struct.pack("<4s6H3L5H2L", b"PK\x01\x02", 20, 20, 2048, 0, 0, 0, crc, len(payload), len(payload), len(encoded), 0, 0, 0, 0, 0, 0)+encoded
        data = local+central+struct.pack("<4s4H2LH", b"PK\x05\x06", 0, 0, 1, 1, len(central), len(local), 0)
        response = mock.MagicMock()
        response.__enter__.return_value.headers = {"Content-Length": str(len(data)), "ETag": '"test-md5"'}
        with mock.patch.object(module.urllib.request, "urlopen", return_value=response), mock.patch.object(module.RemoteZip, "range", lambda self, first, last: data[first:last+1]):
            return module.RemoteZip("https://example.invalid/test.zip", len(data), "test-md5", cache), data

    def test_actual_writer_accepts_a_canonical_confined_member(self):
        with tempfile.TemporaryDirectory(dir=ROOT / "data") as directory:
            cache = pathlib.Path(directory) / "cache"
            archive, data = self.archive(city, "tiles/data0.b3dm", cache)
            with mock.patch.object(archive, "range", lambda first, last: data[first:last+1]):
                self.assertEqual(archive.read("tiles/data0.b3dm"), b"bounded test tile")
            self.assertEqual((cache / "tiles/data0.b3dm").read_bytes(), b"bounded test tile")

    def test_malformed_names_are_rejected_before_actual_writer(self):
        with tempfile.TemporaryDirectory(dir=ROOT / "data") as directory:
            cache = pathlib.Path(directory) / "cache"
            names = ["C:/outside/tile.b3dm", "C:tile.b3dm", "/root/tile.b3dm", "//server/share/tile.b3dm", "tiles/file:stream", "tiles/../tile.b3dm", "tiles/./tile.b3dm", "tiles//tile.b3dm", "tiles\\tile.b3dm", "tiles/trailing. /tile.b3dm", "NUL/tile.b3dm"]
            for name in names:
                with self.subTest(name=name), self.assertRaisesRegex(ValueError, "canonical relative"):
                    self.archive(city, name, cache)
            self.assertFalse(cache.exists())

    def test_writer_rechecks_a_name_even_if_archive_admission_is_bypassed(self):
        with tempfile.TemporaryDirectory(dir=ROOT / "data") as directory:
            cache = pathlib.Path(directory) / "cache"
            outside = pathlib.Path(directory) / "outside.b3dm"
            name = outside.as_posix()  # Absolute Windows path, still task-owned.
            archive = city.RemoteZip.__new__(city.RemoteZip)
            archive.cache = cache
            archive.members = {name: city.ZipMember(name, 0, 0, 1, 1, 0)}
            with mock.patch.object(archive, "range", side_effect=AssertionError("Refused name must not reach acquisition")), self.assertRaisesRegex(ValueError, "canonical relative"):
                archive.read(name)
            self.assertFalse(outside.exists())

    def test_actual_writer_refuses_directory_junction_escape(self):
        with tempfile.TemporaryDirectory(dir=ROOT / "data") as directory:
            owned = pathlib.Path(directory)
            cache, outside = owned / "cache", owned / "outside"
            cache.mkdir()
            outside.mkdir()
            link = cache / "redirect"
            # Both junction and destination are inside this owned temporary
            # directory. This control never writes outside the workspace.
            if sys.platform == "win32":
                result = subprocess.run(["cmd", "/c", "mklink", "/J", str(link), str(outside)], capture_output=True, text=True, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
                self.assertEqual(result.returncode, 0, result.stderr)
            else:
                link.symlink_to(outside, target_is_directory=True)
            try:
                archive, data = self.archive(city, "redirect/tile.b3dm", cache)
                with mock.patch.object(archive, "range", lambda first, last: data[first:last+1]), self.assertRaisesRegex(ValueError, "symlink or reparse point"):
                    archive.read("redirect/tile.b3dm")
                self.assertFalse((outside / "tile.b3dm").exists())
            finally:
                link.rmdir() if sys.platform == "win32" else link.unlink()

    def test_existing_linked_file_is_refused_before_cache_read(self):
        with tempfile.TemporaryDirectory(dir=ROOT / "data") as directory:
            owned = pathlib.Path(directory)
            cache, outside = owned / "cache", owned / "outside"
            cache.mkdir()
            outside.mkdir()
            (outside / "tile.b3dm").write_bytes(b"outside cached bytes")
            link = cache / "redirect"
            if sys.platform == "win32":
                result = subprocess.run(["cmd", "/c", "mklink", "/J", str(link), str(outside)], capture_output=True, text=True, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
                self.assertEqual(result.returncode, 0, result.stderr)
            else:
                link.symlink_to(outside, target_is_directory=True)
            try:
                archive, _ = self.archive(city, "redirect/tile.b3dm", cache, b"outside cached bytes")
                with self.assertRaisesRegex(ValueError, "symlink or reparse point"):
                    archive.read("redirect/tile.b3dm")
            finally:
                link.rmdir() if sys.platform == "win32" else link.unlink()


class FreshSource(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        path = ROOT / "data/prepared/manifest.json"
        if not path.is_file():
            raise AssertionError("Fresh source-dependent checks require python tools/data/build_city.py --build; missing preparation is not a pass")
        cls.manifest = json.loads(path.read_text(encoding="utf-8"))

    def test_reviewed_source_pin_and_vertical_registration_bound(self):
        verification = self.manifest["source_verification"]
        self.assertEqual(verification["archive_length"], 637073925)
        self.assertEqual(verification["central_directory_sha256"], "fa60c015f0f5e6ba848def39025c4638aaaf7e1083d185a5e33c71b57647cd85")
        self.assertFalse(verification["full_archive_digest_measured"])
        vertical = self.manifest["vertical_reference"]
        self.assertGreater(vertical["road_samples"], 200)
        self.assertTrue(36 < vertical["estimated_local_geoid_offset_m"] < 37.5)
        low, high = vertical["road_minus_dem_p10_p90_m"]
        self.assertLess(high-low, .6)
        self.assertAlmostEqual(vertical["source_origin_ellipsoidal_m"]-vertical["gsi_origin_orthometric_m"], vertical["estimated_local_geoid_offset_m"], places=10)

    def test_every_selected_source_member_and_glb_bytes(self):
        for name, record in self.manifest["source_verification"]["members"].items():
            payload = (ROOT / "data/source/plateau" / name).read_bytes()
            self.assertEqual(hashlib.sha256(payload).hexdigest(), record["sha256"], name)
            import zlib
            self.assertEqual(f"{zlib.crc32(payload):08x}", record["zip_crc32"], name)
        for record in self.manifest["outputs"]:
            payload = (ROOT / record["path"]).read_bytes()
            self.assertEqual(len(payload), record["size"], record["path"])
            self.assertEqual(hashlib.sha256(payload).hexdigest(), record["sha256"], record["path"])
            city.read_glb(payload)

    def test_every_imported_vertex_inside_geographic_crop_and_texture_present(self):
        origin = self.manifest["origin"]
        center = np.array(city.ecef(origin["latitude"], origin["longitude"], origin["ellipsoidal_height_m"]))
        bounds = self.manifest["bounds"]
        textures = triangles = 0
        for record in self.manifest["outputs"]:
            doc, binary = city.read_glb((ROOT / record["path"]).read_bytes())
            for image in doc.get("images", []):
                view = doc["bufferViews"][image["bufferView"]]
                first = view.get("byteOffset", 0)
                self.assertIn(image["mimeType"], ("image/jpeg", "image/png"))
                textures += 1
            city.validate_native_textures(doc, binary)
            for mesh in doc["meshes"]:
                for primitive in mesh["primitives"]:
                    accessor = doc["accessors"][primitive["attributes"]["POSITION"]]
                    view = doc["bufferViews"][accessor["bufferView"]]
                    points = np.frombuffer(binary, dtype="<f4", count=accessor["count"]*3, offset=view["byteOffset"]).reshape(-1, 3)
                    self.assertTrue(np.all(np.isfinite(points)))
                    self.assertLess(float(np.max(np.abs(points))), 650)
                    geographic = city.geodetic(points @ city.local_basis() + center)
                    # Float32 local positions can move an exact border vertex by
                    # a few centimetres. This tolerance is at most0.02m in angle.
                    self.assertGreaterEqual(geographic[:, 0].min(), bounds["south"]-2e-7)
                    self.assertLessEqual(geographic[:, 0].max(), bounds["north"]+2e-7)
                    self.assertGreaterEqual(geographic[:, 1].min(), bounds["west"]-2e-7)
                    self.assertLessEqual(geographic[:, 1].max(), bounds["east"]+2e-7)
                    index = doc["accessors"][primitive["indices"]]
                    iview = doc["bufferViews"][index["bufferView"]]
                    faces = np.frombuffer(binary, dtype="<u4", count=index["count"], offset=iview["byteOffset"]).reshape(-1, 3)
                    self.assertLess(int(faces.max()), len(points))
                    triangles += len(faces)
        self.assertGreaterEqual(textures, 40)
        self.assertEqual(triangles, 468500)
        self.assertEqual(len(self.manifest["outputs"]), 70)

    def test_original_webp_only_control_is_rejected(self):
        control = ROOT / "data/validation/webp-only-control.glb"
        if not control.is_file():
            # The exact red control can be recreated from a fresh source tile's
            # original GLB. It is never downloaded implicitly by this check.
            original = next((ROOT / "data/source/plateau").glob("*lod2/data/data518.b3dm"))
            doc, binary, _ = city.unwrap_b3dm(original.read_bytes())
        else:
            payload = control.read_bytes()
            self.assertEqual(hashlib.sha256(payload).hexdigest(), "035ad8bef6e7d5458b854b9dd90691d3d8496dbf39f51f41a5073f43d20a3bea")
            doc, binary = city.read_glb(payload)
        with self.assertRaisesRegex(ValueError, "core glTF source index"):
            city.validate_native_textures(doc, binary)


if __name__ == "__main__":
    unittest.main()
