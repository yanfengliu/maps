#!/usr/bin/env python3
"""Layout gate for the medieval town: `python tools/medieval/test_layout.py`.

Reads assets/generated/medieval/city_layout.json and inventory.json and exits non-zero,
naming placement ids, the measured value and what would satisfy it, when an invariant fails.
Standard library only, CPython 3.13. It does not import build_layout.py: every geometric
rule below is implemented here, so the generator is never graded by its own code.

Bounds (what a pass does and does not prove):
  - Plan-view (2D) geometry only: each footprint is the inventory footprint_m
    ([size along local X, size along local Y]) centred on location_m and rotated by yaw_deg,
    as in docs/work/2_medieval-city/design.md. No mesh, height, collision or engine claim.
  - Overlap tolerance 0.001 m of separating-axis depth, for float noise only; the ground
    placement is the surface under everything and is excluded from overlap and clearance.
  - The street and plaza regions and the flat-ground box (x within +-60, y within +-64) are
    the design.md numbers, copied below as constants; change design.md and these together.
  - The gate path assumes a 3.0 m passage centred in the gatehouse footprint and a 0.34 m
    capsule radius on a 0.5 m grid. The inventory does not record the opening; W1 reports a
    3.0 m arch with a clear 2.3 m x 2.6 m corridor asserted at build time, which this check
    takes on trust.
  - The open run must be 20 m, not the 12 m design.md names: the probe holds W for 3 s, toggles the
    camera and holds W for 3 s again from where the first walk ended, about 17.5 m along that heading.
  - Vantage framing, house facing in the engine and visual quality are not checked here.

Frame: x east, y north, Z up, yaw counter-clockwise from above, front vector (-sin t, cos t).
Exit codes: 0 all checks pass, 1 a check failed, 2 an input file or the Python version is wrong.
"""

from __future__ import annotations

import argparse
import hashlib
import math
import json
import subprocess
import sys
import tempfile
from collections import deque
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INVENTORY = ROOT / "assets" / "generated" / "medieval" / "inventory.json"
DEFAULT_LAYOUT = ROOT / "assets" / "generated" / "medieval" / "city_layout.json"
GENERATOR = Path(__file__).with_name("build_layout.py")
INVENTORY_COMMAND = "python tools/blender/build_assets.py"
LAYOUT_COMMAND = "python tools/medieval/build_layout.py"

SEED = 20261027
TAGS = ("ground", "wall", "tower", "gate", "house", "church", "prop", "tree")
BUILDING_TAGS = ("house", "church")
RING_TAGS = ("wall", "tower", "gate")
PROP_ASSETS = ("barrel", "brazier", "cart", "crate", "fence", "sack_pile")

# ---- bounds, named so each message can quote them ----------------------------------------
OVERLAP_TOL_M = 0.001
RING_TOL_M = 0.01
GROUND_TOL_M = 0.001
PLAYER_CLEARANCE_M = 1.5
PLAYER_NEAR_PLAZA_M = 10.0
# The probe holds W for 3 s, toggles the camera, then holds W for another 3 s from where the first walk
# ended, without repositioning: about 8.7 m each at 300 cm/s with 1500 cm/s/s acceleration, so about
# 17.5 m along the heading in all. design.md's 12 m is too short for that. Do not lower this figure.
OPEN_RUN_MIN_M = 20.0
STREET_CLEAR_WIDTH_M = 4.0
WALL_RUN_MAX_M = 4.0
WALL_RUN_START_CLEARANCE_M = 0.5
WALL_RUN_MAX_INCIDENCE_DEG = 30.0
BUILDINGS_MIN, BUILDINGS_MAX = 20, 35
HOUSE_FLUSH_M = 0.6
HOUSE_FACING_PROBE_M = 2.0
VANTAGE_MIN_COUNT = 5
VANTAGE_CLEARANCE_M = 1.0
VANTAGE_VIEW_MIN_M, VANTAGE_VIEW_MAX_M = 3.0, 90.0
ELEVATED_VANTAGE_Z_M = 3.0
CAPSULE_RADIUS_M = 0.34
GATE_PASSAGE_M = 3.0
GATE_GOAL_OUTSIDE_M = 6.0
GRID_M = 0.5
REGENERATE_TIMEOUT_S = 120   # per generator run; a normal run takes about a second
MAX_FINDINGS = 12

# design.md numbers in layout metres, copied here; change design.md and these together.
# Flat-ground box: the ground is exactly flat at Z = 0 for x within +-60 and y within +-64.
FLAT_HALF_X, FLAT_HALF_Y = 60.0, 64.0
FLAT_TOL_M = 0.001
# "Street and plaza regions", each as (x0, x1, y0, y1).
PLAZA = (-19.0, 19.0, -19.0, 7.0)
MAIN_STREET = (-3.5, 3.5, 7.0, 68.0)                     # through the gate and its apron out to y 68
CROSS_STREET = (-FLAT_HALF_X, FLAT_HALF_X, -9.5, -2.5)   # across the flat box
REGIONS = (PLAZA, MAIN_STREET, CROSS_STREET)


# ---- geometry (independent of build_layout.py) ---------------------------------------------
class Rect:
    """Oriented rectangle for one placement."""

    __slots__ = ("id", "tag", "asset", "cx", "cy", "hx", "hy", "yaw", "ux", "uy", "vx", "vy")

    def __init__(self, pid: str, tag: str, asset: str, cx: float, cy: float,
                 hx: float, hy: float, yaw_deg: float) -> None:
        self.id, self.tag, self.asset = pid, tag, asset
        self.cx, self.cy, self.hx, self.hy, self.yaw = cx, cy, hx, hy, yaw_deg
        t = math.radians(yaw_deg)
        self.ux, self.uy = math.cos(t), math.sin(t)        # local +X
        self.vx, self.vy = -math.sin(t), math.cos(t)       # local +Y, the front

    def corners(self) -> list[tuple[float, float]]:
        return [
            (self.cx + sx * self.hx * self.ux + sy * self.hy * self.vx,
             self.cy + sx * self.hx * self.uy + sy * self.hy * self.vy)
            for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))
        ]

    def local(self, x: float, y: float) -> tuple[float, float]:
        dx, dy = x - self.cx, y - self.cy
        return dx * self.ux + dy * self.uy, dx * self.vx + dy * self.vy

    def distance_to(self, x: float, y: float) -> float:
        lx, ly = self.local(x, y)
        return math.hypot(max(abs(lx) - self.hx, 0.0), max(abs(ly) - self.hy, 0.0))


def sat_depth(a: Rect, b: Rect) -> float:
    """Smallest overlap over the four separating axes: > 0 overlapping, <= 0 apart."""
    dx, dy = b.cx - a.cx, b.cy - a.cy
    depth = math.inf
    for ax, ay in ((a.ux, a.uy), (a.vx, a.vy), (b.ux, b.uy), (b.vx, b.vy)):
        ra = a.hx * abs(a.ux * ax + a.uy * ay) + a.hy * abs(a.vx * ax + a.vy * ay)
        rb = b.hx * abs(b.ux * ax + b.uy * ay) + b.hy * abs(b.vx * ax + b.vy * ay)
        depth = min(depth, ra + rb - abs(dx * ax + dy * ay))
    return depth


