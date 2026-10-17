"""Explicit creating-line context and packed-piece conservation checks.

No source/output I/O. Source rows use east,north,up followed by UV and normal.
This context belongs to one original parent, and is discarded after refinement.
"""
from __future__ import annotations
import bisect
import collections
from fractions import Fraction as Q
import hashlib
import json
import math
import re
import struct


def json_integer(value):
    """Portable JSON Number rule: integer-valued, finite, never bool/string."""
    return type(value) is int or (type(value) is float and math.isfinite(value) and value.is_integer())


def rational(value):
    return value if isinstance(value,Q) else Q(float(value))


def xy(row):
    return tuple(map(float,row[:2]))


def normalized_line(a,b):
    a,b=[tuple(rational(x) for x in row[:2]) for row in (a,b)]
    dx,dy=b[0]-a[0],b[1]-a[1]
    values=(-dy,dx,dy*a[0]-dx*a[1])
    first=next((value for value in values if value),None)
    if first is None:return None
    return tuple(value/first for value in values)


def plane(triangle):
    a,b,c=[tuple(rational(x) for x in row[:3]) for row in triangle]
    ux,uy,uz=[b[i]-a[i] for i in range(3)]
    vx,vy,vz=[c[i]-a[i] for i in range(3)]
    det=ux*vy-uy*vx
    if not det:raise ValueError('Source parent/road plane has exactly zero projected determinant')
    east,north=(uz*vy-uy*vz)/det,(ux*vz-uz*vx)/det
    return a[2]-east*a[0]-north*a[1],east,north


def crossing(a,b):
    det=a[0]*b[1]-b[0]*a[1]
    if not det:return None
    return (a[1]*b[2]-b[1]*a[2])/det,(b[0]*a[2]-a[0]*b[2])/det


