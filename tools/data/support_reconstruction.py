"""Explicit staged reconstruction roles; never a physical candidate filter.

Old road-bank stitch admission stays in support_source3. New geometry is staged
without an active alias switch; actual corridor/body/native qualification is separate.
"""
from fractions import Fraction as Q
import collections
import copy

KIND = 'inferred-ground-reconstruction'
ROLES = frozenset(('support-top', 'physical-transition', 'physical-sidewall'))
POLICY = {'schema_version':1, 'visible_collision_stream':'identical',
          'physical_population':'all-cook-survivors-raw-winding',
          'support_query_backfaces':'blocker-first-then-signed-eligibility',
          'native_backface_qualification':'PENDING_ACTUAL_IMPORT'}


def require_policy(ledger):
    if ledger.get('reconstruction', {}).get('policy') != POLICY:
        raise ValueError('Source3 reconstruction requires the explicit staged physical/backface policy')
    if not ledger['reconstruction'].get('original_query_artifacts'):
        raise ValueError('Source3 reconstruction must retain original query poses/failures separately from changed geometry')


def check_label(face):
    if face.get('reconstruction_role') not in ROLES:
        raise ValueError('Source3 reconstruction face requires a closed support-top/physical-transition/physical-sidewall role')
    if 'parent_triangle' in face or 'original_terrain_parent' in face:
        raise ValueError('Source3 inferred reconstruction cannot claim original terrain identity')
    check_anchors(face.get('corner_ancestry'))


def check_anchors(anchors):
    if not isinstance(anchors, list) or len(anchors) != 3:
        raise ValueError('Source3 reconstruction needs ordered source-face ancestry for all three corners')
    for anchor in anchors:
        weights = [Q(x) for x in anchor.get('barycentric_q', [])]
        if len(weights) != 3 or any(w < 0 or w > 1 for w in weights) or sum(weights) != 1:
            raise ValueError('Source3 reconstruction ancestry must be exact source-face barycentrics')
        if not all(type(anchor.get(k)) is int and anchor[k] >= 0 for k in ('mesh','primitive','triangle')):
            raise ValueError('Source3 reconstruction ancestry needs literal source mesh/primitive/triangle IDs')
        if len(anchor.get('source_enu_uv_q', [])) != 5:
            raise ValueError('Source3 reconstruction needs exact authored ENU/UV values, never native-frame relabelling')


def face_state(api, rows):
    """Actual decoded GLB -> ESU states, including absent and DOWN remnants."""
    np = api.np
    rows = np.asarray(rows, dtype=np.float64)
    if rows.shape != (3,8) or not np.isfinite(rows).all():
        raise ValueError('Source3 reconstruction needs three finite decoded position/UV/NORMAL rows')
    glb = rows[:, [0,2,1]]
    glb_normal = np.cross(glb[1]-glb[0], glb[2]-glb[0])
    native = (rows[[0,2,1], :3]*[100.,-100.,100.]).astype(np.float32)
    physical = -np.cross(native[1].astype(float)-native[0], native[2].astype(float)-native[0])
    expected = rows[:,5:8][:,[0,2,1]]*[1.,-1.,1.]
    state = 'zero3D' if not np.any(physical) else ('UP' if physical[2] > 0 else 'DOWN' if physical[2] < 0 else 'vertical')
    return {'native_cm':native.tolist(), 'cook_state':int(api.native_cook_membership(native[None])[0]),
            'signed_native_normal':physical.tolist(), 'orientation':state,
            'GLB_nonzero3D':bool(np.any(glb_normal)),
            'GLB_NORMAL_coherent':bool(np.any(glb_normal) and np.all(rows[:,5:8]@glb_normal > 0)),
            'native_NORMAL_coherent':bool(np.any(physical) and np.all(expected@physical > 0)),
            'raw_corner_order':[0,2,1], 'support_eligibility':'NOT_EVALUATED_BEFORE_FIRST_BLOCKER'}



def decoded_face(api, part, ordinal):
    attrs,indices=part[2],part[3]
    corners=indices[ordinal]
    return api.np.column_stack((attrs['POSITION'][corners][:,[0,2,1]],attrs['TEXCOORD_0'][corners],attrs['NORMAL'][corners]))


def parent_anchor_cache(api, source3, ledger, parent_parts):
    import json
    parent=json.loads(source3.record(api,ledger['parent_support_surface'],'authoritative reconstruction parent',api.SUPPORT_MANIFEST_LIMIT_BYTES))
    source3.require_frame(parent,'authoritative reconstruction parent')
    authority=parent['derived_terrain']
    if parent.get('schema_version')!=2 or authority!=ledger['parent_derived_terrain']:
        raise ValueError('Source3 parent anchor authority differs from the admitted schema2 parent full record')
    return {(authority['path'],authority['sha256']):(copy.deepcopy(authority),parent_parts)}


def anchor_parts(api, source3, record, cache):
    key=(record['path'],record['sha256'])
    if key not in cache:
        parts=source3.primitives(api,source3.record(api,record,'reconstruction immutable anchor',32_000_000))[1]
        cache[key]=(copy.deepcopy(record),parts)
    if cache[key][0]!=record:raise ValueError('Reconstruction anchor cache full-record mismatch')
    return cache[key][1]


def check_ancestry(api, source3, face, rows, cache):
    if face['kind'] == KIND: check_label(face)
    else: check_anchors(face.get('corner_ancestry'))
    for i, anchor in enumerate(face['corner_ancestry']):
        record = anchor['source_record']
        part = next((p for p in anchor_parts(api,source3,record,cache) if p[:2] == (anchor['mesh'], anchor['primitive'])), None)
        if part is None: raise ValueError('Source3 reconstruction anchor names a missing source primitive')
        j = source3.integer(anchor['triangle'], 'reconstruction anchor triangle', len(part[3]))
        source = decoded_face(api,part,j)[:, :5]
        raw=anchor.get('immutable_raw_geometry_record')
        if raw is not None:
            raw_key=('raw-geometry',raw['path'],raw['sha256'])
            if raw_key not in cache:
                doc,binary=api.city.read_glb(source3.record(api,raw,'original GSI geometry',32_000_000));primitive=doc['meshes'][anchor['mesh']]['primitives'][anchor['primitive']]
                cache[raw_key]=(copy.deepcopy(raw),(api.accessor(doc,binary,primitive['attributes']['POSITION']),api.accessor(doc,binary,primitive['indices']).reshape(-1,3)))
            if cache[raw_key][0]!=raw:raise ValueError('Original GSI geometry cache full-record mismatch')
            positions,indices=cache[raw_key][1]
            if not api.np.array_equal(positions[indices[j]][:,[0,2,1]],source[:,:3]):
                raise ValueError('Original GSI geometry and photo UV authority have different actual source positions')
        w = [Q(x) for x in anchor['barycentric_q']]
        exact = [sum(w[k]*Q(float(source[k,c])) for k in range(3)) for c in range(5)]
        if exact != [Q(x) for x in anchor['source_enu_uv_q']]:
            raise ValueError('Source3 reconstruction authored vertex/UV differs from immutable source-face ancestry')
        packed = api.np.asarray([float(x) for x in exact], dtype=api.np.float32).astype(float)
        if not api.np.array_equal(rows[i,:5], packed):
            raise ValueError('Source3 reconstruction actual GLB vertex/UV differs from its once-serialized source ancestry')