def segment_distance(px: float, py: float, a: tuple[float, float], b: tuple[float, float]) -> float:
    abx, aby = b[0] - a[0], b[1] - a[1]
    length2 = abx * abx + aby * aby
    t = 0.0 if length2 == 0 else max(0.0, min(1.0, ((px - a[0]) * abx + (py - a[1]) * aby) / length2))
    return math.hypot(px - (a[0] + t * abx), py - (a[1] + t * aby))


def signed_distance_to_polygon(px: float, py: float, poly: list[tuple[float, float]]) -> float:
    """Negative inside the polygon, positive outside, magnitude = distance to its boundary."""
    inside = False
    nearest = math.inf
    for k in range(len(poly)):
        a, b = poly[k], poly[(k + 1) % len(poly)]
        nearest = min(nearest, segment_distance(px, py, a, b))
        if (a[1] > py) != (b[1] > py) and px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]:
            inside = not inside
    return -nearest if inside else nearest


def clip_half_plane(poly: list[tuple[float, float]], axis: int, bound: float, keep_below: bool) -> list[tuple[float, float]]:
    """Sutherland-Hodgman clip of a polygon to coordinate[axis] <= bound (or >= bound)."""
    def inside(p: tuple[float, float]) -> bool:
        return p[axis] <= bound if keep_below else p[axis] >= bound

    out: list[tuple[float, float]] = []
    for k in range(len(poly)):
        cur, nxt = poly[k], poly[(k + 1) % len(poly)]
        if inside(cur):
            out.append(cur)
        if inside(cur) != inside(nxt):
            t = (bound - cur[axis]) / (nxt[axis] - cur[axis])
            out.append((cur[0] + t * (nxt[0] - cur[0]), cur[1] + t * (nxt[1] - cur[1])))
    return out


def clear_run(start: tuple[float, float], heading_deg: float, half_width: float,
              rects: list[Rect]) -> tuple[float, str | None]:
    """Distance along the heading to the first footprint touching the strip |side| <= half_width."""
    h = math.radians(heading_deg)
    fx, fy = -math.sin(h), math.cos(h)
    sx, sy = math.cos(h), math.sin(h)
    best: tuple[float, str | None] = (math.inf, None)
    for r in rects:
        pts = [((x - start[0]) * fx + (y - start[1]) * fy, (x - start[0]) * sx + (y - start[1]) * sy)
               for x, y in r.corners()]
        pts = clip_half_plane(pts, 1, half_width, True)
        pts = clip_half_plane(pts, 1, -half_width, False)
        if len(pts) < 3:
            continue
        along, side = [p[0] for p in pts], [p[1] for p in pts]
        if max(side) - min(side) < 1e-6 or max(along) - min(along) < 1e-6 or max(along) <= 1e-9:
            continue
        entry = max(min(along), 0.0)
        if entry < best[0]:
            best = (entry, r.id)
    return best


def ray_hit(origin: tuple[float, float], heading_deg: float, r: Rect) -> tuple[float, float] | None:
    """Slab test: (distance to the rectangle, incidence angle in degrees from its face normal)."""
    h = math.radians(heading_deg)
    dxw, dyw = -math.sin(h), math.cos(h)
    ox, oy = r.local(*origin)
    dx, dy = dxw * r.ux + dyw * r.uy, dxw * r.vx + dyw * r.vy
    t_near, t_far, entry_axis_component = 0.0, math.inf, 1.0
    for o, d, half in ((ox, dx, r.hx), (oy, dy, r.hy)):
        if abs(d) < 1e-12:
            if abs(o) > half:
                return None
            continue
        t1, t2 = sorted(((-half - o) / d, (half - o) / d))
        if t1 > t_near:
            t_near, entry_axis_component = t1, abs(d)
        t_far = min(t_far, t2)
        if t_near > t_far:
            return None
    if t_far < 0.0:
        return None
    return t_near, math.degrees(math.acos(min(1.0, entry_axis_component)))


def rect_union_distance(x: float, y: float, rects: list[tuple[float, float, float, float]]) -> float:
    best = math.inf
    for x0, x1, y0, y1 in rects:
        best = min(best, math.hypot(max(x0 - x, 0.0, x - x1), max(y0 - y, 0.0, y - y1)))
    return best


def forward(deg: float) -> tuple[float, float]:
    return -math.sin(math.radians(deg)), math.cos(math.radians(deg))


def geometry_self_test() -> list[str]:
    """Hand-computed cases, so the primitives above are not trusted on their own say-so."""
    problems: list[str] = []

    def expect(label: str, got: float, want: float, tol: float = 1e-6) -> None:
        if abs(got - want) > tol:
            problems.append(f"{label}: computed {got:.6f}, hand-computed {want:.6f}")

    def r(cx, cy, hx, hy, yaw=0.0, tag="prop"):
        return Rect("t", tag, "t", cx, cy, hx, hy, yaw)

    expect("two 2x2 squares 1.5 apart overlap by", sat_depth(r(0, 0, 1, 1), r(1.5, 0, 1, 1)), 0.5)
    expect("two 2x2 squares touching overlap by", sat_depth(r(0, 0, 1, 1), r(2.0, 0, 1, 1)), 0.0)
    expect("two 2x2 squares 2.5 apart overlap by", sat_depth(r(0, 0, 1, 1), r(2.5, 0, 1, 1)), -0.5)
    expect("square rotated 45 degrees against a square at x=2.2", sat_depth(r(0, 0, 1, 1, 45.0), r(2.2, 0, 1, 1)),
           math.sqrt(2.0) - 1.2)
    # yaw 90 turns the 4 x 1 wall so it spans x -0.5..0.5; the box spans x 0.4..2.4, so they overlap by 0.1
    expect("4x1 wall at yaw 90 against a 2x2 box centred 1.4 away", sat_depth(r(0, 0, 2.0, 0.5, 90.0), r(1.4, 0, 1, 1)),
           0.5 + 1.0 - 1.4)
    # The yaw convention of design.md: counter-clockwise from above, front vector (-sin t, cos t).
    plank = r(0.0, 0.0, 3.0, 0.4, 30.0)  # its +X end lies at (2.598, 1.5)
    if sat_depth(plank, r(2.6, 1.5, 0.3, 0.3)) <= 0.0:
        problems.append("a box at (2.6, 1.5) misses the +X end of a plank turned +30 degrees; yaw must turn counter-clockwise")
    if sat_depth(plank, r(2.6, -1.5, 0.3, 0.3)) > 0.0:
        problems.append("a box at (2.6, -1.5) hits a plank turned +30 degrees; yaw must turn counter-clockwise")
    facing = r(0.0, 0.0, 1.0, 1.0, 90.0)
    expect("front direction x at yaw 90 (faces west)", facing.vx, -1.0)
    expect("front direction y at yaw 90", facing.vy, 0.0)
    expect("heading 0 looks along +y", forward(0.0)[1], 1.0)
    expect("heading -90 looks along +x", forward(-90.0)[0], 1.0)
    square = [(0.0, 0.0), (10.0, 0.0), (10.0, 10.0), (0.0, 10.0)]
    expect("point 3 m inside a square", signed_distance_to_polygon(3.0, 5.0, square), -3.0)
    expect("point 2 m outside a square", signed_distance_to_polygon(12.0, 5.0, square), 2.0)
    wall = r(10.0, 0.0, 0.8, 4.0)
    dist, incidence = ray_hit((4.0, 0.0), -90.0, wall)  # heading -90 faces +X
    expect("ray to a wall 5.2 m ahead", dist, 5.2)
    expect("ray incidence head-on", incidence, 0.0)
    dist, incidence = ray_hit((4.0, 0.0), -60.0, wall)
    expect("ray 30 degrees off head-on, incidence", incidence, 30.0, 1e-4)
    if ray_hit((4.0, 0.0), 90.0, wall) is not None:
        problems.append("a ray heading away from a wall reported a hit")
    blocker = r(0.0, 10.0, 1.0, 1.0)  # 4 m strip around x=0 meets it at y=9
    expect("strip run to a box straight ahead", clear_run((0.0, 0.0), 0.0, 2.0, [blocker])[0], 9.0)
    expect("strip run past a box 2.5 m to the side", clear_run((0.0, 0.0), 0.0, 2.0, [r(3.5, 10.0, 1.0, 1.0)])[0],
           math.inf)
    return problems


