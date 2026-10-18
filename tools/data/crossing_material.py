"""One bounded Shibuya crossing material mask; existing source geometry/UVs are read only."""
from __future__ import annotations
import argparse,hashlib,io,json,math,os,stat,struct,sys,time
from pathlib import Path
import xml.etree.ElementTree as ET
BOX=(1088,1152,1376,1440)
ATLAS_SHA='b3ae2bdccd106b22f3a3ab0624a6f1a1c80410289c55429724f99029d8477e58'
BASE_SHA='edba2060ee919ef2d1f2c3b8304eea5e9e55778fee33e8cb56a8ecd8bef3d09e'
ROAD_SHA='5657bdbf446867762ae8c6831c02c05aaa905dfb5ef390279299ba774a2e2bcd'
FRAME={'schema_version':1,'id':'native-centimetres-Xeast-Ysouth-Zup-v2','definition_sha256':'2099342528416aa9dcdceea63e6d2604974341d8248f3b1c7ccf287008759170'}
DEST='data/prepared/appearance/crossing-v2'
RECEIVERS={'City_055_data68':'/Game/Surface/Roads/Tile_055/data68/StaticMeshes/data68.data68','City_058_data72':'/Game/Surface/Roads/Tile_058/data72/StaticMeshes/data72.data72','City_069_terrain':'/Game/Surface/TerrainPhoto/terrain-photo/StaticMeshes/terrain-photo.terrain-photo'}

def checked(path,new=False):
    path=Path(os.path.abspath(path))
    for part in [*reversed(path.parents),path]:
        try:info=part.lstat()
        except FileNotFoundError:
            if new and part==path:return path
            raise
        if stat.S_ISLNK(info.st_mode) or getattr(info,'st_file_attributes',0)&1024:raise ValueError('Linked/reparse path refused: '+str(part))
    return path

def read(path,limit=16*1024*1024,expected=None):
    path=checked(path)
    with path.open('rb') as f:
        before=os.fstat(f.fileno())
        if not 0<before.st_size<=limit:raise ValueError('Bounded input size refused: '+str(path))
        data=f.read(limit+1);after=os.fstat(f.fileno())
    if len(data)!=before.st_size or (before.st_size,before.st_mtime_ns)!=(after.st_size,after.st_mtime_ns):raise ValueError('Input changed during read: '+str(path))
    if expected and hashlib.sha256(data).hexdigest()!=expected:raise ValueError('Pinned input digest differs: '+str(path))
    return data

def record(relative,data):return {'path':relative,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()}
def write_new(path,data):
    path=checked(path,True)
    with path.open('xb') as f:
        if f.write(data)!=len(data):raise ValueError('Incomplete mask output: '+str(path))
    if read(path,32*1024*1024)!=data:raise ValueError('Saved asset differs: '+str(path))

def libraries(project):
    global np,Image,ImageDraw,ImageFilter
    runtime=checked(project/'data/runtime');checked(runtime/'numpy');checked(runtime/'PIL');sys.path.insert(0,str(runtime))
    import numpy as np
    from PIL import Image,ImageDraw,ImageFilter

def glb_uv_triangles(data):
    if len(data)<20 or struct.unpack_from('<4sII',data)!=(b'glTF',2,len(data)):raise ValueError('Invalid prepared road GLB header')
    size,kind=struct.unpack_from('<II',data,12)
    if kind!=0x4e4f534a:raise ValueError('Prepared road requires JSON chunk')
    doc=json.loads(data[20:20+size]);offset=20+size;length,kind=struct.unpack_from('<II',data,offset)
    if kind!=0x004e4942 or offset+8+length!=len(data):raise ValueError('Prepared road requires one exact BIN chunk')
    binary=data[offset+8:]
    def accessor(index):
        a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']]
        if 'byteStride'in v or 'sparse'in a:raise ValueError('Prepared road accessor must be tightly packed nonsparse')
        dtype={5126:'<f4',5125:'<u4',5123:'<u2'}[a['componentType']];width={'SCALAR':1,'VEC2':2}[a['type']];start=v.get('byteOffset',0)+a.get('byteOffset',0)
        return np.frombuffer(binary,dtype=dtype,count=a['count']*width,offset=start).reshape(-1,width)
    result=[]
    for mesh in doc['meshes']:
        for p in mesh['primitives']:
            if p.get('mode',4)!=4:raise ValueError('Triangle road primitive required')
            uv=accessor(p['attributes']['TEXCOORD_0']);indices=accessor(p['indices']).ravel()
            if len(indices)%3 or not len(uv) or int(indices.max())>=len(uv) or not np.isfinite(uv).all() or np.any((uv<0)|(uv>1)):raise ValueError('Invalid geographic road UV/index array')
            result.append(uv[indices.reshape(-1,3)].astype(np.float64)*np.array([2304.,2560.]))
    return np.concatenate(result)

