"""Final packing/GLB conservation controls; no native or cached city claim."""
import copy
import json
import pathlib
import sys
import tempfile
import unittest

ROOT=pathlib.Path(__file__).absolute().parents[2]
sys.path.insert(0,str(ROOT/'tools/data'));sys.path.insert(0,str(ROOT/'data/runtime'))
import numpy as np
import support_surface as surface
import support_topology as topology
import surface_network as source


def original():
    # Negative ENU winding is the raw source's positive GLB+Y convention.
    return np.asarray([[0.,0.,2.,0.,0.,0.,1.,0.],
                       [0.,4.,10.,0.,1.,0.,1.,0.],
                       [4.,0.,6.,1.,0.,0.,1.,0.]])


def pack(pieces,context=None):
    parent=original();context=context or topology.CreatingLines(0,parent.tolist())
    refined,piece_ids,stats=context.refine(pieces,np.zeros(2))
    accounting=topology.PieceAccounting([0]*len(pieces))
    rows,parents,packing,piece_ids=surface.conform_source_edges(
        refined,np.zeros(len(refined),dtype=int),parent[None],np.asarray([[0,1,2]]),parent,
        piece_ids=piece_ids,accounting=accounting)
    rows,swaps=topology.parent_winding(rows,parents,parent[None])
    return rows,parents,piece_ids,accounting,stats,packing,swaps


def write_and_read(rows,parents,pieces,accounting,mutate=None):
    flat=rows.copy().reshape(-1,8)
    flat[:,5:8]/=np.linalg.norm(flat[:,5:8],axis=1)[:,None]
    vertices,inverse=np.unique(flat,axis=0,return_inverse=True)
    writer=source.city.GlbWriter()
    writer.primitive({'POSITION':vertices[:,[0,2,1]],'TEXCOORD_0':vertices[:,3:5],
                      'NORMAL':vertices[:,5:8]},inverse.reshape(-1,3),name='Complete topology fixture')
    directory=ROOT/'tmp';directory.mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='topology-fixture-',dir=directory) as temporary:
        path=pathlib.Path(temporary)/'fixture.glb';writer.save(path)
        document,binary=source.city.read_glb(path.read_bytes())
    binary=bytearray(binary)
    if mutate is not None:mutate(document,binary)
    return topology.verify_writer_readback(document,binary,source.accessor,vertices,inverse,parents,pieces,accounting)