# ---- context ---------------------------------------------------------------------------------
class Context:
    def __init__(self, layout: dict, inventory: dict, inventory_bytes: bytes, layout_path: Path,
                 inventory_path: Path) -> None:
        self.layout, self.inventory = layout, inventory
        self.inventory_sha = hashlib.sha256(inventory_bytes).hexdigest()
        self.layout_path, self.inventory_path = layout_path, inventory_path
        self.assets = inventory["assets"]
        self.rects: dict[str, Rect] = {}
        self.unknown: list[tuple[str, str]] = []
        for p in layout["placements"]:
            entry = self.assets.get(p["asset"])
            fp = entry.get("footprint_m") if isinstance(entry, dict) else None
            if not (isinstance(fp, list) and len(fp) == 2 and all(isinstance(v, (int, float)) and v > 0 for v in fp)):
                self.unknown.append((p["id"], p["asset"]))
                continue
            x, y, _ = p["location_m"]
            self.rects[p["id"]] = Rect(p["id"], p["tag"], p["asset"], x, y, fp[0] / 2.0, fp[1] / 2.0, p["yaw_deg"])
        self.solid = [r for r in self.rects.values() if r.tag != "ground"]
        self.ring = [(float(x), float(y)) for x, y in layout["wall_ring_m"]]
        ex = layout["extent_m"]
        self.extent = (ex["min"][0], ex["max"][0], ex["min"][1], ex["max"][1])

    def by_tag(self, *tags: str) -> list[Rect]:
        return [r for r in self.solid if r.tag in tags]


def is_num(value) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def fmt(v: float) -> str:
    return f"{0.0 if abs(v) < 5e-4 else v:.3f}"


def pt(x: float, y: float) -> str:
    return f"({x:.2f}, {y:.2f})"


# ---- checks: each returns (findings, summary); findings empty means pass --------------------
Result = tuple[list[str], str]


def check_geometry_self_test(_ctx: Context) -> Result:
    problems = geometry_self_test()
    return problems, "separating-axis, polygon, slab-ray and strip primitives match hand-computed cases"


def check_assets_known(ctx: Context) -> Result:
    names = sorted(ctx.assets)
    findings = [
        f"placement {pid} names asset '{asset}', which the inventory does not contain "
        f"(inventory has {len(names)} assets: {', '.join(names)}); use an inventory asset or regenerate "
        f"the inventory with: {INVENTORY_COMMAND}"
        for pid, asset in ctx.unknown
    ]
    ids = [p["id"] for p in ctx.layout["placements"]]
    for pid in sorted({i for i in ids if ids.count(i) > 1}):
        findings.append(f"placement id {pid} appears {ids.count(pid)} times; ids must be unique")
    return findings, f"all {len(ids)} placements name an inventory asset and have a unique id"


def check_overlap(ctx: Context) -> Result:
    rects = sorted(ctx.solid, key=lambda r: r.id)
    findings, closest = [], (-math.inf, "", "")
    pairs = 0
    hits = []
    for i in range(len(rects)):
        for j in range(i + 1, len(rects)):
            pairs += 1
            depth = sat_depth(rects[i], rects[j])
            if depth > closest[0]:
                closest = (depth, rects[i].id, rects[j].id)
            if depth > OVERLAP_TOL_M:
                hits.append((depth, rects[i].id, rects[j].id))
    for depth, a, b in sorted(hits, reverse=True):
        findings.append(
            f"{a} and {b} footprints overlap by {fmt(depth)} m; need at most {OVERLAP_TOL_M} m, "
            f"so move them apart by at least {fmt(depth)} m or remove one"
        )
    summary = (f"{pairs} pairs of {len(rects)} footprints; closest pair {closest[1]} / {closest[2]} "
               f"is separated by {fmt(-closest[0])} m")
    return findings, summary


def check_containment(ctx: Context) -> Result:
    findings = []
    worst_building = -math.inf
    for r in ctx.by_tag(*BUILDING_TAGS):
        outside = max(signed_distance_to_polygon(x, y, ctx.ring) for x, y in r.corners())
        worst_building = max(worst_building, outside)
        if outside > RING_TOL_M:
            findings.append(
                f"{r.id} ({r.tag}) has a corner {fmt(outside)} m outside the wall ring; need every corner inside "
                f"the ring polygon (at most {RING_TOL_M} m outside), so move it inward"
            )
    worst_piece = -math.inf
    for r in ctx.by_tag(*RING_TAGS):
        outside = signed_distance_to_polygon(r.cx, r.cy, ctx.ring)
        worst_piece = max(worst_piece, outside)
        if outside > RING_TOL_M:
            findings.append(
                f"{r.id} ({r.tag}) is centred {fmt(outside)} m outside the wall ring; need its centre on or inside "
                f"the ring polygon (at most {RING_TOL_M} m outside)"
            )
    for r in ctx.by_tag("prop", "tree"):
        outside = max(signed_distance_to_polygon(x, y, ctx.ring) for x, y in r.corners())
        if outside > RING_TOL_M:
            findings.append(
                f"{r.id} ({r.tag}) has a corner {fmt(outside)} m outside the wall ring; design.md keeps the ground flat only "
                f"inside the ring and places nothing outside it, so move it inside (at most {RING_TOL_M} m outside)"
            )
    n_build, n_ring = len(ctx.by_tag(*BUILDING_TAGS)), len(ctx.by_tag(*RING_TAGS))
    n_dress = len(ctx.by_tag("prop", "tree"))
    return findings, (f"{n_build} buildings have every corner inside the ring (the outermost corner is "
                      f"{fmt(-worst_building)} m inside the ring line); {n_dress} props and trees are inside it too; "
                      f"{n_ring} wall, tower and gate pieces sit on or inside it")


