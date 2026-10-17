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

COORDINATE_MODEL = 'native-float32-centimetres-v1'
OUTPUT_ORDER = 'parent-triangles-minus-deletions-then-patch-faces'
MAX_NATIVE_STITCH_CM = .1


def native_centimetres(points):
    return (np.asarray(points, dtype=np.float64) * 100).astype(np.float32).astype(np.float64)


def native_metres(points):
    """ENU input, exactly the importer's metre -> float32 centimetre conversion."""
    return native_centimetres(points) / 100


def same_native_triangle(surface, previous, current):
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
        return surface.terrain_index.triangles[index]
    if index >= len(surface.road.layer_refs) or surface.road.layer_refs[index] != ref: return None
    if kind == 'inferred' and ref.get('triangle') != flat: return None
    return surface.road_index.triangles[index]


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


def span_grade(previous, current, maximum, *, surface=None, previous_record=None, current_record=None):
    distance = math.dist(previous[:2], current[:2])
    height = abs(current[2]-previous[2])
    if distance == 0:
        if height: raise ValueError('Source3 zero-length span has unequal support heights')
        return 0.
    grade = height/distance
    if grade > maximum:
        triangle = same_native_triangle(surface, previous_record, current_record)
        if triangle is not None:
            exact_grade = exact_native_span_grade(triangle, previous, current, maximum)
            if exact_grade is not None: return exact_grade
        raise ValueError(f'Source3 span grade {grade} exceeds {maximum} across {distance} m')
    return grade


class NativeTriangleIndex(geometry.TriangleIndex):
    """Native-coordinate triangles without historical near-edge extrapolation."""
    def hits(self, east, north):
        ids = self.candidates(np.array([east, north]), np.array([east, north]))
        if not len(ids): return []
        triangles = self.triangles[ids]
        a, b, c = triangles[:, 0], triangles[:, 1], triangles[:, 2]
        u, v = b[:, :2]-a[:, :2], c[:, :2]-a[:, :2]
        d = np.asarray([east, north])-a[:, :2]
        determinant = u[:, 0]*v[:, 1]-u[:, 1]*v[:, 0]
        nonzero = determinant != 0
        s = np.divide(d[:, 0]*v[:, 1]-d[:, 1]*v[:, 0], determinant, out=np.full(len(ids), np.nan), where=nonzero)
        t = np.divide(u[:, 0]*d[:, 1]-u[:, 1]*d[:, 0], determinant, out=np.full(len(ids), np.nan), where=nonzero)
        good = nonzero & (s >= 0) & (t >= 0) & (s+t <= 1)
        normals = np.cross(b-a, c-a)
        result = []
        for i in np.flatnonzero(good):
            weights = np.array([1-s[i]-t[i], s[i], t[i]])
            normal = normals[i]
            unit = normal/np.linalg.norm(normal)*(1 if normal[2] > 0 else -1)
            result.append({'height': float(weights@triangles[i, :, 2]), 'triangle': int(ids[i]), 'barycentric': weights.tolist(),
                'gradient_enu': (-normal[:2]/normal[2]).tolist(), 'normal_enu': unit.tolist(), 'normal_up_z': float(unit[2])})
        return result

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
    values += [ledger['recipe']['algorithm'], *ledger['recipe']['source_inputs'], *ledger['recipe']['candidate_inputs']]
    return unique_records(values)


def unique_records(values):
    result = {}
    for value in values:
        prior = result.setdefault(value['path'], value)
        if prior != value: raise ValueError(f"Source3 conflicting records for {value['path']}")
    return list(result.values())


def layout(ledger, parent, patch_count):
    """Classify every output face and every removal; never infer missing labels."""
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
    for face in patch:
        if face['region_id'] not in region_ids:
            raise ValueError('Source3 patch face names an undeclared region')
        if face['kind'] == 'retained-parent-fragment':
            p = integer(face['parent_triangle'], 'fragment.parent_triangle', count)
            if p not in deleted or face['original_terrain_parent'] != parent['terrain_source_triangle_indices'][p]:
                raise ValueError('Source3 fragment must replace its declared parent and retain original terrain lineage')
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


def check_native_stitch(edit, original_cm, replacement_cm, label):
    for field, expected in (('original_native_cm', original_cm), ('replacement_native_cm', replacement_cm)):
        declared = np.asarray(edit[field], dtype=np.float64)
        if declared.shape != (3,) or not np.isfinite(declared).all() or not np.array_equal(declared, expected):
            raise ValueError(f'Source3 {label} {field} disagrees with actual native geometry')
    displacement = float(np.linalg.norm(replacement_cm-original_cm))
    if displacement > MAX_NATIVE_STITCH_CM:
        raise ValueError(f'Source3 {label} native stitch {displacement/100} m exceeds 0.001 m')


