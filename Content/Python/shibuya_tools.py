"""Small project toolset. Calls are dispatched by native MCP on the editor thread."""
from collections import Counter
import hashlib
import json
import math
from pathlib import Path
import re
import stat
import struct
import uuid
import zlib

import unreal
import toolset_registry
from toolset_registry.registration import Registration


PROJECT = Path(unreal.Paths.project_dir()).resolve()
MAP = "/Game/Maps/Shibuya"
_capture = None
_support_update = None
_support_completed = None
_native_import_receipts = {}


def _native_frame_record():
    return {"schema_version": 1, "id": "native-centimetres-Xeast-Ysouth-Zup-v2",
            "definition_sha256": "2099342528416aa9dcdceea63e6d2604974341d8248f3b1c7ccf287008759170"}


def _require_native_frame(packet, label):
    marker = packet.get("native_frame") if isinstance(packet, dict) else None
    if not isinstance(marker, dict) or set(marker) != {"schema_version", "id", "definition_sha256"} or type(marker.get("schema_version")) is not int or marker != _native_frame_record():
        raise RuntimeError(f"DID_NOT_RUN: {label} requires the exact sealed ESU native_frame; missing, old or mixed frames cannot enter the current runtime.")


def _source_to_native_cm(point):
    if len(point) != 3 or any(type(v) not in (int, float) or not math.isfinite(v) for v in point):
        raise RuntimeError("Source/native conversion requires a finite ENU metre triple.")
    result = [point[0]*100, -point[1]*100, point[2]*100]
    if not all(math.isfinite(v) for v in result):
        raise RuntimeError("Source/native conversion exceeds finite ESU centimetres.")
    return result


def _native_to_source_m(point):
    if len(point) != 3 or any(type(v) not in (int, float) or not math.isfinite(v) for v in point):
        raise RuntimeError("Native/source conversion requires a finite ESU centimetre triple.")
    return [point[0]/100, -point[1]/100, point[2]/100]


def _source_normal_to_native(normal):
    return [normal[0], -normal[1], normal[2]]


def _native_actor_tag():
    frame = _native_frame_record()
    return "ShibuyaNativeFrame:"+frame["id"]+":"+frame["definition_sha256"]


def _native_scene_frame(require=False):
    actors = [actor for actor in _actors().get_all_level_actors() if isinstance(actor, unreal.StaticMeshActor) and actor.actor_has_tag("ShibuyaSource")]
    wrong = []
    for actor in actors:
        markers = [str(tag) for tag in actor.tags if str(tag).startswith("ShibuyaNativeFrame:")]
        if markers != [_native_actor_tag()]: wrong.append(actor.get_actor_label())
    admitted = len(actors) == 112 and not wrong and len({actor.get_actor_label() for actor in actors}) == 112
    result = {"admitted": admitted, "source_actor_count": len(actors), "invalid_actor_labels": wrong,
              "native_frame": _native_frame_record() if admitted else None}
    if require and not admitted:
        raise RuntimeError("DID_NOT_RUN: native map requires112 unique ShibuyaSource actors with exactly one current ESU frame tag each; reimport the converted source geometry before current native operations: "+json.dumps(result, sort_keys=True))
    return result


def _native_glb_derivative(payload):
    """Bake the ONE raw EUN->EUS reflection plus final corner021 for UE import.

    Original BIN bytes remain verbatim. New attribute/index accessors append to
    it; images, UVs, materials, source names and primitive IDs are untouched.
    This verifies authored bytes, not native importer equivalence or appearance.
    """
    if len(payload) < 28 or len(payload) > 256*1024*1024 or struct.unpack_from("<4sII", payload) != (b"glTF", 2, len(payload)):
        raise RuntimeError("Native frame derivative requires a complete GLB2 within256MiB.")
    count, kind = struct.unpack_from("<II", payload, 12)
    if kind != 0x4E4F534A or 28+count > len(payload):
        raise RuntimeError("Native frame derivative requires a JSON then BIN GLB.")
    doc = json.loads(payload[20:20+count])
    size, kind = struct.unpack_from("<II", payload, 20+count)
    binary = bytearray(payload[28+count:])
    if kind != 0x004E4942 or size != len(binary) or len(doc.get("buffers", [])) != 1 or "uri" in doc["buffers"][0] or doc["buffers"][0]["byteLength"] > len(binary):
        raise RuntimeError("Native frame derivative requires one embedded complete BIN buffer.")
    if "shibuya_native_frame" in doc.get("asset", {}).get("extras", {}):
        raise RuntimeError("Native frame derivative refuses an already framed input; supply immutable raw EUN source to avoid a second reflection.")
    meshes, nodes = doc.get("meshes", []), doc.get("nodes", [])
    if not meshes or len(nodes) != len(meshes) or sorted(node.get("mesh", -1) for node in nodes) != list(range(len(meshes))) or any(set(node)-{"name", "mesh", "extras"} for node in nodes):
        raise RuntimeError("Native frame derivative requires each baked source mesh node once without transforms, children or instances.")
    if any("uri" in image or "bufferView" not in image for image in doc.get("images", [])):
        raise RuntimeError("Native frame derivative requires embedded images; external image references cannot be silently relocated.")
    cache, observations = {}, []
    def converted(index, semantic):
        key = (index, semantic)
        if key in cache: return cache[key]
        accessor = doc["accessors"][index]
        components = {"POSITION": 3, "NORMAL": 3, "TANGENT": 4, "indices": 1}[semantic]
        component = accessor["componentType"]
        if "sparse" in accessor or accessor.get("normalized", False) or accessor["type"] != ("SCALAR" if semantic == "indices" else "VEC"+str(components)) or component not in ((5121, 5123, 5125) if semantic == "indices" else (5126,)):
            raise RuntimeError(f"Native frame derivative cannot convert accessor{index} {semantic}: require finite float vectors or unsigned scalar triangle indices without sparse/normalized data.")
        fmt = {5121:"B", 5123:"H", 5125:"I", 5126:"f"}[component]
        width = struct.calcsize("<"+fmt)*components
        view = doc["bufferViews"][accessor["bufferView"]]
        start = view.get("byteOffset", 0)+accessor.get("byteOffset", 0)
        stride = view.get("byteStride", width)
        number = accessor["count"]
        if type(number) is not int or not 1 <= number <= 6_000_000 or view.get("buffer", 0) != 0 or stride < width or start < view.get("byteOffset", 0) or start+(number-1)*stride+width > view.get("byteOffset", 0)+view["byteLength"] or start+(number-1)*stride+width > size:
            raise RuntimeError(f"Native frame derivative accessor{index} {semantic} is out of its bounded buffer view.")
        output = bytearray()
        low, high = [math.inf]*components, [-math.inf]*components
        if semantic == "indices":
            if number % 3: raise RuntimeError("Native frame derivative requires complete triangle indices.")
            for i in range(0, number, 3):
                values = [struct.unpack_from("<"+fmt, binary, start+(i+j)*stride)[0] for j in (0,2,1)]
                output.extend(struct.pack("<"+fmt*3, *values))
        else:
            for i in range(number):
                row = list(struct.unpack_from("<"+fmt*components, binary, start+i*stride))
                if not all(math.isfinite(v) for v in row):
                    raise RuntimeError(f"Native frame derivative accessor{index} {semantic} contains nonfinite data.")
                row[2] = -row[2]
                if semantic == "TANGENT": row[3] = -row[3]
                for axis,value in enumerate(row):
                    low[axis] = min(low[axis], value); high[axis] = max(high[axis], value)
                output.extend(struct.pack("<"+fmt*components, *row))
        binary.extend(b"\0"*(-len(binary)%4))
        offset = len(binary)
        binary.extend(output)
        new_view = {"buffer":0, "byteOffset":offset, "byteLength":number*width}
        if "target" in view: new_view["target"] = view["target"]
        doc["bufferViews"].append(new_view)
        replacement = {k:v for k,v in accessor.items() if k not in ("bufferView", "byteOffset", "min", "max")}
        replacement["bufferView"] = len(doc["bufferViews"])-1
        if semantic != "indices":
            replacement["min"] = low
            replacement["max"] = high
        doc["accessors"].append(replacement)
        result = len(doc["accessors"])-1
        cache[key] = result
        observations.append({"source_accessor":index, "derivative_accessor":result, "semantic":semantic, "count":number})
        return result
    attributes = []
    for mesh_index,mesh in enumerate(meshes):
        for primitive_index,primitive in enumerate(mesh["primitives"]):
            if primitive.get("mode", 4) != 4 or "indices" not in primitive or "POSITION" not in primitive["attributes"] or primitive.get("targets") or primitive.get("extensions"):
                raise RuntimeError("Native frame derivative requires indexed triangles without morph/compressed primitive extensions.")
            attributes.append({"mesh":mesh_index,"primitive":primitive_index,"normal_status":"SOURCE_ATTRIBUTE_REFLECTED" if "NORMAL" in primitive["attributes"] else "SOURCE_ABSENT_IMPORTER_GENERATION_UNOBSERVED", "tangent_status":"SOURCE_ATTRIBUTE_AND_HANDEDNESS_REFLECTED" if "TANGENT" in primitive["attributes"] else "SOURCE_ABSENT_IMPORTER_GENERATION_UNOBSERVED"})
            for semantic in ("POSITION", "NORMAL", "TANGENT"):
                if semantic in primitive["attributes"]:
                    primitive["attributes"][semantic] = converted(primitive["attributes"][semantic], semantic)
            primitive["indices"] = converted(primitive["indices"], "indices")
    raw_sha = hashlib.sha256(payload).hexdigest()
    doc["asset"].setdefault("extras", {})["shibuya_native_frame"] = {"native_frame":_native_frame_record(), "raw_eun_sha256":raw_sha, "raw_corner_order":[0,2,1], "derivative_glb_frame":"metres-Xeast-Yup-Zsouth"}
    binary.extend(b"\0"*(-len(binary)%4))
    doc["buffers"][0]["byteLength"] = len(binary)
    metadata = json.dumps(doc, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode("utf-8")
    metadata += b" "*(-len(metadata)%4)
    result = struct.pack("<4sII", b"glTF", 2, 28+len(metadata)+len(binary))+struct.pack("<II", len(metadata), 0x4E4F534A)+metadata+struct.pack("<II", len(binary), 0x004E4942)+binary
    return result, {"native_frame":_native_frame_record(), "raw_eun_sha256":raw_sha, "raw_bytes":len(payload), "derivative_sha256":hashlib.sha256(result).hexdigest(), "derivative_bytes":len(result), "accessors":observations, "primitive_attributes":attributes, "raw_corner_order":[0,2,1], "images_uv_materials":"ORIGINAL_BYTES_AND_REFERENCES_RETAINED", "native_import_equivalence":"NOT_OBSERVED"}


def _native_import_file(path):
    path = _local_file(str(path.relative_to(PROJECT)))
    if not 1 <= path.stat().st_size <= 256*1024*1024:
        raise RuntimeError("Native derivative input must be1byte..256MiB before reading.")
    payload = path.read_bytes()
    derived, receipt = _native_glb_derivative(payload)
    folder = PROJECT/"data/prepared/native-esu"/receipt["raw_eun_sha256"]
    for part in [*reversed(folder.parents), folder]:
        try: info = part.lstat()
        except FileNotFoundError:
            part.mkdir()
            info = part.lstat()
        if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0)&1024:
            raise RuntimeError("Cannot write native derivative through linked/reparse path: "+str(part))
    def retain(target, content):
        try:
            info = target.lstat()
        except FileNotFoundError:
            with target.open("xb") as stream: stream.write(content)
        else:
            if not stat.S_ISREG(info.st_mode) or getattr(info, "st_file_attributes", 0)&1024 or target.read_bytes() != content:
                raise RuntimeError("Native derivative immutable content conflict: "+str(target))
        _local_file(str(target.relative_to(PROJECT)))
    target = folder/path.name
    retain(target, derived)
    receipt.update(raw_source=str(path.relative_to(PROJECT)).replace("\\", "/"), derivative_path=str(target.relative_to(PROJECT)).replace("\\", "/"))
    retain(target.with_suffix(".frame.json"), (json.dumps(receipt, sort_keys=True, separators=(",", ":"), ensure_ascii=False, allow_nan=False)+"\n").encode("utf-8"))
    return target, receipt


def _support_integer(value, name, maximum):
    if type(value) not in (int, float) or not math.isfinite(value) or int(value) != value or not 1 <= value <= maximum:
        raise RuntimeError(f"Cannot admit support surface: {name} must be a positive whole number within {maximum}.")
    return int(value)


def _support_identity(record):
    return {"path": record["path"], "bytes": record.get("bytes", record.get("size")), "sha256": record["sha256"]}


def _support_fixed_ray_contract(samples):
    tuples, binary, native_binary = [], bytearray(), bytearray()
    compact = lambda value: json.dumps(value, separators=(",", ":"), ensure_ascii=False, allow_nan=False).encode("utf-8")
    for row in samples:
        if row["start_m"][:2] != row["end_m"][:2] or row["start_m"][2] <= row["end_m"][2]:
            raise RuntimeError("DID_NOT_RUN: physical correspondence requires the original downward vertical ray.")
        item = {"id": row["id"], "xy_m": row["start_m"][:2], "reference": row.get("reference"),
                "start_m": row["start_m"], "end_m": row["end_m"], "trace_modes": [False, True]}
        tuples.append(item)
        identity = compact({"id": item["id"], "reference": item["reference"]})
        binary.extend(struct.pack("<I", len(identity)) + identity)
        binary.extend(struct.pack("<6dBB", *item["start_m"], *item["end_m"], 0, 1))
        native_binary.extend(struct.pack("<6dBB", *_source_to_native_cm(item["start_m"]), *_source_to_native_cm(item["end_m"]), 0, 1))
    if not samples or len({row["id"] for row in samples}) != len(samples):
        raise RuntimeError("DID_NOT_RUN: physical correspondence requires unique nonempty fixed sample IDs.")
    return {"ordered_sample_count": len(samples), "declared_query_modes": len(samples) * 2,
            "tuple_sha256": hashlib.sha256(compact(tuples)).hexdigest(),
            "endpoints_modes_binary64_sha256": hashlib.sha256(binary).hexdigest(),
            "native_frame": _native_frame_record(), "native_endpoints_modes_binary64_sha256": hashlib.sha256(native_binary).hexdigest()}


def _support_admit_physical_model(manifest, rays, bindings):
    _require_native_frame(manifest, "support manifest")
    _require_native_frame(rays, "native-ray packet")
    known = {"schema_version": 1, "id": "ue5.8.3-cl58210709-chaos-cook-float32-cm-v1",
             "definition_sha256": "e5ba1adad4fcab4e05d61d899babf8f6c789655cfe4637c393d7002f4f742428"}
    if manifest.get("physical_query_model") != known or rays.get("physical_query_model") != known:
        raise RuntimeError("DID_NOT_RUN: support/native rays declare an unknown conditional physical query model.")
    fixed = rays["fixed_reference_population"]
    original = json.loads(_support_read(fixed["record"], bindings))
    _require_native_frame(original, "fixed native-ray reference")
    declared = {key: value for key, value in fixed.items() if key != "record"}
    if _support_fixed_ray_contract(original["samples"]) != declared or _support_fixed_ray_contract(rays["samples"]) != declared:
        raise RuntimeError("DID_NOT_RUN: physical expectations changed the fixed query/reference population.")
    return known


def _support_read(record, bindings, limit=32 * 1024 * 1024):
    """Read a confined data record; generation code snapshots remain data."""
    name = record.get("path") if isinstance(record, dict) else None
    if not isinstance(name, str) or not name.startswith("data/") or any(part in ("", ".", "..") or re.search(r'[\\:<>"|?*\x00-\x1f]', part) or part.endswith((" ", ".")) or re.fullmatch(r"(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])", part.split(".")[0], re.I) for part in name.split("/")):
        raise RuntimeError(f"Cannot admit support surface: invalid confined data path {name!r}.")
    size = _support_integer(record.get("bytes", record.get("size")), name + " bytes", limit)
    if "bytes" in record and "size" in record and record["bytes"] != record["size"]:
        raise RuntimeError(f"Cannot admit support surface: conflicting byte counts for {name}.")
    digest = record.get("sha256")
    if not isinstance(digest, str) or not re.fullmatch("[0-9a-f]{64}", digest):
        raise RuntimeError(f"Cannot admit support surface: missing SHA-256 for {name}.")
    path = PROJECT.joinpath(*name.split("/"))
    for component in [*reversed(path.parents), path]:
        info = component.lstat()
        if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & stat.FILE_ATTRIBUTE_REPARSE_POINT:
            raise RuntimeError(f"Cannot admit support surface: reparse path {component}.")
        if (component == path and not stat.S_ISREG(info.st_mode)) or (component != path and not stat.S_ISDIR(info.st_mode)):
            raise RuntimeError(f"Cannot admit support surface: invalid file/directory {component}.")
    if path.stat().st_size != size:
        raise RuntimeError(f"Cannot admit support surface: {name} differs from its recorded byte count.")
    with path.open("rb") as stream:
        payload = stream.read(size + 1)
    actual = {"path": name, "bytes": len(payload), "sha256": hashlib.sha256(payload).hexdigest()}
    if actual["bytes"] != size or actual["sha256"] != digest or (name in bindings and bindings[name] != actual):
        raise RuntimeError(f"Cannot admit support surface: {name} differs from its admitted source digest.")
    bindings[name] = actual
    return payload


def _support_point_key(point):
    return struct.pack("<3f", *(value if value != 0 else 0.0 for value in point))


def _support_oriented_key(points):
    return min(b"".join(points[i:]+points[:i]) for i in range(3))


def _support_geometry_digest(triangles):
    digest = hashlib.sha256()
    for triangle in sorted(triangles):
        digest.update(triangle)
        digest.update(struct.pack("<I", triangles[triangle]))
    return digest.hexdigest()


