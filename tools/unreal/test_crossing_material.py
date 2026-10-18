"""Actual material trial AST with independent receiver/graph controls; no engine or appearance claim."""
import ast,copy,json,os,math,struct,hashlib,stat
from pathlib import Path
from types import SimpleNamespace as NS
import unittest
HELPER=Path(os.environ.get('SHIBUYA_SUPPORT_HELPER',Path(__file__).parents[2]/'Content/Python/shibuya_tools.py'))
FRAME={'schema_version':1,'id':'native-centimetres-Xeast-Ysouth-Zup-v2','definition_sha256':'2099342528416aa9dcdceea63e6d2604974341d8248f3b1c7ccf287008759170'}
RECEIVERS={'City_055_data68':'/Game/Surface/Roads/Tile_055/data68/StaticMeshes/data68.data68','City_058_data72':'/Game/Surface/Roads/Tile_058/data72/StaticMeshes/data72.data72','City_069_terrain':'/Game/Surface/TerrainPhoto/terrain-photo/StaticMeshes/terrain-photo.terrain-photo'}
ORIGINAL='/Game/Surface/TerrainPhoto/terrain-photo/Materials/Official_GSI_aerial_photograph.Official_GSI_aerial_photograph'

def checked(path):
 for q in [*reversed(path.absolute().parents),path.absolute()]:
  s=q.lstat()
  if stat.S_ISLNK(s.st_mode) or getattr(s,'st_file_attributes',0)&1024:raise RuntimeError(str(q))
 return path

class MaterialTrialTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tree=ast.parse(checked(HELPER).read_bytes());cls.functions=[copy.deepcopy(n) for n in cls.tree.body if isinstance(n,ast.FunctionDef) and n.name.startswith('_crossing_') or isinstance(n,ast.FunctionDef) and n.name in ('_apply_crossing_material_trial','_restore_crossing_material_trial')]
  cls.assignments=[copy.deepcopy(n) for n in cls.tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and (t.id.startswith('_CROSSING_') or t.id=='_crossing_trial') for t in n.targets)]
 def setUp(self):
  class Asset:
   def __init__(self,path):self.path=path
   def get_path_name(self):return self.path
  class Mesh(Asset):pass
  class Material(Asset):
   attributes=False
   def get_editor_property(inner,key):assert key=='use_material_attributes';return inner.attributes
  class Component:
   def __init__(self,mesh,mat,overrides):self.static_mesh=mesh;self.original=mat;self.overrides=list(overrides);self.sets=[];self.fail=False
   def get_num_materials(self):return 1
   def get_material(self,i):return self.overrides[0] if self.overrides and self.overrides[0] else self.original
   def get_editor_property(self,k):assert k=='override_materials';return list(self.overrides)
   def set_editor_property(self,k,v):assert k=='override_materials';self.overrides=list(v)
   def set_material(self,i,v):
    self.sets.append((i,v.get_path_name()))
    if self.fail and v.get_path_name()!='/Game/Original':raise RuntimeError('partial binding failure')
    self.overrides=[v]
  class Actor:
   def __init__(self,label,component):self.label=label;self.static_mesh_component=component
   def get_actor_label(self):return self.label
   def actor_has_tag(self,k):return k=='ShibuyaSource'
  self.Material=Material;self.Asset=Asset;self.original=Material(ORIGINAL);self.candidate=Material('/Game/AppearanceRepair/CrossingV2/Trial.Trial')
  self.actors=[Actor(label,Component(Mesh(mesh),self.original,[] if i%2==0 else [self.original])) for i,(label,mesh) in enumerate(RECEIVERS.items())]
  self.actors.append(Actor('Unrelated',Component(Mesh('/Game/Other'),Material('/Game/Original'),[])))
  self.parameters={'texture':{'BaseColorTexture':'/Game/Surface/TerrainPhoto/terrain-photo/Textures/terrain-photo_texture_0.terrain-photo_texture_0'},'scalar':{'BaseColorTexture_TexCoord':0.,'BaseColorTexture_Rotation':0.},'vector':{'BaseColorTexture_OffsetScale':[0.,0.,1.,1.],'BaseColorFactor':[1.,1.,1.,1.]},'static_switch':{'original':True},'parent_chain':['original/parent']}
  self.geometry={'original':'literal geometry/transforms'};self.prepared=0;self.frame_calls=0
  def frame(**kw):self.frame_calls+=1;return {'native_frame':dict(FRAME)}
  self.env={'json':json,'math':math,'struct':struct,'hashlib':hashlib,'_capture':None,'_native_frame_record':lambda:dict(FRAME),'_native_scene_frame':frame,'_source_actor_state':lambda excluded:copy.deepcopy(self.geometry),'_material_parameter_state':lambda value:copy.deepcopy(self.parameters),'_actors':lambda:NS(get_all_level_actors=lambda:self.actors),'unreal':NS(StaticMeshActor=Actor)}
  exec(compile(ast.Module(body=self.assignments+self.functions,type_ignores=[]),str(HELPER),'exec'),self.env)
  self.actual_inputs=self.env['_crossing_inputs'];self.actual_prepare=self.env['_crossing_prepare_material']
  self.env['_crossing_inputs']=lambda p:({'mask':{'sha256':'sealed'},'purpose':'inferred'},Path('mask.png'))
  def prepare(*args):self.prepared+=1;return self.candidate,{'saved':False}
  self.env['_crossing_prepare_material']=prepare
  self.before=copy.deepcopy(self.env['_crossing_bindings']())
 def apply(self):return self.env['_apply_crossing_material_trial']('fixed')
 def restore(self):return self.env['_restore_crossing_material_trial']()
 def test_only_three_effective_slots_change_and_raw_arrays_restore_exactly(self):
  row=self.apply();self.assertEqual(row['receivers'],sorted(RECEIVERS));self.assertIs(row['saved'],False)
  self.assertEqual(self.env['_crossing_bindings']()['Unrelated'],self.before['Unrelated'])
  for actor in self.actors[:3]:self.assertIs(actor.static_mesh_component.get_material(0),self.candidate)
  result=self.restore();self.assertIs(result['restored'],True);self.assertEqual(self.env['_crossing_bindings'](),self.before);self.assertIsNone(self.env['_crossing_trial']);self.assertEqual(self.restore(),{'changed':False,'restored':True,'saved':False})
 def test_active_capture_and_double_apply_refuse_before_preparation(self):
  self.env['_capture']={'active':True}
  with self.assertRaisesRegex(RuntimeError,'no active capture'):self.apply()
  self.assertEqual(self.prepared,0);self.env['_capture']=None;self.apply()
  with self.assertRaisesRegex(RuntimeError,'existing material trial'):self.apply()
  self.assertEqual(self.prepared,1);self.restore()
 def test_wrong_native_frame_refuses_before_asset_preparation_or_bindings(self):
  def fail(**kw):raise RuntimeError('old frame')
  self.env['_native_scene_frame']=fail
  with self.assertRaisesRegex(RuntimeError,'old frame'):self.apply()
  self.assertEqual(self.prepared,0);self.assertEqual(self.env['_crossing_bindings'](),self.before)
 def test_wrong_mesh_or_slot_or_material_and_duplicate_receiver_refuse(self):
  actor=self.actors[0];component=actor.static_mesh_component;mesh=component.static_mesh;mat=component.original
  for mode in ('mesh','slot','material','duplicate'):
   with self.subTest(mode=mode):
    component.static_mesh=mesh;component.original=mat;component.get_num_materials=lambda:1;self.actors=self.actors[:4]
    if mode=='mesh':component.static_mesh=self.Asset('/Game/Wrong')
    if mode=='slot':component.get_num_materials=lambda:2
    if mode=='material':component.original=self.candidate
    if mode=='duplicate':self.actors.append(actor)
    with self.assertRaises(RuntimeError):self.apply()
  self.assertEqual(self.prepared,0)
 def test_nonidentity_geographic_uv_mapping_refuses_before_preparation(self):
  for kind,key,value in [('scalar','BaseColorTexture_TexCoord',1),('scalar','BaseColorTexture_Rotation',.1),('vector','BaseColorTexture_OffsetScale',[.1,0,1,1]),('texture','BaseColorTexture','wrong')]:
   old=self.parameters[kind][key];self.parameters[kind][key]=value
   with self.subTest(key=key),self.assertRaisesRegex(RuntimeError,'geographic UV0'):self.apply()
   self.parameters[kind][key]=old
  self.assertEqual(self.prepared,0)
 def test_compile_failure_leaves_every_receiver_unmodified(self):
  def fail(*a):raise RuntimeError('own shader resource failed')
  self.env['_crossing_prepare_material']=fail
  with self.assertRaisesRegex(RuntimeError,'shader resource'):self.apply()
  self.assertEqual(self.env['_crossing_bindings'](),self.before);self.assertIsNone(self.env['_crossing_trial'])
 def test_partial_assignment_failure_restores_previous_and_raw_override_arrays(self):
  c=self.actors[1].static_mesh_component;old=c.set_material
  def fail(i,v):
   if v is self.candidate:raise RuntimeError('partial binding failure')
   return old(i,v)
  c.set_material=fail
  with self.assertRaisesRegex(RuntimeError,'partial binding failure'):self.apply()
  self.assertEqual(self.env['_crossing_bindings'](),self.before);self.assertIsNone(self.env['_crossing_trial'])
 def test_rollback_error_attaches_without_hiding_primary_and_retains_restoration_state(self):
  c=self.actors[1].static_mesh_component
  c.set_material=lambda i,v:(_ for _ in ()).throw(RuntimeError('primary bind'))
  with self.assertRaisesRegex(RuntimeError,'primary bind') as error:self.apply()
  self.assertIn('rollback also failed',error.exception.__notes__[0]);self.assertIsNotNone(self.env['_crossing_trial'])
 def test_original_material_conservation_failure_is_causal(self):
  actual=self.env['_crossing_prepare_material']
  def bad(*a):self.parameters['scalar']['BaseColorTexture_Rotation']=.25;return actual(*a)
  self.env['_crossing_prepare_material']=bad
  with self.assertRaisesRegex(RuntimeError,'original material parameters') as error:self.apply()
  self.assertIn('restoration failed',error.exception.__notes__[0])
 def test_fixed_manifest_path_and_hash_refuse_before_source_reads(self):
  self.env['_local_file']=lambda value:(_ for _ in ()).throw(RuntimeError('local-file-called'))
  for value in ('other.json','../manifest.json',1,True,None):
   with self.subTest(value=value),self.assertRaisesRegex(RuntimeError,'one published'):self.actual_inputs(value)
  class Input:
   def stat(self):return NS(st_size=2)
   def read_bytes(self):return b'{}'
  self.env['_local_file']=lambda value:Input()
  with self.assertRaisesRegex(RuntimeError,'exact sealed'):self.actual_inputs('data/prepared/appearance/crossing-v2/manifest.json')
 def test_actual_attribute_flag_refuses_before_mask_import_or_private_asset_lookup(self):
  class Instance(self.Material):pass
  self.env['unreal'].MaterialInstanceConstant=Instance;self.env['unreal'].Material=self.Material;self.env['unreal'].MaterialEditingLibrary=NS()
  self.env['unreal'].EditorAssetLibrary=NS(does_asset_exist=lambda p:(_ for _ in ()).throw(AssertionError('asset lookup must not run')))
  for mode in (True,None,0,1,'False'):
   self.original.attributes=mode
   with self.subTest(mode=mode),self.assertRaisesRegex(RuntimeError,'No assets imported or receivers changed'):self.actual_prepare(self.original,Path('mask'),{})
  self.assertEqual(self.env['_crossing_bindings'](),self.before)
 def test_private_destination_cannot_reuse_previous_assets(self):
  class Instance(self.Material):pass
  self.env['unreal'].MaterialInstanceConstant=Instance;self.env['unreal'].Material=self.Material
  self.env['unreal'].MaterialEditingLibrary=NS();self.env['unreal'].EditorAssetLibrary=NS(does_asset_exist=lambda p:True)
  with self.assertRaisesRegex(RuntimeError,'old assets cannot be reused'):self.actual_prepare(self.original,Path('mask'),{})
 def test_new_mask_import_empty_task_has_no_registry_fallback(self):
  class Instance(self.Material):pass
  self.env['unreal'].MaterialInstanceConstant=Instance;self.env['unreal'].Material=self.Material;self.env['unreal'].MaterialEditingLibrary=NS();self.env['unreal'].Texture2D=type('Texture',(),{})
  self.env['unreal'].EditorAssetLibrary=NS(does_asset_exist=lambda p:False);self.env['unreal'].AssetToolsHelpers=NS(get_asset_tools=lambda:NS(import_asset_tasks=lambda tasks:None));self.env['unreal'].AssetImportTask=lambda:NS(imported_object_paths=[])
  self.env['_local_file']=lambda p:Path(p)
  self.env['unreal'].TextureAddress=NS(TA_CLAMP='clamp',TA_WRAP='wrap');self.env['unreal'].TextureMipGenSettings=NS(TMGS_NO_MIPMAPS='none',TMGS_FROM_TEXTURE_GROUP='group');self.env['unreal'].TextureFilter=NS(TF_BILINEAR='bilinear',TF_DEFAULT='default')
  with self.assertRaisesRegex(RuntimeError,'exactly its new Texture2D'):self.actual_prepare(self.original,Path('mask'),{'detail':{'path':'detail.png'}})

 def import_controls(self,empty_detail=False,bad_readback=False):
  class Instance(self.Material):pass
  class Texture(self.Asset):
   def __init__(inner,path,size):super().__init__(path);inner.size=size;inner.values={}
   def set_editor_property(inner,k,v):inner.values[k]=v
   def get_editor_property(inner,k):return 'wrong' if bad_readback and k=='address_x' else inner.values[k]
   def blueprint_get_size_x(inner):return inner.size
   def blueprint_get_size_y(inner):return inner.size
  u=self.env['unreal'];u.MaterialInstanceConstant=Instance;u.Material=self.Material;u.MaterialEditingLibrary=NS();u.Texture2D=Texture;u.EditorAssetLibrary=NS(does_asset_exist=lambda p:False)
  u.TextureAddress=NS(TA_CLAMP='clamp',TA_WRAP='wrap');u.TextureMipGenSettings=NS(TMGS_NO_MIPMAPS='none',TMGS_FROM_TEXTURE_GROUP='group');u.TextureFilter=NS(TF_BILINEAR='bilinear',TF_DEFAULT='default');u.TextureCompressionSettings=NS(TC_VECTOR_DISPLACEMENTMAP='rgba8')
  tasks=[];assets={};self.env['_local_file']=lambda p:Path(p)
  def imported(values):
   for task in values:
    tasks.append(task);path=task.destination_path+'/'+task.destination_name+'.'+task.destination_name
    if empty_detail and task.destination_name=='CrossingDetail':continue
    size=2048 if task.destination_name=='CrossingMask' else 512;assets[path]=Texture(path,size);task.imported_object_paths=[path]
  def duplicate(*args):raise RuntimeError('both imports complete before any clone or receiver binding')
  u.AssetToolsHelpers=NS(get_asset_tools=lambda:NS(import_asset_tasks=imported,duplicate_asset=duplicate));u.AssetImportTask=lambda:NS(imported_object_paths=[]);u.load_asset=assets.__getitem__
  return tasks,assets
 def test_new_mask_and_detail_have_distinct_sampling_and_never_save(self):
  tasks,assets=self.import_controls()
  with self.assertRaisesRegex(RuntimeError,'both imports complete'):self.actual_prepare(self.original,Path('mask'),{'mask':{'sha256':'mask'},'detail':{'path':'detail.png','sha256':'detail'}})
  self.assertEqual(len(tasks),2);self.assertTrue(all(t.save is False and t.replace_existing is False for t in tasks));self.assertEqual([t.destination_name for t in tasks],['CrossingMask','CrossingDetail'])
  mask,detail=list(assets.values());self.assertEqual(mask.values['address_x'],'clamp');self.assertEqual(detail.values['address_x'],'wrap');self.assertEqual(mask.values['mip_gen_settings'],'none');self.assertEqual(detail.values['mip_gen_settings'],'group');self.assertEqual(mask.values['filter'],'bilinear');self.assertEqual(detail.values['filter'],'default')
  for t in (mask,detail):self.assertIs(t.values['srgb'],False);self.assertTrue(t.values['never_stream']);self.assertEqual(t.values['compression_settings'],'rgba8')
  self.assertEqual(self.env['_crossing_bindings'](),self.before)
 def test_missing_second_texture_and_readback_mismatch_refuse_before_binding(self):
  self.import_controls(empty_detail=True)
  with self.assertRaisesRegex(RuntimeError,'detail import must return exactly'):self.actual_prepare(self.original,Path('mask'),{'mask':{},'detail':{'path':'detail.png'}})
  self.assertEqual(self.env['_crossing_bindings'](),self.before)
  self.import_controls(bad_readback=True)
  with self.assertRaisesRegex(RuntimeError,'property readback differs: address_x'):self.actual_prepare(self.original,Path('mask'),{'mask':{},'detail':{'path':'detail.png'}})
  self.assertEqual(self.env['_crossing_bindings'](),self.before)

class MaterialGraphTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  tree=ast.parse(checked(HELPER).read_bytes());cls.function=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='_crossing_graph')
 def graph(self,attributes=False,fail=False):
  self.nodes=[];self.properties={}
  class Node:
   def __init__(inner,kind,**values):inner.kind=kind;inner.values=values;inner.inputs={};self.nodes.append(inner)
   def set_editor_property(inner,k,v):inner.values[k]=v
  old=Node('old');rough=Node('oldrough')
  library=NS(create_material_expression=lambda m,c:Node(c),get_material_property_input_node=lambda m,p:old if p=='color' else rough,get_material_property_input_node_output_name=lambda m,p:'')
  def connect(s,out,t,name):
   if name not in ({'UVs'} if t.kind=='MaterialExpressionTextureSample' else {'A','B','Alpha'}):return False
   t.inputs[name]=(s,out);return not fail
  library.connect_material_expressions=connect
  def prop(n,o,p):self.properties[p]=(n,o);return True
  library.connect_material_property=prop
  kinds=['TextureCoordinate','Constant2Vector','Subtract','Multiply','TextureSample','Constant3Vector','Add','Constant','LinearInterpolate']
  unreal=NS(MaterialEditingLibrary=library,MaterialProperty=NS(MP_BASE_COLOR='color',MP_ROUGHNESS='rough'),MaterialSamplerType=NS(SAMPLERTYPE_LINEAR_COLOR='linear'),LinearColor=lambda *v:list(v),**{'MaterialExpression'+k:'MaterialExpression'+k for k in kinds})
  env={'unreal':unreal};exec(compile(ast.Module(body=[copy.deepcopy(self.function)],type_ignores=[]),str(HELPER),'exec'),env)
  manifest={'candidate_id':'crossing-v2-paving-detail','mask_channels':{'R':'asphalt','G':'paint','B':'paving'},'detail_channels':{'R':'color','G':'roughness','B':'wear','A':'paving'},'uv_origin':[1088/2304,1152/2560],'uv_scale':[8.,2560/288],'detail_uv_scale':[139.73572085615223,155.26191206239136],'material':{'asphalt_base_color':[.08]*3,'paint_base_color':[.65]*3,'paving_base_color':[.22,.225,.23],'asphalt_roughness':.85,'paint_roughness':.7,'paving_roughness':.88,'asphalt_color_variation':.5,'asphalt_roughness_variation':.14}}
  return env['_crossing_graph'](NS(get_editor_property=lambda k:attributes),'mask','detail',manifest)
 def evaluate(self,mask,detail=(.5,.5,1.,.5),original=(.2,.3,.4),roughness=.9):
  def binary(a,b,op):
   if isinstance(a,(tuple,list)):return tuple(op(v,b[i] if isinstance(b,(tuple,list)) else b) for i,v in enumerate(a))
   if isinstance(b,(tuple,list)):return tuple(op(a,v) for v in b)
   return op(a,b)
  def value(n,out=''):
   if n.kind=='old':return original
   if n.kind=='oldrough':return roughness
   if n.kind=='MaterialExpressionTextureSample':return (mask if n.values['texture']=='mask' else detail)[{'R':0,'G':1,'B':2,'A':3}[out]]
   if n.kind=='MaterialExpressionConstant3Vector':return tuple(n.values['constant'][:3])
   if n.kind=='MaterialExpressionConstant':return n.values['r']
   def input_(k):return value(*n.inputs[k])
   if n.kind=='MaterialExpressionSubtract':return binary(input_('A'),input_('B'),lambda a,b:a-b)
   if n.kind=='MaterialExpressionMultiply':return binary(input_('A'),input_('B'),lambda a,b:a*b)
   if n.kind=='MaterialExpressionAdd':return binary(input_('A'),input_('B'),lambda a,b:a+b)
   if n.kind=='MaterialExpressionLinearInterpolate':
    a,b,alpha=input_('A'),input_('B'),input_('Alpha');return binary(binary(a,1-alpha,lambda x,y:x*y),binary(b,alpha,lambda x,y:x*y),lambda x,y:x+y)
   raise AssertionError(n.kind)
  return value(*self.properties['color']),value(*self.properties['rough'])
 def assertValues(self,actual,color,rough):
  for a,b in zip(actual[0],color):self.assertAlmostEqual(a,b)
  self.assertAlmostEqual(actual[1],rough)
 def test_direct_root_changes_only_two_outputs_and_uses_two_uv0_samples(self):
  result=self.graph();self.assertEqual(set(self.properties),{'color','rough'});self.assertEqual(result['changed_properties'],['BaseColor','Roughness'])
  self.assertEqual([v.values['coordinate_index'] for v in self.nodes if v.kind=='MaterialExpressionTextureCoordinate'],[0])
  self.assertEqual({v.values['texture'] for v in self.nodes if v.kind=='MaterialExpressionTextureSample'},{'mask','detail'})
 def test_zero_mask_conserves_arbitrary_original_values_independent_of_detail(self):
  self.graph()
  for detail in ((0.,1.,.65,0.),(1.,0.,1.,1.)):
   self.assertValues(self.evaluate((0.,0.,0.),detail,original=(.103,.72,.019),roughness=.347),(.103,.72,.019),.347)
 def test_asphalt_paving_and_paint_are_distinct_with_held_means(self):
  self.graph();self.assertValues(self.evaluate((1.,0.,0.)),(.08,)*3,.85);self.assertValues(self.evaluate((0.,0.,1.)),(.22,.225,.23),.88);self.assertValues(self.evaluate((1.,1.,0.)),(.65,)*3,.7)
 def test_class_boundary_has_no_source_photo_leak(self):
  self.graph();expected=tuple((.08+p)/2 for p in (.22,.225,.23))
  for original in ((0.,0.,0.),(100.,50.,25.)):
   self.assertValues(self.evaluate((.5,0.,.5),original=original),expected,(.85+.88)/2)
 def test_centered_color_roughness_and_bounded_paint_wear_are_effective(self):
  self.graph();lo=self.evaluate((1.,0.,0.),(0.,0.,1.,.5));hi=self.evaluate((1.,0.,0.),(1.,1.,1.,.5))
  self.assertValues(lo,(.06,)*3,.78);self.assertValues(hi,(.1,)*3,.92)
  self.assertValues(self.evaluate((1.,1.,0.),(.5,.5,.65,.5)),(.08*.35+.65*.65,)*3,.85*.35+.7*.65)
 def test_attribute_unknown_and_connection_failure_refuse_before_outputs(self):
  for mode in (True,None,0,1,'False'):
   with self.subTest(mode=mode),self.assertRaisesRegex(RuntimeError,'actual root use_material_attributes=False'):self.graph(mode)
   self.assertEqual([v.kind for v in self.nodes],['old','oldrough']);self.assertEqual(self.properties,{})
  with self.assertRaisesRegex(RuntimeError,'Cannot connect'):self.graph(fail=True)
  self.assertEqual(self.properties,{})
 def test_no_mesh_uv_light_capture_or_save_writes(self):
  tree=ast.parse(checked(HELPER).read_bytes());names={'_crossing_graph','_crossing_prepare_material','_apply_crossing_material_trial','_restore_crossing_material_trial'}
  calls=[n.func.attr for f in tree.body if isinstance(f,ast.FunctionDef) and f.name in names for n in ast.walk(f) if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute)]
  self.assertFalse(set(calls)&{'save_loaded_asset','save_asset','save_current_level','set_static_mesh','set_actor_location','set_actor_rotation','recapture_sky','capture_scene'})

