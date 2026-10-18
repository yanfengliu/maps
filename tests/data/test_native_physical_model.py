"""Bound: retained operands and tiny pools; no city index or native acceptance."""
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
import sys
import types
import unittest
from unittest import mock

ROOT = Path(__file__).absolute().parents[2]
sys.path.insert(0, str(ROOT/'tools/data'))
import surface_network as api
import support_source3 as source3
import numpy as np


def checked(path):
    for p in [*reversed(path.parents), path]:
        s = p.lstat()
        if stat.S_ISLNK(s.st_mode) or getattr(s, 'st_file_attributes', 0) & stat.FILE_ATTRIBUTE_REPARSE_POINT:
            raise RuntimeError('Reparse refused '+str(p))
    return path


FIXTURE = json.loads(checked(Path(__file__).parent/'fixtures/native-cook-patch64.json').read_text(encoding='utf-8'))


def helper_functions():
    path = Path(os.environ.get('SHIBUYA_SUPPORT_HELPER', api.ROOT/'Content/Python/shibuya_tools.py'))
    tree = ast.parse(checked(path).read_text(encoding='utf-8'))
    names = {"_native_frame_record", "_require_native_frame", "_source_to_native_cm", "_native_to_source_m", "_source_normal_to_native", "_native_actor_tag", "_native_scene_frame", "_support_oriented_key", '_support_fixed_ray_contract', '_support_admit_physical_model', '_support_physical_context',
             '_support_native_rays', '_support_ray_failure_packet', '_support_check_hit', '_vector', '_rotator'}
    env = dict(json=json, hashlib=hashlib, math=math, re=re, struct=struct)
    exec(compile(ast.Module(body=[n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name in names], type_ignores=[]), str(path), 'exec'), env)
    return env


