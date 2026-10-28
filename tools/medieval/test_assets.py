#!/usr/bin/env python3
"""Assets gate for the medieval city proof of concept.

    python tools/medieval/test_assets.py

Bound: this checks `assets/generated/medieval/` only -- inventory completeness,
the metre envelopes and triangle budgets in docs/work/2_medieval-city/design.md,
the declared material names, the origin and ground-plane rule, the ground being
flat inside design.md's box, the recorded digests, and that a second generation
produces the same bytes. It makes no claim about how the assets look, and no
claim about Unreal.

Every measurement is decoded from the exported vertices with the small parser
below -- not from the generator's numbers, and not from the accessor's own
declared min/max, which is metadata rather than geometry. The declared bounds
are checked against the decoded vertices separately, because the import step
reads them. The envelope table is transcribed from design.md and deliberately
kept separate from the generator's copy.
"""

from __future__ import annotations

import hashlib
import json
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
ASSET_DIR = REPO_ROOT / "assets" / "generated" / "medieval"
INVENTORY = ASSET_DIR / "inventory.json"
BUILDER = REPO_ROOT / "tools" / "blender" / "build_assets.py"

FOOTPRINT_TOLERANCE = 0.15
HEIGHT_TOLERANCE = 0.20
ORIGIN_TOLERANCE_M = 0.001
EXPECTED_PYTHON = (3, 13)
REBUILD_TIMEOUT_S = 3600

# Also from design.md: the ground is exactly flat at Z = 0 over this box, so
# every building and prop placed at Z = 0 sits seated rather than floating or
# sunk. Its 0.8 m of relief begins beyond the box, where nothing is placed.
FLAT_BOX_HALF_X = 60.0
FLAT_BOX_HALF_Y = 64.0
FLAT_TOLERANCE_M = 0.001

# A glTF accessor declares its own min/max. Every envelope measurement here is
# taken from the vertices instead, and the two must agree: the import step in
# design.md reads the declared bounds, so a file that lies about them would
# mislead it even though its geometry is sound. Positions and the declared
# bounds are both float32 written from the same data, so they should match
# exactly; 0.1 mm is slack for the exporter's own rounding.
DECLARED_BOUNDS_TOLERANCE_M = 0.0001

# Transcribed from the asset inventory table in docs/work/2_medieval-city/design.md:
# asset -> (footprint x m, footprint y m, height m, maximum triangles).
ENVELOPE: dict[str, tuple[float, float, float, int]] = {
    "house_a": (7.0, 6.0, 8.5, 6000),
    "house_b": (5.0, 6.5, 11.0, 6000),
    "house_c": (9.0, 6.0, 8.0, 7000),
    "cottage": (6.0, 5.0, 5.0, 4000),
    "wall_segment": (8.0, 1.6, 6.0, 3000),
    "wall_tower": (4.5, 4.5, 9.0, 4000),
    "gatehouse": (10.0, 5.0, 12.0, 8000),
    "church": (18.0, 10.0, 19.0, 10000),
    "well": (2.4, 2.4, 3.0, 2500),
    "market_stall": (3.0, 2.4, 2.6, 2000),
    "cart": (3.2, 1.6, 1.6, 2500),
    "barrel": (0.8, 0.8, 1.0, 800),
    "crate": (0.9, 0.9, 0.7, 400),
    "sack_pile": (1.2, 1.0, 0.8, 900),
    "brazier": (0.7, 0.7, 1.3, 1200),
    "tree": (4.0, 4.0, 7.0, 2500),
    "fence": (3.0, 0.2, 1.2, 600),
    "ground": (220.0, 220.0, 0.8, 14000),
}

# Also from design.md: the exact material names the importer turns into Unreal
# materials.
ALLOWED_MATERIALS = {
    "M_Plaster",
    "M_Timber",
    "M_RoofTile",
    "M_Thatch",
    "M_Stone",
    "M_Cobble",
    "M_Dirt",
    "M_Grass",
    "M_Wood",
    "M_Iron",
    "M_Canvas",
    "M_Leaf",
}

GLB_MAGIC = 0x46546C67
CHUNK_JSON = 0x4E4F534A
CHUNK_BIN = 0x004E4942
COMPONENT_SIZE = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}
TYPE_COUNT = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}
TRIANGLE_MODE = 4


class GlbError(RuntimeError):
    pass