def owned_polygon(ledger):
    points = [[Q(x) for x in p] for p in ledger['reconstruction']['owned_source_enu_m_q']]
    if not 3 <= len(points) <= 64 or any(len(p) != 2 for p in points):
        raise ValueError('Source3 reconstruction ownership requires3..64 exact source-ENU polygon corners')
    turns = [(b[0]-a[0])*(c[1]-b[1])-(b[1]-a[1])*(c[0]-b[0]) for a,b,c in zip(points,points[1:]+points[:1],points[2:]+points[:2])]
    if not any(turns) or not (all(t >= 0 for t in turns) or all(t <= 0 for t in turns)):
        raise ValueError('Source3 reconstruction ownership requires the declared convex footprint, no bounding-box replacement')
    return points


def check_inside(face, polygon):
    for anchor in face['corner_ancestry']:
        point = [Q(x) for x in anchor['source_enu_uv_q'][:2]]
        signs = [(b[0]-a[0])*(point[1]-a[1])-(b[1]-a[1])*(point[0]-a[0]) for a,b in zip(polygon,polygon[1:]+polygon[:1])]
        if not (all(t >= 0 for t in signs) or all(t <= 0 for t in signs)):
            raise ValueError('Source3 reconstruction authored geometry extends outside its declared owned footprint')


def check_outside_partition(source3, original, fragments, polygon):
    """Exact authored outside conservation, distinct from packed physical gaps."""
    expected = source3.uncovered_exact(original, [polygon])
    actual = [[[Q(x) for x in a['source_enu_uv_q'][:2]] for a in f['corner_ancestry']] for f in fragments]
    if any(source3.uncovered_exact(p, actual) for p in expected) or any(source3.uncovered_exact(p, expected) for p in actual):
        raise ValueError('Source3 reconstruction loses or invents original geometry outside its owned footprint')
    area = lambda p:abs(sum(a[0]*b[1]-a[1]*b[0] for a,b in zip(p,p[1:]+p[:1])))/2
    if sum(map(area,actual)) != sum(map(area,expected)):
        raise ValueError('Source3 reconstruction duplicates outside fragments; area/coverage must agree exactly')
    return str(sum(map(area,expected)))


def new_deletion_partition(api, s3, ledger, parent_count):
    """The authenticated legacy set and explicit new set exhaust removals."""
    import json
    def ids(value):
        if type(value) is not list or any(type(i) is not int or not 0 <= i < parent_count for i in value) or value != sorted(set(value)):
            raise ValueError('Reconstruction deletion partition requires sorted unique literal integer parent IDs in range')
        return set(value)
    all_deleted = ids(ledger['deleted_parent_triangles'])
    baseline = ledger['reconstruction'].get('legacy_baseline')
    prior = json.loads(s3.record(api,baseline['ledger'],'authenticated legacy deletions',api.SUPPORT_MANIFEST_LIMIT_BYTES)) if baseline else {}
    legacy = ids(prior.get('deleted_parent_triangles',[]))
    new = ids(ledger['reconstruction'].get('new_deleted_parent_triangles'))
    if legacy - all_deleted or new & legacy or new != all_deleted - legacy:
        raise ValueError('Reconstruction deletion partition must equal all removals minus authenticated legacy removals, without overlap or omissions')
    return sorted(new)


def validate(api, source3, ledger, labels, *, parent_surface=None):
    require_policy(ledger)
    _, parts = source3.primitives(api, source3.record(api, ledger['terrain_patch'], 'reconstruction patch'))
    rows = source3.triangle_rows(parts); cache = {}; states=[]; polygon=owned_polygon(ledger)
    _,parent_parts=source3.primitives(api,source3.record(api,ledger['parent_derived_terrain'],'reconstruction parent mesh'))
    parent_rows=source3.triangle_rows(parent_parts);fragments=collections.defaultdict(list)
    cache=parent_anchor_cache(api,source3,ledger,parent_parts)
    if len(rows)!=len(labels):raise ValueError('Reconstruction labels must cover every actual decoded patch triangle')
    legacy,legacy_evidence=validate_legacy_prefix(api,source3,ledger,labels,rows,parent_surface)
    new_deleted = new_deletion_partition(api,source3,ledger,len(parent_rows))
    for face, row in zip(labels[legacy:], rows[legacy:]):
        if face['kind'] == KIND:
            check_ancestry(api, source3, face, row, cache);check_inside(face,polygon)
            states.append({'patch_triangle':face['patch_triangle'], 'reconstruction_role':face['reconstruction_role'], **face_state(api,row)})
        else:
            if face['parent_triangle'] not in new_deleted:
                raise ValueError('New reconstruction fragment must belong to the new deletion partition, never an authenticated legacy removal')
            check_ancestry(api,source3,face,row,cache)
            for anchor in face['corner_ancestry']:
                if anchor['source_record'] != ledger['parent_derived_terrain'] or anchor['mesh'] != 0 or anchor['primitive'] != 0 or anchor['triangle'] != face['parent_triangle']:
                    raise ValueError('Reconstruction retained fragment must interpolate its literal immutable parent face')
            fragments[face['parent_triangle']].append(face)
    outside={str(i):check_outside_partition(source3,[[Q(float(x)) for x in v[:2]] for v in parent_rows[i]],fragments[i],polygon) for i in new_deleted}
    return {'scope':'STAGED_RECONSTRUCTION_NOT_MOVEMENT_OR_NATIVE_ACCEPTANCE',
            'source_exact_outside_partition_m2_q':outside,'legacy_baseline_validation':legacy_evidence,
            'road_outside_partition_m2_q':validate_road_trims(api,source3,ledger,polygon),
            'changed_face_coverage':'PENDING_ACTUAL_COMPLETE_POSED_DOMAIN',
            'reconstruction_faces':states, 'all_raw_faces_retained':True,
            'physical_role_filter_applied':False, 'original_query_artifacts':copy.deepcopy(ledger['reconstruction']['original_query_artifacts']),
            'outside_conservation':'Exact authored per-parent outside area and bidirectional domain conservation checked independently; actual packed projected differences remain measurable, not a universal UP/zero-gap veto.'}


