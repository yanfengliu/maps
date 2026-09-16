"""harness: original metric fleet geometry plus native views for asset review.

Run through build-vehicles.ts for task-local headless CPU settings and cleanup.
These are unbranded original Japanese street vehicle types, not licensed replicas.
"""
import bpy
import bmesh
import hashlib
import json
import math
import sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(sys.argv[sys.argv.index("--") + 1]).resolve()
OUT = Path(sys.argv[sys.argv.index("--output") + 1]).resolve() if "--output" in sys.argv else ROOT / "data" / "scene" / "agents"
if bpy.app.version != (5, 2, 0):
    raise RuntimeError(f"Vehicle recipe requires Blender 5.2.0 LTS; found {bpy.app.version_string}")
PALETTE = {}
ACTIVE_ENVELOPE = None


def material(name, color, metallic=0, roughness=0.45, emission=0):
    result = bpy.data.materials.new(name)
    result.use_nodes = True
    shader = result.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    if emission:
        shader.inputs["Emission Color"].default_value = (*color, 1)
        shader.inputs["Emission Strength"].default_value = emission
    return result


def finish(obj, name, mat, bevel=0):
    obj.name = name
    obj.data.materials.append(PALETTE[mat])
    if bevel:
        mod = obj.modifiers.new("formed-edges", "BEVEL")
        mod.width = bevel
        mod.segments = 3
        mod.harden_normals = True
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def box(name, location, dimensions, mat, bevel=0.015):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat, bevel)


def panel(name, points, mat, thickness=0.008):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(points, [], [tuple(range(len(points)))])
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(PALETTE[mat])
    if thickness:
        mod = obj.modifiers.new("panel-thickness", "SOLIDIFY")
        mod.thickness = thickness
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)
    return obj


def cylinder(name, location, radius, depth, mat, axis="Z", vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    if axis == "X":
        obj.rotation_euler.y = math.pi / 2
    elif axis == "Y":
        obj.rotation_euler.x = math.pi / 2
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    return finish(obj, name, mat, 0.006)


def join(objects, name):
    # Preserve sheet-metal planes while rounding formed edges. Smooth normals
    # alone average the large flat faces with tiny bevels and Boolean triangles.
    for item in objects:
        if item.type == "MESH":
            if name == "body":
                for face in item.data.polygons:
                    if face.area > .012:
                        face.use_smooth = False
            normal = item.modifiers.new("panel-normals", "WEIGHTED_NORMAL")
            normal.keep_sharp = True
            normal.weight = 50
            bpy.context.view_layer.objects.active = item
            bpy.ops.object.modifier_apply(modifier=normal.name)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    obj = bpy.context.object
    obj.name = name
    bpy.context.scene.cursor.location = (0, 0, 0)
    bpy.ops.object.origin_set(type="ORIGIN_CURSOR")
    return obj


def hull(name, sections, mat):
    # Each station is y, half width, lower height, shoulder height. Octagonal
    # sections form real rounded sides and a curved nose instead of a cuboid.
    vertices = []
    for y, w, bottom, top in sections:
        vertices.extend([(-w*.85,y,bottom), (w*.85,y,bottom), (w,y,bottom+.10),
                         (w,y,top-.08), (w*.84,y,top), (-w*.84,y,top),
                         (-w,y,top-.08), (-w,y,bottom+.10)])
    faces = [tuple(reversed(range(8))), tuple(range((len(sections)-1)*8, len(sections)*8))]
    for station in range(len(sections)-1):
        for i in range(8):
            faces.append((station*8+i, station*8+(i+1)%8, (station+1)*8+(i+1)%8, (station+1)*8+i))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj, name, mat, 0.035)


def wheel_arch(body, y, radius, width):
    # Circumscribed 64-gon: each chord stays outside the required circle.
    opening = ACTIVE_ENVELOPE["openingRadius"]
    bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=opening/math.cos(math.pi/64), depth=width+2, location=(0,y,radius), rotation=(0,math.pi/2,0))
    cutter=bpy.context.object
    cutter.name="clearance-tool"
    bpy.context.view_layer.objects.active=body
    mod=body.modifiers.new("continuous-wheel-clearance","BOOLEAN")
    mod.operation="DIFFERENCE"
    mod.solver="EXACT"
    mod.object=cutter
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)


