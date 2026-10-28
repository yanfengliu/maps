"""The eighteen medieval city assets, built procedurally from parametric parts.

Sizes follow the inventory table in docs/work/2_medieval-city/design.md. Every
builder takes a seeded ``random.Random`` and iterates in a fixed order, so two
runs produce the same vertices in the same order and therefore the same bytes.
"""

from __future__ import annotations

import math
import random

from asset_geometry import (
    MeshData,
    arch_wall,
    beam,
    box,
    cone,
    cylinder,
    hexahedron,
    lathe,
    prism_x,
    prism_y,
    prism_z,
    rolled_cylinder,
    tapered_cylinder,
)

BASE_SEED = 20261027

# Material names are fixed by design.md; the values here are this generator's
# choice and are recorded in inventory.json so the importer can rebuild them.
MATERIALS: dict[str, dict[str, object]] = {
    "M_Plaster": {"base_color": [0.84, 0.79, 0.69], "roughness": 0.9, "metallic": 0.0},
    "M_Timber": {"base_color": [0.13, 0.09, 0.06], "roughness": 0.8, "metallic": 0.0},
    "M_RoofTile": {"base_color": [0.4, 0.16, 0.12], "roughness": 0.75, "metallic": 0.0},
    "M_Thatch": {"base_color": [0.6, 0.47, 0.23], "roughness": 0.95, "metallic": 0.0},
    "M_Stone": {"base_color": [0.56, 0.55, 0.52], "roughness": 0.85, "metallic": 0.0},
    "M_Cobble": {"base_color": [0.36, 0.35, 0.34], "roughness": 0.8, "metallic": 0.0},
    "M_Dirt": {"base_color": [0.35, 0.27, 0.18], "roughness": 0.95, "metallic": 0.0},
    "M_Grass": {"base_color": [0.25, 0.35, 0.15], "roughness": 0.9, "metallic": 0.0},
    "M_Wood": {"base_color": [0.4, 0.26, 0.14], "roughness": 0.75, "metallic": 0.0},
    "M_Iron": {"base_color": [0.24, 0.24, 0.26], "roughness": 0.45, "metallic": 1.0},
    "M_Canvas": {"base_color": [0.78, 0.72, 0.6], "roughness": 0.85, "metallic": 0.0},
    "M_Leaf": {"base_color": [0.19, 0.33, 0.13], "roughness": 0.7, "metallic": 0.0},
}

PLASTER = "M_Plaster"
TIMBER = "M_Timber"
TILE = "M_RoofTile"
THATCH = "M_Thatch"
STONE = "M_Stone"
COBBLE = "M_Cobble"
DIRT = "M_Dirt"
GRASS = "M_Grass"
WOOD = "M_Wood"
IRON = "M_Iron"
CANVAS = "M_Canvas"
LEAF = "M_Leaf"


# ---------------------------------------------------------------------------
# shared building parts
# ---------------------------------------------------------------------------
def _wall_mapper(axis: str, sign: float, half: float):
    """Map (along-wall, outward, height) to world coordinates on one facade.

    ``half`` is the positive distance from the origin to the wall plane and
    ``sign`` picks the facade, so ``n`` always grows outwards. Passing a signed
    wall coordinate here would put the -Y and -X framing inside the opposite
    wall, which is how the first previews came out with two blank facades.
    """
    if half < 0.0:
        raise ValueError(
            f"_wall_mapper takes the positive half extent and a sign, got half={half}; "
            "pass abs() of the wall coordinate and set sign to -1.0 for the far face"
        )
    if axis == "y":
        return lambda u, n, z: (u, sign * (half + n), z)
    if axis == "x":
        return lambda u, n, z: (sign * (half + n), u, z)
    raise ValueError(f"wall axis must be 'x' or 'y', got {axis!r}")


def _face_box(mesh, mapper, u0, u1, n0, n1, z0, z1, material):
    box(mesh, mapper(u0, n0, z0), mapper(u1, n1, z1), material)


def _stone_plinth(mesh: MeshData, rng: random.Random, hw: float, hd: float, top: float) -> None:
    """Rough stone base course, laid as a few blocks so the line is not flat."""
    box(mesh, (-hw, -hd, 0.0), (hw, hd, top * 0.72), STONE, skip=("bottom",))
    blocks = 7
    for index in range(blocks):
        x0 = -hw + 2.0 * hw * index / blocks
        x1 = -hw + 2.0 * hw * (index + 1) / blocks
        rise = top + rng.uniform(-0.035, 0.035)
        box(mesh, (x0, -hd, top * 0.6), (x1, hd, rise), STONE, skip=("bottom",))


def _timber_storey(
    mesh: MeshData,
    rng: random.Random,
    hw: float,
    hd: float,
    z0: float,
    z1: float,
    stud_spacing: float = 1.15,
    braces: bool = True,
) -> None:
    """Plaster panels inside a dark exposed timber frame, slightly out of true."""
    protrude = 0.07
    lean_x = rng.uniform(-0.045, 0.045)
    lean_y = rng.uniform(-0.045, 0.045)
    bottom = [(-hw, -hd, z0), (hw, -hd, z0), (hw, hd, z0), (-hw, hd, z0)]
    top = [
        (-hw + lean_x, -hd + lean_y, z1),
        (hw + lean_x, -hd + lean_y, z1),
        (hw + lean_x, hd + lean_y, z1),
        (-hw + lean_x, hd + lean_y, z1),
    ]
    hexahedron(mesh, bottom, top, PLASTER, skip=("bottom",))

    post = 0.19
    for sx in (-1.0, 1.0):
        for sy in (-1.0, 1.0):
            box(
                mesh,
                (sx * hw - sx * post, sy * hd - sy * post, z0),
                (sx * (hw + protrude), sy * (hd + protrude), z1),
                TIMBER,
            )

    sill = 0.23
    plate = 0.25
    for axis, sign, wall, half in (
        ("y", 1.0, hd, hw),
        ("y", -1.0, hd, hw),
        ("x", 1.0, hw, hd),
        ("x", -1.0, hw, hd),
    ):
        mapper = _wall_mapper(axis, sign, wall)
        _face_box(mesh, mapper, -half, half, -0.02, protrude, z0, z0 + sill, TIMBER)
        _face_box(mesh, mapper, -half, half, -0.02, protrude, z1 - plate, z1, TIMBER)
        mid = z0 + 0.52 * (z1 - z0)
        _face_box(mesh, mapper, -half, half, -0.02, protrude * 0.8, mid - 0.1, mid + 0.1, TIMBER)
        studs = max(2, int(round(2.0 * half / stud_spacing)) - 1)
        for index in range(studs):
            centre = -half + 2.0 * half * (index + 1) / (studs + 1)
            jitter = rng.uniform(-0.05, 0.05)
            _face_box(
                mesh,
                mapper,
                centre + jitter - 0.09,
                centre + jitter + 0.09,
                -0.02,
                protrude,
                z0 + sill,
                z1 - plate,
                TIMBER,
            )
        if braces:
            for side in (-1.0, 1.0):
                start = mapper(side * (half - 0.22), protrude * 0.5, z0 + sill)
                end = mapper(side * (half - 0.22) - side * 0.9, protrude * 0.5, mid - 0.1)
                beam(mesh, start, end, 0.16, 0.14, TIMBER)


def _jetty_brackets(mesh: MeshData, hw: float, hd: float, z: float, reach: float) -> None:
    """Curved brackets under an overhanging upper floor."""
    for index in range(4):
        x = -hw + 0.6 + (2.0 * hw - 1.2) * index / 3.0
        for sign in (-1.0, 1.0):
            beam(
                mesh,
                (x, sign * (hd - reach), z - 0.55),
                (x, sign * (hd + 0.02), z + 0.05),
                0.17,
                0.17,
                TIMBER,
            )
    for sign in (-1.0, 1.0):
        box(
            mesh,
            (-hw - 0.02, sign * (hd - 0.04), z - 0.26),
            (hw + 0.02, sign * (hd + 0.1), z + 0.04),
            TIMBER,
        )


