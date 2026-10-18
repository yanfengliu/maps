"""Declared local edits of an admitted Source2 parent, not a new terrain survey.

The sole consumed terrain is the complete derived GLB. Parent geometry is read
only for producer reconciliation; inferred faces never acquire GSI provenance.
This module uses the normal surface_network entry point and its confined I/O.
"""
from __future__ import annotations

import bisect
import collections
import copy
import json
import math
import pathlib
import tempfile
import time
from fractions import Fraction

import numpy as np
import support_surface as geometry
import support_reconstruction as reconstruction

COORDINATE_MODEL = 'native-esu-float32-centimetres-v2'
OUTPUT_ORDER = 'parent-triangles-minus-deletions-then-patch-faces'
MAX_NATIVE_STITCH_CM = .1


def native_centimetres(points):
    """Source ENU working operands, quantized equivalently to inverse ESU packing.

    This internal representation is retained for Source1/2 diagnostics and exact
    source predicates. Serialized native ledger values are ESU and are decoded
    explicitly at their admission boundary; this helper is not native output.
    """
    return (np.asarray(points, dtype=np.float64) * 100).astype(np.float32).astype(np.float64)


def native_metres(points):
    """Physical ENU working metres after the native float32-cm quantization."""
    return native_centimetres(points) / 100


def same_native_triangle(surface, previous, current, *, resolve_index=False):
    """Resolve two in-process witnesses to one actual admitted consumed face."""
    if surface is None or previous is None or current is None: return None
    if surface.support_manifest.get('schema_version') != 3: return None
    ref = previous.get('layer_ref')
    if not isinstance(ref, dict) or ref != current.get('layer_ref'): return None
    provider = {'road': 'PLATEAU-road', 'derived-road': 'derived-ground-road',
                'inferred': 'inferred-ground-road', 'terrain': 'GSI-DEM5A', 'terrain-fragment': 'GSI-DEM5A'}.get(ref.get('kind'))
    expected = {'source': provider, 'support_geometry': 'exact-derived-triangle-native-cm',
                'support_surface_sha256': surface.support_record['sha256'],
                'derived_terrain_sha256': surface.derived_record['sha256']}
    if provider is None or any(row.get(key) != value for row in (previous, current) for key, value in expected.items()): return None
    flat = previous.get('triangle')
    if type(flat) is not int or type(current.get('triangle')) is not int or flat < 0 or current.get('triangle') != flat: return None
    kind = ref['kind']
    if kind in ('road', 'derived-road'):
        source = ref.get('source')
        mappings = surface.support_manifest['native_roads']
        if type(source) is not int or not 0 <= source < len(mappings): return None
        mapping = mappings[source]
        if flat != ref.get('source_triangle_index') or flat >= mapping['triangles']: return None
        if any(row.get('support_road_sha256') != mapping['source']['sha256'] for row in (previous, current)): return None
        index = sum(row['triangles'] for row in mappings[:source]) + flat
    elif kind == 'inferred':
        first = sum(row['triangles'] for row in surface.support_manifest['native_roads'])
        index = bisect.bisect_left(surface.road.layer_refs, flat, lo=first, key=lambda row: row['triangle'])
    else:
        refs = surface.source3_terrain_refs
        index = bisect.bisect_left(refs, flat, key=lambda row: row['triangle'])
        if index >= len(refs) or refs[index] != ref or ref.get('triangle') != flat: return None
        membership = getattr(surface.terrain_index, 'physical_membership', None)
        if membership is None or membership[index] != 1: return None
        return (surface.terrain_index,index) if resolve_index else surface.terrain_index.triangles[index]
    if index >= len(surface.road.layer_refs) or surface.road.layer_refs[index] != ref: return None
    if kind == 'inferred' and ref.get('triangle') != flat: return None
    membership = getattr(surface.road_index, 'physical_membership', None)
    if membership is None or membership[index] != 1: return None
    return (surface.road_index,index) if resolve_index else surface.road_index.triangles[index]


def exact_native_span_grade(triangle, previous, current, maximum):
    """Directional plane delta without subtracting rounded absolute heights."""
    a, b, c = [[Fraction(float(value))/100 for value in vertex] for vertex in native_centimetres(triangle)]
    u, v = [y-x for x, y in zip(a, b)], [y-x for x, y in zip(a, c)]
    determinant = u[0]*v[1]-u[1]*v[0]
    if not determinant: return None
    dx, dy = [Fraction(float(y))-Fraction(float(x)) for x, y in zip(previous[:2], current[:2])]
    dz = ((u[2]*v[1]-v[2]*u[1])*dx + (u[0]*v[2]-v[0]*u[2])*dy)/determinant
    distance2 = dx*dx+dy*dy
    if dz*dz <= Fraction(float(maximum))**2 * distance2:
        return math.sqrt(float(dz*dz/distance2))
    return None


def _selected_native_span_height(surface, record, point):
    from surface_network import _source3_selector_plane
    resolved = same_native_triangle(surface,record,record,resolve_index=True)
    if resolved is None: return None
    index,ordinal = resolved
    native = getattr(index,'native_triangles_cm',None)
    if not isinstance(native,np.ndarray) or native.dtype != np.float32 or native.ndim != 3 or native.shape[1:] != (3,3) or not 0 <= ordinal < len(native): return None
    points = native[ordinal].astype(np.float64)[[0,2,1]] * np.array([1.,-1.,1.])
    if not np.isfinite(points).all(): return None
    plane = _source3_selector_plane(points)
    # This is the actual binary64-cm query, not an unrounded metre delta.
    x,y = [Fraction(float(v)*100) for v in point[:2]]
    return (plane[0]*x+plane[1]*y+plane[2])/100


def span_grade(previous, current, maximum, *, surface=None, previous_record=None, current_record=None):
    distance = math.dist(previous[:2], current[:2])
    height = abs(current[2]-previous[2])
    if distance == 0:
        if height: raise ValueError('Source3 zero-length span has unequal support heights')
        return 0.
    grade = height/distance
    if surface is not None and surface.support_manifest.get('schema_version') == 3:
        left = _selected_native_span_height(surface,previous_record,previous)
        right = _selected_native_span_height(surface,current_record,current)
        if left is None or right is None:
            if grade > maximum:
                raise ValueError(f'Source3 span grade {grade} exceeds {maximum} across {distance} m; selected native face authority is unavailable')
            raise ValueError('Source3 span requires both selected native faces with matching generation/ref/digest/cook authority')
        # Source distance remains the original binary64 metre span. Each exact
        # height instead belongs to its own selected face and rounded cm query.
        delta = right-left
        dx,dy = [Fraction(float(y))-Fraction(float(x)) for x,y in zip(previous[:2],current[:2])]
        distance2 = dx*dx+dy*dy
        try: grade = math.sqrt(float(delta*delta/distance2))
        except OverflowError: grade = math.inf  # An exact over-limit span still refuses below.
        if delta*delta > Fraction(float(maximum))**2*distance2:
            raise ValueError(f'Source3 span grade {grade} exceeds {maximum} across {distance} m')
        return grade
    if grade > maximum:
        raise ValueError(f'Source3 span grade {grade} exceeds {maximum} across {distance} m')
    return grade



class NativeTriangleIndex(geometry.TriangleIndex):
    """Use already-bound integration precision code; retain existing edge traversal."""
    def __init__(self, triangles, cell_m=12, *, query_role='physical'):
        from surface_network import native_query_initialize
        native_query_initialize(self, triangles, cell_m, query_role=query_role)

    def raw_candidates(self, lo, hi):
        from surface_network import native_query_raw_candidates
        return native_query_raw_candidates(self, lo, hi)

    def physical_candidates(self, lo, hi):
        from surface_network import native_query_physical_candidates
        return native_query_physical_candidates(self, lo, hi)

    def candidates(self, lo, hi):
        from surface_network import native_query_candidates
        return native_query_candidates(self, lo, hi)

    def hits(self, east, north):
        from surface_network import native_query_hits
        return native_query_hits(self, east, north)

    def segment_breakpoints(self, start, end):
        start, end = np.asarray(start), np.asarray(end)
        direction = end-start
        length2 = float(direction@direction)
        if length2 == 0: return []
        ids = self.candidates(np.minimum(start, end), np.maximum(start, end))
        tri = self.triangles[ids, :, :2]
        a = tri.reshape(-1, 2)
        edge = tri[:, [1, 2, 0], :].reshape(-1, 2)-a
        delta = a-start
        denominator = direction[0]*edge[:, 1]-direction[1]*edge[:, 0]
        nonparallel = denominator != 0
        t = np.divide(delta[:, 0]*edge[:, 1]-delta[:, 1]*edge[:, 0], denominator, out=np.full(len(a), np.nan), where=nonparallel)
        u = np.divide(delta[:, 0]*direction[1]-delta[:, 1]*direction[0], denominator, out=np.full(len(a), np.nan), where=nonparallel)
        parameters = t[nonparallel & (t > 0) & (t < 1) & (u >= 0) & (u <= 1)].tolist()
        collinear = (~nonparallel) & (delta[:, 0]*direction[1]-delta[:, 1]*direction[0] == 0)
        parameters += [float((row-start)@direction/length2) for row in a[collinear]
                       if 0 < float((row-start)@direction/length2) < 1]
        if len(parameters) > 100000: raise ValueError('Source3 segment crosses more than 100000 native triangle edges')
        return parameters


def integer(value, name, maximum):
    if type(value) is not int or not 0 <= value < maximum:
        raise ValueError(f'{name} must be an integer in [0,{maximum}): {value!r}')
    return value


