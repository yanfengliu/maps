"""Actual helper on seam/triangle/material fixtures and pinned data518; no native execution claim."""
import ast
import hashlib
import json
import os
from pathlib import Path
import stat
import struct
from types import SimpleNamespace as NS
import unittest

HELPER = Path(os.environ.get('SHIBUYA_SUPPORT_HELPER', Path(__file__).parents[2]/'Content/Python/shibuya_tools.py'))


def guarded_bytes(path):
    path = Path(path).absolute()
    for value in [*reversed(path.parents), path]:
        info = value.lstat()
        if stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & 1024:
            raise RuntimeError('Refused linked test input: '+str(value))
    return path.read_bytes()


class FrontageTests(unittest.TestCase):
    def setUp(self):
        self.tree = ast.parse(guarded_bytes(HELPER))
        nodes = [node for node in self.tree.body if isinstance(node, ast.FunctionDef) and node.name in
                 {'_source_to_native_cm', '_frontage_section_matches', '_frontage_material_observation', '_inspect_data518_frontage'}]
        self.env = {'math': __import__('math'), 'struct': struct, '_support_point_key': lambda p: struct.pack('<3f', *p),
                    '_vector': lambda p: [p.x, p.y, p.z]}
        exec(compile(ast.Module(body=nodes, type_ignores=[]), str(HELPER), 'exec'), self.env)
        self.points = [[0., 0., 0.], [100., 0., 0.], [0., 0., 100.]]
        self.vec = lambda p: NS(x=p[0], y=p[1], z=p[2])

    def match(self, positions, indices, uvs=None, normals=None, tangents=None):
        return self.env['_frontage_section_matches']([self.vec(p) for p in positions], indices,
            [NS(x=u, y=v) for u, v in uvs] if uvs is not None else [], self.points, normals, tangents)

    def test_normals_tangents_and_handedness_follow_actual_vertex_indices_at_uv_seams(self):
        normals=[self.vec([i,i+10,i+20]) for i in range(6)]
        tangents=[NS(tangent_x=self.vec([i+30,i+40,i+50]),flip_tangent_y=bool(i%2)) for i in range(6)]
        value=self.match(self.points*2,[0,1,2,3,5,4],[(0,0)]*6,normals,tangents)
        self.assertEqual(value['normal_count']['status'],'OBSERVED')
        self.assertEqual(value['tangent_count']['status'],'OBSERVED')
        self.assertEqual(value['corner_matches'][0][1]['local_frame']['normal_local'],[3,13,23])
        self.assertEqual(value['corner_matches'][0][1]['local_frame']['tangent_x_local'],[33,43,53])
        self.assertIs(value['corner_matches'][0][1]['local_frame']['flip_tangent_y'],True)
        frames=value['complete_position_triangles'][1]['local_frames']
        self.assertEqual([row['normal_local'][0] for row in frames],[3,5,4])
        self.assertEqual([row['tangent_x_local'][0] for row in frames],[33,35,34])
        self.assertEqual([row['flip_tangent_y'] for row in frames],[True,True,False])
        self.assertEqual(value['incident_triangles'][1]['local_frames'],frames)

    def test_incomplete_normal_tangent_populations_keep_available_indices_and_explicit_status(self):
        value=self.match(self.points,[2,0,1],normals=[self.vec([1,2,3])],tangents=[])
        self.assertEqual(value['normal_count'],{'status':'COUNT_MISMATCH','expected_vertices':3,'actual_values':1})
        self.assertEqual(value['tangent_count'],{'status':'UNAVAILABLE','expected_vertices':3,'actual_values':0})
        frames=value['incident_triangles'][0]['local_frames']
        self.assertEqual(frames[1]['normal_local'],[1,2,3])
        self.assertEqual(frames[0]['normal_status'],'COUNT_MISMATCH')
        self.assertIsNone(frames[0]['normal_local'])
        self.assertEqual(frames[0]['tangent_status'],'UNAVAILABLE')
        self.assertIsNone(frames[0]['flip_tangent_y'])
        self.assertEqual(self.match(self.points,[0,1,2])['normal_count']['actual_values'],None)

    def test_all_seam_uvs_and_complete_triangle_incidence_are_retained(self):
        value = self.match(self.points*2, [0, 1, 2, 3, 5, 4], [(0,0),(1,0),(0,1),(.2,.3),(.4,.5),(.6,.7)])
        self.assertEqual([len(row) for row in value['corner_matches']], [2,2,2])
        self.assertEqual(len(value['complete_position_triangles']), 2)
        self.assertEqual(value['complete_position_triangles'][1]['indices'], [3,5,4])
        self.assertEqual(value['corner_matches'][0][1]['uv0'], [.2,.3])
        self.assertEqual(value['complete_position_triangles'][1]['source_corner_candidates'], [[0],[2],[1]])

    def test_three_position_matches_on_different_triangles_are_not_a_face_match(self):
        value = self.match(self.points+[[200,200,200],[300,300,300]], [0,3,4,1,3,4,2,3,4])
        self.assertEqual([len(row) for row in value['corner_matches']], [1,1,1])
        self.assertEqual(len(value['incident_triangles']), 3)
        self.assertEqual(value['complete_position_triangles'], [])
        self.assertIsNone(value['incident_triangles'][0]['uv0'])

    def test_position_key_is_exact_float32_cm_without_epsilon_merge(self):
        moved = [list(p) for p in self.points]; moved[0][0] = .0001
        value = self.match(moved, [0,1,2])
        self.assertEqual(value['corner_matches'][0], [])
        self.assertEqual(value['complete_position_triangles'], [])

    def test_bad_uv_population_refuses_instead_of_defaulting_uv_zero(self):
        with self.assertRaisesRegex(RuntimeError, 'UV populations'):
            self.match(self.points, [0,1,2], [(0,0)])

    def test_all_indices_are_validated_even_unrelated_triangles(self):
        for indices in ([0,1,9], [3,4,99], [0,1]):
            with self.subTest(indices=indices), self.assertRaises(RuntimeError):
                self.match(self.points+[[200,200,200],[300,300,300]], indices)

    def test_effective_authored_parameters_do_not_claim_effective_shader_uv_identity(self):
        material = NS(get_path_name=lambda:'M')
        self.env['_material_parameter_state'] = lambda m: {'parent_chain': [], 'scalar': {'UVScale': 2}}
        node = NS(get_path_name=lambda:'N', get_class=lambda:NS(get_name=lambda:'FunctionCall'))
        self.env['unreal'] = NS(MaterialEditingLibrary=NS(get_material_used_textures=lambda m: [],
            get_material_property_input_node=lambda *args:node), MaterialProperty=NS(MP_BASE_COLOR='BaseColor'))
        value = self.env['_frontage_material_observation'](material)
        self.assertEqual(value['effective_parameters']['scalar'], {'UVScale': 2})
        self.assertEqual(value['effective_uv_transform']['status'], 'UNRESOLVED_GRAPH')
        self.assertNotIn('scale', value['effective_uv_transform'])
        self.assertEqual(value['base_color_input']['node'], 'N')

    def test_unavailable_material_observation_preserves_named_error(self):
        self.env['_material_parameter_state'] = lambda m: (_ for _ in ()).throw(ValueError('unavailable input'))
        self.env['unreal'] = NS(MaterialEditingLibrary=object())
        value = self.env['_frontage_material_observation'](NS(get_path_name=lambda:'M'))
        self.assertEqual(value['observation_error'], {'type':'ValueError','message':'unavailable input'})
        self.assertEqual(value['effective_uv_transform']['status'], 'UNRESOLVED_GRAPH')

    def test_public_diagnostic_is_an_actual_registered_production_method(self):
        cls = next(node for node in self.tree.body if isinstance(node,ast.ClassDef) and node.name=='ShibuyaCityTools')
        method = next(node for node in cls.body if isinstance(node,ast.FunctionDef) and node.name=='inspect_data518_frontage')
        self.assertEqual([ast.unparse(node) for node in method.decorator_list], ['toolset_registry.tool_call','staticmethod'])
        self.assertEqual(ast.unparse(method.body[-1]), 'return json.dumps(_inspect_data518_frontage())')
        self.assertEqual(method.args.args, [])

    def test_actual_helper_reads_section_slot_and_component_material_overrides(self):
        prefix='/Game/City/Tile_032/data518/StaticMeshes/'
        names=['City.City','City_3236dd05d9d071b3b6d961bb25f7fdda.City_3236dd05d9d071b3b6d961bb25f7fdda']
        function=next(node for node in self.tree.body if isinstance(node,ast.FunctionDef) and node.name=='_inspect_data518_frontage')
        vertices=[self.vec([131.5974884033203,-3031.615478515625,-11.907928466796875]),
                  self.vec([-1560.309326171875,-2828.30712890625,-11.84302806854248]),
                  self.vec([131.59820556640625,-3031.640380859375,5201.19189453125])]
        transform=NS(translation=self.vec([0,0,0]),scale3d=self.vec([1,1,1]),rotation=NS(x=0,y=0,z=0,w=1),transform_location=lambda value:value)
        material=lambda name:NS(get_path_name=lambda:name)
        slots=[NS(material_slot_name='slot0',material_interface=material('mesh0')),NS(material_slot_name='slot1',material_interface=material('mesh1'))]
        meshes=[NS(get_path_name=lambda name=name:prefix+name,get_num_sections=lambda lod:2,static_materials=slots) for name in names]
        class Actor:
            def __init__(self,mesh):self.static_mesh_component=NS(static_mesh=mesh,get_world_transform=lambda:transform,get_material=lambda slot:material('override'+str(slot)))
            def actor_has_tag(self,tag):return True
            def get_actor_label(self):return self.static_mesh_component.static_mesh.get_path_name()
            get_path_name=get_actor_label
            def get_actor_transform(self):return transform
        actors=[Actor(mesh) for mesh in meshes];self.env['_actors']=lambda:NS(get_all_level_actors=lambda:actors)
        reads=[];self.env['_support_read']=lambda record,bindings:reads.append(record)
        self.env['_frontage_material_observation']=lambda value:{'material':value.get_path_name()}
        self.env['unreal']=NS(StaticMeshActor=Actor,StaticMeshEditorSubsystem=object(),Vector=lambda *args:self.vec(args),
            get_editor_subsystem=lambda kind:NS(get_lod_material_slot=lambda mesh,lod,section:1-section),
            ProceduralMeshLibrary=NS(get_section_from_static_mesh=lambda mesh,lod,section:(vertices,[0,1,2],[],[NS(x=section,y=section)]*3,[])))
        result=self.env['_inspect_data518_frontage']()
        self.assertEqual(len(reads),1);self.assertEqual(result['complete_position_triangle_count'],4)
        self.assertEqual([section['material_slot'] for section in result['actors'][0]['sections']],[1,0])
        self.assertEqual(result['actors'][0]['sections'][0]['material_observation']['material'],'override1')
        self.assertEqual(result['actors'][0]['sections'][0]['mesh_material'],'mesh1')
        actors.append(actors[0])
        with self.assertRaisesRegex(RuntimeError,'exact two existing'):
            self.env['_inspect_data518_frontage']()

    def test_reference_is_the_pinned_actual_source_triangle_and_uvs(self):
        source = Path(os.environ.get('SHIBUYA_FRONTAGE_SOURCE', HELPER.parents[2]/'data/prepared/buildings/data518.glb'))
        payload = guarded_bytes(source)
        self.assertEqual(hashlib.sha256(payload).hexdigest(),'e037bf65778d307701badf616c09b243e6eaa5c1aca62d482f9e52bd98a06237')
        count = struct.unpack_from('<I', payload, 12)[0]; doc = json.loads(payload[20:20+count]); binary = payload[28+count:]
        def accessor(index):
            a=doc['accessors'][index];view=doc['bufferViews'][a['bufferView']];f={5126:'f',5125:'I',5123:'H'}[a['componentType']]
            n={'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']];stride=view.get('byteStride',struct.calcsize(f)*n)
            offset=view.get('byteOffset',0)+a.get('byteOffset',0)
            return [struct.unpack_from('<'+f*n,binary,offset+i*stride) for i in range(a['count'])]
        primitive=doc['meshes'][1]['primitives'][0];ids=[x[0] for x in accessor(primitive['indices'])][494*3:495*3]
        self.assertEqual(ids,[1482,1484,1483])
        position=accessor(primitive['attributes']['POSITION']);uv=accessor(primitive['attributes']['TEXCOORD_0'])
        function=next(node for node in self.tree.body if isinstance(node,ast.FunctionDef) and node.name=='_inspect_data518_frontage')
        expected=next(ast.literal_eval(node.value) for node in function.body if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='source_eun' for t in node.targets))
        self.assertEqual(expected,[list(position[i]) for i in ids])
        result_assignment=next(node for node in function.body if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='result' for t in node.targets))
        values={ast.literal_eval(k):v for k,v in zip(result_assignment.value.keys,result_assignment.value.values)}
        self.assertEqual(ast.literal_eval(values['source_uv0']),[list(uv[i]) for i in ids])


if __name__ == '__main__': unittest.main(verbosity=2)
