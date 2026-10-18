"""Bound: small explicit edit contracts/native coordinates; no city/native acceptance."""
import copy
import collections
import contextlib
import importlib
import json
import itertools
import math
import struct
import sys
import tempfile
import types
import unittest
from fractions import Fraction
from unittest import mock
from pathlib import Path

ROOT = Path(__file__).absolute().parents[2]
sys.path.insert(0, str(ROOT/'tools/data'))
sys.path.insert(0, str(ROOT/'data/runtime'))
import numpy as np
import support_source3 as source3
import surface_network as api


class Source3Tests(unittest.TestCase):
    def test_native_coordinate_rounding_closes_only_a_representational_gap(self):
        raw = np.array([100.000001, 100.000002], dtype=np.float64)
        self.assertGreater(raw[1]-raw[0], 0)
        native = source3.native_metres(raw)
        self.assertEqual(native[0], native[1])
        self.assertNotEqual(source3.native_metres([100., 100.001])[0], source3.native_metres([100., 100.001])[1])

    def test_native_index_does_not_extrapolate_into_a_real_slit(self):
        index = source3.NativeTriangleIndex(np.array([[[0, 0, 0], [1, 0, 0], [0, 1, 0]]]))
        self.assertEqual(len(index.hits(.25, .25)), 1)
        self.assertEqual(index.hits(-1e-8, .25), [])
        np.testing.assert_allclose(index.segment_breakpoints([-.5, .25], [.5, .25]), [.5], rtol=0, atol=0)

    def test_short_and_zero_spans_keep_physical_grade_requirement(self):
        self.assertAlmostEqual(source3.span_grade([0, 0, 0], [1e-6, 0, 1e-7], .2), .1)
        with self.assertRaisesRegex(ValueError, 'exceeds'):
            source3.span_grade([0, 0, 0], [1e-6, 0, .001], .2)
        with self.assertRaisesRegex(ValueError, 'zero-length'):
            source3.span_grade([0, 0, 0], [0, 0, .001], .2)

    def overlap_planes(self, gap_cm=10):
        lower=np.array([[0.,0.,0.],[0.,100.,0.],[100.,0.,0.]])
        upper=lower.copy();upper[:,2]+=gap_cm
        return upper,lower

    def test_actual_source3_overlap_is_diagnostic_without_waiving_domain_or_routes(self):
        upper, lower = self.overlap_planes(10)
        ledger = {'regions': [{'id': 'r', 'native_xy_polygons_cm': [[[-100, -100], [-100, 500], [500, -100]]]}],
            'terrain_edits': [], 'deleted_parent_triangles': []}
        parent = types.SimpleNamespace(road=types.SimpleNamespace(sources=[{}], source_parts={0: [(0, 0, {'POSITION': lower[:, [0, 2, 1]]/100}, np.array([[0, 1, 2]]))]}),
            _source3_new_road_refs=[{'kind': 'derived-road', 'source': 0, 'mesh': 0, 'primitive': 0, 'original_triangle': 0, 'triangle': 0}], terrain_index=types.SimpleNamespace(triangles=np.empty((0, 3, 3))))
        labels = [{'kind': 'retained-parent-fragment', 'parent_triangle': 0, 'region_id': 'r'}]
        def admit(terrain, labels): return source3.validate_local_geometry(api, ledger, parent, terrain/100, lower[None]/100, [], labels)
        result = admit(upper[None], labels)
        self.assertEqual(len(result['global_overlaps']['pairs']), 1)
        self.assertEqual(result['global_overlaps']['pairs'][0]['maximum_gap_cm_q'], '10')
        # A two-triangle current upper surface must expose BOTH full operands.
        a = np.array([upper[0], upper[1], (upper[1]+upper[2])/2]); b = np.array([upper[0], (upper[1]+upper[2])/2, upper[2]])
        result = admit(np.array([a, b]), labels*2)
        self.assertEqual(len(result['global_overlaps']['pairs']), 2)
        b[1, 2] = b[2, 2] = 21
        result = admit(np.array([a, b]), labels*2)
        self.assertTrue(any(Fraction(row['maximum_gap_cm_q']) > 20 for row in result['global_overlaps']['pairs']))
        self.assertTrue(result['changed_face_coverage'])
        self.assertEqual(result['global_overlaps']['scope'], 'DIAGNOSTIC_NOT_SUPPORT_ADMISSION')

    def numpy_wire_evidence_fixture(self):
        upper, lower = self.overlap_planes(10)
        other = lower.copy(); other[:, 0] += 200
        roads = np.array([lower, other])/100
        outputs = roads.copy(); outputs[:, :, 2] += .1
        original = roads.copy(); original[0, :, 2] -= .0005
        parts = [(0, 0, {'POSITION': original[:, :, [0, 2, 1]].reshape(-1, 3)}, np.array([[0, 1, 2], [3, 4, 5]]))]
        refs = [{'kind':'derived-road','source':0,'mesh':0,'primitive':0,'original_triangle':i,'triangle':i} for i in range(2)]
        parent = types.SimpleNamespace(road=types.SimpleNamespace(sources=[{}],source_parts={0:parts}),
            _source3_new_road_refs=refs,terrain_index=types.SimpleNamespace(triangles=np.empty((0,3,3))))
        ledger = {'regions':[{'id':'r','native_xy_polygons_cm':[[[-100,-100],[-100,500],[500,-100]]]}],
            'terrain_edits':[],'deleted_parent_triangles':[]}
        labels = [{'kind':'retained-parent-fragment','parent_triangle':i,'region_id':'r'} for i in range(2)]
        # Actual spatial candidates are NumPy integers, unlike enumerate/range.
        candidates = api.support_geometry.TriangleIndex(outputs).candidates(np.array([0,0]),np.array([1,1]))
        self.assertIsInstance(candidates[0],np.integer)
        return source3.validate_local_geometry(api,ledger,parent,outputs,roads,[],labels)

    def test_actual_numpy_overlap_evidence_encodes_and_roundtrips_without_coercion(self):
        evidence = self.numpy_wire_evidence_fixture()
        # The ordinary manifest encoder must succeed with its strict default;
        # no generic NumPy encoder/default hook may conceal a wire type error.
        decoded = json.loads(api.encoded({'schema_version':3,'evidence':evidence}))
        self.assertEqual(decoded['evidence'],evidence)
        for raw in evidence['global_overlaps']['pairs']:
            self.assertIs(type(raw['identity']['terrain_triangle']),int)
            self.assertIs(type(raw['identity']['ground_triangle']),int)
        pairs = decoded['evidence']['global_overlaps']['pairs']
        self.assertEqual([(row['identity']['terrain_triangle'],row['identity']['ground_triangle']) for row in pairs],[(0,0),(1,1)])
        for row in pairs:
            self.assertIs(type(row['identity']['terrain_triangle']),int)
            self.assertIs(type(row['identity']['ground_triangle']),int)
            self.assertEqual(row['scope'],'SOURCE_OVERLAP_DIAGNOSTIC_NOT_SUPPORT_ADMISSION')
            self.assertEqual(Fraction(row['minimum_gap_cm_q']),10)
            self.assertEqual(Fraction(row['maximum_gap_cm_q']),10)
        self.assertTrue(decoded['evidence']['changed_face_coverage'])

    def correspondence_fixture(self, heights):
        triangle = np.array([[0.,0.,0.],[0.,1.,0.],[1.,0.,0.]])
        roads = triangle[None].copy(); roads[:,:,2] = 0
        terrain = np.repeat(triangle[None], len(heights), axis=0)
        for i, z in enumerate(heights): terrain[i,:,2] = z
        refs = [{'kind':'derived-road','source':0,'mesh':0,'primitive':0,'triangle':0,'source_triangle_index':0}]
        mappings = [{'actor_label':'City_road','source_path':'data/road.glb'}]
        return roads, terrain, refs, mappings

    def test_changed_face_rays_use_fixed_reference_interval_and_keep_occlusion(self):
        roads, terrain, refs, mappings = self.correspondence_fixture([.31, 2.])
        samples, statuses = source3.changed_road_samples(roads, refs, mappings, source3.NativeTriangleIndex(roads), source3.NativeTriangleIndex(terrain), {'path':'data/terrain.glb'})
        self.assertEqual(len(samples),1)
        self.assertEqual(statuses[0]['status'],'occluded')
        self.assertEqual(statuses[0]['support_eligibility'],'not-evaluated')
        sample=samples[0]
        self.assertEqual(sample['reference']['position_m'][2],0.)
        self.assertEqual(sample['start_m'][2],.8); self.assertEqual(sample['end_m'][2],-1.)
        self.assertEqual(sample['expected']['actor_label'],'City_069_terrain')
        self.assertEqual(sample['expected']['source_triangle_index'],0)
        self.assertAlmostEqual(sample['expected']['position_m'][2],.31)
        self.assertEqual(len(statuses[0]['source_operands']),2) # road0 + terrain.31;2m deck excluded
        # No pre-first-hit eligibility filter: upper geometry remains the oracle
        # even though only the lower road was the motivating eligible reference.
        self.assertEqual(sample['scope'],'SOURCE_GEOMETRY_CORRESPONDENCE_NOT_SUPPORT_ELIGIBILITY')
        terrain[:1,:,2]=.9
        samples,statuses=source3.changed_road_samples(roads,refs,mappings,source3.NativeTriangleIndex(roads),source3.NativeTriangleIndex(terrain),{'path':'data/terrain.glb'})
        self.assertEqual(statuses[0]['status'],'visible')
        self.assertEqual(samples[0]['expected']['actor_label'],'City_road')
        # An ineligible bridge actor is still the correspondence first blocker;
        # its mapped-way exclusion remains a separate required admission.
        bridge = roads.copy(); bridge[:,:,2] = .31
        refs2 = [refs[0], dict(refs[0], kind='road', source=1)]
        mappings2 = mappings+[{'actor_label':'City_bridge','source_path':'data/bridge.glb'}]
        samples,statuses=source3.changed_road_samples(np.concatenate((roads,bridge)),refs2,mappings2,
            source3.NativeTriangleIndex(np.concatenate((roads,bridge))),source3.NativeTriangleIndex([]),{'path':'data/terrain.glb'})
        self.assertEqual(samples[0]['expected']['actor_label'],'City_bridge')
        self.assertEqual(statuses[0]['status'],'occluded')
        self.assertEqual(statuses[0]['support_eligibility'],'not-evaluated')
        self.assertFalse(api.allowed_way({'highway':'primary','bridge':'yes'},'vehicle')[0])

    def test_changed_face_ray_bounds_ties_misses_and_both_sides_remain_explicit(self):
        roads, terrain, refs, mappings = self.correspondence_fixture([0.])
        reference={'mesh_role':'road','source_path':'data/road.glb','source_triangle_index':0}
        sample,status=source3.changed_face_sample('tie',[.25,.25],0.,reference,refs,mappings,source3.NativeTriangleIndex(roads),source3.NativeTriangleIndex(terrain),{'path':'data/terrain.glb'})
        self.assertIsNone(sample);self.assertEqual(status['status'],'tied');self.assertEqual(len(status['source_operands']),2)
        empty=source3.NativeTriangleIndex([])
        sample,status=source3.changed_face_sample('miss',[.25,.25],0.,reference,refs,mappings,empty,empty,{'path':'data/terrain.glb'})
        self.assertFalse(sample['expected_hit']);self.assertEqual(status['status'],'unavailable')
        # A true upper blocker is retained on BOTH sides of an internal facet
        # split; each sample keeps its own unchanged reference/ray interval.
        upper=np.array([[[0,0,.31],[0,1,.31],[1,0,.31]],[[1,0,.31],[0,1,.31],[1,1,.31]]])
        lower=np.array([[[0,0,0],[0,1,0],[1,0,0]],[[1,0,0],[0,1,0],[1,1,0]]])
        refs2=[refs[0],dict(refs[0],source_triangle_index=1)]
        for xy in ([.4999,.5],[.5001,.5]):
            sample,status=source3.changed_face_sample('side',xy,0.,reference,refs2,mappings,source3.NativeTriangleIndex(lower),source3.NativeTriangleIndex(upper),{'path':'data/terrain.glb'})
            self.assertEqual(status['status'],'occluded')
            self.assertEqual(sample['expected']['actor_label'],'City_069_terrain')
            self.assertAlmostEqual(sample['expected']['position_m'][2],.31)
        # Ordinary required support selection still rejects this stack; the
        # correspondence diagnostic never turns that failure into eligibility.
        surface=types.SimpleNamespace(building_bins=collections.defaultdict(list),buildings=[],dem_height=lambda p:0,
            road_index=source3.NativeTriangleIndex(lower),terrain_index=source3.NativeTriangleIndex(upper),road=types.SimpleNamespace(layer_refs=refs2),
            support_manifest={'schema_version':2},terrain_sources=[0,1])
        with self.assertRaisesRegex(api.SupportRejection,'stacked-rendered-support-layer'):api.Surface.check(surface,[.25,.25],'pedestrian')

    def grade_fixture_membership(self, triangle):
        # Independent scalar binary32 evaluation for this retained fixture only.
        f = lambda x: struct.unpack('<f', struct.pack('<f', float(x)))[0]
        points = [[f(v*100) for v in row] for row in triangle]
        for a,b,c in itertools.permutations(points):
            u,v = [[f(x-y) for x,y in zip(a,p)] for p in (b,c)]
            cross = [f(f(u[j]*v[k])-f(u[k]*v[j])) for j,k in ((1,2),(2,0),(0,1))]
            square = f(f(f(cross[0]*cross[0])+f(cross[1]*cross[1]))+f(cross[2]*cross[2]))
            self.assertGreater(square,f(1e-8))
            self.assertGreater(f(math.sqrt(square)),1e-4)
        return 1

    def native_grade_fixture(self):
        # Frozen actual data68.glb face 3861, raw SHA 791592b5717f45fcc8d393a615ec22a4dccb2add467fd464d1ad738c2f3f0b36.
        native_cm = np.array([[14225.8115234375, 812.3246459960938, 141.88304138183594],
            [18969.576171875, -703.6281127929688, 310.0639953613281],
            [16207.04296875, -458.0350036621094, 199.97853088378906]])
        triangle = native_cm/100
        np.testing.assert_array_equal(source3.native_centimetres(triangle), native_cm)
        ref = {'kind': 'road', 'source': 11, 'mesh': 0, 'primitive': 0, 'triangle': 3861, 'source_triangle_index': 3861}
        # Other faces are padding; only the captured native triangle participates.
        mappings = [{'triangles': 1, 'source': {'sha256': '0'*64}} for _ in range(11)]
        mappings.append({'triangles': 3862, 'source': {'sha256': '791592b5717f45fcc8d393a615ec22a4dccb2add467fd464d1ad738c2f3f0b36'}})
        triangles = np.repeat(triangle[None], 11+3862, axis=0)
        refs = [None]*(len(triangles)-1)+[ref]
        surface = types.SimpleNamespace(support_manifest={'schema_version': 3, 'native_roads': mappings},
            source3_terrain_refs=[], terrain_index=types.SimpleNamespace(triangles=np.empty((0,3,3)), physical_membership=np.empty(0,dtype=np.int8)),
            support_record={'sha256': 's'*64}, derived_record={'sha256': 'd'*64},
            road=types.SimpleNamespace(layer_refs=refs), road_index=types.SimpleNamespace(triangles=triangles,
                physical_membership=np.repeat(self.grade_fixture_membership(triangle),len(triangles)).astype(np.int8),
                native_triangles_cm=api.source_to_native_cm(triangles[:,[0,2,1]]).astype(np.float32)))
        proof = {'source': 'PLATEAU-road', 'triangle': 3861, 'layer_ref': ref,
            'support_geometry': 'exact-derived-triangle-native-cm', 'support_surface_sha256': 's'*64,
            'derived_terrain_sha256': 'd'*64, 'support_road_sha256': mappings[-1]['source']['sha256'],
            'gradient_enu': [0.04154389008886288, 0.01905961977714173]}
        previous = [150.8789179837405, 3.355502637860143, 1.6861007112717092]
        current = [150.8789179837405, 3.3555026378601434, 1.6861007112717095]
        return surface, proof, previous, current

    def test_lane53_native_plane_resolves_rounded_absolute_height_cancellation(self):
        surface, proof, previous, current = self.native_grade_fixture()
        with self.assertRaisesRegex(ValueError, 'grade 0.5 exceeds'):
            source3.span_grade(previous, current, .2)
        proof['gradient_enu'] = [900, 900]  # Descriptive gradients cannot authorize the fallback.
        grade = source3.span_grade(previous, current, .2, surface=surface, previous_record=proof, current_record=copy.deepcopy(proof))
        # Actual binary64-cm queries differ from the unrounded metre gradient (Lane53).
        self.assertAlmostEqual(grade, 0.024396313314741413, places=15)
        self.assertEqual(previous[:2], [150.8789179837405, 3.355502637860143])
        self.assertEqual(current[:2], [150.8789179837405, 3.3555026378601434])

    def test_native_grade_fallback_refuses_other_faces_generations_and_real_steps(self):
        surface, proof, previous, current = self.native_grade_fixture()
        for key, value in (('source', 'GSI-DEM5A'), ('triangle', 3860),
                           ('support_surface_sha256', 'x'*64), ('derived_terrain_sha256', 'x'*64),
                           ('support_road_sha256', 'x'*64), ('layer_ref', {**proof['layer_ref'], 'primitive': 1})):
            with self.subTest(key=key), self.assertRaisesRegex(ValueError, 'exceeds'):
                source3.span_grade(previous, current, .2, surface=surface, previous_record=proof, current_record={**proof, key: value})
        # Both falsely claim the same absent primitive: the actual ref must still match.
        false = {**proof, 'layer_ref': {**proof['layer_ref'], 'primitive': 1}}
        with self.assertRaisesRegex(ValueError, 'exceeds'):
            source3.span_grade(previous, current, .2, surface=surface, previous_record=false, current_record=false)
        for a, b, road, face, terrain in (
            ([-40.807024096124174, 7.333387587091961, -.023885772774675223],
             [-40.8070240760265, 7.333387584339315, -.1277112423715983], 14, 1179, 513580),
            ([144.2175073893475, 426.2787683249117, .9306360514904453],
             [144.21749880287985, 426.2789632674485, .8619020838587791], 9, 3842, 998850)):
            road_proof = {**proof, 'triangle': face, 'layer_ref': {'kind': 'road', 'source': road,
                'mesh': 0, 'primitive': 0, 'triangle': face, 'source_triangle_index': face}}
            terrain_proof = {**proof, 'source': 'GSI-DEM5A', 'triangle': terrain, 'layer_ref': {'kind': 'terrain', 'triangle': terrain}}
            with self.assertRaisesRegex(ValueError, 'exceeds'):
                source3.span_grade(a, b, .2, surface=surface, previous_record=road_proof, current_record=terrain_proof)
        surface.road_index.triangles[-1] = [[0, 0, 0], [1, 0, 0], [0, 1, 1]]
        surface.road_index.native_triangles_cm[-1] = api.source_to_native_cm(surface.road_index.triangles[-1,[0,2,1]]).astype(np.float32)
        with self.assertRaisesRegex(ValueError, 'exceeds'):
            source3.span_grade(previous, current, .2, surface=surface, previous_record=proof, current_record=proof)
        with mock.patch.object(source3, 'same_native_triangle') as resolve:
            with self.assertRaisesRegex(ValueError, 'zero-length'):
                source3.span_grade(previous, [*previous[:2], current[2]], .2, surface=surface, previous_record=proof, current_record=proof)
            resolve.assert_not_called()

    def test_actual_corridor_uses_the_bound_native_plane_fallback(self):
        surface, proof, previous, current = self.native_grade_fixture()
        surface.road_index.segment_breakpoints = lambda a, b: []
        surface.terrain_index = types.SimpleNamespace(segment_breakpoints=lambda a, b: [])
        def check(point, kind, **kwargs):
            if list(point) == previous[:2]: height = previous[2]
            elif list(point) == current[:2]: height = current[2]
            else: height = previous[2]+float(np.asarray(proof['gradient_enu'])@(point-np.asarray(previous[:2])))
            return [*map(float, point), height], copy.deepcopy(proof)
        surface.check = check
        rows = api.Surface.corridor(surface, [previous[:2], current[:2]], 'vehicle', 2.)
        self.assertEqual(rows[0]['point'], previous)
        self.assertEqual(rows[-1]['point'], current)
        self.assertEqual(len(rows[-1]['cross_section']), 3)
        with mock.patch.object(api.support_source3, 'same_native_triangle', return_value=None), self.assertRaisesRegex(api.SupportRejection, 'grade 0.5 exceeds'):
            api.Surface.corridor(surface, [previous[:2], current[:2]], 'vehicle', 2.)

    def test_native_grade_resolver_preserves_flat_local_and_terrain_namespaces(self):
        surface, proof, previous, current = self.native_grade_fixture()
        ref = {**proof['layer_ref'], 'primitive': 1, 'triangle': 0}
        surface.road.layer_refs[-1] = ref
        row = {**proof, 'layer_ref': ref}
        self.assertIsNotNone(source3.same_native_triangle(surface, row, row))
        triangle = surface.road_index.triangles[-1].copy()
        terrain_ref = {'kind': 'terrain-fragment', 'triangle': 18, 'parent_triangle': 3}
        surface.source3_terrain_refs = [terrain_ref]
        surface.terrain_index = types.SimpleNamespace(triangles=np.array([triangle]),
            physical_membership=np.array([self.grade_fixture_membership(triangle)],dtype=np.int8))
        row = {**proof, 'source': 'GSI-DEM5A', 'triangle': 18, 'layer_ref': terrain_ref}
        self.assertIsNotNone(source3.same_native_triangle(surface, row, row))
        inferred_ref = {'kind': 'inferred', 'triangle': 19, 'patch_triangle': 2}
        surface.road.layer_refs.append(inferred_ref)
        surface.road_index.triangles = np.concatenate((surface.road_index.triangles, triangle[None]))
        surface.road_index.physical_membership=np.append(surface.road_index.physical_membership,self.grade_fixture_membership(triangle))
        row = {**proof, 'source': 'inferred-ground-road', 'triangle': 19, 'layer_ref': inferred_ref}
        self.assertIsNotNone(source3.same_native_triangle(surface, row, row))
        # The grade fallback is also a physical consumer; provenance alone cannot
        # reintroduce an omitted or unknown cook face.
        for membership in (0,-1):
            surface.road_index.physical_membership[-1]=membership
            self.assertIsNone(source3.same_native_triangle(surface,row,row))
        del surface.road_index.physical_membership
        self.assertIsNone(source3.same_native_triangle(surface,row,row))

    def region_fixture(self):
        # Actual parent491338 and first four native-curb-trim region entries
        # from frozen aa5a742b0d72bfcf55a26b25e70378adc096c2e1a2ced6d1decae9b2b82f4472.
        triangle = np.array([[120.261376953125, -10.1598779296875, .6815383148193359],
            [120.36736328125, -9.98501220703125, .6820641326904296],
            [120.049970703125, -10.509609375, .6805110931396484]])
        polygons = [[[12026.173828125, -1015.9971313476562], [12036.70703125, -998.501220703125], [12036.736328125, -998.501220703125]],
            [[12026.173828125, -1015.9971313476562], [12036.736328125, -998.501220703125], [12036.76171875, -998.501220703125]],
            [[12026.173828125, -1015.9971313476562], [12036.76171875, -998.501220703125], [12036.7900390625, -998.501220703125]],
            [[12026.1376953125, -1015.98779296875], [12036.736328125, -998.501220703125], [12004.9970703125, -1050.9609375]]]
        ledger = {'terrain_edits': [{'parent_triangle': 0, 'region_id': 'native-curb-trim'}],
            'deleted_parent_triangles': [], 'regions': [{'id': 'native-curb-trim', 'native_xy_polygons_cm': polygons}]}
        parent = types.SimpleNamespace(road=types.SimpleNamespace(source_parts={}, sources=[]),
            terrain_index=types.SimpleNamespace(triangles=triangle[None]), _source3_new_road_refs=[])
        empty = np.empty((0, 3, 3))
        def admit(value):
            parent.terrain_index.triangles = value[None]
            return source3.validate_local_geometry(api, ledger, parent, empty, empty, [], [])
        return triangle, polygons, ledger, admit

    def test_actual_region_validator_accepts_literal_native_triangle_after_overlapping_entries(self):
        triangle, polygons, ledger, admit = self.region_fixture()
        self.assertTrue(admit(triangle)['changed_face_coverage'])
        self.assertTrue(admit(triangle[[2, 0, 1]])['changed_face_coverage'])
        outside = triangle.copy(); outside[:, 0] += 1
        nearby = triangle.copy()
        nearby[0, 0] = float(np.nextafter(np.float32(triangle[0, 0]*100), np.float32(-np.inf)))/100
        self.assertNotEqual(nearby[0, 0], triangle[0, 0])
        # Exact orientation signs confirm the moved vertex lies outside every
        # actual declared polygon; this refusal is not a rounding artifact.
        point = list(map(Fraction, nearby[0, :2]))
        for polygon in polygons:
            vertices = [[Fraction(float(value/100)) for value in row] for row in polygon]
            signs = [(b[0]-a[0])*(point[1]-a[1])-(b[1]-a[1])*(point[0]-a[0])
                     for a, b in zip(vertices, vertices[1:]+vertices[:1])]
            self.assertLess(min(signs), 0)
            self.assertGreater(max(signs), 0)
        for value in (outside, nearby):
            with self.assertRaisesRegex(ValueError, 'outside declared region'):
                admit(value)
        ledger['regions'][0]['native_xy_polygons_cm'] = [[[0, 0], [100, 0], [0, 100]]]
        self.assertTrue(admit(np.array([[.1, .1, 0], [.2, .1, 0], [.1, .2, 0]]))['changed_face_coverage'])

    def test_region_exact_union_handles_contained_nonidentical_native_triangle(self):
        triangle, polygons, ledger, admit = self.region_fixture()
        contained = triangle.copy()
        contained[0, 0] = float(np.nextafter(np.float32(triangle[0, 0]*100), np.float32(np.inf)))/100
        # The eastward native step is inside the actual final declared triangle.
        self.assertNotEqual(contained[0, 0], triangle[0, 0])
        self.assertTrue(admit(contained)['changed_face_coverage'])
        # Float64 region metadata is authoritative; snapping it to f32 would
        # erase this real positive uncovered strip at the x=1 cm vertex.
        ledger['regions'][0]['native_xy_polygons_cm'] = [[[0, 0], [1.-2**-40, 0], [0, 1]]]
        with self.assertRaisesRegex(ValueError, 'outside declared region'):
            admit(np.array([[0, 0, 0], [.01, 0, 0], [0, .01, 0]]))

    def test_exact_union_keeps_native_holes_and_preserves_float_fast_pass(self):
        triangle_cm = np.array([[0, 0], [1, 0], [0, 1]], dtype=float)
        short = triangle_cm.copy(); short[2, 1] = float(np.nextafter(np.float32(1), np.float32(0)))
        remaining = source3.uncovered_exact(triangle_cm, [short])
        self.assertGreater(sum(map(source3.exact_polygon_area, remaining)), 0)
        self.assertEqual(source3.uncovered_exact(triangle_cm, [triangle_cm[::-1]]), [])
        self.assertEqual(source3.uncovered_exact([[0, 0], [1, 1], [2, 2]], []), [])
        self.assertGreater(sum(map(source3.exact_polygon_area,
            source3.uncovered_exact(triangle_cm, [[[0, 0], [1, 1], [2, 2]]]))), 0)
        _, _, ledger, admit = self.region_fixture()
        ledger['regions'][0]['native_xy_polygons_cm'] = [[[0, 0], [100, 0], [0, 100]]]
        with mock.patch.object(source3, 'uncovered_exact', side_effect=AssertionError('ordinary float pass must remain fast')):
            self.assertTrue(admit(np.array([[.1, .1, 0], [.2, .1, 0], [.1, .2, 0]]))['changed_face_coverage'])

    def test_actual_deleted_parent_coverage_uses_exact_union_after_float_residual(self):
        # Exact ordered operands of failed deletion496872, packet02447bb7d685cc3b.
        # Full candidate IDs/source references and hexadecimal doubles are pinned
        # in the retained evidence packet; no city or triangle-index rebuild.
        old = np.array([[-10.214955444335937, -5.3376617431640625, 0.002682091295719147], [-10.723760986328125, -5.584818115234375, 0.0008279163390398026], [-9.960552368164063, -5.208916015625, 0.0036043980717658996]])
        roads = np.array([
            [[20.29004638671875, 6.609254150390625, -0.13416258811950685], [-19.605361328125, -11.05255859375, -0.004289202392101288], [-19.730906982421875, -10.65868408203125, 0.0037344378232955933]],
            [[20.29004638671875, 6.609254150390625, -0.13416258811950685], [-19.467763671875, -11.485418701171875, -0.012321707010269165], [-19.605361328125, -11.05255859375, -0.004289202392101288]],
            [[18.742113037109377, 12.357777099609375, -0.02779023885726929], [-20.01773681640625, -10.06801025390625, 0.01578054904937744], [18.74304931640625, 12.403787841796875, -0.027790107727050782]],
            [[-19.765062255859377, -10.550721435546874, 0.005743032097816467], [-20.011724853515624, -10.079000244140625, 0.015778852701187132], [19.748653564453125, 7.5986279296875, -0.11308413505554199]],
            [[-20.087923583984374, -9.93408935546875, 0.018790783882141112], [-20.19822265625, -9.724214477539062, 0.018807733058929445], [-8.969119873046875, 11.0701904296875, 0.0034236982464790344]],
            [[-20.087923583984374, -9.93408935546875, 0.018790783882141112], [-5.22982421875, 11.885330810546876, 0.0002978103794157505], [-4.220164184570312, 12.2197314453125, -0.0007297124713659287]],
            [[-20.087923583984374, -9.93408935546875, 0.018790783882141112], [18.74304931640625, 12.403787841796875, -0.027790107727050782], [-20.01773681640625, -10.06801025390625, 0.01578054904937744]],
            [[-19.467763671875, -11.485418701171875, -0.012321707010269165], [20.29004638671875, 6.609254150390625, -0.13416258811950685], [21.236748046875, 5.425407104492187, -0.16227014541625975]],
            [[18.749300537109374, 12.95885498046875, -0.018760999441146852], [-20.087923583984374, -9.93408935546875, 0.018790783882141112], [-2.410780944824219, 12.819241943359375, -0.002779141664505005]],
            [[21.236748046875, 5.425407104492187, -0.16227014541625975], [13.403956298828126, -14.591326904296874, -0.3059698677062988], [-19.351593017578125, -12.3453515625, -0.026373217105865477]],
            [[20.29004638671875, 6.609254150390625, -0.13416258811950685], [-19.730906982421875, -10.65868408203125, 0.0037344378232955933], [-19.765062255859377, -10.550721435546874, 0.005743032097816467]],
            [[-20.087923583984374, -9.93408935546875, 0.018790783882141112], [-8.969119873046875, 11.0701904296875, 0.0034236982464790344], [-5.22982421875, 11.885330810546876, 0.0002978103794157505]],
            [[-11.179891357421875, 11.467247314453125, 0.004538789987564087], [-10.339359130859375, 11.13834716796875, 0.004485143423080444], [-21.5443701171875, -8.243875732421875, 0.018939995765686037]],
            [[19.748653564453125, 7.5986279296875, -0.11308413505554199], [-20.011724853515624, -10.079000244140625, 0.015778852701187132], [19.2168505859375, 8.888046264648438, -0.08699098587036133]],
            [[21.236748046875, 5.425407104492187, -0.16227014541625975], [-19.417249755859373, -11.862391357421876, -0.01834275245666504], [-19.467763671875, -11.485418701171875, -0.012321707010269165]],
            [[-20.220283203125, -9.681243896484375, 0.018812360763549803], [-10.339359130859375, 11.13834716796875, 0.004485143423080444], [-8.969119873046875, 11.0701904296875, 0.0034236982464790344]],
            [[-20.19822265625, -9.724214477539062, 0.018807733058929445], [-20.220283203125, -9.681243896484375, 0.018812360763549803], [-8.969119873046875, 11.0701904296875, 0.0034236982464790344]],
            [[-10.339359130859375, 11.13834716796875, 0.004485143423080444], [-20.8193994140625, -8.90396484375, 0.01887537717819214], [-21.5443701171875, -8.243875732421875, 0.018939995765686037]],
            [[19.2168505859375, 8.888046264648438, -0.08699098587036133], [-20.01773681640625, -10.06801025390625, 0.01578054904937744], [18.9750732421875, 10.18785888671875, -0.06491323471069337]],
            [[18.9750732421875, 10.18785888671875, -0.06491323471069337], [-20.01773681640625, -10.06801025390625, 0.01578054904937744], [18.742113037109377, 12.357777099609375, -0.02779023885726929]],
            [[21.236748046875, 5.425407104492187, -0.16227014541625975], [-19.351593017578125, -12.3453515625, -0.026373217105865477], [-19.417249755859373, -11.862391357421876, -0.01834275245666504]],
            [[-2.410780944824219, 12.819241943359375, -0.002779141664505005], [-20.087923583984374, -9.93408935546875, 0.018790783882141112], [-4.220164184570312, 12.2197314453125, -0.0007297124713659287]],
            [[-20.220283203125, -9.681243896484375, 0.018812360763549803], [-20.8193994140625, -8.90396484375, 0.01887537717819214], [-10.339359130859375, 11.13834716796875, 0.004485143423080444]],
            [[-20.087923583984374, -9.93408935546875, 0.018790783882141112], [18.749300537109374, 12.95885498046875, -0.018760999441146852], [18.74304931640625, 12.403787841796875, -0.027790107727050782]],
            [[20.29004638671875, 6.609254150390625, -0.13416258811950685], [-19.765062255859377, -10.550721435546874, 0.005743032097816467], [19.748653564453125, 7.5986279296875, -0.11308413505554199]],
            [[-20.01773681640625, -10.06801025390625, 0.01578054904937744], [19.2168505859375, 8.888046264648438, -0.08699098587036133], [-20.011724853515624, -10.079000244140625, 0.015778852701187132]]
        ])
        remaining = [old[:, :2].tolist()]
        for triangle in roads:
            remaining = [piece for polygon in remaining for piece in source3.subtract(polygon, triangle)]
        self.assertEqual(sum(map(source3.polygon_area, remaining)), 3.432670564914783e-21)
        ledger = {'regions': [], 'terrain_edits': [], 'deleted_parent_triangles': [0]}
        parent = types.SimpleNamespace(road=types.SimpleNamespace(source_parts={}, sources=[]),
            terrain_index=types.SimpleNamespace(triangles=old[None]),
            _source3_new_road_refs=[{'kind': 'road'} for _ in roads])
        result = source3.validate_local_geometry(api, ledger, parent, np.empty((0, 3, 3)), roads, [], [])
        self.assertTrue(result['changed_face_coverage'])
        # A real native hole is still refused by the actual validator.
        parent.terrain_index.triangles = np.array([[[0, 0, 0], [.01, 0, 0], [0, .01, 0]]])
        short = np.array([[0, 0, 0], [1, 0, 0], [0, float(np.nextafter(np.float32(1), np.float32(0))), 0]])/100
        parent._source3_new_road_refs = [{'kind': 'road'}]
        with self.assertRaisesRegex(ValueError, 'leaves uncovered native XY area'):
            source3.validate_local_geometry(api, ledger, parent, np.empty((0, 3, 3)), short[None], [], [])
        with mock.patch.object(source3, 'uncovered_exact', side_effect=AssertionError('ordinary float pass must remain fast')):
            self.assertTrue(source3.validate_local_geometry(api, ledger, parent, np.empty((0, 3, 3)),
                parent.terrain_index.triangles.copy(), [], [])['changed_face_coverage'])

    def test_actual497750_exact_union_needs_both_current_neighbor_faces(self):
        # Actual parent497750, own fragments19/20 + exact ordered ground,
        # neighboring current497586/497589; packet050cf6f94c650283.
        parent_cm = [[12036.736328125, -998.501220703125, 68.20641326904297], [12090.685546875, -909.2330932617188, 68.91050720214844], [12090.728515625, -909.259033203125, 68.91275787353516]]
        covers_cm = [
            [[12066.4462890625, -949.33984375, 68.59416961669922], [12090.728515625, -909.259033203125, 68.91275787353516], [12036.736328125, -998.501220703125, 68.20641326904297]],
            [[12090.70703125, -909.24609375, 68.91163635253906], [12090.728515625, -909.259033203125, 68.91275787353516], [12066.4462890625, -949.33984375, 68.59416961669922]],
            [[11847.5078125, -929.1768798828125, 43.74664306640625], [12044.20703125, -912.7093505859375, 50.734920501708984], [11756.9169921875, -1460.9561767578125, 36.82328796386719]],
            [[11756.9169921875, -1460.9561767578125, 36.82328796386719], [12044.20703125, -912.7093505859375, 50.734920501708984], [12090.70703125, -909.24609375, 52.43210220336914]],
            [[11847.5078125, -929.1768798828125, 43.74664306640625], [12044.20703125, -912.7093505859375, 50.734920501708984], [11756.9169921875, -1460.9561767578125, 36.82328796386719]],
            [[11756.9169921875, -1460.9561767578125, 36.82328796386719], [12044.20703125, -912.7093505859375, 50.734920501708984], [12090.70703125, -909.24609375, 52.43210220336914]],
            [[12044.20703125, -912.7093505859375, 50.734920501708984], [12094.3759765625, 520.3126220703125, 62.80834197998047], [12090.70703125, -909.24609375, 52.43210220336914]],
            [[12090.70703125, -909.24609375, 52.43210220336914], [12094.3759765625, 520.3126220703125, 62.80834197998047], [12139.5732421875, 525.57421875, 64.40579986572266]],
            [[12150.1728515625, 526.7886352539062, 64.80513763427734], [12090.70703125, -909.24609375, 52.43210220336914], [12139.5732421875, 525.57421875, 64.40579986572266]],
            [[12819.658203125, 295.4683837890625, 86.4494857788086], [12090.70703125, -909.24609375, 52.43210220336914], [12150.1728515625, 526.7886352539062, 64.80513763427734]],
            [[12044.20703125, -912.7093505859375, 50.734920501708984], [11847.5078125, -929.1768798828125, 43.74664306640625], [12094.3759765625, 520.3126220703125, 62.80834197998047]],
            [[12094.3759765625, 520.3126220703125, 62.80834197998047], [11847.5078125, -929.1768798828125, 43.74664306640625], [11371.2109375, 436.1261291503906, 35.65010070800781]],
            [[11932.75, -2063.88330078125, 29.978322982788086], [12445.8095703125, -883.1631469726562, 59.510833740234375], [13096.2939453125, -2373.4443359375, 63.38518142700195]],
            [[11756.9169921875, -1460.9561767578125, 36.82328796386719], [12445.8095703125, -883.1631469726562, 59.510833740234375], [11932.75, -2063.88330078125, 29.978322982788086]],
            [[11756.9169921875, -1460.9561767578125, 36.82328796386719], [12090.8076171875, -909.2457885742188, 52.43227005004883], [12445.8095703125, -883.1631469726562, 59.510833740234375]],
            [[11932.75, -2063.88330078125, 29.978322982788086], [12445.8095703125, -883.1631469726562, 59.510833740234375], [13096.2939453125, -2373.4443359375, 63.38518142700195]],
            [[11756.9169921875, -1460.9561767578125, 36.82328796386719], [12445.8095703125, -883.1631469726562, 59.510833740234375], [11932.75, -2063.88330078125, 29.978322982788086]],
            [[11756.9169921875, -1460.9561767578125, 36.82328796386719], [12090.8076171875, -909.2457885742188, 52.43227005004883], [12445.8095703125, -883.1631469726562, 59.510833740234375]],
            [[11932.75, -2063.88330078125, 29.978322982788086], [12445.8095703125, -883.1631469726562, 59.510833740234375], [13096.2939453125, -2373.4443359375, 63.38518142700195]],
            [[11756.9169921875, -1460.9561767578125, 36.82328796386719], [12445.8095703125, -883.1631469726562, 59.510833740234375], [11932.75, -2063.88330078125, 29.978322982788086]],
            [[11756.9169921875, -1460.9561767578125, 36.82328796386719], [12090.8076171875, -909.2457885742188, 52.43227005004883], [12445.8095703125, -883.1631469726562, 59.510833740234375]],
            [[11932.75, -2063.88330078125, 29.978322982788086], [12445.8095703125, -883.1631469726562, 59.510833740234375], [13096.2939453125, -2373.4443359375, 63.38518142700195]],
            [[11756.9169921875, -1460.9561767578125, 36.82328796386719], [12445.8095703125, -883.1631469726562, 59.510833740234375], [11932.75, -2063.88330078125, 29.978322982788086]],
            [[11756.9169921875, -1460.9561767578125, 36.82328796386719], [12090.8076171875, -909.2457885742188, 52.43227005004883], [12445.8095703125, -883.1631469726562, 59.510833740234375]],
            [[12090.8076171875, -909.2457885742188, 52.43227005004883], [12090.70703125, -909.24609375, 52.43210220336914], [12819.658203125, 295.4683837890625, 86.4494857788086]]
        ]
        neighbors_cm = [[[12090.8076171875, -909.2457885742188, 68.91581726074219], [12090.703125, -909.25341796875, 68.91157531738281], [12090.70703125, -909.24609375, 68.91163635253906]], [[12090.8076171875, -909.2457885742188, 68.91581726074219], [12036.70703125, -998.501220703125, 68.20518493652344], [12090.703125, -909.25341796875, 68.91157531738281]]]
        remaining = source3.uncovered_exact(parent_cm, covers_cm)
        self.assertEqual(sum(map(source3.exact_polygon_area, remaining))/10000,
            Fraction(120703, 3690568089600000))
        self.assertEqual(source3.uncovered_exact(parent_cm, covers_cm+neighbors_cm), [])
        for missing in range(2):
            self.assertGreater(sum(map(source3.exact_polygon_area,
                source3.uncovered_exact(parent_cm, covers_cm+[neighbors_cm[1-missing]]))), 0)

    def test_unique_inventory_refuses_conflicting_duplicate(self):
        r = {'path': 'data/source/a', 'bytes': 1, 'sha256': 'a'*64}
        self.assertEqual(source3.unique_records([r, r.copy()]), [r])
        with self.assertRaisesRegex(ValueError, 'conflicting'):
            source3.unique_records([r, {**r, 'sha256': 'b'*64}])

    def test_current_neighbor_terrain_completes_deleted_parent_coverage(self):
        old = np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0]], dtype=float)
        road = np.array([[0, 0, 0], [.5, 0, 0], [0, 1, 0]])
        neighbor = np.array([[.5, 0, 0], [1, 0, 0], [0, 1, 0]])
        parent = types.SimpleNamespace(road=types.SimpleNamespace(source_parts={}, sources=[]),
            terrain_index=types.SimpleNamespace(triangles=np.array([old, neighbor])),
            _source3_new_road_refs=[{'kind': 'road'}])
        ledger = {'regions': [], 'terrain_edits': [], 'deleted_parent_triangles': [0]}
        result = source3.validate_local_geometry(api, ledger, parent, neighbor[None], road[None], [1], [])
        self.assertTrue(result['changed_face_coverage'])
        # The same parent/reference neighbor is not eligible once it is absent
        # from the complete CURRENT consumed output: a real half-face hole.
        with self.assertRaisesRegex(ValueError, 'leaves uncovered native XY area'):
            source3.validate_local_geometry(api, ledger, parent, np.empty((0, 3, 3)), road[None], [], [])

    def fixture(self):
        parent = {'native_frame':api.native_frame_record(), 'derived_terrain': {'triangles': 3}, 'terrain_source_triangle_indices': [5, 8, 13]}
        ledger = {'native_frame':api.native_frame_record(), 'schema_version': 1, 'coordinate_model': source3.COORDINATE_MODEL,
            'output_order': source3.OUTPUT_ORDER, 'parent_derived_terrain': parent['derived_terrain'],
            'deleted_parent_triangles': [1], 'terrain_edits': [{'parent_triangle': 1, 'region_id': 'gap'}],
            'regions': [{'id': 'gap', 'native_xy_polygons_cm': [[[0, 0], [100, 0], [0, 100]]]}],
            'patch_faces': [{'patch_triangle': 0, 'kind': 'retained-parent-fragment', 'region_id': 'gap', 'parent_triangle': 1, 'original_terrain_parent': 8},
                            {'patch_triangle': 1, 'kind': 'inferred-ground-road', 'region_id': 'gap', 'anchors': [{'source': 0}]}]}
        return ledger, parent

    def test_face_order_retains_full_parent_and_distinct_inferred_lineage(self):
        ledger, parent = self.fixture()
        retained, patch = source3.layout(ledger, parent, 2)
        self.assertEqual(retained.tolist(), [0, 2])
        self.assertEqual(patch[0]['parent_triangle'], 1)
        self.assertNotIn('parent_triangle', patch[1])
        for mutate in (lambda x: x['patch_faces'][1].update(original_terrain_parent=8),
                       lambda x: x['patch_faces'][0].update(original_terrain_parent=13),
                       lambda x: x['patch_faces'][1].update(patch_triangle=0),
                       lambda x: x.update(deleted_parent_triangles=[True])):
            broken = copy.deepcopy(ledger)
            mutate(broken)
            with self.assertRaises(ValueError): source3.layout(broken, parent, 2)

    def test_fragment_rejects_unledgered_geometry_and_uv_changes(self):
        parent = np.array([[0, 0, 0, 0, 0, 0, 1, 0], [1, 0, .1, 1, 0, 0, 1, 0], [0, 1, 0, 0, 1, 0, 1, 0]], dtype=np.float32)
        face = {'parent_triangle': 4, 'vertex_edits': [], 'maximum_plane_error_m': 0, 'maximum_uv_error': 0}
        source3.check_fragment(face, parent, parent)
        for field in (0, 2, 3):
            changed = parent.copy()
            changed[0, field] += .01
            with self.assertRaisesRegex(ValueError, 'unledgered'):
                source3.check_fragment(face, changed, parent)

    def test_inferred_provider_cannot_inherit_gsi_or_endpoint_authority(self):
        ref = {'kind': 'inferred', 'triangle': 12, 'patch_triangle': 0, 'region_id': 'gap'}
        surface = types.SimpleNamespace(source3_terrain_refs=[ref], derived_record={'sha256': 'd'*64},
            support_record={'sha256': 's'*64}, support_manifest={'native_roads': []})
        api = types.SimpleNamespace(VehicleInterval=type('VehicleInterval', (), {}))
        proof = {'source': 'GSI-DEM5A', 'triangle': 0, 'layer_ref': {'kind': 'terrain'}}
        changed = source3.witness(surface, api, proof, [0, 0], 'pedestrian', None)
        self.assertEqual(changed['source'], 'inferred-ground-road')
        self.assertEqual(changed['triangle'], 12)
        self.assertEqual(proof['source'], 'GSI-DEM5A')
        with self.assertRaisesRegex(ValueError, 'directed-source-interval'):
            source3.witness(surface, api, proof, [0, 0], 'vehicle', None)

    def test_local_subtraction_keeps_a_real_uncovered_sliver(self):
        parent = [[0., 0.], [1., 0.], [0., 1.]]
        remaining = source3.subtract(parent, [[0, 0], [1, 0], [0, .999999]])
        self.assertGreater(sum(map(source3.polygon_area, remaining)), 0)
        self.assertEqual(source3.subtract(parent, parent), [])

    def test_changed_road_rays_sample_actual_geometry_and_retain_actor_ties(self):
        roads = np.array([[[0, 0, .1], [1, 0, .1], [0, 1, .1]]])
        refs = [{'kind': 'derived-road', 'source': 0, 'mesh': 1, 'primitive': 2, 'triangle': 3, 'source_triangle_index': 9}]
        mappings = [{'actor_label': 'City_road', 'source_path': 'data/prepared/new/data68.glb'}]
        terrain = source3.NativeTriangleIndex(np.array([[[0, 0, 0], [1, 0, 0], [0, 1, 0]]]))
        samples, details = source3.changed_road_samples(roads, refs, mappings, source3.NativeTriangleIndex(roads), terrain, {'path': 'data/terrain.glb'})
        self.assertEqual(len(samples), 1)
        self.assertEqual(samples[0]['expected']['source_triangle_index'], 9)
        self.assertEqual(samples[0]['expected']['layer_ref']['triangle'], 3)
        self.assertEqual(samples[0]['expected']['source_path'], mappings[0]['source_path'])
        self.assertEqual(details[0]['status'], 'visible')
        tied = source3.NativeTriangleIndex(roads.copy())
        samples, details = source3.changed_road_samples(roads, refs, mappings, source3.NativeTriangleIndex(roads), tied, {'path': 'data/terrain.glb'})
        self.assertEqual(samples, [])
        self.assertEqual(details[0]['status'], 'tied')
        higher = roads.copy(); higher[:, :, 2] += .01
        samples, details = source3.changed_road_samples(roads, refs, mappings, source3.NativeTriangleIndex(roads), source3.NativeTriangleIndex(higher), {'path': 'data/terrain.glb'})
        self.assertEqual(details[0]['status'], 'occluded')
        self.assertEqual(samples[0]['expected']['actor_label'], 'City_069_terrain')

    def test_road_replacement_preserves_import_basename_and_refuses_uv_corruption(self):
        attrs = {'POSITION': np.array([[0, 0, 0], [1, 0, 0], [0, 0, 1]], dtype=np.float32),
                 'NORMAL': np.array([[0, 1, 0]]*3, dtype=np.float32), 'TEXCOORD_0': np.array([[0, 0], [1, 0], [0, 1]], dtype=np.float32)}
        indices = np.array([[0, 2, 1]])
        doc = {'materials': [{}], 'nodes': [{'mesh': 0}], 'scenes': [{'nodes': [0]}],
               'meshes': [{'primitives': [{'attributes': {}, 'indices': 0}]}]}
        class Writer:
            def __init__(self): self.doc = {}; self.values = []
            def accessor(self, array, *unused):
                self.values.append(array.copy()); return len(self.values)-1
        saved = []
        def save(writer, path, **unused):
            saved.append(path)
            return {'path': str(path), 'size': 100, 'sha256': 'a'*64}
        original = {'path': 'data/prepared/surface/roads/data68.glb'}
        parent = {'native_roads': [{'source': original, 'source_path': original['path'], 'actor_label': 'City_68', 'triangles': 1}]}
        ledger = {'road_overrides': [{'source': 0, 'mesh': 0, 'primitive': 0, 'triangle': 0,
            'region_id': 'gap', 'anchors': [{}], 'replacement': {'path': 'patch'}, 'replacement_patch_triangles': [0]}]}
        api = types.SimpleNamespace(city=types.SimpleNamespace(GlbWriter=Writer), save_glb=save)
        def decode(api, name):
            actual = copy.deepcopy(attrs)
            if name.endswith('data68.glb') and name.startswith('stage') and corrupt:
                actual['TEXCOORD_0'][0, 0] = .25
            actual_indices = indices[:, [0, 2, 1]] if name == 'patch' and reverse_patch else indices.copy()
            return copy.deepcopy(doc), [(0, 0, actual, actual_indices)]
        with mock.patch.object(source3, 'record', side_effect=lambda api, value, *args: value['path']), mock.patch.object(source3, 'primitives', side_effect=decode):
            corrupt = reverse_patch = False
            source3.apply_road_overrides(api, parent, ledger, Path('stage'))
            self.assertEqual(saved[0].as_posix(), 'stage/roads/data68.glb')
            corrupt = True
            with self.assertRaisesRegex(ValueError, 'readback changed geometry, normals or UVs'):
                source3.apply_road_overrides(api, parent, ledger, Path('stage'))
            corrupt = False; reverse_patch = True
            writes_before = len(saved)
            with self.assertRaisesRegex(ValueError, 'winding disagrees with NORMAL'):
                source3.apply_road_overrides(api, parent, ledger, Path('stage'))
            self.assertEqual(len(saved), writes_before, 'Reversed replacement must fail before its writer runs')

    def new_face(self):
        # ENU clockwise becomes GLB up-facing after the reflected Y/Z swap.
        return np.array([[0, 0, 0, 0, 0, 0, 1, 0],
                         [0, 1, 0, 0, 1, 0, 1, 0],
                         [1, 0, 0, 1, 0, 0, 1, 0]], dtype=np.float32)

    def test_new_face_winding_rejects_reversed_indices_even_when_query_normal_is_up(self):
        positive = self.new_face()
        source3.admit_new_face_winding(positive, 'positive bank fill', inferred=True)
        source3.admit_new_face_winding(positive, 'retained fragment', parent=positive)
        reversed_indices = positive[[0, 2, 1]]
        # Actual collision-facing query normals now retain winding sign.
        for rows, expected_z in ((positive, 1), (reversed_indices, -1)):
            hit = source3.NativeTriangleIndex(rows[None, :, :3]).hits(.25, .25)[0]
            self.assertEqual(hit['normal_up_z'], expected_z)
        with self.assertRaisesRegex(ValueError, 'winding disagrees with NORMAL'):
            source3.admit_new_face_winding(reversed_indices, 'reversed actual indices', inferred=True)

    def test_new_face_cannot_hide_reversal_by_flipping_attributes(self):
        positive = self.new_face()
        flipped = positive[[0, 2, 1]].copy()
        flipped[:, 5:8] *= -1
        with self.assertRaisesRegex(ValueError, 'must face GLB up'):
            source3.admit_new_face_winding(flipped, 'inferred down face', inferred=True)
        with self.assertRaisesRegex(ValueError, 'source face orientation'):
            source3.admit_new_face_winding(flipped, 'reversed retained or road face', parent=positive)
        mismatched = positive.copy(); mismatched[0, 5:8] *= -1
        with self.assertRaisesRegex(ValueError, 'winding disagrees with NORMAL'):
            source3.admit_new_face_winding(mismatched, 'one inverted normal', parent=positive)

    def test_new_face_refuses_native_cm_collapse_without_touching_old_parent_policy(self):
        face = self.new_face()
        face[:, 0] = np.array([400, 400, np.nextafter(np.float32(400), np.float32(401))], dtype=np.float32)
        # One source float32 ULP can round to the same native-centimetre ULP.
        # Find the adjacent pair that actually collapses, rather than assuming it.
        for _ in range(8):
            if source3.native_metres(face[0, 0]) == source3.native_metres(face[2, 0]): break
            face[0, 0] = face[1, 0] = face[2, 0]
            face[2, 0] = np.nextafter(face[2, 0], np.float32(401))
        self.assertGreater(face[2, 0]-face[0, 0], 0)
        self.assertEqual(source3.native_metres(face[0, 0]), source3.native_metres(face[2, 0]))
        with self.assertRaisesRegex(ValueError, 'degenerate in native-float32-cm'):
            source3.admit_new_face_winding(face, 'native-collapsed fill', inferred=True)
        degenerate = self.new_face(); degenerate[2] = degenerate[1]
        with self.assertRaisesRegex(ValueError, 'degenerate in packed-GLB'):
            source3.admit_new_face_winding(degenerate, 'packed-collapsed fill', inferred=True)

    @contextlib.contextmanager
    def reader_fixture(self, *, include_inferred=True):
        """Real tiny GLBs and files; only the already-admitted Source2 reader is replaced."""
        with tempfile.TemporaryDirectory(prefix='source3-reader-') as temporary:
            root = Path(temporary)
            with mock.patch.object(api, 'ROOT', root), mock.patch.object(api, 'OUT', root/'data/prepared/surface'), mock.patch.object(api.city, 'ROOT', root):
                def write_json(path, value):
                    path = root/path
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(api.encoded(value))
                    return api.source_record(path)
                def write_mesh(path, rows):
                    writer = api.city.GlbWriter()
                    writer.doc['materials'] = [{}]
                    writer.primitive({'POSITION': rows[:, [0, 2, 1]], 'TEXCOORD_0': rows[:, 3:5], 'NORMAL': rows[:, 5:8]}, np.array([[0, 1, 2]]))
                    record = writer.save(root/path)
                    return {'path': record['path'], 'bytes': record['size'], 'sha256': record['sha256'], 'triangles': 1}
                parent_rows = self.new_face()
                road_rows = self.new_face(); road_rows[:, 2] = .1
                old_terrain = write_mesh('data/prepared/surface/parent/terrain.glb', parent_rows)
                raw_road = write_mesh('data/prepared/roads/road.glb', road_rows)
                patch = write_mesh('data/source/patch.glb', road_rows)
                snapshot = write_json('data/source/provenance/code.json', {})
                inherited = {name: {} for name in ('frame', 'origin', 'vertical_reference', 'inputs', 'atlas', 'attribution')}
                inherited.update(native_frame=api.native_frame_record(), frame={'glb':'metres-Xeast-Yup-Znorth','runtime':'metres-Xeast-Ynorth-Zup','unreal':'centimetres-Xeast-Ysouth-Zup'})
                parent = {**inherited, 'schema_version': 2, 'derived_terrain': old_terrain, 'terrain_source_triangle_indices': [7],
                    'native_roads': [{'source': raw_road, 'source_path': raw_road['path'], 'actor_label': 'City_road', 'triangles': 1}]}
                parent_record = write_json('data/prepared/surface/parent/support-surface-manifest.json', parent)
                bank = [{'source': 0, 'mesh': 0, 'primitive': 0, 'vertex': i, 'raw_enu_m': road_rows[i, :3].tolist()} for i in range(3)]
                vertex_anchors = [{'kind': 'source-road-native-stitch', 'patch_triangle': 0, 'vertex': i,
                    'original_native_cm': (source3.native_centimetres(road_rows[i, :3])*[1,-1,1]).tolist(),
                    'replacement_native_cm': (source3.native_centimetres(road_rows[i, :3])*[1,-1,1]).tolist(),
                    'source_anchor': {'kind': 'source-road-plane-interpolation', 'source': 0, 'mesh': 0, 'primitive': 0, 'triangle': 0,
                        'barycentric': np.eye(3)[i].tolist()}} for i in range(3)]
                ledger = {'native_frame':api.native_frame_record(), 'schema_version': 1, 'coordinate_model': source3.COORDINATE_MODEL, 'output_order': source3.OUTPUT_ORDER,
                    'parent_support_surface': parent_record, 'parent_derived_terrain': old_terrain, 'terrain_patch': patch,
                    'deleted_parent_triangles': [0], 'terrain_edits': [{'parent_triangle': 0, 'region_id': 'gap'}],
                    'regions': [{'id': 'gap', 'native_xy_polygons_cm': [[[-100, 100], [400, 100], [-100, -400]]]}],
                    'patch_faces': [{'patch_triangle': 0, 'kind': 'inferred-ground-road', 'region_id': 'gap', 'anchors': copy.deepcopy(bank)}],
                    'road_overrides': [{'source': 0, 'mesh': 0, 'primitive': 0, 'triangle': 0, 'region_id': 'gap', 'source_record': raw_road,
                        'replacement': patch, 'replacement_patch_triangles': [0], 'anchors': copy.deepcopy(bank), 'replacement_vertex_anchors': vertex_anchors}],
                    'recipe': {'algorithm': snapshot, 'source_inputs': [], 'candidate_inputs': []}}
                if not include_inferred:
                    # Lineage success needs one physical first blocker. Bind an
                    # unchanged parent fragment at0m, below the derived road at
                    #0.1m, instead of an inferred actor on the same road plane.
                    ledger['terrain_patch'] = old_terrain
                    ledger['patch_faces'] = [{'patch_triangle': 0, 'kind': 'retained-parent-fragment',
                        'region_id': 'gap', 'parent_triangle': 0, 'original_terrain_parent': 7,
                        'vertex_edits': [], 'maximum_plane_error_m': 0, 'maximum_uv_error': 0}]
                previous = types.SimpleNamespace(road=types.SimpleNamespace(sources=[raw_road], triangles=road_rows[None, :, :3].astype(float)),
                    terrain_index=source3.NativeTriangleIndex(parent_rows[None, :, :3]),
                    building_bins=collections.defaultdict(list), buildings=[], dem_height=lambda point: .1, vehicle_source=None)
                stage = root/'data/prepared/surface/derived'
                doc, attrs, indices, retained, labels = source3.assemble_terrain(api, ledger, parent)
                output = source3.write_mesh(api, stage, 'terrain.glb', attrs, indices, doc['materials'])
                roads, refs, mappings, derived_roads = source3.apply_road_overrides(api, parent, ledger, stage)
                preservation = write_json('data/source/provenance/preservation.json', {'unchanged': True, 'inputs_before': [], 'inputs_after': [], 'source3_writer': snapshot})
                manifest = {**inherited, 'schema_version': 3, 'coordinate_model': source3.COORDINATE_MODEL, 'parent_support_surface': parent_record,
                    'derived_terrain': output, 'native_roads': mappings, 'derived_roads': derived_roads, 'source_preservation': preservation,
                    'algorithm': {**snapshot, **{name: snapshot for name in ('integration', 'topology', 'build_city', 'edits')}}, 'configuration_inputs': {}}
                current_path = stage/'support-surface-manifest.json'
                real_surface = api.Surface
                def read(changed=None):
                    manifest['surface_edits'] = write_json('data/source/edit-ledger.json', ledger if changed is None else changed)
                    write_json(current_path.relative_to(root).as_posix(), manifest)
                    admitted_parent = copy.copy(previous)
                    admitted_parent.road = copy.deepcopy(previous.road)
                    # Discovery can replace this module name with another API instance.
                    with (mock.patch.dict(sys.modules, {real_surface.__module__: api}),
                          mock.patch.object(api, 'Surface', return_value=admitted_parent)):
                        return real_surface({}, [], support_path=current_path)
                yield types.SimpleNamespace(ledger=ledger, parent=parent, previous=previous, rows=road_rows, roads=roads,
                    refs=refs, retained=retained, labels=labels, output=source3.native_metres(attrs['POSITION'][:, [0, 2, 1]])[indices], read=read)

    def test_actual_validator_binds_original_replacement_and_one_mm_stitch(self):
        with self.reader_fixture() as f:
            previous = copy.copy(f.previous); previous._source3_new_road_refs = f.refs
            def validate(ledger, roads):
                return source3.validate_local_geometry(api, ledger, previous, f.output, roads, f.retained, f.labels)
            moved = f.roads.copy(); moved[0, 0, 0] -= .0005
            moved = source3.native_metres(moved)
            valid = copy.deepcopy(f.ledger)
            valid['road_overrides'][0]['replacement_vertex_anchors'][0]['replacement_native_cm'] = (source3.native_centimetres(moved[0, 0])*[1,-1,1]).tolist()
            self.assertTrue(validate(valid, moved)['changed_face_coverage'])
            for name, mutate, message in (
                ('outside barycentrics', lambda row: row['source_anchor'].update(barycentric=[-100, 101, 0]), 'barycentrics'),
                ('fabricated original', lambda row: row.update(original_native_cm=[1000, 0, 10]), 'original_native_cm'),
                ('unbound replacement', lambda row: row.update(replacement_native_cm=[-1, 0, 10]), 'replacement_native_cm')):
                bad = copy.deepcopy(valid); mutate(bad['road_overrides'][0]['replacement_vertex_anchors'][0])
                with self.subTest(name=name), self.assertRaisesRegex(ValueError, message): validate(bad, moved)
            far = moved.copy(); far[0, 0, 0] = -.01
            far = source3.native_metres(far)
            bad = copy.deepcopy(valid)
            bad['road_overrides'][0]['replacement_vertex_anchors'][0]['replacement_native_cm'] = (source3.native_centimetres(far[0, 0])*[1,-1,1]).tolist()
            with self.assertRaisesRegex(ValueError, 'exceeds 0.001 m'): validate(bad, far)

    def test_fragment_stitches_share_the_original_native_point_and_displacement_bound(self):
        parent = self.new_face()
        moved = parent.copy(); moved[0, 0] = -.0005
        face = {'parent_triangle': 4, 'vertex_edits': [{'vertex': 0, 'original_native_cm': [0, 0, 0],
            'replacement_native_cm': source3.native_centimetres(moved[0, :3]).tolist(),
            'source_anchor': {'kind': 'parent-edge-or-plane-interpolation', 'parent_triangle': 4, 'barycentric': [1, 0, 0]}}],
            'maximum_plane_error_m': 0, 'maximum_uv_error': 0}
        source3.check_fragment(face, moved, parent)
        moved[0, 0] = -.01
        face['vertex_edits'][0]['replacement_native_cm'] = source3.native_centimetres(moved[0, :3]).tolist()
        with self.assertRaisesRegex(ValueError, 'exceeds 0.001 m'): source3.check_fragment(face, moved, parent)

    def test_inferred_bank_stitch_is_bound_to_raw_anchor_and_shared_derived_road(self):
        with self.reader_fixture() as f:
            previous = copy.copy(f.previous); previous._source3_new_road_refs = f.refs
            ledger = copy.deepcopy(f.ledger)
            roads = f.roads.copy(); roads[0, 0, 0] = -.0005; roads = source3.native_metres(roads)
            output = f.output.copy(); output[0, 0] = roads[0, 0]
            ledger['road_overrides'][0]['replacement_vertex_anchors'][0]['replacement_native_cm'] = (source3.native_centimetres(roads[0, 0])*[1,-1,1]).tolist()
            ledger['patch_faces'][0]['vertex_edits'] = [{'vertex': 0, 'kind': 'source-road-native-stitch',
                'original_native_cm': (source3.native_centimetres(f.rows[0, :3])*[1,-1,1]).tolist(),
                'replacement_native_cm': (source3.native_centimetres(output[0, 0])*[1,-1,1]).tolist(),
                'source_anchor': copy.deepcopy(ledger['patch_faces'][0]['anchors'][0])}]
            def validate(changed, terrain):
                return source3.validate_local_geometry(api, changed, previous, terrain, roads, f.retained, changed['patch_faces'])
            self.assertTrue(validate(ledger, output)['changed_face_coverage'])
            for name, mutate, message in (
                ('false bank', lambda edit: edit.update(source_anchor=ledger['patch_faces'][0]['anchors'][1]), 'original raw bank anchor'),
                ('false original', lambda edit: edit.update(original_native_cm=[5, 0, 10]), 'original_native_cm'),
                ('unbound output', lambda edit: edit.update(replacement_native_cm=[-1, 0, 10]), 'replacement_native_cm')):
                bad = copy.deepcopy(ledger); mutate(bad['patch_faces'][0]['vertex_edits'][0])
                with self.subTest(name=name), self.assertRaisesRegex(ValueError, message): validate(bad, output)
            for new_x, message in ((-.0004, 'share its replacement'), (-.01, 'exceeds 0.001 m')):
                bad = copy.deepcopy(ledger)
                terrain = output.copy(); terrain[0, 0, 0] = new_x; terrain = source3.native_metres(terrain)
                bad['patch_faces'][0]['vertex_edits'][0]['replacement_native_cm'] = source3.native_centimetres(terrain[0, 0]).tolist()
                with self.subTest(new_x=new_x), self.assertRaisesRegex(ValueError, message): validate(bad, terrain)

    def test_actual_surface_reader_admits_lineage_and_refuses_false_claims(self):
        with self.reader_fixture(include_inferred=False) as f:
            surface = f.read()
            self.assertTrue(surface.source3_admission['changed_face_coverage'])
            point, proof = surface.check([.2, .2], 'pedestrian')
            self.assertEqual(proof['source'], 'derived-ground-road')
            self.assertEqual(proof['layer_ref']['kind'], 'derived-road')
            self.assertEqual(point, [.2, .2, .1])
            self.assertEqual(len(surface.road_index.hits(.2, .2)), 1)
            self.assertEqual(surface.terrain_index.hits(.2, .2)[0]['height'], 0.)
        # Keep all original inferred/road/region malformed-ledger assertions on
        # the original real-GLB fixture; physical overlap cannot waive lineage.
        with self.reader_fixture() as f:
            for name, mutate, message in (
                ('inferred anchor', lambda ledger: ledger['patch_faces'][0]['anchors'][0].update(raw_enu_m=[10, 0, .1]), 'raw road anchor XYZ'),
                ('road lineage', lambda ledger: ledger['road_overrides'][0]['replacement_vertex_anchors'][0].update(original_native_cm=[1000, 0, 10]), 'original_native_cm'),
                ('declared region', lambda ledger: ledger['regions'][0].update(native_xy_polygons_cm=[[[0, 0], [50, 0], [0, 50]]]), 'outside declared region')):
                bad = copy.deepcopy(f.ledger); mutate(bad)
                with self.subTest(name=name), self.assertRaisesRegex(ValueError, message): f.read(bad)

    def test_actual_surface_reader_admits_compatible_distinct_actor_contacts(self):
        with self.reader_fixture() as f:
            surface=f.read()
            self.assertTrue(surface.source3_admission['changed_face_coverage'])
            self.assertEqual([r['kind'] for r in surface.road.layer_refs],['derived-road','inferred'])
            for offset in (0.,-.0005,.0005):
                rows=surface.road.triangles.copy();rows[1,:,2]+=offset
                surface.road_index=source3.NativeTriangleIndex(rows)
                hits=surface.road_index.hits(.2,.2)
                with self.subTest(offset_m=offset):
                    point,proof=surface.check([.2,.2],'pedestrian')
                    self.assertEqual(point[2],max(hit['height'] for hit in hits))
                    self.assertEqual(proof['support_surface_sha256'],surface.support_record['sha256'])
                    self.assertEqual(len(hits),2)

    def test_road_profiles_use_consumed_glb_face_identity_for_unchanged_and_changed_hits(self):
        surface = types.SimpleNamespace(derived_record={'sha256': 'd'*64}, support_record={'sha256': 's'*64},
            support_manifest={'native_roads': [{'source': {'sha256': '0'*64}}, {'source': {'sha256': '1'*64}}]})
        for kind in ('road', 'derived-road'):
            ref = {'kind': kind, 'source': 1, 'mesh': 2, 'primitive': 3, 'triangle': 2, 'source_triangle_index': 7}
            proof = {'source': 'PLATEAU-road', 'triangle': 100, 'layer_ref': ref}
            result = source3.witness(surface, api, proof, [0, 0], 'pedestrian', None)
            self.assertEqual(result['triangle'], 7)
            self.assertEqual(result['layer_ref']['triangle'], 2)
            self.assertEqual(result['support_road_sha256'], '1'*64)

    def test_multi_primitive_road_ids_flow_through_ordinary_rays_and_changed_road_output(self):
        attrs = {'POSITION': np.array([[0, 0, 0], [0, 0, 1], [1, 0, 0]], dtype=np.float32),
            'NORMAL': np.array([[0, 1, 0]]*3, dtype=np.float32), 'TEXCOORD_0': np.zeros((3, 2), dtype=np.float32)}
        with tempfile.TemporaryDirectory(prefix='source3-road-ids-') as temporary:
            root = Path(temporary)
            with mock.patch.object(api, 'ROOT', root), mock.patch.object(api, 'OUT', root/'data/prepared/surface'), mock.patch.object(api.city, 'ROOT', root):
                outputs = []
                for source in range(2):
                    writer = api.city.GlbWriter(); writer.doc['materials'] = [{}]
                    for mesh in range(2):
                        changed = copy.deepcopy(attrs); changed['POSITION'][:, 0] += source*10+mesh*2
                        writer.primitive(changed, np.array([[0, 1, 2]]))
                    # A second primitive shares the first mesh, yielding local face zero twice.
                    second = copy.deepcopy(writer.doc['meshes'][1]['primitives'][0])
                    writer.doc['meshes'][0]['primitives'].append(second)
                    result = writer.save(root/f'data/prepared/roads/road{source}.glb')
                    outputs.append({'kind': 'roads', 'path': result['path'], 'sha256': result['sha256']})
                road = api.RoadSupport({'outputs': outputs})
                self.assertEqual([ref['source_triangle_index'] for ref in road.layer_refs], [0, 1, 2, 0, 1, 2])
                self.assertEqual([(ref['mesh'], ref['primitive'], ref['triangle']) for ref in road.layer_refs[3:]], [(0, 0, 0), (0, 1, 0), (1, 0, 0)])
                mappings = [{'source': value, 'source_path': value['path'], 'actor_label': f'City_road{i}'} for i, value in enumerate(road.sources)]
                parent = {'native_roads': mappings}
                _, refs, _, _ = source3.apply_road_overrides(api, parent, {'road_overrides': []})
                self.assertEqual([ref['source_triangle_index'] for ref in refs], [0, 1, 2, 0, 1, 2])
                ledger = {'road_overrides': [{'source': 1, 'mesh': 0, 'primitive': 1, 'triangle': 0, 'region_id': 'replacement',
                    'anchors': [{}], 'replacement': road.sources[1], 'replacement_patch_triangles': [1, 2]}]}
                triangles, refs, mappings, generated = source3.apply_road_overrides(api, parent, ledger, api.OUT/'generated')
                self.assertEqual([ref['source_triangle_index'] for ref in refs], [0, 1, 2, 0, 1, 2, 3])
                self.assertEqual([(ref['mesh'], ref['primitive'], ref['triangle']) for ref in refs[3:]], [(0, 0, 0), (0, 1, 0), (0, 1, 1), (1, 0, 0)])
                self.assertEqual(generated[0]['face_map'], refs[3:])
                road.triangles, road.layer_refs = triangles, refs
                changed, _ = source3.changed_road_samples(triangles, refs, mappings, source3.NativeTriangleIndex(triangles), source3.NativeTriangleIndex([]))
                self.assertEqual([row['expected']['source_triangle_index'] for row in changed], [1, 2])
                self.assertEqual([row['expected']['layer_ref']['triangle'] for row in changed], [0, 1])
                # Choose the later road's second primitive; actor ties within one GLB are harmless.
                record = {'path': 'data/source/rays.json', 'bytes': 1, 'sha256': 'a'*64}
                example = {'ray_start_cm': [1220, 20, 80], 'ray_end_cm': [1220, 20, -100], 'contact_kind': 'pedestrian', 'agent_slot': 1, 'reason': 'fixture'}
                packet = {'centre_support_examples': [example], 'physics_motion_samples': [], 'final_rendered_contacts': {}}
                config = copy.deepcopy(api.CONFIG); config['support_surface']['native_ray_inputs'] = [record]
                with mock.patch.object(api, 'CONFIG', config), mock.patch.object(api, 'admitted_record', return_value=json.dumps(packet).encode()):
                    result = api.native_ray_samples(road, source3.NativeTriangleIndex(road.triangles), source3.NativeTriangleIndex([]), mappings, {'path': 'terrain'}, [])
                rays = json.loads((root/result['path']).read_bytes())
                actual = rays['samples'][0]['expected']
                self.assertEqual(actual['actor_label'], 'City_road1')
                self.assertEqual(actual['source_triangle_index'], 1)
                self.assertEqual(actual['layer_ref']['triangle'], 0)
                self.assertEqual(actual['layer_ref']['primitive'], 1)


