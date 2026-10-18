"""Fixed daylight ratio actual helper functions; mocks do not certify native lighting or appearance."""
import ast,copy,importlib.util,json,math,os,stat,unittest
from pathlib import Path
from types import SimpleNamespace as NS
PROJECT=Path(os.environ.get('SHIBUYA_SOURCE_ROOT',Path(__file__).parents[2]))
HELPER=Path(os.environ.get('SHIBUYA_SUPPORT_HELPER',PROJECT/'Content/Python/shibuya_tools.py'))
def checked(p):
 for q in [*reversed(p.absolute().parents),p.absolute()]:
  s=q.lstat()
  if stat.S_ISLNK(s.st_mode) or getattr(s,'st_file_attributes',0)&1024:raise RuntimeError(str(q))
 return p
spec=importlib.util.spec_from_file_location('daylight_existing_exposure_fixture',checked(PROJECT/'tools/unreal/test_exposure_fusion.py'));base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
class DaylightRatioTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  base.ExposureFusionTests.setUpClass();tree=ast.parse(checked(HELPER).read_bytes());cls.nodes={n.name:n for n in tree.body if isinstance(n,ast.FunctionDef)}
 def setUp(self):
  self.fixture=base.ExposureFusionTests();self.fixture.setUp();self.env=self.fixture.env;self.state=self.fixture.state;self.calls=[];self.fail={};self.ignore=set()
  owner=self
  class Light:
   def __init__(inner,label,intensity):
    inner.label=label;inner.values={'intensity':intensity,'mobility':'MOVABLE','light_color':NS(r=255,g=255,b=255,a=255),'indirect_lighting_intensity':1.,'cast_shadows':True,'cast_static_shadows':True,'cast_dynamic_shadows':True,'source_type':'CAPTURED','real_time_capture':False,'cubemap':None,'sky_distance_threshold':5.,'lower_hemisphere_is_black':False,'capture_emissive_only':False}
   def get_editor_property(inner,name):return inner.values[name]
   def get_path_name(inner):return 'Map.'+inner.label+'.Component'
   def set_intensity(inner,value):
    owner.calls.append((inner.label,value))
    if owner.fail.get((inner.label,value)):raise RuntimeError('native setter rejected '+inner.label)
    if inner.label not in owner.ignore:inner.values['intensity']=value
  class Actor:
   def __init__(inner,label,intensity):inner.label=label;inner.light_component=Light(label,intensity)
   def get_actor_label(inner):return inner.label
   def get_actor_location(inner):return [0.,0.,1500.] if inner.label=='Shibuya_SkyLight' else [0.,0.,0.]
   def get_actor_rotation(inner):return [-55.,35.,0.] if inner.label=='Shibuya_Sun' else [0.,0.,0.]
  class Sun(Actor):pass
  class Sky(Actor):pass
  self.sun=Sun('Shibuya_Sun',100000.);self.sky=Sky('Shibuya_SkyLight',1.);self.actors=[self.sun,self.sky]
  self.skydata=[{'component':'Map.Shibuya_SkyLight.Component','processed_present':True,'processed_initialized':True,'processed_rhi_present':True,'sh_finite':True,'width':128,'height':128,'sh_rgb_coefficients':[[12992.,13512.,13656.]]}]
  self.env.update(math=math,_vector=lambda v:list(v),_rotator=lambda v:list(v),_actors=lambda:NS(get_all_level_actors=lambda:self.actors,destroy_actor=lambda actor:self.fixture.destroyed.append(actor) or True))
  self.env['unreal'].DirectionalLight=Sun;self.env['unreal'].SkyLight=Sky;self.env['unreal'].ComponentMobility=NS(MOVABLE='MOVABLE');self.env['unreal'].SkyLightSourceType=NS(SLS_CAPTURED_SCENE='CAPTURED')
  self.env['_capture_witness']=lambda state:{'photographic_policy':self.env['_photographic_policy'](self.fixture.settings),'native_skylights':copy.deepcopy(self.skydata),'capture_frames':state['frames'],'native_start_frame':state['native_start_frame'],'photographic_tone':state['photographic_tone']}
  names=['_capture_daylight_lights','_capture_daylight_witness','_capture_daylight_restore','_capture_daylight_diagnostic']
  exec(compile(ast.Module(body=[copy.deepcopy(self.nodes[n]) for n in names],type_ignores=[]),str(HELPER),'exec'),self.env)
 def stage(self,name='daylight_candidate',camera=None,prefix=''):return self.env['_capture_surface_diagnostic'](name,prefix,camera or self.state['camera_m'],[0.,0.,15.])
 def pair(self):return [a.light_component.values['intensity'] for a in self.actors[:2]]
 def test_candidate_changes_only_declared_intensities_and_restores_exactly(self):
  before=copy.deepcopy([a.light_component.values for a in self.actors]);row=self.stage();self.assertEqual(self.pair(),[25000.,4.]);self.assertEqual(self.calls,[('Shibuya_Sun',25000.),('Shibuya_SkyLight',4.)]);self.assertEqual(row['native_start_frame'],1000);self.assertEqual(row['unscored_initial_frames'],1)
  for old,a in zip(before,self.actors):old['intensity']=a.light_component.values['intensity'];self.assertEqual(old,a.light_component.values)
  self.state['frames']=80;done=self.stage('daylight_restore');self.assertTrue(done['restored']);self.assertEqual(self.pair(),[100000.,1.]);self.assertEqual(self.state['frames'],80);self.assertNotIn('daylight_diagnostic',self.state);self.assertEqual(self.fixture.sets,[]);self.assertEqual(self.fixture.flagsets,[])
 def test_reference_observes_originals_without_any_light_setter(self):
  row=self.stage('daylight_reference');self.assertEqual(self.calls,[]);self.assertEqual([r['intensity'] for r in row['daylight_diagnostic']['lights']],[100000.,1.]);self.stage('daylight_restore');self.assertEqual(self.calls,[])
 def test_actual_camera_fields_not_toneflag_prove_admission(self):
  for name,value in [('camera_iso',200.),('camera_shutter_speed',60.),('depth_of_field_fstop',16.),('auto_exposure_bias',1.),('auto_exposure_method','OTHER'),('auto_exposure_apply_physical_camera_exposure',False)]:
   self.setUp();setattr(self.fixture.settings,name,value)
   with self.subTest(name=name),self.assertRaisesRegex(RuntimeError,'actual unchanged'):self.stage()
   self.assertEqual(self.calls,[])
 def test_unsupported_native_setter_on_either_light_refuses_before_first_mutation(self):
  for index in (0,1):
   self.setUp();self.actors[index].light_component.set_intensity=None
   with self.assertRaisesRegex(RuntimeError,'DID_NOT_RUN'):self.stage()
   self.assertEqual(self.calls,[])
 def test_wrong_population_mobility_or_label_refuses(self):
  for kind in ('duplicate','static','wronglabel'):
   self.setUp()
   if kind=='duplicate':self.actors.append(type(self.sky)('Shibuya_SkyLight',1.))
   elif kind=='static':self.sky.light_component.values['mobility']='STATIC'
   else:self.sun.label='Other'
   with self.subTest(kind=kind),self.assertRaises(RuntimeError):self.stage()
   self.assertEqual(self.calls,[])
 def test_changed_nonfinite_boolean_baselines_refuse_without_normalization(self):
  for index,value in [(0,90000.),(1,2.),(1,True),(0,float('nan'))]:
   self.setUp();self.actors[index].light_component.values['intensity']=value
   with self.assertRaises(RuntimeError):self.stage()
   self.assertEqual(self.calls,[])
 def test_wrong_sky_mode_or_resource_refuses_before_mutation(self):
  for name,value in [('source_type','CUBEMAP'),('real_time_capture',True),('cubemap','Other'),('sky_distance_threshold',150000.)]:
   self.setUp();self.sky.light_component.values[name]=value
   with self.assertRaises(RuntimeError):self.stage()
   self.assertEqual(self.calls,[])
  self.setUp();self.skydata[0]['processed_initialized']=False
  with self.assertRaisesRegex(RuntimeError,'initialized'):self.stage()
  self.assertEqual(self.calls,[])
 def test_second_setter_failure_rolls_back_first_and_preserves_primary(self):
  self.fail[('Shibuya_SkyLight',4.)]=True
  with self.assertRaisesRegex(RuntimeError,'native setter rejected Shibuya_SkyLight'):self.stage()
  self.assertEqual(self.pair(),[100000.,1.]);self.assertNotIn('daylight_diagnostic',self.state)
 def test_silent_setter_failure_is_detected_and_rollback_restores(self):
  self.ignore.add('Shibuya_SkyLight')
  with self.assertRaisesRegex(RuntimeError,'differ from the fixed arm'):self.stage()
  self.assertEqual(self.pair(),[100000.,1.])
 def test_capture_failure_rolls_back_both_lights_without_hiding_error(self):
  self.fixture.fail_draw=True
  with self.assertRaisesRegex(RuntimeError,'native capture failure'):self.stage()
  self.assertEqual(self.pair(),[100000.,1.]);self.assertNotIn('daylight_diagnostic',self.state)
 def test_restore_attempts_both_when_first_restore_setter_fails(self):
  self.stage();self.fail[('Shibuya_Sun',100000.)]=True
  with self.assertRaisesRegex(RuntimeError,'Cannot restore daylight ratio'):self.stage('daylight_restore')
  self.assertIn(('Shibuya_SkyLight',1.),self.calls);self.assertEqual(self.sky.light_component.values['intensity'],1.);self.assertIn('daylight_diagnostic',self.state)
 def test_primary_failure_retains_secondary_rollback_error(self):
  self.fixture.fail_draw=True;self.fail[('Shibuya_Sun',100000.)]=True
  with self.assertRaisesRegex(RuntimeError,'native capture failure') as got:self.stage()
  self.assertIn('Daylight ratio rollback also failed',' '.join(got.exception.__notes__));self.assertIn('daylight_diagnostic',self.state)
 def test_later_camera_shadows_color_flags_or_SH_drift_cannot_pass(self):
  for kind in ('camera','shadow','color','flags','sky'):
   self.setUp();self.stage();self.state['frames']=60
   if kind=='camera':self.fixture.settings.camera_iso=200.
   elif kind=='shadow':self.sun.light_component.values['cast_shadows']=False
   elif kind=='color':self.sky.light_component.values['light_color'].r=128
   elif kind=='flags':self.fixture.flags[0].enabled=True
   else:self.skydata[0]['sh_rgb_coefficients'][0][0]+=1
   with self.subTest(kind=kind),self.assertRaisesRegex(RuntimeError,'differ from the fixed arm'):self.stage('daylight_read')
 def test_finish_restores_lights_before_actor_destruction(self):
  self.stage();row=self.env['_finish_capture']();self.assertTrue(row['daylight_diagnostic_restoration']['restored']);self.assertEqual(self.pair(),[100000.,1.]);self.assertEqual(self.fixture.destroyed,[self.fixture.actor]);self.assertIsNone(self.env['_capture'])
 def test_finish_restore_error_still_closes_coverage_and_actor(self):
  self.stage();self.fail[('Shibuya_Sun',100000.)]=True
  with self.assertRaisesRegex(RuntimeError,'Cannot restore daylight ratio'):self.env['_finish_capture']()
  self.assertEqual(self.fixture.coverage,[True]);self.assertEqual(self.fixture.destroyed,[self.fixture.actor]);self.assertIsNone(self.env['_capture'])
 def test_other_diagnostics_cannot_overlap_either_direction(self):
  self.stage()
  for name in ('gi_none','begin_hdr','exposure_fusion','daylight_reference'):
   with self.assertRaisesRegex(RuntimeError,'Restore|begin once'):self.stage(name)
  for name in ('gi_diagnostic','diagnostic','exposure_diagnostic'):
   self.setUp();self.state[name]={'active':True}
   with self.assertRaisesRegex(RuntimeError,'no other diagnostic'):self.stage()
   self.assertEqual(self.calls,[])
 def test_default_finish_and_no_capture_restore_do_not_touch_lights(self):
  self.assertEqual(self.env['_finish_capture'](),{'changed':False});self.assertEqual(self.calls,[]);self.assertEqual(self.stage('daylight_restore'),{'changed':False})
 def test_wrong_pose_prefix_frame_and_native_frame_refuse(self):
  for kind in ('pose','prefix','late','frame'):
   self.setUp()
   if kind=='late':self.state['frames']=2
   if kind=='frame':self.env['_native_scene_frame']=lambda **kw:(_ for _ in ()).throw(RuntimeError('wrong frame'))
   with self.assertRaises(RuntimeError):self.stage(camera=[0.,0.,35.] if kind=='pose' else None,prefix='bad' if kind=='prefix' else '')
   self.assertEqual(self.calls,[])
 def test_west_retains_identical_pair_and_policy(self):
  self.state['camera_m']=[-70.,20.,65.];row=self.stage();self.assertEqual(self.pair(),[25000.,4.]);self.assertEqual(row['daylight_diagnostic']['photographic_policy'],self.env['_photographic_policy'](self.env['_exposure'](False)))
 def test_no_new_public_tool_and_no_save_recapture_or_other_property_setter(self):
  tree=ast.parse(checked(HELPER).read_bytes());functions=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name.startswith('_capture_daylight_')]
  calls={n.func.attr for f in functions for n in ast.walk(f) if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute)}
  self.assertFalse(calls&{'set_editor_property','recapture_sky','save_asset','save_loaded_asset','save_current_level'});self.assertIn('set_intensity',calls)
if __name__=='__main__':unittest.main()
