"""Bound: finite retained/tiny operands, exact predicates and ordered corridors; no city."""
from pathlib import Path
from fractions import Fraction as F
import collections,copy,contextlib,hashlib,json,math,os,sys,types,unittest
from unittest import mock
ROOT=Path(__file__).absolute().parents[2]
sys.path.insert(0,str(ROOT/'tools/data'))
import surface_network as api
np=api.np

def outcome(value):
    if isinstance(value,Exception):return {'error':type(value).__name__,'message':str(value),'witness':getattr(value,'witness',None)}
    return {'hits':value}

def flat_world(schema=3):
    world=api.Surface.__new__(api.Surface)
    road=np.asarray([[[-10.,-10.,0.],[-10.,10.,0.],[10.,-10.,0.]],
                     [[10.,-10.,0.],[-10.,10.,0.],[10.,10.,0.]]])
    terrain=road.copy();terrain[:,:,2]=-.5
    cls=api.support_source3.NativeTriangleIndex if schema==3 else api.NativeTriangleIndex
    world.road_index=cls(road);world.terrain_index=cls(terrain)
    world.road=types.SimpleNamespace(layer_refs=[{'kind':'road','source_triangle_index':i} for i in range(2)])
    world.support_manifest={'schema_version':schema};world.terrain_sources=[0,1]
    world.source3_terrain_refs=[{'kind':'terrain','triangle':i} for i in range(2)]
    world.derived_record={'sha256':'literal-derived'};world.support_record={'sha256':'literal-support'}
    if schema==3:
        authority=NativeQueryBatch.fixture['source3_fixture_authority']
        if hashlib.sha256(world.road_index.native_triangles_cm.tobytes()).hexdigest()!=authority['source']['sha256']:
            raise ValueError('Literal synthetic Source3 native quad buffer differs from fixture authority')
        world.support_manifest['native_roads']=[{'actor_label':'synthetic-flat-road','triangles':2,'source':authority['source']}]
        for i,ref in enumerate(world.road.layer_refs):ref.update(source=0,mesh=0,primitive=0,triangle=i)
    world.building_bins={};world.buildings=[];world.dem_height=lambda point:0.
    world.diagnostic_counts=collections.Counter();world.network_diagnostic=None
    return world

def corridor_case(schema,kind):
    world=flat_world(schema)
    points=[[-.75,-.25],[1.5,.25],[2.5,1.]]
    return api.Surface.corridor(world,points,kind,1.2 if kind=='pedestrian' else 1.8)


def current_expected(value):
    """Retain literal historical numeric goldens; version only the declared model."""
    if isinstance(value, dict):
        return {k: (api.NATIVE_QUERY_MODEL if k == 'query_coordinate_model' else current_expected(v)) for k,v in value.items()}
    if isinstance(value, list): return [current_expected(v) for v in value]
    return value

