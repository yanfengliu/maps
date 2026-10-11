"""Fresh public-source acquisition and native GLB preparation; Python stdlib only.

No previous project assets or pipeline are inputs. Remote ZIP members are read by
validated HTTP byte ranges, checked against ZIP CRC32, and hashed in a manifest.
"""
from __future__ import annotations

import argparse
import hashlib
import datetime
import io
import json
import math
import pathlib
import stat
import struct
import sys
import subprocess
import concurrent.futures
import urllib.error
import urllib.request
import zlib
from dataclasses import dataclass

ROOT = pathlib.Path(__file__).resolve().parents[2]
CONFIG = json.loads((ROOT / "sources/shibuya.json").read_text(encoding="utf-8"))
sys.path.insert(0, str(ROOT / "data/runtime"))


def ecef(latitude: float, longitude: float, height: float = 0) -> tuple[float, float, float]:
    """WGS84 geodetic degrees and ellipsoidal metres to Earth-centred metres."""
    lat, lon = math.radians(latitude), math.radians(longitude)
    eccentricity2 = 6.6943799901413165e-3
    radius = 6378137 / math.sqrt(1 - eccentricity2 * math.sin(lat)**2)
    return ((radius + height) * math.cos(lat) * math.cos(lon),
            (radius + height) * math.cos(lat) * math.sin(lon),
            (radius * (1 - eccentricity2) + height) * math.sin(lat))


def geodetic(points):
    import numpy as np
    p = np.asarray(points, dtype=np.float64)
    a, b = 6378137., 6356752.314245179
    e2, ep2 = 1 - b*b/(a*a), a*a/(b*b) - 1
    rho = np.hypot(p[:, 0], p[:, 1])
    theta = np.arctan2(p[:, 2] * a, rho * b)
    lat = np.arctan2(p[:, 2] + ep2*b*np.sin(theta)**3, rho - e2*a*np.cos(theta)**3)
    lon = np.arctan2(p[:, 1], p[:, 0])
    radius = a / np.sqrt(1 - e2*np.sin(lat)**2)
    height = rho / np.cos(lat) - radius
    return np.column_stack((np.degrees(lat), np.degrees(lon), height))


def local_basis():
    import numpy as np
    lat = math.radians(CONFIG["origin"]["latitude"])
    lon = math.radians(CONFIG["origin"]["longitude"])
    # Rows are east, up, north. Swapping ENU -> EUN is a reflection.
    return np.array([[-math.sin(lon), math.cos(lon), 0],
                     [math.cos(lat)*math.cos(lon), math.cos(lat)*math.sin(lon), math.sin(lat)],
                     [-math.sin(lat)*math.cos(lon), -math.sin(lat)*math.sin(lon), math.cos(lat)]])


def localize(points, origin_height: float):
    import numpy as np
    origin = CONFIG["origin"]
    return (np.asarray(points, dtype=np.float64) - np.array(ecef(origin["latitude"], origin["longitude"], origin_height))) @ local_basis().T


def region_intersects(region, bounds: dict) -> bool:
    if len(region) != 6:
        raise ValueError("3D Tiles geographic region must have six values")
    west, south, east, north = (math.degrees(v) for v in region[:4])
    return west <= bounds["east"] and east >= bounds["west"] and south <= bounds["north"] and north >= bounds["south"]


def identity():
    import numpy as np
    return np.eye(4)


def tile_leaves(node, parent=None):
    import numpy as np
    transform = identity() if parent is None else parent
    if "transform" in node:
        transform = transform @ np.array(node["transform"]).reshape(4, 4, order="F")
    if not region_intersects(node["boundingVolume"]["region"], CONFIG["bounds"]):
        return
    if node.get("children"):
        for child in node["children"]:
            yield from tile_leaves(child, transform)
    elif "content" in node:
        yield node, transform


def unwrap_b3dm(data: bytes):
    if len(data) < 28:
        raise ValueError("Truncated b3dm header")
    magic, version, size, fj, fb, bj, bb = struct.unpack_from("<4s6I", data)
    if magic != b"b3dm" or version != 1 or size != len(data):
        raise ValueError("Invalid b3dm magic, version or declared length")
    feature = json.loads(data[28:28 + fj]) if fj else {}
    offset = 28 + fj + fb + bj + bb
    doc, binary = read_glb(data[offset:])
    return doc, binary, feature


