"""Admission for one fixed physical-camera/local-exposure experiment; no renderer claim."""
import math


def verify_photographic_policy(witness, requested):
    if type(requested) is not bool or type(witness.get("photographic_tone")) is not bool or witness["photographic_tone"] != requested:
        raise RuntimeError("Cannot score local-exposure candidate: native opt-in witness is missing or differs from the requested arm.")
    policy = witness.get("photographic_policy")
    if not isinstance(policy, dict):
        raise RuntimeError("Cannot score local-exposure candidate: current native camera/tone policy was not observed.")
    expected = {"auto_exposure_method": ("AEM_MANUAL", True), "auto_exposure_apply_physical_camera_exposure": (True, True),
                "camera_iso": (100.0, True), "camera_shutter_speed": (125.0, True), "depth_of_field_fstop": (8.0, True),
                "auto_exposure_bias": (0.0, True), "local_exposure_method": ("BILATERAL", requested),
                "local_exposure_highlight_contrast_scale": (.8 if requested else 1.0, requested),
                "local_exposure_shadow_contrast_scale": (.6 if requested else 1.0, requested),
                "local_exposure_detail_strength": (1.0, requested), "local_exposure_blurred_luminance_blend": (.6, requested),
                "local_exposure_middle_grey_bias": (0.0, requested)}
    for name, (wanted, override) in expected.items():
        item = policy.get(name)
        if not isinstance(item, dict) or type(item.get("override")) is not bool or item["override"] != override:
            raise RuntimeError(f"Cannot score local-exposure candidate: native {name} override is missing or differs from the fixed arm.")
        actual = item.get("value")
        if isinstance(wanted, str):
            valid = isinstance(actual, str) and wanted in actual
        elif type(wanted) is bool:
            valid = type(actual) is bool and actual == wanted
        else:
            valid = type(actual) in (int, float) and math.isfinite(actual) and abs(actual - wanted) <= 1e-5
        if not valid:
            raise RuntimeError(f"Cannot score local-exposure candidate: observed {name}={actual!r}; expected fixed {wanted!r}.")
    return policy
