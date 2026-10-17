"""Run one owned, headless Unreal editor and exercise native Streamable HTTP MCP.

No third-party Python package or MCP server is needed. The engine provides MCP.
Each run closes its MCP session and terminates only its own editor process tree.
"""
import argparse
import hashlib
import json
import math
import os
from pathlib import Path
import re
import socket
import statistics
import struct
import subprocess
import time
import urllib.error
import urllib.request
import zlib


PROJECT = Path(__file__).resolve().parents[2]
DEFAULT_ENGINE = Path(r"C:\Program Files\Epic Games\UE_5.8")
PROJECT_TOOLSET = "shibuya_tools.ShibuyaCityTools"


def verify_native_renderer(log_text):
    """Observe actual native feature selection; D3D12 or capable hardware alone is insufficient."""
    feature = re.findall(r'Metadata set : rhifeaturelevel="([^"]+)"', log_text)
    platform = re.findall(r'Metadata set : shaderplatform="([^"]+)"', log_text)
    selected = re.findall(r'Using Highest Feature Level of D3D12: (\w+)', log_text)
    if not feature or not platform or not selected or (feature[-1], platform[-1], selected[-1]) != ("SM6", "PCD3D_SM6", "SM6"):
        raise RuntimeError("Cannot score native rendering: actual D3D12 SM6/PCD3D_SM6 selection was not observed. Enable Windows D3D12TargetedShaderFormats=PCD3D_SM6 and restart the owned editor; hardware capability or requested Lumen flags are insufficient.")
    return {"feature_level": feature[-1], "shader_platform": platform[-1], "highest_d3d12_feature_level": selected[-1], "observed_in_native_log": True}


def verify_lumen_scene(log_text):
    """Require a freshly rendered populated scene, rather than asset card metadata alone."""
    blocks = log_text.split("*** LumenScene Stats ***")[1:]
    if not blocks:
        raise RuntimeError("Cannot score native capture: no current-view Lumen scene counters were emitted by its final render.")
    values = {}
    for field, label in (("sdf_objects", "Mesh SDF Objects"), ("mesh_cards", "Mesh cards"), ("cards", "Cards")):
        match = re.search(r"\b" + label + r": (\d+)", blocks[-1])
        if not match or int(match.group(1)) <= 0:
            raise RuntimeError(f"Cannot score native capture: current-view Lumen {label} were absent or zero; actual scene coverage is required before brightness scoring.")
        values[field] = int(match.group(1))
    return {**values, "observed_in_current_view_native_log": True}


def validate_coverage_policy(state):
    """Check observed policy against the opt-in fixed experiment, without claiming traced coverage."""
    policy = state.get("lumen_capture_policy")
    before = state.get("lumen_policy_before")
    if not isinstance(policy, dict) or not isinstance(before, dict):
        raise RuntimeError("Cannot score full-crop capture: current or pre-mutation native Lumen policy is missing.")
    expected = {"lumen_scene_view_distance": 240000.0, "lumen_max_trace_distance": 240000.0,
                "lumen_scene_detail": 2.0, "lumen_surface_cache_resolution": 1.0}
    for name, value in expected.items():
        observed = policy.get("component_pp", {}).get(name, {})
        actual = observed.get("value")
        if observed.get("override") is not True or type(actual) not in (int, float) or not math.isfinite(actual) or abs(actual - value) > .001:
            raise RuntimeError(f"Cannot score full-crop capture: actual component {name} did not override to{value}.")
    for name, value in (("r.LumenScene.GlobalSDF.ClipmapExtent", 7500.0), ("r.AOGlobalDistanceField.NumClipmaps", 4.0)):
        actual = policy.get("cvars", {}).get(name)
        if type(actual) not in (int, float) or not math.isfinite(actual) or abs(actual - value) > .001:
            raise RuntimeError(f"Cannot score full-crop capture: actual native {name} differs from planned{value}.")
    for name in (*expected, "lumen_scene_lighting_quality"):
        observed = before.get("component_pp", {}).get(name, {})
        actual = observed.get("value")
        if type(observed.get("override")) is not bool or type(actual) not in (int, float) or not math.isfinite(actual):
            raise RuntimeError(f"Cannot score full-crop capture: pre-mutation native {name} was not observed.")
    prior = before.get("cvars", {}).get("r.LumenScene.GlobalSDF.ClipmapExtent")
    if type(prior) not in (int, float) or not math.isfinite(prior) or prior <= 0:
        raise RuntimeError("Cannot score full-crop capture: prior native clipmap extent was missing or invalid.")


