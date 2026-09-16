"""harness: inspectable offline walk/idle VAT bake, using the source rig's weights.

The in-place walk's stance foot travels opposite +Z at stride / duration. Runtime
phase must advance by distance / stride, not wall time alone. Source assets are
CC0; this analytic two-leg IK gait is authored in the repository.
"""
import bpy
import bmesh
import hashlib
import json
import math
import sys
import time
import numpy as np
from array import array
from pathlib import Path
from mathutils import Matrix, Quaternion, Vector

ROOT = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
OUT = ROOT / "data/scene/agents"
EVIDENCE = ROOT / "artifacts/agents/candidates" / f"humans-{time.time_ns()}-{hashlib.sha256(Path(__file__).read_bytes()).hexdigest()[:12]}"
FRAME_COUNT = 32
IDLE_FRAMES = 16
STRIDE = 1.1
DURATION = 1.0
WIDTH = 2048
VARIANTS = ("commuter-male", "office-male", "commuter-female")
VARIANT = "commuter-male"


def turn(bone, axis, angle):
    """A rest-space rotation around a model-space axis."""
    bone.rotation_mode = "QUATERNION"
    local_axis = bone.bone.matrix_local.to_3x3().inverted() @ Vector(axis)
    bone.rotation_quaternion = Quaternion(local_axis, angle)


def prepare_gait(rig):
    targets = {}
    for side in ("l", "r"):
        foot = rig.pose.bones[f"foot_{side}"]
        ankle = rig.matrix_world @ foot.head
        target = bpy.data.objects.new(f"ankle-target-{side}", None)
        bpy.context.collection.objects.link(target)
        target.location = ankle
        pole = bpy.data.objects.new(f"knee-pole-{side}", None)
        bpy.context.collection.objects.link(pole)
        pole.location = ankle + Vector((0, -1.0, 0.7))
        constraint = rig.pose.bones[f"calf_{side}"].constraints.new("IK")
        constraint.target = target
        constraint.pole_target = pole
        constraint.chain_count = 2
        constraint.use_stretch = False
        constraint.pole_angle = -math.pi / 2
        targets[side] = (target, ankle.copy())
    return targets


