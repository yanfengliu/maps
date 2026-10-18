"""Complete small schema2/current-ESU admission; no city index/native claim."""
import copy,hashlib,json,pathlib,sys,unittest
from unittest import mock
ROOT=pathlib.Path(__file__).absolute().parents[2]
sys.path.insert(0,str(ROOT/'tools/data'))
import surface_network as api
import support_topology as topology
np=api.np


def fixture():
    record=lambda path,digest='a'*64:{'path':path,'bytes':10,'sha256':digest}
    inventory=[];snapshots={}
    for role,execution,_,_ in topology.SNAPSHOT_ROLES:
        digest=hashlib.sha256(role.encode()).hexdigest()
        inventory.append(record(execution,digest));snapshots[role]=record('data/source/provenance/'+role+'-'+digest,digest)
    original=record('data/prepared/terrain.glb');inventory.append(original)
    algorithm={**snapshots['geometry'],'integration':snapshots['integration'],'topology':snapshots['topology'],'build_city':snapshots['build_city']}
    configurations={'surface_network':snapshots['surface_configuration'],'city':snapshots['city_configuration']}
    manifest={**api.schema2_admission_contract(),'schema_version':2,'inputs':{'original_terrain':original},
        'algorithm':algorithm,'configuration_inputs':configurations,'construction_policy':topology.construction_policy(.00025),
        'terrain_source_triangle_indices':[0],'derived_terrain':{**record('data/prepared/surface/terrain.glb'),
            'triangles':1,'vertices':3,'bounds_glb_m':[[0.,2.,0.],[1.,2.,1.]]},
        'topology_provenance':{'schema_version':1,'record':record('data/prepared/surface/pieces.bin'),'format':'SUPPPC01-le-u32-f32',
            'piece_columns':list(topology.PieceAccounting.stored_columns),'original_parent_count':1,'piece_count':1,'output_triangle_count':1,'exclusion_count':0,
            'piece_identity':'global reconciled-piece ordinal in ascending original-parent order before introduced-line refinement','source_layer':'original-terrain-triangle',
            'exclusion_predicates':copy.deepcopy(topology.EXCLUSION_PREDICATES)}}
    preservation={'schema_version':1,'unchanged':True,'inputs_before':copy.deepcopy(inventory),'inputs_after':copy.deepcopy(inventory),
                  'data_bindings':api.generation_bindings(algorithm,configurations)}
    accounting=topology.PieceAccounting([0]);prior=accounting.input(0);accounting.emit(0);accounting.finish_input(0,prior,1)
    ledger=topology.decode_accounting(accounting.encode())
    rows=np.asarray([[[0.,0.,2.],[0.,1.,2.],[1.,0.,2.]]],dtype=np.float32)
    kwargs={'original_parent_count':1,'actual_vertex_count':3,'actual_bounds':[[0.,2.,0.],[1.,2.,1.]],
        'current_inventory':inventory,'clearance':.00025,'pinned_original_terrain_record':original,'expected_contract':api.schema2_admission_contract()}
    return manifest,preservation,ledger,rows,kwargs


def admit(data,**kwargs):
    manifest,preservation,ledger,rows,options=data
    return topology.admit_schema2(manifest,preservation,ledger,rows,np.asarray([0]),**{**options,**kwargs})