def check_ground_cover(ctx: Context) -> Result:
    grounds = [r for r in ctx.rects.values() if r.tag == "ground"]
    findings = []
    if len(grounds) != 1:
        return [f"found {len(grounds)} ground placements ({', '.join(r.id for r in grounds) or 'none'}); need exactly 1"], ""
    g = grounds[0]
    x0, x1, y0, y1 = ctx.extent
    if not (x0 < x1 and y0 < y1):
        return [f"extent_m min {pt(x0, y0)} is not below max {pt(x1, y1)}; need min < max on both axes"], ""
    worst = (-math.inf, (0.0, 0.0))
    for corner in ((x0, y0), (x1, y0), (x1, y1), (x0, y1)):
        lx, ly = g.local(*corner)
        excess = max(abs(lx) - g.hx, abs(ly) - g.hy)
        if excess > worst[0]:
            worst = (excess, corner)
    if worst[0] > GROUND_TOL_M:
        findings.append(
            f"{g.id} footprint ({fmt(2 * g.hx)} x {fmt(2 * g.hy)} m, yaw {g.yaw}) leaves the extent corner "
            f"{pt(*worst[1])} uncovered by {fmt(worst[0])} m; need the ground to cover the whole extent "
            f"{pt(x0, y0)} to {pt(x1, y1)}, so enlarge the ground or shrink extent_m"
        )
    for r in ctx.solid:
        beyond = max(max(x0 - x, x - x1, y0 - y, y - y1) for x, y in r.corners())
        if beyond > GROUND_TOL_M:
            findings.append(
                f"{r.id} ({r.tag}) reaches {fmt(beyond)} m beyond the declared extent, where no ground lies; "
                f"need every footprint inside extent_m"
            )
    return findings, (f"{g.id} covers extent {pt(x0, y0)} to {pt(x1, y1)} "
                      f"(margin {fmt(-worst[0])} m) and every footprint lies inside it")


def check_flat_box(ctx: Context) -> Result:
    findings = []
    spare, outermost = math.inf, None
    for r in sorted(ctx.solid, key=lambda r: r.id):
        excess = max(max(abs(x) - FLAT_HALF_X, abs(y) - FLAT_HALF_Y) for x, y in r.corners())
        if -excess < spare:
            spare, outermost = -excess, r
        if excess > FLAT_TOL_M:
            findings.append(
                f"{r.id} ({r.tag}) reaches {fmt(excess)} m outside the flat-ground box (x within +-{FLAT_HALF_X:g}, "
                f"y within +-{FLAT_HALF_Y:g}); need every non-ground footprint inside it (at most {FLAT_TOL_M} m out), "
                f"because the ground is exactly flat at Z = 0 only there, so move it inward or widen the box in "
                f"design.md and the ground asset together"
            )
    summary = (f"{len(ctx.solid)} footprints lie inside x within +-{FLAT_HALF_X:g}, y within +-{FLAT_HALF_Y:g}; the "
               f"outermost, {outermost.id if outermost else 'none'}, has {fmt(spare)} m to spare") if ctx.solid else "no footprints"
    return findings, summary


def check_player_start(ctx: Context) -> Result:
    start = ctx.layout["player_start_m"]
    x, y, _ = start["location"]
    nearest = min(ctx.solid, key=lambda r: r.distance_to(x, y))
    distance = nearest.distance_to(x, y)
    findings = []
    if distance < PLAYER_CLEARANCE_M:
        findings.append(
            f"player start {pt(x, y)} is {fmt(distance)} m from {nearest.id}; need at least {PLAYER_CLEARANCE_M} m "
            f"from every footprint, so move the start into open ground"
        )
    from_plaza = rect_union_distance(x, y, [PLAZA])
    if from_plaza > PLAYER_NEAR_PLAZA_M:
        findings.append(
            f"player start {pt(x, y)} is {fmt(from_plaza)} m from the plaza region; need it in or within "
            f"{PLAYER_NEAR_PLAZA_M} m of the plaza (x {PLAZA[0]:g}..{PLAZA[1]:g}, y {PLAZA[2]:g}..{PLAZA[3]:g})"
        )
    x0, x1, y0, y1 = ctx.extent
    if not (x0 <= x <= x1 and y0 <= y <= y1):
        findings.append(f"player start {pt(x, y)} is outside the extent {pt(x0, y0)} to {pt(x1, y1)}")
    return findings, f"start {pt(x, y)} is {fmt(distance)} m from the nearest footprint ({nearest.id}), {fmt(from_plaza)} m from the plaza"


def check_open_run(ctx: Context) -> Result:
    probe = ctx.layout["walk_probe_m"]
    start, heading = tuple(probe["open_run_start"]), probe["open_run_heading_deg"]
    clear, hit = clear_run(start, heading, STREET_CLEAR_WIDTH_M / 2.0, ctx.solid)
    findings = []
    if clear < OPEN_RUN_MIN_M:
        findings.append(
            f"open run from {pt(*start)} heading {heading} deg is blocked after {fmt(clear)} m by {hit}; need at least "
            f"{OPEN_RUN_MIN_M} m clear across a {STREET_CLEAR_WIDTH_M} m wide strip (the probe walks about 17.5 m along "
            f"this heading without repositioning), so clear the street or move the run"
        )
    fx, fy = forward(heading)
    off_street = next((s * 0.5 for s in range(int(OPEN_RUN_MIN_M / 0.5) + 1)
                       if rect_union_distance(start[0] + fx * s * 0.5, start[1] + fy * s * 0.5, REGIONS) > 1e-6), None)
    if off_street is not None:
        findings.append(
            f"open run from {pt(*start)} heading {heading} deg leaves the street and plaza regions {fmt(off_street)} m "
            f"along; need the first {OPEN_RUN_MIN_M} m on a street (design.md Street and plaza regions)"
        )
    shown = "no obstruction" if hit is None else f"{hit} at {fmt(clear)} m"
    return findings, (f"{STREET_CLEAR_WIDTH_M} m wide strip from {pt(*start)} heading {heading} deg: first obstruction "
                      f"{shown} (need >= {OPEN_RUN_MIN_M} m)")