def polygons_mask(features,resolution,box=BOX):
    image=Image.new('L',(resolution,resolution),0);draw=ImageDraw.Draw(image);scale=np.array([resolution/(box[2]-box[0]),resolution/(box[3]-box[1])])
    for feature in features:
        pts=np.asarray(feature['points'],dtype=float)
        if pts.ndim!=2 or pts.shape[1]!=2 or len(pts)<3 or not np.isfinite(pts).all():raise ValueError('Invalid closed semantic polygon: '+feature['id'])
        if np.any(pts[:,0]<box[0]) or np.any(pts[:,0]>box[2]) or np.any(pts[:,1]<box[1]) or np.any(pts[:,1]>box[3]):raise ValueError('Semantic polygon outside exact conservation clip: '+feature['id'])
        draw.polygon([tuple(p) for p in (pts-np.array(box[:2]))*scale],fill=255)
    return np.asarray(image,dtype=np.uint8).copy()

def band_coordinates(x,y,band):
    a=np.asarray(band['start'],float);b=np.asarray(band['end'],float);delta=b-a;length=float(np.linalg.norm(delta))
    if not length or not 2<=band['width_source_px']<=20:raise ValueError('Invalid authored zebra envelope: '+band['id'])
    axis=delta/length;dx,dy=x-a[0],y-a[1]
    return dx*axis[0]+dy*axis[1],-dx*axis[1]+dy*axis[0],length

def fit_phase(source,band,period,width):
    a=np.asarray(band['start']);b=np.asarray(band['end']);pad=band['width_source_px'];lo=np.floor(np.minimum(a,b)-pad).astype(int);hi=np.ceil(np.maximum(a,b)+pad).astype(int)
    y,x=np.mgrid[lo[1]:hi[1]+1,lo[0]:hi[0]+1];along,across,length=band_coordinates(x+.5,y+.5,band);eligible=(along>=0)&(along<=length)&(np.abs(across)<pad/2)
    values=source[y,x,:3].astype(float)@np.array([.2126,.7152,.0722]);best=None
    for phase in np.linspace(0,period,128,endpoint=False):
        white=((along+phase)%period)<width;one=values[eligible&white];zero=values[eligible&~white]
        if not len(one) or not len(zero):continue
        contrast=float(one.mean()-zero.mean())
        if best is None or contrast>best[0]:best=(contrast,float(phase))
    if best is None:raise ValueError('Source band has no fit population: '+band['id'])
    return best[1],best[0]

def stripe_mask(x,y,band,period,width,phase,edge):
    along,across,length=band_coordinates(x,y,band)
    phase_distance=np.minimum((along+phase)%period,width-(along+phase)%period)
    distance=np.minimum.reduce([along,length-along,band['width_source_px']/2-np.abs(across),phase_distance])
    return np.clip(distance/edge+.5,0,1)

def marked_anchors(osm_bytes, bands):
    wanted={v for band in bands for v in band['osm_ways']}
    if wanted!={'355248078','355248080','355248081','355248083','1033129756','1157451161','754454449'}:
        raise ValueError('This candidate requires the seven admitted marked-zebra anchors, not unmarked/tactile paths')
    result={}
    for way in ET.fromstring(osm_bytes).findall('way'):
        if way.get('id') in wanted:
            tags={tag.get('k'):tag.get('v') for tag in way.findall('tag')}
            if tags.get('crossing:markings')!='zebra' or tags.get('footway')!='crossing' or tags.get('highway')!='footway':
                raise ValueError('Paint anchor is not an admitted marked crossing: '+way.get('id'))
            result[way.get('id')]={'node_ids':[v.get('ref') for v in way.findall('nd')],'tags':tags}
    if set(result)!=wanted:raise ValueError('Pinned OSM lacks a required marked crossing anchor')
    return result

