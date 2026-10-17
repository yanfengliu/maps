"""Bound: directed source authority and exact synthetic support, not city capacity."""
import collections
import copy
import pathlib
import sys
import types
import unittest
from unittest import mock

ROOT=pathlib.Path(__file__).absolute().parents[2]
sys.path.insert(0,str(ROOT/'tools/data'))
import surface_network as source
import support_topology as topology
np=source.np


class VehicleGroundSupport(unittest.TestCase):
    def setUp(self):
        self.surface=source.Surface.__new__(source.Surface)
        self.points={1:[0.,0.],2:[10.,0.],3:[10.,10.],4:[20.,10.]}
        self.ways={7:{'id':7,'nodes':[1,2],'tags':{'highway':'tertiary'}},
                   8:{'id':8,'nodes':[2,3],'tags':{'highway':'tertiary'}},
                   9:{'id':9,'nodes':[3,4],'tags':{'highway':'tertiary','oneway':'yes'}}}
        self.restrictions=types.SimpleNamespace(rejection=lambda a,b:None)
        self.surface.vehicle_source=(self.points,self.ways,self.restrictions)
        self.surface.building_bins=collections.defaultdict(list)
        self.surface.buildings=[]
        self.surface.dem_height=lambda point:0.
        self.surface.road_index=source.support_geometry.TriangleIndex(np.empty((0,3,3)))
        self.terrain=np.asarray([[[-10.,-10.,0.],[30.,-10.,0.],[30.,30.,0.]],
                                 [[-10.,-10.,0.],[30.,30.,0.],[-10.,30.,0.]]])
        self.set_terrain(self.terrain)
        self.lane=[[0.,1.8],[10.,1.8]]
        self.context=[((7,1,2),)]

    def set_terrain(self,triangles):
        self.surface.terrain_index=source.support_geometry.TriangleIndex(triangles)
        self.surface.terrain_sources=list(range(len(triangles)))

    def corridor(self,**kwargs):
        return self.surface.corridor(self.lane,'vehicle',2.,**kwargs)

    def test_exact_terrain_is_available_only_with_matching_directed_ground_lane(self):
        with self.assertRaisesRegex(ValueError,'no-admitted-road-support'):
            self.corridor()
        rows=self.corridor(vehicle_contexts=self.context)
        self.assertGreater(len(rows),2)
        for row in rows:
            for proof in [row,*row['cross_section']]:
                self.assertEqual(proof['source'],'GSI-DEM5A')
                self.assertEqual(proof['vehicle_source_interval']['directed_edges'],[[7,1,2]])
                self.assertEqual(proof['vehicle_source_interval']['osm_sha256'],source.CONFIG['osm']['sha256'])
                self.assertEqual(proof['point'][2],0.)
        # A source context belongs to this interval, not an arbitrary location.
        interval=self.surface.vehicle_interval(self.context[0],*self.lane,2.)
        with self.assertRaisesRegex(ValueError,'no-admitted-road-support'):
            self.surface.check([20,20],'vehicle',vehicle_interval=interval)
        forged=source.VehicleInterval((0.,1.8),(10.,1.8),2.,((999,1,2),))
        with self.assertRaisesRegex(ValueError,'not-admitted-ground-road'):
            self.surface.check([5,1.8],'vehicle',vehicle_interval=forged)

    def test_ground_eligibility_and_direction_refuse_invalid_source(self):
        for tags in ({'bridge':'yes'},{'tunnel':'yes'},{'layer':'1'},{'access':'private'},
                     {'motor_vehicle':'no'},{'motor_vehicle:conditional':'no @ (08:00-20:00)'},{'highway':'footway'}):
            with self.subTest(tags=tags),mock.patch.dict(self.ways[7]['tags'],tags):
                with self.assertRaisesRegex(ValueError,'not-admitted-ground-road'):
                    self.corridor(vehicle_contexts=self.context)
        for key in ((9,4,3),(7,1,3),(7,2,1)):
            with self.subTest(key=key),self.assertRaisesRegex(ValueError,'source-direction|does-not-match-source'):
                self.corridor(vehicle_contexts=[(key,)])
        with self.assertRaisesRegex(ValueError,'not-admitted-ground-road'):
            self.corridor(vehicle_contexts=[((999,1,2),)])

    def test_centre_query_reuse_preserves_independent_full_width_proofs(self):
        self.surface.diagnostic_counts=collections.Counter()
        rows=self.corridor(vehicle_contexts=self.context)
        self.assertEqual(self.surface.diagnostic_counts['check:vehicle'],3*len(rows))
        for row in rows:
            self.assertEqual([proof['offset_m'] for proof in row['cross_section']],[-1.,0,1.])
            centre=row['cross_section'][1]
            self.assertEqual(centre['point'],row['point'])
            self.assertEqual(centre['barycentric'],row['barycentric'])
            self.assertIsNot(centre['point'],row['point'])
            self.assertIsNot(centre['barycentric'],row['barycentric'])
            self.assertIsNot(centre['vehicle_source_interval'],row['vehicle_source_interval'])

    def test_context_cannot_authorize_another_segment_or_width(self):
        for polyline,width,contexts in (([[0,1.8],[10,2.8]],2,self.context),
                                        (self.lane,4,self.context),(self.lane,2,[])):
            with self.subTest(polyline=polyline,width=width),self.assertRaisesRegex(ValueError,'does-not-match-source|cover-each-directed'):
                self.surface.corridor(polyline,'vehicle',width,vehicle_contexts=contexts)
        self.surface.vehicle_source=None
        with self.assertRaisesRegex(ValueError,'requires-directed-source-interval'):
            self.corridor(vehicle_contexts=self.context)

    def test_final_polyline_keeps_lane_and_legal_turn_contexts(self):
        edges=[{'way_id':7,'from':1,'to':2,'points':self.lane},
               {'way_id':8,'from':2,'to':3,'points':[[8.2,0.],[8.2,10.]]}]
        points,contexts=source.vehicle_polyline(edges)
        self.assertEqual(contexts,[((7,1,2),),((7,1,2),(8,2,3)),((8,2,3),)])
        rows=self.surface.corridor(points,'vehicle',2.,vehicle_contexts=contexts)
        self.assertTrue(any(len(row['vehicle_source_interval']['directed_edges'])==2 for row in rows))
        with self.assertRaisesRegex(ValueError,'does-not-match-source'):
            self.surface.corridor(points,'vehicle',2.,vehicle_contexts=list(reversed(contexts)))
        self.restrictions.rejection=lambda a,b:{'relation_id':99}
        with self.assertRaisesRegex(ValueError,'turn-not-source-legal'):
            self.surface.corridor(points,'vehicle',2.,vehicle_contexts=contexts)
        self.restrictions.rejection=lambda a,b:None
        for invalid in (((7,1,2),(9,3,4)),((7,1,2),(7,2,1))):
            with self.subTest(invalid=invalid),self.assertRaisesRegex(ValueError,'turn-not-source-legal'):
                self.surface.vehicle_interval(invalid,[10.,1.8],[8.2,0.],2.)

    def test_grade_layer_and_full_width_building_checks_remain(self):
        slope=self.terrain.copy();slope[:,:,2]=slope[:,:,0]*.3
        self.set_terrain(slope)
        with self.assertRaisesRegex(ValueError,'unsupported-grade-change'):
            self.corridor(vehicle_contexts=self.context)
        upper=self.terrain.copy();upper[:,:,2]=.5
        self.set_terrain(np.concatenate((self.terrain,upper)))
        with self.assertRaisesRegex(ValueError,'stacked-rendered-support-layer'):
            self.corridor(vehicle_contexts=self.context)
        self.set_terrain(self.terrain)
        self.surface.buildings=[{'polygon':[[-1,.5],[11,.5],[11,1.],[-1,1.]]}]
        self.surface.building_bins[(0,0)]=[0]
        with self.assertRaisesRegex(ValueError,'building-interior'):
            self.corridor(vehicle_contexts=self.context)


