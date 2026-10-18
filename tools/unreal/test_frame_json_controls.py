"""Finite CLI/verifier/wrapper controls; real Unreal JSON execution is excluded."""
import ast
import copy
import importlib.util
import json
from pathlib import Path
import stat
import types
import unittest

ROOT=Path(__file__).absolute().parents[2]
def checked(path):
    for part in [*reversed(path.absolute().parents),path.absolute()]:
        info=part.lstat()
        if stat.S_ISLNK(info.st_mode) or getattr(info,'st_file_attributes',0)&1024:raise RuntimeError('Linked '+str(part))
    return path
path=checked(ROOT/'tools/unreal/mcp_run.py')
spec=importlib.util.spec_from_file_location('frame_json_subject',path);api=importlib.util.module_from_spec(spec);spec.loader.exec_module(api)
FRAME={'schema_version':1,'id':'native-centimetres-Xeast-Ysouth-Zup-v2','definition_sha256':'2099342528416aa9dcdceea63e6d2604974341d8248f3b1c7ccf287008759170'}
def fixture():
    cases=[]
    def add(name,frame,kind,admitted=False,alias=False):
        packet={'native_frame':frame} if name!='missing-frame' else {}
        cases.append(dict(name=name,input_json=json.dumps(packet),parsed=True,schema_json_type=kind,expected_schema_json_type=kind,
                          admitted=admitted,expected_admitted=admitted,passed=True,coercing_number_conversion_succeeded=alias,coerced_schema_value=1 if alias else None))
    add('number-one',FRAME,'Number',True);add('number-one-decimal',dict(FRAME,schema_version=1.),'Number',True)
    for name,value,kind in [('boolean-true',True,'Boolean'),('boolean-false',False,'Boolean'),('numeric-string','1','String'),('null-schema',None,'Null'),('array-schema',[],'Array'),('object-schema',{},'Object'),('wrong-number',2,'Number'),('zero-schema',0,'Number')]:
        add(name,dict(FRAME,schema_version=value),kind,alias=name in ('boolean-true','numeric-string'))
    add('missing-schema',{k:v for k,v in FRAME.items() if k!='schema_version'},'None');add('missing-frame',None,'None')
    add('extra-field',dict(FRAME,extra=True),'Number');add('old-frame',dict(FRAME,id='old'),'Number');add('wrong-seal',dict(FRAME,definition_sha256='wrong'),'Number')
    add('array-frame',[],'None');add('boolean-id',dict(FRAME,id=True),'Number');add('number-seal',dict(FRAME,definition_sha256=1),'Number')
    return dict(native_frame=FRAME,passed=True,case_count=18,coercing_alias_witnesses_refused=2,cases=cases)

class FrameJsonTests(unittest.TestCase):
    def test_literal_nullrhi_blank_map_fixed_command(self):
        command=api.frame_json_control_plan(Path('engine'),Path('project'),18931)
        self.assertEqual(command[1:4],[str(Path('project/ShibuyaUnreal.uproject')),'/Engine/Maps/Entry','-nullrhi'])
        self.assertNotIn('-d3d12',command);self.assertNotIn('-sm6',command);self.assertIn('-ModelContextProtocolPort=18931',command)

    def test_complete_independent_json_semantics(self):self.assertEqual(api.verify_frame_json_controls(fixture())['case_count'],18)

    def test_native_boolean_coercion_cannot_relabel_its_own_expected_value(self):
        result=fixture();row=result['cases'][2];row.update(admitted=True,expected_admitted=True)
        with self.assertRaisesRegex(RuntimeError,'parser type/admission'):api.verify_frame_json_controls(result)

    def test_missing_case_alias_and_wrong_marker_refuse(self):
        for mutate in (lambda r:r['cases'].pop(),lambda r:r['cases'][2].update(coercing_number_conversion_succeeded=False),lambda r:r.update(native_frame=dict(FRAME,schema_version=True))):
            result=fixture();mutate(result)
            with self.assertRaises(RuntimeError):api.verify_frame_json_controls(result)

    def test_fixed_registered_wrapper_forwards_actual_cpp_json_once_without_arguments(self):
        helper=checked(ROOT/'Content/Python/shibuya_tools.py');tree=ast.parse(helper.read_text(encoding='utf-8'))
        cls=next(n for n in tree.body if isinstance(n,ast.ClassDef) and n.name=='ShibuyaCityTools')
        node=copy.deepcopy(next(n for n in cls.body if isinstance(n,ast.FunctionDef) and n.name=='inspect_native_frame_json_controls'));node.decorator_list=[]
        calls=[]
        def actual():calls.append(());return json.dumps(fixture())
        env=dict(json=json,unreal=types.SimpleNamespace(ShibuyaRendererLibrary=types.SimpleNamespace(inspect_native_frame_json_controls=actual)))
        exec(compile(ast.Module(body=[node],type_ignores=[]),str(helper),'exec'),env)
        self.assertEqual(json.loads(env['inspect_native_frame_json_controls']()),fixture());self.assertEqual(calls,[()])

if __name__=='__main__':unittest.main()
