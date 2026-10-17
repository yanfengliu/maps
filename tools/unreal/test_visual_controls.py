"""Offline boundary controls. Mock native APIs deliberately; do not claim a renderer ran."""
import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import sys
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

import mcp_run
from test_mcp_run import capture_state, constant_png, helper_function


def exercise_runner(missing_readiness=False, native_exit_code=0, shutdown_mutation=None, close_error=False, surface_only=False, return_error=False, body_error=None):
    """Run the real main admission path with a mock MCP/editor and readable synthetic pixels."""
    module = mcp_run
    if os.environ.get("SHIBUYA_RUNNER_CONTROL_PATH"):
        spec = importlib.util.spec_from_file_location("retained_runner_control", os.environ["SHIBUYA_RUNNER_CONTROL_PATH"])
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    with tempfile.TemporaryDirectory() as directory:
        project = Path(directory)
        (project / "Config").mkdir()
        (project / "Content/Python").mkdir(parents=True)
        (project / "Content/Maps").mkdir()
        (project / "Content/Maps/Shibuya.umap").write_bytes(b"unchanged mocked city")
        (project / "ShibuyaUnreal.uproject").write_text("{}", encoding="utf-8")
        (project / "Config/DefaultEngine.ini").write_text("; pinned fixture config", encoding="utf-8")
        (project / "Content/Python/control.py").write_text("# pinned fixture helper", encoding="utf-8")
        runner_file = project / "tools/unreal/mcp_run.py"
        runner_file.parent.mkdir(parents=True)
        runner_file.write_bytes(Path(module.__file__).read_bytes())
        engine = project / "fake-engine"
        (engine / "Engine/Build").mkdir(parents=True)
        (engine / "Engine/Build/Build.version").write_text(json.dumps({"MajorVersion": 5, "MinorVersion": 8, "PatchVersion": 3}), encoding="utf-8")
        class Process:
            pid = 999001  # No process is created; this is only a labelled mock.
            returncode = None
            def poll(self):
                return self.returncode
            def wait(self, timeout):
                return self.returncode
        process = Process()
        def launch_mock(*args, **kwargs):
            process.log = kwargs["stdout"]
            kwargs["stdout"].write('LogRHI: Using Highest Feature Level of D3D12: SM6\nLogCsvProfiler: Metadata set : rhifeaturelevel="SM6"\nLogCsvProfiler: Metadata set : shaderplatform="PCD3D_SM6"\n')
            kwargs["stdout"].flush()
            return process
        class Client:
            url = "http://127.0.0.1:18758/mcp"
            def initialize(self):
                return {}
            def request(self, _name):
                return {"tools": [{"name": value} for value in ("list_toolsets", "describe_toolset", "call_tool")]}
            def call(self, *_args):
                return {}
            def close(self):
                if close_error:
                    raise RuntimeError("Deliberate native MCP close failure")
            def project_tool(self, name, arguments=None):
                arguments = arguments or {}
                if name == "inspect_render_setup" and body_error is not None:
                    raise body_error
                if name == "capture_view":
                    self.camera = [arguments[key] for key in ("east_m", "north_m", "height_m")]
                    self.target = [arguments[key] for key in ("target_east_m", "target_north_m", "target_height_m")]
                    self.frames = 1
                    value = {} if missing_readiness else capture_state(self.camera, self.target)
                elif name == "advance_capture":
                    self.frames += 1
                    if self.frames == 80:
                        process.log.write('LogRenderer: *** LumenScene Stats ***\nLogRenderer: Mesh SDF Objects: 112\nLogRenderer: Mesh cards: 25\nLogRenderer: Cards: 150\n')
                        process.log.flush()
                    value = {"capture_frames": self.frames}
                elif name == "export_capture":
                    path = project / arguments["relative_output"]
                    constant_png(path, 80, 1280, 720)
                    value = capture_state(self.camera, self.target, self.frames)
                    value.update(path=arguments["relative_output"], sha256=hashlib.sha256(path.read_bytes()).hexdigest(), native_pixel_prefix_unchanged=True)
                    if arguments.get("finish"):
                        value["coverage_restoration"] = {"changed": False}
                elif name == "shutdown_editor":
                    process.returncode = native_exit_code
                    if shutdown_mutation:
                        with (project / shutdown_mutation).open("ab") as stream:
                            stream.write(b"\n# deliberate shutdown mutation")
                    value = "Mock cleanup complete"
                elif name == "inspect_scene":
                    value = {"engine_version": "5.8.3-mocked", "static_mesh_actor_count": 1, "static_mesh_actors": []}
                else:
                    value = {}
                return {"content": [{"type": "text", "text": json.dumps({"returnValue": json.dumps(value)})}]}
        action = "surface" if surface_only else "render"
        arguments = ["mcp_run.py", action, "--engine", str(engine)]
        if surface_only:
            arguments += ["--surface-only", "--surface-manifest", "fixture-surface.json", "--road-manifest", "fixture-roads.json"]
        caught_error = None
        with patch.object(module, "PROJECT", project), patch.object(module, "__file__", str(runner_file)), patch.object(module, "UnrealMcp", return_value=Client()), \
             patch.object(module.subprocess, "Popen", side_effect=launch_mock), patch.object(module.socket, "socket"), \
             patch.object(module.time, "sleep"), patch.object(module.time, "strftime", return_value="offline-control"), \
             patch.object(sys, "argv", arguments), contextlib.redirect_stdout(io.StringIO()):
            try:
                module.main()
            except BaseException as error:
                caught_error = error
        report = json.loads((project / f"artifacts/unreal/{action}-offline-control/report.json").read_text())
        return (report, caught_error) if return_error else report


