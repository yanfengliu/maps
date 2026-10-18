"""Bound: selected-face arithmetic/authority; no Source world, route, body or native acceptance."""
import copy
import hashlib
import json
import math
import sys
import types
import unittest
from fractions import Fraction
from pathlib import Path
from unittest import mock

ROOT = Path(__file__).absolute().parents[2]
sys.path.insert(0,str(ROOT/'tools/data'))
import surface_network as api
import support_source3 as source3
np = api.np


def exact_height(vertices, point):
    # Independent determinant equation, using captured binary32 vertices and
    # actual binary64-cm queries. Do not call the checked production plane.
    a,b,c = [[Fraction(float(v)) for v in p] for p in vertices]
    x,y = [Fraction(float(v)*100) for v in point[:2]]
    u,v = [b[i]-a[i] for i in range(3)],[c[i]-a[i] for i in range(3)]
    determinant = u[0]*v[1]-u[1]*v[0]
    return (a[2]+((x-a[0])*(u[2]*v[1]-u[1]*v[2])+(y-a[1])*(u[0]*v[2]-u[2]*v[0]))/determinant)/100


def witness_model(triangles_cm, refs=None):
    # Minimal in-process admitted-witness shapes for the existing resolver;
    # padding is not geometry/source admission and is never queried.
    source = np.asarray(triangles_cm,dtype=np.float32)
    native = source[:,[0,2,1]]*np.array([1,-1,1],dtype=np.float32)
    states = api.native_cook_membership(native)
    if not np.all(states == 1):raise AssertionError('Captured selected faces must be cook survivors')
    road = refs is not None
    if road:
        count = max(r['source'] for r in refs)+1
        mappings = [{'triangles':1,'source':{'sha256':'r'*64}} for _ in range(count)]
        for r in refs:mappings[r['source']]['triangles']=max(mappings[r['source']]['triangles'],r['source_triangle_index']+1)
        positions = [sum(m['triangles'] for m in mappings[:r['source']])+r['source_triangle_index'] for r in refs]
        size = sum(m['triangles'] for m in mappings)
    else:
        refs = [{'kind':'terrain-fragment','triangle':i,'parent_triangle':i} for i in range(len(source))]
        mappings=[];positions=list(range(len(source)));size=len(source)
    packed=np.zeros((size,3,3),dtype=np.float32);physical=np.zeros(size,dtype=np.int8);layer=[None]*size
    for i,pos in enumerate(positions):packed[pos]=native[i];physical[pos]=states[i];layer[pos]=copy.deepcopy(refs[i])
    index=types.SimpleNamespace(native_triangles_cm=packed,physical_membership=physical,
        triangles=packed.astype(np.float64)[:,[0,2,1]]*np.array([.01,-.01,.01]))
    surface=types.SimpleNamespace(support_manifest={'schema_version':3,'native_roads':mappings},
        support_record={'sha256':'s'*64},derived_record={'sha256':'d'*64})
    if road:surface.road=types.SimpleNamespace(layer_refs=layer);surface.road_index=index
    else:surface.source3_terrain_refs=layer;surface.terrain_index=index
    records=[]
    for r in refs:
        records.append({'source':'PLATEAU-road' if road else 'GSI-DEM5A','triangle':r['source_triangle_index'] if road else r['triangle'],
            'layer_ref':copy.deepcopy(r),'support_geometry':'exact-derived-triangle-native-cm',
            'support_surface_sha256':'s'*64,'derived_terrain_sha256':'d'*64,
            **({'support_road_sha256':'r'*64} if road else {})})
    return surface,records,index,positions


