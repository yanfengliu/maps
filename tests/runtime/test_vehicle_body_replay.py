"""Bound: strict JSON translation controls on synthetic packets; no Source world."""
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('replay_vehicle_body',ROOT/'tools/runtime/replay_vehicle_body.py')
replay = importlib.util.module_from_spec(spec)
spec.loader.exec_module(replay)


def fixture(root=Path('C:/replay-unit')):
    record = lambda path: {'path':path,'bytes':1,'sha256':'a'*64}
    lanes = [{'way_id':31610544,'from_osm_node':a,'to_osm_node':b,
              'lane_points':[[x,0.],[x+5.,0.]]}
             for a,b,x in ((11932522358,6219729383,0.),(6219729383,13612977938,5.),(13612977938,353661307,10.))]
    network = {'native_frame':copy.deepcopy(replay.FRAME),'routes':[{
        'id':'local','kind':'vehicle','closed':False,'width_m':2.,'speed_m_s':3.,
        'source_lane_segments':lanes,'points':[[float(x),0.,0.] for x in range(16)]}]}
    source = {'native_frame':copy.deepcopy(replay.FRAME),'support_surface':record('data/support.json'),
              'derived_terrain':record('data/terrain.glb'),'roads':[],'dem':{}}
    pin = lambda name: {'path':str((root/name).absolute()),'bytes':1,'sha256':'a'*64}
    pins = {'network':pin('network.json'),'source_manifest':pin('source.json')}
    face = lambda vertices: {'native_cm':vertices,'source':record('data/road.glb'),
        'mesh_path':'/Game/Road.Road','triangle':0,'road':True,'requires_interval':False,
        'layer_kind':'road','layer_ref':{'kind':'road','support_eligible':True},
        'normal_z':1.,'cook_state':1}
    faces = [face([[-300.,300.,0.],[1800.,300.,0.],[1800.,-300.,0.]]),
             face([[-300.,300.,0.],[1800.,-300.,0.],[-300.,-300.,0.]])]
    windows = []
    intervals = [{'start_m':lane['lane_points'][0],'end_m':lane['lane_points'][1],
                  'width_m':2.,'directed_edges':[[lane[k] for k in ('way_id','from_osm_node','to_osm_node')]]} for lane in lanes]
    intervals += [{'start_m':a['lane_points'][1],'end_m':b['lane_points'][0],'width_m':2.,
                   'directed_edges':[[v[k] for k in ('way_id','from_osm_node','to_osm_node')] for v in (a,b)]} for a,b in zip(lanes,lanes[1:])]
    for a,b in ((0.,5.),(5.,10.),(10.,15.)):
        windows.append({'start_m':a,'end_m':b,'xy_bounds_m':[a-2.4,-2.4,b+2.4,2.4],
                        'face_ids':[0,1],'intervals':copy.deepcopy(intervals),'buildings_m':[],
                        'dem_enclosure':{'height_bounds_m':[0.,.001]}})
    bindings = {key:{'path':str(Path(value['path']).relative_to(root.absolute())).replace('\\','/'),
                     'bytes':value['bytes'],'sha256':value['sha256']} for key,value in pins.items()}
    bindings.update({key:copy.deepcopy(source[key]) for key in ('support_surface','derived_terrain','roads','dem')})
    packet = {'schema_version':2,'frame':replay.FRAME['id'],'native_frame':copy.deepcopy(replay.FRAME),
              'coordinate_model':replay.MODEL,'physical_model':copy.deepcopy(replay.PHYSICAL),
              'bindings':bindings,'faces':faces,'routes':[{'route_id':'local','windows':windows}]}
    contract = {'route':{'width_m':2.,'source_lane_segments':[{k:lane[k] for k in ('way_id','from_osm_node','to_osm_node')} for lane in lanes]}}
    return packet,network,source,pins,root.absolute(),contract