class RunnerBoundaryTests(unittest.TestCase):
    def test_real_runner_does_not_score_missing_native_readiness(self):
        report = exercise_runner(missing_readiness=True)
        self.assertFalse(report["passed"])
        self.assertEqual(report["darkness_gate"]["status"], "did-not-run")
        self.assertEqual(report["captures"], [])

    def test_real_runner_admits_complete_observed_mock_capture_contract(self):
        report = exercise_runner()
        self.assertTrue(report["passed"])
        self.assertEqual(report["capture_readiness_gate"]["status"], "passed")
        self.assertEqual(len(report["captures"]), 6)
        self.assertTrue(all(item["readiness_verified"] for item in report["captures"]))


    def test_shipped_main_rejects_nonzero_native_exit_after_successful_body(self):
        report, error = exercise_runner(native_exit_code=17, surface_only=True, return_error=True)
        self.assertFalse(report["passed"])
        self.assertEqual(report["owned_editor_exit_code"], 17)
        self.assertTrue(report["owned_editor_stopped"])
        self.assertIsInstance(error, RuntimeError)  # The shipped __main__ leaves this unhandled, producing nonzero Python exit.
        self.assertIn("exit_code=17", str(error))

    def test_shipped_main_rejects_each_protected_input_mutated_during_shutdown(self):
        for path in ("ShibuyaUnreal.uproject", "Config/DefaultEngine.ini", "Content/Python/control.py", "tools/unreal/mcp_run.py"):
            with self.subTest(path=path):
                report, error = exercise_runner(shutdown_mutation=path, surface_only=True, return_error=True)
                self.assertFalse(report["passed"])
                self.assertFalse(report["protected_inputs_unchanged_after_shutdown"])
                self.assertIsInstance(error, RuntimeError)
                self.assertIn("implementation changed during editor shutdown", str(error))
                self.assertNotEqual(report["implementation_sha256"][path], report["implementation_sha256_after_shutdown"][path])

    def test_shipped_main_preserves_primary_and_finalization_failures(self):
        report, error = exercise_runner(missing_readiness=True, native_exit_code=17, close_error=True, return_error=True)
        self.assertFalse(report["passed"])
        self.assertIsInstance(error, RuntimeError)
        self.assertIn("native persistent capture did not start", str(error))
        self.assertEqual(report["error"], str(error))
        self.assertTrue(report["owned_editor_stopped"])
        self.assertTrue(any("native MCP close failure" in entry for entry in report["finalization_errors"]))
        self.assertTrue(any("exit_code=17" in entry for entry in report["finalization_errors"]))
        self.assertIn("Native gate finalization also failed", " ".join(error.__notes__))

    def test_shipped_main_interrupted_body_remains_failed_and_preserves_baseexception(self):
        for interruption in (KeyboardInterrupt("Deliberate interrupted body"), SystemExit(23)):
            with self.subTest(interruption=type(interruption).__name__):
                report, error = exercise_runner(body_error=interruption, surface_only=True, return_error=True)
                self.assertFalse(report["passed"])
                self.assertIs(error, interruption)
                self.assertTrue(report["owned_editor_stopped"])
                self.assertEqual(report["owned_editor_exit_code"], 0)
                self.assertTrue(report["protected_inputs_unchanged_after_shutdown"])

    def test_shipped_main_session_close_failure_cannot_return_success(self):
        report, error = exercise_runner(close_error=True, surface_only=True, return_error=True)
        self.assertFalse(report["passed"])
        self.assertTrue(report["owned_editor_stopped"])
        self.assertIsInstance(error, RuntimeError)
        self.assertIn("native MCP close failure", str(error))



