"""Build /Game/Maps/MedievalCity from the layout, or verify the saved level.

Bound, with `--verify`: it measures the saved level, not the one in memory. It
checks every imported mesh's bounds against the inventory's metre bounds times
100 within 1 cm, that each mesh's LOD0 triangle count equals the inventory's
exactly and that Nanite is off, so complex-as-simple collision is the authored
geometry rather than a decimated fallback, that each mesh slot carries the
contract material its glTF material name asks for, that every layout placement
has exactly one actor at its mapped transform and that the level holds no actor
of any class beyond those placements and the five world actors, that each house's
front points at the street it stands on within 25 degrees, that the sun, sky, sky
light, fog and player start are each there exactly once, that the sun's pitch and
yaw match the layout, that the import's axis signs match the authored geometry,
and that a Pawn-profile trace finds ground within 5 cm of the player start with
nothing blocking the column above it.

It makes no claim about how the town looks and none about the controls;
`run_probe.py` exercises those. The axis-sign probes trace Visibility, which
answers where an asset's geometry is; only the player-start check traces Pawn.

The editor runs headlessly, once per invocation, on D3D12. This process owns that
editor, gives it a finite deadline, terminates only its own tree, and reports any
leftover. The inventory and the layout are read fresh on every run.

Usage:
    python tools/medieval/build_level.py
    python tools/medieval/build_level.py --verify
"""

import argparse
import hashlib
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import level_editor_session as session  # noqa: E402 - the path above has to come first
import level_frames as frames  # noqa: E402

EDITOR_SCRIPT = Path(__file__).resolve().parent / "level_build_editor.py"
LEVEL_FILE = session.PROJECT_ROOT / "Content" / "Maps" / "MedievalCity.umap"


def digest(path):
    raw = path.read_bytes()
    return hashlib.sha256(raw).hexdigest(), len(raw)


def summarise_verify(report):
    """Print what was measured, in the order a reader asks about it."""
    meshes = report.get("meshes", {})
    if meshes:
        print("", flush=True)
        print(f"{'asset':14s} {'tris':>6s} {'inv':>6s} {'=':>3s} {'bounds cm':>10s}  nanite  "
              f"collision", flush=True)
        for name in sorted(meshes):
            entry = meshes[name]
            flag = str(entry.get("collision_trace_flag", "")).split(".")[-1].rstrip("> 0123456789:")
            same = entry.get("triangles") == entry.get("inventory_triangles")
            print(f"{name:14s} {entry.get('triangles', -1):6d} "
                  f"{entry.get('inventory_triangles', -1):6d} {'yes' if same else 'NO':>3s} "
                  f"{entry.get('worst_bounds_difference_cm', float('nan')):10.5f}  "
                  f"{str(entry.get('nanite_enabled')):6s}  {flag}", flush=True)

    placements = report.get("placements", {})
    if placements:
        worst_location = max(placements.values(), key=lambda e: e.get("location_difference_cm", 0.0))
        worst_yaw = max(placements.values(), key=lambda e: e.get("yaw_difference_deg", 0.0))
        print("", flush=True)
        print(f"placements verified      {len(placements)} of "
              f"{report.get('placements_declared')} declared", flush=True)
        print(f"worst location offset    {worst_location.get('location_difference_cm', 0.0):.5f} cm "
              f"(limit {report['bounds']['actor_location_tolerance_cm']:g})", flush=True)
        print(f"worst yaw offset         {worst_yaw.get('yaw_difference_deg', 0.0):.5f} deg "
              f"(limit {report['bounds']['actor_yaw_tolerance_deg']:g})", flush=True)
        undeclared = report.get("other_actors") or []
        print(f"undeclared actors        "
              f"{[entry['label'] + ' (' + entry['class'] + ')' for entry in undeclared] or 'none, any class'}",
              flush=True)

    fronts = report.get("house_fronts", {})
    if fronts:
        worst = max(fronts.items(), key=lambda item: item[1].get("angle_deg") or 0.0)
        passed = sum(1 for entry in fronts.values() if entry.get("passed"))
        print("", flush=True)
        print(f"house fronts             {passed} of {len(fronts)} within "
              f"{report['bounds']['house_front_tolerance_deg']:g} deg of their street", flush=True)
        print(f"worst house front        {worst[0]} {worst[1].get('angle_deg', float('nan')):.2f} "
              f"deg off the {worst[1].get('chosen')}", flush=True)

    for asset, verdict in sorted(report.get("axis_signs", {}).items()):
        print(f"axis signs via {asset:9s} {'agree' if verdict.get('passed') else 'DISAGREE'}: a "
              f"band from {verdict.get('band_top_cm', float('nan')):.0f} to "
              f"{verdict.get('band_floor_cm', float('nan')):.0f} cm found geometry at "
              f"{verdict.get('tall_found')} of {len(verdict.get('tall_hits', []))} tall samples "
              f"and {verdict.get('short_found')} of {len(verdict.get('short_hits', []))} short "
              f"ones (needs all, then none)", flush=True)

    sun = report.get("sun")
    if sun:
        print("", flush=True)
        print(f"sun                      pitch {sun.get('measured_pitch_deg')} / yaw "
              f"{sun.get('measured_yaw_deg')} against the layout's "
              f"{sun.get('expected_pitch_deg')} / {sun.get('expected_yaw_deg')}", flush=True)
    sky = report.get("sky_light")
    if sky:
        print(f"sky light                {sky.get('source_type')}, real-time capture "
              f"{sky.get('real_time_capture')}, intensity {sky.get('intensity')}", flush=True)
    found = report.get("world_actors_found")
    if found:
        print(f"world actors             "
              f"{', '.join(f'{k}={len(v)}' for k, v in sorted(found.items()))}", flush=True)
    ground = report.get("player_start_ground")
    if ground:
        print(f"ground at player start   within {ground.get('tolerance_cm')} cm of the layout's "
              f"{ground.get('expected_height_cm')} cm: {ground.get('ground_within_tolerance')}; "
              f"obstructed above: {ground.get('obstructed_above')}", flush=True)