def record(api, value, name, limit=64 * 1024 * 1024):
    api.support_topology.typed_record(value, name, limit, True)
    return api.admitted_record(value, api.ROOT/'data', limit)


def primitives(api, payload):
    doc, binary = api.city.read_glb(payload)
    if any(set(node)-{'mesh', 'name'} for node in doc.get('nodes', [])):
        raise ValueError('Source3 requires baked GLB geometry without transforms')
    rows = []
    for mesh_id, mesh in enumerate(doc['meshes']):
        for primitive_id, primitive in enumerate(mesh['primitives']):
            if primitive.get('mode', 4) != 4:
                raise ValueError('Source3 requires triangle primitives')
            attrs = {key: api.accessor(doc, binary, primitive['attributes'][key])
                     for key in ('POSITION', 'TEXCOORD_0', 'NORMAL')}
            faces = api.accessor(doc, binary, primitive['indices']).reshape(-1, 3)
            if not len(faces) or any(not np.all(np.isfinite(a)) for a in attrs.values()):
                raise ValueError('Source3 mesh requires nonempty finite geometry and UVs')
            if np.any(faces >= len(attrs['POSITION'])):
                raise ValueError('Source3 mesh indices exceed its vertex accessor')
            rows.append((mesh_id, primitive_id, attrs, faces))
    return doc, rows


def triangle_rows(parts):
    return np.concatenate([np.concatenate((a['POSITION'][:, [0, 2, 1]], a['TEXCOORD_0'], a['NORMAL']), axis=1)[f]
                           for _, _, a, f in parts])


def require_equal(actual, expected, name):
    if actual != expected:
        raise ValueError(f'Source3 {name} differs from the admitted parent or edit input')


def recipe_records(ledger):
    values = [ledger['parent_support_surface'], ledger['parent_derived_terrain'], ledger['terrain_patch']]
    values += [row['replacement'] for row in ledger.get('road_overrides', [])]
    if 'reconstruction' in ledger:
        values += ledger['reconstruction']['original_query_artifacts']
        anchors = [a for f in ledger['patch_faces'] for a in f.get('corner_ancestry', [])]
        anchors += [a for e in ledger.get('road_overrides', []) for f in e.get('replacement_source_ancestry', []) for a in f['corner_ancestry']]
        values += [r for a in anchors for r in [a['source_record'], *([a['immutable_raw_geometry_record']] if 'immutable_raw_geometry_record' in a else [])]]
    values += [ledger['recipe']['algorithm'], *ledger['recipe']['source_inputs'], *ledger['recipe']['candidate_inputs']]
    return unique_records(values)


def unique_records(values):
    result = {}
    for value in values:
        prior = result.setdefault(value['path'], value)
        if prior != value: raise ValueError(f"Source3 conflicting records for {value['path']}")
    return list(result.values())



def require_frame(value, label):
    # Local import avoids a module initialization cycle with surface_network.
    import surface_network as api
    api.require_native_frame(value, 'Source3 '+label)


def ledger_native_cm(points, framed):
    """Encode already packed source working cm without another rounding step."""
    values = np.asarray(points, dtype=np.float64)
    return values * np.array([1., -1., 1.]) if framed else values


def layout(ledger, parent, patch_count):
    """Classify every output face and every removal; never infer missing labels."""
    require_frame(ledger, 'edit ledger')
    require_frame(parent, 'current parent')
    require_equal(ledger.get('schema_version'), 1, 'edit schema')
    require_equal(ledger.get('coordinate_model'), COORDINATE_MODEL, 'coordinate model')
    require_equal(ledger.get('output_order'), OUTPUT_ORDER, 'output order')
    require_equal(ledger['parent_derived_terrain'], parent['derived_terrain'], 'parent mesh record')
    count = parent['derived_terrain']['triangles']
    deleted = ledger['deleted_parent_triangles']
    if not isinstance(deleted, list) or any(type(i) is not int or not 0 <= i < count for i in deleted) or deleted != sorted(set(deleted)):
        raise ValueError('Source3 deletions must be sorted unique parent triangle IDs')
    regions = ledger['regions']
    region_ids = [r['id'] for r in regions]
    if any(not isinstance(i, str) or not i for i in region_ids) or len(set(region_ids)) != len(region_ids):
        raise ValueError('Source3 regions require unique nonempty IDs')
    for region in regions:
        for polygon in region['native_xy_polygons_cm']:
            xy = np.asarray(polygon, dtype=float)
            if xy.ndim != 2 or xy.shape[1] != 2 or len(xy) < 3 or not np.isfinite(xy).all():
                raise ValueError(f"Source3 region {region['id']} requires finite native XY polygons")
    edits = ledger['terrain_edits']
    if sorted(e['parent_triangle'] for e in edits) != deleted or any(e['region_id'] not in region_ids for e in edits):
        raise ValueError('Source3 every deleted/replaced parent requires exactly one declared region')
    patch = ledger['patch_faces']
    if len(patch) != patch_count or [r['patch_triangle'] for r in patch] != list(range(patch_count)):
        raise ValueError('Source3 patch labels must cover flattened GLB triangles exactly in order')
    if 'reconstruction' in ledger:
        reconstruction.require_policy(ledger)
        if any(f['kind'] not in ('retained-parent-fragment', reconstruction.KIND) for f in patch) and not ledger['reconstruction'].get('legacy_baseline'):
            raise ValueError('Source3 reconstruction cannot waive the old inferred-road contract without an authenticated legacy prefix')
    for face in patch:
        if face['region_id'] not in region_ids:
            raise ValueError('Source3 patch face names an undeclared region')
        if face['kind'] == 'retained-parent-fragment':
            if face.get('reconstruction_fragment'): reconstruction.check_anchors(face.get('corner_ancestry'))
            p = integer(face['parent_triangle'], 'fragment.parent_triangle', count)
            if p not in deleted or face['original_terrain_parent'] != parent['terrain_source_triangle_indices'][p]:
                raise ValueError('Source3 fragment must replace its declared parent and retain original terrain lineage')
        elif face['kind'] == reconstruction.KIND:
            reconstruction.require_policy(ledger)
            reconstruction.check_label(face)
        elif face['kind'] == 'inferred-ground-road':
            if 'parent_triangle' in face or 'original_terrain_parent' in face or not face.get('anchors'):
                raise ValueError('Source3 inferred face requires source anchors, never original-terrain lineage')
        else:
            raise ValueError(f"Source3 unrecognized patch classification: {face['kind']!r}")
    mask = np.ones(count, dtype=bool)
    mask[deleted] = False
    retained = np.flatnonzero(mask)
    return retained, patch


def barycentric(triangle, xy):
    a, b, c = triangle[:, :2]
    u, v = np.linalg.solve(np.stack((b-a, c-a), axis=1), np.asarray(xy)-a)
    return np.array([1-u-v, u, v])


def source_interpolation(anchor, source, label):
    """Interpolate the original native face, then pack the original point once."""
    weights = np.asarray(anchor['barycentric'], dtype=np.float64)
    if weights.shape != (3,) or not np.isfinite(weights).all() or np.any(weights < 0) or np.any(weights > 1) or abs(sum(weights)-1) > 1e-12:
        raise ValueError(f'Source3 {label} barycentrics must lie on the declared source face')
    original = weights @ native_centimetres(source)
    return original.astype(np.float32).astype(np.float64), weights, original


def check_native_stitch(edit, original_cm, replacement_cm, label, *, framed=False):
    for field, expected in (('original_native_cm', ledger_native_cm(original_cm, framed)), ('replacement_native_cm', ledger_native_cm(replacement_cm, framed))):
        declared = np.asarray(edit[field], dtype=np.float64)
        if declared.shape != (3,) or not np.isfinite(declared).all() or not np.array_equal(declared, expected):
            raise ValueError(f'Source3 {label} {field} disagrees with actual native geometry')
    displacement = float(np.linalg.norm(replacement_cm-original_cm))
    if displacement > MAX_NATIVE_STITCH_CM:
        raise ValueError(f'Source3 {label} native stitch {displacement/100} m exceeds 0.001 m')


def check_fragment(face, packed, parent, *, framed=False):
    """Every moved clipping vertex is explicit; interpolation is independently checked."""
    edits = face['vertex_edits']
    ids = [r['vertex'] for r in edits]
    if len(set(ids)) != len(ids) or any(type(i) is not int or not 0 <= i < 3 for i in ids):
        raise ValueError('Source3 fragment interpolation records require unique vertex IDs')
    actual_cm = native_centimetres(packed[:, :3])
    parent_cm = native_centimetres(parent[:, :3])
    plane_error = uv_error = 0.
    for i in set(range(3))-set(ids):
        matches = [j for j in range(3) if np.array_equal(actual_cm[i], parent_cm[j])]
        if not matches or not any(np.array_equal(packed[i, 3:], parent[j, 3:]) for j in matches):
            raise ValueError('Source3 fragment changed an unledgered parent vertex')
    for edit in edits:
        i = edit['vertex']
        anchor = edit['source_anchor']
        if anchor.get('kind') != 'parent-edge-or-plane-interpolation' or anchor['parent_triangle'] != face['parent_triangle']:
            raise ValueError('Source3 fragment vertex has the wrong parent interpolation anchor')
        original_cm, weights, original = source_interpolation(anchor, parent[:, :3], 'fragment')
        check_native_stitch(edit, original_cm, actual_cm[i], 'fragment', framed=framed)
        plane_error = max(plane_error, abs(float(actual_cm[i, 2]-original[2]))/100)
        original = weights @ parent
        uv_error = max(uv_error, float(np.max(abs(packed[i, 3:5]-original[3:5]))))
    for field, measured in (('maximum_plane_error_m', plane_error), ('maximum_uv_error', uv_error)):
        declared = face[field]
        if type(declared) not in (int, float) or not math.isfinite(declared) or declared < 0 or measured > declared + 1e-12:
            raise ValueError(f'Source3 fragment {field} understates measured error {measured}')


