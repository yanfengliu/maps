#!/usr/bin/env python3
"""Build the medieval city glTF assets by driving Blender 5.2 headlessly.

    python tools/blender/build_assets.py                 # write the .glb files and inventory.json
    python tools/blender/build_assets.py --previews      # also render one preview strip per asset
    python tools/blender/build_assets.py --out <dir>     # write somewhere else (used by the check)

Standard library only. The Blender process this starts is the only one it owns,
and it is killed with its children if this script is interrupted.
"""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUT = REPO_ROOT / "assets" / "generated" / "medieval"
DEFAULT_PREVIEW_DIR = REPO_ROOT / "artifacts" / "medieval" / "asset-previews"
BLENDER_SCRIPT = Path(__file__).resolve().parent / "blender_build.py"

# Pinned by docs/work/2_medieval-city/design.md. MEDIEVAL_BLENDER overrides the
# path only; the version check below still has to pass.
BLENDER_EXE = Path(r"C:/Program Files/Blender Foundation/Blender 5.2/blender.exe")
EXPECTED_BLENDER_VERSION = "5.2.0"
EXPECTED_PYTHON = (3, 13)
TIMEOUT_SECONDS = 3600


class DriverError(RuntimeError):
    pass


def check_python() -> None:
    if sys.version_info[:2] != EXPECTED_PYTHON:
        raise DriverError(
            f"this script targets CPython {EXPECTED_PYTHON[0]}.{EXPECTED_PYTHON[1]} but is "
            f"running under {sys.version.split()[0]}; design.md pins the system CPython 3.13"
        )


def find_blender() -> Path:
    override = os.environ.get("MEDIEVAL_BLENDER")
    exe = Path(override) if override else BLENDER_EXE
    if not exe.is_file():
        raise DriverError(
            f"Blender was not found at {exe}; install Blender "
            f"{EXPECTED_BLENDER_VERSION} LTS there or set MEDIEVAL_BLENDER to its blender.exe"
        )
    return exe


def check_blender_version(exe: Path) -> str:
    completed = subprocess.run(
        [str(exe), "--version"],
        capture_output=True,
        text=True,
        timeout=120,
        check=False,
    )
    first = (completed.stdout or completed.stderr or "").strip().splitlines()
    reported = first[0].strip() if first else "<no output>"
    if EXPECTED_BLENDER_VERSION not in reported:
        raise DriverError(
            f"{exe} reports {reported!r} but this generator is written against Blender "
            f"{EXPECTED_BLENDER_VERSION} LTS, which design.md pins; a different major version "
            "exports different glTF bytes, so generation is refused"
        )
    return reported


def run_blender(exe: Path, out_dir: Path, previews: bool, preview_dir: Path) -> None:
    command = [
        str(exe),
        "--background",
        "--factory-startup",
        "--python",
        str(BLENDER_SCRIPT),
        "--",
        "--out",
        str(out_dir),
    ]
    if previews:
        command += ["--previews", "--preview-dir", str(preview_dir)]
    creationflags = 0
    if sys.platform == "win32":
        # Its own process group, so terminating it never reaches an unrelated
        # Blender the user already had open.
        creationflags = subprocess.CREATE_NEW_PROCESS_GROUP
    process = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        creationflags=creationflags,
    )
    try:
        assert process.stdout is not None
        for line in process.stdout:
            line = line.rstrip()
            if line:
                print(line, flush=True)
        code = process.wait(timeout=TIMEOUT_SECONDS)
    except BaseException:
        kill_tree(process)
        raise
    if code != 0:
        raise DriverError(
            f"Blender exited with code {code}; the command was: {' '.join(command)}"
        )


def kill_tree(process: subprocess.Popen) -> None:
    """Kill only the Blender this script started, plus anything it spawned."""
    if process.poll() is not None:
        return
    if sys.platform == "win32":
        subprocess.run(
            ["taskkill", "/T", "/F", "/PID", str(process.pid)],
            capture_output=True,
            check=False,
        )
    else:
        process.kill()
    try:
        process.wait(timeout=30)
    except subprocess.TimeoutExpired:
        pass


def verify_output(out_dir: Path) -> dict[str, object]:
    inventory_path = out_dir / "inventory.json"
    if not inventory_path.is_file():
        raise DriverError(
            f"Blender finished but {inventory_path} was not written; nothing downstream can "
            "read the asset list"
        )
    document = json.loads(inventory_path.read_text(encoding="utf-8"))
    declared = document.get("assets", {})
    if not declared:
        raise DriverError(f"{inventory_path} declares no assets")
    for name in sorted(declared):
        path = out_dir / declared[name]["file"]
        if not path.is_file():
            raise DriverError(
                f"inventory.json declares {name} as {declared[name]['file']} but that file is "
                f"missing from {out_dir}"
            )
        actual = path.stat().st_size
        if actual != declared[name]["bytes"]:
            raise DriverError(
                f"{name}: {path.name} is {actual} bytes on disk but inventory.json records "
                f"{declared[name]['bytes']}; the export and the record disagree"
            )
    return document


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument(
        "--out",
        type=Path,
        default=DEFAULT_OUT,
        help=f"directory for the .glb files and inventory.json (default {DEFAULT_OUT})",
    )
    parser.add_argument(
        "--previews",
        action="store_true",
        help="also render one 1200x400 three-angle preview per asset",
    )
    parser.add_argument(
        "--preview-dir",
        type=Path,
        default=DEFAULT_PREVIEW_DIR,
        help=f"directory for preview PNGs (default {DEFAULT_PREVIEW_DIR})",
    )
    args = parser.parse_args(argv)

    try:
        check_python()
        exe = find_blender()
        reported = check_blender_version(exe)
        out_dir = args.out.resolve()
        preview_dir = args.preview_dir.resolve()
        out_dir.mkdir(parents=True, exist_ok=True)
        if args.previews:
            preview_dir.mkdir(parents=True, exist_ok=True)
        print(f"[driver] {reported} at {exe}", flush=True)
        print(f"[driver] python {sys.version.split()[0]}", flush=True)
        print(f"[driver] output {out_dir}", flush=True)
        if args.previews:
            print(f"[driver] previews {preview_dir}", flush=True)
        run_blender(exe, out_dir, args.previews, preview_dir)
        document = verify_output(out_dir)
    except DriverError as error:
        print(f"ERROR: {error}", file=sys.stderr, flush=True)
        return 2
    except subprocess.TimeoutExpired:
        print(
            f"ERROR: Blender did not finish within {TIMEOUT_SECONDS} s and was killed",
            file=sys.stderr,
            flush=True,
        )
        return 2
    count = len(document["assets"])
    total = sum(entry["triangles"] for entry in document["assets"].values())
    print(f"[driver] wrote {count} assets, {total} triangles in total", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
