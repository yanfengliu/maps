"""Actual helper AST + independent native/readback fakes; no Unreal, GPU or appearance verdict."""
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
from types import SimpleNamespace as NS
import unittest
from unittest.mock import patch

HELPER = Path(os.environ.get('SHIBUYA_SUPPORT_HELPER', Path(__file__).parents[2]/'Content/Python/shibuya_tools.py'))
PREFIX = 'artifacts/unreal/buffers-20261017-000000/crossing'

class Texture:
    def __init__(self, fmt='RGBA8'):
        self.render_target_format=fmt;self.size_x=1280;self.size_y=720;self.target_gamma=2.2
    def set_editor_property(self,key,value):setattr(self,key,value)
    def get_editor_property(self,key):return getattr(self,key)

class Component:
    def __init__(self):
        self.capture_source='FINAL';self.texture_target=Texture();self.fov_angle=60.;self.always_persist_rendering_state=True;self.draws=[]
    def capture_scene(self):self.draws.append(self.capture_source)
    def get_world_location(self):return NS(x=3500.,y=4500.,z=3500.)
    def get_forward_vector(self):return NS(x=-.579324,y=-.744845,z=-.331042)
    def get_editor_property(self,name):return NS(policy='unchanged')

class Actor:
    def __init__(self):self.capture_component2d=Component()
    def get_actor_location(self):return self.capture_component2d.get_world_location()
    def get_actor_right_vector(self):return NS(x=.789352,y=-.613941,z=0.)
    def get_actor_up_vector(self):return NS(x=-.203242,y=-.261315,z=.943615)

class CameraBufferTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tree=ast.parse(HELPER.read_text(encoding='utf-8'))
        cls.functions={n.name:n for n in cls.tree.body if isinstance(n,ast.FunctionDef)}
        toolset=next(n for n in cls.tree.body if isinstance(n,ast.ClassDef) and n.name=='ShibuyaCityTools')
        cls.methods={n.name:n for n in toolset.body if isinstance(n,ast.FunctionDef)}

    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name)
        (self.root/'artifacts/unreal/buffers-20261017-000000').mkdir(parents=True)
        self.released=[];self.actor=Actor();self.original=self.actor.capture_component2d.texture_target;self.reads=[];self.commands=[];self.destroyed=[]
        self.state={'actor':self.actor,'world':object(),'texture':self.original,'frames':80,'camera_m':[35.,-45.,35.],'target_m':[0.,0.,15.]}
        def area(world,texture,x,y,width,height,normalize):
            self.reads.append((x,y,width,height,normalize))
            return [NS(r=float(x+i%width),g=float(y+i//width),b=-2.,a=4.) for i in range(width*height)]
        self.api=NS(release_render_target2d=lambda texture:self.released.append(texture),create_render_target2d=lambda world,w,h,fmt:Texture(fmt),read_render_target_raw_pixel_area=area)
        self.unreal=NS(RenderingLibrary=self.api,TextureRenderTargetFormat=NS(RTF_RGBA32F='FLOAT'),
            SceneCaptureSource=NS(SCS_FINAL_COLOR_LDR='FINAL',SCS_SCENE_COLOR_HDR='HDR',SCS_BASE_COLOR='BASE',SCS_NORMAL='NORMAL',SCS_SCENE_DEPTH='DEPTH'),
            SystemLibrary=NS(get_console_variable_int_value=lambda name:0,get_frame_count=lambda:900,execute_console_command=lambda world,cmd:self.commands.append(cmd)))
        names={n for n in self.functions if n.startswith('_capture_diagnostic_')}|{'_capture_surface_diagnostic','_finish_capture','_source_to_native_cm','_native_frame_record'}
        nodes=[copy.deepcopy(self.functions[n]) for n in self.functions if n in names]
        for name in ('advance_capture','export_capture','inspect_camera_surfaces'):
            node=copy.deepcopy(self.methods[name]);node.decorator_list=[];nodes.append(node)
        self.env=dict(unreal=self.unreal,PROJECT=self.root,Path=Path,stat=stat,re=re,math=math,struct=struct,json=json,hashlib=hashlib,
            _capture=self.state,_native_scene_frame=lambda require=False:None,_vector=lambda v:[v.x,v.y,v.z],_photographic_policy=lambda settings:{'policy':'unchanged'},
            _restore_capture_coverage=lambda state:{'changed':False},_actors=lambda:NS(destroy_actor=lambda actor:self.destroyed.append(actor) or True))
        exec(compile(ast.Module(body=nodes,type_ignores=[]),str(HELPER),'exec'),self.env)

    def stage(self,name,prefix=PREFIX,camera=None):return self.env['_capture_surface_diagnostic'](name,prefix,camera or [35.,-45.,35.],[0.,0.,15.])
    def begin(self):return self.stage('begin_hdr')
    def advance_to(self,count):
        while self.state['diagnostic']['frames']<count:self.env['advance_capture']()
    def small_write(self,name='probe',box=(550,520,552,522)):return self.env['_capture_diagnostic_write'](self.state,name,box)
    def fake_write(self):
        def output(state,name,box):return {'name':name,'box':list(box),'source':self.actor.capture_component2d.capture_source}
        self.env['_capture_diagnostic_write']=output
    def hdr_ready(self):
        self.begin();self.fake_write();self.advance_to(60);self.stage('read_hdr');self.advance_to(80);self.stage('read_hdr')

    def test_begin_preserves_final_target_count_camera_and_esu_identity(self):
        result=self.begin();self.assertEqual(self.state['frames'],80);self.assertIs(self.state['texture'],self.original)
        self.assertEqual(result['diagnostic_capture_frames'],1);self.assertEqual(result['actor_location_cm'],[3500.,4500.,3500.])
        self.assertEqual(result['source_camera_enu_m'],[35.,-45.,35.]);self.assertEqual(result['native_frame']['id'],'native-centimetres-Xeast-Ysouth-Zup-v2')
        self.assertEqual(self.actor.capture_component2d.draws,['HDR']);self.assertIn('UNOBSERVED',result['resolved_post_process'])

    def test_advance_tracks_hdr_separately_and_emits_own_final_stats(self):
        self.begin();self.advance_to(80);r=json.loads(self.env['advance_capture']())
        self.assertEqual(r,{'capture_frames':80,'diagnostic_capture_frames':81});self.assertEqual(self.commands,['r.LumenScene.DumpStats 2'])
        self.assertEqual(len(self.actor.capture_component2d.draws),81)

    def test_forward_renderer_cannot_be_relabelled_base_color(self):
        self.unreal.SystemLibrary.get_console_variable_int_value=lambda name:1
        with self.assertRaisesRegex(RuntimeError,'deferred renderer'):self.begin()
        self.assertIs(self.actor.capture_component2d.texture_target,self.original);self.assertNotIn('diagnostic',self.state)

    def test_original_advance_shape_is_unchanged(self):
        self.state['frames']=79;r=json.loads(self.env['advance_capture']());self.assertEqual(r,{'capture_frames':80})

    def test_wrong_start_count_refuses_before_render(self):
        self.state['frames']=79
        with self.assertRaisesRegex(RuntimeError,'original80-frame'):self.begin()
        self.assertEqual(self.actor.capture_component2d.draws,[]);self.assertIs(self.actor.capture_component2d.texture_target,self.original)

    def test_wrong_pose_refuses_without_swapping(self):
        with self.assertRaisesRegex(RuntimeError,'original crossing'):self.stage('begin_hdr',camera=[-70.,20.,65.])
        self.assertNotIn('diagnostic',self.state)

    def test_wrong_stage_does_not_create_diagnostic(self):
        with self.assertRaisesRegex(RuntimeError,'stage must'):self.stage('exec')
        self.assertNotIn('diagnostic',self.state)

    def test_raw_read_uses_native_width_height_not_misnamed_endpoints(self):
        self.begin();r=self.small_write();self.assertEqual(self.reads,[(550,520,2,2,False)])
        raw=(self.root/r['path']).read_bytes();self.assertEqual(len(raw),64)
        self.assertEqual(struct.unpack('<16f',raw),(550.,520.,-2.,4.,551.,520.,-2.,4.,550.,521.,-2.,4.,551.,521.,-2.,4.))
        self.assertEqual(r['sha256'],hashlib.sha256(raw).hexdigest());self.assertFalse(r['normalization']);self.assertFalse(r['gamma_conversion'])

    def test_endpoint_mutant_goes_red_against_independent_rectangle(self):
        self.begin();node=copy.deepcopy(self.functions['_capture_diagnostic_write'])
        call=next(n for n in ast.walk(node) if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute) and n.func.attr=='read_render_target_raw_pixel_area')
        call.args[4]=ast.Name(id='right',ctx=ast.Load());call.args[5]=ast.Name(id='bottom',ctx=ast.Load());ast.fix_missing_locations(node)
        def require_width_height(world,texture,x,y,w,h,normalize):
            self.assertEqual((x,y,w,h),(550,520,2,2));return []
        self.api.read_render_target_raw_pixel_area=require_width_height
        mutated=dict(self.env);exec(compile(ast.Module(body=[node],type_ignores=[]),'<endpoint-mutant>','exec'),mutated)
        with self.assertRaises(AssertionError):mutated['_capture_diagnostic_write'](self.state,'mutant',(550,520,552,522))

    def test_wrong_native_pixel_count_is_not_written(self):
        self.begin();self.api.read_render_target_raw_pixel_area=lambda *a:[]
        with self.assertRaisesRegex(RuntimeError,'expected4'):self.small_write()
        self.assertEqual(list((self.root/'artifacts/unreal/buffers-20261017-000000').iterdir()),[])

    def test_nonfinite_float_cannot_be_serialized(self):
        self.begin();self.api.read_render_target_raw_pixel_area=lambda *a:[NS(r=float('nan'),g=0.,b=0.,a=1.)]*4
        with self.assertRaisesRegex(RuntimeError,'nonfinite'):self.small_write()

    def test_payload_cap_refuses_before_file_io(self):
        self.begin();self.state['diagnostic']['bytes_written']=32*1024*1024
        with self.assertRaisesRegex(RuntimeError,'exceed32MiB'):self.small_write()

    def test_existing_leaf_is_not_overwritten(self):
        self.begin();self.small_write()
        with self.assertRaisesRegex(RuntimeError,'already exists'):self.small_write()

    def test_bad_prefix_and_reparse_ancestor_are_rejected_before_render(self):
        for prefix in ('../escape','artifacts/unreal/buffers-20261017-000000/../crossing'):
            with self.subTest(prefix=prefix),self.assertRaisesRegex(RuntimeError,'use artifacts'):self.stage('begin_hdr',prefix)
        original=Path.lstat;blocked=self.root/'artifacts'
        def lstat(p):return NS(st_mode=stat.S_IFDIR,st_file_attributes=1024) if p==blocked else original(p)
        with patch.object(Path,'lstat',lstat),self.assertRaisesRegex(RuntimeError,'reparse'):self.begin()
        self.assertEqual(self.actor.capture_component2d.draws,[])

    def test_hdr_read_at_immediate_frame_refuses_and_restores(self):
        self.begin()
        with self.assertRaisesRegex(RuntimeError,'frame60 and80'):self.stage('read_hdr')
        self.assertIs(self.actor.capture_component2d.texture_target,self.original);self.assertNotIn('diagnostic',self.state)

    def test_ordered_hdr_and_gbuffer_sources_are_native_and_final_is_restored(self):
        self.hdr_ready();result=self.stage('read_gbuffer')
        self.assertEqual([x['capture_source'] for x in result['sources']],['BASE','NORMAL','DEPTH'])
        self.assertEqual(len(result['outputs']),10);self.assertEqual(result['outputs'][3]['box'],[0,0,1280,720])
        self.assertIs(self.actor.capture_component2d.texture_target,self.original);self.assertEqual(self.actor.capture_component2d.capture_source,'FINAL')
        self.assertEqual(self.state['frames'],80);self.assertNotIn('diagnostic',self.state);self.assertEqual(len(self.released),1)

    def test_gbuffer_read_failure_keeps_primary_and_restores(self):
        self.hdr_ready();error=RuntimeError('native readback failed')
        def fail(*args):raise error
        self.env['_capture_diagnostic_write']=fail
        with self.assertRaises(RuntimeError) as caught:self.stage('read_gbuffer')
        self.assertIs(caught.exception,error);self.assertIs(self.actor.capture_component2d.texture_target,self.original);self.assertNotIn('diagnostic',self.state)

    def test_gbuffer_primary_survives_both_restoration_failures(self):
        self.hdr_ready();primary=RuntimeError('native ROI read failed')
        def fail_read(*args):raise primary
        def fail_restore(state):raise RuntimeError('native float-target restore failed')
        self.env['_capture_diagnostic_write']=fail_read;self.env['_capture_diagnostic_restore']=fail_restore
        with self.assertRaises(RuntimeError) as caught:self.stage('read_gbuffer')
        self.assertIs(caught.exception,primary);self.assertIn('native float-target restore failed',' '.join(primary.__notes__))

    def test_finish_capture_restores_active_float_target_before_destroy(self):
        self.begin();self.assertEqual(self.env['_finish_capture'](),{'changed':False})
        self.assertIs(self.actor.capture_component2d.texture_target,self.original);self.assertEqual(self.destroyed,[self.actor]);self.assertIsNone(self.env['_capture'])

    def test_finish_retains_diagnostic_primary_coverage_and_destroy_secondaries(self):
        self.begin();primary=RuntimeError('diagnostic restore failed')
        def fail_restore(state):raise primary
        def fail_coverage(state):raise RuntimeError('coverage restore failed')
        self.env['_capture_diagnostic_restore']=fail_restore;self.env['_restore_capture_coverage']=fail_coverage
        self.env['_actors']=lambda:NS(destroy_actor=lambda actor:False)
        with self.assertRaises(RuntimeError) as caught:self.env['_finish_capture']()
        self.assertIs(caught.exception,primary);self.assertIn('coverage restore failed',' '.join(primary.__notes__));self.assertIn('did not destroy',' '.join(primary.__notes__))
        self.assertIsNone(self.env['_capture'])

    def test_export_during_diagnostic_refuses_and_finish_still_cleans(self):
        self.begin()
        with self.assertRaisesRegex(RuntimeError,'Cannot export final'):self.env['export_capture']('ignored.png',True)
        self.assertIsNone(self.env['_capture']);self.assertEqual(self.destroyed,[self.actor])

    def test_restore_is_idempotent(self):
        self.begin();self.assertTrue(self.stage('restore')['restored']);self.assertEqual(self.stage('restore'),{'changed':False})
        self.env['_capture']=None;self.assertEqual(self.stage('restore'),{'changed':False})

    def test_public_api_is_append_only_and_default_immediate_body_is_preserved(self):
        method=self.methods['inspect_camera_surfaces'];self.assertEqual([a.arg for a in method.args.args][-2:],['active_capture_stage','relative_output_prefix'])
        self.assertEqual([ast.literal_eval(x) for x in method.args.defaults][-2:],['',''])
        self.assertEqual([ast.unparse(x) for x in method.decorator_list],['toolset_registry.tool_call','staticmethod'])
        # Frame conversion and required scene marker stay on the literal legacy path.
        legacy=ast.unparse(ast.Module(body=method.body[2:],type_ignores=[]))
        self.assertIn('_native_scene_frame(require=True)',legacy);self.assertIn('_source_to_native_cm([east_m, north_m, height_m])',legacy)
        self.assertIn('source_camera_enu_m',legacy);self.assertIn('source_target_enu_m',legacy)

if __name__=='__main__':unittest.main()