def admit_new_face_winding(rows, label, *, parent=None, inferred=False):
    """Check actual packed GLB and native-cm faces, never UP-flipped query normals.

    Rows store ENU positions but GLB NORMAL attributes. X/Z/Y swaps handedness,
    so compare in GLB axes, including after the native float32-cm conversion.
    Only new faces enter this check; unchanged parent exclusions stay unchanged.
    """
    rows = np.asarray(rows, dtype=np.float64)
    if rows.shape != (3, 8) or not np.isfinite(rows).all():
        raise ValueError(f'Source3 new face {label} requires three finite packed attribute rows')
    glb = rows[:, [0, 2, 1]]
    normals = rows[:, 5:8]
    if np.any(np.linalg.norm(normals, axis=1) == 0):
        raise ValueError(f'Source3 new face {label} has a zero NORMAL attribute')
    native_glb_cm = (glb*100).astype(np.float32).astype(np.float64)
    reference = None if parent is None else np.asarray(parent, dtype=np.float64)[:, [0, 2, 1]]
    for model, points in (('packed-GLB', glb), ('native-float32-cm', native_glb_cm)):
        normal = np.cross(points[1]-points[0], points[2]-points[0])
        if not np.isfinite(points).all() or not np.isfinite(normal).all() or not np.any(normal) or normal[1] == 0:
            raise ValueError(f'Source3 new face {label} is degenerate in {model}')
        if np.any(normals@normal <= 0):
            raise ValueError(f'Source3 new face {label} winding disagrees with NORMAL attributes in {model}')
        if inferred and (normal[1] <= 0 or np.any(normals[:, 1] <= 0)):
            raise ValueError(f'Source3 inferred face {label} must face GLB up in {model}')
        if reference is not None:
            source = reference if model == 'packed-GLB' else (reference*100).astype(np.float32).astype(np.float64)
            expected = np.cross(source[1]-source[0], source[2]-source[0])
            if not np.isfinite(expected).all() or not np.any(expected) or float(normal@expected) <= 0:
                raise ValueError(f'Source3 new face {label} reverses or loses its source face orientation in {model}')


    native = (rows[[0, 2, 1], :3] * np.array([100., -100., 100.])).astype(np.float32).astype(np.float64)
    physical = -np.cross(native[1]-native[0], native[2]-native[0])
    expected = normals[:, [0, 2, 1]] * np.array([1., -1., 1.])
    if not np.isfinite(native).all() or not np.any(physical) or np.any(expected@physical <= 0):
        raise ValueError(f'Source3 new face {label} loses signed physical orientation across the final ESU corner021 boundary')


def assemble_terrain(api, ledger, parent):
    parent_doc, parent_parts = primitives(api, record(api, parent['derived_terrain'], 'parent mesh'))
    if len(parent_parts) != 1:
        raise ValueError('Source3 parent requires one complete terrain primitive')
    _, patch_parts = primitives(api, record(api, ledger['terrain_patch'], 'terrain patch'))
    patch_rows = triangle_rows(patch_parts)
    retained, labels = layout(ledger, parent, len(patch_rows))
    parent_rows = triangle_rows(parent_parts)
    if len(parent_rows) != parent['derived_terrain']['triangles']:
        raise ValueError('Source3 parent triangle count differs from its record')
    for face, rows in zip(labels, patch_rows):
        source = parent_rows[face['parent_triangle']] if face['kind'] == 'retained-parent-fragment' else None
        if face['kind'] == reconstruction.KIND or face.get('reconstruction_fragment'):
            # Staging reports actual packed states; no role masks or global UP veto.
            # Parent fragments keep their independent interpolation/stitch checks.
            reconstruction.face_state(api, rows)
        else:
            admit_new_face_winding(rows, f"terrain patch {face['patch_triangle']}", parent=source,
                                   inferred=face['kind'] == 'inferred-ground-road')
        if face['kind'] == 'retained-parent-fragment':
            check_fragment(face, rows, parent_rows[face['parent_triangle']], framed=True)
    _, _, attrs, faces = parent_parts[0]
    # Keep all parent attribute bytes; only the declared face-index list changes.
    # Avoid a full-city unique/sort/reconstruction for a local edit.
    values = {'POSITION': patch_rows[:, :, [0, 2, 1]].reshape(-1, 3),
              'TEXCOORD_0': patch_rows[:, :, 3:5].reshape(-1, 2),
              'NORMAL': patch_rows[:, :, 5:8].reshape(-1, 3)}
    result = {key: np.concatenate((value, values[key])).astype('<f4') for key, value in attrs.items()}
    indices = np.concatenate((faces[retained], np.arange(len(patch_rows)*3).reshape(-1, 3)+len(attrs['POSITION'])))
    return parent_doc, result, indices, retained, labels


def write_mesh(api, stage, name, attrs, indices, materials):
    writer = api.city.GlbWriter()
    writer.doc['materials'] = copy.deepcopy(materials)
    writer.primitive(attrs, indices, name='Declared source-derived support')
    output = api.save_glb(writer, stage/name, limit_bytes=api.DERIVED_TERRAIN_LIMIT_BYTES)
    result = {'path': output['path'], 'bytes': output['size'], 'sha256': output['sha256'],
              'triangles': len(indices), 'vertices': len(attrs['POSITION']),
              'bounds_glb_m': [attrs['POSITION'].min(axis=0).tolist(), attrs['POSITION'].max(axis=0).tolist()]}
    _, actual_parts = primitives(api, record(api, result, name))
    _, _, actual_attrs, actual_indices = actual_parts[0]
    if len(actual_parts) != 1 or not np.array_equal(actual_indices, indices) or any(not np.array_equal(actual_attrs[k], v) for k, v in attrs.items()):
        raise ValueError('Source3 writer readback changed declared positions/UVs/normals/indices')
    return result


def road_key(row):
    return tuple(row[key] for key in ('source', 'mesh', 'primitive', 'triangle'))


def apply_road_overrides(api, parent, ledger, stage=None):
    """Full replacement per affected existing actor; raw roads remain references."""
    grouped = collections.defaultdict(list)
    seen = set()
    for override in ledger.get('road_overrides', []):
        key = road_key(override)
        if any(type(i) is not int or i < 0 for i in key) or key in seen or not override.get('anchors'):
            raise ValueError('Source3 road override requires unique source face and explicit source-bank anchors')
        seen.add(key)
        grouped[key[0]].append(override)
    native_roads = copy.deepcopy(parent['native_roads'])
    outputs = []
    triangles, refs = [], []
    for source, mapping in enumerate(native_roads):
        original = mapping['source']
        doc, parts = primitives(api, record(api, original, 'photographic road'))
        writer = api.city.GlbWriter()
        writer.doc['materials'] = copy.deepcopy(doc['materials'])
        writer.doc['nodes'] = copy.deepcopy(doc['nodes'])
        writer.doc['scenes'] = copy.deepcopy(doc['scenes'])
        writer.doc['scene'] = doc.get('scene', 0)
        writer.doc['meshes'] = copy.deepcopy(doc['meshes'])
        matched = set()
        face_map = []
        expected_rows = []
        for mesh, primitive, attrs, indices in parts:
            edits = [r for r in grouped[source] if (r['mesh'], r['primitive']) == (mesh, primitive)]
            removed = {integer(r['triangle'], 'road override triangle', len(indices)) for r in edits}
            keep = [i for i in range(len(indices)) if i not in removed]
            new_indices = [indices[keep]]
            new_attrs = {k: [v] for k, v in attrs.items()}
            vertex_count = len(attrs['POSITION'])
            origins = [{'kind': 'road', 'source': source, 'mesh': mesh, 'primitive': primitive, 'original_triangle': i} for i in keep]
            for edit in edits:
                matched.add(road_key(edit))
                _, replacement = primitives(api, record(api, edit['replacement'], 'road replacement'))
                rows = triangle_rows(replacement)
                selected = edit['replacement_patch_triangles']
                if (not selected and not (edit.get('reconstruction_trim') is True and 'reconstruction' in ledger)) or len(set(selected)) != len(selected):
                    raise ValueError('Source3 road replacement requires unique explicit replacement triangle IDs')
                selected = [integer(i, 'replacement triangle', len(rows)) for i in selected]
                rows = rows[selected]
                source_face = np.concatenate((attrs['POSITION'][:, [0, 2, 1]], attrs['TEXCOORD_0'], attrs['NORMAL']), axis=1)[indices[edit['triangle']]]
                for triangle_id, triangle in zip(selected, rows):
                    if edit.get('reconstruction_trim') is True and 'reconstruction' in ledger:
                        reconstruction.face_state(api, triangle)
                    else:
                        admit_new_face_winding(triangle, f'road {source}/{mesh}/{primitive} replacement {triangle_id}', parent=source_face)
                values = {'POSITION': rows[:, :, [0, 2, 1]].reshape(-1, 3), 'TEXCOORD_0': rows[:, :, 3:5].reshape(-1, 2), 'NORMAL': rows[:, :, 5:8].reshape(-1, 3)}
                for k in attrs: new_attrs[k].append(values[k])
                new_indices.append(np.arange(len(rows)*3).reshape(-1, 3)+vertex_count)
                vertex_count += len(rows)*3
                origins.extend({'kind': 'derived-road', 'source': source, 'mesh': mesh, 'primitive': primitive,
                                'original_triangle': edit['triangle'], 'region_id': edit['region_id'], 'patch_triangle': p} for p in selected)
            packed = {k: np.concatenate(v).astype('<f4') for k, v in new_attrs.items()}
            faces = np.concatenate(new_indices)
            expected_rows.append(np.concatenate((packed['POSITION'][:, [0, 2, 1]], packed['TEXCOORD_0'], packed['NORMAL']), axis=1)[faces])
            output_primitive = writer.doc['meshes'][mesh]['primitives'][primitive]
            output_primitive['attributes'] = {k: writer.accessor(v, 'VEC'+str(v.shape[1])) for k, v in packed.items()}
            output_primitive['indices'] = writer.accessor(faces.reshape(-1), 'SCALAR', True)
            triangles.extend(native_metres(packed['POSITION'][:, [0, 2, 1]])[faces])
            for actual_triangle, origin in enumerate(origins):
                face_map.append({**origin, 'triangle': actual_triangle, 'source_triangle_index': len(face_map)})
        if matched != {road_key(r) for r in grouped[source]}:
            raise ValueError('Source3 road override names a missing mesh/primitive')
        if grouped[source]:
            if stage is not None:
                out = api.save_glb(writer, stage/'roads'/pathlib.PurePosixPath(original['path']).name, limit_bytes=32_000_000)
                generated = {'path': out['path'], 'bytes': out['size'], 'sha256': out['sha256']}
                # Compare every emitted attribute/face, not merely the declared count.
                _, emitted = primitives(api, record(api, generated, 'derived road', 32_000_000))
                if len(emitted) != len(parts): raise ValueError('Source3 road writer changed primitive count')
                if not np.array_equal(triangle_rows(emitted), np.concatenate(expected_rows)):
                    raise ValueError('Source3 derived road readback changed geometry, normals or UVs')
            else:
                generated = next(r['record'] for r in parent['_source3_derived_roads'] if r['source'] == source)
                _, emitted = primitives(api, record(api, generated, 'derived road', 32_000_000))
                if not np.array_equal(triangle_rows(emitted), np.concatenate(expected_rows)):
                    raise ValueError('Source3 derived road differs from its explicit source edits')
            mapping.update(source=generated, source_path=generated['path'], triangles=len(face_map))
            outputs.append({'source': source, 'record': generated, 'face_map': face_map})
        refs.extend(face_map)
    if set(grouped)-set(range(len(native_roads))): raise ValueError('Source3 road override names an unknown source actor')
    return np.asarray(triangles), refs, native_roads, outputs


