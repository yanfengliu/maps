"""Bound:39source-bound cores/225completebbox neighbours + actual V6span, not full corridor/body."""
from pathlib import Path
from fractions import Fraction as F
import collections,copy,hashlib,json,math,sys,types,unittest
from unittest import mock
ROOT=Path(__file__).absolute().parents[2];sys.path.insert(0,str(ROOT/'tools/data'))
import surface_network as api
import test_support_core_triangulation as boundary
np=api.np
producer=api.support_source3.reconstruction

class SourceCoreSteiner(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  raw=(Path(__file__).parent/'fixtures/source3-steiner-grade.json').read_bytes()
  if hashlib.sha256(raw).hexdigest()!='b88264b717436b759f9ddb206fa55036a4c8631a01849b7efc80d43702ffdbf6':raise ValueError('Reviewed actual V6span/source parent fixture changed; Source review required')
  cls.f=json.loads(raw);boundary.SourceCoreTriangulation.setUpClass();cls.b=boundary.SourceCoreTriangulation();cls.original=producer.retriangulate_retained_core(api,cls.b.packet())
  points=[cls.f['source_intervals'][0]['lane_points'][0]]+[e['lane_points'][1] for e in cls.f['source_intervals']]
  cls.original['support_core'][cls.f['expected_changed_core_index']]['parent_barycentric']=copy.deepcopy(cls.f['actual_target_boundary_parent_barycentric'])
  cls.original['continuous_XY_body_sweep_certificate']={'route':[[str(F(v)) for v in p] for p in points]}
 def repair(self,packet=None,intervals=None):return producer.repair_mapped_core(api,self.original if packet is None else packet,self.f['source_intervals'] if intervals is None else intervals)
 def core_triangles(self,packet):return [t for t in packet['same_visible_collision_triangles'] if t['classification']=='inferred-graded-support-core']
 def selected_pair(self,packet):
  decoded=boundary.serialize(self.core_triangles(packet));population=[copy.deepcopy(r) for r in self.b.f['local'] if r['core_index'] is None]
  population += [{'positions':r[:,:3].tolist(),'actor':'City_069_terrain','kind':'inferred-new'} for r in decoded]
  actors=list(dict.fromkeys(r['actor'] for r in population));refs=[{'kind':'inferred','reconstruction_role':'support-top'} if r['kind']=='inferred-new' else {'kind':'road','source':actors.index(r['actor'])} for r in population]
  index=api.NativeTriangleIndex([r['positions'] for r in population]);surface=types.SimpleNamespace(road_index=index,terrain_index=api.NativeTriangleIndex([]),road=types.SimpleNamespace(layer_refs=refs),support_manifest={'native_roads':[{'actor_label':a} for a in actors]})
  values=[]
  lo,hi=self.b.f['local_bbox']
  for name in ('previous','current'):
   operand=self.f['original_grade_operands'][name];point=operand['point'];self.assertTrue(all(a<=v<=b for a,v,b in zip(lo,point[:2],hi)))
   query=api._source3_ground_query(point[:2],operand['dem_nearest_m']);role,hit=api._source3_first_blocker(surface,query,index.hits(*point[:2]),[])
   self.assertEqual(role,'road');self.assertEqual(population[hit['triangle']]['kind'],'inferred-new');self.assertGreater(hit['normal_up_z'],0)
   values.append(point[:2]+[hit['height']])
  return values
 def test_actual_V6grade_RED_then_same_points_complete_local_population_PASS(self):
  self.assertEqual(len(self.b.f['local']),225);old=self.selected_pair(self.original)
  with self.assertRaisesRegex(ValueError,'span grade'):api.support_source3.span_grade(*old,.2)
  grade=abs(old[1][2]-old[0][2])/math.dist(*[p[:2] for p in old]);self.assertAlmostEqual(grade,self.f['old_span_grade'],places=12)
  new=self.selected_pair(self.repair());grade=api.support_source3.span_grade(*new,.2)
  self.assertAlmostEqual(grade,self.f['new_span_grade'],places=12);self.assertLess(grade,.2)
 def test_exact_original_boundaries_parent_XYZUV_and_all_other_rows_unchanged(self):
  old=copy.deepcopy(self.original);new=self.repair();self.assertEqual(self.original,old);ci=self.f['expected_changed_core_index'];n=len(old['support_core'][ci]['vertices']);row=new['support_core'][ci]
  self.assertEqual(len(row['vertices']),n+1);self.assertEqual(row['vertices'][:n],old['support_core'][ci]['vertices']);self.assertEqual(row['parent_barycentric'][:n],old['support_core'][ci]['parent_barycentric'])
  for i,r in enumerate(old['support_core']):
   if i!=ci:self.assertEqual(new['support_core'][i],r)
  for k in old:
   if k not in ('support_core','same_visible_collision_triangles','core_triangulation'):self.assertEqual(new[k],old[k])
  ids=self.f['expected_interior_mean_indices'];weights=[F(v) for v in row['parent_barycentric'][-1]];self.assertEqual(sum(weights),1);self.assertTrue(all(0<=v<=1 for v in weights));photo=self.f['actual_source_parent_rows']
  for c in range(5):
   self.assertEqual(F(row['vertices'][-1][c]),sum(F(old['support_core'][ci]['vertices'][i][c]) for i in ids)/3)
   self.assertEqual(F(row['vertices'][-1][c]),sum(weights[j]*F(float(photo[j][c])) for j in range(3)))
  changed_row=1+ci;unchanged=lambda p:[t for t in p['same_visible_collision_triangles'] if t['source_row_index']!=changed_row]
  self.assertEqual(unchanged(new),unchanged(old));self.assertEqual(new['core_triangulation']['original_boundary_counts'],{str(changed_row):n});self.assertEqual(new['core_triangulation']['mapped_source_intervals'],self.f['source_intervals'])
 def test_common_writer_real_readback_exact_Source_GLB_native_domain_and_physical_rows(self):
  new=self.repair();ci=self.f['expected_changed_core_index'];row=new['support_core'][ci];tris=[t for t in new['same_visible_collision_triangles'] if t['source_row_index']==1+ci];indices=[t['source_corner_indices'] for t in tris]
  self.assertEqual(indices,self.f['expected_new_triangles']);self.assertEqual(len(tris),44);self.assertTrue(all(type(i) is int for t in indices for i in t))
  decoded=boundary.serialize(tris);states=[producer.face_state(api,r) for r in decoded];self.assertEqual(collections.Counter(s['orientation'] for s in states),{'UP':29,'vertical':2,'zero3D':13});self.assertEqual(collections.Counter(s['cook_state'] for s in states),{1:31,0:13})
  maximum=max(math.hypot(*s['signed_native_normal'][:2])/s['signed_native_normal'][2] for s in states if s['cook_state']==1 and s['orientation']=='UP');self.assertAlmostEqual(maximum,.11986241178827842,places=12);self.assertLess(maximum,.2)
  src=[[F(v) for v in p] for p in row['vertices']];packed=np.asarray([[float(v) for v in p] for p in src],dtype='<f4').astype(float);models=[src,[[F(float(v)) for v in p] for p in packed],[[F(float(v)) for v in p] for p in (packed[:,:3]*100).astype(np.float32)]];n=len(src)-1
  for values in models:
   signed=[boundary.cross(*(values[i] for i in t)) for t in indices];self.assertEqual(sum(signed),boundary.area(values[:n]));self.assertEqual(sum(map(abs,signed)),abs(boundary.area(values[:n])))
  edges=collections.Counter((a,b) for t in indices for a,b in zip(t,t[1:]+t[:1]));self.assertEqual(collections.Counter({e:v-edges[e[::-1]] for e,v in edges.items() if v>edges[e[::-1]]}),collections.Counter((i,(i+1)%n) for i in range(n)))
 def test_declared_all_intervals_not_second_interval_or_numeric_row_exception(self):
  entry=copy.deepcopy(self.f['source_intervals'][1]);single=copy.deepcopy(self.original);single['continuous_XY_body_sweep_certificate']['route']=[[str(F(v)) for v in p] for p in entry['lane_points']]
  new=self.repair(single,[entry]);self.assertEqual(new['support_core'][8],self.repair()['support_core'][8]);self.assertEqual(new['core_triangulation']['changed_polygons'],1)
 def test_wrong_route_identity_grouping_and_barycentric_refuse_without_partial(self):
  for mutate,reason in [(lambda p,e:e[0]['lane_points'][0].__setitem__(0,0.),'differs'),(lambda p,e:e[1].__setitem__('from_osm_node',1),'disconnected'),(lambda p,e:e[0].__setitem__('way_id',True),'literal positive'),(lambda p,e:p['support_core'][8]['parent_barycentric'].__setitem__(-1,['0','0','0']),'barycentric'),(lambda p,e:p['support_core'][8].__setitem__('classification','unknown'),'authoring roles')]:
   p=copy.deepcopy(self.original);e=copy.deepcopy(self.f['source_intervals']);mutate(p,e);before=copy.deepcopy(p)
   with self.subTest(reason=reason),self.assertRaisesRegex(ValueError,reason):self.repair(p,e)
   self.assertEqual(p,before)
 def test_unsolved_trigger_refuses_and_physical_model_error_stays_fatal(self):
  row={'vertices':[[0,0,0,0,0],[0,1,0,0,1],[1,0,1,1,0]],'parent_barycentric':[[1,0,0],[0,1,0],[0,0,1]],'classification':'inferred-graded-support-core','actor':'test','parent':'genuine-steep'}
  p={'frame':'source-ENU-metres','outside_active':[],'support_core':[row],'continuous_XY_body_sweep_certificate':{'route':[[.1,.1],[.5,.1]]},'same_visible_collision_triangles':[{'source_row_index':0,'source_corner_indices':[0,1,2],'vertices':row['vertices']}]};e=[{'way_id':1,'from_osm_node':2,'to_osm_node':3,'lane_points':[[.1,.1],[.5,.1]]}];before=copy.deepcopy(p)
  with self.assertRaisesRegex(ValueError,'no complete bounded'):self.repair(p,e)
  self.assertEqual(p,before)
  with mock.patch.object(api,'native_cook_membership',return_value=np.asarray([-1],dtype=np.int8)):
   with self.assertRaises(api.NativeCollisionModelError):self.repair()
 def test_nontriggered_interval_keeps_original_geometry_exact(self):
  p=copy.deepcopy(self.original);points=[[0.,0.],[1.,0.]];p['continuous_XY_body_sweep_certificate']['route']=points;e=[{'way_id':1,'from_osm_node':2,'to_osm_node':3,'lane_points':points}];self.assertEqual(self.repair(p,e),p)
if __name__=='__main__':unittest.main()
