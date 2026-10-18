"""Bound: actual movement metadata on tiny synthetic source; no real source/native acceptance."""
import contextlib
import copy
import io
import json
import pathlib
import sys
import tempfile
import types
import unittest
from unittest import mock

ROOT=pathlib.Path(__file__).absolute().parents[2]
sys.path.insert(0,str(ROOT/'tools/data'))
import surface_network as source


class MovementProvenance(unittest.TestCase):
    def fixture(self, *, missing_graph=False):
        points={1:[100.,100.],2:[140.,100.],3:[140.,140.],4:[100.,140.],
                10:[0.,0.],11:[10.,0.],12:[20.,0.],13:[30.,0.],14:[40.,0.],15:[50.,0.],
                20:[0.,10.],21:[1.,10.],30:[0.,20.],31:[10.,20.],32:[20.,20.],40:[0.,-10.],41:[20.,-10.]}
        ways=[{'id':7,'nodes':[1,2,3,4,1],'tags':{'highway':'residential','oneway':'yes'}},
              {'id':100,'nodes':[10,11,12,13,14,15],'tags':{'highway':'footway','footway':'crossing'}},
              {'id':101,'nodes':[20,21],'tags':{'highway':'footway'}},
              {'id':102,'nodes':[30,31,32],'tags':{'highway':'footway'}},
              {'id':103,'nodes':[40,41],'tags':{'highway':'footway'}}]
        calls=[]
        class FixtureSurface:
            # Independent literal current-frame support at the publication seam.
            support_manifest={'native_frame':{'schema_version':1,
                'id':'native-centimetres-Xeast-Ysouth-Zup-v2',
                'definition_sha256':'2099342528416aa9dcdceea63e6d2604974341d8248f3b1c7ccf287008759170'}}
            support_record={'sha256':'support'}
            derived_record={'sha256':'terrain'}
            road=types.SimpleNamespace(sources=[])
            dem_records={}
            def __init__(self,*args,**kwargs):pass
            def corridor(self,polyline,kind,width,**kwargs):
                calls.append((kind,copy.deepcopy(polyline),width,copy.deepcopy(kwargs)))
                if kind=='pedestrian' and polyline==[[10.,0.],[20.,0.]]:
                    raise source.SupportRejection('fixture-segment-refused',{'point':[15.,0.],'grade':.7})
                if kind=='pedestrian' and len(polyline)>2 and polyline[0]==[0.,20.]:
                    raise ValueError('fixture-route-refused')
                return [{'point':[float(p[0]),float(p[1]),0.]} for p in polyline]
            def check(self,point,kind,**kwargs):return [float(point[0]),float(point[1]),0.],{}
        restrictions=types.SimpleNamespace(rules=[],unsupported=[],rejection=lambda a,b:None)
        with tempfile.TemporaryDirectory() as directory,contextlib.ExitStack() as stack:
            root=pathlib.Path(directory);out=root/'data/prepared/surface';writes={}
            def write(path,payload,root=None):writes[pathlib.Path(path)]=bytes(payload)
            def record(path,root=None):
                path=pathlib.Path(path)
                if path in writes:
                    payload=writes[path]
                    return {'path':path.relative_to(out.parents[2]).as_posix(),'bytes':len(payload),'sha256':source.sha(payload)}
                return {'path':str(path),'sha256':'fixture'}
            for name,value in [('ROOT',root),('OUT',out),('osm_sources',lambda base:({},points,ways,[])),
                               ('osm_tree',lambda:None),('TurnRestrictions',lambda tree:restrictions),
                               ('Surface',FixtureSurface),('source_record',record),('guarded_write',write)]:
                stack.enter_context(mock.patch.object(source,name,value))
            stack.enter_context(mock.patch.object(source,'boundary_endpoint',side_effect=ValueError('not-a-boundary')))
            if missing_graph:
                stack.enter_context(mock.patch.object(source,'write_vehicle_graph_diagnostic',side_effect=OSError('fixture graph unavailable')))
            with contextlib.redirect_stdout(io.StringIO()),contextlib.redirect_stderr(io.StringIO()):
                result=source.movement_network({'vertical_reference':{}})
            network_payload=writes[out/'movement-network.json']
            graphs={p:payload for p,payload in writes.items() if p.name.startswith('vehicle-graph-')}
            return result,json.loads(network_payload),network_payload,graphs,copy.deepcopy(calls)

    def test_segment_refusal_and_accepted_source_traversal_survive_chunk_split(self):
        result,network,_,_,_=self.fixture()
        self.assertEqual(result['pedestrian_segment_refusals'],[{'way_id':100,'from_node':11,'to_node':12,
            'reason':'fixture-segment-refused','witness':{'point':[15.,0.],'grade':.7}}])
        self.assertEqual(len(result['pedestrian_route_sources']),3)
        sources=[r for r in result['pedestrian_route_sources'] if r['way_id']==100]
        self.assertEqual([r['route_id'] for r in sources],['foot-100-0','foot-100-1'])
        self.assertEqual([r['node_ids'] for r in sources],[[10,11],[12,13,14,15]])
        self.assertTrue(all(r['way_id']==100 for r in sources))
        self.assertEqual(sources[1]['source_segments'],[
            {'from_node':12,'to_node':13,'points':[[20.,0.],[30.,0.]]},
            {'from_node':13,'to_node':14,'points':[[30.,0.],[40.,0.]]},
            {'from_node':14,'to_node':15,'points':[[40.,0.],[50.,0.]]}])
        self.assertEqual(len(network['routes']),4)

    def test_whole_chunk_and_short_route_refusals_keep_their_source_nodes(self):
        result,_,_,_,_=self.fixture()
        refused=result['pedestrian_route_refusals']
        self.assertEqual([(r['route_id'],r['way_id'],r['node_ids'],r['reason'],r['witness']) for r in refused],
            [('foot-101-0',101,[20,21],'pedestrian-short-route',None),
             ('foot-102-0',102,[30,31,32],'fixture-route-refused',None)])
        self.assertEqual(result['rejections']['pedestrian-short-route'],1)
        self.assertEqual(result['rejections']['pedestrian-route:fixture-route-refused'],1)

    def test_manifest_binds_only_the_final_current_graph_bytes(self):
        result,_,_,graphs,_=self.fixture()
        self.assertEqual(len(graphs),2)
        final=[(path,payload) for path,payload in graphs.items() if json.loads(payload)['phase']=='routes-selected']
        self.assertEqual(len(final),1)
        path,payload=final[0];binding=result['vehicle_graph_diagnostic']
        self.assertEqual(binding['sha256'],source.sha(payload))
        self.assertEqual(binding['bytes'],len(payload))
        self.assertTrue(binding['path'].endswith(path.name))
        graph=json.loads(payload)
        self.assertEqual(graph['selected_vehicle_routes'][0]['id'],'vehicle-loop-0')
        self.assertTrue(graph['segments_complete']);self.assertTrue(graph['turns_complete'])

    def test_missing_final_graph_is_explicitly_unavailable(self):
        result,network,_,graphs,_=self.fixture(missing_graph=True)
        self.assertIsNone(result['vehicle_graph_diagnostic'])
        self.assertEqual(graphs,{})
        self.assertEqual(len(network['routes']),4)

    def test_reporting_does_not_change_runtime_schema_signals_or_profiles(self):
        result,network,_,_,_=self.fixture()
        for key in ('pedestrian_segment_refusals','pedestrian_route_refusals','pedestrian_route_sources','vehicle_graph_diagnostic'):
            self.assertNotIn(key,network)
            self.assertTrue(all(key not in r for r in network['routes']))
        self.assertEqual(network['default_population'],{'pedestrian_count':3000,'vehicle_count':200})
        self.assertEqual(network['signals'][0]['period_s'],70)
        self.assertEqual([r['id'] for r in network['routes']],['foot-100-0','foot-100-1','foot-103-0','vehicle-loop-0'])
        for route in network['routes'][:2]:
            self.assertEqual([stop['direction'] for stop in route['stops']],[1,-1])
            self.assertEqual(route['stops'][0]['distance_m'],0)
            self.assertEqual(route['stops'][1]['distance_m'],source.polyline_length(route['points']))
        self.assertTrue(network['routes'][-1]['closed'])
        self.assertEqual(network['routes'][-1]['points'][0],network['routes'][-1]['points'][-1])
        self.assertEqual(result['totals']['vehicle_unique_lane_static_capacity'],25)


if __name__=='__main__':unittest.main()