def stage_generation(api, base, edit_path, stage):
    """New geometry at immutable paths; never alias interception/restoration.

    A genuine admitted current-frame schema2 parent and complete edit ledger
    are prerequisites. The caller performs one real staged Surface/body replay.
    """
    import json
    source3 = api.support_source3
    edit_path = api.admit_path(edit_path, api.ROOT/'data/source', regular=True)
    payload = api.guarded_read(edit_path,api.ROOT/'data/source',api.SUPPORT_MANIFEST_LIMIT_BYTES)
    ledger = json.loads(payload); require_policy(ledger)
    source3.require_frame(ledger,'staged reconstruction ledger')
    parent = json.loads(source3.record(api,ledger['parent_support_surface'],'genuine reconstruction parent',api.SUPPORT_MANIFEST_LIMIT_BYTES))
    source3.require_frame(parent,'staged reconstruction parent')
    if parent.get('schema_version') != 2:
        raise ValueError('Staged reconstruction needs a genuine immutable current-frame schema2 parent, never an old marker or recursive Source3')
    stage = api.admit_path(stage,api.OUT/'generations')
    if stage.parent != api.OUT/'generations': raise ValueError('Staged reconstruction requires a direct owned generation child')
    api.guarded_mkdir(stage,api.OUT)
    if any(stage.iterdir()): raise ValueError('Staged reconstruction generation must be new and empty; no retry overwrite')
    def inventory():
        writers = [api.source_record(api.ROOT/'tools/data'/name,api.ROOT/'tools/data')
                   for name in ('support_source3.py','support_reconstruction.py')]
        return source3.unique_records([*api.support_generation_inventory(base),*writers,
                                       api.source_record(edit_path),*source3.recipe_records(ledger)])
    inputs = inventory()
    for item in source3.recipe_records(ledger): source3.record(api,item,'staged reconstruction input')
    document,attrs,indices,retained,labels = source3.assemble_terrain(api,ledger,parent)
    terrain = source3.write_mesh(api,stage,'terrain-support.glb',attrs,indices,document['materials'])
    _,_,native_roads,derived_roads = source3.apply_road_overrides(api,parent,ledger,stage)
    evidence = validate(api,source3,ledger,labels)
    algorithm = {**api.generation_code_record('support_surface.py'),
        'integration':api.generation_code_record('surface_network.py'),
        'topology':api.generation_code_record('support_topology.py'),
        'build_city':api.generation_code_record('build_city.py'),
        'edits':api.generation_code_record('support_source3.py'),
        'reconstruction':api.generation_code_record('support_reconstruction.py')}
    configurations = {'surface_network':api.generation_configuration_record('surface_network.json'),
                      'city':api.generation_configuration_record('shibuya.json')}
    after = inventory()
    if inputs != after: raise ValueError('Staged reconstruction actual source/code inputs changed; no alias switched')
    for item in inputs:
        data=api.guarded_read(api.ROOT/item['path'],api.ROOT,max(item['bytes'],1))
        if len(data)!=item['bytes'] or api.sha(data)!=item['sha256']:
            raise ValueError('Staged reconstruction input changed before manifest readback: '+item['path'])
    preservation = {'schema_version':1,'inputs_before':inputs,'inputs_after':after,'unchanged':True,
                    'data_bindings':api.generation_bindings(algorithm,configurations),'source3_writer':algorithm['edits'],
                    'reconstruction_writer':algorithm['reconstruction']}
    inventory_payload=api.encoded(preservation)
    inventory=api.ROOT/'data/source/provenance'/('support-input-inventory-'+api.sha(inventory_payload)+'.json')
    api.guarded_write(inventory,inventory_payload,api.ROOT/'data/source/provenance')
    api.guarded_write(stage/'surface-edits.json',payload)
    manifest = {k:copy.deepcopy(parent[k]) for k in ('frame','origin','vertical_reference','inputs','atlas','attribution','native_assignment')}
    manifest.update(native_frame=api.native_frame_record(),schema_version=3,coordinate_model=source3.COORDINATE_MODEL,
       staged_reconstruction=True,parent_support_surface=ledger['parent_support_surface'],
       surface_edits=api.source_record(stage/'surface-edits.json'),derived_terrain=terrain,derived_roads=derived_roads,
       physical_query_model=api.native_physical_model_record(),native_roads=native_roads,algorithm=algorithm,
       configuration_inputs=configurations,source_preservation=api.source_record(inventory),evidence=evidence,
       original_query_artifacts=copy.deepcopy(ledger['reconstruction']['original_query_artifacts']),
       policy='Explicit staged new reconstruction; original poses/failures are not changed-geometry expected hits',
       native_correspondence='PENDING_NEW_EXPECTATIONS_AND_ACTUAL_NATIVE; no old1040 proof relabelled')
    manifest_payload=api.encoded(manifest)
    if len(manifest_payload)>api.SUPPORT_MANIFEST_LIMIT_BYTES: raise ValueError('Staged reconstruction manifest exceeds unchanged role cap')
    path=stage/'support-surface-manifest.json';api.guarded_write(path,manifest_payload)
    if api.guarded_read(path,stage,api.SUPPORT_MANIFEST_LIMIT_BYTES)!=manifest_payload:
        raise ValueError('Staged reconstruction actual manifest readback differs')
    return {'status':'staged-not-active-not-movement-qualified','support_surface':api.source_record(path),
            'evidence':evidence,'active_alias_written':False}


def geometry_identity(record):
    return record['bytes'], record['sha256']


def reencode_legacy_native(ledger):
    """Reflect declared historical native operands, preserving XYZ grouping."""
    import math
    if type(ledger) is not dict or ledger.get('coordinate_model') != 'native-float32-centimetres-v1' or 'native_frame' in ledger:
        raise ValueError('Historical native re-encoding requires the exact old unframed coordinate model, never a current/unknown ledger')
    def point(value, width, path):
        if type(value) is not list or len(value) != width:
            raise ValueError('Historical native coordinate shape is malformed at '+path)
        for v in value:
            if type(v) not in (int,float):raise ValueError('Historical native coordinates require literal finite numeric leaves at '+path)
            try:finite=math.isfinite(v)
            except OverflowError:finite=False
            if not finite:raise ValueError('Historical native coordinates require literal finite numeric leaves at '+path)
        return [v if i != 1 else -v for i,v in enumerate(value)]
    def xyz(value,path):
        if type(value) is list and len(value)==3 and all(type(v) is not list for v in value):return point(value,3,path)
        if type(value) is list and value and all(type(v) is list for v in value):
            return [point(v,3,path+'['+str(i)+']') for i,v in enumerate(value)]
        raise ValueError('Historical native XYZ requires one point or a nonempty array of points at '+path)
    def encode(value,path='ledger',key=None):
        if key in ('original_native_cm','replacement_native_cm'):return xyz(value,path)
        if key=='native_xy_polygons_cm':
            if type(value) is not list or not value or any(type(p) is not list or len(p)<3 for p in value):
                raise ValueError('Historical native XY requires nonempty polygons with at least three points at '+path)
            return [[point(p,2,path+'['+str(i)+']['+str(j)+']') for j,p in enumerate(polygon)] for i,polygon in enumerate(value)]
        if isinstance(value,dict):return {k:encode(v,path+'.'+k,k) for k,v in value.items()}
        if isinstance(value,list):return [encode(v,path+'['+str(i)+']') for i,v in enumerate(value)]
        return value
    return encode(ledger)


def rebuild_legacy_baseline(api, new_parent_record, original_manifest_record, stage):
    """Re-encode numeric ledger operands, actually reconstruct, require byte identity.

    Historical native observations stay historical. This creates no native proof
    or world index and never stamps an old cache as a current runtime generation.
    """
    import json
    s3=api.support_source3
    parent=json.loads(s3.record(api,new_parent_record,'genuine schema2 parent',api.SUPPORT_MANIFEST_LIMIT_BYTES));s3.require_frame(parent,'genuine schema2 parent')
    if parent.get('schema_version')!=2:raise ValueError('Reconstruction composition requires genuine schema2 parent')
    old=json.loads(s3.record(api,original_manifest_record,'historical Source3 geometry',api.SUPPORT_MANIFEST_LIMIT_BYTES))
    original_parent=json.loads(s3.record(api,old['parent_support_surface'],'historical Source2 geometry',api.SUPPORT_MANIFEST_LIMIT_BYTES))
    if geometry_identity(parent['derived_terrain'])!=geometry_identity(original_parent['derived_terrain']):
        raise ValueError('Genuine parent is valid but its geometry differs; preserve it and require an explicit ancestry rebase, never guess flat IDs')
    ledger=json.loads(s3.record(api,old['surface_edits'],'historical source-ENU recipe',api.SUPPORT_MANIFEST_LIMIT_BYTES))
    if ledger.get('coordinate_model')!='native-float32-centimetres-v1' or ledger.get('native_frame') is not None:raise ValueError('Historical composition expects the declared old unframed source-ENU recipe, not an unknown frame')
    ledger=reencode_legacy_native(ledger);ledger.update(native_frame=api.native_frame_record(),coordinate_model=s3.COORDINATE_MODEL,
        parent_support_surface=new_parent_record,parent_derived_terrain=parent['derived_terrain'])
    api.guarded_mkdir(stage,api.OUT)
    document,attrs,indices,retained,labels=s3.assemble_terrain(api,ledger,parent)
    terrain=s3.write_mesh(api,stage,'terrain-support.glb',attrs,indices,document['materials'])
    _,_,roads,derived=s3.apply_road_overrides(api,parent,ledger,stage)
    if geometry_identity(terrain)!=geometry_identity(old['derived_terrain']):
        raise ValueError('Current numeric recipe reassembly differs from historical Source3 GLB; no composition admitted')
    if [(r['actor_label'],geometry_identity(r['source'])) for r in roads]!=[(r['actor_label'],geometry_identity(r['source'])) for r in old['native_roads']]:
        raise ValueError('Current numeric recipe road reassembly differs from historical Source3 geometry')
    path=api.ROOT/'data/source/provenance'/('source3-legacy-reencoded-'+api.sha(api.encoded(ledger))+'.json')
    api.guarded_write(path,api.encoded(ledger),api.ROOT/'data/source/provenance')
    return {'ledger':api.source_record(path),'derived_terrain':terrain,'native_roads':roads,
        'derived_roads':[{'source':row['source'],'record':copy.deepcopy(row['record'])} for row in derived],
        'original_manifest':original_manifest_record,'new_parent':new_parent_record,
        'old_geometry_reproduced':True,'native_observations':'HISTORICAL_NOT_RELABELLED'}