def pose(rig, targets, phase, walking=True):
    for bone in rig.pose.bones:
        bone.rotation_mode = "QUATERNION"
        bone.rotation_quaternion = Quaternion()
        bone.location = (0, 0, 0)
    # Root drops a little so the knees retain a bend at the end of each stride.
    root = rig.pose.bones["Root"]
    drop = (-0.065 + 0.005 * math.cos(phase * math.tau * 2)) if walking else (-0.035 + 0.002 * math.sin(phase * math.tau))
    root.location = root.bone.matrix_local.to_3x3().inverted() @ Vector((0, 0, drop))
    for side, sign, offset in (("l", 1, 0), ("r", -1, 0.5)):
        f = (phase + offset) % 1
        target, ankle = targets[side]
        target.location = ankle
        if walking:
            # Half a cycle in stance gives velocity exactly equal and opposite
            # to the actor's stride / duration in model coordinates.
            if f < 0.5:
                travel = STRIDE * (f - 0.25)
                lift = 0
            else:
                swing = (f - 0.5) * 2
                travel = STRIDE * (0.25 - 0.5 * (3 * swing * swing - 2 * swing * swing * swing))
                lift = 0.105 * math.sin(swing * math.pi)
            target.location.y += travel
            target.location.z += lift
        # The model's arms start in an A pose; lower them before adding swing.
        arm = rig.pose.bones[f"upperarm_{side}"]
        turn(arm, (0, 1, 0), sign * math.radians(38))
        if walking:
            local_x = arm.bone.matrix_local.to_3x3().inverted() @ Vector((1, 0, 0))
            arm.rotation_quaternion = Quaternion(local_x, 0.28 * math.cos((phase + offset) * math.tau)) @ arm.rotation_quaternion
    bpy.context.view_layer.update()
    # The source bind pose has elbows bent forward. Align each forearm with
    # its upper arm plus a small natural bend instead of inheriting that bend.
    for side in ("l", "r"):
        arm = rig.pose.bones[f"upperarm_{side}"]
        forearm = rig.pose.bones[f"lowerarm_{side}"]
        current = (forearm.tail - forearm.head).normalized()
        desired = ((arm.tail - arm.head).normalized() + Vector((0, -0.10, 0))).normalized()
        orientation = current.rotation_difference(desired).to_matrix() @ forearm.matrix.to_3x3()
        target_matrix = orientation.to_4x4()
        target_matrix.translation = forearm.head
        forearm.matrix = target_matrix
    bpy.context.view_layer.update()
    # A relaxed hand keeps the fingers slightly curled toward the palm instead
    # of preserving the source's widely spread, flat modelling pose.
    for side, sign in (("l", 1), ("r", -1)):
        hand = rig.pose.bones[f"hand_{side}"]
        hand_direction = (hand.tail - hand.head).normalized()
        inward = Vector((-sign, 0, 0))
        for finger in ("index", "middle", "ring", "pinky"):
            for joint, curl in ((1, 0.18), (2, 0.30), (3, 0.20)):
                bone = rig.pose.bones[f"{finger}_{joint:02}_{side}"]
                current = (bone.tail - bone.head).normalized()
                desired = (current + inward * curl + (hand_direction - current) * (0.45 if joint == 1 else 0)).normalized()
                matrix = (current.rotation_difference(desired).to_matrix() @ bone.matrix.to_3x3()).to_4x4()
                matrix.translation = bone.head
                bone.matrix = matrix
                bpy.context.view_layer.update()
    # Cancel the leg chain's rotation at the ankle so stance soles stay level.
    for side in ("l", "r"):
        foot = rig.pose.bones[f"foot_{side}"]
        target_matrix = foot.bone.matrix_local.copy()
        target_matrix.translation = foot.head
        foot.matrix = target_matrix
    bpy.context.view_layer.update()


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def required_draw_parts(model):
    """Record the exported selected scene, including transforms already in VAT."""
    raw = model.read_bytes()
    json_length = int.from_bytes(raw[12:16], "little")
    gltf = json.loads(raw[20:20 + json_length])
    result = []
    visited = set()

    def visit(index, parent):
        if index in visited:
            raise RuntimeError(f"Exported selected scene repeats node {index}")
        visited.add(index)
        node = gltf["nodes"][index]
        if "matrix" in node:
            local = Matrix([[node["matrix"][column * 4 + row] for column in range(4)] for row in range(4)])
        else:
            xyzw = node.get("rotation", [0, 0, 0, 1])
            rotation = Quaternion((xyzw[3], *xyzw[:3])).to_matrix().to_4x4()
            local = Matrix.Translation(Vector(node.get("translation", [0, 0, 0]))) @ rotation @ Matrix.Diagonal((*node.get("scale", [1, 1, 1]), 1))
        matrix = parent @ local
        if "mesh" in node:
            for primitive, part in enumerate(gltf["meshes"][node["mesh"]]["primitives"]):
                positions = gltf["accessors"][part["attributes"]["POSITION"]]
                indices = gltf["accessors"][part["indices"]] if "indices" in part else positions
                result.append({"node": node["name"], "primitive": primitive, "vertexCount": positions["count"],
                               "indexCount": indices["count"], "bindMatrix": [matrix[row][column] for column in range(4) for row in range(4)]})
        for child in node.get("children", []):
            visit(child, matrix)

    for root_node in gltf["scenes"][gltf.get("scene", 0)]["nodes"]:
        visit(root_node, Matrix.Identity(4))
    if not result:
        raise RuntimeError("Exported human has no selected-scene drawable primitives")
    return result