def check_fragment(face, packed, parent):
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
        check_native_stitch(edit, original_cm, actual_cm[i], 'fragment')
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
        admit_new_face_winding(rows, f"terrain patch {face['patch_triangle']}", parent=source,
                               inferred=face['kind'] == 'inferred-ground-road')
        if face['kind'] == 'retained-parent-fragment':
            check_fragment(face, rows, parent_rows[face['parent_triangle']])
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
                if not selected or len(set(selected)) != len(selected):
                    raise ValueError('Source3 road replacement requires unique explicit replacement triangle IDs')
                selected = [integer(i, 'replacement triangle', len(rows)) for i in selected]
                rows = rows[selected]
                source_face = np.concatenate((attrs['POSITION'][:, [0, 2, 1]], attrs['TEXCOORD_0'], attrs['NORMAL']), axis=1)[indices[edit['triangle']]]
                for triangle_id, triangle in zip(selected, rows):
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
    parent_payload = record(api, manifest['parent_support_surface'], 'parent support', api.SUPPORT_MANIFEST_LIMIT_BYTES)
    parent = json.loads(parent_payload)
    if parent.get('schema_version') != 2:
        raise ValueError('Source3 requires an immutable admitted Source2 parent, not a recursive derived chain')
    if api.ROOT/manifest['parent_support_surface']['path'] == api.OUT/'support-surface-manifest.json':
        raise ValueError('Source3 parent must name an immutable generation, not the active manifest alias')
    previous = api.Surface(base, buildings, vehicle_source=vehicle_source, support_path=api.ROOT/manifest['parent_support_surface']['path'])
    surface.__dict__.update(previous.__dict__)
    for key in ('frame', 'origin', 'vertical_reference', 'inputs', 'atlas', 'attribution'):
        require_equal(manifest[key], parent[key], key)
    require_equal(manifest['coordinate_model'], COORDINATE_MODEL, 'coordinate model')
    ledger = json.loads(record(api, manifest['surface_edits'], 'surface edits', api.SUPPORT_MANIFEST_LIMIT_BYTES))
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
    surface.source3_admission = validate_local_geometry(api, ledger, previous, triangles, roads, retained, labels)
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
    surface.support_record = api.source_record(support_path)
    surface.derived_record = manifest['derived_terrain']
    surface.source3_ledger = ledger
    preservation = json.loads(record(api, manifest['source_preservation'], 'source preservation', 32_000_000))
    if preservation.get('unchanged') is not True or preservation['inputs_before'] != preservation['inputs_after']:
        raise ValueError('Source3 generation input preservation is incomplete')
    for name in ('integration', 'topology', 'build_city', 'edits'):
        record(api, manifest['algorithm'][name], 'algorithm snapshot', 2_000_000)
    record(api, manifest['algorithm'], 'geometry snapshot', 2_000_000)
    for r in manifest['configuration_inputs'].values(): record(api, r, 'configuration snapshot', 100_000)
    require_equal(preservation['source3_writer'], manifest['algorithm']['edits'], 'writer snapshot')
    # Integration/algorithm snapshots are historical data. Actual data inputs
    # remain current and pinned; route-only code edits cannot relabel geometry.
    for r in preservation['inputs_before']:
        if r['path'].startswith('data/'):
            record(api, r, 'preserved source data')


def witness(surface, api, record_value, point, kind, interval):
    result = copy.deepcopy(record_value)
    if result['source'] == 'GSI-DEM5A':
        ref = surface.source3_terrain_refs[result['triangle']]
        result.update(layer_ref=ref, triangle=ref['triangle'])
    else:
        ref = result['layer_ref']
        if ref['kind'] in ('road', 'derived-road'):
            result['triangle'] = ref['source_triangle_index']
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


def frozen_vehicle_path(api, row, surface):
    """Reconstruct source lanes and legal joins; compare the frozen XY traversal."""
    edges = [{'way_id': r['way_id'], 'from': r['from_osm_node'], 'to': r['to_osm_node'], 'points': r['lane_points']}
             for r in row['source_lane_segments']]
    if not edges: raise ValueError('Frozen vehicle route requires actual directed source lane segments')
    points, contexts = api.vehicle_polyline(edges, closed=row['closed'])
    for (a, b), context in zip(zip(points, points[1:]), contexts):
        surface.vehicle_interval(context, a, b, row['width_m'])
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
    if math.dist(row['points'][0][:2], points[0]) > 1e-5 or math.dist(row['points'][-1][:2], points[-1]) > 1e-5:
        raise ValueError('Frozen vehicle route omits source traversal endpoints')
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