def read_glb(data: bytes):
    if len(data) < 20 or struct.unpack_from("<4sII", data) != (b"glTF", 2, len(data)):
        raise ValueError("GLB must have a consistent glTF2 header")
    cursor, doc, binary = 12, None, None
    while cursor < len(data):
        size, kind = struct.unpack_from("<I4s", data, cursor)
        chunk = data[cursor + 8:cursor + 8 + size]
        if len(chunk) != size:
            raise ValueError("Truncated GLB chunk")
        if kind == b"JSON":
            doc = json.loads(chunk)
        elif kind == b"BIN\0":
            binary = chunk
        cursor += 8 + size
    if doc is None or binary is None or cursor != len(data):
        raise ValueError("GLB must contain JSON and binary chunks")
    return doc, binary


def source_primitives(doc, binary: bytes, feature: dict, tile_transform):
    """Decode all meshes with glTF node transforms and 3D Tiles Y-up conversion."""
    import numpy as np
    import DracoPy
    # Per the 3D Tiles1.0 glTF transform order: node, Y-up->Z-up, RTC, tile.
    conversion = np.array([[1, 0, 0, 0], [0, 0, -1, 0], [0, 1, 0, 0], [0, 0, 0, 1]], dtype=np.float64)
    rtc = feature.get("RTC_CENTER", doc.get("extensions", {}).get("CESIUM_RTC", {}).get("center", [0, 0, 0]))
    translation = identity()
    translation[:3, 3] = rtc
    world = tile_transform @ translation @ conversion

    def visit(index, parent):
        node = doc["nodes"][index]
        if "matrix" in node:
            transform = np.array(node["matrix"]).reshape(4, 4, order="F")
        else:
            transform = identity()
            if "rotation" in node:
                x, y, z, w = node["rotation"]
                transform[:3, :3] = [[1-2*y*y-2*z*z, 2*x*y-2*z*w, 2*x*z+2*y*w], [2*x*y+2*z*w, 1-2*x*x-2*z*z, 2*y*z-2*x*w], [2*x*z-2*y*w, 2*y*z+2*x*w, 1-2*x*x-2*y*y]]
            transform[:3, :3] *= np.array(node.get("scale", [1, 1, 1]))
            transform[:3, 3] = node.get("translation", [0, 0, 0])
        transform = parent @ transform
        if "mesh" in node:
            for primitive in doc["meshes"][node["mesh"]]["primitives"]:
                if primitive.get("mode", 4) != 4:
                    raise ValueError("Only triangle primitives are accepted for city import")
                draco = primitive.get("extensions", {}).get("KHR_draco_mesh_compression")
                if draco is None:
                    raise ValueError("Expected the reviewed Draco payload; unsupported encoding is refused")
                view = doc["bufferViews"][draco["bufferView"]]
                first = view.get("byteOffset", 0)
                mesh = DracoPy.decode(binary[first:first + view["byteLength"]])
                attrs = {key: mesh.get_attribute_by_unique_id(value)["data"] for key, value in draco["attributes"].items()}
                final = world @ transform
                points = np.asarray(attrs["POSITION"], dtype=np.float64)
                points = points @ final[:3, :3].T + final[:3, 3]
                attrs["POSITION"] = points
                if "NORMAL" in attrs:
                    normal = np.asarray(attrs["NORMAL"]) @ np.linalg.inv(final[:3, :3])
                    attrs["NORMAL"] = normal / np.maximum(np.linalg.norm(normal, axis=1)[:, None], 1e-20)
                yield attrs, np.asarray(mesh.faces), primitive.get("material", 0)
        for child in node.get("children", []):
            yield from visit(child, transform)

    for index in doc["scenes"][doc.get("scene", 0)]["nodes"]:
        yield from visit(index, identity())