def wheel_liner(x, y, radius):
    # An upper annular shell, not a disk passing through the wheel assembly.
    inner=ACTIVE_ENVELOPE["openingRadius"]+.012
    outer=inner+.022
    vertices=[]
    for side in (-.013,.013):
        for r in (inner,outer):
            for i in range(33):
                angle=math.pi*i/32
                vertices.append((x+side,y+r*math.cos(angle),radius+r*math.sin(angle)))
    faces=[]
    for i in range(32):
        for a,b in ((0,33),(66,99),(0,66),(33,99)):
            faces.append((a+i,a+i+1,b+i+1,b+i))
    faces.extend([(0,33,99,66),(32,98,131,65)])
    mesh=bpy.data.meshes.new("hollow-upper-liner")
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    obj=bpy.data.objects.new("hollow-upper-liner",mesh)
    bpy.context.collection.objects.link(obj)
    finish(obj,"hollow-upper-liner","trim")


def wheel(radius, depth):
    before = set(bpy.data.objects)
    cylinder("tire", (0,0,0), radius, depth, "rubber", "X", 32)
    for sign in (-1, 1):
        x = sign * (depth/2 + .002)
        cylinder("sidewall", (x,0,0), radius*.92, .018, "rubber", "X", 32)
        cylinder("rim", (x + sign*.01,0,0), radius*.67, .02, "alloy", "X", 24)
        cylinder("hub", (x + sign*.025,0,0), radius*.18, .03, "trim", "X", 16)
        for spoke in range(5):
            angle = math.tau * spoke/5
            obj = box("spoke-slot", (x+sign*.023, math.cos(angle)*radius*.43, math.sin(angle)*radius*.43),
                      (.012, radius*.31, radius*.12), "trim", .008)
            obj.rotation_euler.x = angle
    return join(sorted(set(bpy.data.objects)-before, key=lambda item: (item.name != "tire", item.name)), "wheel")


def car(spec):
    width, length, height, radius = spec["width"], spec["length"], spec["height"], spec["wheelRadius"]
    taxi = spec["id"] == "taxi"
    w, half = width/2, length/2
    front_axle, rear_axle = (-half*.61, half*.61)
    body = hull("pressed-body", [(-half,w*.90,.32,.78),(-half+.18,w*.97,.27,.92),
        (-half*.55,w,.25,.98),(half*.62,w,.25,1.00),(half-.13,w*.96,.29,.96),(half,w*.78,.35,.86)], "paint")
    for axle in (front_axle, rear_axle):
        wheel_arch(body, axle, radius, width)
        for side in (-1,1):
            wheel_liner(side*(w-.16),axle,radius)
    windshield_bottom = -half*.50 if taxi else -half*.67
    roof_front = -half*.26 if taxi else -half*.43
    roof_back = half*.61
    hull("cabin-roof", [(windshield_bottom,w*.88,.93,1.05), (roof_front,w*.88,.96,height-.02),
        (roof_back,w*.88,.96,height), (half*.83,w*.88,.95,1.10)], "paint")
    # Windshield and rear glazing follow the cabin's actual sloped faces.
    def glazing(name, y0, z0, y1, z1):
        # Match the loft's slope, then offset outward. The first prototype put
        # a lower glass plane inside the metal roof and rendered a solid panel.
        a,b=.10,.90
        ya,yb=y0+(y1-y0)*a,y0+(y1-y0)*b
        za,zb=z0+(z1-z0)*a+.016,z0+(z1-z0)*b+.016
        return panel(name,[(-w*.71,ya,za),(w*.71,ya,za),(w*.71,yb,zb),(-w*.71,yb,zb)],"glass")
    glazing("windshield",windshield_bottom,1.05,roof_front,height-.02)
    glazing("rear-glass",roof_back,height,half*.83,1.10)
    for side in (-1,1):
        x=side*w*.890
        # Two distinct side windows with the central B-pillar between them.
        panel("front-side-window", [(x,windshield_bottom+.12,1.08),(x,roof_front+.07,height-.13),
              (x,.06,height-.11),(x,.06,1.08)], "glass")
        panel("rear-side-window", [(x,.16,1.08),(x,.16,height-.11),(x,roof_back-.04,height-.11),
              (x,half*.77,1.08)], "glass")
        for y in (.1, half*.81):
            box("door-seam", (side*(w+.004),y,.69), (.006,.008,.47), "trim", .002)
        for y in (-.16,half*.60):
            box("door-handle", (side*(w+.018),y,.99), (.025,.13,.028), "alloy", .008)
        box("sill", (side*w,.08,.28), (.025,length*.76,.07), "trim", .01)
        box("mirror-stalk", (side*(w+.045),windshield_bottom+.20,1.10), (.13,.045,.035), "trim", .012)
        box("mirror", (side*(w+.13),windshield_bottom+.17,1.12), (.18,.15,.095), "paint", .035)
        box("mirror-glass", (side*(w+.13),windshield_bottom+.252,1.12), (.14,.005,.065), "glass", .01)
        box("lamp-recess", (side*w*.55,-half-.008,.68), (.31,.018,.15), "trim", .025)
        box("headlight-lens", (side*w*.55,-half-.020,.68), (.27,.008,.115), "headlight", .022)
        for offset in (-.067,.067):
            cylinder("lamp-reflector", (side*w*.55+offset,-half-.027,.68),.037,.006,"alloy","Y",16)
        box("taillight", (side*w*.70,half-.009,.77), (.14,.019,.23), "tail", .025)
    box("front-bumper", (0,-half-.015,.42), (width*.88,.10,.15), "trim", .045)
    box("rear-bumper", (0,half+.012,.42), (width*.88,.09,.12), "trim", .04)
    box("grille", (0,-half-.066,.67), (width*.42,.018,.18), "trim", .018)
    for z in (.62,.68,.74):
        box("grille-bar", (0,-half-.079,z), (width*.39,.015,.013), "alloy", .003)
    for y in (-half-.076,half+.065):
        box("number-plate", (0,y,.44), (.32,.012,.16), "plate", .008)
        for x in (-.085,-.025,.035,.095):
            box("plate-digit", (x,y+(-.008 if y<0 else .008),.43), (.025,.003,.053), "trim", .001)
    # Wipers, aerial, filler hatch and subtle hood press line make close views readable.
    for side in (-1,1):
        box("wiper", (side*w*.34,windshield_bottom-.025,1.07), (.40,.018,.014), "trim", .003)
    box("fuel-flap", (-w-.006,half*.63,.83), (.008,.18,.14), "paint", .016)
    if taxi:
        box("taxi-roof-lamp", (0,.06,height+.065), (.48,.24,.13), "headlight", .05)
        box("taxi-sign-inset", (0,-.065,height+.075), (.31,.006,.057), "trim", .012)
    else:
        cylinder("roof-aerial", (0,half*.48,height+.06), .009, .13, "trim", vertices=8)
    return front_axle, rear_axle


