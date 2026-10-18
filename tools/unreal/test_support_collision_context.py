"""Bound: native observer wire admission with fakes; no C++ compilation/native context claim."""
from pathlib import Path
import copy,json,sys,unittest
from unittest import mock
import ast,math,os,re,types
HELPER=Path(os.environ.get('SHIBUYA_SUPPORT_HELPER',Path(__file__).absolute().parents[2]/'Content/Python/shibuya_tools.py'))

class CollisionContextBridgeTests(unittest.TestCase):
    def context(self):
        # Standard-library fake only; Unreal helpers must not import Source/NumPy.
        tree=ast.parse(HELPER.read_text(encoding='utf-8'))
        env=dict(json=json,math=math,re=re)
        exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='_support_physical_context'],type_ignores=[]),str(HELPER),'exec'),env)
        actors=[];mappings=[];comparisons=[];observations={}
        for i in range(26):
            path='/mesh/'+str(i);label='City_069_terrain' if i==25 else 'road'+str(i)
            component=types.SimpleNamespace(get_path_name=lambda p=path:p+'/component')
            actor=types.SimpleNamespace(static_mesh_component=component,get_actor_label=lambda l=label:l,get_path_name=lambda p=path:p+'/actor')
            actors.append(actor)
            observations[component.get_path_name()]=dict(schema_version=1,observer='ue-public-static-mesh-collision-context-v1',available=True,editor_data_available=True,
                engine_version='5.8.3-58210709+++UE5+Release-5.8',current_enable_mesh_clean=1,
                actor_path=actor.get_path_name(),component_path=component.get_path_name(),mesh_path=path,body_path=path+'/body',
                own_complex_source=True,collision_trace_flag='CTF_UseComplexAsSimple',double_sided=False,mesh_collide_all=False,
                lod_for_collision=0,selected_collision_lod=0,section_collision_enabled=[True],
                body_build_scale=[1.,1.,1.],render_build_scale=[1.,1.,1.],actor_scale=[1.,1.,1.],component_scale=[1.,1.,1.],
                actor_location_cm=[0.,0.,0.],actor_rotation=[0.,0.,0.],component_location_cm=[0.,0.,0.],component_rotation=[0.,0.,0.],
                collision_enabled='QueryAndPhysics',collision_profile='BlockAll',collision_object_type='ECC_WorldStatic',visibility_response='ECR_Block',
                nanite_enabled=False,fallback_target='PercentTriangles',generate_fallback='Enabled',fallback_percent_triangles=1.,fallback_relative_error=0.,keep_percent_triangles=1.,trim_relative_error=0.)
            comparisons.append(dict(asset=path,complete_rendered_geometry_multiset_equal=True))
            if i<25:mappings.append(dict(actor_label=label,native_mesh_path=path))
        env['_actors']=lambda:types.SimpleNamespace(get_all_level_actors=lambda:actors)
        env['unreal']=types.SimpleNamespace(ShibuyaRendererLibrary=types.SimpleNamespace(inspect_support_collision_context=lambda component:json.dumps(observations[component.get_path_name()])))
        state=dict(manifest=dict(native_roads=mappings,native_assignment=dict(replacement_mesh_path='/mesh/25')),
            collision=comparisons[-1],road_collision_receipts=[dict(collision=row) for row in comparisons[:-1]],physical_query_model=dict(schema_version=1,id='ue5.8.3-cl58210709-chaos-cook-float32-cm-v1',definition_sha256='e5ba1adad4fcab4e05d61d899babf8f6c789655cfe4637c393d7002f4f742428'))
        return env,state,actors

    def test_unavailable_bridge_is_not_replaced_by_python_properties(self):
        env,state,actors=self.context()
        env['unreal'].ShibuyaRendererLibrary.inspect_support_collision_context=lambda component:json.dumps(dict(schema_version=1,observer='ue-public-static-mesh-collision-context-v1',available=False,editor_data_available=False,unavailable_reason='WITH_EDITOR unavailable'))
        result=env['_support_physical_context'](state)
        self.assertFalse(result['passed'])
        self.assertEqual(len(result['colliders']),26)
        self.assertTrue(all(not row['supported'] for row in result['colliders']))

    def test_every_native_field_is_required_without_default_qualification(self):
        env,state,actors=self.context();bridge=env['unreal'].ShibuyaRendererLibrary.inspect_support_collision_context
        fields=json.loads(bridge(actors[0].static_mesh_component))
        self.assertTrue(env['_support_physical_context'](state)['passed'])
        for field in fields:
            with self.subTest(missing=field):
                def missing(component,key=field):
                    record=json.loads(bridge(component));del record[key];return json.dumps(record)
                env['unreal'].ShibuyaRendererLibrary.inspect_support_collision_context=missing
                self.assertFalse(env['_support_physical_context'](state)['passed'])

    def test_wrong_identity_flags_types_scales_and_unknown_wire_refuse(self):
        variants=dict(schema_version=2,observer='unknown',available=1,editor_data_available=1,actor_path='/wrong/actor',component_path='/wrong/component',mesh_path='/wrong/mesh',body_path='',
            engine_version='5.8.4-1',current_enable_mesh_clean=True,own_complex_source=False,collision_trace_flag='CTF_UseSimpleAsComplex',double_sided=True,mesh_collide_all=0,
            lod_for_collision=1,selected_collision_lod=1,section_collision_enabled=[1],body_build_scale=[2,1,1],render_build_scale=[1,2,1],actor_scale=[1,1,2],component_scale=[True,1,1],
            actor_location_cm=[0,0,1],actor_rotation=[0,1,0],component_location_cm=[1,0,0],component_rotation=[0,0,1],collision_enabled='QueryOnly',collision_profile='OverlapAll',
            collision_object_type='ECC_WorldDynamic',visibility_response='ECR_Ignore',nanite_enabled=1,fallback_target='Auto',generate_fallback='PlatformDefault',
            fallback_percent_triangles=.9,fallback_relative_error=.1,keep_percent_triangles=.9,trim_relative_error=.1)
        for field,value in variants.items():
            with self.subTest(field=field):
                env,state,actors=self.context();bridge=env['unreal'].ShibuyaRendererLibrary.inspect_support_collision_context
                def wrong(component,key=field,value=value):
                    record=json.loads(bridge(component));record[key]=value;return json.dumps(record)
                env['unreal'].ShibuyaRendererLibrary.inspect_support_collision_context=wrong
                self.assertFalse(env['_support_physical_context'](state)['passed'])
        env,state,actors=self.context()
        del env['unreal'].ShibuyaRendererLibrary
        self.assertFalse(env['_support_physical_context'](state)['passed'])
        env,state,actors=self.context()
        env['unreal'].ShibuyaRendererLibrary.inspect_support_collision_context=lambda _: '{invalid'
        self.assertFalse(env['_support_physical_context'](state)['passed'])

if __name__=='__main__':unittest.main()