def material_detail(size=512,seed=581312):
    if size!=512:raise ValueError('This candidate has one fixed512square detail tile')
    rng=np.random.default_rng(seed);y,x=np.mgrid[0:size,0:size].astype(float);x=(x+.5)/size*2*math.pi;y=(y+.5)/size*2*math.pi
    def field(scales):
        total=np.zeros((size,size),float)
        for grid_size,amplitude in scales:
            grid=rng.normal(0,1,(grid_size,grid_size)).astype(np.float32)
            # Tiled padding and a central crop give periodic, nondirectional bicubic lattice noise.
            tiled=Image.fromarray(np.tile(grid,(3,3)))
            expanded=tiled.resize((size*3,size*3),Image.Resampling.BICUBIC)
            total+=np.asarray(expanded,dtype=float)[size:size*2,size:size*2]*amplitude
        total-=total.mean();scale=max(1e-8,float(np.percentile(np.abs(total),99.5)))
        return np.clip(total/scale,-1,1)
    macro=field([(4,.4),(12,.3),(32,.15),(96,.1),(256,.05)])
    grain=field([(64,.4),(128,.35),(256,.25)])
    red=np.clip(.5+.48*(.85*macro+.15*grain),0,1);green=np.clip(.5+.45*(.45*macro+.55*grain),0,1)
    wear=np.clip(1-.35*np.clip((-grain-.22)/.55,0,1),.65,1)
    # Inferred restrained paving-joint/cell variation, not a source-surveyed slab layout.
    u=(x/(2*math.pi)*16);v=(y/(2*math.pi)*16);row=np.floor(v).astype(int);shift=(row%2)*.5;frac=(u+shift)%1;fracv=v%1
    edge=np.minimum.reduce([frac,1-frac,fracv,1-fracv]);cells=rng.uniform(-.08,.08,(16,16));cell=cells[row%16,np.floor(u+shift).astype(int)%16]
    alpha=np.clip(.5+cell+.03*grain-.22*np.clip((.035-edge)/.035,0,1),0,1)
    detail=np.rint(np.stack([red,green,wear,alpha],axis=-1)*255).astype(np.uint8)
    return detail

def line_paint(x,y,line,metres_per_px,edge):
    points=np.asarray(line['points'],float)
    if points.ndim!=2 or points.shape[1]!=2 or len(points)<2 or not np.isfinite(points).all() or not .1<=line['width_m']<=.5:raise ValueError('Invalid source-traced line: '+line['id'])
    if np.any(points[:,0]<BOX[0]) or np.any(points[:,0]>=BOX[2]) or np.any(points[:,1]<BOX[1]) or np.any(points[:,1]>=BOX[3]):raise ValueError('Source-traced line outside exactclip: '+line['id'])
    distance=np.full_like(x,np.inf)
    for a,b in zip(points,points[1:]):
        delta=b-a;length2=float(delta@delta)
        if length2==0:raise ValueError('Duplicate source-traced line vertex: '+line['id'])
        t=np.clip(((x-a[0])*delta[0]+(y-a[1])*delta[1])/length2,0,1);d=np.hypot(x-(a[0]+t*delta[0]),y-(a[1]+t*delta[1]));distance=np.minimum(distance,d)
    return np.clip((line['width_m']/(2*metres_per_px)-distance)/edge+.5,0,1)

def inward_coverage(domain,radius_px):
    image=Image.fromarray(domain.astype(np.uint8)*255)
    blurred=np.asarray(image.filter(ImageFilter.GaussianBlur(radius_px)),dtype=float)/255
    return np.where(domain,np.clip((blurred-.5)/.5,0,1),0)

