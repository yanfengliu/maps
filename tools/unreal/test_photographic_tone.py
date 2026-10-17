"""Mocked native property admission/control preservation; no lighting or image acceptance."""
import copy
from types import SimpleNamespace
import unittest

from photographic_policy import verify_photographic_policy
from test_mcp_run import helper_function


def controls(requested):
    def settings():
        result = SimpleNamespace(local_exposure_method="BILATERAL", local_exposure_highlight_contrast_scale=1.0,
                                 local_exposure_shadow_contrast_scale=1.0, local_exposure_detail_strength=1.0,
                                 local_exposure_blurred_luminance_blend=.6, local_exposure_middle_grey_bias=0.0)
        for name in tuple(vars(result)):
            setattr(result, "override_" + name, False)
        return result
    unreal = SimpleNamespace(PostProcessSettings=settings, AutoExposureMethod=SimpleNamespace(AEM_MANUAL="AEM_MANUAL"),
                             DynamicGlobalIlluminationMethod=SimpleNamespace(LUMEN="LUMEN"), ReflectionMethod=SimpleNamespace(LUMEN="LUMEN"),
                             LocalExposureMethod=SimpleNamespace(BILATERAL="BILATERAL"))
    namespace = {"unreal": unreal}
    create = helper_function("_exposure", namespace)
    observe = helper_function("_photographic_policy", namespace)
    native = create(requested)
    return native, {"photographic_tone": requested, "photographic_policy": observe(native)}, observe


class PhotographicToneTests(unittest.TestCase):
    def test_candidate_preserves_physical_camera_and_manual_control(self):
        baseline, baseline_witness, _ = controls(False)
        candidate, candidate_witness, _ = controls(True)
        verify_photographic_policy(baseline_witness, False)
        verify_photographic_policy(candidate_witness, True)
        base_physical = {key: value for key, value in vars(baseline).items() if "local_exposure" not in key}
        new_physical = {key: value for key, value in vars(candidate).items() if "local_exposure" not in key}
        self.assertEqual(base_physical, new_physical)

    def test_missing_false_or_changed_native_policy_never_admits_scoring(self):
        _, value, _ = controls(True)
        mutations = [{}, {"photographic_tone": False}, {"photographic_policy": None}]
        for name in value["photographic_policy"]:
            for field, bad in (("override", False), ("value", None)):
                changed = copy.deepcopy(value)
                changed["photographic_policy"][name][field] = bad
                mutations.append(changed)
        for changed in mutations:
            with self.subTest(changed=changed), self.assertRaisesRegex(RuntimeError, "Cannot score local-exposure candidate"):
                verify_photographic_policy(changed, True)

    def test_current_property_changes_are_observed_and_refused(self):
        native, value, observe = controls(True)
        native.camera_iso = 400
        current = {"photographic_tone": True, "photographic_policy": observe(native)}
        self.assertEqual(current["photographic_policy"]["camera_iso"]["value"], 400)
        self.assertEqual(value["photographic_policy"]["camera_iso"]["value"], 100)
        with self.assertRaisesRegex(RuntimeError, "camera_iso"):
            verify_photographic_policy(current, True)

    def test_requested_arm_cannot_replace_baseline_witness(self):
        _, baseline, _ = controls(False)
        with self.assertRaisesRegex(RuntimeError, "native opt-in"):
            verify_photographic_policy(baseline, True)
        with self.assertRaises(RuntimeError):
            verify_photographic_policy(baseline, "false")


if __name__ == "__main__":
    unittest.main()