class SavedCrossingDaylightTests(unittest.TestCase):
 """Actual fixed persistence code with synthetic native objects; save/readback ordering, not native appearance."""
 @classmethod
 def setUpClass(cls):
  MaterialTrialTests.setUpClass();tree=ast.parse(checked(HELPER).read_bytes());cls.nodes={n.name:n for n in tree.body if isinstance(n,ast.FunctionDef)}
 def setUp(self):
  self.fixture=MaterialTrialTests();self.fixture.setUp();self.env=self.fixture.env;self.events=[];self.fail_save=None;self.map_ok=True;self.source_ok=True;self.shader_ok=True
  owner=self
  class Light:
   def __init__(self,label,intensity):self.label=label;self.values=dict(intensity=intensity,mobility='MOVABLE',light_color=NS(r=255,g=255,b=255,a=255),indirect_lighting_intensity=1.,cast_shadows=True,cast_static_shadows=True,cast_dynamic_shadows=True,source_type='CAPTURED',real_time_capture=False,cubemap=None,sky_distance_threshold=5.,lower_hemisphere_is_black=False,capture_emissive_only=False)
   def get_editor_property(self,key):return self.values[key]
   def get_path_name(self):return 'Map.'+self.label+'.Component'
   def set_intensity(self,value):owner.events.append(('light',self.label,value));self.values['intensity']=value
   def recapture_sky(self):owner.events.append(('recapture',self.label))
  class Actor:
   def __init__(self,label,intensity):self.label=label;self.light_component=Light(label,intensity)
   def get_actor_label(self):return self.label
   def get_actor_location(self):return [0.,0.,1500.] if self.label=='Shibuya_SkyLight' else [0.,0.,30000.]
   def get_actor_rotation(self):return [-55.,35.,0.] if self.label=='Shibuya_Sun' else [0.,0.,0.]
  class Sun(Actor):pass
  class Sky(Actor):pass
  class Volume:
   def get_actor_label(self):return 'Shibuya_Exposure'
   def get_editor_property(self,key):return True if key=='unbound' else 'manual-original'
  self.sun=Sun('Shibuya_Sun',100000.);self.sky=Sky('Shibuya_SkyLight',1.);self.volume=Volume();self.actors=self.fixture.actors+[self.sun,self.sky,self.volume]
  class Texture(self.fixture.Asset):
   def __init__(self,path,size):super().__init__(path);self.size=size;self.props={'srgb':False}
   def blueprint_get_size_x(self):return self.size
   def blueprint_get_size_y(self):return self.size
   def get_editor_property(self,key):return self.props[key]
  class Instance(self.fixture.Material):pass
  paths=['/Game/AppearanceRepair/CrossingV2/'+n+'.'+n for n in ('CrossingMask','CrossingDetail','OriginalGraph','OriginalInstance0','OriginalInstance1')]
  self.assets={paths[0]:Texture(paths[0],2048),paths[1]:Texture(paths[1],512),paths[2]:self.fixture.Material(paths[2]),paths[3]:Instance(paths[3]),paths[4]:Instance(paths[4])};self.candidate=self.assets[paths[4]]
  self.preparation={'saved':False,'textures':{key:{'texture':paths[i],'dimensions':[size,size],'properties':{'srgb':'False'}} for i,(key,size) in enumerate((('mask',2048),('detail',512)))},'clones':[{'clone':p} for p in paths[2:]]}
  def prepare(*args):self.fixture.prepared+=1;return self.candidate,copy.deepcopy(self.preparation)
  def inputs(value):
   if not self.source_ok:raise RuntimeError('sealed source changed')
   return {'mask':{'sha256':'sealed'},'purpose':'inferred'},Path('mask.png')
  def save(asset,dirty):
   self.events.append(('asset-save',asset.path));return asset.path!=self.fail_save
  def map_save():self.events.append(('map-save',));return self.map_ok
  def package(assignment):self.events.append(('package-readback',assignment['material_path']));return {assignment['material_path']:'a'*64}
  self.env.update(_saved_crossing_daylight=None,_require_complete_support=lambda:self.events.append(('support-check',)),_vector=lambda x:list(x),_rotator=lambda x:list(x),_actors=lambda:NS(get_all_level_actors=lambda:self.actors),_photographic_policy=lambda value:{'actual':value},_exposure=lambda value:'manual-original',_lumen_capture_policy=lambda settings:{'reach':240000},_crossing_prepare_material=prepare,_crossing_inputs=inputs,_support_material_packages=package,_nanite_material_status=lambda asset:{'has_nanite_usage':self.shader_ok,'explicit_instance_override':True})
  u=self.env['unreal'];u.DirectionalLight=Sun;u.SkyLight=Sky;u.PostProcessVolume=Volume;u.ComponentMobility=NS(MOVABLE='MOVABLE');u.SkyLightSourceType=NS(SLS_CAPTURED_SCENE='CAPTURED');u.Texture2D=Texture;u.Material=self.fixture.Material;u.MaterialInstanceConstant=Instance;u.load_asset=lambda p:self.assets.get(p);u.EditorAssetLibrary=NS(save_loaded_asset=save);u.MaterialEditingLibrary=NS(get_statistics=lambda asset:NS(num_vertex_shader_instructions=10 if self.shader_ok else 0,num_pixel_shader_instructions=20));u.LevelEditorSubsystem=object();u.get_editor_subsystem=lambda cls:NS(save_current_level=map_save)
  names=['_saved_daylight_values','_capture_daylight_lights','_saved_daylight_camera','_restore_saved_crossing_daylight','_configure_crossing_daylight']
  exec(compile(ast.Module(body=[copy.deepcopy(self.nodes[n]) for n in names],type_ignores=[]),str(HELPER),'exec'),self.env)
  self.before=copy.deepcopy(self.env['_crossing_bindings']())
 def stage(self,stage='prepare'):return self.env['_configure_crossing_daylight'](stage)
 def pair(self):return [self.sun.light_component.values['intensity'],self.sky.light_component.values['intensity']]
 def assert_no_disk_save(self):self.assertFalse([e for e in self.events if e[0] in ('asset-save','map-save')])
 def test_prepare_fresh_recapture_no_save_and_explicit_restore_originals(self):
  row=self.stage();self.assertTrue(row['prepared']);self.assertFalse(row['saved']);self.assertEqual(self.pair(),[25000.,4.]);self.assertIn(('recapture','Shibuya_SkyLight'),self.events);self.assert_no_disk_save()
  result=self.stage('restore');self.assertTrue(result['original_lights_and_bindings_restored']);self.assertFalse(result['original_SH_equivalence_claim']);self.assertEqual(self.pair(),[100000.,1.]);self.assertEqual(self.env['_crossing_bindings'](),self.before);self.assertIsNone(self.env['_saved_crossing_daylight'])
 def test_save_all_five_checked_packages_before_map_and_keep_adopted_state(self):
  self.stage();row=self.stage('save');self.assertTrue(row['saved']);self.assertEqual(len(row['package_sha256']),5);self.assertEqual(len([e for e in self.events if e[0]=='asset-save']),5);self.assertEqual(len([e for e in self.events if e[0]=='package-readback']),5);self.assertEqual(self.events[-1],('map-save',));self.assertIsNone(self.env['_crossing_trial']);self.assertIsNone(self.env['_saved_crossing_daylight']);self.assertEqual(self.pair(),[25000.,4.]);self.assertEqual(self.env['_crossing_bindings']()['Unrelated'],self.before['Unrelated']);self.assertEqual(self.stage('restore'),{'changed':False,'saved':False})
 def test_unprepared_save_diagnostic_trial_and_duplicate_prepare_refuse(self):
  with self.assertRaisesRegex(RuntimeError,'current prepared'):self.stage('save')
  self.assertEqual(self.events,[])
  self.fixture.apply()
  with self.assertRaisesRegex(RuntimeError,'existing'):self.stage()
  with self.assertRaisesRegex(RuntimeError,'current prepared'):self.stage('save')
  self.fixture.restore();self.stage()
  with self.assertRaisesRegex(RuntimeError,'existing'):self.stage()
  self.assert_no_disk_save()
 def test_unknown_stage_active_capture_and_support_failure_refuse_before_mutation(self):
  for stage in ('',True,'commit',None):
   with self.subTest(stage=stage),self.assertRaisesRegex(RuntimeError,'stage must'):self.stage(stage)
  self.env['_capture']={1:2}
  with self.assertRaisesRegex(RuntimeError,'active capture'):self.stage()
  self.env['_capture']=None;self.env['_require_complete_support']=lambda:(_ for _ in ()).throw(RuntimeError('support unfinished'))
  with self.assertRaisesRegex(RuntimeError,'support unfinished'):self.stage()
  self.assertEqual(self.fixture.prepared,0);self.assert_no_disk_save()
 def test_changed_source_refuses_before_any_save_and_explicit_restore_is_available(self):
  self.stage();self.source_ok=False
  with self.assertRaisesRegex(RuntimeError,'sealed source changed'):self.stage('save')
  self.assert_no_disk_save();self.stage('restore');self.assertEqual(self.env['_crossing_bindings'](),self.before)
 def test_stale_receiver_or_original_parameters_refuses_and_restores(self):
  for kind in ('binding','geometry','parameters'):
   self.setUp();self.stage()
   if kind=='binding':self.fixture.actors[0].static_mesh_component.overrides=[self.fixture.original]
   elif kind=='geometry':self.fixture.geometry['changed']=True
   else:self.fixture.parameters['scalar']['BaseColorTexture_Rotation']=.1
   with self.subTest(kind=kind),self.assertRaisesRegex(RuntimeError,'receiver/source geometry or original material'):self.stage('save')
   self.assert_no_disk_save();self.assertEqual(self.pair(),[100000.,1.])
 def test_light_or_camera_drift_refuses_before_save(self):
  for kind in ('light','protected','camera'):
   self.setUp();self.stage()
   if kind=='light':self.sun.light_component.values['intensity']=20000.
   elif kind=='protected':self.sun.light_component.values['cast_shadows']=False
   else:self.env['_lumen_capture_policy']=lambda settings:{'reach':1}
   with self.subTest(kind=kind),self.assertRaisesRegex(RuntimeError,'Sun/Sky or camera changed'):self.stage('save')
   self.assert_no_disk_save()
 def test_texture_or_asset_roster_or_shader_drift_refuses_map_save(self):
  for kind in ('texture','roster','shader','missing'):
   self.setUp();self.stage();state=self.env['_saved_crossing_daylight']
   if kind=='texture':next(iter(self.assets.values())).props['srgb']=True
   elif kind=='roster':state['applied']['preparation']['clones'][0]['clone']='/Game/Foreign.X'
   elif kind=='shader':self.shader_ok=False
   else:del self.assets[list(self.assets)[0]]
   with self.subTest(kind=kind),self.assertRaisesRegex(RuntimeError,'Cannot save crossing daylight'):self.stage('save')
   self.assertNotIn(('map-save',),self.events);self.assertEqual(self.pair(),[100000.,1.]);self.assertEqual(self.env['_crossing_bindings'](),self.before)
 def test_each_asset_save_failure_restores_bindings_lights_and_never_saves_map(self):
  for asset in self.assets:
   self.setUp();self.stage();self.fail_save=asset
   with self.subTest(asset=asset),self.assertRaisesRegex(RuntimeError,'make its project package writable'):self.stage('save')
   self.assertNotIn(('map-save',),self.events);self.assertEqual(self.pair(),[100000.,1.]);self.assertEqual(self.env['_crossing_bindings'](),self.before)
 def test_map_save_failure_restores_memory_and_names_required_disk_backup(self):
  self.stage();self.map_ok=False
  with self.assertRaisesRegex(RuntimeError,'checked map backup'):self.stage('save')
  self.assertEqual(self.pair(),[100000.,1.]);self.assertEqual(self.env['_crossing_bindings'](),self.before)
 def test_native_intensity_refusal_rolls_back_prepared_material_without_save(self):
  original=self.sky.light_component.set_intensity
  def reject(value):
   if value==4.:raise RuntimeError('setter rejected candidate')
   original(value)
  self.sky.light_component.set_intensity=reject
  with self.assertRaisesRegex(RuntimeError,'setter rejected candidate'):self.stage()
  self.assertEqual(self.pair(),[100000.,1.]);self.assertEqual(self.env['_crossing_bindings'](),self.before);self.assert_no_disk_save()
 def test_missing_recapture_refuses_before_material_preparation(self):
  self.sky.light_component.recapture_sky=None
  with self.assertRaisesRegex(RuntimeError,'DID_NOT_RUN'):self.stage()
  self.assertEqual(self.fixture.prepared,0);self.assert_no_disk_save()

if __name__=='__main__':unittest.main()