def render_review(rig, targets):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 16
    scene.render.threads_mode = "FIXED"
    scene.render.threads = 4
    scene.render.resolution_x = 720
    scene.render.resolution_y = 960
    scene.render.resolution_percentage = 100
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.12, 0.15, 0.2, 1)
    background.inputs["Strength"].default_value = 0.45
    scene.view_settings.view_transform = "AgX"
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.006))
    floor = bpy.context.object
    floor.name = "review-ground"
    material = bpy.data.materials.new("review-floor")
    material.diffuse_color = (0.16, 0.18, 0.21, 1)
    floor.data.materials.append(material)
    for name, location, energy, size in [
        ("key", (2, -3, 4), 220, 4),
        ("fill", (-3, -1, 2), 65, 3),
        ("rim", (1, 2, 3), 200, 3),
    ]:
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        light = bpy.data.objects.new(name, data)
        bpy.context.collection.objects.link(light)
        light.location = location
        light.rotation_euler = (Vector((0, 0, 0.9)) - light.location).to_track_quat("-Z", "Y").to_euler()
    camera_data = bpy.data.cameras.new("agent-review-camera")
    camera = bpy.data.objects.new("agent-review-camera", camera_data)
    bpy.context.collection.objects.link(camera)
    scene.camera = camera
    camera_data.lens = 55
    reviews = []
    for name, position, phase, walking in [
        ("commuter-front", (2.2, -3.8, 1.55), 0, False),
        ("commuter-side-walk", (4.0, -0.4, 1.45), 0.125, True),
        ("commuter-back-walk", (-2.2, 3.8, 1.55), 0.375, True),
    ]:
        pose(rig, targets, phase, walking)
        camera.location = position
        camera.rotation_euler = (Vector((0, 0, 0.87)) - camera.location).to_track_quat("-Z", "Y").to_euler()
        path = EVIDENCE / f"{VARIANT}-{name}.png"
        scene.render.filepath = str(path)
        bpy.ops.render.render(write_still=True)
        reviews.append({"file": path.name, "sha256": digest(path), "width": 720, "height": 960, "phase": phase, "clip": "walk" if walking else "idle"})
    (EVIDENCE / f"{VARIANT}-review.json").write_text(json.dumps(reviews, indent=2), encoding="utf-8")
    if VARIANT == "commuter-male":
        sequence_dir = EVIDENCE / f"{VARIANT}-gait"
        sequence_dir.mkdir(exist_ok=True)
        mover = bpy.data.objects.new("review-actor-motion", None)
        bpy.context.collection.objects.link(mover)
        owned = [rig] + [target for target, _ in targets.values()] + [o for o in bpy.data.objects if o.name.startswith("knee-pole-")]
        for obj in owned:
            obj.parent = mover
        # Ground marks pin the two stance locations while the actor advances.
        for side, forward in (("l", 0.25 * STRIDE), ("r", -0.25 * STRIDE)):
            bpy.ops.mesh.primitive_circle_add(vertices=40, radius=0.12, fill_type="NGON",
                                              location=(targets[side][1].x, forward + targets[side][1].y, 0.001))
            marker = bpy.context.object
            mat = bpy.data.materials.new(f"stance-reference-{side}")
            mat.diffuse_color = (0.05, 0.22, 0.28, 1)
            marker.data.materials.append(mat)
        scene.render.resolution_x = 360
        scene.render.resolution_y = 480
        scene.cycles.samples = 8
        camera.location = (4.0, -0.3, 1.5)
        camera.rotation_euler = (Vector((0, 0, 0.85)) - camera.location).to_track_quat("-Z", "Y").to_euler()
        sequence = []
        for frame in range(FRAME_COUNT):
            phase = frame / FRAME_COUNT
            mover.location.y = STRIDE * (0.5 - phase)
            pose(rig, targets, phase)
            path = sequence_dir / f"frame-{frame:03}.png"
            scene.render.filepath = str(path)
            bpy.ops.render.render(write_still=True)
            sequence.append({"file": path.name, "sha256": digest(path), "phase": phase,
                             "actorForwardMetres": phase * STRIDE, "width": 360, "height": 480})
        (sequence_dir / "manifest.json").write_text(json.dumps(sequence, indent=2), encoding="utf-8")


