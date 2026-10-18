"""Explicit once-only vehicle-body packet preparation; no geometry/route edits.

Run only after ordinary network admission, with the source compute lease. The
existing admitted Surface owns its indexes; this module creates no world index.
The sole existing output changed is movement-manifest metadata, after the new
immutable sidecar and producer snapshot have been read back successfully.
"""
import argparse
import copy
import hashlib
import json
import math
from pathlib import Path

FRAME = 'native-centimetres-Xeast-Ysouth-Zup-v2'
MODEL = 'binary64-cm-query-on-float32-esu-cm-vertices-v2'
MAXIMUM_WINDOW_CANDIDATES = 1024
NATIVE_FRAME = {'schema_version':1, 'id':FRAME,
                'definition_sha256':'2099342528416aa9dcdceea63e6d2604974341d8248f3b1c7ccf287008759170'}
PHYSICAL_MODEL = {'schema_version':1, 'id':'ue5.8.3-cl58210709-chaos-cook-float32-cm-v1',
                  'definition_sha256':'e5ba1adad4fcab4e05d61d899babf8f6c789655cfe4637c393d7002f4f742428'}


def frame_known(value):
    return type(value) is dict and type(value.get('schema_version')) is int and value == NATIVE_FRAME


def current_frame(api):
    constructor = getattr(api, 'native_frame_record', None)
    frame = constructor() if callable(constructor) else None
    if not frame_known(frame):
        raise ValueError('Vehicle body producer needs the current sealed native ESU v2 API; restore the matching surface constructor')
    return frame


def require_frame(packet, role):
    if type(packet) is not dict or not frame_known(packet.get('native_frame')):
        raise ValueError(f'Vehicle body {role} needs the current sealed native ESU v2 frame; regenerate the matching source generation')