def _support_glb(payload, native_geometry=False, road=False):
    """Observe packed geometry; roads enumerate mesh/primitive/local faces in document order."""
    if len(payload) < 28 or struct.unpack_from("<4sII", payload) != (b"glTF", 2, len(payload)):
        raise RuntimeError("Cannot admit support surface: invalid complete GLB header.")
    count, kind = struct.unpack_from("<II", payload, 12)
    if kind != 0x4E4F534A or 20 + count + 8 > len(payload):
        raise RuntimeError("Cannot admit support surface: invalid GLB JSON chunk.")
    doc = json.loads(payload[20:20 + count])
    length, kind = struct.unpack_from("<II", payload, 20 + count)
    binary = memoryview(payload)[28 + count:]
    if kind != 0x004E4942 or length != len(binary) or not doc["meshes"]:
        raise RuntimeError("Cannot admit support surface: expected a complete binary mesh.")
    if not road and (len(doc["meshes"]) != 1 or len(doc["meshes"][0]["primitives"]) != 1):
        raise RuntimeError("Cannot admit support surface: expected one complete terrain primitive.")
    nodes = doc.get("nodes", [])
    if native_geometry or road:
        if len(nodes) != len(doc["meshes"]) or sorted(node.get("mesh", -1) for node in nodes) != list(range(len(doc["meshes"]))) or any(any(key in node for key in ("matrix", "translation", "rotation", "scale", "children")) for node in nodes):
            raise RuntimeError("Cannot compare native support geometry: require each admitted triangle mesh node once, without transforms or instances.")
    low, high = [math.inf] * 3, [-math.inf] * 3
    points, face_ids, excluded, retained = [], [], [], Counter()
    total_vertices = total_triangles = 0
    for mesh_index, mesh in enumerate(doc["meshes"]):
        if not mesh["primitives"]:
            raise RuntimeError("Cannot admit support surface: mesh has no consumed primitives.")
        for primitive_index, primitive in enumerate(mesh["primitives"]):
            position = doc["accessors"][primitive["attributes"]["POSITION"]]
            indices = doc["accessors"][primitive["indices"]]
            if position["componentType"] != 5126 or position["type"] != "VEC3" or indices["type"] != "SCALAR" or indices["componentType"] not in (5123, 5125) or ((native_geometry or road) and primitive.get("mode", 4) != 4):
                raise RuntimeError("Cannot admit support surface: unsupported triangle positions/indices.")
            vertices = _support_integer(position["count"], "primitive vertices", 6_000_000)
            elements = _support_integer(indices["count"], "primitive indices", 6_000_000)
            if elements % 3 or total_vertices + vertices > 6_000_000 or total_triangles + elements // 3 > 2_000_000:
                raise RuntimeError("Cannot admit support surface: consumed primitive population exceeds complete bounded triangles.")
            view = doc["bufferViews"][position["bufferView"]]
            start = view.get("byteOffset", 0) + position.get("byteOffset", 0)
            stride = view.get("byteStride", 12)
            if stride < 12 or start < 0 or start + (vertices - 1) * stride + 12 > len(binary):
                raise RuntimeError("Cannot admit support surface: position accessor is outside the binary chunk.")
            for index in range(vertices):
                point = struct.unpack_from("<3f", binary, start + index * stride)
                if not all(math.isfinite(value) for value in point):
                    raise RuntimeError("Cannot admit support surface: nonfinite actual position.")
                for axis, value in enumerate(point):
                    low[axis] = min(low[axis], value); high[axis] = max(high[axis], value)
                if native_geometry:
                    points.append(_support_point_key((100 * point[0], -100 * point[2], 100 * point[1])))
            if road:
                face_ids.extend((mesh_index, primitive_index, face) for face in range(elements // 3))
            if native_geometry or road:
                view = doc["bufferViews"][indices["bufferView"]]
                start = view.get("byteOffset", 0) + indices.get("byteOffset", 0)
                width = 2 if indices["componentType"] == 5123 else 4
                if view.get("byteStride", width) != width or start < 0 or start + elements * width > len(binary):
                    raise RuntimeError("Cannot compare native support geometry: source indices exceed their packed binary chunk.")
                for local_face, triangle in enumerate(struct.iter_unpack("<3H" if width == 2 else "<3I", binary[start:start + elements * width])):
                    if max(triangle) >= vertices:
                        raise RuntimeError("Cannot compare native support geometry: primitive face references an absent vertex.")
                    if native_geometry:
                        triangle = tuple(total_vertices + index for index in triangle)
                        a, b, c = (points[index] for index in triangle)
                        if a == b or a == c or b == c:
                            excluded.append((total_triangles + local_face, triangle))
                        else:
                            retained[_support_oriented_key([a, c, b])] += 1
            total_vertices += vertices; total_triangles += elements // 3
    source = {"vertices": total_vertices, "triangles": total_triangles, "bounds_glb_m": [low, high]}
    if road:
        source["face_ids"] = face_ids
    if not native_geometry:
        return source
    return {"source": source, "points": points, "retained": retained, "excluded": excluded}


def _support_compare_native_geometry(mesh, geometry):
    """Exact converted positions and repeated triangle occurrences; no tolerance."""
    source, excluded = geometry["source"], geometry["excluded"]
    if excluded:
        description = mesh.get_static_mesh_description(0)
        if description is None or description.get_triangle_count() != source["triangles"] or description.get_vertex_count() != source["vertices"]:
            raise RuntimeError(f"Cannot compare native support geometry: {mesh.get_path_name()} lost its source LOD0 population.")
        for face, expected_ids in excluded:
            # The array getter in UE5.8.3 prepends uninitialized IDs; scalar
            # triangle-instance and instance-vertex getters return actual IDs.
            actual_ids = [description.get_vertex_instance_vertex(description.get_triangle_vertex_instance(unreal.TriangleID(face), corner)).id_value for corner in range(3)]
            if sorted(actual_ids) != sorted(expected_ids):
                raise RuntimeError(f"Cannot compare native support geometry: {mesh.get_path_name()} source face {face} changed its vertex indices.")
            for index in actual_ids:
                point = description.get_vertex_position(unreal.VertexID(index))
                if _support_point_key((point.x, point.y, point.z)) != geometry["points"][index]:
                    raise RuntimeError(f"Cannot compare native support geometry: {mesh.get_path_name()} source vertex {index} differs from exact float32 centimetre conversion.")
    sections = mesh.get_num_sections(0)
    if not 1 <= sections <= 16 or not hasattr(unreal, "ProceduralMeshLibrary"):
        raise RuntimeError(f"Cannot compare native support geometry: {mesh.get_path_name()} needs 1..16 sections and the built-in render-buffer reader.")
    native = Counter()
    for section in range(sections):
        vertices, indices, normals, uvs, tangents = unreal.ProceduralMeshLibrary.get_section_from_static_mesh(mesh, 0, section)
        if not vertices or not indices or len(indices) % 3:
            raise RuntimeError(f"Cannot compare native support geometry: {mesh.get_path_name()} section {section} has missing or incomplete render buffers.")
        points = [_support_point_key((point.x, point.y, point.z)) for point in vertices]
        for offset in range(0, len(indices), 3):
            triangle = indices[offset:offset + 3]
            if min(triangle) < 0 or max(triangle) >= len(points):
                raise RuntimeError(f"Cannot compare native support geometry: {mesh.get_path_name()} section {section} has an invalid render vertex index.")
            native[_support_oriented_key([points[index] for index in triangle])] += 1
    retained = geometry["retained"]
    if native != retained:
        raise RuntimeError(f"Cannot compare native support geometry: {mesh.get_path_name()} has {sum((retained - native).values())} missing and {sum((native - retained).values())} unexpected converted-source triangle occurrences.")
    return {"raw_source_triangles": source["triangles"], "exact_coincident_endpoint_exclusions": len(excluded), "expected_retained_triangles": sum(retained.values()), "native_render_triangles": sum(native.values()), "excluded_native_source_faces_verified": len(excluded), "excluded_source_face_ids_sha256": hashlib.sha256(b"".join(struct.pack("<I", face) for face, _ in excluded)).hexdigest(), "native_frame": _native_frame_record(), "final_raw_corner_order": [0, 2, 1], "complete_signed_rendered_geometry_multiset_equal": True, "complete_rendered_geometry_multiset_equal": True, "geometry_multiset_sha256": _support_geometry_digest(native)}


def _support3_record(record, maximum=32 * 1024 * 1024):
    """Validate historical data identity without allocating or reading producer-only geometry."""
    name = record.get("path") if isinstance(record, dict) else None
    if not isinstance(name, str) or not name.startswith("data/") or any(part in ("", ".", "..") or re.search(r'[\\:<>"|?*\x00-\x1f]', part) or part.endswith((" ", ".")) or re.fullmatch(r"(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])", part.split(".")[0], re.I) for part in name.split("/")):
        raise RuntimeError("Cannot admit Source3: historical record needs a confined data path.")
    size = _support_integer(record.get("bytes", record.get("size")), name + " bytes", maximum)
    if "bytes" in record and "size" in record and record["bytes"] != record["size"]:
        raise RuntimeError("Cannot admit Source3: historical record has conflicting byte counts.")
    if not isinstance(record.get("sha256"), str) or not re.fullmatch("[0-9a-f]{64}", record["sha256"]):
        raise RuntimeError("Cannot admit Source3: historical record needs SHA-256.")
    return {"path": name, "bytes": size, "sha256": record["sha256"]}


def _admit_support_surface3(manifest, bindings, relative):
    """Bind published Source3 closure; source reconstruction and patch GLBs remain producer-only."""
    model = "native-esu-float32-centimetres-v2"
    if manifest.get("coordinate_model") != model or any(key in manifest for key in ("topology_provenance", "terrain_source_triangle_indices", "construction_policy")):
        raise RuntimeError("Cannot admit Source3: require native float32 centimetres and explicit ledger ancestry, without relabeled Source2 topology.")
    parent = json.loads(_support_read(manifest["parent_support_surface"], bindings, 16 * 1024 * 1024))
    _require_native_frame(parent, "current Source3 parent")
    if parent.get("coordinate_model") != model:
        raise RuntimeError("DID_NOT_RUN: current Source3 parent must declare the same ESU coordinate model.")
    if type(parent.get("schema_version")) is not int or parent["schema_version"] != 2 or manifest["parent_support_surface"]["path"] in (relative, "data/prepared/surface/support-surface-manifest.json"):
        raise RuntimeError("Cannot admit Source3: parent must be a separate immutable schema2 manifest.")
    for key in ("frame", "origin", "vertical_reference", "inputs", "atlas", "attribution", "native_assignment"):
        if manifest.get(key) != parent.get(key):
            raise RuntimeError("Cannot admit Source3: parent " + key + " changed.")
    _require_native_frame(manifest, "current support manifest")
    if manifest.get("coordinate_model") != "native-esu-float32-centimetres-v2":
        raise RuntimeError("DID_NOT_RUN: current support requires the ESU native coordinate model.")
    inputs = manifest["inputs"]
    if inputs["base_manifest"]["path"] != "data/prepared/manifest.json":
        raise RuntimeError("Cannot admit Source3: wrong base-manifest role.")
    base = json.loads(_support_read(inputs["base_manifest"], bindings))
    if manifest["origin"] != base["origin"] or manifest["vertical_reference"] != base["vertical_reference"] or manifest["origin"].get("latitude") != 35.6595 or manifest["origin"].get("longitude") != 139.7005:
        raise RuntimeError("Cannot admit Source3: wrong source origin or vertical reference.")
    ledger = json.loads(_support_read(manifest["surface_edits"], bindings, 16 * 1024 * 1024))
    _require_native_frame(ledger, "Source3 edit ledger")
    if type(ledger.get("schema_version")) is not int or ledger["schema_version"] != 1 or ledger.get("coordinate_model") != model or ledger.get("output_order") != "parent-triangles-minus-deletions-then-patch-faces" or ledger.get("parent_support_surface") != manifest["parent_support_surface"] or ledger.get("parent_derived_terrain") != parent["derived_terrain"]:
        raise RuntimeError("Cannot admit Source3: edit ledger differs from its exact parent, coordinate or output-order contract.")
    if manifest["derived_terrain"]["path"] == parent["derived_terrain"]["path"]:
        raise RuntimeError("Cannot admit Source3: current terrain cannot reuse its producer-only parent geometry role.")
    producer_records = [ledger["parent_derived_terrain"], ledger["terrain_patch"], *[row["replacement"] for row in ledger.get("road_overrides", [])], ledger["recipe"]["algorithm"], *ledger["recipe"]["source_inputs"], *ledger["recipe"]["candidate_inputs"]]
    producer = {}
    for record in producer_records:
        identity = _support3_record(record, 64 * 1024 * 1024 if record.get("path") == ledger["parent_derived_terrain"]["path"] else 32 * 1024 * 1024)
        if identity["path"] in producer and producer[identity["path"]] != identity:
            raise RuntimeError("Cannot admit Source3: conflicting producer-only record identity.")
        producer[identity["path"]] = identity
    algorithm, configuration = manifest["algorithm"], manifest["configuration_inputs"]
    roles = (("geometry", "tools/data/support_surface.py", algorithm), ("integration", "tools/data/surface_network.py", algorithm["integration"]),
             ("topology", "tools/data/support_topology.py", algorithm["topology"]), ("build_city", "tools/data/build_city.py", algorithm["build_city"]),
             ("surface_configuration", "sources/surface_network.json", configuration["surface_network"]), ("city_configuration", "sources/shibuya.json", configuration["city"]))
    expected_bindings, executions = [], {}
    for role, execution, record in (*roles, ("source3_writer", "tools/data/support_source3.py", algorithm["edits"])):
        identity = _support3_record(record, 100_000 if execution.startswith("sources/") else 2 * 1024 * 1024)
        if not identity["path"].startswith("data/source/provenance/") or identity["sha256"] not in identity["path"]:
            raise RuntimeError("Cannot admit Source3: code/config snapshots must be content-addressed historical data.")
        payload = _support_read(record, bindings, 100_000 if execution.startswith("sources/") else 2 * 1024 * 1024)
        executions[execution] = identity
        if role != "source3_writer":
            expected_bindings.append({"role": role, "execution_path": execution, "snapshot": identity})
        if execution == "sources/surface_network.json":
            config = json.loads(payload)
    support = config["support_surface"]
    if config["base_manifest_sha256"] != inputs["base_manifest"]["sha256"] or support["original_terrain_photo"] != inputs["original_terrain_photo"] or support["atlas"] != manifest["atlas"]:
        raise RuntimeError("Cannot admit Source3: source/configuration/atlas identity changed.")
    preservation = json.loads(_support_read(manifest["source_preservation"], bindings))
    before = preservation.get("inputs_before")
    if preservation.get("schema_version") != 1 or preservation.get("unchanged") is not True or not isinstance(before, list) or not before or before != preservation.get("inputs_after") or preservation.get("data_bindings") != expected_bindings or preservation.get("source3_writer") != algorithm["edits"]:
        raise RuntimeError("Cannot admit Source3: missing exact unchanged producer inventory and snapshot bindings.")
    inventory = {}
    for record in before:
        name = record.get("path")
        if name in inventory:
            raise RuntimeError("Cannot admit Source3: duplicate producer inventory path.")
        if name in executions:
            if any(record.get(key) != executions[name][key] for key in ("bytes", "sha256")):
                raise RuntimeError("Cannot admit Source3: historical execution differs from its data snapshot.")
            inventory[name] = record
        else:
            inventory[name] = _support3_record(record, 64 * 1024 * 1024 if name == ledger["parent_derived_terrain"]["path"] else 32 * 1024 * 1024)
    if not set(executions).issubset(inventory) or any(inventory.get(name) != identity for name, identity in producer.items()):
        raise RuntimeError("Cannot admit Source3: producer inventory omits declared code or edit dependencies.")
    source_roads = [row for row in base["outputs"] if row["kind"] == "roads"]
    if len(source_roads) != 25 or inputs["roads"] != [_support_identity(row) for row in source_roads]:
        raise RuntimeError("Cannot admit Source3: original all25 road provenance changed.")
    photos = json.loads(_support_read(inputs["road_photo_manifest"], bindings))
    if photos["base_manifest_sha256"] != inputs["base_manifest"]["sha256"] or photos["shared_atlas"] != manifest["atlas"] or len(photos["outputs"]) != 25:
        raise RuntimeError("Cannot admit Source3: wrong parent road-photo manifest or shared atlas.")
    _support_read(manifest["atlas"], bindings)
    native_roads, derived = manifest["native_roads"], manifest["derived_roads"]
    if len(native_roads) != 25 or not isinstance(derived, list):
        raise RuntimeError("Cannot admit Source3: require the same25 actual road actor roles.")
    replacements = {}
    for row in derived:
        number = row.get("source")
        if type(number) is not int or not 0 <= number < 25 or number in replacements:
            raise RuntimeError("Cannot admit Source3: duplicate/unknown derived road role.")
        replacements[number] = row
    road_geometry = {}
    for number, (original, native, previous) in enumerate(zip(source_roads, native_roads, parent["native_roads"])):
        index = next(i for i, row in enumerate(base["outputs"]) if row["path"] == original["path"])
        stem = Path(original["path"]).stem
        if any(native.get(key) != previous.get(key) for key in ("source_index", "road_index", "original_source", "actor_label", "native_mesh_path")) or native["source_index"] != index or native["road_index"] != number or native["original_source"] != _support_identity(original) or native["actor_label"] != f"City_{index:03}_{stem}" or native["native_mesh_path"] != f"/Game/Surface/Roads/Tile_{index:03}/{stem}/StaticMeshes/{stem}.{stem}":
            raise RuntimeError("Cannot admit Source3: road actor/raw-source/native asset identity changed.")
        replacement = replacements.get(number)
        selected = replacement["record"] if replacement else previous["source"]
        if native["source"] != selected or native["source_path"] != selected["path"] or Path(selected["path"]).stem != stem:
            raise RuntimeError("Cannot admit Source3: native road does not select its declared full replacement with the original import name.")
        geometry = _support_glb(_support_read(selected, bindings), road=True)
        if native["triangles"] != geometry["triangles"]:
            raise RuntimeError("Cannot admit Source3: actual road triangle count differs from its consumed GLB.")
        if replacement:
            faces = replacement["face_map"]
            if len(faces) != geometry["triangles"] or any(any(type(face.get(key)) is not int for key in ("source", "mesh", "primitive", "triangle", "source_triangle_index", "original_triangle")) or face.get("source") != number or (face["mesh"], face["primitive"], face["triangle"]) != geometry["face_ids"][i] or face["source_triangle_index"] != i or face.get("kind") not in ("road", "derived-road") or not 0 <= face["original_triangle"] < previous["triangles"] or (face["kind"] == "derived-road" and (type(face.get("patch_triangle")) is not int or face["patch_triangle"] < 0 or not isinstance(face.get("region_id"), str) or not face["region_id"])) for i, face in enumerate(faces)):
                raise RuntimeError("Cannot admit Source3: derived road output face map is incomplete or changes its lineage role.")
        road_geometry[native["actor_label"]] = geometry
    geometry = _support_glb(_support_read(manifest["derived_terrain"], bindings, 64 * 1024 * 1024))
    if any(manifest["derived_terrain"][key] != value for key, value in geometry.items()):
        raise RuntimeError("Cannot admit Source3: terrain counts/bounds differ from actual consumed GLB.")
    deleted, patch = ledger["deleted_parent_triangles"], ledger["patch_faces"]
    count = _support_integer(parent["derived_terrain"]["triangles"], "parent triangles", 2_000_000)
    if not isinstance(deleted, list) or deleted != sorted(set(deleted)) or any(type(i) is not int or not 0 <= i < count for i in deleted) or len(patch) != geometry["triangles"] - count + len(deleted) or any(type(row.get("patch_triangle")) is not int or row["patch_triangle"] != i or row.get("kind") not in ("retained-parent-fragment", "inferred-ground-road") for i, row in enumerate(patch)):
        raise RuntimeError("Cannot admit Source3: terrain deletion/patch population differs from its actual output.")
    region_ids = [row["id"] for row in ledger["regions"]]
    if any(not isinstance(value, str) or not value for value in region_ids) or len(set(region_ids)) != len(region_ids) or sorted(row["parent_triangle"] for row in ledger["terrain_edits"]) != deleted:
        raise RuntimeError("Cannot admit Source3: removals/regions do not bind the complete edit population.")
    for face in patch:
        if face.get("region_id") not in region_ids:
            raise RuntimeError("Cannot admit Source3: patch names an undeclared edit region.")
        if face["kind"] == "retained-parent-fragment":
            index = face.get("parent_triangle")
            if type(index) is not int or index not in deleted or face.get("original_terrain_parent") != parent["terrain_source_triangle_indices"][index]:
                raise RuntimeError("Cannot admit Source3: fragment relabels original terrain lineage.")
        elif "parent_triangle" in face or "original_terrain_parent" in face or not isinstance(face.get("anchors"), list) or not face["anchors"]:
            raise RuntimeError("Cannot admit Source3: inferred geometry needs explicit road anchors and cannot claim original GSI lineage.")
    assignment = manifest["native_assignment"]
    expected_assignment = {"material_path": support["native_material"], "texture_path": support["native_texture"], "original_actor_label": "City_069_terrain", "original_mesh_path": "/Game/Surface/TerrainPhoto/terrain-photo/StaticMeshes/terrain-photo.terrain-photo", "replacement_mesh_path": "/Game/Surface/TerrainSupport/terrain-support/StaticMeshes/terrain-support.terrain-support", "replace_original_terrain_actor_only": True, "preserve_material_packages": True, "collision_source_tolerance_cm": .1}
    if any(assignment.get(key) != value for key, value in expected_assignment.items()):
        raise RuntimeError("Cannot admit Source3: original native actor/material/collision assignment changed.")
    rays = json.loads(_support_read(manifest["native_ray_samples"], bindings))
    _require_native_frame(rays, "current native-ray packet")
    labels = {road["actor_label"] for road in native_roads}
    if rays.get("schema_version") != 1 or rays.get("frame") != "metres-Xeast-Ynorth-Zup" or rays.get("position_tolerance_cm") != .1 or rays.get("normal_dot_min") != .999 or rays.get("inputs") != support["native_ray_inputs"] or rays["road_coverage"]["source_roads"] != 25 or rays["road_coverage"]["covered_actor_labels"] != sorted(labels) or rays["road_coverage"]["uncovered_roads"]:
        raise RuntimeError("Cannot admit Source3: ray source/frame/tolerance or complete road coverage changed.")
    samples, covered = rays["samples"], set()
    if not samples or len(samples) > 10_000 or len({row["id"] for row in samples}) != len(samples):
        raise RuntimeError("Cannot admit Source3: missing/oversized/duplicate rays.")
    for row in samples:
        if type(row.get("expected_hit")) is not bool or any(not isinstance(row[key], list) or len(row[key]) != 3 or any(type(value) not in (int, float) or not math.isfinite(value) for value in row[key]) for key in ("start_m", "end_m")):
            raise RuntimeError("Cannot admit Source3: malformed finite native ray.")
        if row["expected_hit"]:
            expected = row["expected"]
            road = next((r for r in native_roads if r["actor_label"] == expected["actor_label"]), None)
            actual = manifest["derived_terrain"] if expected["actor_label"] == "City_069_terrain" and expected["mesh_role"] == "terrain_support" else road["source"] if road and expected["mesh_role"] == "road" else None
            limit = geometry["triangles"] if road is None else road["triangles"]
            if actual is None or expected["source_path"] != actual["path"] or type(expected.get("source_triangle_index")) is not int or not 0 <= expected["source_triangle_index"] < limit or any(not isinstance(expected[key], list) or len(expected[key]) != 3 or any(type(value) not in (int, float) or not math.isfinite(value) for value in expected[key]) for key in ("position_m", "normal_enu")) or abs(sum(value * value for value in expected["normal_enu"]) - 1) > .00001:
                raise RuntimeError("Cannot admit Source3: ray does not bind actual consumed actor/triangle/plane.")
            if road:
                ref = expected.get("layer_ref", {})
                face = expected["source_triangle_index"]
                if any(type(ref.get(key)) is not int for key in ("source", "mesh", "primitive", "triangle", "source_triangle_index")) or ref["source"] != road["road_index"] or ref["source_triangle_index"] != face or (ref["mesh"], ref["primitive"], ref["triangle"]) != road_geometry[road["actor_label"]]["face_ids"][face] or (road["road_index"] in replacements and ref != replacements[road["road_index"]]["face_map"][face]) or (road["road_index"] not in replacements and (ref.get("kind") != "road" or ref.get("original_triangle") != ref["triangle"])):
                    raise RuntimeError("Cannot admit Source3: road ray flattened output differs from its primitive-local face and ancestry.")
                covered.add(road["actor_label"])
    if covered != labels:
        raise RuntimeError("Cannot admit Source3: rays omit an admitted road actor.")
    result = {"manifest": manifest, "manifest_path": relative, "manifest_sha256": bindings[relative]["sha256"], "bindings": bindings, "rays": rays, "road_geometry": road_geometry}
    if "physical_query_model" in manifest or "physical_query_model" in rays:
        result["physical_query_model"] = _support_admit_physical_model(manifest, rays, bindings)
    return result


def _support_selected_road(entry, state, label):
    if state and state["manifest"].get("schema_version") == 3:
        native = next(row for row in state["manifest"]["native_roads"] if row["actor_label"] == label)
        _support_read(native["source"], state["bindings"])
        return native["source"]
    return entry["generated"]


def _support_road_bounds(actor, bounds):
    points = [_vector(actor.get_actor_transform().transform_location(unreal.Vector(x * 100, -z * 100, y * 100))) for x in (bounds[0][0], bounds[1][0]) for y in (bounds[0][1], bounds[1][1]) for z in (bounds[0][2], bounds[1][2])]
    low, high = [[operation(point[axis] for point in points) for axis in range(3)] for operation in (min, max)]
    centre, extent = actor.get_actor_bounds(False)
    return all(abs(value - wanted) <= .1 for values, expected in (([a - b for a, b in zip(_vector(centre), _vector(extent))], low), ([a + b for a, b in zip(_vector(centre), _vector(extent))], high)) for value, wanted in zip(values, expected))


def _admit_support_surface(manifest_path):
    """Bind an already producer-admitted schema2 generation to actual import bytes."""
    bindings = {}
    relative = manifest_path.relative_to(PROJECT).as_posix()
    manifest_path = _local_file(relative)
    size = manifest_path.stat().st_size
    if not 1 <= size <= 16 * 1024 * 1024:
        raise RuntimeError("Cannot admit support surface: manifest exceeds its 16MiB role.")
    with manifest_path.open("rb") as stream:
        raw = stream.read(size + 1)
    if len(raw) != size:
        raise RuntimeError("Cannot admit support surface: manifest changed length during its bounded read.")
    bindings[relative] = {"path": relative, "bytes": size, "sha256": hashlib.sha256(raw).hexdigest()}
    manifest = json.loads(raw)
    if type(manifest.get("schema_version")) is int and manifest["schema_version"] == 3:
        if manifest.get("frame") != {"glb": "metres-Xeast-Yup-Znorth", "runtime": "metres-Xeast-Ynorth-Zup", "unreal": "centimetres-Xeast-Ysouth-Zup"}:
            raise RuntimeError("Cannot admit Source3: require the exact GLB/runtime/Unreal frames.")
        _require_native_frame(manifest, "Source3 support manifest")
        return _admit_support_surface3(manifest, bindings, relative)
    if type(manifest.get("schema_version")) is not int or manifest["schema_version"] != 2 or manifest.get("frame") != {"glb": "metres-Xeast-Yup-Znorth", "runtime": "metres-Xeast-Ynorth-Zup", "unreal": "centimetres-Xeast-Ysouth-Zup"}:
        raise RuntimeError("Cannot admit support surface: require schema2 with the exact GLB/runtime/Unreal frames.")
    _require_native_frame(manifest, "current support manifest")
    if manifest.get("coordinate_model") != "native-esu-float32-centimetres-v2":
        raise RuntimeError("DID_NOT_RUN: current support requires the ESU native coordinate model.")
    inputs = manifest["inputs"]
    if inputs["base_manifest"]["path"] != "data/prepared/manifest.json":
        raise RuntimeError("Cannot admit support surface: wrong base-manifest role.")
    base = json.loads(_support_read(inputs["base_manifest"], bindings))
    if manifest["origin"] != base["origin"] or manifest["origin"].get("latitude") != 35.6595 or manifest["origin"].get("longitude") != 139.7005 or manifest["vertical_reference"] != base["vertical_reference"]:
        raise RuntimeError("Cannot admit support surface: origin or vertical reference differs from the actual Shibuya source.")
    roles = (("tools/data/support_surface.py", manifest["algorithm"]), ("tools/data/surface_network.py", manifest["algorithm"]["integration"]),
             ("tools/data/support_topology.py", manifest["algorithm"]["topology"]), ("tools/data/build_city.py", manifest["algorithm"]["build_city"]),
             ("sources/surface_network.json", manifest["configuration_inputs"]["surface_network"]), ("sources/shibuya.json", manifest["configuration_inputs"]["city"]))
    snapshots = {}
    role_names = ("geometry", "integration", "topology", "build_city", "surface_configuration", "city_configuration")
    expected_bindings = []
    for role, (execution, record) in zip(role_names, roles):
        if not record["path"].startswith("data/source/provenance/") or record["sha256"] not in record["path"]:
            raise RuntimeError("Cannot admit support surface: executing code/config requires a content-addressed data snapshot.")
        payload = _support_read(record, bindings, 2 * 1024 * 1024 if execution.startswith("tools/") else 100_000)
        snapshots[execution] = record
        expected_bindings.append({"role": role, "execution_path": execution, "snapshot": {key: record[key] for key in ("path", "bytes", "sha256")}})
        if execution == "sources/surface_network.json":
            config = json.loads(payload)
    support = config["support_surface"]
    if config["base_manifest_sha256"] != inputs["base_manifest"]["sha256"] or support["original_terrain_photo"] != inputs["original_terrain_photo"] or support["atlas"] != manifest["atlas"] or support["policy"] != manifest["policy"]:
        raise RuntimeError("Cannot admit support surface: recorded construction inputs/policy differ from its actual configuration snapshot.")
    original = next(row for row in base["outputs"] if row["kind"] == "terrain")
    if inputs["original_terrain"]["path"] != original["path"] or inputs["original_terrain"]["sha256"] != original["sha256"]:
        raise RuntimeError("Cannot admit support surface: original terrain role differs from the admitted base.")
    source_roads = [row for row in base["outputs"] if row["kind"] == "roads"]
    if inputs["roads"] != [_support_identity(row) for row in source_roads] or len(source_roads) != 25:
        raise RuntimeError("Cannot admit support surface: require all25 unchanged source roads.")
    road_photo = json.loads(_support_read(inputs["road_photo_manifest"], bindings))
    if road_photo["base_manifest_sha256"] != inputs["base_manifest"]["sha256"] or road_photo["shared_atlas"] != manifest["atlas"] or len(road_photo["outputs"]) != 25:
        raise RuntimeError("Cannot admit support surface: photographic roads differ from base/atlas/all25 sources.")
    required = [inputs["base_manifest"], inputs["original_terrain_photo"], manifest["atlas"], inputs["road_photo_manifest"], support["frozen_network"], support["frozen_source_manifest"], support["frozen_movement_manifest"], *support["native_ray_inputs"], original, *source_roads]
    native_roads = manifest["native_roads"]
    if len(native_roads) != 25:
        raise RuntimeError("Cannot admit support surface: missing native road assignment.")
    for number, (road, native) in enumerate(zip(source_roads, native_roads)):
        photo = next(row for row in road_photo["outputs"] if _support_identity(row["original"]) == _support_identity(road))["generated"]
        source_index = next(index for index, row in enumerate(base["outputs"]) if row["path"] == road["path"])
        stem = Path(road["path"]).stem
        if native["source_index"] != source_index or native["road_index"] != number or _support_identity(native["original_source"]) != _support_identity(road) or native["source_path"] != photo["path"] or _support_identity(native["source"]) != _support_identity(photo) or native["actor_label"] != f"City_{source_index:03}_{stem}" or native["native_mesh_path"] != f"/Game/Surface/Roads/Tile_{source_index:03}/{stem}/StaticMeshes/{stem}.{stem}":
            raise RuntimeError("Cannot admit support surface: native road assignment changes a source identity or geometry role.")
        required.append(photo)
    preservation = json.loads(_support_read(manifest["source_preservation"], bindings))
    before = preservation.get("inputs_before")
    if preservation.get("schema_version") != 1 or preservation.get("unchanged") is not True or not isinstance(before, list) or not before or before != preservation.get("inputs_after") or preservation.get("data_bindings") != expected_bindings:
        raise RuntimeError("Cannot admit support surface: missing unchanged generation inventory/data snapshot bindings.")
    inventory = {row["path"]: row for row in before}
    required_paths = {row["path"] for row in required} | set(snapshots) | {config["osm"]["path"]}
    if len(inventory) != len(before) or set(inventory) != required_paths:
        raise RuntimeError("Cannot admit support surface: incomplete or duplicated generation input population.")
    for execution, record in snapshots.items():
        if any(inventory[execution][key] != record[key] for key in ("bytes", "sha256")):
            raise RuntimeError("Cannot admit support surface: executing Source bytes differ from their data snapshot.")
    for row in required:
        actual = inventory.get(row["path"])
        if actual is None or actual["sha256"] != row["sha256"] or actual["bytes"] != row.get("bytes", row.get("size")):
            raise RuntimeError("Cannot admit support surface: generation inventory differs from required source bytes.")
    for name, record in inventory.items():
        if name not in snapshots:
            _support_read(record, bindings)
    geometry = _support_glb(_support_read(manifest["derived_terrain"], bindings, 64 * 1024 * 1024))
    if any(manifest["derived_terrain"][key] != value for key, value in geometry.items()):
        raise RuntimeError("Cannot admit support surface: derived counts/bounds differ from its actual packed GLB.")
    original_geometry = _support_glb(_support_read(inputs["original_terrain"], bindings))
    topology = manifest["topology_provenance"]
    _support_read(topology["record"], bindings)
    parents = manifest["terrain_source_triangle_indices"]
    if topology["original_parent_count"] != original_geometry["triangles"] or topology["output_triangle_count"] != geometry["triangles"] or len(parents) != geometry["triangles"] or any(type(parent) is not int or not 0 <= parent < original_geometry["triangles"] for parent in parents):
        raise RuntimeError("Cannot admit support surface: original/final parent population differs from actual source geometry.")
    if any(abs(geometry["bounds_glb_m"][side][axis] - original_geometry["bounds_glb_m"][side][axis]) > .0001 for side in (0, 1) for axis in (0, 2)):
        raise RuntimeError("Cannot admit support surface: derived terrain lost the original full horizontal crop.")
    assignment = manifest["native_assignment"]
    expected = {"material_path": support["native_material"], "texture_path": support["native_texture"], "original_actor_label": "City_069_terrain", "original_mesh_path": "/Game/Surface/TerrainPhoto/terrain-photo/StaticMeshes/terrain-photo.terrain-photo", "replacement_mesh_path": "/Game/Surface/TerrainSupport/terrain-support/StaticMeshes/terrain-support.terrain-support", "replace_original_terrain_actor_only": True, "preserve_material_packages": True, "collision_source_tolerance_cm": .1}
    if any(assignment.get(key) != value for key, value in expected.items()):
        raise RuntimeError("Cannot admit support surface: unsupported native replacement/material/collision contract.")
    rays = json.loads(_support_read(manifest["native_ray_samples"], bindings))
    _require_native_frame(rays, "current native-ray packet")
    labels = {road["actor_label"] for road in native_roads}
    if rays.get("schema_version") != 1 or rays.get("frame") != "metres-Xeast-Ynorth-Zup" or rays.get("position_tolerance_cm") != .1 or rays.get("normal_dot_min") != .999 or rays.get("inputs") != support["native_ray_inputs"] or rays["road_coverage"]["source_roads"] != 25 or rays["road_coverage"]["covered_actor_labels"] != sorted(labels) or rays["road_coverage"]["uncovered_roads"]:
        raise RuntimeError("Cannot admit support surface: ray frame/tolerances/source inputs or25-road coverage differ.")
    samples = rays["samples"]
    if not samples or len(samples) > 10_000 or len({sample["id"] for sample in samples}) != len(samples):
        raise RuntimeError("Cannot admit support surface: missing, oversized or duplicate native rays.")
    covered = set()
    for sample in samples:
        if type(sample.get("expected_hit")) is not bool or any(not isinstance(sample[key], list) or len(sample[key]) != 3 or any(type(value) not in (int, float) or not math.isfinite(value) for value in sample[key]) for key in ("start_m", "end_m")):
            raise RuntimeError("Cannot admit support surface: malformed finite native ray.")
        if sample["expected_hit"]:
            wanted = sample["expected"]
            road = next((row for row in native_roads if row["actor_label"] == wanted["actor_label"]), None)
            record = manifest["derived_terrain"] if wanted["actor_label"] == "City_069_terrain" and wanted["mesh_role"] == "terrain_support" else road["source"] if road and wanted["mesh_role"] == "road" else None
            if record is None or wanted["source_path"] != record["path"] or not isinstance(wanted["position_m"], list) or len(wanted["position_m"]) != 3 or not isinstance(wanted["normal_enu"], list) or len(wanted["normal_enu"]) != 3 or not all(type(value) in (int, float) and math.isfinite(value) for key in ("position_m", "normal_enu") for value in wanted[key]) or abs(sum(value * value for value in wanted["normal_enu"]) - 1) > .00001:
                raise RuntimeError("Cannot admit support surface: native ray lacks the exact source actor/position/normal.")
            if road:
                covered.add(road["actor_label"])
    if covered != labels:
        raise RuntimeError("Cannot admit support surface: actual ray population misses an admitted road actor.")
    result = {"manifest": manifest, "manifest_path": relative, "manifest_sha256": hashlib.sha256(raw).hexdigest(), "bindings": bindings, "rays": rays}
    if "physical_query_model" in manifest or "physical_query_model" in rays:
        result["physical_query_model"] = _support_admit_physical_model(manifest, rays, bindings)
    return result


def _support_check_hit(sample, actual):
    if not sample["expected_hit"]:
        if actual is not None:
            raise RuntimeError(f"Support ray {sample['id']} unexpectedly hit native geometry.")
        return
    expected = sample["expected"]
    if actual is None or actual["actor_label"] != expected["actor_label"] or actual["mesh_path"] != expected["native_mesh_path"]:
        raise RuntimeError(f"Support ray {sample['id']} hit the wrong native actor/mesh or did not run.")
    if any(len(actual[key]) != 3 or not all(type(value) in (int, float) and math.isfinite(value) for value in actual[key]) for key in ("position_cm", "normal_enu")):
        raise RuntimeError(f"Support ray {sample['id']} returned a malformed native position/normal.")
    norm = math.sqrt(sum(value * value for value in actual["normal_enu"]))
    if norm == 0 or math.dist(actual["position_cm"], _source_to_native_cm(expected["position_m"])) > .1 or sum(a * b / norm for a, b in zip(actual["normal_enu"], expected["normal_enu"])) < .999:
        raise RuntimeError(f"Support ray {sample['id']} differs from the actual source plane by more than0.1cm or its normal.")


def _support_collision(mesh, triangles, source, bindings, road=False):
    editor = unreal.get_editor_subsystem(unreal.StaticMeshEditorSubsystem)
    body = mesh.get_editor_property("body_setup")
    if body is None or mesh.get_editor_property("complex_collision_mesh") is not None:
        raise RuntimeError(f"Cannot configure faithful support collision: {mesh.get_path_name()} has no own body or uses another mesh.")
    geometry = _support_glb(_support_read(source, bindings, (32 if road else 64) * 1024 * 1024), native_geometry=True, road=road)
    if geometry["source"]["triangles"] != triangles:
        raise RuntimeError(f"Cannot configure faithful support collision: {source['path']} differs from its declared raw source triangle count {triangles}.")
    if not editor.remove_collisions_with_notification(mesh, False):
        raise RuntimeError(f"Cannot remove coarse support hulls from {mesh.get_path_name()}.")
    body.set_editor_property("collision_trace_flag", unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE)
    nanite = mesh.get_editor_property("nanite_settings")
    nanite.set_editor_property("fallback_target", unreal.NaniteFallbackTarget.PERCENT_TRIANGLES)
    nanite.set_editor_property("fallback_percent_triangles", 1.0)
    nanite.set_editor_property("fallback_relative_error", 0.0)
    nanite.set_editor_property("generate_fallback", unreal.NaniteGenerateFallback.ENABLED)
    nanite.set_editor_property("keep_percent_triangles", 1.0)
    nanite.set_editor_property("trim_relative_error", 0.0)
    editor.set_nanite_settings(mesh, nanite, False)
    build = editor.get_lod_build_settings(mesh, 0)
    build.set_editor_property("remove_degenerates", False)
    build.set_editor_property("use_full_precision_u_vs", True)
    editor.set_lod_build_settings(mesh, 0, build)
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    unreal.SystemLibrary.execute_console_command(world, "Editor.AsyncAssetCompilationFinishAll")
    expected = triangles - len(geometry["excluded"])
    if mesh.get_num_triangles(0) != expected or body.get_editor_property("collision_trace_flag") != unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE:
        raise RuntimeError(f"Cannot configure faithful support collision: {mesh.get_path_name()} has {mesh.get_num_triangles(0)} native triangles; expected {expected} from {triangles} raw minus {len(geometry['excluded'])} exact float32 endpoint exclusions and own complex collision.")
    comparison = _support_compare_native_geometry(mesh, geometry)
    return {"asset": mesh.get_path_name(), "native_triangles": mesh.get_num_triangles(0), "collision_trace_flag": str(body.get_editor_property("collision_trace_flag")), "fallback_percent_triangles": mesh.get_editor_property("nanite_settings").fallback_percent_triangles, **comparison}


def _city_collision_component(component):
    return {"enabled": str(component.get_collision_enabled()), "profile": str(component.get_collision_profile_name()),
            "object_type": str(component.get_collision_object_type()),
            "responses": {str(channel): str(component.get_collision_response_to_channel(channel)) for channel in
                          (unreal.CollisionChannel.ECC_VISIBILITY, unreal.CollisionChannel.ECC_PAWN)}}


def _prepare_city_collision(state):
    """Route existing City triangles to both query modes; preserve every original hull for rollback."""
    editor = unreal.get_editor_subsystem(unreal.StaticMeshEditorSubsystem)
    rows, seen, original_flags = [], set(), {}
    state["city_collision_restore"] = []
    excluded = {row["actor_label"] for row in state["manifest"]["native_roads"]} | {"City_069_terrain"}
    actors = sorted((actor for actor in _actors().get_all_level_actors() if isinstance(actor, unreal.StaticMeshActor)
                     and actor.actor_has_tag("ShibuyaSource") and actor.get_actor_label() not in excluded), key=lambda actor: actor.get_actor_label())
    if not actors:
        raise RuntimeError("Cannot configure City collision: source building actors are missing.")
    for actor in actors:
        component = actor.static_mesh_component
        mesh = component.static_mesh
        path = mesh.get_path_name()
        body = mesh.get_editor_property("body_setup")
        triangles = mesh.get_num_triangles(0)
        before = _city_collision_component(component)
        if not path.startswith("/Game/City/") or body is None or mesh.get_editor_property("complex_collision_mesh") is not None or triangles <= 0 or not all(editor.is_section_collision_enabled(mesh, 0, index) for index in range(mesh.get_num_sections(0))):
            raise RuntimeError(f"Cannot configure City collision: {actor.get_actor_label()} needs its own nonempty collision-enabled native triangle mesh.")
        if path not in seen:
            seen.add(path)
            original_flag = body.get_editor_property("collision_trace_flag")
            original_geometry = body.get_editor_property("agg_geom")
            original_flags[path] = original_flag
            state["city_collision_restore"].append((mesh, body, original_flag, original_geometry))
            body.set_editor_property("collision_trace_flag", unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE)
            # BodySetup's AggGeom notification recreates live StaticMeshComponent physics.
            # ALWAYS is essential: the original hull data intentionally remains identical.
            body.set_editor_property("agg_geom", original_geometry, unreal.PropertyAccessChangeNotifyMode.ALWAYS)
        if body.get_editor_property("collision_trace_flag") != unreal.CollisionTraceFlag.CTF_USE_COMPLEX_AS_SIMPLE or mesh.get_num_triangles(0) != triangles or _city_collision_component(component) != before:
            raise RuntimeError(f"Cannot configure City collision: {actor.get_actor_label()} changed native geometry/filtering or retained coarse routing.")
        rows.append({"actor": actor.get_actor_label(), "asset": path, "native_triangles": triangles,
                     "original_collision_trace_flag": str(original_flags[path]), "collision_trace_flag": str(body.get_editor_property("collision_trace_flag")),
                     "simple_primitives_retained": editor.get_simple_collision_count(mesh), "convex_hulls_retained": editor.get_convex_collision_count(mesh),
                     "component_before": before, "component_after": _city_collision_component(component), "original_aggregate_geometry_retained": True})
    state["city_collision_actors"] = actors
    return {"building_actor_count": len(actors), "distinct_mesh_count": len(seen), "meshes": rows}


def _city_collision_hit(trace):
    if trace is None:
        return None
    hit = trace.to_dict()
    actor, component = hit.get("hit_actor"), hit.get("hit_component")
    mesh = component.static_mesh if isinstance(component, unreal.StaticMeshComponent) else None
    return {"actor": actor.get_actor_label() if actor else None, "asset": mesh.get_path_name() if mesh else None,
            "initial_overlap": hit["initial_overlap"], "time": hit["time"], "position_cm": _vector(hit["impact_point"]), "normal": _vector(hit["impact_normal"])}


def _city_collision_world_points(actor, points):
    return [_vector(actor.get_actor_transform().transform_location(point)) for point in points]


def _city_collision_witnesses(state):
    """Small fixed-selection facade/open-road checks using the ordinary explorer capsule dimensions."""
    actors = state["city_collision_actors"]
    if len(actors) < 3:
        raise RuntimeError("Cannot validate City collision: require three distinct representative building actors.")
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    if world is None:
        raise RuntimeError("Cannot validate City collision: editor world is unavailable.")
    results = []
    for actor in (actors[0], actors[len(actors) // 2], actors[-1]):
        mesh = actor.static_mesh_component.static_mesh
        bounds = mesh.get_bounds()
        facade = None
        for section in range(mesh.get_num_sections(0)):
            vertices, indices, *_ = unreal.ProceduralMeshLibrary.get_section_from_static_mesh(mesh, 0, section)
            for offset in range(0, len(indices), 3):
                local = [vertices[index] for index in indices[offset:offset + 3]]
                points = _city_collision_world_points(actor, local)
                centre = [sum(point[axis] for point in points) / 3 for axis in range(3)]
                a, b = [[points[index][axis] - points[0][axis] for axis in range(3)] for index in (1, 2)]
                cross = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
                length = math.sqrt(sum(value * value for value in cross))
                if length > 10000 and abs(cross[2]) / length < .05 and max(point[2] for point in points) - min(point[2] for point in points) > 250 and centre[2] > bounds.origin.z - bounds.box_extent.z + 120:
                    # StaticMesh collision cooks with bFlipNormals=true.
                    facade = (centre, [-value / length for value in cross])
                    break
            if facade:
                break
        if facade is None:
            raise RuntimeError(f"Cannot validate City collision: {actor.get_actor_label()} has no qualifying native facade witness.")
        centre, normal = facade
        start = [value + direction * 100 for value, direction in zip(centre, normal)]
        end = [value - direction * 100 for value, direction in zip(centre, normal)]
        for complex_query in (False, True):
            for shape in ("ray", "capsule"):
                args = (world, unreal.Vector(*start), unreal.Vector(*end))
                if shape == "capsule":
                    args += (28.0, 88.0)
                query = unreal.SystemLibrary.line_trace_single if shape == "ray" else unreal.SystemLibrary.capsule_trace_single_by_profile
                hit = _city_collision_hit(query(*args, unreal.TraceTypeQuery.TRACE_TYPE_QUERY1 if shape == "ray" else "Pawn", complex_query, [], unreal.DrawDebugTrace.NONE, True))
                row = {"kind": "facade-" + shape, "expected_actor": actor.get_actor_label(), "expected_asset": mesh.get_path_name(), "start_cm": start, "end_cm": end, "facade_centre_cm": centre, "facade_outward_normal": normal, "trace_complex": complex_query, "actual": hit}
                results.append(row)
                if hit is None or hit["actor"] != row["expected_actor"] or hit["asset"] != row["expected_asset"] or hit["initial_overlap"] is not False or not math.isfinite(hit["time"]) or not 0 < hit["time"] < 1 or any(not math.isfinite(value) for key in ("position_cm", "normal") for value in hit[key]) or abs(sum((value - expected) * axis for value, expected, axis in zip(hit["position_cm"], centre, normal))) > .1 or sum(value * axis for value, axis in zip(hit["normal"], normal)) < .999:
                    raise RuntimeError("Cannot validate City wall/capsule blockage before save: " + json.dumps(row, allow_nan=False))
    roads = []
    for sample in state["rays"]["samples"]:
        if sample["expected_hit"] and sample["expected"]["mesh_role"] == "road" and sample["expected"]["actor_label"] not in {row["expected"]["actor_label"] for row in roads}:
            roads.append(sample)
        if len(roads) == 3:
            break
    if len(roads) != 3:
        raise RuntimeError("Cannot validate City collision: require three admitted open-road capsule witnesses.")
    for sample in roads:
        start = [100 * value for value in sample["expected"]["position_m"]]
        start[2] += 90
        end = [start[0] + 10, start[1], start[2]]
        for complex_query in (False, True):
            hit = _city_collision_hit(unreal.SystemLibrary.capsule_trace_single_by_profile(world, unreal.Vector(*start), unreal.Vector(*end), 28.0, 88.0, "Pawn", complex_query, [], unreal.DrawDebugTrace.NONE, True))
            row = {"kind": "open-road-capsule", "source_ray_id": sample["id"], "start_cm": start, "end_cm": end, "trace_complex": complex_query, "actual": hit}
            results.append(row)
            if hit is not None:
                raise RuntimeError("Cannot validate open-road capsule clearance before save: " + json.dumps(row, allow_nan=False))
    return {"passed": True, "query_count": len(results), "capsule_radius_cm": 28, "capsule_half_height_cm": 88, "capsule_profile": "Pawn", "queries": results}


def _support_ray_collision_state(sample):
    """Read the expected collider and one ordered source/render face without changing physics."""
    expected = sample.get("expected", {})
    actor = next((actor for actor in _actors().get_all_level_actors() if actor.get_actor_label() == expected.get("actor_label")), None)
    result = {"actor_found": actor is not None}
    if actor is None:
        return result
    try:
        component = actor.static_mesh_component
        mesh = component.static_mesh
        body = mesh.get_editor_property("body_setup")
        result.update(actor_path=actor.get_path_name(), mesh_path=mesh.get_path_name(),
            collision_enabled=str(component.get_collision_enabled()), collision_profile=str(component.get_collision_profile_name()),
            collision_object_type=str(component.get_collision_object_type()),
            visibility_response=str(component.get_collision_response_to_channel(unreal.CollisionChannel.ECC_VISIBILITY)),
            body_path=body.get_path_name() if body else None,
            body_double_sided=body.get_editor_property("double_sided_geometry") if body else None,
            collision_trace_flag=str(body.get_editor_property("collision_trace_flag")) if body else None,
            native_lod0_triangles=mesh.get_num_triangles(0))
    except Exception as error:
        result["collision_observation_error"] = str(error)
        return result
    try:
        editor = unreal.get_editor_subsystem(unreal.StaticMeshEditorSubsystem)
        result["lod0_section_collision_enabled"] = [editor.is_section_collision_enabled(mesh, 0, section) for section in range(mesh.get_num_sections(0))]
    except Exception as error:
        result["section_collision_observation_error"] = str(error)
    try:
        face = expected["source_triangle_index"]
        description = mesh.get_static_mesh_description(0)
        ids = [description.get_vertex_instance_vertex(description.get_triangle_vertex_instance(unreal.TriangleID(face), corner)) for corner in range(3)]
        positions = [_vector(description.get_vertex_position(vertex)) for vertex in ids]
        result.update(native_source_triangle_id=face, native_source_triangle_positions_cm=positions)
        key = sorted(_support_point_key(point) for point in positions)
        matches = []
        if mesh.get_num_triangles(0) <= 100000:
            for section in range(mesh.get_num_sections(0)):
                vertices, indices, _normals, _uvs, _tangents = unreal.ProceduralMeshLibrary.get_section_from_static_mesh(mesh, 0, section)
                for offset in range(0, len(indices), 3):
                    points = [_vector(vertices[index]) for index in indices[offset:offset + 3]]
                    if sorted(_support_point_key(point) for point in points) != key:
                        continue
                    a, b, c = points
                    u, v = [b[i] - a[i] for i in range(3)], [c[i] - a[i] for i in range(3)]
                    cross = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
                    length = math.sqrt(sum(value*value for value in cross))
                    if len(matches) < 8:
                        matches.append({"section": section, "render_triangle": offset // 3, "ordered_positions_cm": points,
                            "right_handed_cross_normal": [value / length for value in cross] if length else None})
            result["matching_render_face_orientation_samples"] = matches
        else:
            result["render_orientation_scan_skipped"] = "Diagnostic bound: more than100000 triangles; source face positions retained."
    except Exception as error:
        result["orientation_observation_error"] = str(error)
    return result


def _support_ray_failure_packet(receipt, state):
    """Retain bounded actual failures; digests/counts cover the complete observed population."""
    def safe(value):
        if isinstance(value, dict): return {key: safe(item) for key, item in value.items()}
        if isinstance(value, (list, tuple)): return [safe(item) for item in value]
        if type(value) is float and not math.isfinite(value): return repr(value)
        return value
    def digest(value):
        raw = json.dumps(safe(value), sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")
        return hashlib.sha256(raw).hexdigest()
    key = lambda row: (row["id"], row["trace_complex"])
    declared = [{"id": sample["id"], "trace_complex": mode} for sample in state["rays"]["samples"] for mode in (False, True)]
    queries, failures = receipt["queries"], receipt["failures"]
    declared_keys, executed_keys, failed_keys = set(map(key, declared)), set(map(key, queries)), set(map(key, failures))
    if len(declared_keys) != len(declared) or len(executed_keys) != len(queries) or len(failed_keys) != len(failures) or not failed_keys <= executed_keys <= declared_keys or any(row.get("query_ran") is not True for row in queries):
        raise RuntimeError("Cannot retain failed support rays: declared/executed/failure identities are inconsistent.")
    selected = [row for row in queries if key(row) in failed_keys][:16]
    selected_keys = set(map(key, selected))
    not_run = [row for row in declared if key(row) not in executed_keys]
    modes = {}
    for mode, name in ((False, "simple"), (True, "complex")):
        executed = sum(row["trace_complex"] is mode for row in queries)
        failed = sum(row["trace_complex"] is mode for row in failures)
        modes[name] = {"declared": len(state["rays"]["samples"]), "executed": executed, "observed_failed": failed,
                       "observed_succeeded": executed-failed, "did_not_run": len(state["rays"]["samples"])-executed}
    labels = {(row.get("expected") or {}).get("actor_label") or "<source-expected-miss>" for row in selected}
    return {"schema_version": 2, "passed": False, "map_saved": False,
            "declared_sample_count": len(state["rays"]["samples"]), "declared_query_count": len(declared),
            "query_count": len(queries), "failed_query_count": len(failures), "observed_succeeded_query_count": len(queries)-len(failures),
            "query_modes": modes, "selected_failed_query_count": len(selected), "omitted_failed_query_count": len(failures)-len(selected),
            "omitted_succeeded_query_count": len(queries)-len(failures),
            "did_not_run": {"status": "DID_NOT_RUN", "query_count": len(not_run), "ordered_query_identities_sha256": digest(not_run)},
            "declared_ordered_query_identities_sha256": digest(declared),
            "all_executed_query_rows_sha256": digest(queries), "all_observed_failure_rows_sha256": digest(failures),
            "digest_encoding": "SHA-256 of UTF-8 sorted compact JSON; nonfinite floats become repr strings. Identity rows contain id and trace_complex; executed rows are complete actual records.",
            "queries": selected, "failures": [row for row in failures if key(row) in selected_keys],
            "record_selection": "First16 observed failed queries in actual execution order; all successful rows and later failed rows omitted with counts and complete-population digests.",
            "support_surface": {"path": state.get("manifest_path"), "sha256": state.get("manifest_sha256")},
            "declared_ray_file": state["manifest"]["native_ray_samples"], "source_bindings": state.get("bindings", {}),
            "expected_colliders": {label: value for label, value in receipt["expected_colliders"].items() if label in labels},
            "terrain_collision": receipt.get("terrain_collision"), "road_collision_receipts": receipt.get("road_collision_receipts", []),
            "city_collision": receipt.get("city_collision"), "physical_context": receipt.get("physical_context"),
            "run_status": receipt.get("run_status", "NATIVE_QUERIES_EXECUTED_WITH_FAILURES"),
            "bound": "Failure evidence only; declared ray-file record binds original source bytes, actual row digests cover only executed queries. Unexecuted queries are neither successes nor failures; no map save or support acceptance."}


def _support_save_ray_failure(receipt):
    def safe(value):
        if isinstance(value, dict): return {key: safe(item) for key, item in value.items()}
        if isinstance(value, (list, tuple)): return [safe(item) for item in value]
        if type(value) is float and not math.isfinite(value): return repr(value)
        return value
    encoded = json.dumps(safe(receipt), sort_keys=True, separators=(",", ":"), allow_nan=False).encode("utf-8")
    if len(encoded) > 2 * 1024 * 1024:
        raise RuntimeError("Cannot retain failed support ray receipt: diagnostic exceeds the2MiB bound.")
    folder = PROJECT / "artifacts/unreal"
    for ancestor in (folder, *folder.parents):
        if ancestor.lstat().st_file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT:
            raise RuntimeError("Cannot retain failed support rays through a reparse ancestor.")
    output = folder / ("support-rays-failed-" + uuid.uuid4().hex + ".json")
    with output.open("xb") as stream:
        stream.write(encoded)
    return {"path": output.relative_to(PROJECT).as_posix(), "bytes": len(encoded), "sha256": hashlib.sha256(encoded).hexdigest()}


def _support_physical_context(state):
    """Read all26colliders through one public native observer; unknown stays DNR."""
    rows, issues = [], []
    version, clean = None, None
    manifest = state["manifest"]
    expected = {row["actor_label"]: row["native_mesh_path"] for row in manifest["native_roads"]}
    expected["City_069_terrain"] = manifest["native_assignment"]["replacement_mesh_path"]
    comparisons = [state.get("collision", {})] + [row["collision"] for row in state.get("road_collision_receipts", [])]
    by_asset = {row.get("asset"): row for row in comparisons}
    actors = list(_actors().get_all_level_actors())
    vectors = ("body_build_scale", "render_build_scale", "actor_scale", "component_scale",
               "actor_location_cm", "actor_rotation", "component_location_cm", "component_rotation")
    numbers = ("lod_for_collision", "selected_collision_lod", "fallback_percent_triangles",
               "fallback_relative_error", "keep_percent_triangles", "trim_relative_error")
    exact = {"own_complex_source": True, "collision_trace_flag": "CTF_UseComplexAsSimple", "double_sided": False,
             "lod_for_collision": 0, "selected_collision_lod": 0, "collision_enabled": "QueryAndPhysics",
             "collision_profile": "BlockAll", "collision_object_type": "ECC_WorldStatic", "visibility_response": "ECR_Block",
             "fallback_target": "PercentTriangles", "generate_fallback": "Enabled", "fallback_percent_triangles": 1.,
             "fallback_relative_error": 0., "keep_percent_triangles": 1., "trim_relative_error": 0.}
    required = {"schema_version", "observer", "available", "editor_data_available", "engine_version", "current_enable_mesh_clean",
                "actor_path", "component_path", "mesh_path", "body_path", "mesh_collide_all", "nanite_enabled", "section_collision_enabled",
                *exact, *vectors}
    for label, wanted in expected.items():
        row = {"actor_label": label, "expected_mesh_path": wanted}
        try:
            matches = [actor for actor in actors if actor.get_actor_label() == label]
            if len(matches) != 1:
                raise RuntimeError("expected exactly one loaded ground actor")
            actor = matches[0]
            component = actor.static_mesh_component
            observed = json.loads(unreal.ShibuyaRendererLibrary.inspect_support_collision_context(component))
            if (not isinstance(observed, dict) or type(observed.get("schema_version")) is not int or observed["schema_version"] != 1
                    or observed.get("observer") != "ue-public-static-mesh-collision-context-v1" or observed.get("available") is not True
                    or observed.get("editor_data_available") is not True or not required.issubset(observed)):
                raise RuntimeError("native collision context unavailable/incomplete/unknown: " + str(observed.get("unavailable_reason") if isinstance(observed, dict) else observed))
            row.update(observed)
            if (row["component_path"] != component.get_path_name() or row["actor_path"] != actor.get_path_name()
                    or row["mesh_path"] != wanted or not isinstance(row["body_path"], str) or not row["body_path"]):
                raise RuntimeError("native collision context identity does not match the actual selected component/actor/mesh")
            if version is None: version, clean = row["engine_version"], row["current_enable_mesh_clean"]
            if (not isinstance(row["engine_version"], str) or not re.match(r"^5\.8\.3-58210709(?:\+|$)", row["engine_version"])
                    or type(row["current_enable_mesh_clean"]) is not int or row["current_enable_mesh_clean"] != 1
                    or (row["engine_version"], row["current_enable_mesh_clean"]) != (version, clean)):
                raise RuntimeError("unsupported or inconsistent current engine version or p.EnableMeshClean")
            row["complete_rendered_geometry_multiset_equal"] = by_asset.get(row["mesh_path"], {}).get("complete_rendered_geometry_multiset_equal")
            if (any(row[key] != value for key, value in exact.items())
                    or any(type(row[key]) is not bool for key in ("own_complex_source", "double_sided", "mesh_collide_all", "nanite_enabled"))
                    or any(type(row[key]) not in (int, float) or not math.isfinite(row[key]) for key in numbers)
                    or any(not isinstance(row[key], list) or len(row[key]) != 3 or any(type(v) not in (int, float) or not math.isfinite(v) for v in row[key]) for key in vectors)
                    or any(row[key] != [1., 1., 1.] for key in vectors[:4])
                    or any(row[key] != [0., 0., 0.] for key in vectors[4:])
                    or not isinstance(row["section_collision_enabled"], list) or not row["section_collision_enabled"]
                    or any(value is not True for value in row["section_collision_enabled"])
                    or row["complete_rendered_geometry_multiset_equal"] is not True):
                raise RuntimeError("current ground collider differs from the declared conditional model context")
            row["supported"] = True
        except Exception as error:
            row.update(supported=False, unsupported_reason=str(error))
            issues.append(label + ": " + str(error))
        rows.append(row)
    if len(rows) != 26:
        issues.append("conditional physical context requires all26groundcolliders")
    return {"status": "MATCHED_CURRENT_CONTEXT" if not issues else "DID_NOT_RUN_UNSUPPORTED_PHYSICAL_CONTEXT",
            "passed": not issues, "engine_version": version, "current_enable_mesh_clean": clean,
            "historical_ddc_cook_time_flags": "UNOBSERVED_CONDITIONAL_PREDICTION_ONLY",
            "physical_query_model": state["physical_query_model"], "colliders": rows, "issues": issues,
            "bound": "Current public native settings/readback and raw render geometry only. Full native queries qualify this bounded prediction; no global raw-to-cooked or source-to-Chaos-ray equivalence."}


def _support_native_rays(state):
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    if world is None:
        raise RuntimeError("Cannot validate support rays: the native editor world is unavailable.")
    context = None
    if state.get("physical_query_model") is not None:
        try:
            context = _support_physical_context(state)
        except Exception as error:
            context = {"passed": False, "status": "DID_NOT_RUN_UNSUPPORTED_PHYSICAL_CONTEXT", "issues": [str(error)]}
        if not context["passed"]:
            receipt = {"passed": False, "map_saved": False, "run_status": context["status"], "query_count": 0,
                "failed_query_count": 0, "queries": [], "failures": [], "expected_colliders": {}, "physical_context": context}
            retained = _support_save_ray_failure(_support_ray_failure_packet(receipt, state))
            raise RuntimeError("DID_NOT_RUN: unsupported physical context; zero native queries executed: " + json.dumps(retained, sort_keys=True))
    manifest = state["manifest"]
    mesh_paths = {row["actor_label"]: row["native_mesh_path"] for row in manifest["native_roads"]}
    mesh_paths["City_069_terrain"] = manifest["native_assignment"]["replacement_mesh_path"]
    results, failures, colliders = [], [], {}
    for sample in state["rays"]["samples"]:
        if sample["expected_hit"]:
            sample["expected"]["native_mesh_path"] = mesh_paths[sample["expected"]["actor_label"]]
        for complex_query in (False, True):
            hit = unreal.SystemLibrary.line_trace_single(world, unreal.Vector(*_source_to_native_cm(sample["start_m"])), unreal.Vector(*_source_to_native_cm(sample["end_m"])), unreal.TraceTypeQuery.TRACE_TYPE_QUERY1, complex_query, [], unreal.DrawDebugTrace.NONE, True)
            actual = None
            if hit is not None:
                fields = hit.to_dict()
                component = fields["hit_component"]
                mesh = component.get_editor_property("static_mesh") if isinstance(component, unreal.StaticMeshComponent) else None
                actual = {"actor_label": fields["hit_actor"].get_actor_label(), "mesh_path": mesh.get_path_name() if mesh else None, "position_cm": _vector(fields["impact_point"]), "normal_enu": _source_normal_to_native(_vector(fields["impact_normal"])), "normal_native": _vector(fields["impact_normal"])}
            result = {"id": sample["id"], "trace_complex": complex_query, "query_ran": True,
                      "query_returned_none": hit is None, "query_result_type": type(hit).__name__,
                      "world_present": world is not None, "expected_hit": sample["expected_hit"],
                      "start_m": sample["start_m"], "end_m": sample["end_m"], "native_frame": _native_frame_record(), "start_native_cm": _source_to_native_cm(sample["start_m"]), "end_native_cm": _source_to_native_cm(sample["end_m"]), "expected": sample.get("expected"), "actual": actual}
            results.append(result)
            try:
                _support_check_hit(sample, actual)
            except RuntimeError as error:
                failures.append({"id": sample["id"], "trace_complex": complex_query, "error": str(error)})
                label = sample.get("expected", {}).get("actor_label") or "<source-expected-miss>"
                if label not in colliders:
                    colliders[label] = _support_ray_collision_state(sample)
    if failures:
        receipt = {"passed": False, "map_saved": False, "query_count": len(results), "failed_query_count": len(failures),
                   "queries": results, "failures": failures, "expected_colliders": colliders,
                   "terrain_collision": state.get("collision"), "road_collision_receipts": state.get("road_collision_receipts", []), "city_collision": state.get("city_collision"), "physical_context": context}
        try:
            retained = _support_save_ray_failure(_support_ray_failure_packet(receipt, state))
        except Exception as error:
            raise RuntimeError(failures[0]["error"] + "; failed ray diagnostic publication: " + str(error)) from error
        raise RuntimeError(failures[0]["error"] + "; bounded failed queries and complete population digests retained before map save: " + json.dumps(retained, sort_keys=True))
    return {"passed": True, "ray_file": manifest["native_ray_samples"], "query_count": len(results), "road_actor_count": 25, "queries": results, "physical_context": context}


def _abort_support_update(reason):
    global _support_update
    if _support_update:
        state = _support_update
        state["failure"] = str(reason)
        state["status"] = "failed-not-saved; imported packages are not rolled back"
        for mesh, body, original_flag, original_geometry in reversed(state.get("city_collision_restore", [])):
            try:
                body.set_editor_property("collision_trace_flag", original_flag)
                body.set_editor_property("agg_geom", original_geometry, unreal.PropertyAccessChangeNotifyMode.ALWAYS)
            except Exception as error:
                state.setdefault("live_restore_errors", []).append("City collision rollback " + mesh.get_path_name() + ": " + str(error))
        state["city_collision_restore"] = []
        for restore in (lambda: state["terrain"].static_mesh_component.set_static_mesh(state["old_mesh"]), lambda: state["terrain"].set_actor_transform(state["transform"], False, False)):
            try:
                restore()
            except Exception as error:
                state.setdefault("live_restore_errors", []).append(str(error))


def _support_material_packages(assignment):
    result = {}
    for field in ("material_path", "texture_path"):
        package = assignment[field].split(".")[0]
        if not package.startswith("/Game/"):
            raise RuntimeError("Cannot preserve support material packages outside the project.")
        for suffix in (".uasset", ".uexp", ".ubulk"):
            relative = "Content/" + package[len("/Game/"):] + suffix
            try:
                path = _local_file(relative)
            except FileNotFoundError:
                if suffix == ".uasset":
                    raise
                continue
            size = path.stat().st_size
            if size > 512 * 1024 * 1024:
                raise RuntimeError("Cannot preserve support material package above the native asset size bound.")
            digest = hashlib.sha256()
            total = 0
            with path.open("rb") as stream:
                while chunk := stream.read(min(1024 * 1024, size + 1 - total)):
                    total += len(chunk)
                    digest.update(chunk)
            if total != size:
                raise RuntimeError("Cannot preserve support material package that changed length during its bounded read.")
            result[relative] = digest.hexdigest()
    return result


def _support_transform_values(value):
    """Observe exact transform components; invalid scalars stay visible in JSON and cannot compare equal."""
    fields = {"translation_cm": _vector(value.translation), "rotation_xyzw": [value.rotation.x, value.rotation.y, value.rotation.z, value.rotation.w], "scale3d": _vector(value.scale3d)}
    return {name: [component if type(component) in (int, float) and math.isfinite(component) else repr(component) for component in values] for name, values in fields.items()}


def _support_transforms_equal(before, after):
    before, after = _support_transform_values(before), _support_transform_values(after)
    return all(type(component) in (int, float) and math.isfinite(component) for fields in (before, after) for values in fields.values() for component in values) and before == after


def _support_terrain_failure(state, terrain, centre, extent):
    """Describe the existing failed conservation guard before live rollback."""
    actual = [[a - b for a, b in zip(_vector(centre), _vector(extent))], [a + b for a, b in zip(_vector(centre), _vector(extent))]]
    expected = [[point[0] * 100, point[2] * 100, point[1] * 100] for point in state["manifest"]["derived_terrain"]["bounds_glb_m"]]
    error = max(abs(value - wanted) for side, wanted_side in zip(actual, expected) for value, wanted in zip(side, wanted_side))
    transform = terrain.get_actor_transform()
    before, after = state["unaffected"], _source_actor_state({"City_069_terrain"})
    changed = sorted(label for label in before.keys() | after.keys() if before.get(label) != after.get(label))
    result = {"bounds_match": error <= .1, "transform_unchanged": _support_transforms_equal(state["transform"], transform), "other_source_actors_unchanged": before == after,
              "actual_bounds_cm": actual, "expected_bounds_cm": expected, "maximum_bounds_error_cm": error,
              "transform_before": _support_transform_values(state["transform"]), "transform_after": _support_transform_values(transform),
              "intentionally_excluded_source_actor_labels": ["City_069_terrain"], "other_source_actor_count_before": len(before), "other_source_actor_count_after": len(after),
              "changed_source_actor_labels": changed, "changed_source_actors": {label: {"before": before.get(label), "after": after.get(label)} for label in changed},
              "terrain_collision": state["collision"], "map_saved": False}
    try:
        mesh = terrain.static_mesh_component.static_mesh
        bounds = mesh.get_bounds()
        result["native_mesh_local_bounds_cm"] = [[a - b for a, b in zip(_vector(bounds.origin), _vector(bounds.box_extent))], [a + b for a, b in zip(_vector(bounds.origin), _vector(bounds.box_extent))]]
        result["native_mesh_bounds_extensions_cm"] = {key: _vector(mesh.get_editor_property(key)) for key in ("negative_bounds_extension", "positive_bounds_extension")}
        result["component_bounds_scale"] = terrain.static_mesh_component.get_editor_property("bounds_scale")
    except Exception as error:
        result["bounds_metadata_read_error"] = str(error)
    encoded = json.dumps(result, sort_keys=True, separators=(",", ":"), allow_nan=False)
    if len(encoded.encode("utf-8")) > 128 * 1024:
        result["changed_source_actor_states_sha256"] = hashlib.sha256(json.dumps(result.pop("changed_source_actors"), sort_keys=True).encode()).hexdigest()
        result["changed_source_actor_states_omitted"] = "Detailed states exceed the128KiB error bound; all changed labels remain recorded."
        encoded = json.dumps(result, sort_keys=True, separators=(",", ":"), allow_nan=False)
    return encoded


def _prepare_support_terrain(manifest_path):
    global _support_update
    if _support_update:
        raise RuntimeError("Cannot replace support terrain: this process has an unfinished/failed support update; restart the normal surface operation.")
    _prepare_gsi_sampling(True)
    _native_scene_frame(require=True)
    state = _admit_support_surface(manifest_path)
    assignment = state["manifest"]["native_assignment"]
    actors = [actor for actor in _actors().get_all_level_actors() if isinstance(actor, unreal.StaticMeshActor) and actor.actor_has_tag("ShibuyaSource")]
    terrain = next((actor for actor in actors if actor.get_actor_label() == "City_069_terrain"), None)
    if len(actors) != 112 or terrain is None or terrain.static_mesh_component.static_mesh.get_path_name() not in (assignment["original_mesh_path"], assignment["replacement_mesh_path"]):
        raise RuntimeError("Cannot prepare support terrain: require112 existing source actors and the exact original/replacement terrain actor.")
    material = unreal.load_asset(assignment["material_path"])
    if material is None or {texture.get_path_name() for texture in unreal.MaterialEditingLibrary.get_material_used_textures(material)} != {assignment["texture_path"]}:
        raise RuntimeError("Cannot prepare support terrain: import the admitted TerrainPhoto material with its exact GSI atlas first.")
    state.update(terrain=terrain, old_mesh=terrain.static_mesh_component.static_mesh, transform=terrain.get_actor_transform(), unaffected=_source_actor_state({"City_069_terrain"}), material=material, material_state=_material_parameter_state(material), material_packages=_support_material_packages(assignment), actor_pins={actor.get_actor_label(): (actor.get_path_name(), sorted(map(str, actor.tags))) for actor in actors}, status="pending-road-validation")
    if len(state["unaffected"]) != 111 or len(state["actor_pins"]) != 112:
        raise RuntimeError("Cannot prepare support terrain: source actor identities are duplicated or incomplete.")
    _support_update = state
    try:
        previous_replacement = unreal.load_asset(assignment["replacement_mesh_path"])
        if previous_replacement:
            unreal.EditorAssetLibrary.set_metadata_tag(previous_replacement, "ShibuyaSupportState", "pending")
            if not unreal.EditorAssetLibrary.save_loaded_asset(previous_replacement, False):
                _abort_support_update("Cannot persist the incomplete reimport marker")
                raise RuntimeError("Cannot prepare support terrain: existing replacement could not be marked pending before reimport.")
        imported = _import_glb(PROJECT / state["manifest"]["derived_terrain"]["path"], "/Game/Surface/TerrainSupport", require_textures=False, prepare_nanite=False)
        if len(imported) != 1 or imported[0].get_path_name() != assignment["replacement_mesh_path"]:
            raise RuntimeError("Cannot prepare support terrain: exact assigned TerrainSupport mesh was not imported.")
        mesh = imported[0]
        unreal.EditorAssetLibrary.set_metadata_tag(mesh, "ShibuyaSupportState", "pending")
        unreal.EditorAssetLibrary.set_metadata_tag(mesh, "ShibuyaSupportManifest", state["manifest_path"])
        unreal.EditorAssetLibrary.set_metadata_tag(mesh, "ShibuyaSupportManifestSHA256", state["manifest_sha256"])
        if not unreal.EditorAssetLibrary.save_loaded_asset(mesh, False):
            raise RuntimeError("Cannot prepare support terrain: native pending marker was not saved.")
    except Exception as error:
        _abort_support_update(error)
        raise
    try:
        slots = list(mesh.static_materials)
        for slot in slots:
            slot.material_interface = material
        mesh.set_editor_property("static_materials", slots)
        state["collision"] = _support_collision(mesh, state["manifest"]["derived_terrain"]["triangles"], state["manifest"]["derived_terrain"], state["bindings"])
        terrain.static_mesh_component.set_static_mesh(mesh)
        centre, extent = terrain.get_actor_bounds(False)
        bounds = state["manifest"]["derived_terrain"]["bounds_glb_m"]
        expected_low = [bounds[0][0]*100, -bounds[1][2]*100, bounds[0][1]*100]
        expected_high = [bounds[1][0]*100, -bounds[0][2]*100, bounds[1][1]*100]
        if any(abs(actual - wanted) > .1 for values, expected in (([a - b for a, b in zip(_vector(centre), _vector(extent))], expected_low), ([a + b for a, b in zip(_vector(centre), _vector(extent))], expected_high)) for actual, wanted in zip(values, expected)) or not _support_transforms_equal(state["transform"], terrain.get_actor_transform()) or _source_actor_state({"City_069_terrain"}) != state["unaffected"]:
            raise RuntimeError("Cannot prepare support terrain: conservation failed before rollback; " + _support_terrain_failure(state, terrain, centre, extent))
    except Exception as error:
        _abort_support_update(error)
        raise
    return {"support_manifest_sha256": state["manifest_sha256"], "terrain_actor": terrain.get_path_name(), "terrain_asset": mesh.get_path_name(), "terrain_collision": state["collision"], "native_assignment": assignment, "native_ray_samples": state["manifest"]["native_ray_samples"], "material_package_sha256": state["material_packages"], "status": "pending-road-validation", "map_saved": False, "terrain_geometry_bytes_unchanged": False, "source_reconciled_geometry": state["manifest"]["derived_terrain"], "other_source_actor_count": 111, "other_source_actors_unchanged": True}


def _require_complete_support():
    _native_scene_frame(require=True)
    if _support_update:
        raise RuntimeError("Cannot configure/save daylight: support installation is unfinished or failed; complete the normal25-road/ray validation first.")
    for actor in _actors().get_all_level_actors():
        if isinstance(actor, unreal.StaticMeshActor) and actor.get_actor_label() == "City_069_terrain":
            mesh = actor.static_mesh_component.static_mesh
            if mesh.get_path_name().startswith("/Game/Surface/TerrainSupport/"):
                if unreal.EditorAssetLibrary.get_metadata_tag(mesh, "ShibuyaSupportState") != "validated":
                    raise RuntimeError("Cannot configure/save daylight: TerrainSupport lacks a completed native road/ray admission.")
                path = unreal.EditorAssetLibrary.get_metadata_tag(mesh, "ShibuyaSupportManifest")
                state = _support_completed if _support_completed and _support_completed["manifest_path"] == path else _admit_support_surface(PROJECT / path)
                if state["manifest_sha256"] != unreal.EditorAssetLibrary.get_metadata_tag(mesh, "ShibuyaSupportManifestSHA256"):
                    raise RuntimeError("Cannot configure/save daylight: saved TerrainSupport belongs to a different source generation.")


def _validate_support_installation(state):
    actors = [actor for actor in _actors().get_all_level_actors() if isinstance(actor, unreal.StaticMeshActor) and actor.actor_has_tag("ShibuyaSource")]
    if {actor.get_actor_label(): (actor.get_path_name(), sorted(map(str, actor.tags))) for actor in actors} != state["actor_pins"] or len(actors) != 112 or not _support_transforms_equal(state["transform"], state["terrain"].get_actor_transform()) or _source_actor_state({"City_069_terrain"}) != state["unaffected"]:
        raise RuntimeError("Cannot save support surface: a source actor identity/tag/transform or another111 source meshes changed.")
    if _material_parameter_state(state["material"]) != state["material_state"] or _support_material_packages(state["manifest"]["native_assignment"]) != state["material_packages"]:
        raise RuntimeError("Cannot save support surface: the admitted photographic material parameters changed.")
    result = _support_native_rays(state)
    for record in state["bindings"].values():
        _support_read(record, {}, 64 * 1024 * 1024 if record["path"] == state["manifest"]["derived_terrain"]["path"] else 32 * 1024 * 1024)
    return result


def _actors():
    return unreal.get_editor_subsystem(unreal.EditorActorSubsystem)


def _vector(value):
    return [value.x, value.y, value.z]


def _rotator(value):
    return [value.pitch, value.yaw, value.roll]


def _lumen_capture_policy(settings):
    """Read current component PP and process cvars; not resolved render-thread PP or irradiance."""
    properties = ("lumen_scene_view_distance", "lumen_max_trace_distance", "lumen_scene_detail",
                  "lumen_scene_lighting_quality", "lumen_surface_cache_resolution")
    return {"component_pp": {name: {"value": getattr(settings, name), "override": getattr(settings, "override_" + name)} for name in properties},
            "cvars": {name: unreal.SystemLibrary.get_console_variable_float_value(name) for name in (
                "r.LumenScene.GlobalSDF.ClipmapExtent", "r.AOGlobalDistanceField.NumClipmaps",
                "r.LumenScene.SurfaceCache.CardMinResolution", "r.LumenScene.SurfaceCache.CardTexelDensityScale")}}


def _apply_capture_coverage(world, settings):
    """Extend software scene reach, preserving the original local tracing and physical camera policy."""
    before = _lumen_capture_policy(settings)
    prior_extent = before["cvars"]["r.LumenScene.GlobalSDF.ClipmapExtent"]
    if not math.isfinite(prior_extent) or prior_extent <= 0:
        raise RuntimeError("Cannot apply full-crop coverage: the native first global-SDF clipmap extent is missing or invalid.")
    settings.override_lumen_scene_view_distance = True
    settings.lumen_scene_view_distance = 240000.0
    return {"before": before, "prior_extent_cm": prior_extent}


def _restore_capture_coverage(state):
    coverage = state.get("coverage")
    if not coverage:
        return {"changed": False}
    prior = coverage["prior_extent_cm"]
    unreal.SystemLibrary.execute_console_command(state["world"], f"r.LumenScene.GlobalSDF.ClipmapExtent {prior:.9g}")
    actual = unreal.SystemLibrary.get_console_variable_float_value("r.LumenScene.GlobalSDF.ClipmapExtent")
    if not math.isfinite(actual) or abs(actual - prior) > .001:
        raise RuntimeError(f"Cannot restore capture coverage: clipmap extent is{actual!r}cm; expected prior native{prior!r}cm.")
    return {"changed": True, "prior_extent_cm": prior, "observed_restored_extent_cm": actual, "restored": True}


def _capture_diagnostic_path(relative, new=True):
    """Fixed diagnostic artifacts only; inspect lexical ancestry before any IO."""
    if type(relative) is not str or not re.fullmatch(r"artifacts/unreal/buffers-[0-9]{8}-[0-9]{6}/crossing(?:-[a-z0-9-]+\.rgba32f)?", relative):
        raise RuntimeError("Cannot retain camera buffers: use artifacts/unreal/buffers-YYYYMMDD-HHMMSS/crossing and fixed diagnostic suffixes.")
    path = PROJECT / relative
    for part in list(reversed(path.parents)) + [path]:
        try:
            info = part.lstat()
        except FileNotFoundError:
            if part == path and new:
                return path
            raise RuntimeError("Cannot retain camera buffers: missing owned parent or file " + str(part)) from None
        if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & 1024:
            raise RuntimeError("Cannot retain camera buffers through linked/reparse path: " + str(part))
        if part == path:
            if new:
                raise RuntimeError("Cannot retain camera buffers: output already exists: " + str(path))
            if not stat.S_ISREG(info.st_mode):
                raise RuntimeError("Cannot read back camera buffers: output is not a regular file: " + str(path))
    return path


def _capture_diagnostic_restore(state):
    diagnostic = state.get("diagnostic")
    if not diagnostic:
        return {"changed": False}
    component = state["actor"].capture_component2d
    component.capture_source = diagnostic["original_source"]
    component.texture_target = diagnostic["original_target"]
    if component.capture_source != diagnostic["original_source"] or component.texture_target != diagnostic["original_target"]:
        raise RuntimeError("Cannot restore camera diagnostic: native capture source/target did not retain the original final-color objects.")
    unreal.RenderingLibrary.release_render_target2d(diagnostic["texture"])
    state.pop("diagnostic")
    return {"changed": True, "restored": True, "linear_target_release_requested": True, "diagnostic_capture_frames": diagnostic["frames"],
            "final_capture_frames": state["frames"], "raw_bytes_written": diagnostic["bytes_written"]}


def _capture_diagnostic_witness(state):
    diagnostic = state["diagnostic"]
    actor, texture = state["actor"], diagnostic["texture"]
    component = actor.capture_component2d
    forward_shading = unreal.SystemLibrary.get_console_variable_int_value("r.ForwardShading")
    if type(forward_shading) is not int or forward_shading != 0:
        raise RuntimeError("Cannot read BaseColor/normal buffers: require the deferred renderer with actual r.ForwardShading=0; forward rendering substitutes scene color.")
    if component.texture_target != texture or texture.render_target_format != unreal.TextureRenderTargetFormat.RTF_RGBA32F or [texture.size_x, texture.size_y] != [1280, 720] or abs(texture.get_editor_property("target_gamma") - 1.0) > 1e-6:
        raise RuntimeError("Cannot read camera diagnostic: expected the owned1280x720 linearRGBA32F target with gamma1.")
    return {"native_frame": _native_frame_record(), "source_camera_enu_m": state["camera_m"],
            "source_target_enu_m": state["target_m"], "actor_location_cm": _vector(actor.get_actor_location()),
            "component_location_cm": _vector(component.get_world_location()), "forward": _vector(component.get_forward_vector()),
            "right": _vector(actor.get_actor_right_vector()), "up": _vector(actor.get_actor_up_vector()),
            "capture_source": str(component.capture_source), "render_target_format": str(texture.render_target_format),
            "target_dimensions": [1280, 720], "target_gamma": texture.get_editor_property("target_gamma"),
            "fov_horizontal_degrees": component.fov_angle, "final_capture_frames": state["frames"],
            "diagnostic_capture_frames": diagnostic["frames"], "native_current_frame": unreal.SystemLibrary.get_frame_count(),
            "photographic_policy_properties": _photographic_policy(component.get_editor_property("post_process_settings")),
            "resolved_post_process": "UNOBSERVED; these are actual pixel buffers and object properties, not merged FSceneView settings."}


def _capture_diagnostic_write(state, name, box):
    diagnostic = state["diagnostic"]
    x, y, right, bottom = box
    width, height = right - x, bottom - y
    expected = width * height
    # UE5.8's MaxX/MaxY binding arguments reach Width/Height in the native helper.
    pixels = unreal.RenderingLibrary.read_render_target_raw_pixel_area(state["world"], diagnostic["texture"], x, y, width, height, False)
    if len(pixels) != expected:
        raise RuntimeError(f"Cannot retain camera buffer {name}: native ROI returned{len(pixels)}pixels; expected{expected}for{x},{y},{width},{height} Width/Height.")
    payload = bytearray(expected * 16)
    for index, color in enumerate(pixels):
        values = (color.r, color.g, color.b, color.a)
        if any(type(value) not in (int, float) or not math.isfinite(value) for value in values):
            raise RuntimeError(f"Cannot retain camera buffer {name}: nonfinite/non-numeric RGBA at ROI pixel{index}.")
        try:
            struct.pack_into("<4f", payload, index * 16, *values)
        except (OverflowError, struct.error) as error:
            raise RuntimeError(f"Cannot retain camera buffer {name}: RGBA exceeds float32 at ROI pixel{index}.") from error
    if diagnostic["bytes_written"] + len(payload) > 32 * 1024 * 1024:
        raise RuntimeError("Cannot retain camera buffers: fixed raw payloads exceed32MiB for this capture.")
    relative = diagnostic["prefix"] + "-" + name + ".rgba32f"
    output = _capture_diagnostic_path(relative)
    with output.open("xb") as stream:
        if stream.write(payload) != len(payload):
            raise RuntimeError("Cannot retain camera buffer: incomplete write: " + relative)
    checked = _capture_diagnostic_path(relative, False)
    with checked.open("rb") as stream:
        saved = stream.read(len(payload) + 1)
    if saved != payload:
        raise RuntimeError("Cannot retain camera buffer: saved bytes differ from native float samples: " + relative)
    diagnostic["bytes_written"] += len(saved)
    return {"path": relative, "bytes": len(saved), "sha256": hashlib.sha256(saved).hexdigest(),
            "box_xyxy_exclusive": list(box), "width": width, "height": height, "channels": "RGBA", "encoding": "float32-le",
            "pixel_order": "row-major; native readback", "normalization": False, "gamma_conversion": False,
            "bound": "Native float sample values repacked without range clipping; not an untouched GPU-memory dump."}


def _capture_gi_restore(state):
    prior = state.get("gi_diagnostic")
    if not prior:
        return {"changed": False}
    component = state["actor"].capture_component2d
    settings = component.get_editor_property("post_process_settings")
    settings.override_dynamic_global_illumination_method = prior["override"]
    settings.dynamic_global_illumination_method = prior["method"]
    component.set_editor_property("post_process_settings", settings)
    actual = component.get_editor_property("post_process_settings")
    if actual.override_dynamic_global_illumination_method != prior["override"] or actual.dynamic_global_illumination_method != prior["method"]:
        raise RuntimeError("Cannot restore GI diagnostic: native component GI fields did not retain their original values.")
    state.pop("gi_diagnostic")
    return {"changed": True, "restored": True, "gi_override": actual.override_dynamic_global_illumination_method,
            "gi_method": str(actual.dynamic_global_illumination_method), "bound": "Component property restoration; merged SceneCapture GI solver is unobserved."}


def _capture_gi_diagnostic(stage, camera, target, prefix):
    if stage not in ("gi_lumen", "gi_none", "gi_restore") or prefix != "":
        raise RuntimeError("GI diagnostic requires a fixed gi_lumen/gi_none/gi_restore stage and empty output prefix.")
    state = _capture
    if not state:
        if stage == "gi_restore":
            return {"changed": False}
        raise RuntimeError("Cannot begin GI diagnostic: start the original crossing capture first.")
    if stage == "gi_restore":
        return _capture_gi_restore(state)
    _native_scene_frame(require=True)
    if camera != [35.0, -45.0, 35.0] or target != [0.0, 0.0, 15.0] or state["camera_m"] != camera or state["target_m"] != target:
        raise RuntimeError("GI diagnostic requires the original crossing ENU pose35,-45,35 target0,0,15.")
    component = state["actor"].capture_component2d
    if state.get("diagnostic") or state.get("gi_diagnostic") or state["frames"] != 1:
        raise RuntimeError("GI diagnostic must begin once at initial capture frame1, before exports or float diagnostics.")
    settings = component.get_editor_property("post_process_settings")
    if settings.override_dynamic_global_illumination_method is not True or settings.dynamic_global_illumination_method != unreal.DynamicGlobalIlluminationMethod.LUMEN:
        raise RuntimeError("GI diagnostic requires the original explicit Lumen component policy before a new counted arm.")
    mode = getattr(unreal.DynamicGlobalIlluminationMethod, "NONE" if stage == "gi_none" else "LUMEN", None)
    if mode is None or not callable(getattr(component, "capture_scene", None)):
        raise RuntimeError("GI diagnostic requires the installed fixed GI enum and native capture_scene API before mutation.")
    prior = {"override": settings.override_dynamic_global_illumination_method, "method": settings.dynamic_global_illumination_method,
             "unscored_initial_frames": state["frames"], "unscored_native_start_frame": state["native_start_frame"], "stage": stage}
    state["gi_diagnostic"] = prior
    try:
        settings.override_dynamic_global_illumination_method = True
        settings.dynamic_global_illumination_method = mode
        component.set_editor_property("post_process_settings", settings)
        actual = component.get_editor_property("post_process_settings")
        if actual.override_dynamic_global_illumination_method is not True or actual.dynamic_global_illumination_method != mode:
            raise RuntimeError("GI diagnostic fixed-method native readback failed.")
        state["native_start_frame"] = unreal.SystemLibrary.get_frame_count()
        component.capture_scene()
        state["frames"] = 1
        return {"started": True, "stage": stage, "gi_original_policy": {"override": prior["override"], "method": str(prior["method"])}, "unscored_initial_frames": prior["unscored_initial_frames"],
                "unscored_native_start_frame": prior["unscored_native_start_frame"], **_capture_witness(state),
                "diagnostic_bound": "Only component GI override/method changed. Merged SceneCapture GI is unobserved; gi_none is ineligible for production Lumen readiness or appearance/runtime/performance acceptance."}
    except BaseException as error:
        try:
            _capture_gi_restore(state)
        except Exception as cleanup_error:
            error.add_note("GI diagnostic rollback also failed: " + str(cleanup_error))
        raise


def _capture_exposure_api(component):
    """Finite actual binding/read inspection. Never invoke a setter or capture_scene."""
    def member(owner, name):
        try:
            value = getattr(owner, name)
            return value, {"present": True, "callable": callable(value), "python_type": type(value).__name__}
        except Exception as error:
            return None, {"present": False, "callable": False, "error": type(error).__name__ + ": " + str(error)}
    def flags(values):
        if len(values) > 512:raise RuntimeError("Named show-flag read exceeds512entries")
        rows = []
        for value in values:
            name = value.get_editor_property("show_flag_name");enabled = value.get_editor_property("enabled")
            rows.append({"name": str(name), "name_python_type": type(name).__name__, "enabled": enabled if type(enabled) is bool else str(enabled),
                         "enabled_python_type": type(enabled).__name__, "struct_copy_callable": callable(getattr(value, "copy", None))})
        return rows
    result = {"component_python_type": type(component).__name__, "component_path": component.get_path_name(), "members": {}, "enum_members": {},
              "bound": "Actual fixed Python names/callability and read-only results; no writer, renderer-pass, exposure or appearance equivalence inferred."}
    def enum_members(owner):
        try:
            names = [name for name in dir(owner) if name.isupper() and not name.startswith("_")]
            if len(names) > 32:raise RuntimeError("Fixed enum inspection exceeds32member names")
            return {"status": "READ", "members": [{"name": name, "value": str(getattr(owner, name)), "python_type": type(getattr(owner, name)).__name__} for name in names]}
        except Exception as error:return {"status": "ERROR", "error": type(error).__name__ + ": " + str(error)}
    try:
        actual_method = component.get_editor_property("post_process_settings").local_exposure_method
        result["actual_post_process_local_exposure_method"] = {"status": "READ", "value": str(actual_method), "python_type": type(actual_method).__name__, "actual_type_members": enum_members(type(actual_method))}
    except Exception as error:result["actual_post_process_local_exposure_method"] = {"status": "ERROR", "error": type(error).__name__ + ": " + str(error)}
    enum, result["enum_class"] = member(unreal, "LocalExposureMethod")
    result["declared_enum_finite_members"] = enum_members(enum)
    for name in ("BILATERAL", "FUSION"):
        value, observation = member(enum, name);observation["value"] = None if value is None else str(value);result["enum_members"][name] = observation
    for name in ("get_show_flag_settings", "set_show_flag_settings", "get_editor_property", "set_editor_property", "capture_scene"):
        value, result["members"][name] = member(component, name)
        if name == "get_show_flag_settings" and callable(value):
            try:result["public_getter_read"] = {"status": "READ", "rows": flags(value())}
            except Exception as error:result["public_getter_read"] = {"status": "ERROR", "error": type(error).__name__ + ": " + str(error)}
    if "public_getter_read" not in result:result["public_getter_read"] = {"status": "UNAVAILABLE"}
    # This is a separately named observation, never an implicit replacement for a missing trial API.
    try:result["editor_property_show_flag_settings_read"] = {"status": "READ", "rows": flags(component.get_editor_property("show_flag_settings"))}
    except Exception as error:result["editor_property_show_flag_settings_read"] = {"status": "ERROR", "error": type(error).__name__ + ": " + str(error)}
    struct_type, result["flag_struct_class"] = member(unreal, "EngineShowFlagsSetting")
    if callable(struct_type):
        try:
            flag = struct_type();result["flag_struct_default_read"] = {"status": "READ", "rows": flags([flag]), "setter_callable_not_exercised": callable(getattr(flag, "set_editor_property", None))}
            if callable(getattr(flag, "copy", None)):
                try:result["flag_struct_copy_read"] = {"status": "READ", "rows": flags([flag.copy()])}
                except Exception as error:result["flag_struct_copy_read"] = {"status": "ERROR", "error": type(error).__name__ + ": " + str(error)}
            else:result["flag_struct_copy_read"] = {"status": "UNAVAILABLE"}
        except Exception as error:result["flag_struct_default_read"] = {"status": "ERROR", "error": type(error).__name__ + ": " + str(error)}
    missing = []
    for name in ("BILATERAL", "FUSION"):
        if not result["enum_members"][name]["present"] or result["enum_members"][name]["value"] is None:missing.append("unreal.LocalExposureMethod." + name)
    # The actual native probe found the named Blueprint accessors absent in Python.
    # Use only the EditAnywhere show_flag_settings property; no method fallback.
    for name in ("get_editor_property", "set_editor_property", "capture_scene"):
        if not result["members"][name]["callable"]:missing.append("component." + name)
    if result["editor_property_show_flag_settings_read"]["status"] != "READ":missing.append("component.get_editor_property('show_flag_settings') read")
    if not result["flag_struct_class"]["callable"]:missing.append("unreal.EngineShowFlagsSetting")
    if result["flag_struct_class"]["callable"] and result.get("flag_struct_default_read", {}).get("status") != "READ":missing.append("unreal.EngineShowFlagsSetting() construction/field read")
    if result["flag_struct_class"]["callable"] and result.get("flag_struct_default_read", {}).get("status") == "READ" and result.get("flag_struct_copy_read", {}).get("status") != "READ":missing.append("unreal.EngineShowFlagsSetting.copy() read")
    result["missing_for_current_fixed_trial"] = missing
    result["all_current_trial_api_names_observed"] = not missing
    result["writers_exercised"] = False
    result["fixed_trial_show_flag_access_path"] = "editor_property_show_flag_settings"
    return result


def _inspect_exposure_api(camera, target, prefix):
    if camera != [35., -45., 35.] or target != [0., 0., 15.] or prefix != "" or _capture:
        raise RuntimeError("Exposure API read requires the fixed crossing operands, empty prefix and no active capture; it does not render.")
    actors = _actors();before_count = len(actors.get_all_level_actors())
    actor = actors.spawn_actor_from_class(unreal.SceneCapture2D, unreal.Vector(*_source_to_native_cm(camera)))
    if actor is None:raise RuntimeError("Cannot inspect exposure API: actual SceneCapture2D object creation failed.")
    primary = None
    try:
        component = actor.capture_component2d
        policy_before = _photographic_policy(component.get_editor_property("post_process_settings"))
        cvar_before = unreal.SystemLibrary.get_console_variable_int_value("r.LocalExposure")
        observation = _capture_exposure_api(component)
        policy_after = _photographic_policy(component.get_editor_property("post_process_settings"))
        cvar_after = unreal.SystemLibrary.get_console_variable_int_value("r.LocalExposure")
        if policy_before != policy_after or cvar_before != cvar_after:
            raise RuntimeError("Exposure API read changed native component policy/CVar unexpectedly.")
        result = {"stage": "exposure_api", "api": observation, "r.LocalExposure_before": cvar_before, "r.LocalExposure_after": cvar_after,
                  "component_photographic_policy_unchanged": True, "active_capture": False, "capture_scene_calls": 0,
                  "render_target_created": False, "setters_called": False, "image_outputs": [], "native_frame_definition": _native_frame_record(),
                  "source_camera_operands_enu_m": camera, "source_target_operands_enu_m": target,
                  "bound": "Transient native SceneCaptureComponent2D Python API observation only. Entry/NullRHI allowed; no current-city frame/source/GPU/lighting/pass or appearance acceptance."}
    except BaseException as error:
        primary = error
        raise
    finally:
        try:
            if actors.destroy_actor(actor) is not True or len(actors.get_all_level_actors()) != before_count:
                raise RuntimeError("Exposure API read did not destroy its owned transient actor or retain the original actor count.")
        except Exception as cleanup_error:
            if primary is None:raise
            primary.add_note("Exposure API owned-actor cleanup also failed: " + str(cleanup_error))
    result["owned_actor_destroyed"] = True;result["actor_count_before"] = before_count;result["actor_count_after"] = len(actors.get_all_level_actors())
    return result


def _capture_exposure_flags(component):
    rows = []
    for flag in component.get_editor_property("show_flag_settings"):
        name, enabled = flag.get_editor_property("show_flag_name"), flag.get_editor_property("enabled")
        if type(name) is not str or type(enabled) is not bool:
            raise RuntimeError("Exposure diagnostic requires native string/bool show-flag readbacks.")
        rows.append({"name": name, "enabled": enabled})
    return rows


def _capture_exposure_witness(state):
    prior = state["exposure_diagnostic"]
    component = state["actor"].capture_component2d
    value = unreal.SystemLibrary.get_console_variable_int_value("r.LocalExposure")
    flags = _capture_exposure_flags(component)
    settings = component.get_editor_property("post_process_settings")
    method = getattr(unreal.LocalExposureMethod, "FUSION" if prior["stage"] == "exposure_fusion" else "BILATERAL")
    actual = _photographic_policy(settings)
    expected = _photographic_policy(_exposure(True))
    expected["local_exposure_method"]["value"] = str(method)
    if type(value) is not int or value <= 0 or value != prior["cvar"] or flags != prior["applied_flags"] or actual != expected:
        raise RuntimeError("Exposure diagnostic native local-exposure policy/CVar/show-flag readback differs from its fixed arm.")
    return {"stage": prior["stage"], "method": str(settings.local_exposure_method), "r.LocalExposure": value,
            "raw_show_flag_settings": flags, "local_exposure_explicit_flag": True, "show_flag_access_path": "editor_property_show_flag_settings", "photographic_policy": actual,
            "capture_frames": state["frames"], "native_start_frame": state["native_start_frame"],
            "bound": "Actual component policy, positive CVar and supported explicit LocalExposure override. Merged SceneCapture settings/pass execution and actual PreExposure remain unobserved."}


def _capture_exposure_restore(state):
    prior = state.get("exposure_diagnostic")
    if not prior:
        return {"changed": False}
    component = state["actor"].capture_component2d
    errors = []
    try:
        settings = component.get_editor_property("post_process_settings")
        for name, values in prior["fields"].items():
            setattr(settings, name, values["value"]);setattr(settings, "override_" + name, values["override"])
        component.set_editor_property("post_process_settings", settings)
        actual = component.get_editor_property("post_process_settings")
        if any(getattr(actual, name) != values["value"] or getattr(actual, "override_" + name) != values["override"] for name, values in prior["fields"].items()):
            raise RuntimeError("original local-exposure fields/overrides differ")
    except Exception as error:errors.append("PostProcess restoration: " + str(error))
    try:
        component.set_editor_property("show_flag_settings", prior["raw_flags"])
        if _capture_exposure_flags(component) != prior["original_flags"]:
            raise RuntimeError("original raw show-flag array differs")
    except Exception as error:errors.append("Show-flag restoration: " + str(error))
    if unreal.SystemLibrary.get_console_variable_int_value("r.LocalExposure") != prior["cvar"]:
        errors.append("r.LocalExposure changed; this diagnostic never mutates the CVar")
    if errors:
        raise RuntimeError("Cannot restore exposure diagnostic: " + json.dumps(errors))
    state["photographic_tone"] = prior["photographic_tone"]
    state.pop("exposure_diagnostic")
    return {"changed": True, "restored": True, "photographic_policy": _photographic_policy(actual),
            "raw_show_flag_settings": prior["original_flags"], "r.LocalExposure": prior["cvar"], "show_flag_access_path": "editor_property_show_flag_settings",
            "capture_frames": state["frames"], "bound": "Original component local fields/rawflags restored; no volume, light, CVar, material or save mutation."}


def _capture_exposure_diagnostic(stage, camera, target, prefix):
    if type(stage) is not str or stage not in ("exposure_bilateral", "exposure_fusion", "exposure_read", "exposure_restore") or prefix != "":
        raise RuntimeError("Exposure diagnostic requires its fixed bilateral/fusion/read/restore stage and empty output prefix.")
    state = _capture
    if not state:
        if stage == "exposure_restore":return {"changed": False}
        raise RuntimeError("Cannot begin exposure diagnostic: start the fixed original persistent capture first.")
    if stage == "exposure_restore":return _capture_exposure_restore(state)
    if camera not in ([35., -45., 35.], [-70., 20., 65.]) or target != [0., 0., 15.] or state["camera_m"] != camera or state["target_m"] != target:
        raise RuntimeError("Exposure diagnostic requires the exact original crossing or crossing-west ENU pose and target.")
    if stage == "exposure_read":
        if not state.get("exposure_diagnostic"):raise RuntimeError("Exposure diagnostic read requires its active fixed mode first.")
        return _capture_exposure_witness(state)
    _native_scene_frame(require=True)
    if state.get("diagnostic") or state.get("gi_diagnostic") or state.get("exposure_diagnostic") or state["frames"] != 1:
        raise RuntimeError("Exposure diagnostic must begin once at initial capture frame1, before GI/float diagnostics or exports.")
    component = state["actor"].capture_component2d
    api = _capture_exposure_api(component)
    if api["missing_for_current_fixed_trial"]:
        raise RuntimeError("DID_NOT_RUN: exposure diagnostic native Python API unavailable: " + json.dumps(api["missing_for_current_fixed_trial"]) + "; actual availability=" + json.dumps(api))
    mode = getattr(unreal.LocalExposureMethod, "FUSION" if stage == "exposure_fusion" else "BILATERAL")
    cvar = unreal.SystemLibrary.get_console_variable_int_value("r.LocalExposure")
    if type(cvar) is not int or cvar <= 0:
        raise RuntimeError("DID_NOT_RUN: exposure diagnostic requires actual r.LocalExposure>0 before mutation; observed=" + repr(cvar))
    settings = component.get_editor_property("post_process_settings")
    if _photographic_policy(settings) != _photographic_policy(_exposure(False)) or state.get("photographic_tone") is not False:
        raise RuntimeError("Exposure diagnostic requires the unchanged original manual f8/ISO100/shutter125/toneFalse component before its new counted arm.")
    original_flags = _capture_exposure_flags(component)
    if sum(row["name"] == "LocalExposure" for row in original_flags) > 1:
        raise RuntimeError("Exposure diagnostic refuses duplicate LocalExposure overrides before mutation.")
    raw_flags = [flag.copy() for flag in component.get_editor_property("show_flag_settings")]
    enabled = unreal.EngineShowFlagsSetting();enabled.set_editor_property("show_flag_name", "LocalExposure");enabled.set_editor_property("enabled", True)
    applied = [enabled if row["name"] == "LocalExposure" else raw for row, raw in zip(original_flags, raw_flags)]
    if not any(row["name"] == "LocalExposure" for row in original_flags):applied.append(enabled)
    local_names = [name for name in _photographic_policy(settings) if name.startswith("local_exposure_")]
    prior = {"stage": stage, "fields": {name: {"value": getattr(settings, name), "override": getattr(settings, "override_" + name)} for name in local_names},
             "raw_flags": raw_flags, "original_flags": original_flags, "applied_flags": [{"name": flag.get_editor_property("show_flag_name"), "enabled": flag.get_editor_property("enabled")} for flag in applied],
             "cvar": cvar, "photographic_tone": state["photographic_tone"], "unscored_initial_frames": state["frames"], "unscored_native_start_frame": state["native_start_frame"]}
    state["exposure_diagnostic"] = prior
    try:
        wanted = _exposure(True)
        for name in local_names:
            setattr(settings, name, mode if name == "local_exposure_method" else getattr(wanted, name));setattr(settings, "override_" + name, True)
        component.set_editor_property("post_process_settings", settings)
        component.set_editor_property("show_flag_settings", applied)
        state["photographic_tone"] = True
        _capture_exposure_witness(state)
        state["native_start_frame"] = unreal.SystemLibrary.get_frame_count()
        component.capture_scene();state["frames"] = 1
        return {"started": True, "stage": stage, "unscored_initial_frames": prior["unscored_initial_frames"],
                "unscored_native_start_frame": prior["unscored_native_start_frame"], "original_show_flag_settings": prior["original_flags"], "exposure_diagnostic": _capture_exposure_witness(state), **_capture_witness(state),
                "diagnostic_bound": "Same .8highlight/.6shadow/detail1/blur.6/middleGrey0 in allarms; method enum differs only. Experimental Fusion pixel response is not production performance or solver identity proof."}
    except BaseException as error:
        try:_capture_exposure_restore(state)
        except Exception as cleanup_error:error.add_note("Exposure diagnostic rollback also failed: " + str(cleanup_error))
        raise


def _capture_daylight_lights():
    native, observed = [], []
    actors = _actors().get_all_level_actors()
    for label, kind in (("Shibuya_Sun", unreal.DirectionalLight), ("Shibuya_SkyLight", unreal.SkyLight)):
        matches = [actor for actor in actors if isinstance(actor, kind)]
        if len(matches) != 1 or matches[0].get_actor_label() != label:
            raise RuntimeError("Daylight ratio requires exactly one admitted movable light: " + label)
        actor = matches[0];component = actor.light_component
        if not all(callable(getattr(component, name, None)) for name in ("get_editor_property", "set_intensity", "get_path_name")):
            raise RuntimeError("DID_NOT_RUN: daylight ratio native get_editor_property/set_intensity/get_path_name unavailable on " + label)
        if component.get_editor_property("mobility") != unreal.ComponentMobility.MOVABLE:
            raise RuntimeError("Daylight ratio requires movable native light before mutation: " + label)
        intensity = component.get_editor_property("intensity")
        if type(intensity) not in (int, float) or not math.isfinite(intensity):raise RuntimeError("Daylight ratio requires finite native intensity: " + label)
        color = component.get_editor_property("light_color")
        protected = {"mobility": str(component.get_editor_property("mobility")), "light_color_rgba": [color.r, color.g, color.b, color.a],
                     "indirect_lighting_intensity": component.get_editor_property("indirect_lighting_intensity"),
                     "cast_shadows": component.get_editor_property("cast_shadows"), "cast_static_shadows": component.get_editor_property("cast_static_shadows"),
                     "cast_dynamic_shadows": component.get_editor_property("cast_dynamic_shadows"),
                     "actor_location_cm": _vector(actor.get_actor_location()), "actor_rotation_degrees": _rotator(actor.get_actor_rotation())}
        if label == "Shibuya_SkyLight":
            if component.get_editor_property("source_type") != unreal.SkyLightSourceType.SLS_CAPTURED_SCENE or component.get_editor_property("real_time_capture") is not False or component.get_editor_property("cubemap") is not None or component.get_editor_property("sky_distance_threshold") != 5.0:
                raise RuntimeError("Daylight ratio requires retained captured sky/realtimeFalse/no cubemap/threshold5; no recapture permitted.")
            protected.update(source_type=str(component.get_editor_property("source_type")), real_time_capture=False, cubemap=None, sky_distance_threshold=5.0,
                             lower_hemisphere_is_black=component.get_editor_property("lower_hemisphere_is_black"), capture_emissive_only=component.get_editor_property("capture_emissive_only"))
        native.append({"component": component, "intensity": intensity})
        observed.append({"actor": label, "component": component.get_path_name(), "intensity": intensity, "protected": protected})
    return native, observed


def _capture_daylight_witness(state):
    prior = state["daylight_diagnostic"]
    _, observed = _capture_daylight_lights()
    expected = [dict(row, intensity=value) for row, value in zip(prior["lights_before"], prior["expected_intensities"])]
    capture = _capture_witness(state);flags = _capture_exposure_flags(state["actor"].capture_component2d)
    if observed != expected or capture["photographic_policy"] != prior["photographic_policy"] or flags != prior["raw_flags"] or capture["native_skylights"] != prior["sky_resources"]:
        raise RuntimeError("Daylight ratio native lights/shadows/color/camera/rawflags/retained-sky differ from the fixed arm.")
    return {"stage": prior["stage"], "lights": observed, "photographic_policy": capture["photographic_policy"], "raw_show_flag_settings": flags,
            "native_skylights": capture["native_skylights"], "capture_frames": state["frames"], "native_start_frame": state["native_start_frame"],
            "bound": "Component intensity/protected fields and retained sky/SH observations; no consumed irradiance, merged GI or full HDR cubemap byte-equivalence claim."}


def _capture_daylight_restore(state):
    prior = state.get("daylight_diagnostic")
    if not prior:return {"changed": False}
    errors = []
    for index, row in enumerate(prior["native_lights"]):
        try:
            component = row["component"]
            if component.get_editor_property("intensity") != row["intensity"]:component.set_intensity(row["intensity"])
            if component.get_editor_property("intensity") != row["intensity"]:raise RuntimeError("native intensity did not restore")
        except Exception as error:errors.append(prior["lights_before"][index]["actor"] + ": " + str(error))
    try:
        _, observed = _capture_daylight_lights();capture = _capture_witness(state)
        if observed != prior["lights_before"]:errors.append("Original raw light intensity/protected fields differ")
        if capture["photographic_policy"] != prior["photographic_policy"] or _capture_exposure_flags(state["actor"].capture_component2d) != prior["raw_flags"]:errors.append("Original actual camera/PP/rawflags differ")
        if capture["native_skylights"] != prior["sky_resources"]:errors.append("Retained sky resource/SH observations differ")
    except Exception as error:errors.append("Restoration readback: " + str(error))
    if errors:raise RuntimeError("Cannot restore daylight ratio: " + json.dumps(errors))
    state.pop("daylight_diagnostic")
    return {"changed": True, "restored": True, "lights": observed, "photographic_policy": capture["photographic_policy"], "raw_show_flag_settings": prior["raw_flags"],
            "native_skylights": capture["native_skylights"], "saved": False, "sky_recapture_requested": False}


def _capture_daylight_diagnostic(stage, camera, target, prefix):
    if type(stage) is not str or stage not in ("daylight_reference", "daylight_candidate", "daylight_read", "daylight_restore") or prefix != "":
        raise RuntimeError("Daylight ratio requires its fixed reference/candidate/read/restore stage and empty output prefix.")
    state = _capture
    if not state:
        if stage == "daylight_restore":return {"changed": False}
        raise RuntimeError("Cannot begin daylight ratio: start the fixed original persistent capture first.")
    if stage == "daylight_restore":return _capture_daylight_restore(state)
    if camera not in ([35., -45., 35.], [-70., 20., 65.]) or target != [0., 0., 15.] or state["camera_m"] != camera or state["target_m"] != target:
        raise RuntimeError("Daylight ratio requires exact original crossing/crossing-west ENU pose and target.")
    if stage == "daylight_read":
        if not state.get("daylight_diagnostic"):raise RuntimeError("Daylight ratio read requires an active fixed arm first.")
        return _capture_daylight_witness(state)
    _native_scene_frame(require=True)
    if any(state.get(name) for name in ("diagnostic", "gi_diagnostic", "exposure_diagnostic", "daylight_diagnostic")) or state["frames"] != 1:
        raise RuntimeError("Daylight ratio must begin once at initial capture frame1 with no other diagnostic.")
    component = state["actor"].capture_component2d
    if not callable(getattr(component, "capture_scene", None)):raise RuntimeError("DID_NOT_RUN: daylight ratio native capture_scene unavailable before light mutation.")
    capture = _capture_witness(state)
    if capture["photographic_policy"] != _photographic_policy(_exposure(False)) or state.get("photographic_tone") is not False:
        raise RuntimeError("Daylight ratio requires actual unchanged Manual/physicalTrue/f8/ISO100/shutter125/bias0/toneFalse policy before mutation.")
    sky = capture["native_skylights"]
    if len(sky) != 1 or any(sky[0].get(name) is not True for name in ("processed_present", "processed_initialized", "processed_rhi_present", "sh_finite")):
        raise RuntimeError("Daylight ratio requires one initialized native retained sky/finite SH before mutation.")
    rows, observed = _capture_daylight_lights()
    if [row["intensity"] for row in rows] != [100000.0, 1.0]:raise RuntimeError("Daylight ratio requires actual Sun100000/Sky1 before each arm; no arbitrary baseline.")
    prior = {"stage": stage, "native_lights": rows, "lights_before": observed, "photographic_policy": capture["photographic_policy"], "sky_resources": sky,
             "raw_flags": _capture_exposure_flags(component), "expected_intensities": [25000.0, 4.0] if stage == "daylight_candidate" else [100000.0, 1.0],
             "unscored_initial_frames": state["frames"], "unscored_native_start_frame": state["native_start_frame"]}
    state["daylight_diagnostic"] = prior
    try:
        if stage == "daylight_candidate":
            for row, value in zip(rows, prior["expected_intensities"]):row["component"].set_intensity(value)
        _capture_daylight_witness(state)
        state["native_start_frame"] = unreal.SystemLibrary.get_frame_count();component.capture_scene();state["frames"] = 1
        return {"started": True, "stage": stage, "unscored_initial_frames": prior["unscored_initial_frames"], "unscored_native_start_frame": prior["unscored_native_start_frame"],
                "original_lights": observed, "daylight_diagnostic": _capture_daylight_witness(state), **_capture_witness(state), "saved": False, "sky_recapture_requested": False}
    except BaseException as error:
        try:_capture_daylight_restore(state)
        except Exception as cleanup_error:error.add_note("Daylight ratio rollback also failed: " + str(cleanup_error))
        raise


def _capture_surface_diagnostic(stage, prefix, camera, target):
    if stage in ("daylight_reference", "daylight_candidate", "daylight_read", "daylight_restore"):
        return _capture_daylight_diagnostic(stage, camera, target, prefix)
    if _capture and _capture.get("daylight_diagnostic"):
        raise RuntimeError("Restore the daylight ratio before any exposure/GI/float diagnostic stage.")
    if stage == "exposure_api":
        return _inspect_exposure_api(camera, target, prefix)
    if stage in ("exposure_bilateral", "exposure_fusion", "exposure_read", "exposure_restore"):
        return _capture_exposure_diagnostic(stage, camera, target, prefix)
    if _capture and _capture.get("exposure_diagnostic"):
        raise RuntimeError("Restore the exposure diagnostic before any GI/float diagnostic stage.")
    if stage in ("gi_lumen", "gi_none", "gi_restore"):
        return _capture_gi_diagnostic(stage, camera, target, prefix)
    if type(stage) is not str or stage not in ("begin_hdr", "read_hdr", "read_gbuffer", "restore"):
        raise RuntimeError("Cannot inspect active camera buffers: stage must be begin_hdr, read_hdr, read_gbuffer or restore.")
    state = _capture
    if not state:
        if stage == "restore":
            return {"changed": False}
        raise RuntimeError("Cannot inspect active camera buffers: start the original crossing capture first.")
    if stage == "restore":
        return _capture_diagnostic_restore(state)
    _native_scene_frame(require=True)
    _source_to_native_cm(camera)
    _source_to_native_cm(target)
    if camera != [35.0, -45.0, 35.0] or target != [0.0, 0.0, 15.0] or state["camera_m"] != camera or state["target_m"] != target:
        raise RuntimeError("Cannot inspect active camera buffers: require original crossing ENU camera35,-45,35 and target0,0,15, matching the active capture.")
    component = state["actor"].capture_component2d
    try:
        if stage == "begin_hdr":
            if state.get("diagnostic"):
                raise RuntimeError("Cannot begin HDR diagnostic: restore the active diagnostic first.")
            _capture_diagnostic_path(prefix)
            if state["frames"] != 80 or component.capture_source != unreal.SceneCaptureSource.SCS_FINAL_COLOR_LDR or component.texture_target != state["texture"] or component.fov_angle != 60.0 or not component.always_persist_rendering_state:
                raise RuntimeError("Cannot begin HDR diagnostic: require the unchanged original80-frame persistent final-color crossing capture at FOV60.")
            texture = unreal.RenderingLibrary.create_render_target2d(state["world"], 1280, 720, unreal.TextureRenderTargetFormat.RTF_RGBA32F)
            texture.set_editor_property("target_gamma", 1.0)
            state["diagnostic"] = {"original_source": component.capture_source, "original_target": component.texture_target,
                                   "texture": texture, "prefix": prefix, "frames": 0, "bytes_written": 0, "hdr_reads": []}
            component.texture_target = texture
            component.capture_source = unreal.SceneCaptureSource.SCS_SCENE_COLOR_HDR
            component.capture_scene()
            state["diagnostic"]["frames"] = 1
            return {"stage": stage, **_capture_diagnostic_witness(state)}
        diagnostic = state.get("diagnostic")
        if not diagnostic or prefix != diagnostic["prefix"]:
            raise RuntimeError("Cannot read active camera buffers: begin_hdr with the same owned output prefix first.")
        if component.capture_source != unreal.SceneCaptureSource.SCS_SCENE_COLOR_HDR:
            raise RuntimeError("Cannot read active camera buffers: actual capture source is not SCENE_COLOR_HDR.")
        witness = _capture_diagnostic_witness(state)
        rois = (("sun-ground", (550, 520, 920, 680)), ("shadow-facade", (100, 60, 500, 300)), ("shadow-ground", (100, 450, 300, 550)))
        if stage == "read_hdr":
            frames = diagnostic["frames"]
            if frames not in (60, 80) or frames in diagnostic["hdr_reads"]:
                raise RuntimeError("Cannot read HDR buffers: require one actual read at each diagnostic frame60 and80.")
            outputs = [_capture_diagnostic_write(state, f"hdr-{frames:03d}-" + name, box) for name, box in rois]
            diagnostic["hdr_reads"].append(frames)
            return {"stage": stage, "outputs": outputs, **witness, "value_space": "Linear scene HDR before tone curve; absolute irradiance and actual PreExposure are UNOBSERVED."}
        if diagnostic["frames"] != 80 or diagnostic["hdr_reads"] != [60, 80]:
            raise RuntimeError("Cannot read GBuffer: require ordered actual HDR60 and80 readbacks first.")
        outputs, sources = [], []
        read_error = None
        try:
            for name, mode in (("base-color", unreal.SceneCaptureSource.SCS_BASE_COLOR), ("world-normal", unreal.SceneCaptureSource.SCS_NORMAL), ("axial-depth-cm", unreal.SceneCaptureSource.SCS_SCENE_DEPTH)):
                component.capture_source = mode
                component.capture_scene()
                sources.append(_capture_diagnostic_witness(state))
                outputs.extend(_capture_diagnostic_write(state, name + "-" + region, box) for region, box in rois)
                if name == "base-color":
                    outputs.append(_capture_diagnostic_write(state, "base-color-full", (0, 0, 1280, 720)))
            return {"stage": stage, "outputs": outputs, "sources": sources,
                    "value_spaces": {"base-color": "Linear GBuffer material BaseColor; no sRGB conversion.", "world-normal": "Signed native ESU world normal; preserve negative channels.", "axial-depth-cm": "Axial scene depth in centimetres, red channel."},
                    "roi_labels": "Fixed legacy screen regions; depth/normal must confirm actual surfaces after geographic correction.",
                    "final_capture_preserved": True, "bound": "Actual pixel buffers, not a photorealism verdict or final merged PP witness."}
        except BaseException as error:
            read_error = error
            raise
        finally:
            try:
                _capture_diagnostic_restore(state)
            except Exception as cleanup_error:
                if read_error is None:
                    raise
                read_error.add_note("Camera GBuffer restoration also failed: " + str(cleanup_error))
    except BaseException as error:
        try:
            _capture_diagnostic_restore(state)
        except Exception as cleanup_error:
            error.add_note("Camera diagnostic restoration also failed: " + str(cleanup_error))
        raise


def _finish_capture():
    global _capture
    if not _capture:
        return {"changed": False}
    state = _capture
    restore_error = None
    try:
        if state.get("diagnostic"):
            try:
                _capture_diagnostic_restore(state)
            except Exception as error:
                try:
                    _restore_capture_coverage(state)
                except Exception as coverage_error:
                    error.add_note("Capture coverage restoration also failed: " + str(coverage_error))
                raise
        daylight_restored = None
        if state.get("daylight_diagnostic"):
            try:daylight_restored = _capture_daylight_restore(state)
            except Exception as error:
                try:_restore_capture_coverage(state)
                except Exception as coverage_error:error.add_note("Daylight cleanup coverage restoration also failed: " + str(coverage_error))
                raise
        exposure_restored = None
        if state.get("exposure_diagnostic"):
            try:
                exposure_restored = _capture_exposure_restore(state)
            except Exception as error:
                try:_restore_capture_coverage(state)
                except Exception as coverage_error:error.add_note("Exposure cleanup coverage restoration also failed: " + str(coverage_error))
                raise
        gi_restored = None
        if state.get("gi_diagnostic"):
            try:
                gi_restored = _capture_gi_restore(state)
            except Exception as error:
                try:
                    _restore_capture_coverage(state)
                except Exception as coverage_error:
                    error.add_note("GI cleanup coverage restoration also failed: " + str(coverage_error))
                raise
        coverage_restored = _restore_capture_coverage(state)
        if daylight_restored is not None:
            coverage_restored["daylight_diagnostic_restoration"] = daylight_restored
        if exposure_restored is not None:
            coverage_restored["exposure_diagnostic_restoration"] = exposure_restored
        if gi_restored is not None:
            coverage_restored["gi_diagnostic_restoration"] = gi_restored
        return coverage_restored
    except Exception as error:
        restore_error = error
        raise
    finally:
        _capture = None
        try:
            if _actors().destroy_actor(state["actor"]) is not True:
                raise RuntimeError("Cannot finish native capture: EditorActorSubsystem did not destroy the task-owned capture actor.")
        except Exception as cleanup_error:
            if restore_error is None:
                raise
            restore_error.add_note("Native capture actor cleanup also failed: " + str(cleanup_error))


def _capture_witness(state):
    """Observe the current native capture objects; PP configuration is not GI execution proof."""
    actor, texture = state["actor"], state["texture"]
    component = actor.capture_component2d
    settings = component.get_editor_property("post_process_settings")
    library = getattr(unreal, "ShibuyaRendererLibrary", None)
    if library is None:
        raise RuntimeError("Cannot inspect native capture flags: the compiled ShibuyaRendererLibrary is unavailable. Build and integrate the reviewed runtime diagnostic module before capture scoring.")
    resources = json.loads(library.inspect_world_resources(state["world"]))
    native_flags = next((entry for entry in resources.get("scene_captures", []) if entry.get("component") == component.get_path_name()), None)
    if native_flags is None:
        raise RuntimeError(f"Cannot inspect native capture flags: renderer diagnostic did not observe live component {component.get_path_name()}.")
    current_frame = unreal.SystemLibrary.get_frame_count()
    return {"persistent_state": component.always_persist_rendering_state,
            "photographic_tone": bool(state.get("photographic_tone")),
            "photographic_policy": _photographic_policy(settings),
            "hardware_ray_tracing_requested": bool(state.get("hardware_ray_tracing")),
            "capture_uses_ray_tracing_if_enabled": component.use_ray_tracing_if_enabled,
            "full_crop_coverage": bool(state.get("coverage")),
            "lumen_policy_before": state.get("coverage", {}).get("before"),
            "lumen_capture_policy": _lumen_capture_policy(settings),
            "capture_component": component.get_path_name(), "native_capture_flags": native_flags,
            "native_skylights": resources.get("skylights", []),
            "native_sdf_async_building_assets": [mesh["asset"] for mesh in resources.get("distinct_source_meshes", []) if mesh.get("sdf_async_building")],
            "render_target_matches_capture": component.texture_target == texture,
            "post_process_blend_weight": component.post_process_blend_weight,
            "lumen_gi_override": settings.override_dynamic_global_illumination_method,
            "lumen_gi": str(settings.dynamic_global_illumination_method),
            "lumen_reflections_override": settings.override_reflection_method,
            "lumen_reflections": str(settings.reflection_method),
            "capture_source": str(component.capture_source),
            "render_target_format": str(texture.render_target_format),
            "target_gamma": texture.get_editor_property("target_gamma"),
            "width": texture.get_editor_property("size_x"), "height": texture.get_editor_property("size_y"),
            "actual_camera_cm": _vector(actor.get_actor_location()),
            "actual_component_cm": _vector(component.get_world_location()),
            "forward_vector": _vector(actor.get_actor_forward_vector()),
            "component_forward_vector": _vector(component.get_forward_vector()),
            "capture_frames": state["frames"], "native_start_frame": state["native_start_frame"],
            "native_current_frame": current_frame,
            "native_frames_elapsed": current_frame - state["native_start_frame"]}


def _native_png_prefix(content):
    """Keep native pixel bytes; omit ExportRenderTarget2DAsPNG's spare allocation tail."""
    if content[:8] != b"\x89PNG\r\n\x1a\n":
        raise RuntimeError("Cannot retain native capture: export did not write a PNG signature.")
    offset = 8
    while offset + 12 <= len(content):
        size = struct.unpack_from(">I", content, offset)[0]
        end = offset + size + 12
        if end > len(content):
            raise RuntimeError("Cannot retain native capture: exported PNG chunk was truncated.")
        kind = content[offset + 4:offset + 8]
        payload = content[offset + 8:end - 4]
        if zlib.crc32(kind + payload) & 0xffffffff != struct.unpack_from(">I", content, end - 4)[0]:
            raise RuntimeError("Cannot retain native capture: exported PNG pixel chunk checksum failed.")
        if kind == b"IEND":
            if size:
                raise RuntimeError("Cannot retain native capture: exported PNG IEND was not empty.")
            return content[:end]
        offset = end
    raise RuntimeError("Cannot retain native capture: exported PNG IEND was missing.")


def _material_bindings(mesh):
    result = []
    for index, slot in enumerate(mesh.static_materials):
        material = slot.material_interface
        result.append({"slot": index, "material": material.get_path_name() if material else None,
                       "textures": [texture.get_path_name() for texture in unreal.MaterialEditingLibrary.get_material_used_textures(material)] if material else []})
    return result


def _photographic_policy(settings):
    """Read current native component camera/tone settings; not resolved exposure or irradiance."""
    names = ("auto_exposure_method", "auto_exposure_apply_physical_camera_exposure", "camera_iso",
             "camera_shutter_speed", "depth_of_field_fstop", "auto_exposure_bias", "local_exposure_method",
             "local_exposure_highlight_contrast_scale", "local_exposure_shadow_contrast_scale",
             "local_exposure_detail_strength", "local_exposure_blurred_luminance_blend", "local_exposure_middle_grey_bias")
    return {name: {"value": str(getattr(settings, name)) if name.endswith("_method") else getattr(settings, name),
                   "override": getattr(settings, "override_" + name)} for name in names}


def _exposure(photographic_tone=False):
    settings = unreal.PostProcessSettings()
    settings.override_auto_exposure_method = True
    settings.auto_exposure_method = unreal.AutoExposureMethod.AEM_MANUAL
    settings.override_auto_exposure_apply_physical_camera_exposure = True
    settings.auto_exposure_apply_physical_camera_exposure = True
    settings.override_camera_iso = True
    settings.camera_iso = 100.0
    settings.override_camera_shutter_speed = True
    settings.camera_shutter_speed = 125.0
    settings.override_depth_of_field_fstop = True
    settings.depth_of_field_fstop = 8.0
    settings.override_auto_exposure_bias = True
    settings.auto_exposure_bias = 0.0
    settings.override_dynamic_global_illumination_method = True
    settings.dynamic_global_illumination_method = unreal.DynamicGlobalIlluminationMethod.LUMEN
    settings.override_reflection_method = True
    settings.reflection_method = unreal.ReflectionMethod.LUMEN
    if photographic_tone:
        # UE's bilateral local exposure preserves base/detail separation while
        # compressing HDR contrast; physical camera and scene irradiance stay fixed.
        values = (("local_exposure_method", unreal.LocalExposureMethod.BILATERAL),
                  ("local_exposure_highlight_contrast_scale", .8), ("local_exposure_shadow_contrast_scale", .6),
                  ("local_exposure_detail_strength", 1.0), ("local_exposure_blurred_luminance_blend", .6),
                  ("local_exposure_middle_grey_bias", 0.0))
        for name, value in values:
            setattr(settings, "override_" + name, True)
            setattr(settings, name, value)
    return settings


def _saved_photographic_tone():
    """Resolve only the two exact saved policies; partial/custom policy needs review."""
    volumes = [actor for actor in _actors().get_all_level_actors() if isinstance(actor, unreal.PostProcessVolume)
               and actor.get_actor_label() == "Shibuya_Exposure"]
    if not volumes:
        return False
    if len(volumes) != 1:
        raise RuntimeError("Cannot inherit photographic tone: expected one Shibuya_Exposure volume.")
    settings = volumes[0].get_editor_property("settings")
    names = [name for name in _photographic_policy(settings) if name.startswith("local_exposure_")]
    if all(getattr(settings, "override_" + name) is False for name in names):
        return False
    expected = _exposure(True)
    if any(getattr(settings, "override_" + name) is not True or
           (getattr(settings, name) != getattr(expected, name) if name.endswith("_method") else
            not math.isfinite(getattr(settings, name)) or abs(getattr(settings, name) - getattr(expected, name)) > 1e-5)
           for name in names):
        raise RuntimeError("Cannot inherit photographic tone: saved local exposure is neither original nor the exact reviewed bilateral candidate.")
    return True


def _capture_photographic_tone(photographic_tone, use_saved_tone):
    saved = _saved_photographic_tone()
    if use_saved_tone and not photographic_tone:
        return saved
    if not use_saved_tone and not photographic_tone and saved:
        raise RuntimeError("DID_NOT_RUN: explicit original-tone control requires original local exposure in the loaded Shibuya_Exposure volume; set it in memory before the A/B arm.")
    return photographic_tone


def _gsi_sampling_state():
    """Exact selected shared GSI asset and authored policy; residency is not exposed."""
    source = {"path": "data/prepared/surface/terrain-aerial.png", "bytes": 10896930,
              "sha256": "b3ae2bdccd106b22f3a3ab0624a6f1a1c80410289c55429724f99029d8477e58"}
    _support_read(source, {})
    path = "/Game/Surface/TerrainPhoto/terrain-photo/Textures/terrain-photo_texture_0.terrain-photo_texture_0"
    texture = unreal.load_asset(path)
    if not isinstance(texture, unreal.Texture2D) or texture.get_path_name() != path:
        raise RuntimeError("Cannot prepare GSI sampling: import the exact admitted shared TerrainPhoto Texture2D first.")
    properties = {name: texture.get_editor_property(name) for name in
                  ("filter", "lod_group", "srgb", "lod_bias", "max_texture_size", "mip_gen_settings", "never_stream",
                   "virtual_texture_streaming", "compression_settings", "num_cinematic_mip_levels", "power_of_two_mode")}
    state = {"asset": path, "source": source, "dimensions": [texture.blueprint_get_size_x(), texture.blueprint_get_size_y()],
             "properties": {key: value if type(value) in (bool, int, float, str) else str(value) for key, value in properties.items()},
             "max_anisotropy": unreal.SystemLibrary.get_console_variable_int_value("r.MaxAnisotropy"),
             "resident_mips_observed": False}
    return texture, properties, state


def _prepare_gsi_sampling(persist):
    texture, properties, before = _gsi_sampling_state()
    if (type(before["max_anisotropy"]) is not int or before["max_anisotropy"] < 4 or
        properties["lod_group"] != unreal.TextureGroup.TEXTUREGROUP_WORLD or properties["srgb"] is not True or
        properties["lod_bias"] != 0 or before["dimensions"] != [2304, 2560]):
        raise RuntimeError("DID_NOT_RUN: GSI sampling requires actual anisotropy>=4, World group, sRGB, LOD bias0 and original2304x2560 texture dimensions before mutation; observed " + json.dumps(before))
    original = properties["filter"]
    if original not in (unreal.TextureFilter.TF_TRILINEAR, unreal.TextureFilter.TF_DEFAULT):
        raise RuntimeError("DID_NOT_RUN: GSI filter differs from the original Trilinear or retained Default policy; observed " + json.dumps(before))
    changed = original != unreal.TextureFilter.TF_DEFAULT
    try:
        if changed:
            texture.set_editor_property("filter", unreal.TextureFilter.TF_DEFAULT)
        _, current, after = _gsi_sampling_state()
        if current["filter"] != unreal.TextureFilter.TF_DEFAULT or any(current[name] != value for name, value in properties.items() if name != "filter") or {key: value for key, value in before.items() if key != "properties"} != {key: value for key, value in after.items() if key != "properties"}:
            raise RuntimeError("Cannot prepare GSI sampling: selected texture changed beyond the admitted filter or did not retain Default.")
        if persist and not unreal.EditorAssetLibrary.save_loaded_asset(texture, False):
            raise RuntimeError("Cannot persist GSI sampling: editor refused the selected shared texture package save.")
    except Exception:
        if changed:
            texture.set_editor_property("filter", original)
        raise
    return {"before": before, "after": after, "changed": changed, "saved": persist,
            "bound": "Selected shared GSI texture filter only; no resident-mip, geometry, UV or appearance acceptance."}


def _set_saved_photographic_tone(enabled, persist):
    if persist:
        _require_complete_support()
    if type(enabled) is not bool:
        raise RuntimeError("Cannot save photographic tone: enabled must be boolean.")
    _saved_photographic_tone()
    volumes = [actor for actor in _actors().get_all_level_actors() if isinstance(actor, unreal.PostProcessVolume)
               and actor.get_actor_label() == "Shibuya_Exposure"]
    if len(volumes) != 1:
        raise RuntimeError("Cannot save photographic tone: configure the unique Shibuya_Exposure volume first.")
    volume = volumes[0]
    original = volume.get_editor_property("settings")
    settings = volume.get_editor_property("settings")
    expected = _exposure(enabled)
    for name in _photographic_policy(expected):
        if name.startswith("local_exposure_"):
            setattr(settings, name, getattr(expected, name))
            setattr(settings, "override_" + name, getattr(expected, "override_" + name))
    try:
        volume.set_editor_property("settings", settings)
        if _saved_photographic_tone() is not enabled:
            raise RuntimeError("Cannot save photographic tone: native settings did not retain the requested exact policy.")
        if persist and not unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).save_current_level():
            raise RuntimeError("Cannot save photographic tone: editor refused the Shibuya map save.")
    except Exception:
        volume.set_editor_property("settings", original)
        raise
    return {"photographic_tone": enabled, "saved": persist, "photographic_policy": _photographic_policy(volume.get_editor_property("settings"))}


def _set_sky_distance_trial(candidate):
    """One transient sky-only capture-distance trial; no save, tone, geometry or other light edits."""
    if type(candidate) is not bool:
        raise RuntimeError("Sky distance trial requires a literal Boolean candidate, not a numeric or string alias.")
    if candidate and _capture:
        raise RuntimeError("Sky distance trial must begin before an active capture; finish that capture first.")
    frame = _native_scene_frame(require=True)
    actors = [actor for actor in _actors().get_all_level_actors() if isinstance(actor, unreal.SkyLight)]
    if len(actors) != 1 or actors[0].get_actor_label() != "Shibuya_SkyLight":
        raise RuntimeError("Sky distance trial requires exactly one SkyLight named Shibuya_SkyLight.")
    actor = actors[0]
    component = actor.light_component
    api_readiness = {name: callable(getattr(component, name, None)) for name in ("get_editor_property", "set_editor_property", "recapture_sky")}
    if not all(api_readiness.values()):
        raise RuntimeError("Sky distance trial requires callable native property/readback and recapture_sky APIs before any mutation: " + json.dumps(api_readiness, sort_keys=True))
    if component.get_editor_property("mobility") != unreal.ComponentMobility.MOVABLE or component.get_editor_property("source_type") != unreal.SkyLightSourceType.SLS_CAPTURED_SCENE or component.get_editor_property("real_time_capture") is not False or component.get_editor_property("cubemap") is not None:
        raise RuntimeError("Sky distance trial requires the existing movable captured-scene SkyLight with no cubemap or real-time capture.")
    original = component.get_editor_property("sky_distance_threshold")
    if type(original) not in (int, float) or original not in (5.0, 150000.0) or (candidate and original != 5.0):
        raise RuntimeError("Sky distance trial requires threshold5cm before candidate, or5/150000cm before fixed restoration.")
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    library = getattr(unreal, "ShibuyaRendererLibrary", None)
    if library is None or not callable(getattr(library, "inspect_world_resources", None)):
        raise RuntimeError("Sky distance trial requires the callable compiled native SkyLight resource observer before mutation.")
    api_readiness["inspect_world_resources"] = True
    def resources():
        rows = json.loads(library.inspect_world_resources(world)).get("skylights", [])
        rows = [row for row in rows if row.get("component") == component.get_path_name()]
        if len(rows) != 1:
            raise RuntimeError("Sky distance trial cannot identify its actual native SkyLight resource.")
        return rows[0]
    before = resources()
    threshold = 150000.0 if candidate else 5.0
    try:
        component.set_editor_property("sky_distance_threshold", threshold)
        if component.get_editor_property("sky_distance_threshold") != threshold:
            raise RuntimeError("Sky distance trial threshold readback differs from the fixed requested value.")
        component.recapture_sky()
        after = resources()
    except BaseException as error:
        try:
            component.set_editor_property("sky_distance_threshold", original)
            component.recapture_sky()
            if component.get_editor_property("sky_distance_threshold") != original:
                raise RuntimeError("Original SkyLight threshold was not restored.")
        except Exception as cleanup_error:
            error.add_note("Sky distance trial rollback also failed: " + str(cleanup_error))
        raise
    return {"candidate": candidate, "threshold_before_cm": original, "threshold_after_cm": component.get_editor_property("sky_distance_threshold"),
            "native_frame": frame["native_frame"], "component": component.get_path_name(), "native_resource_before": before, "native_resource_after_request": after,
            "api_readiness_before_mutation": api_readiness, "recapture_requested": True, "saved": False, "resource_bound": "Recapture is asynchronous; inspect actual SH/resource again after subsequent native capture frames."}


def _saved_daylight_values():
    return (25000.0, 4.0)


def _daylight():
    photographic_tone = _saved_photographic_tone()
    world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
    unreal.SystemLibrary.execute_console_command(world, "Editor.AsyncAssetCompilationFinishAll")
    actors = _actors().get_all_level_actors()
    for actor in actors:
        if isinstance(actor, unreal.DirectionalLight):
            actor.light_component.set_mobility(unreal.ComponentMobility.MOVABLE)
            actor.set_actor_rotation(unreal.Rotator(pitch=-55.0, yaw=35.0, roll=0.0), False)
            actor.light_component.set_intensity(_saved_daylight_values()[0])
            actor.light_component.set_atmosphere_sun_light(True)
        if isinstance(actor, unreal.SkyLight):
            actor.light_component.set_mobility(unreal.ComponentMobility.MOVABLE)
            # Approximate city bounce from the existing crossing look point.
            # Use the native reflection-capture near plane, preserving local radiance.
            actor.set_actor_location(unreal.Vector(0, 0, 1500), False, False)
            actor.light_component.set_editor_property("sky_distance_threshold", 5.0)
            actor.light_component.set_editor_property("lower_hemisphere_is_black", False)
            actor.light_component.set_editor_property("capture_emissive_only", False)
            actor.light_component.set_editor_property("source_type", unreal.SkyLightSourceType.SLS_CAPTURED_SCENE)
            actor.light_component.set_editor_property("cubemap", None)
            # Scene-capture views cannot update real-time sky irradiance (native
            # ReflectionEnvironmentRealTimeCapture.cpp). Use the explicit path.
            actor.light_component.set_real_time_capture(False)
            actor.light_component.set_intensity(_saved_daylight_values()[1])
            actor.light_component.recapture_sky()
    volume = next((actor for actor in actors if actor.get_actor_label() == "Shibuya_Exposure"), None)
    if not volume:
        volume = _actors().spawn_actor_from_class(unreal.PostProcessVolume, unreal.Vector(0, 0, 0))
        volume.set_actor_label("Shibuya_Exposure")
    volume.set_editor_property("unbound", True)
    settings = _exposure(photographic_tone)
    settings.override_lumen_scene_view_distance = True
    settings.lumen_scene_view_distance = 240000.0
    volume.set_editor_property("settings", settings)


def _snapshot():
    frame_state = _native_scene_frame()
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
        "native_scene_frame": frame_state, "native_frame": frame_state["native_frame"],
        "coordinate_frame": {"units": "centimetres", "x": "east", "y": "south", "z": "up"} if frame_state["admitted"] else {"status": "UNADMITTED_MAP_FRAME"},
        "native_import_receipts": list(_native_import_receipts.values()),
    }


def _local_file(value):
    name = str(value).replace("\\", "/")
    parts = name.split("/")
    if any(part in ("", ".", "..") or re.search(r'[:<>"|?*\x00-\x1f]', part) or part.endswith((" ", ".")) or re.fullmatch(r"(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])", part.split(".")[0], re.I) for part in parts):
        raise RuntimeError(f"Cannot use {value!r}: provide a confined relative path without traversal/ADS/reserved components.")
    path = PROJECT.joinpath(*parts)
    for component in [*reversed(path.parents), path]:
        info = component.lstat()
        if stat.S_ISLNK(info.st_mode) or getattr(info, "st_file_attributes", 0) & stat.FILE_ATTRIBUTE_REPARSE_POINT:
            raise RuntimeError(f"Cannot use {value!r}: input crosses reparse path {component}.")
        if (component == path and not stat.S_ISREG(info.st_mode)) or (component != path and not stat.S_ISDIR(info.st_mode)):
            raise RuntimeError(f"Cannot use {value!r}: input requires a regular file beneath real directories.")
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
    sun.set_actor_rotation(unreal.Rotator(-45, 30, 0), False)
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


def _glb_geometry(path):
    """Fingerprint original geometry independently of photo/material buffer layout."""
    raw = path.read_bytes()
    size = struct.unpack_from("<I", raw, 12)[0]
    gltf = json.loads(raw[20:20 + size])
    binary = memoryview(raw)[28 + size:]
    result = []
    for mesh in gltf["meshes"]:
        for primitive in mesh["primitives"]:
            item = []
            for name, index in [(key, primitive["attributes"][key]) for key in ("POSITION", "NORMAL") if key in primitive["attributes"]] + [("indices", primitive["indices"])]:
                accessor = gltf["accessors"][index]
                view = gltf["bufferViews"][accessor["bufferView"]]
                components = {"SCALAR": 1, "VEC3": 3}[accessor["type"]]
                element_size = {5121: 1, 5123: 2, 5125: 4, 5126: 4}[accessor["componentType"]] * components
                stride = view.get("byteStride", element_size)
                start = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
                digest = hashlib.sha256()
                for number in range(accessor["count"]):
                    digest.update(binary[start + number * stride:start + number * stride + element_size])
                item.append([name, accessor["componentType"], accessor["type"], accessor["count"], digest.hexdigest()])
            result.append(item)
    return {"primitives": result, "nodes": gltf.get("nodes"), "scenes": gltf.get("scenes")}


def _source_actor_state(excluded):
    return {actor.get_actor_label(): {"asset": actor.static_mesh_component.static_mesh.get_path_name(), "location_cm": _vector(actor.get_actor_location()), "rotation": _rotator(actor.get_actor_rotation()), "scale": _vector(actor.get_actor_scale3d())}
            for actor in _actors().get_all_level_actors() if isinstance(actor, unreal.StaticMeshActor) and actor.actor_has_tag("ShibuyaSource") and actor.get_actor_label() not in excluded}


def _material_parameter_state(material):
    """Effective authored parameters/parent ancestry; shader resources and usage bits are separate."""
    library = unreal.MaterialEditingLibrary
    instance = isinstance(material, unreal.MaterialInstanceConstant)
    if not instance and not isinstance(material, unreal.Material):
        raise RuntimeError(f"Cannot prepare Nanite material {material.get_path_name()}: expected a persistent project material or constant instance.")
    chain, current = [], material
    while isinstance(current, unreal.MaterialInstanceConstant):
        parent = current.get_editor_property("parent")
        if parent is None or parent.get_path_name() in chain or len(chain) >= 64:
            raise RuntimeError(f"Cannot prepare Nanite material {material.get_path_name()}: missing or cyclic parent chain.")
        chain.append(parent.get_path_name())
        current = parent
    prefix = "get_material_instance_" if instance else "get_material_default_"
    result = {"parent_chain": chain}
    for kind in ("texture", "scalar", "vector", "static_switch"):
        getter = getattr(library, prefix + kind + "_parameter_value")
        values = {}
        for name in sorted(getattr(library, "get_" + kind + "_parameter_names")(material), key=str):
            value = getter(material, name)
            if kind == "texture":
                value = value.get_path_name() if value else None
            elif kind == "vector":
                value = [value.r, value.g, value.b, value.a]
            values[str(name)] = value
        result[kind] = values
    return result


def _frontage_section_matches(vertices, indices, uvs, source_cm, normals=None, tangents=None):
    """Retain all exact position/UV seams and triangle incidence; never pick one UV by position."""
    if len(vertices) > 100000 or len(indices) > 300000 or len(indices) % 3 or len(uvs) not in (0, len(vertices)):
        raise RuntimeError("Cannot observe data518 frontage: LOD0 section has invalid/beyond-bound vertex/index/UV populations.")
    wanted = [_support_point_key(point) for point in source_cm]
    def count_state(values):
        count = len(values) if values is not None else None
        return {"status": "OBSERVED" if count == len(vertices) else "UNAVAILABLE" if not count else "COUNT_MISMATCH",
                "expected_vertices": len(vertices), "actual_values": count}
    normal_count, tangent_count = count_state(normals), count_state(tangents)
    def local_frame(index):
        result = {"normal_local": None, "normal_status": normal_count["status"],
                  "tangent_x_local": None, "flip_tangent_y": None, "tangent_status": tangent_count["status"]}
        if normals is not None and index < len(normals):
            try:
                result.update(normal_local=_vector(normals[index]), normal_status="OBSERVED")
            except Exception as error:
                result.update(normal_status="UNAVAILABLE_ERROR", normal_error={"type": type(error).__name__, "message": str(error)})
        if tangents is not None and index < len(tangents):
            try:
                result.update(tangent_x_local=_vector(tangents[index].tangent_x),
                              flip_tangent_y=tangents[index].flip_tangent_y, tangent_status="OBSERVED")
            except Exception as error:
                result.update(tangent_status="UNAVAILABLE_ERROR", tangent_error={"type": type(error).__name__, "message": str(error)})
        return result
    matches = [[] for _ in wanted]
    membership = {}
    for index, point in enumerate(vertices):
        keys = [corner for corner, key in enumerate(wanted) if _support_point_key(_vector(point)) == key]
        if keys:
            membership[index] = keys
            for corner in keys:
                matches[corner].append({"vertex": index, "position_cm": _vector(point),
                                        "uv0": [uvs[index].x, uvs[index].y] if uvs else None,
                                        "local_frame": local_frame(index)})
    incident, complete = [], []
    for offset in range(0, len(indices), 3):
        face = [int(value) for value in indices[offset:offset+3]]
        if any(value < 0 or value >= len(vertices) for value in face):
            raise RuntimeError("Cannot observe data518 frontage: section triangle references a missing vertex.")
        if not any(value in membership for value in face):
            continue
        mapped = [membership.get(value, []) for value in face]
        row = {"triangle": offset // 3, "indices": face, "source_corner_candidates": mapped,
               "positions_cm": [_vector(vertices[value]) for value in face],
               "uv0": [[uvs[value].x, uvs[value].y] for value in face] if uvs else None,
               "local_frames": [local_frame(value) for value in face]}
        incident.append(row)
        if all(len(value) == 1 for value in mapped) and sorted(value[0] for value in mapped) == [0, 1, 2]:
            complete.append(row)
    return {"corner_matches": matches, "incident_triangles": incident, "complete_position_triangles": complete,
            "vertex_count": len(vertices), "index_count": len(indices), "uv0_count": len(uvs),
            "normal_count": normal_count, "tangent_count": tangent_count,
            "frame_bound": "Raw section-local normal and ProcMeshTangent tangent_x/flip_tangent_y at the actual indexed vertex; no transformed-normal/tangent inference.",
            "selection_bound": "All exact float32-centimetre corner candidates and all incident triangles, including distinct UV seams and material sections. Position coincidence alone is not a source UV match."}


def _frontage_material_observation(material):
    if material is None:
        return {"material": None, "effective_uv_transform": {"status": "UNAVAILABLE", "reason": "Native section has no bound material."}}
    result = {"material": material.get_path_name(), "effective_uv_transform": {
        "status": "UNRESOLVED_GRAPH",
        "reason": "Effective UV0-to-texture scale/offset is shader graph/function behavior. This read-only diagnostic observes inherited parameter values and the base-colour input node, but does not evaluate the compiled graph; no identity/default transform is assumed."}}
    try:
        result["effective_parameters"] = _material_parameter_state(material)
        result["used_textures"] = [texture.get_path_name() for texture in unreal.MaterialEditingLibrary.get_material_used_textures(material)]
        root = material
        for _ in result["effective_parameters"]["parent_chain"]:
            root = root.get_editor_property("parent")
        node = unreal.MaterialEditingLibrary.get_material_property_input_node(root, unreal.MaterialProperty.MP_BASE_COLOR)
        result["base_color_input"] = {"material": root.get_path_name(), "node": node.get_path_name() if node else None,
                                      "class": node.get_class().get_name() if node else None}
    except Exception as error:
        result["observation_error"] = {"type": type(error).__name__, "message": str(error)}
    return result


def _inspect_data518_frontage():
    """Observe only the two existing imported data518 actors, their seams and actual section materials."""
    source = {"path": "data/prepared/buildings/data518.glb", "bytes": 27626908,
              "sha256": "e037bf65778d307701badf616c09b243e6eaa5c1aca62d482f9e52bd98a06237"}
    _support_read(source, {})
    source_eun = [[1.3159749507904053, -0.11907928436994553, 30.31615447998047],
                  [-15.603093147277832, -0.11843027919530869, 28.283071517944336],
                  [1.3159821033477783, 52.01192092895508, 30.316404342651367]]
    source_cm = [[struct.unpack("<f", struct.pack("<f", value))[0] for value in _source_to_native_cm([point[0], point[2], point[1]])] for point in source_eun]
    prefix = "/Game/City/Tile_032/data518/StaticMeshes/"
    expected = {prefix + "City.City", prefix + "City_3236dd05d9d071b3b6d961bb25f7fdda.City_3236dd05d9d071b3b6d961bb25f7fdda"}
    actors = []
    for actor in _actors().get_all_level_actors():
        if isinstance(actor, unreal.StaticMeshActor) and actor.actor_has_tag("ShibuyaSource"):
            component = actor.static_mesh_component
            mesh = component.static_mesh
            if mesh and mesh.get_path_name().startswith(prefix):
                actors.append((actor, component, mesh))
    if len(actors) != 2 or {mesh.get_path_name() for _, _, mesh in actors} != expected:
        raise RuntimeError("Cannot observe data518 frontage: require the exact two existing tagged Tile_032/data518 source actors without duplicates.")
    subsystem = unreal.get_editor_subsystem(unreal.StaticMeshEditorSubsystem)
    result = {"source": source, "source_mesh": 1, "source_primitive": 0, "source_face": 494,
              "source_vertex_ids": [1482, 1484, 1483], "source_corners_eun_m": source_eun,
              "source_uv0": [[.09606940299272537, .8748778700828552], [.06506340950727463, .8748778700828552], [.09606940299272537, .7501221299171448]],
              "expected_local_corners_cm": source_cm, "actors": [], "saved": False,
              "bound": "Actual LOD0 section vertex/UV incidence and bound material parameters only. No UV/frame correction, effective shader-graph verdict, image, collision or appearance acceptance."}
    for actor, component, mesh in sorted(actors, key=lambda row: row[0].get_actor_label()):
        transform = component.get_world_transform()
        row = {"actor": actor.get_path_name(), "label": actor.get_actor_label(), "mesh": mesh.get_path_name(),
               "actor_transform": {"translation_cm": _vector(actor.get_actor_transform().translation),
                                   "scale": _vector(actor.get_actor_transform().scale3d),
                                   "rotation_xyzw": [getattr(actor.get_actor_transform().rotation, name) for name in ("x", "y", "z", "w")]},
               "component_transform": {"translation_cm": _vector(transform.translation), "scale": _vector(transform.scale3d),
                                       "rotation_xyzw": [getattr(transform.rotation, name) for name in ("x", "y", "z", "w")]},
               "expected_world_corners_cm": [_vector(transform.transform_location(unreal.Vector(*point))) for point in source_cm], "sections": []}
        sections = mesh.get_num_sections(0)
        if not 1 <= sections <= 16:
            raise RuntimeError("Cannot observe data518 frontage: require1..16 complete LOD0 material sections.")
        for section in range(sections):
            vertices, indices, normals, uvs, tangents = unreal.ProceduralMeshLibrary.get_section_from_static_mesh(mesh, 0, section)
            observed = _frontage_section_matches(vertices, indices, uvs, source_cm, normals, tangents)
            slot = subsystem.get_lod_material_slot(mesh, 0, section)
            if slot < 0 or slot >= len(mesh.static_materials):
                raise RuntimeError("Cannot observe data518 frontage: native section has no valid observed material slot.")
            material = component.get_material(slot)
            observed.update(section=section, material_slot=slot, slot_name=str(mesh.static_materials[slot].material_slot_name),
                            mesh_material=mesh.static_materials[slot].material_interface.get_path_name() if mesh.static_materials[slot].material_interface else None,
                            material_observation=_frontage_material_observation(material))
            row["sections"].append(observed)
        result["actors"].append(row)
    result["complete_position_triangle_count"] = sum(len(section["complete_position_triangles"]) for actor in result["actors"] for section in actor["sections"])
    result["correspondence_status"] = "OBSERVED" if result["complete_position_triangle_count"] else "NO_COMPLETE_TRIANGLE"
    return result


def _nanite_material_status(material):
    usage = unreal.MaterialUsage.MATUSAGE_NANITE
    instance = isinstance(material, unreal.MaterialInstanceConstant)
    return {"asset": material.get_path_name(), "class": material.get_class().get_name(),
            "has_nanite_usage": bool(unreal.MaterialEditingLibrary.has_material_usage(material, usage)),
            "explicit_instance_override": bool(unreal.MaterialEditingLibrary.has_material_usage_override(material, usage)) if instance else None}


def _material_usage_state(material):
    instance = isinstance(material, unreal.MaterialInstanceConstant)
    return {name: {"enabled": bool(unreal.MaterialEditingLibrary.has_material_usage(material, getattr(unreal.MaterialUsage, name))),
                   "override": bool(unreal.MaterialEditingLibrary.has_material_usage_override(material, getattr(unreal.MaterialUsage, name))) if instance else None}
            for name in dir(unreal.MaterialUsage) if name.startswith("MATUSAGE_") and name != "MATUSAGE_MAX"}


def _prepare_nanite_material(material):
    """Persist this project material's own eligibility; never mutate or save its engine parent."""
    path = material.get_path_name()
    if not path.startswith(("/Game/City/", "/Game/Surface/")):
        raise RuntimeError(f"Cannot prepare Nanite material {path}: only the actual project city/surface material slots are admitted.")
    before = _material_parameter_state(material)
    before_flags = _material_usage_state(material)
    prior_usage = _nanite_material_status(material)
    library, usage = unreal.MaterialEditingLibrary, unreal.MaterialUsage.MATUSAGE_NANITE
    if isinstance(material, unreal.MaterialInstanceConstant):
        # Always set the explicit instance override, even when a transiently
        # auto-upgraded editor parent currently reports usage=true.
        library.set_material_usage_override(material, usage, True, True)
        library.update_material_instance(material)
    else:
        library.set_base_material_usage(material, usage, True)
        errors = library.recompile_material(material)
        if errors:
            raise RuntimeError(f"Cannot prepare Nanite material {path}: own compilation failed: {errors}.")
    actual = _nanite_material_status(material)
    if not actual["has_nanite_usage"] or (isinstance(material, unreal.MaterialInstanceConstant) and not actual["explicit_instance_override"]):
        raise RuntimeError(f"Cannot prepare Nanite material {path}: native usage or the explicit instance override was not enabled.")
    stats = library.get_statistics(material)  # Finishes this interface's own actual resource.
    vertex, pixel = stats.num_vertex_shader_instructions, stats.num_pixel_shader_instructions
    if vertex <= 0 or pixel <= 0:
        raise RuntimeError(f"Cannot prepare Nanite material {path}: own completed shader resource has vertex={vertex}, pixel={pixel}; use D3D12 and fix shader errors before saving.")
    after = _material_parameter_state(material)
    after_flags = _material_usage_state(material)
    if after != before or any(after_flags.get(name) != flags for name, flags in before_flags.items() if name != "MATUSAGE_NANITE"):
        raise RuntimeError(f"Cannot prepare Nanite material {path}: parent chain or authored texture/scalar/vector/static-switch values changed.")
    if not unreal.EditorAssetLibrary.save_loaded_asset(material, False):
        raise RuntimeError(f"Cannot prepare Nanite material {path}: editor refused to save the explicit usage override and completed resource.")
    return {**actual, "before_usage": prior_usage, "parameters_before": before, "parameters_after": after,
            "all_usage_flags_before": before_flags, "all_usage_flags_after": after_flags,
            "vertex_shader_instructions": vertex, "pixel_shader_instructions": pixel, "saved": True}


def _inspect_saved_crossing_material(material):
    """Recognize only the fixed persisted V2 candidate; observe without assigning or saving."""
    manifest, _ = _crossing_inputs(_CROSSING_MANIFEST)
    folder = "/Game/AppearanceRepair/CrossingV2/"
    paths = [folder + name + "." + name for name in ("CrossingMask", "CrossingDetail", "OriginalGraph", "OriginalInstance0", "OriginalInstance1")]
    assets = [unreal.load_asset(path) for path in paths]
    if any(asset is None or asset.get_path_name() != path for asset, path in zip(assets, paths)) or material.get_path_name() != paths[-1]:
        raise RuntimeError("Cannot inspect saved crossing V2: require its exact five saved project assets.")
    for index, key in enumerate(("mask", "detail")):
        asset = assets[index]
        if not isinstance(asset, unreal.Texture2D) or [asset.blueprint_get_size_x(), asset.blueprint_get_size_y()] != manifest[key + "_dimensions"] or asset.get_editor_property("srgb") is not False:
            raise RuntimeError("Cannot inspect saved crossing V2: original linear texture/dimensions changed: " + key)
    if not isinstance(assets[2], unreal.Material) or assets[2].get_editor_property("use_material_attributes") is not False or any(not isinstance(asset, unreal.MaterialInstanceConstant) for asset in assets[3:]):
        raise RuntimeError("Cannot inspect saved crossing V2: original root/instance classes changed.")
    actual = _material_parameter_state(material)
    original = _material_parameter_state(unreal.load_asset(_CROSSING_ORIGINAL))
    if actual["parent_chain"] != [paths[3], paths[2]] or any(actual[key] != original[key] for key in ("texture", "scalar", "vector", "static_switch")):
        raise RuntimeError("Cannot inspect saved crossing V2: parent root or original atlas/UV/material parameters changed.")
    used = {texture.get_path_name() for texture in unreal.MaterialEditingLibrary.get_material_used_textures(material)}
    if not {paths[0], paths[1], original["texture"]["BaseColorTexture"]} <= used:
        raise RuntimeError("Cannot inspect saved crossing V2: mask/detail or original atlas texture is not used.")
    for asset in assets[2:]:
        status = _nanite_material_status(asset);stats = unreal.MaterialEditingLibrary.get_statistics(asset)
        if not status["has_nanite_usage"] or (isinstance(asset, unreal.MaterialInstanceConstant) and not status["explicit_instance_override"]) or stats.num_vertex_shader_instructions <= 0 or stats.num_pixel_shader_instructions <= 0:
            raise RuntimeError("Cannot inspect saved crossing V2: own compiled Nanite shader is incomplete: " + asset.get_path_name())


def _used_city_materials():
    actors = [actor for actor in _actors().get_all_level_actors() if isinstance(actor, unreal.StaticMeshActor)]
    if len(actors) != 112 or any(not actor.actor_has_tag("ShibuyaSource") for actor in actors):
        raise RuntimeError("Cannot prepare city Nanite materials: require exactly112 original source StaticMeshActors in the loaded city map.")
    materials, slots, crossing_slots = {}, [], []
    for actor in actors:
        component = actor.static_mesh_component
        for index in range(component.get_num_materials()):
            material = component.get_material(index)
            if material is not None and material.get_path_name() == "/Game/AppearanceRepair/CrossingV2/OriginalInstance1.OriginalInstance1":
                label = actor.get_actor_label()
                if label not in _CROSSING_RECEIVERS or index != 0 or component.get_num_materials() != 1 or component.static_mesh.get_path_name() != _CROSSING_RECEIVERS[label]:
                    raise RuntimeError("Cannot inspect saved crossing V2: candidate is not on its exact receiver slot0: " + label)
                crossing_slots.append(label)
            elif material is None or not material.get_path_name().startswith(("/Game/City/", "/Game/Surface/")):
                raise RuntimeError(f"Cannot prepare city Nanite materials: {actor.get_actor_label()} slot{index} has no admitted project material.")
            materials[material.get_path_name()] = material
            slots.append({"actor": actor.get_actor_label(), "slot": index, "material": material.get_path_name()})
    if crossing_slots:
        if len(crossing_slots) != 3 or set(crossing_slots) != set(_CROSSING_RECEIVERS):
            raise RuntimeError("Cannot inspect saved crossing V2: require all three exact receiver bindings.")
        _inspect_saved_crossing_material(materials["/Game/AppearanceRepair/CrossingV2/OriginalInstance1.OriginalInstance1"])
    return materials, slots


def _import_glb(path, destination, require_textures=True, prepare_nanite=True):
    path, frame_receipt = _native_import_file(path)
    task = unreal.AssetImportTask()
    task.filename = str(path)
    task.destination_path = destination
    task.automated = True
    task.replace_existing = True
    task.save = False
    unreal.AssetToolsHelpers.get_asset_tools().import_asset_tasks([task])
    assets = [unreal.load_asset(name) for name in task.imported_object_paths]
    meshes = [asset for asset in assets if isinstance(asset, unreal.StaticMesh)]
    if not meshes:
        raise RuntimeError(f"Cannot import {path.name}: the Interchange import task returned no static meshes for {destination}.")
    for mesh in meshes:
        unreal.EditorAssetLibrary.set_metadata_tag(mesh, "ShibuyaNativeFrame", _native_actor_tag())
        unreal.EditorAssetLibrary.set_metadata_tag(mesh, "ShibuyaRawEUNSHA256", frame_receipt["raw_eun_sha256"])
        unreal.EditorAssetLibrary.set_metadata_tag(mesh, "ShibuyaNativeDerivativeSHA256", frame_receipt["derivative_sha256"])
    frame_receipt["actual_imported_meshes"] = [{"asset":mesh.get_path_name(), "lod0_vertices":mesh.get_num_vertices(0), "lod0_triangles":mesh.get_num_triangles(0)} for mesh in meshes]
    frame_receipt["native_import_equivalence"] = "NEW_DERIVATIVE_IMPORTED_FULL_UV_AND_SIGNED_ORACLE_PENDING"
    _native_import_receipts[destination] = frame_receipt
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
    saved = set()
    if prepare_nanite:
        materials = {slot.material_interface.get_path_name(): slot.material_interface for mesh in meshes for slot in mesh.static_materials if slot.material_interface}
        for material in materials.values():
            _prepare_nanite_material(material)
            saved.add(material.get_path_name())
    if destination == "/Game/Surface/TerrainPhoto":
        _prepare_gsi_sampling(True)
    # Save only assets actually imported or referenced by these meshes, not old
    # unused packages merely present in the destination directory.
    referenced = [*assets, *meshes]
    for mesh in meshes:
        referenced.extend(slot.material_interface for slot in mesh.static_materials if slot.material_interface)
    for asset in list(referenced):
        if isinstance(asset, unreal.MaterialInterface):
            referenced.extend(unreal.MaterialEditingLibrary.get_material_used_textures(asset))
    for asset in referenced:
        if asset and asset.get_path_name().startswith(destination) and asset.get_path_name() not in saved:
            if not unreal.EditorAssetLibrary.save_loaded_asset(asset, False):
                raise RuntimeError(f"Cannot import {path.name}: editor refused to save admitted asset {asset.get_path_name()} after material eligibility checks.")
            saved.add(asset.get_path_name())
    return meshes


_crossing_trial = None
_saved_crossing_daylight = None
_CROSSING_MANIFEST = "data/prepared/appearance/crossing-v2/manifest.json"
_CROSSING_MANIFEST_SHA = "c3c0f68475bfa239fc9be0fdd69b4195810b7e9525908dc4f2e7b8f584814119"
_CROSSING_RECEIVERS = {
    "City_055_data68": "/Game/Surface/Roads/Tile_055/data68/StaticMeshes/data68.data68",
    "City_058_data72": "/Game/Surface/Roads/Tile_058/data72/StaticMeshes/data72.data72",
    "City_069_terrain": "/Game/Surface/TerrainPhoto/terrain-photo/StaticMeshes/terrain-photo.terrain-photo"}
_CROSSING_ORIGINAL = "/Game/Surface/TerrainPhoto/terrain-photo/Materials/Official_GSI_aerial_photograph.Official_GSI_aerial_photograph"


def _crossing_read(record, cap):
    path = _local_file(record["path"])
    size = path.stat().st_size
    if type(record.get("bytes")) is not int or size != record["bytes"] or not 0 < size <= cap:
        raise RuntimeError("Crossing material input size differs or exceeds its bound: " + record["path"])
    data = path.read_bytes()
    if len(data) != size or hashlib.sha256(data).hexdigest() != record["sha256"]:
        raise RuntimeError("Crossing material input digest differs: " + record["path"])
    return path, data


def _crossing_inputs(relative_manifest):
    if type(relative_manifest) is not str or relative_manifest != _CROSSING_MANIFEST:
        raise RuntimeError("Crossing material trial requires its one published data/prepared/appearance/crossing-v2/manifest.json input.")
    path = _local_file(relative_manifest)
    data = path.read_bytes() if 0 < path.stat().st_size <= 100000 else b""
    if hashlib.sha256(data).hexdigest() != _CROSSING_MANIFEST_SHA:
        raise RuntimeError("Crossing material trial requires the exact sealed authored manifest, not an old or relabelled packet.")
    manifest = json.loads(data)
    _require_native_frame(manifest, "crossing material manifest")
    if type(manifest.get("schema_version")) is not int or manifest["schema_version"] != 2 or manifest.get("candidate_id") != "crossing-v2-paving-detail" or manifest["receivers"] != _CROSSING_RECEIVERS or manifest["mask_dimensions"] != [2048, 2048] or manifest["detail_dimensions"] != [512, 512]:
        raise RuntimeError("Crossing v2 material/channel/receiver/dimension contract differs; old B roughness cannot become paving.")
    for row in manifest["source_inputs"]:
        _crossing_read(row, 16 * 1024 * 1024)
    _crossing_read(manifest["semantic_polygons"], 100000)
    paths = {}
    for name, dimensions, color_type in (("mask", (2048, 2048), 2), ("detail", (512, 512), 6)):
        paths[name], png = _crossing_read(manifest[name], 16 * 1024 * 1024)
        if len(png) < 33 or png[:8] != b"\x89PNG\r\n\x1a\n" or png[12:16] != b"IHDR" or struct.unpack(">II", png[16:24]) != dimensions or png[24:26] != bytes((8, color_type)):
            raise RuntimeError("Crossing v2 " + name + " is not its sealed8-bit RGB/RGBA PNG.")
    return manifest, paths["mask"]


def _crossing_bindings():
    result = {}
    for actor in _actors().get_all_level_actors():
        if isinstance(actor, unreal.StaticMeshActor) and actor.actor_has_tag("ShibuyaSource"):
            component = actor.static_mesh_component
            result[actor.get_actor_label()] = {"effective": [component.get_material(i).get_path_name() if component.get_material(i) else None for i in range(component.get_num_materials())],
                "overrides": [v.get_path_name() if v else None for v in component.get_editor_property("override_materials")]}
    return result


def _crossing_receivers():
    frame = _native_scene_frame(require=True)
    rows = []
    for label, path in _CROSSING_RECEIVERS.items():
        matches = [a for a in _actors().get_all_level_actors() if isinstance(a, unreal.StaticMeshActor) and a.get_actor_label() == label]
        if len(matches) != 1:
            raise RuntimeError("Crossing material requires exactly one receiver: " + label)
        actor = matches[0]
        component = actor.static_mesh_component
        mesh = component.static_mesh
        if mesh is None or mesh.get_path_name() != path or component.get_num_materials() != 1 or component.get_material(0) is None or component.get_material(0).get_path_name() != _CROSSING_ORIGINAL:
            raise RuntimeError("Crossing material receiver must retain its exact source mesh and one original GSI material slot: " + label)
        rows.append({"actor": actor, "label": label, "component": component, "mesh": mesh, "material": component.get_material(0),
                     "overrides": list(component.get_editor_property("override_materials"))})
    return rows, frame


def _crossing_graph(material, texture, detail_texture, manifest):
    """Private direct root: weighted geographic classes plus separate periodic inferred detail."""
    library = unreal.MaterialEditingLibrary
    def node(kind, **properties):
        value = library.create_material_expression(material, getattr(unreal, kind))
        if value is None:
            raise RuntimeError("Cannot create crossing material expression: " + kind)
        for key, v in properties.items():value.set_editor_property(key, v)
        return value
    def connect(source, output, target, name):
        if library.connect_material_expressions(source, output, target, name) is not True:
            raise RuntimeError("Cannot connect crossing material expression input: " + name)
    def binary(kind, a, b):
        value = node("MaterialExpression" + kind)
        connect(*a, value, "A");connect(*b, value, "B")
        return value, ""
    def scalar(value):return node("MaterialExpressionConstant", r=value), ""
    def color(value):return node("MaterialExpressionConstant3Vector", constant=unreal.LinearColor(*value, 1.0)), ""
    attributes = material.get_editor_property("use_material_attributes")
    if attributes is not False:
        raise RuntimeError("DID_NOT_RUN: crossing material requires the actual root use_material_attributes=False; observed=" + repr(attributes) + ". No graph outputs or receiver bindings changed.")
    original = {}
    for name, prop in (("BaseColor", unreal.MaterialProperty.MP_BASE_COLOR), ("Roughness", unreal.MaterialProperty.MP_ROUGHNESS)):
        value = library.get_material_property_input_node(material, prop)
        if value is None:
            raise RuntimeError("Original connected " + name + " input unavailable before receiver assignment; no assumed graph identity.")
        original[name] = (value, library.get_material_property_input_node_output_name(material, prop))
    uv = node("MaterialExpressionTextureCoordinate", coordinate_index=0)
    origin = node("MaterialExpressionConstant2Vector", r=manifest["uv_origin"][0], g=manifest["uv_origin"][1])
    offset = binary("Subtract", (uv, ""), (origin, ""))
    scale = node("MaterialExpressionConstant2Vector", r=manifest["uv_scale"][0], g=manifest["uv_scale"][1])
    mapped = binary("Multiply", offset, (scale, ""))
    sample = node("MaterialExpressionTextureSample", texture=texture, sampler_type=unreal.MaterialSamplerType.SAMPLERTYPE_LINEAR_COLOR)
    connect(*mapped, sample, "UVs")
    detail_scale = node("MaterialExpressionConstant2Vector", r=manifest["detail_uv_scale"][0], g=manifest["detail_uv_scale"][1])
    detail_uv = binary("Multiply", (uv, ""), (detail_scale, ""))
    detail = node("MaterialExpressionTextureSample", texture=detail_texture, sampler_type=unreal.MaterialSamplerType.SAMPLERTYPE_LINEAR_COLOR)
    connect(*detail_uv, detail, "UVs")
    c = manifest["material"]
    centered_color = binary("Subtract", (detail, "R"), scalar(.5))
    centered_roughness = binary("Subtract", (detail, "G"), scalar(.5))
    asphalt_color = binary("Multiply", color(c["asphalt_base_color"]), binary("Add", scalar(1.), binary("Multiply", centered_color, scalar(c["asphalt_color_variation"]))))
    paving_color = binary("Multiply", color(c["paving_base_color"]), binary("Add", scalar(.9), binary("Multiply", (detail, "A"), scalar(.2))))
    paint_color = binary("Multiply", color(c["paint_base_color"]), binary("Add", scalar(.95), binary("Multiply", (detail, "R"), scalar(.1))))
    asphalt_roughness = binary("Add", scalar(c["asphalt_roughness"]), binary("Multiply", centered_roughness, scalar(c["asphalt_roughness_variation"])))
    paving_roughness = binary("Add", scalar(c["paving_roughness"]), binary("Multiply", centered_roughness, scalar(.1)))
    coverage = binary("Add", (sample, "R"), (sample, "B"))
    original_weight = binary("Subtract", scalar(1.), coverage)
    paint_alpha = binary("Multiply", (sample, "G"), (detail, "B"))
    result = {}
    for name, asphalt, paving, paint in (("BaseColor", asphalt_color, paving_color, paint_color), ("Roughness", asphalt_roughness, paving_roughness, scalar(c["paint_roughness"]))):
        # A single coverage sum avoids original-photo leakage at an asphalt/paving boundary.
        first = binary("Add", binary("Multiply", original[name], original_weight), binary("Multiply", asphalt, (sample, "R")))
        base = binary("Add", first, binary("Multiply", paving, (sample, "B")))
        blend = node("MaterialExpressionLinearInterpolate")
        connect(*base, blend, "A");connect(*paint, blend, "B");connect(*paint_alpha, blend, "Alpha")
        result[name] = blend
    for name, prop in (("BaseColor", unreal.MaterialProperty.MP_BASE_COLOR), ("Roughness", unreal.MaterialProperty.MP_ROUGHNESS)):
        if library.connect_material_property(result[name], "", prop) is not True:
            raise RuntimeError("Cannot connect crossing material output: " + name)
    return {"original_uses_material_attributes": attributes, "changed_properties": ["BaseColor", "Roughness"],
            "candidate_id": manifest["candidate_id"], "mask_channels": manifest["mask_channels"], "detail_channels": manifest["detail_channels"],
            "outside_mask": "Original expression and original instance parameters weighted1 at R+B=0; black clamped border. R+B<=1, paintG<=R.",
            "uv_origin": manifest["uv_origin"], "uv_scale": manifest["uv_scale"], "detail_uv_scale": manifest["detail_uv_scale"], "uv_channel": 0,
            "other_material_attributes": "Original pass-through; no normal, metallic, emissive or geometry output changed"}


def _crossing_prepare_material(original, mask_path, manifest):
    library = unreal.MaterialEditingLibrary
    folder = "/Game/AppearanceRepair/CrossingV2"
    chain, current = [], original
    while isinstance(current, unreal.MaterialInstanceConstant):
        if current in chain or len(chain) >= 8:
            raise RuntimeError("Crossing material cannot clone a cyclic or oversized original parent chain.")
        chain.append(current);current = current.get_editor_property("parent")
    if not isinstance(current, unreal.Material):
        raise RuntimeError("Crossing material requires the actual original Material root, not an assumed graph.")
    # This fixed prototype supports the unchanged direct-property GSI root only.
    # Its actual mode is observed here before mask import, asset cloning or receiver bindings.
    root_attributes = current.get_editor_property("use_material_attributes")
    if root_attributes is not False:
        raise RuntimeError("DID_NOT_RUN: crossing material root " + current.get_path_name() + " actual use_material_attributes=" + repr(root_attributes) + "; require literal False for this direct-property trial. No assets imported or receivers changed.")
    sources = [current, *reversed(chain)]
    names = ["OriginalGraph", *["OriginalInstance" + str(i) for i in range(len(chain))]]
    if any(unreal.EditorAssetLibrary.does_asset_exist(folder + "/" + name) for name in ["CrossingMask", "CrossingDetail", *names]):
        raise RuntimeError("Crossing material private destination is not empty; old assets cannot be reused as current.")
    tools = unreal.AssetToolsHelpers.get_asset_tools()
    textures, texture_receipts = {}, {}
    for key, name, path, dimensions, address, mips, filtering in (
            ("mask", "CrossingMask", mask_path, (2048, 2048), unreal.TextureAddress.TA_CLAMP, unreal.TextureMipGenSettings.TMGS_NO_MIPMAPS, unreal.TextureFilter.TF_BILINEAR),
            ("detail", "CrossingDetail", _local_file(manifest["detail"]["path"]), (512, 512), unreal.TextureAddress.TA_WRAP, unreal.TextureMipGenSettings.TMGS_FROM_TEXTURE_GROUP, unreal.TextureFilter.TF_DEFAULT)):
        task = unreal.AssetImportTask();task.filename = str(path);task.destination_path = folder;task.destination_name = name
        task.automated = True;task.replace_existing = False;task.save = False
        tools.import_asset_tasks([task])
        imported = [unreal.load_asset(p) for p in task.imported_object_paths]
        if len(imported) != 1 or not isinstance(imported[0], unreal.Texture2D) or imported[0].get_path_name() != folder + "/" + name + "." + name:
            raise RuntimeError("Crossing " + key + " import must return exactly its new Texture2D; no registry fallback.")
        value = imported[0]
        properties = {"srgb": False, "compression_settings": unreal.TextureCompressionSettings.TC_VECTOR_DISPLACEMENTMAP,
                      "address_x": address, "address_y": address, "mip_gen_settings": mips, "never_stream": True, "filter": filtering}
        for property_name, expected in properties.items():
            value.set_editor_property(property_name, expected)
            if value.get_editor_property(property_name) != expected:
                raise RuntimeError("Crossing " + key + " texture property readback differs: " + property_name)
        if (value.blueprint_get_size_x(), value.blueprint_get_size_y()) != dimensions:
            raise RuntimeError("Actual crossing " + key + " texture dimensions differ.")
        textures[key] = value
        texture_receipts[key] = {"texture": value.get_path_name(), "dimensions": list(dimensions), "properties": {k: str(value.get_editor_property(k)) for k in properties}, "source": manifest[key]}
    clone = None;receipts = [];graph = None
    for index, (source, name) in enumerate(zip(sources, names)):
        copied = tools.duplicate_asset(name, folder, source)
        if copied is None or copied.get_path_name() != folder + "/" + name + "." + name:
            raise RuntimeError("Crossing material clone failed: " + name)
        if index == 0:
            graph = _crossing_graph(copied, textures["mask"], textures["detail"], manifest)
            library.set_base_material_usage(copied, unreal.MaterialUsage.MATUSAGE_NANITE, True)
            errors = library.recompile_material(copied)
            if errors:raise RuntimeError("Crossing root material compilation failed: " + str(errors))
        else:
            library.set_material_instance_parent(copied, clone)
            library.set_material_usage_override(copied, unreal.MaterialUsage.MATUSAGE_NANITE, True, True)
            library.update_material_instance(copied)
        clone = copied
        status = _nanite_material_status(clone)
        stats = library.get_statistics(clone)
        if not status["has_nanite_usage"] or (isinstance(clone, unreal.MaterialInstanceConstant) and not status["explicit_instance_override"]) or stats.num_vertex_shader_instructions <= 0 or stats.num_pixel_shader_instructions <= 0:
            raise RuntimeError("Crossing material has no completed own Nanite-capable shader resource: " + name)
        receipts.append({"source": source.get_path_name(), "clone": clone.get_path_name(), "usage": status,
                         "vertex_shader_instructions": stats.num_vertex_shader_instructions, "pixel_shader_instructions": stats.num_pixel_shader_instructions})
    before = _material_parameter_state(original);after = _material_parameter_state(clone)
    if {k:v for k,v in before.items() if k != "parent_chain"} != {k:v for k,v in after.items() if k != "parent_chain"}:
        raise RuntimeError("Cloned crossing material changed original effective texture/scalar/vector/switch parameters.")
    return clone, {"original_root": current.get_path_name(), "actual_root_uses_material_attributes": root_attributes, "graph": graph, "clones": receipts, "original_parameters": before, "clone_parameters": after,
                   "textures": texture_receipts, "nominal_RGBA8_texture_bytes_including_detail_mips": 2048*2048*4 + sum((512//(2**i))**2*4 for i in range(10)), "saved": False}


def _restore_crossing_material_trial():
    global _crossing_trial
    if _crossing_trial is None:
        return {"changed": False, "restored": True, "saved": False}
    state = _crossing_trial
    errors = []
    for row in state["receivers"]:
        try:
            row["component"].set_material(0, row["material"])
            row["component"].set_editor_property("override_materials", row["overrides"])
        except Exception as error:errors.append(row["label"] + ": " + str(error))
    actual = _crossing_bindings()
    if actual != state["bindings"]:errors.append("Effective or raw component override bindings were not exactly restored.")
    if _source_actor_state(set()) != state["geometry"]:errors.append("Source actor mesh/transform state changed during material trial.")
    if _material_parameter_state(state["receivers"][0]["material"]) != state["parameters"]:errors.append("Original GSI material parameters changed.")
    if errors:
        raise RuntimeError("Crossing material restoration failed: " + json.dumps(errors))
    _native_scene_frame(require=True)
    _crossing_trial = None
    return {"changed": True, "restored": True, "bindings_before": state["bindings"], "bindings_after": actual,
            "source_geometry_transforms_conserved": True, "original_material_parameters_conserved": True, "native_frame": _native_frame_record(), "saved": False}


def _apply_crossing_material_trial(relative_manifest):
    global _crossing_trial
    if _capture or _crossing_trial is not None:
        raise RuntimeError("Crossing material trial requires no active capture or existing material trial.")
    manifest, mask_path = _crossing_inputs(relative_manifest)
    receivers, frame = _crossing_receivers()
    original = receivers[0]["material"]
    parameters = _material_parameter_state(original)
    if parameters["texture"].get("BaseColorTexture") != "/Game/Surface/TerrainPhoto/terrain-photo/Textures/terrain-photo_texture_0.terrain-photo_texture_0" or parameters["scalar"].get("BaseColorTexture_TexCoord") != 0 or parameters["scalar"].get("BaseColorTexture_Rotation") != 0 or parameters["vector"].get("BaseColorTexture_OffsetScale") != [0., 0., 1., 1.] or parameters["vector"].get("BaseColorFactor") != [1., 1., 1., 1.]:
        raise RuntimeError("Crossing material requires the actual unchanged geographic UV0 GSI photograph mapping.")
    geometry, bindings = _source_actor_state(set()), _crossing_bindings()
    # Prepare only new unsaved assets before altering any receiver binding.
    material, preparation = _crossing_prepare_material(original, mask_path, manifest)
    state = {"receivers": receivers, "geometry": geometry, "bindings": bindings, "parameters": parameters}
    _crossing_trial = state
    try:
        for row in receivers:row["component"].set_material(0, material)
        actual = _crossing_bindings()
        for label, before in bindings.items():
            if label in _CROSSING_RECEIVERS:
                if actual[label]["effective"] != [material.get_path_name()]:raise RuntimeError("Crossing material effective binding readback differs: " + label)
            elif actual[label] != before:raise RuntimeError("Crossing material changed an unrelated source component: " + label)
        if _source_actor_state(set()) != geometry or _material_parameter_state(original) != parameters:
            raise RuntimeError("Crossing material changed source geometry/transforms or original material parameters.")
    except BaseException as error:
        try:_restore_crossing_material_trial()
        except Exception as cleanup_error:error.add_note("Crossing material rollback also failed: " + str(cleanup_error))
        raise
    return {"applied": True, "saved": False, "native_frame": frame["native_frame"], "receivers": sorted(_CROSSING_RECEIVERS),
            "bindings_before": bindings, "bindings_applied": actual, "source_geometry_transforms_conserved": True,
            "original_material_parameters_conserved": True, "preparation": preparation,
            "mask": manifest["mask"], "authorship": manifest["purpose"], "appearance_status": "UNACCEPTED_PENDING_FIXED_NATIVE_PIXELS"}


def _saved_daylight_camera():
    volumes = [a for a in _actors().get_all_level_actors() if isinstance(a, unreal.PostProcessVolume) and a.get_actor_label() == "Shibuya_Exposure"]
    if len(volumes) != 1 or volumes[0].get_editor_property("unbound") is not True:
        raise RuntimeError("Cannot prepare saved crossing daylight: require one unbound Shibuya_Exposure volume.")
    settings = volumes[0].get_editor_property("settings")
    policy = _photographic_policy(settings)
    if policy != _photographic_policy(_exposure(False)):
        raise RuntimeError("Cannot prepare saved crossing daylight: require original manual f8/125/ISO100/bias0 and unoverridden local exposure.")
    return {"photographic_policy": policy, "lumen_policy": _lumen_capture_policy(settings)}


def _restore_saved_crossing_daylight():
    global _saved_crossing_daylight
    state = _saved_crossing_daylight
    if state is None:return {"changed": False, "saved": False}
    errors = []
    for index, row in enumerate(state["lights"]):
        try:row["component"].set_intensity(row["intensity"])
        except Exception as error:errors.append(state["original_lights"][index]["actor"] + ": " + str(error))
    try:
        if _crossing_trial is state["material_state"]:_restore_crossing_material_trial()
        elif _crossing_trial is not None or _crossing_bindings() != state["material_state"]["bindings"]:
            raise RuntimeError("Material trial ownership/bindings changed before saved-daylight rollback.")
    except Exception as error:errors.append(str(error))
    try:
        _, observed = _capture_daylight_lights()
        if observed != state["original_lights"]:raise RuntimeError("Original Sun/Sky intensities or protected fields did not restore.")
        state["lights"][1]["component"].recapture_sky()
    except Exception as error:errors.append(str(error))
    if errors:raise RuntimeError("Saved crossing daylight rollback failed: " + json.dumps(errors))
    _saved_crossing_daylight = None
    return {"changed": True, "saved": False, "original_lights_and_bindings_restored": True,
            "sky_recapture_requested": True, "original_SH_equivalence_claim": False, "disk_map_rollback": "operator-owned backup if any save was attempted"}


def _configure_crossing_daylight(stage):
    global _saved_crossing_daylight, _crossing_trial
    if type(stage) is not str or stage not in ("prepare", "save", "restore"):
        raise RuntimeError("Saved crossing daylight stage must be prepare, save or restore.")
    if _capture:raise RuntimeError("Saved crossing daylight requires the active capture to be finished first.")
    if stage == "restore":return _restore_saved_crossing_daylight()
    if stage == "save" and (_saved_crossing_daylight is None or _crossing_trial is not _saved_crossing_daylight["material_state"]):
        raise RuntimeError("Cannot save crossing daylight: require its current prepared candidate, not a diagnostic trial or stale state.")
    if stage == "prepare" and (_saved_crossing_daylight is not None or _crossing_trial is not None):
        raise RuntimeError("Saved crossing daylight requires no existing material/daylight preparation.")
    _require_complete_support()
    _crossing_inputs(_CROSSING_MANIFEST)
    if stage == "prepare":
        camera = _saved_daylight_camera()
        lights, observed = _capture_daylight_lights()
        if [r["intensity"] for r in lights] not in ([100000.0, 1.0], list(_saved_daylight_values())):
            raise RuntimeError("Saved crossing daylight requires original100000/1 or authored25000/4 Sun/Sky before preparation.")
        if not callable(getattr(lights[1]["component"], "recapture_sky", None)):
            raise RuntimeError("DID_NOT_RUN: existing SkyLight must expose recapture_sky before preparing saved daylight.")
        applied = _apply_crossing_material_trial(_CROSSING_MANIFEST)
        _saved_crossing_daylight = {"lights": lights, "original_lights": observed, "camera": camera,
            "material_state": _crossing_trial, "applied": applied}
        try:
            for row, value in zip(lights, _saved_daylight_values()):row["component"].set_intensity(value)
            lights[1]["component"].recapture_sky()
            _, after = _capture_daylight_lights()
            if [r["intensity"] for r in after] != list(_saved_daylight_values()) or [r["protected"] for r in after] != [r["protected"] for r in observed] or _saved_daylight_camera() != camera:
                raise RuntimeError("Saved daylight changed protected light/camera fields or failed native intensity readback.")
            return {"prepared": True, "saved": False, "lights": after, "camera": camera, "material_apply": applied,
                "sky_recapture_requested": True, "retained_SH_equivalence_required": False,
                "next": "Allow actual native capture frames to advance, finish the capture, then save this same prepared candidate."}
        except BaseException as error:
            try:_restore_saved_crossing_daylight()
            except Exception as cleanup:error.add_note("Saved daylight rollback also failed: " + str(cleanup))
            raise
    state = _saved_crossing_daylight
    try:
        _, lights = _capture_daylight_lights()
        if [r["intensity"] for r in lights] != list(_saved_daylight_values()) or [r["protected"] for r in lights] != [r["protected"] for r in state["original_lights"]] or _saved_daylight_camera() != state["camera"]:
            raise RuntimeError("Cannot save crossing daylight: prepared Sun/Sky or camera changed; prepare the exact candidate again.")
        material_state, applied = state["material_state"], state["applied"]
        if _crossing_bindings() != applied["bindings_applied"] or _source_actor_state(set()) != material_state["geometry"] or _material_parameter_state(material_state["receivers"][0]["material"]) != material_state["parameters"]:
            raise RuntimeError("Cannot save crossing daylight: prepared receiver/source geometry or original material parameters changed.")
        preparation = applied["preparation"]
        paths = [preparation["textures"][key]["texture"] for key in ("mask", "detail")] + [r["clone"] for r in preparation["clones"]]
        expected = ["/Game/AppearanceRepair/CrossingV2/" + name + "." + name for name in ("CrossingMask", "CrossingDetail", "OriginalGraph", "OriginalInstance0", "OriginalInstance1")]
        if paths != expected:raise RuntimeError("Cannot save crossing daylight: require exactly the two V2 textures, root and two instances.")
        packages = {}
        for index, path in enumerate(paths):
            asset = unreal.load_asset(path)
            if asset is None or asset.get_path_name() != path:
                raise RuntimeError("Cannot save crossing daylight: prepared asset missing or changed: " + path)
            if index < 2:
                texture = preparation["textures"][("mask", "detail")[index]]
                if not isinstance(asset, unreal.Texture2D) or [asset.blueprint_get_size_x(), asset.blueprint_get_size_y()] != texture["dimensions"] or any(str(asset.get_editor_property(key)) != value for key, value in texture["properties"].items()):
                    raise RuntimeError("Cannot save crossing daylight: prepared texture properties changed: " + path)
            else:
                if not isinstance(asset, unreal.Material if index == 2 else unreal.MaterialInstanceConstant):
                    raise RuntimeError("Cannot save crossing daylight: prepared material class changed: " + path)
                usage = _nanite_material_status(asset);stats = unreal.MaterialEditingLibrary.get_statistics(asset)
                if not usage["has_nanite_usage"] or (isinstance(asset, unreal.MaterialInstanceConstant) and not usage["explicit_instance_override"]) or stats.num_vertex_shader_instructions <= 0 or stats.num_pixel_shader_instructions <= 0:
                    raise RuntimeError("Cannot save crossing daylight: own compiled Nanite shader resource is incomplete: " + path)
            if not unreal.EditorAssetLibrary.save_loaded_asset(asset, False):
                raise RuntimeError("Cannot save crossing daylight asset " + path + "; make its project package writable.")
            packages.update(_support_material_packages({"material_path": path, "texture_path": path}))
        if _crossing_bindings() != applied["bindings_applied"] or _source_actor_state(set()) != material_state["geometry"]:
            raise RuntimeError("Cannot save crossing daylight map: receiver/geometry changed while saving its five packages.")
        if not unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).save_current_level():
            raise RuntimeError("Cannot save crossing daylight map /Game/Maps/Shibuya; operator must restore its checked map backup.")
        _crossing_trial = None;_saved_crossing_daylight = None
        return {"saved": True, "map_saved": True, "lights": lights, "camera": state["camera"],
            "package_sha256": packages, "receivers": sorted(_CROSSING_RECEIVERS), "bindings_saved": applied["bindings_applied"],
            "source_geometry_transforms_conserved": True, "original_material_parameters_conserved": True,
            "sky_recapture_requested": True, "retained_SH_equivalence_required": False,
            "appearance_status": "PENDING_REOPENED_FIXED_SIX_AND_NORMAL_GAME_INSPECTION"}
    except BaseException as error:
        try:_restore_saved_crossing_daylight()
        except Exception as cleanup:error.add_note("Saved daylight rollback also failed: " + str(cleanup))
        raise


@unreal.uclass()
class ShibuyaCityTools(unreal.ToolsetDefinition):
    """Build and inspect the fresh Shibuya crop in Unreal Engine centimetres."""

    @toolset_registry.tool_call
    @staticmethod
    def configure_crossing_daylight(stage: str) -> str:
        """Prepare, save or restore the one authored V2/Sun25000/Sky4 candidate; save only after preparation."""
        return json.dumps(_configure_crossing_daylight(stage))

    @toolset_registry.tool_call
    @staticmethod
    def apply_crossing_material_trial(relative_manifest: str) -> str:
        """Apply the sealed inferred physical road/paint material only to three source receivers; no save."""
        return json.dumps(_apply_crossing_material_trial(relative_manifest))

    @toolset_registry.tool_call
    @staticmethod
    def restore_crossing_material_trial() -> str:
        """Restore exact original effective/raw component material bindings after the fixed trial; no save."""
        return json.dumps(_restore_crossing_material_trial())

    @toolset_registry.tool_call
    @staticmethod
    def inspect_native_frame_json_controls() -> str:
        """Read finite built-in Unreal JSON/frame admission controls; no scene changes."""
        return json.dumps(json.loads(unreal.ShibuyaRendererLibrary.inspect_native_frame_json_controls()))

    @toolset_registry.tool_call
    @staticmethod
    def inspect_photographic_appearance() -> str:
        """Observe only the shared GSI sampling policy and saved-scene tone choice."""
        return json.dumps({"sampling": _gsi_sampling_state()[2], "photographic_tone": _saved_photographic_tone()})

    @toolset_registry.tool_call
    @staticmethod
    def prepare_photo_sampling(persist: bool = True) -> str:
        """Retain the confirmed shared GSI Default/World sampler; save only that texture if requested."""
        return json.dumps(_prepare_gsi_sampling(persist))

    @toolset_registry.tool_call
    @staticmethod
    def set_photographic_tone(enabled: bool, persist: bool = False) -> str:
        """Set original/bilateral saved-scene policy; persist only after native appearance review."""
        return json.dumps(_set_saved_photographic_tone(enabled, persist))

    @toolset_registry.tool_call
    @staticmethod
    def inspect_city_nanite_materials(finish_resources: bool = False) -> str:
        """Observe actual112-source-actor materials, explicit own usage, parameters and optionally finished own shader statistics; never save."""
        materials, slots = _used_city_materials()
        results = []
        for path, material in sorted(materials.items()):
            result = {**_nanite_material_status(material), "parameters": _material_parameter_state(material), "all_usage_flags": _material_usage_state(material)}
            if finish_resources:
                stats = unreal.MaterialEditingLibrary.get_statistics(material)
                result.update(vertex_shader_instructions=stats.num_vertex_shader_instructions, pixel_shader_instructions=stats.num_pixel_shader_instructions)
            results.append(result)
        return json.dumps({"source_actor_count": 112, "distinct_used_material_count": len(results), "slots": slots, "materials": results, "resources_finished": finish_resources, "saved": False})

    @toolset_registry.tool_call
    @staticmethod
    def prepare_city_nanite_materials() -> str:
        """Compile/save only project materials used by the112 source actors, preserving their authored parameters and geometry."""
        before = _source_actor_state(set())
        materials, slots = _used_city_materials()
        results = [_prepare_nanite_material(materials[path]) for path in sorted(materials)]
        after_materials, after_slots = _used_city_materials()
        if _source_actor_state(set()) != before or slots != after_slots or set(materials) != set(after_materials):
            raise RuntimeError("Cannot prepare city Nanite materials: source actor geometry, transforms or material slots changed.")
        return json.dumps({"source_actor_count": 112, "distinct_used_material_count": len(results), "slots": slots, "materials": results,
                           "source_actor_state_unchanged": True, "material_slots_unchanged": True, "map_saved": False})

    @toolset_registry.tool_call
    @staticmethod
    def inspect_data518_frontage() -> str:
        """Observe all sourceface494 corner/UV seams, triangle incidence and actual material slots; never save."""
        return json.dumps(_inspect_data518_frontage())

    @toolset_registry.tool_call
    @staticmethod
    def set_sky_distance_trial(candidate: bool) -> str:
        """Set only fixed transient SkyLight distance150000cm, or restore5cm, and request recapture; never save."""
        return json.dumps(_set_sky_distance_trial(candidate))

    @toolset_registry.tool_call
    @staticmethod
    def inspect_scene() -> str:
        """Return the actual loaded map, mesh actor counts and bounds in centimetres."""
        return json.dumps(_snapshot())

    @toolset_registry.tool_call
    @staticmethod
    def inspect_render_setup() -> str:
        """Inspect actual native lighting, photo materials and fixed-camera collision witnesses without saving the map."""
        actors = _actors().get_all_level_actors()
        lights = []
        for actor in actors:
            if isinstance(actor, (unreal.DirectionalLight, unreal.SkyLight)):
                component = actor.light_component
                item = {"actor": actor.get_actor_label(), "type": actor.get_class().get_name(), "intensity": component.get_editor_property("intensity"), "mobility": str(component.get_editor_property("mobility"))}
                item["indirect_lighting_intensity"] = component.get_editor_property("indirect_lighting_intensity")
                if isinstance(actor, unreal.SkyLight):
                    cubemap = component.get_editor_property("cubemap")
                    item.update(source_type=str(component.get_editor_property("source_type")), cubemap=cubemap.get_path_name() if cubemap else None, real_time_capture=component.get_editor_property("real_time_capture"))
                    item.update(actor_location_cm=_vector(actor.get_actor_location()),
                                capture_position_cm=_vector(component.get_world_location()),
                                sky_distance_threshold=component.get_editor_property("sky_distance_threshold"),
                                capture_emissive_only=component.get_editor_property("capture_emissive_only"),
                                lower_hemisphere_is_black=component.get_editor_property("lower_hemisphere_is_black"))
                else:
                    item.update(rotation_degrees_pitch_yaw_roll=_rotator(actor.get_actor_rotation()), atmosphere_sun_light=component.get_editor_property("atmosphere_sun_light"))
                    item["atmosphere_sun_light_index"] = component.get_editor_property("atmosphere_sun_light_index")
                lights.append(item)
        photos = []
        for path in unreal.EditorAssetLibrary.list_assets("/Game/City", recursive=True, include_folder=False):
            asset = unreal.load_asset(path)
            if isinstance(asset, unreal.MaterialInstanceConstant):
                textures = unreal.MaterialEditingLibrary.get_material_used_textures(asset)
                if not textures:
                    continue
                scalars = {str(name): unreal.MaterialEditingLibrary.get_material_instance_scalar_parameter_value(asset, name) for name in unreal.MaterialEditingLibrary.get_scalar_parameter_names(asset)}
                photos.append({"material": path, "parent": asset.get_editor_property("parent").get_path_name(), "scalars": scalars, "textures": [{"asset": texture.get_path_name(), "srgb": texture.get_editor_property("srgb"), "never_stream": texture.get_editor_property("never_stream"), "lod_bias": texture.get_editor_property("lod_bias")} for texture in textures]})
        world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
        cameras = []
        for name, xyz in [("crossing", (35, -45, 35)), ("crossing-west", (-70, 20, 65))]:
            location = unreal.Vector(*_source_to_native_cm(xyz))
            trace = unreal.SystemLibrary.line_trace_single(world, location, unreal.Vector(0, 0, 1500), unreal.TraceTypeQuery.TRACE_TYPE_QUERY1, True, [], unreal.DrawDebugTrace.NONE, True)
            cameras.append({"name": name, "camera_m": xyz, "native_complex_collision_trace": str(trace)})
        atmosphere = []
        for actor in actors:
            if isinstance(actor, unreal.SkyAtmosphere):
                component = actor.get_component_by_class(unreal.SkyAtmosphereComponent)
                atmosphere.append({"actor": actor.get_actor_label(), "location_cm": _vector(actor.get_actor_location()), "visible": component.get_editor_property("visible"), "hidden_in_game": component.get_editor_property("hidden_in_game"), "transform_mode": str(component.get_editor_property("transform_mode"))})
                atmosphere[-1]["physical_properties"] = {name: component.get_editor_property(name) for name in
                    ("bottom_radius", "atmosphere_height", "multi_scattering_factor", "rayleigh_scattering_scale",
                     "rayleigh_exponential_distribution", "mie_scattering_scale", "mie_absorption_scale", "mie_anisotropy",
                     "mie_exponential_distribution", "transmittance_min_light_elevation_angle")}
                factor = component.get_editor_property("sky_luminance_factor")
                atmosphere[-1]["sky_luminance_factor_rgba"] = [factor.r, factor.g, factor.b, factor.a]
        cvars = {name: unreal.SystemLibrary.get_console_variable_int_value(name) for name in ["r.SkyAtmosphere", "r.SupportSkyAtmosphere", "r.SkyLight.RealTimeReflectionCapture", "r.Lumen.DiffuseIndirect.Allow", "r.Lumen.Reflections.Allow"]}
        world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
        resources = json.loads(unreal.ShibuyaRendererLibrary.inspect_world_resources(world))
        volumes = [{"actor": actor.get_actor_label(), "unbound": actor.get_editor_property("unbound"),
                    "lumen_policy": _lumen_capture_policy(actor.get_editor_property("settings"))}
                   for actor in actors if isinstance(actor, unreal.PostProcessVolume) and actor.get_actor_label() == "Shibuya_Exposure"]
        return json.dumps({"lights": lights, "native_skylights": resources.get("skylights", []), "atmosphere": atmosphere, "render_cvars": cvars, "post_process_volumes": volumes, "photo_materials": photos, "fixed_camera_witnesses": cameras, "instrument": "native staged SceneCapture2D; persistent view state; explicit Lumen PP override; manual physical EV13"})

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
        meshes = _import_glb(_local_file(relative_glb), "/Game/Validation/AxisProbe", prepare_nanite=False)
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
                actor.tags = ["ShibuyaSource", _native_actor_tag()]
            imports.append({"source": entry["path"], "sha256": entry["sha256"], "mesh_count": len(meshes)})
        _native_scene_frame(require=True)
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
        """Save fixed physical daylight, exposure and an explicitly recaptured atmosphere sky."""
        _require_complete_support()
        _daylight()
        if not unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).save_current_level():
            raise RuntimeError("Cannot save Shibuya: daylight setup was not written.")
        return json.dumps(_snapshot())

    @toolset_registry.tool_call
    @staticmethod
    def apply_photo_terrain(relative_manifest: str) -> str:
        """Replace only the existing real-height terrain mesh's photo material from admitted GSI source."""
        manifest_path = _local_file(relative_manifest)
        size = manifest_path.stat().st_size
        if not 1 <= size <= 16 * 1024 * 1024:
            raise RuntimeError("Cannot dispatch surface manifest: input must contain 1 byte to 16MiB before reading.")
        with manifest_path.open("rb") as stream:
            payload = stream.read(size + 1)
        if len(payload) != size:
            raise RuntimeError("Cannot dispatch surface manifest: input changed length during its bounded read.")
        document = json.loads(payload)
        if type(document.get("schema_version")) is int and document["schema_version"] in (2, 3):
            return json.dumps(_prepare_support_terrain(manifest_path))
        _native_scene_frame(require=True)
        metadata = document["photo_ground"]
        base_path = _local_file("data/prepared/manifest.json")
        original_path = _local_file("data/prepared/terrain.glb")
        photo_path = _local_file(metadata["terrain_photo"]["path"])
        image_path = _local_file(metadata["image"]["path"])
        for path, expected in [(base_path, metadata["base_manifest_sha256"]), (original_path, metadata["original_terrain_sha256"]), (photo_path, metadata["terrain_photo"]["sha256"]), (image_path, metadata["image"]["sha256"])]:
            if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
                raise RuntimeError(f"Cannot apply photo terrain: {path.name} changed from the admitted surface manifest.")
        if _glb_geometry(original_path) != _glb_geometry(photo_path):
            raise RuntimeError("Cannot apply photo terrain: source positions, normals, triangles or node placement changed.")
        terrain = next((actor for actor in _actors().get_all_level_actors() if actor.get_actor_label() == "City_069_terrain" and isinstance(actor, unreal.StaticMeshActor) and actor.actor_has_tag("ShibuyaSource")), None)
        if not terrain:
            raise RuntimeError("Cannot apply photo terrain: build the source city with City_069_terrain first.")
        unaffected = _source_actor_state({"City_069_terrain"})
        original_mesh = terrain.static_mesh_component.static_mesh
        bounds_before = terrain.get_actor_bounds(False)
        imported = _import_glb(photo_path, "/Game/Surface/TerrainPhoto")
        if len(imported) != 1:
            raise RuntimeError("Cannot apply photo terrain: expected exactly one imported terrain mesh.")
        new_mesh = imported[0]
        try:
            terrain.static_mesh_component.set_static_mesh(new_mesh)
            bounds_after = terrain.get_actor_bounds(False)
            if any(abs(a - b) > .01 for previous, current in zip(bounds_before, bounds_after) for a, b in zip(_vector(previous), _vector(current))):
                raise RuntimeError("Cannot apply photo terrain: native replacement bounds or heights differ from source terrain.")
            if _source_actor_state({"City_069_terrain"}) != unaffected:
                raise RuntimeError("Cannot apply photo terrain: another source actor changed.")
            if not unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).save_current_level():
                raise RuntimeError("Cannot apply photo terrain: editor did not save the source map.")
        except Exception:
            terrain.static_mesh_component.set_static_mesh(original_mesh)
            raise
        return json.dumps({"surface_manifest_sha256": hashlib.sha256(manifest_path.read_bytes()).hexdigest(), "terrain_asset": new_mesh.get_path_name(), "material_bindings": _material_bindings(new_mesh), "other_source_actor_count": len(unaffected), "other_source_actors_unchanged": True, "terrain_geometry_bytes_unchanged": True, "bounds_origin_cm": _vector(bounds_after[0]), "bounds_extent_cm": _vector(bounds_after[1])})

    @toolset_registry.tool_call
    @staticmethod
    def apply_photo_roads(relative_manifest: str) -> str:
        """Apply admitted vertex UVs and share the imported terrain photo material on real road meshes."""
        def apply():
            global _support_update, _support_completed
            manifest_path = _local_file(relative_manifest)
            _native_scene_frame(require=True)
            metadata = json.loads(manifest_path.read_text(encoding="utf-8"))
            base_path = _local_file("data/prepared/manifest.json")
            if hashlib.sha256(base_path.read_bytes()).hexdigest() != metadata["base_manifest_sha256"]:
                raise RuntimeError("Cannot apply photo roads: admitted base city manifest changed.")
            atlas = _local_file(metadata["shared_atlas"]["path"])
            if hashlib.sha256(atlas.read_bytes()).hexdigest() != metadata["shared_atlas"]["sha256"]:
                raise RuntimeError("Cannot apply photo roads: the admitted shared GSI atlas changed.")
            terrain = next((actor for actor in _actors().get_all_level_actors() if actor.get_actor_label() == "City_069_terrain"), None)
            support_state = _support_update
            support_installation = bool(support_state and support_state["status"] == "pending-road-validation" and terrain == support_state["terrain"] and terrain.static_mesh_component.static_mesh.get_path_name() == support_state["manifest"]["native_assignment"]["replacement_mesh_path"])
            if support_state and not support_installation:
                raise RuntimeError("Cannot apply photo roads: this process has an unfinished/failed support terrain replacement; restart the normal surface operation.")
            if not terrain or (not support_installation and not terrain.static_mesh_component.static_mesh.get_path_name().startswith("/Game/Surface/TerrainPhoto/")):
                raise RuntimeError("Cannot apply photo roads: import admitted photo terrain first.")
            if support_installation and hashlib.sha256(manifest_path.read_bytes()).hexdigest() != support_state["manifest"]["inputs"]["road_photo_manifest"]["sha256"]:
                _abort_support_update("Road manifest differs from admitted support generation")
                raise RuntimeError("Cannot apply photo roads: road manifest differs from the pending support generation.")
            shared_material = terrain.static_mesh_component.static_mesh.static_materials[0].material_interface
            if not support_installation:
                _prepare_nanite_material(shared_material)
            shared_textures = {texture.get_path_name() for texture in unreal.MaterialEditingLibrary.get_material_used_textures(shared_material)}
            if len(shared_textures) != 1:
                raise RuntimeError("Cannot apply photo roads: terrain must bind exactly one admitted atlas texture.")
            base = json.loads(base_path.read_text(encoding="utf-8"))
            source_indices = {_local_file(entry["path"]): index for index, entry in enumerate(base["glbs"])}
            prepared = []
            for entry in metadata["outputs"]:
                original = _local_file(entry["original"]["path"])
                index = source_indices[original]
                label = f"City_{index:03}_{original.stem}"
                selected = _support_selected_road(entry, support_state, label) if support_installation and support_state["manifest"]["schema_version"] == 3 else entry["generated"]
                generated = _local_file(selected["path"])
                for path, expected in [(original, entry["original"]["sha256"]), (generated, selected["sha256"])]:
                    if hashlib.sha256(path.read_bytes()).hexdigest() != expected:
                        raise RuntimeError(f"Cannot apply photo roads: {path} changed from the admitted road manifest.")
                if not (support_installation and support_state["manifest"]["schema_version"] == 3) and _glb_geometry(original) != _glb_geometry(generated):
                    raise RuntimeError(f"Cannot apply photo roads: {generated.name} changed source geometry or placement.")
                actor = next((actor for actor in _actors().get_all_level_actors() if actor.get_actor_label() == label and isinstance(actor, unreal.StaticMeshActor) and actor.actor_has_tag("ShibuyaSource")), None)
                if not actor:
                    raise RuntimeError(f"Cannot apply photo roads: expected original source actor {label}.")
                prepared.append((actor, generated, index))
            labels = {actor.get_actor_label() for actor, _, _ in prepared}
            if len(prepared) != 25 or len(labels) != 25:
                raise RuntimeError("Cannot apply photo roads: expected exactly25 distinct original road actors.")
            unaffected = _source_actor_state(labels)
            rollback, changed = [], []
            try:
                for actor, generated, index in prepared:
                    old_mesh = actor.static_mesh_component.static_mesh
                    old_bounds = actor.get_actor_bounds(False)
                    imported = _import_glb(generated, f"/Game/Surface/Roads/Tile_{index:03}")
                    if len(imported) != 1:
                        raise RuntimeError(f"Cannot apply photo road {generated.name}: expected one native mesh.")
                    mesh = imported[0]
                    slots = list(mesh.static_materials)
                    for slot in slots:
                        slot.material_interface = shared_material
                    mesh.set_editor_property("static_materials", slots)
                    if support_installation:
                        native = next(row for row in support_state["manifest"]["native_roads"] if row["actor_label"] == actor.get_actor_label())
                        if mesh.get_path_name() != native["native_mesh_path"]:
                            raise RuntimeError("Cannot apply support road: importer returned a different native source mesh path.")
                        collision = _support_collision(mesh, native["triangles"], native["source"], support_state["bindings"], road=support_state["manifest"]["schema_version"] == 3)
                    if not unreal.EditorAssetLibrary.save_loaded_asset(mesh):
                        raise RuntimeError(f"Cannot apply photo road {generated.name}: editor did not save shared-atlas material bindings in {mesh.get_path_name()}. Make that native asset package writable and retry the admitted road import.")
                    rollback.append((actor, old_mesh))
                    actor.static_mesh_component.set_static_mesh(mesh)
                    new_bounds = actor.get_actor_bounds(False)
                    if support_installation and support_state["manifest"]["schema_version"] == 3:
                        if not _support_road_bounds(actor, support_state["road_geometry"][actor.get_actor_label()]["bounds_glb_m"]):
                            raise RuntimeError(f"Cannot apply Source3 road {generated.name}: native bounds differ from its exact declared full replacement.")
                    elif any(abs(a - b) > .01 for previous, current in zip(old_bounds, new_bounds) for a, b in zip(_vector(previous), _vector(current))):
                        raise RuntimeError(f"Cannot apply photo road {generated.name}: native geometry bounds changed.")
                    bindings = _material_bindings(mesh)
                    if any(set(binding["textures"]) != shared_textures for binding in bindings):
                        raise RuntimeError(f"Cannot apply photo road {generated.name}: native material did not bind the shared GSI atlas.")
                    changed.append({"actor": actor.get_actor_label(), "asset": mesh.get_path_name(), "material_bindings": bindings, **({"collision": collision} if support_installation else {})})
                if _source_actor_state(labels) != unaffected:
                    raise RuntimeError("Cannot apply photo roads: a building or terrain actor changed.")
                if support_installation:
                    support_state["road_collision_receipts"] = [{"actor": row["actor"], "asset": row["asset"], "collision": row["collision"]} for row in changed]
                if support_installation:
                    support_state["city_collision"] = _prepare_city_collision(support_state)
                support_validation = _validate_support_installation(support_state) if support_installation else None
                if support_installation:
                    support_validation["city_collision_witnesses"] = _city_collision_witnesses(support_state)
                    for city_mesh, *_ in support_state["city_collision_restore"]:
                        if not unreal.EditorAssetLibrary.save_loaded_asset(city_mesh, False):
                            raise RuntimeError("Cannot save validated City collision: " + city_mesh.get_path_name() + "; earlier generated package saves are retained but unaccepted.")
                if support_installation and not unreal.EditorAssetLibrary.save_loaded_asset(terrain.static_mesh_component.static_mesh, False):
                    raise RuntimeError("Cannot save support terrain material/collision after native validation.")
                if not unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).save_current_level():
                    raise RuntimeError("Cannot apply photo roads: editor did not save the source city map.")
                if support_installation:
                    unreal.EditorAssetLibrary.set_metadata_tag(terrain.static_mesh_component.static_mesh, "ShibuyaSupportState", "validated")
                    if not unreal.EditorAssetLibrary.save_loaded_asset(terrain.static_mesh_component.static_mesh, False):
                        raise RuntimeError("Cannot publish completed support admission: native validation marker was not saved; map/package writes are retained but unaccepted.")
                    _support_completed = support_state
                    _support_update = None
            except Exception as error:
                for actor, old_mesh in rollback:
                    actor.static_mesh_component.set_static_mesh(old_mesh)
                if support_installation:
                    _abort_support_update(error)
                raise
            return json.dumps({"road_manifest_sha256": hashlib.sha256(manifest_path.read_bytes()).hexdigest(), "roads": changed, "road_geometry_bytes_unchanged": not (support_installation and support_state["manifest"]["schema_version"] == 3), "other_source_actor_count": len(unaffected), "other_source_actors_unchanged": True, "shared_atlas_assets": sorted(shared_textures), **({"support_manifest_sha256": support_state["manifest_sha256"], "support_status": "native-roads-rays-validated-map-saved", "native_support_validation": support_validation, "city_collision": support_state["city_collision"], "terrain_collision": support_state["collision"], "terrain_geometry_bytes_unchanged": False} if support_installation else {})})
        try:
            return apply()
        except Exception as error:
            if _support_update and _support_update["status"] == "pending-road-validation":
                _abort_support_update(error)
            raise

    @toolset_registry.tool_call
    @staticmethod
    def capture_view(relative_output: str, east_m: float, north_m: float, height_m: float, target_east_m: float = 0.0, target_north_m: float = 0.0, target_height_m: float = 15.0, target_gamma: float = 2.2, full_crop_coverage: bool = False, photographic_tone: bool = False, hardware_ray_tracing: bool = False, use_saved_tone: bool = True) -> str:
        """Start one persistent viewpoint; advance and export it in later MCP calls after editor ticks.

        Args:
            relative_output: PNG output path below artifacts/unreal inside this project.
            east_m: Camera east coordinate in metres.
            north_m: Camera north coordinate in metres.
            height_m: Camera up coordinate in metres.
            target_east_m: Look-at east coordinate in metres.
            target_north_m: Look-at north coordinate in metres.
            target_height_m: Look-at up coordinate in metres.
            target_gamma: SDR display gamma;1.0 is retained only as a regression control.
            full_crop_coverage: Opt-in2400m reach-only software Lumen scene; local tracing is retained and the process clipmap is restored at finish.
            photographic_tone: Explicit bilateral opt-in; normal false inherits the saved choice unless use_saved_tone=false.
            hardware_ray_tracing: Allow this view to use project-enabled ray tracing; global support and actual dispatch still require independent verification.
            use_saved_tone: Normal captures inherit the saved scene choice; false keeps explicit original A/B controls.
        """
        photographic_tone = _capture_photographic_tone(photographic_tone, use_saved_tone)
        output = (PROJECT / relative_output).resolve()
        if not output.is_relative_to(PROJECT / "artifacts/unreal") or output.suffix != ".png":
            raise RuntimeError(f"Cannot capture {relative_output!r}: use a .png path below artifacts/unreal.")
        if output.exists():
            raise RuntimeError(f"Cannot capture {relative_output!r}: this output already exists. Request a fresh run path.")
        output.parent.mkdir(parents=True, exist_ok=True)
        world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
        unreal.SystemLibrary.execute_console_command(world, "Editor.AsyncAssetCompilationFinishAll")
        global _capture
        if _capture:
            raise RuntimeError("Cannot start another capture: export the active capture with finish=true first.")
        _native_scene_frame(require=True)
        for path in unreal.EditorAssetLibrary.list_assets("/Game/City", recursive=True, include_folder=False) + unreal.EditorAssetLibrary.list_assets("/Game/Surface", recursive=True, include_folder=False):
            texture_asset = unreal.load_asset(path)
            if isinstance(texture_asset, unreal.Texture2D):
                texture_asset.set_force_mip_levels_to_be_resident(180.0)
        _native_scene_frame(require=True)
        location = unreal.Vector(*_source_to_native_cm([east_m, north_m, height_m]))
        target = unreal.Vector(*_source_to_native_cm([target_east_m, target_north_m, target_height_m]))
        actor = _actors().spawn_actor_from_class(unreal.SceneCapture2D, location)
        state = {"actor": actor, "world": world, "photographic_tone": photographic_tone, "hardware_ray_tracing": hardware_ray_tracing}
        try:
            actor.set_actor_rotation(unreal.MathLibrary.find_look_at_rotation(location, target), False)
            component = actor.capture_component2d
            texture = unreal.RenderingLibrary.create_render_target2d(world, 1280, 720, unreal.TextureRenderTargetFormat.RTF_RGBA8)
            texture.set_editor_property("target_gamma", target_gamma)
            component.texture_target = texture
            component.capture_source = unreal.SceneCaptureSource.SCS_FINAL_COLOR_LDR
            component.use_ray_tracing_if_enabled = hardware_ray_tracing
            component.capture_every_frame = False
            component.capture_on_movement = False
            component.always_persist_rendering_state = True
            component.fov_angle = 60.0
            component.set_editor_property("post_process_settings", _exposure(True) if photographic_tone else _exposure())
            settings = component.get_editor_property("post_process_settings")
            if full_crop_coverage:
                state["coverage"] = _apply_capture_coverage(world, settings)
                unreal.SystemLibrary.execute_console_command(world, "r.LumenScene.GlobalSDF.ClipmapExtent 7500")
                actual_extent = unreal.SystemLibrary.get_console_variable_float_value("r.LumenScene.GlobalSDF.ClipmapExtent")
                if not math.isfinite(actual_extent) or abs(actual_extent - 7500) > .001:
                    raise RuntimeError(f"Cannot start full-crop capture: actual first clipmap extent is{actual_extent!r}cm; expected7500cm.")
            component.set_editor_property("post_process_settings", settings)
            native_start_frame = unreal.SystemLibrary.get_frame_count()
            component.capture_scene()
            state.update(texture=texture, frames=1, native_start_frame=native_start_frame, output=output,
                         camera_m=[east_m, north_m, height_m], target_m=[target_east_m, target_north_m, target_height_m])
            _capture = state
            return json.dumps({"started": True, **_capture_witness(_capture)})
        except Exception:
            _capture = state
            _finish_capture()
            raise

    @toolset_registry.tool_call
    @staticmethod
    def advance_capture() -> str:
        """Render another frame of the active view after a separate editor tick."""
        if not _capture:
            raise RuntimeError("Cannot advance capture: start a persistent view first.")
        phase = _capture.get("diagnostic", _capture)
        if phase["frames"] == 79:
            # The final actual render emits view-specific native Lumen scene counters.
            unreal.SystemLibrary.execute_console_command(_capture["world"], "r.LumenScene.DumpStats 2")
        _capture["actor"].capture_component2d.capture_scene()
        phase["frames"] += 1
        result = {"capture_frames": _capture["frames"]}
        if phase is not _capture:
            result["diagnostic_capture_frames"] = phase["frames"]
        return json.dumps(result)

    @toolset_registry.tool_call
    @staticmethod
    def inspect_camera_surfaces(east_m: float, north_m: float, height_m: float, target_east_m: float = 0.0, target_north_m: float = 0.0, target_height_m: float = 15.0, active_capture_stage: str = "", relative_output_prefix: str = "") -> str:
        """Read immediate samples, or fixed raw buffers from the active original crossing capture; no asset saves."""
        if active_capture_stage or relative_output_prefix:
            return json.dumps(_capture_surface_diagnostic(active_capture_stage, relative_output_prefix,
                              [east_m, north_m, height_m], [target_east_m, target_north_m, target_height_m]))
        world = unreal.get_editor_subsystem(unreal.UnrealEditorSubsystem).get_editor_world()
        _native_scene_frame(require=True)
        location = unreal.Vector(*_source_to_native_cm([east_m, north_m, height_m]))
        target = unreal.Vector(*_source_to_native_cm([target_east_m, target_north_m, target_height_m]))
        actor = _actors().spawn_actor_from_class(unreal.SceneCapture2D, location)
        try:
            actor.set_actor_rotation(unreal.MathLibrary.find_look_at_rotation(location, target), False)
            component = actor.capture_component2d
            component.capture_every_frame = False
            component.capture_on_movement = False
            component.fov_angle = 60.0
            texture = unreal.RenderingLibrary.create_render_target2d(world, 1280, 720, unreal.TextureRenderTargetFormat.RTF_RGBA32F)
            component.texture_target = texture
            samples = []
            for name, mode in [("axial_depth_cm", unreal.SceneCaptureSource.SCS_SCENE_DEPTH), ("world_normal", unreal.SceneCaptureSource.SCS_NORMAL), ("base_color", unreal.SceneCaptureSource.SCS_BASE_COLOR), ("scene_color_hdr", unreal.SceneCaptureSource.SCS_SCENE_COLOR_HDR)]:
                component.capture_source = mode
                component.capture_scene()
                pixels = []
                for x, y in [(640, 360), (640, 600), (320, 240), (960, 240)]:
                    color = unreal.RenderingLibrary.read_render_target_raw_pixel(world, texture, x, y, False)
                    pixels.append({"pixel": [x, y], "rgba": [color.r, color.g, color.b, color.a]})
                samples.append({"source": name, "pixels": pixels})
            return json.dumps({"native_frame": _native_frame_record(), "source_camera_enu_m": [east_m, north_m, height_m], "source_target_enu_m": [target_east_m, target_north_m, target_height_m], "actor_location_cm": _vector(actor.get_actor_location()), "component_location_cm": _vector(component.get_world_location()), "forward": _vector(actor.get_actor_forward_vector()), "right": _vector(actor.get_actor_right_vector()), "up": _vector(actor.get_actor_up_vector()), "fov_horizontal_degrees": component.fov_angle, "target_dimensions": [1280, 720], "capture_samples": samples, "bound": "Immediate native source depth/base color/normals and direct scene HDR; temporal Lumen readiness excluded"})
        finally:
            _actors().destroy_actor(actor)

    @toolset_registry.tool_call
    @staticmethod
    def export_capture(relative_output: str, finish: bool = False) -> str:
        """Export the active renderer output; finish destroys its task-owned capture actor."""
        global _capture
        if not _capture:
            raise RuntimeError("Cannot export capture: start a persistent view first.")
        try:
            if _capture.get("diagnostic"):
                raise RuntimeError("Cannot export final color during a float diagnostic: call inspect_camera_surfaces with active_capture_stage=restore first.")
            output = (PROJECT / relative_output).resolve()
            if not output.is_relative_to(PROJECT / "artifacts/unreal") or output.suffix != ".png":
                raise RuntimeError(f"Cannot export {relative_output!r}: use a .png path below artifacts/unreal.")
            if output.exists():
                raise RuntimeError(f"Cannot export {relative_output!r}: this output already exists. Request a fresh run path.")
            unreal.RenderingLibrary.export_render_target(_capture["world"], _capture["texture"], str(output.parent), output.name)
            if not output.is_file() or output.stat().st_size == 0:
                raise RuntimeError(f"Cannot capture {relative_output!r}: Unreal did not export the render target.")
            raw_png = output.read_bytes()
            prefix = _native_png_prefix(raw_png)
            trailer = raw_png[len(prefix):]
            output.write_bytes(prefix)
            result = {"path": output.relative_to(PROJECT).as_posix(), "sha256": hashlib.sha256(prefix).hexdigest(), "raw_native_sha256": hashlib.sha256(raw_png).hexdigest(), "removed_allocation_tail_bytes": len(trailer), "removed_allocation_tail_sha256": hashlib.sha256(trailer).hexdigest(), "native_pixel_prefix_unchanged": True, "camera_m": _capture["camera_m"], "target_m": _capture["target_m"], **_capture_witness(_capture)}
        finally:
            if finish:
                restored = _finish_capture()
        if finish:
            result["coverage_restoration"] = restored
        return json.dumps(result)

    @toolset_registry.tool_call
    @staticmethod
    def shutdown_editor() -> str:
        """Request a graceful exit of this task-owned editor after the runner saved its map."""
        _finish_capture()
        unreal.SystemLibrary.quit_editor()
        return "Graceful editor exit requested."


_registration = Registration([ShibuyaCityTools])


def register():
    if not _registration.register():
        raise RuntimeError("Cannot register ShibuyaCityTools: enable the native ToolsetRegistry plugin.")
    unreal.log("ShibuyaCityTools registered with the native Unreal MCP registry.")