import support_surface as geometry


class NativeQueryTests(unittest.TestCase):
    def test_actual810530_tolerant_source_hit_is_not_a_native_hit(self):
        # Literal terrain1a420a5d face810530/original61571; auditd534d133.
        triangle = np.array([[427.7392578125,265.91363525390625,11.605290412902832],
            [428.2914733886719,265.72216796875,11.65822982788086],
            [426.63482666015625,266.2959899902344,11.499415397644043]])
        xy = [427.47194895559466,266.006031244335]
        tolerant = geometry.TriangleIndex(triangle[None]).hits(*xy)
        self.assertEqual(len(tolerant),1)
        self.assertLess(min(tolerant[0]['barycentric']),0)
        for constructor in (api.NativeTriangleIndex,source3.NativeTriangleIndex):
            with self.subTest(constructor=constructor):
                index=constructor(triangle[None]);self.assertEqual(index.hits(*xy),[])
                # Synthetic adjacent face sharing the actual packed B-C edge.
                packed=index.source_packed_triangles_cm[0].astype(float)
                adjacent=np.array([packed[1]+packed[2]-packed[0],packed[2],packed[1]])/100
                both=constructor(np.array([triangle,adjacent]))
                hits=both.hits(*xy)
                self.assertEqual([h['triangle'] for h in hits],[1])
                for face in range(2):
                    centre=both.source_packed_triangles_cm[face].astype(float).mean(axis=0)/100
                    self.assertIn(face,[h['triangle'] for h in both.hits(*centre[:2])])
        # Adjacent fixture is synthetic; no unlisted city neighbor is certified.

    def test_native_edges_are_exact_without_forcing_rationals_for_clear_interiors(self):
        triangle=np.array([[0,0,0],[0,1,0],[1,0,0]],float)
        for constructor in (api.NativeTriangleIndex,source3.NativeTriangleIndex):
            index=constructor(triangle[None])
            # Source3's late import owns a different module during discovery
            # and when the production CLI is loaded as __main__.
            query_api = api if constructor is api.NativeTriangleIndex else importlib.import_module('surface_network')
            with mock.patch.object(query_api,'_exact_orientation',side_effect=AssertionError('clear interior must use certified fast path')):
                hit=index.hits(.25,.25)[0]
                self.assertEqual(hit['normal_enu'],[0,0,1])
            with mock.patch.object(query_api,'_exact_orientation',wraps=query_api._exact_orientation) as exact:
                self.assertEqual(len(index.hits(0,.25)),1)
                self.assertGreater(exact.call_count,0)
            self.assertEqual(index.hits(-1e-12,.25),[])
            self.assertEqual(len(index.hits(1e-12,.25)),1)
            self.assertEqual(index.hits(.75,.75),[])
            with self.assertRaisesRegex(ValueError,'finite'):index.hits(float('nan'),.25)

    def test_query_matches_rounded_double_centimetre_multiply_not_exact_unrealised_scale(self):
        triangle=np.array([[1,0,0],[1,1,0],[2,0,0]],float)
        index=api.NativeTriangleIndex(triangle[None]);hit=index.hits(1.1,0)[0]
        actual=float((Fraction(float(1.1*100))-100)/100)
        invented=float((Fraction(1.1)*100-100)/100)
        self.assertNotEqual(actual,invented)
        self.assertEqual(hit['barycentric'][2],actual)

    def surface(self, road, terrain):
        return types.SimpleNamespace(building_bins=collections.defaultdict(list),buildings=[],dem_height=lambda point:0,
            road_index=api.NativeTriangleIndex(road),terrain_index=api.NativeTriangleIndex(terrain),
            road=types.SimpleNamespace(layer_refs=[{'kind':'road','source':0,'triangle':0}]),
            terrain_sources=[0],support_manifest={'schema_version':2},vehicle_source=None)

    def test_containment_fix_does_not_select_highest_or_bypass_ineligible_layers(self):
        lower=np.array([[[0,0,0],[0,1,0],[1,0,0]]],float)
        upper=lower.copy();upper[:,:,2]=.31
        surface=self.surface(lower,upper)
        self.assertEqual(len(surface.road_index.hits(.2,.2)),1)
        self.assertEqual(len(surface.terrain_index.hits(.2,.2)),1)
        with self.assertRaisesRegex(api.SupportRejection,'stacked-rendered-support-layer'):
            api.Surface.check(surface,[.2,.2],'pedestrian')
        surface.buildings=[{'polygon':[[0,0],[0,1],[1,0]]}];surface.building_bins[0,0]=[0]
        with self.assertRaisesRegex(ValueError,'building-interior'):api.Surface.check(surface,[.2,.2],'pedestrian')
        self.assertFalse(api.allowed_way({'highway':'primary','bridge':'yes'},'vehicle')[0])
        surface=self.surface(np.empty((0,3,3)),lower)
        with self.assertRaisesRegex(ValueError,'no-admitted-road-support'):api.Surface.check(surface,[.2,.2],'vehicle')

    def test_signed_physical_facing_and_real_grade_limits_are_preserved(self):
        triangle=np.array([[[0,0,0],[1,0,0],[0,1,0]]],float)
        self.assertEqual(geometry.TriangleIndex(triangle).hits(.2,.2)[0]['normal_up_z'],1)
        self.assertEqual(api.NativeTriangleIndex(triangle).hits(.2,.2)[0]['normal_up_z'],-1)
        surface=self.surface(triangle,np.empty((0,3,3)))
        with self.assertRaisesRegex(ValueError,'source-support-normal-below-native-limit'):
            api.Surface.check(surface,[.2,.2],'pedestrian')
        for maximum in (.2,.6):
            self.assertEqual(source3.span_grade([0,0,0],[1,0,maximum],maximum),maximum)
            with self.assertRaisesRegex(ValueError,'exceeds'):source3.span_grade([0,0,0],[1,0,np.nextafter(maximum,np.inf)],maximum)
        with self.assertRaisesRegex(ValueError,'exceeds'):source3.span_grade([0,0,0],[.001,0,.01],.2)


