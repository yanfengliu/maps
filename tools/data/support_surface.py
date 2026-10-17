"""Prototype planar source-footprint subtraction, preserving terrain attributes.

No source fetching, source discovery, output writes or native collision changes.
Rows are [east, north, up, ...attributes]; cutting interpolates the entire row.
"""
from __future__ import annotations

import math
import collections
import bisect
import support_topology as topology

EPSILON_M = 1e-9
MIN_AREA_M2 = 1e-10
UNION_CLEARANCE_M = .00025
UNION_PREDICATE_M = 1e-10


def union_exterior(polygons):
    """Exterior of the actual removed union, excluding triangulation seams.

    Local scalar edge arithmetic avoids allocating arrays in every pair test.
    Bounding boxes reject disjoint pairs without changing the geometric test.
    """
    unique = {}
    for polygon in polygons:
        polygon = [list(row[:2]) for row in polygon]
        if signed_area(polygon) < 0:
            polygon.reverse()
        unique.setdefault(tuple(sorted(tuple(row) for row in polygon)), polygon)
    polygons = list(unique.values())
    bounds = [(min(p[0] for p in poly), min(p[1] for p in poly),
               max(p[0] for p in poly), max(p[1] for p in poly)) for poly in polygons]
    edges = [[(a, b, b[0]-a[0], b[1]-a[1], math.hypot(b[0]-a[0], b[1]-a[1]))
              for a, b in zip(poly, poly[1:]+poly[:1])] for poly in polygons]
    result = {}
    for own, own_edges in enumerate(edges):
        for a, b, dx, dy, length in own_edges:
            if length < 1e-9:
                continue
            lo = (min(a[0], b[0]), min(a[1], b[1]))
            hi = (max(a[0], b[0]), max(a[1], b[1]))
            nearby = [i for i, box in enumerate(bounds) if i != own and
                      box[0] <= hi[0]+UNION_PREDICATE_M and box[2] >= lo[0]-UNION_PREDICATE_M and
                      box[1] <= hi[1]+UNION_PREDICATE_M and box[3] >= lo[1]-UNION_PREDICATE_M]
            parameters = [0., 1.]
            for other in nearby:
                for c, d, vx, vy, size in edges[other]:
                    ox, oy = c[0]-a[0], c[1]-a[1]
                    determinant = dx*vy-dy*vx
                    if abs(determinant) > 1e-12:
                        t, u = (ox*vy-oy*vx)/determinant, (ox*dy-oy*dx)/determinant
                        if 0 < t < 1 and -1e-10 <= u <= 1+1e-10:
                            parameters.append(t)
                    elif abs(ox*dy-oy*dx)/length <= UNION_PREDICATE_M:
                        for point in (c, d):
                            t = ((point[0]-a[0])*dx+(point[1]-a[1])*dy)/(length*length)
                            if 0 < t < 1:
                                parameters.append(t)
            parameters = sorted(set(parameters))
            for start, end in zip(parameters, parameters[1:]):
                if (end-start)*length < 1e-9:
                    continue
                mx, my = a[0]+(start+end)/2*dx, a[1]+(start+end)/2*dy
                internal = False
                for other in nearby:
                    box = bounds[other]
                    if not (box[0]-UNION_PREDICATE_M <= mx <= box[2]+UNION_PREDICATE_M and
                            box[1]-UNION_PREDICATE_M <= my <= box[3]+UNION_PREDICATE_M):
                        continue
                    minimum, opposite = math.inf, False
                    for c, d, vx, vy, size in edges[other]:
                        if size < 1e-12:
                            continue
                        signed = (vx*(my-c[1])-vy*(mx-c[0]))/size
                        minimum = min(minimum, signed)
                        if abs(signed) <= UNION_PREDICATE_M and abs(vx*dy-vy*dx)/(size*length) < 1e-8 and vx*dx+vy*dy < 0:
                            opposite = True
                    if minimum >= -UNION_PREDICATE_M and (minimum > UNION_PREDICATE_M or opposite):
                        internal = True
                        break
                if not internal:
                    p, q = [a[0]+start*dx, a[1]+start*dy], [a[0]+end*dx, a[1]+end*dy]
                    key = tuple(sorted(tuple(round(x, 10) for x in point) for point in (p, q)))
                    result.setdefault(key, (p, q))
    return list(result.values())