def _tiled_gable_roof(
    mesh: MeshData,
    rng: random.Random,
    hw: float,
    hd: float,
    z_eave: float,
    z_ridge: float,
    slope_material: str = TILE,
    gable_material: str = PLASTER,
    courses: int = 8,
    segments: int = 3,
    verge: float = 0.26,
    eave_overhang: float = 0.32,
    thatch: bool = False,
) -> None:
    """Steep gable roof with a ridge along X, laid up as overlapping courses.

    The ridge height wanders a few centimetres per segment and each course
    stands proud of the one below, so the slope carries real relief rather than
    a flat plane.
    """
    ridge_at = [z_ridge + rng.uniform(-0.05, 0.05) for _ in range(segments + 1)]
    eave_at = [z_eave + rng.uniform(-0.03, 0.03) for _ in range(segments + 1)]
    xs = [-hw + 2.0 * hw * index / segments for index in range(segments + 1)]

    # Solid mass under the courses, with the gable triangles as its end caps.
    prism_x(
        mesh,
        [(-hd, z_eave - 0.12), (hd, z_eave - 0.12), (0.0, z_ridge - 0.06)],
        -hw,
        hw,
        slope_material,
        gable_material,
    )

    lift = 0.06 if not thatch else 0.1
    thick = 0.13 if not thatch else 0.3
    for slope in (1.0, -1.0):
        for course in range(courses):
            t0 = course / courses
            t1 = (course + 1) / courses
            for seg in range(segments):
                x_lo, x_hi = xs[seg], xs[seg + 1]
                if seg == 0:
                    x_lo -= verge
                if seg == segments - 1:
                    x_hi += verge
                pts = []
                for t in (t1, t0):
                    for x_edge, ridge, eave in (
                        (x_lo, ridge_at[seg], eave_at[seg]),
                        (x_hi, ridge_at[seg + 1], eave_at[seg + 1]),
                    ):
                        y = slope * hd * (1.0 - t)
                        z = eave + (ridge - eave) * t
                        if course == 0:
                            y += slope * eave_overhang * (1.0 - t / t1 if t1 > 0 else 0.0)
                            z -= 0.1 * (1.0 - t / t1 if t1 > 0 else 0.0)
                        pts.append((x_edge, y, z))
                a, b, c, d = pts[0], pts[1], pts[3], pts[2]
                if slope < 0.0:
                    a, b, c, d = d, c, b, a
                upper = [(p[0], p[1], p[2] + lift) for p in (a, b, c, d)]
                lower = [(p[0], p[1], p[2] + lift - thick) for p in (a, b, c, d)]
                ripple = rng.uniform(-0.05, 0.05) if thatch else rng.uniform(-0.012, 0.012)
                upper = [(p[0], p[1], p[2] + ripple) for p in upper]
                hexahedron(mesh, lower, upper, slope_material)

    # Ridge cap riding the wandering ridge line.
    for seg in range(segments):
        x_lo, x_hi = xs[seg], xs[seg + 1]
        cap_lo = [
            (x_lo, -0.22, ridge_at[seg] - 0.06),
            (x_hi, -0.22, ridge_at[seg + 1] - 0.06),
            (x_hi, 0.22, ridge_at[seg + 1] - 0.06),
            (x_lo, 0.22, ridge_at[seg] - 0.06),
        ]
        cap_hi = [
            (x_lo, -0.16, ridge_at[seg] + 0.14),
            (x_hi, -0.16, ridge_at[seg + 1] + 0.14),
            (x_hi, 0.16, ridge_at[seg + 1] + 0.14),
            (x_lo, 0.16, ridge_at[seg] + 0.14),
        ]
        hexahedron(mesh, cap_lo, cap_hi, slope_material)

    # Barge boards along the two verges.
    for sign in (-1.0, 1.0):
        for slope in (1.0, -1.0):
            start = (sign * (hw + verge), slope * (hd + eave_overhang), z_eave - 0.12)
            end = (sign * (hw + verge), 0.0, z_ridge + 0.04)
            beam(mesh, start, end, 0.14, 0.2, TIMBER)


def _shuttered_window(
    mesh: MeshData,
    rng: random.Random,
    axis: str,
    sign: float,
    wall: float,
    along: float,
    z0: float,
    width: float = 0.78,
    height: float = 0.92,
    sill_material: str = STONE,
) -> None:
    mapper = _wall_mapper(axis, sign, wall)
    u0, u1 = along - 0.5 * width, along + 0.5 * width
    z1 = z0 + height
    _face_box(mesh, mapper, u0, u1, -0.2, -0.05, z0, z1, TIMBER)
    frame = 0.09
    _face_box(mesh, mapper, u0 - frame, u1 + frame, -0.04, 0.05, z1, z1 + frame, TIMBER)
    _face_box(mesh, mapper, u0 - frame, u0, -0.04, 0.05, z0, z1, TIMBER)
    _face_box(mesh, mapper, u1, u1 + frame, -0.04, 0.05, z0, z1, TIMBER)
    _face_box(
        mesh, mapper, u0 - frame - 0.07, u1 + frame + 0.07, -0.03, 0.12, z0 - 0.09, z0, sill_material
    )
    leaf = 0.5 * width - 0.01
    for side in (-1.0, 1.0):
        base = along + side * (0.5 * width - 0.5 * leaf)
        swing = rng.uniform(0.0, 0.05)
        _face_box(
            mesh,
            mapper,
            base - 0.5 * leaf,
            base + 0.5 * leaf,
            0.04 + swing,
            0.1 + swing,
            z0 + 0.02,
            z1 - 0.02,
            TIMBER,
        )
        for bar in range(2):
            z_bar = z0 + 0.18 + bar * (height - 0.42)
            _face_box(
                mesh,
                mapper,
                base - 0.5 * leaf,
                base + 0.5 * leaf,
                0.1 + swing,
                0.13 + swing,
                z_bar,
                z_bar + 0.07,
                IRON,
            )


def _plank_door(
    mesh: MeshData,
    axis: str,
    sign: float,
    wall: float,
    along: float,
    width: float = 1.1,
    height: float = 2.1,
) -> None:
    mapper = _wall_mapper(axis, sign, wall)
    u0, u1 = along - 0.5 * width, along + 0.5 * width
    _face_box(mesh, mapper, u0, u1, -0.22, -0.06, 0.0, height, TIMBER)
    for plank in range(4):
        pu0 = u0 + width * plank / 4.0 + 0.012
        pu1 = u0 + width * (plank + 1) / 4.0 - 0.012
        _face_box(mesh, mapper, pu0, pu1, -0.06, 0.02, 0.02, height - 0.02, WOOD)
    for bar in range(2):
        z_bar = 0.35 + bar * 1.2
        _face_box(mesh, mapper, u0 + 0.03, u1 - 0.03, 0.02, 0.05, z_bar, z_bar + 0.09, IRON)
    _face_box(mesh, mapper, u0 - 0.12, u1 + 0.12, -0.05, 0.12, height, height + 0.18, TIMBER)


def _chimney(
    mesh: MeshData, rng: random.Random, x: float, y: float, z_base: float, z_top: float
) -> None:
    half = 0.36
    box(mesh, (x - half, y - half, z_base), (x + half, y + half, z_top - 0.22), STONE)
    for course in range(3):
        z0 = z_top - 0.22 + course * 0.07
        grow = 0.04 * (course + 1) + rng.uniform(-0.01, 0.01)
        box(
            mesh,
            (x - half - grow, y - half - grow, z0),
            (x + half + grow, y + half + grow, z0 + 0.07),
            STONE,
        )
    box(mesh, (x - 0.14, y - 0.14, z_top - 0.02), (x + 0.14, y + 0.14, z_top + 0.02), TIMBER)


def _crenellated_parapet(
    mesh: MeshData,
    rng: random.Random,
    x0: float,
    x1: float,
    y0: float,
    y1: float,
    z_base: float,
    merlon_top: float,
    merlon: float = 0.95,
    embrasure: float = 0.62,
    axis: str = "x",
) -> None:
    """One run of real merlons with gaps between them, not a solid band.

    ``axis`` picks which way the run is cut, so a tower can be ringed by four
    runs instead of being capped by two long bars.
    """
    if axis not in ("x", "y"):
        raise ValueError(f"a parapet run is cut along 'x' or 'y', got {axis!r}")
    lo, hi = (x0, x1) if axis == "x" else (y0, y1)
    span = hi - lo
    pitch = merlon + embrasure
    count = max(2, int(round((span + embrasure) / pitch)))
    pitch = span / count
    merlon_width = pitch * merlon / (merlon + embrasure)
    box(mesh, (x0, y0, z_base), (x1, y1, z_base + 0.2), STONE)
    for index in range(count):
        centre = lo + pitch * (index + 0.5)
        top = merlon_top + rng.uniform(-0.03, 0.03)
        if axis == "x":
            low = (centre - 0.5 * merlon_width, y0, z_base + 0.2)
            high = (centre + 0.5 * merlon_width, y1, top)
        else:
            low = (x0, centre - 0.5 * merlon_width, z_base + 0.2)
            high = (x1, centre + 0.5 * merlon_width, top)
        box(mesh, low, high, STONE)


def _crenellated_rect(
    mesh: MeshData,
    rng: random.Random,
    x0: float,
    x1: float,
    y0: float,
    y1: float,
    z_base: float,
    merlon_top: float,
    thickness: float,
    merlon: float = 0.8,
    embrasure: float = 0.5,
) -> None:
    """Four parapet runs around a tower head, so every side is crenellated."""
    _crenellated_parapet(
        mesh, rng, x0, x1, y0, y0 + thickness, z_base, merlon_top, merlon, embrasure, "x"
    )
    _crenellated_parapet(
        mesh, rng, x0, x1, y1 - thickness, y1, z_base, merlon_top, merlon, embrasure, "x"
    )
    for side_x0, side_x1 in ((x0, x0 + thickness), (x1 - thickness, x1)):
        _crenellated_parapet(
            mesh,
            rng,
            side_x0,
            side_x1,
            y0 + thickness,
            y1 - thickness,
            z_base,
            merlon_top,
            merlon,
            embrasure,
            "y",
        )