def read_legacy_roads(api,s3,parent,prior,baseline):
    """Read the baseline's own stream in an isolated parent context."""
    import json
    mappings=baseline.get('derived_roads')
    sources=sorted({e['source'] for e in prior.get('road_overrides',[])})
    if type(mappings) is not list or any(type(m) is not dict or set(m)!={'source','record'} or type(m['source']) is not int for m in mappings) or [m['source'] for m in mappings]!=sources:
        raise ValueError('Legacy baseline road context requires its complete sorted unique source-to-record mappings')
    native=baseline['native_roads']
    for m in mappings:
        if not 0<=m['source']<len(native) or m['record']!=native[m['source']]['source']:
            raise ValueError('Legacy baseline road context record differs from its own authenticated native-road mapping')
        s3.record(api,m['record'],'legacy baseline derived road',32_000_000)
    context={**parent,'_source3_derived_roads':copy.deepcopy(mappings)}
    roads,refs,actual,derived=s3.apply_road_overrides(api,context,prior)
    if actual!=native:raise ValueError('Legacy baseline road context readback changed its complete native mapping')
    original=json.loads(s3.record(api,baseline['original_manifest'],'historical baseline road provenance',api.SUPPORT_MANIFEST_LIMIT_BYTES))
    historical=original.get('derived_roads',[])
    if [d['source'] for d in derived]!=[d['source'] for d in historical]:
        raise ValueError('Legacy baseline road context does not reproduce the historical affected actors')
    for row,old in zip(derived,historical):
        if geometry_identity(row['record'])!=geometry_identity(old['record']) or row['face_map']!=old['face_map']:
            raise ValueError('Legacy baseline road context changed historical road bytes or full face-map provenance')
    return roads,refs


def validate_legacy_prefix(api,s3,ledger,labels,rows,parent_surface):
    import json
    baseline=ledger['reconstruction'].get('legacy_baseline')
    if baseline is None:
        if any(e.get('reconstruction_trim') is not True for e in ledger.get('road_overrides',[])):
            raise ValueError('Reconstruction road override partition requires authenticated legacy entries or explicit new trims')
        if any(f['kind']=='inferred-ground-road' for f in labels):raise ValueError('Legacy inferred faces need the authenticated unchanged prefix')
        return 0,'NO_LEGACY_PREFIX'
    prior=json.loads(s3.record(api,baseline['ledger'],'reassembled legacy ledger',api.SUPPORT_MANIFEST_LIMIT_BYTES));s3.require_frame(prior,'reassembled legacy ledger')
    if prior['parent_support_surface']!=ledger['parent_support_surface'] or prior['parent_derived_terrain']!=ledger['parent_derived_terrain']:
        raise ValueError('Legacy prefix and reconstruction must bind the same genuine schema2 parent')
    legacy_roads=prior.get('road_overrides',[]); roads=ledger.get('road_overrides',[])
    if roads[:len(legacy_roads)] != legacy_roads or any(e.get('reconstruction_trim') is not True for e in roads[len(legacy_roads):]):
        raise ValueError('Reconstruction road override partition must retain the exact authenticated legacy prefix and explicit new trim suffix')
    old_keys={s3.road_key(e) for e in legacy_roads}; new_keys=[s3.road_key(e) for e in roads[len(legacy_roads):]]
    if len(set(new_keys))!=len(new_keys) or old_keys.intersection(new_keys):
        raise ValueError('Reconstruction road override partition requires disjoint unique legacy and new trim faces')
    n=len(prior['patch_faces'])
    if labels[:n]!=prior['patch_faces']:raise ValueError('Reconstruction changed the authenticated legacy patch prefix')
    _,parts=s3.primitives(api,s3.record(api,prior['terrain_patch'],'legacy patch'))
    if not api.np.array_equal(rows[:n],s3.triangle_rows(parts)):raise ValueError('Reconstruction changed legacy patch attribute bytes')
    for p in prior['deleted_parent_triangles']:
        if p not in ledger['deleted_parent_triangles']:raise ValueError('Reconstruction restored a legacy deleted parent outside ownership')
    original=json.loads(s3.record(api,baseline['original_manifest'],'historical original geometry',api.SUPPORT_MANIFEST_LIMIT_BYTES))
    if geometry_identity(baseline['derived_terrain'])!=geometry_identity(original['derived_terrain']):
        raise ValueError('Authenticated legacy baseline must reproduce the exact named historical GLB')
    s3.record(api,baseline['derived_terrain'],'actual reassembled legacy GLB')
    if parent_surface is None:return n,'PENDING_REAL_STAGED_READER; reassembly bytes bound separately'
    parent=json.loads(s3.record(api,ledger['parent_support_surface'],'genuine parent',api.SUPPORT_MANIFEST_LIMIT_BYTES))
    _,attrs,indices,retained,prior_labels=s3.assemble_terrain(api,prior,parent)
    _,actual_parts=s3.primitives(api,s3.record(api,baseline['derived_terrain'],'actual legacy readback'))
    if len(actual_parts)!=1 or not api.np.array_equal(actual_parts[0][3],indices) or any(not api.np.array_equal(actual_parts[0][2][k],v) for k,v in attrs.items()):
        raise ValueError('Actual legacy baseline differs from full current parent-plus-recipe assembly')
    roads,refs=read_legacy_roads(api,s3,parent,prior,baseline)
    previous_refs=getattr(parent_surface,'_source3_new_road_refs',None);parent_surface._source3_new_road_refs=refs
    try:
        return n,s3.validate_local_geometry(api,prior,parent_surface,s3.native_metres(attrs['POSITION'][:,[0,2,1]])[indices],roads,retained,prior_labels)
    finally:parent_surface._source3_new_road_refs=previous_refs