def initialize(surface, api, base, buildings, manifest, support_path, vehicle_source):
    require_frame(manifest, 'current support')
    parent_payload = record(api, manifest['parent_support_surface'], 'parent support', api.SUPPORT_MANIFEST_LIMIT_BYTES)
    parent = json.loads(parent_payload)
    require_frame(parent, 'current parent')
    if parent.get('schema_version') != 2:
        raise ValueError('Source3 requires an immutable admitted Source2 parent, not a recursive derived chain')
    if api.ROOT/manifest['parent_support_surface']['path'] == api.OUT/'support-surface-manifest.json':
        raise ValueError('Source3 parent must name an immutable generation, not the active manifest alias')
    probe = getattr(surface, 'network_diagnostic', None)
    if probe: probe.phase('source3-parent-surface')
    previous = api.Surface(base, buildings, vehicle_source=vehicle_source, support_path=api.ROOT/manifest['parent_support_surface']['path'],
                           **({'network_diagnostic': probe} if probe else {}))
    if probe: probe.phase('source3-assemble-and-admit')
    surface.__dict__.update(previous.__dict__)
    for key in ('frame', 'origin', 'vertical_reference', 'inputs', 'atlas', 'attribution'):
        require_equal(manifest[key], parent[key], key)
    require_equal(manifest['coordinate_model'], COORDINATE_MODEL, 'coordinate model')
    ledger = json.loads(record(api, manifest['surface_edits'], 'surface edits', api.SUPPORT_MANIFEST_LIMIT_BYTES))
    require_frame(ledger, 'edit ledger')
    require_equal(ledger['parent_support_surface'], manifest['parent_support_surface'], 'parent record')
    for r in recipe_records(ledger): record(api, r, 'edit input')
    _, attrs, indices, retained, labels = assemble_terrain(api, ledger, parent)
    _, actual = primitives(api, record(api, manifest['derived_terrain'], 'derived terrain'))
    if len(actual) != 1 or not np.array_equal(actual[0][3], indices) or any(not np.array_equal(actual[0][2][k], v) for k, v in attrs.items()):
        raise ValueError('Source3 complete terrain differs from exact parent plus explicit edits')
    parent['_source3_derived_roads'] = manifest.get('derived_roads', [])
    roads, refs, native_roads, outputs = apply_road_overrides(api, parent, ledger)
    require_equal(native_roads, manifest['native_roads'], 'native road mappings')
    require_equal(outputs, manifest.get('derived_roads', []), 'derived road lineage')
    triangles = native_metres(attrs['POSITION'][:, [0, 2, 1]])[indices]
    previous._source3_new_road_refs = refs
    if probe: probe.phase('source3-local-geometry-admission')
    if 'reconstruction' in ledger and (manifest.get('staged_reconstruction') is not True or support_path == api.OUT/'support-surface-manifest.json'):
        raise ValueError('Source3 reconstruction requires an explicit staged new-geometry generation; active publication is not admitted')
    surface.source3_admission = validate_local_geometry(api, ledger, previous, triangles, roads, retained, labels)
    if probe: probe.phase('source3-native-query-indices')
    provenance = [{'kind': 'terrain', 'triangle': i, 'parent_triangle': int(p), 'original_triangle': parent['terrain_source_triangle_indices'][p]}
                  for i, p in enumerate(retained)]
    provenance.extend({**f, 'kind': 'terrain-fragment' if f['kind'] == 'retained-parent-fragment' else 'inferred',
                       'triangle': len(retained)+i} for i, f in enumerate(labels))
    terrain_ids = [i for i, r in enumerate(provenance) if r['kind'] != 'inferred']
    inferred_ids = [i for i, r in enumerate(provenance) if r['kind'] == 'inferred']
    surface.terrain_index = NativeTriangleIndex(triangles[terrain_ids])
    surface.terrain_sources = [provenance[i].get('original_triangle', provenance[i].get('original_terrain_parent')) for i in terrain_ids]
    surface.source3_terrain_refs = [provenance[i] for i in terrain_ids]
    surface.road.triangles = np.concatenate((roads, triangles[inferred_ids]))
    surface.road.layer_refs = refs + [provenance[i] for i in inferred_ids]
    surface.road.sources = [r['source'] for r in native_roads]
    surface.road_index = NativeTriangleIndex(surface.road.triangles)
    surface.support_manifest = manifest
    surface.physical_model = api.native_physical_model_record()
    if manifest.get('physical_query_model', surface.physical_model) != surface.physical_model:
        raise api.NativeCollisionModelError('Source3 manifest declares an unknown physical query model')
    surface.support_record = api.source_record(support_path)
    surface.derived_record = manifest['derived_terrain']
    surface.source3_ledger = ledger
    if probe: probe.phase('source3-preservation-readback')
    preservation = json.loads(record(api, manifest['source_preservation'], 'source preservation', 32_000_000))
    if preservation.get('unchanged') is not True or preservation['inputs_before'] != preservation['inputs_after']:
        raise ValueError('Source3 generation input preservation is incomplete')
    for name in ('integration', 'topology', 'build_city', 'edits'):
        record(api, manifest['algorithm'][name], 'algorithm snapshot', 2_000_000)
    record(api, manifest['algorithm'], 'geometry snapshot', 2_000_000)
    for r in manifest['configuration_inputs'].values(): record(api, r, 'configuration snapshot', 100_000)
    require_equal(preservation['source3_writer'], manifest['algorithm']['edits'], 'writer snapshot')
    if 'reconstruction' in ledger:
        record(api, manifest['algorithm']['reconstruction'], 'reconstruction writer snapshot', 2_000_000)
        require_equal(preservation['reconstruction_writer'], manifest['algorithm']['reconstruction'], 'reconstruction writer snapshot')
    # Integration/algorithm snapshots are historical data. Actual data inputs
    # remain current and pinned; route-only code edits cannot relabel geometry.
    for r in preservation['inputs_before']:
        if r['path'].startswith('data/'):
            record(api, r, 'preserved source data')
    if probe: probe.phase('source3-initialization-complete')


def witness(surface, api, record_value, point, kind, interval):
    result = copy.deepcopy(record_value)
    if result['source'] == 'GSI-DEM5A':
        ref = surface.source3_terrain_refs[result['triangle']]
        result.update(layer_ref=ref, triangle=ref['triangle'])
    else:
        ref = result['layer_ref']
        if ref['kind'] in ('road', 'derived-road'):
            result['triangle'] = ref['source_triangle_index']
    role = ref.get('reconstruction_role')
    if role is not None:
        if role not in reconstruction.ROLES:
            raise ValueError('Source3 loaded reconstruction has an unknown authoring role')
        if role != 'support-top':
            raise api.SupportRejection('source3-ineligible-reconstruction-first-blocker',
                {'point':list(point), 'selected':copy.deepcopy(result), 'reconstruction_role':role,
                 'lower_hit_fallback':False})
    if ref['kind'] in ('inferred', 'derived-road'):
        if kind == 'vehicle':
            if not isinstance(interval, api.VehicleInterval) or not interval.covers(point):
                raise ValueError('derived-ground-road-requires-directed-source-interval')
            surface.vehicle_interval(interval.edges, interval.start, interval.end, interval.width)
            result['vehicle_source_interval'] = {'osm_sha256': api.CONFIG['osm']['sha256'], 'directed_edges': [list(k) for k in interval.edges],
                'points': [list(interval.start), list(interval.end)], 'width_m': interval.width}
        result['source'] = 'inferred-ground-road' if ref['kind'] == 'inferred' else 'derived-ground-road'
        result['triangle'] = ref['triangle'] if ref['kind'] == 'inferred' else ref['source_triangle_index']
    result['support_geometry'] = 'exact-derived-triangle-native-cm'
    result['derived_terrain_sha256'] = surface.derived_record['sha256']
    result['support_surface_sha256'] = surface.support_record['sha256']
    if 'source' in result['layer_ref']:
        mapping = surface.support_manifest['native_roads'][result['layer_ref']['source']]
        result['support_road_sha256'] = mapping['source']['sha256']
    return result