def bus(spec):
    width,length,height,radius=spec["width"],spec["length"],spec["height"],spec["wheelRadius"]
    w,half=width/2,length/2
    front_axle,rear_axle=-half*.63,half*.55
    body=box("coach-body", (0,0,height/2+.05), (width,length,height-.10), "paint", .16)
    for axle in (front_axle,rear_axle):
        wheel_arch(body,axle,radius,width)
        for side in (-1,1):
            wheel_liner(side*(w-.20),axle,radius)
    panel("front-windshield", [(-w*.83,-half-.006,1.22),(w*.83,-half-.006,1.22),
        (w*.80,-half-.006,height-.30),(-w*.80,-half-.006,height-.30)], "glass")
    panel("rear-window", [(-w*.76,half+.006,1.75),(w*.76,half+.006,1.75),
        (w*.76,half+.006,height-.38),(-w*.76,half+.006,height-.38)], "glass")
    for side in (-1,1):
        for index in range(7):
            y=-half+1.1+index*1.26
            box("passenger-window", (side*(w+.006),y,2.22), (.016,1.11,.92), "glass", .045)
            box("window-rail", (side*(w+.018),y,2.35), (.019,1.12,.018), "alloy", .002)
        box("belt-livery", (side*(w+.008),0,1.34), (.018,length*.96,.20), "accent", .02)
        box("lower-rub-rail", (side*(w+.01),0,.74), (.025,length*.96,.055), "trim", .01)
        box("mirror-arm", (side*(w+.17),-half+.10,2.53), (.36,.05,.055), "trim", .01)
        box("large-mirror", (side*(w+.33),-half+.13,2.30), (.12,.19,.43), "trim", .035)
        for z in (.58,.80):
            cylinder("front-lamp", (side*.91,-half-.065,z), .10,.035,"headlight","Y",20)
        box("rear-lamp", (side*.94,half+.035,.77), (.17,.05,.37), "tail", .025)
    # Japanese buses board on the left: +X in the vehicle's local frame.
    for y in (-half+1.04-.15, .70):
        for offset in (-.26,.26):
            box("folding-door", (w+.030,y+offset,1.39), (.028,.48,2.09), "trim", .025)
            box("door-glass", (w+.049,y+offset,1.69), (.012,.40,1.37), "glass", .015)
        box("door-step", (w+.07,y,.29), (.15,1.01,.08), "alloy", .015)
    box("roof-ac", (0,.80,height+.10), (1.50,2.50,.22), "paint", .12)
    for y in (.1,.3,.5,.7,.9,1.1,1.3,1.5):
        box("ac-vent", (0,y,height+.218), (1.04,.07,.013), "trim", .005)
    box("destination-display", (0,-half-.031,height-.18), (1.55,.026,.20), "trim", .025)
    # Original seven-segment route number and short destination-light pattern.
    for x in (-.57,-.38):
        for z in (height-.24,height-.18,height-.12):
            box("route-led", (x,-half-.049,z), (.10,.006,.013), "indicator", .003)
        for dx in (-.046,.046):
            box("route-led", (x+dx,-half-.049,height-.18), (.012,.006,.11), "indicator", .003)
    for x in (-.03,.12,.27,.42,.57):
        box("destination-led", (x,-half-.049,height-.18), (.075,.006,.047), "indicator", .003)
    for y in (-half-.07,half+.07):
        box("bus-plate", (0,y,.54), (.44,.015,.22), "plate", .01)
    for side in (-1,1):
        box("front-wiper", (side*.44,-half-.035,1.50), (.025,.02,.61), "trim", .004)
    return front_axle,rear_axle


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def retain_central_sill(obj, rear_axle):
    # Only a named car sill is eligible. Never remove arbitrary body islands.
    bm = bmesh.new()
    try:
        bm.from_mesh(obj.data)
        unseen = set(bm.verts)
        components = []
        while unseen:
            first = min(unseen, key=lambda v: v.index)
            stack, component = [first], set()
            while stack:
                vertex = stack.pop()
                if vertex in component:
                    continue
                component.add(vertex)
                unseen.discard(vertex)
                stack.extend(edge.other_vert(vertex) for edge in vertex.link_edges)
            components.append(component)
        keep, remove = [], []
        for component in components:
            points = [obj.matrix_world @ vertex.co for vertex in component]
            lo, hi = min(p.y for p in points), max(p.y for p in points)
            if lo <= .08 <= hi:
                keep.append(component)
            else:
                if not (lo > rear_axle and hi-lo < .08):
                    raise RuntimeError(f"Unexpected disconnected sill component {obj.name}: Y {lo}..{hi}")
                remove.extend(component)
                print("REMOVED_SILL_COMPONENT", json.dumps({"object":obj.name,"vertices":len(component),"faces":len({f for v in component for f in v.link_faces}),"minimum":[min(p[i] for p in points) for i in range(3)],"maximum":[max(p[i] for p in points) for i in range(3)]}), flush=True)
        if len(keep) != 1:
            raise RuntimeError(f"Named sill {obj.name} needs exactly one connected centre component")
        if remove:
            bmesh.ops.delete(bm, geom=remove, context="VERTS")
            bm.to_mesh(obj.data)
            obj.data.update()
    finally:
        bm.free()