def check_wall_run(ctx: Context) -> Result:
    probe = ctx.layout["walk_probe_m"]
    start, heading = tuple(probe["wall_run_start"]), probe["wall_run_heading_deg"]
    findings = []
    nearest = min(ctx.solid, key=lambda r: r.distance_to(*start))
    if nearest.distance_to(*start) < WALL_RUN_START_CLEARANCE_M:
        findings.append(
            f"wall run starts at {pt(*start)}, {fmt(nearest.distance_to(*start))} m from {nearest.id}; need the start "
            f"at least {WALL_RUN_START_CLEARANCE_M} m from every footprint"
        )
    hits = []
    for r in ctx.solid:
        result = ray_hit(start, heading, r)
        if result is not None:
            hits.append((result[0], result[1], r))
    if not hits:
        return findings + [f"wall run from {pt(*start)} heading {heading} deg hits no footprint; need a wall or building "
                           f"within {WALL_RUN_MAX_M} m ahead"], ""
    distance, incidence, target = min(hits, key=lambda h: h[0])
    if target.tag not in ("wall", "tower", "house", "church"):
        findings.append(
            f"wall run from {pt(*start)} heading {heading} deg first meets {target.id} (tag {target.tag}) at "
            f"{fmt(distance)} m; need a wall, tower or building, not a passable or prop footprint"
        )
    if distance > WALL_RUN_MAX_M:
        findings.append(
            f"wall run from {pt(*start)} heading {heading} deg first meets {target.id} at {fmt(distance)} m; need it "
            f"within {WALL_RUN_MAX_M} m, so start closer or turn toward the wall"
        )
    if incidence > WALL_RUN_MAX_INCIDENCE_DEG:
        findings.append(
            f"wall run meets {target.id} at {fmt(incidence)} degrees from its face normal; need at most "
            f"{WALL_RUN_MAX_INCIDENCE_DEG} degrees so the player runs into the face instead of sliding along it"
        )
    return findings, (f"run from {pt(*start)} heading {heading} deg meets {target.id} ({target.tag}) at "
                      f"{fmt(distance)} m, {fmt(incidence)} degrees off head-on (need <= {WALL_RUN_MAX_M} m, "
                      f"<= {WALL_RUN_MAX_INCIDENCE_DEG} degrees)")


def check_streets(ctx: Context) -> Result:
    gates = ctx.by_tag("gate")
    findings, notes = [], []
    main_x = (MAIN_STREET[0] + MAIN_STREET[1]) / 2.0
    mid_y = (CROSS_STREET[2] + CROSS_STREET[3]) / 2.0
    runs = [
        (f"Main Street north from ({main_x:g}, {MAIN_STREET[2]:g})", (main_x, MAIN_STREET[2]), 0.0, ("gate",)),
        (f"Cross Street east from ({PLAZA[1]:g}, {mid_y:g})", (PLAZA[1], mid_y), -90.0, ("wall",)),
        (f"Cross Street west from ({PLAZA[0]:g}, {mid_y:g})", (PLAZA[0], mid_y), 90.0, ("wall",)),
    ]
    for label, start, heading, want in runs:
        clear, hit = clear_run(start, heading, STREET_CLEAR_WIDTH_M / 2.0, ctx.solid)
        tag = ctx.rects[hit].tag if hit in ctx.rects else None
        notes.append(f"{label} runs {fmt(clear)} m to {hit}")
        if tag not in want:
            findings.append(
                f"{label} is blocked after {fmt(clear)} m by {hit} (tag {tag}); need the {STREET_CLEAR_WIDTH_M} m wide "
                f"strip clear along the whole street until the {'gate' if want == ('gate',) else 'wall'}, "
                f"so move or remove {hit}"
            )
    if not gates:
        findings.append("no gate placement, so Main Street has nothing to lead to; need exactly one gatehouse")
    return findings, "; ".join(notes) + f" (strip {STREET_CLEAR_WIDTH_M} m wide)"


def check_house_fronts(ctx: Context) -> Result:
    findings, worst = [], 0.0
    houses = ctx.by_tag("house")
    for r in sorted(houses, key=lambda r: r.id):
        fx, fy = r.vx, r.vy
        front = (r.cx + fx * r.hy, r.cy + fy * r.hy)
        gap = rect_union_distance(front[0], front[1], REGIONS)
        probe = (front[0] + fx * HOUSE_FACING_PROBE_M, front[1] + fy * HOUSE_FACING_PROBE_M)
        ahead = rect_union_distance(probe[0], probe[1], REGIONS)
        worst = max(worst, gap)
        if gap > HOUSE_FLUSH_M:
            findings.append(
                f"{r.id} front centre {pt(*front)} is {fmt(gap)} m from the nearest street or plaza edge; need at most "
                f"{HOUSE_FLUSH_M} m so the house sits flush against the street"
            )
        if ahead > 1e-6:
            findings.append(
                f"{r.id} (yaw {r.yaw}) faces {pt(*probe)}, {HOUSE_FACING_PROBE_M} m ahead of its front, which is "
                f"{fmt(ahead)} m off every street and plaza region; need the front to face a street, so turn it"
            )
    return findings, (f"{len(houses)} houses: front centre within {HOUSE_FLUSH_M} m of a street edge (worst {fmt(worst)} m) "
                      f"and the point {HOUSE_FACING_PROBE_M} m ahead lies on a street or the plaza")


def check_composition(ctx: Context) -> Result:
    placements = ctx.layout["placements"]
    count = lambda **kw: sum(1 for p in placements if all(p[k] == v for k, v in kw.items()))  # noqa: E731
    findings = []
    buildings = count(tag="house") + count(tag="church")
    if not BUILDINGS_MIN <= buildings <= BUILDINGS_MAX:
        findings.append(f"layout has {buildings} buildings (houses plus church); need {BUILDINGS_MIN} to {BUILDINGS_MAX}")
    for label, got, want in (
        ("gate placements (gatehouse)", count(tag="gate"), 1), ("ground placements", count(tag="ground"), 1),
        ("church placements", count(tag="church"), 1), ("well placements", count(asset="well"), 1),
    ):
        if got != want:
            findings.append(f"layout has {got} {label}; need exactly {want}")
    for label, got, least in (
        ("wall_tower placements", count(asset="wall_tower"), 4), ("wall_segment placements", count(asset="wall_segment"), 8),
        ("market_stall placements", count(asset="market_stall"), 3), ("tree placements", count(tag="tree"), 1),
    ):
        if got < least:
            findings.append(f"layout has {got} {label}; need at least {least}")
    for asset in PROP_ASSETS:
        if count(asset=asset) < 1:
            findings.append(f"layout has no {asset} prop; need at least one of each of {', '.join(PROP_ASSETS)}")
    houses = [p for p in placements if p["tag"] == "house"]
    kinds, yaws = {p["asset"] for p in houses}, {round(p["yaw_deg"], 1) for p in houses}
    if len(kinds) < 3:
        findings.append(f"houses use {len(kinds)} asset types ({', '.join(sorted(kinds))}); need at least 3 for variety")
    if len(yaws) < 5:
        findings.append(f"houses use {len(yaws)} distinct yaw values; need at least 5 so the rows are not uniform")
    return findings, (f"{buildings} buildings ({count(tag='house')} houses, 1 church), 1 gate, "
                      f"{count(asset='wall_tower')} towers, {count(asset='wall_segment')} wall segments, "
                      f"{len(kinds)} house types, {len(yaws)} house yaws")