class CreatingLines:
    """One parent's actual clipping operators, never proximity associations."""
    def __init__(self,parent,terrain):
        self.parent=int(parent)
        self.terrain=terrain
        self.labels=collections.defaultdict(set)
        self.lines={}
        self.road_lines=set()
        self.stats=collections.Counter()
        self.terrain_plane=plane(terrain)
        self.height_operators={}
        self.edge_operators={}
        self.rational_points={}
        self.canonical_operators={}
        self.seed(terrain,'original-parent-edge')

    def exact_point(self,row,key):
        # Actual clipping rows are binary coordinates. Reuse their exact
        # dyadic values; rational callers retain their original exact values.
        if any(isinstance(value,Q) for value in row[:2]):return tuple(rational(value) for value in row[:2])
        if key in self.rational_points:
            self.stats['exact_rational_point_cache_hits']+=1
            return self.rational_points[key]
        result=tuple(rational(value) for value in row[:2])
        self.rational_points[key]=result
        return result

    def label(self,kind,a,b):
        # Memoization reuses the same exact operator, never a nearby edge.
        ak,bk=xy(a),xy(b);key=(kind,*sorted((ak,bk)))
        if key in self.edge_operators:
            identifier=self.edge_operators[key]
            self.labels[ak].add(identifier);self.labels[bk].add(identifier)
            self.stats['exact_edge_operator_cache_hits']+=1
            return identifier
        values=normalized_line(self.exact_point(a,ak),self.exact_point(b,bk))
        if values is None:raise ValueError(f'Parent{self.parent} has a zero-length creating edge')
        coefficients=tuple((x.numerator,x.denominator) for x in values)
        semantic=(kind,coefficients)
        if semantic in self.canonical_operators:
            identifier=self.canonical_operators[semantic]
            self.stats['exact_canonical_operator_cache_hits']+=1
        else:
            document={'kind':kind,'parent':self.parent,'coefficients':coefficients,'extra':None}
            identifier=hashlib.sha256(json.dumps(document,sort_keys=True).encode()).hexdigest()
            self.canonical_operators[semantic]=identifier
        self.lines[identifier]={'kind':kind,'coefficients':values}
        self.edge_operators[key]=identifier
        self.labels[ak].add(identifier);self.labels[bk].add(identifier)
        if kind=='source-road-projected-edge':self.road_lines.add(identifier)
        return identifier

    def seed(self,polygon,kind):
        for a,b in zip(polygon,polygon[1:]+polygon[:1]):self.label(kind,a,b)

    def edge_labels(self,a,b):
        common=self.labels[xy(a)]&self.labels[xy(b)]
        return common if common else {self.label('actual-clip-segment',a,b)}

    def height_labels(self,road):
        key=tuple(tuple(map(float,row[:3])) for row in road)
        if key in self.height_operators:return {self.height_operators[key]}
        self.seed(road,'source-road-projected-edge')
        document={'kind':'terrain-road-height-zero','parent':self.parent,'road_triangle':road}
        identifier=hashlib.sha256(json.dumps(document,sort_keys=True).encode()).hexdigest()
        terrain_plane,road_plane=self.terrain_plane,plane(road)
        delta=tuple(a-b for a,b in zip(terrain_plane,road_plane))
        self.lines[identifier]={'kind':'terrain-road-height-zero','coefficients':(delta[1],delta[2],delta[0])}
        self.height_operators[key]=identifier
        return {identifier}

    def independent_creating_pair(self,labels):
        coefficients=[self.lines[label]['coefficients'] for label in labels]
        return any(first[0]*second[1]-second[0]*first[1]
                   for i,first in enumerate(coefficients) for second in coefficients[i+1:])

    def clipping_event(self,a,b,row,labels):
        if labels is None:
            raise ValueError(f'Parent{self.parent} clipping event lacks its explicit creating operator')
        subject=self.labels[xy(a)]&self.labels[xy(b)]
        if not self.independent_creating_pair(labels | subject):
            # The numerical operator clips this actual binary subject segment.
            # Empty or dependent inherited operators cannot identify an
            # interior binary interpolation. Retain their ancestry and this
            # executing segment. Event admission still refuses parallel lines.
            subject=subject | {self.label('actual-clip-segment',a,b)}
            self.stats['actual_subject_edge_operators']+=1
        self.labels[xy(row)].update(labels | subject)
        self.stats['clipping_interpolations']+=1

    def interpolation_event(self,point,row):
        self.labels[xy(row)].update(self.labels[xy(point)])
        self.stats['barycentric_interpolations']+=1

    def event(self,row):
        priority={'original-parent-edge':0,'source-road-projected-edge':1,
                  'terrain-road-height-zero':2,'source-union-exterior-band-edge':3,'actual-clip-segment':4}
        labels=sorted(self.labels[xy(row)],key=lambda key:(priority[self.lines[key]['kind']],key))
        for i,first in enumerate(labels):
            for second in labels[i+1:]:
                point=crossing(self.lines[first]['coefficients'],self.lines[second]['coefficients'])
                if point is not None:return point,labels
        raise ValueError(f'Parent{self.parent} event{xy(row)} lacks two independent creating lines; identity is unproved')

    def refine(self,pieces,anchor,checkpoint=lambda:None,maximum_output_triangles=2_000_000):
        """Split every labelled interval, sorting each line's events once."""
        import numpy as np
        events={};by_line=collections.defaultdict(dict);row_events={}
        for i,triangle in enumerate(pieces):
            for j,row in enumerate(triangle):
                checkpoint();key=xy(row);relevant=self.road_lines&self.labels[key]
                if not relevant:continue
                if key in row_events:
                    point=row_events[key];labels=self.labels[key]
                else:point,labels=self.event(row)
                for line in relevant:
                    a,b,c=self.lines[line]['coefficients']
                    if a*point[0]+b*point[1]+c:
                        raise ValueError(f'Parent{self.parent} event{key} conflicts with creating road line{line}; no proximity repair')
                if point not in events:
                    world=np.asarray(row,dtype=float).copy();world[:2]+=anchor
                    events[point]=np.asarray(world,dtype=np.float32)
                row_events[key]=point
                for line in relevant:by_line[line][point]=events[point]
        ordered={}
        for line,items in by_line.items():
            axis=0 if self.lines[line]['coefficients'][1] else 1
            points=sorted(items,key=lambda point:point[axis])
            ordered[line]=(axis,points,[point[axis] for point in points])
        output=[];origins=[];statistics=collections.Counter(self.stats)
        for i,triangle in enumerate(pieces):
            checkpoint();polygon=[];inserted=0
            for a,b in zip(triangle,triangle[1:]+triangle[:1]):
                ak,bk=xy(a),xy(b)
                world=np.asarray(a,dtype=float).copy();world[:2]+=anchor
                boundary=any(self.lines[line]['kind']=='original-parent-edge' for line in self.labels[ak])
                if self.road_lines&self.labels[ak] and not boundary:world=events[row_events[ak]]
                polygon.append(world)
                common=self.road_lines&self.labels[ak]&self.labels[bk]
                if not common:continue
                line=min(common);pa,pb=row_events[ak],row_events[bk]
                axis,points,coordinates=ordered[line]
                start,end=pa[axis],pb[axis]
                if start==end:continue
                low,high=bisect.bisect_right(coordinates,min(start,end)),bisect.bisect_left(coordinates,max(start,end))
                splits=points[low:high]
                if end<start:splits.reverse()
                for point in splits:polygon.append(events[point]);inserted+=1
                statistics['incident_creating_line_uses']+=1
            if inserted:
                centre=np.asarray(triangle,dtype=float).mean(axis=0);centre[:2]+=anchor
                for a,b in zip(polygon,polygon[1:]+polygon[:1]):output.append([centre,a,b]);origins.append(i)
                statistics['refined_input_faces']+=1
                statistics['introduced_subdivision_uses']+=inserted
            else:output.append(polygon);origins.append(i)
            if len(output)>maximum_output_triangles:
                raise ValueError(f'Parent{self.parent} introduced-line refinement exceeds{maximum_output_triangles} remaining output faces; inspect source complexity')
        statistics.update(input_faces=len(pieces),output_faces=len(output),
                          registered_source_lines=len(by_line),shared_events=len(events))
        return np.asarray(output,dtype=float).reshape(-1,3,len(self.terrain[0])),np.asarray(origins,dtype=np.uint32),dict(statistics)