class GlbWriter:
    def __init__(self):
        self.binary = bytearray()
        self.doc = {"asset": {"version": "2.0", "generator": "Fresh Shibuya2025 crop, build_city.py"}, "buffers": [{"byteLength": 0}], "bufferViews": [], "accessors": [], "meshes": [], "nodes": [], "scenes": [{"nodes": []}], "scene": 0}

    def view(self, data: bytes, target=None):
        self.binary.extend(b"\0" * (-len(self.binary) % 4))
        view = {"buffer": 0, "byteOffset": len(self.binary), "byteLength": len(data)}
        if target:
            view["target"] = target
        self.binary.extend(data)
        self.doc["bufferViews"].append(view)
        return len(self.doc["bufferViews"]) - 1

    def accessor(self, array, kind: str, indices=False):
        import numpy as np
        data = np.asarray(array, dtype="<u4" if indices else "<f4")
        accessor = {"bufferView": self.view(data.tobytes(), 34963 if indices else 34962), "componentType": 5125 if indices else 5126, "count": len(data), "type": kind}
        if kind == "VEC3":
            accessor["min"], accessor["max"] = data.min(axis=0).tolist(), data.max(axis=0).tolist()
        self.doc["accessors"].append(accessor)
        return len(self.doc["accessors"]) - 1

    def material_source(self, source, binary):
        import copy
        from PIL import Image
        for key in ("materials", "textures", "samplers"):
            if key in source:
                self.doc[key] = copy.deepcopy(source[key])
        self.doc["images"] = []
        for item in source.get("images", []):
            if "bufferView" not in item:
                raise ValueError("External image URIs need explicit validated acquisition")
            view = source["bufferViews"][item["bufferView"]]
            first = view.get("byteOffset", 0)
            original = binary[first:first + view["byteLength"]]
            # UE5.8 Interchange rejected PLATEAU EXT_texture_webp. Normalize the
            # image and core texture source, preserving alpha and original UVs.
            if item["mimeType"] not in ("image/jpeg", "image/png"):
                photo = Image.open(io.BytesIO(original))
                if photo.width > 8192 or photo.height > 8192:
                    raise ValueError("PLATEAU source image exceeds the reviewed8192px bound")
                converted = io.BytesIO()
                photo.convert("RGBA" if "A" in photo.getbands() else "RGB").save(converted, format="PNG")
                original, mime_type = converted.getvalue(), "image/png"
            else:
                mime_type = item["mimeType"]
            self.doc["images"].append({"bufferView": self.view(original), "mimeType": mime_type})
        for texture in self.doc.get("textures", []):
            extension = texture.pop("extensions", {})
            if "source" not in texture:
                if "EXT_texture_webp" not in extension:
                    raise ValueError("Source texture lacks a supported core image or WebP source")
                texture["source"] = extension["EXT_texture_webp"]["source"]
        # Photographs contain baked illumination; do not make untextured walls glossy.
        for material in self.doc.get("materials", []):
            material.setdefault("pbrMetallicRoughness", {}).update({"roughnessFactor": .9, "metallicFactor": 0})

    def primitive(self, attrs, faces, material=0, name="City"):
        if len(faces) == 0:
            return
        primitive = {"attributes": {}, "indices": self.accessor(faces.reshape(-1), "SCALAR", True), "material": material, "mode": 4}
        for key, array in attrs.items():
            if key == "POSITION" or key == "NORMAL" or key.startswith("TEXCOORD_") or key.startswith("COLOR_"):
                kind = "VEC" + str(array.shape[1])
                primitive["attributes"][key] = self.accessor(array, kind)
        self.doc["meshes"].append({"name": name, "primitives": [primitive]})
        self.doc["nodes"].append({"name": name, "mesh": len(self.doc["meshes"]) - 1})
        self.doc["scenes"][0]["nodes"].append(len(self.doc["nodes"]) - 1)

    def save(self, path):
        validate_native_textures(self.doc, self.binary)
        self.doc["buffers"][0]["byteLength"] = len(self.binary)
        encoded = json.dumps(self.doc, separators=(",", ":")).encode("utf-8")
        encoded += b" " * (-len(encoded) % 4)
        self.binary.extend(b"\0" * (-len(self.binary) % 4))
        size = 28 + len(encoded) + len(self.binary)
        data = struct.pack("<4sII", b"glTF", 2, size) + struct.pack("<I4s", len(encoded), b"JSON") + encoded + struct.pack("<I4s", len(self.binary), b"BIN\0") + self.binary
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        return {"path": str(path.relative_to(ROOT)).replace("\\", "/"), "size": len(data), "sha256": hashlib.sha256(data).hexdigest(), "meshes": len(self.doc["meshes"]), "textures": len(self.doc.get("images", []))}


def validate_native_textures(doc, binary):
    """Bound: UE5.8 core glTF image/source schema, not the rendered photo result."""
    for texture in doc.get("textures", []):
        if "source" not in texture or not isinstance(texture["source"], int) or not 0 <= texture["source"] < len(doc.get("images", [])) or "EXT_texture_webp" in texture.get("extensions", {}):
            raise ValueError("Unreal5.8 texture requires a core glTF source index with JPEG/PNG image; EXT_texture_webp alone was observed to import zero textures")
    for item in doc.get("images", []):
        view = doc["bufferViews"][item["bufferView"]]
        first = view.get("byteOffset", 0)
        payload = binary[first:first + view["byteLength"]]
        valid = (item["mimeType"] == "image/jpeg" and payload.startswith(b"\xff\xd8")) or (item["mimeType"] == "image/png" and payload.startswith(b"\x89PNG\r\n\x1a\n"))
        if not valid:
            raise ValueError("Unreal5.8 photo texture must contain JPEG/PNG bytes matching its core image MIME type")


