"""Bounded semantic/UV/stripe controls plus the exact published candidate mask; no native appearance claim."""
import tempfile,copy,hashlib,importlib.util,io,json,os,stat,struct,unittest
from pathlib import Path
PROJECT=Path(os.environ.get('SHIBUYA_SOURCE_ROOT',Path(__file__).parents[2]))
SUBJECT=Path(os.environ.get('CROSSING_MATERIAL_SUBJECT',PROJECT/'tools/data/crossing_material.py'))
ASSETS=Path(os.environ.get('CROSSING_MATERIAL_ASSETS',PROJECT/'data/prepared/appearance/crossing-v2'))

def checked(p):
 for q in [*reversed(p.absolute().parents),p.absolute()]:
  s=q.lstat()
  if stat.S_ISLNK(s.st_mode) or getattr(s,'st_file_attributes',0)&1024:raise RuntimeError(str(q))
 return p
s=importlib.util.spec_from_file_location('crossing_material_subject',checked(SUBJECT));m=importlib.util.module_from_spec(s);s.loader.exec_module(m);m.libraries(checked(PROJECT));np=m.np
class CrossingMaskTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.manifest=json.loads(m.read(ASSETS/'manifest.json',100000));cls.semantic=json.loads(m.read(ASSETS/'semantic-polygons.json',100000));cls.raw=m.read(ASSETS/'crossing-mask.png',16*1024*1024)
  cls.mask=np.asarray(m.Image.open(io.BytesIO(cls.raw)))
 def sample(self,p):
  x,y=np.floor((np.array(p)-np.array([1088,1152]))*2048/288).astype(int);return self.mask[y,x,:3].tolist()
 def test_versioned_mask_detail_and_source_identity(self):
  self.assertEqual(self.manifest['schema_version'],2);self.assertEqual(self.manifest['candidate_id'],'crossing-v2-paving-detail')
  self.assertEqual(hashlib.sha256(self.raw).hexdigest(),'fd3d9649f431aeb3eee34a7bf70b63490259e54cf91bf46d57306aca91fe7921')
  self.assertEqual(self.manifest['atlas']['sha256'],'b3ae2bdccd106b22f3a3ab0624a6f1a1c80410289c55429724f99029d8477e58')
  self.assertEqual(set(self.manifest['receivers']),{'City_055_data68','City_058_data72','City_069_terrain'});self.assertEqual(self.mask.shape,(2048,2048,3))
  self.assertEqual(self.manifest['pixel_box'],[1088,1152,1376,1440]);self.assertEqual(self.manifest['uv_origin'],[1088/2304,1152/2560]);self.assertEqual(self.manifest['uv_scale'],[2304/288,2560/288])
  raw=m.read(ASSETS/'material-detail.png',2*1024*1024);self.assertEqual(hashlib.sha256(raw).hexdigest(),'bff495c5145369ffdff3cd7f1b7dde50e5d00b51a3fd10dca93fd1e980a41592');self.assertEqual(np.asarray(m.Image.open(io.BytesIO(raw))).shape,(512,512,4))
 def test_literal_paving_asphalt_and_exclusion_samples(self):
  for p in ([1178,1242],[1234,1241],[1184,1348],[1295,1300]):self.assertEqual(self.sample(p)[:2],[0,0],p)
  for p in ([1202,1248],[1233,1242],[1295,1300]):self.assertEqual(self.sample(p),[0,0,255],p)
  for p in ([1220,1280],[1222,1301],[1252,1293]):self.assertEqual(self.sample(p),[255,0,0],p)
  for p in ([1184,1348],[1175,1360],[1220,1220],[1320,1300]):self.assertEqual(self.sample(p),[0,0,0],p)
 def test_channel_domain_border_and_inward_transition_conservation(self):
  self.assertTrue(np.all(self.mask[:,:,1]<=self.mask[:,:,0]));total=self.mask[:,:,0].astype(int)+self.mask[:,:,2];self.assertTrue(np.all(total<=255));self.assertGreater(int(((total>0)&(total<255)).sum()),100000)
  self.assertFalse(self.mask[:4].any());self.assertFalse(self.mask[-4:].any());self.assertFalse(self.mask[:,:4].any());self.assertFalse(self.mask[:,-4:].any())
  keep=m.polygons_mask(self.semantic['keep_photo_polygons'],2048)>0;self.assertFalse(self.mask[keep].any())
  domain=(m.polygons_mask(self.semantic['asphalt_polygons'],2048)>0)|(m.polygons_mask(self.semantic['paving_polygons'],2048)>0);self.assertFalse(self.mask[~domain].any())
  # Independently reconstruct actual pinned source UV footprint, rather than treating road union as asphalt.
  road=m.Image.new('L',(2048,2048),0);draw=m.ImageDraw.Draw(road)
  for name in ('data68.glb','data72.glb'):
   row=next(v for v in self.manifest['source_inputs'] if v['path']=='data/prepared/surface/roads/'+name)
   tris=m.glb_uv_triangles(m.read(PROJECT/row['path'],2*1024*1024,row['sha256']))
   for tri in tris:
    if np.any(tri.max(axis=0)<np.array([1088,1152])) or np.any(tri.min(axis=0)>np.array([1376,1440])):continue
    draw.polygon([tuple(p) for p in (tri-np.array([1088,1152]))*(2048/288)],fill=255)
  self.assertFalse(self.mask[np.asarray(road)==0].any())
 def test_all_five_zebras_and_four_source_traced_lines_keep_admitted_coverage(self):
  fits=self.manifest['observations']['stripe_fits'];self.assertEqual(set(v['id'] for v in fits),{'west','north','east','south','diagonal'});self.assertTrue(all(v['allowed_coverage_fraction']>=.9 for v in fits))
  lines=self.manifest['observations']['line_markings'];self.assertEqual(len(lines),4);self.assertTrue(all(v['allowed_coverage_fraction']>.75 for v in lines))
 def test_detail_is_deterministic_centered_worn_and_periodic_without_equal_edge_cheat(self):
  a=m.material_detail();b=m.material_detail();other=m.material_detail(seed=581313);self.assertTrue(np.array_equal(a,b));self.assertFalse(np.array_equal(a,other))
  actual=np.asarray(m.Image.open(io.BytesIO(m.read(ASSETS/'material-detail.png',2*1024*1024))));self.assertTrue(np.array_equal(a,actual))
  self.assertTrue(np.all(np.abs(a[:,:,:2].mean(axis=(0,1))/255-.5)<.002));self.assertGreaterEqual(a[:,:,2].min()/255,.65);self.assertGreater(a[:,:,2].mean()/255,.95);self.assertLess(a[:,:,2].min(),255)
  for axis in (0,1):
   f=a[:,:,:3].astype(float);seam=np.abs(np.take(f,0,axis=axis)-np.take(f,-1,axis=axis)).mean();inside=np.abs(np.diff(f,axis=axis)).mean();self.assertLess(seam,inside*2)
 def test_inward_coverage_never_grows_domain_and_retains_interior(self):
  domain=np.zeros((64,64),bool);domain[8:56,8:56]=True;c=m.inward_coverage(domain,3);self.assertFalse(c[~domain].any());self.assertEqual(c[32,32],1.);self.assertGreater(c[8,32],0.);self.assertLess(c[8,32],.5)
 def test_source_traced_line_is_bounded_and_clipped_to_semantics_at_composition(self):
  y,x=np.mgrid[1190:1220,1100:1140].astype(float);line={'id':'literal','points':[[1105,1205],[1130,1205]],'width_m':.4};p=m.line_paint(x,y,line,.5,.1);self.assertGreater(p[15,10],0);self.assertEqual(p[0,10],0)
  for points in ([[1087,1200],[1110,1200]],[[1110,1200],[1110,1200]]):
   with self.assertRaises(ValueError):m.line_paint(x,y,dict(line,points=points),.5,.1)
 def test_polygon_rejects_outside_clip_and_nonfinite_points(self):
  for points in ([[1087,1200],[1200,1200],[1200,1300]],[[1100,1200],[1200,float('nan')],[1200,1300]],[[1,2],[3,4]]):
   with self.subTest(points=points),self.assertRaises(ValueError):m.polygons_mask([{'id':'bad','points':points}],32)
 def test_stripes_follow_only_the_admitted_envelope_and_repeat_in_its_axis(self):
  band={'id':'literal','start':[4,10],'end':[28,10],'width_source_px':4}
  x=np.array([5.,9.,13.,17.,21.,5.,5.,3.,29.]);y=np.array([10.]*5+[7.,13.,10.,10.])
  values=m.stripe_mask(x,y,band,4.,2.,0.,.05);self.assertTrue(np.all(values[:5]==1));self.assertTrue(np.all(values[5:]==0))
 def test_phase_fit_uses_only_inside_hand_traced_band(self):
  band={'id':'literal','start':[8,16],'end':[40,16],'width_source_px':6}
  y,x=np.mgrid[:48,:48];signal=(((x+.5-8+.75)%4)<2)*200+20;source=np.repeat(signal[:,:,None],3,axis=2).astype('uint8')
  phase,contrast=m.fit_phase(source,band,4.,2.);self.assertGreater(contrast,190)
  perturbed=source.copy();perturbed[:12]=255;perturbed[20:]=0;other=m.fit_phase(perturbed,band,4.,2.);self.assertEqual((phase,contrast),other)
 def test_unmarked_or_missing_OSM_anchor_refuses_without_invented_paint(self):
  ids=['355248078','355248080','355248081','355248083','1033129756','1157451161','754454449'];bands=[{'osm_ways':ids}]
  def source(change=None):return ('<osm>'+''.join('<way id="'+v+'"><tag k="highway" v="footway"/><tag k="footway" v="crossing"/><tag k="crossing:markings" v="'+('no' if v==change else 'zebra')+'"/></way>' for v in ids)+'</osm>').encode()
  self.assertEqual(set(m.marked_anchors(source(),bands)),set(ids))
  with self.assertRaisesRegex(ValueError,'not an admitted marked'):m.marked_anchors(source(ids[0]),bands)
  with self.assertRaisesRegex(ValueError,'seven admitted'):m.marked_anchors(source(),[{'osm_ways':ids[:-1]}])
  with self.assertRaisesRegex(ValueError,'lacks a required'):m.marked_anchors(b'<osm/>',bands)
 def test_boolean_semantic_schema_refuses_before_mask_outputs(self):
  with tempfile.TemporaryDirectory(dir=checked(ASSETS.parent)) as folder:
   root=checked(Path(folder));sem=copy.deepcopy(self.semantic);sem['schema_version']=True
   m.write_new(root/'semantic.json',(json.dumps(sem)+'\n').encode())
   with self.assertRaisesRegex(ValueError,'semantic contract differs'):m.build(PROJECT,root/'semantic.json',root)
   self.assertEqual(sorted(v.name for v in checked(root).iterdir()),['semantic.json'])
 def test_old_v1_schema_cannot_be_relabelled_as_paving(self):
  with tempfile.TemporaryDirectory(dir=checked(ASSETS.parent)) as folder:
   root=checked(Path(folder));sem=copy.deepcopy(self.semantic);sem['schema_version']=1
   m.write_new(root/'old-v1.json',(json.dumps(sem)+'\n').encode())
   with self.assertRaisesRegex(ValueError,'v1 B channel must never be reinterpreted'):m.build(PROJECT,root/'old-v1.json',root)
   self.assertEqual(sorted(v.name for v in checked(root).iterdir()),['old-v1.json'])
 def test_changed_semantic_bytes_cannot_satisfy_published_hash(self):
  with self.assertRaisesRegex(ValueError,'digest differs'):m.read(ASSETS/'semantic-polygons.json',100000,'0'*64)
 def test_uv_triangle_decoder_preserves_order_and_exact_atlas_mapping(self):
  uv=np.array([[0.,0.],[1.,0.],[0.,1.]],dtype='<f4');indices=np.array([2,0,1],dtype='<u4');binary=uv.tobytes()+indices.tobytes()
  doc={'bufferViews':[{'byteOffset':0,'byteLength':24},{'byteOffset':24,'byteLength':12}],'accessors':[{'bufferView':0,'componentType':5126,'count':3,'type':'VEC2'},{'bufferView':1,'componentType':5125,'count':3,'type':'SCALAR'}],'meshes':[{'primitives':[{'attributes':{'TEXCOORD_0':0},'indices':1}]}]}
  j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*((-len(j))%4);data=struct.pack('<4sII',b'glTF',2,12+8+len(j)+8+len(binary))+struct.pack('<II',len(j),0x4e4f534a)+j+struct.pack('<II',len(binary),0x004e4942)+binary
  self.assertEqual(m.glb_uv_triangles(data).tolist(),[[[0.,2560.],[0.,0.],[2304.,0.]]])
  bad=bytearray(data);struct.pack_into('<I',bad,8,1)
  with self.assertRaisesRegex(ValueError,'header'):m.glb_uv_triangles(bad)
 def test_published_all_inputs_are_still_the_original_bytes(self):
  for row in self.manifest['source_inputs']:
   payload=m.read(PROJECT/row['path'],16*1024*1024,row['sha256']);self.assertEqual(len(payload),row['bytes'])
if __name__=='__main__':unittest.main()
