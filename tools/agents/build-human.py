"""harness: offline human export proof; the city sweep cannot inspect source rigs.

Run through build.ts so Blender uses task-local preferences and verified sources.
All imported geometry and materials are MakeHuman core/system CC0 assets. The
walk below is authored here; no animation account or restricted library is used.
"""

import bpy
import json
import hashlib
import math
import os
import sys
import zipfile
import shutil
from pathlib import Path
from mathutils import Vector


ROOT = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
SOURCE = ROOT / "data/agents/source"
OUTPUT = ROOT / "data/scene/agents"
EVIDENCE = ROOT / "artifacts/agents"
MPFB_COMMIT = "80919fa4682335c41847f761a4d79dcad4124732"
VARIANTS = [
    {"id": "commuter-male", "gender": 1.0, "height": 0.58, "age": 0.4,
     "skin": "young_asian_male", "hair": "short01", "outfit": "male_casualsuit01"},
    {"id": "office-male", "gender": 1.0, "height": 0.66, "age": 0.62,
     "skin": "middleage_asian_male", "hair": "short04", "outfit": "male_elegantsuit01"},
    {"id": "commuter-female", "gender": 0.0, "height": 0.57, "age": 0.42,
     "skin": "young_asian_female", "hair": "bob01", "outfit": "female_casualsuit01"},
]


def unpack(archive, destination):
    source_digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    marker = destination / ".maps-extracted-sha256"
    if marker.exists() and marker.read_text(encoding="utf-8") == source_digest:
        return
    if not destination.resolve().is_relative_to(SOURCE.resolve()):
        raise RuntimeError(f"Refusing to recreate extraction outside agent sources: {destination}")
    if destination.exists():
        shutil.rmtree(destination)
    with zipfile.ZipFile(archive) as source:
        for name in source.namelist():
            target = (destination / name).resolve()
            if not target.is_relative_to(destination.resolve()):
                raise RuntimeError(f"Unsafe archive entry {name}")
        source.extractall(destination)
    marker.write_text(source_digest, encoding="utf-8")


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    EVIDENCE.mkdir(parents=True, exist_ok=True)
    unpack(SOURCE / "mpfb2-80919fa.zip", SOURCE / "mpfb2")
    unpack(SOURCE / "makehuman-system-assets.zip", SOURCE / "system-assets")
    module_root = SOURCE / "mpfb2" / f"mpfb2-{MPFB_COMMIT}" / "src"
    # Use Blender's actual extension loader with a repository confined to data/.
    bpy.context.preferences.extensions.repos.new(
        name="Maps offline assets", module="maps_assets",
        custom_directory=str(module_root),
    )
    import addon_utils
    addon_utils.enable("bl_ext.maps_assets.mpfb", default_set=True, persistent=False)
    module = sys.modules["bl_ext.maps_assets.mpfb"]
    services = module.MPFB_CONTEXTUAL_INFORMATION["SERVICES"]
    print("MPFB_READY", sorted(services.keys()))

    from importlib import import_module
    HumanService = import_module("bl_ext.maps_assets.mpfb.services.humanservice").HumanService
    TargetService = import_module("bl_ext.maps_assets.mpfb.services.targetservice").TargetService
    ExportService = import_module("bl_ext.maps_assets.mpfb.services.exportservice").ExportService
    ObjectService = import_module("bl_ext.maps_assets.mpfb.services.objectservice").ObjectService
    props = import_module("bl_ext.maps_assets.mpfb.entities.objectproperties").HumanObjectProperties
    for variant in VARIANTS:
        bpy.ops.object.select_all(action="SELECT")
        bpy.ops.object.delete(use_global=False)
        human = HumanService.create_human()
        human.name = variant["id"]
        for name, value in {"gender": variant["gender"], "height": variant["height"], "age": variant["age"],
                            "muscle": 0.5, "weight": 0.5, "asian": 0.85, "african": 0.05, "caucasian": 0.1}.items():
            props.set_value(name, value, entity_reference=human)
        TargetService.reapply_macro_details(human)
        assets = SOURCE / "system-assets"
        skin = variant["skin"]
        HumanService.set_character_skin(str(assets / f"skins/{skin}/{skin}.mhmat"), human, skin_type="GAMEENGINE")
        rig = HumanService.add_builtin_rig(human, "game_engine")
        hair = variant["hair"]
        outfit = variant["outfit"]
        for subdir, filename, kind in [
            ("eyes/low-poly", "low-poly.mhclo", "Eyes"),
            ("eyebrows/eyebrow001", "eyebrow001.mhclo", "Eyebrows"),
            (f"hair/{hair}", f"{hair}.mhclo", "Hair"),
            (f"clothes/{outfit}", f"{outfit}.mhclo", "Clothes"),
            ("clothes/shoes01", "shoes01.mhclo", "Clothes"),
        ]:
            path = assets / subdir / filename
            if not path.exists():
                raise RuntimeError(f"Required clothed-human asset is missing: {path}")
            HumanService.add_mhclo_asset(str(path), human, asset_type=kind, material_type="GAMEENGINE", subdiv_levels=0)
        ExportService.bake_modifiers_remove_helpers(human, bake_masks=True, bake_subdiv=False, remove_helpers=True, also_proxy=True)
        print("HUMAN_READY", variant["id"], [(o.name, len(o.data.vertices)) for o in bpy.data.objects if o.type == "MESH"], flush=True)
        bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT / f"{variant['id']}-source.blend"))


if __name__ == "__main__":
    main()
