"""Compile the MedievalCity Unreal targets through Unreal Build Tool.

Bound: this proves the Editor and Game targets compile and link. It makes no
claim about runtime behaviour; tools/medieval/run_probe.py does that.

Usage:
    python tools/medieval/build_native.py --target both
    python tools/medieval/build_native.py --target editor --configuration Development
"""

import argparse
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
DEFAULT_ENGINE = Path(r"C:\Program Files\Epic Games\UE_5.8")

TARGETS = {
    "editor": "MedievalCityEditor",
    "game": "MedievalCity",
}

# UBT announces its toolchain choice on one line; record which one it actually used.
TOOLCHAIN_PATTERN = re.compile(r"^\s*Using (Visual Studio [^\n]*|Windows SDK [^\n]*|clang [^\n]*)$", re.MULTILINE)
ERROR_PATTERN = re.compile(r"(?:^|\s)(?:error|fatal error)\s+[A-Z]+\d+\s*:|\berror\b\s*:", re.IGNORECASE)
# UBT numbers the actions it runs, e.g. "[3/17] Compile [x64] Foo.cpp". Counting
# these is how a no-op build is told from one that really compiled and linked:
# UBT does not always print "Target is up to date", so its absence proves nothing.
ACTION_PATTERN = re.compile(r"^\s*\[\d+/\d+\]\s+(\w+)", re.MULTILINE)


def check_python() -> None:
    actual = sys.version_info[:2]
    if actual != REQUIRED_PYTHON:
        raise SystemExit(
            f"build_native.py needs CPython {REQUIRED_PYTHON[0]}.{REQUIRED_PYTHON[1]}, "
            f"but is running under {actual[0]}.{actual[1]}. "
            f"Run it with the system CPython 3.13 so the toolchain matches the rest of tools/medieval."
        )


def read_engine_version(engine: Path) -> dict:
    version_file = engine / "Engine" / "Build" / "Build.version"
    if not version_file.is_file():
        raise SystemExit(
            f"No engine version at {version_file}. Point --engine at an Unreal Engine "
            f"{REQUIRED_ENGINE[0]}.{REQUIRED_ENGINE[1]} install."
        )
    data = json.loads(version_file.read_text(encoding="utf-8"))
    actual = (data.get("MajorVersion"), data.get("MinorVersion"))
    if actual != REQUIRED_ENGINE:
        raise SystemExit(
            f"{version_file} reports Unreal Engine {actual[0]}.{actual[1]}, but this project "
            f"is pinned to {REQUIRED_ENGINE[0]}.{REQUIRED_ENGINE[1]} by MedievalCity.uproject. "
            f"Install 5.8 or pass --engine for a 5.8 install."
        )
    return data


def netfx_sdk_is_registered() -> bool:
    """True when a real .NET Framework SDK is registered where UnrealBuildTool looks."""
    for root in ("HKLM", "HKCU"):
        for node in ("SOFTWARE", "SOFTWARE\\WOW6432Node"):
            completed = subprocess.run(
                ["reg", "query", f"{root}\\{node}\\Microsoft\\Microsoft SDKs\\NETFXSDK"],
                capture_output=True, text=True, errors="replace",
                creationflags=subprocess.CREATE_NO_WINDOW)
            if completed.returncode == 0:
                return True
    return False


def netfx_autosdk_marker() -> Path:
    """Create the AutoSDK presence marker UnrealBuildTool needs for the Editor target.

    UE 5.8 instantiates Engine/Source/Editor/SwarmInterface's rules for every
    Editor target, through UnrealEd, and those rules throw outright when no
    NETFXSDK is installed. UnrealBuildTool only checks that this one file exists;
    it never reads it, and an installed engine never recompiles SwarmInterface,
    so the include and library paths derived from it are unused.
    """
    marker_root = PROJECT_ROOT / "artifacts" / "medieval" / "netfxsdk-shim"
    sdk = marker_root / "HostWin64" / "Win64" / "Windows Kits" / "NETFXSDK" / "4.6.2"
    (sdk / "Include" / "um").mkdir(parents=True, exist_ok=True)
    (sdk / "lib" / "um" / "x64").mkdir(parents=True, exist_ok=True)
    marker = sdk / "Include" / "um" / "mscoree.h"
    if not marker.is_file():
        marker.write_text(
            "// Presence marker only, created by tools/medieval/build_native.py.\n"
            "// UnrealBuildTool requires a NETFXSDK to exist before it will instantiate\n"
            "// Engine/Source/Editor/SwarmInterface rules, which every project Editor\n"
            "// target reaches through UnrealEd. This installed engine never recompiles\n"
            "// SwarmInterface, so this path is never read. Deliberately empty: anything\n"
            "// that did try to compile against it would fail loudly, not silently.\n",
            encoding="utf-8")
    return marker_root


