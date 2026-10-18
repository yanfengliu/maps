"""Bounded constructor tests: explicit units, source closure, DEM enclosure.

No Surface/index construction, source writes, producer publication or engine.
"""
import copy
import importlib.util
import json
import math
import pathlib
import sys
import types
import unittest
from unittest import mock

ROOT=pathlib.Path(__file__).absolute().parents[2]
TREE=ROOT
sys.path[:0]=[str(TREE/'data/runtime'),str(TREE/'tools/data')]
import surface_network as source
import vehicle_body_support as body
np=source.np


def record(path):return {'path':path,'bytes':1,'sha256':'a'*64}

FRAME={'schema_version':1,'id':'native-centimetres-Xeast-Ysouth-Zup-v2',
       'definition_sha256':'2099342528416aa9dcdceea63e6d2604974341d8248f3b1c7ccf287008759170'}

PHYSICAL={'schema_version':1,'id':'ue5.8.3-cl58210709-chaos-cook-float32-cm-v1',
          'definition_sha256':'e5ba1adad4fcab4e05d61d899babf8f6c789655cfe4637c393d7002f4f742428'}


class PacketTests(unittest.TestCase):
    def test_complete_window_candidate_bound_and_order(self):
        ids=list(range(1023,-1,-1))
        self.assertEqual(body.window_candidate_ids(ids,"bounded",0,1,[0,0,5,5]),list(range(1024)))
        self.assertEqual(ids,list(range(1023,-1,-1)))  # Caller population is immutable.

    def test_window_candidate_empty_oversize_duplicate_refuse(self):
        for ids in ([],list(range(1025)),[0,1,1]):
            with self.subTest(count=len(ids)),self.assertRaisesRegex(ValueError,"distinct complete blockers"):
                body.window_candidate_ids(ids,"bounded",0,1,[0,0,5,5])

    def test_window_candidate_omission_mutant_cannot_pass_population_regression(self):
        def verify():
            api,surface,movement,network,_=self.fixture()
            packet=body.prepare(api,surface,movement,network)
            for window in packet['routes'][0]['windows']:
                self.assertEqual(set(window['face_ids']),{0,1,2,3})
        verify()
        original=body.window_candidate_ids
        with mock.patch.object(body,'window_candidate_ids',side_effect=lambda *args:original(*args)[:-1]):
            with self.assertRaises(self.failureException):
                verify()  # The identical assertion goes red if packaging drops one complete candidate.

    def fixture(self,xy=None):
        xy=xy if xy is not None else [427.47194895559466,266.006031244335]
        road=record('data/prepared/road.glb');terrain=record('data/prepared/terrain.glb')
        support=record('data/prepared/support.json');src=record('data/prepared/source.json')
        base={'origin':{'latitude':35.6595,'longitude':139.7005,'ellipsoidal_height_m':50},
              'bounds':source.city.CONFIG['bounds'],
              'vertical_reference':{'estimated_local_geoid_offset_m':38}}
        manifest={'native_frame':copy.deepcopy(FRAME),'physical_query_model':copy.deepcopy(PHYSICAL),'native_assignment':{'replacement_mesh_path':'/Game/Terrain.Terrain'},'native_roads':[
            {'source':road,'native_mesh_path':'/Game/Road.Road'}], 'algorithm':record('data/source/provenance/geometry.py'),
            'configuration_inputs':{'surface':record('data/source/provenance/config.json')}}
        current={'native_frame':copy.deepcopy(FRAME),'support_surface':support,'derived_terrain':terrain,'roads':[road],'dem':{}}
        movement={'native_frame':copy.deepcopy(FRAME),'network':record('data/prepared/network.json'),'source_manifest':src,'source_osm':record('data/source/osm.xml')}
        corners=np.array([[xy[0]-4,xy[1]-4,10],[xy[0]+5,xy[1]-4,10],[xy[0]+5,xy[1]+4,10],[xy[0]-4,xy[1]+4,10]])
        # Fixture starts in source ENU/raw order. Reflect Y and apply the one
        # final native corner permutation, preserving physical -cross normals.
        native=(corners[[[0,2,1],[0,3,2]]]*np.array([100.,-100.,100.])).astype(np.float32)[:,[0,2,1],:]
        class Index:
            native_frame=copy.deepcopy(FRAME)
            native_corner_order=(0,2,1)
            native_triangles_cm=native
            physical_membership=np.ones(2,dtype=np.int8)
            physical_model=copy.deepcopy(PHYSICAL)
            def physical_candidates(self,a,b):return self.candidates(a,b)
            def candidates(self,a,b):return np.array([0,1],dtype=int)
        elevation=source.city.Elevation.__new__(source.city.Elevation);elevation.zoom=15;elevation.tiles={}
        crop=base['bounds'];west,north=source.city.tile_xy(crop['north'],crop['west'],15);east,south=source.city.tile_xy(crop['south'],crop['east'],15)
        for x in range(math.floor(west),math.floor(east)+1):
            for y in range(math.floor(north),math.floor(south)+1):
                # A nonconstant admitted bilinear field; no flat-DEM shortcut.
                yy,xx=np.mgrid[:256,:256]
                elevation.tiles[x,y]=22+.001*xx+.002*yy
        interval=types.SimpleNamespace(start=tuple(xy),end=(xy[0]+1,xy[1]),width=2.,edges=((7,11,12),))
        surface=types.SimpleNamespace(base=base,origin=np.array(source.city.ecef(35.6595,139.7005,50)),elevation=elevation,
            support_manifest=manifest,support_record=support,derived_record=terrain,
            road_index=Index(),terrain_index=Index(),road=types.SimpleNamespace(layer_refs=[{'kind':'road','source':0,'source_triangle_index':i} for i in range(2)]),
            source3_terrain_refs=[{'kind':'terrain','triangle':i} for i in range(2)],buildings=[],
            vehicle_interval=lambda context,a,b,width:interval)
        route={'id':'vehicle-test','kind':'vehicle','width_m':2,'points':[[*xy,10],[xy[0]+1,xy[1],10]]}
        network={'native_frame':copy.deepcopy(FRAME),'routes':[route]}
        api=types.SimpleNamespace(np=np,city=source.city,ROOT=TREE,
            native_frame_record=lambda:copy.deepcopy(FRAME),native_xy_cm=lambda points:np.asarray(points,dtype=np.float64)*np.array([100.,-100.]),
            admitted_record=lambda r,p:json.dumps(current).encode(),
            support_source3=types.SimpleNamespace(frozen_vehicle_path=lambda a,r,s:([xy,[xy[0]+1,xy[1]]],[((7,11,12),)],[]),cut_polygon=source.support_source3.cut_polygon))
        return api,surface,movement,network,xy

    def test_literal_native_centimetres_no_second_packing(self):
        api,surface,movement,network,xy=self.fixture();before=copy.deepcopy((movement,network,surface.support_manifest))
        packet=body.prepare(api,surface,movement,network)
        self.assertEqual(packet['faces'][0]['native_cm'],surface.road_index.native_triangles_cm[0].astype(float).tolist())
        self.assertGreater(packet['faces'][0]['native_cm'][0][0],42000)
        self.assertLess(packet['faces'][0]['native_cm'][0][0],44000)
        self.assertLess(packet['faces'][0]['native_cm'][0][1],-26000)
        self.assertGreater(packet['faces'][0]['normal_z'],0)
        self.assertEqual(packet['faces'][0]['triangle'],0)
        self.assertEqual(packet['bindings']['network'],movement['network'])
        self.assertEqual((movement,network,surface.support_manifest),before)
        self.assertEqual(packet['routes'][0]['windows'][0]['start_m'],0)
        self.assertEqual(packet['routes'][0]['windows'][-1]['end_m'],1)
        self.assertFalse(packet['faces'][0]['requires_interval'])
        self.assertTrue(next(r for r in packet['faces'] if not r['road'])['requires_interval'])
        json.dumps(packet,allow_nan=False)

    def test_dem_enclosure_contains_actual_bilinear_ecef_reference(self):
        api,surface,_,_,xy=self.fixture()
        for centre in (xy,[-300.,-400.],[0.,0.]):
            bounds=[centre[0]-3,centre[1]-3,centre[0]+3,centre[1]+3]
            enclosure=body.dem_enclosure(api,surface,bounds);low,high=enclosure['height_bounds_m']
            for x in np.linspace(bounds[0],bounds[2],7):
                for y in np.linspace(bounds[1],bounds[3],7):
                    lat,lon,_=source.city.geodetic([surface.origin+np.array([x,0,y])@source.city.local_basis()])[0]
                    height=surface.elevation.sample(lat,lon)+38
                    actual=float(source.city.localize([source.city.ecef(lat,lon,height)],50)[0,1])
                    self.assertLessEqual(low,actual);self.assertGreaterEqual(high,actual)

    def test_no_implicit_native_unit_fallback(self):
        api,surface,movement,network,_=self.fixture();surface.road_index=types.SimpleNamespace(triangles=surface.road_index.native_triangles_cm)
        with self.assertRaisesRegex(ValueError,'explicit native_triangles_cm'):
            body.prepare(api,surface,movement,network)

    def test_source_generation_mismatch_refuses(self):
        api,surface,movement,network,_=self.fixture();surface.derived_record=record('data/prepared/other.glb')
        with self.assertRaisesRegex(ValueError,'same actual published'):
            body.prepare(api,surface,movement,network)


    def test_physical_candidates_exclude_actual_patch64_preserve_raw_geometry(self):
        api,surface,movement,network,_=self.fixture([120.90815104166666,-9.09246643066406])
        # Retained actual patch64 source-description cm; fixture SHA-256
        # e3a67543... is pinned in this candidate handoff, never a cooked hit.
        patch=np.array([[12090.83203125,-909.2457885742188,68.91686248779297],
                        [12090.8056640625,-909.2483520507812,68.91580200195312],
                        [12090.8076171875,-909.2457885742188,68.91581726074219]],dtype=np.float32)
        old_patch=patch.copy()
        patch=(patch*np.array([1.,-1.,1.],dtype=np.float32))[[0,2,1]]
        raw=np.concatenate([surface.terrain_index.native_triangles_cm,patch[None,:,:]])
        class Physical:
            native_frame=copy.deepcopy(FRAME)
            native_corner_order=(0,2,1)
            native_triangles_cm=raw
            physical_model=copy.deepcopy(PHYSICAL)
            physical_membership=np.array([1,1,0],dtype=np.int8)
            def candidates(self,a,b):return np.array([0,1,2],dtype=int)
            def physical_candidates(self,a,b):return np.array([0,1],dtype=int)
        surface.terrain_index=Physical()
        surface.source3_terrain_refs.append({'kind':'terrain-fragment','triangle':1063539})
        before=raw.copy();packet=body.prepare(api,surface,movement,network)
        self.assertNotIn(1063539,[row['triangle'] for row in packet['faces']])
        self.assertEqual({row['triangle'] for row in packet['faces']},{0,1})
        self.assertTrue(all(row['cook_state']==1 for row in packet['faces']))
        np.testing.assert_array_equal(raw,before)
        self.assertEqual(len(raw),3)
        np.testing.assert_array_equal(raw[2],patch)
        np.testing.assert_array_equal(patch,old_patch[[0,2,1]]*np.array([1.,-1.,1.],dtype=np.float32))

    def test_exact_model_record_is_bound_without_aliasing(self):
        api,surface,movement,network,_=self.fixture();packet=body.prepare(api,surface,movement,network)
        self.assertEqual(packet['physical_model'],PHYSICAL)
        self.assertEqual(packet['physical_model'],surface.support_manifest['physical_query_model'])
        packet['physical_model']['id']='mutated'
        self.assertEqual(surface.road_index.physical_model,PHYSICAL)

    def test_missing_or_unknown_support_model_refuses(self):
        for changes in (None,{'schema_version':2},{'id':'unknown'},{'definition_sha256':'0'*64},{'extra':True}):
            api,surface,movement,network,_=self.fixture()
            if changes is None:surface.support_manifest.pop('physical_query_model')
            else:surface.support_manifest['physical_query_model'].update(changes)
            with self.subTest(changes=changes),self.assertRaisesRegex(ValueError,'known conditional physical cook model'):
                body.prepare(api,surface,movement,network)

    def test_missing_or_mismatched_index_model_refuses(self):
        for model in (None,dict(PHYSICAL,id='unknown')):
            api,surface,movement,network,_=self.fixture();surface.terrain_index.physical_model=model
            with self.subTest(model=model),self.assertRaisesRegex(ValueError,'known physical cook model'):
                body.prepare(api,surface,movement,network)

    def test_rejected_or_ambiguous_face_cannot_be_returned_as_physical(self):
        for state in (0,-1):
            api,surface,movement,network,_=self.fixture()
            surface.terrain_index.physical_membership=np.array([state,1],dtype=np.int8)
            with self.subTest(state=state),self.assertRaisesRegex(ValueError,'cook-rejected or ambiguous'):
                body.prepare(api,surface,movement,network)

    def test_raw_only_selector_cannot_substitute_for_physical_pool(self):
        api,surface,movement,network,_=self.fixture();surface.road_index.physical_candidates=None
        with self.assertRaisesRegex(ValueError,'physical candidate selector'):
            body.prepare(api,surface,movement,network)

    def test_sealed_frame_is_bound_without_aliasing(self):
        api,surface,movement,network,_=self.fixture();authority=copy.deepcopy(FRAME)
        api.native_frame_record=lambda:authority
        packet=body.prepare(api,surface,movement,network)
        self.assertEqual(packet['native_frame'],FRAME)
        self.assertEqual(packet['frame'],'native-centimetres-Xeast-Ysouth-Zup-v2')
        self.assertEqual(packet['coordinate_model'],'binary64-cm-query-on-float32-esu-cm-vertices-v2')
        packet['native_frame']['definition_sha256']='0'*64
        self.assertEqual(authority,FRAME)
        self.assertEqual(surface.support_manifest['native_frame'],FRAME)

    def test_old_missing_unknown_and_mixed_packet_frames_refuse(self):
        variants=[None,dict(FRAME,id='native-centimetres-Xeast-Ynorth-Zup'),
                  dict(FRAME,definition_sha256='0'*64),dict(FRAME,schema_version=2),
                  dict(FRAME,schema_version=True),dict(FRAME,extra=True)]
        for role in ('movement','network','support','source manifest'):
            for variant in variants:
                api,surface,movement,network,_=self.fixture()
                if role=='source manifest':
                    packet=json.loads(api.admitted_record(None,None));packet['native_frame']=variant
                    api.admitted_record=lambda r,p,value=packet:json.dumps(value).encode()
                else:
                    packet={'movement':movement,'network':network,'support':surface.support_manifest}[role]
                    packet['native_frame']=variant
                with self.subTest(role=role,variant=variant),self.assertRaisesRegex(ValueError,role+' needs the current sealed native ESU'):
                    body.prepare(api,surface,movement,network)

    def test_index_frame_and_final_corner_order_are_explicit(self):
        for frame,corners in ((None,(0,2,1)),(dict(FRAME,id='old'),(0,2,1)),
                              (FRAME,None),(FRAME,(0,1,2)),(FRAME,[0,2,1]),(FRAME,(False,2,True))):
            api,surface,movement,network,_=self.fixture()
            surface.terrain_index.native_frame=frame;surface.terrain_index.native_corner_order=corners
            with self.subTest(frame=frame,corners=corners),self.assertRaisesRegex(ValueError,'index needs the sealed native ESU'):
                body.prepare(api,surface,movement,network)

    def test_packed_face_array_shape_dtype_and_selected_values_refuse(self):
        for mode in ('float64','shape','nan','outside'):
            api,surface,movement,network,_=self.fixture();value=surface.road_index.native_triangles_cm.copy()
            if mode=='float64':value=value.astype(np.float64)
            elif mode=='shape':value=value.reshape(2,9)
            elif mode=='nan':value[0,0,0]=np.nan
            else:value[0,0,1]=70001
            surface.road_index.native_triangles_cm=value
            with self.subTest(mode=mode),self.assertRaisesRegex(ValueError,'float32 native ESU|finite native centimetres'):
                body.prepare(api,surface,movement,network)

    def test_coverage_converts_once_while_source_windows_and_exclusions_stay_enu(self):
        api,surface,movement,network,xy=self.fixture()
        polygon=[[xy[0]-.5,xy[1]-.5],[xy[0]+.5,xy[1]-.5],[xy[0]+.5,xy[1]+.5],[xy[0]-.5,xy[1]+.5]]
        surface.buildings=[{'polygon':polygon}];before=copy.deepcopy((movement,network,polygon))
        converter=api.native_xy_cm;inputs=[]
        def convert(points):
            inputs.append(np.asarray(points,dtype=np.float64).copy());return converter(points)
        api.native_xy_cm=convert;packet=body.prepare(api,surface,movement,network)
        windows=packet['routes'][0]['windows'];self.assertEqual(len(inputs),len(windows))
        for original,window in zip(inputs,windows):
            packed=np.asarray(window['coverage_polygon_native_cm'])
            np.testing.assert_array_equal(packed[:,0],original[:,0]*100)
            np.testing.assert_array_equal(packed[:,1],-original[:,1]*100)
            self.assertTrue((original[:,1]>260).all());self.assertTrue((packed[:,1]<-26000).all())
            self.assertGreater(window['xy_bounds_m'][1],260)
            self.assertEqual(window['buildings_m'],[polygon])
            self.assertEqual(window['intervals'][0]['start_m'],xy)
            self.assertEqual(window['intervals'][0]['end_m'],[xy[0]+1,xy[1]])
        self.assertEqual((movement,network,polygon),before)

    def test_missing_or_wrong_producer_frame_api_refuses(self):
        for constructor in (None,lambda:dict(FRAME,definition_sha256='0'*64)):
            api,surface,movement,network,_=self.fixture();api.native_frame_record=constructor
            with self.subTest(constructor=constructor),self.assertRaisesRegex(ValueError,'producer needs the current sealed native ESU'):
                body.prepare(api,surface,movement,network)

    def test_main_refuses_old_movement_before_surface_or_source_initialization(self):
        api,surface,movement,network,_=self.fixture()
        api.OUT=TREE/'data/prepared/surface';movement['native_frame']=dict(FRAME,id='old')
        api.guarded_read=lambda *args,**kwargs:json.dumps({'movement':movement}).encode()
        api.admitted_record=lambda *args,**kwargs:json.dumps(network).encode()
        api.verify_base=mock.Mock(side_effect=AssertionError('source initialization must not run'))
        with mock.patch.dict(sys.modules,{'surface_network':api}),mock.patch.object(sys,'argv',['vehicle_body_support.py']):
            with self.assertRaisesRegex(ValueError,'movement needs the current sealed native ESU'):
                body.main()
        api.verify_base.assert_not_called()




    def test_reconstruction_wall_and_down_survivors_remain_complete_body_candidates(self):
        api,surface,movement,network,_=self.fixture()
        native=surface.terrain_index.native_triangles_cm.copy()
        # A true vertical projected-zero wall and a signed DOWN top both survive.
        native[0]=[[42700,-26600,900],[42700,-26600,1100],[42700,-26400,900]]
        native[1]=native[1][[0,2,1]]
        self.assertEqual(source.native_cook_membership(native).tolist(),[1,1])
        surface.terrain_index.native_triangles_cm=native
        surface.source3_terrain_refs=[{'kind':'inferred','triangle':20+i,'reconstruction_role':role} for i,role in enumerate(('physical-sidewall','support-top'))]
        packet=body.prepare(api,surface,movement,network)
        rows=[f for f in packet['faces'] if f['triangle'] in (20,21)]
        self.assertEqual(len(rows),2);self.assertTrue(all(f['requires_interval'] for f in rows))
        self.assertEqual([f['layer_kind'] for f in rows],['inferred','inferred'])
        self.assertEqual([f['layer_ref']['reconstruction_role'] for f in rows],['physical-sidewall','support-top'])
        self.assertEqual([f['layer_ref']['support_eligible'] for f in rows],[False,True])
        self.assertEqual(rows[0]['normal_z'],0);self.assertLess(rows[1]['normal_z'],0)
        self.assertTrue(all(f['cook_state']==1 for f in rows))
        self.assertTrue(all({f['triangle'] for f in rows}.issubset({packet['faces'][i]['triangle'] for i in w['face_ids']}) for w in packet['routes'][0]['windows']))

    def test_schema2_emits_literal_role_eligibility_for_every_physical_face(self):
        api,surface,movement,network,_=self.fixture()
        surface.source3_terrain_refs=[{'kind':'inferred','triangle':20+i,'reconstruction_role':role} for i,role in enumerate(('physical-transition','support-top'))]
        original=copy.deepcopy(surface.source3_terrain_refs)
        packet=body.prepare(api,surface,movement,network)
        self.assertEqual(packet['schema_version'],2)  # Historical schema1 must not qualify this contract.
        self.assertEqual(len(packet['faces']),4)
        self.assertEqual([f['layer_ref']['support_eligible'] for f in packet['faces']],[True,True,False,True])
        self.assertTrue(all(type(f['layer_ref']['support_eligible']) is bool for f in packet['faces']))
        self.assertEqual(surface.source3_terrain_refs,original)
        self.assertEqual(packet['native_frame'],FRAME)
        self.assertEqual(packet['physical_model'],PHYSICAL)
        ids=packet['routes'][0]['windows'][0]['face_ids']
        self.assertEqual(ids,[0,1,2,3])  # Ineligible transition is still a complete physical blocker.

    def test_schema2_refuses_unknown_role_or_nonliteral_and_mismatched_eligibility(self):
        for extra in ({'reconstruction_role':'unknown'}, {'reconstruction_role':None},
                      {'reconstruction_role':'physical-transition','support_eligible':True},
                      {'reconstruction_role':'physical-sidewall','support_eligible':0},
                      {'reconstruction_role':'support-top','support_eligible':1},
                      {'support_eligible':False}, {'support_eligible':'true'}):
            api,surface,movement,network,_=self.fixture()
            surface.source3_terrain_refs[0]={'kind':'inferred','triangle':20,**extra}
            with self.subTest(extra=extra),self.assertRaisesRegex(ValueError,'reconstruction role|literal Boolean'):
                body.prepare(api,surface,movement,network)
        api,surface,movement,network,_=self.fixture()
        surface.source3_terrain_refs[0]={'kind':'terrain','triangle':20,'reconstruction_role':'support-top'}
        with self.assertRaisesRegex(ValueError,'known inferred'):
            body.prepare(api,surface,movement,network)


if __name__=='__main__':unittest.main(verbosity=2)