def main():
    session.check_python()
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--verify", action="store_true",
                        help="Re-open the saved level and check it instead of building it.")
    parser.add_argument("--engine", type=Path, default=session.DEFAULT_ENGINE,
                        help=f"Engine root (default: {session.DEFAULT_ENGINE}).")
    parser.add_argument("--deadline", type=float, default=1800.0,
                        help="Seconds to allow the editor (default: 1800).")
    arguments = parser.parse_args()
    mode = "verify" if arguments.verify else "build"

    for path, what in ((session.INVENTORY, "python tools/blender/build_assets.py"),
                       (session.LAYOUT, "python tools/medieval/build_layout.py")):
        if not path.is_file():
            raise SystemExit(f"{path} is missing. Run {what} first.")
    inventory_digest, inventory_bytes = digest(session.INVENTORY)
    layout_digest, layout_bytes = digest(session.LAYOUT)
    try:
        inventory = frames.check_inventory(frames.load_json(session.INVENTORY),
                                           str(session.INVENTORY))
        layout = frames.check_layout(frames.load_json(session.LAYOUT), str(session.LAYOUT),
                                     inventory)
    except (ValueError, json.JSONDecodeError) as error:
        raise SystemExit(f"the inputs cannot be used: {error}")

    print(f"mode                     {mode}", flush=True)
    print(f"inventory sha256         {inventory_digest} ({inventory_bytes} bytes)", flush=True)
    print(f"layout sha256            {layout_digest} ({layout_bytes} bytes), "
          f"{len(layout['placements'])} placements", flush=True)
    print(f"layout's inventory sha   {layout.get('inventory_sha256')}"
          f"{'' if layout.get('inventory_sha256') == inventory_digest else '  (does not match the inventory above)'}",
          flush=True)
    if mode == "verify" and not LEVEL_FILE.is_file():
        print(f"\n{LEVEL_FILE} does not exist, so there is no saved level to verify. "
              f"Run python tools/medieval/build_level.py first.", flush=True)
        return 2

    evidence = session.EVIDENCE_ROOT / "level"
    record = session.run_editor_script(
        editor_script=EDITOR_SCRIPT,
        environment={
            "MEDIEVAL_INVENTORY": session.INVENTORY,
            "MEDIEVAL_LAYOUT": session.LAYOUT,
            "MEDIEVAL_REPORT": evidence / f"level_{mode}.json",
            "MEDIEVAL_MODE": mode,
        },
        report_path=evidence / f"level_{mode}.json",
        log_path=evidence / f"editor_{mode}.log",
        deadline=arguments.deadline,
        engine=arguments.engine)
    record.update({"mode": mode, "inventory_sha256": inventory_digest,
                   "layout_sha256": layout_digest})

    problems = list(record["session_problems"])
    report = record.get("report")
    if report is not None:
        problems.extend(report.get("problems", []))
    if mode == "build":
        if not LEVEL_FILE.is_file():
            problems.append(f"{LEVEL_FILE} does not exist after the build, so no level was saved")
        else:
            level_digest, level_bytes = digest(LEVEL_FILE)
            record["level_sha256"] = level_digest
            record["level_bytes"] = level_bytes
    elif LEVEL_FILE.is_file():
        record["level_sha256"], record["level_bytes"] = digest(LEVEL_FILE)

    session.print_session_summary(record)
    if report is not None:
        print("", flush=True)
        print(f"measured mapping         location "
              f"{frames.MEASURED_MAPPING['location_cm_from_layout_m']}, actor yaw "
              f"{frames.MEASURED_MAPPING['unreal_yaw_from_layout_yaw']}, authored front arrives as "
              f"{frames.MEASURED_MAPPING['authored_front_arrives_as']}", flush=True)
        print(f"design.md nominal        location "
              f"{frames.NOMINAL_MAPPING['location_cm_from_layout_m']}, authored front as "
              f"{frames.NOMINAL_MAPPING['authored_front_arrives_as']} (not implemented)", flush=True)
        if mode == "build":
            print(f"placed                   {report.get('placed')} actors into "
                  f"{report.get('new_level_world')}; saved {report.get('saved')}", flush=True)
        else:
            summarise_verify(report)
    if record.get("level_sha256"):
        print("", flush=True)
        print(f"level                    {LEVEL_FILE}", flush=True)
        print(f"level sha256             {record['level_sha256']} ({record['level_bytes']} bytes)",
              flush=True)

    record["problems"] = problems
    record["passed"] = not problems
    harness = evidence / f"build_level_{mode}.json"
    harness.write_text(json.dumps(record, indent=2, sort_keys=True, default=str) + "\n",
                       encoding="utf-8")
    print(f"editor report            {evidence / f'level_{mode}.json'}", flush=True)
    print(f"harness record           {harness}", flush=True)
    print(f"editor log               {evidence / f'editor_{mode}.log'}", flush=True)

    if problems:
        print(f"\nLevel {mode} FAILED:", flush=True)
        for problem in problems:
            print(f"  {problem}", flush=True)
        return 1
    if mode == "build":
        print(f"\nBuilt {frames.LEVEL_PACKAGE} from {report.get('placed')} placements.", flush=True)
    else:
        print(f"\nLevel gate passed: {len(report.get('placements', {}))} placements, "
              f"{report.get('house_front_count')} house fronts and "
              f"{len(report.get('meshes', {}))} meshes measured against the inventory.", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