def newest_source_mtime() -> tuple:
    """The newest file under Source/, so a stale binary cannot pass as a build."""
    newest = 0.0
    newest_path = None
    for path in (PROJECT_ROOT / "Source").rglob("*"):
        if path.is_file():
            stamp = path.stat().st_mtime
            if stamp > newest:
                newest, newest_path = stamp, path
    return newest, newest_path


def run_target(engine: Path, target: str, configuration: str, log_dir: Path, rebuild: bool = False) -> dict:
    launcher = "Rebuild.bat" if rebuild else "Build.bat"
    build_bat = engine / "Engine" / "Build" / "BatchFiles" / launcher
    if not build_bat.is_file():
        raise SystemExit(f"Unreal Build Tool launcher is missing at {build_bat}.")

    command = [
        str(build_bat),
        target,
        "Win64",
        configuration,
        f"-Project={UPROJECT}",
        "-WaitMutex",
        "-NoHotReload",
    ]

    environment = None
    if target.endswith("Editor") and not netfx_sdk_is_registered():
        marker_root = netfx_autosdk_marker()
        environment = dict(os.environ, UE_SDKS_ROOT=str(marker_root))
        print(f"  no .NET Framework SDK is registered on this machine; pointing UE_SDKS_ROOT at\n"
              f"  {marker_root} for this build only, so UnrealBuildTool will instantiate\n"
              f"  SwarmInterface's rules. Install the Windows SDK '.NET Framework 4.x SDK'\n"
              f"  component to make this unnecessary.", flush=True)

    started = time.monotonic()
    completed = subprocess.run(
        command,
        cwd=str(PROJECT_ROOT),
        capture_output=True,
        text=True,
        errors="replace",
        shell=False,
        env=environment,
    )
    seconds = time.monotonic() - started
    output = (completed.stdout or "") + (completed.stderr or "")

    suffix = "-rebuild" if rebuild else ""
    log_path = log_dir / f"{target}-{configuration}{suffix}.log"
    log_path.write_text(output, encoding="utf-8", errors="replace")

    toolchains = TOOLCHAIN_PATTERN.findall(output)
    actions = {}
    for kind in ACTION_PATTERN.findall(output):
        actions[kind] = actions.get(kind, 0) + 1
    compiles = actions.get("Compile", 0)
    links = actions.get("Link", 0)
    result = {
        "target": target,
        "configuration": configuration,
        "command": command,
        "rebuild": rebuild,
        "exit_code": completed.returncode,
        "seconds": round(seconds, 2),
        "log": str(log_path),
        "toolchains": toolchains,
        "actions": actions,
        "compile_actions": compiles,
        "link_actions": links,
        # True when UBT ran no compile and no link, whether or not it said so.
        "no_op": compiles == 0 and links == 0,
        "said_up_to_date": "Target is up to date" in output,
        "netfx_autosdk_marker": environment is not None,
    }

    if completed.returncode != 0:
        error_lines = [line for line in output.splitlines() if ERROR_PATTERN.search(line)]
        print(f"\n--- {target} {configuration} FAILED (exit {completed.returncode}) ---", flush=True)
        if error_lines:
            print("Compiler and linker errors, as reported:", flush=True)
            for line in error_lines[:60]:
                print(f"  {line.strip()}", flush=True)
        print(f"Last 40 lines of {log_path}:", flush=True)
        for line in output.splitlines()[-40:]:
            print(f"  {line}", flush=True)
        result["errors"] = error_lines
    return result