if __name__ == '__main__': unittest.main()


class ReconstructionRoleTests(unittest.TestCase):
    def rec(self): return {'path':'data/source/source.glb','bytes':1,'sha256':'a'*64}
    def face(self, role='support-top'):
        return {'patch_triangle':0,'kind':'inferred-ground-reconstruction','reconstruction_role':role,'region_id':'r',
          'corner_ancestry':[{'source_record':self.rec(),'mesh':0,'primitive':0,'triangle':0,
            'barycentric_q':[str(int(j==i)) for j in range(3)],'source_enu_uv_q':['0']*5} for i in range(3)]}
    def ledger(self, face):
        return {'native_frame':api.native_frame_record(),'schema_version':1,'coordinate_model':source3.COORDINATE_MODEL,
          'output_order':source3.OUTPUT_ORDER,'parent_derived_terrain':{**self.rec(),'triangles':1},
          'deleted_parent_triangles':[],'terrain_edits':[],'regions':[{'id':'r','native_xy_polygons_cm':[[[0,0],[0,100],[100,0]]]}],
          'patch_faces':[face],'reconstruction':{'policy':copy.deepcopy(source3.reconstruction.POLICY),'original_query_artifacts':[self.rec()]}}
    def test_closed_reconstruction_layout_keeps_old_bank_contract(self):
        face=self.face();ledger=self.ledger(face)
        parent={'native_frame':api.native_frame_record(),'derived_terrain':ledger['parent_derived_terrain'],'terrain_source_triangle_indices':[0]}
        kept,labels=source3.layout(ledger,parent,1);self.assertEqual(labels[0],face);self.assertEqual(kept.tolist(),[0])
        for change in ({'reconstruction_role':'skip-physical-wall'},{'corner_ancestry':[]},{'kind':'inferred-ground-road','anchors':[1]}):
            changed=copy.deepcopy(ledger);changed['patch_faces'][0].update(change)
            with self.subTest(change=change),self.assertRaises(ValueError):source3.layout(changed,parent,1)
        legacy=copy.deepcopy(ledger);legacy.pop('reconstruction');legacy['patch_faces'][0]={'patch_triangle':0,'kind':'inferred-ground-road','region_id':'r','anchors':[{'raw':1}]}
        self.assertEqual(source3.layout(legacy,parent,1)[1][0]['kind'],'inferred-ground-road')
    def test_wall_and_down_states_retained_without_weakening_legacy_winding(self):
        wall=np.array([[0,0,0],[0,1,0],[0,0,1]],dtype=float)
        down=np.array([[0,0,0],[1,0,0],[0,1,0]],dtype=float)
        for role,points,expected in [('physical-sidewall',wall,'vertical'),('support-top',down,'DOWN')]:
            rows=np.column_stack((points,np.zeros((3,2)),np.repeat([[1.,0.,0.]],3,axis=0)))
            with self.subTest(role=role):
                with self.assertRaises(ValueError):source3.admit_new_face_winding(rows,'legacy',inferred=True)
                state=source3.reconstruction.face_state(api,rows)
                self.assertEqual(state['cook_state'],1);self.assertEqual(state['orientation'],expected)
                self.assertEqual(state['support_eligibility'],'NOT_EVALUATED_BEFORE_FIRST_BLOCKER')
    def test_actual_common_writer_readback_changes_final_packing_order(self):
        x=-308.9107177816123  # Literal v2 retained core triangle2880 corner2 E operand.
        rows=np.array([[x,0,0,0,0,0,1,0],[x,1,0,0,1,0,1,0],[x+1,0,0,1,0,0,1,0]],dtype=float)
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);stage=root/'data/prepared/staged';stage.mkdir(parents=True)
            attrs={'POSITION':rows[:,[0,2,1]].astype('<f4'),'TEXCOORD_0':rows[:,3:5].astype('<f4'),'NORMAL':rows[:,5:8].astype('<f4')}
            ordinary_write=api.guarded_write
            with mock.patch.object(api,'ROOT',root), mock.patch.object(api,'guarded_write',side_effect=lambda p,b:ordinary_write(p,b,root=root/'data/prepared')):
                rec=source3.write_mesh(api,stage,'actual.glb',attrs,np.array([[0,1,2]],dtype=np.uint32),[{}])
                payload=api.guarded_read(root/rec['path'],root/'data');_,parts=source3.primitives(api,payload)
                decoded=source3.triangle_rows(parts)[0];state=source3.reconstruction.face_state(api,decoded)
            self.assertEqual(decoded[0,0],float(np.float32(x)))
            self.assertEqual(state['native_cm'][0][0],float(np.float32(float(np.float32(x))*100)))
            self.assertNotEqual(state['native_cm'][0][0],float(np.float32(x*100)))
    def test_ineligible_selected_reconstruction_refuses_without_lower_fallback(self):
        tri=np.array([[0.,0.,0.],[0.,1.,0.],[1.,0.,0.]])
        high=tri.copy();high[:,2]=.5
        for role in ('physical-transition','physical-sidewall'):
            surface=types.SimpleNamespace(support_manifest={'schema_version':3,'native_roads':[]},
                road_index=source3.NativeTriangleIndex(np.array([tri,high])),terrain_index=source3.NativeTriangleIndex(np.empty((0,3,3))),
                road=types.SimpleNamespace(layer_refs=[{'kind':'inferred','triangle':0},{'kind':'inferred','triangle':1,'reconstruction_role':role}]),
                building_bins={},buildings=[],dem_height=lambda p:0.,
                derived_record={'sha256':'d'*64},support_record={'sha256':'s'*64})
            with self.subTest(role=role):
                with self.assertRaisesRegex(api.SupportRejection,'ineligible-reconstruction-first-blocker') as failed:
                    api.Surface._check(surface,[.2,.2],'pedestrian')
                self.assertEqual(failed.exception.witness['selected']['triangle'],1)
                self.assertEqual(failed.exception.witness['selected']['height'],.5)
                self.assertFalse(failed.exception.witness['lower_hit_fallback'])

    def test_new_geometry_cannot_use_unchanged_reference_prepare(self):
        ledger=self.ledger(self.face())
        with mock.patch.object(api,'admit_path',return_value=ROOT/'data/source/edits.json'), mock.patch.object(api,'guarded_read',return_value=json.dumps(ledger).encode()), mock.patch.object(api,'Surface') as world:
            with self.assertRaisesRegex(ValueError,'unchanged-reference preparation remains unchanged'):
                source3.prepare(api,{},ROOT/'data/source/edits.json',total_seconds=1)
            world.assert_not_called()

    def test_exact_ancestry_uv_region_and_outside_loss_controls(self):
        rows=np.array([[0,0,0,0,0,0,1,0],[0,4,0,0,1,0,1,0],[4,0,0,1,0,0,1,0]],dtype=float)
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);stage=root/'data/prepared/source';stage.mkdir(parents=True)
            attrs={'POSITION':rows[:,[0,2,1]].astype('<f4'),'TEXCOORD_0':rows[:,3:5].astype('<f4'),'NORMAL':rows[:,5:8].astype('<f4')}
            ordinary_write=api.guarded_write
            with mock.patch.object(api,'ROOT',root),mock.patch.object(api,'guarded_write',side_effect=lambda p,b:ordinary_write(p,b,root=root/'data/prepared')):
                rec=source3.write_mesh(api,stage,'source.glb',attrs,np.array([[0,1,2]],dtype=np.uint32),[{}])
                face=self.face()
                for i,a in enumerate(face['corner_ancestry']):a.update(source_record=rec,source_enu_uv_q=[str(Fraction(float(x))) for x in rows[i,:5]])
                source3.reconstruction.check_ancestry(api,source3,face,rows,{})
                changed=copy.deepcopy(face);changed['corner_ancestry'][0]['source_enu_uv_q'][3]='1/1000'
                with self.assertRaisesRegex(ValueError,'immutable source-face ancestry'):source3.reconstruction.check_ancestry(api,source3,changed,rows,{})
                changed=rows.copy();changed[0,3]=1e-6
                with self.assertRaisesRegex(ValueError,'actual GLB vertex/UV'):source3.reconstruction.check_ancestry(api,source3,face,changed,{})
        source3.reconstruction.check_inside(face,[[Fraction(0),Fraction(0)],[Fraction(0),Fraction(4)],[Fraction(4),Fraction(0)]])
        with self.assertRaisesRegex(ValueError,'outside its declared'):source3.reconstruction.check_inside(face,[[Fraction(0),Fraction(0)],[Fraction(0),Fraction(1)],[Fraction(1),Fraction(0)]])
        polygon=[[Fraction(2),Fraction(0)],[Fraction(4),Fraction(0)],[Fraction(4),Fraction(4)],[Fraction(2),Fraction(4)]]
        def frag(points):return {'corner_ancestry':[{'source_enu_uv_q':[str(x),str(y),'0','0','0']} for x,y in points]}
        pieces=[frag([(0,0),(2,0),(2,4)]),frag([(0,0),(2,4),(0,4)])]
        original=[[Fraction(0),Fraction(0)],[Fraction(4),Fraction(0)],[Fraction(4),Fraction(4)],[Fraction(0),Fraction(4)]]
        self.assertEqual(source3.reconstruction.check_outside_partition(source3,original,pieces,polygon),'8')
        for broken in (pieces[:1],pieces+[pieces[0]]):
            with self.subTest(broken=broken),self.assertRaises(ValueError):source3.reconstruction.check_outside_partition(source3,original,broken,polygon)

    def test_historical_reencoding_requires_actual_identical_geometry_not_marker_stamping(self):
        rows=np.array([[0,0,0,0,0,0,1,0],[0,4,0,0,1,0,1,0],[4,0,0,1,0,0,1,0],
                       [5,0,0,0,0,0,1,0],[5,4,0,0,1,0,1,0],[9,0,0,1,0,0,1,0]],dtype=float)
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);out=root/'data/prepared/surface';out.mkdir(parents=True);provenance=root/'data/source/provenance';provenance.mkdir(parents=True)
            ordinary_write=api.guarded_write
            def write(path,payload,root=None):return ordinary_write(path,payload,root=out if root is None else root)
            with mock.patch.object(api,'ROOT',root),mock.patch.object(api,'OUT',out),mock.patch.object(api,'guarded_write',side_effect=write):
                def data(name,value):
                    path=out/name;write(path,api.encoded(value));return api.source_record(path)
                def mesh(name,value):
                    attrs={'POSITION':value[:,[0,2,1]].astype('<f4'),'TEXCOORD_0':value[:,3:5].astype('<f4'),'NORMAL':value[:,5:8].astype('<f4')}
                    return source3.write_mesh(api,out,name,attrs,np.arange(len(value),dtype=np.uint32).reshape(-1,3),[{}])
                original=mesh('parent.glb',rows);patch=mesh('patch.glb',rows[:3])
                parent={'schema_version':2,'native_frame':api.native_frame_record(),'derived_terrain':original,'terrain_source_triangle_indices':[0,1],'native_roads':[]}
                parent_record=data('parent.json',parent)
                oldparent={k:v for k,v in parent.items() if k!='native_frame'};oldparent_record=data('old-parent.json',oldparent)
                label={'patch_triangle':0,'kind':'retained-parent-fragment','parent_triangle':0,'original_terrain_parent':0,'region_id':'legacy','vertex_edits':[],'maximum_plane_error_m':0,'maximum_uv_error':0}
                oldledger={'schema_version':1,'coordinate_model':'native-float32-centimetres-v1','output_order':source3.OUTPUT_ORDER,
                  'parent_support_surface':oldparent_record,'parent_derived_terrain':original,'terrain_patch':patch,'deleted_parent_triangles':[0],
                  'terrain_edits':[{'parent_triangle':0,'region_id':'legacy'}],'regions':[{'id':'legacy','native_xy_polygons_cm':[[[0,0],[0,400],[400,0]]]}],'patch_faces':[label],'road_overrides':[]}
                # Literal failing group from actual ledger9c118d63, regions[31].endpoint_stitches[0].
                oldledger['regions'][0]['endpoint_stitches']=[{'original_native_cm':[
                    [-4217.0087890625,248.8402099609375,-3.5649352073669434],
                    [-4217.00830078125,248.84042358398438,-3.5652616024017334]],
                    'replacement_native_cm':[-4217.0087890625,248.84030151367188,-3.565098285675049]}]
                encoded=copy.deepcopy(oldledger);encoded.update(native_frame=api.native_frame_record(),coordinate_model=source3.COORDINATE_MODEL,parent_support_surface=parent_record)
                doc,attrs,indices,_,_=source3.assemble_terrain(api,encoded,parent)
                active=source3.write_mesh(api,out,'old-active.glb',attrs,indices,doc['materials'])
                old_record=data('old-ledger.json',oldledger);manifest=data('old-active.json',{'schema_version':3,'surface_edits':old_record,'parent_support_surface':oldparent_record,'derived_terrain':active,'native_roads':[]})
                result=source3.reconstruction.rebuild_legacy_baseline(api,parent_record,manifest,out/'generations/baseline')
                self.assertEqual(result['derived_terrain']['sha256'],active['sha256']);self.assertTrue(result['old_geometry_reproduced'])
                admitted=json.loads(api.admitted_record(result['ledger'],root/'data'))
                self.assertEqual(admitted['native_frame'],api.native_frame_record())
                self.assertEqual(admitted['regions'][0]['native_xy_polygons_cm'],[[[0,0],[0,-400],[400,0]]])
                group=admitted['regions'][0]['endpoint_stitches'][0]
                self.assertEqual(group['original_native_cm'],[[-4217.0087890625,-248.8402099609375,-3.5649352073669434],[-4217.00830078125,-248.84042358398438,-3.5652616024017334]])
                self.assertEqual(group['replacement_native_cm'],[-4217.0087890625,-248.84030151367188,-3.565098285675049])
                altered=copy.deepcopy(parent);altered['derived_terrain']=mesh('different-parent.glb',rows+np.array([1,0,0,0,0,0,0,0]))
                altered_record=data('different-parent.json',altered)
                with self.assertRaisesRegex(ValueError,'geometry differs.*ancestry rebase'):
                    source3.reconstruction.rebuild_legacy_baseline(api,altered_record,manifest,out/'generations/refused')

    def test_complete_small_composition_serializes_and_stages_without_alias_switch(self):
        # Three genuine format triangles: new owned face0, authenticated legacy
        # face1, byte-preserved parent face2. No Surface/world/index initialized.
        rows=np.array([[0,0,.05,0,0,0,1,0],[0,1,.05,0,1,0,1,0],[1,0,.05,1,0,0,1,0],
                       [4,0,.05,0,0,0,1,0],[4,1,.05,0,1,0,1,0],[5,0,.05,1,0,0,1,0],
                       [8,0,.05,0,0,0,1,0],[8,1,.05,0,1,0,1,0],[9,0,.05,1,0,0,1,0]],dtype='<f4').astype(float)
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);out=root/'data/prepared/surface';out.mkdir(parents=True);provenance=root/'data/source/provenance';provenance.mkdir(parents=True)
            ordinary_write=api.guarded_write
            def write(path,payload,root=None):return ordinary_write(path,payload,root=out if root is None else root)
            with mock.patch.object(api,'ROOT',root),mock.patch.object(api,'OUT',out),mock.patch.object(api,'guarded_write',side_effect=write):
                def data(name,value):
                    path=out/name;write(path,api.encoded(value));return api.source_record(path)
                def mesh(name,value):
                    return source3.write_mesh(api,out,name,{'POSITION':value[:,[0,2,1]].astype('<f4'),'TEXCOORD_0':value[:,3:5].astype('<f4'),'NORMAL':value[:,5:8].astype('<f4')},np.arange(len(value),dtype=np.uint32).reshape(-1,3),[{}])
                original=mesh('parent.glb',rows);patch=mesh('legacy-patch.glb',rows[3:6]);code=data('algorithm.json',{'fixture':'producer snapshot scope is not tested here'})
                (root/'tools/data').mkdir(parents=True)
                for name in ('support_source3.py','support_reconstruction.py'):
                    (root/'tools/data'/name).write_bytes(('fixture '+name).encode())
                parent={'schema_version':2,'native_frame':api.native_frame_record(),'derived_terrain':original,'terrain_source_triangle_indices':[0,1,2],'native_roads':[],
                    'frame':{},'origin':{},'vertical_reference':{},'inputs':{},'atlas':{},'attribution':[],'native_assignment':{}}
                parent_record=data('parent.json',parent);old_parent_record=data('old-parent.json',{k:v for k,v in parent.items() if k!='native_frame'})
                label={'patch_triangle':0,'kind':'retained-parent-fragment','parent_triangle':1,'original_terrain_parent':1,'region_id':'legacy','vertex_edits':[],'maximum_plane_error_m':0,'maximum_uv_error':0}
                prior={'schema_version':1,'coordinate_model':'native-float32-centimetres-v1','output_order':source3.OUTPUT_ORDER,
                    'parent_support_surface':old_parent_record,'parent_derived_terrain':original,'terrain_patch':patch,'deleted_parent_triangles':[1],
                    'terrain_edits':[{'parent_triangle':1,'region_id':'legacy'}],'regions':[{'id':'legacy','native_xy_polygons_cm':[[[400,0],[400,100],[500,0]]]}],
                    'patch_faces':[label],'road_overrides':[],'recipe':{'algorithm':code,'source_inputs':[original],'candidate_inputs':[patch]}}
                framed=copy.deepcopy(prior);framed.update(native_frame=api.native_frame_record(),coordinate_model=source3.COORDINATE_MODEL,parent_support_surface=parent_record)
                doc,attrs,indices,_,_=source3.assemble_terrain(api,framed,parent);active=source3.write_mesh(api,out,'old-active.glb',attrs,indices,doc['materials'])
                historical=data('historical.json',{'schema_version':3,'surface_edits':data('old-ledger.json',prior),'parent_support_surface':old_parent_record,'derived_terrain':active,'native_roads':[]})
                baseline=source3.reconstruction.rebuild_legacy_baseline(api,parent_record,historical,out/'generations/baseline')
                values=rows[:3,:5].tolist();q=[[str(Fraction(float(x))) for x in p] for p in values]
                packet={'active':[{'id':'terrain0','classification':'reconstruction-ground','vertices':values,'source_record':active,'source_face':{'kind':'terrain','parent_triangle':0,'original_triangle':0}}],
                    'raw_GSI':[{'id':'original-GSI:0','vertices':values,'source_record':original,'photo_record':original,'classification':'reconstruction-ground','source_face':{'photo_accessor_ref':{'mesh':0,'primitive':0,'triangle':0}}}]}
                candidate={'region':[[p[0],p[1]] for p in q],'outside_active':[],
                    'support_core':[{'parent':'original-GSI:0','vertices':q,'parent_barycentric':[['1','0','0'],['0','1','0'],['0','0','1']]}],
                    'transition_tops':[],'sidewalls':[],
                    'same_visible_collision_triangles':[{'vertices':q,'classification':'inferred-graded-support-core','source_row_index':0,'source_corner_indices':[0,1,2]}],
                    'parent_accounting':[{'parent':'terrain0','removed_inside_area_q':'1/2'}]}
                original_failures=data('original-failed-poses.json',{'staging_fixture':'not a real route proof'})
                active_alias=out/'support-surface-manifest.json';write(active_alias,b'{"original_alias":true}');before=active_alias.read_bytes()
                with mock.patch.object(api,'generation_code_record',return_value=code),mock.patch.object(api,'generation_configuration_record',return_value=code),mock.patch.object(api,'support_generation_inventory',return_value=[original]),mock.patch.object(api,'generation_bindings',return_value={'fixture':'snapshot semantics not under test'}):
                    composed=source3.reconstruction.compose_retained(api,parent_record,baseline,packet,candidate,out/'generations/inputs',retained_inputs=[original_failures],original_query_artifacts=[original_failures])
                    result=source3.reconstruction.stage_generation(api,{},root/composed['path'],out/'generations/final')
                self.assertFalse(result['active_alias_written']);self.assertEqual(active_alias.read_bytes(),before)
                manifest=json.loads(api.admitted_record(result['support_surface'],root/'data'))
                self.assertTrue(manifest['staged_reconstruction']);self.assertEqual(manifest['parent_support_surface'],parent_record)
                self.assertEqual(manifest['evidence']['source_exact_outside_partition_m2_q'],{'0':'0'})
                states=manifest['evidence']['reconstruction_faces'];self.assertEqual(len(states),1)
                self.assertEqual(states[0]['reconstruction_role'],'support-top');self.assertEqual(states[0]['cook_state'],1)
                final_ledger=json.loads(api.admitted_record(manifest['surface_edits'],root/'data'))
                self.assertEqual(final_ledger['patch_faces'][0],framed['patch_faces'][0])
                self.assertEqual(final_ledger['deleted_parent_triangles'],[0,1])
                self.assertFalse(manifest['evidence']['physical_role_filter_applied'])
                inventory=json.loads(api.admitted_record(manifest['source_preservation'],root/'data'))
                self.assertEqual(inventory['reconstruction_writer'],manifest['algorithm']['reconstruction'])
                frozen={r['path'] for r in inventory['inputs_before']}
                self.assertTrue({'tools/data/support_source3.py','tools/data/support_reconstruction.py',composed['path']} <= frozen)


