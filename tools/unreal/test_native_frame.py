"""Bound: literal frame/import-byte/map-tag controls; no native importer/oracle claim."""
import ast
import copy
import hashlib
import json
import math
import os
from pathlib import Path
import re
import stat
import struct
import tempfile
import types
import unittest

ROOT = Path(__file__).absolute().parents[2]
HELPER = Path(os.environ.get('SHIBUYA_SUPPORT_HELPER', ROOT/'Content/Python/shibuya_tools.py'))
FRAME = {'schema_version':1, 'id':'native-centimetres-Xeast-Ysouth-Zup-v2', 'definition_sha256':'2099342528416aa9dcdceea63e6d2604974341d8248f3b1c7ccf287008759170'}

def checked(path):
    for part in [*reversed(path.absolute().parents), path.absolute()]:
        info = part.lstat()
        if stat.S_ISLNK(info.st_mode) or getattr(info,'st_file_attributes',0)&1024: raise RuntimeError('Linked '+str(part))
    return path

def environment():
    tree = ast.parse(checked(HELPER).read_text(encoding='utf-8'))
    names = {'_native_frame_record','_require_native_frame','_import_glb','_source_to_native_cm','_native_to_source_m','_source_normal_to_native','_native_actor_tag','_native_scene_frame','_native_glb_derivative','_native_import_file','_local_file','_support_fixed_ray_contract','_support_check_hit'}
    env = dict(json=json, hashlib=hashlib, math=math, struct=struct, stat=stat, Path=Path, re=re)
    exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names], type_ignores=[]),str(HELPER),'exec'),env)
    return env

def unpack(payload):
    count = struct.unpack_from('<I', payload, 12)[0]
    return json.loads(payload[20:20+count]), payload[28+count:]

def fixture():
    blocks = [struct.pack('<9f',2,3,5,2,3,9,6,3,5), struct.pack('<9f',-.2,1,.3,-.2,1,.3,-.2,1,.3),
              struct.pack('<12f',.6,0,.8,1,.6,0,.8,1,.6,0,.8,1), struct.pack('<6f',.1,.2,.3,.4,.5,.6), struct.pack('<3H',0,1,2), b'original-texture-bytes']
    binary=bytearray(); views=[]
    for block in blocks:
        binary.extend(b'\0'*(-len(binary)%4));views.append({'buffer':0,'byteOffset':len(binary),'byteLength':len(block)});binary.extend(block)
    doc={'asset':{'version':'2.0'},'buffers':[{'byteLength':len(binary)}],'bufferViews':views,
         'accessors':[{'bufferView':i,'componentType':5123 if i==4 else 5126,'count':3,'type':kind} for i,kind in enumerate(['VEC3','VEC3','VEC4','VEC2','SCALAR'])],
         'images':[{'bufferView':5,'mimeType':'image/png'}], 'textures':[{'source':0}], 'materials':[{'name':'original','pbrMetallicRoughness':{'baseColorTexture':{'index':0}}}],
         'meshes':[{'name':'source-ID-518','primitives':[{'attributes':{'POSITION':0,'NORMAL':1,'TANGENT':2,'TEXCOORD_0':3},'indices':4,'material':0,'extras':{'source_triangle':494}}]}],
         'nodes':[{'mesh':0,'name':'source-node'}], 'scenes':[{'nodes':[0]}], 'scene':0}
    binary.extend(b'\0'*(-len(binary)%4));doc['buffers'][0]['byteLength']=len(binary)
    metadata=json.dumps(doc,separators=(',',':')).encode();metadata+=b' '*(-len(metadata)%4)
    return struct.pack('<4sII',b'glTF',2,28+len(metadata)+len(binary))+struct.pack('<II',len(metadata),0x4E4F534A)+metadata+struct.pack('<II',len(binary),0x004E4942)+binary

def values(doc,binary,accessor):
    item=doc['accessors'][accessor];view=doc['bufferViews'][item['bufferView']]
    n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[item['type']];fmt={5126:'f',5123:'H'}[item['componentType']]
    width=struct.calcsize('<'+fmt*n);start=view.get('byteOffset',0)+item.get('byteOffset',0)
    return [list(struct.unpack_from('<'+fmt*n,binary,start+i*view.get('byteStride',width))) for i in range(item['count'])]

