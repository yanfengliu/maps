"""Actual helper cleanup controls with synthetic native calls; no engine cleanup claim."""
import ast
import os
from pathlib import Path
from types import SimpleNamespace
import unittest


HELPER = Path(os.environ.get("SHIBUYA_SUPPORT_HELPER", Path(__file__).parents[2] / "Content/Python/shibuya_tools.py"))


class CaptureCleanupTests(unittest.TestCase):
    def setUp(self):
        tree = ast.parse(HELPER.read_text(encoding="utf-8"))
        function = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "_finish_capture")
        self.actor = object()
        self.destroyed = []
        self.result = {"changed": False}
        def destroy(actor):
            self.destroyed.append(actor)
            return True
        self.environment = {"_capture": {"actor": self.actor}, "_restore_capture_coverage": lambda _: self.result,
                            "_actors": lambda: SimpleNamespace(destroy_actor=destroy)}
        exec(compile(ast.Module(body=[function], type_ignores=[]), str(HELPER), "exec"), self.environment)

    def finish(self):
        return self.environment["_finish_capture"]()

    def fail_restore(self, error):
        def fail(_state):
            raise error
        self.environment["_restore_capture_coverage"] = fail

    def fail_destroy(self, error):
        def fail(actor):
            self.destroyed.append(actor)
            raise error
        self.environment["_actors"] = lambda: SimpleNamespace(destroy_actor=fail)

    def test_success_returns_existing_restore_receipt_only_after_checked_destroy(self):
        self.assertIs(self.finish(), self.result)
        self.assertEqual(self.destroyed, [self.actor])
        self.assertIsNone(self.environment["_capture"])

    def test_inactive_capture_requires_no_destruction(self):
        self.environment["_capture"] = None
        self.assertEqual(self.finish(), {"changed": False})
        self.assertEqual(self.destroyed, [])

    def test_false_native_destruction_cannot_report_success(self):
        self.environment["_actors"] = lambda: SimpleNamespace(destroy_actor=lambda actor: False)
        with self.assertRaisesRegex(RuntimeError, "did not destroy"):
            self.finish()
        self.assertIsNone(self.environment["_capture"])

    def test_nonboolean_native_destruction_cannot_report_success(self):
        for result in (None, 0, 1):
            with self.subTest(result=result):
                self.environment["_capture"] = {"actor": self.actor}
                self.environment["_actors"] = lambda: SimpleNamespace(destroy_actor=lambda actor: result)
                with self.assertRaisesRegex(RuntimeError, "did not destroy"):
                    self.finish()

    def test_native_destruction_exception_remains_the_primary_failure(self):
        error = RuntimeError("native destroy threw")
        self.fail_destroy(error)
        with self.assertRaises(RuntimeError) as caught:
            self.finish()
        self.assertIs(caught.exception, error)
        self.assertIsNone(self.environment["_capture"])

    def test_restoration_failure_still_destroys_and_preserves_original_exception(self):
        error = RuntimeError("native clipmap restore failed")
        self.fail_restore(error)
        with self.assertRaises(RuntimeError) as caught:
            self.finish()
        self.assertIs(caught.exception, error)
        self.assertEqual(self.destroyed, [self.actor])
        self.assertIsNone(self.environment["_capture"])

    def test_restore_primary_and_false_destroy_secondary_are_both_retained(self):
        error = RuntimeError("native clipmap restore failed")
        self.fail_restore(error)
        self.environment["_actors"] = lambda: SimpleNamespace(destroy_actor=lambda actor: False)
        with self.assertRaises(RuntimeError) as caught:
            self.finish()
        self.assertIs(caught.exception, error)
        self.assertIn("did not destroy", " ".join(error.__notes__))
        self.assertIsNone(self.environment["_capture"])

    def test_restore_primary_and_throwing_destroy_secondary_are_both_retained(self):
        error = RuntimeError("native clipmap restore failed")
        self.fail_restore(error)
        self.fail_destroy(RuntimeError("native destroy threw"))
        with self.assertRaises(RuntimeError) as caught:
            self.finish()
        self.assertIs(caught.exception, error)
        self.assertIn("native destroy threw", " ".join(error.__notes__))
        self.assertIsNone(self.environment["_capture"])


if __name__ == "__main__":
    unittest.main()