def validate_local_geometry(api, ledger, parent_surface, output_triangles, roads, retained, labels):
    """Actual changed-face coverage/anchors/occlusion, distinct from route/body acceptance."""
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
    region_cm = {r['id']: r['native_xy_polygons_cm'] for r in ledger['regions']}
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
            check_native_stitch(entry, original_cm, cm, 'road')
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
            check_native_stitch(edit, original_cm, replacement_cm, 'inferred bank')
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
    ground_index = api.support_geometry.TriangleIndex(ground)
    # One index over complete CURRENT consumed terrain serves both coverage
    # and occlusion; original/deleted reference terrain is never a cover.
    terrain_index = api.support_geometry.TriangleIndex(output_triangles)
    inferred_ids = {len(retained)+i for i, face in enumerate(labels) if face['kind'] == 'inferred-ground-road'}
    # A deleted parent footprint must still be covered by actual road/fill/fragment
    # geometry. Whole-face removal cannot silently create an exterior hole.
    fragments = collections.defaultdict(list)
    fragment_ids = collections.defaultdict(set)
    for i, face in enumerate(labels):
        if face['kind'] == 'retained-parent-fragment':
            fragments[face['parent_triangle']].append(output_triangles[len(retained)+i])
            fragment_ids[face['parent_triangle']].add(len(retained)+i)
    for parent_id in ledger['deleted_parent_triangles']:
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
    changed_ground = inferred + [roads[i] for i, ref in enumerate(parent_surface._source3_new_road_refs) if ref['kind'] == 'derived-road']
    for triangle in changed_ground:
        for i in terrain_index.candidates(triangle[:, :2].min(axis=0), triangle[:, :2].max(axis=0)):
            if i in inferred_ids: continue
            terrain = terrain_index.triangles[i]
            overlap = terrain[:, :2].tolist()
            footprint = triangle[:, :2].tolist()
            if np.linalg.det(np.stack((triangle[1, :2]-triangle[0, :2], triangle[2, :2]-triangle[0, :2]))) < 0: footprint.reverse()
            for a, b in zip(footprint, footprint[1:]+footprint[:1]): overlap = cut_polygon(overlap, a, b, True)
            if not polygon_area(overlap): continue
            for xy in overlap:
                gap = float(barycentric(terrain, xy)@terrain[:, 2]-barycentric(triangle, xy)@triangle[:, 2])
                if gap > 0:
                    raise ValueError(f'Source3 retained terrain {i} occludes declared road by {gap} m')
    return {'changed_face_coverage': True, 'inferred_faces': len(inferred), 'deleted_parent_faces': len(ledger['deleted_parent_triangles']),
            'scope': 'Changed footprints covered by complete current terrain/roads. Exact native-cm coverage fallback on floating refusal; floating passes are not exact-certified. Raw anchors, inferred grade and retained-terrain occlusion checked separately. Route width/body, native collision and capacity remain separate acceptance.'}



def changed_road_samples(roads, road_refs, native_roads, road_index, terrain_index):
    """Regenerated exact replacement-face rays; ties remain explicit omissions."""
    changed_road_witnesses = []
    samples = []
    for i, ref in enumerate(road_refs):
        if ref['kind'] != 'derived-road': continue
        xy = roads[i, :, :2].mean(axis=0)
        road_hits = road_index.hits(*xy)
        hit = next((h for h in road_hits if h['triangle'] == i), None)
        if hit is None: raise ValueError('Source3 changed road centroid does not query its consumed triangle')
        mapping = native_roads[ref['source']]
        hits = [(h['height'], native_roads[road_refs[h['triangle']]['source']]['actor_label']) for h in road_hits]
        hits += [(h['height'], 'City_069_terrain') for h in terrain_index.hits(*xy)]
        top = max(z for z, _ in hits)
        tied = sorted({actor for z, actor in hits if abs(z-top) <= .001})
        detail = {'road_index': ref['source'], 'mesh': ref['mesh'], 'primitive': ref['primitive'], 'triangle': ref['triangle'], 'source_triangle_index': ref['source_triangle_index']}
        if top-hit['height'] > .001:
            raise ValueError(f'Source3 changed road face is buried: {detail}')
        if tied != [mapping['actor_label']]:
            changed_road_witnesses.append({**detail, 'status': 'actor-tie-omitted', 'actor_labels': tied})
            continue
        sample_id = f'source3-road-{i}'
        samples.append({'id': sample_id, 'start_m': [*xy.tolist(), hit['height']+.8], 'end_m': [*xy.tolist(), hit['height']-1],
            'expected_hit': True, 'expected': {'actor_label': mapping['actor_label'], 'mesh_role': 'road',
                'position_m': [*xy.tolist(), hit['height']], 'normal_enu': hit['normal_enu'], 'source_path': mapping['source_path'],
                'source_triangle_index': ref['source_triangle_index'], 'barycentric': hit['barycentric'], 'layer_ref': ref}})
        changed_road_witnesses.append({**detail, 'status': 'sampled', 'sample_id': sample_id})
    return samples, changed_road_witnesses