class ReplayTranslationTests(unittest.TestCase):
    def test_complete_physical_population_preserved(self):
        args = fixture()
        blob = replay.prepare(*args)
        self.assertEqual(blob[:8],b'SBODY002')
        mutated = list(args)
        mutated[0] = copy.deepcopy(args[0])
        for face in mutated[0]['faces']:
            face['layer_kind'] = 'inferred';face['road'] = False;face['requires_interval'] = True
            face['layer_ref'] = {'kind':'inferred','reconstruction_role':'physical-sidewall','support_eligible':False}
        physical = replay.prepare(*mutated)
        self.assertGreater(len(physical),len(blob))
        self.assertIn(b'physical-sidewall',physical)

    def test_ordinary_support_top_and_physical_roles(self):
        for role,expected in (('',True),('support-top',True),('physical-transition',False),('physical-sidewall',False)):
            with self.subTest(role=role):
                face = fixture()[0]['faces'][0]
                if role:
                    face.update(layer_kind='inferred',road=False,requires_interval=True)
                    face['layer_ref'] = {'kind':'inferred','reconstruction_role':role,'support_eligible':expected}
                self.assertEqual(replay.eligibility(face),(expected,role))

    def test_nonliteral_boolean_refuses(self):
        for bad in (0,1,'true','false',None,[],{}):
            with self.subTest(value=bad):
                face = fixture()[0]['faces'][0]
                face['layer_ref']['support_eligible'] = bad
                with self.assertRaises(ValueError):
                    replay.eligibility(face)

    def test_missing_boolean_refuses(self):
        face = fixture()[0]['faces'][0]
        del face['layer_ref']['support_eligible']
        with self.assertRaises(ValueError):
            replay.eligibility(face)

    def test_role_mismatch_unknown_alias_and_wrong_kind_refuse(self):
        for kind,role,eligible in (('inferred','physical-sidewall',True),('inferred','support-top',False),
                                  ('road','physical-sidewall',False),('inferred','wall',False),
                                  ('physical-sidewall','',True)):
            with self.subTest(kind=kind,role=role):
                face = fixture()[0]['faces'][0]
                face['layer_kind'] = kind
                face['layer_ref'] = {'kind':kind,'support_eligible':eligible}
                if role:
                    face['layer_ref']['reconstruction_role'] = role
                with self.assertRaises(ValueError):
                    replay.eligibility(face)

    def test_reconstructed_terrain_policy_is_explicit(self):
        face = fixture()[0]['faces'][0]
        face.update(layer_kind='inferred',road=False,requires_interval=True)
        face['layer_ref'] = {'kind':'inferred','reconstruction_role':'support-top','support_eligible':True}
        self.assertEqual(replay.eligibility(face),(True,'support-top'))
        face['requires_interval'] = False
        with self.assertRaises(ValueError):
            replay.eligibility(face)

    def test_ordinary_terrain_road_binding_alias_refuses(self):
        face = fixture()[0]['faces'][0]
        face.update(layer_kind='terrain',road=True,requires_interval=True)
        face['layer_ref'] = {'kind':'terrain','support_eligible':True}
        with self.assertRaises(ValueError):
            replay.eligibility(face)

    def test_schema1_string_boolean_schema_refuse(self):
        for schema in (1,'2',True,None):
            with self.subTest(schema=schema):
                args = list(fixture())
                args[0]['schema_version'] = schema
                with self.assertRaises(ValueError):
                    replay.prepare(*args)

    def test_wrong_or_missing_frame_refuses(self):
        for bad in (None,{'schema_version':True,'id':replay.FRAME['id'],'definition_sha256':replay.FRAME['definition_sha256']}):
            args = list(fixture());args[0]['native_frame'] = bad
            with self.assertRaises(ValueError):
                replay.prepare(*args)

    def test_actual_binding_mismatch_refuses(self):
        args = list(fixture());args[0]['bindings']['network']['sha256'] = 'b'*64
        with self.assertRaises(ValueError):
            replay.prepare(*args)

    def test_interval_or_join_substitution_refuses(self):
        for index in (0,3,4):
            args = list(fixture())
            args[0]['routes'][0]['windows'][0]['intervals'][index]['directed_edges'][0][1] += 1
            with self.assertRaises(ValueError):
                replay.prepare(*args)

    def test_duplicate_or_nonfinite_json_refuses(self):
        for data in (b'{"x":1,"x":2}',b'{"x":NaN}'):
            with self.assertRaises(ValueError):
                replay.decode(data)

    def test_complete_1024_window_serializes_and_1025_refuses(self):
        args=list(fixture())
        args[0]['faces']=[copy.deepcopy(args[0]['faces'][0]) for _ in range(1024)]
        for window in args[0]['routes'][0]['windows']:
            window['face_ids']=list(range(1024))
        blob=replay.prepare(*args)
        self.assertTrue(blob.startswith(b'SBODY002'))
        args[0]['faces'].append(copy.deepcopy(args[0]['faces'][0]))
        args[0]['routes'][0]['windows'][0]['face_ids'].append(1024)
        with self.assertRaises(ValueError):
            replay.prepare(*args)

    def test_duplicate_physical_reference_refuses(self):
        args = list(fixture());args[0]['routes'][0]['windows'][0]['face_ids'] = [0,0]
        with self.assertRaises(ValueError):
            replay.prepare(*args)


if __name__ == '__main__':
    unittest.main()
