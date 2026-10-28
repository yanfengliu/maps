"""Pure-Python parametric mesh construction for the medieval city assets.

No ``bpy`` import here on purpose: the geometry is plain lists of vertices and
polygons so it stays deterministic and can be inspected without Blender. The
Blender script turns a :class:`MeshData` into one object with material slots.

Conventions follow docs/work/2_medieval-city/design.md: metres, Z up, +Y front,
origin at the footprint centre with the lowest point at Z=0.
"""

from __future__ import annotations

import math

Vec3 = tuple[float, float, float]
Vec2 = tuple[float, float]


class MeshData:
    """Vertices, polygons and a material name per polygon."""

    __slots__ = ("verts", "faces", "face_materials")

    def __init__(self) -> None:
        self.verts: list[Vec3] = []
        self.faces: list[tuple[int, ...]] = []
        self.face_materials: list[str] = []

    # -- building blocks -------------------------------------------------
    def add_face(self, points: list[Vec3], material: str) -> None:
        base = len(self.verts)
        for point in points:
            self.verts.append((float(point[0]), float(point[1]), float(point[2])))
        self.faces.append(tuple(range(base, base + len(points))))
        self.face_materials.append(material)

    def add_faces(self, points: list[Vec3], faces: list[tuple[int, ...]], material: str) -> None:
        base = len(self.verts)
        for point in points:
            self.verts.append((float(point[0]), float(point[1]), float(point[2])))
        for face in faces:
            self.faces.append(tuple(base + index for index in face))
            self.face_materials.append(material)

    def add_vertices(self, points: list[Vec3]) -> int:
        """Append vertices and return the index of the first one."""
        base = len(self.verts)
        for point in points:
            self.verts.append((float(point[0]), float(point[1]), float(point[2])))
        return base

    def add_indexed_faces(self, faces: list[tuple[int, ...]], material: str) -> None:
        """Add faces over vertices already in the mesh, so a grid shares them."""
        count = len(self.verts)
        for face in faces:
            for index in face:
                if not 0 <= index < count:
                    raise IndexError(
                        f"face index {index} is outside the {count} vertices in this mesh"
                    )
            self.faces.append(tuple(face))
            self.face_materials.append(material)

    def merge(self, other: "MeshData", offset: Vec3 = (0.0, 0.0, 0.0)) -> None:
        """Append another mesh, shifted, so sub-parts can be built at the origin."""
        base = len(self.verts)
        for vert in other.verts:
            self.verts.append(
                (vert[0] + offset[0], vert[1] + offset[1], vert[2] + offset[2])
            )
        for face, material in zip(other.faces, other.face_materials, strict=True):
            self.faces.append(tuple(base + index for index in face))
            self.face_materials.append(material)

    # -- whole-mesh operations -------------------------------------------
    def materials(self) -> list[str]:
        return sorted(set(self.face_materials))

    def triangle_count(self) -> int:
        return sum(len(face) - 2 for face in self.faces)

    def bounds(self) -> tuple[Vec3, Vec3]:
        if not self.verts:
            raise ValueError("mesh has no vertices, so it has no bounds")
        xs = [v[0] for v in self.verts]
        ys = [v[1] for v in self.verts]
        zs = [v[2] for v in self.verts]
        return (min(xs), min(ys), min(zs)), (max(xs), max(ys), max(zs))

    def translate(self, dx: float, dy: float, dz: float) -> None:
        self.verts = [(v[0] + dx, v[1] + dy, v[2] + dz) for v in self.verts]

    def place_on_ground(self) -> None:
        """Centre the footprint on the origin and drop the lowest point to Z=0."""
        low, high = self.bounds()
        self.translate(
            -0.5 * (low[0] + high[0]),
            -0.5 * (low[1] + high[1]),
            -low[2],
        )


# ---------------------------------------------------------------------------
# vector helpers
# ---------------------------------------------------------------------------
def _sub(a: Vec3, b: Vec3) -> Vec3:
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def _add(a: Vec3, b: Vec3) -> Vec3:
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def _scale(a: Vec3, k: float) -> Vec3:
    return (a[0] * k, a[1] * k, a[2] * k)


def _cross(a: Vec3, b: Vec3) -> Vec3:
    return (
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    )


def _length(a: Vec3) -> float:
    return math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2])


def _normalise(a: Vec3) -> Vec3:
    length = _length(a)
    if length < 1e-12:
        raise ValueError(f"cannot normalise a zero-length vector {a!r}")
    return _scale(a, 1.0 / length)