def packed_cross(triangle):
    """Exact signs/zeros at packed binary coordinates, with rational fallback."""
    a,b,c=[[float(x) for x in row[:3]] for row in triangle]
    u,v=[b[i]-a[i] for i in range(3)],[c[i]-a[i] for i in range(3)]
    result=[]
    for i,j in ((1,2),(2,0),(0,1)):
        p,q=u[i]*v[j],u[j]*v[i];value=p-q
        # This conservative orient2d filter includes subtraction/multiplication
        # roundoff. Ambiguous cancellation/underflow uses actual binary inputs;
        # the bound chooses an arithmetic path, never an exclusion epsilon.
        bound=8*math.ulp(1.0)*(abs(p)+abs(q))
        if abs(value)<=bound:
            ue=[rational(b[k])-rational(a[k]) for k in range(3)]
            ve=[rational(c[k])-rational(a[k]) for k in range(3)]
            value=ue[i]*ve[j]-ue[j]*ve[i]
        result.append(value)
    return tuple(result)


def projected_signs(rows):
    import numpy as np
    rows=np.asarray(rows,dtype=np.float64)
    u,v=rows[:,1,:2]-rows[:,0,:2],rows[:,2,:2]-rows[:,0,:2]
    p,q=u[:,0]*v[:,1],u[:,1]*v[:,0]
    determinant=p-q
    signs=np.sign(determinant).astype(np.int8)
    uncertain=abs(determinant)<=8*math.ulp(1.0)*(abs(p)+abs(q))
    for i in np.flatnonzero(uncertain):
        exact=packed_cross(rows[i])[2]
        signs[i]=(exact>0)-(exact<0)
    return signs


def parent_winding(rows,parents,source):
    import numpy as np
    result=np.asarray(rows).copy();swaps=0
    expected=projected_signs(source)[np.asarray(parents)]
    actual=projected_signs(result)
    invalid=np.flatnonzero((expected==0)|(actual==0))
    if len(invalid):
        i=int(invalid[0])
        raise ValueError(f'Parent{int(parents[i])} output{i} has a projected-zero orientation input')
    changed=expected!=actual
    result[changed]=result[changed][:,[0,2,1]]
    swaps=int(changed.sum())
    return result,swaps