def validate_capture_state(state, camera_m, target_m, target_gamma, capture_frames, full_crop_coverage=False):
    """Reject incomplete native configuration observations before any brightness scoring.

    This verifies current capture objects and tick/count witnesses, not actual GI execution.
    Position tolerance is0.01cm; unit direction/gamma tolerance is1e-5 for native float values.
    """
    def reject(reason):
        raise RuntimeError(f"Cannot score native capture: {reason}. Recapture with complete current native witnesses.")

    if not isinstance(state, dict):
        reject("capture state is missing")
    if state.get("full_crop_coverage") is not full_crop_coverage:
        reject("native coverage mode differs from the independently requested experiment")
    if full_crop_coverage:
        validate_coverage_policy(state)
    for field in ("persistent_state", "render_target_matches_capture", "lumen_gi_override", "lumen_reflections_override"):
        if state.get(field) is not True:
            reject(f"{field} must be true")
    flags = state.get("native_capture_flags")
    if not isinstance(flags, dict) or not isinstance(state.get("capture_component"), str) or not state["capture_component"] or flags.get("component") != state["capture_component"]:
        reject("actual renderer flags are not bound to the live capture component")
    for field in ("requests_persistent_state", "gi_flag", "lumen_gi_flag", "sky_lighting_flag", "lighting_flag"):
        if flags.get(field) is not True:
            reject(f"actual native {field} must be true")
    if flags.get("captures_every_frame") is not False:
        reject("capture must use the observed manually advanced frame path")
    expected = {"lumen_gi": "<DynamicGlobalIlluminationMethod.LUMEN: 1>",
                "lumen_reflections": "<ReflectionMethod.LUMEN: 1>",
                "capture_source": "<SceneCaptureSource.SCS_FINAL_COLOR_LDR: 2>",
                "render_target_format": "<TextureRenderTargetFormat.RTF_RGBA8: 2>",
                "width": 1280, "height": 720, "capture_frames": capture_frames}
    for field, value in expected.items():
        if state.get(field) != value or (isinstance(value, int) and type(state.get(field)) is not int):
            reject(f"{field} is {state.get(field)!r}; expected {value!r}")
    for field, expected_value in (("target_gamma", target_gamma), ("post_process_blend_weight", 1.0)):
        value = state.get(field)
        if type(value) not in (int, float) or not math.isfinite(value) or abs(value - expected_value) > 1e-5:
            reject(f"{field} does not match {expected_value}")
    delta = [target - camera for camera, target in zip(camera_m, target_m)]
    length = math.sqrt(sum(value * value for value in delta))
    if not length:
        reject("requested target equals the camera")
    forward = [value / length for value in delta]
    for field, expected_vector, tolerance in (("actual_camera_cm", [value * 100 for value in camera_m], .01),
                                             ("actual_component_cm", [value * 100 for value in camera_m], .01),
                                             ("forward_vector", forward, 1e-5),
                                             ("component_forward_vector", forward, 1e-5)):
        values = state.get(field)
        if not isinstance(values, list) or len(values) != 3 or any(type(value) not in (int, float) or not math.isfinite(value) for value in values):
            reject(f"{field} is not a complete finite native vector")
        if any(abs(actual - required) > tolerance for actual, required in zip(values, expected_vector)):
            reject(f"{field} differs from the independently requested camera")
    for field in ("native_start_frame", "native_current_frame", "native_frames_elapsed"):
        if type(state.get(field)) is not int or state[field] < 0:
            reject(f"{field} is missing or invalid")
    if state["native_current_frame"] - state["native_start_frame"] != state["native_frames_elapsed"]:
        reject("native elapsed frames disagree with start/current witnesses")
    if capture_frames > 1 and state["native_frames_elapsed"] < capture_frames:
        reject(f"native elapsed frames did not reach {capture_frames}")


def score_capture(readiness, warmup, capture, camera_m, target_m, target_gamma, relative_output, started_ns, full_crop_coverage=False):
    """Validate both fresh native export arms, then score the exact validated bytes."""
    if not isinstance(readiness, dict) or readiness.get("started") is not True:
        raise RuntimeError("Cannot score native capture: started must be true; request a fresh persistent capture.")
    for state, frames in ((readiness, 1), (warmup, 60), (capture, 80)):
        validate_capture_state(state, camera_m, target_m, target_gamma, frames, full_crop_coverage)
        if state["native_start_frame"] != readiness["native_start_frame"]:
            raise RuntimeError("Cannot score native capture: export arms do not share the observed native start frame.")
        if state["capture_component"] != readiness["capture_component"]:
            raise RuntimeError("Cannot score native capture: export arms refer to different native capture components.")
    if capture["native_current_frame"] - warmup["native_current_frame"] < 20:
        raise RuntimeError("Cannot score native capture: final export did not advance20 native frames after warmup.")
    if full_crop_coverage:
        if any(state["lumen_policy_before"] != readiness["lumen_policy_before"] for state in (warmup, capture)):
            raise RuntimeError("Cannot score full-crop capture: exports do not share the original observed native policy.")
        restored = capture.get("coverage_restoration", {})
        prior = readiness["lumen_policy_before"]["cvars"]["r.LumenScene.GlobalSDF.ClipmapExtent"]
        actual = restored.get("observed_restored_extent_cm")
        if restored.get("changed") is not True or restored.get("restored") is not True or restored.get("prior_extent_cm") != prior or type(actual) not in (int, float) or not math.isfinite(actual) or abs(actual - prior) > .001:
            raise RuntimeError("Cannot score full-crop capture: final native process-local clipmap restoration was not observed.")
    metrics = []
    for state, requested in ((warmup, relative_output.replace(".png", "-warmup.png")), (capture, relative_output)):
        path = PROJECT / requested
        if state.get("path") != requested or not path.resolve().is_relative_to((PROJECT / "artifacts/unreal").resolve()):
            raise RuntimeError(f"Cannot score native capture: returned path differs from fresh requested {requested!r}.")
        if not path.is_file() or path.stat().st_mtime_ns < started_ns:
            raise RuntimeError(f"Cannot score native capture: {requested!r} is absent or predates this capture.")
        content = path.read_bytes()
        if state.get("sha256") != hashlib.sha256(content).hexdigest() or state.get("native_pixel_prefix_unchanged") is not True:
            raise RuntimeError(f"Cannot score native capture: {requested!r} does not match its native pixel-prefix digest/witness.")
        measured = png_darkness_metrics(path)
        if (measured["width"], measured["height"], measured["pixel_population"]) != (1280, 720, 387072) or measured["ignored_trailer_bytes"]:
            raise RuntimeError(f"Cannot score native capture: {requested!r} is not the complete1280x720 native PNG prefix.")
        # These exact bytes must remain the bytes consumed by the measurement.
        if path.read_bytes() != content:
            raise RuntimeError(f"Cannot score native capture: {requested!r} changed while its pixels were measured.")
        metrics.append(measured)
    capture.update(readiness=readiness, warmup=warmup, readiness_verified=True,
                   pixel_metrics=metrics[1], warmup_pixel_metrics=metrics[0],
                   luma_settled=abs(metrics[1]["mean_luma"] - metrics[0]["mean_luma"]) <= max(2.0, .05 * metrics[1]["mean_luma"]))
    return capture


