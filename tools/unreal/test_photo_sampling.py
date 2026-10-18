"""Actual source helper on synthetic native properties; no native/photo verdict."""
import ast
import copy
import json
import math
import os
from pathlib import Path
from types import SimpleNamespace as NS
import unittest

HELPER = Path(os.environ.get("SHIBUYA_SUPPORT_HELPER", Path(__file__).parents[2]/"Content/Python/shibuya_tools.py"))


class Volume:
    def __init__(self, settings): self.settings = settings
    def get_actor_label(self): return "Shibuya_Exposure"
    def get_editor_property(self, name): return copy.deepcopy(self.settings)
    def set_editor_property(self, name, value):
        if name == "settings": self.settings = copy.deepcopy(value)


class Texture:
    def __init__(self):
        self.properties = dict(filter="TRILINEAR", lod_group="WORLD", srgb=True, lod_bias=0,
            max_texture_size=0, mip_gen_settings="FROM_GROUP", never_stream=False,
            virtual_texture_streaming=False, compression_settings="DEFAULT", num_cinematic_mip_levels=0, power_of_two_mode="NONE")
        self.writes = []
        self.dimensions = [2304, 2560]
    def get_path_name(self): return "/Game/Surface/TerrainPhoto/terrain-photo/Textures/terrain-photo_texture_0.terrain-photo_texture_0"
    def get_editor_property(self, name): return self.properties[name]
    def set_editor_property(self, name, value): self.writes.append((name,value)); self.properties[name] = value
    def blueprint_get_size_x(self): return self.dimensions[0]
    def blueprint_get_size_y(self): return self.dimensions[1]