class PieceAccounting:
    """One reconciled piece may yield several refined/packed subdivisions."""
    columns=('original_parent','refined_inputs','packing_attempts','emitted','exact_zero_3d','exact_zero_xy','collapsed','resolved_inputs')
    stored_columns=('original_parent','refined_inputs','emitted','exact_zero_3d','exact_zero_xy','collapsed')
    def __init__(self,parents):
        import numpy as np
        self.rows=np.zeros((len(parents),len(self.columns)),dtype=np.uint32)
        self.rows[:,0]=parents
        self.outputs=[]
        self.exclusions=[]

    def input(self,piece):
        self.rows[int(piece),1]+=1
        return int(self.rows[int(piece),2])
    def finish_input(self,piece,prior_attempts,planned_attempts):
        actual=int(self.rows[int(piece),2])-prior_attempts
        if actual!=planned_attempts:
            raise ValueError(f'Piece{int(piece)} packing produced{actual} accounted attempts; expected{planned_attempts} for its complete polygon')
        self.rows[int(piece),7]+=1
    def emit(self,piece):
        self.rows[int(piece),2]+=1;self.rows[int(piece),3]+=1
        self.outputs.append(int(piece))
    def omit(self,piece,reason,geometry):
        import numpy as np
        column={'exact_zero_3d':4,'exact_zero_xy':5,'collapsed':6}[reason]
        if reason!='collapsed':self.rows[int(piece),2]+=1
        self.rows[int(piece),column]+=1
        geometry=np.asarray(geometry,dtype=np.float32).reshape(-1,np.asarray(geometry).shape[-1] if len(geometry) else 3)
        self.exclusions.append({'piece':int(piece),'reason':reason,'packed_xyz':geometry[:,:3].astype(float).tolist()})

    def validate(self,packed_rows,parents,pieces):
        import numpy as np
        if len(packed_rows)!=len(parents) or len(parents)!=len(pieces):
            raise ValueError('Final geometry/parent/piece vectors have different lengths; every output needs its original piece')
        if list(map(int,pieces))!=self.outputs:
            raise ValueError('Final output-piece vector differs from admitted packing order; unauthorized loss/subdivision')
        counts=np.bincount(np.asarray(pieces,dtype=int),minlength=len(self.rows)) if len(pieces) else np.zeros(len(self.rows),dtype=int)
        if not np.array_equal(counts,self.rows[:,3]):
            raise ValueError('Final output-piece counts disagree with emitted accounting; unauthorized primitive loss')
        bad=np.flatnonzero(self.rows[np.asarray(pieces,dtype=int),0]!=parents)
        if len(bad):raise ValueError(f'Output{int(bad[0])} parent differs from its original piece')
        bad=np.flatnonzero(projected_signs(packed_rows)==0)
        if len(bad):raise ValueError(f'Output{int(bad[0])} has exactly zero projected area but was recorded as emitted')
        missing=np.flatnonzero((self.rows[:,3]+self.rows[:,4]+self.rows[:,5]+self.rows[:,6])==0)
        if len(missing):raise ValueError(f'Original pieces{missing[:8].tolist()} have no final output or authorized exclusion')
        if np.any(self.rows[:,2]!=self.rows[:,3]+self.rows[:,4]+self.rows[:,5]):
            raise ValueError('Packing attempts do not reconcile emitted/exact-zero counts')
        if np.any(self.rows[:,1]!=self.rows[:,7]):
            raise ValueError('A refined input has no complete accounted polygon packing result')
        if np.any(self.rows[:,1]==0) or np.any(self.rows[:,6]>self.rows[:,1]) or np.any(self.rows[:,2]+self.rows[:,6]<self.rows[:,1]):
            raise ValueError('Refined-input counts do not have enough complete output/exclusion/collapsed results')
        exclusion_counts=np.zeros((len(self.rows),3),dtype=np.uint32)
        for exclusion in self.exclusions:
            rows=exclusion['packed_xyz'];reason=exclusion['reason']
            if any(not math.isfinite(float(x)) for row in rows for x in row):
                raise ValueError('Exact exclusion XYZ must be finite, including collapsed packed polygons')
            exclusion_counts[exclusion['piece'],{'exact_zero_3d':0,'exact_zero_xy':1,'collapsed':2}[reason]]+=1
            if reason=='collapsed':
                if len(rows)>=3:raise ValueError('Collapsed exclusion does not have fewer than three packed polygon vertices')
            else:
                cross=packed_cross(rows)
                if reason=='exact_zero_3d' and any(cross):raise ValueError('Claimed zero-3D exclusion has nonzero exact cross')
                if reason=='exact_zero_xy' and (cross[2] or not any(cross)):
                    raise ValueError('Claimed zero-XY exclusion does not match its distinct exact predicate')
        if not np.array_equal(exclusion_counts,self.rows[:,4:7]):
            raise ValueError('Exact exclusion witness counts differ from their per-piece ledger')
        return {'pieces':len(self.rows),'outputs':len(pieces),
                'exact_zero_3d':int(self.rows[:,4].sum()),'exact_zero_xy':int(self.rows[:,5].sum()),
                'collapsed':int(self.rows[:,6].sum()),'unaccounted_pieces':0}

    def parent_counts(self,parent_count):
        import numpy as np
        result=np.zeros((parent_count,len(self.columns)-1),dtype=np.uint32)
        np.add.at(result,self.rows[:,0],self.rows[:,1:])
        return result

    def encode(self,limit=32_000_000):
        """Bounded little-endian ledger; no huge per-face JSON trace."""
        import numpy as np
        stored=self.rows[:,[0,1,3,4,5,6]].astype('<u4',copy=False)
        outputs=np.asarray(self.outputs,dtype='<u4')
        size=32+stored.nbytes+outputs.nbytes+sum(8+12*len(r['packed_xyz']) for r in self.exclusions)
        if size>limit:
            raise ValueError(f'Piece provenance requires{size} bytes, above its unchanged{limit}-byte bound; no source is published')
        header=struct.pack('<8s6I',b'SUPPPC01',1,len(stored),len(outputs),len(self.exclusions),6,0)
        parts=[header,stored.tobytes(),outputs.tobytes()]
        reasons={'exact_zero_3d':1,'exact_zero_xy':2,'collapsed':3}
        for r in self.exclusions:
            xyz=np.asarray(r['packed_xyz'],dtype='<f4').reshape(-1,3)
            parts.append(struct.pack('<IBBH',r['piece'],reasons[r['reason']],len(xyz),0))
            parts.append(xyz.tobytes())
        return b''.join(parts)


def decode_accounting(payload):
    """Strict fixture/producer readback of the entire bounded ledger."""
    import numpy as np
    if len(payload)<32:raise ValueError('Piece ledger is shorter than its32-byte header')
    magic,schema,pieces,outputs,excluded,columns,reserved=struct.unpack_from('<8s6I',payload)
    if (magic,schema,columns,reserved)!=(b'SUPPPC01',1,6,0):raise ValueError('Piece ledger has unsupported magic/schema/columns/reserved fields')
    cursor=32;end=cursor+pieces*24+outputs*4
    if end>len(payload):raise ValueError('Piece ledger declared arrays exceed its actual bounded bytes')
    rows=np.frombuffer(payload,dtype='<u4',count=pieces*6,offset=cursor).reshape(-1,6).copy();cursor+=pieces*24
    ids=np.frombuffer(payload,dtype='<u4',count=outputs,offset=cursor).copy();cursor+=outputs*4
    reasons={1:'exact_zero_3d',2:'exact_zero_xy',3:'collapsed'};exclusions=[]
    for i in range(excluded):
        if cursor+8>len(payload):raise ValueError(f'Piece exclusion{i} has no complete header')
        piece,reason,count,reserved=struct.unpack_from('<IBBH',payload,cursor);cursor+=8
        if piece>=pieces or reason not in reasons or reserved or count>3 or cursor+count*12>len(payload) or (reason in (1,2) and count!=3) or (reason==3 and count>=3):
            raise ValueError(f'Piece exclusion{i} has invalid piece/reason/XYZ membership')
        xyz=np.frombuffer(payload,dtype='<f4',count=count*3,offset=cursor).reshape(-1,3).copy();cursor+=count*12
        if not np.isfinite(xyz).all():raise ValueError(f'Piece exclusion{i} has nonfinite packed XYZ; every reason requires finite coordinates')
        exclusions.append({'piece':piece,'reason':reasons[reason],'packed_xyz':xyz.tolist()})
    if cursor!=len(payload) or (len(ids) and int(ids.max())>=pieces):raise ValueError('Piece ledger contains trailing bytes or an out-of-range output piece')
    return rows,ids,exclusions