class ReconstructionPartitionTests(unittest.TestCase):
    """Real reader and exact outside math; synthetic IO/decoded two-face input only."""
    def fixture(self, *, legacy=False, new_fragment=False):
        def rec(name):return {'path':'data/source/'+name,'bytes':1,'sha256':'a'*64}
        parent_rec,patch_rec,prior_patch=rec('parent.glb'),rec('patch.glb'),rec('prior-patch.glb')
        row=np.array([[10,10,0,0,0,0,1,0],[11,10,0,1,0,0,1,0],[10,11,0,0,1,0,1,0]],float)
        parent_rows=np.array([row,row+np.array([10,0,0,0,0,0,0,0])])
        fragment={'kind':'retained-parent-fragment','patch_triangle':0,'parent_triangle':1,'original_terrain_parent':1,
                  'reconstruction_fragment':True,'corner_ancestry':[]}
        labels=[fragment] if new_fragment else []
        ledger={'native_frame':api.native_frame_record(),'parent_support_surface':rec('parent.json'),
            'parent_derived_terrain':parent_rec,'terrain_patch':patch_rec,'deleted_parent_triangles':[0,1] if legacy else [0],
            'road_overrides':[],'reconstruction':{'policy':copy.deepcopy(source3.reconstruction.POLICY),
            'original_query_artifacts':[rec('failure.json')],'owned_source_enu_m_q':[['0','0'],['1','0'],['0','1']],
            'new_deleted_parent_triangles':[0]}}
        prior={'native_frame':api.native_frame_record(),'parent_support_surface':ledger['parent_support_surface'],
               'parent_derived_terrain':parent_rec,'terrain_patch':prior_patch,'patch_faces':[],
               'deleted_parent_triangles':[1],'road_overrides':[]}
        records={ledger['parent_support_surface']['path']:lambda:json.dumps({'schema_version':2,'native_frame':api.native_frame_record(),'derived_terrain':parent_rec,'native_roads':[]}).encode()}
        if legacy:
            prior_rec,baseline_rec,original_rec=rec('prior.json'),rec('baseline.glb'),rec('original.json')
            ledger['reconstruction']['legacy_baseline']={'ledger':prior_rec,'derived_terrain':baseline_rec,'original_manifest':original_rec}
            records[prior_rec['path']]=lambda:json.dumps(prior).encode()
            records[original_rec['path']]=lambda:json.dumps({'derived_terrain':baseline_rec}).encode()
        def payload(_api,r,*args):return records[r['path']]() if r['path'] in records else r['path'].encode()
        def primitive(_api,payload):
            name=payload.decode()
            rows=parent_rows if name==parent_rec['path'] else (parent_rows[1:2] if new_fragment and name==patch_rec['path'] else np.empty((0,3,8)))
            flat=rows.reshape(-1,8)
            return {},[(0,0,{'POSITION':flat[:,[0,2,1]],'TEXCOORD_0':flat[:,3:5],'NORMAL':flat[:,5:8]},np.arange(len(flat)).reshape(-1,3))]
        return ledger,prior,labels,payload,primitive
    def validate(self,ledger,labels,payload,primitive):
        with mock.patch.object(source3,'record',side_effect=payload),mock.patch.object(source3,'primitives',side_effect=primitive):
            return source3.reconstruction.validate(api,source3,ledger,labels)
    def test_reader_refuses_omitted_outside_parent(self):
        ledger,prior,labels,payload,primitive=self.fixture()
        ledger['reconstruction']['new_deleted_parent_triangles']=[]
        with self.assertRaisesRegex(ValueError,'deletion partition'):
            self.validate(ledger,labels,payload,primitive)

    def test_reader_refuses_omitted_outside_parent_and_exact_partition_type_errors(self):
        ledger,prior,labels,payload,primitive=self.fixture(legacy=True)
        # Parent0 lies wholly outside ownership. Its deletion cannot be hidden by
        # omitting it from the auxiliary list checked by the old real validator.
        for value in ([],[0,1],[0,2],[0,0],['0'],[False],0,{},None):
            changed=copy.deepcopy(ledger);changed['reconstruction']['new_deleted_parent_triangles']=value
            with self.subTest(value=value),self.assertRaisesRegex(ValueError,'deletion partition'):
                self.validate(changed,labels,payload,primitive)
        with self.assertRaisesRegex(ValueError,'loses or invents original geometry'):
            self.validate(ledger,labels,payload,primitive)
        missing=copy.deepcopy(ledger);del missing['reconstruction']['new_deleted_parent_triangles']
        with self.assertRaisesRegex(ValueError,'deletion partition'):self.validate(missing,labels,payload,primitive)
        # An unchanged authenticated legacy-only population has an empty new set.
        ledger['deleted_parent_triangles']=[1];ledger['reconstruction']['new_deleted_parent_triangles']=[]
        self.assertEqual(self.validate(ledger,labels,payload,primitive)['source_exact_outside_partition_m2_q'],{})
    def test_new_fragment_cannot_reuse_authenticated_legacy_removal(self):
        ledger,prior,labels,payload,primitive=self.fixture(legacy=True,new_fragment=True)
        ledger['deleted_parent_triangles']=[1];ledger['reconstruction']['new_deleted_parent_triangles']=[]
        with self.assertRaisesRegex(ValueError,'fragment.*new deletion partition'):
            self.validate(ledger,labels,payload,primitive)
    def test_main_road_partition_keeps_exact_legacy_overrides_and_disjoint_explicit_trims(self):
        ledger,prior,labels,payload,primitive=self.fixture(legacy=True)
        ledger['deleted_parent_triangles']=[1];ledger['reconstruction']['new_deleted_parent_triangles']=[]
        old={'source':0,'mesh':0,'primitive':0,'triangle':3,'replacement':{'sha256':'old'}}
        prior['road_overrides']=[old];ledger['road_overrides']=[copy.deepcopy(old)]
        self.validate(ledger,labels,payload,primitive)
        cases=[[],[{**old,'replacement':{'sha256':'changed'}}],[old,{'source':0,'mesh':0,'primitive':0,'triangle':4}],
               [old,{**old,'reconstruction_trim':True}],[old,{'source':0,'mesh':0,'primitive':0,'triangle':4,'reconstruction_trim':1}]]
        for roads in cases:
            changed=copy.deepcopy(ledger);changed['road_overrides']=roads
            with self.subTest(roads=roads),self.assertRaisesRegex(ValueError,'road override partition'):
                self.validate(changed,labels,payload,primitive)