def frozen_vehicle_path(api, row, surface, *, supported_subspan=False):
    """Full original authority by default; explicit authenticated boundary trim."""
    if type(supported_subspan) is not bool:
        raise ValueError('Frozen supported_subspan must be an explicit boolean')
    edges = [{'way_id': r['way_id'], 'from': r['from_osm_node'], 'to': r['to_osm_node'], 'points': r['lane_points']}
             for r in row['source_lane_segments']]
    if not edges: raise ValueError('Frozen vehicle route requires actual directed source lane segments')
    points, contexts = api.vehicle_polyline(edges, closed=row['closed'])
    authorities = [surface.vehicle_interval(context, a, b, row['width_m'])
                   for (a, b), context in zip(zip(points, points[1:]), contexts)]
    # Walk in order; no nearest-segment oracle that could hide rerouting/backtracking.
    segment = 0
    previous_t = 0.
    for p in row['points']:
        while segment < len(points)-1:
            a, b = np.asarray(points[segment]), np.asarray(points[segment+1])
            delta = b-a
            length2 = float(delta@delta)
            t = 0. if length2 == 0 else float((np.asarray(p[:2])-a)@delta/length2)
            if -1e-8 <= t <= 1+1e-8 and t >= previous_t-1e-8 and np.linalg.norm(np.asarray(p[:2])-(a+t*delta)) <= 1e-5:
                previous_t = t
                break
            segment += 1
            previous_t = 0.
        else: raise ValueError('Frozen vehicle route XY differs from its current legal source traversal')
    trimmed = (math.dist(row['points'][0][:2], points[0]) > 1e-5 or
               math.dist(row['points'][-1][:2], points[-1]) > 1e-5)
    retained = [list(p) for p in points]
    if trimmed:
        flow = row.get('boundary_flow')
        if row['closed'] or not isinstance(flow, dict):
            raise ValueError('Frozen vehicle route omits source traversal endpoints without an open boundary flow')
        if not isinstance(getattr(surface, 'base', None), dict) or flow.get('crop_bounds') != surface.base['bounds']:
            raise ValueError('Frozen trimmed boundary needs its actual admitted crop')
        tree = api.osm_tree()
        nodes = {int(node.attrib['id']): node for node in tree.findall('node')}
        ways = surface.vehicle_source[1]
        for name, entry, index, authority in (('entry', True, 0, authorities[0]),
                                              ('exit', False, -1, authorities[-1])):
            endpoint = row['points'][index]
            declared = flow.get(name)
            if not isinstance(declared, dict) or declared.get('point') != endpoint:
                raise ValueError('Frozen trimmed boundary point differs from its literal route endpoint')
            piece = edges[index]
            actual, extension = api.boundary_source_geometry(piece, entry, endpoint, nodes,
                                                             ways[piece['way_id']], surface.base)
            if any(declared.get(key) != value for key, value in actual.items()):
                raise ValueError('Frozen trimmed boundary continuation/heading/crop differs from original OSM')
            footprint = declared.get('footprint', {})
            if footprint.get('length_m') != 4.4 or footprint.get('width_m') != 1.8 or footprint.get('verified') is not True:
                raise ValueError('Frozen trimmed boundary needs its complete admitted4.4x1.8m footprint')
            surface.vehicle_subspan(authority, *extension, 1.8)
            retained[index] = list(endpoint[:2])
        # Every original join inside this retained span remains mandatory, in
        # exact source order; clipping cannot silently discard a mapped turn.
        cursor = 0;previous = None
        for anchor in retained:
            if anchor == previous:continue
            previous = anchor
            while cursor < len(row['points']) and row['points'][cursor][:2] != anchor:cursor += 1
            if cursor == len(row['points']):
                raise ValueError('Frozen trimmed route omits or reorders a retained original join')
            cursor += 1
    if supported_subspan:
        return retained, authorities, edges
    return points, contexts, edges


def polygon_area(polygon):
    if len(polygon) < 3: return 0.
    p = np.asarray(polygon, dtype=float)
    q = p-p[0]
    return abs(float(np.sum(q[:, 0]*np.roll(q[:, 1], -1)-q[:, 1]*np.roll(q[:, 0], -1))))/2


def cut_polygon(polygon, a, b, inside):
    result = []
    def distance(p): return (b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0])
    for p, q in zip(polygon, polygon[1:]+polygon[:1]):
        u, v = distance(p), distance(q)
        pu, qv = (u >= 0, v >= 0) if inside else (u <= 0, v <= 0)
        if pu: result.append(p)
        if pu != qv: result.append((np.asarray(p)+(np.asarray(q)-p)*(u/(u-v))).tolist())
    return result


def rational_polygon(points):
    """Preserve native-cm geometry or declared cm metadata without rounding."""
    return [[value if isinstance(value, Fraction) else Fraction(float(value)) for value in point[:2]] for point in points]


def exact_polygon_area(polygon):
    if len(polygon) < 3: return Fraction(0)
    return abs(sum(a[0]*b[1]-a[1]*b[0] for a, b in zip(polygon, polygon[1:]+polygon[:1])))/2


def subtract(polygon, footprint, *, exact=False):
    """Local convex subtraction; no physical distance or small-area exemption."""
    if exact:
        polygon, footprint = rational_polygon(polygon), rational_polygon(footprint)
        a, b, c = footprint[:3]
        orientation = (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
        area = exact_polygon_area
        if not orientation: return [polygon] if area(polygon) else []
    else:
        footprint = np.asarray(footprint, dtype=float)[:, :2].tolist()
        a, b, c = np.asarray(footprint[:3])
        orientation = np.linalg.det(np.stack((b-a, c-a)))
        area = polygon_area
    if orientation < 0: footprint.reverse()
    overlap = polygon
    for a, b in zip(footprint, footprint[1:]+footprint[:1]):
        overlap = cut_polygon(overlap, a, b, True)
        if not area(overlap): return [polygon]
    remaining, current = [], polygon
    for a, b in zip(footprint, footprint[1:]+footprint[:1]):
        outside = cut_polygon(current, a, b, False)
        if area(outside): remaining.append(outside)
        current = cut_polygon(current, a, b, True)
        if not area(current): break
    return remaining


def uncovered_exact(polygon_cm, footprints_cm):
    """Exact union coverage in one common centimetre frame; no area waiver."""
    polygon = rational_polygon(polygon_cm)
    if not exact_polygon_area(polygon): return []
    remaining = [polygon]
    for footprint in footprints_cm:
        remaining = [piece for old in remaining for piece in subtract(old, footprint, exact=True)]
        if not remaining: break
    return remaining


def collision_plane(native_cm, label):
    """Exact plane and historical signed diagnostic normal in source working cm.

    Current ESU native buffers must be explicitly inverse-normalized to the raw
    source corner order before this internal predicate. This source calculation
    is not fresh native orientation evidence; new signed native rays are required.
    """
    points = np.asarray(native_cm, dtype=float)
    if points.shape != (3, 3) or not np.isfinite(points).all():
        raise ValueError(f'Source3 {label} requires three finite consumed native vertices')
    a, b, c = [[Fraction(float(v)) for v in row] for row in points]
    u, v = [y-x for x, y in zip(a, b)], [y-x for x, y in zip(a, c)]
    cross = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
    if not cross[2]: raise ValueError(f'Source3 {label} has a degenerate support plane')
    gx, gy = -cross[0]/cross[2], -cross[1]/cross[2]
    normal = [-value for value in cross]
    return (gx, gy, a[2]-gx*a[0]-gy*a[1]), normal


def measure_source_overlap(upper_cm, ground_cm, identity):
    """Exact complete intersection diagnostic, never support/contact acceptance."""
    for points in (upper_cm, ground_cm):
        points = np.asarray(points, dtype=float)
        if points.shape != (3, 3) or not np.isfinite(points).all():
            raise ValueError(f'Source3 overlap {identity} is missing finite consumed vertices')
    polygon, footprint = rational_polygon(upper_cm), rational_polygon(ground_cm)
    # Zero-area edge contacts do not qualify as positive-area overlaps and
    # contribute no coverage. Degenerate support planes cannot be qualified.
    upper, normal = collision_plane(upper_cm, 'upper overlap')
    ground, _ = collision_plane(ground_cm, 'reference ground')
    a, b, c = footprint
    if (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]) < 0: footprint.reverse()
    for a, b in zip(footprint, footprint[1:]+footprint[:1]): polygon = cut_polygon(polygon, a, b, True)
    area = exact_polygon_area(polygon)
    if not area: return None
    delta = tuple(a-b for a, b in zip(upper, ground))
    gaps = [delta[0]*p[0]+delta[1]*p[1]+delta[2] for p in polygon]
    positive = polygon
    gx, gy, offset = delta
    if gx or gy:
        if gy:
            a, b = [Fraction(0), -offset/gy], [Fraction(1), (-offset-gx)/gy]
            if gy < 0: a, b = b, a
        else:
            a, b = [-offset/gx, Fraction(0)], [-offset/gx, Fraction(1)]
            if gx > 0: a, b = b, a
        positive = cut_polygon(polygon, a, b, True)
    elif offset <= 0: positive = []
    norm_squared = sum(v*v for v in normal)
    return {'identity': identity, 'scope': 'SOURCE_OVERLAP_DIAGNOSTIC_NOT_SUPPORT_ADMISSION',
        'upper_native_cm': np.asarray(upper_cm).tolist(), 'ground_native_cm': np.asarray(ground_cm).tolist(),
        'intersection_native_cm_q': [[str(v) for v in p] for p in polygon],
        'intersection_area_cm2_q': str(area), 'minimum_gap_cm_q': str(min(gaps)), 'maximum_gap_cm_q': str(max(gaps)),
        'positive_height_polygon_native_cm_q': [[str(v) for v in p] for p in positive],
        'positive_height_area_cm2_q': str(exact_polygon_area(positive)),
        'upper_plane_q': list(map(str, upper)), 'ground_plane_q': list(map(str, ground)),
        'support_facing_normal_q': list(map(str, normal)), 'normal_squared_q': str(norm_squared)}