class CurrentSchema2Frame(unittest.TestCase):
    def test_authoritative_contract_and_complete_current_admission(self):
        contract=api.schema2_admission_contract()
        self.assertEqual(contract['native_frame'],api.native_frame_record())
        self.assertEqual(contract['native_frame']['definition_sha256'],'2099342528416aa9dcdceea63e6d2604974341d8248f3b1c7ccf287008759170')
        self.assertEqual(contract['physical_query_model'],api.native_physical_model_record())
        verdict=admit(fixture())
        self.assertTrue(verdict['typed_schema2_admitted']);self.assertEqual(verdict['topology']['outputs'],1)

    def test_literal_number_one_and_one_point_zero_are_equivalent(self):
        data=fixture();data[0]['native_frame']['schema_version']=1.0;data[0]['physical_query_model']['schema_version']=1.0
        self.assertTrue(admit(data)['typed_schema2_admitted'])

    def test_old_absent_and_mixed_contracts_refuse(self):
        mutations=[lambda m:m['frame'].update(unreal='centimetres-Xeast-Ynorth-Zup'),
            lambda m:m.pop('native_frame'),lambda m:m.pop('physical_query_model'),lambda m:m.pop('coordinate_model'),
            lambda m:m['native_frame'].update(id='native-centimetres-Xeast-Ynorth-Zup'),
            lambda m:m['native_frame'].update(definition_sha256='0'*64),
            lambda m:m['physical_query_model'].update(definition_sha256='0'*64),
            lambda m:m.update(coordinate_model='native-float32-centimetres-v1')]
        for i,change in enumerate(mutations):
            data=fixture();change(data[0])
            with self.subTest(case=i),self.assertRaises(ValueError):admit(data)

    def test_boolean_string_numeric_and_extra_marker_fields_refuse(self):
        for marker in ('native_frame','physical_query_model'):
            for key,value in (('schema_version',True),('schema_version','1'),('schema_version',2),('schema_version',float('nan')),
                              ('id',1),('definition_sha256',False),('extra',0)):
                data=fixture();data[0][marker][key]=value
                with self.subTest(marker=marker,key=key,value=value),self.assertRaises(ValueError):admit(data)
        for key,value in (('coordinate_model',True),('coordinate_model',1),('frame',[])):
            data=fixture();data[0][key]=value
            with self.subTest(key=key,value=value),self.assertRaises(ValueError):admit(data)

    def test_historical_code_option_cannot_admit_old_or_missing_frame(self):
        for missing in (True,False):
            data=fixture()
            if missing:data[0].pop('native_frame')
            else:data[0]['frame']['unreal']='centimetres-Xeast-Ynorth-Zup'
            with self.subTest(missing=missing),self.assertRaises(ValueError):admit(data,historical_code=True)

    def test_caller_contract_is_required_not_selected_from_manifest(self):
        manifest,preservation,ledger,rows,options=fixture();options.pop('expected_contract')
        with self.assertRaises(TypeError):topology.admit_schema2(manifest,preservation,ledger,rows,[0],**options)
        with self.assertRaisesRegex(ValueError,'trusted current Source API contract'):
            topology.admit_schema2_frame(manifest,manifest)

    def test_rejected_marker_precedes_ledger_and_geometry_access(self):
        class Forbidden:
            def __array__(self,*args,**kwargs):raise AssertionError('Unrelated geometry accessed before frame refusal')
            def __iter__(self):raise AssertionError('Unrelated ledger accessed before frame refusal')
        manifest,preservation,_,_,options=fixture();manifest['native_frame']['schema_version']=True
        with self.assertRaisesRegex(ValueError,'literal Number1'):
            topology.admit_schema2(manifest,preservation,Forbidden(),Forbidden(),Forbidden(),**options)

    def test_valid_frame_does_not_bypass_existing_piece_accounting(self):
        data=fixture();data[0]['topology_provenance']['output_triangle_count']=2
        with self.assertRaisesRegex(ValueError,'actual decoded arrays'):admit(data)

    def test_surface_rejects_missing_frame_before_any_source_index(self):
        manifest=fixture()[0];manifest.pop('native_frame')
        with mock.patch.object(api,'support_manifest_bytes',return_value=json.dumps(manifest).encode()),mock.patch.object(api,'RoadSupport') as roads,mock.patch.object(api,'admitted_elevation') as dem,mock.patch.object(api,'NativeTriangleIndex') as index:
            with self.assertRaisesRegex(ValueError,'native_frame'):api.Surface({},[])
            roads.assert_not_called();dem.assert_not_called();index.assert_not_called()

    def test_surface_accepts_literal_number_marker_before_source_work(self):
        manifest=fixture()[0];manifest['native_frame']['schema_version']=1.0
        class ReachedSource(Exception):pass
        with mock.patch.object(api,'support_manifest_bytes',return_value=json.dumps(manifest).encode()),mock.patch.object(api,'RoadSupport',side_effect=ReachedSource):
            with self.assertRaises(ReachedSource):api.Surface({},[])

if __name__=='__main__':unittest.main(verbosity=2)