def verify_capture_finished(capture, readiness, full_crop_coverage):
    """A successful finish=True tool call runs native finally cleanup; require its restoration receipt too."""
    if not isinstance(capture, dict):
        raise RuntimeError("Cannot continue capture sweep: final native capture response is not a JSON object.")
    restored = capture.get("coverage_restoration")
    if not full_crop_coverage:
        if not isinstance(restored, dict) or set(restored) != {"changed"} or restored["changed"] is not False:
            raise RuntimeError("Cannot continue capture sweep: final native capture cleanup receipt is missing or unexpected.")
        return
    prior = readiness.get("lumen_policy_before", {}).get("cvars", {}).get("r.LumenScene.GlobalSDF.ClipmapExtent")
    actual = restored.get("observed_restored_extent_cm") if isinstance(restored, dict) else None
    if (not isinstance(restored, dict) or restored.get("changed") is not True or restored.get("restored") is not True
            or type(prior) not in (int, float) or not math.isfinite(prior) or prior <= 0
            or restored.get("prior_extent_cm") != prior or type(actual) not in (int, float)
            or not math.isfinite(actual) or abs(actual - prior) > .001):
        raise RuntimeError("Cannot continue capture sweep: final native process-local clipmap restoration was not observed.")


def capture_views(client, evidence, views, target_gamma, full_crop_coverage, report):
    """Retain rejected fixed views without admitting pixels; continue only after native cleanup succeeds."""
    report["captures"] = []
    report["capture_failures"] = []
    for name, east, north, height, target_east, target_north, target_height in views:
        print(f"Capturing {name}", flush=True)
        relative_output = (evidence / f"{name}.png").relative_to(PROJECT).as_posix()
        if any((PROJECT / path).exists() for path in (relative_output, relative_output.replace(".png", "-warmup.png"))):
            raise RuntimeError(f"Cannot capture {name}: expected fresh final/warmup output paths.")
        started_ns = time.time_ns()
        renderer_log_start = (evidence / "editor.log").stat().st_size
        readiness = tool_value(client.project_tool("capture_view", {"relative_output": relative_output, "east_m": float(east), "north_m": float(north), "height_m": float(height), "target_east_m": float(target_east), "target_north_m": float(target_north), "target_height_m": float(target_height), "target_gamma": target_gamma, "full_crop_coverage": full_crop_coverage}))
        if not isinstance(readiness, dict) or readiness.get("started") is not True:
            raise RuntimeError(f"Cannot capture {name}: native persistent capture did not start.")
        try:
            validate_capture_state(readiness, [east, north, height], [target_east, target_north, target_height], target_gamma, 1, full_crop_coverage)
        except RuntimeError as error:
            failure = {"view": name, "stage": "readiness", "error": str(error), "readiness": readiness,
                       "readiness_verified": False, "cleanup_verified": False}
            report["capture_failures"].append(failure)
            # A local witness rejection still owns a live capture. Release it through the existing native finally path.
            capture = tool_value(client.project_tool("export_capture", {"relative_output": relative_output, "finish": True}))
            failure["capture"] = capture
            verify_capture_finished(capture, readiness, full_crop_coverage)
            failure["cleanup_verified"] = True
            continue
        for _frame in range(59):
            time.sleep(0.1)
            client.project_tool("advance_capture")
        warmup = tool_value(client.project_tool("export_capture", {"relative_output": relative_output.replace(".png", "-warmup.png")}))
        if not isinstance(warmup, dict):
            raise RuntimeError("Cannot continue capture sweep: warmup native capture response is not a JSON object.")
        for _frame in range(20):
            time.sleep(0.1)
            client.project_tool("advance_capture")
        capture = tool_value(client.project_tool("export_capture", {"relative_output": relative_output, "finish": True}))
        # Native tool/protocol failures and uncertain cleanup stay fatal; only local qualification failures continue.
        verify_capture_finished(capture, readiness, full_crop_coverage)
        stage = "lumen_scene"
        try:
            capture["native_lumen_scene"] = verify_lumen_scene((evidence / "editor.log").read_bytes()[renderer_log_start:].decode("utf-8", errors="replace"))
            stage = "capture_witnesses_and_pixels"
            admitted = score_capture(readiness, warmup, capture, [east, north, height], [target_east, target_north, target_height], target_gamma, relative_output, started_ns, full_crop_coverage)
        except RuntimeError as error:
            report["capture_failures"].append({"view": name, "stage": stage, "error": str(error),
                                               "readiness": readiness, "warmup": warmup, "capture": capture,
                                               "readiness_verified": False, "cleanup_verified": True})
        else:
            report["captures"].append(admitted)
    failed = [failure["view"] for failure in report["capture_failures"]]
    report["capture_readiness_gate"].update(status="failed" if failed else "passed", failed_views=failed,
                                             expected_views=len(views), admitted_views=len(report["captures"]))
    report["darkness_gate"]["status"] = ("did-not-run" if failed else
        "passed" if all(capture["pixel_metrics"]["passed"] and capture["luma_settled"] for capture in report["captures"]) else "failed")