def build(project,semantic_path,output,resolution=2048):
    started=time.monotonic();project=checked(project);output=checked(output);libraries(project)
    if resolution!=2048:raise ValueError('This concrete candidate requires one2048square semanticmask')
    base=read(project/'data/prepared/manifest.json',1_000_000,BASE_SHA);road_data=read(project/'data/prepared/surface/road-photo-manifest.json',1_000_000,ROAD_SHA);roads=json.loads(road_data)
    atlas_bytes=read(project/'data/prepared/surface/terrain-aerial.png',16*1024*1024,ATLAS_SHA)
    with Image.open(io.BytesIO(atlas_bytes)) as im:
        if im.size!=(2304,2560):raise ValueError('Pinned atlas dimensions differ')
        source=np.asarray(im.convert('RGB'))
    sem_bytes=read(semantic_path,100000);sem=json.loads(sem_bytes)
    if type(sem.get('schema_version')) is not int or sem['schema_version']!=2 or sem.get('candidate_id')!='crossing-v2-paving-detail' or sem['atlas_sha256']!=ATLAS_SHA or tuple(sem['pixel_box'])!=BOX or sem['stripe_width_m']!=.5 or type(sem['stripe_period_m']) not in (int,float) or sem['stripe_period_m']!=1. or sem['inward_transition_m']!=.75:raise ValueError('Authored v2 semantic contract differs; v1 B channel must never be reinterpreted')
    osm=read(project/'data/source/osm/crop.osm',16*1024*1024,'a3b2c0e679b195792b2a231c9e4854a7c9268cafa592ae0447537592eaea2918');anchors=marked_anchors(osm,sem['zebra_bands'])
    inputs=[record('data/prepared/manifest.json',base),record('data/prepared/surface/road-photo-manifest.json',road_data),record('data/prepared/surface/terrain-aerial.png',atlas_bytes),record('data/source/osm/crop.osm',osm)]
    footprint=Image.new('L',(resolution,resolution),0);draw=ImageDraw.Draw(footprint);scale=resolution/288;counts={}
    for name in ('data68.glb','data72.glb'):
        row=next(v for v in roads['outputs'] if Path(v['original']['path']).name==name)
        for key in ('original','generated'):
            payload=read(project/row[key]['path'],2*1024*1024,row[key]['sha256']);inputs.append(record(row[key]['path'],payload))
        tris=glb_uv_triangles(payload);counts[name]=len(tris)
        for tri in tris:
            if np.any(tri.max(axis=0)<np.array(BOX[:2])) or np.any(tri.min(axis=0)>np.array(BOX[2:])):continue
            draw.polygon([tuple(p) for p in (tri-np.array(BOX[:2]))*scale],fill=255)
    road=np.asarray(footprint)>0;keep=polygons_mask(sem['keep_photo_polygons'],resolution)>0
    paving=(polygons_mask(sem['paving_polygons'],resolution)>0)&road&~keep
    asphalt=(polygons_mask(sem['asphalt_polygons'],resolution)>0)&road&~keep&~paving
    for a in (asphalt,paving):a[:4]=False;a[-4:]=False;a[:,:4]=False;a[:,-4:]=False
    mpp=math.cos(math.radians(35.6595))*2*math.pi*6378137/(2**18*256);coverage=inward_coverage(asphalt|paving,.75/mpp*scale)
    red=np.rint(asphalt*coverage*255).astype(np.uint8);blue=np.rint(paving*coverage*255).astype(np.uint8)
    y,x=np.mgrid[0:resolution,0:resolution].astype(float);x=BOX[0]+(x+.5)/scale;y=BOX[1]+(y+.5)/scale
    paint=np.zeros_like(x);fits=[]
    for band in sem['zebra_bands']:
        phase,contrast=fit_phase(source,band,1/mpp,.5/mpp);values=stripe_mask(x,y,band,1/mpp,.5/mpp,phase,1/scale);ratio=float((values*(red/255)).sum()/max(1,values.sum()))
        fits.append({'id':band['id'],'osm_ways':band['osm_ways'],'inferred_phase_source_px':phase,'source_white_gap_luma_difference_8bit':contrast,'allowed_coverage_fraction':ratio})
        if ratio<.5:raise ValueError('Zebra band misses source/asphalt domain: '+band['id'])
        paint=np.maximum(paint,values)
    lines=[]
    for line in sem['line_markings']:
        values=line_paint(x,y,line,mpp,1/scale);ratio=float((values*(red/255)).sum()/max(1,values.sum()));lines.append({'id':line['id'],'allowed_coverage_fraction':ratio,'inferred_width_m':line['width_m']})
        if ratio<.5:raise ValueError('Source-traced line mostly misses actual asphalt/road: '+line['id'])
        paint=np.maximum(paint,values)
    green=np.minimum(np.rint(paint*255).astype(np.uint8),red);packed=np.stack([red,green,blue],axis=-1)
    def sample(p):
        i,j=np.floor((np.asarray(p)-np.array(BOX[:2]))*scale).astype(int);return packed[j,i].tolist()
    controls={key:[{'source_pixel':p,'RGB':sample(p)} for p in sem[key]] for key in ('paving_negative_controls','paving_positive_controls','asphalt_positive_controls','vegetation_negative_controls','unresolved_photo_negative_controls')}
    if any(v['RGB'][:2]!=[0,0] for v in controls['paving_negative_controls']):raise ValueError('Independent paving asphalt/paint negative failed: '+json.dumps(controls))
    if any(v['RGB'][0]!=0 or v['RGB'][1]!=0 or v['RGB'][2]==0 for v in controls['paving_positive_controls']):raise ValueError('Authored paving control lacks source-road/semantic coverage: '+json.dumps(controls))
    if any(v['RGB'][0]!=255 for v in controls['asphalt_positive_controls']):raise ValueError('Independent asphalt interior control missing: '+json.dumps(controls))
    if any(v['RGB']!=[0,0,0] for key in ('vegetation_negative_controls','unresolved_photo_negative_controls') for v in controls[key]):raise ValueError('Vegetation/ambiguous-source replacement refused: '+json.dumps(controls))
    if np.any(red.astype(int)+blue.astype(int)>255) or np.any(green>red) or packed[~road|keep].any():raise ValueError('V2 semantic channel/domain conservation failed')
    detail=material_detail();detail_buf=io.BytesIO();Image.fromarray(detail).save(detail_buf,format='PNG');detail_bytes=detail_buf.getvalue();buf=io.BytesIO();Image.fromarray(packed).save(buf,format='PNG');mask_bytes=buf.getvalue()
    for name,data in (('crossing-mask.png',mask_bytes),('material-detail.png',detail_bytes),('semantic-polygons.json',sem_bytes)):write_new(output/name,data)
    material={'asphalt_base_color':[.08,.08,.08],'asphalt_roughness':.85,'paint_base_color':[.65,.65,.65],'paint_roughness':.7,'paving_base_color':[.22,.225,.23],'paving_roughness':.88,'asphalt_color_variation':.5,'asphalt_roughness_variation':.14,'metallic':0,'emissive':0}
    manifest={'schema_version':2,'candidate_id':'crossing-v2-paving-detail','native_frame':FRAME,'purpose':'Inferred local physical asphalt/paint/separate paving and deterministic material variation; no measured Tokyo texture/albedo or surveyed marking claim. V1 remains independently reproducible.','source_inputs':inputs,'atlas':inputs[2],'semantic_polygons':record(DEST+'/semantic-polygons.json',sem_bytes),'mask':record(DEST+'/crossing-mask.png',mask_bytes),'mask_dimensions':[2048,2048],'mask_channels':sem['mask_channels'],'detail':record(DEST+'/material-detail.png',detail_bytes),'detail_dimensions':[512,512],'detail_channels':{'R':'centered deterministic multiscale asphalt/paint color variation, mean near.5','G':'centered roughness variation','B':'paint coverage wear in.65..1; preserve stripe continuity','A':'inferred subtle paving-joint/cell variation; not source-surveyed slabs'},'detail_seed':581312,'detail_repeat_m':8.,'detail_uv_scale':[2304*mpp/8,2560*mpp/8],'pixel_box':list(BOX),'uv_origin':[BOX[0]/2304,BOX[1]/2560],'uv_scale':[2304/288,2560/288],'receivers':RECEIVERS,'material':material,'observations':{'build_elapsed_s':time.monotonic()-started,'triangle_counts':counts,'marked_OSM_anchors':anchors,'road_pixels':int(road.sum()),'asphalt_equivalent_pixels':float(red.sum()/255),'paving_equivalent_pixels':float(blue.sum()/255),'paint_equivalent_pixels':float(green.sum()/255),'partial_replacement_pixels':int(((red.astype(int)+blue>0)&(red.astype(int)+blue<255)).sum()),'all_replacement_within_road_excluding_keep_photo':True,'paint_le_asphalt':True,'asphalt_plus_paving_le_one':True,'controls':controls,'stripe_fits':fits,'line_markings':lines,'detail_channel_means_0_1':(detail.mean(axis=(0,1))/255).tolist(),'detail_channel_min_0_1':(detail.min(axis=(0,1))/255).tolist(),'detail_channel_max_0_1':(detail.max(axis=(0,1))/255).tolist(),'paint_detail_coverage_retained_mean':float(detail[:,:,2].mean()/255)},'preservation':'Original source graph returned at total replacementcoverage0, normal/other material outputs and all meshgeometry/UV/collision/transforms/frame remain unchanged. Physical source shadow/car texture within explicitly replaced carriageway is not relabelled as measured reflectance. Vegetation/ambiguous masks retain original photo.','attribution':'GSI seamless photographs; PLATEAU geometry; OpenStreetMap contributors ODbL; masks/detail/material values authored/inferred.'}
    write_new(output/'manifest.json',(json.dumps(manifest,indent=2)+'\n').encode());return manifest

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--project-root',type=Path,default=Path(__file__).absolute().parents[2]);p.add_argument('--semantic-file',type=Path,required=True);p.add_argument('--output-dir',type=Path,required=True);args=p.parse_args();r=build(args.project_root,args.semantic_file,args.output_dir)
    print(json.dumps({'status':'V2_MASK_AND_DETAIL_PREPARED_NOT_NATIVE','mask':r['mask'],'detail':r['detail'],'controls':r['observations']['controls'],'stripe_fits':r['observations']['stripe_fits'],'line_markings':r['observations']['line_markings'],'elapsed_s':r['observations']['build_elapsed_s']}))
if __name__=='__main__':main()
