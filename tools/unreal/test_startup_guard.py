"""Project Python initialization follows native GIsEditor, without hiding editor errors."""
import builtins
from pathlib import Path
from types import SimpleNamespace
import unittest
from unittest.mock import patch


SCRIPT = Path(__file__).resolve().parents[2] / 'Content/Python/init_unreal.py'


def run_startup(source, *, editor, registration_error=None, import_error=None, missing_api=False):
    calls = []
    def register():
        calls.append('register')
        if registration_error:
            raise registration_error
    unreal = SimpleNamespace() if missing_api else SimpleNamespace(is_editor=lambda: editor)
    def importer(name, *args, **kwargs):
        calls.append('import:' + name)
        if name == 'unreal':
            return unreal
        if name == 'shibuya_tools':
            if import_error:
                raise import_error
            return SimpleNamespace(register=register)
        return builtins.__import__(name, *args, **kwargs)
    namespace = {'__builtins__': dict(vars(builtins), __import__=importer)}
    exec(compile(source, str(SCRIPT), 'exec'), namespace)
    return calls


class StartupGuardTests(unittest.TestCase):
    def test_game_context_never_imports_editor_tools_or_registration(self):
        calls = run_startup(SCRIPT.read_text(), editor=False, import_error=AttributeError('ToolsetDefinition unavailable in Game'))
        self.assertEqual(calls, ['import:unreal'])

    def test_editor_context_imports_and_registers_normally(self):
        calls = run_startup(SCRIPT.read_text(), editor=True)
        self.assertEqual(calls, ['import:unreal', 'import:shibuya_tools', 'register'])

    def test_editor_registration_failure_stays_visible(self):
        with self.assertRaisesRegex(RuntimeError, 'registration failed'):
            run_startup(SCRIPT.read_text(), editor=True, registration_error=RuntimeError('registration failed'))

    def test_editor_import_failure_stays_visible(self):
        with self.assertRaisesRegex(AttributeError, 'ToolsetDefinition'):
            run_startup(SCRIPT.read_text(), editor=True, import_error=AttributeError('ToolsetDefinition unavailable in Editor'))

    def test_missing_native_context_api_cannot_silently_skip_editor(self):
        with self.assertRaisesRegex(AttributeError, 'is_editor'):
            run_startup(SCRIPT.read_text(), editor=False, missing_api=True)


if __name__ == '__main__':
    unittest.main()