def exterior_bands(boundary):
    """Original-terrain restoration within 250 micrometres of union exterior."""
    bands, vertices = [], {}
    for a, b in boundary:
        dx, dy = b[0]-a[0], b[1]-a[1]
        size = math.hypot(dx, dy)
        nx, ny = -dy/size*UNION_CLEARANCE_M, dx/size*UNION_CLEARANCE_M
        bands.append([[a[0]-nx, a[1]-ny], [b[0]-nx, b[1]-ny],
                      [b[0]+nx, b[1]+ny], [a[0]+nx, a[1]+ny]])
        for point in (a, b):
            vertices.setdefault(tuple(round(x, 10) for x in point), point)
    for point in vertices.values():
        bands.append([[point[0]+UNION_CLEARANCE_M*math.cos(i*math.tau/32),
                       point[1]+UNION_CLEARANCE_M*math.sin(i*math.tau/32)] for i in range(32)])
    return bands


def interpolate_row(triangle, xy):
    a, b, c = triangle
    ux, uy, vx, vy = b[0]-a[0], b[1]-a[1], c[0]-a[0], c[1]-a[1]
    dx, dy = xy[0]-a[0], xy[1]-a[1]
    determinant = ux*vy-uy*vx
    s, t = (dx*vy-dy*vx)/determinant, (ux*dy-uy*dx)/determinant
    return [x+(y-x)*s+(z-x)*t for x, y, z in zip(a, b, c)]


def reconciled_face(terrain_triangle, road_triangles, *, context=None):
    """Subtract conflicts and restore only their union exterior clearance.

    The returned area is a conservative upper bound for newly retained ground:
    it includes overlap between bands and pre-existing retained terrain.
    """
    footprints = [conflicting_road_footprint(terrain_triangle, triangle, context=context) for triangle in road_triangles]
    footprints = [polygon for polygon in footprints if polygon]
    pieces = subtract_road_footprints(terrain_triangle, road_triangles, conflicts_only=True, context=context)
    boundary = union_exterior(footprints)
    band_area = 0.
    positive = signed_area(terrain_triangle) > 0
    terrain_edges = list(zip(terrain_triangle, terrain_triangle[1:]+terrain_triangle[:1]))
    for band in exterior_bands(boundary):
        polygon = [interpolate_row(terrain_triangle, point) for point in band]
        if context is not None:
            # Most union boundaries extend beyond this original terrain face.
            # Run the same numeric clip first; an empty band contributes no
            # output event, so it needs no exact creating-line construction.
            # Surviving bands still execute every original labelled operator.
            probe = polygon
            for a, b in terrain_edges:
                if not probe:
                    break
                probe = _half_plane(probe, a, b, positive)
            if not probe:
                continue
            context.seed(band, 'source-union-exterior-band-edge')
            for point, row in zip(band, polygon):
                context.interpolation_event(point, row)
        for a, b in terrain_edges:
            if not polygon:
                break
            polygon = _half_plane(polygon, a, b, positive, context=context)
        if polygon:
            band_area += abs(signed_area(polygon))
            pieces.extend(triangulate(polygon))
    return pieces, {"union_exterior_segments":len(boundary), "restored_band_area_upper_bound_m2":band_area}


