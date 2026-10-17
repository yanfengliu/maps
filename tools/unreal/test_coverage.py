"""Offline opt-in coverage controls. Native objects/cvars are mocked; no lighting acceptance."""
import copy
import json
import math
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import mcp_run
import test_mcp_run
from test_mcp_run import capture_state, helper_function


def destroy_capture_actor(destroyed, actor):
    destroyed.append(actor)
    return True


def component_settings():
    settings = SimpleNamespace(camera_iso=100.0, auto_exposure_bias=0.0)
    for name, value in (("lumen_scene_view_distance", 20000.0), ("lumen_max_trace_distance", 20000.0),
                        ("lumen_scene_detail", 1.0), ("lumen_scene_lighting_quality", 1.0), ("lumen_surface_cache_resolution", 1.0)):
        setattr(settings, name, value)
        setattr(settings, "override_" + name, False)
    return settings


def envelope(state):
    state["full_crop_coverage"] = True
    original = {"lumen_scene_view_distance": 20000.0, "lumen_max_trace_distance": 20000.0,
                "lumen_scene_detail": 1.0, "lumen_surface_cache_resolution": 1.0, "lumen_scene_lighting_quality": 1.0}
    state["lumen_policy_before"] = {"component_pp": {name: {"value": value, "override": False} for name, value in original.items()},
                                  "cvars": {"r.LumenScene.GlobalSDF.ClipmapExtent": 2500.0}}
    state["lumen_capture_policy"] = {"component_pp": {name: {"value": value, "override": True} for name, value in (
        ("lumen_scene_view_distance", 240000.0), ("lumen_max_trace_distance", 240000.0),
        ("lumen_scene_detail", 2.0), ("lumen_surface_cache_resolution", 1.0))},
        "cvars": {"r.LumenScene.GlobalSDF.ClipmapExtent": 7500.0, "r.AOGlobalDistanceField.NumClipmaps": 4.0}}
    state["coverage_restoration"] = {"changed": True, "restored": True, "prior_extent_cm": 2500.0, "observed_restored_extent_cm": 2500.0}
    return state


class PolicyAdmissionTests(unittest.TestCase):
    def test_actual_policy_is_required_instead_of_opt_in_flag(self):
        state = envelope(capture_state())
        mcp_run.validate_capture_state(state, (35, -45, 35), (0, 0, 15), 2.2, 1, True)
        mutations = [("missing policy", lambda value: value.pop("lumen_capture_policy")),
                     ("missing original", lambda value: value.pop("lumen_policy_before")),
                     ("wrong mode", lambda value: value.update(full_crop_coverage=False)),
                     ("clipmap", lambda value: value["lumen_capture_policy"]["cvars"].update({"r.LumenScene.GlobalSDF.ClipmapExtent": 2500})),
                     ("clipmap count", lambda value: value["lumen_capture_policy"]["cvars"].update({"r.AOGlobalDistanceField.NumClipmaps": 3})),
                     ("missing prior", lambda value: value["lumen_policy_before"]["cvars"].clear())]
        for name in ("lumen_scene_view_distance", "lumen_max_trace_distance", "lumen_scene_detail", "lumen_surface_cache_resolution"):
            mutations += [(name + " override", lambda value, name=name: value["lumen_capture_policy"]["component_pp"][name].update(override=False)),
                          (name + " wrong", lambda value, name=name: value["lumen_capture_policy"]["component_pp"][name].update(value=0)),
                          (name + " nonfinite", lambda value, name=name: value["lumen_capture_policy"]["component_pp"][name].update(value=float("nan")))]
        for name, mutation in mutations:
            invalid = copy.deepcopy(state)
            mutation(invalid)
            with self.subTest(name=name), self.assertRaises(RuntimeError):
                mcp_run.validate_capture_state(invalid, (35, -45, 35), (0, 0, 15), 2.2, 1, True)
        with self.assertRaisesRegex(RuntimeError, "independently requested"):
            mcp_run.validate_capture_state(state, (35, -45, 35), (0, 0, 15), 2.2, 1)

    def test_scoring_refuses_missing_restoration_and_changed_original_policy(self):
        fixture = test_mcp_run.CaptureAdmissionTests()
        fixture.setUp()
        try:
            for state in (fixture.readiness, fixture.warmup, fixture.final):
                envelope(state)
            arguments = (fixture.readiness, fixture.warmup, fixture.final, [35, -45, 35], [0, 0, 15], 2.2, fixture.relative, fixture.started_ns, True)
            score = mcp_run.score_capture(*arguments)
            self.assertTrue(score["readiness_verified"])
            for change in ({}, {"changed": True, "restored": False}, {"changed": True, "restored": True, "prior_extent_cm": 2500, "observed_restored_extent_cm": 7500}):
                fixture.final["coverage_restoration"] = change
                with self.assertRaisesRegex(RuntimeError, "restoration was not observed"):
                    mcp_run.score_capture(*arguments)
            envelope(fixture.final)
            fixture.warmup["lumen_policy_before"]["component_pp"]["lumen_scene_detail"]["value"] = 1.5
            with self.assertRaisesRegex(RuntimeError, "original observed"):
                mcp_run.score_capture(*arguments)
        finally:
            fixture.doCleanups()


