"""Bound: actual Surface wrapper dispatch for finite real/proxy operands; no city."""
from pathlib import Path
import sys,types,unittest
from unittest import mock
ROOT=Path(__file__).absolute().parents[2]
sys.path[:0]=[str(ROOT/'tools/data'),str(ROOT/'data/runtime')]
import surface_network as api
class SurfaceDispatch(unittest.TestCase):
    def receivers(self,probe):
        real=api.Surface.__new__(api.Surface);real.network_diagnostic=probe
        return [real,types.SimpleNamespace(network_diagnostic=probe)]
    def invoke(self,name,receiver):
        if name=='check':return api.Surface.check(receiver,[1.25,2.5],'pedestrian',vehicle_interval='literal-interval')
        return api.Surface.corridor(receiver,[[1.,2.],[3.,4.]],'vehicle',1.8,vehicle_contexts='literal-contexts')
    def expected(self,name,receiver):
        return mock.call(receiver,[1.25,2.5],'pedestrian',vehicle_interval='literal-interval') if name=='check' else mock.call(receiver,[[1.,2.],[3.,4.]],'vehicle',1.8,vehicle_contexts='literal-contexts')
    def test_real_and_proxy_dispatch_preserves_receiver_arguments_and_result(self):
        result=object()
        for diagnostic in [False,True]:
            probe=api.NetworkDiagnostic(10,clock=lambda:0.) if diagnostic else None
            for receiver in self.receivers(probe):
                for name in ['check','corridor']:
                    with self.subTest(diagnostic=diagnostic,receiver=type(receiver).__name__,method=name),mock.patch.object(api.Surface,'_'+name,autospec=True,return_value=result) as implementation:
                        self.assertIs(self.invoke(name,receiver),result);self.assertEqual(implementation.call_args,self.expected(name,receiver))
                        if probe:self.assertIn(name+':'+('pedestrian' if name=='check' else 'vehicle'),probe.method_seconds)
    def test_instance_implementation_override_stays_selected(self):
        for receiver in self.receivers(api.NetworkDiagnostic(10,clock=lambda:0.)):
            for name in ['check','corridor']:
                result=object();override=mock.Mock(return_value=result);setattr(receiver,'_'+name,override)
                with mock.patch.object(api.Surface,'_'+name,side_effect=AssertionError('class fallback must not replace instance implementation')):
                    self.assertIs(self.invoke(name,receiver),result);self.assertEqual(override.call_count,1)
    def test_original_refusal_identity_survives_proxy_and_real_diagnostics(self):
        for diagnostic in [False,True]:
            for receiver in self.receivers(api.NetworkDiagnostic(10,clock=lambda:0.) if diagnostic else None):
                for name in ['check','corridor']:
                    refusal=ValueError('literal-source-gap')
                    with mock.patch.object(api.Surface,'_'+name,autospec=True,side_effect=refusal):
                        with self.assertRaises(ValueError) as error:self.invoke(name,receiver)
                        self.assertIs(error.exception,refusal)
    def test_deadline_still_stops_before_both_real_and_proxy_work(self):
        now=[0.];probe=api.NetworkDiagnostic(10,clock=lambda:now[0]);now[0]=11.
        for receiver in self.receivers(probe):
            for name in ['check','corridor']:
                with mock.patch.object(api.Surface,'_'+name,autospec=True) as implementation:
                    with self.assertRaises(api.NetworkDiagnosticStop):self.invoke(name,receiver)
                    implementation.assert_not_called()
if __name__=='__main__':unittest.main()