class UnrealMcp:
    def __init__(self, port, timeout=300):
        self.url = f"http://127.0.0.1:{port}/mcp"
        self.session = None
        self.protocol = "2025-03-26"
        self.next_id = 0
        self.timeout = timeout

    def _send(self, payload, timeout=None, method="POST"):
        headers = {"Content-Type": "application/json", "Accept": "application/json, text/event-stream"}
        if self.session:
            headers["Mcp-Session-Id"] = self.session
            headers["MCP-Protocol-Version"] = self.protocol
        body = json.dumps(payload).encode() if payload is not None else None
        request = urllib.request.Request(self.url, data=body, headers=headers, method=method)
        with urllib.request.urlopen(request, timeout=timeout or self.timeout) as response:
            self.session = response.headers.get("Mcp-Session-Id", self.session)
            if response.status == 202 or method == "DELETE":
                return None
            if "text/event-stream" in response.headers.get("Content-Type", ""):
                data = []
                for raw in response:
                    line = raw.decode("utf-8").rstrip("\r\n")
                    if line.startswith("data:"):
                        data.append(line[5:].lstrip())
                    elif not line and data:
                        message = json.loads("\n".join(data))
                        if message.get("id") == payload.get("id"):
                            return message
                        data = []
                raise RuntimeError("Native MCP closed the SSE response before returning this request ID.")
            return json.load(response)

    def request(self, method, params=None, timeout=None):
        self.next_id += 1
        response = self._send({"jsonrpc": "2.0", "id": self.next_id, "method": method, "params": params or {}}, timeout)
        if response is None or response.get("id") != self.next_id:
            raise RuntimeError(f"Native MCP returned no matching response to {method!r}.")
        if "error" in response:
            raise RuntimeError(f"Native MCP rejected {method!r}: {response['error']}")
        return response["result"]

    def initialize(self, timeout=15):
        result = self.request("initialize", {"protocolVersion": self.protocol, "capabilities": {}, "clientInfo": {"name": "shibuya-native-mcp", "version": "1.0"}}, timeout)
        self.protocol = result["protocolVersion"]
        self._send({"jsonrpc": "2.0", "method": "notifications/initialized"}, timeout)
        return result

    def call(self, name, arguments=None):
        result = self.request("tools/call", {"name": name, "arguments": arguments or {}})
        if result.get("isError"):
            raise RuntimeError(f"Native MCP tool {name!r} failed: {result}")
        return result

    def project_tool(self, tool, arguments=None):
        return self.call("call_tool", {"toolset_name": PROJECT_TOOLSET, "tool_name": tool, "arguments": arguments or {}})

    def close(self):
        if self.session:
            try:
                self._send(None, timeout=3, method="DELETE")
            except (OSError, urllib.error.URLError):
                pass


def tool_value(result):
    """Decode a native tool result without hiding errors or guessing success."""
    content = result.get("content", [])
    text = "\n".join(item.get("text", "") for item in content if item.get("type") == "text")
    try:
        value = json.loads(text)
        if isinstance(value, dict) and set(value) in ({"result"}, {"returnValue"}):
            value = next(iter(value.values()))
        return json.loads(value) if isinstance(value, str) else value
    except (ValueError, TypeError):
        return text