def construction_policy(clearance):
    return {'schema_version':1,'source_winding':'original-parent-signed-ENU-determinant',
        'introduced_events':'exact-two-creating-lines-parent-scoped',
        'line_lookup':'sort-once-bisect-open-interval','float32_packing_stages':2,
        'quantization':'source-halfULP-two-packs-gamma-bounded-affine-v1',
        'maximum_output_triangles':2_000_000,'maximum_subtraction_fragments':512,
        'xy_clearance_m':clearance,'topology_sidecar_limit_bytes':32_000_000}


EXCLUSION_PREDICATES={
    'exact_zero_3d':'all three rational cross components of actual packed XYZ equal zero',
    'exact_zero_xy':'rational east/north determinant equals zero, but 3D cross is nonzero',
    'collapsed':'packed polygon has fewer than three consecutive-distinct XYZ vertices'}

SNAPSHOT_ROLES=(('geometry','tools/data/support_surface.py',None,2*1024*1024),
    ('integration','tools/data/surface_network.py','integration',2*1024*1024),
    ('topology','tools/data/support_topology.py','topology',2*1024*1024),
    ('build_city','tools/data/build_city.py','build_city',2*1024*1024),
    ('surface_configuration','sources/surface_network.json','surface_network',100_000),
    ('city_configuration','sources/shibuya.json','city',100_000))


def bound_integer(value,name,minimum,maximum):
    if not json_integer(value) or not minimum<=value<=maximum:
        raise ValueError(f'Schema2 {name} requires a finite integer-valued JSON Number in [{minimum},{maximum}]; received{value!r}')
    return int(value)


def typed_record(record,name,limit=32_000_000,data_only=False):
    if not isinstance(record,dict):raise ValueError(f'Schema2 {name} requires a path/bytes/SHA record')
    path=record.get('path');digest=record.get('sha256')
    if not isinstance(path,str) or not path or len(path)>4096 or '\\' in path or ':' in path or any(p in ('','.','..') for p in path.split('/')):
        raise ValueError(f'Schema2 {name} requires a canonical confined relative path; received{path!r}')
    if data_only and not path.startswith('data/'):
        raise ValueError(f'Schema2 {name} snapshot must use a data-only path; received{path!r}')
    if not isinstance(digest,str) or not re.fullmatch('[0-9a-f]{64}',digest):
        raise ValueError(f'Schema2 {name} requires lowercase64-hex SHA256')
    bound_integer(record.get('bytes'),name+'.bytes',1,limit)
    return {k:record[k] for k in ('path','bytes','sha256')}


def bind_original_terrain(manifest,current_inventory,pinned_original_terrain_record):
    """Bind the declared original role to the hash-pinned base and actual bytes.

    The caller obtains the expected record from the admitted base manifest,
    never from this candidate or its triangle count. The required inventory
    separately records the actual source file's bytes and digest.
    """
    expected=typed_record(pinned_original_terrain_record,'base.original_terrain',32_000_000,True)
    inputs=manifest.get('inputs')
    declared=typed_record(inputs.get('original_terrain') if isinstance(inputs,dict) else None,
        'inputs.original_terrain',32_000_000,True)
    required=[typed_record(row,'preservation.original_terrain') for row in current_inventory
        if isinstance(row,dict) and row.get('path')==expected['path']]
    if declared!=expected or required!=[expected]:
        raise ValueError('Schema2 inputs.original_terrain must equal the exact pinned base terrain path/bytes/SHA and actual required preservation role; matching triangle counts do not admit another source')
    return expected


def check_preserved_inputs(before,after,current_inventory,*,historical_code=False):
    """Consumers bind current data/configuration to the historical writer run."""
    for name,inventory in (('before',before),('after',after),('current',current_inventory)):
        if not isinstance(inventory,list) or not inventory:raise ValueError(f'Schema2 {name} inventory is empty or missing')
        rows=[typed_record(r,'preservation.'+name) for r in inventory]
        if len({r['path'] for r in rows})!=len(rows):raise ValueError(f'Schema2 {name} inventory repeats a source path')
    code_paths={path for _,path,_,_ in SNAPSHOT_ROLES if path.startswith('tools/')}
    def required(rows):
        return [row for row in rows if not historical_code or row['path'] not in code_paths]
    if before!=after or required(before)!=required(current_inventory):
        raise ValueError('Schema2 preservation membership/bytes differs from required actual current source inventory')