class Glb:
    """Just enough glTF binary reading to measure a mesh independently."""

    def __init__(self, path: Path) -> None:
        self.path = path
        payload = path.read_bytes()
        if len(payload) < 12:
            raise GlbError(f"{path.name} is {len(payload)} bytes, too short to be a glTF binary")
        magic, version, length = struct.unpack_from("<III", payload, 0)
        if magic != GLB_MAGIC:
            raise GlbError(
                f"{path.name} does not start with the glTF magic number; it is not a .glb"
            )
        if version != 2:
            raise GlbError(f"{path.name} declares glTF container version {version}, expected 2")
        if length != len(payload):
            raise GlbError(
                f"{path.name} declares {length} bytes in its header but is {len(payload)} on disk"
            )
        self.json: dict | None = None
        self.bin = b""
        offset = 12
        while offset < len(payload):
            chunk_length, chunk_type = struct.unpack_from("<II", payload, offset)
            body = payload[offset + 8 : offset + 8 + chunk_length]
            if chunk_type == CHUNK_JSON:
                self.json = json.loads(body.decode("utf-8"))
            elif chunk_type == CHUNK_BIN:
                self.bin = body
            offset += 8 + chunk_length + (-chunk_length % 4)
        if self.json is None:
            raise GlbError(f"{path.name} has no JSON chunk")

    def accessor_min_max(self, index: int) -> tuple[list[float], list[float]]:
        accessor = self.json["accessors"][index]
        if "min" not in accessor or "max" not in accessor:
            raise GlbError(
                f"{self.path.name}: accessor {index} carries no min/max, so the bounds cannot "
                "be read; re-export with the Blender glTF exporter, which always writes them"
            )
        return list(accessor["min"]), list(accessor["max"])

    def accessor_count(self, index: int) -> int:
        return int(self.json["accessors"][index]["count"])

    def accessor_vec3(self, index: int) -> list[tuple[float, float, float]]:
        """Every VEC3 value in an accessor, read out of the binary chunk."""
        accessor = self.json["accessors"][index]
        if accessor.get("type") != "VEC3" or accessor.get("componentType") != 5126:
            raise GlbError(
                f"{self.path.name}: accessor {index} is "
                f"{accessor.get('type')}/{accessor.get('componentType')}, but vertex positions "
                "must be VEC3 of float (5126) to be read back"
            )
        if "sparse" in accessor:
            raise GlbError(
                f"{self.path.name}: accessor {index} is sparse, which this check does not read; "
                "export positions densely"
            )
        view = self.json["bufferViews"][accessor["bufferView"]]
        stride = view.get("byteStride", 3 * COMPONENT_SIZE[5126])
        base = view.get("byteOffset", 0) + accessor.get("byteOffset", 0)
        return [
            struct.unpack_from("<fff", self.bin, base + index_of * stride)
            for index_of in range(int(accessor["count"]))
        ]

    def nodes_with_meshes(self) -> list[dict]:
        return [node for node in self.json.get("nodes", []) if "mesh" in node]

    def measure(self) -> dict[str, object]:
        """Bounds in Blender metres, triangle count and material names."""
        meshes = self.json.get("meshes", [])
        if len(meshes) != 1:
            raise GlbError(
                f"{self.path.name} holds {len(meshes)} meshes; design.md asks for one object "
                "per asset"
            )
        triangles = 0
        materials: set[str] = set()
        vertices: list[tuple[float, float, float]] = []
        low = [float("inf")] * 3
        high = [float("-inf")] * 3
        declared_low = [float("inf")] * 3
        declared_high = [float("-inf")] * 3
        for primitive in meshes[0]["primitives"]:
            mode = primitive.get("mode", TRIANGLE_MODE)
            if mode != TRIANGLE_MODE:
                raise GlbError(
                    f"{self.path.name} has a primitive in mode {mode}; only mode "
                    f"{TRIANGLE_MODE} (triangles) is allowed, so the mesh must be triangulated"
                )
            attributes = primitive.get("attributes", {})
            for required in ("POSITION", "NORMAL", "TEXCOORD_0"):
                if required not in attributes:
                    raise GlbError(
                        f"{self.path.name} has a primitive without {required}; design.md asks "
                        "for normals and one UV set on every asset"
                    )
            if "indices" in primitive:
                triangles += self.accessor_count(primitive["indices"]) // 3
            else:
                triangles += self.accessor_count(attributes["POSITION"]) // 3
            # Measure the vertices themselves. The accessor's own min/max is
            # declared metadata: a file whose bounds disagreed with its geometry
            # would otherwise pass every envelope and origin check below.
            positions = self.accessor_vec3(attributes["POSITION"])
            if not positions:
                raise GlbError(
                    f"{self.path.name} has a primitive whose POSITION accessor holds no "
                    "vertices"
                )
            for point in positions:
                vertices.append((point[0], -point[2], point[1]))
                for axis in range(3):
                    low[axis] = min(low[axis], point[axis])
                    high[axis] = max(high[axis], point[axis])
            prim_low, prim_high = self.accessor_min_max(attributes["POSITION"])
            for axis in range(3):
                declared_low[axis] = min(declared_low[axis], prim_low[axis])
                declared_high[axis] = max(declared_high[axis], prim_high[axis])
            if "material" in primitive:
                materials.add(self.json["materials"][primitive["material"]]["name"])
        if low[0] == float("inf"):
            raise GlbError(f"{self.path.name} has no primitives to measure")
        declared_gap = max(
            max(abs(declared_low[axis] - low[axis]), abs(declared_high[axis] - high[axis]))
            for axis in range(3)
        )
        # glTF is +Y up and -Z forward; Blender authored +Z up and +Y front, so
        # blender_x = gltf_x, blender_y = -gltf_z, blender_z = gltf_y.
        return {
            "footprint_x": high[0] - low[0],
            "footprint_y": high[2] - low[2],
            "height": high[1] - low[1],
            "centre_x": 0.5 * (low[0] + high[0]),
            "centre_y": -0.5 * (low[2] + high[2]),
            "min_z": low[1],
            "triangles": triangles,
            "materials": sorted(materials),
            "vertices": vertices,
            "declared_gap": declared_gap,
            "declared_min": [declared_low[axis] for axis in range(3)],
            "declared_max": [declared_high[axis] for axis in range(3)],
            "actual_min": list(low),
            "actual_max": list(high),
            "cameras": len(self.json.get("cameras", [])),
            "skins": len(self.json.get("skins", [])),
            "lights": len(
                self.json.get("extensions", {})
                .get("KHR_lights_punctual", {})
                .get("lights", [])
            ),
        }


