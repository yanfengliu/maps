"""Own exactly one headless Unreal editor process and the record it writes.

Both `prepare_project.py` and `build_level.py` drive the editor through this.
One process at a time: the editor shares `Intermediate/`, `Saved/` and the
derived data cache with every other editor on the same project, so a second one
can corrupt or deadlock the first. Every invocation here is serial, has a finite
deadline, terminates only its own process tree, and reports any leftover.

It runs a full headless editor through `-ExecutePythonScript`, not the
`pythonscript` commandlet. A commandlet has no editor subsystems and no actor
factories, so `StaticMeshEditorSubsystem` is None and spawning an actor returns
nothing. Rendering is on D3D12 rather than NullRHI, because a material whose
shader map never compiled reports no instruction counts and the import step
refuses it.
"""

import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

REQUIRED_PYTHON = (3, 13)
REQUIRED_ENGINE = (5, 8)

PROJECT_ROOT = Path(__file__).resolve().parents[2]
UPROJECT = PROJECT_ROOT / "MedievalCity.uproject"
TOOLS_DIR = Path(__file__).resolve().parent
DEFAULT_ENGINE = Path(r"C:\Program Files\Epic Games\UE_5.8")
ASSET_DIR = PROJECT_ROOT / "assets" / "generated" / "medieval"
INVENTORY = ASSET_DIR / "inventory.json"
LAYOUT = ASSET_DIR / "city_layout.json"
EVIDENCE_ROOT = PROJECT_ROOT / "artifacts" / "medieval"

# Process images an editor run may start. run_probe.py keeps its own copy for
# the game run; neither owns the other's list.
OWNED_IMAGES = ("UnrealEditor-Cmd.exe", "UnrealEditor.exe", "MedievalCity.exe",
                "ShaderCompileWorker.exe", "InterchangeWorker.exe", "EpicWebHelper.exe",
                "CrashReportClient.exe", "CrashReportClientEditor.exe",
                "UnrealBuildAccelerator.exe")
# Started by the engine but meant to outlive it and be shared; reported, not failed.
SHARED_DAEMONS = ("UnrealTraceServer.exe",)

LOG_PATTERNS = {
    "rhi": re.compile(r"RHI (?:D3D12|Vulkan|OpenGL) with Feature Level \w+ is supported[^\n]*"),
    "adapter": re.compile(r"\bD3D12 adapter[^\n]*|GPU DeviceId[^\n]*"),
    "feature_level": re.compile(r"Using Highest Feature Level of D3D12: (\w+)"),
    "shader_platform": re.compile(r'shaderplatform="([^"]+)"'),
    "rhi_feature_level": re.compile(r'rhifeaturelevel="([^"]+)"'),
    "null_rhi": re.compile(r"Using null RHI|RHI is NullDrv|NullRHI is enabled"),
}


class SessionError(RuntimeError):
    """A failure in owning or running the editor, as opposed to in its script."""


def check_python():
    actual = sys.version_info[:2]
    if actual != REQUIRED_PYTHON:
        raise SystemExit(
            f"This step needs CPython {REQUIRED_PYTHON[0]}.{REQUIRED_PYTHON[1]}, but is running under "
            f"{actual[0]}.{actual[1]}. Run it with the system CPython 3.13 named in design.md.")


def read_engine_version(engine):
    version_file = Path(engine) / "Engine" / "Build" / "Build.version"
    if not version_file.is_file():
        raise SystemExit(f"No engine version at {version_file}; pass --engine for a 5.8 install.")
    data = json.loads(version_file.read_text(encoding="utf-8"))
    actual = (data.get("MajorVersion"), data.get("MinorVersion"))
    if actual != REQUIRED_ENGINE:
        raise SystemExit(
            f"{version_file} reports Unreal Engine {actual[0]}.{actual[1]}; this project needs "
            f"{REQUIRED_ENGINE[0]}.{REQUIRED_ENGINE[1]}.")
    return "{}.{}.{}".format(actual[0], actual[1], data.get("PatchVersion", 0))


def list_engine_processes():
    """Image name per PID for every process a run might otherwise be blamed for."""
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