def dem_enclosure(api, surface, xy):
    """A sufficient enclosure, not a substitute DEM/provider selection.

    At this admitted WGS84 crop, inverse latitude/longitude derivatives are
    below2e-5 degrees/metre (radii>6.3Mm, cos(latitude)>.8). The bilinear DEM
    lies inside the extrema of every potentially consumed exact source pixel.
    Convex-ellipsoid sag is bounded using6Mm and the crop's angular L1 radius.
    Conservative uncertainty can therefore refuse a face; it cannot qualify
    one by moving its DEM reference toward that face.
    """
    np = api.np
    centre = np.array([(xy[0]+xy[2])/2, 0., (xy[1]+xy[3])/2])
    lat, lon, _ = api.city.geodetic([surface.origin+centre@api.city.local_basis()])[0]
    radius = math.hypot(xy[2]-xy[0], xy[3]-xy[1])/2
    margin = radius*2e-5+1e-8
    geo = [float(lat-margin), float(lon-margin), float(lat+margin), float(lon+margin)]
    crop = surface.base['bounds']
    if not (crop['south'] <= geo[0] <= geo[2] <= crop['north'] and crop['west'] <= geo[1] <= geo[3] <= crop['east']):
        raise ValueError('Vehicle body lookup footprint exceeds the admitted source crop')
    west, north = api.city.tile_xy(geo[2], geo[1], 15)
    east, south = api.city.tile_xy(geo[0], geo[3], 15)
    x0, y0 = math.floor(west*256-.5), math.floor(north*256-.5)
    x1, y1 = math.floor(east*256-.5)+1, math.floor(south*256-.5)+1
    if (x1-x0+1)*(y1-y0+1) > 256:
        raise ValueError('Vehicle body DEM window exceeds256 exact source pixels')
    values = [float(surface.elevation.tiles[(x//256, y//256)][y%256, x%256])
              for y in range(y0, y1+1) for x in range(x0, x1+1)]
    origin = surface.base['origin']
    angle = math.radians(max(abs(geo[i]-origin['latitude']) for i in (0,2))+
                         max(abs(geo[i]-origin['longitude']) for i in (1,3)))
    geoid = surface.base['vertical_reference']['estimated_local_geoid_offset_m']
    heights = [min(values)+geoid, max(values)+geoid]
    sag = (6_400_000*angle)**2/6_000_000+max(map(abs, heights))*angle*angle+.0001
    low = math.nextafter(heights[0]-origin['ellipsoidal_height_m']-sag-1e-6, -math.inf)
    high = math.nextafter(heights[1]-origin['ellipsoidal_height_m']+sag+1e-6, math.inf)
    return {'geographic_bounds':geo, 'pixels':[x0,y0,x1,y1], 'values':values,
            'height_bounds_m':[low,high], 'method':'bilinear-pixel-extrema-wgs84-sag-v1'}


def bindings(movement, source, support):
    return {'network':movement['network'], 'source_manifest':movement['source_manifest'],
            'support_surface':source['support_surface'], 'derived_terrain':source['derived_terrain'],
            'source_osm':movement['source_osm'], 'roads':source['roads'], 'dem':source['dem'],
            'algorithm':support['algorithm'], 'configurations':support['configuration_inputs']}


def eligible_layer_ref(ref):
    """Schema2 support metadata; never removes a physical first-hit candidate."""
    roles = ('support-top', 'physical-transition', 'physical-sidewall')
    if 'reconstruction_role' in ref:
        role = ref['reconstruction_role']
        if role not in roles or ref.get('kind') != 'inferred':
            raise ValueError('Vehicle body reconstruction role must be a known inferred support-top/physical-transition/physical-sidewall')
        eligible = role == 'support-top'
    else:
        eligible = True
    if 'support_eligible' in ref and (type(ref['support_eligible']) is not bool or ref['support_eligible'] != eligible):
        raise ValueError('Vehicle body support_eligible must be a literal Boolean matching the closed reconstruction role or ordinary support')
    return {**copy.deepcopy(ref), 'support_eligible':eligible}


def window_candidate_ids(ids, route, start, end, xy):
    """Bound complete physical candidates; never truncate/filter eligibility."""
    if not ids or len(ids) > MAXIMUM_WINDOW_CANDIDATES or len(ids) != len(set(ids)):
        raise ValueError(f'Vehicle body route {route} window {start}..{end}m at ENU bounds {xy} has {len(ids)} physical candidates; require1..{MAXIMUM_WINDOW_CANDIDATES} distinct complete blockers')
    return sorted(ids)


def prepare(api, surface, movement, network):
    np = api.np
    frame = current_frame(api)
    for role, packet in (('movement',movement), ('network',network), ('support',surface.support_manifest)):
        require_frame(packet, role)
    source = json.loads(api.admitted_record(movement['source_manifest'], api.ROOT/'data/prepared'))
    require_frame(source, 'source manifest')
    expected = bindings(movement, source, surface.support_manifest)
    if source['support_surface'] != surface.support_record or source['derived_terrain'] != surface.derived_record:
        raise ValueError('Vehicle body packet needs the same actual published source/support generation')
    if surface.support_manifest.get('physical_query_model') != PHYSICAL_MODEL:
        raise ValueError('Vehicle body packet needs the known conditional physical cook model in admitted support metadata')
    faces, lookup, routes = [], {}, []
    terrain_mesh = surface.support_manifest['native_assignment']['replacement_mesh_path']
    # The named property is already packed centimetres. Never pass .triangles
    # through another NativeTriangleIndex or multiply native_cm by100 again.
    for index in (surface.road_index, surface.terrain_index):
        if not hasattr(index, 'native_triangles_cm'):
            raise ValueError('Body packet needs explicit native_triangles_cm, not an implicit triangle unit')
        corner_order = getattr(index, 'native_corner_order', None)
        if not frame_known(getattr(index, 'native_frame', None)) or type(corner_order) is not tuple or corner_order != (0,2,1) or any(type(i) is not int for i in corner_order):
            raise ValueError('Vehicle body index needs the sealed native ESU v2 frame and final raw-corner order; rebuild the matching index')
        native = index.native_triangles_cm
        if not isinstance(native, np.ndarray) or native.dtype != np.float32 or native.ndim != 3 or native.shape[1:] != (3,3):
            raise ValueError('Vehicle body index needs literal float32 native ESU centimetre triangles shaped N by3 by3')
        if getattr(index, 'physical_model', None) != PHYSICAL_MODEL or not callable(getattr(index, 'physical_candidates', None)):
            raise ValueError('Vehicle body index needs the known physical cook model and physical candidate selector')
        membership = getattr(index, 'physical_membership', None)
        if membership is None or membership.shape != (len(index.native_triangles_cm),) or not np.issubdtype(membership.dtype, np.integer):
            raise ValueError('Vehicle body index needs explicit per-raw-ID physical cook membership')
    def face(role, ordinal):
        key = role, int(ordinal)
        if key in lookup: return lookup[key]
        index = surface.road_index if role == 'road' else surface.terrain_index
        if ordinal < 0 or ordinal >= len(index.native_triangles_cm) or int(index.physical_membership[ordinal]) != 1:
            raise ValueError(f'Vehicle body {role} raw face {ordinal} is cook-rejected or ambiguous; physical survivors required')
        vertices = index.native_triangles_cm[ordinal].astype(np.float64)
        if not np.isfinite(vertices).all() or np.abs(vertices).max() > 70000:
            raise ValueError(f'Vehicle body {role} raw face {ordinal} needs finite native centimetres inside the admitted local frame')
        normal = -np.cross(vertices[1]-vertices[0], vertices[2]-vertices[0])
        length = float(np.linalg.norm(normal))
        ref = eligible_layer_ref(surface.road.layer_refs[ordinal] if role == 'road' else surface.source3_terrain_refs[ordinal])
        if role == 'road' and 'source' in ref:
            mapping = surface.support_manifest['native_roads'][ref['source']]
            record, mesh, triangle = mapping['source'], mapping['native_mesh_path'], ref['source_triangle_index']
        else:
            record, mesh, triangle = surface.derived_record, terrain_mesh, ref['triangle']
        row = {'native_cm':vertices.tolist(), 'source':record, 'mesh_path':mesh, 'triangle':int(triangle),
               'road':role == 'road', 'layer_kind':ref['kind'], 'cook_state':1,
               'requires_interval':role != 'road' or ref['kind'] in ('inferred','derived-road'),
               'normal_z':float(normal[2]/length) if length else 0., 'layer_ref':ref}
        lookup[key] = len(faces);faces.append(row);return lookup[key]
    for route in network['routes']:
        if route['kind'] != 'vehicle': continue
        points, contexts, _ = api.support_source3.frozen_vehicle_path(api, route, surface)
        intervals = [surface.vehicle_interval(context, a, b, route['width_m'])
                     for (a,b),context in zip(zip(points,points[1:]),contexts)]
        samples = route['points'];distance=[0.]
        for a,b in zip(samples,samples[1:]): distance.append(distance[-1]+math.dist(a,b))
        windows=[];first=0
        while first < len(samples)-1:
            last=first+1
            while last+1 < len(samples) and distance[last+1]-distance[first] <= 1.:
                last+=1
            positions=np.asarray(samples[first:last+1])
            xy=[float(positions[:,0].min()-2.4),float(positions[:,1].min()-2.4),
                float(positions[:,0].max()+2.4),float(positions[:,1].max()+2.4)]
            ids=[]
            for role,index in (('road',surface.road_index),('terrain',surface.terrain_index)):
                ids.extend(face(role,int(i)) for i in index.physical_candidates(np.array(xy[:2]),np.array(xy[2:])))
            ids = window_candidate_ids(ids, route['id'], distance[first], distance[last], xy)
            local_intervals=[]
            for interval in intervals:
                lo=np.minimum(interval.start,interval.end)-interval.width/2
                hi=np.maximum(interval.start,interval.end)+interval.width/2
                if np.all(hi>=xy[:2]) and np.all(lo<=xy[2:]):
                    local_intervals.append({'start_m':list(interval.start),'end_m':list(interval.end),
                        'width_m':interval.width,'directed_edges':[list(v) for v in interval.edges]})
            # Optional cache domain. Actual pose containment and exact source
            # coverage are verified by the consumer; this polygon is no proof.
            a,b=positions[0,:2],positions[-1,:2];delta=b-a;length=float(np.linalg.norm(delta))
            direction=delta/length if length else np.array([1.,0.]);side=np.array([-direction[1],direction[0]])*1.4
            a=a-direction*2.4;b=b+direction*2.4
            domain=[p.tolist() for p in (a+side,b+side,b-side,a-side)]
            box=[[xy[0],xy[1]],[xy[2],xy[1]],[xy[2],xy[3]],[xy[0],xy[3]]]
            for p,q in zip(box,box[1:]+box[:1]):domain=api.support_source3.cut_polygon(domain,p,q,True)
            domain=api.native_xy_cm(domain)
            buildings=[r['polygon'] for r in surface.buildings if np.all(np.asarray(r['polygon']).max(axis=0)>=xy[:2]) and np.all(np.asarray(r['polygon']).min(axis=0)<=xy[2:])]
            windows.append({'start_m':distance[first], 'end_m':distance[last], 'xy_bounds_m':xy,
                'face_ids':ids, 'intervals':local_intervals, 'buildings_m':buildings,
                'dem_enclosure':dem_enclosure(api,surface,xy),'coverage_polygon_native_cm':domain.tolist()})
            first=last
        routes.append({'route_id':route['id'],'windows':windows})
    return {'schema_version':2,'frame':FRAME,'native_frame':copy.deepcopy(frame),'coordinate_model':MODEL,'physical_model':copy.deepcopy(PHYSICAL_MODEL),'bindings':expected,
            'faces':faces,'routes':routes,'bound':'Route-local complete current packed blockers; conservative DEM-policy cells; ordinary source profiles and native contact checks remain independent.'}


def main():
    import surface_network as api
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--movement-manifest',type=Path,default=api.OUT/'movement-manifest.json')
    args=parser.parse_args()
    raw=api.guarded_read(args.movement_manifest,api.ROOT/'data/prepared',32_000_000)
    manifest=json.loads(raw);movement=manifest['movement']
    if 'vehicle_body_support' in movement: raise ValueError('Existing body-support generation is immutable; prepare from a new movement receipt')
    network=json.loads(api.admitted_record(movement['network'],api.ROOT/'data/prepared'))
    current_frame(api)
    require_frame(movement, 'movement')
    require_frame(network, 'network')
    base=api.verify_base(api.ROOT/'data/prepared/manifest.json')
    _,points,ways,buildings=api.osm_sources(base)
    surface=api.Surface(base,buildings,vehicle_source=(points,{v['id']:v for v in ways},api.TurnRestrictions(api.osm_tree())))
    packet=prepare(api,surface,movement,network)
    producer=api.generation_code_record('vehicle_body_support.py')
    packet['producer']=producer
    packet['constructor_inputs']=[{'execution_path':'tools/data/'+name,'snapshot':api.generation_code_record(name)}
        for name in ('vehicle_body_support.py','surface_network.py','support_source3.py','build_city.py','support_surface.py','support_topology.py')]
    packet['constructor_configurations']=[{'execution_path':'sources/'+name,'snapshot':api.generation_configuration_record(name)}
        for name in ('surface_network.json','shibuya.json')]
    payload=api.encoded(packet)
    if len(payload)>32*1024*1024: raise ValueError('Vehicle body packet exceeds fixed32MiB Source role')
    path=api.OUT/'vehicle-body-support'/('body-'+hashlib.sha256(payload).hexdigest()+'.json')
    if path.exists():
        if api.guarded_read(path,api.OUT)!=payload: raise ValueError('Immutable body packet path has different bytes')
    else:api.guarded_write(path,payload)
    if api.guarded_read(path,api.OUT)!=payload: raise ValueError('Vehicle body packet readback differs')
    if api.guarded_read(args.movement_manifest,api.ROOT/'data/prepared',32_000_000)!=raw:
        raise ValueError('Movement manifest changed during body packet construction; refuse publication')
    manifest=copy.deepcopy(manifest);manifest['movement']['vehicle_body_support']=api.source_record(path)
    api.guarded_write(args.movement_manifest,api.encoded(manifest))
    print(json.dumps({'vehicle_body_support':manifest['movement']['vehicle_body_support'],
        'network_unchanged':api.source_record(api.ROOT/movement['network']['path'])==movement['network'],
        'faces':len(packet['faces']),'routes':len(packet['routes'])},indent=2))


if __name__=='__main__': main()
