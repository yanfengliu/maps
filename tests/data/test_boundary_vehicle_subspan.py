"""Bound: actual OSM interval geometry + synthetic4face Source queries; no city support/capacity."""
from pathlib import Path
import copy,hashlib,json,math,os,sys,types,unittest,tempfile,contextlib
import xml.etree.ElementTree as ET
from unittest import mock
ROOT=Path(os.environ.get('SHIBUYA_PROJECT_ROOT',Path(__file__).absolute().parents[2]))
sys.path[:0]=[str(ROOT/'tools/data'),str(ROOT/'tests/data')]
import surface_network as api
from test_source3_first_blocker import world
FIXTURE=Path(os.environ.get('SHIBUYA_BOUNDARY_SUBSPAN_FIXTURE',Path(__file__).parent/'fixtures/boundary-vehicle-subspan.json'))
class BoundaryVehicleSubspan(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  raw=FIXTURE.read_bytes()
  if hashlib.sha256(raw).hexdigest()!='c12730ad1a8abb86af40448000239b30a9053d283ed8b9432740a8325dcc9b5d':raise ValueError('Actual OSM boundary subspan fixture changed; review/restore pinned bytes')
  cls.fixture=json.loads(raw)
 def source_world(self,*,near_road=False):
  f=self.fixture;src=f['source'];points={int(k):v for k,v in src['points'].items()};way=copy.deepcopy(src['way'])
  # Four literal synthetic physical faces, constant6m; no Source/city geometry credit.
  p=[[-490.,40.,6.],[-490.,60.,6.],[-470.,40.,6.]];q=[[-470.,40.,6.],[-490.,60.,6.],[-470.,60.,6.]]
  ground=[[[x,y,z-.000003] for x,y,z in face] for face in (p,q)]
  s=world([p,q] if near_road else [],ground);s.dem_height=lambda p:6.
  s.vehicle_source=(points,{way['id']:way},types.SimpleNamespace(rejection=lambda *a:None))
  data=src['intervals'][-1];iv=s.vehicle_interval(data['edges'],data['start'],data['end'],data['width'])
  return s,iv,way
 def test_actual_contained_subspan_preserves_full_original_source_witness(self):
  s,iv,_=self.source_world();rows=s.corridor(self.fixture['extension'],'vehicle',1.8,vehicle_intervals=[iv])
  self.assertGreater(len(rows),3)
  for row in rows:
   for proof in [row,*row['cross_section']]:
    self.assertEqual(proof['vehicle_source_interval']['points'],[list(iv.start),list(iv.end)])
    self.assertEqual(proof['vehicle_source_interval']['width_m'],2.)
    self.assertEqual(proof['vehicle_source_interval']['directed_edges'],[list(k) for k in iv.edges])
    self.assertEqual(proof['source'],'GSI-DEM5A');self.assertTrue(iv.covers(proof['point']))
 def test_missing_context_keeps_refusal_and_actual_query_context(self):
  s,iv,_=self.source_world(near_road=True)
  with self.assertRaisesRegex(api.SupportRejection,'^no-admitted-road-support$') as caught:s.corridor(self.fixture['extension'],'vehicle',1.8)
  context=caught.exception.witness['corridor_query']
  self.assertEqual(context['corridor_endpoints'],self.fixture['extension']);self.assertEqual(context['offset_m'],0.)
  self.assertEqual(context['point'],self.fixture['extension'][0]);self.assertIsNone(context['vehicle_source_interval'])
  self.assertEqual(context['parameter'],0.);self.assertEqual(context['width_m'],1.8)
  rows=s.corridor(self.fixture['extension'],'vehicle',1.8,vehicle_intervals=[iv])
  self.assertGreater(len(rows),3);self.assertTrue(all(r['source']=='PLATEAU-road' for r in rows))
 def test_original_unshifted_footprint_is_not_implicitly_authorized(self):
  s,iv,_=self.source_world();p=api.np.asarray(self.fixture['original_point'][:2]);d=api.np.asarray(iv.end)-iv.start;d/=api.np.linalg.norm(d)
  with self.assertRaisesRegex(ValueError,'outside-original-interval|endpoint-outside'):s.corridor([(p-2.2*d).tolist(),(p+2.2*d).tolist()],'vehicle',1.8,vehicle_intervals=[iv])
 def test_outside_endpoints_and_cross_section_refuse(self):
  for delta in (api.np.array([-5.,0.]),api.np.array([0.,2.])):
   s,iv,_=self.source_world();polyline=[(api.np.asarray(p)+delta).tolist() for p in self.fixture['extension']]
   with self.subTest(delta=delta.tolist()),self.assertRaisesRegex(ValueError,'outside-original-interval|endpoint-outside|centreline-differs'):s.corridor(polyline,'vehicle',1.8,vehicle_intervals=[iv])
 def test_direction_and_width_stay_strict(self):
  s,iv,_=self.source_world()
  with self.assertRaisesRegex(ValueError,'direction-differs'):s.corridor(self.fixture['extension'][::-1],'vehicle',1.8,vehicle_intervals=[iv])
  for width in (2.001,0.,float('nan')):
   with self.subTest(width=width),self.assertRaisesRegex(ValueError,'width-exceeds'):s.corridor(self.fixture['extension'],'vehicle',width,vehicle_intervals=[iv])
 def test_forged_authority_and_wrong_source_direction_refuse(self):
  s,iv,_=self.source_world()
  bad=api.VehicleInterval(iv.start,iv.end,2.,((999,1,2),))
  with self.assertRaisesRegex(ValueError,'not-admitted-ground-road'):s.corridor(self.fixture['extension'],'vehicle',1.8,vehicle_intervals=[bad])
  reversed_key=tuple((k[0],k[2],k[1]) for k in iv.edges);bad=api.VehicleInterval(iv.start,iv.end,2.,reversed_key)
  with self.assertRaisesRegex(ValueError,'does-not-match-source'):s.corridor(self.fixture['extension'],'vehicle',1.8,vehicle_intervals=[bad])
 def test_in_band_skew_is_not_an_original_traversal_subspan(self):
  s,iv,_=self.source_world();polyline=copy.deepcopy(self.fixture['extension'])
  polyline[0][1]+=.01;polyline[1][1]+=.02
  with self.assertRaisesRegex(ValueError,'centreline-differs'):s.corridor(polyline,'vehicle',1.8,vehicle_intervals=[iv])
 def test_ordinary_full_lane_validator_stays_unchanged(self):
  s,iv,_=self.source_world()
  for points,width in ((self.fixture['extension'],2.),([list(iv.start),list(iv.end)],1.8)):
   with self.subTest(points=points,width=width),self.assertRaisesRegex(ValueError,'does-not-match-source'):s.vehicle_interval(iv.edges,*points,width)
 def test_subspan_cannot_replace_turn_contexts_or_multi_interval_paths(self):
  s,iv,_=self.source_world()
  with self.assertRaisesRegex(ValueError,'original-authority-for-each-span'):s.corridor(self.fixture['extension'],'vehicle',1.8,vehicle_contexts=[iv.edges],vehicle_intervals=[iv])
  with self.assertRaisesRegex(ValueError,'original-authority-for-each-span'):s.corridor(self.fixture['extension']*2,'vehicle',1.8,vehicle_intervals=[iv])
 def test_boundary_caller_uses_actual_original_interval_for_shifted_pose(self):
  s,iv,way=self.source_world();f=self.fixture;nodes={int(k):ET.Element('node',v) for k,v in f['source']['wgs84'].items()}
  base=api.verify_base(ROOT/'data/prepared/manifest.json')
  piece={'way_id':way['id'],'from':iv.edges[0][1],'to':iv.edges[0][2],'points':[list(iv.start),list(iv.end)]}
  record,(_,payload)=api.boundary_endpoint(piece,True,[*f['shifted_xy'],6.],nodes,way,s,base)
  self.assertEqual(record['point'][:2],f['shifted_xy']);self.assertLess(record['distance_to_crop_boundary_m'],20.)
  self.assertEqual(record['footprint']['length_m'],4.4);self.assertEqual(record['footprint']['width_m'],1.8)
  self.assertEqual(record['footprint']['sample_count'],len(json.loads(payload)))
  self.assertGreater(f['raw_flow_upper_bound_before_trim_m']-f['shift_m'],1280.)
 def test_physical_negative_and_building_are_not_waived(self):
  s,iv,_=self.source_world();s.buildings=[{'polygon':[[-484.,46.],[-479.,46.],[-479.,50.],[-484.,50.]]}]
  s.building_bins[math.floor(-482/12),math.floor(48/12)]=[0]
  with self.assertRaisesRegex(ValueError,'building-interior'):s.corridor(self.fixture['extension'],'vehicle',1.8,vehicle_intervals=[iv])
  s,iv,_=self.source_world();s.source3_terrain_refs[0]['reconstruction_role']='physical-sidewall'
  with self.assertRaisesRegex(api.SupportRejection,'ineligible-reconstruction-first-blocker'):s.corridor(self.fixture['extension'],'vehicle',1.8,vehicle_intervals=[iv])

 def test_nonfinite_boolean_or_text_subspan_coordinates_refuse(self):
  s,iv,_=self.source_world()
  for value in (float('nan'),True,'1'):
   points=copy.deepcopy(self.fixture['extension']);points[0][0]=value
   with self.subTest(value=value),self.assertRaisesRegex(ValueError,'finite'):s.corridor(points,'vehicle',1.8,vehicle_intervals=[iv])

 def test_body_windows_start_at_trimmed_distance_zero_but_keep_whole_authority_XY(self):
  from test_vehicle_body_packet import PacketTests,body
  fake,s,movement,network,xy=PacketTests().fixture()
  original=[[xy[0]-3,xy[1]],[xy[0]+4,xy[1]]]
  interval=types.SimpleNamespace(start=tuple(original[0]),end=tuple(original[1]),width=2.,edges=((7,11,12),))
  s.vehicle_interval=mock.Mock(return_value=interval)
  fake.support_source3.frozen_vehicle_path=lambda *args:(original,[((7,11,12),)],[])
  network['routes'][0]['source_lane_segments']=[{'way_id':7,'from_osm_node':11,'to_osm_node':12,'lane_points':original}]
  before=copy.deepcopy(network);packet=body.prepare(fake,s,movement,network)
  windows=packet['routes'][0]['windows'];self.assertEqual(windows[0]['start_m'],0.)
  self.assertEqual(windows[-1]['end_m'],1.);self.assertEqual(network,before)
  self.assertEqual(s.vehicle_interval.call_args,mock.call(((7,11,12),),*original,2))
  for window in windows:
   self.assertEqual(window['intervals'][0]['start_m'],original[0]);self.assertEqual(window['intervals'][0]['end_m'],original[1])
  self.assertNotEqual(windows[0]['intervals'][0]['start_m'],network['routes'][0]['points'][0][:2])


class FrozenBoundarySubspan(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  p=Path(os.environ.get('SHIBUYA_BOUNDARY_FLOW_FIXTURE',Path(__file__).parent/'fixtures/boundary-flow-authority.json'));raw=p.read_bytes()
  if hashlib.sha256(raw).hexdigest()!='dd826cfa46b20e69b4383db2646ff23d627319005e24808f1d2aa0bc8c1bb223':raise ValueError('Pinned actual original flow authority fixture changed')
  cls.fixture=json.loads(raw)
 def source_world(self):
  f=self.fixture;tree=ET.Element('osm')
  for node in f['nodes'].values():ET.SubElement(tree,'node',node)
  for relation in f['restriction_relations']:
   r=ET.SubElement(tree,'relation',{'id':str(relation['relation_id'])})
   for role,kind,id in relation['members']:ET.SubElement(r,'member',{'role':role,'type':kind,'ref':str(id)})
   for k,v in relation['tags'].items():ET.SubElement(r,'tag',{'k':k,'v':v})
  s=types.SimpleNamespace(base=f['base'],support_manifest={'schema_version':3})
  s.vehicle_source=({int(k):v for k,v in f['points'].items()},{w['id']:w for w in f['ways']},api.TurnRestrictions(tree))
  s.vehicle_interval=types.MethodType(api.Surface.vehicle_interval,s);s.vehicle_subspan=types.MethodType(api.Surface.vehicle_subspan,s)
  edges=[{'way_id':r['way_id'],'from':r['from_osm_node'],'to':r['to_osm_node'],'points':r['lane_points']} for r in f['source_lane_segments']]
  points,contexts=api.vehicle_polyline(edges);authorities=[s.vehicle_interval(c,a,b,2.) for (a,b),c in zip(zip(points,points[1:]),contexts)]
  retained=[list(p) for p in points];flow={'crop_bounds':f['base']['bounds']};nodes={int(n.attrib['id']):n for n in tree.findall('node')}
  for name,entry,index in (('entry',True,0),('exit',False,-1)):
   edge=edges[index];a,b=api.np.asarray(edge['points']);d=(b-a)/api.np.linalg.norm(b-a)
   xy=a+2.21*d if entry else b-2.21*d
   point=[*xy.tolist(),6.];retained[index]=point[:2]
   record,extension=api.boundary_source_geometry(edge,entry,point,nodes,s.vehicle_source[1][edge['way_id']],s.base)
   s.vehicle_subspan(authorities[index],*extension,1.8)
   record['footprint']={'length_m':4.4,'width_m':1.8,'verified':True,'sample_count':4,'samples_path':'synthetic-not-city-support','samples_sha256':'0'*64};flow[name]=record
  row={'id':'actual-source-flow','kind':'vehicle','closed':False,'width_m':2.,'source_lane_segments':f['source_lane_segments'],'points':[[*p,6.] for p in retained],'boundary_flow':flow}
  return s,row,tree,points,contexts,authorities
 def call(self,s,row,tree,**kwargs):
  with mock.patch.object(api,'osm_tree',return_value=tree):return api.support_source3.frozen_vehicle_path(api,row,s,**kwargs)
 def test_default_body_consumer_keeps_full_original_authority_endpoints(self):
  s,row,tree,points,contexts,_=self.source_world();p,c,edges=self.call(s,row,tree)
  self.assertEqual(p,points);self.assertEqual(c,contexts);self.assertNotEqual(p[0],row['points'][0][:2]);self.assertEqual(edges[0]['points'],points[:2])
 def test_explicit_source_consumer_keeps_trimmed_anchors_and_whole_authorities(self):
  s,row,tree,points,contexts,authorities=self.source_world();p,iv,_=self.call(s,row,tree,supported_subspan=True)
  self.assertEqual(p[0],row['points'][0][:2]);self.assertEqual(p[-1],row['points'][-1][:2]);self.assertEqual(p[1:-1],points[1:-1]);self.assertEqual(iv,authorities)
  self.assertEqual(list(iv[0].start),points[0]);self.assertEqual(list(iv[-1].end),points[-1])
 def test_trim_requires_open_boundary_and_typed_explicit_source_option(self):
  s,row,tree,*_=self.source_world()
  for mutation in ('closed','missing-flow'):
   changed=copy.deepcopy(row)
   if mutation=='closed':changed['closed']=True
   else:del changed['boundary_flow']
   with self.subTest(mutation=mutation),self.assertRaises(ValueError):self.call(s,changed,tree)
  for option in (1,None,'yes'):
   with self.subTest(option=option),self.assertRaisesRegex(ValueError,'explicit boolean'):self.call(s,row,tree,supported_subspan=option)
 def test_boundary_metadata_must_recompute_from_original_osm(self):
  s,row,tree,*_=self.source_world()
  for field in ('point','heading_enu','source_node_id','source_way_id','continuation','crop_bounds','footprint'):
   changed=copy.deepcopy(row)
   if field=='crop_bounds':changed['boundary_flow'][field]={}
   elif field=='point':changed['boundary_flow']['entry'][field][0]+=.1
   elif field=='heading_enu':changed['boundary_flow']['entry'][field]=[0.,0.,0.]
   elif field=='continuation':changed['boundary_flow']['entry'][field]['outside_node_id']=999
   elif field=='footprint':changed['boundary_flow']['entry'][field]['width_m']=2.
   else:changed['boundary_flow']['entry'][field]=999
   with self.subTest(field=field),self.assertRaises(ValueError):self.call(s,changed,tree)
 def test_original_join_cannot_disappear_from_trimmed_runtime_path(self):
  s,row,tree,*_=self.source_world();index=10;anchor=row['points'][index][:2]
  row['points']=[p for p in row['points'] if p[:2]!=anchor]
  with self.assertRaisesRegex(ValueError,'retained original join'):self.call(s,row,tree)
 def test_trimmed_path_cannot_reorder_or_reverse_original_traversal(self):
  s,row,tree,*_=self.source_world();row['points'][10:12]=row['points'][10:12][::-1]
  with self.assertRaisesRegex(ValueError,'XY differs|reorders'):self.call(s,row,tree)
 def test_body_extension_and_lateral_reroute_cannot_be_hidden_by_metadata(self):
  s,row,tree,points,*_=self.source_world();row['points'][0]=[*points[0],6.]
  nodes={int(n.attrib['id']):n for n in tree.findall('node')};edge={'way_id':row['source_lane_segments'][0]['way_id'],'from':row['source_lane_segments'][0]['from_osm_node'],'to':row['source_lane_segments'][0]['to_osm_node'],'points':row['source_lane_segments'][0]['lane_points']}
  geometry,_=api.boundary_source_geometry(edge,True,row['points'][0],nodes,s.vehicle_source[1][edge['way_id']],s.base)
  row['boundary_flow']['entry'].update(geometry)
  with self.assertRaisesRegex(ValueError,'endpoint-outside|outside-original'):self.call(s,row,tree)

 def reprofile(self,*,outside_stop=False):
  s,row,tree,original,*_=self.source_world();row['stops']=[{'distance_m':10.,'direction':1,'signal_id':'synthetic-clock'}]
  if outside_stop:row['stops'][0]['distance_m']=api.polyline_length(row['points'])+1.
  s.support_manifest.update(native_frame=api.native_frame_record(),native_roads=[],inputs={'roads':[]})
  s.support_record={'sha256':'s'*64};s.derived_record={'sha256':'d'*64};s.road=types.SimpleNamespace(sources=[]);s.dem_records=[]
  def corridor(polyline,kind,width,**kwargs):
   if kind=='vehicle':
    iv=kwargs['vehicle_intervals']
    for (a,b),authority in zip(zip(polyline,polyline[1:]),iv):
     if a!=b:s.vehicle_subspan(authority,a,b,width)
   result=[]
   for a,b in zip(polyline,polyline[1:]):
    distance=math.dist(a,b)
    if distance==0:continue
    count=math.ceil(distance/1.5)
    for i in range(count+1):
     xy=list(a) if i==0 else list(b) if i==count else [a[k]+(b[k]-a[k])*i/count for k in (0,1)]
     result.append({'point':[*xy,6.],'cross_section':[],'source':'synthetic-admitted-corridor'})
   return result
  s.corridor=corridor;s.check=lambda p,kind,**kw:([float(p[0]),float(p[1]),6.],{})
  source={'base':api.CONFIG['base_manifest_sha256'],'native_frame':api.native_frame_record()};source_payload=api.encoded(source)
  network={'routes':[row],'source_manifest_sha256':api.sha(source_payload),'default_spawn':[0.,0.,6.]}
  movement={'totals':{'support_samples':0}}
  config=copy.deepcopy(api.CONFIG);support=config['support_surface']
  records={}
  for name,value in (('frozen_source_manifest',source),('frozen_network',network),('frozen_movement_manifest',{'movement':movement})):
   payload=api.encoded(value);record={'path':name+'.json','bytes':len(payload),'sha256':api.sha(payload)};support[name]=record;records[record['path']]=payload
  with tempfile.TemporaryDirectory() as temporary,contextlib.ExitStack() as stack:
   root=Path(temporary)
   for name,value in (('ROOT',root),('OUT',root/'data/prepared/surface'),('CONFIG',config),
       ('admitted_record',lambda record,*a:records[record['path']]),('osm_tree',lambda:tree),
       ('osm_sources',lambda base:({int(n.attrib['id']):n for n in tree.findall('node')},s.vehicle_source[0],list(s.vehicle_source[1].values()),[])),
       ('Surface',lambda *a,**kw:s)):
    stack.enter_context(mock.patch.object(api,name,value))
   if outside_stop:
    with self.assertRaisesRegex(ValueError,'refused1|refused 1'):api.reprofile_frozen_network(s.base)
    report=json.loads((api.OUT/'support-reprofile-report.json').read_bytes())
    self.assertEqual(report['refusals'][0]['reason'],'original-signal-stop-outside-retained-source-path')
    self.assertFalse((api.OUT/'movement-network.json').exists());return
   result=api.reprofile_frozen_network(s.base);published=json.loads((root/result['network']['path']).read_bytes());new=published['routes'][0]
   self.assertEqual(new['points'][0][:2],row['points'][0][:2]);self.assertEqual(new['points'][-1][:2],row['points'][-1][:2])
   self.assertNotEqual(new['points'][0][:2],original[0]);self.assertNotEqual(new['points'][-1][:2],original[-1])
   self.assertEqual(new['source_lane_segments'],row['source_lane_segments']);self.assertAlmostEqual(new['stops'][0]['distance_m'],10.)
   metadata=json.loads((root/result['source_manifest']['path']).read_bytes())
   self.assertEqual(len(metadata['source_corridor_profiles']),1)
   for record in result['support_samples']+metadata['source_corridor_profiles']+result['boundary_support_samples']:
    payload=(root/record['path']).read_bytes();self.assertEqual(len(payload),record['bytes']);self.assertEqual(api.sha(payload),record['sha256'])
 def test_actual_reprofile_caller_keeps_only_retained_span_and_rebinds_profiles(self):self.reprofile()
 def test_actual_reprofile_caller_rejects_stop_outside_retained_span(self):self.reprofile(outside_stop=True)

if __name__=='__main__':unittest.main()