class LegacyCoordinateEncodingTests(unittest.TestCase):
    def test_native_grouping_reflection_preserves_non_native_fields_and_signed_zero(self):
        original={'coordinate_model':'native-float32-centimetres-v1','original_native_cm':[[1,2,3],[4,-0.0,6]],
                  'replacement_native_cm':[1,-2.5,3],'native_xy_polygons_cm':[[[0,0],[1,0],[1,1],[0,1]]],
                  'raw_enu_m':[1,2,3],'uv':[[.1,.2],[.3,.4]],'ids':[0,3,8],'nested':{'other':[2,5]}}
        saved=copy.deepcopy(original);encoded=source3.reconstruction.reencode_legacy_native(original)
        self.assertEqual(original,saved)
        self.assertEqual(encoded['original_native_cm'],[[1,-2,3],[4,0.0,6]])
        self.assertEqual(struct.pack('>d',encoded['original_native_cm'][1][1]),struct.pack('>d',0.0))
        self.assertEqual(encoded['replacement_native_cm'],[1,2.5,3])
        self.assertEqual(encoded['native_xy_polygons_cm'],[[[0,0],[1,0],[1,-1],[0,-1]]])
        for k in ('raw_enu_m','uv','ids','nested','coordinate_model'):self.assertEqual(encoded[k],original[k])
        self.assertEqual(source3.reconstruction.reencode_legacy_native(encoded),original)
    def test_malformed_or_nonfinite_native_operands_refuse_without_flattening_or_coercion(self):
        bad=[[],[1,2],[1,2,3,4],[[1,2,3],[4,5]],[[[1,2,3]]],[1,[2,3,4],5],[1,'2',3],[1,True,3],[1,float('nan'),3],[1,float('inf'),3],[1,10**400,3]]
        for value in bad:
            for key in ('original_native_cm','replacement_native_cm'):
                with self.subTest(value=value,key=key),self.assertRaisesRegex(ValueError,'Historical native'):
                    source3.reconstruction.reencode_legacy_native({'coordinate_model':'native-float32-centimetres-v1',key:value})
        for value in ([],[[[0,0],[1,0]]],[[[0,0],[1,0],[1,'1']]],[[[0,0],[1,0],[1,float('nan')]]]):
            with self.subTest(value=value),self.assertRaisesRegex(ValueError,'Historical native'):
                source3.reconstruction.reencode_legacy_native({'coordinate_model':'native-float32-centimetres-v1','native_xy_polygons_cm':value})
    def test_current_unknown_or_framed_ledger_cannot_be_reflected_again(self):
        for change in ({'coordinate_model':'unknown'},{'native_frame':api.native_frame_record()},{'native_frame':None}):
            with self.subTest(change=change),self.assertRaisesRegex(ValueError,'exact old unframed'):
                source3.reconstruction.reencode_legacy_native({'coordinate_model':'native-float32-centimetres-v1',**change})