class HelperCoverageTests(unittest.TestCase):
    def namespace(self):
        cvars = {"r.LumenScene.GlobalSDF.ClipmapExtent": 2500.0, "r.AOGlobalDistanceField.NumClipmaps": 4.0,
                 "r.LumenScene.SurfaceCache.CardMinResolution": 4.0, "r.LumenScene.SurfaceCache.CardTexelDensityScale": 100.0}
        commands, destroyed = [], []
        def command(world, text):
            commands.append(text)
            if text.startswith("r.LumenScene.GlobalSDF.ClipmapExtent "):
                name, value = text.split()
                cvars[name] = float(value)
        stub = SimpleNamespace(SystemLibrary=SimpleNamespace(execute_console_command=command, get_console_variable_float_value=cvars.__getitem__))
        namespace = {"math": math, "unreal": stub, "_capture": None,
                     "_actors": lambda: SimpleNamespace(destroy_actor=lambda actor: destroy_capture_actor(destroyed, actor))}
        for name in ("_lumen_capture_policy", "_apply_capture_coverage", "_restore_capture_coverage", "_finish_capture"):
            helper_function(name, namespace)
        return namespace, cvars, commands, destroyed

    def test_policy_snapshots_actual_prior_and_leaves_physical_exposure_unchanged(self):
        namespace, cvars, _, _ = self.namespace()
        settings = component_settings()
        before = namespace["_lumen_capture_policy"](settings)
        coverage = namespace["_apply_capture_coverage"](object(), settings)
        self.assertEqual(coverage["before"], before)
        self.assertEqual(coverage["prior_extent_cm"], 2500)
        self.assertEqual(cvars["r.LumenScene.GlobalSDF.ClipmapExtent"], 2500)  # Capture start owns actual mutation.
        self.assertEqual((settings.camera_iso, settings.auto_exposure_bias), (100, 0))
        self.assertEqual((settings.lumen_scene_view_distance, settings.lumen_max_trace_distance, settings.lumen_scene_detail, settings.lumen_surface_cache_resolution), (240000, 240000, 2, 1))
        self.assertEqual(before["component_pp"]["lumen_scene_view_distance"]["value"], 20000)
        settings.lumen_scene_view_distance = 20000
        current = namespace["_lumen_capture_policy"](settings)
        self.assertEqual(current["component_pp"]["lumen_scene_view_distance"]["value"], 20000)
        self.assertEqual(coverage["before"], before)

    def test_finish_restores_actual_prior_and_destroys_only_owned_capture(self):
        namespace, cvars, commands, destroyed = self.namespace()
        actor = object()
        namespace["_capture"] = {"actor": actor, "world": object(), "coverage": {"prior_extent_cm": 3125.0}}
        cvars["r.LumenScene.GlobalSDF.ClipmapExtent"] = 7500
        restored = namespace["_finish_capture"]()
        self.assertTrue(restored["restored"])
        self.assertEqual(cvars["r.LumenScene.GlobalSDF.ClipmapExtent"], 3125)
        self.assertEqual(destroyed, [actor])
        self.assertIsNone(namespace["_capture"])
        self.assertEqual(commands, ["r.LumenScene.GlobalSDF.ClipmapExtent 3125"])

    def test_failed_restore_is_not_success_and_still_releases_actor_state(self):
        namespace, cvars, _, destroyed = self.namespace()
        namespace["unreal"].SystemLibrary.execute_console_command = lambda *_args: None
        actor = object()
        namespace["_capture"] = {"actor": actor, "world": object(), "coverage": {"prior_extent_cm": 2500.0}}
        cvars["r.LumenScene.GlobalSDF.ClipmapExtent"] = 7500
        with self.assertRaisesRegex(RuntimeError, "Cannot restore capture coverage"):
            namespace["_finish_capture"]()
        self.assertIsNone(namespace["_capture"])
        self.assertEqual(destroyed, [actor])

    def test_capture_start_failure_restores_cvar_after_actual_capture_boundary(self):
        namespace, cvars, _, destroyed = self.namespace()
        captured_extents = []
        settings = component_settings()
        component = SimpleNamespace(capture_scene=lambda: captured_extents.append(cvars["r.LumenScene.GlobalSDF.ClipmapExtent"]))
        component.set_editor_property = lambda name, value: setattr(component, name, value)
        component.get_editor_property = lambda name: getattr(component, name)
        texture = SimpleNamespace()
        texture.set_editor_property = lambda name, value: setattr(texture, name, value)
        actor = SimpleNamespace(capture_component2d=component, set_actor_rotation=lambda *_args: None)
        namespace["_actors"] = lambda: SimpleNamespace(destroy_actor=lambda actor: destroy_capture_actor(destroyed, actor), spawn_actor_from_class=lambda *_args: actor)
        stub = namespace["unreal"]
        stub.UnrealEditorSubsystem = object()
        stub.get_editor_subsystem = lambda _type: SimpleNamespace(get_editor_world=lambda: object())
        stub.EditorAssetLibrary = SimpleNamespace(list_assets=lambda *_args, **_kwargs: [])
        stub.Vector = lambda x, y, z: SimpleNamespace(x=x, y=y, z=z)
        stub.SceneCapture2D = object()
        stub.RenderingLibrary = SimpleNamespace(create_render_target2d=lambda *_args: texture)
        stub.TextureRenderTargetFormat = SimpleNamespace(RTF_RGBA8=2)
        stub.SceneCaptureSource = SimpleNamespace(SCS_FINAL_COLOR_LDR=2)
        stub.MathLibrary = SimpleNamespace(find_look_at_rotation=lambda *_args: None)
        stub.SystemLibrary.get_frame_count = lambda: 100
        def failed_witness(state):
            raise RuntimeError("Deliberate native readiness failure after capture")
        namespace.update(json=json, _exposure=lambda: settings, _capture_witness=failed_witness)
        start = helper_function("capture_view", namespace)
        with tempfile.TemporaryDirectory() as directory:
            namespace["PROJECT"] = Path(directory)
            with self.assertRaisesRegex(RuntimeError, "Deliberate native readiness failure"):
                start("artifacts/unreal/start.png", 35, -45, 35, full_crop_coverage=True)
        self.assertEqual(captured_extents, [7500])
        self.assertEqual(cvars["r.LumenScene.GlobalSDF.ClipmapExtent"], 2500)
        self.assertEqual(destroyed, [actor])
        self.assertIsNone(namespace["_capture"])

    def test_export_failure_still_restores_prior_and_releases_active_actor(self):
        namespace, cvars, _, destroyed = self.namespace()
        actor = object()
        def failed_export(*_args):
            raise RuntimeError("Deliberate native export failure")
        namespace["unreal"].RenderingLibrary = SimpleNamespace(export_render_target=failed_export)
        namespace["json"] = json
        export = helper_function("export_capture", namespace)
        with tempfile.TemporaryDirectory() as directory:
            namespace["PROJECT"] = Path(directory)
            namespace["_capture"] = {"actor": actor, "texture": object(), "world": object(), "coverage": {"prior_extent_cm": 3125.0}}
            cvars["r.LumenScene.GlobalSDF.ClipmapExtent"] = 7500
            with self.assertRaisesRegex(RuntimeError, "Deliberate native export failure"):
                export("artifacts/unreal/failed.png", finish=True)
        self.assertEqual(cvars["r.LumenScene.GlobalSDF.ClipmapExtent"], 3125)
        self.assertEqual(destroyed, [actor])
        self.assertIsNone(namespace["_capture"])

    def test_final_export_path_failures_restore_and_release_actual_helper_state(self):
        for name, relative, failure in (("suffix", "artifacts/unreal/final.txt", None),
                                        ("outside", "outside.png", None),
                                        ("resolution", "artifacts/unreal/final.png", "resolve"),
                                        ("validation", "artifacts/unreal/final.png", "is_relative_to")):
            namespace, cvars, _, destroyed = self.namespace()
            actor = object()
            export = helper_function("export_capture", namespace)
            with self.subTest(name=name), tempfile.TemporaryDirectory() as directory:
                namespace["PROJECT"] = Path(directory)
                namespace["_capture"] = {"actor": actor, "world": object(), "coverage": {"prior_extent_cm": 3125.0}}
                cvars["r.LumenScene.GlobalSDF.ClipmapExtent"] = 7500
                if failure:
                    with patch.object(Path, failure, side_effect=OSError("Deliberate path admission failure")), self.assertRaises(OSError):
                        export(relative, finish=True)
                else:
                    with self.assertRaisesRegex(RuntimeError, "use a .png path below"):
                        export(relative, finish=True)
                self.assertEqual(cvars["r.LumenScene.GlobalSDF.ClipmapExtent"], 3125)
                self.assertIsNone(namespace["_capture"])
                self.assertEqual(destroyed, [actor])

    def test_unfinished_invalid_export_retains_capture_for_retry(self):
        namespace, cvars, _, destroyed = self.namespace()
        actor = object()
        export = helper_function("export_capture", namespace)
        with tempfile.TemporaryDirectory() as directory:
            namespace["PROJECT"] = Path(directory)
            namespace["_capture"] = {"actor": actor, "world": object(), "coverage": {"prior_extent_cm": 2500.0}}
            cvars["r.LumenScene.GlobalSDF.ClipmapExtent"] = 7500
            with self.assertRaisesRegex(RuntimeError, "use a .png path below"):
                export("artifacts/unreal/final.txt", finish=False)
            self.assertEqual(cvars["r.LumenScene.GlobalSDF.ClipmapExtent"], 7500)
            self.assertIs(namespace["_capture"]["actor"], actor)
            self.assertEqual(destroyed, [])
            namespace["_finish_capture"]()


if __name__ == "__main__":
    unittest.main()
