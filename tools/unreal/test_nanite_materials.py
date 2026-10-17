"""Actual helper boundaries with mocked native materials/resources; no native rendering claim."""
import copy
from types import SimpleNamespace
import unittest

from test_mcp_run import helper_function


class Material:
    def __init__(self, path='/Game/City/Used/Material.Material'):
        self.path = path
        self.enabled = {'MATUSAGE_NANITE': True, 'MATUSAGE_SKELETAL_MESH': False}
        self.overrides = {'MATUSAGE_NANITE': False, 'MATUSAGE_SKELETAL_MESH': False}
        self.parameters = {'parent_chain': ['/InterchangeAssets/OriginalParent.OriginalParent'], 'texture': {'Photo': '/Game/City/Photo.Photo'}, 'scalar': {'Roughness': .9}, 'vector': {'BaseColor': [1, 1, 1, 1]}, 'static_switch': {'HasTexture': True}}
    def get_path_name(self):
        return self.path
    def get_class(self):
        return SimpleNamespace(get_name=lambda: 'MaterialInstanceConstant')


class NaniteMaterialTests(unittest.TestCase):
    def boundary(self, *, shader=(12, 37), override=True, enabled=True, saved=True, changed=False, other_usage=False):
        material, calls = Material(), []
        def set_usage(value, usage, yes_override, yes_value):
            calls.append(('override', value, usage, yes_override, yes_value))
            value.overrides[usage] = override
            value.enabled[usage] = enabled
            if changed:
                value.parameters['scalar']['Roughness'] = .1
            if other_usage:
                value.overrides['MATUSAGE_SKELETAL_MESH'] = True
        def stats(value):
            calls.append(('stats', value))
            return SimpleNamespace(num_vertex_shader_instructions=shader[0], num_pixel_shader_instructions=shader[1])
        def save(value, only_dirty):
            calls.append(('save', value, only_dirty))
            return saved
        library = SimpleNamespace(has_material_usage=lambda value, usage: value.enabled[usage],
                                  has_material_usage_override=lambda value, usage: value.overrides[usage],
                                  set_material_usage_override=set_usage, update_material_instance=lambda value: calls.append(('update', value)), get_statistics=stats)
        unreal = SimpleNamespace(MaterialInstanceConstant=Material, MaterialUsage=SimpleNamespace(MATUSAGE_NANITE='MATUSAGE_NANITE', MATUSAGE_SKELETAL_MESH='MATUSAGE_SKELETAL_MESH'),
                                 MaterialEditingLibrary=library, EditorAssetLibrary=SimpleNamespace(save_loaded_asset=save))
        namespace = {'unreal': unreal, '_material_parameter_state': lambda value: copy.deepcopy(value.parameters)}
        helper_function('_material_usage_state', namespace)
        helper_function('_nanite_material_status', namespace)
        return helper_function('_prepare_nanite_material', namespace), material, calls

    def test_transient_parent_true_still_requires_explicit_own_override_and_compile_before_save(self):
        prepare, material, calls = self.boundary()
        result = prepare(material)
        self.assertFalse(result['before_usage']['explicit_instance_override'])
        self.assertTrue(result['explicit_instance_override'])
        self.assertEqual(result['parameters_before'], result['parameters_after'])
        self.assertEqual([call[0] for call in calls], ['override', 'update', 'stats', 'save'])
        self.assertTrue(all(call[1] is material for call in calls))

    def test_missing_resource_and_bad_shader_maps_refuse_before_save(self):
        for shader in ((0, 37), (12, 0), (0, 0)):
            with self.subTest(shader=shader):
                prepare, material, calls = self.boundary(shader=shader)
                with self.assertRaisesRegex(RuntimeError, r'/Game/City/Used/Material.Material.*own completed shader resource'):
                    prepare(material)
                self.assertNotIn('save', [value[0] for value in calls])

    def test_false_usage_or_override_refuses_before_compilation_or_save(self):
        for options in ({'override': False}, {'enabled': False}):
            with self.subTest(options=options):
                prepare, material, calls = self.boundary(**options)
                with self.assertRaisesRegex(RuntimeError, 'explicit instance override'):
                    prepare(material)
                self.assertNotIn('stats', [value[0] for value in calls])
                self.assertNotIn('save', [value[0] for value in calls])

    def test_parameter_or_other_usage_mutation_refuses_before_save(self):
        for options in ({'changed': True}, {'other_usage': True}):
            with self.subTest(options=options):
                prepare, material, calls = self.boundary(**options)
                with self.assertRaisesRegex(RuntimeError, 'values changed'):
                    prepare(material)
                self.assertNotIn('save', [value[0] for value in calls])

    def test_failed_package_save_names_actual_material(self):
        prepare, material, calls = self.boundary(saved=False)
        with self.assertRaisesRegex(RuntimeError, r'/Game/City/Used/Material.Material.*refused to save'):
            prepare(material)
        self.assertEqual(calls[-1][0], 'save')

    def test_engine_or_plugin_material_can_never_be_changed(self):
        prepare, material, calls = self.boundary()
        material.path = '/InterchangeAssets/OriginalParent.OriginalParent'
        with self.assertRaisesRegex(RuntimeError, 'only the actual project'):
            prepare(material)
        self.assertEqual(calls, [])

    def test_actual_used_slots_are_deduplicated_without_scanning_unused_assets(self):
        used = Material()
        class Actor:
            static_mesh_component = SimpleNamespace(get_num_materials=lambda: 1, get_material=lambda index: used)
            def actor_has_tag(self, name):
                return name == 'ShibuyaSource'
            def get_actor_label(self):
                return 'ActualSource'
        actors = [Actor() for _ in range(112)]
        namespace = {'unreal': SimpleNamespace(StaticMeshActor=Actor), '_actors': lambda: SimpleNamespace(get_all_level_actors=lambda: actors)}
        inspect = helper_function('_used_city_materials', namespace)
        materials, slots = inspect()
        self.assertEqual(list(materials.values()), [used])
        self.assertEqual(len(slots), 112)
        actors.append(Actor())
        with self.assertRaisesRegex(RuntimeError, 'exactly112'):
            inspect()

    def test_parameter_snapshot_reads_native_parameter_families_and_parent_chain(self):
        class Base:
            def get_path_name(self):
                return '/InterchangeAssets/gltf/M_Default.M_Default'
        class Instance(Material):
            def get_editor_property(self, name):
                self.assert_parent = name
                return Base()
        material = Instance()
        texture = SimpleNamespace(get_path_name=lambda: '/Game/City/Photo.Photo')
        vector = SimpleNamespace(r=.1, g=.2, b=.3, a=1.)
        library, called = SimpleNamespace(), []
        for kind, value in [('texture', texture), ('scalar', .9), ('vector', vector), ('static_switch', True)]:
            setattr(library, 'get_' + kind + '_parameter_names', lambda asset, k=kind: [k + 'Name'])
            def getter(asset, name, k=kind, v=value):
                called.append((k, asset, name))
                return v
            setattr(library, 'get_material_instance_' + kind + '_parameter_value', getter)
        namespace = {'unreal': SimpleNamespace(MaterialInstanceConstant=Instance, Material=Base, MaterialEditingLibrary=library)}
        snapshot = helper_function('_material_parameter_state', namespace)(material)
        self.assertEqual(snapshot, {'parent_chain': ['/InterchangeAssets/gltf/M_Default.M_Default'],
                                   'texture': {'textureName': '/Game/City/Photo.Photo'}, 'scalar': {'scalarName': .9},
                                   'vector': {'vectorName': [.1, .2, .3, 1.]}, 'static_switch': {'static_switchName': True}})
        self.assertEqual({call[0] for call in called}, {'texture', 'scalar', 'vector', 'static_switch'})
        self.assertTrue(all(call[1] is material for call in called))

    def test_direct_project_material_compiles_and_saves_without_instance_override(self):
        class Base(Material):
            pass
        material, calls = Base(), []
        def set_usage(asset, usage, value):
            calls.append(('usage', asset))
            asset.enabled[usage] = value
        library = SimpleNamespace(has_material_usage=lambda asset, usage: asset.enabled[usage], set_base_material_usage=set_usage,
                                  recompile_material=lambda asset: calls.append(('compile', asset)) or '',
                                  get_statistics=lambda asset: calls.append(('stats', asset)) or SimpleNamespace(num_vertex_shader_instructions=12, num_pixel_shader_instructions=37))
        namespace = {'unreal': SimpleNamespace(Material=Base, MaterialInstanceConstant=type('Instance', (), {}),
                     MaterialUsage=SimpleNamespace(MATUSAGE_NANITE='MATUSAGE_NANITE', MATUSAGE_SKELETAL_MESH='MATUSAGE_SKELETAL_MESH'),
                     MaterialEditingLibrary=library, EditorAssetLibrary=SimpleNamespace(save_loaded_asset=lambda asset, dirty: calls.append(('save', asset)) or True)),
                     '_material_parameter_state': lambda asset: copy.deepcopy(asset.parameters)}
        helper_function('_material_usage_state', namespace)
        helper_function('_nanite_material_status', namespace)
        result = helper_function('_prepare_nanite_material', namespace)(material)
        self.assertIsNone(result['explicit_instance_override'])
        self.assertEqual([call[0] for call in calls], ['usage', 'compile', 'stats', 'save'])


if __name__ == '__main__':
    unittest.main()