class FinalTopologyControls(unittest.TestCase):
    def test_portable_json_integer_rule_rejects_coercion(self):
        self.assertTrue(topology.json_integer(2))
        self.assertTrue(topology.json_integer(2.0))
        for value in (True,'2',2.1,float('nan'),float('inf'),None):
            self.assertFalse(topology.json_integer(value))

    def row(self,east,north):
        return surface.interpolate_row(original().tolist(),[east,north])

    def test_tiny_nonzero_refine_pack_glb_readback_is_retained(self):
        piece=[self.row(.2,.2),self.row(.200001,.2),self.row(.2,.200001)]
        rows,parents,pieces,accounting,_,_,_=pack([piece])
        actual,readback=write_and_read(rows,parents,pieces,accounting)
        self.assertEqual(len(actual),1)
        exact=topology.packed_cross(actual[0])[2]
        self.assertNotEqual(exact,0)
        self.assertLess(abs(exact),surface.MIN_AREA_M2)
        self.assertEqual(readback['accounting']['unaccounted_pieces'],0)
        self.assertEqual(accounting.exclusions,[])

    def test_actual_unauthorized_writer_loss_mutant_is_red(self):
        rows,parents,pieces,accounting,_,_,_=pack([original().tolist()])
        def lose_primitive(document,binary):
            primitive=document['meshes'][0]['primitives'][0]
            document['accessors'][primitive['indices']]['count']-=3
        with self.assertRaisesRegex(ValueError,'index readback lost/reordered'):
            write_and_read(rows,parents,pieces,accounting,lose_primitive)
        # The same unmodified bytes have the complete positive readback.
        self.assertEqual(write_and_read(rows,parents,pieces,accounting)[1]['accounting']['outputs'],1)

    def test_packed_output_piece_loss_and_false_exclusion_are_red(self):
        rows,parents,pieces,accounting,_,_,_=pack([original().tolist()])
        with self.assertRaisesRegex(ValueError,'output-piece vector differs'):
            accounting.validate(rows[:0],parents[:0],pieces[:0])
        accounting.exclusions.append({'piece':0,'reason':'exact_zero_xy','packed_xyz':rows[0,:,:3].tolist()})
        with self.assertRaisesRegex(ValueError,'zero-XY exclusion'):
            accounting.validate(rows,parents,pieces)

    def test_every_incident_proven_line_uses_shared_event(self):
        a,b,c=self.row(1,0),self.row(1,2),self.row(1,1)
        pieces=[[a,b,self.row(2,1)],[a,c,self.row(0,.5)],[c,b,self.row(0,1.5)]]
        context=topology.CreatingLines(0,original().tolist())
        line=context.label('source-road-projected-edge',a,b)
        for piece in pieces:context.seed(piece,'actual-clip-segment')
        omitted,_,omitted_stats=context.refine(pieces,np.zeros(2))
        self.assertEqual(omitted_stats.get('introduced_subdivision_uses',0),0)
        equation=context.lines[line]['coefficients']
        self.assertEqual(equation[0]*topology.rational(c[0])+equation[1]*topology.rational(c[1])+equation[2],0)
        context.labels[tuple(c[:2])].add(line)
        rows,parents,piece_ids,accounting,stats,_,swaps=pack(pieces,context)
        self.assertEqual(stats['introduced_subdivision_uses'],1)
        self.assertEqual(stats['incident_creating_line_uses'],3)
        self.assertTrue(all(topology.packed_cross(row)[2]<0 for row in rows))
        self.assertGreater(swaps,0)
        self.assertEqual(write_and_read(rows,parents,piece_ids,accounting)[1]['accounting']['pieces'],3)

    def test_exact_exclusions_are_individually_accounted_not_epsilon(self):
        source_parent=original()
        # Interior packed polygon has3 distinct collinear XY points but a
        # nonzero3D cross, so this uses the authorized exact projected reason.
        piece=np.asarray([[.1,.1,2.3,0,0,0,1,0],
                          [.8,.1,3,0,0,0,1,0],
                          [.5,.1,2.700000238418579,0,0,0,1,0]])
        accounting=topology.PieceAccounting([0])
        rows,parents,stats,pieces=surface.conform_source_edges(
            piece[None],[0],source_parent[None],np.asarray([[0,1,2]]),source_parent,
            piece_ids=[0],accounting=accounting)
        self.assertEqual(len(rows),0)
        self.assertEqual(stats['piece_accounting']['exact_zero_xy'],1)
        decoded=topology.decode_accounting(accounting.encode())
        self.assertEqual(decoded[2],accounting.exclusions)
        self.assertNotEqual(topology.packed_cross(decoded[2][0]['packed_xyz']), (0,0,0))

    def test_finite_source_bounds_accept_rounding_and_reject_height_mutant(self):
        rows,parents,pieces,accounting,_,_,_=pack([original().tolist()])
        check=topology.quantization_check(rows,parents,original()[None],[0],[1])
        self.assertTrue(check['passed'])
        self.assertTrue(all(np.isfinite(check['maximum_plane_uv_bounds'])))
        wrong=rows.copy();wrong[0,0,2]+=.01
        with self.assertRaisesRegex(ValueError,'finite source-quantization bound'):
            topology.quantization_check(wrong,parents,original()[None],[0],[1])

    def test_normal_and_uv_mutants_are_actual_readback_red(self):
        rows,parents,pieces,accounting,_,_,_=pack([original().tolist()])
        for field in ('NORMAL','TEXCOORD_0'):
            def corrupt(document,binary,field=field):
                primitive=document['meshes'][0]['primitives'][0]
                view=document['bufferViews'][document['accessors'][primitive['attributes'][field]]['bufferView']]
                # Reader mutation is an actual decoded byte change, not a
                # comparator flag. The fixture copies the decoded bytes first.
                offset=view.get('byteOffset',0)
                binary[offset:offset+4]=np.float32(.5).tobytes()
            with self.subTest(field=field):
                with self.assertRaisesRegex(ValueError,f'actual{field} readback differs'):
                    write_and_read(rows,parents,pieces,accounting,corrupt)


if __name__=='__main__':unittest.main()
