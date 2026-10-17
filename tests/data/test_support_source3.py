"""Bound: small explicit edit contracts/native coordinates; no city/native acceptance."""
import copy
import collections
import contextlib
import json
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
            support_record={'sha256': 's'*64}, derived_record={'sha256': 'd'*64},
            road=types.SimpleNamespace(layer_refs=refs), road_index=types.SimpleNamespace(triangles=triangles))
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
        self.assertAlmostEqual(grade, 0.01905961977714173, places=15)
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
        surface.terrain_index = types.SimpleNamespace(triangles=np.array([triangle]))
        row = {**proof, 'source': 'GSI-DEM5A', 'triangle': 18, 'layer_ref': terrain_ref}
        self.assertIsNotNone(source3.same_native_triangle(surface, row, row))
        inferred_ref = {'kind': 'inferred', 'triangle': 19, 'patch_triangle': 2}
        surface.road.layer_refs.append(inferred_ref)
        surface.road_index.triangles = np.concatenate((surface.road_index.triangles, triangle[None]))
        row = {**proof, 'source': 'inferred-ground-road', 'triangle': 19, 'layer_ref': inferred_ref}
        self.assertIsNotNone(source3.same_native_triangle(surface, row, row))

    def test_actual_region_validator_accepts_literal_native_triangle_after_overlapping_entries(self):
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

    def test_unique_inventory_refuses_conflicting_duplicate(self):
        r = {'path': 'data/source/a', 'bytes': 1, 'sha256': 'a'*64}
        self.assertEqual(source3.unique_records([r, r.copy()]), [r])
        with self.assertRaisesRegex(ValueError, 'conflicting'):
            source3.unique_records([r, {**r, 'sha256': 'b'*64}])

    def fixture(self):
        parent = {'derived_terrain': {'triangles': 3}, 'terrain_source_triangle_indices': [5, 8, 13]}
        ledger = {'schema_version': 1, 'coordinate_model': source3.COORDINATE_MODEL,
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
        samples, details = source3.changed_road_samples(roads, refs, mappings, source3.NativeTriangleIndex(roads), terrain)
        self.assertEqual(len(samples), 1)
        self.assertEqual(samples[0]['expected']['source_triangle_index'], 9)
        self.assertEqual(samples[0]['expected']['layer_ref']['triangle'], 3)
        self.assertEqual(samples[0]['expected']['source_path'], mappings[0]['source_path'])
        self.assertEqual(details[0]['status'], 'sampled')
        tied = source3.NativeTriangleIndex(roads.copy())
        samples, details = source3.changed_road_samples(roads, refs, mappings, source3.NativeTriangleIndex(roads), tied)
        self.assertEqual(samples, [])
        self.assertEqual(details[0]['status'], 'actor-tie-omitted')
        higher = roads.copy(); higher[:, :, 2] += .01
        with self.assertRaisesRegex(ValueError, 'buried'):
            source3.changed_road_samples(roads, refs, mappings, source3.NativeTriangleIndex(roads), source3.NativeTriangleIndex(higher))

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
        # Reproduce the original false-positive instrument: either winding
        # receives a positive normal_up_z from the support query.
        for rows in (positive, reversed_indices):
            hit = source3.NativeTriangleIndex(rows[None, :, :3]).hits(.25, .25)[0]
            self.assertEqual(hit['normal_up_z'], 1)
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
    def reader_fixture(self):
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
                parent = {**inherited, 'schema_version': 2, 'derived_terrain': old_terrain, 'terrain_source_triangle_indices': [7],
                    'native_roads': [{'source': raw_road, 'source_path': raw_road['path'], 'actor_label': 'City_road', 'triangles': 1}]}
                parent_record = write_json('data/prepared/surface/parent/support-surface-manifest.json', parent)
                bank = [{'source': 0, 'mesh': 0, 'primitive': 0, 'vertex': i, 'raw_enu_m': road_rows[i, :3].tolist()} for i in range(3)]
                vertex_anchors = [{'kind': 'source-road-native-stitch', 'patch_triangle': 0, 'vertex': i,
                    'original_native_cm': source3.native_centimetres(road_rows[i, :3]).tolist(),
                    'replacement_native_cm': source3.native_centimetres(road_rows[i, :3]).tolist(),
                    'source_anchor': {'kind': 'source-road-plane-interpolation', 'source': 0, 'mesh': 0, 'primitive': 0, 'triangle': 0,
                        'barycentric': np.eye(3)[i].tolist()}} for i in range(3)]
                ledger = {'schema_version': 1, 'coordinate_model': source3.COORDINATE_MODEL, 'output_order': source3.OUTPUT_ORDER,
                    'parent_support_surface': parent_record, 'parent_derived_terrain': old_terrain, 'terrain_patch': patch,
                    'deleted_parent_triangles': [0], 'terrain_edits': [{'parent_triangle': 0, 'region_id': 'gap'}],
                    'regions': [{'id': 'gap', 'native_xy_polygons_cm': [[[-100, -100], [400, -100], [-100, 400]]]}],
                    'patch_faces': [{'patch_triangle': 0, 'kind': 'inferred-ground-road', 'region_id': 'gap', 'anchors': copy.deepcopy(bank)}],
                    'road_overrides': [{'source': 0, 'mesh': 0, 'primitive': 0, 'triangle': 0, 'region_id': 'gap', 'source_record': raw_road,
                        'replacement': patch, 'replacement_patch_triangles': [0], 'anchors': copy.deepcopy(bank), 'replacement_vertex_anchors': vertex_anchors}],
                    'recipe': {'algorithm': snapshot, 'source_inputs': [], 'candidate_inputs': []}}
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
            valid['road_overrides'][0]['replacement_vertex_anchors'][0]['replacement_native_cm'] = source3.native_centimetres(moved[0, 0]).tolist()
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
            bad['road_overrides'][0]['replacement_vertex_anchors'][0]['replacement_native_cm'] = source3.native_centimetres(far[0, 0]).tolist()
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
            ledger['road_overrides'][0]['replacement_vertex_anchors'][0]['replacement_native_cm'] = source3.native_centimetres(roads[0, 0]).tolist()
            ledger['patch_faces'][0]['vertex_edits'] = [{'vertex': 0, 'kind': 'source-road-native-stitch',
                'original_native_cm': source3.native_centimetres(f.rows[0, :3]).tolist(),
                'replacement_native_cm': source3.native_centimetres(output[0, 0]).tolist(),
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
        with self.reader_fixture() as f:
            surface = f.read()
            self.assertTrue(surface.source3_admission['changed_face_coverage'])
            self.assertEqual(surface.check([.2, .2], 'pedestrian')[1]['source'], 'derived-ground-road')
            for name, mutate, message in (
                ('inferred anchor', lambda ledger: ledger['patch_faces'][0]['anchors'][0].update(raw_enu_m=[10, 0, .1]), 'raw road anchor XYZ'),
                ('road lineage', lambda ledger: ledger['road_overrides'][0]['replacement_vertex_anchors'][0].update(original_native_cm=[1000, 0, 10]), 'original_native_cm'),
                ('declared region', lambda ledger: ledger['regions'][0].update(native_xy_polygons_cm=[[[0, 0], [50, 0], [0, 50]]]), 'outside declared region')):
                bad = copy.deepcopy(f.ledger); mutate(bad)
                with self.subTest(name=name), self.assertRaisesRegex(ValueError, message): f.read(bad)

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


if __name__ == '__main__': unittest.main()