def _ring_crenellation(
    mesh: MeshData,
    rng: random.Random,
    centre: tuple[float, float],
    radius: float,
    z_base: float,
    z_top: float,
    merlons: int = 10,
) -> None:
    cylinder(mesh, centre, radius, z_base, z_base + 0.18, merlons * 2, STONE)
    for index in range(merlons):
        angle = 2.0 * math.pi * index / merlons
        half = math.pi / merlons * 0.62
        profile = []
        for step in range(4):
            a = angle - half + 2.0 * half * step / 3.0
            profile.append((centre[0] + radius * math.cos(a), centre[1] + radius * math.sin(a)))
        for step in range(3, -1, -1):
            a = angle - half + 2.0 * half * step / 3.0
            inner = radius - 0.26
            profile.append((centre[0] + inner * math.cos(a), centre[1] + inner * math.sin(a)))
        prism_z(mesh, profile, z_base + 0.18, z_top + rng.uniform(-0.03, 0.03), STONE)


def _arrow_slit(mesh: MeshData, centre: tuple[float, float], angle: float, z0: float) -> None:
    radial = (math.cos(angle), math.sin(angle))
    x = centre[0] + radial[0] * 1.9
    y = centre[1] + radial[1] * 1.9
    box(mesh, (x - 0.12, y - 0.12, z0), (x + 0.12, y + 0.12, z0 + 0.95), TIMBER)


# ---------------------------------------------------------------------------
# the assets
# ---------------------------------------------------------------------------
def build_house_a(rng: random.Random) -> MeshData:
    mesh = MeshData()
    hw, hd = 3.5, 3.0
    verge, eaves = 0.26, 0.3
    hw_u, hd_u = hw - verge, hd - eaves
    hw_g, hd_g = hw_u - 0.42, hd_u - 0.42
    _stone_plinth(mesh, rng, hw_g + 0.12, hd_g + 0.12, 0.52)
    _timber_storey(mesh, rng, hw_g, hd_g, 0.46, 3.3)
    _jetty_brackets(mesh, hw_g, hd_u, 3.3, 0.5)
    _timber_storey(mesh, rng, hw_u, hd_u, 3.3, 5.9)
    _tiled_gable_roof(mesh, rng, hw_u, hd_u, 5.9, 8.05, courses=9)
    _plank_door(mesh, "y", 1.0, hd_g, -1.55, width=1.12, height=2.12)
    for along in (0.35, 1.75):
        _shuttered_window(mesh, rng, "y", 1.0, hd_g, along, 1.15)
    for along in (-1.9, -0.4, 1.1, 2.3):
        _shuttered_window(mesh, rng, "y", 1.0, hd_u, along, 3.9)
    for along in (-1.1, 1.1):
        _shuttered_window(mesh, rng, "y", -1.0, hd_u, along, 3.9)
    _shuttered_window(mesh, rng, "x", 1.0, hw_u, 0.0, 3.95, width=0.6, height=0.8)
    _chimney(mesh, rng, hw_u - 0.55, 0.4, 4.6, 8.5)
    mesh.place_on_ground()
    return mesh


def build_house_b(rng: random.Random) -> MeshData:
    mesh = MeshData()
    hw, hd = 2.5, 3.25
    verge, eaves = 0.24, 0.28
    hw_3, hd_3 = hw - verge, hd - eaves
    hw_2, hd_2 = hw_3 - 0.3, hd_3 - 0.3
    hw_1, hd_1 = hw_2 - 0.3, hd_2 - 0.3
    _stone_plinth(mesh, rng, hw_1 + 0.11, hd_1 + 0.11, 0.6)
    _timber_storey(mesh, rng, hw_1, hd_1, 0.54, 3.3, stud_spacing=1.0)
    _jetty_brackets(mesh, hw_1, hd_2, 3.3, 0.38)
    _timber_storey(mesh, rng, hw_2, hd_2, 3.3, 6.0, stud_spacing=1.0)
    _jetty_brackets(mesh, hw_2, hd_3, 6.0, 0.38)
    _timber_storey(mesh, rng, hw_3, hd_3, 6.0, 8.5, stud_spacing=1.0)
    _tiled_gable_roof(mesh, rng, hw_3, hd_3, 8.5, 10.6, courses=8, segments=2)
    _plank_door(mesh, "y", 1.0, hd_1, -0.5, width=1.05, height=2.1)
    _shuttered_window(mesh, rng, "y", 1.0, hd_1, 1.1, 1.3, width=0.9)
    for z0 in (3.95, 6.65):
        for along in (-1.0, 0.9):
            _shuttered_window(mesh, rng, "y", 1.0, hd_3, along, z0)
        _shuttered_window(mesh, rng, "y", -1.0, hd_3, 0.0, z0, width=0.66)
    _chimney(mesh, rng, 0.0, -hd_3 + 0.5, 7.2, 11.0)
    mesh.place_on_ground()
    return mesh


def build_house_c(rng: random.Random) -> MeshData:
    mesh = MeshData()
    hw, hd = 4.5, 3.0
    verge, eaves = 0.3, 0.3
    hw_u, hd_u = hw - verge, hd - eaves
    hw_g, hd_g = hw_u - 0.4, hd_u - 0.4
    _stone_plinth(mesh, rng, hw_g + 0.12, hd_g + 0.12, 0.44)
    _timber_storey(mesh, rng, hw_g, hd_g, 0.38, 3.4, stud_spacing=1.3)
    _jetty_brackets(mesh, hw_g, hd_u, 3.4, 0.46)
    _timber_storey(mesh, rng, hw_u, hd_u, 3.4, 5.7, stud_spacing=1.3)
    _tiled_gable_roof(mesh, rng, hw_u, hd_u, 5.7, 7.55, courses=8, segments=4)
    # Shopfront: wide counter opening under a canvas awning on the +Y facade.
    box(mesh, (-2.6, hd_g - 0.3, 0.9), (0.9, hd_g + 0.12, 1.2), WOOD)
    box(mesh, (-2.65, hd_g - 0.26, 1.2), (0.95, hd_g - 0.06, 2.5), TIMBER)
    for x in (-2.6, -0.85, 0.9):
        box(mesh, (x - 0.1, hd_g + 0.02, 0.0), (x + 0.1, hd_g + 0.22, 1.2), TIMBER)
    for x in (-2.75, 1.05):
        beam(mesh, (x, hd_g + 0.05, 2.45), (x, hd_g + 1.0, 1.82), 0.11, 0.11, TIMBER)
    awning_lo = [
        (-2.9, hd_g + 0.02, 2.5),
        (1.2, hd_g + 0.02, 2.5),
        (1.2, hd_g + 1.15, 1.79),
        (-2.9, hd_g + 1.15, 1.79),
    ]
    awning_hi = [(p[0], p[1], p[2] + 0.07) for p in awning_lo]
    hexahedron(mesh, awning_lo, awning_hi, CANVAS)
    for index in range(5):
        x = -2.9 + 4.1 * (index + 0.5) / 5.0
        batten_lo = [
            (x - 0.08, hd_g + 0.02, 2.56),
            (x + 0.08, hd_g + 0.02, 2.56),
            (x + 0.08, hd_g + 1.17, 1.85),
            (x - 0.08, hd_g + 1.17, 1.85),
        ]
        batten_hi = [(p[0], p[1], p[2] + 0.05) for p in batten_lo]
        hexahedron(mesh, batten_lo, batten_hi, TIMBER)
    _plank_door(mesh, "y", 1.0, hd_g, 2.75, width=1.1, height=2.15)
    _shuttered_window(mesh, rng, "y", 1.0, hd_g, -3.4, 1.3, width=0.85)
    for along in (-3.3, -1.7, -0.1, 1.5, 3.1):
        _shuttered_window(mesh, rng, "y", 1.0, hd_u, along, 3.95)
    for along in (-2.4, 0.0, 2.4):
        _shuttered_window(mesh, rng, "y", -1.0, hd_u, along, 3.95)
    _chimney(mesh, rng, -hw_u + 0.6, -0.5, 4.4, 8.0)
    mesh.place_on_ground()
    return mesh


def build_cottage(rng: random.Random) -> MeshData:
    mesh = MeshData()
    hw, hd = 3.0, 2.5
    verge, eaves = 0.34, 0.4
    hw_w, hd_w = hw - verge, hd - eaves
    _stone_plinth(mesh, rng, hw_w + 0.1, hd_w + 0.1, 0.9)
    _timber_storey(mesh, rng, hw_w, hd_w, 0.8, 2.5, stud_spacing=1.25, braces=True)
    _tiled_gable_roof(
        mesh,
        rng,
        hw_w,
        hd_w,
        2.5,
        4.45,
        slope_material=THATCH,
        gable_material=PLASTER,
        courses=6,
        segments=3,
        verge=verge,
        eave_overhang=0.46,
        thatch=True,
    )
    _plank_door(mesh, "y", 1.0, hd_w, -0.75, width=1.0, height=2.02)
    _shuttered_window(mesh, rng, "y", 1.0, hd_w, 1.1, 1.3, width=0.72, height=0.72)
    _shuttered_window(mesh, rng, "y", -1.0, hd_w, 0.2, 1.3, width=0.72, height=0.72)
    _chimney(mesh, rng, -hw_w + 0.45, 0.0, 2.1, 5.0)
    mesh.place_on_ground()
    return mesh