class PhysicalModelTests(unittest.TestCase):
    def test_rejected_face_not_in_default_physical_hits(self):
        # Causal RED on the old implementation: this actual rendered face hit.
        index = api.NativeTriangleIndex(np.array([FIXTURE['terrain_raw_native_cm']])/100)
        self.assertEqual(index.hits(*FIXTURE['sample']['start_m'][:2]), [])

    def test_raw_vertices_and_ids_remain_and_both_native_classes_share_pool(self):
        tiny = np.array(FIXTURE['terrain_raw_native_cm'])/100
        road = np.array(FIXTURE['road_faces'][0]['native_cm'])/100
        for cls in (api.NativeTriangleIndex, source3.NativeTriangleIndex):
            index = cls(np.array([tiny, road]))
            np.testing.assert_array_equal(index.physical_membership, [0, 1])
            np.testing.assert_array_equal(index.native_triangles_cm[0], np.asarray(FIXTURE['terrain_raw_native_cm'])[[0,2,1]]*[1,-1,1])
            lo, hi = tiny[:, :2].min(axis=0), tiny[:, :2].max(axis=0)
            self.assertEqual(index.raw_candidates(lo, hi).tolist(), [0, 1])
            self.assertEqual(index.candidates(lo, hi).tolist(), [1])
            self.assertEqual(index.physical_candidates(lo, hi).tolist(), [1])
            self.assertEqual({h['triangle'] for h in index.hits(*FIXTURE['sample']['start_m'][:2])}, {1})
            self.assertEqual(len(cls(np.array([tiny]), query_role='raw').hits(*FIXTURE['sample']['start_m'][:2])), 1)
            np.testing.assert_array_equal(index.triangles[0], index.native_triangles_cm[0].astype(float)[[0,2,1]]*[1,-1,1]/100)

    def test_exclusive_thresholds_welds_all6_ambiguity_and_unknown_arithmetic(self):
        center = np.float32(1.e-4)
        rows = [np.array([[0,0,0], [1,0,0], [0,h,0]], dtype=np.float32)
                for h in (np.nextafter(center, np.float32(-np.inf)), center, np.nextafter(center, np.float32(np.inf)))]
        rows += [np.array([[0,0,0], [0,0,0], [1,1,0]], dtype=np.float32),
                 np.array(FIXTURE['ambiguity_native_cm'], dtype=np.float32)]
        np.testing.assert_array_equal(api.native_cook_membership(np.array(rows)), [0,0,1,0,-1])
        ambiguous = api.NativeTriangleIndex(np.array([rows[-1].astype(float)/100]))
        with self.assertRaisesRegex(api.NativeCollisionModelError, 'ambiguous'):
            ambiguous.physical_candidates([-1,-1], [1,1])
        with self.assertRaisesRegex(api.NativeCollisionModelError, 'float32'):
            api.native_cook_membership(np.array(rows, dtype=float))
        with self.assertRaisesRegex(api.NativeCollisionModelError, 'finite actual'):
            api.native_cook_membership(np.full((1,3,3), np.inf, dtype=np.float32))
        with self.assertRaisesRegex(api.NativeCollisionModelError, 'arithmetic is nonfinite'):
            api.native_cook_membership(np.array([[[-3.e38,0,0], [3.e38,0,0], [0,3.e38,0]]], dtype=np.float32))
        self.assertFalse(issubclass(api.NativeCollisionModelError, ValueError))

    def operands(self):
        roads = np.array([row['native_cm'] for row in FIXTURE['road_faces']], dtype=float)/100
        refs = [dict(kind='road', source=0, mesh=row['mesh'], primitive=row['primitive'], triangle=row['local_triangle'],
                     source_triangle_index=row['source_triangle_index']) for row in FIXTURE['road_faces']]
        road = types.SimpleNamespace(layer_refs=refs, triangles=roads)
        mappings = [{'actor_label': FIXTURE['road_actor_label'], 'source_path': FIXTURE['road_record']['path']}]
        tiny = np.array([FIXTURE['terrain_raw_native_cm']], dtype=float)/100
        return road, api.NativeTriangleIndex(roads), api.NativeTriangleIndex(tiny), mappings

    def test_patch64_same_reference_window_predicts_actual_road_without_eligibility_filter(self):
        road, ri, ti, mappings = self.operands()
        original = {'native_frame': api.native_frame_record(), 'samples': [copy.deepcopy(FIXTURE['sample'])]}
        before = api.native_ray_population_contract(original['samples'])
        result = api.physical_ray_samples(original, FIXTURE['source_ray_file'], road, ri, ti, mappings, {'path':'terrain'})
        after = api.native_ray_population_contract(result['samples'])
        self.assertEqual(before, after)
        sample = result['samples'][0]
        self.assertEqual(sample['reference'], original['samples'][0]['reference'])
        self.assertEqual(sample['expected']['actor_label'], FIXTURE['road_actor_label'])
        self.assertAlmostEqual(sample['expected']['position_m'][2]*100, FIXTURE['actual_observed_road_height_cm'], places=11)
        self.assertEqual(sample['render_source_expected']['actor_label'], 'City_069_terrain')
        self.assertEqual(sample['support_eligibility'], 'NOT_EVALUATED_BY_CORRESPONDENCE')
        self.assertEqual(sample['start_m'], original['samples'][0]['start_m'])
        self.assertEqual(sample['end_m'], original['samples'][0]['end_m'])
        # A cook-safe first blocker with an ineligible signed normal stays first.
        upper = ri.triangles[0].copy(); upper[:, 2] = .6; upper = upper[[0,2,1]]
        roads = np.concatenate((road.triangles, upper[None]))
        refs = copy.deepcopy(road.layer_refs)+[dict(road.layer_refs[0], source=1)]
        first = api.physical_ray_samples(original, FIXTURE['source_ray_file'], types.SimpleNamespace(layer_refs=refs),
            api.NativeTriangleIndex(roads), ti, mappings+[{'actor_label':'ineligible-first', 'source_path':'upper'}], {'path':'terrain'})
        self.assertEqual(first['samples'][0]['expected']['actor_label'], 'ineligible-first')
        self.assertLess(first['samples'][0]['expected']['normal_enu'][2], .7)

    def test_miss_still_has_original_query_and_cross_actor_tie_refuses(self):
        road, ri, ti, mappings = self.operands()
        original = {'native_frame': api.native_frame_record(), 'samples':[copy.deepcopy(FIXTURE['sample'])]}
        empty = api.NativeTriangleIndex([])
        result = api.physical_ray_samples(original, FIXTURE['source_ray_file'], road, empty, empty, mappings, {'path':'terrain'})
        self.assertFalse(result['samples'][0]['expected_hit'])
        self.assertNotIn('expected', result['samples'][0])
        self.assertEqual(api.native_ray_population_contract(original['samples']), api.native_ray_population_contract(result['samples']))
        refs = [dict(road.layer_refs[0], source=i) for i in range(2)]
        with self.assertRaisesRegex(api.NativeCollisionModelError, 'tie'):
            api.physical_ray_samples(original, FIXTURE['source_ray_file'], types.SimpleNamespace(layer_refs=refs),
                api.NativeTriangleIndex(np.array([ri.triangles[0], ri.triangles[0]])), ti,
                mappings+[{'actor_label':'other-actor', 'source_path':'same-plane'}], {'path':'terrain'})

    def test_full1040_fixed_tuple_digests_and_shared_model_seal(self):
        reference = json.loads(api.admitted_record(FIXTURE['source_ray_file'], api.ROOT/'data/prepared', 32_000_000))
        contract = api.native_ray_population_contract(reference['samples'])
        self.assertEqual(contract, {'ordered_sample_count':1040, 'declared_query_modes':2080,
            'tuple_sha256':'cebc551eb311dbbde29bf896bc8460fcfd075a070b7b2c248b6d53ea832f96bc',
            'endpoints_modes_binary64_sha256':'604d708ac55b2c45e30a77154ab3e2a9a4d163785130e9ce344790f58c75b92d',
            'native_frame':api.native_frame_record(), 'native_endpoints_modes_binary64_sha256':'1fbe9193bb9212622f475727e007c9e7a0505b584789b24cca7d4fbc7979638e'})
        env = helper_functions()
        self.assertEqual(env['_support_fixed_ray_contract'](reference['samples']), contract)
        model = api.native_physical_model_record()
        self.assertEqual(model['definition_sha256'], 'e5ba1adad4fcab4e05d61d899babf8f6c789655cfe4637c393d7002f4f742428')
        historical_reference = copy.deepcopy(reference)
        reference = dict(reference, native_frame=api.native_frame_record())  # synthetic new-frame metadata, not new native proof
        rays = dict(reference, physical_query_model=model, fixed_reference_population=dict(record=FIXTURE['source_ray_file'], **contract))
        env['_support_read'] = lambda *args: json.dumps(reference).encode()
        self.assertEqual(env['_support_admit_physical_model']({'native_frame':api.native_frame_record(), 'physical_query_model':model}, rays, {}), model)
        env['_support_read'] = lambda *args: json.dumps(historical_reference).encode()
        with self.assertRaisesRegex(RuntimeError, 'ESU'): env['_support_admit_physical_model']({'native_frame':api.native_frame_record(), 'physical_query_model':model}, rays, {})
        env['_support_read'] = lambda *args: json.dumps(reference).encode()
        changed = copy.deepcopy(rays); changed['samples'][0]['start_m'][2] += .000001
        with self.assertRaisesRegex(RuntimeError, 'fixed query'):
            env['_support_admit_physical_model']({'native_frame':api.native_frame_record(), 'physical_query_model':model}, changed, {})
        with self.assertRaisesRegex(RuntimeError, 'unknown'):
            env['_support_admit_physical_model']({'native_frame':api.native_frame_record(), 'physical_query_model':dict(model, schema_version=2)}, rays, {})


