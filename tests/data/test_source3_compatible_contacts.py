"""Bound: authentic interval58 three-face Source decision and finite refusal controls; no city index."""
from pathlib import Path
import collections,copy,hashlib,json,os,sys,types,unittest
ROOT=Path(os.environ.get('SHIBUYA_PROJECT_ROOT',Path(__file__).absolute().parents[2]));sys.path.insert(0,str(ROOT/'tools/data'))
import surface_network as api
FIXTURE=Path(os.environ.get('SHIBUYA_CONTACT_FIXTURE',Path(__file__).parent/'fixtures/source3-compatible-contacts.json'))
class Source3CompatibleContacts(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  raw=FIXTURE.read_bytes()
  if hashlib.sha256(raw).hexdigest()!='c5642b2907038b6731cd73df3d760a93100348883093d891ba17c425dcf8515b':raise ValueError('Retained interval58 contact fixture changed; source review required')
  cls.fixture=json.loads(raw)
 def world(self):
  f=self.fixture;s=types.SimpleNamespace();s.support_manifest={'schema_version':3,'native_roads':[{} for _ in range(10)]};s.support_manifest['native_roads'][9]=copy.deepcopy(f['road_mapping'])
  s.support_record=copy.deepcopy(f['provenance']['support_manifest']);s.derived_record={'sha256':'d00a73f9495e781600ab5e7a52cec87769701946b51e4fb32cd238599533317d'}
  s.road=types.SimpleNamespace(layer_refs={});s.source3_terrain_refs={};s.terrain_sources={};native={'road':{},'terrain':{}};hits={'road':[],'terrain':[]}
  for row,operand in zip(f['faces'],f['witness']['first_blockers']):
   role,i=row['role'],row['raw_index'];native[role][i]=api.np.asarray(row['native_esu_cm'],dtype=api.np.float32);hits[role].append(copy.deepcopy(operand['hit']))
   if role=='road':s.road.layer_refs[i]=copy.deepcopy(row['source_ref'])
   else:s.source3_terrain_refs[i]=copy.deepcopy(row['source_ref']);s.terrain_sources[i]=row['source_ref']['original_triangle']
  s.road_index=types.SimpleNamespace(native_triangles_cm=native['road'],hits=lambda *p:hits['road']);s.terrain_index=types.SimpleNamespace(native_triangles_cm=native['terrain'],hits=lambda *p:hits['terrain'])
  src=f['actual_vehicle_source'];way=copy.deepcopy(src['way']);s.vehicle_source=({int(k):v for k,v in src['points'].items()},{way['id']:way},types.SimpleNamespace(rejection=lambda *a:None))
  s.vehicle_interval=types.MethodType(api.Surface.vehicle_interval,s)
  s.dem_height=lambda p:f['query']['reference_height_m'];s.buildings=[];s.building_bins={};s.network_diagnostic=None
  interval=s.vehicle_interval([f['interval']['edge']],*f['interval']['lane_points'],2.)
  return s,hits,interval
 def select(self,s,hits,interval,kind='vehicle'):
  return api._source3_first_blocker(s,copy.deepcopy(self.fixture['query']),hits['road'],hits['terrain'],kind=kind,vehicle_interval=interval)
 def test_actual_three_contacts_preserve_unique_canonical_top_and_all_faces(self):
  s,h,iv=self.world();before=copy.deepcopy(h);role,selected=self.select(s,h,iv)
  self.assertEqual(role,'road');self.assertIs(selected,h['road'][0]);self.assertEqual(selected['triangle'],8145);self.assertEqual(h,before)
  for index in (s.road_index,s.terrain_index):
   for triangle in index.native_triangles_cm.values():self.assertEqual(api.native_cook_membership(triangle[None,...]).tolist(),[1])
 def test_actual_check_reuses_each_contact_record_without_new_wire_fields(self):
  s,h,iv=self.world();point,record=api.Surface._check(s,self.fixture['query']['start_m'][:2],'vehicle',vehicle_interval=iv)
  self.assertEqual(point[2],h['road'][0]['height']);self.assertEqual(record['source'],'PLATEAU-road');self.assertEqual(record['triangle'],84)
  self.assertEqual(record['support_surface_sha256'],s.support_record['sha256']);self.assertNotIn('allowed_contacts',record)
 def test_every_near_actor_mapping_is_still_admitted(self):
  s,h,iv=self.world();del s.support_manifest['native_roads'][9]['actor_label']
  with self.assertRaisesRegex(api.NativeCollisionModelError,'actor label'):self.select(s,h,iv)
  s,h,iv=self.world();s.road.layer_refs[8145]['source']=99
  with self.assertRaisesRegex(api.NativeCollisionModelError,'actor mapping'):self.select(s,h,iv)
 def test_lower_near_road_mapping_cannot_be_skipped(self):
  s,h,iv=self.world();extra=copy.deepcopy(h['terrain'][0]);extra['triangle']=8146
  h['road'].append(extra);s.road_index.native_triangles_cm[8146]=s.terrain_index.native_triangles_cm[783845]
  s.road.layer_refs[8146]={'kind':'road','source':8,'source_triangle_index':0}
  with self.assertRaisesRegex(api.NativeCollisionModelError,'actor label'):self.select(s,h,iv)
 def test_near_ineligible_role_refuses_even_with_valid_top(self):
  for role in ('physical-transition','physical-sidewall'):
   s,h,iv=self.world();s.source3_terrain_refs[783845]['reconstruction_role']=role
   with self.subTest(role=role),self.assertRaisesRegex(api.SupportRejection,'ineligible-reconstruction-first-blocker'):self.select(s,h,iv)
 def test_near_terrain_requires_actual_kind_and_directed_interval(self):
  s,h,iv=self.world()
  with self.assertRaisesRegex(ValueError,'no-admitted-road-support'):self.select(s,h,None)
  with self.assertRaisesRegex(api.NativeCollisionModelError,'actual pedestrian or vehicle'):self.select(s,h,iv,kind=None)
  bad=api.VehicleInterval((0.,0.),(1.,0.),2.,iv.edges)
  with self.assertRaisesRegex(ValueError,'no-admitted-road-support'):self.select(s,h,bad)
 def test_wrong_normal_and_negative_support_refuse(self):
  s,h,iv=self.world();h['terrain'][0]['normal_enu']=[1.,0.,0.]
  with self.assertRaisesRegex(api.SupportRejection,'physical-first-hit-tie'):self.select(s,h,iv)
  s,h,iv=self.world()
  for hit in h['road']+h['terrain']:hit['normal_enu']=[-v for v in hit['normal_enu']];hit['normal_up_z']=-hit['normal_up_z']
  with self.assertRaisesRegex(ValueError,'normal-below-native-limit'):self.select(s,h,iv)
 def test_near_signed_support_limit_is_not_inferred_from_normal_agreement(self):
  s,h,iv=self.world();h['terrain'][0]['normal_up_z']=.699
  with self.assertRaisesRegex(ValueError,'normal-below-native-limit'):self.select(s,h,iv)
 def test_normal_failure_cannot_hide_missing_actor_mapping(self):
  s,h,iv=self.world();h['terrain'][0]['normal_enu']=[1.,0.,0.];del s.support_manifest['native_roads'][9]['actor_label']
  with self.assertRaises(api.NativeCollisionModelError):self.select(s,h,iv)
if __name__=='__main__':unittest.main(verbosity=2)