def check_vantages_and_sun(ctx: Context) -> Result:
    layout, findings = ctx.layout, []
    vantages = layout["vantages_m"]
    if len(vantages) < VANTAGE_MIN_COUNT:
        findings.append(f"layout has {len(vantages)} vantages; need at least {VANTAGE_MIN_COUNT}")
    names = [v["name"] for v in vantages]
    for name in sorted({n for n in names if names.count(n) > 1}):
        findings.append(f"vantage name '{name}' is used {names.count(name)} times; names must be unique")
    x0, x1, y0, y1 = ctx.extent
    for v in vantages:
        x, y, z = v["location"]
        if not (x0 <= x <= x1 and y0 <= y <= y1):
            findings.append(f"vantage '{v['name']}' at {pt(x, y)} lies outside the extent")
        if z < ELEVATED_VANTAGE_Z_M:
            near = min(ctx.solid, key=lambda r: r.distance_to(x, y))
            if near.distance_to(x, y) < VANTAGE_CLEARANCE_M:
                findings.append(f"vantage '{v['name']}' at {pt(x, y)} is {fmt(near.distance_to(x, y))} m from {near.id}; "
                                f"need at least {VANTAGE_CLEARANCE_M} m so the camera is not inside a building")
        else:
            under = [r for r in ctx.by_tag(*RING_TAGS) if r.distance_to(x, y) <= 1e-9]
            if not under:
                findings.append(f"elevated vantage '{v['name']}' at {pt(x, y)}, Z {z}, is over no wall, tower or gatehouse "
                                f"footprint; need it on the wall walk")
        views = []
        for r in ctx.solid:
            res = ray_hit((x, y), v["yaw_deg"], r)
            if res is not None and res[0] > 1e-9:
                views.append(res[0])
        nearest = min(views) if views else math.inf
        if not VANTAGE_VIEW_MIN_M <= nearest <= VANTAGE_VIEW_MAX_M and z < ELEVATED_VANTAGE_Z_M:
            findings.append(f"vantage '{v['name']}' at {pt(x, y)} yaw {v['yaw_deg']} first sees a footprint at "
                            f"{fmt(nearest) if views else 'infinity'} m; need one between {VANTAGE_VIEW_MIN_M} and "
                            f"{VANTAGE_VIEW_MAX_M} m ahead so the view shows the town")
    sun = layout["sun"]
    if not -85.0 <= sun["pitch_deg"] <= -10.0:
        findings.append(f"sun pitch {sun['pitch_deg']} degrees is outside -85..-10; the light must point downward")
    return findings, f"{len(vantages)} vantages ({', '.join(names)}), sun pitch {sun['pitch_deg']} yaw {sun['yaw_deg']}"


def check_gate_path(ctx: Context) -> Result:
    gates = ctx.by_tag("gate")
    if len(gates) != 1:
        return [f"found {len(gates)} gate placements; need exactly 1 to test the walk through it"], ""
    gate = gates[0]
    x0, x1, y0, y1 = ctx.extent
    side_w = (2 * gate.hx - GATE_PASSAGE_M) / 2.0
    if side_w <= 0:
        return [f"gate footprint {fmt(2 * gate.hx)} m wide cannot hold a {GATE_PASSAGE_M} m passage"], ""
    shift = (GATE_PASSAGE_M + side_w) / 2.0
    cheeks = [Rect(f"{gate.id}_side{k}", "gate", gate.asset, gate.cx + k * shift * gate.ux, gate.cy + k * shift * gate.uy,
                   side_w / 2.0, gate.hy, gate.yaw) for k in (-1, 1)]
    obstacles = [r for r in ctx.solid if r.tag != "gate"] + cheeks
    nx, ny = int(round((x1 - x0) / GRID_M)), int(round((y1 - y0) / GRID_M))
    blocked = bytearray(nx * ny)
    for r in obstacles:
        xs, ys = [c[0] for c in r.corners()], [c[1] for c in r.corners()]
        for j in range(max(0, int((min(ys) - CAPSULE_RADIUS_M - y0) / GRID_M)),
                       min(ny, int((max(ys) + CAPSULE_RADIUS_M - y0) / GRID_M) + 1)):
            cy = y0 + (j + 0.5) * GRID_M
            for i in range(max(0, int((min(xs) - CAPSULE_RADIUS_M - x0) / GRID_M)),
                           min(nx, int((max(xs) + CAPSULE_RADIUS_M - x0) / GRID_M) + 1)):
                if r.distance_to(x0 + (i + 0.5) * GRID_M, cy) < CAPSULE_RADIUS_M:
                    blocked[j * nx + i] = 1
    sx, sy, _ = ctx.layout["player_start_m"]["location"]
    # The goal is GATE_GOAL_OUTSIDE_M beyond whichever gate face looks away from the ring.
    options = []
    for sign in (1.0, -1.0):
        gx = gate.cx + sign * gate.vx * (gate.hy + GATE_GOAL_OUTSIDE_M)
        gy = gate.cy + sign * gate.vy * (gate.hy + GATE_GOAL_OUTSIDE_M)
        options.append((signed_distance_to_polygon(gx, gy, ctx.ring), gx, gy))
    _, gx, gy = max(options)

    def cell(x: float, y: float) -> tuple[int, int]:
        return int((x - x0) / GRID_M), int((y - y0) / GRID_M)

    def free(i: int, j: int) -> bool:
        return 0 <= i < nx and 0 <= j < ny and not blocked[j * nx + i]

    start, goal = cell(sx, sy), cell(gx, gy)
    if not free(*start):
        return [f"player start {pt(sx, sy)} lies on a blocked cell of the {GRID_M} m grid (obstacles inflated by the "
                f"{CAPSULE_RADIUS_M} m capsule radius); need open ground"], ""
    if not free(*goal):
        return [f"the point {pt(gx, gy)}, {GATE_GOAL_OUTSIDE_M} m outside the gate, lies on a blocked cell; need open ground there"], ""
    seen = {start}
    queue = deque([start])
    nearest = (math.hypot(start[0] - goal[0], start[1] - goal[1]), start)
    while queue:
        i, j = queue.popleft()
        if (i, j) == goal:
            break
        for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
            ni, nj = i + di, j + dj
            if (ni, nj) in seen or not free(ni, nj):
                continue
            if di and dj and not (free(i + di, j) and free(i, j + dj)):
                continue
            seen.add((ni, nj))
            queue.append((ni, nj))
            d = math.hypot(ni - goal[0], nj - goal[1])
            if d < nearest[0]:
                nearest = (d, (ni, nj))
    if goal not in seen:
        ci, cj = nearest[1]
        return [f"no walkable path from the player start {pt(sx, sy)} to {pt(gx, gy)} outside the gate: a "
                f"{2 * CAPSULE_RADIUS_M:.2f} m capsule reaches {len(seen)} cells and gets no closer than "
                f"{nearest[0] * GRID_M:.1f} m, stopping near {pt(x0 + (ci + 0.5) * GRID_M, y0 + (cj + 0.5) * GRID_M)}; "
                f"need an open path through the gate passage, so clear whatever blocks the street"], ""
    return [], (f"a {2 * CAPSULE_RADIUS_M:.2f} m capsule walks from {pt(sx, sy)} through {gate.id} to {pt(gx, gy)} "
                f"({len(seen)} cells explored on a {GRID_M} m grid, gate passage assumed {GATE_PASSAGE_M} m)")