def build_lod(name, ratio):
    bpy.ops.wm.open_mainfile(filepath=str(OUT / f"{VARIANT}-source.blend"), use_scripts=False)
    rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
    meshes = sorted((o for o in bpy.data.objects if o.type == "MESH"), key=lambda o: o.name)
    # Shoe soles are rigid leather shells. The imported garment weights include
    # calf influence that bends their soles despite a planted ankle target.
    # Bind each sole to its foot before simplification and baking. The asset
    # also includes tall socks, whose original calf weights must be preserved.
    for mesh in meshes:
        if mesh.name.endswith(".shoes01"):
            # All current outfits have long trousers. Keep the visible shoe and
            # low sock, and remove the hidden tall sock cuff before it can poke
            # through differently weighted trousers during a bent-knee pose.
            cuff_z = rig.data.bones["foot_l"].head_local.z + .045
            edit = bmesh.new()
            edit.from_mesh(mesh.data)
            bmesh.ops.delete(edit, geom=[v for v in edit.verts if v.co.z > cuff_z], context="VERTS")
            edit.to_mesh(mesh.data)
            edit.free()
            mesh.data.update()
            groups = {side: mesh.vertex_groups.get(f"foot_{side}") or mesh.vertex_groups.new(name=f"foot_{side}") for side in ("l", "r")}
            for vertex in mesh.data.vertices:
                side = "l" if vertex.co.x > 0 else "r"
                ankle_z = rig.data.bones[f"foot_{side}"].head_local.z
                original_fraction = max(0, min(1, (vertex.co.z - ankle_z) / .065))
                previous = [(weight.group, weight.weight) for weight in vertex.groups]
                for index, weight in previous:
                    mesh.vertex_groups[index].add([vertex.index], weight * original_fraction, "REPLACE")
                foot_weight = next((weight for index, weight in previous if index == groups[side].index), 0)
                groups[side].add([vertex.index], foot_weight * original_fraction + 1 - original_fraction, "REPLACE")
    for image in bpy.data.images:
        if image.type == "IMAGE" and max(image.size) > 512:
            width, height = image.size
            scale = 512 / max(width, height)
            image.scale(max(1, round(width * scale)), max(1, round(height * scale)))
    for mesh in meshes:
        bpy.context.view_layer.objects.active = mesh
        mesh.select_set(True)
        if mesh.data.shape_keys:
            bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
        if ratio < 1:
            modifier = mesh.modifiers.new("crowd-lod", "DECIMATE")
            modifier.ratio = ratio
            # Simplify the bind mesh, then let its retained bone weights deform.
            bpy.ops.object.modifier_move_to_index(modifier=modifier.name, index=0)
            bpy.ops.object.modifier_apply(modifier=modifier.name)
        mesh.select_set(False)

    # Every exported split vertex carries the same stable source lookup id.
    vertex_count = 0
    for mesh in meshes:
        attribute = mesh.data.attributes.new("_VAT_ID", "FLOAT", "POINT")
        for index, datum in enumerate(attribute.data):
            datum.value = vertex_count + index
        vertex_count += len(mesh.data.vertices)
    rows_per_frame = math.ceil(vertex_count / WIDTH)
    stride_vertices = rows_per_frame * WIDTH
    print("LOD_GEOMETRY", name, vertex_count, flush=True)
    targets = prepare_gait(rig)
    pose(rig, targets, 0, False)
    depsgraph = bpy.context.evaluated_depsgraph_get()
    floor_z = min((o.matrix_world @ v.co).z for o in meshes for v in o.evaluated_get(depsgraph).data.vertices)
    rig.location.z -= floor_z
    for target, ankle in targets.values():
        ankle.z -= floor_z

    positions = array("f")
    normals = array("f")
    mins = [float("inf")] * 3
    maxs = [float("-inf")] * 3
    max_ankle_error = 0
    max_stance_drift = 0
    stance_start = {}
    for frame in range(FRAME_COUNT + IDLE_FRAMES):
        phase = frame / FRAME_COUNT if frame < FRAME_COUNT else (frame - FRAME_COUNT) / IDLE_FRAMES
        pose(rig, targets, phase, frame < FRAME_COUNT)
        for side, (target, _) in targets.items():
            actual = rig.matrix_world @ rig.pose.bones[f"foot_{side}"].head
            max_ankle_error = max(max_ankle_error, (actual - target.location).length)
            f = (phase + (0.5 if side == "r" else 0)) % 1
            if frame < FRAME_COUNT and f < 0.5:
                world_contact = Vector((actual.x, actual.z, -actual.y + phase * STRIDE))
                if side not in stance_start:
                    stance_start[side] = world_contact
                max_stance_drift = max(max_stance_drift, (world_contact - stance_start[side]).length)
            else:
                stance_start.pop(side, None)
        depsgraph = bpy.context.evaluated_depsgraph_get()
        for mesh in meshes:
            evaluated = mesh.evaluated_get(depsgraph)
            data = evaluated.to_mesh()
            if len(data.vertices) != len(mesh.data.vertices):
                raise RuntimeError(f"{name}/{mesh.name}: animated topology changed; VAT indices are no longer valid")
            normal_matrix = mesh.matrix_world.to_3x3().inverted().transposed()
            for vertex in data.vertices:
                p = mesh.matrix_world @ vertex.co
                n = (normal_matrix @ vertex.normal).normalized()
                xyz = (p.x, p.z, -p.y)
                positions.extend((*xyz, 1))
                normals.extend((n.x, n.z, -n.y, 0))
                for axis in range(3):
                    mins[axis] = min(mins[axis], xyz[axis])
                    maxs[axis] = max(maxs[axis], xyz[axis])
            evaluated.to_mesh_clear()
        positions.extend([0] * ((stride_vertices - vertex_count) * 4))
        normals.extend([0] * ((stride_vertices - vertex_count) * 4))
    position_path = OUT / f"{VARIANT}-{name}-positions.f16"
    normal_path = OUT / f"{VARIANT}-{name}-normals.f16"
    position_path.write_bytes(np.asarray(positions, dtype="<f2").tobytes())
    normal_path.write_bytes(np.asarray(normals, dtype="<f2").tobytes())
    pose(rig, targets, 0, False)
    bpy.ops.object.select_all(action="DESELECT")
    rig.select_set(True)
    for mesh in meshes:
        mesh.select_set(True)
    model = OUT / f"{VARIANT}-{name}.glb"
    bpy.ops.export_scene.gltf(filepath=str(model), export_format="GLB", use_selection=True,
                              export_animations=False, export_yup=True, export_attributes=True)
    result = {"id": name, "model": model.name, "modelSha256": digest(model), "vertexCount": vertex_count,
              "drawParts": required_draw_parts(model),
              "bounds": {"min": mins, "max": maxs}, "positions": position_path.name, "normals": normal_path.name,
              "positionSha256": digest(position_path), "normalSha256": digest(normal_path),
              "textureWidth": WIDTH, "textureHeight": rows_per_frame * (FRAME_COUNT + IDLE_FRAMES),
              "rowsPerFrame": rows_per_frame, "bytes": model.stat().st_size + position_path.stat().st_size + normal_path.stat().st_size}
    result["maxAnkleTargetErrorMetres"] = max_ankle_error
    result["maxStanceWorldDriftMetres"] = max_stance_drift
    if name == "near" and "--no-review" not in sys.argv:
        render_review(rig, targets)
    return result