class ReconstructionAnchorAuthorityTests(unittest.TestCase):
    def fixture(self):
        record={'path':'data/prepared/genuine-parent.glb','bytes':40800172,'sha256':'a'*64,'triangles':1,'vertices':3,'bounds_glb_m':[[0,0,0],[1,0,1]]}
        ledger={'parent_support_surface':{'path':'data/prepared/parent.json','bytes':1,'sha256':'b'*64},'parent_derived_terrain':copy.deepcopy(record)}
        parent={'schema_version':2,'native_frame':api.native_frame_record(),'derived_terrain':copy.deepcopy(record)}
        rows=np.array([[0,0,0,0,0,0,1,0],[0,1,0,0,1,0,1,0],[1,0,0,1,0,0,1,0]],float)
        parts=[(0,0,{'POSITION':rows[:,[0,2,1]],'TEXCOORD_0':rows[:,3:5],'NORMAL':rows[:,5:8]},np.array([[0,1,2]]))]
        face={'kind':'inferred-ground-reconstruction','reconstruction_role':'support-top','corner_ancestry':[{'source_record':copy.deepcopy(record),'mesh':0,'primitive':0,'triangle':0,'barycentric_q':[str(int(i==j)) for j in range(3)],'source_enu_uv_q':[str(Fraction(float(v))) for v in rows[i,:5]]} for i in range(3)]}
        def payload(_api,value,name,limit=64*1024*1024):
            api.support_topology.typed_record(value,name,limit,True)
            if value==ledger['parent_support_surface']:return json.dumps(parent).encode()
            raise AssertionError('Decoded authoritative parent must not be reread: '+name)
        return record,ledger,parent,rows,parts,face,payload
    def test_authenticated_full_parent_record_reuses_decoded_geometry_without_reread(self):
        record,ledger,parent,rows,parts,face,payload=self.fixture()
        with mock.patch.object(source3,'record',side_effect=payload) as io:
            cache=source3.reconstruction.parent_anchor_cache(api,source3,ledger,parts)
            source3.reconstruction.check_ancestry(api,source3,face,rows,cache)
            self.assertEqual(io.call_count,1)
        self.assertIs(cache[record['path'],record['sha256']][1],parts)
    def test_every_cached_anchor_requires_full_record_and_actual_parent_authority(self):
        record,ledger,parent,rows,parts,face,payload=self.fixture()
        with mock.patch.object(source3,'record',side_effect=payload):
            cache=source3.reconstruction.parent_anchor_cache(api,source3,ledger,parts)
            for key,value in [('bytes',40800171),('triangles',2),('vertices',4),('bounds_glb_m',[[0,0,0],[2,0,1]]),('unadmitted_extra',True)]:
                changed=copy.deepcopy(face);changed['corner_ancestry'][1]['source_record'][key]=value
                with self.subTest(key=key),self.assertRaisesRegex(ValueError,'full-record mismatch'):
                    source3.reconstruction.check_ancestry(api,source3,changed,rows,cache)
            changed=copy.deepcopy(ledger);changed['parent_derived_terrain']['triangles']=2
            with self.assertRaisesRegex(ValueError,'authority.*full record'):
                source3.reconstruction.parent_anchor_cache(api,source3,changed,parts)
    def test_unmatched_raw_anchor_and_raw_geometry_cache_keep_original_cap_and_record_fence(self):
        record,ledger,parent,rows,parts,face,payload=self.fixture()
        with mock.patch.object(source3,'record',side_effect=payload):
            cache=source3.reconstruction.parent_anchor_cache(api,source3,ledger,parts)
            for changes in ({'path':'data/source/not-parent.glb'},{'sha256':'c'*64},{'path':'data/source/raw.glb','bytes':32000001}):
                changed=copy.deepcopy(face)
                for a in changed['corner_ancestry']:a['source_record'].update(changes)
                with self.subTest(changes=changes),self.assertRaisesRegex(ValueError,'32000000'):
                    source3.reconstruction.check_ancestry(api,source3,changed,rows,cache)
            raw={'path':'data/source/raw.glb','bytes':1,'sha256':'d'*64}
            cache['raw-geometry',raw['path'],raw['sha256']]=(copy.deepcopy(raw),(parts[0][2]['POSITION'],parts[0][3]))
            changed=copy.deepcopy(face)
            for a in changed['corner_ancestry']:a['immutable_raw_geometry_record']={**raw,'bytes':2}
            with self.assertRaisesRegex(ValueError,'GSI geometry cache full-record mismatch'):
                source3.reconstruction.check_ancestry(api,source3,changed,rows,cache)