class NativeContextTests(unittest.TestCase):
    def context(self):
        env = helper_functions()
        vec = lambda a: types.SimpleNamespace(x=a, y=a, z=a)
        rot = lambda: types.SimpleNamespace(pitch=0., yaw=0., roll=0.)
        enums = dict(CollisionTraceFlag=types.SimpleNamespace(CTF_USE_COMPLEX_AS_SIMPLE='complex'),
            CollisionEnabled=types.SimpleNamespace(QUERY_AND_PHYSICS='query+physics'),
            CollisionChannel=types.SimpleNamespace(ECC_VISIBILITY='visibility', ECC_WORLD_STATIC='static'),
            CollisionResponse=types.SimpleNamespace(ECR_BLOCK='block'),
            NaniteFallbackTarget=types.SimpleNamespace(PERCENT_TRIANGLES='percent'),
            NaniteGenerateFallback=types.SimpleNamespace(ENABLED='enabled'))
        actors, comparisons, mappings = [], [], []
        for i in range(26):
            label = 'City_069_terrain' if i == 25 else 'road'+str(i)
            path = '/mesh/'+str(i)
            body_values = dict(collision_trace_flag='complex', double_sided_geometry=False, mesh_collide_all=False, build_scale3d=vec(1.))
            body = types.SimpleNamespace(get_path_name=lambda:'/body', get_editor_property=body_values.__getitem__)
            nanite = types.SimpleNamespace(enabled=False, fallback_percent_triangles=1., fallback_relative_error=0., keep_percent_triangles=1., trim_relative_error=0., fallback_target='percent', generate_fallback='enabled')
            values = dict(body_setup=body, complex_collision_mesh=None, lod_for_collision=0, nanite_settings=nanite)
            mesh = types.SimpleNamespace(get_path_name=lambda p=path:p, get_editor_property=values.__getitem__, get_num_sections=lambda lod:1)
            component = types.SimpleNamespace(static_mesh=mesh, get_world_location=lambda:vec(0.), get_world_rotation=rot,
                get_world_scale=lambda:vec(1.), get_collision_enabled=lambda:'query+physics', get_collision_profile_name=lambda:'BlockAll',
                get_collision_object_type=lambda:'static', get_collision_response_to_channel=lambda channel:'block')
            component.get_path_name = lambda p=path:p+'/component'
            actor = types.SimpleNamespace(static_mesh_component=component, get_actor_label=lambda l=label:l, get_path_name=lambda p=path:p+'/actor',
                get_actor_location=lambda:vec(0.), get_actor_rotation=rot, get_actor_scale3d=lambda:vec(1.))
            actors.append(actor); comparisons.append(dict(asset=path, complete_rendered_geometry_multiset_equal=True))
            if i < 25: mappings.append(dict(actor_label=label, native_mesh_path=path))
        editor = types.SimpleNamespace(get_lod_build_settings=lambda mesh,lod:types.SimpleNamespace(get_editor_property=lambda key:vec(1.)), is_section_collision_enabled=lambda *args:True)
        env['unreal'] = types.SimpleNamespace(**enums, StaticMeshEditorSubsystem='editor', get_editor_subsystem=lambda _:editor,
            SystemLibrary=types.SimpleNamespace(get_engine_version=lambda:'5.8.3-58210709+++UE5+Release-5.8', get_console_variable_int_value=lambda name:1))
        def inspect(component):
            actor = next(a for a in actors if a.static_mesh_component is component)
            mesh=component.static_mesh;body=mesh.get_editor_property('body_setup');nanite=mesh.get_editor_property('nanite_settings')
            vector=lambda v:[v.x,v.y,v.z]
            rotation=lambda r:[r.pitch,r.yaw,r.roll]
            return json.dumps(dict(schema_version=1,observer='ue-public-static-mesh-collision-context-v1',available=True,editor_data_available=True,
                engine_version=env['unreal'].SystemLibrary.get_engine_version(),current_enable_mesh_clean=env['unreal'].SystemLibrary.get_console_variable_int_value('p.EnableMeshClean'),
                actor_path=actor.get_path_name(),component_path=component.get_path_name(),mesh_path=mesh.get_path_name(),body_path=body.get_path_name(),
                own_complex_source=mesh.get_editor_property('complex_collision_mesh') is None,
                collision_trace_flag='CTF_UseComplexAsSimple' if body.get_editor_property('collision_trace_flag')=='complex' else 'other',
                double_sided=body.get_editor_property('double_sided_geometry'),mesh_collide_all=body.get_editor_property('mesh_collide_all'),
                lod_for_collision=mesh.get_editor_property('lod_for_collision'),selected_collision_lod=0,
                section_collision_enabled=[editor.is_section_collision_enabled(mesh,0,i) for i in range(mesh.get_num_sections(0))],
                body_build_scale=vector(body.get_editor_property('build_scale3d')),render_build_scale=vector(editor.get_lod_build_settings(mesh,0).get_editor_property('build_scale3d')),
                actor_location_cm=vector(actor.get_actor_location()),actor_rotation=rotation(actor.get_actor_rotation()),actor_scale=vector(actor.get_actor_scale3d()),
                component_location_cm=vector(component.get_world_location()),component_rotation=rotation(component.get_world_rotation()),component_scale=vector(component.get_world_scale()),
                collision_enabled='QueryAndPhysics' if component.get_collision_enabled()=='query+physics' else 'other',collision_profile=component.get_collision_profile_name(),
                collision_object_type='ECC_WorldStatic' if component.get_collision_object_type()=='static' else 'other',
                visibility_response='ECR_Block' if component.get_collision_response_to_channel('visibility')=='block' else 'other',
                nanite_enabled=nanite.enabled,fallback_target='PercentTriangles' if nanite.fallback_target=='percent' else 'other',
                generate_fallback='Enabled' if nanite.generate_fallback=='enabled' else 'other',fallback_percent_triangles=nanite.fallback_percent_triangles,
                fallback_relative_error=nanite.fallback_relative_error,keep_percent_triangles=nanite.keep_percent_triangles,trim_relative_error=nanite.trim_relative_error))
        env['unreal'].ShibuyaRendererLibrary=types.SimpleNamespace(inspect_support_collision_context=inspect)
        env['_actors'] = lambda:types.SimpleNamespace(get_all_level_actors=lambda:actors)
        state = dict(manifest=dict(native_roads=mappings, native_assignment=dict(replacement_mesh_path='/mesh/25')),
            collision=comparisons[-1], road_collision_receipts=[dict(collision=row) for row in comparisons[:-1]], physical_query_model=api.native_physical_model_record())
        return env, state, actors

    def test_all26_current_context_and_unknown_scale_flags_version_refuse(self):
        env, state, actors = self.context()
        result = env['_support_physical_context'](state)
        self.assertTrue(result['passed'], result['issues'])
        self.assertEqual(len(result['colliders']), 26)
        self.assertIn('UNOBSERVED', result['historical_ddc_cook_time_flags'])
        actors[0].get_actor_scale3d = lambda:types.SimpleNamespace(x=2., y=1., z=1.)
        self.assertFalse(env['_support_physical_context'](state)['passed'])
        env['unreal'].SystemLibrary.get_engine_version = lambda:'5.8.4-999'
        self.assertFalse(env['_support_physical_context'](state)['passed'])
        env, state, actors = self.context()
        actors[0].static_mesh_component.static_mesh.get_editor_property = lambda name: (_ for _ in ()).throw(KeyError('unknown readback '+name))
        self.assertFalse(env['_support_physical_context'](state)['passed'])

    def test_unsupported_context_preserves_full2080_did_not_run_packet(self):
        env = helper_functions()
        original = json.loads(api.admitted_record(FIXTURE['source_ray_file'], api.ROOT/'data/prepared', 32_000_000))
        env['unreal'] = types.SimpleNamespace(UnrealEditorSubsystem='world', get_editor_subsystem=lambda _:types.SimpleNamespace(get_editor_world=lambda:object()))
        env['_support_physical_context'] = lambda state:dict(passed=False, status='DID_NOT_RUN_UNSUPPORTED_PHYSICAL_CONTEXT')
        retained = []
        env['_support_save_ray_failure'] = lambda packet:retained.append(packet) or {'packet':'retained'}
        state = dict(rays=original, manifest={'native_ray_samples':FIXTURE['source_ray_file']}, physical_query_model=api.native_physical_model_record())
        with self.assertRaisesRegex(RuntimeError, 'zero native queries'):
            env['_support_native_rays'](state)
        packet = retained[0]
        self.assertEqual((packet['declared_sample_count'], packet['declared_query_count']), (1040,2080))
        self.assertEqual((packet['query_count'], packet['failed_query_count'], packet['observed_succeeded_query_count']), (0,0,0))
        self.assertEqual(packet['did_not_run']['query_count'], 2080)
        self.assertFalse(packet['physical_context']['passed'])


if __name__ == '__main__':
    unittest.main()
