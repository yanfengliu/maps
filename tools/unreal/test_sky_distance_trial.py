"""Actual fixed tool AST; independent literal controls; no Unreal/engine or image acceptance."""
import ast
import copy
import json
import os
from pathlib import Path
from types import SimpleNamespace as NS
import unittest

HELPER=Path(os.environ.get('SHIBUYA_SUPPORT_HELPER',Path(__file__).parents[2]/'Content/Python/shibuya_tools.py'))
FRAME={'schema_version':1,'id':'native-centimetres-Xeast-Ysouth-Zup-v2','definition_sha256':'2099342528416aa9dcdceea63e6d2604974341d8248f3b1c7ccf287008759170'}

class SkyDistanceTrialTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        tree=ast.parse(HELPER.read_bytes())
        cls.function=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='_set_sky_distance_trial')
        toolset=next(n for n in tree.body if isinstance(n,ast.ClassDef) and n.name=='ShibuyaCityTools')
        cls.wrapper=next(n for n in toolset.body if isinstance(n,ast.FunctionDef) and n.name=='set_sky_distance_trial')

    def setUp(self):
        self.values={'sky_distance_threshold':5.,'mobility':'movable','source_type':'captured','real_time_capture':False,'cubemap':None,'intensity':1.,'indirect_lighting_intensity':1.,'sun_lux':100000.,'material':'pinned','exposure':'F8 ISO100 shutter125'}
        self.initial=copy.deepcopy(self.values);self.sets=[];self.recaptures=0;self.resource_reads=0;self.frame_reads=0
        self.fail_capture=set();self.fail_resource=set();self.fail_set=set()
        def set_property(name,value):
            self.sets.append((name,value))
            if len(self.sets) in self.fail_set:raise RuntimeError('set failure')
            self.values[name]=value
        def recapture():
            self.recaptures+=1
            if self.recaptures in self.fail_capture:raise RuntimeError('recapture failure')
        self.component=NS(get_editor_property=lambda k:self.values[k],set_editor_property=set_property,recapture_sky=recapture,get_path_name=lambda:'/Actual/SkyComponent')
        class Sky:
            def get_actor_label(inner):return 'Shibuya_SkyLight'
        self.actor=Sky();self.actor.light_component=self.component;self.actors=[self.actor]
        def resources(world):
            self.resource_reads+=1
            if self.resource_reads in self.fail_resource:raise RuntimeError('resource failure')
            return json.dumps({'skylights':[{'component':'/Actual/SkyComponent','processed_rhi_present':True,'sh_rgb_coefficients':[[7.,8.,9.]]}]})
        def frame(require=False):
            self.frame_reads+=1;self.assertIs(require,True);return {'native_frame':dict(FRAME)}
        unreal=NS(SkyLight=Sky,ComponentMobility=NS(MOVABLE='movable'),SkyLightSourceType=NS(SLS_CAPTURED_SCENE='captured'),UnrealEditorSubsystem=object,
                  get_editor_subsystem=lambda kind:NS(get_editor_world=lambda:object()),ShibuyaRendererLibrary=NS(inspect_world_resources=resources))
        wrapper=copy.deepcopy(self.wrapper);wrapper.decorator_list=[]
        self.env=dict(unreal=unreal,json=json,_capture=None,_native_scene_frame=frame,_actors=lambda:NS(get_all_level_actors=lambda:self.actors))
        exec(compile(ast.Module(body=[copy.deepcopy(self.function),wrapper],type_ignores=[]),str(HELPER),'exec'),self.env)
    def call(self,value):return json.loads(self.env['set_sky_distance_trial'](value))
    def assert_other_unchanged(self):self.assertEqual({k:v for k,v in self.values.items() if k!='sky_distance_threshold'},{k:v for k,v in self.initial.items() if k!='sky_distance_threshold'})

    def test_candidate_changes_only_threshold_and_requests_capture_without_claiming_async_completion(self):
        row=self.call(True)
        self.assertEqual(self.sets,[('sky_distance_threshold',150000.)]);self.assertEqual(self.recaptures,1);self.assertEqual(self.resource_reads,2)
        self.assertEqual((row['threshold_before_cm'],row['threshold_after_cm']),(5.,150000.));self.assertEqual(row['native_frame'],FRAME)
        self.assertIs(row['saved'],False);self.assertIn('asynchronous',row['resource_bound']);self.assert_other_unchanged()
    def test_restore_from_candidate_and_idempotent_restoration_both_recapture(self):
        self.call(True);row=self.call(False);again=self.call(False)
        self.assertEqual((row['threshold_before_cm'],row['threshold_after_cm']),(150000.,5.));self.assertEqual(again['threshold_after_cm'],5.)
        self.assertEqual(self.recaptures,3);self.assert_other_unchanged()
    def test_all_boolean_aliases_refuse_before_observation_or_mutation(self):
        for value in (0,1,1.,'true','false',None,[],{}):
            with self.subTest(value=value),self.assertRaisesRegex(RuntimeError,'literal Boolean'):self.call(value)
        self.assertEqual((self.frame_reads,self.resource_reads,self.sets,self.recaptures),(0,0,[],0))
    def test_scene_admission_refusal_precedes_light_mutation(self):
        def refuse(**kw):raise RuntimeError('old native scene frame')
        self.env['_native_scene_frame']=refuse
        with self.assertRaisesRegex(RuntimeError,'old native scene'):self.call(True)
        self.assertEqual((self.sets,self.recaptures),([],0))
    def test_duplicate_or_wrong_named_light_refuses(self):
        self.actors.append(self.actor)
        with self.assertRaisesRegex(RuntimeError,'exactly one SkyLight'):self.call(True)
        self.actors=[self.actor];self.actor.get_actor_label=lambda:'Other'
        with self.assertRaisesRegex(RuntimeError,'exactly one SkyLight'):self.call(True)
        self.assertEqual((self.sets,self.recaptures),([],0))
    def test_wrong_light_policy_and_unexpected_threshold_refuse_without_mutation(self):
        for key,value in [('mobility','static'),('source_type','specified'),('real_time_capture',True),('cubemap',object()),('sky_distance_threshold',20.)]:
            with self.subTest(key=key):
                self.values=dict(self.initial);self.values[key]=value
                with self.assertRaises(RuntimeError):self.call(True)
        self.assertEqual((self.sets,self.recaptures),([],0))
    def test_active_capture_prevents_apply_but_does_not_prevent_finally_restoration(self):
        self.env['_capture']={'live':True}
        with self.assertRaisesRegex(RuntimeError,'before an active capture'):self.call(True)
        self.values['sky_distance_threshold']=150000.;self.assertEqual(self.call(False)['threshold_after_cm'],5.)
    def test_recapture_failure_rolls_back_original_threshold_and_recaptures_it(self):
        self.fail_capture={1}
        with self.assertRaisesRegex(RuntimeError,'recapture failure'):self.call(True)
        self.assertEqual(self.sets,[('sky_distance_threshold',150000.),('sky_distance_threshold',5.)]);self.assertEqual(self.recaptures,2)
        self.assertEqual(self.values,self.initial)
    def test_post_request_resource_failure_preserves_primary_error_and_rolls_back(self):
        self.fail_resource={2}
        with self.assertRaisesRegex(RuntimeError,'resource failure'):self.call(True)
        self.assertEqual(self.values,self.initial);self.assertEqual(self.recaptures,2)
    def test_rollback_failure_is_attached_without_hiding_primary_error(self):
        self.fail_capture={1,2}
        with self.assertRaisesRegex(RuntimeError,'recapture failure') as seen:self.call(True)
        self.assertIn('rollback also failed',seen.exception.__notes__[0]);self.assertEqual(self.values,self.initial)
    def test_missing_installed_callables_refuse_before_any_threshold_mutation(self):
        for name in ('get_editor_property','set_editor_property','recapture_sky'):
            with self.subTest(name=name):
                original=getattr(self.component,name);setattr(self.component,name,None)
                try:
                    with self.assertRaisesRegex(RuntimeError,'callable native'):self.call(True)
                finally:setattr(self.component,name,original)
        self.env['unreal'].ShibuyaRendererLibrary.inspect_world_resources=None
        with self.assertRaisesRegex(RuntimeError,'callable compiled native'):self.call(True)
        self.assertEqual((self.sets,self.recaptures,self.resource_reads),([],0,0));self.assertEqual(self.values,self.initial)

    def test_second_apply_cannot_become_an_uncontrolled_repeat(self):
        self.call(True)
        with self.assertRaisesRegex(RuntimeError,'threshold5cm'):self.call(True)
        self.assertEqual(self.recaptures,1);self.assert_other_unchanged()

if __name__=='__main__':unittest.main()