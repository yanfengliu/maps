"""Import the medieval assets into the Unreal project and author their materials.

Bound: this gets /Game/Generated into the shape design.md's "Unreal project"
section fixes. It checks each imported mesh's bounds against the inventory's
metre bounds times 100 within 1 cm, that its LOD0 triangle count equals the
inventory's exactly and that Nanite is off, so the collision a character walks on
is the authored geometry rather than a decimated fallback, that every mesh slot
carries the contract material its glTF material name asks for, and that every
material has a compiled shader resource. It makes no claim about how the town
looks, and it builds no level; `build_level.py` does that.

The editor runs headlessly, once, with commandlet rendering on D3D12, because a
material needs a real shader resource and NullRHI never produces one. This
process owns that editor, gives it a finite deadline, terminates only its own
tree, and reports any leftover.

The inventory is read fresh on every run, so a regenerated asset is picked up
rather than taken from a cached copy.

Usage:
    python tools/medieval/prepare_project.py
"""

import argparse
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import level_editor_session as session  # noqa: E402 - the path above has to come first
import level_frames as frames  # noqa: E402

EDITOR_SCRIPT = Path(__file__).resolve().parent / "import_assets_editor.py"


def main():
    session.check_python()
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--engine", type=Path, default=session.DEFAULT_ENGINE,
                        help=f"Engine root (default: {session.DEFAULT_ENGINE}).")
    parser.add_argument("--deadline", type=float, default=1800.0,
                        help="Seconds to allow the editor (default: 1800).")
    arguments = parser.parse_args()

    if not session.INVENTORY.is_file():
        raise SystemExit(f"No inventory at {session.INVENTORY}. Run "
                         f"python tools/blender/build_assets.py first.")
    raw = session.INVENTORY.read_bytes()
    try:
        inventory = frames.check_inventory(json.loads(raw.decode("utf-8")), str(session.INVENTORY))
    except (ValueError, json.JSONDecodeError) as error:
        raise SystemExit(f"{session.INVENTORY} cannot be used: {error}")
    inventory_digest = hashlib.sha256(raw).hexdigest()
    print(f"inventory                {session.INVENTORY}", flush=True)
    print(f"inventory sha256         {inventory_digest} ({len(raw)} bytes)", flush=True)
    print(f"assets                   {len(inventory['assets'])}; materials "
          f"{len(inventory['materials'])}", flush=True)

    evidence = session.EVIDENCE_ROOT / "prepare"
    record = session.run_editor_script(
        editor_script=EDITOR_SCRIPT,
        environment={
            "MEDIEVAL_INVENTORY": session.INVENTORY,
            "MEDIEVAL_ASSET_DIR": session.ASSET_DIR,
            "MEDIEVAL_REPORT": evidence / "import_assets.json",
        },
        report_path=evidence / "import_assets.json",
        log_path=evidence / "editor.log",
        deadline=arguments.deadline,
        engine=arguments.engine)
    record["inventory_sha256"] = inventory_digest
    record["inventory_bytes"] = len(raw)

    problems = list(record["session_problems"])
    report = record.get("report")
    if report is not None:
        problems.extend(report.get("problems", []))
        missing = sorted(set(inventory["assets"]) - set(report.get("assets", {})))
        if missing:
            problems.append(f"the editor imported nothing for {missing}, which the inventory lists")
        missing_materials = sorted(set(frames.MATERIAL_NAMES) - set(report.get("materials", {})))
        if missing_materials:
            problems.append(f"the editor created no material for {missing_materials}")

    session.print_session_summary(record)
    if report is not None:
        print("", flush=True)
        print(f"measured mapping         {frames.MEASURED_MAPPING['mesh_local_cm_from_authored_m']}"
              f", actor yaw {frames.MEASURED_MAPPING['unreal_yaw_from_layout_yaw']}, authored front"
              f" arrives as {frames.MEASURED_MAPPING['authored_front_arrives_as']}", flush=True)
        print(f"design.md nominal        "
              f"{frames.NOMINAL_MAPPING['location_cm_from_layout_m']}, authored front as "
              f"{frames.NOMINAL_MAPPING['authored_front_arrives_as']} (not implemented)", flush=True)
        print("", flush=True)
        print(f"{'material':12s} {'vertex':>7s} {'pixel':>7s}  roughness/metallic", flush=True)
        for name in sorted(report.get("materials", {})):
            entry = report["materials"][name]
            print(f"{name:12s} {entry['vertex_instructions']:7d} {entry['pixel_instructions']:7d}"
                  f"  {entry['roughness']:.2f}/{entry['metallic']:.2f}", flush=True)
        print("", flush=True)
        print(f"{'asset':14s} {'tris':>6s} {'inv':>6s} {'=':>3s} {'worst bounds cm':>16s}  slots  "
              f"collision", flush=True)
        for name in sorted(report.get("assets", {})):
            entry = report["assets"][name]
            same = entry.get("triangles") == entry.get("inventory_triangles")
            print(f"{name:14s} {entry.get('triangles', -1):6d} "
                  f"{entry.get('inventory_triangles', -1):6d} {'yes' if same else 'NO':>3s} "
                  f"{entry.get('worst_bounds_difference_cm', float('nan')):16.5f}  "
                  f"{len(entry.get('slots', [])):5d}  "
                  f"{str(entry.get('collision_trace_flag')).split('.')[-1].rstrip('> 0123456789:')}",
                  flush=True)

    record["problems"] = problems
    record["passed"] = not problems
    harness = evidence / "prepare_project.json"
    harness.write_text(json.dumps(record, indent=2, sort_keys=True, default=str) + "\n",
                       encoding="utf-8")
    print("", flush=True)
    print(f"editor report            {evidence / 'import_assets.json'}", flush=True)
    print(f"harness record           {harness}", flush=True)
    print(f"editor log               {evidence / 'editor.log'}", flush=True)

    if problems:
        print("\nAsset preparation FAILED:", flush=True)
        for problem in problems:
            print(f"  {problem}", flush=True)
        return 1
    print(f"\nPrepared {len(report['assets'])} meshes and {len(report['materials'])} materials; "
          f"every mesh within {frames.BOUNDS_TOLERANCE_CM:g} cm of the inventory.", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
