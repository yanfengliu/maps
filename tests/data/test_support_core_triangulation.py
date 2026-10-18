"""Bound: all39 retained source polygons/225local faces; no corridor/body/native claim."""
from pathlib import Path
from fractions import Fraction as F
import collections,copy,hashlib,json,math,sys,tempfile,types,unittest
from unittest import mock
ROOT=Path(__file__).absolute().parents[2];sys.path.insert(0,str(ROOT/'tools/data'))
import surface_network as api
np=api.np
producer=api.support_source3.reconstruction

def cross(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
def area(rows):return sum(a[0]*b[1]-a[1]*b[0] for a,b in zip(rows,rows[1:]+rows[:1]))
def fan(row,index):
 v=row['vertices'];centre=[sum(F(p[k]) for p in v)/len(v) for k in range(5)]
 return [{'vertices':[centre,a,b],'source_corner_indices':['affine-vertex-mean',i,(i+1)%len(v)],'source_row_index':index,'classification':row['classification'],'actor':row['actor'],'parent_polygon':row['parent'],'actual_physical_firsthit_and_body_eligible':True} for i,(a,b) in enumerate(zip(v,v[1:]+v[:1]))]

def serialize(triangles):
 rows=[]
 for triangle in triangles:
  p=[[F(v) for v in corner] for corner in triangle['vertices']];a,b,c=p;u=[y-x for x,y in zip(a,b)];v=[z-x for x,z in zip(a,c)]
  normal=[u[2]*v[1]-u[1]*v[2],u[0]*v[2]-u[2]*v[0],u[1]*v[0]-u[0]*v[1]];scale=max(map(abs,normal))
  if not scale:raise ValueError('Test serialization refuses zero exact-source3D normal')
  n=np.asarray([float(x/scale) for x in normal]);n/=np.linalg.norm(n)
  rows.append(np.column_stack(([[float(x) for x in corner] for corner in p],np.repeat(n[[0,2,1]][None],3,axis=0))))
 flat=np.asarray(rows,dtype='<f4').reshape(-1,8)
 writer=api.city.GlbWriter();writer.doc['materials']=[{}]
 writer.primitive({'POSITION':flat[:,[0,2,1]],'TEXCOORD_0':flat[:,3:5],'NORMAL':flat[:,5:8]},np.arange(len(flat),dtype=np.uint32).reshape(-1,3))
 with tempfile.TemporaryDirectory(prefix='source3-core-dp-') as temporary:
  root=Path(temporary)
  with mock.patch.object(api.city,'ROOT',root):record=writer.save(root/'actual.glb')
  raw=(root/record['path']).read_bytes()
 _,parts=api.support_source3.primitives(api,raw);decoded=api.support_source3.triangle_rows(parts)
 np.testing.assert_array_equal(decoded,flat.reshape(-1,3,8))
 return decoded

class SourceCoreTriangulation(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  raw=(Path(__file__).parent/'fixtures/source3-core-dp.json').read_bytes()
  if hashlib.sha256(raw).hexdigest()!='8f0905c7e257c54991abc24ce0205e32a7ef84a5b90ac1d3f7aad3ad169ff68a':raise ValueError('Reviewed core/localphysical fixture changed; Source review required')
  cls.f=json.loads(raw)

 def packet(self):
  core=copy.deepcopy(self.f['core']);outside=copy.deepcopy(self.f['noncore_examples']['outside']);outside['source_row_index']=0
  transitions=copy.deepcopy(self.f['noncore_examples']['transition']);transitions['source_row_index']=1+len(core)
  wall=copy.deepcopy(self.f['noncore_examples']['sidewall']);wall['source_row_index']=2+len(core)
  triangles=[outside]+[t for i,r in enumerate(core,1) for t in fan(r,i)]+[transitions,wall]
  return {'frame':'source-ENU-metres','outside_active':[{'metadata':'unchangedoutside'}],'support_core':core,'transition_tops':[{'metadata':'unchangedtransition'}],'sidewalls':[{'metadata':'unchangedwall'}],'same_visible_collision_triangles':triangles,'other_metadata':{'source_and_UV':'unchanged'}}

 def physical(self,faces):
  points=np.asarray([r['positions'] for r in faces],float);index=api.NativeTriangleIndex(points)
  actors=list(dict.fromkeys(r['actor'] for r in faces));refs=[{'kind':'road','source':actors.index(r['actor'])} for r in faces]
  surface=types.SimpleNamespace(road_index=index,terrain_index=api.NativeTriangleIndex([]),road=types.SimpleNamespace(layer_refs=refs),support_manifest={'native_roads':[{'actor_label':a} for a in actors]})
  query=copy.deepcopy(self.f['query']);query.pop('outside_window_hits',None)
  return api._source3_first_blocker(surface,query,index.hits(*query['start_m'][:2]),[])

 def test_actual_original_local_population_refuses_and_new_allcore_firstblocker_passes(self):
  old=copy.deepcopy(self.f['local']);self.assertEqual(len(old),225)
  with self.assertRaisesRegex(api.SupportRejection,'source3-physical-first-hit-tie') as caught:self.physical(old)
  near=caught.exception.witness['first_blockers'];self.assertEqual({old[x['hit']['triangle']]['ordinal'] for x in near},set(self.f['old_tied_terrain_ids']))
  self.assertTrue(any(x['hit']['normal_up_z']<0 for x in near))
  changed=producer.retriangulate_retained_core(api,self.packet());core=[t for t in changed['same_visible_collision_triangles'] if t['classification']=='inferred-graded-support-core'];decoded=serialize(core)
  population=[r for r in old if r['core_index'] is None]
  population += [{'positions':row[:,:3].tolist(),'actor':'City_069_terrain','kind':'inferred-new','ordinal':i} for i,row in enumerate(decoded)]
  role,hit=self.physical(population)
  self.assertEqual(role,'road');self.assertEqual(population[hit['triangle']]['kind'],'inferred-new');self.assertGreater(hit['normal_up_z'],.999)
  self.assertAlmostEqual(hit['height'],2.4018102689444674,places=12)
  # Full original directional corridor/body grade is still unrun.

 def test_all39_actual_source_boundaries_areas_and_real_GLB_readback(self):
  self.assertEqual(len(self.f['core']),39)
  for row in self.f['core']:
   with self.subTest(parent=row['parent']):
    before=copy.deepcopy(row);triangles=producer.support_core_triangles(api,row);self.assertEqual(row,before)
    self.assertEqual(set(i for t in triangles for i in t),set(range(len(row['vertices']))))
    source=[[F(v) for v in p] for p in row['vertices']];packed=np.asarray([[float(v) for v in p] for p in source],dtype='<f4').astype(float)
    models=[source,[[F(float(v)) for v in p] for p in packed],[[F(float(v)) for v in p] for p in (packed[:,:3]*100).astype(np.float32).astype(float)]]
    for model,values in enumerate(models):
     parts=[cross(*(values[i] for i in t)) for t in triangles];sign=1 if area(source)>0 else -1
     self.assertEqual(sum(parts),area(values));self.assertEqual(sum(map(abs,parts)),abs(area(values)))
     self.assertTrue(all(sign*d>0 if model==0 else sign*d>=0 for d in parts))
    edges=collections.Counter((a,b) for t in triangles for a,b in zip(t,t[1:]+t[:1]));boundary=collections.Counter({e:n-edges[e[::-1]] for e,n in edges.items() if n>edges[e[::-1]]})
    self.assertEqual(boundary,collections.Counter((i,(i+1)%len(source)) for i in range(len(source))))
    emitted=[{'vertices':[row['vertices'][i] for i in t]} for t in triangles];decoded=serialize(emitted)
    for actual,t in zip(decoded,triangles):np.testing.assert_array_equal(actual[:,:5],packed[t,:5])

 def test_actual_independent_integer_triples_and_vertical_reject_population_remain(self):
  row=self.f['core'][self.f['target_core_index']];triples=producer.support_core_triangles(api,row)
  self.assertEqual(triples,self.f['independent_target_triangles']);self.assertEqual(len(triples),42)
  decoded=serialize([{'vertices':[row['vertices'][i] for i in t]} for t in triples]);states=[producer.face_state(api,r) for r in decoded]
  self.assertEqual(collections.Counter(s['orientation'] for s in states),{'UP':27,'vertical':2,'zero3D':13})
  self.assertEqual(collections.Counter(s['cook_state'] for s in states),{1:29,0:13})
  self.assertEqual(sum(s['orientation']=='vertical' and s['cook_state']==1 for s in states),2)
  gradients=[math.hypot(*s['signed_native_normal'][:2])/s['signed_native_normal'][2] for s in states if s['orientation']=='UP']
  self.assertAlmostEqual(max(gradients),.23720164357946502,places=12)
  self.assertGreater(max(gradients),.2)  # Risk retained, not a blanket waiver or veto.

 def test_packet_changes_only_core_triangulation_with_original_integer_ancestry(self):
  old=self.packet();before=copy.deepcopy(old);new=producer.retriangulate_retained_core(api,old);self.assertEqual(old,before)
  for key in old:
   if key!='same_visible_collision_triangles':self.assertEqual(new[key],old[key])
  old_other=[t for t in old['same_visible_collision_triangles'] if t['classification']!='inferred-graded-support-core']
  self.assertEqual([t for t in new['same_visible_collision_triangles'] if t['classification']!='inferred-graded-support-core'],old_other)
  self.assertFalse(new['core_triangulation']['physical_candidates_filtered']);self.assertEqual(new['core_triangulation']['new_vertices'],0)
  for t in new['same_visible_collision_triangles']:
   if t['classification']=='inferred-graded-support-core':
    row=old['support_core'][t['source_row_index']-1];self.assertTrue(all(type(i) is int for i in t['source_corner_indices']))
    self.assertEqual(t['vertices'],[row['vertices'][i] for i in t['source_corner_indices']])
  bad=self.packet();bad['same_visible_collision_triangles']=[t for t in bad['same_visible_collision_triangles'] if t['source_row_index']!=1]
  with self.assertRaisesRegex(ValueError,'missing original'):producer.retriangulate_retained_core(api,bad)

 def test_actual_fan_reintroduction_has_down_faces_and_cannot_be_physics_filtered(self):
  row=self.f['core'][8];decoded=serialize(fan(row,8));states=[producer.face_state(api,r) for r in decoded]
  self.assertTrue(any(s['orientation']=='DOWN' and s['cook_state']==1 for s in states))

 def test_literal_source_orientation_is_preserved_without_flipping_to_UP(self):
  row={'classification':'inferred-graded-support-core','vertices':[[0,0,0,0,0],[1,0,0,1,0],[0,1,0,0,1]]}
  triangles=producer.support_core_triangles(api,row);self.assertEqual(triangles,[[0,1,2]])
  self.assertEqual(producer.face_state(api,serialize([{'vertices':row['vertices']}])[0])['orientation'],'DOWN')

 def test_exact_zero_source_nonconvex_overflow_unknown_roles_and_resource_bounds_refuse(self):
  base={'classification':'inferred-graded-support-core','vertices':[[0,0,0,0,0],[0,1,0,0,1],[1,0,0,1,0]]}
  for mutate,reason in [(lambda r:r.update(classification='physical-sidewall'),'support-core'),(lambda r:r.update(vertices=[[0]*5,[1,0,0,0,0],[2,0,0,0,0]]),'zero exact'),(lambda r:r.update(vertices=[[0,0,0,0,0],[2,0,0,0,0],[1,.1,0,0,0],[2,2,0,0,0],[0,2,0,0,0]]),'convex'),(lambda r:r['vertices'][0].__setitem__(0,1e39),'finite GLB'),(lambda r:r.update(vertices=[[0]*5]*65),'3..64')]:
   bad=copy.deepcopy(base);mutate(bad)
   with self.subTest(reason=reason),self.assertRaisesRegex(ValueError,reason):producer.support_core_triangles(api,bad)
  bad={'classification':'inferred-graded-support-core','vertices':fan(self.f['core'][8],8)[21]['vertices']}
  with self.assertRaisesRegex(ValueError,'no nonzero-source triangulation'):producer.support_core_triangles(api,bad)
  # Distinct source corners that all collapse in GLB are retained, not invented.
  tiny={'classification':'inferred-graded-support-core','vertices':[['1','1','0','0','0'],['1','100000000000000000001/100000000000000000000','0','0','0'],['100000000000000000001/100000000000000000000','1','0','0','0']]}
  self.assertEqual(producer.support_core_triangles(api,tiny),[[0,1,2]])

if __name__=='__main__':unittest.main()