def main() -> int:
    check_python()

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--target", choices=["both", "editor", "game"], default="both",
                        help="Which Unreal target to compile (default: both).")
    parser.add_argument("--configuration", default="Development",
                        help="Unreal build configuration (default: Development).")
    parser.add_argument("--engine", type=Path, default=DEFAULT_ENGINE,
                        help=f"Unreal Engine install root (default: {DEFAULT_ENGINE}).")
    parser.add_argument("--rebuild", action="store_true",
                        help="Compile and link from scratch through Rebuild.bat, so the log shows real "
                             "compile and link actions rather than an up-to-date no-op.")
    args = parser.parse_args()

    if not UPROJECT.is_file():
        raise SystemExit(f"No Unreal project at {UPROJECT}; build_native.py must run from this repository.")

    engine_version = read_engine_version(args.engine)
    engine_text = "{}.{}.{}".format(
        engine_version["MajorVersion"], engine_version["MinorVersion"], engine_version.get("PatchVersion", 0))

    log_dir = PROJECT_ROOT / "artifacts" / "medieval" / "build"
    log_dir.mkdir(parents=True, exist_ok=True)

    wanted = ["editor", "game"] if args.target == "both" else [args.target]
    print(f"Engine {engine_text} (changelist {engine_version.get('Changelist')}) at {args.engine}", flush=True)

    results = []
    for name in wanted:
        target = TARGETS[name]
        print(f"Building {target} Win64 {args.configuration} ...", flush=True)
        result = run_target(args.engine, target, args.configuration, log_dir, args.rebuild)
        results.append(result)
        state = "ok" if result["exit_code"] == 0 else f"FAILED ({result['exit_code']})"
        work = ("no compile or link ran, nothing was out of date"
                if result["no_op"]
                else f"{result['compile_actions']} compiled, {result['link_actions']} linked")
        print(f"  {target}: {state} in {result['seconds']}s; {work}", flush=True)
        for toolchain in result["toolchains"]:
            print(f"    {toolchain}", flush=True)
        if result["exit_code"] != 0:
            break

    summary = {
        "schema_version": 1,
        "generator": "tools/medieval/build_native.py",
        "python": "{}.{}.{}".format(*sys.version_info[:3]),
        "engine_root": str(args.engine),
        "engine_version": engine_text,
        "engine_changelist": engine_version.get("Changelist"),
        "configuration": args.configuration,
        "targets": results,
        "passed": all(result["exit_code"] == 0 for result in results) and len(results) == len(wanted),
    }
    # A rebuild record goes to its own filename. Sharing one with ordinary runs
    # meant the next incremental build silently overwrote the only evidence that
    # the targets ever compiled and linked.
    summary_path = log_dir / ("build_native_rebuild.json" if args.rebuild else "build_native.json")
    summary_path.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    print(f"\nSummary written to {summary_path}", flush=True)
    if not summary["passed"]:
        print("Native build gate FAILED.", flush=True)
        return 1

    binaries = PROJECT_ROOT / "Binaries" / "Win64"
    expected = []
    if "editor" in wanted:
        expected.append(binaries / "UnrealEditor-MedievalCityRuntime.dll")
    if "game" in wanted:
        expected.append(binaries / "MedievalCity.exe")
    missing = [path for path in expected if not path.is_file()]
    if missing:
        # Exit status alone is not evidence; the artefact that should exist must exist.
        print("Native build gate FAILED: UBT reported success but these outputs are absent:", flush=True)
        for path in missing:
            print(f"  {path}", flush=True)
        return 1

    # Exit status and a file that exists are not evidence of a build: a binary
    # older than the newest source is stale, whatever UBT reported.
    newest_source, newest_source_path = newest_source_mtime()
    stale = [path for path in expected if path.stat().st_mtime < newest_source]
    if stale:
        print("Native build gate FAILED: these outputs are older than the newest file under Source/", flush=True)
        print(f"  newest source: {newest_source_path}", flush=True)
        for path in stale:
            print(f"  stale output: {path}", flush=True)
        return 1
    summary["newest_source"] = str(newest_source_path)

    for path in expected:
        print(f"  built {path} ({path.stat().st_size} bytes)", flush=True)
    if all(result["no_op"] for result in results):
        print("  note: every target was already up to date, so this run compiled and linked nothing. "
              "Run with --rebuild for a log that shows real compile and link actions.", flush=True)
    print("Native build gate passed.", flush=True)
    summary_path.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    sys.exit(main())