def validate_local_geometry(api, ledger, parent_surface, output_triangles, roads, retained, labels):
    """Actual changed-face coverage/anchors/occlusion, distinct from route/body acceptance."""
    if 'reconstruction' in ledger:
        return reconstruction.validate(api, __import__(__name__), ledger, labels, parent_surface=parent_surface)
    probe = getattr(parent_surface, 'network_diagnostic', None)
    raw_cache = dict(getattr(parent_surface.road, 'source_parts', {}))
    def source_part(anchor):
        source = integer(anchor['source'], 'anchor.source', len(parent_surface.road.sources))
        if source not in raw_cache:
            raw_cache[source] = primitives(api, record(api, parent_surface.road.sources[source], 'raw anchor road', 32_000_000))[1]
        part = next((p for p in raw_cache[source] if p[:2] == (anchor['mesh'], anchor['primitive'])), None)
        if part is None: raise ValueError('Source3 raw road anchor names a missing primitive')
        return part
    def anchor_point(anchor):
        part = source_part(anchor)
        raw = part[2]['POSITION'][integer(anchor['vertex'], 'anchor.vertex', len(part[2]['POSITION']))][[0, 2, 1]]
        if not np.array_equal(raw, anchor['raw_enu_m']): raise ValueError('Source3 raw road anchor XYZ differs from its immutable source')
        return native_metres(raw)
    framed = 'native_frame' in ledger
    if framed: require_frame(ledger, 'edit ledger')
    region_cm = {r['id']: [(np.asarray(p, dtype=float)*([1., -1.] if framed else [1., 1.])).tolist() for p in r['native_xy_polygons_cm']] for r in ledger['regions']}
    regions = {name: [np.asarray(p, dtype=float)/100 for p in polygons] for name, polygons in region_cm.items()}
    region_keys = {name: {tuple(sorted(map(tuple, polygon))) for polygon in polygons} for name, polygons in regions.items()}
    def in_region(triangle, region_id):
        # Literal declared native vertices prove containment before subtraction
        # can introduce residuals while clipping earlier overlapping entries.
        if tuple(sorted(map(tuple, triangle[:, :2]))) in region_keys[region_id]: return
        remaining = [triangle[:, :2].tolist()]
        relevant = []
        for index, polygon in enumerate(regions[region_id]):
            # Region entries are explicit triangles; arbitrary concave polygons
            # require a declared triangulation rather than a convex-hull guess.
            if len(polygon) != 3: raise ValueError('Source3 edit region polygons require explicit triangles')
            lo, hi = polygon.min(axis=0), polygon.max(axis=0)
            if np.any(triangle[:, :2].min(axis=0) > hi) or np.any(triangle[:, :2].max(axis=0) < lo): continue
            relevant.append(region_cm[region_id][index])
            remaining = [piece for p in remaining for piece in subtract(p, polygon)]
            if not remaining: return
        if not uncovered_exact(native_centimetres(triangle), relevant): return
        raise ValueError(f'Source3 geometry extends outside declared region {region_id}')
    for edit in ledger['terrain_edits']:
        if probe: probe.tick(admission='terrain-region',parent_triangle=edit['parent_triangle'])
        in_region(native_metres(parent_surface.terrain_index.triangles[edit['parent_triangle']]), edit['region_id'])
    for i, face in enumerate(labels): in_region(output_triangles[len(retained)+i], face['region_id'])
    road_stitches = collections.defaultdict(list)
    for edit in ledger.get('road_overrides', []):
        require_equal(edit['source_record'], parent_surface.road.sources[edit['source']], 'road edit raw source')
        for anchor in edit['anchors']: anchor_point(anchor)
        relevant = [(roads[i], ref) for i, ref in enumerate(parent_surface._source3_new_road_refs)
                    if ref['kind'] == 'derived-road' and (ref['source'], ref['mesh'], ref['primitive'], ref['original_triangle']) == road_key(edit)]
        actual = {(ref['patch_triangle'], vertex): native_centimetres(triangle[vertex]) for triangle, ref in relevant for vertex in range(3)}
        declared = {(r['patch_triangle'], r['vertex']): r for r in edit['replacement_vertex_anchors']}
        if len(declared) != len(edit['replacement_vertex_anchors']) or set(declared) != set(actual):
            raise ValueError('Source3 road replacement requires every consumed vertex anchor exactly once')
        for key, cm in actual.items():
            entry = declared[key]
            anchor = entry['source_anchor']
            if entry.get('kind') != 'source-road-native-stitch' or anchor.get('kind') != 'source-road-plane-interpolation' or road_key(anchor) != road_key(edit):
                raise ValueError('Source3 road replacement interpolation has invalid source lineage')
            part = source_part(anchor)
            face_id = integer(anchor['triangle'], 'road anchor triangle', len(part[3]))
            original_face = part[2]['POSITION'][part[3][face_id]][:, [0, 2, 1]]
            original_cm, _, _ = source_interpolation(anchor, original_face, 'road')
            check_native_stitch(entry, original_cm, cm, 'road', framed=framed)
            road_stitches[(edit['source'], tuple(original_cm))].append(cm)
        for triangle, _ in relevant: in_region(triangle, edit['region_id'])
    inferred = []
    for i, face in enumerate(labels):
        if face['kind'] != 'inferred-ground-road': continue
        triangle = output_triangles[len(retained)+i]
        anchors = np.asarray([anchor_point(a) for a in face['anchors']])
        if len(anchors) != 3:
            raise ValueError('Source3 inferred triangle requires three native source-bank anchors in order')
        edits = face.get('vertex_edits', [])
        vertices = [integer(e['vertex'], 'inferred edit vertex', 3) for e in edits]
        if len(set(vertices)) != len(vertices):
            raise ValueError('Source3 inferred stitch requires unique moved vertex IDs')
        for vertex in set(range(3))-set(vertices):
            if not np.array_equal(anchors[vertex], triangle[vertex]):
                raise ValueError('Source3 inferred triangle changed an unledgered native source-bank anchor')
        for edit in edits:
            vertex = edit['vertex']
            if edit.get('kind') != 'source-road-native-stitch' or edit['source_anchor'] != face['anchors'][vertex]:
                raise ValueError('Source3 inferred stitch must retain its exact original raw bank anchor')
            original_cm = native_centimetres(anchors[vertex])
            replacement_cm = native_centimetres(triangle[vertex])
            check_native_stitch(edit, original_cm, replacement_cm, 'inferred bank', framed=framed)
            if np.array_equal(original_cm, replacement_cm):
                raise ValueError('Source3 inferred vertex_edits may name only moved vertices')
            incident = road_stitches[(edit['source_anchor']['source'], tuple(original_cm))]
            if not incident or any(not np.array_equal(cm, replacement_cm) for cm in incident):
                raise ValueError('Source3 inferred stitch must share its replacement with incident derived-road vertices')
        cross = np.cross(triangle[1]-triangle[0], triangle[2]-triangle[0])
        if cross[2] == 0 or np.linalg.norm(cross[:2])/abs(cross[2]) > .2:
            raise ValueError('Source3 inferred road face exceeds vehicle grade 0.2 or has zero projected area')
        inferred.append(triangle)
    ground = np.concatenate((roads, np.asarray(inferred).reshape(-1, 3, 3)))
    if probe: probe.phase('source3-ground-diagnostic-index',ground_triangles=len(ground))
    ground_index = api.support_geometry.TriangleIndex(ground)
    # One index over complete CURRENT consumed terrain serves both coverage
    # and occlusion; original/deleted reference terrain is never a cover.
    if probe: probe.phase('source3-terrain-diagnostic-index',terrain_triangles=len(output_triangles))
    terrain_index = api.support_geometry.TriangleIndex(output_triangles)
    if probe: probe.phase('source3-deleted-parent-coverage')
    inferred_ids = {len(retained)+i for i, face in enumerate(labels) if face['kind'] == 'inferred-ground-road'}
    # A deleted parent footprint must still be covered by actual road/fill/fragment
    # geometry. Whole-face removal cannot silently create an exterior hole.
    fragments = collections.defaultdict(list)
    fragment_ids = collections.defaultdict(set)
    for i, face in enumerate(labels):
        if face['kind'] == 'retained-parent-fragment':
            fragments[face['parent_triangle']].append(output_triangles[len(retained)+i])
            fragment_ids[face['parent_triangle']].add(len(retained)+i)
    for parent_number, parent_id in enumerate(ledger['deleted_parent_triangles']):
        if probe: probe.tick(deleted_parent_completed=parent_number,deleted_parent_total=len(ledger['deleted_parent_triangles']),parent_triangle=parent_id)
        old = native_metres(parent_surface.terrain_index.triangles[parent_id])
        remaining = [old[:, :2].tolist()]
        candidates = ground_index.candidates(old[:, :2].min(axis=0), old[:, :2].max(axis=0))
        footprints = [*fragments[parent_id], *(ground[i] for i in candidates)]
        for triangle in footprints:
            remaining = [piece for polygon in remaining for piece in subtract(polygon, triangle)]
            if not remaining: break
        if remaining:
            # Keep the historical fast float-pass decisions. A refusal needs
            # the complete current surface, including neighboring fragments.
            terrain_candidates = terrain_index.candidates(old[:, :2].min(axis=0), old[:, :2].max(axis=0))
            footprints.extend(output_triangles[i] for i in terrain_candidates
                              if i not in inferred_ids and i not in fragment_ids[parent_id])
            exact_remaining = uncovered_exact(native_centimetres(old), (native_centimetres(t) for t in footprints))
            if exact_remaining:
                area_m2 = sum(map(exact_polygon_area, exact_remaining))/10000
                raise ValueError(f'Source3 deletion {parent_id} leaves uncovered native XY area {float(area_m2)} m2')
    changed_ground_ids = set(range(len(roads), len(ground)))
    for i, ref in enumerate(parent_surface._source3_new_road_refs):
        if ref['kind'] != 'derived-road': continue
        part = source_part(ref)
        original = native_metres(part[2]['POSITION'][part[3][ref['original_triangle']]][:, [0, 2, 1]])
        if sorted(map(tuple, original)) != sorted(map(tuple, roads[i])): changed_ground_ids.add(i)
    changed_terrain_ids = {len(retained)+i for i, face in enumerate(labels) if face['kind'] != 'inferred-ground-road'}
    declared_parents = {edit['parent_triangle'] for edit in ledger['terrain_edits']}
    changed_terrain_ids.update(i for i, parent in enumerate(retained) if parent in declared_parents)
    pairs = set()
    for g in changed_ground_ids:
        triangle = ground[g]
        pairs.update((t, g) for t in terrain_index.candidates(triangle[:, :2].min(axis=0), triangle[:, :2].max(axis=0)) if t not in inferred_ids)
    for t in changed_terrain_ids:
        triangle = output_triangles[t]
        pairs.update((t, g) for g in ground_index.candidates(triangle[:, :2].min(axis=0), triangle[:, :2].max(axis=0)))
    overlap_records = []
    zero_projected_pairs = 0
    inferred_labels = [face for face in labels if face['kind'] == 'inferred-ground-road']
    if probe: probe.phase('source3-overlap-diagnostics',overlap_pairs_total=len(pairs))
    for pair_number, (t, g) in enumerate(sorted(pairs)):
        if probe: probe.tick(overlap_pairs_completed=pair_number)
        upper, lower = native_centimetres(output_triangles[t]), native_centimetres(ground[g])
        # Exact-zero projected geometry has no positive-area overlap/support;
        # original native endpoint exclusions are retained, never given credit.
        if not exact_polygon_area(rational_polygon(upper)) or not exact_polygon_area(rational_polygon(lower)):
            zero_projected_pairs += 1
            continue
        terrain_ref = ({'kind': 'terrain', 'parent_triangle': int(retained[t])} if t < len(retained) else labels[t-len(retained)])
        ground_ref = parent_surface._source3_new_road_refs[g] if g < len(roads) else inferred_labels[g-len(roads)]
        result = measure_source_overlap(upper, lower, {'terrain_triangle': int(t), 'ground_triangle': int(g), 'terrain_ref': terrain_ref, 'ground_ref': ground_ref})
        if result is not None: overlap_records.append(result)
    return {'changed_face_coverage': True, 'inferred_faces': len(inferred), 'deleted_parent_faces': len(ledger['deleted_parent_triangles']),
            'global_overlaps': {'scope': 'DIAGNOSTIC_NOT_SUPPORT_ADMISSION', 'pairs': overlap_records, 'candidate_pairs': len(pairs), 'zero_projected_area_pairs_no_support_credit': zero_projected_pairs},
            'scope': 'Changed footprints covered by complete current terrain/roads. Exact native-cm coverage fallback on floating refusal; floating passes are not exact-certified. Raw anchors and inferred grade checked separately; global overlaps are measured diagnostics, not universal support admission. Route width/body, native collision and capacity remain separate acceptance.'}