def validate_road_trims(api,s3,ledger,polygon):
    result={};cache={}
    import json
    parent=json.loads(s3.record(api,ledger['parent_support_surface'],'road trim parent',api.SUPPORT_MANIFEST_LIMIT_BYTES))
    for edit in ledger.get('road_overrides',[]):
        if not edit.get('reconstruction_trim'):continue # legacy edits are checked on the authenticated baseline
        s3.require_equal(edit['source_record'],parent['native_roads'][edit['source']]['source'],'trim raw road mapping')
        _,parts=s3.primitives(api,s3.record(api,edit['source_record'],'immutable trimmed road'))
        part=next(p for p in parts if p[:2]==(edit['mesh'],edit['primitive']))
        original=decoded_face(api,part,s3.integer(edit['triangle'],'trimmed road triangle',len(part[3])))
        _,parts=s3.primitives(api,s3.record(api,edit['replacement'],'outside road fragments'))
        replacements=s3.triangle_rows(parts);selected=edit['replacement_patch_triangles'];anchors=edit['replacement_source_ancestry']
        if [f['patch_triangle'] for f in anchors]!=selected:raise ValueError('Road trim ancestry must match every selected output in order')
        declared={(e['patch_triangle'],e['vertex']):e for e in edit['replacement_vertex_anchors']}
        if len(declared)!=len(edit['replacement_vertex_anchors']) or set(declared)!={(i,j) for i in selected for j in range(3)}:
            raise ValueError('Reconstruction road trim requires every actual replacement corner exactly once')
        for face,i in zip(anchors,selected):
            check_ancestry(api,s3,face,replacements[i],cache)
            for a in face['corner_ancestry']:
                if a['source_record']!=edit['source_record'] or (a['mesh'],a['primitive'],a['triangle'])!=(edit['mesh'],edit['primitive'],edit['triangle']):
                    raise ValueError('Outside road fragment must retain its exact raw face/UV ancestry')
            for j,a in enumerate(face['corner_ancestry']):
                entry=declared[i,j];expected={'kind':'source-road-plane-interpolation','source':edit['source'],'mesh':edit['mesh'],'primitive':edit['primitive'],'triangle':edit['triangle'],'barycentric':[float(Q(w)) for w in a['barycentric_q']]}
                if entry.get('kind')!='source-road-native-stitch' or entry['source_anchor']!=expected:
                    raise ValueError('Reconstruction road corner must retain its exact source interpolation')
                initial,_,_=s3.source_interpolation(expected,original[:,:3],'reconstruction road')
                actual=s3.native_centimetres(replacements[i,j,:3]);s3.check_native_stitch(entry,initial,actual,'reconstruction road',framed=True)
        result[str(s3.road_key(edit))]=check_outside_partition(s3,[[Q(float(x)) for x in v[:2]] for v in original],anchors,polygon)
    return result


def support_core_triangles(api, row):
    """Bounded Source-exact boundary triangulation, including both packed models."""
    import functools
    np = api.np
    vertices = row.get('vertices')
    if row.get('classification') != 'inferred-graded-support-core' or type(vertices) is not list or not 3 <= len(vertices) <= 64:
        raise ValueError('Source3 core triangulation needs one owned support-core polygon with3..64 ordered boundary corners')
    if any(type(p) not in (list,tuple) or len(p) != 5 or any(type(v) not in (str,int,float,Q) for v in p) for p in vertices):
        raise ValueError('Source3 core triangulation requires five literal finite source ENU/UV coordinates per corner')
    source = [[Q(v) for v in p] for p in vertices]
    with np.errstate(over='ignore',invalid='ignore'):
        glb = np.asarray([[float(v) for v in p] for p in source],dtype='<f4').astype(float)
        native = (glb[:,:3]*100).astype(np.float32).astype(float)
    if not np.isfinite(glb).all() or not np.isfinite(native).all():
        raise ValueError('Source3 core triangulation coordinates exceed finite GLB/native float32 storage')
    # Fractions are made FROM the actual rounded buffers, never before rounding.
    # Source-working cm equals inverse ESU/corner021 physical packing exactly.
    models = [source,[[Q(float(v)) for v in p] for p in glb],
              [[Q(float(v)) for v in p] for p in native]]
    def cross(a,b,c): return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    def area(points): return sum(a[0]*b[1]-a[1]*b[0] for a,b in zip(points,points[1:]+points[:1]))
    authored_area = area(source)
    if not authored_area: raise ValueError('Source3 core triangulation has zero exact source projected area')
    sign = 1 if authored_area > 0 else -1
    if any(sign*cross(a,b,c) < 0 for a,b,c in zip(source,source[1:]+source[:1],source[2:]+source[:2])):
        raise ValueError('Source3 core triangulation requires a convex exact source polygon')
    @functools.lru_cache(None)
    def determinants(i,k,j): return tuple(cross(p[i],p[k],p[j]) for p in models)
    @functools.lru_cache(None)
    def solve(i,j):
        if j == i+1: return ()
        for k in sorted(range(i+1,j),key=lambda k:abs(determinants(i,k,j)[2]),reverse=True):
            d = determinants(i,k,j)
            if sign*d[0] <= 0 or any(sign*v < 0 for v in d[1:]): continue
            left = solve(i,k)
            if left is None: continue
            right = solve(k,j)
            if right is not None: return left+right+((i,k,j),)
        return None
    triangles = solve(0,len(source)-1)
    if triangles is None:
        raise ValueError('Source3 core polygon has no nonzero-source triangulation consistent with both GLB/native boundary orientations')
    edges = collections.Counter((a,b) for t in triangles for a,b in zip(t,t[1:]+t[:1]))
    boundary = collections.Counter((i,(i+1)%len(source)) for i in range(len(source)))
    if collections.Counter({e:n-edges[e[::-1]] for e,n in edges.items() if n>edges[e[::-1]]}) != boundary:
        raise ValueError('Source3 core triangulation changed directed boundary incidence')
    for model,points in enumerate(models):
        values = [determinants(*t)[model] for t in triangles]
        if any(sign*v < 0 or (model == 0 and not v) for v in values) or sum(values) != area(points) or sum(map(abs,values)) != abs(area(points)):
            raise ValueError('Source3 core triangulation loses or overlaps its exact source/GLB/native projected domain')
    return [list(t) for t in triangles]


def retriangulate_retained_core(api, candidate):
    """New inferred interior mesh; every original source boundary/other role stays."""
    core = candidate.get('support_core')
    if candidate.get('frame') != 'source-ENU-metres' or type(core) is not list or not 0 < len(core) <= 8192:
        raise ValueError('Source3 core replacement needs a complete bounded Source-ENU owned core packet')
    first = len(candidate['outside_active']);wanted = set(range(first,first+len(core)))
    output = [];done = set()
    for old in candidate['same_visible_collision_triangles']:
        row_index = old.get('source_row_index')
        if type(row_index) is not int: raise ValueError('Source3 core replacement requires literal original source row IDs')
        if row_index not in wanted:
            output.append(copy.deepcopy(old));continue
        if row_index in done: continue
        row = core[row_index-first];done.add(row_index)
        for corners in support_core_triangles(api,row):
            output.append({'vertices':[copy.deepcopy(row['vertices'][i]) for i in corners],
                'classification':row['classification'],'actor':row['actor'],
                'parent_polygon':row.get('id',row.get('parent')),'source_row_index':row_index,
                'source_corner_indices':corners,'actual_physical_firsthit_and_body_eligible':True})
    if done != wanted: raise ValueError('Source3 core replacement is missing original owned polygon groups')
    result = copy.deepcopy(candidate);result['same_visible_collision_triangles'] = output
    result['core_triangulation'] = {'method':'source-GLB-native-boundary-DP-v1','owned_polygons':len(core),
        'new_vertices':0,'other_roles_changed':False,'physical_candidates_filtered':False,
        'interior':'New inferred serialized piecewise height/UV; original query expectations do not transfer'}
    return result