def build_wall_segment(rng: random.Random) -> MeshData:
    mesh = MeshData()
    hw = 4.0
    outer_y, inner_y = 0.8, -0.2
    # Battered curtain wall: wider at the base than at the walkway.
    walk_top = 4.8
    base = [(-hw, inner_y - 0.1, 0.0), (hw, inner_y - 0.1, 0.0), (hw, outer_y, 0.0), (-hw, outer_y, 0.0)]
    top = [
        (-hw, inner_y, walk_top),
        (hw, inner_y, walk_top),
        (hw, outer_y - 0.16, walk_top),
        (-hw, outer_y - 0.16, walk_top),
    ]
    hexahedron(mesh, base, top, STONE, skip=("bottom",))
    # Stone courses so the face is not one flat slab.
    for course in range(8):
        z0 = 0.25 + course * 0.56
        inset = 0.02 + 0.02 * (course % 2) + rng.uniform(0.0, 0.015)
        box(
            mesh,
            (-hw, outer_y - 0.2 - inset, z0),
            (hw, outer_y - inset + 0.015, z0 + 0.2),
            STONE,
        )
    # Timber walkway on the inner face at 4.8 m, carried on corbels.
    box(mesh, (-hw, -0.8, walk_top - 0.25), (hw, inner_y + 0.05, walk_top), WOOD)
    for index in range(6):
        x = -hw + 0.7 + (2.0 * hw - 1.4) * index / 5.0
        beam(mesh, (x, -0.72, 3.85), (x, inner_y - 0.02, walk_top - 0.25), 0.16, 0.16, TIMBER)
    for index in range(7):
        x = -hw + 2.0 * hw * index / 6.0
        box(mesh, (x - 0.07, -0.82, walk_top), (x + 0.07, -0.72, walk_top + 0.7), TIMBER)
    box(mesh, (-hw, -0.84, walk_top + 0.65), (hw, -0.7, walk_top + 0.78), TIMBER)
    _crenellated_parapet(
        mesh, rng, -hw, hw, -0.24, outer_y - 0.1, walk_top, 6.0, merlon=1.0, embrasure=0.66
    )
    mesh.place_on_ground()
    return mesh


def build_wall_tower(rng: random.Random) -> MeshData:
    mesh = MeshData()
    centre = (0.0, 0.0)
    segments = 14
    lathe(
        mesh,
        [(2.25, 0.0), (2.08, 1.4), (1.98, 6.9)],
        segments,
        STONE,
        centre=centre,
    )
    for course in range(6):
        z0 = 1.6 + course * 0.85
        radius = 2.02 + rng.uniform(0.0, 0.02)
        lathe(mesh, [(radius, z0), (radius, z0 + 0.22)], segments, STONE, centre=centre)
    for index in range(3):
        _arrow_slit(mesh, centre, 2.0 * math.pi * index / 3.0 + 0.3, 2.6 + index * 0.3)
    # Corbel ring carrying the fighting platform.
    lathe(mesh, [(1.98, 6.7), (2.24, 7.05), (2.24, 7.2)], segments, STONE, centre=centre)
    _ring_crenellation(mesh, rng, centre, 2.24, 7.2, 8.05, merlons=9)
    lathe(mesh, [(2.0, 8.0), (2.3, 8.12)], segments, WOOD, centre=centre)
    cone(mesh, centre, 2.3, 8.05, 9.0, segments, TILE)
    for course in range(3):
        t0 = course / 3.0
        t1 = (course + 1) / 3.0
        lathe(
            mesh,
            [
                (2.3 * (1.0 - t0) + 0.06, 8.05 + 0.95 * t0),
                (2.3 * (1.0 - t1) + 0.06, 8.05 + 0.95 * t1),
            ],
            segments,
            TILE,
            centre=centre,
        )
    mesh.place_on_ground()
    return mesh


# A 2 m character walks the gate, so the passage has to stay empty. The
# character capsule in design.md is 0.34 m in radius, so 2.3 m of width leaves
# room on both sides even when it hugs one jamb.
PASSAGE_HALF_WIDTH = 1.15
PASSAGE_HEIGHT = 2.6


def _segment_hits_box(
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    low: tuple[float, float, float],
    high: tuple[float, float, float],
) -> bool:
    """Slab test: does the segment pass through the axis-aligned box?"""
    enter, leave = 0.0, 1.0
    for axis in range(3):
        delta = end[axis] - start[axis]
        if abs(delta) < 1e-12:
            if start[axis] < low[axis] or start[axis] > high[axis]:
                return False
            continue
        t0 = (low[axis] - start[axis]) / delta
        t1 = (high[axis] - start[axis]) / delta
        if t0 > t1:
            t0, t1 = t1, t0
        enter = max(enter, t0)
        leave = min(leave, t1)
        if enter > leave:
            return False
    return True


def _check_gate_clearance(mesh: MeshData, half_width: float, height: float) -> None:
    """Fail the build if anything stands in the gate passage.

    Bound: this tests every mesh edge against the corridor box, which catches a
    portcullis bar or a door leaf dropped across the opening even when its
    vertices sit outside. A face large enough to span the corridor with all four
    corners beyond it would slip through, and it is not a collision simulation.
    """
    low = (-half_width, min(vert[1] for vert in mesh.verts) - 1.0, 0.02)
    high = (half_width, max(vert[1] for vert in mesh.verts) + 1.0, height)
    for face in mesh.faces:
        for index in range(len(face)):
            start = mesh.verts[face[index]]
            end = mesh.verts[face[(index + 1) % len(face)]]
            if _segment_hits_box(start, end, low, high):
                raise ValueError(
                    f"the gatehouse passage is blocked: an edge from "
                    f"({start[0]:.2f}, {start[1]:.2f}, {start[2]:.2f}) to "
                    f"({end[0]:.2f}, {end[1]:.2f}, {end[2]:.2f}) m crosses the "
                    f"{2 * half_width:.2f} m by {height:.2f} m walking corridor. Nothing may "
                    "sit in the opening below the crown, so raise it or move it onto a tower "
                    "face"
                )


def build_gatehouse(rng: random.Random) -> MeshData:
    mesh = MeshData()
    hd = 2.5
    # Central block with a real arched opening a 2 m character walks through:
    # 3.0 m wide, springing at 2.5 m, crown at 4.0 m.
    crown = arch_wall(
        mesh,
        -2.7,
        2.7,
        -hd,
        hd,
        0.0,
        9.6,
        1.5,
        2.5,
        STONE,
        segments=10,
        reveal_material=STONE,
    )
    if crown < 3.4:
        raise ValueError(f"gatehouse arch crown {crown:.2f} m is below the 3.4 m clear head needed")
    opening_half, springing = 1.5, 2.5
    for course in range(9):
        z0 = 0.3 + course * 1.0
        inset = 0.02 + rng.uniform(0.0, 0.02)
        # A course band must stop at the arch jambs; running it across the mouth
        # both looks wrong and blocks the passage.
        if z0 >= crown:
            gap = 0.0
        elif z0 + 0.3 <= springing:
            gap = opening_half
        else:
            rise = max(0.0, z0 - springing)
            gap = math.sqrt(max(0.0, opening_half**2 - rise**2))
        spans = (
            [(-2.7, 2.7)]
            if gap <= 0.0
            else [(-2.7, -gap - 0.08), (gap + 0.08, 2.7)]
        )
        for x_lo, x_hi in spans:
            for sign in (-1.0, 1.0):
                box(
                    mesh,
                    (x_lo, sign * (hd - 0.2 - inset), z0),
                    (x_hi, sign * (hd - inset + 0.012), z0 + 0.3),
                    STONE,
                )
    # Machicolation corbels over the gate, then the parapet. The reach is held
    # to 0.5 m so the asset stays inside the 5.0 m envelope on Y.
    for index in range(7):
        x = -2.4 + 4.8 * index / 6.0
        beam(mesh, (x, hd - 0.1, 8.6), (x, hd + 0.45, 9.1), 0.22, 0.2, STONE)
    box(mesh, (-2.72, hd - 0.1, 9.1), (2.72, hd + 0.5, 9.6), STONE)
    _crenellated_parapet(mesh, rng, -2.72, 2.72, hd - 0.1, hd + 0.5, 9.6, 10.5)
    box(mesh, (-2.7, -hd, 9.6), (2.7, hd - 0.1, 9.9), WOOD)
    # Portcullis, raised into the head of the arch. It has to stay above the
    # passage: the gate is a walkable route, not a grille.
    for index in range(7):
        x = -1.35 + 2.7 * index / 6.0
        box(mesh, (x - 0.05, hd - 0.42, 2.95), (x + 0.05, hd - 0.32, 3.92), IRON)
    for index in range(2):
        z = 3.1 + index * 0.62
        box(mesh, (-1.4, hd - 0.42, z), (1.4, hd - 0.32, z + 0.1), IRON)
    # Flanking towers.
    for sign in (-1.0, 1.0):
        x_in, x_out = sign * 2.7, sign * 5.0
        lo = min(x_in, x_out)
        hi = max(x_in, x_out)
        base = [(lo - 0.12, -hd - 0.12, 0.0), (hi, -hd - 0.12, 0.0), (hi, hd + 0.12, 0.0), (lo - 0.12, hd + 0.12, 0.0)]
        top = [(lo, -hd + 0.05, 10.6), (hi, -hd + 0.05, 10.6), (hi, hd - 0.05, 10.6), (lo, hd - 0.05, 10.6)]
        if sign > 0.0:
            base = [(lo, -hd - 0.12, 0.0), (hi + 0.12, -hd - 0.12, 0.0), (hi + 0.12, hd + 0.12, 0.0), (lo, hd + 0.12, 0.0)]
            top = [(lo, -hd + 0.05, 10.6), (hi, -hd + 0.05, 10.6), (hi, hd - 0.05, 10.6), (lo, hd - 0.05, 10.6)]
        hexahedron(mesh, base, top, STONE, skip=("bottom",))
        for course in range(10):
            z0 = 0.35 + course * 1.0
            inset = 0.02 + rng.uniform(0.0, 0.02)
            box(mesh, (lo, hd - 0.2 - inset, z0), (hi, hd - inset + 0.012, z0 + 0.3), STONE)
            box(mesh, (sign * 4.84 - inset, -hd, z0), (sign * 5.0, hd, z0 + 0.3), STONE)
        for index in range(2):
            z = 3.3 + index * 2.6
            box(
                mesh,
                (sign * 3.85 - 0.13, hd - 0.42, z),
                (sign * 3.85 + 0.13, hd + 0.04, z + 1.05),
                TIMBER,
            )
        _crenellated_rect(
            mesh, rng, lo, hi, -hd + 0.05, hd - 0.05, 10.6, 12.0, 0.5, merlon=0.8, embrasure=0.5
        )
    _plank_door(mesh, "y", -1.0, hd, 3.85, width=1.0, height=2.1)
    _check_gate_clearance(mesh, PASSAGE_HALF_WIDTH, PASSAGE_HEIGHT)
    mesh.place_on_ground()
    return mesh