class ImportFixtureStaticMesh:
    def __init__(self,path,tags=None):self.path=path;self.tags=dict(tags or {});self.static_materials=[]
    def get_path_name(self):return self.path
    def get_num_vertices(self,lod):return 3
    def get_num_triangles(self,lod):return 1
class NativeFrameTests(unittest.TestCase):
    def setUp(self):self.env=environment()

    def test_literal_forward_inverse_and_marker_refusal(self):
        self.assertEqual(self.env['_native_frame_record'](),FRAME)
        self.assertEqual(self.env['_source_to_native_cm']([2,5,3]),[200,-500,300])
        self.assertEqual(self.env['_native_to_source_m']([200,-500,300]),[2,5,3])
        for value in (None,{},dict(FRAME,schema_version=True),dict(FRAME,schema_version='1'),dict(FRAME,id='old'),dict(FRAME,extra=1)):
            with self.assertRaisesRegex(RuntimeError,'ESU'):self.env['_require_native_frame']({'native_frame':value},'fixture')

    def test_derivative_preserves_raw_uv_images_ids_and_exact_net_orientation(self):
        raw=fixture();old,oldbin=unpack(raw);derived,receipt=self.env['_native_glb_derivative'](raw);doc,binary=unpack(derived)
        p=doc['meshes'][0]['primitives'][0]
        self.assertEqual(binary[:len(oldbin)],oldbin)
        for key in ('images','textures','materials','nodes','scenes'):self.assertEqual(doc[key],old[key])
        self.assertEqual(p['extras'],{'source_triangle':494});self.assertEqual(p['attributes']['TEXCOORD_0'],3)
        self.assertEqual(values(doc,binary,p['attributes']['POSITION']),[[2,3,-5],[2,3,-9],[6,3,-5]])
        self.assertEqual(values(doc,binary,p['indices']),[[0],[2],[1]])
        normals=values(doc,binary,p['attributes']['NORMAL']);tangents=values(doc,binary,p['attributes']['TANGENT'])
        self.assertAlmostEqual(normals[0][2],-.3,places=6);self.assertEqual(normals[0][1],1)
        self.assertAlmostEqual(tangents[0][2],-.8,places=6);self.assertEqual(tangents[0][3],-1)
        self.assertEqual(receipt['raw_eun_sha256'],hashlib.sha256(raw).hexdigest())
        self.assertEqual(receipt['derivative_sha256'],hashlib.sha256(derived).hexdigest())
        # Literal native final corners after glTF's Y/Z coordinate conversion:
        native=[[200,-500,300],[600,-500,300],[200,-900,300]]
        a,b,c=native;u=[b[i]-a[i] for i in range(3)];v=[c[i]-a[i] for i in range(3)]
        physical=[-(u[1]*v[2]-u[2]*v[1]),-(u[2]*v[0]-u[0]*v[2]),-(u[0]*v[1]-u[1]*v[0])]
        self.assertEqual(physical,[0,0,160000]);self.assertEqual(receipt['native_import_equivalence'],'NOT_OBSERVED')

    def test_shared_accessors_transform_once_and_second_derivative_refuses(self):
        raw=fixture();doc,binary=unpack(raw);doc['meshes'][0]['primitives'].append(copy.deepcopy(doc['meshes'][0]['primitives'][0]))
        meta=json.dumps(doc).encode();meta+=b' '*(-len(meta)%4)
        raw=struct.pack('<4sII',b'glTF',2,28+len(meta)+len(binary))+struct.pack('<II',len(meta),0x4E4F534A)+meta+struct.pack('<II',len(binary),0x004E4942)+binary
        derived,receipt=self.env['_native_glb_derivative'](raw)
        self.assertEqual(len(receipt['accessors']),4)
        doc,_=unpack(derived);self.assertEqual(doc['meshes'][0]['primitives'][0],doc['meshes'][0]['primitives'][1])
        with self.assertRaisesRegex(RuntimeError,'second reflection'):self.env['_native_glb_derivative'](derived)

    def test_source_transform_is_not_silently_baked_or_relabelled(self):
        raw=fixture();doc,binary=unpack(raw);doc['nodes'][0]['translation']=[1,0,0]
        meta=json.dumps(doc).encode();meta+=b' '*(-len(meta)%4)
        raw=struct.pack('<4sII',b'glTF',2,28+len(meta)+len(binary))+struct.pack('<II',len(meta),0x4E4F534A)+meta+struct.pack('<II',len(binary),0x004E4942)+binary
        with self.assertRaisesRegex(RuntimeError,'without transforms'):self.env['_native_glb_derivative'](raw)

    def test_map_missing_wrong_mixed_duplicate_tags_refuse_before_admission(self):
        class Actor:
            def __init__(self,i):self.i=i;self.tags=['ShibuyaSource',selftag]
            def actor_has_tag(self,t):return t in self.tags
            def get_actor_label(self):return str(self.i)
        selftag=self.env['_native_actor_tag']();actors=[Actor(i) for i in range(112)]
        self.env.update(unreal=types.SimpleNamespace(StaticMeshActor=Actor),_actors=lambda:types.SimpleNamespace(get_all_level_actors=lambda:actors))
        self.assertEqual(self.env['_native_scene_frame'](require=True)['native_frame'],FRAME)
        for tags in (['ShibuyaSource'],['ShibuyaSource','ShibuyaNativeFrame:old'],['ShibuyaSource',selftag,selftag]):
            actors[0].tags=tags
            with self.assertRaisesRegex(RuntimeError,'112'):self.env['_native_scene_frame'](require=True)

    def test_native_endpoint_digest_changes_while_source_tuple_digest_is_retained(self):
        row={'id':'asymmetric','start_m':[2,5,8],'end_m':[2,5,-1]}
        result=self.env['_support_fixed_ray_contract']([row])
        source=struct.pack('<6dBB',2,5,8,2,5,-1,0,1);native=struct.pack('<6dBB',200,-500,800,200,-500,-100,0,1)
        # Source digest additionally binds the original identity envelope.
        identity=json.dumps({'id':'asymmetric','reference':None},separators=(',',':')).encode()
        self.assertEqual(result['endpoints_modes_binary64_sha256'],hashlib.sha256(struct.pack('<I',len(identity))+identity+source).hexdigest())
        self.assertEqual(result['native_endpoints_modes_binary64_sha256'],hashlib.sha256(native).hexdigest())
        self.assertEqual(result['native_frame'],FRAME)

    def test_import_derivative_is_content_addressed_and_raw_bytes_conserved(self):
        with tempfile.TemporaryDirectory(prefix='native-frame-unit-') as name:
            root=Path(name);path=root/'data/prepared/triangle.glb';path.parent.mkdir(parents=True);path.write_bytes(fixture())
            self.env['PROJECT']=root;before=checked(path).read_bytes()
            target,receipt=self.env['_native_import_file'](path)
            self.assertEqual(checked(path).read_bytes(),before)
            self.assertEqual(target.parent.name,hashlib.sha256(before).hexdigest())
            self.assertEqual(hashlib.sha256(checked(target).read_bytes()).hexdigest(),receipt['derivative_sha256'])
            self.assertEqual(self.env['_native_import_file'](path),(target,receipt))

    def import_fixture(self, task_mesh=None, existing_mesh=None, importer_error=None):
        destination='/Game/Surface/Fixture'
        class Texture: pass
        class MaterialInterface: pass
        class Task: pass
        calls={'metadata':[],'saved':[],'registry':[]}
        assets={}
        for mesh in (task_mesh,existing_mesh):
            if mesh is not None:assets[mesh.get_path_name()]=mesh
        def import_tasks(tasks):
            if importer_error is not None:raise importer_error
            tasks[0].imported_object_paths=[task_mesh.get_path_name()] if task_mesh is not None else []
        def list_assets(*args,**kwargs):
            calls['registry'].append(args)
            return list(assets)
        class EditorAssetLibrary:
            @staticmethod
            def list_assets(*args,**kwargs):return list_assets(*args,**kwargs)
            @staticmethod
            def set_metadata_tag(mesh,key,value):
                calls['metadata'].append((mesh.get_path_name(),key,value));mesh.tags[key]=value
            @staticmethod
            def save_loaded_asset(asset,*args):
                calls['saved'].append(asset.get_path_name());return True
        self.env.update(
            unreal=types.SimpleNamespace(AssetImportTask=Task,
                AssetToolsHelpers=types.SimpleNamespace(get_asset_tools=lambda:types.SimpleNamespace(import_asset_tasks=import_tasks)),
                StaticMesh=ImportFixtureStaticMesh,Texture=Texture,MaterialInterface=MaterialInterface,EditorAssetLibrary=EditorAssetLibrary,load_asset=lambda name:assets[name]),
            _native_import_file=lambda path:(path,{'raw_eun_sha256':'raw-digest','derivative_sha256':'derivative-digest'}),
            _native_actor_tag=lambda:'current-esu-frame',_native_import_receipts={},_glb_image_count=lambda path:0)
        def run():
            return self.env['_import_glb'](Path('fixture.glb'),destination,require_textures=False,prepare_nanite=False)
        return run,calls,assets,destination

    def test_empty_task_does_not_admit_or_stamp_old_registry_mesh(self):
        destination='/Game/Surface/Fixture'
        stale=ImportFixtureStaticMesh(destination+'/OldTaggedMesh',
            {'ShibuyaNativeFrame':'old-frame','ShibuyaRawEUNSHA256':'old-raw'})
        run,calls,_,destination=self.import_fixture(existing_mesh=stale)
        original_tags=dict(stale.tags)
        with self.assertRaisesRegex(RuntimeError,'no static meshes'):
            run()
        self.assertEqual(stale.tags,original_tags)
        self.assertEqual(calls['metadata'],[]);self.assertEqual(calls['saved'],[])
        self.assertEqual(self.env['_native_import_receipts'],{})
        self.assertEqual(calls['registry'],[])

    def test_actual_task_mesh_is_admitted_with_current_derivative_receipt(self):
        destination='/Game/Surface/Fixture'
        stale=ImportFixtureStaticMesh(destination+'/OldTaggedMesh',{'ShibuyaNativeFrame':'old-frame'})
        fresh=ImportFixtureStaticMesh(destination+'/NewTaskMesh')
        run,calls,_,destination=self.import_fixture(task_mesh=fresh,existing_mesh=stale)
        self.assertEqual(run(),[fresh])
        self.assertEqual({entry[1]:entry[2] for entry in calls['metadata']},
            {'ShibuyaNativeFrame':'current-esu-frame','ShibuyaRawEUNSHA256':'raw-digest',
             'ShibuyaNativeDerivativeSHA256':'derivative-digest'})
        self.assertEqual(calls['saved'],[fresh.get_path_name()])
        receipt=self.env['_native_import_receipts'][destination]
        self.assertEqual(receipt['derivative_sha256'],'derivative-digest')
        self.assertEqual(receipt['actual_imported_meshes'],[{'asset':fresh.get_path_name(),'lod0_vertices':3,'lod0_triangles':1}])

    def test_importer_exception_propagates_without_stamping_or_receipt(self):
        destination='/Game/Surface/Fixture'
        stale=ImportFixtureStaticMesh(destination+'/OldTaggedMesh',{'ShibuyaNativeFrame':'old-frame'})
        failure=RuntimeError('fixture importer exception')
        run,calls,_,destination=self.import_fixture(existing_mesh=stale,importer_error=failure)
        original_tags=dict(stale.tags)
        with self.assertRaisesRegex(RuntimeError,'fixture importer exception'):
            run()
        self.assertEqual(stale.tags,original_tags)
        self.assertEqual(calls['metadata'],[]);self.assertEqual(calls['saved'],[])
        self.assertEqual(calls['registry'],[]);self.assertEqual(self.env['_native_import_receipts'],{})
if __name__=='__main__':unittest.main()