def convert_tile(data, transform, output, origin_height):
    import numpy as np
    doc, binary, feature = unwrap_b3dm(data)
    writer = GlbWriter()
    writer.material_source(doc, binary)
    total_vertices = total_triangles = source_triangles = 0
    minima, maxima = [], []
    for attrs, faces, material in source_primitives(doc, binary, feature, transform):
        source_triangles += len(faces)
        source_points = attrs["POSITION"]
        coordinate = geodetic(source_points)
        bounds = CONFIG["bounds"]
        inside = (coordinate[:, 0] >= bounds["south"]) & (coordinate[:, 0] <= bounds["north"]) & (coordinate[:, 1] >= bounds["west"]) & (coordinate[:, 1] <= bounds["east"])
        # Preserve every complete source triangle inside the exact lat/lon crop.
        # Triangles crossing the outer border are excluded, never imported outside it.
        faces = faces[np.all(inside[faces], axis=1)]
        if not len(faces):
            continue
        used, remapped = np.unique(faces, return_inverse=True)
        attrs = {key: np.asarray(value)[used] for key, value in attrs.items()}
        attrs["POSITION"] = localize(attrs["POSITION"], origin_height)
        if "NORMAL" in attrs:
            attrs["NORMAL"] = attrs["NORMAL"] @ local_basis().T
        faces = remapped.reshape(-1, 3)[:, [0, 2, 1]]  # EUN reflection reverses triangle winding.
        writer.primitive(attrs, faces, material)
        total_vertices += len(used)
        total_triangles += len(faces)
        minima.append(attrs["POSITION"].min(axis=0))
        maxima.append(attrs["POSITION"].max(axis=0))
    if not total_triangles:
        return None
    record = writer.save(output)
    record.update({"vertices": total_vertices, "triangles": total_triangles, "source_triangles": source_triangles, "triangles_omitted_at_crop": source_triangles-total_triangles, "bounds_glb_m": [np.min(minima, axis=0).tolist(), np.max(maxima, axis=0).tolist()]})
    return record


def tile_xy(latitude: float, longitude: float, zoom: int):
    scale = 2**zoom
    return ((longitude + 180) / 360 * scale,
            (1 - math.asinh(math.tan(math.radians(latitude))) / math.pi) / 2 * scale)


