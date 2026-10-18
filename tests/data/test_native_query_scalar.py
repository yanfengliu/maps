"""Bound: exact interval math and retained finite queries; no city/native acceptance."""
from pathlib import Path
from fractions import Fraction
import hashlib,json,math,sys,unittest
from unittest import mock
ROOT=Path(__file__).absolute().parents[2]
sys.path.insert(0,str(ROOT/'tools/data'))
import surface_network as api
np=api.np

def _exact_orientation(a, b, c):
    ax, ay = map(lambda x: Fraction(float(x)), a)
    bx, by = map(lambda x: Fraction(float(x)), b)
    cx, cy = map(lambda x: Fraction(float(x)), c)
    return (bx-ax)*(cy-ay)-(by-ay)*(cx-ax)

def original_orientation(a, b, c):
    # Literal 23e preimage; the artifact contract checks this body's AST.
    ux, uy = b[:, 0]-a[:, 0], b[:, 1]-a[:, 1]
    vx, vy = c[:, 0]-a[:, 0], c[:, 1]-a[:, 1]
    def product_bounds(x, y):
        xl, xh = np.nextafter(x, -np.inf), np.nextafter(x, np.inf)
        yl, yh = np.nextafter(y, -np.inf), np.nextafter(y, np.inf)
        products = np.stack((xl*yl, xl*yh, xh*yl, xh*yh))
        return np.nextafter(products.min(axis=0), -np.inf), np.nextafter(products.max(axis=0), np.inf)
    pl, ph = product_bounds(ux, vy)
    ql, qh = product_bounds(uy, vx)
    lo, hi = np.nextafter(pl-qh, -np.inf), np.nextafter(ph-ql, np.inf)
    signs = np.where(lo > 0, 1, np.where(hi < 0, -1, 0))
    determinants = ux*vy-uy*vx
    exact = {}
    for i in np.flatnonzero(signs == 0):
        value = _exact_orientation(a[i], b[i], c[i])
        exact[int(i)] = value
        signs[i] = (value > 0)-(value < 0)
        determinants[i] = float(value)
    return signs, determinants, exact


def current_expected(value):
    """Retain literal historical numeric goldens; version only the declared model."""
    if isinstance(value, dict):
        return {k: (api.NATIVE_QUERY_MODEL if k == 'query_coordinate_model' else current_expected(v)) for k,v in value.items()}
    if isinstance(value, list): return [current_expected(v) for v in value]
    return value

def old_bounds(x,y):
    xl,xh=np.nextafter(x,-np.inf),np.nextafter(x,np.inf)
    yl,yh=np.nextafter(y,-np.inf),np.nextafter(y,np.inf)
    products=np.stack((xl*yl,xl*yh,xh*yl,xh*yh))
    return np.nextafter(products.min(axis=0),-np.inf),np.nextafter(products.max(axis=0),np.inf)

def scalar_bounds(x,y):
    x,y=np.broadcast_arrays(x,y)
    pairs=[api._scalar_product_bounds(float(a),float(b)) for a,b in zip(x.flat,y.flat)]
    return tuple(np.asarray([p[i] for p in pairs],float).reshape(x.shape) for i in range(2))

def triples():
    tiny=2**-1074;huge=np.finfo(float).max
    return [([0,0],[1,0],[0,1]),([0,0],[0,1],[1,0]),([0,0],[1,0],[.5,0]),
            ([0,0],[1,1],[1,np.nextafter(1.,np.inf)]),([0,0],[1,1],[1,np.nextafter(1.,-np.inf)]),
            ([0,0],[tiny,0],[0,tiny]),([2**52,2**52],[2**52+1,2**52],[2**52,2**52+1]),
            ([0,0],[huge,0],[huge,tiny]),([-huge,0],[huge,0],[0,tiny]),
            ([-0.,0.],[0.,-0.],[-0.,0.])]