def changed_face_sample(sample_id, xy, reference_z, reference, road_refs, native_roads, road_index, terrain_index, terrain_record):
    """First source blocker in ONE fixed face-reference ray; never choose support."""
    start, end = reference_z+.8, reference_z-1
    start_cm, end_cm = Fraction(float(start*100)), Fraction(float(end*100))
    query_cm = [Fraction(float(float(value)*100)) for value in xy]
    operands = []
    for role, index in (('road', road_index), ('terrain_support', terrain_index)):
        for hit in index.hits(*xy):
            # Match the Source ENU query using current native ESU/raw-corner inverse.
            source_cm = index.native_triangles_cm[hit['triangle']].astype(np.float64)[[0, 2, 1]] * np.array([1., -1., 1.])
            plane, _ = collision_plane(source_cm, 'correspondence source')
            height_cm = plane[0]*query_cm[0]+plane[1]*query_cm[1]+plane[2]
            if not end_cm <= height_cm <= start_cm: continue
            height = float(height_cm/100)
            if role == 'road':
                ref = road_refs[hit['triangle']]; mapping = native_roads[ref['source']]
                actor, path, triangle = mapping['actor_label'], mapping['source_path'], ref['source_triangle_index']
            else:
                if terrain_record is None: raise ValueError('Source3 changed-face correspondence requires the actual consumed terrain record')
                ref = {'kind': 'terrain', 'triangle': hit['triangle']}
                actor, path, triangle = 'City_069_terrain', terrain_record['path'], hit['triangle']
            operands.append({'actor_label': actor, 'mesh_role': role, 'position_m': [*map(float, xy), height], 'height_native_cm_q': str(height_cm),
                'normal_enu': hit['normal_enu'], 'source_path': path, 'source_triangle_index': triangle,
                'barycentric': hit['barycentric'], 'layer_ref': ref})
    sample = {'id': sample_id, 'start_m': [*map(float, xy), start], 'end_m': [*map(float, xy), end],
        'expected_hit': bool(operands), 'interval_native_cm_q': [str(start_cm), str(end_cm)], 'reference': {'position_m': [*map(float, xy), reference_z], 'source_face': reference},
        'scope': 'SOURCE_GEOMETRY_CORRESPONDENCE_NOT_SUPPORT_ELIGIBILITY'}
    detail = {'sample_id': sample_id, 'reference': sample['reference'], 'start_m': sample['start_m'], 'end_m': sample['end_m'],
        'interval_native_cm_q': sample['interval_native_cm_q'], 'source_operands': operands, 'native_correspondence': 'pending', 'support_eligibility': 'not-evaluated'}
    if not operands:
        return sample, {**detail, 'status': 'unavailable', 'reason': 'no-source-blocker-in-fixed-reference-ray'}
    top_cm = max(Fraction(operand['height_native_cm_q']) for operand in operands)
    first = [operand for operand in operands if Fraction(operand['height_native_cm_q']) == top_cm]
    top = float(top_cm/100)
    preferred = next((operand for operand in first if operand['mesh_role'] == reference['mesh_role'] and operand['source_triangle_index'] == reference['source_triangle_index'] and operand['source_path'] == reference['source_path']), None)
    actual = first[0] if preferred is None else preferred
    tied = sorted({operand['actor_label'] for operand in operands if abs(operand['position_m'][2]-top) <= .001})
    if len(tied) > 1:
        return None, {**detail, 'status': 'tied', 'actor_labels': tied, 'reason': 'existing-cross-actor-tie-within0.1cm'}
    sample['expected'] = actual
    visible = all(actual[key] == reference[key] for key in ('source_path', 'source_triangle_index', 'mesh_role'))
    return sample, {**detail, 'status': 'visible' if visible else 'occluded', 'first_blocker': actual}


def changed_road_samples(roads, road_refs, native_roads, road_index, terrain_index, terrain_record=None):
    """Keep per-changed-face conservation separate from bounded correspondence."""
    samples, witnesses = [], []
    for i, ref in enumerate(road_refs):
        if ref['kind'] != 'derived-road': continue
        xyz = roads[i].mean(axis=0); mapping = native_roads[ref['source']]
        reference = {'mesh_role': 'road', 'source_path': mapping['source_path'], 'source_triangle_index': ref['source_triangle_index'], 'layer_ref': ref}
        sample, detail = changed_face_sample(f'source3-road-{i}', xyz[:2], float(xyz[2]), reference,
            road_refs, native_roads, road_index, terrain_index, terrain_record)
        witnesses.append({'road_index': ref['source'], 'mesh': ref['mesh'], 'primitive': ref['primitive'],
            'triangle': ref['triangle'], 'source_triangle_index': ref['source_triangle_index'], **detail})
        if sample is not None: samples.append(sample)
    return samples, witnesses


