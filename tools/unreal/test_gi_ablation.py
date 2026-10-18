"""Actual GI-stage helper AST and unchanged production driver; no native solver or image claim."""
import ast,copy,json,os,sys
from pathlib import Path
from types import SimpleNamespace as NS
import unittest
HELPER=Path(os.environ.get('SHIBUYA_SUPPORT_HELPER',Path(__file__).parents[2]/'Content/Python/shibuya_tools.py'))
class GiAblationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        tree=ast.parse(HELPER.read_bytes());cls.nodes={n.name:n for n in tree.body if isinstance(n,ast.FunctionDef)}
        cls.toolset=next(n for n in tree.body if isinstance(n,ast.ClassDef) and n.name=='ShibuyaCityTools')
    def setUp(self):
        self.settings=NS(override_dynamic_global_illumination_method=True,dynamic_global_illumination_method='LUMEN',reflection_method='LUMEN',override_reflection_method=True,exposure='f8ISO100shutter125',lumen_scene_view_distance=240000.,material='pinned')
        self.original=copy.deepcopy(vars(self.settings));self.sets=[];self.draws=[];self.destroyed=[];self.fail_draw=False;self.fail_restore=False;self.coverage_calls=[]
        def get(key):self.assertEqual(key,'post_process_settings');return copy.deepcopy(self.settings)
        def set_property(key,value):
            self.assertEqual(key,'post_process_settings');self.sets.append(copy.deepcopy(vars(value)))
            if self.fail_restore and value.dynamic_global_illumination_method=='LUMEN':raise RuntimeError('restore setter failure')
            self.settings=copy.deepcopy(value)
        def draw():
            self.draws.append(self.settings.dynamic_global_illumination_method)
            if self.fail_draw:raise RuntimeError('native draw failure')
        self.component=NS(get_editor_property=get,set_editor_property=set_property,capture_scene=draw)
        self.actor=NS(capture_component2d=self.component)
        self.state={'actor':self.actor,'world':object(),'frames':1,'native_start_frame':200,'camera_m':[35.,-45.,35.],'target_m':[0.,0.,15.]}
        def witness(state):return {'capture_frames':state['frames'],'native_start_frame':state['native_start_frame'],'lumen_gi_override':self.settings.override_dynamic_global_illumination_method,'lumen_gi':self.settings.dynamic_global_illumination_method}
        def coverage(state):self.coverage_calls.append(True);return {'changed':False}
        unreal=NS(DynamicGlobalIlluminationMethod=NS(LUMEN='LUMEN',NONE='NONE'),SystemLibrary=NS(get_frame_count=lambda:1000))
        self.env=dict(unreal=unreal,json=json,_capture=self.state,_native_scene_frame=lambda require=False:None,_capture_witness=witness,_restore_capture_coverage=coverage,_actors=lambda:NS(destroy_actor=lambda actor:self.destroyed.append(actor) or True))
        names=['_capture_gi_restore','_capture_gi_diagnostic','_capture_surface_diagnostic','_finish_capture']
        exec(compile(ast.Module(body=[copy.deepcopy(self.nodes[n]) for n in names],type_ignores=[]),str(HELPER),'exec'),self.env)
    def stage(self,name='gi_none',camera=None,prefix=''):return self.env['_capture_surface_diagnostic'](name,prefix,camera or [35.,-45.,35.],[0.,0.,15.])
    def test_none_changes_only_gi_method_and_counts_actual_new_mode_render(self):
        r=self.stage();expected=dict(self.original);expected['dynamic_global_illumination_method']='NONE'
        self.assertEqual(vars(self.settings),expected);self.assertEqual(self.draws,['NONE']);self.assertEqual(self.state['frames'],1);self.assertEqual(r['gi_original_policy'],{'override':True,'method':'LUMEN'})
        self.assertEqual((r['unscored_initial_frames'],r['unscored_native_start_frame'],r['native_start_frame']),(1,200,1000));self.assertIn('ineligible',r['diagnostic_bound'])
    def test_lumen_control_restarts_identical_counted_policy(self):
        self.stage('gi_lumen');self.assertEqual(vars(self.settings),self.original);self.assertEqual(self.draws,['LUMEN']);self.assertEqual(self.state['native_start_frame'],1000)
    def test_explicit_restore_keeps_completed_frame_count_and_other_fields(self):
        self.stage();self.state['frames']=80;r=self.stage('gi_restore')
        self.assertTrue(r['restored']);self.assertEqual(vars(self.settings),self.original);self.assertEqual(self.state['frames'],80);self.assertNotIn('gi_diagnostic',self.state);self.assertEqual(self.draws,['NONE'])
    def test_finish_restores_before_destroy_and_returns_actual_receipt(self):
        self.stage();r=self.env['_finish_capture']()
        self.assertTrue(r['gi_diagnostic_restoration']['restored']);self.assertEqual(vars(self.settings),self.original);self.assertEqual(self.destroyed,[self.actor]);self.assertIsNone(self.env['_capture'])
    def test_ordinary_finish_without_gi_retains_literal_legacy_result(self):
        self.assertEqual(self.env['_finish_capture'](),{'changed':False});self.assertEqual(self.sets,[])
    def test_draw_failure_restores_original_policy_and_primary_error(self):
        self.fail_draw=True
        with self.assertRaisesRegex(RuntimeError,'native draw failure'):self.stage()
        self.assertEqual(vars(self.settings),self.original);self.assertNotIn('gi_diagnostic',self.state)
    def test_rollback_failure_does_not_hide_draw_primary(self):
        self.fail_draw=True;self.fail_restore=True
        with self.assertRaisesRegex(RuntimeError,'native draw failure') as got:self.stage()
        self.assertIn('restore setter failure',' '.join(got.exception.__notes__));self.assertIn('gi_diagnostic',self.state)
    def test_finish_restore_failure_still_restores_coverage_and_destroys_owned_actor(self):
        self.stage();self.fail_restore=True
        with self.assertRaisesRegex(RuntimeError,'restore setter failure'):self.env['_finish_capture']()
        self.assertEqual(self.coverage_calls,[True]);self.assertEqual(self.destroyed,[self.actor]);self.assertIsNone(self.env['_capture'])
    def test_wrong_pose_prefix_or_late_frame_refuse_before_mutation(self):
        with self.assertRaisesRegex(RuntimeError,'original crossing'):self.stage(camera=[0.,0.,35.])
        with self.assertRaisesRegex(RuntimeError,'empty output'):self.stage(prefix='arbitrary')
        self.state['frames']=2
        with self.assertRaisesRegex(RuntimeError,'initial capture frame1'):self.stage()
        self.assertEqual(self.sets,[]);self.assertEqual(self.draws,[])
    def test_float_or_repeated_stage_refuses_before_second_change(self):
        self.state['diagnostic']={'active':True}
        with self.assertRaisesRegex(RuntimeError,'float diagnostics'):self.stage()
        self.state.pop('diagnostic');self.stage()
        with self.assertRaisesRegex(RuntimeError,'once at initial'):self.stage()
        self.assertEqual(len(self.sets),1)
    def test_missing_installed_none_enum_or_wrong_original_policy_refuses(self):
        del self.env['unreal'].DynamicGlobalIlluminationMethod.NONE
        with self.assertRaisesRegex(RuntimeError,'installed fixed GI enum'):self.stage()
        self.settings.dynamic_global_illumination_method='NONE'
        with self.assertRaisesRegex(RuntimeError,'original explicit Lumen'):self.stage()
        self.assertEqual(self.sets,[])
    def test_restore_is_idempotent_with_and_without_active_capture(self):
        self.assertEqual(self.stage('gi_restore'),{'changed':False});self.env['_capture']=None;self.assertEqual(self.stage('gi_restore'),{'changed':False})
    def test_public_schema_and_default_ordinary_branch_stay_unchanged(self):
        method=next(n for n in self.toolset.body if isinstance(n,ast.FunctionDef) and n.name=='inspect_camera_surfaces')
        self.assertEqual([ast.literal_eval(n) for n in method.args.defaults][-2:],['',''])
        self.assertEqual([n.arg for n in method.args.args][-2:],['active_capture_stage','relative_output_prefix'])
        self.assertIn('if active_capture_stage or relative_output_prefix:',ast.unparse(method));self.assertIn('capture_samples',ast.unparse(method))
    def test_unchanged_production_predicate_accepts_lumen_and_refuses_none(self):
        # Reuse the existing independent driver fixture; expected NONE is a literal, never inferred from the checked predicate.
        sys.path.insert(0,str(Path(__file__).resolve().parent))
        try:from test_capture_sweep import driver,witness
        finally:sys.path.pop(0)
        args=dict(east_m=35.,north_m=-45.,height_m=35.,target_east_m=0.,target_north_m=0.,target_height_m=15.)
        state=witness(args,80);driver.validate_capture_state(state,[35,-45,35],[0,0,15],2.2,80,False)
        state['lumen_gi']='<DynamicGlobalIlluminationMethod.NONE: 0>'
        with self.assertRaisesRegex(RuntimeError,'lumen_gi is'):driver.validate_capture_state(state,[35,-45,35],[0,0,15],2.2,80,False)
if __name__=='__main__':unittest.main()