class NativeScalarIntervals(unittest.TestCase):
    def assert_orientation_equal(self,a,b,c):
        before=[v.tobytes() for v in (a,b,c)]
        with np.errstate(all='ignore'):
            expected=original_orientation(a,b,c);actual=api._orientation(a,b,c)
        self.assertEqual([v.tobytes() for v in actual[:2]],[v.tobytes() for v in expected[:2]])
        self.assertEqual(actual[2],expected[2]);self.assertEqual(before,[v.tobytes() for v in (a,b,c)])
        for i,(u,v,w) in enumerate(zip(a,b,c)):
            u,v,w=[[Fraction(float(x)) for x in p] for p in (u,v,w)]
            determinant=(v[0]-u[0])*(w[1]-u[1])-(v[1]-u[1])*(w[0]-u[0])
            self.assertEqual(actual[0][i],(determinant>0)-(determinant<0))
        return actual

    def test_product_enclosure_uses_independent_fraction_products(self):
        rounded=1+2**-52;lo,hi=api._scalar_product_bounds(rounded,rounded);exact=Fraction(rounded)**2
        self.assertLessEqual(Fraction(lo),exact);self.assertGreaterEqual(Fraction(hi),exact)
        values=[0.,-0.,float(np.finfo(float).max),-float(np.finfo(float).max),rounded,-rounded]
        values += [sign*math.ldexp(1.,e) for e in [-1074,-1073,-1022,-1000,-600,-400,-1,0,1,400,600,1000,1023] for sign in [-1,1]]
        x=np.repeat(values,len(values));y=np.tile(values,len(values));before=(x.tobytes(),y.tobytes())
        with np.errstate(all='ignore'):lo,hi=scalar_bounds(x,y);old_lo,old_hi=old_bounds(x,y)
        self.assertEqual(np.isnan(lo).tolist(),np.isnan(old_lo).tolist());self.assertEqual(np.isnan(hi).tolist(),np.isnan(old_hi).tolist())
        valid=0
        for a,b,l,h in zip(x,y,lo,hi):
            exact=Fraction(float(a))*Fraction(float(b))
            if math.isnan(l) or math.isnan(h):continue
            valid+=1
            self.assertTrue(math.isinf(l) and l<0 or Fraction(float(l))<=exact)
            self.assertTrue(math.isinf(h) and h>0 or Fraction(float(h))>=exact)
        self.assertGreater(valid,900);self.assertGreater(np.count_nonzero(np.isnan(lo)),0)
        self.assertEqual((x.tobytes(),y.tobytes()),before)

    def test_scalar_bounds_match_legacy_empty_broadcast_and_boundary_values(self):
        pairs=[(np.array([],float),np.array([],float)),
               (np.array([0.,-0.,1.,-1.,2**-1074,1+2**-52]),np.array([0.,1.,-1.,1.,2**-1074,1+2**-52])),
               (np.array([1.,-1.,3.]),np.array([2.]))]
        for x,y in pairs:
            with np.errstate(all='ignore'):expected=old_bounds(x,y);actual=scalar_bounds(x,y)
            self.assertEqual([v.tobytes() for v in actual],[v.tobytes() for v in expected])

    def test_small_and_vector_batch_sign_det_exact_bytes_match_original(self):
        rows=triples()
        for n in [1,2,4,8]:
            for offset in range(len(rows)):
                selected=[rows[(offset+i)%len(rows)] for i in range(n)]
                operands=[np.asarray([row[i] for row in selected],float) for i in range(3)]
                self.assert_orientation_equal(*operands)
                noncontiguous=[]
                for value in operands:
                    backing=np.zeros((n,4));backing[:,::2]=value;noncontiguous.append(backing[:,::2])
                self.assert_orientation_equal(*noncontiguous)
        a,b,c=[np.asarray([row[i] for row in rows],float) for i in range(3)]
        for i in [2,5,7,8]:self.assertIn(0,self.assert_orientation_equal(a[i:i+1],b[i:i+1],c[i:i+1])[2])

    def test_other_shapes_and_dtypes_keep_original_vector_path(self):
        for n,dtype in [(0,float),(8,float),(1,np.float32)]:
            a=np.zeros((n,2),dtype=dtype);b=np.ones((n,2),dtype=dtype);c=np.ones((n,2),dtype=dtype)
            with mock.patch.object(api,'_small_orientation',side_effect=AssertionError('vector case entered scalar path')):
                self.assert_orientation_equal(a,b,c)

    def test_retained_query_golden_preserves_identity_bary_height_signed_normal(self):
        raw=(Path(__file__).parent/'fixtures/native-query-intervals.json').read_bytes()
        self.assertEqual(hashlib.sha256(raw).hexdigest(),'42ba14507c77dd899df6f9f68e1cc70ba821a9b06e6085fa4e664eeb0ee3d7d3')
        fixture=json.loads(raw);index=api.NativeTriangleIndex(np.asarray([f['enu_m'] for f in fixture['faces']],float))
        for q in fixture['queries']:self.assertEqual(api.encoded(index.hits(*q['xy_m'])),api.encoded(current_expected(q['expected_hits'])),q['id'])
        self.assertNotIn(len(fixture['faces'])-1,[h['triangle'] for h in index.hits(427.47194895559466,266.006031244335)])

if __name__=='__main__':unittest.main()