def prepare(api, base, edit_path, *, total_seconds, ray_reference_path=None):
    """Normal source producer: parent reuse, explicit edits, readback, atomic switch."""
    started = time.perf_counter()
    def deadline():
        if time.perf_counter()-started > total_seconds:
            raise ValueError(f'Source3 preparation exceeded {total_seconds:g}s; active generation conserved')
    edit_path = api.admit_path(edit_path, api.ROOT/'data/source', regular=True)
    edit_payload = api.guarded_read(edit_path, api.ROOT/'data/source', api.SUPPORT_MANIFEST_LIMIT_BYTES)
    ledger = json.loads(edit_payload)
    require_frame(ledger, 'edit ledger')
    if 'reconstruction' in ledger:
        raise ValueError('New reconstruction geometry requires the explicit staged entry; unchanged-reference preparation remains unchanged')
    if ray_reference_path is None:
        raise api.NativeCollisionModelError('Source3 physical prediction requires --support-ray-reference naming the immutable current native-ray file; no source was published')
    ray_reference_path = api.admit_path(ray_reference_path, api.OUT/'generations', regular=True)
    ray_reference_record = api.source_record(ray_reference_path)
    ray_reference = json.loads(record(api, ray_reference_record, 'fixed raw ray reference', 32_000_000))
    if ray_reference.get('schema_version') != 1 or ray_reference.get('frame') != 'metres-Xeast-Ynorth-Zup' or ray_reference.get('position_tolerance_cm') != .1 or ray_reference.get('normal_dot_min') != .999:
        raise api.NativeCollisionModelError('Fixed native-ray reference has an unsupported frame/schema/strict tolerance')
    require_frame(ray_reference, 'fixed native-ray reference')
    reference_population = api.native_ray_population_contract(ray_reference['samples'])
    reference_manifest = json.loads(api.guarded_read(api.OUT/'support-surface-manifest.json', api.OUT, api.SUPPORT_MANIFEST_LIMIT_BYTES))
    require_frame(reference_manifest, 'current reference support')
    current_rays = json.loads(record(api, reference_manifest['native_ray_samples'], 'current native rays', 32_000_000))
    require_frame(current_rays, 'current native rays')
    allowed_reference = (reference_manifest['native_ray_samples'], current_rays.get('fixed_reference_population', {}).get('record'))
    if ray_reference_record not in allowed_reference:
        raise api.NativeCollisionModelError('Fixed native-ray reference must be the immutable current ray file or its explicitly bound original reference')
    require_equal(reference_population, api.native_ray_population_contract(current_rays['samples']), 'fixed current query population')
    inputs = unique_records([*recipe_records(ledger), ray_reference_record])
    for r in inputs: record(api, r, 'Source3 recipe input')
    parent_payload = record(api, ledger['parent_support_surface'], 'parent manifest', api.SUPPORT_MANIFEST_LIMIT_BYTES)
    parent = json.loads(parent_payload)
    require_frame(parent, 'current parent')
    if parent.get('schema_version') != 2 or api.ROOT/ledger['parent_support_surface']['path'] == api.OUT/'support-surface-manifest.json':
        raise ValueError('Source3 requires an immutable schema2 parent generation')
    before = api.support_generation_inventory(base)
    before += [api.source_record(api.ROOT/'tools/data/support_source3.py', api.ROOT/'tools/data'), api.source_record(edit_path), *inputs]
    before = unique_records(before)
    _, _, _, buildings = api.osm_sources(base)
    parent_surface = api.Surface(base, buildings, support_path=api.ROOT/ledger['parent_support_surface']['path'])
    stage = pathlib.Path(tempfile.mkdtemp(prefix='generation-', dir=api.guarded_mkdir(api.OUT/'generations', api.OUT)))
    active = api.OUT/'support-surface-manifest.json'
    prior = api.guarded_read(active, api.OUT, api.SUPPORT_MANIFEST_LIMIT_BYTES)
    try:
        doc, attrs, indices, retained, labels = assemble_terrain(api, ledger, parent)
        output = write_mesh(api, stage, 'terrain-support.glb', attrs, indices, doc['materials'])
        roads, road_refs, native_roads, derived_roads = apply_road_overrides(api, parent, ledger, stage)
        # This representation correction cannot relabel a new geometry/query
        # population as the retained failed1040query instrument.
        require_equal((output['bytes'], output['sha256']),
                      (reference_manifest['derived_terrain']['bytes'], reference_manifest['derived_terrain']['sha256']),
                      'fixed-reference terrain geometry')
        require_equal([(row['actor_label'], row['source']['bytes'], row['source']['sha256']) for row in native_roads],
                      [(row['actor_label'], row['source']['bytes'], row['source']['sha256']) for row in reference_manifest['native_roads']],
                      'fixed-reference road geometry')
        parent_surface._source3_new_road_refs = road_refs
        triangles = native_metres(attrs['POSITION'][:, [0, 2, 1]])[indices]
        evidence = validate_local_geometry(api, ledger, parent_surface, triangles, roads, retained, labels)
        deadline()
        ray_road = copy.copy(parent_surface.road)
        ray_road.triangles, ray_road.layer_refs = roads, road_refs
        road_index = NativeTriangleIndex(roads)
        terrain_index = NativeTriangleIndex(triangles)
        ray_data = api.physical_ray_samples(ray_reference, ray_reference_record, ray_road, road_index, terrain_index, native_roads, output)
        require_equal(api.native_ray_population_contract(ray_data['samples']), reference_population, 'immutable physical query population')
        api.guarded_write(stage/'support-native-rays.json', api.encoded(ray_data))
        rays = api.source_record(stage/'support-native-rays.json')
        api.guarded_write(stage/'surface-edits.json', edit_payload)
        algorithm = {**api.generation_code_record('support_surface.py'), 'integration': api.generation_code_record('surface_network.py'),
                     'topology': api.generation_code_record('support_topology.py'), 'build_city': api.generation_code_record('build_city.py'),
                     'edits': api.generation_code_record('support_source3.py')}
        configurations = {'surface_network': api.generation_configuration_record('surface_network.json'), 'city': api.generation_configuration_record('shibuya.json')}
        after = api.support_generation_inventory(base)
        after += [api.source_record(api.ROOT/'tools/data/support_source3.py', api.ROOT/'tools/data'), api.source_record(edit_path), *inputs]
        after = unique_records(after)
        for r in inputs: record(api, r, 'Source3 unchanged recipe input')
        if before != after: raise ValueError('Source3 source/code/configuration changed during preparation')
        preservation = {'schema_version': 1, 'inputs_before': before, 'inputs_after': after, 'unchanged': True,
                        'data_bindings': api.generation_bindings(algorithm, configurations), 'source3_writer': algorithm['edits']}
        preserve_payload = api.encoded(preservation)
        preserve_path = api.ROOT/'data/source/provenance'/f'support-input-inventory-{api.sha(preserve_payload)}.json'
        api.guarded_write(preserve_path, preserve_payload, api.ROOT/'data/source/provenance')
        manifest = {k: copy.deepcopy(parent[k]) for k in ('frame', 'origin', 'vertical_reference', 'inputs', 'atlas', 'attribution', 'native_assignment')}
        manifest.update(native_frame=api.native_frame_record(), schema_version=3, coordinate_model=COORDINATE_MODEL, parent_support_surface=ledger['parent_support_surface'],
            surface_edits=api.source_record(stage/'surface-edits.json'), derived_terrain=output, derived_roads=derived_roads,
            physical_query_model=api.native_physical_model_record(),
            native_roads=native_roads, native_ray_samples=rays, algorithm=algorithm, configuration_inputs=configurations,
            source_preservation=api.source_record(preserve_path), evidence={**evidence, 'elapsed_seconds': time.perf_counter()-started},
            policy='Declared native-coordinate local geometry edits; raw source and immutable Source2 parent retained')
        payload = api.encoded(manifest)
        if len(payload) > api.SUPPORT_MANIFEST_LIMIT_BYTES: raise ValueError('Source3 complete manifest exceeds 16 MiB')
        api.guarded_write(stage/'support-surface-manifest.json', payload)
        if api.guarded_read(stage/'support-surface-manifest.json', stage, api.SUPPORT_MANIFEST_LIMIT_BYTES) != payload:
            raise ValueError('Source3 staged manifest readback differs')
        # Full reader reconciliation precedes the sole active switch.
        api.Surface(base, buildings, support_path=stage/'support-surface-manifest.json')
        deadline()
        if api.guarded_read(active, api.OUT, api.SUPPORT_MANIFEST_LIMIT_BYTES) != prior:
            raise ValueError('Source3 active parent changed before atomic promotion')
        for r in before:
            actual = api.guarded_read(api.ROOT/r['path'], api.ROOT, max(r['bytes'], 1))
            if len(actual) != r['bytes'] or api.sha(actual) != r['sha256']:
                raise ValueError(f"Source3 input changed before promotion: {r['path']}")
        backup = api.ROOT/'data/source/provenance'/f'support-active-manifest-{api.sha(prior)}.json'
        api.guarded_write(backup, prior, api.ROOT/'data/source/provenance')
        api.guarded_write(stage/'promotion.json', api.encoded({'previous_manifest_sha256': api.sha(prior), 'active_manifest_sha256': api.sha(payload),
            'status': 'validated-ready-for-single-switch', 'evidence': manifest['evidence']}))
        deadline()
        api.guarded_write(active, payload)
        return manifest
    except BaseException as error:
        api.guarded_write(stage/'refused.json', api.encoded({'error': f'{type(error).__name__}: {error}',
            'active_manifest_conserved': api.guarded_read(active, api.OUT, api.SUPPORT_MANIFEST_LIMIT_BYTES) == prior}))
        raise
