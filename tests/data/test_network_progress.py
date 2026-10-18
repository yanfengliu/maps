"""Bound: synchronous actual network entry/publication on literal tiny source only."""
import collections,contextlib,copy,datetime,io,json,pathlib,sys,types,unittest
from unittest import mock
ROOT=pathlib.Path(__file__).absolute().parents[2]
sys.path.insert(0,str(ROOT/'tools/data'))
import surface_network as api

class NetworkProgress(unittest.TestCase):
    def test_invalid_progress_modes_refuse_before_any_source_fetch_or_output(self):
        cases=[['--network-progress'],['--support-only','--network-progress'],
               ['--network-only','--fetch','--network-progress'],
               ['--network-only','--network-progress','--network-diagnostic-seconds','10']]
        for args in cases:
            with self.subTest(args=args),mock.patch.object(api,'verify_base') as verify,mock.patch.object(api,'fetch_sources') as fetch,mock.patch.object(api,'guarded_write') as write,contextlib.redirect_stderr(io.StringIO()):
                with self.assertRaises(SystemExit) as error:api.main(args)
                self.assertEqual(error.exception.code,2);verify.assert_not_called();fetch.assert_not_called();write.assert_not_called()

    def test_progress_clock_has_no_deadline_and_diagnostic_still_stops(self):
        now=[0.]
        with contextlib.redirect_stdout(io.StringIO()) as output:
            progress=api.NetworkDiagnostic(None,clock=lambda:now[0]);now[0]=10000.;progress.phase('literal-phase')
            token=object();self.assertIs(progress.call('check:vehicle',lambda:token),token)
        rows=[json.loads(line) for line in output.getvalue().splitlines()]
        self.assertTrue(all('network_progress' in row and row['deadline_s'] is None for row in rows))
        self.assertTrue(all('network_diagnostic' not in row for row in rows))
        now[0]=0.;diagnostic=api.NetworkDiagnostic(10,clock=lambda:now[0]);now[0]=11.
        with contextlib.redirect_stdout(io.StringIO()),self.assertRaises(api.NetworkDiagnosticStop):diagnostic.tick()

    def test_actual_main_progress_publishes_identical_normal_manifest_once(self):
        payloads=[];calls=[];movement={'totals':{'literal':7},'scope':'finite literal movement'}
        class FixedDateTime(datetime.datetime):
            @classmethod
            def now(cls,tz=None):return cls(2026,10,17,tzinfo=tz)
        for args in [['--network-only'],['--network-only','--network-progress']]:
            writes=[]
            def produce(base,**kwargs):calls.append(kwargs);return copy.deepcopy(movement)
            with mock.patch.object(api,'admit_path'),mock.patch.object(api,'verify_base',return_value={}),mock.patch.object(api,'movement_network',side_effect=produce),mock.patch.object(api,'guarded_read',return_value=b'literal-config'),mock.patch.object(api,'guarded_write',side_effect=lambda path,data:writes.append((path,data))),mock.patch.object(api.datetime,'datetime',FixedDateTime),contextlib.redirect_stdout(io.StringIO()) as output:
                api.main(args)
            self.assertEqual(len(writes),1);self.assertEqual(writes[0][0].name,'movement-manifest.json');payloads.append(writes[0][1])
            if '--network-progress' in args:self.assertIn('network_progress',output.getvalue())
            else:self.assertNotIn('network_progress',output.getvalue());self.assertNotIn('network_diagnostic',output.getvalue())
        self.assertEqual(payloads[0],payloads[1]);self.assertEqual(calls[0],{})
        self.assertIsNone(calls[1]['network_diagnostic'].seconds)

    def tiny_network(self,probe):
        points={1:[100.,100.],2:[140.,100.],3:[140.,140.],4:[100.,140.],
                10:[0.,0.],11:[10.,0.],12:[20.,0.],13:[30.,0.],14:[40.,0.],15:[50.,0.],40:[0.,-10.],41:[20.,-10.]}
        ways=[{'id':7,'nodes':[1,2,3,4,1],'tags':{'highway':'residential','oneway':'yes'}},
              {'id':100,'nodes':[10,11,12,13,14,15],'tags':{'highway':'footway','footway':'crossing'}},
              {'id':103,'nodes':[40,41],'tags':{'highway':'footway'}}]
        calls=[];writes={};out=api.OUT
        class FixtureSurface:
            # Independent literal current-frame support at the publication seam.
            support_manifest={'native_frame':{'schema_version':1,
                'id':'native-centimetres-Xeast-Ysouth-Zup-v2',
                'definition_sha256':'2099342528416aa9dcdceea63e6d2604974341d8248f3b1c7ccf287008759170'}}
            support_record={'sha256':'support'};derived_record={'sha256':'terrain'}
            road=types.SimpleNamespace(sources=[]);dem_records={};diagnostic_counts=collections.Counter()
            def __init__(self,*args,**kwargs):pass
            def corridor(self,polyline,kind,width,**kwargs):
                calls.append((kind,copy.deepcopy(polyline),width,copy.deepcopy(kwargs)))
                return [{'point':[float(p[0]),float(p[1]),0.]} for p in polyline]
            def check(self,point,kind,**kwargs):return [float(point[0]),float(point[1]),0.],{}
        def write(path,payload,root=None):writes[pathlib.Path(path)]=bytes(payload)
        def record(path,root=None):
            path=pathlib.Path(path);payload=writes.get(path,b'fixture')
            return {'path':path.relative_to(api.ROOT).as_posix(),'bytes':len(payload),'sha256':api.sha(payload)}
        restrictions=types.SimpleNamespace(rules=[],unsupported=[],rejection=lambda a,b:None)
        with contextlib.ExitStack() as stack:
            for name,value in [('osm_sources',lambda base:({},points,ways,[])),('osm_tree',lambda:None),
                               ('TurnRestrictions',lambda tree:restrictions),('Surface',FixtureSurface),
                               ('source_record',record),('guarded_write',write)]:stack.enter_context(mock.patch.object(api,name,value))
            stack.enter_context(mock.patch.object(api,'boundary_endpoint',side_effect=ValueError('not-a-boundary')))
            with contextlib.redirect_stdout(io.StringIO()),contextlib.redirect_stderr(io.StringIO()):
                try:result=api.movement_network({'vertical_reference':{}},**({'network_diagnostic':probe} if probe else {}))
                except api.NetworkDiagnosticStop as error:return error,writes,calls
        return result,writes,calls

    def test_actual_movement_publication_guard_remains_finite_diagnostic_only(self):
        normal,writes_normal,calls_normal=self.tiny_network(None)
        progress,writes_progress,calls_progress=self.tiny_network(api.NetworkDiagnostic(None,clock=lambda:0.))
        self.assertEqual(calls_normal,calls_progress)
        # Graph records contain per-run clocks; movement/profile/source bytes do not.
        stable=lambda rows:{p.name:data for p,data in rows.items() if not p.name.startswith('vehicle-graph-')}
        self.assertEqual(stable(writes_normal),stable(writes_progress))
        self.assertIn('movement-network.json',stable(writes_progress));self.assertEqual(normal['totals'],progress['totals'])
        stopped,writes,_=self.tiny_network(api.NetworkDiagnostic(10,clock=lambda:0.))
        self.assertIsInstance(stopped,api.NetworkDiagnosticStop)
        self.assertIn('before-movement-source-profile-writes',str(stopped))
        self.assertTrue(writes);self.assertTrue(all(p.name.startswith('vehicle-graph-') for p in writes))

if __name__=='__main__':unittest.main()
