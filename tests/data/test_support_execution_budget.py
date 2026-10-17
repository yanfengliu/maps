"""Offline execution-limit validation; no source generation or runtime claim."""
import pathlib
import sys
import unittest

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


if __name__=='__main__':
    unittest.main()