# ---------------------------------------------------------------------------
# primitives
# ---------------------------------------------------------------------------
HEX_FACES = {
    "bottom": (0, 3, 2, 1),
    "top": (4, 5, 6, 7),
    "front": (0, 1, 5, 4),
    "right": (1, 2, 6, 5),
    "back": (2, 3, 7, 6),
    "left": (3, 0, 4, 7),
}
HEX_ORDER = ("bottom", "top", "front", "right", "back", "left")


def hexahedron(
    mesh: MeshData,
    bottom: list[Vec3],
    top: list[Vec3],
    material: str,
    skip: tuple[str, ...] = (),
    face_materials: dict[str, str] | None = None,
) -> None:
    """Six-sided solid from a bottom and a top quad in matching order.

    ``bottom`` and ``top`` each hold four points, counter-clockwise seen from
    above. Shearing the top quad relative to the bottom gives leaning walls and
    sloped planks without any transform maths at the call site.
    """
    if len(bottom) != 4 or len(top) != 4:
        raise ValueError(
            f"hexahedron needs 4 bottom and 4 top points, got {len(bottom)} and {len(top)}"
        )
    points = list(bottom) + list(top)
    for name in HEX_ORDER:
        if name in skip:
            continue
        slot = material if face_materials is None else face_materials.get(name, material)
        mesh.add_faces(points, [HEX_FACES[name]], slot)