def prepare(api, base, edit_path, *, total_seconds):
    """Normal source producer: parent reuse, explicit edits, readback, atomic switch."""
    started = time.perf_counter()
    def deadline():
        if time.perf_counter()-started > total_seconds:
            raise ValueError(f'Source3 preparation exceeded {total_seconds:g}s; active generation conserved')
    edit_path = api.admit_path(edit_path, api.ROOT/'data/source', regular=True)
    edit_payload = api.guarded_read(edit_path, api.ROOT/'data/source', api.SUPPORT_MANIFEST_LIMIT_BYTES)
    ledger = json.loads(edit_payload)
    inputs = recipe_records(ledger)
    for r in inputs: record(api, r, 'Source3 recipe input')
    parent_payload = record(api, ledger['parent_support_surface'], 'parent manifest', api.SUPPORT_MANIFEST_LIMIT_BYTES)
    parent = json.loads(parent_payload)
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
        parent_surface._source3_new_road_refs = road_refs
        triangles = native_metres(attrs['POSITION'][:, [0, 2, 1]])[indices]
        evidence = validate_local_geometry(api, ledger, parent_surface, triangles, roads, retained, labels)
        deadline()
        ray_road = copy.copy(parent_surface.road)
        ray_road.triangles, ray_road.layer_refs = roads, road_refs
        road_index = NativeTriangleIndex(roads)
        terrain_index = NativeTriangleIndex(triangles)
        rays = api.native_ray_samples(ray_road, road_index, terrain_index, native_roads, output, buildings, output_directory=stage)
        ray_data = json.loads(record(api, rays, 'native rays', 32_000_000))
        changed_samples, changed_witnesses = changed_road_samples(roads, road_refs, native_roads, road_index, terrain_index)
        ray_data['samples'].extend(changed_samples)
        ray_data['source3_changed_road_witnesses'] = changed_witnesses
        for i, face in enumerate(labels):
            triangle_id = len(retained)+i
            triangle = triangles[triangle_id]
            xy = triangle[:, :2].mean(axis=0)
            hits = terrain_index.hits(*xy)
            actual = next((h for h in hits if h['triangle'] == triangle_id), None)
            if actual is None: raise ValueError('Source3 changed face centroid does not query its consumed triangle')
            all_hits = hits+road_index.hits(*xy)
            if max(h['height'] for h in all_hits)-actual['height'] > .001:
                # Retained fragments under an original road are not first-hit rays.
                if face['kind'] == 'retained-parent-fragment': continue
                raise ValueError('Source3 inferred changed-face native ray is buried')
            if any(abs(h['height']-actual['height']) <= .001 for h in road_index.hits(*xy)):
                continue  # Explicit actor tie: no ambiguous native actor oracle.
            ray_data['samples'].append({'id': f'source3-patch-{i}', 'start_m': [*xy.tolist(), actual['height']+.8],
                'end_m': [*xy.tolist(), actual['height']-1], 'expected_hit': True,
                'expected': {'actor_label': 'City_069_terrain', 'mesh_role': 'terrain_support', 'position_m': [*xy.tolist(), actual['height']],
                    'normal_enu': actual['normal_enu'], 'source_path': output['path'], 'source_triangle_index': triangle_id,
                    'barycentric': actual['barycentric'], 'layer_ref': {'kind': face['kind'], 'triangle': triangle_id, 'region_id': face['region_id']}}})
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
        manifest.update(schema_version=3, coordinate_model=COORDINATE_MODEL, parent_support_surface=ledger['parent_support_surface'],
            surface_edits=api.source_record(stage/'surface-edits.json'), derived_terrain=output, derived_roads=derived_roads,
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