def conform_source_edges(triangles, parents, source_rows, source_indices, vertex_rows,
                         maximum_output_triangles=2_000_000, *, piece_ids=None, accounting=None,
                         checkpoint=lambda: None):
    """Pack shared original source-edge splits once and promote both sides.

    A triangle without edge subdivisions keeps its original three vertices.
    Subdivided boundary polygons use a centre fan so collinear promoted points
    remain actual mesh edges. The triangle limit is a resource refusal, never
    a reason to truncate geometry or admit an incomplete source.
    """
    import numpy as np
    if (piece_ids is None) != (accounting is None):
        raise ValueError('Source packing needs both piece_ids and accounting; final provenance cannot be partly enabled')
    if piece_ids is not None and len(piece_ids) != len(triangles):
        raise ValueError('Source packing input-piece vector must cover every refined triangle')
    registry, stats = collections.defaultdict(dict), collections.Counter()
    source_rows = np.asarray(source_rows)
    origin = source_rows[:, 0, :2]
    u = source_rows[:, 1, :2]-origin
    v = source_rows[:, 2, :2]-origin
    determinant = u[:, 0]*v[:, 1]-u[:, 1]*v[:, 0]

    def row_edges(row, parent):
        dx, dy = row[0]-origin[parent, 0], row[1]-origin[parent, 1]
        s = (dx*v[parent, 1]-dy*v[parent, 0])/determinant[parent]
        t = (u[parent, 0]*dy-u[parent, 1]*dx)/determinant[parent]
        result = {}
        for opposite, weight in enumerate((1-s-t, s, t)):
            if abs(weight) > 1e-9:
                continue
            edge = tuple(sorted((int(source_indices[parent, (opposite+1)%3]),
                                 int(source_indices[parent, (opposite+2)%3]))))
            a, b = vertex_rows[edge[0]], vertex_rows[edge[1]]
            ex, ey = b[0]-a[0], b[1]-a[1]
            parameter = ((row[0]-a[0])*ex+(row[1]-a[1])*ey)/(ex*ex+ey*ey)
            if -1e-9 <= parameter <= 1+1e-9:
                result[edge] = round(min(1, max(0, float(parameter))), 12)
        return result

    for triangle, parent in zip(triangles, parents):
        checkpoint()
        for row in triangle:
            for edge, parameter in row_edges(row, parent).items():
                if parameter not in registry[edge]:
                    a, b = vertex_rows[edge[0]], vertex_rows[edge[1]]
                    registry[edge][parameter] = np.asarray(a+(b-a)*parameter, dtype=np.float32)
    for edge, points in registry.items():
        points.setdefault(0., np.asarray(vertex_rows[edge[0]], dtype=np.float32))
        points.setdefault(1., np.asarray(vertex_rows[edge[1]], dtype=np.float32))
    ordered = {edge:sorted(points) for edge, points in registry.items()}
    chunks, parent_chunks, piece_chunks = [], [], []
    chunk, parent_chunk = np.empty((4096, 3, source_rows.shape[2]), dtype=np.float32), np.empty(4096, dtype=np.int32)
    piece_chunk = np.empty(4096, dtype=np.uint32)
    used, total = 0, 0

    def append(triangle, parent, piece):
        nonlocal chunk, parent_chunk, piece_chunk, used, total
        if total >= maximum_output_triangles:
            raise ValueError(f"Conforming source exceeds {maximum_output_triangles} output triangles; inspect resource/topology bound")
        cross = topology.packed_cross(triangle)
        if not any(cross):
            stats['exact_zero_area_triangles'] += 1
            if accounting is not None:
                accounting.omit(piece, 'exact_zero_3d', triangle)
            return
        if cross[2] == 0:
            # Determinant is computed from the actual packed float32 XYZ,
            # promoted to float64 for arithmetic. No area/normal epsilon.
            stats['exact_zero_projected_xy_triangles'] += 1
            if accounting is not None:
                accounting.omit(piece, 'exact_zero_xy', triangle)
            return
        chunk[used], parent_chunk[used] = triangle, parent
        if accounting is not None:
            piece_chunk[used] = piece
            accounting.emit(piece)
        used += 1
        total += 1
        if used == len(chunk):
            chunks.append(chunk)
            parent_chunks.append(parent_chunk)
            piece_chunks.append(piece_chunk)
            chunk, parent_chunk = np.empty_like(chunk), np.empty_like(parent_chunk)
            piece_chunk = np.empty_like(piece_chunk)
            used = 0

    for input_index, (triangle, parent) in enumerate(zip(triangles, parents)):
        checkpoint()
        piece = int(piece_ids[input_index]) if piece_ids is not None else None
        if accounting is not None:
            prior_attempts = accounting.input(piece)
        polygon = []
        for i in range(3):
            a, b = triangle[i], triangle[(i+1)%3]
            ae, be = row_edges(a, parent), row_edges(b, parent)
            common = ae.keys() & be.keys()
            if common:
                edge = min(common)
                start, end = ae[edge], be[edge]
                # Preserve the existing parameter bound while using the
                # once-sorted registry for interval lookup.
                low = bisect.bisect_left(ordered[edge], min(start,end)-1e-12)
                high = bisect.bisect_right(ordered[edge], max(start,end)+1e-12)
                events = ordered[edge][low:high]
                if end < start:
                    events.reverse()
                polygon.extend(registry[edge][t] for t in events[:-1])
                stats['source_edge_subdivision_events'] += max(0, len(events)-2)
            elif ae:
                edge = min(ae)
                polygon.append(registry[edge][ae[edge]])
            else:
                polygon.append(np.asarray(a, dtype=np.float32))
        cleaned = []
        for row in polygon:
            if not cleaned or not np.array_equal(cleaned[-1][:3], row[:3]):
                cleaned.append(row)
        if len(cleaned) > 1 and np.array_equal(cleaned[0][:3], cleaned[-1][:3]):
            cleaned.pop()
        if len(cleaned) < 3:
            stats['collapsed_packed_polygons'] += 1
            if accounting is not None:
                accounting.omit(piece, 'collapsed', cleaned)
            planned_attempts = 0
        elif len(cleaned) == 3:
            append(cleaned, parent, piece)
            stats['unfanned_triangles'] += 1
            planned_attempts = 1
        else:
            centre = np.asarray(np.asarray(triangle).mean(axis=0), dtype=np.float32)
            for a, b in zip(cleaned, cleaned[1:]+cleaned[:1]):
                append([centre, a, b], parent, piece)
            planned_attempts = len(cleaned)
        if accounting is not None:
            accounting.finish_input(piece, prior_attempts, planned_attempts)
    chunks.append(chunk[:used])
    parent_chunks.append(parent_chunk[:used])
    piece_chunks.append(piece_chunk[:used])
    stats.update(registered_source_edges=len(registry),
                 registered_edge_points=sum(len(points) for points in registry.values()),
                 input_triangles=len(triangles), output_triangles=total)
    output, output_parents = np.concatenate(chunks), np.concatenate(parent_chunks)
    if accounting is None:
        return output, output_parents, dict(stats)
    output_pieces = np.concatenate(piece_chunks)
    stats['piece_accounting'] = accounting.validate(output, output_parents, output_pieces)
    return output, output_parents, dict(stats), output_pieces


