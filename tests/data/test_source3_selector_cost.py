"""Bound: exact selector reuse, mutable-input guards and finite original controls; no index."""
from pathlib import Path
from fractions import Fraction
import copy,json,math,sys,types,unittest
from unittest import mock
ROOT=Path(__file__).absolute().parents[2]
sys.path.insert(0,str(ROOT/'tools/data'))
import surface_network as api
np=api.np


def face(z=0.):
    return np.asarray([[0.,0.,z],[0.,100.,z],[100.,0.,z]],dtype=np.float32)


def selector_world():
    road=np.asarray([face(0.)]);terrain=np.asarray([face(20.)])
    return types.SimpleNamespace(road_index=types.SimpleNamespace(native_triangles_cm=road),
        terrain_index=types.SimpleNamespace(native_triangles_cm=terrain),
        road=types.SimpleNamespace(layer_refs=[{'kind':'road','source':0}]),
        support_manifest={'native_roads':[{'actor_label':'road_actor'}]},terrain_sources=[0])


def hit(z=0.):return dict(triangle=0,height=z,normal_enu=[0.,0.,1.],normal_up_z=1.)

def query():return api._source3_ground_query([.1,.1],0.)


class Source3SelectorCost(unittest.TestCase):
    def setUp(self):api._source3_cached_collision_plane.cache_clear()
    def tearDown(self):api._source3_cached_collision_plane.cache_clear()

    def test_repeated_vertex_values_reuse_actual_exact_backend_and_immutable_plane(self):
        original=api.support_source3.collision_plane
        with mock.patch.object(api.support_source3,'collision_plane',wraps=original) as actual:
            first=api._source3_selector_plane(face(12.5))
            for _ in range(20):self.assertIs(api._source3_selector_plane(face(12.5)),first)
            self.assertEqual(actual.call_count,1)
        self.assertEqual(first,(Fraction(0),Fraction(0),Fraction(25,2)))
        self.assertIsInstance(first,tuple)
        with self.assertRaises(TypeError):first[2]=Fraction(0)

    def test_same_array_and_aliased_backing_mutations_never_reuse_old_plane(self):
        backing=np.asarray([face(0.)]);alias=backing[0]
        self.assertEqual(api._source3_selector_plane(alias)[2],Fraction(0))
        backing[0,:,2]=50
        self.assertEqual(api._source3_selector_plane(alias)[2],Fraction(50))
        alias[:,2]=-25
        self.assertEqual(api._source3_selector_plane(backing[0])[2],Fraction(-25))
        self.assertEqual(api._source3_cached_collision_plane.cache_info().misses,3)

    def test_reused_face_id_replaced_index_array_and_selector_hit_identity(self):
        s=selector_world();road=hit();terrain=hit(.2)
        role,selected=api._source3_first_blocker(s,query(),[road],[terrain])
        self.assertEqual(role,'terrain');self.assertIs(selected,terrain)
        s.road_index.native_triangles_cm=np.asarray([face(50.)])
        role,selected=api._source3_first_blocker(s,query(),[road],[terrain])
        self.assertEqual(role,'road');self.assertIs(selected,road)
        self.assertEqual(road['height'],0.)  # Selector preserves the actual hit object.

    def test_strided_endian_and_distinct_sources_bind_consumed_values(self):
        f=np.asarray([[0.,0.,1.],[0.,100.,2.],[100.,0.,3.]],dtype=np.float64)
        expected=(Fraction(1,50),Fraction(1,100),Fraction(1))
        backing=np.empty((3,6));backing[:,::2]=f;backing[:,1::2]=123.
        for values in [f,np.asfortranarray(f),backing[:,::2],f.astype('>f8'),f.astype(np.float32)]:
            self.assertEqual(api._source3_selector_plane(values),expected)
        changed=f.copy();changed[:,2]+=1
        self.assertEqual(api._source3_selector_plane(changed)[2],Fraction(2))
        self.assertEqual(api._source3_selector_plane(f),expected)

    def test_nonfinite_and_shape_failures_follow_original_and_are_not_cached(self):
        original=api.support_source3.collision_plane
        malformed=[np.zeros((2,3)),np.zeros((3,3)),face()]
        malformed[2][0,0]=np.nan
        infinite=face();infinite[2,2]=np.inf;malformed.append(infinite)
        for values in malformed:
            with self.subTest(shape=values.shape):
                try:original(values,'Source3 ground nomination')
                except Exception as expected:
                    for _ in range(2):
                        with self.assertRaises(type(expected)) as actual:api._source3_selector_plane(values)
                        self.assertEqual(str(actual.exception),str(expected))
                else:self.fail('Literal invalid control unexpectedly accepted')
        self.assertEqual(api._source3_cached_collision_plane.cache_info().currsize,0)
        values=face();api._source3_selector_plane(values);values[0,0]=np.nan
        with self.assertRaisesRegex(ValueError,'finite'):api._source3_selector_plane(values)

    def test_backend_function_identity_and_primary_failure_are_not_hidden(self):
        values=face();api._source3_selector_plane(values)
        failure=api.NativeCollisionModelError('literal-backend-fatal')
        def failing(points,label):raise failure
        with mock.patch.object(api.support_source3,'collision_plane',failing):
            for _ in range(2):
                with self.assertRaises(api.NativeCollisionModelError) as actual:api._source3_selector_plane(values)
                self.assertIs(actual.exception,failure)
        self.assertFalse(issubclass(type(failure),ValueError))
        self.assertEqual(api._source3_selector_plane(values)[2],Fraction(0))

    def test_bounded_lru_eviction_recomputes_the_actual_same_request(self):
        original=api.support_source3.collision_plane
        with mock.patch.object(api.support_source3,'collision_plane',wraps=original) as actual:
            for value in range(4097):api._source3_selector_plane(face(float(value)))
            self.assertEqual(api._source3_cached_collision_plane.cache_info().maxsize,4096)
            self.assertEqual(api._source3_cached_collision_plane.cache_info().currsize,4096)
            self.assertEqual(actual.call_count,4097)
            self.assertEqual(api._source3_selector_plane(face(0.))[2],Fraction(0))
            self.assertEqual(actual.call_count,4098)
            self.assertEqual(api._source3_cached_collision_plane.cache_info().currsize,4096)

    def test_warm_geometry_does_not_cache_actor_normal_range_or_refusal(self):
        s=selector_world();road=hit();terrain=hit(.2)
        api._source3_first_blocker(s,query(),[road],[terrain],kind='pedestrian')
        s.terrain_index.native_triangles_cm[0,:,2]=0
        self.assertIs(api._source3_first_blocker(s,query(),[road],[terrain],kind='pedestrian')[1],road)
        del s.support_manifest['native_roads'][0]['actor_label']
        with self.assertRaisesRegex(api.NativeCollisionModelError,'actor label'):
            api._source3_first_blocker(s,query(),[road],[terrain],kind='pedestrian')
        s.support_manifest['native_roads'][0]['actor_label']='City_069_terrain'
        self.assertIs(api._source3_first_blocker(s,query(),[road],[terrain],kind='pedestrian')[1],road)
        terrain['normal_enu']=[0.,0.,-1.]
        with self.assertRaisesRegex(api.SupportRejection,'source3-physical-first-hit-tie'):
            api._source3_first_blocker(s,query(),[road],[terrain],kind='pedestrian')
        q=query();q['start_m'][2]=-.1;q['end_m'][2]=-.2
        with self.assertRaisesRegex(api.SupportRejection,'no-physical-source-ground-blocker') as error:
            api._source3_first_blocker(s,q,[road],[terrain])
        self.assertEqual(len(error.exception.witness['source_ground_query']['outside_window_hits']),2)

    def test_all_retained_actual_face_planes_are_exactly_unchanged(self):
        path=Path(__file__).parent/'fixtures/source3-first-blocker.json'
        fixture=json.loads(path.read_bytes())
        for row in fixture['faces']:
            values=np.asarray(row['native_f32_cm'],dtype=np.float32)
            expected=api.support_source3.collision_plane(values,'Source3 ground nomination')[0]
            self.assertEqual(api._source3_selector_plane(values),expected)
            self.assertEqual(api._source3_selector_plane(values.copy()),expected)

if __name__=='__main__':unittest.main()