def axis_fixture(path):
    vertices = [(0, 0, 0), (1, 0, 0), (0, 2, 0), (0, 0, 3)]
    triangles = [0, 2, 1, 0, 1, 3, 0, 3, 2, 1, 2, 3]
    positions = struct.pack("<12f", *(value for vertex in vertices for value in vertex))
    indices = struct.pack("<12H", *triangles)
    binary = positions + indices
    gltf = {
        "asset": {"version": "2.0", "generator": "shibuya-axis-fixture"},
        "buffers": [{"byteLength": len(binary)}],
        "bufferViews": [{"buffer": 0, "byteOffset": 0, "byteLength": len(positions), "target": 34962}, {"buffer": 0, "byteOffset": len(positions), "byteLength": len(indices), "target": 34963}],
        "accessors": [{"bufferView": 0, "componentType": 5126, "count": 4, "type": "VEC3", "min": [0, 0, 0], "max": [1, 2, 3]}, {"bufferView": 1, "componentType": 5123, "count": 12, "type": "SCALAR"}],
        "meshes": [{"name": "AxisProbe", "primitives": [{"attributes": {"POSITION": 0}, "indices": 1}]}],
        "nodes": [{"mesh": 0}], "scenes": [{"nodes": [0]}], "scene": 0,
    }
    metadata = json.dumps(gltf, separators=(",", ":")).encode()
    metadata += b" " * (-len(metadata) % 4)
    binary += b"\0" * (-len(binary) % 4)
    total = 12 + 8 + len(metadata) + 8 + len(binary)
    path.write_bytes(struct.pack("<III", 0x46546C67, 2, total) + struct.pack("<II", len(metadata), 0x4E4F534A) + metadata + struct.pack("<II", len(binary), 0x004E4942) + binary)


def scene_identity(scene):
    """Stable city state independent of shader/RHI availability during a probe."""
    fields = ("label", "asset", "location_cm", "bounds_origin_cm", "bounds_extent_cm")
    return {"map": scene["map"], "static_mesh_actor_count": scene["static_mesh_actor_count"],
            "actors": sorted(({field: actor[field] for field in fields} for actor in scene["static_mesh_actors"]), key=lambda actor: actor["label"])}


def file_digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None