def check_reproducible(ctx: Context) -> Result:
    findings = []
    layout_bytes = ctx.layout_path.read_bytes()
    if ctx.layout.get("inventory_sha256") != ctx.inventory_sha:
        findings.append(
            f"layout inventory_sha256 {str(ctx.layout.get('inventory_sha256'))[:16]}... differs from the current "
            f"inventory {ctx.inventory_sha[:16]}...; the layout is stale, so rerun: {LAYOUT_COMMAND}"
        )
    outputs = []
    with tempfile.TemporaryDirectory(prefix="medieval-layout-") as tmp:
        for attempt in ("a", "b"):
            target = Path(tmp) / f"regen_{attempt}.json"
            command = [sys.executable, str(GENERATOR), "--inventory", str(ctx.inventory_path), "--output", str(target)]
            try:
                run = subprocess.run(command, capture_output=True, text=True, check=False, timeout=REGENERATE_TIMEOUT_S)
            except subprocess.TimeoutExpired:
                return findings + [
                    f"regeneration {attempt} did not finish within {REGENERATE_TIMEOUT_S} s and was killed: "
                    f"{' '.join(command)}; a normal run takes about a second, so the generator is hanging or stuck in a "
                    f"loop, so run that command by hand and fix what stalls it"
                ], ""
            if run.returncode != 0 or not target.is_file():
                return findings + [f"regenerating the layout failed with exit code {run.returncode}: "
                                   f"{(run.stderr or run.stdout).strip()[:300]}"], ""
            outputs.append(target.read_bytes())
    sha = [hashlib.sha256(b).hexdigest()[:16] for b in outputs] + [hashlib.sha256(layout_bytes).hexdigest()[:16]]
    if outputs[0] != outputs[1]:
        findings.append(f"two regenerations from the same inventory differ (sha256 {sha[0]}... vs {sha[1]}...); the "
                        f"generator is not deterministic, so remove unseeded or unordered iteration")
    if outputs[0] != layout_bytes:
        first = next((k for k, (a, b) in enumerate(zip(outputs[0].splitlines(), layout_bytes.splitlines(), strict=False), 1) if a != b),
                     min(len(outputs[0].splitlines()), len(layout_bytes.splitlines())) + 1)
        findings.append(f"regenerated bytes (sha256 {sha[0]}..., {len(outputs[0])} bytes) differ from {ctx.layout_path.name} "
                        f"(sha256 {sha[2]}..., {len(layout_bytes)} bytes), first at line {first}; the file is stale or "
                        f"hand-edited, so rerun: {LAYOUT_COMMAND}")
    return findings, f"two regenerations and {ctx.layout_path.name} are byte-identical (sha256 {sha[0]}..., {len(layout_bytes)} bytes)"


# ---- schema (a prerequisite: later checks index into these fields) --------------------------
def check_schema(layout: object) -> list[str]:
    problems: list[str] = []
    if not isinstance(layout, dict):
        return [f"layout root is a {type(layout).__name__}; need a JSON object"]
    keys = ["schema_version", "generator", "seed", "units", "inventory_sha256", "extent_m", "wall_ring_m",
            "placements", "player_start_m", "vantages_m", "sun", "walk_probe_m"]
    problems += [f"layout lacks key '{k}'; the design.md layout schema requires it" for k in keys if k not in layout]
    problems += [f"layout has unexpected key '{k}'; the design.md layout schema lists only {', '.join(keys)}"
                 for k in layout if k not in keys]
    if problems:
        return problems

    def nums(path: str, value, n: int) -> None:
        if not (isinstance(value, list) and len(value) == n and all(is_num(v) for v in value)):
            problems.append(f"{path} is {value!r}; need a list of {n} finite numbers")

    for key, want in (("schema_version", 1), ("units", "metres"), ("seed", SEED),
                      ("generator", "tools/medieval/build_layout.py")):
        if layout[key] != want:
            problems.append(f"{key} is {layout[key]!r}; need {want!r}")
    if not (isinstance(layout["inventory_sha256"], str) and len(layout["inventory_sha256"]) == 64):
        problems.append("inventory_sha256 must be a 64-character hex string")
    extent = layout["extent_m"]
    if isinstance(extent, dict) and set(extent) == {"min", "max"}:
        nums("extent_m.min", extent["min"], 2)
        nums("extent_m.max", extent["max"], 2)
    else:
        problems.append(f"extent_m is {extent!r}; need an object with min and max")
    ring = layout["wall_ring_m"]
    if not (isinstance(ring, list) and len(ring) >= 3):
        problems.append(f"wall_ring_m is {ring!r}; need a list of at least 3 [x, y] points")
    else:
        for k, point in enumerate(ring):
            nums(f"wall_ring_m[{k}]", point, 2)
    if not isinstance(layout["placements"], list) or not layout["placements"]:
        problems.append("placements must be a non-empty list")
    else:
        for k, p in enumerate(layout["placements"]):
            if not (isinstance(p, dict) and set(p) == {"id", "asset", "location_m", "yaw_deg", "tag"}):
                problems.append(f"placements[{k}] is {p!r}; need exactly id, asset, location_m, yaw_deg and tag")
                continue
            nums(f"placements[{k}] ({p['id']}).location_m", p["location_m"], 3)
            if not is_num(p["yaw_deg"]):
                problems.append(f"placements[{k}] ({p['id']}).yaw_deg is {p['yaw_deg']!r}; need a number")
            if p["tag"] not in TAGS:
                problems.append(f"placements[{k}] ({p['id']}).tag is {p['tag']!r}; need one of {', '.join(TAGS)}")
            if not isinstance(p["id"], str) or not isinstance(p["asset"], str):
                problems.append(f"placements[{k}] id and asset must be strings")
    start = layout["player_start_m"]
    if isinstance(start, dict) and set(start) == {"location", "yaw_deg"}:
        nums("player_start_m.location", start["location"], 3)
        if not is_num(start["yaw_deg"]):
            problems.append("player_start_m.yaw_deg must be a number")
    else:
        problems.append(f"player_start_m is {start!r}; need location and yaw_deg")
    if not isinstance(layout["vantages_m"], list):
        problems.append("vantages_m must be a list")
    else:
        for k, v in enumerate(layout["vantages_m"]):
            if not (isinstance(v, dict) and set(v) == {"name", "location", "yaw_deg", "pitch_deg"}):
                problems.append(f"vantages_m[{k}] is {v!r}; need exactly name, location, yaw_deg and pitch_deg")
                continue
            nums(f"vantages_m[{k}].location", v["location"], 3)
            if not (is_num(v["yaw_deg"]) and is_num(v["pitch_deg"]) and isinstance(v["name"], str)):
                problems.append(f"vantages_m[{k}] needs a string name and numeric yaw_deg and pitch_deg")
    sun = layout["sun"]
    if not (isinstance(sun, dict) and set(sun) == {"pitch_deg", "yaw_deg"} and all(is_num(v) for v in sun.values())):
        problems.append(f"sun is {sun!r}; need numeric pitch_deg and yaw_deg")
    probe = layout["walk_probe_m"]
    wanted = {"open_run_start", "open_run_heading_deg", "wall_run_start", "wall_run_heading_deg"}
    if isinstance(probe, dict) and set(probe) == wanted:
        nums("walk_probe_m.open_run_start", probe["open_run_start"], 2)
        nums("walk_probe_m.wall_run_start", probe["wall_run_start"], 2)
        for key in ("open_run_heading_deg", "wall_run_heading_deg"):
            if not is_num(probe[key]):
                problems.append(f"walk_probe_m.{key} must be a number")
    else:
        problems.append(f"walk_probe_m is {probe!r}; need exactly {', '.join(sorted(wanted))}")
    return problems