def admit_schema2(manifest,preservation,ledger,packed_rows,actual_parents,*,original_parent_count,
                  actual_vertex_count,actual_bounds,current_inventory,clearance,pinned_original_terrain_record,historical_code=False):
    """Single typed Source admission of the NEW schema, using actual arrays.

    The ledger histogram proves recorded membership; reconstructed counters
    below do not independently reconstruct upstream cleaned-polygon fan plans.
    Full planned-attempt closure remains constructor/writer gate evidence.
    """
    import numpy as np
    bound_integer(manifest.get('schema_version'),'manifest.schema_version',2,2)
    if manifest.get('frame')!={'glb':'metres-Xeast-Yup-Znorth','runtime':'metres-Xeast-Ynorth-Zup','unreal':'centimetres-Xeast-Ynorth-Zup'}:
        raise ValueError('Schema2 requires the exact unchanged GLB/runtime/Unreal axis and unit strings')
    if any(k in manifest for k in ('constructor_provenance','reader_revision')):
        raise ValueError('Fresh schema2 cannot contain old generation-history blocks')
    policy=manifest.get('construction_policy');expected=construction_policy(clearance)
    if not isinstance(policy,dict) or set(policy)!=set(expected):
        raise ValueError('Schema2 requires the complete exact construction-policy field set')
    for key in ('schema_version','float32_packing_stages','maximum_output_triangles','maximum_subtraction_fragments','topology_sidecar_limit_bytes'):
        bound_integer(policy.get(key),'construction_policy.'+key,expected[key],expected[key])
    if type(policy.get('xy_clearance_m')) not in (int,float) or not math.isfinite(policy['xy_clearance_m']) or policy!=expected:
        raise ValueError('Schema2 construction policy differs from the declared unchanged source algorithm/limits')
    if not isinstance(preservation,dict):raise ValueError('Schema2 preservation requires its actual inventoried object')
    bound_integer(preservation.get('schema_version'),'preservation.schema_version',1,1)
    before,after=preservation.get('inputs_before'),preservation.get('inputs_after')
    if preservation.get('unchanged') is not True or not isinstance(before,list) or not before or not isinstance(after,list) or not after:
        raise ValueError('Schema2 preservation requires nonempty actual before/after inventories and unchanged:true')
    check_preserved_inputs(before,after,current_inventory,historical_code=historical_code)
    bind_original_terrain(manifest,current_inventory,pinned_original_terrain_record)
    inventory={r['path']:r for r in before};bindings=[]
    algorithm=manifest.get('algorithm');configurations=manifest.get('configuration_inputs')
    if not isinstance(algorithm,dict) or not isinstance(configurations,dict) or set(configurations)!={'surface_network','city'}:
        raise ValueError('Schema2 requires four executing code snapshots and both named source configuration snapshots')
    if set(algorithm)!={'path','bytes','sha256','integration','topology','build_city'}:
        raise ValueError('Schema2 algorithm requires exactly four declared data-only executing code records')
    for role,execution_path,field,limit in SNAPSHOT_ROLES:
        record=(algorithm if field is None else algorithm.get(field)) if execution_path.startswith('tools/') else configurations.get(field)
        record=typed_record(record,'snapshot.'+role,limit,True)
        actual=inventory.get(execution_path)
        if actual is None or any(record[k]!=actual[k] for k in ('bytes','sha256')):
            raise ValueError(f'Schema2 {role} snapshot lacks exact required executing input{execution_path}')
        bindings.append({'role':role,'execution_path':execution_path,'snapshot':record})
    if preservation.get('data_bindings')!=bindings or len({r['snapshot']['path'] for r in bindings})!=len(bindings):
        raise ValueError('Schema2 preservation must bind six unique data-only code/config counterparts to the exact named executing inputs')
    meta=manifest.get('topology_provenance')
    if not isinstance(meta,dict):raise ValueError('Schema2 requires the complete topology-provenance object')
    typed_record(meta.get('record'),'topology.record',32_000_000,True)
    bound_integer(meta.get('schema_version'),'topology.schema_version',1,1)
    rows,pieces,exclusions=ledger
    packed_rows=np.asarray(packed_rows)
    if packed_rows.ndim!=3 or packed_rows.shape[1:]!=(3,3) or not np.isfinite(packed_rows).all():
        raise ValueError('Schema2 actual final POSITION triangles require three finite XYZ vertices each')
    original_count=bound_integer(meta.get('original_parent_count'),'topology.original_parent_count',original_parent_count,original_parent_count)
    for key,value,minimum in (('piece_count',len(rows),1),('output_triangle_count',len(packed_rows),1),('exclusion_count',len(exclusions),0)):
        bound_integer(meta.get(key),'topology.'+key,minimum,2_000_000)
        if meta[key]!=value:raise ValueError(f'Schema2 topology.{key} differs from actual decoded arrays')
    if meta.get('format')!='SUPPPC01-le-u32-f32' or meta.get('piece_columns')!=list(PieceAccounting.stored_columns) or meta.get('source_layer')!='original-terrain-triangle' or meta.get('piece_identity')!='global reconciled-piece ordinal in ascending original-parent order before introduced-line refinement' or meta.get('exclusion_predicates')!=EXCLUSION_PREDICATES:
        raise ValueError('Schema2 topology format/columns/layer identity/exclusion predicates differ from the exact contract')
    if rows.shape!=(meta['piece_count'],6) or len(pieces)!=len(packed_rows) or np.any(rows[:,0]>=original_count) or np.any(rows[1:,0]<rows[:-1,0]):
        raise ValueError('Schema2 decoded topology array shape/parent population differs from actual original/final geometry')
    parents=manifest.get('terrain_source_triangle_indices')
    if not isinstance(parents,list) or len(parents)!=len(packed_rows):raise ValueError('Schema2 original-parent map must cover every actual final triangle')
    parent_ids=np.asarray([bound_integer(p,'terrain_source_triangle_indices',0,original_count-1) for p in parents],dtype=np.uint32)
    if not np.array_equal(parent_ids,actual_parents):raise ValueError('Schema2 final parent-map values differ from actual admitted output ordering')
    derived=manifest.get('derived_terrain');typed_record(derived,'derived_terrain',64*1024*1024,True)
    bound_integer(derived.get('triangles'),'derived.triangles',len(packed_rows),len(packed_rows))
    bound_integer(derived.get('vertices'),'derived.vertices',actual_vertex_count,actual_vertex_count)
    bounds=derived.get('bounds_glb_m')
    if not isinstance(bounds,list) or len(bounds)!=2 or any(not isinstance(row,list) or len(row)!=3 or any(type(x) not in (int,float) or not math.isfinite(x) for x in row) for row in bounds) or bounds!=actual_bounds:
        raise ValueError('Schema2 derived bounds must equal finite actual GLB POSITION bounds')
    accounting=PieceAccounting(rows[:,0]);accounting.rows[:,[0,1,3,4,5,6]]=rows
    accounting.rows[:,2]=rows[:,2]+rows[:,3]+rows[:,4];accounting.rows[:,7]=rows[:,1]
    accounting.outputs=pieces.tolist();accounting.exclusions=exclusions
    verdict=accounting.validate(packed_rows,parent_ids,pieces)
    return {'typed_schema2_admitted':True,'original_terrain_role_bound':True,'required_preservation_members':len(before),'data_snapshot_bindings':len(bindings),
            'topology':verdict,'proof_bound':'Actual output/parent/exclusion memberships and finite predicates; upstream planned fan closure remains separate constructor proof'}