def png_darkness_metrics(path):
    """Bound: encoded PNG luma in the fixed central rectangle, not photorealism."""
    content = path.read_bytes()
    if content[:8] != b"\x89PNG\r\n\x1a\n":
        raise RuntimeError(f"Cannot measure {path}: expected a native PNG capture.")
    offset, chunks, ended = 8, [], False
    width = height = channels = None
    while offset < len(content):
        size = struct.unpack_from(">I", content, offset)[0]
        kind = content[offset + 4:offset + 8]
        payload = content[offset + 8:offset + 8 + size]
        crc = struct.unpack_from(">I", content, offset + 8 + size)[0]
        if zlib.crc32(kind + payload) & 0xffffffff != crc:
            raise RuntimeError(f"Cannot measure {path}: PNG chunk checksum failed.")
        offset += size + 12
        if kind == b"IHDR":
            if width is not None or offset != 33:
                raise RuntimeError(f"Cannot measure {path}: expected one initial native PNG IHDR.")
            width, height, depth, color, compression, filtering, interlace = struct.unpack(">IIBBBBB", payload)
            if depth != 8 or color not in (2, 6) or compression or filtering or interlace:
                raise RuntimeError(f"Cannot measure {path}: expected noninterlaced RGB/RGBA8 pixels.")
            channels = 4 if color == 6 else 3
        elif kind == b"IDAT":
            if width is None:
                raise RuntimeError(f"Cannot measure {path}: PNG pixel chunks precede the image header.")
            chunks.append(payload)
        elif kind == b"IEND":
            if payload:
                raise RuntimeError(f"Cannot measure {path}: PNG IEND is not empty.")
            ended = True
            break  # Native PNG writers may append bytes; they are not pixel chunks.
        else:
            raise RuntimeError(f"Cannot measure {path}: unexpected native PNG chunk {kind!r}.")
    if not width or not height or not channels or width > 4096 or height > 4096:
        raise RuntimeError(f"Cannot measure {path}: missing or oversized native image dimensions.")
    png_end_offset = offset
    stride = width * channels
    if not ended:
        raise RuntimeError(f"Cannot measure {path}: PNG IEND is missing.")
    expected_size = height * (stride + 1)
    inflater = zlib.decompressobj()
    raw = inflater.decompress(b"".join(chunks), expected_size + 1)
    if not inflater.eof or inflater.unused_data or inflater.unconsumed_tail:
        raise RuntimeError(f"Cannot measure {path}: PNG compressed pixel payload is incomplete or contains extra streams.")
    if len(raw) != height * (stride + 1):
        raise RuntimeError(f"Cannot measure {path}: PNG pixel population is incomplete.")
    previous, lumas, offset = bytearray(stride), [], 0
    for y in range(height):
        filter_type = raw[offset]
        row = bytearray(raw[offset + 1:offset + 1 + stride])
        offset += stride + 1
        for x in range(stride):
            left = row[x - channels] if x >= channels else 0
            up, corner = previous[x], previous[x - channels] if x >= channels else 0
            if filter_type == 4:
                estimate = left + up - corner
                distances = [abs(estimate - value) for value in (left, up, corner)]
                predictor = (left, up, corner)[distances.index(min(distances))]
            elif filter_type in (0, 1, 2, 3):
                predictor = (0, left, up, (left + up) // 2)[filter_type]
            else:
                raise RuntimeError(f"Cannot measure {path}: unsupported PNG filter {filter_type}.")
            row[x] = (row[x] + predictor) & 255
        if height * .2 <= y < height * .8:
            for x in range(int(width * .15), int(width * .85)):
                r, g, b = row[x * channels:x * channels + 3]
                lumas.append(.2126 * r + .7152 * g + .0722 * b)
        if channels == 4 and any(alpha != 255 for alpha in row[3::4]):
            raise RuntimeError(f"Cannot measure {path}: expected fully opaque native renderer pixels.")
        previous = row
    if not lumas:
        raise RuntimeError(f"Cannot measure {path}: no central pixels were measured.")
    trailer = content[png_end_offset:]
    result = {"width": width, "height": height, "pixel_population": len(lumas), "mean_luma": statistics.mean(lumas), "median_luma": statistics.median(lumas), "black_fraction": sum(value < 12 for value in lumas) / len(lumas), "white_fraction": sum(value > 245 for value in lumas) / len(lumas), "ignored_trailer_bytes": len(trailer), "ignored_trailer_sha256": hashlib.sha256(trailer).hexdigest()}
    result["passed"] = result["mean_luma"] >= 40 and result["median_luma"] >= 30 and result["black_fraction"] <= .30 and result["white_fraction"] <= .20
    return result


def stop_owned_tree(process):
    if process.poll() is None:
        if os.name == "nt":
            result = subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"], capture_output=True, text=True, creationflags=subprocess.CREATE_NO_WINDOW)
            if result.returncode and process.poll() is None:
                raise RuntimeError(f"Cannot clean owned editor PID {process.pid}: {result.stderr or result.stdout}")
        else:
            process.terminate()
        process.wait(timeout=20)
        return "forced_process_tree"
    return "graceful_editor_exit"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=["probe", "build", "render", "diagnose", "surface"])
    parser.add_argument("--engine", type=Path, default=DEFAULT_ENGINE)
    parser.add_argument("--port", type=int, default=18758)
    parser.add_argument("--manifest", help="Project-relative reviewed city manifest for build")
    parser.add_argument("--startup-timeout", type=int, default=240)
    parser.add_argument("--target-gamma", type=float, default=2.2, choices=[1.0, 2.2])
    parser.add_argument("--explore", action="store_true", help="Include held-out street and upward-sky diagnostics")
    parser.add_argument("--full-crop-coverage", action="store_true", help="Opt-in2400m software Lumen coverage experiment; preserves source/physical lighting and restores process-local cvar")
    parser.add_argument("--surface-only", action="store_true", help="Apply admitted support terrain/roads/rays and checked map save; leave appearance did-not-run")
    parser.add_argument("--surface-manifest", help="Admitted project-relative GSI photo terrain manifest")
    parser.add_argument("--road-manifest", help="Admitted project-relative shared-atlas photo road manifest")
    args = parser.parse_args()
    if args.surface_only and args.action != "surface":
        parser.error("--surface-only requires the surface action")
    if args.full_crop_coverage and args.action not in ("render", "diagnose"):
        parser.error("--full-crop-coverage requires render or diagnose; it does not alter import/probe policy")
    version = json.loads((args.engine / "Engine/Build/Build.version").read_text())
    if (version["MajorVersion"], version["MinorVersion"], version["PatchVersion"]) != (5, 8, 3):
        raise RuntimeError(f"Expected Unreal 5.8.3; found Build.version {version}.")
    if args.action == "build" and not args.manifest:
        parser.error("build requires --manifest with freshly cropped source GLBs")
    with socket.socket() as port_check:
        port_check.bind(("127.0.0.1", args.port))
    evidence = PROJECT / "artifacts/unreal" / f"{args.action}-{time.strftime('%Y%m%d-%H%M%S')}"
    evidence.mkdir(parents=True, exist_ok=False)
    command = [str(args.engine / "Engine/Binaries/Win64/UnrealEditor-Cmd.exe"), str(PROJECT / "ShibuyaUnreal.uproject"), "-RenderOffscreen", "-unattended", "-nosound", "-nosplash", "-nop4", "-stdout", "-FullStdOutLogOutput", "-ModelContextProtocolStartServer", f"-ModelContextProtocolPort={args.port}", "-DDC=Shibuya", "-ShaderWorkingDir=" + str(PROJECT / "Intermediate/Shaders")]
    command.append("-nullrhi" if args.action == "probe" else "-d3d12")
    client = UnrealMcp(args.port)
    report = {"command": command, "engine_build": version, "endpoint": client.url, "headless": True, "visual_verification": False,
              "full_crop_coverage_requested": args.full_crop_coverage, "surface_only_requested": args.surface_only,
              "capture_readiness_gate": {"status": "did-not-run", "bound": "Current native capture configuration/showflags, camera/tick witnesses and fresh exact pixel bytes; actual indirect execution excluded"},
              "darkness_gate": {"status": "did-not-run", "bound": "Encoded PNG central luma; excludes photorealism and collision/control acceptance"}}
    inputs = [PROJECT / "ShibuyaUnreal.uproject", *sorted((PROJECT / "Config").glob("*.ini")), *sorted((PROJECT / "Content/Python").glob("*.py")), Path(__file__)]
    report["implementation_sha256"] = {path.relative_to(PROJECT).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest() for path in inputs}
    map_file = PROJECT / "Content/Maps/Shibuya.umap"
    city_map_before = file_digest(map_file)
    report["city_map_sha256_before"] = city_map_before
    process = None
    primary_error = None
    try:
        with (evidence / "editor.log").open("w", encoding="utf-8") as log:
            process = subprocess.Popen(command, cwd=PROJECT, stdout=log, stderr=subprocess.STDOUT, creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
            report["owned_editor_pid"] = process.pid
            deadline = time.monotonic() + args.startup_timeout
            while True:
                if process.poll() is not None:
                    raise RuntimeError(f"Owned Unreal editor exited {process.returncode}; inspect {evidence / 'editor.log'}.")
                try:
                    report["initialize"] = client.initialize()
                    break
                except (OSError, urllib.error.URLError):
                    if time.monotonic() >= deadline:
                        raise RuntimeError(f"Native MCP did not become ready within {args.startup_timeout}s; inspect {evidence / 'editor.log'}.")
                    time.sleep(1)
            print("Native MCP initialized", flush=True)
            if args.action != "probe":
                report["native_renderer_readiness"] = verify_native_renderer((evidence / "editor.log").read_text(encoding="utf-8", errors="replace"))
            report["tools"] = client.request("tools/list")
            names = {tool["name"] for tool in report["tools"]["tools"]}
            if not {"list_toolsets", "describe_toolset", "call_tool"}.issubset(names):
                raise RuntimeError(f"Native MCP discovery meta-tools missing: {names}")
            print("Native MCP tools listed", flush=True)
            report["toolsets"] = client.call("list_toolsets")
            report["project_tool_schema"] = client.call("describe_toolset", {"toolset_name": PROJECT_TOOLSET})
            report["before"] = tool_value(client.project_tool("inspect_scene"))
            if not report["before"]["engine_version"].startswith("5.8.3-"):
                raise RuntimeError(f"Connected editor has unexpected engine version: {report['before']}")
            print("Project tool called", flush=True)
            if args.action == "probe":
                original = scene_identity(report["before"])
                fixture = evidence / "axis.glb"
                axis_fixture(fixture)
                report["repeated_probes"] = []
                for iteration in range(2):
                    validation = tool_value(client.project_tool("create_probe_map", {"probe_name": f"Probe_{time.strftime('%Y%m%d_%H%M%S')}_{process.pid}_{iteration}"}))
                    axis = tool_value(client.project_tool("import_axis_probe", {"relative_glb": fixture.relative_to(PROJECT).as_posix()}))
                    meshes = axis["meshes"]
                    if len(meshes) != 1 or any(abs(actual - expected) > 0.01 for actual, expected in zip(meshes[0]["extent_cm"], [50, 150, 100])):
                        raise RuntimeError(f"glTF metre/axis conversion failed: {meshes}")
                    if file_digest(map_file) != city_map_before:
                        raise RuntimeError("Probe changed the saved city map bytes; validation must use its own level.")
                    restored = None
                    if city_map_before:
                        restored = tool_value(client.project_tool("load_city_map"))
                        if scene_identity(restored) != original:
                            raise RuntimeError("Probe changed the saved city's mesh actor state after reopening it.")
                    report["repeated_probes"].append({"validation": validation, "axis": axis, "restored_city": restored, "city_map_sha256": file_digest(map_file)})
                report["axis_conversion_verified"] = True
                report["repeated_probe_preserves_city"] = True
            elif args.action == "build":
                report["city"] = tool_value(client.project_tool("build_city", {"relative_manifest": args.manifest}))
                if report["city"]["static_mesh_actor_count"] < 1:
                    raise RuntimeError("City build returned no static mesh actors.")
            else:
                if report["before"]["static_mesh_actor_count"] < 1:
                    raise RuntimeError("Render requires a previously saved real city map with static mesh actors.")
                report["render_setup"] = tool_value(client.project_tool("inspect_render_setup"))
                if args.action == "surface":
                    if not args.surface_manifest or not args.road_manifest:
                        raise RuntimeError("Surface requires --surface-manifest and --road-manifest with source-admitted GSI photo geometry.")
                    report["photo_terrain"] = tool_value(client.project_tool("apply_photo_terrain", {"relative_manifest": args.surface_manifest}))
                    report["photo_roads"] = tool_value(client.project_tool("apply_photo_roads", {"relative_manifest": args.road_manifest}))
                if args.surface_only:
                    report["appearance_skip_reason"] = "Explicit --surface-only: native support installation/save completed; fixed-six appearance did-not-run."
                else:
                    if args.action in ("render", "surface"):
                        report["daylight"] = tool_value(client.project_tool("configure_daylight"))
                        report["render_setup_after"] = tool_value(client.project_tool("inspect_render_setup"))
                    views = [("crossing", 35, -45, 35, 0, 0, 15), ("crossing-west", -70, 20, 65, 0, 0, 15), ("block", 250, -300, 300, 0, 0, 15), ("block-north", -250, 300, 300, 0, 0, 15), ("crop", 850, -850, 700, 0, 0, 15), ("crop-opposite", -850, 850, 700, 0, 0, 15)]
                    if args.explore:
                        views += [("street-explore", 20, 25, 12, 0, 0, 1), ("sky-up", 0, 0, 2000, 200, 0, 2200)]
                    capture_views(client, evidence, views, args.target_gamma, args.full_crop_coverage, report)
                    report["camera_surface_samples"] = [tool_value(client.project_tool("inspect_camera_surfaces", {"east_m": float(east), "north_m": float(north), "height_m": float(height)})) for east, north, height in [(35, -45, 35), (-70, 20, 65)]]
                    if report["capture_readiness_gate"]["status"] != "passed":
                        raise RuntimeError("Native capture readiness gate failed; inspect retained per-view failures and unadmitted native images.")
                    if report["darkness_gate"]["status"] != "passed":
                        raise RuntimeError("Native darkness/convergence gate failed; inspect fixed-camera pixel metrics and individual rendered images.")
            if args.action != "probe" and (not map_file.is_file() or map_file.stat().st_size == 0):
                raise RuntimeError("The MCP map creation did not produce Content/Maps/Shibuya.umap.")
            report["map_bytes"] = map_file.stat().st_size if map_file.is_file() else 0
            report["map_sha256"] = file_digest(map_file)
            if args.manifest:
                report["input_manifest_sha256"] = hashlib.sha256((PROJECT / args.manifest).read_bytes()).hexdigest()
            report["after"] = tool_value(client.project_tool("inspect_scene"))
            final_inputs = {path.relative_to(PROJECT).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest() for path in inputs}
            if final_inputs != report["implementation_sha256"]:
                raise RuntimeError("Unreal project implementation changed during the gate; freeze sources and rerun.")
    except BaseException as error:
        primary_error = error
        report["passed"] = False
        report["error"] = str(error)
        raise
    finally:
        finalization_errors = []
        if process and process.poll() is None:
            try:
                client.project_tool("shutdown_editor")
            except Exception as error:
                # Exit can close HTTP before delivering a response. A failed request must never bypass cleanup.
                report["graceful_exit_request_error"] = str(error)
            try:
                process.wait(timeout=20)
            except subprocess.TimeoutExpired:
                pass
            except Exception as error:
                finalization_errors.append("Owned editor wait failed: " + str(error))
        try:
            client.close()
        except Exception as error:
            finalization_errors.append("Native MCP session close failed: " + str(error))
        if process:
            try:
                report["cleanup_method"] = stop_owned_tree(process)
            except Exception as error:
                finalization_errors.append("Owned editor cleanup failed: " + str(error))
            report["owned_editor_stopped"] = process.poll() is not None
            report["owned_editor_exit_code"] = process.returncode
            if not report["owned_editor_stopped"] or process.returncode != 0:
                finalization_errors.append(f"Owned editor did not stop cleanly: stopped={report['owned_editor_stopped']}, exit_code={process.returncode}.")
        try:
            final_inputs = {path.relative_to(PROJECT).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest() for path in inputs}
            report["implementation_sha256_after_shutdown"] = final_inputs
            report["protected_inputs_unchanged_after_shutdown"] = final_inputs == report["implementation_sha256"]
            if not report["protected_inputs_unchanged_after_shutdown"]:
                finalization_errors.append("Unreal project implementation changed during editor shutdown; freeze sources and rerun.")
        except Exception as error:
            report["protected_inputs_unchanged_after_shutdown"] = False
            finalization_errors.append("Cannot verify protected inputs after editor shutdown: " + str(error))
        report["passed"] = primary_error is None and not finalization_errors
        if finalization_errors:
            report["finalization_errors"] = finalization_errors
            if primary_error is None:
                report["error"] = "Native gate finalization failed: " + "; ".join(finalization_errors)
        log_text = (evidence / "editor.log").read_text(encoding="utf-8", errors="replace")
        report["renderer_log_evidence"] = [line for line in log_text.splitlines() if any(label in line for label in ("RHI Name:", "LogRHI:             Name:", "Chosen D3D", "Driver Version:", "Adapter Name:", "Null RHI"))]
        (evidence / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"Evidence: {evidence}", flush=True)
        if finalization_errors:
            if primary_error is None:
                raise RuntimeError(report["error"])
            primary_error.add_note("Native gate finalization also failed: " + "; ".join(finalization_errors))


if __name__ == "__main__":
    main()
