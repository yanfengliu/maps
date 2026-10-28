#!/usr/bin/env python3
"""Deterministic town layout for the medieval city proof of concept.

Reads assets/generated/medieval/inventory.json (written by tools/blender/build_assets.py)
and writes assets/generated/medieval/city_layout.json, the schema in
docs/work/2_medieval-city/design.md. Standard library only, CPython 3.13, fixed seed.
Two runs on the same inventory give identical bytes.

Frame and angle conventions (all lengths in metres):
  - The layout frame is the asset frame: right-handed, Z up, +Y is an asset's front at
    yaw 0, the town centre is the origin. North is +Y, east is +X.
  - yaw_deg turns counter-clockwise seen from above. The front (look) direction at yaw t
    is (-sin t, cos t): yaw 0 faces +Y, yaw 90 faces -X, yaw 180 faces -Y, yaw -90 faces +X.
  - A footprint is [size along local X, size along local Y] from the inventory, centred on
    location_m, rotated by yaw. Every placement sits at Z = 0: the ground is flat inside the
    wall ring and nothing is placed outside it, where the ground has relief.
  - player_start_m, vantages_m and walk_probe_m use the same yaw convention as a look
    direction. pitch_deg is positive looking up. sun angles are the Unreal directional-light
    rotator and are passed through unconverted.

Town plan (the plaza and street rectangles are the design.md "Street and plaza regions"):
  - Plaza x in [-19, 19], y in [-19, 7]; the well at (0, -6); the church closes the south side.
  - Main Street: x in [-3.5, 3.5], from the plaza north through the gate and its apron to y 68.
  - Cross Street: y in [-9.5, -2.5], across the flat box (x within +-60), so wall to wall.
  - Houses stand on the street edges with their fronts to the street or plaza, a few degrees
    off square, and are slid back until the most forward corner touches the edge line.
  - The wall ring is a near-rectangle of wall_segment pieces with a wall_tower at each corner
    and the gatehouse in the middle of the north side, its front outward. Its south side is a
    little shorter than its north side so every side tiles with whole pieces and no gaps.
  - Every footprint stays inside design.md's flat-ground box (x within +-60, y within +-64):
    the ring counts are chosen to fit it, and the build fails if any footprint reaches past it.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
import sys
from dataclasses import dataclass
from pathlib import Path

SEED = 20261027
SCHEMA_VERSION = 1
GENERATOR = "tools/medieval/build_layout.py"
ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INVENTORY = ROOT / "assets" / "generated" / "medieval" / "inventory.json"
DEFAULT_OUTPUT = ROOT / "assets" / "generated" / "medieval" / "city_layout.json"
INVENTORY_COMMAND = "python tools/blender/build_assets.py"

REQUIRED_ASSETS = (
    "barrel", "brazier", "cart", "church", "cottage", "crate", "fence", "gatehouse", "ground",
    "house_a", "house_b", "house_c", "market_stall", "sack_pile", "tree", "wall_segment",
    "wall_tower", "well",
)
HOUSE_KINDS = ("house_a", "house_b", "house_c", "cottage")
TAG_ORDER = {"ground": 0, "wall": 1, "tower": 2, "gate": 3, "church": 4, "house": 5, "prop": 6, "tree": 7}

# ---- town plan -------------------------------------------------------------------------
TARGET_ACROSS_M = 120.0      # the ring is "about 120 m across"
RING_GAP_M = 0.02            # between neighbouring wall pieces, towers and the gatehouse
OVERLAP_TOL_M = 0.001        # penetration tolerated as float noise (same bound as the check)
FLAT_HALF_X, FLAT_HALF_Y = 60.0, 64.0   # design.md: the ground is exactly flat at Z = 0 inside this box
FLAT_MARGIN_M = 0.25         # the wall ring keeps this far inside the flat box
PLAZA_HALF_W = 19.0
PLAZA_Y0, PLAZA_Y1 = -19.0, 7.0
CROSS_Y = -6.0               # Cross Street centre line and plaza centre line
STREET_HALF = 3.5            # Main Street and Cross Street are 7 m between house fronts
LANE_HALF = 2.2              # props stay out of the middle 4.4 m of every street
EYE_HEIGHT_M = 1.6
WALKWAY_FRACTION = 0.8       # wall-walk floor / wall height; W1 confirms a 4.8 m deck on the 6.0 m wall (not in the inventory)
WALKWAY_INSET_M = 0.5        # the timber walkway is on the inner face, about 0.5 m inside the wall centre line
EXTENT_MARGIN_M = 3.0        # dressing stays this far inside the ground edge

NEAR_WEIGHTS = {"house_a": 3.0, "house_b": 3.0, "house_c": 3.0, "cottage": 1.0}
FAR_WEIGHTS = {"house_a": 2.0, "house_b": 1.0, "house_c": 1.0, "cottage": 4.0}


class LayoutError(Exception):
    """The inventory cannot hold the town plan, or the plan collided with itself."""


# ---- small maths -----------------------------------------------------------------------
def q(value: float, digits: int = 3) -> float:
    return round(value, digits) + 0.0


def norm_yaw(angle: float) -> float:
    angle = math.fmod(angle, 360.0)
    if angle > 180.0:
        angle -= 360.0
    elif angle <= -180.0:
        angle += 360.0
    return angle


def yaw_of(dx: float, dy: float) -> float:
    """Yaw whose front direction (-sin, cos) points along (dx, dy)."""
    return math.degrees(math.atan2(-dx, dy))


def rotate(x: float, y: float, yaw_deg: float) -> tuple[float, float]:
    c, s = math.cos(math.radians(yaw_deg)), math.sin(math.radians(yaw_deg))
    return x * c - y * s, x * s + y * c


class Box:
    """Oriented rectangle: centre, half sizes along local X and Y, yaw."""

    __slots__ = ("cx", "cy", "hx", "hy", "ux", "uy", "vx", "vy", "r")

    def __init__(self, cx: float, cy: float, hx: float, hy: float, yaw_deg: float) -> None:
        self.cx, self.cy, self.hx, self.hy = cx, cy, hx, hy
        self.ux, self.uy = rotate(1.0, 0.0, yaw_deg)
        self.vx, self.vy = rotate(0.0, 1.0, yaw_deg)
        self.r = math.hypot(hx, hy)

    def corners(self) -> list[tuple[float, float]]:
        out = []
        for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            out.append((
                self.cx + sx * self.hx * self.ux + sy * self.hy * self.vx,
                self.cy + sx * self.hx * self.uy + sy * self.hy * self.vy,
            ))
        return out


def penetration(a: Box, b: Box) -> float:
    """Separating-axis overlap depth: > 0 overlapping, <= 0 apart (or touching)."""
    dx, dy = b.cx - a.cx, b.cy - a.cy
    if dx * dx + dy * dy > (a.r + b.r) ** 2:
        return -1.0
    best = math.inf
    for ax, ay in ((a.ux, a.uy), (a.vx, a.vy), (b.ux, b.uy), (b.vx, b.vy)):
        ra = a.hx * abs(a.ux * ax + a.uy * ay) + a.hy * abs(a.vx * ax + a.vy * ay)
        rb = b.hx * abs(b.ux * ax + b.uy * ay) + b.hy * abs(b.vx * ax + b.vy * ay)
        best = min(best, ra + rb - abs(dx * ax + dy * ay))
    return best


def rect_box(x0: float, x1: float, y0: float, y1: float) -> Box:
    return Box((x0 + x1) / 2.0, (y0 + y1) / 2.0, abs(x1 - x0) / 2.0, abs(y1 - y0) / 2.0, 0.0)


# ---- placements ------------------------------------------------------------------------
@dataclass
class Placement:
    id: str
    asset: str
    x: float
    y: float
    z: float
    yaw: float
    tag: str

    def as_dict(self) -> dict:
        return {
            "id": self.id,
            "asset": self.asset,
            "location_m": [self.x, self.y, self.z],
            "yaw_deg": self.yaw,
            "tag": self.tag,
        }


class World:
    """Placements plus the collision bookkeeping the town plan needs."""

    def __init__(self, footprints: dict[str, tuple[float, float]], extent_half: tuple[float, float]) -> None:
        self.fp = footprints
        self.extent_half = extent_half
        self.placements: list[Placement] = []
        self.boxes: dict[str, Box] = {}
        self.counts: dict[str, int] = {}
        self.keepouts: list[Box] = []        # street lanes and probe runs; skipped by hand-placed dressing
        self.lens_keepouts: list[Box] = []   # sight lines of ground-level cameras; never skipped

    def _next_id(self, asset: str) -> str:
        self.counts[asset] = self.counts.get(asset, 0) + 1
        return f"{asset}_{self.counts[asset]:02d}"

    def box_for(self, asset: str, x: float, y: float, yaw: float, margin: float = 0.0) -> Box:
        fx, fy = self.fp[asset]
        return Box(x, y, fx / 2.0 + margin, fy / 2.0 + margin, yaw)

    def worst_overlap(self, box: Box, threshold: float) -> tuple[str, float] | None:
        worst: tuple[str, float] | None = None
        for pid in sorted(self.boxes):
            depth = penetration(box, self.boxes[pid])
            if depth > threshold and (worst is None or depth > worst[1]):
                worst = (pid, depth)
        return worst

    def add(self, asset: str, x: float, y: float, yaw: float, tag: str) -> Placement:
        """Place a structural piece; it must not overlap anything already placed."""
        x, y, yaw = q(x), q(y), q(norm_yaw(yaw), 2)
        if asset != "ground":
            hit = self.worst_overlap(self.box_for(asset, x, y, yaw), OVERLAP_TOL_M)
            if hit is not None:
                raise LayoutError(
                    f"{asset} at ({x}, {y}) yaw {yaw} overlaps {hit[0]} by {hit[1]:.3f} m; "
                    "the town plan in build_layout.py does not fit this inventory's footprints"
                )
        placement = Placement(self._next_id(asset), asset, x, y, 0.0, yaw, tag)
        self.placements.append(placement)
        if asset != "ground":
            self.boxes[placement.id] = self.box_for(asset, placement.x, placement.y, placement.yaw)
        return placement

    def inside_extent(self, box: Box, margin: float) -> bool:
        ex, ey = self.extent_half
        return all(abs(px) <= ex - margin and abs(py) <= ey - margin for px, py in box.corners())

    def try_add(self, asset: str, x: float, y: float, yaw: float, tag: str,
                margin: float = 0.25, keepouts: bool = True) -> Placement | None:
        """Place dressing if it clears every footprint by `margin` and avoids the street lanes."""
        x, y, yaw = q(x), q(y), q(norm_yaw(yaw), 2)
        probe = self.box_for(asset, x, y, yaw, margin)
        if not self.inside_extent(probe, EXTENT_MARGIN_M):
            return None
        if self.worst_overlap(probe, 0.0) is not None:
            return None
        if any(penetration(probe, k) > 0.0 for k in self.lens_keepouts):
            return None
        if keepouts and any(penetration(probe, k) > 0.0 for k in self.keepouts):
            return None
        return self.add(asset, x, y, yaw, tag)


def local_offset(p: Placement, du: float, dv: float) -> tuple[float, float]:
    """World point at (du along the placement's X, dv along its front) from its centre."""
    ux, uy = rotate(1.0, 0.0, p.yaw)
    vx, vy = rotate(0.0, 1.0, p.yaw)
    return p.x + du * ux + dv * vx, p.y + du * uy + dv * vy


# ---- seeded randomness (random() only: its sequence is stable across Python versions) --
class Rng:
    def __init__(self, seed: int) -> None:
        self._r = random.Random(seed)

    def f(self) -> float:
        return self._r.random()

    def uniform(self, a: float, b: float) -> float:
        return a + (b - a) * self._r.random()

    def chance(self, p: float) -> bool:
        return self._r.random() < p

    def pick(self, items: list | tuple):
        return items[min(int(self._r.random() * len(items)), len(items) - 1)]


# ---- inventory -------------------------------------------------------------------------
def load_inventory(path: Path) -> tuple[str, dict[str, tuple[float, float]], dict[str, float]]:
    if not path.is_file():
        raise LayoutError(
            f"inventory not found at {path}; produce it with: {INVENTORY_COMMAND} "
            "(or pass --inventory <path> to use another inventory file)"
        )
    raw = path.read_bytes()
    try:
        data = json.loads(raw)
    except ValueError as exc:
        raise LayoutError(f"inventory {path} is not valid JSON ({exc}); regenerate it with: {INVENTORY_COMMAND}") from None
    if not isinstance(data, dict) or data.get("schema_version") != 1 or not isinstance(data.get("assets"), dict):
        raise LayoutError(
            f"inventory {path} has no schema_version 1 'assets' table; regenerate it with: {INVENTORY_COMMAND}"
        )
    missing = [name for name in REQUIRED_ASSETS if name not in data["assets"]]
    if missing:
        raise LayoutError(
            f"inventory {path} lacks assets {missing}; the layout needs all {len(REQUIRED_ASSETS)} assets of "
            f"design.md, so rerun: {INVENTORY_COMMAND}"
        )
    footprints: dict[str, tuple[float, float]] = {}
    heights: dict[str, float] = {}
    for name in REQUIRED_ASSETS:
        entry = data["assets"][name]
        fp, height = entry.get("footprint_m"), entry.get("height_m")
        ok = (
            isinstance(fp, list) and len(fp) == 2
            and all(isinstance(v, (int, float)) and v > 0 for v in fp)
            and isinstance(height, (int, float)) and height > 0
        )
        if not ok:
            raise LayoutError(
                f"inventory asset {name} has footprint_m={fp!r} and height_m={height!r}; "
                "need a two-number positive footprint and a positive height"
            )
        footprints[name] = (float(fp[0]), float(fp[1]))
        heights[name] = float(height)
    return hashlib.sha256(raw).hexdigest(), footprints, heights


# ---- the wall ring ---------------------------------------------------------------------
@dataclass
class Ring:
    sw: tuple[float, float]
    se: tuple[float, float]
    ne: tuple[float, float]
    nw: tuple[float, float]
    half_thickness: float

    def polygon(self) -> list[tuple[float, float]]:
        return [self.sw, self.se, self.ne, self.nw]

    @property
    def top(self) -> float:
        return self.ne[1]

    @property
    def bottom(self) -> float:
        return self.se[1]

    def east_x(self, y: float) -> float:
        """Wall centre line x on the east side at height y."""
        t = (y - self.se[1]) / (self.ne[1] - self.se[1])
        return self.se[0] + (self.ne[0] - self.se[0]) * t

    def inner_x(self, y: float) -> float:
        """East inner wall face x at height y (the same magnitude on the west side)."""
        return self.east_x(y) - self.half_thickness - 0.05

    def inner_y(self) -> float:
        return self.top - self.half_thickness - 0.05


def plan_ring(fp: dict[str, tuple[float, float]]) -> tuple[int, int, int, float, float, float, float]:
    """Pick whole-piece counts for the north, south and side runs."""
    seg_l = fp["wall_segment"][0]
    tower_w, tower_d = fp["wall_tower"]
    gate_w, gate_d = fp["gatehouse"]
    g = RING_GAP_M
    best = None
    for n_g in range(2, 10):
        top = tower_w + 2 * g + 2 * n_g * seg_l + gate_w + 2 * n_g * g
        for n_s in range(4, 26):
            bottom = tower_w + 2 * g + n_s * seg_l + (n_s - 1) * g
            skew = (top - bottom) / 2.0
            for n_e in range(4, 26):
                edge = tower_d + 2 * g + n_e * seg_l + (n_e - 1) * g
                if edge <= abs(skew) + 1.0:
                    continue
                height = math.sqrt(edge * edge - skew * skew)
                across_x = max(top, bottom) + tower_w
                across_y = height + tower_d
                gate_front = height / 2.0 + gate_d / 2.0  # the gatehouse stands on the north ring line
                if (across_x / 2.0 > FLAT_HALF_X - FLAT_MARGIN_M
                        or max(across_y / 2.0, gate_front) > FLAT_HALF_Y - FLAT_MARGIN_M):
                    continue
                skew_deg = math.degrees(math.atan2(abs(skew), height))
                score = (across_x - TARGET_ACROSS_M) ** 2 + (across_y - TARGET_ACROSS_M) ** 2 + 100.0 * skew_deg ** 2
                key = (round(score, 6), n_g, n_s, n_e)
                if best is None or key < best[0]:
                    best = (key, n_g, n_s, n_e, top, bottom, height)
    if best is None:
        raise LayoutError(
            f"no whole-piece wall ring fits the flat-ground box (x within +-{FLAT_HALF_X:g}, y within +-{FLAT_HALF_Y:g}, "
            f"{FLAT_MARGIN_M} m margin) for wall_segment {seg_l:.2f} m long, wall_tower {tower_w:.2f} x {tower_d:.2f} m and "
            f"gatehouse {gate_w:.2f} x {gate_d:.2f} m; shrink those pieces or widen the box in design.md and the ground asset together"
        )
    _, n_g, n_s, n_e, top, bottom, height = best
    return n_g, n_s, n_e, top, bottom, height, (top - bottom) / 2.0


def build_ring(world: World) -> Ring:
    fp = world.fp
    seg_l, seg_t = fp["wall_segment"]
    tower_w, tower_d = fp["wall_tower"]
    gate_w = fp["gatehouse"][0]
    g = RING_GAP_M
    n_g, n_s, n_e, top, bottom, height, _ = plan_ring(fp)
    sw = (-bottom / 2.0, -height / 2.0)
    se = (bottom / 2.0, -height / 2.0)
    ne = (top / 2.0, height / 2.0)
    nw = (-top / 2.0, height / 2.0)

    for corner in (sw, se, ne, nw):
        world.add("wall_tower", corner[0], corner[1], 0.0, "tower")

    def lay(p: tuple[float, float], qpt: tuple[float, float], items: list[tuple[str, float, str]]) -> None:
        dx, dy = qpt[0] - p[0], qpt[1] - p[1]
        length = math.hypot(dx, dy)
        d = (dx / length, dy / length)
        yaw = yaw_of(d[1], -d[0])  # outward normal of a counter-clockwise ring
        # How far the (possibly non-square) corner tower reaches along this edge from its centre.
        reach = min(half / abs(c) for half, c in ((tower_w / 2.0, d[0]), (tower_d / 2.0, d[1])) if abs(c) > 1e-9)
        s = reach + g
        for asset, extent, tag in items:
            c = s + extent / 2.0
            world.add(asset, p[0] + d[0] * c, p[1] + d[1] * c, yaw, tag)
            s += extent + g
        end_gap = length - reach - (s - g)  # last piece to the far tower; the edge is built to leave exactly g
        if abs(end_gap - g) > 0.005:
            raise LayoutError(f"wall edge {p}->{qpt} does not close: {end_gap:.4f} m between its last piece and the "
                              f"far tower instead of {g} m")

    segments = lambda n: [("wall_segment", seg_l, "wall")] * n  # noqa: E731
    lay(sw, se, segments(n_s))
    lay(se, ne, segments(n_e))
    lay(ne, nw, segments(n_g) + [("gatehouse", gate_w, "gate")] + segments(n_g))
    lay(nw, sw, segments(n_e))
    return Ring(sw, se, ne, nw, seg_t / 2.0)


# ---- houses along a street edge --------------------------------------------------------
def house_weights(distance: float) -> dict[str, float]:
    t = min(max((distance - 15.0) / 40.0, 0.0), 1.0)
    return {k: NEAR_WEIGHTS[k] * (1.0 - t) + FAR_WEIGHTS[k] * t for k in HOUSE_KINDS}


def fill_frontage(world: World, rng: Rng, anchor: tuple[float, float], along: tuple[float, float],
                  front: tuple[float, float], length: float, max_count: int) -> list[Placement]:
    """Line a street edge with houses whose fronts face `front`.

    `anchor` is the street-edge point where the row starts, `along` runs down the row and
    `front` points from the houses to the street. Each house is turned a few degrees off
    square and then slid back until its most forward corner just touches the edge line.
    """
    back = (-front[0], -front[1])
    base_yaw = yaw_of(front[0], front[1])
    placed: list[Placement] = []
    cursor, previous = 0.0, None
    while len(placed) < max_count:
        mid = (anchor[0] + along[0] * (cursor + 4.0), anchor[1] + along[1] * (cursor + 4.0))
        weights = house_weights(math.hypot(mid[0], mid[1] - CROSS_Y))
        weights = {k: (0.0 if k == previous else w) for k, w in weights.items()}
        total = sum(weights.values())
        draw = rng.f() * total
        first, acc = HOUSE_KINDS[-1], 0.0
        for kind in HOUSE_KINDS:
            acc += weights[kind]
            if draw < acc:
                first = kind
                break
        order = [first] + sorted((k for k in HOUSE_KINDS if k != first), key=lambda k: (-weights[k], k))
        yaw = q(norm_yaw(base_yaw + rng.uniform(-3.0, 3.0)), 2)
        gap = rng.uniform(1.0, 2.4)
        if rng.chance(0.12):
            gap = rng.uniform(3.0, 4.0)
        chosen = None
        for kind in order:
            fx, fy = world.fp[kind]
            pts = [rotate(sx * fx / 2.0, sy * fy / 2.0, yaw) for sx in (-1, 1) for sy in (-1, 1)]
            us = [p[0] * along[0] + p[1] * along[1] for p in pts]
            vs = [p[0] * back[0] + p[1] * back[1] for p in pts]
            extent = max(us) - min(us)
            if cursor + extent <= length:
                chosen = (kind, min(us), extent, -min(vs))
                break
        if chosen is None:
            break
        kind, u_min, extent, v_centre = chosen
        u_centre = cursor - u_min
        x = anchor[0] + along[0] * u_centre + back[0] * v_centre
        y = anchor[1] + along[1] * u_centre + back[1] * v_centre
        placed.append(world.add(kind, x, y, yaw, "house"))
        previous = kind
        cursor += extent + gap
    return placed


def max_corner(world: World, placements: list[Placement], axis: int) -> float:
    return max(c[axis] for p in placements for c in world.boxes[p.id].corners())


# ---- the whole town --------------------------------------------------------------------
def build_town(footprints: dict[str, tuple[float, float]], heights: dict[str, float], inventory_sha: str) -> dict:
    rng = Rng(SEED)
    ground_w, ground_d = footprints["ground"]
    extent_half = (math.floor(ground_w / 2.0 * 10.0) / 10.0, math.floor(ground_d / 2.0 * 10.0) / 10.0)
    world = World(footprints, extent_half)
    world.add("ground", 0.0, 0.0, 0.0, "ground")

    ring = build_ring(world)
    gate = next(p for p in world.placements if p.tag == "gate")
    gate_inner_y = gate.y - footprints["gatehouse"][1] / 2.0
    gate_outer_y = gate.y + footprints["gatehouse"][1] / 2.0

    # Plaza: church closes the south side, the well sits at the middle, stalls in two blocks.
    church_w, church_d = footprints["church"]
    church = world.add("church", 0.0, PLAZA_Y0 - church_d / 2.0, 0.0, "church")
    world.add("well", 0.0, CROSS_Y, 0.0, "prop")
    for side in (-1.0, 1.0):
        for column in (6.5, 12.5):
            for row in (6.0, -6.0):
                yaw = (180.0 if row > 0 else 0.0) + rng.uniform(-4.0, 4.0)
                world.add("market_stall", side * column + rng.uniform(-0.3, 0.3),
                          CROSS_Y + row + rng.uniform(-0.3, 0.3), yaw, "prop")

    # Houses around the plaza edge, then down Main Street and along Cross Street.
    edge_x = PLAZA_HALF_W - 0.5
    north_flank = []
    for sign in (1.0, -1.0):
        north_flank += fill_frontage(world, rng, (sign * (STREET_HALF + 1.0), PLAZA_Y1), (sign, 0.0), (0.0, -1.0),
                                     edge_x - (STREET_HALF + 1.0), 2)
    for sign in (1.0, -1.0):
        start = church_w / 2.0 + 1.2
        fill_frontage(world, rng, (sign * start, PLAZA_Y0), (sign, 0.0), (0.0, 1.0), edge_x - start, 1)

    main_start = max_corner(world, north_flank, 1) + 1.2
    main_end = gate_inner_y - 7.0
    for sign in (1.0, -1.0):
        fill_frontage(world, rng, (sign * STREET_HALF, main_start), (0.0, 1.0), (-sign, 0.0),
                      main_end - main_start, 4)
    arm_start = PLAZA_HALF_W + 0.7
    for sign in (1.0, -1.0):
        for side, face in ((1.0, -1.0), (-1.0, 1.0)):
            row_y = CROSS_Y + side * STREET_HALF
            arm_end = ring.inner_x(row_y + side * 6.5) - 4.5
            fill_frontage(world, rng, (sign * arm_start, row_y), (sign, 0.0), (0.0, face),
                          arm_end - arm_start, 3)

    # ---- player, probes, vantages and keep-out zones for dressing ----
    start_xy = (0.0, 3.0)
    wall_run_x = ring.inner_x(CROSS_Y) - 3.0
    walk_z = heights["wall_segment"] * WALKWAY_FRACTION + EYE_HEIGHT_M
    wall_view_y = 20.0
    vantages = [
        ("plaza", (-14.0, 4.0), (4.0, -14.0), EYE_HEIGHT_M, 3.0),
        ("main_street", (0.0, 8.0), (0.0, 60.0), EYE_HEIGHT_M, -2.0),
        ("gate_inside", (0.0, gate_inner_y - 14.0), (0.0, 80.0), EYE_HEIGHT_M, 8.0),
        ("gate_outside", (0.0, gate_outer_y + 15.0), (0.0, 0.0), EYE_HEIGHT_M, 8.0),
        ("wall_walk", (ring.east_x(wall_view_y) - WALKWAY_INSET_M, wall_view_y), (-30.0, wall_view_y), walk_z, -6.0),
        ("church_front", (0.0, PLAZA_Y1 - 1.6), (0.0, -60.0), EYE_HEIGHT_M, 14.0),
        ("cross_street", (-ring.inner_x(CROSS_Y) + 9.0, CROSS_Y), (60.0, CROSS_Y), EYE_HEIGHT_M, -2.0),
    ]
    vantage_list = []
    for name, (vx, vy), (tx, ty), vz, pitch in vantages:
        yaw = q(norm_yaw(yaw_of(tx - vx, ty - vy)), 2)
        vantage_list.append({"name": name, "location": [q(vx), q(vy), q(vz)], "yaw_deg": yaw, "pitch_deg": q(pitch, 1)})
        if vz < 3.0:  # keep props and trees out of the lens and the 14 m sight line ahead of it
            ahead = rotate(0.0, 1.0, yaw)
            world.lens_keepouts.append(Box(vx + 7.0 * ahead[0], vy + 7.0 * ahead[1], 1.6, 7.0, yaw))
            world.lens_keepouts.append(Box(vx, vy, 1.6, 1.6, 0.0))
    world.keepouts += [
        rect_box(-LANE_HALF, LANE_HALF, PLAZA_Y1 - 3.0, gate_inner_y + 0.5),
        rect_box(-ring.east_x(0.0) + 1.0, ring.east_x(0.0) - 1.0, CROSS_Y - LANE_HALF, CROSS_Y + LANE_HALF),
        rect_box(-4.0, 4.0, PLAZA_Y0, PLAZA_Y1),
        rect_box(-4.0, 4.0, gate_outer_y, extent_half[1]),
        rect_box(start_xy[0] - 2.5, start_xy[0] + 2.5, start_xy[1] - 2.5, start_xy[1] + 2.5),
        rect_box(wall_run_x - 1.0, ring.east_x(CROSS_Y) + 1.0, CROSS_Y - 3.0, CROSS_Y + 3.0),
    ]

    dress(world, rng, ring, gate_inner_y, church)

    for p in world.placements:  # the ground is flat only inside the box, so nothing may reach past it
        if p.tag == "ground":
            continue
        excess = max(max(abs(x) - FLAT_HALF_X, abs(y) - FLAT_HALF_Y) for x, y in world.boxes[p.id].corners())
        if excess > 0.0:
            raise LayoutError(
                f"{p.id} ({p.asset}) reaches {excess:.3f} m outside the flat-ground box (x within +-{FLAT_HALF_X:g}, "
                f"y within +-{FLAT_HALF_Y:g}); the town plan must keep every footprint inside it"
            )

    placements = sorted(world.placements, key=lambda p: (TAG_ORDER[p.tag], p.id))
    return {
        "schema_version": SCHEMA_VERSION,
        "generator": GENERATOR,
        "seed": SEED,
        "units": "metres",
        "inventory_sha256": inventory_sha,
        "extent_m": {"min": [-extent_half[0], -extent_half[1]], "max": [extent_half[0], extent_half[1]]},
        "wall_ring_m": [[q(x), q(y)] for x, y in ring.polygon()],
        "placements": [p.as_dict() for p in placements],
        "player_start_m": {"location": [q(start_xy[0]), q(start_xy[1]), 0.0], "yaw_deg": 0.0},
        "vantages_m": vantage_list,
        "sun": {"pitch_deg": -38.0, "yaw_deg": 125.0},
        "walk_probe_m": {
            "open_run_start": [q(start_xy[0]), q(start_xy[1])],
            "open_run_heading_deg": 0.0,
            "wall_run_start": [q(wall_run_x), q(CROSS_Y)],
            "wall_run_heading_deg": q(norm_yaw(yaw_of(1.0, 0.0)), 2),
        },
    }


# ---- dressing: props and trees ---------------------------------------------------------
def dress(world: World, rng: Rng, ring: Ring, gate_inner_y: float, church: Placement) -> None:
    fp = world.fp
    goods = ("crate", "barrel", "sack_pile")

    # Goods around the market stalls.
    for stall in [p for p in world.placements if p.asset == "market_stall"]:
        sx, sy = fp["market_stall"]
        for _ in range(1 + (1 if rng.chance(0.6) else 0)):
            item = rng.pick(goods)
            ix, iy = fp[item]
            beside, sign = rng.chance(0.5), (-1.0 if rng.chance(0.5) else 1.0)
            jitter_a, jitter_b, spin = rng.f() - 0.5, rng.f() - 0.5, rng.f() - 0.5
            if beside:
                du, dv = sign * (sx / 2.0 + ix / 2.0 + 0.25), jitter_a * 0.8
            else:
                du, dv = jitter_b * 1.6, -(sy / 2.0 + iy / 2.0 + 0.25)
            x, y = local_offset(stall, du, dv)
            world.try_add(item, x, y, stall.yaw + spin * 40.0, "prop", margin=0.1)

    # Carts: one on the plaza, one on the Cross Street verge, one in the gate court.
    for candidates in (
        [(-17.2, -1.5, 85.0), (17.2, -1.5, 95.0)],
        [(30.0, CROSS_Y - 4.6, 5.0), (27.0, CROSS_Y + 4.8, -8.0), (36.0, CROSS_Y - 4.8, 4.0)],
        [(9.0, gate_inner_y - 3.0, 25.0), (-9.0, gate_inner_y - 3.0, -20.0)],
    ):
        for x, y, yaw in candidates:
            if world.try_add("cart", x, y, yaw, "prop", margin=0.4):
                break

    # Braziers: church door, gate court, plaza corners.
    brazier_spots = [
        (-3.2, PLAZA_Y0 + 1.1), (3.2, PLAZA_Y0 + 1.1),
        (-4.6, gate_inner_y - 1.8), (4.6, gate_inner_y - 1.8),
        (-17.0, 5.0), (17.0, 5.0),
    ]
    for x, y in brazier_spots:
        world.try_add("brazier", x, y, rng.uniform(0.0, 90.0), "prop", margin=0.3, keepouts=False)

    # Barrels, crates and sacks at the gate court.
    for _ in range(5):
        item, side = rng.pick(goods), (-1.0 if rng.chance(0.5) else 1.0)
        x, y = side * rng.uniform(4.2, 6.5), gate_inner_y - rng.uniform(0.9, 3.4)
        world.try_add(item, x, y, rng.uniform(-30.0, 30.0), "prop", margin=0.2)

    # Goods at house fronts and fences behind some houses.
    for house in [p for p in world.placements if p.tag == "house"]:
        hx, hy = fp[house.asset]
        if rng.chance(0.5):
            for _ in range(1 + (1 if rng.chance(0.4) else 0)):
                item = rng.pick(goods)
                ix, iy = fp[item]
                du = (rng.f() - 0.5) * (hx - 1.6)
                x, y = local_offset(house, du, hy / 2.0 + iy / 2.0 + 0.2)
                world.try_add(item, x, y, house.yaw + rng.uniform(-25.0, 25.0), "prop", margin=0.1)
        else:
            rng.f(), rng.f(), rng.f(), rng.f()
        if rng.chance(0.55):
            fence_x = fp["fence"][0]
            pieces = 2 if hx > 6.5 else 1
            for index in range(pieces):
                du = (index - (pieces - 1) / 2.0) * (fence_x + 0.05)
                x, y = local_offset(house, du, -(hy / 2.0 + 1.1))
                world.try_add("fence", x, y, house.yaw, "prop", margin=0.15)
        else:
            rng.f()

    # Churchyard fence behind the church and a short return on each side.
    fence_x = fp["fence"][0]
    back_y = church.y - fp["church"][1] / 2.0 - 1.6
    half = fp["church"][0] / 2.0 + 3.0
    count = int(2 * half / (fence_x + 0.05))
    for index in range(count):
        world.try_add("fence", -half + (index + 0.5) * (fence_x + 0.05), back_y, 0.0, "prop", margin=0.1, keepouts=False)
    for sign in (-1.0, 1.0):
        world.try_add("fence", sign * half, back_y + fence_x / 2.0 + 0.15, 90.0, "prop", margin=0.1, keepouts=False)

    # Goods hugging the inside of the wall.
    walls = [p for p in world.placements if p.tag == "wall"]
    for wall in walls:
        if rng.chance(0.10):
            item = rng.pick(goods)
            ix, iy = fp[item]
            x, y = local_offset(wall, rng.uniform(-2.5, 2.5), -(fp["wall_segment"][1] / 2.0 + iy / 2.0 + 0.5))
            world.try_add(item, x, y, wall.yaw + rng.uniform(-20.0, 20.0), "prop", margin=0.15)
        else:
            rng.f(), rng.f()
            rng.f()

    # Corners: a tree on the diagonal and goods tucked against each wall beside every corner tower.
    for tower in [p for p in world.placements if p.tag == "tower"]:
        ix, iy = (-1.0 if tower.x > 0 else 1.0), (-1.0 if tower.y > 0 else 1.0)
        spin = rng.uniform(0.0, 360.0)
        world.try_add("tree", tower.x + ix * 5.4, tower.y + iy * 5.4, spin, "tree", margin=0.4)
        for dx, dy in ((3.2, 1.6), (1.6, 3.2)):
            item, turn = rng.pick(goods), rng.uniform(-20.0, 20.0)
            world.try_add(item, tower.x + ix * dx, tower.y + iy * dy, turn, "prop", margin=0.15)

    # Trees: an orchard in each block between the streets, then a row just inside each wall.
    for cx, cy, cols, rows in ((34.0, 33.0, 3, 3), (-34.0, 33.0, 3, 2), (36.0, -36.0, 3, 3), (-36.0, -36.0, 2, 3)):
        for i in range(cols):
            for j in range(rows):
                x = cx + (i - (cols - 1) / 2.0) * 9.0 + rng.uniform(-0.8, 0.8)
                y = cy + (j - (rows - 1) / 2.0) * 9.0 + rng.uniform(-0.8, 0.8)
                world.try_add("tree", x, y, rng.uniform(0.0, 360.0), "tree", margin=0.8)
    inset = fp["tree"][0] / 2.0 + 1.6
    for step in range(-48, 49, 16):
        for sign in (-1.0, 1.0):
            jitter, spin = rng.uniform(-2.0, 2.0), rng.uniform(0.0, 360.0)
            world.try_add("tree", step + jitter, sign * (ring.inner_y() - inset), spin, "tree", margin=0.8)
            jitter, spin = rng.uniform(-2.0, 2.0), rng.uniform(0.0, 360.0)
            y = step * 1.1 + jitter
            world.try_add("tree", sign * (ring.inner_x(y) - inset), y, spin, "tree", margin=0.8)


# ---- JSON text -------------------------------------------------------------------------
def fmt_number(value) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, int):
        return str(value)
    text = f"{value:.3f}".rstrip("0")
    if text.endswith("."):
        text += "0"
    return "0.0" if text in ("-0.0", "-0") else text