def signed_area(polygon):
    return sum(a[0]*b[1]-a[1]*b[0] for a,b in zip(polygon,polygon[1:]+polygon[:1]))/2


def _clean(polygon):
    result=[]
    for row in polygon:
        if not result or math.hypot(row[0]-result[-1][0],row[1]-result[-1][1])>EPSILON_M:
            result.append(row)
    if len(result)>1 and math.hypot(result[0][0]-result[-1][0],result[0][1]-result[-1][1])<=EPSILON_M:
        result.pop()
    return result if len(result)>=3 and abs(signed_area(result))>MIN_AREA_M2 else []


def _signed_clip(polygon,distance,inside, *, context=None, line_labels=None):
    result=[]
    for start,end in zip(polygon[-1:]+polygon[:-1],polygon):
        ds,de=distance(start),distance(end)
        accepted_start=ds>=0 if inside else ds<=0
        accepted_end=de>=0 if inside else de<=0
        if accepted_start != accepted_end:
            fraction=ds/(ds-de)
            row = [x+fraction*(y-x) for x,y in zip(start,end)]
            if context is not None:
                context.clipping_event(start, end, row, line_labels)
            result.append(row)
        if accepted_end:
            result.append(list(end))
    return _clean(result)


def _half_plane(polygon,a,b,inside, *, context=None):
    dx,dy=b[0]-a[0],b[1]-a[1]
    labels = context.edge_labels(a,b) if context is not None else None
    return _signed_clip(polygon,lambda row:dx*(row[1]-a[1])-dy*(row[0]-a[0]),inside,
                        context=context,line_labels=labels)


def subtract_convex_polygon(polygon,footprint, *, context=None):
    """Disjoint convex polygons covering polygon minus a convex footprint."""
    footprint=[list(row) for row in footprint]
    if abs(signed_area(footprint))<=MIN_AREA_M2:
        return [polygon]
    if signed_area(footprint)<0:
        footprint.reverse()
    overlap=list(polygon)
    for a,b in zip(footprint,footprint[1:]+footprint[:1]):
        overlap=_half_plane(overlap,a,b,True,context=context)
        if not overlap:
            # Partitioning a disjoint polygon along every extended clip edge
            # needlessly multiplies fragments without subtracting any source.
            return [polygon]
    current,remaining=list(polygon),[]
    for a,b in zip(footprint,footprint[1:]+footprint[:1]):
        outside=_half_plane(current,a,b,False,context=context)
        if outside:
            remaining.append(outside)
        current=_half_plane(current,a,b,True,context=context)
        if not current:
            break
    return remaining