def repair_mapped_core(api, candidate, source_intervals):
    """One bounded source-affine notch for each actual mapped-grade defect."""
    import functools
    np = api.np
    core = candidate.get('support_core')
    route = candidate.get('continuous_XY_body_sweep_certificate', {}).get('route')
    if candidate.get('frame') != 'source-ENU-metres' or type(core) is not list or not 0 < len(core) <= 8192:
        raise ValueError('Source3 mapped core repair needs a complete bounded Source-ENU core packet')
    if any(type(row) is not dict or row.get('classification') != 'inferred-graded-support-core' for row in core):
        raise ValueError('Source3 mapped core repair cannot alter unknown or non-support authoring roles')
    if type(route) is not list or type(source_intervals) is not list or not 0 < len(source_intervals) == len(route)-1 <= 64:
        raise ValueError('Source3 mapped core repair requires every declared route interval and its OSM identity')
    intervals = []
    for ordinal, entry in enumerate(source_intervals):
        if type(entry) is not dict or any(type(entry.get(k)) is not int or entry[k] <= 0 for k in ('way_id','from_osm_node','to_osm_node')):
            raise ValueError('Source3 mapped core repair needs literal positive directed OSM interval IDs')
        points = entry.get('lane_points')
        if type(points) is not list or len(points) != 2 or any(type(p) is not list or len(p) != 2 or any(type(v) not in (int,float) or not np.isfinite(v) for v in p) for p in points):
            raise ValueError('Source3 mapped core repair needs two finite Source-ENU lane points per interval')
        if [[Q(v) for v in p] for p in points] != [[Q(v) for v in p] for p in route[ordinal:ordinal+2]]:
            raise ValueError('Source3 mapped core repair interval differs from its complete declared body-sweep route')
        if ordinal and source_intervals[ordinal-1]['to_osm_node'] != entry['from_osm_node']:
            raise ValueError('Source3 mapped core repair directed intervals are disconnected')
        delta = [Q(points[1][i])-Q(points[0][i]) for i in range(2)]
        length2 = sum(v*v for v in delta)
        if not length2: raise ValueError('Source3 mapped core repair cannot nominate a zero-length source interval')
        intervals.append(([[Q(float(v*100)) for v in p] for p in points], delta, length2))
    def cross(a,b,c): return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    def area(p): return sum(a[0]*b[1]-a[1]*b[0] for a,b in zip(p,p[1:]+p[:1]))
    def gradient(p):
        a,b,c = p;u = [b[i]-a[i] for i in range(3)];v = [c[i]-a[i] for i in range(3)]
        det = u[0]*v[1]-u[1]*v[0]
        return None if not det else ((u[2]*v[1]-v[2]*u[1])/det,(u[0]*v[2]-v[0]*u[2])/det)
    def packed(points):
        with np.errstate(over='ignore',invalid='ignore'):
            glb = np.asarray([[float(Q(v)) for v in p[:3]] for p in points],dtype='<f4').astype(float)
            native = (glb*100).astype(np.float32).astype(float)
        if not np.isfinite(glb).all() or not np.isfinite(native).all():
            raise ValueError('Source3 mapped core repair exceeds finite GLB/native storage')
        return glb,native,[[Q(float(v)) for v in p] for p in glb],[[Q(float(v)) for v in p] for p in native]
    def membership(native):
        return int(api.native_cook_membership((native[[0,2,1]]*np.array([1.,-1.,1.])).astype(np.float32)[None])[0])
    def crosses(p,segment):
        sign = 1 if cross(*p) > 0 else -1;lo,hi = Q(0),Q(1)
        for a,b in zip(p,p[1:]+p[:1]):
            f = sign*cross(a,b,segment[0]);g = sign*cross(a,b,segment[1])
            if f < 0 and g < 0: return False
            if f < 0: lo = max(lo,-f/(g-f))
            if g < 0: hi = min(hi,f/(f-g))
        return lo < hi
    threshold = Q(float(.2))**2
    first = len(candidate['outside_active']);last = first+len(core)
    defects = collections.defaultdict(list)
    for triangle in candidate['same_visible_collision_triangles']:
        ri = triangle.get('source_row_index')
        if type(ri) is not int or not first <= ri < last: continue
        row = core[ri-first];corners = triangle.get('source_corner_indices')
        if type(corners) is not list or len(corners) != 3 or any(type(i) is not int or not 0 <= i < len(row['vertices']) for i in corners) or triangle['vertices'] != [row['vertices'][i] for i in corners]:
            raise ValueError('Source3 mapped core repair requires unchanged integer corner ancestry before selection')
        _,native,_,points = packed(triangle['vertices']);state = membership(native);g = gradient(points)
        if state < 0: raise api.NativeCollisionModelError('Source3 mapped core repair has ambiguous physical membership')
        if state != 1 or g is None or cross(*points) >= 0: continue
        if any((g[0]*delta[0]+g[1]*delta[1])**2 > threshold*length2 and crosses(points,segment) for segment,delta,length2 in intervals):
            defects[ri].append(corners)
    if not defects: return copy.deepcopy(candidate)
    changes = {}
    for ri, offending in sorted(defects.items()):
        row = core[ri-first];vertices = row.get('vertices');weights = row.get('parent_barycentric')
        if type(vertices) is not list or not 3 <= len(vertices) <= 64 or type(weights) is not list or len(weights) != len(vertices):
            raise ValueError('Source3 mapped core repair needs3..64 original boundary corners with matching parent barycentrics')
        src = [[Q(v) for v in p] for p in vertices];n = len(src);sign = 1 if area(src) > 0 else -1
        if any(len(p) != 5 for p in src) or not area(src) or any(sign*cross(a,b,c) < 0 for a,b,c in zip(src,src[1:]+src[:1],src[2:]+src[:2])):
            raise ValueError('Source3 mapped core repair needs a nonzero convex original Source-XYZUV boundary')
        bary = [[Q(v) for v in p] for p in weights]
        if any(len(p) != 3 or sum(p) != 1 or any(v < 0 or v > 1 for v in p) for p in bary):
            raise ValueError('Source3 mapped core repair has malformed original parent barycentric coordinates')
        edges = sorted({(i,(i+1)%n) for t in offending for i in range(n) if i in t and (i+1)%n in t})
        found = None
        for i,j in edges:
            for k in range(n):
                l = (k+1)%n;parents = (i,k,l)
                point = [sum(src[p][c] for p in parents)/3 for c in range(5)]
                if any(sign*cross(src[a],src[(a+1)%n],point) <= 0 for a in range(n)): continue
                points = src+[point];_,native,glb_q,native_q = packed(points)
                @functools.lru_cache(None)
                def admissible(a,b,c):
                    if sign*cross(points[a],points[b],points[c]) <= 0 or sign*cross(glb_q[a],glb_q[b],glb_q[c]) < 0 or sign*cross(native_q[a],native_q[b],native_q[c]) < 0: return False
                    state = membership(native[[a,b,c]]);g = gradient([native_q[a],native_q[b],native_q[c]])
                    return state >= 0 and (state != 1 or g is None or sum(v*v for v in g) <= threshold)
                if not admissible(i,j,n): continue
                cycle = list(range(j,n))+list(range(j))+[n]
                @functools.lru_cache(None)
                def solve(a,b):
                    if b == a+1: return ()
                    for c in sorted(range(a+1,b),key=lambda x:abs(cross(native_q[cycle[a]],native_q[cycle[x]],native_q[cycle[b]])),reverse=True):
                        tri = (cycle[a],cycle[c],cycle[b])
                        if not admissible(*tri): continue
                        left = solve(a,c)
                        if left is None: continue
                        right = solve(c,b)
                        if right is not None: return left+right+(tri,)
                    return None
                answer = solve(0,len(cycle)-1)
                if answer is not None:
                    found = (point,list(answer)+[(i,j,n)],parents,glb_q,native_q);break
            if found is not None: break
        if found is None:
            raise ValueError('Source3 mapped core '+str(ri)+' has no complete bounded source-affine notch satisfying unchanged packed orientation/grade; retain original geometry')
        point,triangles,parents,glb_q,native_q = found
        counter = collections.Counter((a,b) for t in triangles for a,b in zip(t,t[1:]+t[:1]))
        boundary = collections.Counter({e:v-counter[e[::-1]] for e,v in counter.items() if v > counter[e[::-1]]})
        if boundary != collections.Counter((a,(a+1)%n) for a in range(n)):
            raise ValueError('Source3 mapped core notch changed original boundary incidence')
        for model in (src+[point],glb_q,native_q):
            values = [cross(*(model[a] for a in t)) for t in triangles]
            if sum(values) != area(model[:n]) or sum(map(abs,values)) != abs(area(model[:n])):
                raise ValueError('Source3 mapped core notch loses or overlaps exact Source/GLB/native domain')
        replacement = copy.deepcopy(row);replacement['vertices'].append(list(map(str,point)))
        replacement['parent_barycentric'].append([str(sum(bary[p][c] for p in parents)/3) for c in range(3)])
        changes[ri] = (replacement,triangles,n)
    result = copy.deepcopy(candidate);out = [];done = set()
    for triangle in candidate['same_visible_collision_triangles']:
        ri = triangle.get('source_row_index')
        if ri not in changes: out.append(copy.deepcopy(triangle));continue
        if ri in done: continue
        done.add(ri);row,triangles,n = changes[ri];result['support_core'][ri-first] = row
        for corners in triangles:
            out.append({'vertices':[copy.deepcopy(row['vertices'][i]) for i in corners],
                'classification':row['classification'],'actor':row['actor'],'parent_polygon':row.get('id',row.get('parent')),
                'source_row_index':ri,'source_corner_indices':list(corners),'actual_physical_firsthit_and_body_eligible':True})
    result['same_visible_collision_triangles'] = out
    result['core_triangulation'] = {'method':'observed-mapped-grade-source-affine-interior-notch-v1','input_owned_polygons':len(core),
        'changed_polygons':len(changes),'new_vertices':len(changes),'other_roles_changed':False,'physical_candidates_filtered':False,
        'original_boundary_counts':{str(ri):v[2] for ri,v in changes.items()},
        'representation':'all new corners are integer indices with exact parent_barycentric; boundary counts retained separately before append',
        'mapped_source_intervals':copy.deepcopy(source_intervals)}
    return result