def build_church(rng: random.Random) -> MeshData:
    mesh = MeshData()
    nave_x0, nave_x1 = -4.0, 9.0
    nave_hd = 3.5
    tower_x0, tower_x1 = -9.0, -4.0
    tower_cx = 0.5 * (tower_x0 + tower_x1)
    # Nave walls and plinth.
    box(mesh, (nave_x0, -nave_hd - 0.18, 0.0), (nave_x1, nave_hd + 0.18, 0.7), STONE, skip=("bottom",))
    box(mesh, (nave_x0, -nave_hd, 0.6), (nave_x1, nave_hd, 8.0), STONE, skip=("bottom",))
    for course in range(12):
        z0 = 0.9 + course * 0.6
        inset = 0.02 + 0.015 * (course % 2) + rng.uniform(0.0, 0.012)
        for sign in (-1.0, 1.0):
            box(
                mesh,
                (nave_x0, sign * (nave_hd - 0.18 - inset), z0),
                (nave_x1, sign * (nave_hd - inset + 0.012), z0 + 0.22),
                STONE,
            )
    # Stepped buttresses reaching out to the 10 m envelope.
    for index in range(4):
        x = nave_x0 + 1.4 + (nave_x1 - nave_x0 - 2.8) * index / 3.0
        for sign in (-1.0, 1.0):
            y_in = sign * (nave_hd - 0.1)
            box(mesh, (x - 0.62, min(y_in, sign * 5.0), 0.0), (x + 0.62, max(y_in, sign * 5.0), 3.4), STONE)
            box(mesh, (x - 0.56, min(y_in, sign * 4.3), 3.4), (x + 0.56, max(y_in, sign * 4.3), 5.6), STONE)
            box(mesh, (x - 0.5, min(y_in, sign * 3.9), 5.6), (x + 0.5, max(y_in, sign * 3.9), 7.1), STONE)
            cap_lo = [
                (x - 0.5, y_in, 7.1),
                (x + 0.5, y_in, 7.1),
                (x + 0.5, sign * 3.9, 7.1),
                (x - 0.5, sign * 3.9, 7.1),
            ]
            cap_hi = [
                (x - 0.5, y_in, 8.1),
                (x + 0.5, y_in, 8.1),
                (x + 0.5, sign * 3.9, 7.35),
                (x - 0.5, sign * 3.9, 7.35),
            ]
            if sign < 0.0:
                cap_lo = list(reversed(cap_lo))
                cap_hi = list(reversed(cap_hi))
            hexahedron(mesh, cap_lo, cap_hi, STONE)
    # Lancet windows between the buttresses.
    for index in range(3):
        x = nave_x0 + 2.65 + (nave_x1 - nave_x0 - 5.3) * index / 2.0
        for sign in (-1.0, 1.0):
            _lancet(mesh, x, nave_hd, sign, z_base=4.2, half_width=0.45, height=1.9)
    # Nave roof, built around the origin and merged onto the nave.
    roof = MeshData()
    _tiled_gable_roof(
        roof,
        rng,
        0.5 * (nave_x1 - nave_x0),
        nave_hd,
        8.0,
        12.2,
        courses=10,
        segments=4,
        verge=0.3,
        eave_overhang=0.4,
        gable_material=STONE,
    )
    mesh.merge(roof, (0.5 * (nave_x0 + nave_x1), 0.0, 0.0))
    # West tower.
    box(mesh, (tower_x0 - 0.2, -2.7, 0.0), (tower_x1 + 0.1, 2.7, 0.8), STONE, skip=("bottom",))
    box(mesh, (tower_x0, -2.5, 0.7), (tower_x1, 2.5, 15.4), STONE, skip=("bottom",))
    for course in range(22):
        z0 = 1.0 + course * 0.65
        inset = 0.02 + 0.015 * (course % 2) + rng.uniform(0.0, 0.012)
        for sign in (-1.0, 1.0):
            box(
                mesh,
                (tower_x0, sign * (2.5 - 0.2 - inset), z0),
                (tower_x1, sign * (2.5 - inset + 0.012), z0 + 0.2),
                STONE,
            )
        box(mesh, (tower_x0 - inset - 0.012, -2.5, z0), (tower_x0 + 0.2, 2.5, z0 + 0.2), STONE)
    for sign in (-1.0, 1.0):
        box(
            mesh,
            (tower_x0 - 0.14, sign * (2.5 - 0.62), 0.0),
            (tower_x0 + 0.5, sign * 2.64, 11.0),
            STONE,
        )
        box(
            mesh,
            (tower_x1 - 0.5, sign * (2.5 - 0.62), 0.0),
            (tower_x1, sign * 2.64, 11.0),
            STONE,
        )
        _lancet(mesh, tower_cx, 2.5, sign, z_base=11.6, half_width=0.52, height=2.4)
    _lancet(mesh, 0.0, -tower_x0, -1.0, z_base=11.6, half_width=0.52, height=2.4, axis="x")
    _lancet(mesh, tower_cx, 2.5, 1.0, z_base=3.2, half_width=0.6, height=2.6)
    box(mesh, (tower_x0 - 0.26, -2.76, 15.2), (tower_x1 + 0.26, 2.76, 15.7), STONE)
    _crenellated_rect(
        mesh,
        rng,
        tower_x0 - 0.26,
        tower_x1 + 0.26,
        -2.76,
        2.76,
        15.7,
        16.5,
        0.56,
        merlon=0.7,
        embrasure=0.45,
    )
    lathe(
        mesh,
        [(3.4, 15.7), (3.4, 16.05), (0.0, 19.0)],
        4,
        TILE,
        centre=(tower_cx, 0.0),
        rot_offset=math.pi / 4.0,
    )
    # West door, the way in, on the +Y face of the tower.
    _plank_door(mesh, "y", 1.0, 2.5, tower_cx, width=1.5, height=2.6)
    mesh.place_on_ground()
    return mesh



def _lancet(
    mesh: MeshData,
    x: float,
    wall: float,
    sign: float,
    z_base: float = 4.2,
    half_width: float = 0.42,
    height: float = 1.7,
    axis: str = "y",
) -> None:
    """A tall round-headed window recess with a projecting stone surround."""
    mapper = _wall_mapper(axis, sign, wall)
    _face_box(mesh, mapper, x - half_width, x + half_width, -0.26, -0.06, z_base, z_base + height, TIMBER)
    _face_box(mesh, mapper, x - half_width - 0.14, x - half_width, -0.05, 0.1, z_base, z_base + height + half_width, STONE)
    _face_box(mesh, mapper, x + half_width, x + half_width + 0.14, -0.05, 0.1, z_base, z_base + height + half_width, STONE)
    steps = 6
    for index in range(steps):
        a0 = math.pi * index / steps
        a1 = math.pi * (index + 1) / steps
        u0 = x + half_width * math.cos(a0)
        u1 = x + half_width * math.cos(a1)
        z0 = z_base + height + half_width * math.sin(a0)
        z1 = z_base + height + half_width * math.sin(a1)
        lo = [
            mapper(min(u0, u1), -0.26, min(z0, z1) - 0.16),
            mapper(max(u0, u1), -0.26, min(z0, z1) - 0.16),
            mapper(max(u0, u1), 0.1, min(z0, z1) - 0.16),
            mapper(min(u0, u1), 0.1, min(z0, z1) - 0.16),
        ]
        box(mesh, lo[0], mapper(max(u0, u1), 0.1, max(z0, z1)), STONE)
        box(
            mesh,
            mapper(min(u0, u1) + 0.05, -0.24, min(z0, z1) - 0.2),
            mapper(max(u0, u1) - 0.05, -0.08, max(z0, z1) - 0.14),
            TIMBER,
        )
    _face_box(mesh, mapper, x - half_width - 0.2, x + half_width + 0.2, -0.04, 0.16, z_base - 0.14, z_base, STONE)