def plane_height(triangle,east,north):
    a,b,c=triangle
    ux,uy=b[0]-a[0],b[1]-a[1]
    vx,vy=c[0]-a[0],c[1]-a[1]
    dx,dy=east-a[0],north-a[1]
    determinant=ux*vy-uy*vx
    if abs(determinant)<MIN_AREA_M2:
        return None
    s,t=(dx*vy-dy*vx)/determinant,(ux*dy-uy*dx)/determinant
    return a[2]*(1-s-t)+b[2]*s+c[2]*t


def conflicting_road_footprint(terrain_triangle,road_triangle, *, context=None):
    """Only road XY where source terrain lies above the unchanged road plane.

    A bridge deck above the terrain does not remove ground beneath it. Every
    source road layer remains unchanged; no road union invents a new elevation.
    """
    if abs(signed_area(road_triangle))<=MIN_AREA_M2:
        return []
    def gap(row):
        return plane_height(terrain_triangle,row[0],row[1])-plane_height(road_triangle,row[0],row[1])
    if max(gap(row) for row in terrain_triangle)<=EPSILON_M:
        return []
    labels = context.height_labels(road_triangle) if context is not None else None
    return _signed_clip([list(row) for row in road_triangle],gap,True,context=context,line_labels=labels)


def subtract_road_footprints(terrain_triangle,road_triangles,max_fragments=512,conflicts_only=False, *, context=None):
    """Bounded union subtraction preserving terrain XYZ/UV outside the footprint.

    conflicts_only=True is the source reconciliation policy. False is a generic
    planar boolean used to test the clipping instrument independently.
    """
    pieces=[[list(row) for row in terrain_triangle]]
    lo=[min(row[j] for row in terrain_triangle) for j in (0,1)]
    hi=[max(row[j] for row in terrain_triangle) for j in (0,1)]
    for triangle in road_triangles:
        if any(max(row[j] for row in triangle)<lo[j] or min(row[j] for row in triangle)>hi[j] for j in (0,1)):
            continue
        footprint=conflicting_road_footprint(terrain_triangle,triangle,context=context) if conflicts_only else triangle
        if not conflicts_only and context is not None:
            context.seed(triangle, 'source-road-projected-edge')
        if not footprint:
            continue
        updated=[]
        for piece in pieces:
            updated.extend(subtract_convex_polygon(piece,footprint,context=context))
        if len(updated)>max_fragments:
            raise ValueError(f"Road footprint subtraction exceeds {max_fragments} terrain fragments; inspect source topology")
        pieces=updated
        if not pieces:
            break
    return [triangle for piece in pieces for triangle in triangulate(piece)]


def triangulate(polygon):
    return [[polygon[0],polygon[i],polygon[i+1]] for i in range(1,len(polygon)-1)
            if abs(signed_area([polygon[0],polygon[i],polygon[i+1]]))>MIN_AREA_M2]


def triangle_height(triangle,east,north):
    a,b,c=triangle
    ux,uy=b[0]-a[0],b[1]-a[1]
    vx,vy=c[0]-a[0],c[1]-a[1]
    dx,dy=east-a[0],north-a[1]
    determinant=ux*vy-uy*vx
    if abs(determinant)<MIN_AREA_M2:
        return None
    s,t=(dx*vy-dy*vx)/determinant,(ux*dy-uy*dx)/determinant
    if s< -1e-7 or t< -1e-7 or s+t>1+1e-7:
        return None
    return a[2]*(1-s-t)+b[2]*s+c[2]*t


