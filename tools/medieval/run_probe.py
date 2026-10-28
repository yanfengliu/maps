"""Run the medieval city control probe against the real game and check its record.

Bound: this exercises the real game loop with real key events injected through the
player controller, both camera modes, ground contact, wall collision and non-blank
1280x720 captures. It is not a performance or appearance claim.

The probe actor inside the game owns the sequence and writes probe.json. This
script owns the process: it launches one game, waits a finite time, terminates
only its own process tree, and then re-reads the record against the files on disk.

Usage:
    python tools/medieval/run_probe.py --mode smoke
    python tools/medieval/run_probe.py --mode city
"""

import argparse
import hashlib
import json
import re
import shutil
import struct
import subprocess
import sys
import time
from pathlib import Path

REQUIRED_PYTHON = (3, 13)
REQUIRED_ENGINE = (5, 8)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
UPROJECT = PROJECT_ROOT / "MedievalCity.uproject"
DEFAULT_ENGINE = Path(r"C:\Program Files\Epic Games\UE_5.8")

CITY_MAP = "/Game/Maps/MedievalCity"
CITY_MAP_FILE = PROJECT_ROOT / "Content" / "Maps" / "MedievalCity.umap"
SMOKE_MAP = "/Engine/Maps/Entry"
LAYOUT = PROJECT_ROOT / "assets" / "generated" / "medieval" / "city_layout.json"

SHOT_WIDTH = 1280
SHOT_HEIGHT = 720
# A uniform 1280x720 frame deflates to a few hundred bytes; a real one does not.
MIN_IDAT_BYTES = 20000
# Re-check constants, pinned here rather than read back out of probe.json, which
# is the artifact under test.
SPRINT_REQUIRED_RATIO = 1.4
WALL_PUSH_LIMIT_CM = 100.0
WALL_APPROACH_MIN_CM = 25.0
REQUIRED_WALK_CM = 300.0
CAMERA_SEPARATION_MIN_CM = 100.0
VIEW_TO_CAMERA_LIMIT_CM = 5.0
DIRECTION_MIN_ALONG_CM = 150.0
DIRECTION_MAX_ACROSS_CM = 60.0
GATE_MARGIN_MIN_CM = 200.0

# Process images this script may start. A new one still running at the end is a
# leftover and fails the gate; only processes absent from the pre-launch baseline
# count, so another user's engine session is never blamed on this run.
OWNED_IMAGES = ("UnrealEditor-Cmd.exe", "UnrealEditor.exe", "MedievalCity.exe",
                "ShaderCompileWorker.exe", "InterchangeWorker.exe", "EpicWebHelper.exe",
                "CrashReportClient.exe", "CrashReportClientEditor.exe",
                "UnrealBuildAccelerator.exe")
# Started by the engine but meant to outlive it and be shared; reported, not failed.
SHARED_DAEMONS = ("UnrealTraceServer.exe",)

RHI_PATTERNS = {
    "rhi": re.compile(r"RHI (?:D3D12|Vulkan|OpenGL) with Feature Level \w+ is supported[^\n]*"),
    "default_rhi": re.compile(r"Using Default RHI: (\w+)"),
    "adapter": re.compile(r"LogRHI:\s+Name: ([^\n]+)"),
    "feature_level": re.compile(r"Using Highest Feature Level of D3D12: (\w+)"),
    "shader_platform": re.compile(r'shaderplatform="([^"]+)"'),
    "rhi_feature_level": re.compile(r'rhifeaturelevel="([^"]+)"'),
}