def build(spec):
    global PALETTE, ACTIVE_ENVELOPE
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.world=bpy.data.worlds.new("fleet-world")
    PALETTE={name:material(name,*values) for name,values in {
        "paint":(spec["color"],.38,.30),"glass":((.025,.060,.082),.55,.16),
        "trim":((.023,.025,.030),.05,.55),"rubber":((.018,.020,.023),0,.78),
        "alloy":((.45,.49,.54),.85,.24),"headlight":((.78,.85,.78),.2,.18,.25),
        "tail":((.48,.012,.018),.15,.2,.08),"plate":((.80,.64,.12) if spec["id"]=="kei" else (.78,.81,.74),0,.50),
        "accent":((.035,.32,.26),.25,.40),"indicator":((.85,.32,.025),0,.3,.6),
        "ground":((.14,.16,.19),0,.65),
    }.items()}
    # Build one deterministic wheel at the origin before deriving its opening.
    tire=wheel(spec["wheelRadius"], .24 if spec["id"]=="bus" else .19)
    maximum_3d_radius=max(v.co.length for v in tire.data.vertices)
    ACTIVE_ENVELOPE={"wheelMaximum3DRadius":maximum_3d_radius,"maximumOffset":.05,"constructionClearance":.012,"requiredClearance":.01,"openingRadius":maximum_3d_radius+.05+.012}
    axles=bus(spec) if spec["id"]=="bus" else car(spec)
    # Cut every static detail except the coherent moved front-door group;
    # it is independently separated by the continuous longitudinal bound.
    static_objects=[o for o in bpy.data.objects if o.type=="MESH" and o != tire]
    for item in static_objects:
        if item.name.startswith(("folding-door","door-glass","door-step")):
            continue
        points=[item.matrix_world@v.co for v in item.data.vertices]
        for axle in axles:
            opening=ACTIVE_ENVELOPE["openingRadius"]
            if max(p.y for p in points)<axle-opening or min(p.y for p in points)>axle+opening or min(p.z for p in points)>spec["wheelRadius"]+opening:
                continue
            wheel_arch(item,axle,spec["wheelRadius"],spec["width"])
    if spec["id"] != "bus":
        for item in static_objects:
            if item.name == "sill" or item.name.startswith("sill."):
                retain_central_sill(item, axles[1])
    body=join(sorted([o for o in bpy.data.objects if o.type=="MESH" and o != tire], key=lambda item:item.name),"body")
    measured_radius=max(math.hypot(v.co.y,v.co.z) for v in tire.data.vertices)
    if abs(measured_radius-spec["wheelRadius"])>.00001:
        raise RuntimeError(f"{spec['id']} actual tire radius {measured_radius} differs from recipe {spec['wheelRadius']}")
    tire.data.name=f"{spec['id']}-wheel"
    wheels=[]
    for axle_index,y in enumerate(axles):
        for side in (-1,1):
            obj=tire if not wheels else bpy.data.objects.new("wheel",tire.data)
            if obj is not tire:
                bpy.context.collection.objects.link(obj)
            obj.name=f"wheel_{axle_index}_{'left' if side>0 else 'right'}"
            obj.location=(side*(spec["width"]/2-.055),y,spec["wheelRadius"])
            wheels.append(obj)
    objects=[body,*wheels]
    bpy.context.view_layer.update()
    points=[o.matrix_world@v.co for o in objects for v in o.data.vertices]
    minimum=[min(p.x for p in points),min(p.z for p in points),min(-p.y for p in points)]
    maximum=[max(p.x for p in points),max(p.z for p in points),max(-p.y for p in points)]
    if abs(minimum[1])>.00001:
        raise RuntimeError(f"{spec['id']} minimum Y {minimum[1]} must meet wheel contact at zero")
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    path=OUT/f"vehicle-{spec['id']}.glb"
    bpy.ops.export_scene.gltf(filepath=str(path),export_format="GLB",use_selection=True,export_animations=False,export_yup=True,export_texcoords=False)
    result={**{key:value for key,value in spec.items() if key!="color"},"model":path.name,"sha256":digest(path),"bytes":path.stat().st_size,
            "vertexCount":sum(len(o.data.vertices) for o in objects),"wheelObjects":[o.name for o in wheels],
            "bounds":{"min":minimum,"max":maximum},
            "measuredWheelRadius":measured_radius,
            "collision":{"width":2*max(abs(minimum[0]),abs(maximum[0])),"length":2*max(abs(minimum[2]),abs(maximum[2]))},
            "axles":{"frontZ":-axles[0],"rearZ":-axles[1],"trackMetres":spec["width"]-.11}}
    result["clearance"]=ACTIVE_ENVELOPE
    result["review"]=[]
    return result


OUT.mkdir(parents=True,exist_ok=True)
fleet=[build(spec) for spec in [
    {"id":"kei","length":3.40,"width":1.48,"height":1.78,"wheelRadius":.285,"color":(.47,.59,.58)},
    {"id":"taxi","length":4.40,"width":1.70,"height":1.75,"wheelRadius":.315,"color":(.027,.030,.039)},
    {"id":"bus","length":10.40,"width":2.50,"height":3.10,"wheelRadius":.48,"color":(.66,.69,.57)},
]]
manifest={"version":1,"units":"metres","up":"+Y","forward":"+Z","origin":"ground-centre","yawAxis":"+Y",
          "licence":"MIT","source":"Original repository-authored unbranded vehicle geometry; no downloaded vehicle mesh or brand texture",
          "recipeSha256":digest(Path(__file__)),"blenderVersion":bpy.app.version_string,"vehicles":fleet}
(OUT/"vehicles.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")
print("VEHICLE_MANIFEST",json.dumps(manifest),flush=True)