def quantization_bounds(parent,road_count,piece_count,construction_xy_abs=None):
    """Finite source-derived budget, distinct from a contact tolerance.

    Two float32 packings can affect an introduced row (its shared event and
    final source-edge polygon/centre). Each contributes a half-ULP in XYZ/UV.
    Plane gradients turn XY rounding into the corresponding attribute error.
    The float64 term is a conservative gamma(n) bound for the bounded affine
    interpolation chain, including local/world translation and verification.
    n covers both signed clipping branches, band interpolation and both packers;
    the determinant condition bounds the source barycentric solve. No measured
    residual is used to set the bound. Source road counts do not change heights.
    """
    import numpy as np
    parent=np.asarray(parent,dtype=np.float64)
    if parent.shape[0]!=3 or parent.shape[1]<5 or not np.isfinite(parent).all():
        raise ValueError('Quantization parent requires three finite XYZ/UV source rows')
    u,v=parent[1,:2]-parent[0,:2],parent[2,:2]-parent[0,:2]
    determinant=u[0]*v[1]-u[1]*v[0]
    if not determinant or not math.isfinite(determinant):
        raise ValueError('Quantization parent has no finite nonzero projected source determinant')
    gradient=np.stack(((parent[1,2:5]-parent[0,2:5])*v[1]-(parent[2,2:5]-parent[0,2:5])*u[1],
                       u[0]*(parent[2,2:5]-parent[0,2:5])-v[0]*(parent[1,2:5]-parent[0,2:5])),axis=1)/determinant
    condition=1+(abs(u[0]*v[1])+abs(u[1]*v[0]))/abs(determinant)
    operations=128+64*int(road_count)+16*int(piece_count)
    unit=2**-53
    if operations*unit>=1:
        raise ValueError('Quantization operation bound is not finite; source complexity must be reviewed')
    gamma=operations*unit/(1-operations*unit)
    maxima=abs(parent[:,:5]).max(axis=0)
    # Expand by the derived float64 bound before selecting a source ULP bin;
    # nextafter uses the larger adjacent bin at a power-of-two boundary.
    arithmetic_xy=maxima[:2] if construction_xy_abs is None else np.maximum(maxima[:2],construction_xy_abs)
    if not np.isfinite(arithmetic_xy).all():raise ValueError('Construction coordinate envelope is not finite')
    scale=1+maxima[2:5]+abs(gradient)@(1+arithmetic_xy)
    expanded=maxima+gamma*condition*32*np.concatenate((1+arithmetic_xy,scale))
    f32=expanded.astype(np.float32)
    ulps=(np.nextafter(f32,np.float32(math.inf)).astype(float)-f32.astype(float))/2
    f64=gamma*condition*32*scale
    result=2*(ulps[2:5]+abs(gradient)@ulps[:2])+f64
    if not np.isfinite(result).all():
        raise ValueError('Quantization plane/UV bound is nonfinite; this source parent cannot be admitted')
    return result,{'rounding_stages':2,'float64_operations':operations,'determinant_condition':float(condition),
                   'attribute_bounds':result.tolist(),'half_ulp_xyz_uv':ulps.tolist()}