# Every pattern above is checked against a line this engine really emits, before
# any log is scanned. The previous pattern never matched anything this engine
# logs, so run_probe.json recorded rhi = None and the run passed anyway.
RHI_PATTERN_SAMPLES = {
    "rhi": "[2026.10.28-00.47.52:527][  0]LogRHI: RHI D3D12 with Feature Level SM6 is supported and will be used.",
    "default_rhi": "[2026.10.28-00.47.52:302][  0]LogRHI: Using Default RHI: D3D12",
    "adapter": "[2026.10.28-00.47.52:556][  0]LogRHI:             Name: NVIDIA GeForce RTX 4090",
    "feature_level": "[2026.10.28-00.47.52:523][  0]LogRHI: Using Highest Feature Level of D3D12: SM6",
    "shader_platform": '[2026.10.27-17.22.24:114][  0]LogCsvProfiler: Metadata set : shaderplatform="PCD3D_SM6"',
    "rhi_feature_level": '[2026.10.27-17.22.24:114][  0]LogCsvProfiler: Metadata set : rhifeaturelevel="SM6"',
}
# The run is rejected unless the log shows all of these. That is what rules out a
# null or software RHI positively: a NullRHI run emits none of them. It replaces a
# negative NullRHI pattern that was never shown to fire.
REQUIRED_RHI_KEYS = ("rhi", "default_rhi", "feature_level", "shader_platform", "rhi_feature_level")


def check_rhi_patterns() -> None:
    broken = [name for name, pattern in RHI_PATTERNS.items()
              if name not in RHI_PATTERN_SAMPLES or not pattern.search(RHI_PATTERN_SAMPLES[name])]
    if broken:
        raise SystemExit(
            "These RHI log patterns no longer match the engine wording they were written against, so this "
            f"run could not report which RHI it used: {broken}. Update the pattern and its sample together."
        )


def check_python() -> None:
    actual = sys.version_info[:2]
    if actual != REQUIRED_PYTHON:
        raise SystemExit(
            f"run_probe.py needs CPython {REQUIRED_PYTHON[0]}.{REQUIRED_PYTHON[1]}, "
            f"but is running under {actual[0]}.{actual[1]}."
        )


def read_engine_version(engine: Path) -> str:
    version_file = engine / "Engine" / "Build" / "Build.version"
    if not version_file.is_file():
        raise SystemExit(f"No engine version at {version_file}; pass --engine for a 5.8 install.")
    data = json.loads(version_file.read_text(encoding="utf-8"))
    actual = (data.get("MajorVersion"), data.get("MinorVersion"))
    if actual != REQUIRED_ENGINE:
        raise SystemExit(
            f"{version_file} reports Unreal Engine {actual[0]}.{actual[1]}; this project needs "
            f"{REQUIRED_ENGINE[0]}.{REQUIRED_ENGINE[1]}."
        )
    return "{}.{}.{}".format(actual[0], actual[1], data.get("PatchVersion", 0))


def list_engine_processes() -> dict:
    """Image name and PID of every process this script might otherwise be blamed for."""
    found = {}
    try:
        completed = subprocess.run(["tasklist", "/FO", "CSV", "/NH"], capture_output=True, text=True,
                                   errors="replace", creationflags=subprocess.CREATE_NO_WINDOW)
    except OSError as error:
        return {"_error": str(error)}
    for line in completed.stdout.splitlines():
        fields = [field.strip('"') for field in line.split('","')]
        if len(fields) < 2:
            continue
        image = fields[0].strip('"')
        if image in OWNED_IMAGES or image in SHARED_DAEMONS:
            try:
                found[int(fields[1])] = image
            except ValueError:
                continue
    return found


def png_size(data: bytes) -> tuple:
    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n":
        return (0, 0)
    width, height = struct.unpack(">II", data[16:24])
    return (width, height)