class Source3SpanGrade(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        raw=(Path(__file__).parent/'fixtures/source3-span-grade.json').read_bytes()
        cls.fixture=json.loads(raw)
        cls.fixture_sha256=hashlib.sha256(raw).hexdigest()

    def call(self,arm,maximum=.2,points=None):
        s,r,_,_=witness_model(arm['native_SourceENU_cm_triangles'],arm.get('selected_layer_refs'))
        p,q=points or (arm['previous'],arm['current'])
        if arm['native_SourceENU_cm_triangles'][0]==arm['native_SourceENU_cm_triangles'][1]:r[1]=copy.deepcopy(r[0])
        return source3.span_grade(p,q,maximum,surface=s,previous_record=r[0],current_record=r[1])

    def test_retained_capacity_different_selected_faces_false_reds(self):
        for arm in self.fixture['arms'][:2]:
            with self.subTest(arm=arm['name']):
                with self.assertRaisesRegex(ValueError,'exceeds'):source3.span_grade(arm['previous'],arm['current'],.2)
                self.assertNotEqual(*arm['selected_layer_refs'])
                self.assertAlmostEqual(self.call(arm),arm['exact_grade'],places=15)

    def test_literal_rational_operands_independently_bind_expected_results(self):
        for arm in self.fixture['arms']:
            p,q=arm['previous'],arm['current'];a,b=arm['native_SourceENU_cm_triangles']
            delta=exact_height(b,q)-exact_height(a,p)
            distance2=sum((Fraction(float(q[i]))-Fraction(float(p[i])))**2 for i in (0,1))
            self.assertEqual(delta,Fraction(arm['exact_selected_height_delta_m_q']))
            self.assertEqual(distance2,Fraction(arm['original_metre_distance_squared_q']))
            self.assertEqual([[str(Fraction(float(v*100))) for v in point[:2]] for point in (p,q)],arm['exact_query_cm'])
            self.assertEqual(delta**2<=Fraction(.2)**2*distance2,arm['passes_point2_exact'])

    def test_lane53_actual_cm_query_differs_from_unrounded_metre_gradient(self):
        arm=self.fixture['arms'][2]
        self.assertAlmostEqual(self.call(arm),.024396313314741413,places=15)
        self.assertNotAlmostEqual(self.call(arm),arm['old_sameface_gradient_expected'],places=6)

    def test_genuine_v6_grade_remains_red_and_steiner_plane_remains_below_limit(self):
        with self.assertRaisesRegex(ValueError,'grade 0.202824'):self.call(self.fixture['arms'][3])
        self.assertAlmostEqual(self.call(self.fixture['arms'][4]),.016717962831009764,places=15)

    def test_rounded_pass_cannot_hide_real_steep_plane(self):
        s,r,_,_=witness_model([[[0,0,100],[100,0,200],[0,100,100]]]*2)
        p=[1e-20,0.,1.];q=[2e-20,0.,1.]
        self.assertEqual(source3.span_grade(p,q,.2),0.)
        with self.assertRaisesRegex(ValueError,'exceeds'):source3.span_grade(p,q,.2,surface=s,previous_record=r[0],current_record=r[1])

    def test_true_selected_face_step_is_not_replaced_by_one_common_plane(self):
        s,r,_,_=witness_model([[[0,0,0],[100,0,0],[0,100,0]],[[0,0,10],[100,0,10],[0,100,10]]])
        with self.assertRaisesRegex(ValueError,'exceeds'):source3.span_grade([.1,0,0],[.2,0,.1],.2,surface=s,previous_record=r[0],current_record=r[1])

    def test_float32_neighbor_planes_keep_both_original_thresholds(self):
        for maximum in (.2,.6):
            for direction,allowed in ((-math.inf,True),(math.inf,False)):
                cm=float(np.nextafter(np.float32(maximum*100),np.float32(direction)))
                tri=[[0,0,0],[100,0,cm],[0,100,0]]
                s,r,_,_=witness_model([tri]*2)
                call=lambda:source3.span_grade([0,0,0],[1,0,cm/100],maximum,surface=s,previous_record=r[0],current_record=r[1])
                if allowed:self.assertLess(call(),maximum)
                else:
                    with self.assertRaisesRegex(ValueError,'exceeds'):call()

    def test_finite_tiny_span_true_step_refuses_without_conversion_overflow(self):
        s,r,_,_=witness_model([[[0,0,0],[100,0,0],[0,100,0]],[[0,0,100],[100,0,100],[0,100,100]]])
        with self.assertRaisesRegex(ValueError,'exceeds'):
            source3.span_grade([0,0,0],[1e-200,0,1],.2,surface=s,previous_record=r[0],current_record=r[1])

    def test_zero_length_unequal_is_refused_before_any_face_resolution(self):
        with mock.patch.object(source3,'same_native_triangle') as resolve:
            with self.assertRaisesRegex(ValueError,'zero-length'):source3.span_grade([1,2,0],[1,2,.001],.2,surface=types.SimpleNamespace(support_manifest={'schema_version':3}))
            resolve.assert_not_called()

    def test_warmed_cache_cannot_hide_native_buffer_mutation_or_authority_loss(self):
        tri=[[[0,0,0],[100,0,10],[0,100,0]]]*2
        s,r,index,pos=witness_model(tri)
        kwargs={'surface':s,'previous_record':r[0],'current_record':r[1]}
        self.assertAlmostEqual(source3.span_grade([0,0,0],[1,0,.1],.2,**kwargs),.1)
        # Native is authoritative, even while the source-working array is stale.
        index.native_triangles_cm[pos[1],2,2]=100
        with self.assertRaisesRegex(ValueError,'exceeds'):source3.span_grade([0,0,0],[1,0,.1],.2,**kwargs)
        index.native_triangles_cm[pos[1],2,2]=10
        s.support_record['sha256']='x'*64
        with self.assertRaisesRegex(ValueError,'authority'):source3.span_grade([0,0,0],[1,0,.1],.2,**kwargs)

    def test_each_selected_face_requires_current_ref_namespace_digest_and_cook(self):
        arm=self.fixture['arms'][0]
        for key,value in [('source','GSI-DEM5A'),('triangle',0),('support_surface_sha256','x'*64),
                          ('derived_terrain_sha256','x'*64),('support_road_sha256','x'*64),
                          ('support_geometry','rounded'),('layer_ref',{'kind':'road','source':99})]:
            s,r,_,_=witness_model(arm['native_SourceENU_cm_triangles'],arm['selected_layer_refs'])
            r[1][key]=value
            with self.subTest(key=key),self.assertRaisesRegex(ValueError,'authority'):
                source3.span_grade(arm['previous'],arm['current'],.2,surface=s,previous_record=r[0],current_record=r[1])
        for state in (0,-1):
            s,r,index,pos=witness_model(arm['native_SourceENU_cm_triangles'],arm['selected_layer_refs']);index.physical_membership[pos[1]]=state
            with self.assertRaisesRegex(ValueError,'authority'):source3.span_grade([0,0,0],[1,0,0],.2,surface=s,previous_record=r[0],current_record=r[1])

    def test_missing_or_nonfinite_actual_native_buffer_never_uses_stale_source_array(self):
        for defect in ('missing','wrongtype','nonfinite'):
            s,r,index,_=witness_model([[[0,0,0],[100,0,10],[0,100,0]]]*2)
            if defect=='missing':del index.native_triangles_cm
            elif defect=='wrongtype':index.native_triangles_cm=index.native_triangles_cm.astype(np.float64)
            else:index.native_triangles_cm[1,0,0]=np.nan
            with self.subTest(defect=defect),self.assertRaisesRegex(ValueError,'authority'):
                source3.span_grade([0,0,0],[1,0,.1],.2,surface=s,previous_record=r[0],current_record=r[1])

    def test_real_model_backend_errors_still_propagate_after_warming(self):
        arm=self.fixture['arms'][4]
        self.call(arm)
        with mock.patch.object(source3,'collision_plane',side_effect=api.NativeCollisionModelError('actual model unavailable')):
            with self.assertRaises(api.NativeCollisionModelError):self.call(arm)

    def test_source1_and_source2_numeric_path_is_unchanged(self):
        for schema in (1,2):
            s=types.SimpleNamespace(support_manifest={'schema_version':schema})
            self.assertEqual(source3.span_grade([0,0,0],[1,0,.1],.2,surface=s),.1)
            with self.assertRaisesRegex(ValueError,'exceeds'):source3.span_grade([0,0,0],[1,0,.3],.2,surface=s)

    def test_all_existing_physical_face_namespaces_resolve_without_reselection(self):
        tri=[[[0,0,0],[100,0,10],[0,100,0]]]*2
        for kind in ('terrain','terrain-fragment','inferred','road','derived-road'):
            refs=None if kind not in ('road','derived-road') else [{'kind':kind,'source':0,'triangle':i,'source_triangle_index':i} for i in (0,1)]
            s,r,index,_=witness_model(tri,refs)
            if kind in ('terrain','terrain-fragment','inferred'):
                for row in r:row['layer_ref']['kind']=kind
                if kind=='inferred':
                    s.road_index=index;s.road=types.SimpleNamespace(layer_refs=[x['layer_ref'] for x in r])
                    for row in r:row['source']='inferred-ground-road'
                else:s.source3_terrain_refs=[x['layer_ref'] for x in r]
            elif kind=='derived-road':
                for row in r:row['source']='derived-ground-road'
            with self.subTest(kind=kind):
                self.assertAlmostEqual(source3.span_grade([0,0,0],[1,0,.1],.2,surface=s,previous_record=r[0],current_record=r[1]),.1)


if __name__=='__main__':unittest.main()
