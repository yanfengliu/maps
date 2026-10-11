"""Run one owned, headless Unreal editor and exercise native Streamable HTTP MCP.

No third-party Python package or MCP server is needed. The engine provides MCP.
Each run closes its MCP session and terminates only its own editor process tree.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import socket
import struct
import subprocess
import time
import urllib.error
import urllib.request


PROJECT = Path(__file__).resolve().parents[2]
DEFAULT_ENGINE = Path(r"C:\Program Files\Epic Games\UE_5.8")
PROJECT_TOOLSET = "shibuya_tools.ShibuyaCityTools"


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
    parser.add_argument("action", choices=["probe", "build", "render"])
    parser.add_argument("--engine", type=Path, default=DEFAULT_ENGINE)
    parser.add_argument("--port", type=int, default=18758)
    parser.add_argument("--manifest", help="Project-relative reviewed city manifest for build")
    parser.add_argument("--startup-timeout", type=int, default=240)
    args = parser.parse_args()
    version = json.loads((args.engine / "Engine/Build/Build.version").read_text())
    if (version["MajorVersion"], version["MinorVersion"], version["PatchVersion"]) != (5, 8, 3):
        raise RuntimeError(f"Expected Unreal 5.8.3; found Build.version {version}.")
    if args.action == "build" and not args.manifest:
        parser.error("build requires --manifest with freshly cropped source GLBs")
    with socket.socket() as port_check:
        port_check.bind(("127.0.0.1", args.port))
    evidence = PROJECT / "artifacts/unreal" / f"{args.action}-{time.strftime('%Y%m%d-%H%M%S')}"
    evidence.mkdir(parents=True, exist_ok=False)
    command = [str(args.engine / "Engine/Binaries/Win64/UnrealEditor-Cmd.exe"), str(PROJECT / "ShibuyaUnreal.uproject"), "-RenderOffscreen", "-unattended", "-nosound", "-nosplash", "-nop4", "-stdout", "-FullStdOutLogOutput", "-ModelContextProtocolStartServer", f"-ModelContextProtocolPort={args.port}", "-DDC=Shibuya"]
    command.append("-nullrhi" if args.action == "probe" else "-d3d12")
    client = UnrealMcp(args.port)
    report = {"command": command, "engine_build": version, "endpoint": client.url, "headless": True, "visual_verification": False}
    inputs = [PROJECT / "ShibuyaUnreal.uproject", *sorted((PROJECT / "Config").glob("*.ini")), *sorted((PROJECT / "Content/Python").glob("*.py")), Path(__file__)]
    report["implementation_sha256"] = {path.relative_to(PROJECT).as_posix(): hashlib.sha256(path.read_bytes()).hexdigest() for path in inputs}
    map_file = PROJECT / "Content/Maps/Shibuya.umap"
    city_map_before = file_digest(map_file)
    report["city_map_sha256_before"] = city_map_before
    process = None
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
                report["daylight"] = tool_value(client.project_tool("configure_daylight"))
                views = [("crossing", 35, -45, 35), ("crossing-west", -70, 20, 65), ("block", 250, -300, 300), ("block-north", -250, 300, 300), ("crop", 850, -850, 700), ("crop-opposite", -850, 850, 700)]
                report["captures"] = []
                for name, east, north, height in views:
                    print(f"Capturing {name}", flush=True)
                    report["captures"].append(tool_value(client.project_tool("capture_view", {"relative_output": (evidence / f"{name}.png").relative_to(PROJECT).as_posix(), "east_m": float(east), "north_m": float(north), "height_m": float(height)})))
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
            report["passed"] = True
    except Exception as error:
        report["passed"] = False
        report["error"] = str(error)
        raise
    finally:
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
        client.close()
        if process:
            report["cleanup_method"] = stop_owned_tree(process)
            report["owned_editor_exit_code"] = process.returncode
            report["owned_editor_stopped"] = process.poll() is not None
        log_text = (evidence / "editor.log").read_text(encoding="utf-8", errors="replace")
        report["renderer_log_evidence"] = [line for line in log_text.splitlines() if any(label in line for label in ("RHI Name:", "LogRHI:             Name:", "Chosen D3D", "Driver Version:", "Adapter Name:", "Null RHI"))]
        (evidence / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"Evidence: {evidence}", flush=True)


if __name__ == "__main__":
    main()