def png_structure(data: bytes) -> dict:
    """Walk the PNG chunks without decoding pixels.

    This is an independent signal from the probe's own luma figures: a uniform
    frame compresses to almost nothing, so a near-empty IDAT means a flat image
    whatever the probe recorded.
    """
    result = {"bytes": len(data), "complete": False, "idat_bytes": 0, "bit_depth": 0, "colour_type": -1}
    if len(data) < 24 or data[:8] != b"\x89PNG\r\n\x1a\n":
        result["reason"] = "not a PNG"
        return result

    result["width"], result["height"] = png_size(data)
    offset = 8
    while offset + 8 <= len(data):
        length, kind = struct.unpack(">I4s", data[offset:offset + 8])
        payload = data[offset + 8:offset + 8 + length]
        if kind == b"IHDR" and len(payload) >= 10:
            result["bit_depth"] = payload[8]
            result["colour_type"] = payload[9]
        elif kind == b"IDAT":
            result["idat_bytes"] += length
        elif kind == b"IEND":
            result["complete"] = True
            break
        offset += 12 + length
    return result


def stop_owned_tree(process: subprocess.Popen, report: dict) -> None:
    if process.poll() is not None:
        report["cleanup"] = "exited_on_its_own"
        return
    completed = subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                               capture_output=True, text=True, errors="replace",
                               creationflags=subprocess.CREATE_NO_WINDOW)
    report["cleanup"] = "terminated_own_process_tree"
    report["taskkill_output"] = (completed.stdout or "") + (completed.stderr or "")
    try:
        process.wait(timeout=30)
    except subprocess.TimeoutExpired:
        report["cleanup"] = "process_tree_did_not_exit"


def scan_log(log_path: Path) -> dict:
    if not log_path.is_file():
        return {}
    text = log_path.read_text(encoding="utf-8", errors="replace")
    found = {}
    for name, pattern in RHI_PATTERNS.items():
        match = pattern.search(text)
        if match:
            found[name] = match.group(1) if match.groups() else match.group(0).strip()
    found["probe_log_lines"] = [line.strip() for line in text.splitlines() if "LogMedieval" in line]
    return found