def scan_log(log_path):
    if not log_path.is_file():
        return {}
    text = log_path.read_text(encoding="utf-8", errors="replace")
    found = {}
    for name, pattern in LOG_PATTERNS.items():
        match = pattern.search(text)
        if match:
            found[name] = match.group(1) if match.groups() else match.group(0).strip()
    found["script_log_lines"] = [line.strip() for line in text.splitlines() if "MEDIEVAL_" in line]
    errors = [line.strip() for line in text.splitlines()
              if "LogPython: Error" in line or "Fatal error" in line or "Assertion failed" in line]
    found["log_errors"] = errors[-40:]
    return found


def run_editor_script(editor_script, environment, report_path, log_path, deadline,
                      engine=DEFAULT_ENGINE, extra_arguments=()):
    """Run one editor script to completion and return the session record.

    `report_path` is where the editor script writes its JSON; it is deleted
    first, so a stale file from an earlier run can never be mistaken for this
    run's result.
    """
    if not UPROJECT.is_file():
        raise SystemExit(f"No Unreal project at {UPROJECT}.")
    script_path = Path(editor_script)
    if not script_path.is_file():
        raise SystemExit(f"No editor script at {script_path}.")
    engine_text = read_engine_version(engine)
    editor = Path(engine) / "Engine" / "Binaries" / "Win64" / "UnrealEditor-Cmd.exe"
    if not editor.is_file():
        raise SystemExit(f"{editor} is missing, so no editor can be started.")
    editor_module = PROJECT_ROOT / "Binaries" / "Win64" / "UnrealEditor-MedievalCityRuntime.dll"
    if not editor_module.is_file():
        raise SystemExit(
            f"{editor_module} is missing, so the project has no compiled editor module. "
            f"Run: python tools/medieval/build_native.py --target editor")

    report_path = Path(report_path)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    if report_path.exists():
        report_path.unlink()
    log_path = Path(log_path)
    log_path.parent.mkdir(parents=True, exist_ok=True)

    command = [
        str(editor), str(UPROJECT),
        # A full editor, not the pythonscript commandlet. The commandlet has no
        # editor subsystems and no actor factories, so StaticMeshEditorSubsystem
        # comes back as None and spawning an actor returns nothing. The engine's
        # own executer refuses -ExecutePythonScript from a commandlet for the
        # same reason, and it quits the editor once the script returns.
        f"-ExecutePythonScript={str(script_path).replace(chr(92), '/')}",
        "-unattended",
        # D3D12, never NullRHI: a material needs a real shader resource, and
        # NullRHI never produces one.
        "-RenderOffscreen",
        "-d3d12",
        "-nosplash", "-nosound", "-nop4", "-stdout", "-FullStdOutLogOutput",
        f"-ShaderWorkingDir={PROJECT_ROOT / 'Intermediate' / 'Shaders'}",
        "-DDC=MedievalCity",
        *extra_arguments,
    ]

    record = {
        "schema_version": 1,
        "python": "{}.{}.{}".format(*sys.version_info[:3]),
        "engine_root": str(engine),
        "engine_version": engine_text,
        "editor_script": str(script_path),
        "command": command,
        "environment": dict(environment),
        "report_path": str(report_path),
        "log_path": str(log_path),
        "deadline_seconds": deadline,
    }

    child_environment = dict(os.environ)
    child_environment["MEDIEVAL_TOOLS_DIR"] = str(TOOLS_DIR)
    for key, value in environment.items():
        child_environment[key] = str(value)

    baseline = list_engine_processes()
    record["engine_processes_before"] = {str(pid): image for pid, image in baseline.items()}

    print(f"Engine {engine_text}; running {script_path.name} headlessly on D3D12 "
          f"(deadline {deadline:.0f}s)", flush=True)
    started = time.monotonic()
    process = None
    try:
        with log_path.open("w", encoding="utf-8", errors="replace") as log_file:
            process = subprocess.Popen(
                command, cwd=str(PROJECT_ROOT), stdout=log_file, stderr=subprocess.STDOUT,
                env=child_environment,
                creationflags=subprocess.CREATE_NO_WINDOW | subprocess.CREATE_NEW_PROCESS_GROUP)
            record["pid"] = process.pid
            print(f"Owned editor PID {process.pid}", flush=True)
            while True:
                code = process.poll()
                if code is not None:
                    record["exit_code"] = code
                    record["cleanup"] = "exited_on_its_own"
                    break
                if time.monotonic() - started > deadline:
                    record["timed_out"] = True
                    break
                time.sleep(1.0)
    finally:
        if process is not None and "cleanup" not in record:
            if process.poll() is None:
                completed = subprocess.run(["taskkill", "/PID", str(process.pid), "/T", "/F"],
                                           capture_output=True, text=True, errors="replace",
                                           creationflags=subprocess.CREATE_NO_WINDOW)
                record["cleanup"] = "terminated_own_process_tree"
                record["taskkill_output"] = (completed.stdout or "") + (completed.stderr or "")
                try:
                    process.wait(timeout=60)
                except subprocess.TimeoutExpired:
                    record["cleanup"] = "process_tree_did_not_exit"
            else:
                record["cleanup"] = "exited_on_its_own"
            record.setdefault("exit_code", process.poll())
    record["elapsed_seconds"] = round(time.monotonic() - started, 2)

    # Shader workers and crash helpers follow their parent down a second or two
    # later, so give the tree a bounded window before calling anything a leftover.
    settle_deadline = time.monotonic() + 30.0
    leftovers = {}
    while True:
        survivors = {pid: image for pid, image in list_engine_processes().items()
                     if pid not in baseline}
        leftovers = {pid: image for pid, image in survivors.items() if image in OWNED_IMAGES}
        if not leftovers or time.monotonic() >= settle_deadline:
            break
        time.sleep(1.0)
    for pid in list(leftovers):
        subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"], capture_output=True, text=True,
                       errors="replace", creationflags=subprocess.CREATE_NO_WINDOW)
    record["engine_processes_left"] = {str(pid): image for pid, image in leftovers.items()}
    record["shared_daemons_left"] = {str(pid): image for pid, image in survivors.items()
                                     if image in SHARED_DAEMONS}
    record.update(scan_log(log_path))

    problems = []
    if record.get("timed_out"):
        if report_path.is_file():
            problems.append(
                f"the editor wrote its report but was still running {deadline:.0f}s after it "
                f"started and had to be terminated, so it did not shut down cleanly; "
                f"see {log_path}")
        else:
            problems.append(f"the editor wrote no report within {deadline:.0f}s; see {log_path}")
    # A clean exit that still returned non-zero means the script failed inside an
    # editor that went on to quit normally, which is how a commandlet run reports
    # a Python error. Only meaningful when the process ended on its own: a
    # terminated tree exits non-zero by definition.
    if record.get("cleanup") == "exited_on_its_own" and record.get("exit_code") not in (0, None):
        problems.append(f"the editor exited {record['exit_code']} after running "
                        f"{script_path.name}; see {log_path}")
    if record.get("null_rhi"):
        problems.append("the editor log shows a null RHI, which compiles no real shader resource; "
                        "the run needs -AllowCommandletRendering with -d3d12")
    if leftovers:
        problems.append(f"editor processes this run started were still up 30 s after it ended and had "
                        f"to be killed: {record['engine_processes_left']}")

    if report_path.is_file():
        try:
            record["report"] = json.loads(report_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as error:
            problems.append(f"{report_path} is not valid JSON: {error}")
    else:
        problems.append(f"the editor script never wrote {report_path}; exit code "
                        f"{record.get('exit_code')}, log {log_path}")

    record["session_problems"] = problems
    return record


def print_session_summary(record):
    print("", flush=True)
    print(f"rhi                      {record.get('rhi', 'not reported')}", flush=True)
    print(f"adapter                  {record.get('adapter', 'not reported')}", flush=True)
    print(f"feature level            {record.get('feature_level', 'not reported')} "
          f"/ {record.get('rhi_feature_level', '?')} ({record.get('shader_platform', '?')})", flush=True)
    print(f"editor cleanup           {record.get('cleanup')} (exit {record.get('exit_code')}) "
          f"in {record.get('elapsed_seconds')}s", flush=True)
    print(f"engine processes left    {record.get('engine_processes_left') or 'none'}"
          f"{'' if not record.get('shared_daemons_left') else '; shared daemons still up: ' + str(record['shared_daemons_left'])}",
          flush=True)