def build_well(rng: random.Random) -> MeshData:
    mesh = MeshData()
    segments = 14
    jitter = [1.0 + rng.uniform(-0.02, 0.02) for _ in range(segments)]
    lathe(
        mesh,
        [(0.74, 0.0), (0.78, 0.22), (0.76, 0.82), (0.82, 0.94)],
        segments,
        STONE,
        radial_jitter=jitter,
        cap_top=False,
    )
    lathe(mesh, [(0.56, 0.2), (0.56, 0.94)], segments, STONE, cap_top=False, cap_bottom=True)
    lathe(mesh, [(0.56, 0.94), (0.82, 0.94)], segments, STONE, cap_bottom=False, cap_top=False)
    for sign in (-1.0, 1.0):
        box(mesh, (sign * 0.62 - 0.08, -0.09, 0.9), (sign * 0.62 + 0.08, 0.09, 2.2), TIMBER)
        beam(mesh, (sign * 0.62, 0.0, 1.6), (sign * 0.3, 0.0, 2.15), 0.09, 0.09, TIMBER)
    roof = MeshData()
    _tiled_gable_roof(
        roof,
        rng,
        1.1,
        1.08,
        2.2,
        2.88,
        slope_material=WOOD,
        gable_material=TIMBER,
        courses=4,
        segments=2,
        verge=0.1,
        eave_overhang=0.12,
    )
    mesh.merge(roof, (0.0, 0.0, 0.0))
    rolled_cylinder(mesh, (0.0, 1.78), 0.11, -0.58, 0.58, 8, WOOD)
    beam(mesh, (0.6, 0.0, 1.78), (0.78, 0.26, 1.78), 0.07, 0.07, IRON)
    beam(mesh, (0.78, 0.26, 1.78), (0.78, 0.26, 1.5), 0.06, 0.06, IRON)
    box(mesh, (-0.03, -0.03, 1.4), (0.03, 0.03, 1.74), WOOD)
    lathe(mesh, [(0.17, 1.1), (0.2, 1.4)], 10, WOOD, cap_top=False)
    lathe(mesh, [(0.205, 1.3), (0.205, 1.37)], 10, IRON, cap_bottom=False, cap_top=False)
    mesh.place_on_ground()
    return mesh


def build_market_stall(rng: random.Random) -> MeshData:
    mesh = MeshData()
    for sx in (-1.0, 1.0):
        for sy in (-1.0, 1.0):
            lean = rng.uniform(-0.03, 0.03)
            z_top = 2.15 if sy > 0.0 else 2.52
            box(
                mesh,
                (sx * 1.3 - 0.06, sy * 1.0 - 0.06, 0.0),
                (sx * 1.3 + 0.06 + lean, sy * 1.0 + 0.06, z_top),
                WOOD,
            )
    box(mesh, (-1.4, 0.16, 0.86), (1.4, 1.12, 0.96), WOOD)
    for index in range(6):
        x0 = -1.4 + 2.8 * index / 6.0
        box(mesh, (x0 + 0.015, 0.16, 0.96), (x0 + 2.8 / 6.0 - 0.015, 1.12, 1.0), WOOD)
    for index in range(5):
        x = -1.3 + 2.6 * index / 4.0
        box(mesh, (x - 0.05, 0.98, 0.0), (x + 0.05, 1.08, 0.88), WOOD)
    box(mesh, (-1.4, 1.0, 0.5), (1.4, 1.06, 0.6), WOOD)
    canopy_lo = [
        (-1.5, -1.12, 2.52),
        (1.5, -1.12, 2.52),
        (1.5, 1.2, 2.1),
        (-1.5, 1.2, 2.1),
    ]
    canopy_hi = [(p[0], p[1], p[2] + 0.06) for p in canopy_lo]
    hexahedron(mesh, canopy_lo, canopy_hi, CANVAS)
    for index in range(6):
        x = -1.5 + 3.0 * (index + 0.5) / 6.0
        batten_lo = [
            (x - 0.1, -1.12, 2.58),
            (x + 0.1, -1.12, 2.58),
            (x + 0.1, 1.2, 2.16),
            (x - 0.1, 1.2, 2.16),
        ]
        batten_hi = [(p[0], p[1], p[2] + 0.05) for p in batten_lo]
        hexahedron(mesh, batten_lo, batten_hi, TIMBER)
    for index in range(3):
        x = -0.9 + 0.9 * index
        size = 0.17 + rng.uniform(-0.02, 0.02)
        box(mesh, (x - size, 0.42, 0.96), (x + size, 0.42 + 2.0 * size, 0.96 + 1.6 * size), WOOD)
    lathe(mesh, [(0.16, 0.0), (0.2, 0.45), (0.16, 0.7)], 8, CANVAS, centre=(1.05, -0.6))
    mesh.place_on_ground()
    return mesh


def _cart_wheel(mesh: MeshData, x: float, y0: float, y1: float, radius: float, z: float) -> None:
    segments = 12
    outer = []
    inner = []
    for index in range(segments):
        angle = 2.0 * math.pi * index / segments
        outer.append((x + radius * math.cos(angle), z + radius * math.sin(angle)))
        inner.append(
            (x + (radius - 0.09) * math.cos(angle), z + (radius - 0.09) * math.sin(angle))
        )
    for index in range(segments):
        nxt = (index + 1) % segments
        prism_y(
            mesh,
            [outer[index], outer[nxt], inner[nxt], inner[index]],
            y0,
            y1,
            WOOD,
        )
    for index in range(6):
        angle = math.pi * index / 6.0
        start = (
            x + (radius - 0.09) * math.cos(angle),
            0.5 * (y0 + y1),
            z + (radius - 0.09) * math.sin(angle),
        )
        end = (
            x - (radius - 0.09) * math.cos(angle),
            0.5 * (y0 + y1),
            z - (radius - 0.09) * math.sin(angle),
        )
        beam(mesh, start, end, 0.065, 0.065, WOOD)
    hub = []
    for index in range(8):
        angle = 2.0 * math.pi * index / 8.0
        hub.append((x + 0.15 * math.cos(angle), z + 0.15 * math.sin(angle)))
    prism_y(mesh, hub, y0 - 0.05, y1 + 0.05, IRON)


def build_cart(rng: random.Random) -> MeshData:
    mesh = MeshData()
    bed_z0, bed_z1 = 0.62, 0.74
    box(mesh, (-1.3, -0.68, bed_z0), (1.3, 0.68, bed_z1 - 0.04), WOOD)
    for index in range(8):
        y0 = -0.68 + 1.36 * index / 8.0
        box(
            mesh,
            (-1.3, y0 + 0.012, bed_z1 - 0.05),
            (1.3, y0 + 1.36 / 8.0 - 0.012, bed_z1 + rng.uniform(0.0, 0.012)),
            WOOD,
        )
    for sign in (-1.0, 1.0):
        box(mesh, (-1.3, sign * 0.68 - 0.05, bed_z1), (1.3, sign * 0.68 + 0.02, bed_z1 + 0.5), WOOD)
        for index in range(7):
            x = -1.2 + 2.4 * index / 6.0
            box(
                mesh,
                (x - 0.05, sign * 0.68 - 0.06, bed_z1),
                (x + 0.05, sign * 0.68 + 0.03, bed_z1 + 0.52),
                WOOD,
            )
    box(mesh, (-1.34, -0.7, bed_z1), (-1.24, 0.7, 1.55), WOOD)
    for index in range(5):
        y = -0.56 + 1.12 * index / 4.0
        box(mesh, (-1.36, y - 0.06, bed_z1), (-1.22, y + 0.06, 1.56), WOOD)
    box(mesh, (-1.38, -0.7, 1.46), (-1.2, 0.7, 1.56), WOOD)
    for sign in (-1.0, 1.0):
        rolled_cylinder(mesh, (sign * 0.74, 0.56), 0.06, -1.02, 1.02, 8, IRON)
    for x in (-0.95, 0.72):
        for y0, y1 in ((0.68, 0.8), (-0.8, -0.68)):
            _cart_wheel(mesh, x, y0, y1, 0.54, 0.56)
    for sign in (-1.0, 1.0):
        beam(mesh, (1.25, sign * 0.5, bed_z0 + 0.02), (1.62, sign * 0.34, 0.78), 0.1, 0.1, WOOD)
    box(mesh, (1.5, -0.4, 0.73), (1.62, 0.4, 0.81), WOOD)
    mesh.place_on_ground()
    return mesh