def verify_record(record: dict, probe_dir: Path, report: dict) -> list:
    """Re-check the probe's record against the bytes on disk."""
    problems = []

    for failure in record.get("failures", []):
        problems.append(f"probe reported: {failure}")
    if record.get("passed") is not True:
        problems.append("probe.json does not say passed=true")

    shots = record.get("screenshots", [])
    if not shots:
        problems.append("probe.json records no screenshots")

    measured = []
    for shot in shots:
        path = probe_dir / shot.get("file", "")
        if not path.is_file():
            problems.append(f"screenshot {shot.get('file')!r} named in probe.json is not on disk")
            continue
        data = path.read_bytes()
        digest = hashlib.sha256(data).hexdigest()
        if digest != shot.get("sha256"):
            problems.append(
                f"{path.name}: probe recorded sha256 {shot.get('sha256')} but the file on disk hashes to {digest}")
        if len(data) != shot.get("bytes"):
            problems.append(f"{path.name}: probe recorded {shot.get('bytes')} bytes, file is {len(data)}")

        structure = png_structure(data)
        structure["file"] = path.name
        structure["sha256"] = digest
        structure["probe_mean_luma"] = shot.get("mean_luma")
        structure["probe_luma_stddev"] = shot.get("luma_stddev")
        measured.append(structure)

        if (structure.get("width"), structure.get("height")) != (SHOT_WIDTH, SHOT_HEIGHT):
            problems.append(f"{path.name}: {structure.get('width')}x{structure.get('height')}, "
                            f"not the required {SHOT_WIDTH}x{SHOT_HEIGHT}")
        if not structure["complete"]:
            problems.append(f"{path.name}: the PNG has no IEND chunk, so it is truncated")
        if structure["idat_bytes"] < MIN_IDAT_BYTES:
            problems.append(f"{path.name}: compressed pixel data is only {structure['idat_bytes']} bytes, "
                            f"under the {MIN_IDAT_BYTES} expected of a non-uniform {SHOT_WIDTH}x{SHOT_HEIGHT} frame")
        if shot.get("blank") is not False:
            problems.append(f"{path.name}: the probe measured it as blank "
                            f"(mean luma {shot.get('mean_luma')}, stddev {shot.get('luma_stddev')})")
    report["pixels"] = measured

    checks = record.get("checks", {})
    if checks.get("third_person_walk_cm", 0) <= REQUIRED_WALK_CM:
        problems.append(f"third person walk was {checks.get('third_person_walk_cm')} cm, "
                        f"not more than {REQUIRED_WALK_CM:.0f}")
    if checks.get("first_person_walk_cm", 0) <= REQUIRED_WALK_CM:
        problems.append(f"first person walk was {checks.get('first_person_walk_cm')} cm, "
                        f"not more than {REQUIRED_WALK_CM:.0f}")
    if checks.get("camera_separation_cm", -1) < CAMERA_SEPARATION_MIN_CM:
        problems.append(f"the rendered view moved {checks.get('camera_separation_cm')} cm between camera modes")
    # A passing sample of this check is exactly 0, so the count is what separates
    # "every sample agreed" from "the check never ran". Checking the distance alone
    # would accept a run that recorded nothing.
    if checks.get("view_to_active_camera_samples", 0) < 1:
        problems.append("the rendered view was never compared against the active camera component, "
                        "so the camera check did not run")
    elif checks.get("worst_view_to_active_camera_cm", 1e9) > VIEW_TO_CAMERA_LIMIT_CM:
        problems.append(f"the rendered view sat {checks.get('worst_view_to_active_camera_cm')} cm from the "
                        f"camera component called active, at step "
                        f"{checks.get('worst_view_to_active_camera_step')!r}")

    directions = checks.get("directions", {})
    for key in ("W", "A", "S", "D"):
        entry = directions.get(key)
        if not entry:
            problems.append(f"no direction run was recorded for {key}")
            continue
        if entry.get("along_expected_cm", 0) < DIRECTION_MIN_ALONG_CM:
            problems.append(f"{key} moved {entry.get('along_expected_cm')} cm along its expected direction, "
                            f"under {DIRECTION_MIN_ALONG_CM:.0f}")
        if entry.get("across_expected_cm", 1e9) > DIRECTION_MAX_ACROSS_CM:
            problems.append(f"{key} moved {entry.get('across_expected_cm')} cm across its expected direction, "
                            f"over {DIRECTION_MAX_ACROSS_CM:.0f}")

    gate = checks.get("gate_passage", {})
    if gate.get("ran"):
        if gate.get("margin_past_gate_cm", -1) < GATE_MARGIN_MIN_CM:
            problems.append(f"the walk through the gate ended {gate.get('margin_past_gate_cm')} cm past the "
                            f"gate line, under {GATE_MARGIN_MIN_CM:.0f}")
    ratio = checks.get("sprint_ratio", -1)
    if ratio < SPRINT_REQUIRED_RATIO:
        problems.append(f"sprinting covered {checks.get('paced_sprint_cm')} cm against "
                        f"{checks.get('paced_walk_cm')} cm walking over the same "
                        f"{checks.get('paced_run_seconds')} s (ratio {ratio})")
    if checks.get("sprint_state_observed") is not True:
        problems.append("the character never entered its sprinting state while LeftShift was held")
    wall = checks.get("wall_push_cm", -1)
    if wall < 0 or wall > WALL_PUSH_LIMIT_CM:
        problems.append(f"wall push was {wall} cm, outside 0..{WALL_PUSH_LIMIT_CM:.0f}")
    if checks.get("wall_approach_cm", -1) < WALL_APPROACH_MIN_CM:
        problems.append(f"the wall approach moved only {checks.get('wall_approach_cm')} cm, so the push "
                        f"figure does not show collision stopping a moving character")
    if "null" in record.get("rhi", "").lower():
        problems.append(f"the run used RHI {record.get('rhi')!r}, which cannot produce rendered frames")

    return problems


