"""Real packed-geometry crack red/green controls, no cached data requirement."""
import json,pathlib,sys,tempfile,unittest
ROOT=pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools/data'));sys.path.insert(0,str(ROOT/'data/runtime'))
import support_surface as support
import surface_network as source
import numpy as np


class ActualSourceQuantizationControls(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        fixture=json.loads((pathlib.Path(__file__).parent/'fixtures/support_quantization_coordinates.json').read_bytes())
        cls.fixture=fixture
        cls.old=support.TriangleIndex(fixture['baseline_packed_terrain_triangles_enu_m'])
        roads=np.asarray(fixture['road_triangles_enu_m']);cls.roads=support.TriangleIndex(roads)
        rows=np.asarray(fixture['vertex_rows_enu_uv_normal']);indices=np.asarray(fixture['source_indices']);original=rows[indices]
        result=[];parents=[]
        for parent,triangle in enumerate(original):
            anchor=triangle[0,:2].copy();local=triangle.copy();local[:,:2]-=anchor
            ids=cls.roads.candidates(triangle[:,:2].min(axis=0)-support.UNION_CLEARANCE_M,triangle[:,:2].max(axis=0)+support.UNION_CLEARANCE_M)
            cuts=roads[ids].copy();cuts[:,:,:2]-=anchor
            pieces,_=support.reconciled_face(local.tolist(),cuts.tolist())
            for piece in pieces:
                piece=np.asarray(piece);piece[:,:2]+=anchor;result.append(piece);parents.append(parent)
        packed,parents,cls.stats=support.conform_source_edges(np.asarray(result),np.asarray(parents),original,indices,rows)
        flat=packed.reshape(-1,8);flat[:,5:8]/=np.linalg.norm(flat[:,5:8],axis=1)[:,None]
        vertices,faces=np.unique(flat,axis=0,return_inverse=True);faces=faces.reshape(-1,3)
        writer=source.city.GlbWriter()
        writer.primitive({'POSITION':vertices[:,[0,2,1]],'TEXCOORD_0':vertices[:,3:5],'NORMAL':vertices[:,5:8]},faces,name='Actual source quantization regression')
        (ROOT/'tmp').mkdir(exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='support-quantization-',dir=ROOT/'tmp') as temporary:
            path=pathlib.Path(temporary)/'fixture.glb';writer.save(path)
            doc,binary=source.city.read_glb(path.read_bytes())
        primitive=doc['meshes'][0]['primitives'][0]
        xyz=source.accessor(doc,binary,primitive['attributes']['POSITION'])[:,[0,2,1]].astype(float)
        indices=source.accessor(doc,binary,primitive['indices']).reshape(-1,3)
        cls.new=support.TriangleIndex(xyz[indices])
        cls.cm=support.TriangleIndex((xyz*100).astype(np.float32).astype(float)[indices]/100)
        cls.cm_roads=support.TriangleIndex((roads*100).astype(np.float32).astype(float)/100)

    @staticmethod
    def first(xy,terrain,roads):
        hits=[{'role':role,**hit} for role,index in [('road',roads),('terrain',terrain)]
              for hit in index.hits(*xy) if min(hit['barycentric'])>=0]
        return max(hits,key=lambda hit:hit['height']) if hits else None

    def test_all_nine_original_cracks_are_red_and_packed_green(self):
        self.assertEqual(len(self.fixture['known_crack_points']),9)
        for site in self.fixture['known_crack_points']:
            with self.subTest(route=site['route_id']):
                self.assertIsNone(self.first(site['xy_m'],self.old,self.roads),"Unrepaired packed source must reproduce the actual gap")
                for terrain,roads in [(self.new,self.roads),(self.cm,self.cm_roads)]:
                    hit=self.first(site['xy_m'],terrain,roads)
                    self.assertIsNotNone(hit)
                    self.assertGreaterEqual(hit['normal_up_z'],.7)

    def test_all480_prefrozen_held_out_layers_and_heights_are_preserved(self):
        self.assertEqual(len(self.fixture['held_out_xy_m']),480)
        for i,xy in enumerate(self.fixture['held_out_xy_m']):
            with self.subTest(site=i):
                old=self.first(xy,self.old,self.roads)
                self.assertIsNotNone(old)
                for terrain,roads in [(self.new,self.roads),(self.cm,self.cm_roads)]:
                    new=self.first(xy,terrain,roads)
                    self.assertIsNotNone(new)
                    self.assertEqual(old['role'],new['role'])
                    self.assertGreaterEqual(new['normal_up_z'],.7)
                    self.assertLessEqual(abs(old['height']-new['height']),.00001)

    def test_every_packed_local_face_has_nonzero_projected_area_and_valid_normal(self):
        triangles=self.new.triangles
        normals=np.cross(triangles[:,1]-triangles[:,0],triangles[:,2]-triangles[:,0])
        self.assertTrue(np.all(normals[:,2]!=0))
        self.assertTrue(np.all(abs(normals[:,2])/np.linalg.norm(normals,axis=1)>=.7))
        self.assertGreater(self.stats['source_edge_subdivision_events'],0)
        self.assertGreater(self.stats['exact_zero_projected_xy_triangles'],0)


if __name__=='__main__':unittest.main()