def main():
    global VARIANT
    if "--inspect-gait" in sys.argv:
        bpy.ops.wm.open_mainfile(filepath=str(OUT / "commuter-male-source.blend"), use_scripts=False)
        rig = next(o for o in bpy.data.objects if o.type == "ARMATURE")
        print("HAND_BONES", [(bone.name, list(bone.head), list(bone.tail), list(bone.x_axis)) for bone in rig.data.bones if any(part in bone.name for part in ("hand", "index", "middle", "ring", "pinky", "thumb"))], flush=True)
        targets = prepare_gait(rig)
        worst = (0, None)
        for frame in range(FRAME_COUNT):
            pose(rig, targets, frame / FRAME_COUNT)
            for side, (target, _) in targets.items():
                foot = rig.pose.bones[f"foot_{side}"]
                actual = rig.matrix_world @ foot.head
                error = (actual - target.location).length
                thigh = rig.pose.bones[f"thigh_{side}"]
                calf = rig.pose.bones[f"calf_{side}"]
                if error > worst[0]:
                    worst = (error, {"frame": frame, "side": side, "ankle": list(actual), "target": list(target.location),
                        "hip": list(rig.matrix_world @ thigh.head), "legLength": thigh.length + calf.length,
                        "rootLocation": list(rig.pose.bones["Root"].location)})
        print("GAIT_WORST_CONTACT", worst, flush=True)
        return
    selected = [sys.argv[sys.argv.index("--variant") + 1]] if "--variant" in sys.argv else VARIANTS
    if any(variant not in VARIANTS for variant in selected):
        raise RuntimeError(f"Unknown human variant {selected}; choose from {VARIANTS}")
    EVIDENCE.mkdir(parents=True, exist_ok=False)
    for variant in selected:
        VARIANT = variant
        build_variant()


