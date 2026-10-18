"""Bound: finite explicit frame/query operands; no native import, city or contact acceptance."""
from pathlib import Path
import hashlib,json,sys,unittest
ROOT=Path(__file__).absolute().parents[2]
sys.path.insert(0,str(ROOT/'tools/data'))
import surface_network as api
np=api.np

EXPECTED={'schema_version':1,'id':'native-centimetres-Xeast-Ysouth-Zup-v2','definition_sha256':'2099342528416aa9dcdceea63e6d2604974341d8248f3b1c7ccf287008759170'}

class NativeFrame(unittest.TestCase):
    def test_exact_definition_and_record(self):
        payload=json.dumps(api.NATIVE_FRAME_DEFINITION,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False).encode()
        self.assertEqual(hashlib.sha256(payload).hexdigest(),EXPECTED['definition_sha256'])
        self.assertEqual(api.native_frame_record(),EXPECTED)
        self.assertEqual(api.native_physical_model_record(),{'schema_version':1,'id':'ue5.8.3-cl58210709-chaos-cook-float32-cm-v1','definition_sha256':'e5ba1adad4fcab4e05d61d899babf8f6c789655cfe4637c393d7002f4f742428'})

    def test_literal_forward_inverse_and_xy(self):
        source=np.array([[1.25,-2.5,3.75],[-4,5,-6]],float)
        native=api.source_to_native_cm(source)
        np.testing.assert_array_equal(native,[[125,250,375],[-400,-500,-600]])
        np.testing.assert_array_equal(api.native_to_source_m(native),source)
        np.testing.assert_array_equal(api.native_xy_cm(source[:,:2]),[[125,250],[-400,-500]])
        np.testing.assert_array_equal(source,[[1.25,-2.5,3.75],[-4,5,-6]])

    def test_missing_old_wrong_seal_and_extra_record_fields_refuse(self):
        api.require_native_frame({'native_frame':dict(EXPECTED)},'fixture')
        bad=[None,{},'native-centimetres-Xeast-Ynorth-Zup',{**EXPECTED,'id':'old'},{**EXPECTED,'definition_sha256':'0'*64},{**EXPECTED,'unused':True}]
        for frame in bad:
            with self.subTest(frame=frame),self.assertRaisesRegex(ValueError,'sealed ESU'):
                api.require_native_frame({'native_frame':frame},'fixture')

    def test_literal_native_faces_keep_ids_and_final_clockwise_normal(self):
        source=np.array([[[0.,0.,2.],[0.,1.,3.],[1.,0.,2.]]])
        index=api.NativeTriangleIndex(source,query_role='raw')
        np.testing.assert_array_equal(index.native_triangles_cm,[[[0,0,200],[100,0,200],[0,-100,300]]])
        self.assertEqual(index.native_triangles_cm.dtype,np.dtype('float32'))
        self.assertEqual(index.native_frame,EXPECTED)
        np.testing.assert_array_equal(index.triangles,source)
        face=index.native_triangles_cm[0].astype(float);normal=-np.cross(face[1]-face[0],face[2]-face[0])
        normal/=np.linalg.norm(normal)
        np.testing.assert_allclose(normal,[0,2**-.5,2**-.5],atol=1e-15,rtol=0)
        hit=index.hits(.25,.25)[0]
        self.assertEqual(hit['triangle'],0);self.assertEqual(hit['height'],2.25)
        self.assertEqual(hit['barycentric'],[.5,.25,.25])
        np.testing.assert_allclose(hit['normal_enu'],[0,-2**-.5,2**-.5],atol=1e-15,rtol=0)
        self.assertEqual(hit['query_coordinate_model'],'binary64-cm-query-on-float32-esu-cm-vertices-v2')
        self.assertEqual(api._native_query_hits_batch(index,[[.25,.25]]),[[hit]])

    def test_nonfinite_or_wrong_width_refuses(self):
        for value in ([1,2],[1,float('inf'),2],[1,float('nan'),2]):
            with self.subTest(value=value),self.assertRaises(ValueError):api.source_to_native_cm(value)

if __name__=='__main__':unittest.main(verbosity=2)
