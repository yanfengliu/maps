"""Offline actual-driver sweep controls; no native rendering or pixel acceptance claim."""
import ast
import copy
import importlib.util
import io
import json
import math
import os
import sys
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch


DRIVER = Path(os.environ.get("SHIBUYA_MCP_DRIVER", Path(__file__).with_name("mcp_run.py")))
spec = importlib.util.spec_from_file_location("capture_sweep_driver", DRIVER)
driver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(driver)


def fixed_views():
    tree = ast.parse(DRIVER.read_text(encoding="utf-8"))
    main = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "main")
    return ast.literal_eval(next(node.value for node in ast.walk(main) if isinstance(node, ast.Assign)
                                 and any(isinstance(target, ast.Name) and target.id == "views" for target in node.targets)))


def witness(args, frames):
    camera = [args[key] for key in ("east_m", "north_m", "height_m")]
    target = [args[key] for key in ("target_east_m", "target_north_m", "target_height_m")]
    direction = [b - a for a, b in zip(camera, target)]
    length = math.sqrt(sum(value * value for value in direction))
    component = "/Test/Capture.Component"
    return {"started": True, "persistent_state": True, "render_target_matches_capture": True,
            "full_crop_coverage": False, "lumen_gi_override": True, "lumen_reflections_override": True,
            "lumen_gi": "<DynamicGlobalIlluminationMethod.LUMEN: 1>", "lumen_reflections": "<ReflectionMethod.LUMEN: 1>",
            "capture_source": "<SceneCaptureSource.SCS_FINAL_COLOR_LDR: 2>", "render_target_format": "<TextureRenderTargetFormat.RTF_RGBA8: 2>",
            "target_gamma": 2.2, "post_process_blend_weight": 1.0, "width": 1280, "height": 720,
            "actual_camera_cm": [camera[0] * 100, -camera[1] * 100, camera[2] * 100], "actual_component_cm": [camera[0] * 100, -camera[1] * 100, camera[2] * 100],
            "forward_vector": [direction[0] / length, -direction[1] / length, direction[2] / length], "component_forward_vector": [direction[0] / length, -direction[1] / length, direction[2] / length],
            "capture_component": component, "native_capture_flags": {"component": component, "requests_persistent_state": True,
                "captures_every_frame": False, "gi_flag": True, "lumen_gi_flag": True, "sky_lighting_flag": True, "lighting_flag": True},
            "capture_frames": frames, "native_start_frame": 100, "native_current_frame": 100 + frames * 2,
            "native_frames_elapsed": frames * 2}


class CaptureClient:
    def __init__(self, evidence, invalid_lumen=None, invalid_readiness=None, failure=None, receipt=None, malformed_arm=None):
        self.evidence = evidence
        self.invalid_lumen = invalid_lumen
        self.invalid_readiness = invalid_readiness
        self.failure = failure
        self.receipt = {"changed": False} if receipt is None else receipt
        self.malformed_arm = malformed_arm
        self.calls = []
        self.active = None
        self.starts = []

    def project_tool(self, name, args=None):
        args = args or {}
        self.calls.append((name, copy.deepcopy(args)))
        if name == self.failure:
            raise RuntimeError("native MCP tool/protocol failure")
        if name == "capture_view":
            if self.active is not None:
                raise AssertionError("previous capture was not released")
            self.active = dict(args)
            self.starts.append(Path(args["relative_output"]).stem)
            result = witness(args, 1)
            if self.starts[-1] == self.invalid_readiness:
                result["native_capture_flags"]["gi_flag"] = False
        elif name == "advance_capture":
            result = {}
        elif name == "export_capture":
            result = witness(self.active, 80 if args.get("finish") else 60)
            result["path"] = args["relative_output"]
            if args.get("finish"):
                result["coverage_restoration"] = self.receipt
                mesh_cards = 0 if self.starts[-1] == self.invalid_lumen else 2
                with (self.evidence / "editor.log").open("a") as log:
                    log.write(f"*** LumenScene Stats ***\nMesh SDF Objects: 112\nMesh cards: {mesh_cards}\nCards: {mesh_cards * 7}\n")
                self.active = None
        elif name == "inspect_camera_surfaces":
            result = {"observed_probe": True, "fov_horizontal_degrees": 60.0}
        else:
            raise AssertionError(name)
        arm = "readiness" if name == "capture_view" else "final" if name == "export_capture" and args.get("finish") else "warmup" if name == "export_capture" else None
        return {"content": [{"type": "text", "text": "{broken native JSON" if arm == self.malformed_arm and arm else json.dumps(result)}]}