class PhotoSamplingTests(unittest.TestCase):
    def setUp(self):
        tree = ast.parse(HELPER.read_text(encoding="utf-8"))
        names = {"_gsi_sampling_state", "_prepare_gsi_sampling", "_saved_photographic_tone", "_capture_photographic_tone", "_set_saved_photographic_tone", "_photographic_policy", "_exposure", "_daylight", "_saved_daylight_values"}
        nodes = [node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name in names]
        self.texture = Texture(); self.anisotropy = 8; self.saved = []; self.save_ok = True; self.map_ok = True
        self.volumes = []; self.map_saves = 0
        def settings():
            values = NS(local_exposure_method="BILATERAL", local_exposure_highlight_contrast_scale=1., local_exposure_shadow_contrast_scale=1., local_exposure_detail_strength=1., local_exposure_blurred_luminance_blend=.6, local_exposure_middle_grey_bias=0.)
            for key in list(vars(values)): setattr(values,"override_"+key,False)
            return values
        def save(asset, only_dirty): self.saved.append(asset); return self.save_ok
        def save_map(): self.map_saves += 1; return self.map_ok
        unreal = NS(Texture2D=Texture, TextureGroup=NS(TEXTUREGROUP_WORLD="WORLD"), TextureFilter=NS(TF_TRILINEAR="TRILINEAR",TF_DEFAULT="DEFAULT"),
            load_asset=lambda path:self.texture, SystemLibrary=NS(get_console_variable_int_value=lambda name:self.anisotropy, execute_console_command=lambda *args:None),
            EditorAssetLibrary=NS(save_loaded_asset=save), PostProcessVolume=Volume, DirectionalLight=type("Sun",(),{}), SkyLight=type("Sky",(),{}),
            PostProcessSettings=settings, AutoExposureMethod=NS(AEM_MANUAL="MANUAL"), LocalExposureMethod=NS(BILATERAL="BILATERAL"),
            DynamicGlobalIlluminationMethod=NS(LUMEN="LUMEN"), ReflectionMethod=NS(LUMEN="LUMEN"),
            LevelEditorSubsystem=object(), UnrealEditorSubsystem=object())
        unreal.get_editor_subsystem=lambda kind:NS(save_current_level=save_map,get_editor_world=lambda:object())
        self.env=dict(unreal=unreal, math=math, json=json, _support_read=lambda record,bindings:b"verified synthetic source", _actors=lambda:NS(get_all_level_actors=lambda:self.volumes), _require_complete_support=lambda:None)
        exec(compile(ast.Module(body=nodes,type_ignores=[]),str(HELPER),"exec"),self.env)

    def prepare(self, persist=True): return self.env["_prepare_gsi_sampling"](persist)
    def volume(self, enabled):
        value=Volume(self.env["_exposure"](enabled));self.volumes=[value];return value

    def test_public_appearance_methods_are_actual_registered_class_members(self):
        tree=ast.parse(HELPER.read_text(encoding="utf-8"))
        cls=next(node for node in tree.body if isinstance(node,ast.ClassDef) and node.name=="ShibuyaCityTools")
        methods={node.name:node for node in cls.body if isinstance(node,ast.FunctionDef)}
        for name in ("inspect_photographic_appearance","prepare_photo_sampling","set_photographic_tone"):
            self.assertIn(name,methods)
            self.assertEqual([ast.unparse(value) for value in methods[name].decorator_list],["toolset_registry.tool_call","staticmethod"])

    def test_original_trilinear_changes_only_shared_filter_and_checks_save(self):
        before=copy.deepcopy(self.texture.properties); result=self.prepare()
        self.assertEqual(self.texture.writes,[("filter","DEFAULT")]); before["filter"]="DEFAULT"
        self.assertEqual(self.texture.properties,before);self.assertEqual(self.saved,[self.texture]);self.assertTrue(result["saved"])

    def test_insufficient_or_noninteger_anisotropy_refuses_before_any_mutation(self):
        for bad in (0,1,3,True,"8"):
            self.anisotropy=bad
            with self.subTest(bad=bad),self.assertRaisesRegex(RuntimeError,"DID_NOT_RUN"):self.prepare()
        self.assertEqual((self.texture.writes,self.saved),([],[]))

    def test_unknown_filter_refuses_instead_of_reinterpreting_candidate(self):
        self.texture.properties["filter"]="NEAREST"
        with self.assertRaisesRegex(RuntimeError,"DID_NOT_RUN"):self.prepare()
        self.assertFalse(self.texture.writes);self.assertFalse(self.saved)

    def test_source_sampling_invariants_fail_before_mutation(self):
        for key,bad in (("lod_group","UI"),("srgb",False),("lod_bias",1)):
            original=self.texture.properties[key];self.texture.properties[key]=bad
            with self.subTest(key=key),self.assertRaisesRegex(RuntimeError,"DID_NOT_RUN"):self.prepare()
            self.texture.properties[key]=original
        self.texture.dimensions=[1024,1024]
        with self.assertRaisesRegex(RuntimeError,"DID_NOT_RUN"):self.prepare()
        self.assertFalse(self.texture.writes);self.assertFalse(self.saved)

    def test_changed_nontarget_property_is_failure_and_filter_is_rolled_back(self):
        original=self.texture.set_editor_property
        def mutate(name,value):
            original(name,value)
            if value=="DEFAULT":self.texture.properties["max_texture_size"]=1024
        self.texture.set_editor_property=mutate
        with self.assertRaisesRegex(RuntimeError,"changed beyond"):self.prepare()
        self.assertEqual(self.texture.properties["filter"],"TRILINEAR");self.assertFalse(self.saved)

    def test_failed_texture_save_remains_failure_and_restores_original_filter(self):
        self.save_ok=False
        with self.assertRaisesRegex(RuntimeError,"refused"):self.prepare()
        self.assertEqual(self.texture.properties["filter"],"TRILINEAR")

    def test_idempotent_default_saves_checked_policy_without_rewriting_other_fields(self):
        self.texture.properties["filter"]="DEFAULT"; result=self.prepare()
        self.assertFalse(result["changed"]);self.assertFalse(self.texture.writes);self.assertEqual(self.saved,[self.texture])

    def test_exact_saved_original_and_bilateral_policies_resolve(self):
        for enabled in (False,True):
            self.volume(enabled);self.assertIs(self.env["_saved_photographic_tone"](),enabled)

    def test_partial_or_custom_saved_tone_never_silently_selects_baseline(self):
        value=self.volume(True);value.settings.override_local_exposure_detail_strength=False
        with self.assertRaisesRegex(RuntimeError,"neither original"):self.env["_saved_photographic_tone"]()
        value=self.volume(True);value.settings.local_exposure_highlight_contrast_scale=.9
        with self.assertRaisesRegex(RuntimeError,"neither original"):self.env["_saved_photographic_tone"]()

    def test_missing_or_duplicate_volume_does_not_choose_unreviewed_tone(self):
        self.assertFalse(self.env["_saved_photographic_tone"]());value=self.volume(True);self.volumes.append(value)
        with self.assertRaisesRegex(RuntimeError,"expected one"):self.env["_saved_photographic_tone"]()

    def test_tone_persistence_changes_only_local_settings_and_checks_map_save(self):
        value=self.volume(False);value.settings.existing_coverage=240000.; before=copy.deepcopy(vars(value.settings))
        self.env["_set_saved_photographic_tone"](True,True)
        self.assertEqual(self.map_saves,1);self.assertTrue(self.env["_saved_photographic_tone"]())
        for name,wanted in before.items():
            if "local_exposure" not in name:self.assertEqual(getattr(value.settings,name),wanted)
        self.assertFalse(self.saved)

    def test_map_save_failure_restores_in_memory_policy_and_does_not_claim_saved(self):
        value=self.volume(False);before=copy.deepcopy(vars(value.settings));self.map_ok=False
        with self.assertRaisesRegex(RuntimeError,"refused"):self.env["_set_saved_photographic_tone"](True,True)
        self.assertEqual(vars(value.settings),before)

    def test_authored_daylight_uses_balanced_intensities_and_fresh_sky_capture(self):
        volume=self.volume(False);values={};recaptures=[]
        u=self.env['unreal'];sun=u.DirectionalLight();sky=u.SkyLight()
        for actor,name in ((sun,'sun'),(sky,'sky')):
            actor.light_component=NS(set_mobility=lambda value:None,set_intensity=lambda value,name=name:values.update({name:value}),set_atmosphere_sun_light=lambda value:None,set_editor_property=lambda *args:None,set_real_time_capture=lambda value:None,recapture_sky=lambda:recaptures.append('sky'))
            actor.set_actor_rotation=lambda *args:None;actor.set_actor_location=lambda *args:None;actor.get_actor_label=lambda:'light'
        u.Rotator=lambda **kwargs:kwargs;u.Vector=lambda *args:args
        u.ComponentMobility=NS(MOVABLE='MOVABLE');u.SkyLightSourceType=NS(SLS_CAPTURED_SCENE='CAPTURED')
        self.volumes=[sun,sky,volume];self.env['_daylight']()
        self.assertEqual(values,{'sun':25000.,'sky':4.});self.assertEqual(recaptures,['sky'])
        self.assertEqual(volume.settings.camera_iso,100.);self.assertEqual(volume.settings.camera_shutter_speed,125.);self.assertEqual(volume.settings.depth_of_field_fstop,8.)

    def test_normal_daylight_retains_saved_choice_and_physical_camera(self):
        for enabled in (False,True):
            value=self.volume(enabled);self.env["_daylight"]();self.assertIs(self.env["_saved_photographic_tone"](),enabled)
            self.assertEqual((value.settings.camera_iso,value.settings.camera_shutter_speed,value.settings.depth_of_field_fstop),(100.,125.,8.))
            self.assertEqual(value.settings.lumen_scene_view_distance,240000.)

    def test_capture_default_inherits_but_explicit_baseline_remains_false(self):
        resolve=self.env["_capture_photographic_tone"]
        self.volume(True);self.assertIs(resolve(False,True),True)
        with self.assertRaisesRegex(RuntimeError,"explicit original-tone control"):resolve(False,False)
        self.volume(False);self.assertIs(resolve(False,False),False);self.assertIs(resolve(True,False),True)


if __name__=="__main__":unittest.main()