def build_barrel(rng: random.Random) -> MeshData:
    mesh = MeshData()
    segments = 10
    jitter = [1.0 + rng.uniform(-0.018, 0.018) for _ in range(segments)]
    profile = [(0.3, 0.0), (0.355, 0.22), (0.38, 0.5), (0.355, 0.78), (0.3, 1.0)]
    lathe(mesh, profile, segments, WOOD, radial_jitter=jitter)
    for radius, z0 in ((0.375, 0.16), (0.4, 0.46), (0.375, 0.72)):
        lathe(
            mesh,
            [(radius, z0), (radius + 0.015, z0 + 0.015), (radius + 0.015, z0 + 0.1), (radius, z0 + 0.115)],
            segments,
            IRON,
            cap_bottom=False,
            cap_top=False,
        )
    for index in range(2):
        y0 = -0.26 + 0.28 * index
        box(mesh, (-0.26, y0, 1.0), (0.26, y0 + 0.24, 1.03), WOOD)
    mesh.place_on_ground()
    return mesh


def build_crate(rng: random.Random) -> MeshData:
    mesh = MeshData()
    half = 0.4
    top = 0.66
    box(mesh, (-half + 0.03, -half + 0.03, 0.02), (half - 0.03, half - 0.03, top - 0.02), WOOD)
    for axis, sign in (("y", 1.0), ("y", -1.0), ("x", 1.0), ("x", -1.0)):
        mapper = _wall_mapper(axis, sign, half)
        for plank in range(3):
            z0 = 0.03 + plank * (top - 0.06) / 3.0
            _face_box(
                mesh,
                mapper,
                -half + 0.02,
                half - 0.02,
                -0.03,
                0.012 + rng.uniform(0.0, 0.01),
                z0,
                z0 + (top - 0.06) / 3.0 - 0.025,
                WOOD,
            )
    for sx in (-1.0, 1.0):
        for sy in (-1.0, 1.0):
            box(
                mesh,
                (sx * half - sx * 0.07, sy * half - sy * 0.07, 0.0),
                (sx * (half + 0.015), sy * (half + 0.015), top),
                TIMBER,
            )
    for plank in range(2):
        y0 = -half + 0.04 + plank * (2.0 * half - 0.08) / 2.0
        box(
            mesh,
            (-half + 0.02, y0 + 0.02, top),
            (half - 0.02, y0 + (2.0 * half - 0.08) / 2.0 - 0.02, top + 0.035),
            WOOD,
        )
    mesh.place_on_ground()
    return mesh


def _sack(mesh: MeshData, rng: random.Random, centre: tuple[float, float], z0: float, scale: float) -> None:
    segments = 8
    jitter = [1.0 + rng.uniform(-0.08, 0.08) for _ in range(segments)]
    profile = [
        (0.12 * scale, z0),
        (0.27 * scale, z0 + 0.1 * scale),
        (0.31 * scale, z0 + 0.26 * scale),
        (0.21 * scale, z0 + 0.4 * scale),
        (0.09 * scale, z0 + 0.46 * scale),
    ]
    lathe(mesh, profile, segments, CANVAS, centre=centre, radial_jitter=jitter)
    lathe(
        mesh,
        [(0.075 * scale, z0 + 0.42 * scale), (0.075 * scale, z0 + 0.47 * scale)],
        segments,
        TIMBER,
        centre=centre,
        cap_bottom=False,
        cap_top=False,
    )


def build_sack_pile(rng: random.Random) -> MeshData:
    mesh = MeshData()
    _sack(mesh, rng, (-0.3, -0.17), 0.0, 1.05)
    _sack(mesh, rng, (0.3, 0.17), 0.0, 1.05)
    _sack(mesh, rng, (0.0, -0.02), 0.4, 0.98)
    mesh.place_on_ground()
    return mesh


def build_brazier(rng: random.Random) -> MeshData:
    mesh = MeshData()
    segments = 10
    for index in range(3):
        angle = 2.0 * math.pi * index / 3.0 + 0.2
        beam(
            mesh,
            (0.28 * math.cos(angle), 0.28 * math.sin(angle), 0.0),
            (0.13 * math.cos(angle), 0.13 * math.sin(angle), 0.64),
            0.055,
            0.055,
            IRON,
        )
    lathe(mesh, [(0.19, 0.6), (0.3, 0.95)], segments, IRON, cap_top=False)
    for index in range(segments):
        angle = 2.0 * math.pi * index / segments
        beam(
            mesh,
            (0.2 * math.cos(angle), 0.2 * math.sin(angle), 0.62),
            (0.31 * math.cos(angle), 0.31 * math.sin(angle), 0.97),
            0.04,
            0.04,
            IRON,
        )
    lathe(
        mesh,
        [(0.3, 0.92), (0.33, 0.95), (0.33, 1.0), (0.3, 1.03)],
        segments,
        IRON,
        cap_bottom=False,
        cap_top=False,
    )
    for index in range(4):
        angle = 2.0 * math.pi * index / 4.0 + 0.4
        length = 0.2 + rng.uniform(-0.03, 0.03)
        beam(
            mesh,
            (-length * math.cos(angle), -length * math.sin(angle), 0.88),
            (length * math.cos(angle), length * math.sin(angle), 0.96),
            0.07,
            0.07,
            WOOD,
        )
    for index in range(3):
        angle = 2.0 * math.pi * index / 3.0 + 0.9
        beam(
            mesh,
            (0.3 * math.cos(angle), 0.3 * math.sin(angle), 0.98),
            (0.0, 0.0, 1.27),
            0.035,
            0.035,
            IRON,
        )
    box(mesh, (-0.04, -0.04, 1.22), (0.04, 0.04, 1.3), IRON)
    mesh.place_on_ground()
    return mesh


def build_tree(rng: random.Random) -> MeshData:
    mesh = MeshData()
    segments = 8
    radii = [(0.33, 0.0), (0.29, 0.9), (0.25, 1.9), (0.21, 2.9), (0.17, 3.7)]
    centre_x, centre_y = 0.0, 0.0
    for index in range(len(radii) - 1):
        r0, z0 = radii[index]
        r1, z1 = radii[index + 1]
        next_x = centre_x + rng.uniform(-0.07, 0.07)
        next_y = centre_y + rng.uniform(-0.07, 0.07)
        lathe(
            mesh,
            [(r0, z0), (r1, z1)],
            segments,
            WOOD,
            centre=(0.5 * (centre_x + next_x), 0.5 * (centre_y + next_y)),
        )
        centre_x, centre_y = next_x, next_y
    for index in range(4):
        angle = 2.0 * math.pi * index / 4.0 + 0.5
        z_start = 2.85 + 0.33 * index
        beam(
            mesh,
            (centre_x * 0.5, centre_y * 0.5, z_start),
            (0.82 * math.cos(angle), 0.82 * math.sin(angle), z_start + 0.85),
            0.13,
            0.13,
            WOOD,
        )
    blobs = [
        (0.0, 0.0, 5.45, 1.42),
        (-0.86, 0.34, 4.45, 1.16),
        (0.82, -0.3, 4.6, 1.1),
        (0.26, 0.9, 4.9, 1.04),
        (-0.22, -0.84, 4.25, 0.98),
    ]
    for cx, cy, cz, radius in blobs:
        jitter = [1.0 + rng.uniform(-0.1, 0.1) for _ in range(segments)]
        profile = []
        rings = 6
        for step in range(rings + 1):
            angle = -0.5 * math.pi + math.pi * step / rings
            profile.append((radius * math.cos(angle), cz + radius * math.sin(angle)))
        lathe(mesh, profile, segments, LEAF, centre=(cx, cy), radial_jitter=jitter)
    mesh.place_on_ground()
    return mesh


def build_fence(rng: random.Random) -> MeshData:
    mesh = MeshData()
    posts = [-1.44, -0.48, 0.48, 1.44]
    for x in posts:
        lean = rng.uniform(-0.025, 0.025)
        bottom = [
            (x - 0.06, -0.06, 0.0),
            (x + 0.06, -0.06, 0.0),
            (x + 0.06, 0.06, 0.0),
            (x - 0.06, 0.06, 0.0),
        ]
        top = [(p[0] + lean, p[1], 1.2) for p in bottom]
        hexahedron(mesh, bottom, top, WOOD)
    rows = 5
    for row in range(rows):
        z = 0.14 + row * (0.96 / (rows - 1))
        for bay in range(len(posts) - 1):
            for half in range(2):
                x0 = posts[bay] + (posts[bay + 1] - posts[bay]) * half / 2.0
                x1 = posts[bay] + (posts[bay + 1] - posts[bay]) * (half + 1) / 2.0
                weave = 1.0 if (row + bay + half) % 2 == 0 else -1.0
                y_mid = weave * 0.055
                wobble = rng.uniform(-0.008, 0.008)
                bottom = [
                    (x0, y_mid - 0.042, z + wobble),
                    (x1, -y_mid - 0.042, z - wobble),
                    (x1, -y_mid + 0.042, z - wobble),
                    (x0, y_mid + 0.042, z + wobble),
                ]
                top = [(p[0], p[1], p[2] + 0.085) for p in bottom]
                hexahedron(mesh, bottom, top, WOOD)
    mesh.place_on_ground()
    return mesh