class CaptureSweepTests(unittest.TestCase):
    def setUp(self):
        directory = tempfile.TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.project = Path(directory.name)
        self.evidence = self.project / "artifacts/unreal/fresh"
        self.evidence.mkdir(parents=True)
        (self.evidence / "editor.log").write_text("")
        self.report = {"capture_readiness_gate": {"status": "did-not-run"}, "darkness_gate": {"status": "did-not-run"}}
        self.addCleanup(patch.stopall)
        patch.object(driver, "PROJECT", self.project).start()
        patch.object(driver.time, "sleep").start()
        self.score = patch.object(driver, "score_capture", side_effect=lambda r, w, c, *args: {
            **c, "readiness_verified": True, "pixel_metrics": {"passed": True}, "luma_settled": True}).start()
        self.views = fixed_views()

    def run_sweep(self, **kwargs):
        self.client = CaptureClient(self.evidence, **kwargs)
        driver.capture_views(self.client, self.evidence, self.views, 2.2, False, self.report)

    def test_fifth_view_zero_cards_retained_unscored_and_sixth_still_runs(self):
        self.run_sweep(invalid_lumen="crop")
        self.assertEqual(self.client.starts, [v[0] for v in self.views])
        self.assertEqual(self.client.starts[-1], "crop-opposite")
        self.assertIsNone(self.client.active)
        self.assertEqual(self.score.call_count, 5)
        self.assertTrue(all("/crop.png" not in call.args[2]["path"] for call in self.score.call_args_list))
        failure, = self.report["capture_failures"]
        self.assertEqual((failure["view"], failure["stage"]), ("crop", "lumen_scene"))
        self.assertFalse(failure["readiness_verified"])
        self.assertTrue(failure["cleanup_verified"])
        self.assertNotIn("pixel_metrics", failure["capture"])
        self.assertEqual(self.report["capture_readiness_gate"]["status"], "failed")
        self.assertEqual(self.report["darkness_gate"]["status"], "did-not-run")
        json.dumps(self.report, allow_nan=False)

    def test_early_invalid_readiness_finishes_capture_before_next_view(self):
        self.run_sweep(invalid_readiness="crossing")
        self.assertEqual([name for name, _ in self.client.calls[:3]], ["capture_view", "export_capture", "capture_view"])
        self.assertIs(self.client.calls[1][1]["finish"], True)
        self.assertEqual(self.report["capture_failures"][0]["stage"], "readiness")
        self.assertEqual(self.score.call_count, 5)
        self.assertIsNone(self.client.active)

    def test_native_tool_failure_is_fatal_and_does_not_start_another_view(self):
        for action in ("capture_view", "advance_capture", "export_capture"):
            with self.subTest(action=action):
                client = CaptureClient(self.evidence, failure=action)
                with self.assertRaisesRegex(RuntimeError, "tool/protocol failure"):
                    driver.capture_views(client, self.evidence, self.views, 2.2, False, self.report)
                self.assertLessEqual(len(client.starts), 1)
        self.score.assert_not_called()

    def test_malformed_capture_arm_decode_is_fatal_before_local_rejection(self):
        for arm in ("readiness", "warmup", "final"):
            with self.subTest(arm=arm), self.assertRaisesRegex(RuntimeError, "did not start|not a JSON object"):
                self.run_sweep(malformed_arm=arm)
            self.assertEqual(len(self.client.starts), 1)
            self.assertEqual(self.report["capture_failures"], [])
        self.score.assert_not_called()

    def test_unproven_cleanup_is_fatal_in_both_rejection_and_normal_paths(self):
        for invalid in (None, "crossing"):
            with self.subTest(invalid=invalid), self.assertRaisesRegex(RuntimeError, "cleanup receipt"):
                self.run_sweep(invalid_readiness=invalid, receipt={})
            self.assertEqual(len(self.client.starts), 1)
        self.score.assert_not_called()
        with self.assertRaisesRegex(RuntimeError, "cleanup receipt"):
            self.run_sweep(receipt={"changed": 0})
        self.assertEqual(len(self.client.starts), 1)

    def test_local_final_witness_rejection_continues_without_admission(self):
        self.score.side_effect = RuntimeError("native final witness rejected")
        self.run_sweep()
        self.assertEqual(len(self.client.starts), 6)
        self.assertEqual(len(self.report["capture_failures"]), 6)
        self.assertEqual(self.report["captures"], [])
        self.assertEqual(self.report["capture_readiness_gate"]["status"], "failed")

    def test_complete_positive_and_darkness_failure_remain_distinct(self):
        self.run_sweep()
        self.assertEqual(self.report["capture_readiness_gate"]["status"], "passed")
        self.assertEqual(self.report["darkness_gate"]["status"], "passed")
        self.score.side_effect = lambda r, w, c, *args: {**c, "pixel_metrics": {"passed": False}, "luma_settled": True}
        self.run_sweep()
        self.assertEqual(self.report["capture_readiness_gate"]["status"], "passed")
        self.assertEqual(self.report["darkness_gate"]["status"], "failed")

    def test_coverage_restoration_must_match_observed_original(self):
        before = {"lumen_policy_before": {"cvars": {"r.LumenScene.GlobalSDF.ClipmapExtent": 2500.0}}}
        restored = {"changed": True, "restored": True, "prior_extent_cm": 2500.0, "observed_restored_extent_cm": 2500.0}
        driver.verify_capture_finished({"coverage_restoration": restored}, before, True)
        for mutation in ({}, {"restored": False}, {"prior_extent_cm": 7500.0}, {"observed_restored_extent_cm": 7500.0}):
            with self.subTest(mutation=mutation), self.assertRaisesRegex(RuntimeError, "restoration"):
                driver.verify_capture_finished({"coverage_restoration": mutation if not mutation else {**restored, **mutation}}, before, True)

    def test_main_keeps_original_six_poses_and_fails_rejected_aggregate(self):
        self.assertEqual(self.views, [("crossing", 35, -45, 35, 0, 0, 15), ("crossing-west", -70, 20, 65, 0, 0, 15),
            ("block", 250, -300, 300, 0, 0, 15), ("block-north", -250, 300, 300, 0, 0, 15),
            ("crop", 850, -850, 700, 0, 0, 15), ("crop-opposite", -850, 850, 700, 0, 0, 15)])
        tree = ast.parse(DRIVER.read_text(encoding="utf-8"))
        main = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "main")
        guard = next(node for node in ast.walk(main) if isinstance(node, ast.If)
                     and ast.unparse(node.test) == "report['capture_readiness_gate']['status'] != 'passed'")
        self.assertTrue(any(isinstance(node, ast.Raise) for node in guard.body))

    def test_actual_main_glue_reaches_both_existing_probes_before_failed_aggregate(self):
        tree = ast.parse(DRIVER.read_text(encoding="utf-8"))
        main = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "main")
        for node in ast.walk(main):
            for field in ("body", "orelse"):
                body = getattr(node, field, None)
                if not isinstance(body, list):
                    continue
                for index, statement in enumerate(body):
                    if (isinstance(statement, ast.Expr) and isinstance(statement.value, ast.Call)
                            and isinstance(statement.value.func, ast.Name) and statement.value.func.id == "capture_views"):
                        # Execute the real production sweep -> two existing diagnostics -> aggregate refusal statements.
                        block = body[index:index + 3]
        function = ast.parse("def actual_glue(client,evidence,views,args,report):\n pass\n").body[0]
        function.body = block
        namespace = dict(driver.__dict__)
        exec(compile(ast.fix_missing_locations(ast.Module(body=[function], type_ignores=[])), str(DRIVER), "exec"), namespace)
        client = CaptureClient(self.evidence, invalid_lumen="crop")
        with self.assertRaisesRegex(RuntimeError, "readiness gate failed"):
            namespace["actual_glue"](client, self.evidence, self.views, SimpleNamespace(target_gamma=2.2, full_crop_coverage=False), self.report)
        probes = [args for name, args in client.calls if name == "inspect_camera_surfaces"]
        self.assertEqual(probes, [{"east_m": 35.0, "north_m": -45.0, "height_m": 35.0, "active_capture_stage": "", "relative_output_prefix": ""},
                                  {"east_m": -70.0, "north_m": 20.0, "height_m": 65.0, "active_capture_stage": "", "relative_output_prefix": ""}])
        self.assertEqual(len(self.report["camera_surface_samples"]), 2)

    def test_surface_full_crop_passes_options_before_any_engine_or_source_io(self):
        class OptionsAccepted(Exception): pass
        with patch.object(sys, "argv", [str(DRIVER), "surface", "--full-crop-coverage", "--surface-manifest", "photo.json", "--road-manifest", "roads.json"]), \
                patch.object(driver.Path, "read_text", side_effect=OptionsAccepted("reached existing version read")), \
                patch.object(driver.subprocess, "Popen") as launch:
            with self.assertRaises(OptionsAccepted): driver.main()
            launch.assert_not_called()

    def test_surface_only_cli_rejects_other_actions_before_engine_or_output(self):
        for action in ("render", "diagnose", "probe", "build"):
            with self.subTest(action=action), patch.object(sys, "argv", [str(DRIVER), action, "--surface-only"]), \
                    patch.object(sys, "stderr", io.StringIO()), patch.object(driver.subprocess, "Popen") as launch:
                with self.assertRaises(SystemExit) as error:
                    driver.main()
                self.assertEqual(error.exception.code, 2)
                self.assertIn("requires the surface action", sys.stderr.getvalue())
                launch.assert_not_called()

    def test_surface_only_runs_original_support_calls_and_leaves_appearance_dnr(self):
        tree = ast.parse(DRIVER.read_text(encoding="utf-8"))
        main = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "main")
        support = next(node for node in ast.walk(main) if isinstance(node, ast.If)
                       and ast.unparse(node.test) == "args.action == 'surface'")
        separation = next(node for node in ast.walk(main) if isinstance(node, ast.If)
                          and ast.unparse(node.test) == "args.surface_only")
        function = ast.parse("def actual_surface_branch(client,args,report):\n pass\n").body[0]
        function.body = [support, separation]
        namespace = dict(driver.__dict__)
        exec(compile(ast.fix_missing_locations(ast.Module(body=[function], type_ignores=[])), str(DRIVER), "exec"), namespace)
        calls = []
        def project_tool(name, args=None):
            calls.append(name)
            if name not in ("apply_photo_terrain", "apply_photo_roads"):
                raise AssertionError("surface-only reached appearance or unrelated tool")
            return {"content": [{"type": "text", "text": json.dumps({"map_saved": name == "apply_photo_roads"})}]}
        namespace["actual_surface_branch"](SimpleNamespace(project_tool=project_tool), SimpleNamespace(action="surface",
            surface_manifest="surface.json", road_manifest="roads.json", surface_only=True), self.report)
        self.assertEqual(calls, ["apply_photo_terrain", "apply_photo_roads"])
        self.assertTrue(self.report["photo_roads"]["map_saved"])
        self.assertEqual(self.report["capture_readiness_gate"]["status"], "did-not-run")
        self.assertEqual(self.report["darkness_gate"]["status"], "did-not-run")
        self.assertIn("appearance did-not-run", self.report["appearance_skip_reason"])
        self.score.assert_not_called()


if __name__ == "__main__":
    unittest.main()