def box(
    mesh: MeshData,
    low: Vec3,
    high: Vec3,
    material: str,
    skip: tuple[str, ...] = (),
    face_materials: dict[str, str] | None = None,
) -> None:
    """Axis-aligned box between two opposite corners."""
    x0, y0, z0 = min(low[0], high[0]), min(low[1], high[1]), min(low[2], high[2])
    x1, y1, z1 = max(low[0], high[0]), max(low[1], high[1]), max(low[2], high[2])
    bottom = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)]
    top = [(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    hexahedron(mesh, bottom, top, material, skip=skip, face_materials=face_materials)


def beam(mesh: MeshData, start: Vec3, end: Vec3, width: float, depth: float, material: str) -> None:
    """Rectangular beam along an arbitrary line, used for braces and spokes."""
    axis = _normalise(_sub(end, start))
    helper: Vec3 = (0.0, 0.0, 1.0)
    if abs(axis[2]) > 0.9:
        helper = (1.0, 0.0, 0.0)
    side = _normalise(_cross(axis, helper))
    # (side, up, axis) must be right-handed so the shared hexahedron winding
    # keeps its outward normals.
    up = _normalise(_cross(axis, side))
    hw = 0.5 * width
    hd = 0.5 * depth
    corners = [
        _scale(side, -hw),
        _scale(side, hw),
    ]
    bottom = [
        _add(_add(start, corners[0]), _scale(up, -hd)),
        _add(_add(start, corners[1]), _scale(up, -hd)),
        _add(_add(start, corners[1]), _scale(up, hd)),
        _add(_add(start, corners[0]), _scale(up, hd)),
    ]
    top = [
        _add(_add(end, corners[0]), _scale(up, -hd)),
        _add(_add(end, corners[1]), _scale(up, -hd)),
        _add(_add(end, corners[1]), _scale(up, hd)),
        _add(_add(end, corners[0]), _scale(up, hd)),
    ]
    points = bottom + top
    # Winding derived from the right-handed (side, up, axis) frame.
    faces = [
        (0, 3, 2, 1),
        (4, 5, 6, 7),
        (0, 1, 5, 4),
        (1, 2, 6, 5),
        (2, 3, 7, 6),
        (3, 0, 4, 7),
    ]
    mesh.add_faces(points, faces, material)


def _signed_area(profile: list[Vec2]) -> float:
    total = 0.0
    count = len(profile)
    for index in range(count):
        u0, v0 = profile[index]
        u1, v1 = profile[(index + 1) % count]
        total += u0 * v1 - u1 * v0
    return 0.5 * total


def _prism(
    mesh: MeshData,
    profile: list[Vec2],
    axis: str,
    low: float,
    high: float,
    side_material: str,
    cap_material: str | None,
    caps: bool,
) -> None:
    if len(profile) < 3:
        raise ValueError(f"a prism profile needs at least 3 points, got {len(profile)}")
    loop = list(profile)
    if _signed_area(loop) < 0.0:
        loop.reverse()
    cap = side_material if cap_material is None else cap_material

    def point(uv: Vec2, along: float) -> Vec3:
        u, v = uv
        if axis == "x":
            return (along, u, v)
        if axis == "y":
            return (v, along, u)
        return (u, v, along)

    low_points = [point(uv, low) for uv in loop]
    high_points = [point(uv, high) for uv in loop]
    count = len(loop)
    points = low_points + high_points
    side_faces = []
    for index in range(count):
        nxt = (index + 1) % count
        side_faces.append((index, nxt, count + nxt, count + index))
    mesh.add_faces(points, side_faces, side_material)
    if caps:
        mesh.add_faces(points, [tuple(range(count, 2 * count))], cap)
        mesh.add_faces(points, [tuple(reversed(range(count)))], cap)


def prism_z(
    mesh: MeshData,
    profile_xy: list[Vec2],
    z0: float,
    z1: float,
    side_material: str,
    cap_material: str | None = None,
    caps: bool = True,
) -> None:
    """Extrude an XY polygon along Z."""
    _prism(mesh, profile_xy, "z", z0, z1, side_material, cap_material, caps)


def prism_x(
    mesh: MeshData,
    profile_yz: list[Vec2],
    x0: float,
    x1: float,
    side_material: str,
    cap_material: str | None = None,
    caps: bool = True,
) -> None:
    """Extrude a YZ polygon along X, as a roof mass under a ridge along X."""
    _prism(mesh, profile_yz, "x", x0, x1, side_material, cap_material, caps)


def prism_y(
    mesh: MeshData,
    profile_xz: list[Vec2],
    y0: float,
    y1: float,
    side_material: str,
    cap_material: str | None = None,
    caps: bool = True,
) -> None:
    """Extrude an XZ polygon along Y."""
    swapped = [(v, u) for (u, v) in profile_xz]
    _prism(mesh, swapped, "y", y0, y1, side_material, cap_material, caps)


def lathe(
    mesh: MeshData,
    profile: list[Vec2],
    segments: int,
    material: str,
    centre: Vec2 = (0.0, 0.0),
    radial_jitter: list[float] | None = None,
    rot_offset: float = 0.0,
    cap_bottom: bool = True,
    cap_top: bool = True,
) -> None:
    """Revolve a (radius, height) profile around Z.

    ``radial_jitter`` multiplies the radius per segment, so seeded values give a
    hand-made silhouette for sacks, thatch and tree canopies. ``rot_offset`` is
    a start angle in radians, which squares a four-segment spire to its tower.
    """
    if segments < 3:
        raise ValueError(f"a lathe needs at least 3 segments, got {segments}")
    if len(profile) < 2:
        raise ValueError(f"a lathe profile needs at least 2 points, got {len(profile)}")
    jitter = radial_jitter or [1.0] * segments
    if len(jitter) != segments:
        raise ValueError(
            f"radial_jitter has {len(jitter)} values but the lathe has {segments} segments"
        )
    angles = [rot_offset + 2.0 * math.pi * index / segments for index in range(segments)]

    def ring(radius: float, height: float) -> list[Vec3]:
        return [
            (
                centre[0] + radius * jitter[index] * math.cos(angles[index]),
                centre[1] + radius * jitter[index] * math.sin(angles[index]),
                height,
            )
            for index in range(segments)
        ]

    for index in range(len(profile) - 1):
        r0, z0 = profile[index]
        r1, z1 = profile[index + 1]
        if abs(r0) < 1e-9 and abs(r1) < 1e-9:
            continue
        lower = ring(r0, z0)
        upper = ring(r1, z1)
        if abs(r0) < 1e-9:
            apex = (centre[0], centre[1], z0)
            for seg in range(segments):
                nxt = (seg + 1) % segments
                mesh.add_face([apex, upper[nxt], upper[seg]], material)
            continue
        if abs(r1) < 1e-9:
            apex = (centre[0], centre[1], z1)
            for seg in range(segments):
                nxt = (seg + 1) % segments
                mesh.add_face([lower[seg], lower[nxt], apex], material)
            continue
        for seg in range(segments):
            nxt = (seg + 1) % segments
            mesh.add_face([lower[seg], lower[nxt], upper[nxt], upper[seg]], material)

    first_r, first_z = profile[0]
    if cap_bottom and abs(first_r) > 1e-9:
        mesh.add_face(list(reversed(ring(first_r, first_z))), material)
    last_r, last_z = profile[-1]
    if cap_top and abs(last_r) > 1e-9:
        mesh.add_face(ring(last_r, last_z), material)


def cylinder(
    mesh: MeshData,
    centre: Vec2,
    radius: float,
    z0: float,
    z1: float,
    segments: int,
    material: str,
) -> None:
    lathe(mesh, [(radius, z0), (radius, z1)], segments, material, centre=centre)


def tapered_cylinder(
    mesh: MeshData,
    centre: Vec2,
    radius_bottom: float,
    radius_top: float,
    z0: float,
    z1: float,
    segments: int,
    material: str,
) -> None:
    lathe(
        mesh,
        [(radius_bottom, z0), (radius_top, z1)],
        segments,
        material,
        centre=centre,
    )


def cone(
    mesh: MeshData,
    centre: Vec2,
    radius: float,
    z0: float,
    z1: float,
    segments: int,
    material: str,
) -> None:
    lathe(mesh, [(radius, z0), (0.0, z1)], segments, material, centre=centre)


def rolled_cylinder(
    mesh: MeshData,
    centre_yz: Vec2,
    radius: float,
    x0: float,
    x1: float,
    segments: int,
    material: str,
) -> None:
    """A cylinder whose axis runs along X, for cart axles and windlasses."""
    profile = []
    for index in range(segments):
        angle = 2.0 * math.pi * index / segments
        profile.append(
            (centre_yz[0] + radius * math.cos(angle), centre_yz[1] + radius * math.sin(angle))
        )
    _prism(mesh, profile, "x", x0, x1, material, material, True)


def arch_wall(
    mesh: MeshData,
    x0: float,
    x1: float,
    y0: float,
    y1: float,
    z_base: float,
    z_top: float,
    opening_half_width: float,
    springing_z: float,
    material: str,
    segments: int = 10,
    reveal_material: str | None = None,
) -> float:
    """A wall block pierced by a round-headed arch; returns the arch crown Z.

    The opening is a rectangle up to ``springing_z`` capped by a semicircle of
    radius ``opening_half_width``, so a character walks through a real hole
    rather than a painted one.
    """
    if opening_half_width <= 0.0:
        raise ValueError(
            f"arch_wall needs a positive opening_half_width, got {opening_half_width}"
        )
    reveal = material if reveal_material is None else reveal_material
    crown = springing_z + opening_half_width
    if crown >= z_top:
        raise ValueError(
            f"arch crown {crown:.2f} m reaches the wall top {z_top:.2f} m; "
            "lower springing_z or raise z_top"
        )
    if not (x0 < -opening_half_width and x1 > opening_half_width):
        raise ValueError(
            f"arch opening half width {opening_half_width:.2f} m does not fit in the wall "
            f"from x={x0:.2f} to x={x1:.2f} m; widen the wall or narrow the opening"
        )
    # Outline of the solid wall, in the XZ plane, walked anticlockwise with the
    # arch void cut out of the bottom edge.
    left_jamb = -opening_half_width
    right_jamb = opening_half_width
    outline: list[Vec2] = [(x0, z_base)]
    outline.append((left_jamb, z_base))
    outline.append((left_jamb, springing_z))
    for index in range(1, segments):
        angle = math.pi * (1.0 - index / segments)
        outline.append(
            (
                opening_half_width * math.cos(angle),
                springing_z + opening_half_width * math.sin(angle),
            )
        )
    outline.append((right_jamb, springing_z))
    outline.append((right_jamb, z_base))
    outline.append((x1, z_base))
    outline.append((x1, z_top))
    outline.append((x0, z_top))
    prism_y(mesh, outline, y0, y1, material, material)
    # Reveal faces lining the opening so the hole reads as thick masonry.
    reveal_profile: list[Vec2] = [(left_jamb, springing_z)]
    for index in range(1, segments):
        angle = math.pi * (1.0 - index / segments)
        reveal_profile.append(
            (
                opening_half_width * math.cos(angle),
                springing_z + opening_half_width * math.sin(angle),
            )
        )
    reveal_profile.append((right_jamb, springing_z))
    voussoir_depth = 0.12
    for index in range(len(reveal_profile) - 1):
        ax, az = reveal_profile[index]
        bx, bz = reveal_profile[index + 1]
        # Rotate the segment direction so the band grows away from the arch
        # centre at (0, springing_z) instead of into the opening.
        normal_x, normal_z = -(bz - az), (bx - ax)
        length = math.hypot(normal_x, normal_z)
        normal_x, normal_z = normal_x / length, normal_z / length
        band = [
            (ax, az),
            (bx, bz),
            (bx + normal_x * voussoir_depth, bz + normal_z * voussoir_depth),
            (ax + normal_x * voussoir_depth, az + normal_z * voussoir_depth),
        ]
        prism_y(mesh, band, y0 - 0.06, y1 + 0.06, reveal, reveal)
    return crown