class HistoricalWriterInputs(unittest.TestCase):
    def setUp(self):
        self.before=[{'path':path,'bytes':10,'sha256':'a'*64} for path in
                     ('data/prepared/terrain.glb','sources/shibuya.json','sources/surface_network.json',
                      'tools/data/surface_network.py','tools/data/support_topology.py')]

    def test_consumer_accepts_new_reader_code_but_producer_still_requires_exact_code(self):
        current=copy.deepcopy(self.before);current[-1]['sha256']='b'*64
        topology.check_preserved_inputs(self.before,self.before,current,historical_code=True)
        with self.assertRaisesRegex(ValueError,'preservation membership/bytes'):
            topology.check_preserved_inputs(self.before,self.before,current)

    def test_current_data_config_and_historical_run_integrity_are_required(self):
        for index in (0,1,2):
            current=copy.deepcopy(self.before);current[index]['sha256']='b'*64
            with self.subTest(index=index),self.assertRaisesRegex(ValueError,'preservation membership/bytes'):
                topology.check_preserved_inputs(self.before,self.before,current,historical_code=True)
        after=copy.deepcopy(self.before);after[-1]['sha256']='b'*64
        with self.assertRaisesRegex(ValueError,'preservation membership/bytes'):
            topology.check_preserved_inputs(self.before,after,self.before,historical_code=True)


if __name__=='__main__':unittest.main()
