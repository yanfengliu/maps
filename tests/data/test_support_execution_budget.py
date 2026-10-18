"""Offline execution-limit validation; no source generation or runtime claim."""
import pathlib
import sys
import unittest
import json
import tempfile
from unittest import mock

ROOT=pathlib.Path(__file__).absolute().parents[2]
sys.path[:0]=[str(ROOT/'tools/data'),str(ROOT/'data/runtime')]
import surface_network as source


class SupportExecutionBudgetTests(unittest.TestCase):
    def test_original_defaults_and_explicit_calibrated_limits(self):
        self.assertEqual((source.DEFAULT_SUPPORT_CONSTRUCTION_SECONDS,source.DEFAULT_SUPPORT_TOTAL_SECONDS),(110,150))
        self.assertEqual(source.support_execution_budget(110,150),(110.,150.))
        self.assertEqual(source.support_execution_budget(300,450),(300.,450.))

    def test_invalid_or_unbounded_limits_are_refused(self):
        for limits in ((0,150),(-1,150),(110,0),(True,150),('110',150),
                       (float('nan'),150),(110,float('inf'))):
            with self.subTest(limits=limits),self.assertRaisesRegex(ValueError,'finite positive'):
                source.support_execution_budget(*limits)
        for limits in ((300,150),(300,601),(10**400,600)):
            with self.subTest(limits=limits),self.assertRaisesRegex(ValueError,'construction <= total <= 600s'):
                source.support_execution_budget(*limits)




class SupportStagingTests(unittest.TestCase):
    def test_actual_parser_refuses_stage_without_support_or_with_fetch(self):
        for argv in (['--support-stage-only'],['--support-stage-only','--network-only'],['--support-stage-only','--support-only','--fetch']):
            with self.subTest(argv=argv),mock.patch.object(source,'verify_base') as verify,mock.patch.object(source,'Surface') as world:
                with self.assertRaises(SystemExit) as result:source.main(argv)
                self.assertEqual(result.exception.code,2);verify.assert_not_called();world.assert_not_called()
    def complete(self,promote):
        with tempfile.TemporaryDirectory() as tmp:
            root=pathlib.Path(tmp);out=root/'data/prepared/surface';stage=out/'generations/one';stage.mkdir(parents=True)
            (root/'data/source/provenance').mkdir(parents=True)
            old=b'{"old_active":true}';new=b'{"new_admitted_generation":true}'
            active=out/'support-surface-manifest.json';active.write_bytes(old);(stage/'support-surface-manifest.json').write_bytes(new)
            with mock.patch.object(source,'ROOT',root),mock.patch.object(source,'OUT',out):
                observed=[];result=source.finish_support_generation(stage,new,{'unit_bound':'completion transaction after admission'},promote=promote,before_promotion=lambda:observed.append('checked'))
                self.assertEqual(observed,['checked']);self.assertEqual((stage/'support-surface-manifest.json').read_bytes(),new)
                if promote:
                    self.assertEqual(active.read_bytes(),new);self.assertEqual(result['status'],'validated-ready-for-single-switch')
                    self.assertEqual(len(list((root/'data/source/provenance').iterdir())),1)
                else:
                    self.assertEqual(active.read_bytes(),old);self.assertEqual(result['status'],'validated-staged-not-active')
                    self.assertFalse(result['active_manifest_changed']);self.assertEqual(result['support_surface']['sha256'],source.sha(new))
                    self.assertEqual(list((root/'data/source/provenance').iterdir()),[])
                    self.assertFalse((stage/'promotion.json').exists());self.assertTrue((stage/'staging.json').exists())
    def test_actual_completion_staging_keeps_alias_and_default_still_switches(self):
        self.complete(False);self.complete(True)


    def test_real_parent_wrapper_passes_stage_choice_to_the_existing_constructor(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=pathlib.Path(tmp);out=root/'data/prepared/surface';out.mkdir(parents=True)
            with mock.patch.object(source,'ROOT',root),mock.patch.object(source,'OUT',out),mock.patch.object(source,'_prepare_support_surface',autospec=True,return_value={'fixture':'no-source-constructor'}) as construct:
                result=source.prepare_support_surface({},promote=False)
                self.assertEqual(result,{'fixture':'no-source-constructor'})
                self.assertFalse(construct.call_args.kwargs['promote'])
                self.assertEqual(construct.call_args.kwargs['construction_seconds'],110)
                self.assertEqual(construct.call_args.kwargs['total_seconds'],150)

if __name__=='__main__':
    unittest.main()