class _ValueNoise:
    """Bilinear value noise on a fixed lattice, so the ground is reproducible."""

    def __init__(self, rng: random.Random, lattice: int, extent: float) -> None:
        self.lattice = lattice
        self.extent = extent
        self.values = [
            [rng.random() for _ in range(lattice + 1)] for _ in range(lattice + 1)
        ]

    def at(self, x: float, y: float) -> float:
        u = (x + self.extent) / (2.0 * self.extent) * self.lattice
        v = (y + self.extent) / (2.0 * self.extent) * self.lattice
        i = min(self.lattice - 1, max(0, int(u)))
        j = min(self.lattice - 1, max(0, int(v)))
        fu = min(1.0, max(0.0, u - i))
        fv = min(1.0, max(0.0, v - j))
        su = fu * fu * (3.0 - 2.0 * fu)
        sv = fv * fv * (3.0 - 2.0 * fv)
        a = self.values[i][j]
        b = self.values[i + 1][j]
        c = self.values[i][j + 1]
        d = self.values[i + 1][j + 1]
        return (a * (1.0 - su) + b * su) * (1.0 - sv) + (c * (1.0 - su) + d * su) * sv


# Street and plaza regions, and the flat-inside-the-ring rule, are fixed in the
# "Street and plaza regions" section of docs/work/2_medieval-city/design.md.
GROUND_EXTENT = 110.0
# Inside the wall ring the ground is exactly flat at Z=0, because buildings and
# props are placed at Z=0. All 0.8 m of relief lives outside the ring.
# Fixed in design.md: the flat box must contain every non-ground footprint with
# margin. The inventory puts the corner towers at x +-58.82 and y +-61.73 and
# the gatehouse front at y 62.25, which these cover.
RING_HALF_X = 60.0
RING_HALF_Y = 64.0
PLAZA_X = (-19.0, 19.0)
PLAZA_Y = (-19.0, 7.0)
MAIN_STREET_X = (-3.5, 3.5)
MAIN_STREET_Y = (7.0, 68.0)
CROSS_STREET_Y = (-9.5, -2.5)
CROSS_STREET_X = (-RING_HALF_X, RING_HALF_X)
GROUND_INNER_CELLS = 58
GROUND_OUTER_CELLS = 10


def _ground_region(x: float, y: float) -> str:
    """Surface at one point. The plaza wins where a street crosses it, so the
    cobbles stay one solid area and the dirt leads away from its edges."""
    if PLAZA_X[0] <= x <= PLAZA_X[1] and PLAZA_Y[0] <= y <= PLAZA_Y[1]:
        return COBBLE
    if MAIN_STREET_X[0] <= x <= MAIN_STREET_X[1] and MAIN_STREET_Y[0] <= y <= MAIN_STREET_Y[1]:
        return DIRT
    if CROSS_STREET_Y[0] <= y <= CROSS_STREET_Y[1] and CROSS_STREET_X[0] <= x <= CROSS_STREET_X[1]:
        return DIRT
    return GRASS


def _ground_height(x: float, y: float, noise: float) -> float:
    """Zero inside the ring, rising smoothly to the plate edge outside it."""
    beyond = max(abs(x) - RING_HALF_X, abs(y) - RING_HALF_Y, 0.0)
    if beyond <= 0.0:
        return 0.0
    ramp = min(1.0, beyond / 46.0)
    return ramp * (0.1 + 0.14 * noise) + 0.66 * ramp**1.6


def _grid_axis(
    inner_lo: float,
    inner_hi: float,
    extent: float,
    inner_cells: int,
    outer_cells: int,
    snaps: tuple[float, ...],
) -> list[float]:
    """Coordinates dense inside the ring and coarse outside, with the region
    boundaries snapped onto exact grid lines so street edges stay straight."""
    coords: list[float] = []
    for index in range(outer_cells):
        coords.append(-extent + (inner_lo + extent) * index / outer_cells)
    for index in range(inner_cells + 1):
        coords.append(inner_lo + (inner_hi - inner_lo) * index / inner_cells)
    for index in range(1, outer_cells + 1):
        coords.append(inner_hi + (extent - inner_hi) * index / outer_cells)
    for snap in snaps:
        nearest = min(range(len(coords)), key=lambda k: abs(coords[k] - snap))
        coords[nearest] = snap
    for index in range(len(coords) - 1):
        if coords[index + 1] <= coords[index]:
            raise ValueError(
                f"ground grid axis is not increasing at {coords[index]:.3f} -> "
                f"{coords[index + 1]:.3f} m; the snap list is too close to the cell size"
            )
    return coords


def build_ground(rng: random.Random) -> MeshData:
    mesh = MeshData()
    noise = _ValueNoise(rng, 16, GROUND_EXTENT)
    fine = _ValueNoise(rng, 48, GROUND_EXTENT)
    xs = _grid_axis(
        -RING_HALF_X,
        RING_HALF_X,
        GROUND_EXTENT,
        GROUND_INNER_CELLS,
        GROUND_OUTER_CELLS,
        (PLAZA_X[0], MAIN_STREET_X[0], MAIN_STREET_X[1], PLAZA_X[1]),
    )
    ys = _grid_axis(
        -RING_HALF_Y,
        RING_HALF_Y,
        GROUND_EXTENT,
        GROUND_INNER_CELLS,
        GROUND_OUTER_CELLS,
        (PLAZA_Y[0], CROSS_STREET_Y[0], CROSS_STREET_Y[1], PLAZA_Y[1], MAIN_STREET_Y[1]),
    )
    points: list[tuple[float, float, float]] = []
    for x in xs:
        for y in ys:
            blend = 0.7 * noise.at(x, y) + 0.3 * fine.at(x, y)
            points.append((x, y, _ground_height(x, y, blend)))
    high = max(point[2] for point in points)
    if high <= 0.0:
        raise ValueError("ground relief came out flat everywhere; expected 0.8 m outside the ring")
    scale = 0.8 / high
    points = [(x, y, z * scale) for (x, y, z) in points]
    base = mesh.add_vertices(points)
    stride = len(ys)

    def index_of(ix: int, iy: int) -> int:
        return base + ix * stride + iy

    by_material: dict[str, list[tuple[int, ...]]] = {COBBLE: [], DIRT: [], GRASS: []}
    for ix in range(len(xs) - 1):
        x_mid = 0.5 * (xs[ix] + xs[ix + 1])
        for iy in range(len(ys) - 1):
            y_mid = 0.5 * (ys[iy] + ys[iy + 1])
            by_material[_ground_region(x_mid, y_mid)].append(
                (
                    index_of(ix, iy),
                    index_of(ix + 1, iy),
                    index_of(ix + 1, iy + 1),
                    index_of(ix, iy + 1),
                )
            )
    for material in sorted(by_material):
        if not by_material[material]:
            raise ValueError(
                f"the ground painted no {material} cells; check the region rectangles "
                "against the Street and plaza regions table in design.md"
            )
        mesh.add_indexed_faces(by_material[material], material)
    mesh.place_on_ground()
    return mesh

# ---------------------------------------------------------------------------
# registry
# ---------------------------------------------------------------------------
# The envelope this generator targets, transcribed from the inventory table in
# docs/work/2_medieval-city/design.md: footprint x, footprint y, height,
# maximum triangles. tools/medieval/test_assets.py keeps its own copy so the
# check does not grade the generator against itself.
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

BUILDERS = {
    "house_a": build_house_a,
    "house_b": build_house_b,
    "house_c": build_house_c,
    "cottage": build_cottage,
    "wall_segment": build_wall_segment,
    "wall_tower": build_wall_tower,
    "gatehouse": build_gatehouse,
    "church": build_church,
    "well": build_well,
    "market_stall": build_market_stall,
    "cart": build_cart,
    "barrel": build_barrel,
    "crate": build_crate,
    "sack_pile": build_sack_pile,
    "brazier": build_brazier,
    "tree": build_tree,
    "fence": build_fence,
    "ground": build_ground,
}

ASSET_ORDER = sorted(BUILDERS)


def build(asset: str) -> MeshData:
    """Build one asset from its own seeded generator."""
    if asset not in BUILDERS:
        raise KeyError(
            f"unknown asset {asset!r}; the inventory holds {', '.join(ASSET_ORDER)}"
        )
    rng = random.Random(BASE_SEED * 1000 + ASSET_ORDER.index(asset))
    mesh = BUILDERS[asset](rng)
    used = set(mesh.materials())
    unknown = sorted(used - set(MATERIALS))
    if unknown:
        raise ValueError(
            f"{asset} uses material(s) {', '.join(unknown)} that design.md does not list; "
            f"allowed names are {', '.join(sorted(MATERIALS))}"
        )
    return mesh