CHECKS = (
    ("geometry_self_test", "hand-computed cases for the primitives below (exact to 1e-6)", check_geometry_self_test),
    ("assets_known", "every placement asset is in the inventory; ids unique", check_assets_known),
    ("overlap", f"no two non-ground footprints overlap by more than {OVERLAP_TOL_M} m (separating-axis depth)", check_overlap),
    ("containment", f"buildings, props and trees fully inside the wall ring, wall/tower/gate centres not outside it by more than {RING_TOL_M} m",
     check_containment),
    ("ground_cover", f"ground footprint covers the whole extent (tolerance {GROUND_TOL_M} m) and every footprint lies inside it",
     check_ground_cover),
    ("flat_box", f"every non-ground footprint inside the design.md flat-ground box, x within +-{FLAT_HALF_X:g} and y within +-{FLAT_HALF_Y:g} (tolerance {FLAT_TOL_M} m)",
     check_flat_box),
    ("player_start", f"at least {PLAYER_CLEARANCE_M} m from every footprint, within {PLAYER_NEAR_PLAZA_M} m of the plaza", check_player_start),
    ("open_run", f"at least {OPEN_RUN_MIN_M} m clear along the heading over a {STREET_CLEAR_WIDTH_M} m strip, on a street; "
                 f"{OPEN_RUN_MIN_M:g} m, not design.md's 12 m, because the probe walks twice along it (about 17.5 m) without repositioning",
     check_open_run),
    ("wall_run", f"first footprint ahead is a wall/tower/building within {WALL_RUN_MAX_M} m, at most {WALL_RUN_MAX_INCIDENCE_DEG} degrees off head-on",
     check_wall_run),
    ("streets", f"Main Street and both Cross Street arms clear over a {STREET_CLEAR_WIDTH_M} m strip up to the gate/walls", check_streets),
    ("house_fronts", f"each house front within {HOUSE_FLUSH_M} m of a street edge and facing a street or the plaza", check_house_fronts),
    ("composition", f"{BUILDINGS_MIN}-{BUILDINGS_MAX} buildings, one gate/ground/church/well, towers, stalls, props, house variety", check_composition),
    ("vantages_sun", f"at least {VANTAGE_MIN_COUNT} vantages clear of buildings and facing the town, sun pointing down", check_vantages_and_sun),
    ("gate_path", f"a {2 * CAPSULE_RADIUS_M:.2f} m capsule walks from the player start through the gate (passage assumed {GATE_PASSAGE_M} m)",
     check_gate_path),
    ("reproducible", f"two regenerations from the same inventory, each within {REGENERATE_TIMEOUT_S} s, match the layout byte for byte",
     check_reproducible),
)


def load_json(path: Path, kind: str, command: str) -> tuple[bytes, object]:
    if not path.is_file():
        print(f"test_layout.py: {kind} not found at {path}; produce it with: {command}", file=sys.stderr)
        raise SystemExit(2)
    raw = path.read_bytes()
    try:
        return raw, json.loads(raw)
    except ValueError as exc:
        print(f"test_layout.py: {kind} {path} is not valid JSON ({exc}); regenerate it with: {command}", file=sys.stderr)
        raise SystemExit(2) from None


def main(argv: list[str] | None = None) -> int:
    if sys.version_info[:2] != (3, 13):
        print("test_layout.py needs CPython 3.13 (pinned in docs/work/2_medieval-city/design.md) but is running "
              f"{'.'.join(str(v) for v in sys.version_info[:3])}; run it with the system Python 3.13.", file=sys.stderr)
        return 2
    parser = argparse.ArgumentParser(description="Check the medieval town layout invariants.")
    parser.add_argument("--layout", type=Path, default=DEFAULT_LAYOUT, help="city_layout.json to check")
    parser.add_argument("--inventory", type=Path, default=DEFAULT_INVENTORY, help="inventory.json the layout was built from")
    args = parser.parse_args(argv)

    inventory_bytes, inventory = load_json(args.inventory, "inventory", INVENTORY_COMMAND)
    _, layout = load_json(args.layout, "layout", LAYOUT_COMMAND)
    if not isinstance(inventory, dict) or not isinstance(inventory.get("assets"), dict):
        print(f"test_layout.py: inventory {args.inventory} has no 'assets' table; regenerate it with: {INVENTORY_COMMAND}",
              file=sys.stderr)
        return 2

    failures = 0
    print(f"layout {args.layout}\ninventory {args.inventory}")
    problems = check_schema(layout)
    if problems:
        print("FAIL schema [bound: exactly the design.md layout schema, finite numbers, known tags]")
        for line in problems[:MAX_FINDINGS]:
            print(f"  - {line}")
        if len(problems) > MAX_FINDINGS:
            print(f"  - ... and {len(problems) - MAX_FINDINGS} more")
        print("1 check failed before the geometry checks could run")
        return 1
    print("PASS schema [bound: exactly the design.md layout schema, finite numbers, known tags]")

    ctx = Context(layout, inventory, inventory_bytes, args.layout, args.inventory)
    total = 1
    for name, bound, check in CHECKS:
        total += 1
        try:
            findings, summary = check(ctx)
        except Exception as exc:  # a crashed check is a failed check, never a silent pass
            findings, summary = [f"check crashed with {type(exc).__name__}: {exc}"], ""
        if findings:
            failures += 1
            print(f"FAIL {name} [bound: {bound}]")
            for line in findings[:MAX_FINDINGS]:
                print(f"  - {line}")
            if len(findings) > MAX_FINDINGS:
                print(f"  - ... and {len(findings) - MAX_FINDINGS} more")
        else:
            print(f"PASS {name} [bound: {bound}]\n     {summary}")
    print(f"{total - failures} of {total} checks passed" + (f", {failures} FAILED" if failures else ""))
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