class NativeWitnessTests(unittest.TestCase):
    def test_witness_reads_current_objects_instead_of_replaying_requested_state(self):
        component_path = "/Game/Maps/Test.Capture.Component"
        vector = SimpleNamespace(x=3500, y=-4500, z=3500)
        forward = SimpleNamespace(x=-.579324, y=.744845, z=-.331042)
        settings = SimpleNamespace(override_dynamic_global_illumination_method=True, dynamic_global_illumination_method="LUMEN",
                                   override_reflection_method=True, reflection_method="LUMEN")
        for name, value in (("lumen_scene_view_distance", 20000), ("lumen_max_trace_distance", 20000),
                            ("lumen_scene_detail", 1), ("lumen_scene_lighting_quality", 1), ("lumen_surface_cache_resolution", 1)):
            setattr(settings, name, value)
            setattr(settings, "override_" + name, False)
        for name in ("auto_exposure_method", "auto_exposure_apply_physical_camera_exposure", "camera_iso", "camera_shutter_speed",
                     "depth_of_field_fstop", "auto_exposure_bias", "local_exposure_method", "local_exposure_highlight_contrast_scale",
                     "local_exposure_shadow_contrast_scale", "local_exposure_detail_strength", "local_exposure_blurred_luminance_blend", "local_exposure_middle_grey_bias"):
            setattr(settings, name, 1)
            setattr(settings, "override_" + name, False)
        texture = SimpleNamespace(render_target_format="RGBA8", target_gamma=2.2, size_x=1280, size_y=720)
        texture.get_editor_property = lambda name: getattr(texture, name)
        component = SimpleNamespace(always_persist_rendering_state=True, texture_target=texture, post_process_blend_weight=1, use_ray_tracing_if_enabled=False,
                                    capture_source="LDR", get_editor_property=lambda name: settings,
                                    get_path_name=lambda: component_path, get_world_location=lambda: vector,
                                    get_forward_vector=lambda: forward)
        actor = SimpleNamespace(capture_component2d=component, get_actor_location=lambda: vector, get_actor_forward_vector=lambda: forward)
        flags = {"component": component_path, "gi_flag": True}
        unreal_stub = SimpleNamespace(SystemLibrary=SimpleNamespace(get_frame_count=lambda: 280, get_console_variable_float_value=lambda name: 2500),
            ShibuyaRendererLibrary=SimpleNamespace(inspect_world_resources=lambda world: json.dumps({"scene_captures": [flags]})))
        namespace = {"unreal": unreal_stub, "json": json}
        helper_function("_vector", namespace)
        helper_function("_lumen_capture_policy", namespace)
        helper_function("_photographic_policy", namespace)
        observe = helper_function("_capture_witness", namespace)
        state = {"actor": actor, "texture": texture, "world": object(), "frames": 80, "native_start_frame": 100}
        first = observe(state)
        component.always_persist_rendering_state = False
        vector.x = 3600
        texture.render_target_format = "RGBA32F"
        settings.lumen_scene_view_distance = 5000
        flags["gi_flag"] = False
        second = observe(state)
        self.assertTrue(first["persistent_state"])
        self.assertFalse(second["persistent_state"])
        self.assertEqual(second["actual_camera_cm"][0], 3600)
        self.assertEqual(second["render_target_format"], "RGBA32F")
        self.assertFalse(second["native_capture_flags"]["gi_flag"])
        self.assertEqual(second["lumen_capture_policy"]["component_pp"]["lumen_scene_view_distance"]["value"], 5000)
        self.assertEqual(second["native_frames_elapsed"], 180)
        component.use_ray_tracing_if_enabled = True
        self.assertFalse(first["capture_uses_ray_tracing_if_enabled"])
        self.assertTrue(observe(state)["capture_uses_ray_tracing_if_enabled"])
        self.assertFalse(observe(state)["hardware_ray_tracing_requested"])
        del unreal_stub.ShibuyaRendererLibrary
        with self.assertRaisesRegex(RuntimeError, "compiled ShibuyaRendererLibrary is unavailable"):
            observe(state)


if __name__ == "__main__":
    unittest.main()