class NativeQueryBatch(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        path=Path(os.environ.get('SHIBUYA_NATIVE_BATCH_FIXTURE',Path(__file__).parent/'fixtures/native-query-batch-current-source3.json'));raw=path.read_bytes()
        cls.fixture=json.loads(raw)
        cls.fixture_sha=hashlib.sha256(raw).hexdigest()
        assert cls.fixture_sha=='5dfd783fbb50ee731998b4e3fe290d1c32f81ec3dbb0ad32498be52d73d31980'

    def test_retained_current_original_goldens_both_classes_roles_sizes(self):
        fixture=self.fixture
        self.assertEqual(fixture['original_code_sha256'],'d7e72e795b850b770c32b4e5ea032685feccfb2111bc1aa92a4e949dc730c9c8')
        triangles=np.asarray([row['enu_m'] for row in fixture['faces']],float)
        points=np.asarray(fixture['queries'],float)
        for cls in [api.NativeTriangleIndex,api.support_source3.NativeTriangleIndex]:
            for role in ['physical','raw']:
                index=cls(triangles,query_role=role);before=index.native_triangles_cm.tobytes()
                for size in [1,2,4,8,32]:
                    actual=[]
                    for first in range(0,len(points),size):actual.extend(api._native_query_hits_batch(index,points[first:first+size]))
                    self.assertEqual(api.encoded([outcome(row) for row in actual]),api.encoded(current_expected(fixture['expected'][role])))
                backing=np.zeros((len(points),4));backing[:,::2]=points;noncontiguous=backing[:,::2]
                actual=[]
                for first in range(0,len(points),32):actual.extend(api._native_query_hits_batch(index,noncontiguous[first:first+32]))
                self.assertEqual(api.encoded([outcome(row) for row in actual]),api.encoded(current_expected(fixture['expected'][role])))
                self.assertEqual(index.native_triangles_cm.tobytes(),before)
                np.testing.assert_array_equal(noncontiguous,points)

    def test_exact_fraction_boundary_subnormal_and_raw_signed_facing(self):
        triangle=np.array([[0.,0.,2.],[0.,1.,2.],[1.,0.,2.]])
        triangles=np.asarray([triangle,triangle[[0,2,1]],[[0,0,0],[0,0,1],[0,1,0]]],float)
        index=api.NativeTriangleIndex(triangles,query_role='raw')
        points=np.asarray([[0.,0.],[.5,.5],[.5,np.nextafter(.5,math.inf)],
                           [.5,np.nextafter(.5,-math.inf)],[2**-1074,2**-1074],[-2**-1074,0.],[.25,.25]])
        def orientation(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
        for point,hits in zip(points,api._native_query_hits_batch(index,points)):
            query=[F(float(point[0])*100), F(-float(point[1])*100)];expected=[]
            for identity,face in enumerate(index.native_triangles_cm):
                a,b,c=[[F(float(value)) for value in row[:2]] for row in face]
                determinant=orientation(a,b,c)
                if not determinant:continue
                wedges=[orientation(u,v,query) for u,v in [(b,c),(c,a),(a,b)]]
                if all(value==0 or (value>0)==(determinant>0) for value in wedges):expected.append(identity)
            self.assertEqual([hit['triangle'] for hit in hits],expected)
            for hit in hits:
                self.assertEqual(hit['height'],2.)
                self.assertEqual(hit['normal_up_z'],1. if hit['triangle']==0 else -1.)

    def test_individual_nonfinite_and_physical_ambiguity_errors_are_deferred(self):
        index=api.NativeTriangleIndex(np.array([[[0.,0.,0.],[0.,2.,0.],[2.,0.,0.]]]))
        points=[[.1,.1],[math.nan,0.],[math.inf,0.],[np.finfo(float).max,0.],[.2,.2]]
        expected=[]
        for point in points:
            try:value=index.hits(*point)
            except Exception as error:value=error
            expected.append(outcome(value))
        self.assertEqual(api.encoded([outcome(v) for v in api._native_query_hits_batch(index,points)]),api.encoded(expected))
        index.physical_membership[0]=-1
        result=api._native_query_hits_batch(index,[[.1,.1],[4.,4.]])
        self.assertIsInstance(result[0],api.NativeCollisionModelError);self.assertEqual(result[1],[])
        index.query_role='raw';self.assertTrue(api._native_query_hits_batch(index,[[.1,.1]])[0])

    def test_over_budget_rows_fall_back_without_dropping_any_point_or_id(self):
        face=np.array([[[0.,0.,0.],[0.,2.,0.],[2.,0.,0.]]]);index=api.NativeTriangleIndex(np.repeat(face,257,axis=0))
        points=np.repeat([[.25,.25]],32,axis=0);expected=api.encoded(index.hits(.25,.25))
        original=api.native_query_hits;orientation=api._orientation;largest=[0]
        def observe(a,b,c):largest[0]=max(largest[0],len(a));return orientation(a,b,c)
        with mock.patch.object(api,'native_query_hits',wraps=original) as fallback,mock.patch.object(api,'_orientation',side_effect=observe):
            actual=api._native_query_hits_batch(index,points)
        self.assertEqual(fallback.call_count,32);self.assertEqual(largest[0],257)
        self.assertEqual(len(actual),32);self.assertTrue(all(api.encoded(value)==expected for value in actual))

    def test_batch_arithmetic_failure_isolated_by_original_point_path(self):
        index=api.NativeTriangleIndex(np.array([[[0.,0.,0.],[0.,2.,0.],[2.,0.,0.]]]))
        points=[[.1,.1],[.2,.2],[.3,.3],[.4,.4],[.5,.5]];expected=[index.hits(*p) for p in points]
        original=api._orientation
        def fail_large(a,b,c):
            if len(a)>4:raise ArithmeticError('literal-batch-only-failure')
            return original(a,b,c)
        with mock.patch.object(api,'_orientation',side_effect=fail_large):actual=api._native_query_hits_batch(index,points)
        self.assertEqual(api.encoded(actual),api.encoded(expected))

    def test_real_source2_source3_corridors_match_original_serialized_facts(self):
        for schema in [2,3]:
            for kind in ['pedestrian','vehicle']:
                with self.subTest(schema=schema,kind=kind):
                    self.assertEqual(api.encoded(corridor_case(schema,kind)),api.encoded(current_expected(self.fixture['corridors'][str(schema)+':'+kind])))

    def test_genuine_earlier_building_refusal_precedes_later_native_error(self):
        world=flat_world(3);world.building_bins={(0,0):[0]};world.buildings=[{'polygon':[[-.1,-.1],[.1,-.1],[.1,.1],[-.1,.1]]}]
        later=api.NativeCollisionModelError('literal-later-physical-query-error');encountered=[]
        original=world.road_index.candidates
        def candidates(lo,hi):
            if lo[0]>.5:encountered.append(tuple(lo));raise later
            return original(lo,hi)
        world.road_index.candidates=candidates
        with mock.patch.object(world,'dem_height',side_effect=AssertionError('building must refuse before DEM')):
            with self.assertRaises(Exception) as error:api.Surface.corridor(world,[[0.,0.],[3.,0.]],'pedestrian',1.2)
        self.assertIs(type(error.exception),ValueError);self.assertEqual(str(error.exception),'building-interior');self.assertTrue(encountered)
        self.assertFalse(hasattr(world,'_corridor_native_facts'))

    def test_demanded_error_identity_and_road_before_terrain_are_preserved(self):
        world=flat_world(2);road_error=api.NativeCollisionModelError('literal-road-error');terrain_error=ValueError('literal-terrain-error')
        for mesh,error in [(world.road_index,road_error),(world.terrain_index,terrain_error)]:
            original=mesh.candidates
            def point_error(lo,hi,original=original,error=error):
                if np.array_equal(lo,hi):raise error
                return original(lo,hi)
            mesh.candidates=point_error
        with self.assertRaises(api.NativeCollisionModelError) as error:api.Surface.corridor(world,[[0.,0.],[1.,0.]],'pedestrian',1.2)
        self.assertIs(error.exception,road_error);self.assertFalse(hasattr(world,'_corridor_native_facts'))

    def test_dem_error_precedes_prefetched_native_error_and_cleanup_restores_context(self):
        world=flat_world(3);previous=collections.deque();world._corridor_native_facts=previous
        dem_error=ValueError('literal-first-DEM-failure');native_error=api.NativeCollisionModelError('literal-unreached-query-error')
        original=world.road_index.candidates
        def point_error(lo,hi):
            if np.array_equal(lo,hi):raise native_error
            return original(lo,hi)
        world.dem_height=mock.Mock(side_effect=dem_error);world.road_index.candidates=point_error
        with self.assertRaises(ValueError) as error:api.Surface.corridor(world,[[0.,0.],[1.,0.]],'pedestrian',1.2)
        self.assertIs(error.exception,dem_error);self.assertIs(world._corridor_native_facts,previous)

    def test_proxy_path_keeps_original_check_order_without_native_metadata(self):
        mesh=types.SimpleNamespace(segment_breakpoints=lambda a,b:[])
        calls=[]
        def check(point,kind,**kwargs):calls.append(tuple(point));return [float(point[0]),float(point[1]),0.],{'gradient_enu':[0.,0.]}
        world=types.SimpleNamespace(road_index=mesh,terrain_index=mesh,check=check,support_manifest={})
        api.Surface._corridor(world,[[0.,0.],[1.,0.]],'pedestrian',1.2)
        self.assertEqual(calls,[(0.,0.),(0.,-.6),(0.,.6),(1.,0.),(1.,-.6),(1.,.6)])
        self.assertFalse(hasattr(world,'_corridor_native_facts'))

if __name__=='__main__':unittest.main()