def fetch_url(url: str, path: pathlib.Path, records: dict, max_bytes=5_000_000):
    if path.is_file():
        payload = path.read_bytes()
    else:
        if urllib.parse.urlsplit(url).hostname == "cyberjapandata.gsi.go.jp":
            # .NET transport is used because this machine's OpenSSL connection
            # to GSI is reset. Certificate validation is preserved by HttpClient.
            result = subprocess.run(["pwsh", "-NoProfile", "-NonInteractive", "-File", str(ROOT / "tools/data/fetch_gsi.ps1"), "-Uri", url, "-Destination", str(path)], capture_output=True, text=True, timeout=55, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
            if result.returncode:
                raise ValueError(f"GSI tile request failed for {url}: {result.stderr.strip()}")
            payload = path.read_bytes()
        else:
            with urllib.request.urlopen(url, timeout=60) as response:
                payload = response.read(max_bytes + 1)
        if len(payload) > max_bytes:
            raise ValueError(f"Public-source response exceeds its acquisition bound: {url}")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(payload)
    records[url] = {"path": str(path.relative_to(ROOT)).replace("\\", "/"), "size": len(payload), "sha256": hashlib.sha256(payload).hexdigest()}
    return payload


class Elevation:
    def __init__(self, records):
        import numpy as np
        self.tiles = {}
        self.zoom = 15
        bounds = CONFIG["bounds"]
        west, north = tile_xy(bounds["north"], bounds["west"], self.zoom)
        east, south = tile_xy(bounds["south"], bounds["east"], self.zoom)
        for x in range(math.floor(west), math.floor(east)+1):
            for y in range(math.floor(north), math.floor(south)+1):
                # This crop uses verified DEM5A inputs. Missing or failed tiles
                # stop preparation explicitly; no alternate DEM is advertised.
                url = CONFIG["gsi"]["dem"].format(z=self.zoom, x=x, y=y)
                payload = fetch_url(url, ROOT / f"data/source/gsi/dem/15/{x}/{y}.txt", records)
                values = [float(value) if value != "e" else float("nan") for value in payload.decode("utf-8").strip().replace("\n", ",").replace("\r", "").split(",")]
                grid = np.array(values).reshape(256, 256)
                if not np.all(np.isfinite(grid)):
                    raise ValueError(f"DEM missing heights in crop source tile: {url}")
                self.tiles[(x, y)] = grid

    def sample(self, latitude, longitude):
        x, y = tile_xy(float(latitude), float(longitude), self.zoom)
        px, py = x*256 - .5, y*256 - .5
        ix, iy = math.floor(px), math.floor(py)
        fx, fy = px-ix, py-iy
        def value(dx, dy):
            gx, gy = ix+dx, iy+dy
            return float(self.tiles[(gx//256, gy//256)][gy % 256, gx % 256])
        return value(0, 0)*(1-fx)*(1-fy) + value(1, 0)*fx*(1-fy) + value(0, 1)*(1-fx)*fy + value(1, 1)*fx*fy


def build_terrain(elevation: Elevation, geoid_offset: float, origin_height: float, records: dict):
    import numpy as np
    from PIL import Image
    zoom = 18
    bounds = CONFIG["bounds"]
    west, north = tile_xy(bounds["north"], bounds["west"], zoom)
    east, south = tile_xy(bounds["south"], bounds["east"], zoom)
    x0, y0 = math.floor(west), math.floor(north)
    x1, y1 = math.floor(east), math.floor(south)
    image = Image.new("RGB", ((x1-x0+1)*256, (y1-y0+1)*256))
    imagery_error = None
    encoded = io.BytesIO()
    def imagery_tile(pair):
        x, y = pair
        url = CONFIG["gsi"]["imagery"].format(z=zoom, x=x, y=y)
        payload = fetch_url(url, ROOT / f"data/source/gsi/imagery/{zoom}/{x}/{y}.jpg", records)
        tile = Image.open(io.BytesIO(payload))
        if tile.size != (256, 256):
            raise ValueError(f"GSI image tile must be256x256: {url}")
        return x, y, tile
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=4)
    futures = []
    try:
        # One control tile first. Avoid scheduling many requests against a broken
        # source endpoint. Failure leaves a declared neutral real-height terrain.
        x, y, tile = imagery_tile((x0, y0))
        image.paste(tile, (0, 0))
        pairs = [(x, y) for x in range(x0, x1+1) for y in range(y0, y1+1) if (x, y) != (x0, y0)]
        futures = [executor.submit(imagery_tile, pair) for pair in pairs]
        for future in concurrent.futures.as_completed(futures):
            x, y, tile = future.result()
            image.paste(tile, ((x-x0)*256, (y-y0)*256))
        image.save(encoded, format="JPEG", quality=95)
    except (ValueError, urllib.error.URLError, subprocess.TimeoutExpired) as error:
        imagery_error = str(error)
        for future in futures:
            future.cancel()
        print(f"Aerial imagery unavailable; real-height terrain uses neutral material: {imagery_error}", flush=True)
    finally:
        executor.shutdown(wait=True, cancel_futures=True)
    n = 201
    positions, texcoords = [], []
    for row in range(n):
        latitude = bounds["south"] + (bounds["north"]-bounds["south"])*row/(n-1)
        for col in range(n):
            longitude = bounds["west"] + (bounds["east"]-bounds["west"])*col/(n-1)
            height = elevation.sample(latitude, longitude)
            positions.append(ecef(latitude, longitude, height+geoid_offset))
            tx, ty = tile_xy(latitude, longitude, zoom)
            texcoords.append(((tx-x0)/(x1-x0+1), (ty-y0)/(y1-y0+1)))
    points = localize(positions, origin_height)
    faces = []
    for row in range(n-1):
        for col in range(n-1):
            a = row*n+col
            faces.extend(((a, a+n, a+1), (a+1, a+n, a+n+1)))
    faces = np.array(faces)
    normals = np.zeros_like(points)
    for face in faces:
        normal = np.cross(points[face[1]]-points[face[0]], points[face[2]]-points[face[0]])
        normals[face] += normal
    normals /= np.linalg.norm(normals, axis=1)[:, None]
    if np.median(normals[:, 1]) < .9:
        raise ValueError("Terrain triangles must face up in the GLB Y-up frame")
    writer = GlbWriter()
    if imagery_error is None:
        writer.doc["images"] = [{"bufferView": writer.view(encoded.getvalue()), "mimeType": "image/jpeg"}]
        writer.doc["textures"] = [{"source": 0}]
        writer.doc["materials"] = [{"name": "GSI aerial ground", "pbrMetallicRoughness": {"baseColorTexture": {"index": 0}, "roughnessFactor": 1, "metallicFactor": 0}}]
    else:
        writer.doc["materials"] = [{"name": "Neutral real-height ground", "pbrMetallicRoughness": {"baseColorFactor": [.24, .25, .22, 1], "roughnessFactor": 1, "metallicFactor": 0}}]
    writer.primitive({"POSITION": points, "NORMAL": normals, "TEXCOORD_0": np.array(texcoords)}, faces, name="GSI terrain")
    record = writer.save(ROOT / "data/prepared/terrain.glb")
    record.update({"kind": "terrain", "vertices": len(points), "triangles": len(faces), "bounds_glb_m": [points.min(axis=0).tolist(), points.max(axis=0).tolist()], "dem_zoom": 15, "imagery_zoom": zoom if imagery_error is None else None, "imagery_pixels": image.size if imagery_error is None else None, "imagery_error": imagery_error})
    return record


def prepare_city(archive, tilesets):
    import numpy as np
    records = {}
    elevation = Elevation(records)
    selections = []
    for name in tilesets:
        if ("_bldg_" in name and "_lod2/" in name) or "_tran_" in name:
            kind = "buildings" if "_bldg_" in name else "roads"
            document = json.loads(archive.read(name))
            for node, transform in tile_leaves(document["root"]):
                uri = node["content"]["uri"]
                member = str(pathlib.PurePosixPath(name).parent / uri)
                selections.append((kind, member, node, transform))
    def acquire(selection):
        return selection, archive.read(selection[1])
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        acquired = list(executor.map(acquire, selections))
    print(f"Fetched {len(acquired)} final-detail building/road members; byte ranges received {archive.received:,}", flush=True)
    # Infer one local geoid offset from actual road height minus GSI orthometric DEM.
    # No claim of survey-grade vertical registration is made.
    offsets = []
    for selection, payload in acquired:
        kind, _, _, transform = selection
        if kind != "roads":
            continue
        doc, binary, feature = unwrap_b3dm(payload)
        for attrs, _, _ in source_primitives(doc, binary, feature, transform):
            coordinates = geodetic(attrs["POSITION"])
            for latitude, longitude, height in coordinates[::max(1, len(coordinates)//100)]:
                if 35.6575 <= latitude <= 35.6615 and 139.6985 <= longitude <= 139.7025:
                    offsets.append(height-elevation.sample(latitude, longitude))
    if len(offsets) < 10:
        raise ValueError("Not enough source road samples to reconcile ellipsoidal and DEM height")
    offset = float(np.median(offsets))
    ground_height = elevation.sample(CONFIG["origin"]["latitude"], CONFIG["origin"]["longitude"])
    origin_height = ground_height + offset
    outputs = []
    source_triangles = 0
    omitted_members = []
    for index, (selection, payload) in enumerate(acquired):
        kind, member, node, transform = selection
        document, _, _ = unwrap_b3dm(payload)
        member_triangles = sum(document["accessors"][primitive["indices"]]["count"]//3 for mesh in document["meshes"] for primitive in mesh["primitives"])
        source_triangles += member_triangles
        stem = pathlib.PurePosixPath(member).stem
        record = convert_tile(payload, transform, ROOT / f"data/prepared/{kind}/{stem}.glb", origin_height)
        if record:
            record.update({"kind": kind, "source_member": member, "source_region": node["boundingVolume"]["region"]})
            outputs.append(record)
        else:
            omitted_members.append({"source_member": member, "source_triangles": member_triangles, "reason": "No complete triangle lies inside the geographic crop"})
        if index % 10 == 0:
            print(f"Converted {index+1}/{len(acquired)} source members", flush=True)
    outputs.append(build_terrain(elevation, offset, origin_height, records))
    manifest = {"schema": 1, "built_utc": datetime.datetime.now(datetime.timezone.utc).isoformat(), "contract": CONFIG,
                "vertical_reference": {"gsi_origin_orthometric_m": ground_height, "source_origin_ellipsoidal_m": origin_height, "estimated_local_geoid_offset_m": offset, "road_samples": len(offsets), "road_minus_dem_p10_p90_m": np.percentile(offsets, [10, 90]).tolist(), "method": "Median PLATEAU road ellipsoidal height minus bilinear GSI DEM within400m crossing vicinity; approximate local vertical registration, not survey-grade"},
                "source_verification": {"archive_length": archive.length, "published_md5_etag": CONFIG["plateau"]["md5"], "full_archive_digest_measured": False, "central_directory_sha256": archive.directory_sha256, "range_bytes_received_this_run": archive.received, "selected_members_uncompressed_bytes": sum(r["size"] for r in archive.records.values()), "selected_members_zip_compressed_bytes": sum(archive.members[name].compressed for name in archive.records), "network_byte_scope": "This invocation only; cached members add zero network bytes. Distinct selected member byte totals are reported separately; the complete archive was not downloaded.", "members": dict(sorted(archive.records.items())), "additional_sources": records},
                "crop": "Geographic tile intersection then preserve complete triangles whose every vertex lies inside the exact latitude/longitude AOI. Border-crossing triangles are omitted. Terrain exactly spans AOI.",
                "crop_omissions": {"selected_source_members": len(acquired), "source_triangles": source_triangles, "preserved_source_triangles": sum(o["triangles"] for o in outputs if o["kind"] != "terrain"), "omitted_triangles": source_triangles-sum(o["triangles"] for o in outputs if o["kind"] != "terrain"), "empty_members": omitted_members},
                "origin": {**CONFIG["origin"], "ellipsoidal_height_m": origin_height},
                "axis": CONFIG["frame"], "bounds": CONFIG["bounds"],
                "glbs": [{"path": output["path"], "sha256": output["sha256"]} for output in outputs],
                "outputs": outputs,
                "totals": {"assets": len(outputs), "vertices": sum(o["vertices"] for o in outputs), "triangles": sum(o["triangles"] for o in outputs), "textures": sum(o["textures"] for o in outputs), "bytes": sum(o["size"] for o in outputs)}}
    target = ROOT / "data/prepared/manifest.json"
    target.write_text(json.dumps(manifest, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({"manifest": str(target), "vertical": manifest["vertical_reference"], "totals": manifest["totals"]}, indent=2), flush=True)


@dataclass(frozen=True)
class ZipMember:
    name: str
    method: int
    crc: int
    compressed: int
    size: int
    offset: int


def zip_member_parts(name: str, allow_directory=False):
    """Admit canonical relative ZIP names under Windows filesystem semantics."""
    windows = pathlib.PureWindowsPath(name)
    relative = name[:-1] if allow_directory and name.endswith("/") else name
    parts = relative.split("/")
    reserved = {"CON", "PRN", "AUX", "NUL", "CONIN$", "CONOUT$"}
    reserved.update(prefix + digit for prefix in ("COM", "LPT") for digit in "123456789¹²³")
    invalid = (not relative or windows.drive or windows.root or "\\" in name or ":" in name
               or any(part in ("", ".", "..") or part.endswith((".", " "))
                      or part.split(".")[0].rstrip(" ").upper() in reserved
                      or any(ord(character) < 32 or character in '<>"|?*' for character in part)
                      for part in parts))
    if invalid:
        raise ValueError(f"ZIP member must be a canonical relative Windows-safe path without drives, traversal or alternate streams: {name!r}")
    return parts


def zip_cache_target(cache: pathlib.Path, name: str):
    """Check the actual cache read/write boundary, including existing reparse paths."""
    parts = zip_member_parts(name)
    root = cache.absolute()
    target = root.joinpath(*parts)
    # Refuse symlinks/junctions rather than accepting an apparently confined
    # lexical path whose parent or final file redirects the read/write.
    for candidate in (target, *target.parents):
        try:
            attributes = candidate.lstat()
        except FileNotFoundError:
            continue
        if stat.S_ISLNK(attributes.st_mode) or getattr(attributes, "st_file_attributes", 0) & getattr(stat, "FILE_ATTRIBUTE_REPARSE_POINT", 0x400):
            raise ValueError(f"ZIP cache path contains a symlink or reparse point: {candidate}")
    if root.resolve(strict=False) != root or not target.resolve(strict=False).is_relative_to(root):
        raise ValueError(f"ZIP member resolves outside its declared cache directory: {name!r}")
    return target


class RemoteZip:
    """Small central directory and selected members; never silently download all."""
    def __init__(self, url: str, length: int, expected_md5: str, cache: pathlib.Path):
        self.url, self.length, self.cache = url, length, cache
        self.received = 0
        self.records: dict[str, dict] = {}
        request = urllib.request.Request(url, method="HEAD")
        with urllib.request.urlopen(request, timeout=30) as response:
            if int(response.headers["Content-Length"]) != length:
                raise ValueError("PLATEAU archive length differs from the reviewed source contract")
            if response.headers.get("ETag", "").strip('"') != expected_md5:
                raise ValueError("PLATEAU published archive MD5/ETag differs from the reviewed source contract")
            self.headers = dict(response.headers)
        tail = self.range(max(0, length - 65557), length - 1)
        end = tail.rfind(b"PK\x05\x06")
        if end < 0:
            raise ValueError("ZIP end of central directory was not found")
        eocd = struct.unpack_from("<4s4H2LH", tail, end)
        if eocd[1] or eocd[2] or eocd[3] != eocd[4]:
            raise ValueError("Multi-disk ZIP is unsupported")
        count, directory_size, directory_offset = eocd[4:7]
        if count == 65535 or directory_size == 0xFFFFFFFF:
            raise ValueError("ZIP64 must be handled explicitly before acquisition")
        directory = self.range(directory_offset, directory_offset + directory_size - 1)
        self.directory_sha256 = hashlib.sha256(directory).hexdigest()
        self.members: dict[str, ZipMember] = {}
        cursor = 0
        for _ in range(count):
            fields = struct.unpack_from("<4s6H3L5H2L", directory, cursor)
            if fields[0] != b"PK\x01\x02":
                raise ValueError("Invalid ZIP central-directory record")
            _, _, _, flags, method, _, _, crc, compressed, size, name_len, extra_len, comment_len, _, _, _, offset = fields
            if flags & 1 or method not in (0, 8):
                raise ValueError("Encrypted or unsupported ZIP member")
            name = directory[cursor + 46:cursor + 46 + name_len].decode("utf-8" if flags & 2048 else "cp437")
            zip_member_parts(name, allow_directory=True)
            self.members[name] = ZipMember(name, method, crc, compressed, size, offset)
            cursor += 46 + name_len + extra_len + comment_len
        if cursor != len(directory):
            raise ValueError("ZIP central-directory byte count is inconsistent")

    def range(self, first: int, last: int) -> bytes:
        if first < 0 or last < first or last >= self.length or last - first > 700_000_000:
            raise ValueError("Requested source range is out of bounds")
        request = urllib.request.Request(self.url, headers={"Range": f"bytes={first}-{last}", "Accept-Encoding": "identity"})
        with urllib.request.urlopen(request, timeout=60) as response:
            if response.status != 206 or response.headers.get("Content-Range") != f"bytes {first}-{last}/{self.length}":
                raise ValueError("Source server did not honor the bounded byte range")
            data = response.read(last - first + 2)
        if len(data) != last - first + 1:
            raise ValueError("Source range returned an unexpected number of bytes")
        self.received += len(data)
        return data

    def read(self, name: str) -> bytes:
        target = zip_cache_target(self.cache, name)
        member = self.members[name]
        if target.is_file():
            data = target.read_bytes()
        else:
            header = self.range(member.offset, member.offset + 29)
            if header[:4] != b"PK\x03\x04":
                raise ValueError(f"Invalid ZIP local header: {name}")
            name_len, extra_len = struct.unpack_from("<HH", header, 26)
            start = member.offset + 30 + name_len + extra_len
            payload = self.range(start, start + member.compressed - 1)
            data = payload if member.method == 0 else zlib.decompress(payload, -15)
            target.parent.mkdir(parents=True, exist_ok=True)
            target = zip_cache_target(self.cache, name)
            target.write_bytes(data)
        if len(data) != member.size or zlib.crc32(data) != member.crc:
            raise ValueError(f"Source member failed ZIP size/CRC verification: {name}")
        self.records[name] = {"size": len(data), "sha256": hashlib.sha256(data).hexdigest(), "zip_crc32": f"{member.crc:08x}"}
        return data


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--inspect", action="store_true", help="Fetch only ZIP index and tileset metadata")
    parser.add_argument("--sample", action="store_true", help="Prepare one fresh crossing GLB with provisional vertical datum")
    parser.add_argument("--build", action="store_true", help="Fetch and prepare the complete fresh geographic crop")
    args = parser.parse_args()
    source = CONFIG["plateau"]
    archive = RemoteZip(source["archive"], source["length"], source["md5"], ROOT / "data/source/plateau")
    tilesets = [name for name in archive.members if name.endswith("tileset.json")]
    if args.build:
        prepare_city(archive, tilesets)
        return
    print(json.dumps({"members": len(archive.members), "directory_sha256": archive.directory_sha256, "tilesets": tilesets}, indent=2))
    for name in tilesets:
        if ("_bldg_" in name and "_lod2/" in name) or "_tran_" in name:
            data = json.loads(archive.read(name))
            leaves = list(tile_leaves(data["root"]))
            print(name, "selected_leaves", len(leaves))
            if args.sample and "_bldg_" in name:
                def distance(item):
                    r = item[0]["boundingVolume"]["region"]
                    return (math.degrees((r[0]+r[2])/2)-CONFIG["origin"]["longitude"])**2 + (math.degrees((r[1]+r[3])/2)-CONFIG["origin"]["latitude"])**2
                node, transform = min(leaves, key=distance)
                member = str(pathlib.PurePosixPath(name).parent / node["content"]["uri"])
                payload = archive.read(member)
                record = convert_tile(payload, transform, ROOT / "data/prepared/sample-crossing.glb", 52.0)
                print("SAMPLE", json.dumps(record))
    print("bytes_received", archive.received)


if __name__ == "__main__":
    main()
