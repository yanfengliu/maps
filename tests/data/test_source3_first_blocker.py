"""Bound: exact captured4face seam and finite policy controls, no city index."""
from pathlib import Path
from fractions import Fraction as F
import collections,copy,hashlib,json,math,struct,sys,types,unittest,contextlib,io
import xml.etree.ElementTree as ET
from unittest import mock
ROOT=Path(__file__).absolute().parents[2];sys.path.insert(0,str(ROOT/'tools/data'))
import surface_network as api
np=api.np

def world(road,terrain,*,schema=3,reference=0.):
 s=api.Surface.__new__(api.Surface);s.network_diagnostic=None;s.diagnostic_counts=collections.Counter()
 s.road_index=api.NativeTriangleIndex(np.asarray(road,float));s.terrain_index=api.NativeTriangleIndex(np.asarray(terrain,float))
 s.road=types.SimpleNamespace(layer_refs=[{'kind':'road','source':0,'mesh':0,'primitive':0,'triangle':i,'source_triangle_index':i} for i in range(len(road))])
 s.support_manifest={'schema_version':schema,'native_roads':[{'actor_label':'City_fixture_road','triangles':len(road),'source':{'sha256':'r'*64}}]}
 s.support_record={'sha256':'s'*64};s.derived_record={'sha256':'d'*64};s.terrain_sources=list(range(len(terrain)))
 s.source3_terrain_refs=[{'kind':'terrain','triangle':i,'parent_triangle':i,'original_triangle':i} for i in range(len(terrain))]
 s.buildings=[];s.building_bins=collections.defaultdict(list);s.dem_height=lambda point:reference;s.vehicle_source=None
 return s

def plane(z=0.,reverse=False):
 row=np.array([[-100.,-100.,z],[-100.,100.,z],[100.,-100.,z]])
 return row[[0,2,1]] if reverse else row