class LegacyRoadContextTests(unittest.TestCase):
    @contextlib.contextmanager
    def fixture(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);out=root/'data/prepared/surface';out.mkdir(parents=True)
            ordinary=api.guarded_write
            def write(path,payload,root=None):return ordinary(path,payload,root=out if root is None else root)
            with mock.patch.object(api,'ROOT',root),mock.patch.object(api,'OUT',out),mock.patch.object(api,'guarded_write',side_effect=write):
                def mesh(name,dx,z):
                    rows=np.array([[dx,0,z,0,0,0,1,0],[dx,1,z,0,1,0,1,0],[dx+1,0,z,1,0,0,1,0]],float)
                    return source3.write_mesh(api,out,name,{'POSITION':rows[:,[0,2,1]].astype('<f4'),'TEXCOORD_0':rows[:,3:5].astype('<f4'),'NORMAL':rows[:,5:8].astype('<f4')},np.array([[0,1,2]],np.uint32),[{}])
                def data(name,value):
                    path=out/name;write(path,api.encoded(value));return api.source_record(path)
                raw=[mesh('raw0.glb',0,0),mesh('raw1.glb',2,0)]
                patches=[mesh('patch0.glb',0,.05),mesh('patch1.glb',2,.1)]
                parent={'native_roads':[{'source':r,'source_path':r['path'],'actor_label':'Road'+str(i),'triangles':1} for i,r in enumerate(raw)]}
                prior={'road_overrides':[{'source':i,'mesh':0,'primitive':0,'triangle':0,'region_id':'old','anchors':[{}],'replacement':p,'replacement_patch_triangles':[0]} for i,p in enumerate(patches)]}
                _,_,native,outputs=source3.apply_road_overrides(api,parent,prior,out/'own-baseline')
                old=copy.deepcopy(outputs)
                for row in old:row['record']['path']='data/prepared/historical/'+str(row['source'])+'.glb'
                historical=data('historical.json',{'derived_roads':old})
                baseline={'native_roads':native,'derived_roads':[{'source':r['source'],'record':copy.deepcopy(r['record'])} for r in outputs],'original_manifest':historical}
                yield parent,prior,baseline,out,data,old
    def test_real_baseline_road_reader_context_closes_old_keyerror_without_mutating_parent(self):
        with self.fixture() as (parent,prior,baseline,out,data,old):
            with self.assertRaisesRegex(KeyError,'_source3_derived_roads'):
                source3.apply_road_overrides(api,parent,prior)
            parent['_source3_derived_roads']=[{'source':99,'record':{'combined_new_stage':True}}]
            before=copy.deepcopy((parent,prior,baseline))
            roads,refs=source3.reconstruction.read_legacy_roads(api,source3,parent,prior,baseline)
            self.assertEqual(len(roads),2);self.assertEqual(len(refs),2)
            self.assertEqual((parent,prior,baseline),before)
            self.assertNotEqual(baseline['derived_roads'][0]['record']['path'],old[0]['record']['path'])
    def test_incomplete_wrong_swapped_and_changed_baseline_road_mappings_refuse(self):
        with self.fixture() as (parent,prior,baseline,out,data,old):
            cases=[]
            broken=copy.deepcopy(baseline);broken.pop('derived_roads');cases.append(broken)
            broken=copy.deepcopy(baseline);broken['derived_roads']=[];cases.append(broken)
            broken=copy.deepcopy(baseline);broken['derived_roads'][1]['source']=0;cases.append(broken)
            broken=copy.deepcopy(baseline);broken['derived_roads'][0]['record'],broken['derived_roads'][1]['record']=broken['derived_roads'][1]['record'],broken['derived_roads'][0]['record'];cases.append(broken)
            broken=copy.deepcopy(baseline);broken['derived_roads'][0]['record']['bytes']+=1;cases.append(broken)
            broken=copy.deepcopy(baseline);broken['derived_roads'][0]['source']=True;cases.append(broken)
            for i,broken in enumerate(cases):
                with self.subTest(case=i),self.assertRaisesRegex(ValueError,'Legacy baseline road context'):
                    source3.reconstruction.read_legacy_roads(api,source3,parent,prior,broken)
            changed=copy.deepcopy(old);changed[0]['face_map'][0]['original_triangle']=999
            broken=copy.deepcopy(baseline);broken['original_manifest']=data('wrong-historical-provenance.json',{'derived_roads':changed})
            with self.assertRaisesRegex(ValueError,'full face-map provenance'):
                source3.reconstruction.read_legacy_roads(api,source3,parent,prior,broken)