class TriangleIndex:
    """Exact projected triangle queries, with bounded spatial candidate bins."""
    def __init__(self,triangles,cell_m=12):
        import numpy as np
        self.np=np
        self.triangles=np.asarray(triangles,dtype=np.float64).reshape(-1,3,3)
        self.cell_m=cell_m
        self.lo=self.triangles[:,:,:2].min(axis=1)
        self.hi=self.triangles[:,:,:2].max(axis=1)
        self.bins=collections.defaultdict(list)
        for i,(lo,hi) in enumerate(zip(self.lo,self.hi)):
            start,end=np.floor(lo/cell_m).astype(int),np.floor(hi/cell_m).astype(int)
            for x in range(start[0],end[0]+1):
                for y in range(start[1],end[1]+1):
                    self.bins[x,y].append(i)

    def candidates(self,lo,hi):
        np=self.np
        start,end=np.floor(np.asarray(lo)/self.cell_m).astype(int),np.floor(np.asarray(hi)/self.cell_m).astype(int)
        if (end[0]-start[0]+1)*(end[1]-start[1]+1)>20000:
            raise ValueError('Support query exceeds the local crop spatial bound')
        ids=set()
        for x in range(start[0],end[0]+1):
            for y in range(start[1],end[1]+1):ids.update(self.bins.get((x,y),()))
        ids=np.asarray(sorted(ids),dtype=int)
        return ids[np.all(self.hi[ids]>=lo,axis=1)&np.all(self.lo[ids]<=hi,axis=1)]

    def hits(self,east,north):
        np=self.np
        ids=self.np.asarray(self.bins.get((math.floor(east/self.cell_m),math.floor(north/self.cell_m)),()),dtype=int)
        if not len(ids):return []
        triangles=self.triangles[ids]
        a,b,c=triangles[:,0],triangles[:,1],triangles[:,2]
        u,v=b[:,:2]-a[:,:2],c[:,:2]-a[:,:2]
        d=np.asarray([east,north])-a[:,:2]
        determinant=u[:,0]*v[:,1]-u[:,1]*v[:,0]
        good=abs(determinant)>MIN_AREA_M2
        s=np.divide(d[:,0]*v[:,1]-d[:,1]*v[:,0],determinant,out=np.full(len(ids),np.nan),where=good)
        t=np.divide(u[:,0]*d[:,1]-u[:,1]*d[:,0],determinant,out=np.full(len(ids),np.nan),where=good)
        good &= (s>=-1e-6)&(t>=-1e-6)&(s+t<=1+1e-6)
        heights=a[:,2]*(1-s-t)+b[:,2]*s+c[:,2]*t
        normals=np.cross(triangles[:,1]-triangles[:,0],triangles[:,2]-triangles[:,0])
        result=[]
        for i in np.flatnonzero(good):
            n=normals[i];gradient=(-n[:2]/n[2]).tolist()
            unit=(n/np.linalg.norm(n))*(1 if n[2]>0 else -1)
            result.append({'height':float(heights[i]),'triangle':int(ids[i]),'barycentric':[float(1-s[i]-t[i]),float(s[i]),float(t[i])],
                'gradient_enu':gradient,'normal_enu':unit.tolist(),'normal_up_z':float(unit[2])})
        return result

    def segment_breakpoints(self,start,end):
        """Parameters where a straight legal XY segment crosses actual edges."""
        np=self.np
        start,end=np.asarray(start),np.asarray(end)
        direction=end-start
        length2=float(direction@direction)
        if length2<1e-12:return []
        ids=self.candidates(np.minimum(start,end),np.maximum(start,end))
        if not len(ids):return []
        tri=self.triangles[ids,:,:2]
        a=tri.reshape(-1,2);b=tri[:,[1,2,0],:].reshape(-1,2)
        edge=b-a;delta=a-start
        denominator=direction[0]*edge[:,1]-direction[1]*edge[:,0]
        good=abs(denominator)>1e-10
        t=np.divide(delta[:,0]*edge[:,1]-delta[:,1]*edge[:,0],denominator,out=np.full(len(a),np.nan),where=good)
        u=np.divide(delta[:,0]*direction[1]-delta[:,1]*direction[0],denominator,out=np.full(len(a),np.nan),where=good)
        good &= (t>1e-8)&(t<1-1e-8)&(u>=-1e-8)&(u<=1+1e-8)
        parameters=t[good].tolist()
        # Collinear edges still contribute their vertices to facet breakpoints.
        collinear=(abs(denominator)<=1e-10)&(abs(delta[:,0]*direction[1]-delta[:,1]*direction[0])<=1e-8)
        for row in a[collinear]:
            parameter=float((row-start)@direction/length2)
            if 1e-8<parameter<1-1e-8:parameters.append(parameter)
        if len(parameters)>100000:
            raise ValueError('Source segment crosses more than100000 triangle edges; inspect the mapped geometry')
        return parameters