def compose_retained(api, parent_record, baseline, packet, candidate, output, *, retained_inputs, original_query_artifacts):
    """Exactly this retained mapped footprint; no generic mesh/remesh/query engine."""
    import json
    import math
    s3=api.support_source3;np=api.np
    parent=json.loads(s3.record(api,parent_record,'current genuine parent',api.SUPPORT_MANIFEST_LIMIT_BYTES))
    prior=json.loads(s3.record(api,baseline['ledger'],'authenticated legacy recipe',api.SUPPORT_MANIFEST_LIMIT_BYTES))
    if prior['parent_support_surface']!=parent_record:raise ValueError('Composition requires the same authenticated genuine parent')
    _,parent_parts=s3.primitives(api,s3.record(api,parent['derived_terrain'],'current parent mesh'))
    parent_rows=s3.triangle_rows(parent_parts)
    _,patch_parts=s3.primitives(api,s3.record(api,prior['terrain_patch'],'unchanged legacy patch'))
    patch=[row.copy() for row in s3.triangle_rows(patch_parts)];labels=copy.deepcopy(prior['patch_faces'])
    active={f['id']:f for f in packet['active']};sources={**active,**{f['id']:f for f in packet['raw_GSI']}}
    changed={r['parent'] for r in candidate['parent_accounting'] if Q(r['removed_inside_area_q'])>0}
    deleted=[];road_groups=collections.defaultdict(list);road_changed={}
    for key in changed:
        face=active[key]
        if face['classification']=='driveable-road':
            sf=face['source_face'];identity=tuple(sf[k] for k in ('source','mesh','primitive','triangle'));road_changed[identity]=face
        else:
            if face['source_face'].get('kind')!='terrain':raise ValueError('Local composition requires retained literal terrain, not guessed legacy patch ancestry')
            parent_id=face['source_face']['parent_triangle']
            if parent_id in prior['deleted_parent_triangles']:raise ValueError('Retained local parent is already a legacy deletion')
            if not np.array_equal(parent_rows[parent_id,:,:5],np.asarray(face['vertices'],float)):
                raise ValueError('New parent actual source attributes differ from retained local face; genuine rebase required')
            deleted.append(parent_id)
    source_parts={(parent['derived_terrain']['path'],parent['derived_terrain']['sha256']):parent_parts}
    def source(face):
        if face['id'].startswith('original-GSI:'):
            record=face['photo_record'];ref=face['source_face']['photo_accessor_ref']
        elif face['classification']=='driveable-road':record=face['source_record'];ref=face['source_face']
        else:
            record=parent['derived_terrain'];ref={'mesh':0,'primitive':0,'triangle':face['source_face']['parent_triangle']}
        cache=(record['path'],record['sha256'])
        if cache not in source_parts:source_parts[cache]=s3.primitives(api,s3.record(api,record,'literal composition source'))[1]
        part=next(p for p in source_parts[cache] if p[:2]==(ref['mesh'],ref['primitive']))
        index=s3.integer(ref['triangle'],'literal source triangle',len(part[3]));rows=decoded_face(api,part,index)
        if not np.array_equal(rows[:,:5],np.asarray(face['vertices'],float)):
            raise ValueError('Literal retained geometry/UV no longer matches immutable actual source bytes')
        return record,ref,part,rows
    def anchor(key,weights):
        original=sources[key];record,ref,part,rows=source(original);weights=list(map(Q,weights))
        values=[sum(weights[j]*Q(float(rows[j,c])) for j in range(3)) for c in range(5)]
        result={'source_record':record,'mesh':ref['mesh'],'primitive':ref['primitive'],'triangle':ref['triangle'],
                'barycentric_q':list(map(str,weights)),'source_enu_uv_q':list(map(str,values)),
                'retained_source_id':key}
        if 'photo_record' in original:result['immutable_raw_geometry_record']=original['source_record']
        normal=np.asarray([float(sum(weights[j]*Q(float(rows[j,c])) for j in range(3))) for c in range(5,8)])
        return result,normal
    all_rows=candidate['outside_active']+candidate['support_core']+candidate['transition_tops']+candidate['sidewalls']
    outside_count=len(candidate['outside_active']);prefix=len(labels);region_id='way31610544-source-owned3D-v1'
    def corners(row,triangle):
        result=[];normals=[]
        for corner in triangle['source_corner_indices']:
            if 'vertex_ancestry' in row:
                entry=row['vertex_ancestry'][corner];key=entry['parent'];weights=entry['barycentric']
            else:
                key=row.get('parent',row.get('id'))
                if 'parent_barycentric' in row:
                    bary=row['parent_barycentric']
                    weights=[sum(Q(b[j]) for b in bary)/len(bary) for j in range(3)] if corner=='affine-vertex-mean' else bary[corner]
                else:weights=[int(j==corner) for j in range(3)]
            a,n=anchor(key,weights);result.append(a);normals.append(n)
        return result,np.asarray(normals)
    def row_values(triangle,ancestors,normals,inferred):
        exact=[[Q(x) for x in p] for p in triangle['vertices']]
        if any(exact[i]!=[Q(x) for x in a['source_enu_uv_q']] for i,a in enumerate(ancestors)):
            raise ValueError('Candidate triangle changed immutable source corner/UV ancestry')
        if inferred:
            a,b,c=exact;u=[b[i]-a[i] for i in range(3)];v=[c[i]-a[i] for i in range(3)]
            normal=[-(u[1]*v[2]-u[2]*v[1]),-(u[2]*v[0]-u[0]*v[2]),-(u[0]*v[1]-u[1]*v[0])]
            scale=max(map(abs,normal))
            if not scale:raise ValueError('Source exact triangle is zero3D before serialization; no invented normal')
            value=np.asarray([float(x/scale) for x in normal]);value/=np.linalg.norm(value)
            normals=np.repeat(value[[0,2,1]][None],3,axis=0)
        return np.column_stack(([[float(x) for x in p] for p in exact],normals)).astype('<f4').astype(float)
    def fragment_label(triangle,ancestors,rows,parent_id):
        edits=[];plane=uv=0.
        for i,a in enumerate(ancestors):
            weights=[float(Q(x)) for x in a['barycentric_q']]
            original,w,exact=s3.source_interpolation({'barycentric':weights},parent_rows[parent_id,:,:3],'reconstruction fragment')
            actual=s3.native_centimetres(rows[i,:3]);plane=max(plane,abs(float(actual[2]-exact[2]))/100)
            uv=max(uv,float(np.max(abs(rows[i,3:5]-(w@parent_rows[parent_id])[3:5]))))
            edits.append({'vertex':i,'source_anchor':{'kind':'parent-edge-or-plane-interpolation','parent_triangle':parent_id,'barycentric':weights},
                          'original_native_cm':s3.ledger_native_cm(original,True).tolist(),'replacement_native_cm':s3.ledger_native_cm(actual,True).tolist()})
        return {'kind':'retained-parent-fragment','region_id':region_id,'parent_triangle':parent_id,
          'original_terrain_parent':parent['terrain_source_triangle_indices'][parent_id],
          'reconstruction_fragment':True,'corner_ancestry':ancestors,'vertex_edits':edits,
          'maximum_plane_error_m':plane,'maximum_uv_error':uv}
    roles={'inferred-graded-support-core':'support-top','inferred-non-support-transition-top':'physical-transition',
           'inferred-non-support-visible-collision-sidewall':'physical-sidewall'}
    for ordinal,triangle in enumerate(candidate['same_visible_collision_triangles']):
        row=all_rows[triangle['source_row_index']];outside=triangle['source_row_index']<outside_count
        key=row.get('parent',row.get('id'))
        if outside and key not in changed:continue
        ancestors,normals=corners(row,triangle);packed=row_values(triangle,ancestors,normals,not outside)
        if outside and active[key]['classification']=='driveable-road':
            sf=active[key]['source_face'];road_groups[tuple(sf[k] for k in ('source','mesh','primitive','triangle'))].append((packed,ancestors,ordinal));continue
        if outside:label=fragment_label(triangle,ancestors,packed,active[key]['source_face']['parent_triangle'])
        else:label={'kind':KIND,'reconstruction_role':roles[triangle['classification']],'region_id':region_id,'corner_ancestry':ancestors}
        label.update(patch_triangle=len(labels),retained_candidate_triangle=ordinal);labels.append(label);patch.append(packed)
    api.guarded_mkdir(output,api.OUT)
    def write_rows(name,rows,materials):
        rows=np.asarray(rows).reshape(-1,3,8).astype('<f4');flat=rows.reshape(-1,8)
        return s3.write_mesh(api,output,name,{'POSITION':flat[:,[0,2,1]],'TEXCOORD_0':flat[:,3:5],'NORMAL':flat[:,5:8]},
            np.arange(len(flat),dtype=np.uint32).reshape(-1,3),materials)
    parent_doc,_=s3.primitives(api,s3.record(api,parent['derived_terrain'],'parent materials'))
    patch_record=write_rows('reconstruction-patch.glb',patch,parent_doc['materials'])
    overrides=copy.deepcopy(prior.get('road_overrides',[]));prior_keys={s3.road_key(e) for e in overrides}
    for key,original in sorted(road_changed.items()):
        if key in prior_keys:raise ValueError('Local road trim intersects an existing legacy override; explicit ancestry rebase required')
        record,ref,part,rows=source(original);pieces=road_groups[key]
        if pieces:
            doc,_=s3.primitives(api,s3.record(api,record,'road materials'))
            replacement=write_rows('road-fragments-'+'-'.join(map(str,key))+'.glb',[p[0] for p in pieces],doc['materials'])
        else:replacement=record
        anchors=[{'source':key[0],'mesh':key[1],'primitive':key[2],'triangle':key[3],
                  'vertex':int(part[3][key[3],j]),'raw_enu_m':rows[j,:3].tolist()} for j in range(3)]
        vertex_anchors=[];ancestry=[]
        for i,(p,a,ordinal) in enumerate(pieces):
            ancestry.append({'kind':'retained-source-road-fragment','patch_triangle':i,'corner_ancestry':a,'retained_candidate_triangle':ordinal})
            for j,entry in enumerate(a):
                raw_anchor={'kind':'source-road-plane-interpolation','source':key[0],'mesh':key[1],'primitive':key[2],'triangle':key[3],
                            'barycentric':[float(Q(x)) for x in entry['barycentric_q']]}
                initial,_,_=s3.source_interpolation(raw_anchor,rows[:,:3],'outside road');actual=s3.native_centimetres(p[j,:3])
                vertex_anchors.append({'patch_triangle':i,'vertex':j,'kind':'source-road-native-stitch','source_anchor':raw_anchor,
                    'original_native_cm':s3.ledger_native_cm(initial,True).tolist(),'replacement_native_cm':s3.ledger_native_cm(actual,True).tolist()})
        overrides.append({'source':key[0],'mesh':key[1],'primitive':key[2],'triangle':key[3],
            'source_record':record,'anchors':anchors,'replacement':replacement,'replacement_patch_triangles':list(range(len(pieces))),
            'replacement_vertex_anchors':vertex_anchors,'reconstruction_trim':True,'replacement_source_ancestry':ancestry,'region_id':region_id})
    polygon=[[Q(x) for x in p] for p in candidate['region']]
    regions=copy.deepcopy(prior['regions']);regions.append({'id':region_id,'native_xy_polygons_cm':[[[float(p[0]*100),float(-p[1]*100)] for p in (polygon[0],polygon[i],polygon[i+1])] for i in range(1,len(polygon)-1)]})
    ledger=copy.deepcopy(prior);ledger.update(terrain_patch=patch_record,patch_faces=labels,regions=regions,
      deleted_parent_triangles=sorted(set(prior['deleted_parent_triangles'])|set(deleted)),
      terrain_edits=prior['terrain_edits']+[{'parent_triangle':i,'region_id':region_id} for i in sorted(deleted)],road_overrides=overrides)
    record_inputs=[a['source_record'] for face in labels[prefix:] for a in face.get('corner_ancestry',[])]
    ledger['recipe']={'algorithm':api.generation_code_record('support_reconstruction.py'),
        'source_inputs':s3.unique_records([*s3.recipe_records(prior),*record_inputs,baseline['ledger'],baseline['original_manifest'],*[row['record'] for row in baseline['derived_roads']]]),
        'candidate_inputs':list(retained_inputs)}
    ledger['reconstruction']={'policy':copy.deepcopy(POLICY),'owned_source_enu_m_q':[[str(x) for x in p] for p in polygon],
        'legacy_baseline':baseline,'new_deleted_parent_triangles':sorted(deleted),
        'original_query_artifacts':list(original_query_artifacts),'retained_candidate':'seam3d-v2 positions/UV/ancestry unchanged; actual GLB/native states recomputed',
        'bound':'No .999/normal/grade/body/contact/legal/region/cap change. Original failed poses separate from new predictions.'}
    data=api.encoded(ledger)
    if len(data)>api.SUPPORT_MANIFEST_LIMIT_BYTES:raise ValueError('Composed reconstruction ledger exceeds unchanged16MiB role cap')
    path=api.ROOT/'data/source/provenance'/('source3-reconstruction-'+api.sha(data)+'.json');api.guarded_write(path,data,api.ROOT/'data/source/provenance')
    return api.source_record(path)