def rebuild(out_dir: Path) -> None:
    completed = subprocess.run(
        [sys.executable, str(BUILDER), "--out", str(out_dir)],
        capture_output=True,
        text=True,
        timeout=REBUILD_TIMEOUT_S,
        check=False,
    )
    if completed.returncode != 0:
        tail = (completed.stdout or "")[-2000:] + (completed.stderr or "")[-2000:]
        raise GlbError(
            f"re-running the generator into {out_dir} exited {completed.returncode}, so the "
            f"repeat-run comparison could not be made. Output tail:\n{tail}"
        )


def main() -> int:
    failures: list[str] = []

    def fail(message: str) -> None:
        failures.append(message)

    if sys.version_info[:2] != EXPECTED_PYTHON:
        print(
            f"ERROR: this gate targets CPython {EXPECTED_PYTHON[0]}.{EXPECTED_PYTHON[1]} but is "
            f"running under {sys.version.split()[0]}",
            file=sys.stderr,
        )
        return 2
    if not INVENTORY.is_file():
        print(
            f"ERROR: {INVENTORY} is missing; run `python tools/blender/build_assets.py` first",
            file=sys.stderr,
        )
        return 2

    document = json.loads(INVENTORY.read_text(encoding="utf-8"))
    for key in ("schema_version", "generator", "blender_version", "units", "axis", "materials", "assets"):
        if key not in document:
            fail(f"inventory.json: required key {key!r} is missing [bound: the inventory schema in design.md]")
    declared = document.get("assets", {})
    materials_block = document.get("materials", {})

    for name in sorted(ALLOWED_MATERIALS):
        entry = materials_block.get(name)
        if entry is None:
            fail(
                f"inventory.json materials: {name} is not recorded, so the importer cannot build "
                f"it; all {len(ALLOWED_MATERIALS)} design.md material names need an entry "
                "[bound: design.md material list]"
            )
            continue
        for field in ("base_color", "roughness", "metallic"):
            if field not in entry:
                fail(
                    f"inventory.json materials: {name} has no {field!r}; each entry needs "
                    "base_color, roughness and metallic [bound: the inventory schema in design.md]"
                )
    for name in sorted(set(materials_block) - ALLOWED_MATERIALS):
        fail(
            f"inventory.json materials: {name} is not one of the twelve names design.md fixes "
            "[bound: design.md material list]"
        )

    # 1. Inventory completeness, both ways.
    for name in sorted(set(ENVELOPE) - set(declared)):
        fail(
            f"{name}: the inventory does not declare this asset; design.md's table lists all "
            f"{len(ENVELOPE)} [bound: design.md asset inventory table]"
        )
    for name in sorted(set(declared) - set(ENVELOPE)):
        fail(
            f"{name}: the inventory declares an asset design.md's table does not list "
            "[bound: design.md asset inventory table]"
        )
    on_disk = {path.stem for path in sorted(ASSET_DIR.glob("*.glb"))}
    for name in sorted(on_disk - set(declared)):
        fail(
            f"{name}: {name}.glb is in {ASSET_DIR} but the inventory does not declare it; delete "
            "the stray file or declare it [bound: inventory completeness]"
        )
    for name in sorted(set(declared) - on_disk):
        fail(f"{name}: declared in the inventory but {name}.glb is not in {ASSET_DIR}")

    digests: dict[str, str] = {}
    for name in sorted(set(declared) & set(ENVELOPE) & on_disk):
        entry = declared[name]
        path = ASSET_DIR / entry.get("file", f"{name}.glb")
        payload = path.read_bytes()
        digest = hashlib.sha256(payload).hexdigest()
        digests[name] = digest

        # 2. Recorded digest and byte count against the file on disk.
        if entry.get("sha256") != digest:
            fail(
                f"{name}: inventory.json records sha256 {entry.get('sha256')} but {path.name} "
                f"hashes to {digest}; they must be equal [bound: sha256 of the exported bytes]"
            )
        if entry.get("bytes") != len(payload):
            fail(
                f"{name}: inventory.json records {entry.get('bytes')} bytes but {path.name} is "
                f"{len(payload)} bytes on disk; they must be equal [bound: byte count on disk]"
            )

        try:
            measured = Glb(path).measure()
        except GlbError as error:
            fail(str(error))
            continue

        want_x, want_y, want_height, budget = ENVELOPE[name]

        # 3. The accessor's declared bounds must agree with the vertices, so a
        # file cannot satisfy the envelope by misdeclaring them.
        if measured["declared_gap"] > DECLARED_BOUNDS_TOLERANCE_M:
            fail(
                f"{name}: {path.name} declares POSITION bounds "
                f"{[round(v, 4) for v in measured['declared_min']]} to "
                f"{[round(v, 4) for v in measured['declared_max']]} but its vertices span "
                f"{[round(v, 4) for v in measured['actual_min']]} to "
                f"{[round(v, 4) for v in measured['actual_max']]} in glTF axes, off by "
                f"{measured['declared_gap'] * 1000:.2f} mm. They must agree within "
                f"{DECLARED_BOUNDS_TOLERANCE_M * 1000:.1f} mm, because the import step reads "
                f"the declared bounds [bound: declared accessor min/max against the decoded "
                f"vertices of {path.name}]"
            )

        # 4. Footprint and height against the design.md envelope, measured from
        # the vertices.
        for axis, measured_value, want in (
            ("x", measured["footprint_x"], want_x),
            ("y", measured["footprint_y"], want_y),
        ):
            span = FOOTPRINT_TOLERANCE * want
            if abs(measured_value - want) > span:
                fail(
                    f"{name}: footprint {axis} is {measured_value:.3f} m, outside 15 per cent of "
                    f"the {want:.1f} m envelope; it must be between {want - span:.3f} and "
                    f"{want + span:.3f} m [bound: design.md inventory table, measured from "
                    f"{path.name}]"
                )
        span = HEIGHT_TOLERANCE * want_height
        if abs(measured["height"] - want_height) > span:
            fail(
                f"{name}: height is {measured['height']:.3f} m, outside 20 per cent of the "
                f"{want_height:.1f} m envelope; it must be between {want_height - span:.3f} and "
                f"{want_height + span:.3f} m [bound: design.md inventory table, measured from "
                f"{path.name}]"
            )

        # 5. Triangle budget.
        if measured["triangles"] > budget:
            fail(
                f"{name}: {measured['triangles']} triangles exceeds the budget of {budget}; it "
                f"must be at most {budget} [bound: design.md inventory table, counted from "
                f"{path.name} index accessors]"
            )

        # 6. Materials: declared, present, and nothing design.md does not list.
        used = set(measured["materials"])
        stray = sorted(used - ALLOWED_MATERIALS)
        if stray:
            fail(
                f"{name}: uses material(s) {', '.join(stray)} that design.md does not list; the "
                f"allowed names are {', '.join(sorted(ALLOWED_MATERIALS))} [bound: design.md "
                "material list]"
            )
        recorded = set(entry.get("materials", []))
        for missing in sorted(recorded - used):
            fail(
                f"{name}: inventory.json declares material {missing} but {path.name} does not "
                f"contain it; it holds {', '.join(sorted(used))} [bound: declared against "
                "exported materials]"
            )
        for undeclared in sorted(used - recorded):
            fail(
                f"{name}: {path.name} uses material {undeclared} but inventory.json does not "
                f"declare it; it declares {', '.join(sorted(recorded))} [bound: declared against "
                "exported materials]"
            )

        # 7. Origin at the footprint centre with the lowest point on Z=0.
        if abs(measured["min_z"]) > ORIGIN_TOLERANCE_M:
            fail(
                f"{name}: the lowest point is at Z = {measured['min_z'] * 1000:.2f} mm, not 0; it "
                f"must be within {ORIGIN_TOLERANCE_M * 1000:.0f} mm of Z = 0 so a placement "
                f"location sits on the ground [bound: design.md world frame, measured from "
                f"{path.name}]"
            )
        for axis, centre in (("x", measured["centre_x"]), ("y", measured["centre_y"])):
            if abs(centre) > ORIGIN_TOLERANCE_M:
                fail(
                    f"{name}: the footprint centre is {centre * 1000:.2f} mm off the origin on "
                    f"{axis}; it must be within {ORIGIN_TOLERANCE_M * 1000:.0f} mm "
                    f"[bound: design.md world frame, measured from {path.name}]"
                )

        # 8. The ground is exactly flat inside the box design.md fixes, because
        # everything else is placed at Z = 0 on top of it.
        if name == "ground":
            inside = [
                vertex
                for vertex in measured["vertices"]
                if abs(vertex[0]) <= FLAT_BOX_HALF_X and abs(vertex[1]) <= FLAT_BOX_HALF_Y
            ]
            if not inside:
                fail(
                    f"{name}: no vertices fall inside the "
                    f"{2 * FLAT_BOX_HALF_X:.0f} by {2 * FLAT_BOX_HALF_Y:.0f} m flat box, so "
                    "the ground does not cover the town [bound: design.md flat box]"
                )
            raised = [vertex for vertex in inside if abs(vertex[2]) > FLAT_TOLERANCE_M]
            if raised:
                worst = max(raised, key=lambda vertex: abs(vertex[2]))
                fail(
                    f"{name}: {len(raised)} of {len(inside)} vertices inside the flat box "
                    f"stand off Z = 0, the worst by {worst[2] * 1000:.1f} mm at "
                    f"x={worst[0]:.2f}, y={worst[1]:.2f} m. Every vertex with |x| <= "
                    f"{FLAT_BOX_HALF_X:.0f} and |y| <= {FLAT_BOX_HALF_Y:.0f} m must be "
                    f"within {FLAT_TOLERANCE_M * 1000:.0f} mm of Z = 0 so buildings placed "
                    f"at Z = 0 sit seated [bound: design.md flat box, measured from "
                    f"{path.name}]"
                )

        # 9. Nothing exported that design.md excludes.
        for kind in ("cameras", "skins", "lights"):
            if measured[kind]:
                fail(
                    f"{name}: {path.name} carries {measured[kind]} {kind}; design.md exports no "
                    "camera, light or armature [bound: exported glTF contents]"
                )

    # 10. Two consecutive generations must produce the same bytes.
    if digests:
        with tempfile.TemporaryDirectory(prefix="medieval-assets-") as temp:
            repeat_dir = Path(temp)
            try:
                rebuild(repeat_dir)
            except (GlbError, subprocess.TimeoutExpired) as error:
                fail(str(error))
            else:
                for name in sorted(digests):
                    repeat = repeat_dir / f"{name}.glb"
                    if not repeat.is_file():
                        fail(
                            f"{name}: the repeat generation did not write {name}.glb, so the two "
                            "runs cannot be compared [bound: repeat-run determinism]"
                        )
                        continue
                    again = hashlib.sha256(repeat.read_bytes()).hexdigest()
                    if again != digests[name]:
                        fail(
                            f"{name}: two consecutive generations differ -- first run hashes to "
                            f"{digests[name]}, repeat run to {again}; they must be equal, so the "
                            "generator still has unseeded randomness or unsorted iteration "
                            "[bound: repeat-run determinism, sha256 of the exported bytes]"
                        )

    if failures:
        print(f"FAIL: {len(failures)} problem(s) in {ASSET_DIR}", file=sys.stderr)
        for message in failures:
            print(f"  - {message}", file=sys.stderr)
        return 1
    print(
        f"PASS: {len(digests)} assets in {ASSET_DIR} match the design.md envelopes, triangle "
        "budgets, material names, origin rule and flat-ground box, and regenerate byte for byte."
    )
    print("Bound: this gate makes no claim about how the assets look, and none about Unreal.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
