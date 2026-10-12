"""Preparation-only reuse of the pinned baker; no delivered asset writes or renders."""
import ast, hashlib, json, sys
from pathlib import Path
import bpy
import numpy as np

args = sys.argv[sys.argv.index('--') + 1:]
if len(args) != 2:
    raise RuntimeError('Female reference extraction requires repository root and owned relative output')
PRIMARY = Path(args[0]).resolve()
relative = Path(args[1])
if relative.is_absolute() or '..' in relative.parts or not relative.parts or relative.parts[:2] != ('data', 'agents'):
    raise RuntimeError('Female reference output must be a relative directory below data/agents')
OUT = (PRIMARY / relative).resolve()
if not OUT.is_relative_to(PRIMARY / 'data/agents'):
    raise RuntimeError('Female reference output escapes data/agents')
if OUT.exists():
    raise RuntimeError('Female reference output already exists; choose an unused owned output')
OUT.mkdir(parents=True)
recipe = PRIMARY / 'tools/agents/bake-human.py'
if hashlib.sha256(recipe.read_bytes()).hexdigest() != '62cec8bc8d3c3b52cc4d5322b6da342bfcebf22fb10e4cce261cc08d1b1ab79a':
    raise RuntimeError('Pinned female recipe changed')
ns = {'__name__': 'female_reference_only', '__file__': str(recipe)}
exec(compile(recipe.read_text(encoding='utf-8'), str(recipe), 'exec'), ns)
ns['VARIANT'] = 'commuter-female'
ns['OUT'] = PRIMARY / 'data/scene/agents'
ns['EVIDENCE'] = OUT
tree = ast.parse(recipe.read_text(encoding='utf-8'))
function = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'build_lod')
stop = next(i for i,n in enumerate(function.body) if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='positions' for t in n.targets))
function.body = function.body[:stop] + [ast.Return(value=ast.Tuple(elts=[ast.Name(id=n,ctx=ast.Load()) for n in ['rig','meshes','targets','vertex_count']],ctx=ast.Load()))]
exec(compile(ast.fix_missing_locations(ast.Module(body=[function],type_ignores=[])),str(recipe)+'#preparation-only','exec'),ns)
def matrix(m): return [m[r][c] for c in range(4) for r in range(4)]
for lod,ratio in [('near',1.0),('medium',.10),('far',.015)]:
    target = OUT / lod
    target.mkdir(exist_ok=True)
    rig,meshes,targets,count = ns['build_lod'](lod,ratio)
    bpy.context.view_layer.update()
    names = [b.name for b in rig.data.bones]
    bind = [matrix(rig.matrix_world @ rig.data.bones[name].matrix_local) for name in names]
    vertices=[]
    for mesh in meshes:
        for v in mesh.data.vertices:
            p=mesh.matrix_world @ v.co
            weights=[(names.index(mesh.vertex_groups[g.group].name),g.weight) for g in v.groups if mesh.vertex_groups[g.group].name in names and g.weight>0]
            vertices.append({'p':[p.x,p.z,-p.y],'joints':[j for j,w in weights],'weights':[w for j,w in weights]})
    (target/'source-weights.json').write_text(json.dumps(vertices,separators=(',',':')),encoding='utf-8')
    frames=[{'id':f'walk-{i}','clip':'walk','phase':i/32,'vatFrame':i} for i in range(32)]+[{'id':f'idle-{i}','clip':'idle','phase':i/16,'vatFrame':32+i} for i in range(16)]
    frames += [{'id':'idle-0-foot-left-10mm','clip':'idle','phase':0,'vatFrame':32,'perturbation':{'bone':'foot_l','translationBlenderWorld':[.01,0,0]}}]
    meta={'variant':'commuter-female','lod':lod,'vertexCount':count,'blender':bpy.app.version_string,'jointNames':names,'jointParents':[names.index(rig.data.bones[n].parent.name) if rig.data.bones[n].parent else None for n in names],'bindWorld':bind,'frames':frames,'meshes':[{'name':m.name,'vertices':len(m.data.vertices),'matrixWorld':matrix(m.matrix_world)} for m in meshes]}
    for frame in frames:
        ns['pose'](rig,targets,frame['phase'],frame['clip']=='walk')
        if 'perturbation' in frame:
            from mathutils import Vector
            bone=rig.pose.bones['foot_l']; moved=bone.matrix.copy()
            moved.translation += rig.matrix_world.inverted().to_3x3() @ Vector((.01,0,0))
            bone.matrix=moved; bpy.context.view_layer.update()
        depsgraph=bpy.context.evaluated_depsgraph_get(); positions=[]
        for mesh in meshes:
            evaluated=mesh.evaluated_get(depsgraph); data=evaluated.to_mesh()
            try:
                if len(data.vertices)!=len(mesh.data.vertices): raise RuntimeError('Topology changed '+mesh.name)
                for vertex in data.vertices:
                    p=mesh.matrix_world @ vertex.co; positions.extend((p.x,p.z,-p.y))
            finally: evaluated.to_mesh_clear()
        file=frame['id']+'.f32'; raw=np.asarray(positions,dtype='<f4').tobytes(); (target/file).write_bytes(raw)
        frame['positions']=file; frame['sha256']=hashlib.sha256(raw).hexdigest(); frame['poseWorld']=[matrix(rig.matrix_world @ rig.pose.bones[n].matrix) for n in names]
    (target/'extracted.json').write_text(json.dumps(meta),encoding='utf-8')
    print('FEMALE_REFERENCE_COMPLETE',lod,count,len(frames),'max influences',max(len(v['weights']) for v in vertices),flush=True)
