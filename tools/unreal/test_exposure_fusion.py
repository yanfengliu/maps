"""Fixed exposure-stage actual helper AST; no native pass/pixel or performance claim."""
import ast,copy,hashlib,os,stat,unittest
from pathlib import Path
from types import SimpleNamespace as NS
HELPER=Path(os.environ.get('SHIBUYA_SUPPORT_HELPER',Path(__file__).parents[2]/'Content/Python/shibuya_tools.py'))
PROJECT=Path(os.environ.get('SHIBUYA_SOURCE_ROOT',Path(__file__).parents[2]))
FIELDS=('local_exposure_method','local_exposure_highlight_contrast_scale','local_exposure_shadow_contrast_scale','local_exposure_detail_strength','local_exposure_blurred_luminance_blend','local_exposure_middle_grey_bias')
def checked(p):
 for q in [*reversed(p.absolute().parents),p.absolute()]:
  s=q.lstat()
  if stat.S_ISLNK(s.st_mode) or getattr(s,'st_file_attributes',0)&1024:raise RuntimeError(str(q))
 return p
class ExposureFusionTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.tree=ast.parse(checked(HELPER).read_bytes());cls.nodes={n.name:n for n in cls.tree.body if isinstance(n,ast.FunctionDef)}
 def setUp(self):
  class Settings:
   def __init__(self):
    self.unchanged_normal='unchanged';self.unchanged_coverage=240000.
    for key,value in {'auto_exposure_method':'DEFAULT','auto_exposure_apply_physical_camera_exposure':False,'camera_iso':100.,'camera_shutter_speed':60.,'depth_of_field_fstop':2.,'auto_exposure_bias':0.,'dynamic_global_illumination_method':'DEFAULT','reflection_method':'DEFAULT','local_exposure_method':'BILATERAL','local_exposure_highlight_contrast_scale':1.,'local_exposure_shadow_contrast_scale':1.,'local_exposure_detail_strength':1.,'local_exposure_blurred_luminance_blend':.6,'local_exposure_middle_grey_bias':0.}.items():setattr(self,key,value);setattr(self,'override_'+key,False)
  class Flag:
   def __init__(self,name='',enabled=False):self.name=name;self.enabled=enabled
   def copy(self):return copy.deepcopy(self)
   def get_editor_property(self,k):return self.name if k=='show_flag_name' else self.enabled
   def set_editor_property(self,k,v):
    if k=='show_flag_name':self.name=v
    elif k=='enabled':self.enabled=v
    else:raise AssertionError(k)
  self.Flag=Flag;self.flags=[Flag('Fog',False),Flag('LocalExposure',False),Flag('AntiAliasing',True)];self.sets=[];self.flagsets=[];self.draws=[];self.destroyed=[];self.coverage=[];self.cvar=1;self.fail_draw=False;self.fail_pp=False;self.fail_restore=False;self.fail_flags_once=False;self.fail_flag_read=False;self.silent_flag_write=False
  unreal=NS(PostProcessSettings=Settings,LocalExposureMethod=NS(BILATERAL='BILATERAL',FUSION='FUSION'),AutoExposureMethod=NS(AEM_MANUAL='MANUAL'),DynamicGlobalIlluminationMethod=NS(LUMEN='LUMEN'),ReflectionMethod=NS(LUMEN='LUMEN'),EngineShowFlagsSetting=Flag,SystemLibrary=NS(get_console_variable_int_value=lambda name:self.cvar,get_frame_count=lambda:1000))
  self.env={'unreal':unreal,'json':__import__('json'),'_native_scene_frame':lambda require=False:None,'_restore_capture_coverage':lambda state:self.coverage.append(True) or {'changed':False},'_actors':lambda:NS(destroy_actor=lambda actor:self.destroyed.append(actor) or True)}
  names=['_capture_exposure_api','_inspect_exposure_api','_exposure','_photographic_policy','_capture_exposure_flags','_capture_exposure_witness','_capture_exposure_restore','_capture_exposure_diagnostic','_capture_surface_diagnostic','_finish_capture']
  exec(compile(ast.Module(body=[copy.deepcopy(self.nodes[n]) for n in names],type_ignores=[]),str(HELPER),'exec'),self.env)
  self.settings=self.env['_exposure'](False);self.original=copy.deepcopy(vars(self.settings));self.original_flags=[{'name':f.name,'enabled':f.enabled} for f in self.flags]
  def get(key):
   if key=='show_flag_settings':
    if self.fail_flag_read:raise RuntimeError('native reflected flag read rejected')
    return copy.deepcopy(self.flags)
   self.assertEqual(key,'post_process_settings');return copy.deepcopy(self.settings)
  def set_(key,value):
   if key=='show_flag_settings':return flags(value)
   self.assertEqual(key,'post_process_settings');self.sets.append(copy.deepcopy(vars(value)))
   if self.fail_pp or (self.fail_restore and value.override_local_exposure_method is False):raise RuntimeError('native PP setter failure')
   self.settings=copy.deepcopy(value)
  def flags(values):
   self.flagsets.append([{'name':f.name,'enabled':f.enabled} for f in values])
   if self.fail_flags_once:self.fail_flags_once=False;raise RuntimeError('native flag setter failure')
   if not self.silent_flag_write:self.flags=copy.deepcopy(values)
  def draw():
   self.draws.append(self.settings.local_exposure_method)
   if self.fail_draw:raise RuntimeError('native capture failure')
  self.component=NS(get_path_name=lambda:'Transient.ExposureAPI.Component',get_editor_property=get,set_editor_property=set_,capture_scene=draw)
  self.actor=NS(capture_component2d=self.component);self.state={'actor':self.actor,'world':object(),'frames':1,'native_start_frame':200,'camera_m':[35.,-45.,35.],'target_m':[0.,0.,15.],'photographic_tone':False};self.env['_capture']=self.state
  self.env['_capture_witness']=lambda state:{'capture_frames':state['frames'],'native_start_frame':state['native_start_frame'],'photographic_tone':state['photographic_tone']}
 def stage(self,name='exposure_fusion',camera=None,prefix=''):return self.env['_capture_surface_diagnostic'](name,prefix,camera or self.state['camera_m'],[0.,0.,15.])
 def test_fusion_changes_fixed_local_fields_only_and_counts_a_new_mode_epoch(self):
  row=self.stage();actual=vars(self.settings);expected=copy.deepcopy(self.original)
  for key,value in zip(FIELDS,('FUSION',.8,.6,1.,.6,0.)):expected[key]=value;expected['override_'+key]=True
  self.assertEqual(actual,expected);self.assertEqual(self.flags[0].name,'Fog');self.assertFalse(self.flags[0].enabled);self.assertTrue(self.flags[1].enabled);self.assertEqual(self.flags[2].name,'AntiAliasing')
  self.assertEqual(self.draws,['FUSION']);self.assertEqual((row['unscored_initial_frames'],row['unscored_native_start_frame'],row['native_start_frame']),(1,200,1000));self.assertEqual(row['exposure_diagnostic']['native_start_frame'],1000);self.assertEqual(row['original_show_flag_settings'],self.original_flags);self.assertTrue(row['photographic_tone']);self.assertEqual(row['exposure_diagnostic']['r.LocalExposure'],1)
 def test_bilateral_and_fusion_differ_in_method_only(self):
  self.stage('exposure_bilateral');a=copy.deepcopy(vars(self.settings));af=copy.deepcopy(self.flagsets[-1]);self.setUp();self.stage('exposure_fusion');b=copy.deepcopy(vars(self.settings));self.assertEqual([k for k in a if a[k]!=b[k]],['local_exposure_method']);self.assertEqual(af,self.flagsets[-1])
 def test_positive_cvar_is_required_and_never_mutated(self):
  for value in (0,-1,True,'1',None):
   self.cvar=value
   with self.subTest(value=value),self.assertRaisesRegex(RuntimeError,'r.LocalExposure>0'):self.stage()
   self.assertEqual(self.sets,[]);self.assertEqual(self.flagsets,[]);self.assertEqual(self.draws,[])
 def test_unsupported_enum_or_public_setter_refuses_before_mutation(self):
  for name in ('enum','getter','setter','capture','struct'):
   self.setUp()
   if name=='enum':del self.env['unreal'].LocalExposureMethod.FUSION
   elif name=='struct':self.env['unreal'].EngineShowFlagsSetting=None
   else:setattr(self.component,{'getter':'get_editor_property','setter':'set_editor_property','capture':'capture_scene'}[name],None)
   with self.subTest(name=name),self.assertRaisesRegex(RuntimeError,'native Python API unavailable'):self.stage()
   self.assertEqual(self.sets,[]);self.assertEqual(self.flagsets,[])
 def test_duplicate_raw_flag_wrong_pose_prefix_and_late_frame_refuse(self):
  self.flags.append(self.Flag('LocalExposure',True))
  with self.assertRaisesRegex(RuntimeError,'duplicate'):self.stage()
  self.flags.pop()
  with self.assertRaisesRegex(RuntimeError,'exact original'):self.stage(camera=[0.,0.,35.])
  with self.assertRaisesRegex(RuntimeError,'empty output'):self.stage(prefix='other')
  self.state['frames']=2
  with self.assertRaisesRegex(RuntimeError,'initial capture frame1'):self.stage()
  self.assertEqual(self.sets,[])
 def test_west_pose_uses_same_method_contract_and_absent_flag_is_appended(self):
  self.state['camera_m']=[-70.,20.,65.];self.flags=[self.Flag('Fog',False)];self.original_flags=[{'name':'Fog','enabled':False}];self.stage();self.assertEqual(self.flagsets[0],[{'name':'Fog','enabled':False},{'name':'LocalExposure','enabled':True}]);self.stage('exposure_restore');self.assertEqual(self.flagsets[-1],self.original_flags)
 def test_nonoriginal_exposure_or_tone_refuses_before_mutation(self):
  self.settings.camera_iso=200
  with self.assertRaisesRegex(RuntimeError,'unchanged original manual'):self.stage()
  self.assertEqual(self.sets,[])
  self.settings.camera_iso=100;self.state['photographic_tone']=True
  with self.assertRaisesRegex(RuntimeError,'unchanged original manual'):self.stage()
 def test_restore_retains_final_count_and_exact_original_fields_rawflags_and_tone(self):
  self.stage();self.state['frames']=80;row=self.stage('exposure_restore');self.assertTrue(row['restored']);self.assertEqual(vars(self.settings),self.original);self.assertEqual(self.flagsets[-1],self.original_flags);self.assertIs(self.state['photographic_tone'],False);self.assertEqual(self.state['frames'],80);self.assertNotIn('exposure_diagnostic',self.state);self.assertEqual(self.stage('exposure_restore'),{'changed':False})
 def test_readback_refuses_cvar_flag_or_method_drift(self):
  for kind in ('cvar','flag','method'):
   self.setUp();self.stage();self.state['frames']=60
   if kind=='cvar':self.cvar=0
   elif kind=='flag':self.flags[1].enabled=False
   else:self.settings.local_exposure_method='BILATERAL'
   with self.subTest(kind=kind),self.assertRaisesRegex(RuntimeError,'readback differs'):self.stage('exposure_read')
 def test_finish_restores_original_before_owned_actor_destruction(self):
  self.stage();row=self.env['_finish_capture']();self.assertTrue(row['exposure_diagnostic_restoration']['restored']);self.assertEqual(vars(self.settings),self.original);self.assertEqual(self.flagsets[-1],self.original_flags);self.assertEqual(self.destroyed,[self.actor]);self.assertIsNone(self.env['_capture'])
 def test_default_finish_retains_original_legacy_result_and_no_new_API_calls(self):
  self.assertEqual(self.env['_finish_capture'](),{'changed':False});self.assertEqual(self.sets,[]);self.assertEqual(self.flagsets,[])
 def test_draw_failure_rolls_back_without_hiding_primary(self):
  self.fail_draw=True
  with self.assertRaisesRegex(RuntimeError,'native capture failure'):self.stage()
  self.assertEqual(vars(self.settings),self.original);self.assertEqual(self.flagsets[-1],self.original_flags);self.assertNotIn('exposure_diagnostic',self.state)
 def test_partial_flag_set_failure_restores_both_fields_and_flags(self):
  self.fail_flags_once=True
  with self.assertRaisesRegex(RuntimeError,'native flag setter failure'):self.stage()
  self.assertEqual(vars(self.settings),self.original);self.assertEqual(self.flagsets[-1],self.original_flags);self.assertNotIn('exposure_diagnostic',self.state)
 def test_restore_error_remains_secondary_to_capture_failure_and_retains_state(self):
  self.fail_draw=True;self.fail_restore=True
  with self.assertRaisesRegex(RuntimeError,'native capture failure') as got:self.stage()
  self.assertIn('PostProcess restoration',' '.join(got.exception.__notes__));self.assertIn('exposure_diagnostic',self.state);self.assertEqual(self.flagsets[-1],self.original_flags)
 def test_finish_restore_failure_still_closes_coverage_and_destroys_actor(self):
  self.stage();self.fail_restore=True
  with self.assertRaisesRegex(RuntimeError,'PostProcess restoration'):self.env['_finish_capture']()
  self.assertEqual(self.coverage,[True]);self.assertEqual(self.destroyed,[self.actor]);self.assertIsNone(self.env['_capture'])
 def test_gi_float_and_repeated_exposure_stages_cannot_overlap(self):
  self.stage()
  for stage in ('gi_none','begin_hdr','exposure_bilateral'):
   with self.subTest(stage=stage),self.assertRaisesRegex(RuntimeError,'Restore|begin once'):self.stage(stage)
 def test_no_capture_restore_is_idempotent_and_unknown_stage_never_runs(self):
  self.env['_capture']=None;self.assertEqual(self.stage('exposure_restore'),{'changed':False})
  with self.assertRaisesRegex(RuntimeError,'start the fixed original'):self.stage()
  with self.assertRaisesRegex(RuntimeError,'stage must be'):self.stage('unknown')
 def test_readonly_api_identifies_each_exact_missing_native_name_without_setters(self):
  for name in ('get_editor_property','set_editor_property','capture_scene'):
   self.setUp();setattr(self.component,name,None);row=self.env['_capture_exposure_api'](self.component)
   self.assertIn('component.'+name,row['missing_for_current_fixed_trial']);self.assertIs(row['members'][name]['callable'],False);self.assertEqual(self.sets,[]);self.assertEqual(self.flagsets,[]);self.assertEqual(self.draws,[])
 def test_struct_copy_exception_keeps_successful_constructor_and_field_read(self):
  self.Flag.copy=lambda flag:(_ for _ in ()).throw(RuntimeError('native struct copy rejected'))
  row=self.env['_capture_exposure_api'](self.component);self.assertEqual(row['flag_struct_default_read']['status'],'READ');self.assertEqual(row['flag_struct_copy_read']['status'],'ERROR');self.assertIn('native struct copy rejected',row['flag_struct_copy_read']['error']);self.assertIn('unreal.EngineShowFlagsSetting.copy() read',row['missing_for_current_fixed_trial']);self.assertEqual(self.sets,[])
 def test_actual_method_and_finite_enum_members_are_reported_from_object(self):
  row=self.env['_capture_exposure_api'](self.component);self.assertEqual(row['actual_post_process_local_exposure_method']['value'],'BILATERAL');self.assertEqual(row['actual_post_process_local_exposure_method']['python_type'],'str');self.assertEqual({r['name'] for r in row['declared_enum_finite_members']['members']},{'BILATERAL','FUSION'});self.assertIs(row['writers_exercised'],False)
 def test_getter_and_editor_property_observations_remain_separate_without_fallback(self):
  row=self.env['_capture_exposure_api'](self.component);self.assertEqual(row['public_getter_read']['status'],'UNAVAILABLE');self.assertEqual(row['editor_property_show_flag_settings_read']['status'],'READ');self.assertEqual(row['missing_for_current_fixed_trial'],[])
  self.assertFalse(hasattr(self.component,'get_show_flag_settings'));self.assertFalse(hasattr(self.component,'set_show_flag_settings'));self.stage();self.stage('exposure_restore');self.assertEqual(self.flagsets[-1],self.original_flags)
 def test_native_getter_exception_is_retained_specifically_not_silently_replaced(self):
  self.component.get_show_flag_settings=lambda:(_ for _ in ()).throw(RuntimeError('native getter rejected'))
  row=self.env['_capture_exposure_api'](self.component);self.assertEqual(row['public_getter_read']['status'],'ERROR');self.assertIn('native getter rejected',row['public_getter_read']['error']);self.assertNotIn('component.get_show_flag_settings() read',row['missing_for_current_fixed_trial']);self.assertEqual(row['editor_property_show_flag_settings_read']['status'],'READ')
 def readonly_wrapper(self,fail=False):
  self.env['_capture']=None;actors=['original'];self.env['unreal'].SceneCapture2D=object;self.env['unreal'].Vector=lambda *values:values;self.env['_source_to_native_cm']=lambda v:[100*v[0],-100*v[1],100*v[2]];self.env['_native_frame_record']=lambda:{'schema_version':1,'id':'native-centimetres-Xeast-Ysouth-Zup-v2','definition_sha256':'2099342528416aa9dcdceea63e6d2604974341d8248f3b1c7ccf287008759170'}
  def spawn(*args):actors.append(self.actor);return self.actor
  def destroy(actor):actors.remove(actor);self.destroyed.append(actor);return True
  self.env['_actors']=lambda:NS(get_all_level_actors=lambda:list(actors),spawn_actor_from_class=spawn,destroy_actor=destroy)
  if fail:self.env['_capture_exposure_api']=lambda component:(_ for _ in ()).throw(RuntimeError('named native observation failed'))
 def test_readonly_stage_has_no_capture_or_settings_mutations_and_reaps_actor(self):
  self.readonly_wrapper();r=self.stage('exposure_api');self.assertTrue(r['owned_actor_destroyed']);self.assertEqual(r['actor_count_before'],r['actor_count_after']);self.assertEqual(r['capture_scene_calls'],0);self.assertEqual(r['image_outputs'],[]);self.assertEqual(self.draws,[]);self.assertEqual(self.sets,[]);self.assertEqual(self.flagsets,[]);self.assertEqual(self.destroyed,[self.actor])
 def test_readonly_stage_observation_failure_still_destroys_owned_actor(self):
  self.readonly_wrapper(True)
  with self.assertRaisesRegex(RuntimeError,'named native observation failed'):self.stage('exposure_api')
  self.assertEqual(self.destroyed,[self.actor])
 def test_readonly_stage_requires_no_active_capture_fixed_operands_and_empty_prefix(self):
  with self.assertRaisesRegex(RuntimeError,'no active capture'):self.stage('exposure_api')
  self.env['_capture']=None
  with self.assertRaisesRegex(RuntimeError,'fixed crossing'):self.stage('exposure_api',camera=[0.,0.,35.])
  with self.assertRaisesRegex(RuntimeError,'empty prefix'):self.stage('exposure_api',prefix='anything')
 def test_readonly_function_does_not_call_any_native_setter_or_capture(self):
  for name in ('_capture_exposure_api','_inspect_exposure_api'):
   calls={n.func.attr for n in ast.walk(self.nodes[name]) if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute)}
   self.assertFalse(calls&{'set_editor_property','set_show_flag_settings','capture_scene','set_actor_rotation','set_actor_location','recapture_sky','save_current_level','save_asset','create_render_target2d'})
 def test_existing_public_schema_and_production_validator_remain_unchanged(self):
  cls=next(n for n in self.tree.body if isinstance(n,ast.ClassDef) and n.name=='ShibuyaCityTools');method=next(n for n in cls.body if isinstance(n,ast.FunctionDef) and n.name=='inspect_camera_surfaces')
  self.assertEqual([a.arg for a in method.args.args],['east_m','north_m','height_m','target_east_m','target_north_m','target_height_m','active_capture_stage','relative_output_prefix']);self.assertEqual([ast.literal_eval(n) for n in method.args.defaults],[0.,0.,15.,'',''])
  self.assertEqual(hashlib.sha256(checked(PROJECT/'tools/unreal/mcp_run.py').read_bytes()).hexdigest(),'e1e755db99800f59d5c47052bc3d500029b694a89bc6c7eeccbd633d3615b3e1')
 def test_extension_has_no_light_material_mesh_save_recapture_or_console_mutation(self):
  names={'_capture_exposure_flags','_capture_exposure_witness','_capture_exposure_restore','_capture_exposure_diagnostic'};calls={n.func.attr for name in names for n in ast.walk(self.nodes[name]) if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute)}
  self.assertFalse(calls&{'save_asset','save_loaded_asset','save_current_level','set_intensity','set_static_mesh','set_actor_location','set_actor_rotation','recapture_sky','execute_console_command'})
 def test_actual_native_missing_accessors_empty_array_applies_explicit_flag_and_restores(self):
  # e47cf6d3 actual Entry probe: both named methods absent, reflected array READ[].
  self.assertFalse(hasattr(self.component,'get_show_flag_settings'));self.assertFalse(hasattr(self.component,'set_show_flag_settings'))
  self.flags=[];self.original_flags=[];row=self.stage();self.assertEqual(row['exposure_diagnostic']['raw_show_flag_settings'],[{'name':'LocalExposure','enabled':True}]);self.assertEqual(row['exposure_diagnostic']['show_flag_access_path'],'editor_property_show_flag_settings');self.stage('exposure_restore');self.assertEqual(self.flags,[]);self.assertEqual(self.flagsets,[[{'name':'LocalExposure','enabled':True}],[]])
 def test_reflected_flag_read_error_refuses_before_any_settings_mutation(self):
  self.fail_flag_read=True
  with self.assertRaisesRegex(RuntimeError,"get_editor_property.*show_flag_settings.*read"):self.stage()
  self.assertEqual(self.sets,[]);self.assertEqual(self.flagsets,[]);self.assertEqual(self.draws,[])
 def test_reflected_writer_silent_failure_is_detected_and_originals_restored(self):
  self.silent_flag_write=True
  with self.assertRaisesRegex(RuntimeError,'readback differs'):self.stage()
  self.assertEqual(vars(self.settings),self.original);self.assertEqual([{'name':f.name,'enabled':f.enabled} for f in self.flags],self.original_flags);self.assertNotIn('exposure_diagnostic',self.state);self.assertEqual(self.draws,[])
 def test_current_trial_uses_only_observed_reflected_property_not_missing_methods(self):
  for name in ('_capture_exposure_flags','_capture_exposure_diagnostic','_capture_exposure_restore'):
   calls={n.func.attr for n in ast.walk(self.nodes[name]) if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute)}
   self.assertFalse(calls&{'get_show_flag_settings','set_show_flag_settings'})
if __name__=='__main__':unittest.main()