def main() -> int:
    check_python()
    check_rhi_patterns()

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--mode", choices=["smoke", "city"], default="smoke",
                        help="smoke spawns the probe's own test floor; city needs the built level.")
    parser.add_argument("--engine", type=Path, default=DEFAULT_ENGINE, help=f"Engine root (default: {DEFAULT_ENGINE}).")
    parser.add_argument("--deadline", type=float, default=900.0,
                        help="Seconds to wait for probe.json before giving up (default: 900).")
    parser.add_argument("--keep-output", action="store_true",
                        help="Keep any previous run's screenshots instead of clearing the evidence directory.")
    args = parser.parse_args()

    if not UPROJECT.is_file():
        raise SystemExit(f"No Unreal project at {UPROJECT}.")
    engine_text = read_engine_version(args.engine)

    if args.mode == "city":
        if not CITY_MAP_FILE.is_file():
            print(f"The level has not been built yet: {CITY_MAP_FILE} does not exist.", flush=True)
            print("Run tools/medieval/build_layout.py and tools/medieval/build_level.py first, "
                  "or use --mode smoke, which needs no city content.", flush=True)
            return 2
        map_name = CITY_MAP
    else:
        map_name = SMOKE_MAP

    # An uncooked run needs the editor module: a Game build refuses to start without
    # a cooked global shader library, so the real game runs through UnrealEditor-Cmd -game.
    editor_module = PROJECT_ROOT / "Binaries" / "Win64" / "UnrealEditor-MedievalCityRuntime.dll"
    if not editor_module.is_file():
        raise SystemExit(
            f"{editor_module} is missing, so there is no compiled MedievalCityRuntime for an uncooked run. "
            f"Run: python tools/medieval/build_native.py --target editor"
        )

    probe_dir = PROJECT_ROOT / "artifacts" / "medieval" / "probe" / args.mode
    probe_dir.mkdir(parents=True, exist_ok=True)
    if not args.keep_output:
        # Clear the contents, not the directory itself: removing the directory
        # fails on Windows whenever anything holds it open, including a shell
        # sitting in it, and that failure has nothing to do with the run.
        for entry in probe_dir.iterdir():
            try:
                shutil.rmtree(entry) if entry.is_dir() else entry.unlink()
            except OSError as error:
                raise SystemExit(
                    f"Could not clear {entry} from the previous run: {error}. "
                    f"Close whatever holds it and run again, or pass --keep-output."
                )
    report_path = probe_dir / "probe.json"
    log_path = probe_dir / "game.log"

    # An uncooked game run reads straight out of Content/, which is gitignored.
    (PROJECT_ROOT / "Content").mkdir(parents=True, exist_ok=True)

    editor = args.engine / "Engine" / "Binaries" / "Win64" / "UnrealEditor-Cmd.exe"
    if not editor.is_file():
        raise SystemExit(f"{editor} is missing.")

    command = [
        str(editor),
        str(UPROJECT),
        map_name,
        "-game",
        # D3D12, not NullRHI: NullRHI cannot produce a rendered frame.
        "-RenderOffscreen",
        f"-ResX={SHOT_WIDTH}",
        f"-ResY={SHOT_HEIGHT}",
        "-windowed",
        "-ForceRes",
        "-nosound",
        "-nosplash",
        "-nop4",
        "-unattended",
        "-stdout",
        "-FullStdOutLogOutput",
        f"-MedievalProbe={probe_dir}",
        f"-MedievalProbeMode={args.mode}",
        f"-MedievalProbeLayout={LAYOUT}",
        f"-ShaderWorkingDir={PROJECT_ROOT / 'Intermediate' / 'Shaders'}",
        "-DDC=MedievalCity",
    ]

    report = {
        "schema_version": 1,
        "generator": "tools/medieval/run_probe.py",
        "python": "{}.{}.{}".format(*sys.version_info[:3]),
        "engine_root": str(args.engine),
        "engine_version": engine_text,
        "mode": args.mode,
        "map": map_name,
        "command": command,
        "probe_dir": str(probe_dir),
    }

    baseline = list_engine_processes()
    report["engine_processes_before"] = {str(pid): image for pid, image in baseline.items()}

    print(f"Engine {engine_text}; launching {map_name} with -MedievalProbe={probe_dir}", flush=True)
    started = time.monotonic()
    process = None
    try:
        with log_path.open("w", encoding="utf-8", errors="replace") as log_file:
            process = subprocess.Popen(
                command,
                cwd=str(PROJECT_ROOT),
                stdout=log_file,
                stderr=subprocess.STDOUT,
                creationflags=subprocess.CREATE_NO_WINDOW | subprocess.CREATE_NEW_PROCESS_GROUP,
            )
            report["pid"] = process.pid
            print(f"Owned game PID {process.pid}; deadline {args.deadline:.0f}s", flush=True)

            while True:
                if report_path.is_file():
                    report["waited_seconds"] = round(time.monotonic() - started, 2)
                    print(f"probe.json appeared after {report['waited_seconds']}s", flush=True)
                    break
                exit_code = process.poll()
                if exit_code is not None:
                    report["waited_seconds"] = round(time.monotonic() - started, 2)
                    report["early_exit_code"] = exit_code
                    print(f"The game exited {exit_code} after {report['waited_seconds']}s "
                          f"without writing probe.json; see {log_path}", flush=True)
                    break
                if time.monotonic() - started > args.deadline:
                    report["waited_seconds"] = round(time.monotonic() - started, 2)
                    report["timed_out"] = True
                    print(f"No probe.json within {args.deadline:.0f}s; see {log_path}", flush=True)
                    break
                time.sleep(1.0)

            # The probe requests exit itself; give it a bounded chance to do so.
            if report_path.is_file():
                try:
                    report["exit_code"] = process.wait(timeout=120)
                    report["cleanup"] = "requested_exit_honoured"
                except subprocess.TimeoutExpired:
                    print("The game did not exit within 120s of writing its report.", flush=True)
    finally:
        if process is not None and "cleanup" not in report:
            stop_owned_tree(process, report)
        if process is not None:
            report.setdefault("exit_code", process.poll())

    # Helpers such as CrashReportClientEditor follow their parent down a second or
    # two later, so give the tree a bounded window to finish before calling anything
    # a leftover.
    settle_deadline = time.monotonic() + 30.0
    while True:
        survivors = {pid: image for pid, image in list_engine_processes().items() if pid not in baseline}
        leftovers = {pid: image for pid, image in survivors.items() if image in OWNED_IMAGES}
        if not leftovers or time.monotonic() >= settle_deadline:
            break
        time.sleep(1.0)

    for pid in list(leftovers):
        # Ours, and still up past the window: end it rather than leave it behind.
        subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True, text=True,
                       errors="replace", creationflags=subprocess.CREATE_NO_WINDOW)
    report["engine_processes_left"] = {str(pid): image for pid, image in leftovers.items()}
    report["shared_daemons_left"] = {str(pid): image for pid, image in survivors.items()
                                     if image in SHARED_DAEMONS}

    report.update(scan_log(log_path))

    problems = []
    record = None
    if report_path.is_file():
        try:
            record = json.loads(report_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as error:
            problems.append(f"probe.json is not valid JSON: {error}")
    else:
        problems.append(f"the probe never wrote {report_path}")

    if record is not None:
        problems.extend(verify_record(record, probe_dir, report))
        report["probe"] = record

    absent = [key for key in REQUIRED_RHI_KEYS if not report.get(key)]
    if absent:
        problems.append(f"the game log never showed a hardware RHI coming up; these lines are missing: {absent}")
    if leftovers:
        problems.append(
            f"engine processes this run started were still up 30 s after it ended and had to be killed: "
            f"{report['engine_processes_left']}")

    report["problems"] = problems
    report["passed"] = not problems
    harness_path = probe_dir / "run_probe.json"
    harness_path.write_text(json.dumps(report, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    print("", flush=True)
    if record is not None:
        checks = record.get("checks", {})
        print(f"mode                     {record.get('mode')}", flush=True)
        print(f"rhi / feature level      {record.get('rhi')} / {record.get('feature_level')} "
              f"({record.get('shader_platform')})", flush=True)
        print(f"third person walk        {checks.get('third_person_walk_cm')} cm", flush=True)
        print(f"first person walk        {checks.get('first_person_walk_cm')} cm", flush=True)
        print(f"camera separation        {checks.get('camera_separation_cm')} cm", flush=True)
        print(f"ground clearance         {checks.get('ground_clearance_min_cm')} .. "
              f"{checks.get('ground_clearance_max_cm')} cm", flush=True)
        print(f"wall push                {checks.get('wall_push_cm')} cm "
              f"(limit {checks.get('wall_push_limit_cm')})", flush=True)
        print(f"look delta               yaw {checks.get('look_yaw_delta_deg')} deg, "
              f"pitch {checks.get('look_pitch_delta_deg')} deg", flush=True)
        print(f"peak leg swing           {checks.get('peak_leg_pitch_deg')} deg", flush=True)
        print(f"paced walk vs sprint     {checks.get('paced_walk_cm')} cm vs "
              f"{checks.get('paced_sprint_cm')} cm over {checks.get('paced_run_seconds')} s "
              f"(ratio {checks.get('sprint_ratio')}, peak "
              f"{checks.get('paced_walk_peak_speed_cm_s')} vs "
              f"{checks.get('paced_sprint_peak_speed_cm_s')} cm/s)", flush=True)
        print(f"view vs active camera    {checks.get('worst_view_to_active_camera_cm')} cm worst over "
              f"{checks.get('view_to_active_camera_samples')} samples, at "
              f"{checks.get('worst_view_to_active_camera_step')!r}", flush=True)
        directions = checks.get("directions", {})
        print("direction runs           " + "  ".join(
            f"{key} {directions.get(key, {}).get('along_expected_cm', 0):.0f}/"
            f"{directions.get(key, {}).get('across_expected_cm', 0):.0f}"
            for key in ("W", "A", "S", "D")) + "  (along/across expected, cm)", flush=True)
        gate = checks.get("gate_passage", {})
        if gate.get("ran"):
            print(f"gate passage             ended {gate.get('margin_past_gate_cm'):.1f} cm past the gate line "
                  f"(needs {gate.get('required_margin_cm'):.0f})", flush=True)
        else:
            print("gate passage             did not run (no gatehouse in this mode)", flush=True)
        print("", flush=True)
        print("ground band = lower-centre of the frame; p90 is the sunlit surface", flush=True)
        print(f"  {'screenshot':34s} {'mean':>6s} {'p10':>5s} {'p50':>5s} {'p90':>5s} "
              f"{'p90lin':>7s} {'clip':>6s}  sha256", flush=True)
        for shot in record.get("screenshots", []):
            ground = shot.get("ground_region", {})
            print(f"  {shot.get('file'):34s} {ground.get('mean_srgb_0_255', 0):6.1f} "
                  f"{ground.get('p10_srgb', 0):5.0f} {ground.get('p50_srgb', 0):5.0f} "
                  f"{ground.get('p90_srgb', 0):5.0f} {ground.get('p90_linear', 0):7.4f} "
                  f"{ground.get('clipped_fraction', 0):6.3f}  {shot.get('sha256')}", flush=True)
    print(f"cleanup                  {report.get('cleanup')} (exit {report.get('exit_code')})", flush=True)
    print(f"engine processes left    {report['engine_processes_left'] or 'none'}"
          f"{'' if not report['shared_daemons_left'] else '; shared daemons still up: ' + str(report['shared_daemons_left'])}",
          flush=True)
    print(f"harness record            {harness_path}", flush=True)

    if problems:
        print("\nProbe gate FAILED:", flush=True)
        for problem in problems:
            print(f"  {problem}", flush=True)
        return 1

    print("\nProbe gate passed.", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