def build_variant():
    lods = [build_lod(name, ratio) for name, ratio in [("near", 1.0), ("medium", 0.10), ("far", 0.015)]]
    manifest = {
        "version": 2, "id": VARIANT, "units": "metres", "up": "+Y", "forward": "+Z",
        "origin": "feet", "yawAxis": "+Y", "vertexAttribute": "_VAT_ID", "textureFormat": "rgba16f-le",
        "vatSpace": "world-baked",
        "clips": [{"id": "walk", "firstFrame": 0, "frameCount": FRAME_COUNT, "durationSeconds": DURATION,
                   "strideMetres": STRIDE, "loop": True},
                  {"id": "idle", "firstFrame": FRAME_COUNT, "frameCount": IDLE_FRAMES, "durationSeconds": 2.5,
                   "strideMetres": 0, "loop": True}],
        "lods": lods,
        "sources": [{"id": "makehuman-core", "url": "https://github.com/makehumancommunity/mpfb2/tree/80919fa4682335c41847f761a4d79dcad4124732",
                     "licence": "CC0-1.0", "licenceUrl": "https://static.makehumancommunity.org/about/license.html"},
                    {"id": "makehuman-system-assets", "url": "https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html",
                     "licence": "CC0-1.0", "sha256": "b542127a8e25547c7c29c19f2d1d2adb9a664c80396ecd694095dbc8028a0107"}],
        "animation": "Repository-authored analytic walking gait using the source game-engine rig and two-leg IK",
        "qualityStatus": "prototype-awaiting-native-frame-and-motion-review",
    }
    manifest["recipe"] = {"builderSha256": digest(ROOT / "tools/agents/build-human.py"), "bakerSha256": digest(Path(__file__)), "blenderVersion": bpy.app.version_string}
    manifest["reviewDirectory"] = str(EVIDENCE.relative_to(ROOT)).replace("\\", "/")
    manifest["sources"][0]["sha256"] = "038e9f01ae3900ad11f24af887e184c0bfa20a00abe4411f750d09b21efaaadc"
    (OUT / f"{VARIANT}.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print("HUMAN_VAT_MANIFEST", json.dumps(manifest), flush=True)


if __name__ == "__main__":
    main()
