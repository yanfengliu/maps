"""Bound: retained computed graph, not source support, route feasibility or native motion."""
import collections
import copy
import contextlib
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


class VehicleGraphDiagnostic(unittest.TestCase):
    def test_success_below_capacity_keeps_unselected_scc_and_central_boundary_paths(self):
        edges={key:{'id':key,'points':[[x,0.],[x+1.,0.]],'length':1.} for key,x in (('entry',-5.),('a',0.),('b',1.),('exit',5.),('isolated',50.))}
        turns={'entry':['a'],'a':['b'],'b':['a','exit']}
        entries={'entry':({'boundary_side':'west'},None)}
        exits={'exit':({'boundary_side':'east'},None)}
        # A completed run can have routes yet miss both capacity and the core.
        routes=[{'id':'remote-loop','kind':'vehicle','closed':True,'source_lane_segments':[]}]
        with tempfile.TemporaryDirectory() as directory,mock.patch.object(source,'ROOT',pathlib.Path(directory)):
            path=source.write_vehicle_graph_diagnostic(edges,turns,entries,exits,routes,
                collections.Counter({'vehicle-edge-without-directed-cycle':3}),
                {'no-admitted-road-support':2},[{'edge_id':'isolated','reason':'body-refused'}],
                {'central_candidates':4},{'support_surface':{'sha256':'pinned'}})
            record=json.loads(path.read_bytes())
            self.assertEqual(set(map(frozenset,record['strongly_connected_components'])),
                             {frozenset(('a','b')),frozenset(('entry',)),frozenset(('exit',)),frozenset(('isolated',))})
            self.assertEqual(record['scc_sizes'],[2,1,1,1])
            self.assertEqual(record['turn_links'],4)
            self.assertEqual(record['vehicle_edges'],edges)
            centre=next(row for row in record['central_paths'] if row['edge_id']=='a')
            self.assertEqual(centre['entry_path_reversed'],['a','entry'])
            self.assertEqual(centre['exit_path'],['a','b','exit'])
            self.assertEqual(record['selected_vehicle_routes'][0]['id'],'remote-loop')
            self.assertEqual(record['boundary_rejections'],{'no-admitted-road-support':2})
            self.assertEqual(record['bindings']['support_surface']['sha256'],'pinned')
            self.assertFalse((pathlib.Path(directory)/'data').exists())

    def test_empty_graph_is_retained_before_no_vehicle_failure(self):
        with tempfile.TemporaryDirectory() as directory,mock.patch.object(source,'ROOT',pathlib.Path(directory)):
            path=source.write_vehicle_graph_diagnostic({}, {}, {}, {}, [], {}, {}, [], {}, {})
            record=json.loads(path.read_bytes())
            self.assertEqual(record['scc_sizes'],[])
            self.assertEqual(record['selected_vehicle_routes'],[])
            self.assertEqual(record['central_paths'],[])

    def test_partial_segments_do_not_claim_turn_or_scc_completion(self):
        edges={'a':{'id':'a','points':[[0.,0.],[1.,0.]],'length':1.}}
        refusal={'edge_id':'b','reason':'unsupported-grade-change','witness':{'grade':.3}}
        with tempfile.TemporaryDirectory() as directory,mock.patch.object(source,'ROOT',pathlib.Path(directory)):
            path=source.write_vehicle_graph_diagnostic(edges,{}, {}, {}, [], {}, {}, [], {}, {},
                phase='segments-partial',metrics={'vehicle_segment_attempts':500},segment_refusals=[refusal])
            record=json.loads(path.read_bytes())
            self.assertEqual(record['vehicle_edges'],edges)
            self.assertEqual(record['segment_refusals'],[refusal])
            self.assertFalse(record['segments_complete'])
            self.assertFalse(record['turns_complete'])
            for key in ('turns','turn_links','strongly_connected_components','scc_sizes','central_paths'):
                self.assertIsNone(record[key])

    def test_vehicle_only_cli_keeps_normal_vehicle_decisions_and_never_publishes(self):
        points={1:[100.,100.],2:[140.,100.],3:[140.,140.],4:[100.,140.],5:[0.,0.],6:[20.,0.]}
        ways=[{'id':7,'nodes':[1,2,3,4,1],'tags':{'highway':'residential','oneway':'yes'}},
              {'id':8,'nodes':[5,6],'tags':{'highway':'footway'}}]
        arms=[]
        for diagnostic_only in (False,True):
            calls=[];graphs=[]
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
                    calls.append(('corridor',kind,copy.deepcopy(polyline),width,copy.deepcopy(kwargs)))
                    return [{'point':[float(point[0]),float(point[1]),0.]} for point in polyline]
                def check(self,point,kind,**kwargs):
                    calls.append(('check',kind,list(point),copy.deepcopy(kwargs)))
                    return [float(point[0]),float(point[1]),0.],{}
            def graph(*args,**kwargs):
                graphs.append(copy.deepcopy((args,kwargs)))
                return pathlib.Path('ignored-graph.json')
            restrictions=types.SimpleNamespace(rules=[],unsupported=[],rejection=lambda a,b:None)
            with contextlib.ExitStack() as stack:
                for name,value in [('osm_sources',lambda base:({},points,ways,[])),('osm_tree',lambda:None),
                                   ('TurnRestrictions',lambda tree:restrictions),('Surface',FixtureSurface),
                                   ('verify_base',lambda path:{'vertical_reference':{}}),
                                   ('source_record',lambda path,root=None:{'path':str(path),'sha256':'fixture'}),
                                   ('write_vehicle_graph_diagnostic',graph)]:
                    stack.enter_context(mock.patch.object(source,name,value))
                stack.enter_context(mock.patch.object(source,'boundary_endpoint',side_effect=ValueError('not-a-boundary')))
                writes=stack.enter_context(mock.patch.object(source,'guarded_write'))
                if diagnostic_only:
                    source.main(['--vehicle-graph-only'])
                    writes.assert_not_called()
                else:
                    result=source.movement_network({'vertical_reference':{}})
                    self.assertEqual(result['totals']['vehicle_routes'],1)
                    self.assertGreater(writes.call_count,0)
            self.assertEqual([kwargs['phase'] for _,kwargs in graphs],['graph-admitted','routes-selected'])
            self.assertEqual(graphs[0][0][4],[] if diagnostic_only else [row for row in graphs[0][0][4] if row['kind']=='pedestrian'])
            self.assertEqual(len(graphs[-1][0][0]),4)
            arms.append(([call for call in calls if call[1]=='vehicle'],graphs[-1][0]))
        self.assertEqual(arms[0][0],arms[1][0])
        for index in (0,1,2,3,6,7,8):self.assertEqual(arms[0][1][index],arms[1][1][index])
        selected=lambda arm:[row for row in arm[1][4] if row['kind']=='vehicle']
        self.assertEqual(selected(arms[0]),selected(arms[1]))


if __name__=='__main__':unittest.main()