class Source3FirstBlocker(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  path=Path(__file__).parent/'fixtures/source3-first-blocker.json';raw=path.read_bytes();cls.fixture=json.loads(raw)
  cls.fixture_sha=hashlib.sha256(raw).hexdigest()

 def real_world(self):
  f=self.fixture;roads=[row for row in f['faces'] if row['provider']=='road'];terrain=[row for row in f['faces'] if row['provider']=='terrain']
  s=world([np.asarray(row['native_f32_cm'])/100 for row in roads],[np.asarray(row['native_f32_cm'])/100 for row in terrain])
  expected={row['label']:row for row in f['observations']}
  s.road.layer_refs=[copy.deepcopy(expected['previous-centre']['point_check'][1]['layer_ref']),copy.deepcopy(expected['previous-edge-1.0']['point_check'][1]['layer_ref'])]
  s.source3_terrain_refs=copy.deepcopy(f['terrain_refs'])
  s.terrain_sources=[row.get('original_triangle',0) for row in s.source3_terrain_refs]
  s.support_record={'sha256':f['support_manifest_sha256']};s.derived_record={'sha256':expected['current-centre']['point_check'][1]['derived_terrain_sha256']}
  s.support_manifest['native_roads']=copy.deepcopy(f['native_roads'])
  values={struct.pack('=dd',*row['literal_xy']):row['point_check'][1]['dem_nearest_m'] for row in f['observations']}
  s.dem_height=lambda p:values[struct.pack('=dd',*p[:2])]
  source=f['actual_vehicle_source'];way=source['way'];points={int(key):value for key,value in source['points'].items()}
  s.vehicle_source=(points,{way['id']:way},types.SimpleNamespace(rejection=lambda a,b:None))
  c=f['corridor'];interval=s.vehicle_interval(c['vehicle_contexts'][0],np.array(c['points'][0]),np.array(c['points'][1]),c['width'])
  return s,interval,expected

 def test_actual_four_face_source_seam_selects_continuous_higher_physical_surface(self):
  s,interval,e=self.real_world()
  for label in ('previous-centre','current-centre'):
   p,proof=s.check(e[label]['literal_xy'],'vehicle',vehicle_interval=interval)
   self.assertEqual(proof['source'],'GSI-DEM5A');self.assertEqual(proof['triangle'],26184)
   target=next(hit['height'] for hit in e[label]['hits']['terrain']['physical'] if hit['triangle']==26184)
   self.assertEqual(p[2],target);self.assertEqual(proof['layer_ref'],e['current-centre']['point_check'][1]['layer_ref'])

 def test_actual_four_face_source_seam_keeps_original_grade_threshold(self):
  s,interval,e=self.real_world();p,pr=s.check(e['previous-centre']['literal_xy'],'vehicle',vehicle_interval=interval);q,qr=s.check(e['current-centre']['literal_xy'],'vehicle',vehicle_interval=interval)
  try:grade=api.support_source3.span_grade(p,q,.2,surface=s,previous_record=pr,current_record=qr)
  except ValueError as error:self.fail('Continuous retained physical first blocker falsely fails original grade: '+str(error))
  self.assertAlmostEqual(grade,.005598848,places=7)
  self.assertEqual(p[:2],e['previous-centre']['literal_xy']);self.assertEqual(q[:2],e['current-centre']['literal_xy'])

 def test_reference_window_precedes_hits_and_is_not_based_on_chosen_provider(self):
  s=world([plane()],[plane(.3)]);order=[];old=api._source3_ground_query
  s.dem_height=lambda p:(order.append('dem') or 0.)
  def query(p,d):order.append('window');return old(p,d)
  originals=[index.hits for index in (s.road_index,s.terrain_index)]
  s.road_index.hits=lambda *p:(order.append('road') or originals[0](*p));s.terrain_index.hits=lambda *p:(order.append('terrain') or originals[1](*p))
  with mock.patch.object(api,'_source3_ground_query',side_effect=query):p,proof=s.check([-3.,-3.],'pedestrian')
  self.assertEqual(order,['dem','window','road','terrain']);self.assertEqual(proof['source'],'GSI-DEM5A');self.assertAlmostEqual(p[2],.3)

 def test_unsupported_higher_physical_hit_never_falls_back_to_road(self):
  s=world([plane()],[plane(.1,True)])
  with self.assertRaisesRegex(ValueError,'normal-below'):s.check([-3.,-3.],'pedestrian')
  s=world([plane()],[plane(.1)])
  with self.assertRaisesRegex(ValueError,'no-admitted-road-support'):s.check([-3.,-3.],'vehicle')
  s.road.layer_refs[0]['kind']='derived-road';s=world([plane(.1)],[plane()]);s.road.layer_refs[0]['kind']='derived-road'
  with self.assertRaisesRegex(ValueError,'directed-source-interval'):s.check([-3.,-3.],'vehicle')

 def test_window_neighbors_and_newly_excluded_terrain_are_explicit(self):
  for sign in (-1,1):
   centre=np.float32(sign*150)
   for cm,inside in ((centre,True),(np.nextafter(centre,np.float32(0)),True),(np.nextafter(centre,np.float32(sign*np.inf)),False)):
    s=world([],[plane(float(cm)/100)])
    if inside:self.assertAlmostEqual(s.check([-3.,-3.],'pedestrian')[0][2],float(cm)/100)
    else:
     with self.assertRaises(api.SupportRejection) as caught:s.check([-3.,-3.],'pedestrian')
     q=caught.exception.witness['source_ground_query'];self.assertEqual(q['reference_height_m'],0.);self.assertEqual(q['start_m'][2],1.5);self.assertEqual(q['end_m'][2],-1.5)
     self.assertEqual(q['outside_window_hits'][0]['role'],'terrain')

 def test_clipped_upper_hits_still_reach_existing_stacked_layer_guard(self):
  s=world([plane(1.4)],[plane(1.7)])
  with self.assertRaisesRegex(api.SupportRejection,'stacked-rendered-support-layer') as caught:s.check([-3.,-3.],'pedestrian')
  self.assertEqual(caught.exception.witness['source_ground_query']['outside_window_hits'][0]['role'],'terrain')

 def test_compatible_actor_contacts_keep_normal_tie_rules_without_new_epsilon(self):
  for gap in (0.,.0005):
   p,_=world([plane()],[plane(gap)]).check([-3.,-3.],'pedestrian');self.assertAlmostEqual(p[2],gap)
  s=world([plane(),plane()],[]);self.assertEqual(s.check([-3.,-3.],'pedestrian')[1]['triangle'],0)
  s=world([plane(),plane(reverse=True)],[])
  with self.assertRaisesRegex(api.SupportRejection,'source3-physical-first-hit-tie'):s.check([-3.,-3.],'pedestrian')
  s=world([plane()],[plane(.0011)]);self.assertEqual(s.check([-3.,-3.],'pedestrian')[1]['source'],'GSI-DEM5A')

 def test_true_step_slit_steep_face_and_original_thresholds_still_refuse(self):
  left=np.array([[-2.,-2.,0.],[-2.,2.,0.],[0.,-2.,0.]])
  right=np.array([[.001,-2.,.1],[.001,2.,.1],[2.,-2.,.1]])
  s=world([],[left,right]);p,pr=s.check([-.1,-1.9],'pedestrian');q,qr=s.check([.1,-1.9],'pedestrian')
  with self.assertRaisesRegex(ValueError,'exceeds'):api.support_source3.span_grade(p,q,.2,surface=s,previous_record=pr,current_record=qr)
  with self.assertRaises(api.SupportRejection):s.check([.0005,-1.9],'pedestrian')
  steep=np.array([[-2.,-2.,-2.],[-2.,2.,-2.],[2.,-2.,2.]])
  s=world([],[steep]);p,pr=s.check([-.1,-1.],'pedestrian');q,qr=s.check([.1,-1.],'pedestrian')
  for maximum in (.2,.6):
   with self.assertRaisesRegex(ValueError,'exceeds'):api.support_source3.span_grade(p,q,maximum,surface=s,previous_record=pr,current_record=qr)
   self.assertEqual(api.support_source3.span_grade([0,0,0],[1,0,maximum],maximum),maximum)
   with self.assertRaisesRegex(ValueError,'exceeds'):api.support_source3.span_grade([0,0,0],[1,0,math.nextafter(maximum,math.inf)],maximum)
  with self.assertRaisesRegex(ValueError,'zero-length'):api.support_source3.span_grade([0,0,0],[0,0,.001],.2)

 def test_full_body_width_building_and_directed_turn_legality_remain(self):
  s=world([plane()],[plane(-.5)]);s.buildings=[{'polygon':[[2.,-6.],[2.4,-6.],[2.4,-5.7],[2.,-5.7]]}];s.building_bins[0,-1]=[0]
  with self.assertRaisesRegex(ValueError,'building-interior'):s.corridor([[-2.2,-5.],[2.2,-5.]],'vehicle',1.8)
  points={1:[-10.,0.],2:[0.,0.],3:[0.,10.]};ways={i:{'id':i,'nodes':ids,'tags':{'highway':'residential','oneway':'yes','lanes':'1'}} for i,ids in ((10,[1,2]),(20,[2,3]))}
  tree=ET.fromstring('<osm><relation id="1"><member type="way" role="from" ref="10"/><member type="node" role="via" ref="2"/><member type="way" role="to" ref="20"/><tag k="type" v="restriction"/><tag k="restriction" v="no_left_turn"/></relation></osm>')
  s.vehicle_source=(points,ways,api.TurnRestrictions(tree))
  with self.assertRaisesRegex(ValueError,'turn-not-source-legal'):s.vehicle_interval([(10,1,2),(20,2,3)],[0,0],[0,0],2.)
  with self.assertRaisesRegex(ValueError,'not-in-source-direction'):s.vehicle_interval([(10,2,1)],[0,0],[-10,0],2.)

 def test_source1_and_source2_keep_prior_provider_and_refusal_behavior(self):
  for schema in (1,2):
   s=world([plane()],[plane(.1)],schema=schema);self.assertEqual(s.check([-3.,-3.],'pedestrian')[1]['source'],'PLATEAU-road')
   s=world([],[plane(2.)],schema=schema);self.assertEqual(s.check([-3.,-3.],'pedestrian')[0][2],2.)
   with self.assertRaisesRegex(api.SupportRejection,'stacked-rendered-support-layer'):world([plane()],[plane(.3)],schema=schema).check([-3.,-3.],'pedestrian')

 def movement_caller_fixture(self,query_world,xy):
  points={1:[0.,0.],2:[10.,0.],3:[20.,0.]};ways=[{'id':7,'nodes':[1,2,3],'tags':{'highway':'residential','oneway':'yes','lanes':'1'}}]
  calls=[];writes={};root=Path(__file__).parent/'movement-caller-no-files'
  interval_factory=api.Surface.vehicle_interval;subspan_factory=api.Surface.vehicle_subspan
  class FixtureSurface:
   support_manifest=query_world.support_manifest
   vehicle_interval=interval_factory;vehicle_subspan=subspan_factory
   support_record={'sha256':'support'};derived_record={'sha256':'terrain'};road=types.SimpleNamespace(sources=[]);dem_records={}
   def __init__(self,*args,**kwargs):self.vehicle_source=(points,{w["id"]:w for w in ways},types.SimpleNamespace(rejection=lambda *a:None))
   def corridor(self,polyline,kind,width,**kwargs):
    calls.append(copy.deepcopy(polyline))
    if polyline[0]==[0.,0.]:return query_world.check(xy,'vehicle')
    return [{'point':[float(p[0]),float(p[1]),0.]} for p in polyline]
   def check(self,point,kind,**kwargs):return [float(point[0]),float(point[1]),0.],{}
  def record(path,root=None):
   payload=writes.get(Path(path),b'fixture');return {'path':str(path),'bytes':len(payload),'sha256':hashlib.sha256(payload).hexdigest()}
  with contextlib.ExitStack() as stack:
   for name,value in [('ROOT',root),('OUT',root/'data/prepared/surface'),('osm_sources',lambda base:({},points,ways,[])),('osm_tree',lambda:None),('TurnRestrictions',lambda tree:types.SimpleNamespace(rules=[],unsupported=[],rejection=lambda a,b:None)),('Surface',FixtureSurface),('source_record',record),('guarded_write',lambda path,payload,root=None:writes.__setitem__(Path(path),bytes(payload)))]:stack.enter_context(mock.patch.object(api,name,value))
   stack.enter_context(mock.patch.object(api,'boundary_endpoint',side_effect=ValueError('fixture-not-boundary')))
   with contextlib.redirect_stdout(io.StringIO()),contextlib.redirect_stderr(io.StringIO()):path=api.movement_network({'vertical_reference':{}},vehicle_graph_only=True)
  return json.loads(writes[Path(path)]),calls

 def test_actual_movement_caller_retains_near_interval_refusal_and_continues(self):
  s=world([plane()],[plane(.0005)])
  graph,calls=self.movement_caller_fixture(s,[-3.,-3.])
  refused=graph['segment_refusals'];self.assertEqual(len(refused),1)
  self.assertEqual(refused[0]['reason'],'no-admitted-road-support')
  self.assertEqual(graph['rejections']['vehicle-segment:no-admitted-road-support'],1)
  self.assertGreaterEqual(len(calls),2)

 def test_global_missing_actor_and_genuine_ambiguous_cook_errors_remain_fatal(self):
  s=world([plane()],[plane()]);del s.support_manifest['native_roads'][0]['actor_label']
  with self.assertRaisesRegex(api.NativeCollisionModelError,'native actor label'):s.check([-3.,-3.],'vehicle')
  actual=json.loads(api.guarded_read(api.ROOT/'tests/data/fixtures/native-cook-patch64.json',api.ROOT/'tests/data',100000))
  triangle=np.asarray(actual['ambiguity_native_cm'],float)/100;s=world([triangle],[]);self.assertEqual(s.road_index.physical_membership[0],-1)
  point=triangle[:,:2].mean(axis=0).tolist()
  with self.assertRaisesRegex(api.NativeCollisionModelError,'ambiguous'):self.movement_caller_fixture(s,point)
  self.assertFalse(issubclass(api.NativeCollisionModelError,ValueError))

class Source3ESUPlane(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  raw=(Path(__file__).parent/'fixtures/source3-esu-selector.json').read_bytes()
  if hashlib.sha256(raw).hexdigest()!='cd13c338162c9a0f8f7dce5f4f29fbe05e05e3cec83ec5c71101a1f3911b5e9c':raise ValueError('Actual V4 serialized selector fixture differs; source review required')
  cls.fixture=json.loads(raw)

 def setUp(self):api._source3_cached_collision_plane.cache_clear()
 def tearDown(self):api._source3_cached_collision_plane.cache_clear()

 def exact_height(self,points,xy):
  # Independent exact barycentric interpolation, without either plane backend.
  rows=[[F(float(v)) for v in row] for row in points];q=[F(float(v*100)) for v in xy]
  def area(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
  a,b,c=rows;den=area(a,b,c)
  return sum(weight*row[2] for weight,row in zip((area(b,c,q)/den,area(c,a,q)/den,area(a,b,q)/den),rows))

 def actual(self):
  f=self.fixture;identifier=f['road_face_id'];native=np.asarray(f['native_esu_cm'],dtype=float)
  hit=copy.deepcopy(f['actual_hit']);query=copy.deepcopy(f['actual_query']);query.pop('outside_window_hits',None)
  road=types.SimpleNamespace(native_triangles_cm={identifier:native},hits=lambda *xy:[hit])
  empty=types.SimpleNamespace(native_triangles_cm={},hits=lambda *xy:[])
  return types.SimpleNamespace(road_index=road,terrain_index=empty),query,hit,native

 def test_actual_serialized_v4_hit_matches_independent_source_height(self):
  f=self.fixture;s,q,hit,native=self.actual();xy=q['start_m'][:2]
  # Explicit inverse of admitted ESU209934: corner021 and south to north.
  inverse=[[native[i,0],-native[i,1],native[i,2]] for i in (0,2,1)]
  self.assertEqual(inverse,f['source_packed_cm'])
  self.assertEqual(((np.asarray(f['source_enu_m'])*100).astype(np.float32).astype(float)).tolist(),inverse)
  height=self.exact_height(inverse,xy)
  self.assertAlmostEqual(float(height/100),hit['height'],places=14)
  self.assertEqual(str(self.exact_height(native,xy)),f['actual_query']['outside_window_hits'][0]['height_native_cm_q'])
  self.assertTrue(F(float(q['end_m'][2]*100))<=height<=F(float(q['start_m'][2]*100)))
  role,selected=api._source3_first_blocker(s,q,[hit],[])
  self.assertEqual(role,'road');self.assertIs(selected,hit);self.assertEqual(q['outside_window_hits'],[])
  self.assertEqual(hit['triangle'],50346);self.assertEqual(hit,f['actual_hit'])

 def test_actual_native_buffer_mutation_remains_authoritative_after_cache_hit(self):
  s,q,hit,native=self.actual();old=api.support_source3.collision_plane
  with mock.patch.object(api.support_source3,'collision_plane',wraps=old) as backend:
   for _ in range(2):self.assertIs(api._source3_first_blocker(s,copy.deepcopy(q),[hit],[])[1],hit)
   self.assertEqual(backend.call_count,1)
   alias=native[:,2];alias+=200.
   with self.assertRaisesRegex(api.SupportRejection,'no-physical-source-ground-blocker-in-dem-window') as rejected:
    api._source3_first_blocker(s,copy.deepcopy(q),[hit],[])
   self.assertEqual(backend.call_count,2)
   self.assertGreater(F(rejected.exception.witness['source_ground_query']['outside_window_hits'][0]['height_native_cm_q']),F(float(q['start_m'][2]*100)))
   alias-=200.
   self.assertIs(api._source3_first_blocker(s,copy.deepcopy(q),[hit],[])[1],hit)
   self.assertEqual(backend.call_count,2)

 def test_changed_face_correspondence_uses_same_current_native_frame_inverse(self):
  f=self.fixture;s,q,hit,native=self.actual();identifier=hit['triangle'];path=f['derived_terrain']['path'];face=f['full_derived_terrain_triangle']
  # Synthetic correspondence metadata around the exact actual serialized face;
  # no new mapping/native correspondence or eligibility claim is inferred.
  refs={identifier:{'source':0,'source_triangle_index':face}};mappings=[{'actor_label':'City_069_terrain','source_path':path}]
  reference={'mesh_role':'road','source_path':path,'source_triangle_index':face}
  sample,detail=api.support_source3.changed_face_sample('actual-v4-frame-only',q['start_m'][:2],q['reference_height_m'],reference,refs,mappings,s.road_index,s.terrain_index,None)
  expected=self.exact_height(f['source_packed_cm'],q['start_m'][:2])
  self.assertTrue(sample['expected_hit']);self.assertEqual(detail['status'],'visible')
  self.assertEqual(F(sample['expected']['height_native_cm_q']),expected)
  self.assertEqual(sample['expected']['source_triangle_index'],face)
  self.assertEqual(sample['expected']['normal_enu'],hit['normal_enu'])
  # A changed consumed native height leaves the fixed reference ray; no fallback.
  native[:,2]+=200.
  sample,detail=api.support_source3.changed_face_sample('actual-v4-frame-only',q['start_m'][:2],q['reference_height_m'],reference,refs,mappings,s.road_index,s.terrain_index,None)
  self.assertFalse(sample['expected_hit']);self.assertEqual(detail['reason'],'no-source-blocker-in-fixed-reference-ray')

if __name__=='__main__':unittest.main()