def quantization_check(rows,parents,source,road_counts,piece_counts,checkpoint=lambda:None,construction_xy_abs=None):
    """Every packed vertex use must remain on its source plane/UV budget."""
    import numpy as np
    rows=np.asarray(rows,dtype=np.float64);parents=np.asarray(parents,dtype=int)
    if not np.isfinite(rows).all():raise ValueError('Packed terrain has a nonfinite position/UV/normal')
    budgets=np.zeros((len(source),3),dtype=float)
    max_condition=0.;max_operations=0
    for parent in np.unique(parents):
        checkpoint()
        envelope=None if construction_xy_abs is None else construction_xy_abs[parent]
        budget,policy=quantization_bounds(source[parent],road_counts[parent],piece_counts[parent],envelope)
        budgets[parent]=budget
        max_condition=max(max_condition,policy['determinant_condition'])
        max_operations=max(max_operations,policy['float64_operations'])
    maximum=np.zeros(3);maximum_ratio=np.zeros(3)
    # Work in bounded chunks instead of allocating a full N*3*8 parent copy.
    for start in range(0,len(rows),4096):
        checkpoint();stop=start+4096
        current=rows[start:stop];ps=parents[start:stop];p=np.asarray(source)[ps]
        u,v=p[:,1,:2]-p[:,0,:2],p[:,2,:2]-p[:,0,:2]
        d=current[:,:,:2]-p[:,0,None,:2]
        det=u[:,0]*v[:,1]-u[:,1]*v[:,0]
        s=(d[:,:,0]*v[:,None,1]-d[:,:,1]*v[:,None,0])/det[:,None]
        t=(u[:,None,0]*d[:,:,1]-u[:,None,1]*d[:,:,0])/det[:,None]
        expected=p[:,0,None,2:5]+s[:,:,None]*(p[:,1,None,2:5]-p[:,0,None,2:5])+t[:,:,None]*(p[:,2,None,2:5]-p[:,0,None,2:5])
        error=abs(current[:,:,2:5]-expected)
        failed=np.argwhere(error>budgets[ps,None,:])
        if len(failed):
            face,vertex,attribute=map(int,failed[0]);parent=int(ps[face])
            raise ValueError(f'Packed terrain parent{parent} output{start+face} vertex{vertex} attribute{attribute+2} residual{error[face,vertex,attribute]} exceeds finite source-quantization bound{budgets[parent,attribute]}; no source publication')
        maximum=np.maximum(maximum,error.max(axis=(0,1)))
        maximum_ratio=np.maximum(maximum_ratio,(error/budgets[ps,None,:]).max(axis=(0,1)))
    return {'vertex_uses':len(rows)*3,'maximum_plane_uv_error':maximum.tolist(),
            'maximum_error_to_bound_ratio':maximum_ratio.tolist(),'maximum_plane_uv_bounds':budgets.max(axis=0).tolist(),
            'maximum_determinant_condition':max_condition,'maximum_float64_operations':max_operations,
            'policy':'source-halfULP-two-packs-gamma-bounded-affine-v1','passed':True}


def verify_writer_readback(doc,binary,accessor,unique,indices,parents,pieces,accounting):
    """Independent bytes readback of every actual packed writer attribute."""
    import numpy as np
    if len(doc.get('meshes',[]))!=1 or len(doc['meshes'][0]['primitives'])!=1:
        raise ValueError('Derived GLB readback needs exactly one actual source primitive')
    primitive=doc['meshes'][0]['primitives'][0]
    expected={'POSITION':np.asarray(unique[:,[0,2,1]],dtype=np.float32),
              'TEXCOORD_0':np.asarray(unique[:,3:5],dtype=np.float32),
              'NORMAL':np.asarray(unique[:,5:8],dtype=np.float32)}
    values={}
    for field,original in expected.items():
        actual=accessor(doc,binary,primitive['attributes'][field])
        if actual.dtype!=np.float32 or actual.shape!=original.shape or actual.tobytes()!=original.tobytes():
            raise ValueError(f'Derived GLB actual{field} readback differs from admitted complete writer attributes')
        values[field]=actual
    actual_indices=accessor(doc,binary,primitive['indices']).reshape(-1,3)
    if not np.array_equal(actual_indices,np.asarray(indices).reshape(-1,3)):
        raise ValueError('Derived GLB actual index readback lost/reordered a complete source primitive')
    rows=np.concatenate((values['POSITION'][:,[0,2,1]],values['TEXCOORD_0'],values['NORMAL']),axis=1)[actual_indices]
    check=accounting.validate(rows,np.asarray(parents),np.asarray(pieces))
    stored,output_ids,exclusions=decode_accounting(accounting.encode())
    if not np.array_equal(stored,accounting.rows[:,[0,1,3,4,5,6]]) or not np.array_equal(output_ids,pieces) or exclusions!=accounting.exclusions:
        raise ValueError('Actual binary piece/parent/exclusion readback differs from complete packing accounting')
    return rows,{'attributes':['POSITION','TEXCOORD_0','NORMAL'],'attribute_bytes_equal':True,
                 'indices_equal':True,'source_parent_piece_membership_equal':True,'accounting':check}