def dump(value, level: int = 0) -> str:
    pad = "  " * level
    if isinstance(value, dict):
        flat = all(not isinstance(v, dict) and not (isinstance(v, list) and any(isinstance(i, (list, dict)) for i in v))
                   for v in value.values())
        if flat:
            line = "{" + ", ".join(f"{json.dumps(k)}: {dump(v)}" for k, v in value.items()) + "}"
            if len(line) <= 170:
                return line
        body = ",\n".join(f"{pad}  {json.dumps(k)}: {dump(v, level + 1)}" for k, v in value.items())
        return "{\n" + body + "\n" + pad + "}"
    if isinstance(value, list):
        if all(not isinstance(i, (dict, list)) for i in value):
            return "[" + ", ".join(dump(i) for i in value) + "]"
        body = ",\n".join(f"{pad}  {dump(i, level + 1)}" for i in value)
        return "[\n" + body + "\n" + pad + "]"
    if isinstance(value, str):
        return json.dumps(value)
    return fmt_number(value)


def layout_bytes(layout: dict) -> bytes:
    return (dump(layout) + "\n").encode("utf-8")


# ---- command line ----------------------------------------------------------------------
def summarise(layout: dict) -> str:
    counts: dict[str, int] = {}
    for p in layout["placements"]:
        counts[p["tag"]] = counts.get(p["tag"], 0) + 1
    ring = layout["wall_ring_m"]
    xs, ys = [c[0] for c in ring], [c[1] for c in ring]
    start = layout["player_start_m"]
    by_tag = ", ".join(f"{tag} {counts[tag]}" for tag in sorted(counts, key=lambda t: TAG_ORDER[t]))
    return (
        f"placements: {len(layout['placements'])} total ({by_tag})\n"
        f"wall ring (tower centres): x {min(xs):.2f}..{max(xs):.2f}, y {min(ys):.2f}..{max(ys):.2f} "
        f"({max(xs) - min(xs):.2f} x {max(ys) - min(ys):.2f} m between tower centres)\n"
        f"player start: ({start['location'][0]}, {start['location'][1]}) yaw {start['yaw_deg']}"
    )


def main(argv: list[str] | None = None) -> int:
    if sys.version_info[:2] != (3, 13):
        sys.stderr.write(
            "build_layout.py needs CPython 3.13 (pinned in docs/work/2_medieval-city/design.md) but is running "
            f"{'.'.join(str(v) for v in sys.version_info[:3])}; run it with the system Python 3.13.\n"
        )
        return 2
    parser = argparse.ArgumentParser(description="Write the deterministic medieval town layout JSON.")
    parser.add_argument("--inventory", type=Path, default=DEFAULT_INVENTORY, help="inventory.json to read")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="city_layout.json to write")
    args = parser.parse_args(argv)
    try:
        sha, footprints, heights = load_inventory(args.inventory)
        layout = build_town(footprints, heights, sha)
    except LayoutError as exc:
        sys.stderr.write(f"build_layout.py: {exc}\n")
        return 2
    payload = layout_bytes(layout)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_bytes(payload)
    print(f"wrote {args.output} ({len(payload)} bytes, sha256 {hashlib.sha256(payload).hexdigest()})")
    print(summarise(layout))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
