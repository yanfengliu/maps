"""Receipt/path verdict unit checks; these do not claim a native Game ran."""
import importlib.util
import hashlib
import ctypes
from ctypes import wintypes
import json
import os
import subprocess
import sys
from pathlib import Path
import shutil
import time
import unittest
import uuid

ROOT=Path(__file__).resolve().parents[2]
source=Path(os.environ.get('SHIBUYA_RUNNER_UNDER_TEST',str(ROOT/'tools/runtime/run_native.py')))
spec=importlib.util.spec_from_file_location('native_runner',source)
runner=importlib.util.module_from_spec(spec);spec.loader.exec_module(runner)


class Verdicts(unittest.TestCase):
    def setUp(self):
        self.folder=ROOT/'Artifacts/runtime-runner-unit'/uuid.uuid4().hex;self.folder.mkdir(parents=True)
        self.path=self.folder/'native.json';self.path.write_text('{}')
        self.started=time.time()-1;self.run_id=uuid.uuid4().hex

    def tearDown(self):
        self.folder.resolve().relative_to((ROOT/'Artifacts/runtime-runner-unit').resolve());shutil.rmtree(self.folder)

    def test_stale_output_is_not_native_success(self):
        for report in [None,{'run_id':uuid.uuid4().hex,'passed':True}]:
            with self.assertRaisesRegex(ValueError,'missing, stale'):
                runner.validate_arm('controls',0,report,'SHIBUYA_RUNTIME_CHECK PASS',self.run_id,self.started,self.path,0)

    def test_report_write_failure_requires_nonzero_no_report_no_pass(self):
        self.path.unlink()
        runner.validate_arm('report-write-negative',1,None,'SHIBUYA_RUNTIME_CHECK FAIL report persistence',self.run_id,self.started,self.path,0)
        for code,log in [(0,'SHIBUYA_RUNTIME_CHECK FAIL report persistence'),(1,'SHIBUYA_RUNTIME_CHECK PASS')]:
            with self.assertRaises(ValueError):runner.validate_arm('report-write-negative',code,None,log,self.run_id,self.started,self.path,0)
        self.path.write_text('{}')
        with self.assertRaises(ValueError):runner.validate_arm('report-write-negative',1,None,'SHIBUYA_RUNTIME_CHECK FAIL report persistence',self.run_id,self.started,self.path,0)

    def negative_fixture(self):
        report={'run_id':self.run_id,'passed':False,'inventory_only':False,'negative_input_control':True,'walk_input_moved':False,'look_input_changed':False,'flight_input_moved':False}
        for flag in ['both_populations_moved','native_support_verified','agent_separation_verified','actual_native_population_verified','actual_inputs_unchanged','native_pedestrian_gait_rotated','native_vehicle_spokes_rotated','benchmark_unpaused_warm_interval']:report[flag]=True
        bindings={str(i):'a'*64 for i in range(5)}
        states=['initial','walk','look','flight_mode','flight','walk_refused','descent_ground','walk_recovered','pause_start','pause_end','resume','reset','benchmark_start','benchmark_end']
        report['snapshots']=[{'stage':stage,'elapsed_s':i,'simulation':{'ready':True,'error':'','pedestrian_count':60,'vehicle_count':12,'fixed_steps':i*60,'simulation_time_s':i,'paused':False,'actual_input_sha256':bindings,'actual_input_roles':{name:'source' for name in bindings},'source_manifest_path':'0','source_manifest_sha256':'a'*64},'native_geometry':{'actual_counts_and_transforms_valid':True},'pawn':{key:0 for key in ['forward_input_events','look_input_events','mode_input_events','pause_input_events','reset_input_events']}} for i,stage in enumerate(states)]
        report['final_simulation']=report['snapshots'][-1]['simulation'];report['input_entry']='UGameViewportClient::InputKey/InputAxis'
        return report

    def test_negative_input_requires_full_independent_simulation(self):
        report=self.negative_fixture()
        runner.validate_arm('negative-input',1,report,'',self.run_id,self.started,self.path,0)
        for code,extra in [(0,{}),(1,{'walk_input_moved':True}),(1,{'negative_input_control':False}),(1,{'snapshots':[]}),(1,{'actual_native_population_verified':False}),(1,{'inventory_only':True})]:
            with self.assertRaises(ValueError):runner.validate_arm('negative-input',code,report|extra,'',self.run_id,self.started,self.path,0)
        bare={'run_id':self.run_id,'passed':False,'negative_input_control':True}
        with self.assertRaises(ValueError):runner.validate_arm('negative-input',1,bare,'',self.run_id,self.started,self.path,0)

    def test_suppressed_source_failure_cannot_qualify_negative_input(self):
        report={'run_id':self.run_id,'passed':False,'negative_input_control':True,'load_state':{'ready':False,'error':'Oversized before allocation'}}
        runner.validate_arm('suppressed-source-failure',1,report,'',self.run_id,self.started,self.path,0)
        with self.assertRaises(ValueError):runner.validate_arm('negative-input',1,report,'',self.run_id,self.started,self.path,0)

    def test_dedicated_performance_requires_thirty_seconds(self):
        self.assertEqual(runner.benchmark_duration('controls',None),10)
        self.assertEqual(runner.benchmark_duration('performance',None),30)
        self.assertEqual(runner.benchmark_duration('performance',30),30)
        for value in [10,29,121]:
            with self.assertRaises(ValueError):runner.benchmark_duration('performance',value)

    def test_actual_sparse_oversize_report_rejected_before_read(self):
        with self.path.open('wb') as stream:stream.truncate(runner.LIMIT+1)
        with self.assertRaisesRegex(ValueError,'before reading'):runner.read_report(self.path)
        with self.assertRaises(ValueError):runner.digest(self.path,runner.LIMIT)

    def source_role_fixture(self, size=1, source2=True):
        def put(name, raw):
            path=self.folder/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(raw)
            return {'path':name,'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()}
        terrain_path='data/terrain.glb';terrain=self.folder/terrain_path;terrain.parent.mkdir(parents=True,exist_ok=True)
        with terrain.open('wb') as stream:stream.truncate(size)
        derived={'path':terrain_path,'bytes':size,'sha256':runner.digest(terrain,64*1024*1024),'triangles':1}
        support=put('data/support.json',json.dumps({'schema_version':2,'derived_terrain':derived}).encode())
        source=put('data/source.json',json.dumps({'support_surface':support,'derived_terrain':derived} if source2 else {}).encode())
        records=[source,support,derived,put('data/ledger.bin',b'ledger'),put('data/rays.json',b'{}')]
        bindings={row['path']:row['sha256'] for row in records};roles={name:'source' for name in bindings}
        if source2:roles.update({support['path']:'support_manifest',terrain_path:'derived_terrain'})
        return {'actual_input_sha256':bindings,'actual_input_roles':roles,'source_manifest_path':source['path'],'source_manifest_sha256':source['sha256']}

    def test_large_mesh_requires_real_source2_role_and_terminal_hash(self):
        state=self.source_role_fixture(40800172)
        runner.verify_source_inputs(self.folder,state)
        self.assertEqual(runner.source_digest_limits(self.folder,state)['data/terrain.glb'],64*1024*1024)
        with self.assertRaises(ValueError):runner.digest(self.folder/'data/terrain.glb',runner.LIMIT)
        with (self.folder/'data/terrain.glb').open('r+b') as stream:stream.write(b'X')
        with self.assertRaisesRegex(ValueError,'Actual admitted source input changed'):
            runner.verify_source_inputs(self.folder,state)

    def test_ordinary_large_file_cannot_acquire_derived_role_from_report(self):
        state=self.source_role_fixture(runner.LIMIT+1,source2=False)
        with self.assertRaisesRegex(ValueError,'size bound'):runner.verify_source_inputs(self.folder,state)
        state['actual_input_roles']['data/terrain.glb']='derived_terrain'
        with self.assertRaisesRegex(ValueError,'without a Source2 pair'):runner.verify_source_inputs(self.folder,state)

    def test_source_roles_require_complete_keys_and_exact_pair_identity(self):
        state=self.source_role_fixture()
        for roles in ({},state['actual_input_roles']|{'data/extra':'source'},state['actual_input_roles']|{'data/ledger.bin':'unbounded'}):
            with self.subTest(roles=roles),self.assertRaisesRegex(ValueError,'role map'):
                runner.source_binding_metadata(state|{'actual_input_roles':roles})
        malicious=state['actual_input_roles']|{'data/ledger.bin':'derived_terrain'}
        with self.assertRaisesRegex(ValueError,'Only the Source2 pair'):
            runner.source_digest_limits(self.folder,state|{'actual_input_roles':malicious})
        source=self.folder/'data/source.json';original=json.loads(source.read_bytes());value=json.loads(source.read_bytes())
        value['derived_terrain']['triangles']=True
        raw=json.dumps(value).encode();source.write_bytes(raw);new_hash=hashlib.sha256(raw).hexdigest()
        state['actual_input_sha256']['data/source.json']=new_hash;state['source_manifest_sha256']=new_hash
        with self.assertRaisesRegex(ValueError,'same derived terrain record'):runner.source_digest_limits(self.folder,state)
        raw=json.dumps(original).encode();source.write_bytes(raw);new_hash=hashlib.sha256(raw).hexdigest()
        state['actual_input_sha256']['data/source.json']=new_hash;state['source_manifest_sha256']=new_hash
        support=self.folder/'data/support.json';value=json.loads(support.read_bytes());value['derived_terrain']['triangles']=2
        raw=json.dumps(value).encode();support.write_bytes(raw);new_hash=hashlib.sha256(raw).hexdigest()
        state['actual_input_sha256']['data/support.json']=new_hash
        source=self.folder/'data/source.json';value=json.loads(source.read_bytes());value['support_surface'].update(bytes=len(raw),sha256=new_hash)
        raw=json.dumps(value).encode();source.write_bytes(raw);new_hash=hashlib.sha256(raw).hexdigest()
        state['actual_input_sha256']['data/source.json']=new_hash;state['source_manifest_sha256']=new_hash
        with self.assertRaisesRegex(ValueError,'same derived terrain record'):runner.source_digest_limits(self.folder,state)

    def test_control_snapshots_keep_their_complete_source_roles(self):
        report=self.negative_fixture()
        report['snapshots'][1]['simulation']['actual_input_roles']={'0':'source'}
        with self.assertRaisesRegex(ValueError,'role map'):
            runner.validate_arm('negative-input',1,report,'',self.run_id,self.started,self.path,0)

    def test_windows_path_escape_class(self):
        for relative in ['../a','/a','C:/a','a:ads','data\\a','data//a','data/NUL.json','data/COM1','data/trailing.','data/bad?file']:
            with self.assertRaises(ValueError):runner.confined(self.folder,relative,False)
        self.assertEqual(runner.confined(self.folder,'native.json'),self.path)

    def test_project_root_lexical_parent_escape_is_rejected(self):
        with self.assertRaises(ValueError):runner.project_root(ROOT/'..'/'..'/'..'/'..'/'outside-project')

    def test_actual_parent_junction_rejected_for_root_hash_and_cleanup(self):
        target=self.folder/'target';(target/'child').mkdir(parents=True);file=target/'child'/'evidence.json';file.write_text('{}')
        junction=self.folder/'junction'
        subprocess.run(['cmd.exe','/d','/c','mklink','/J',str(junction),str(target)],creationflags=subprocess.CREATE_NO_WINDOW,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,check=True,timeout=5)
        try:
            with self.assertRaisesRegex(ValueError,'reparse'):runner.digest(junction/'child'/'evidence.json')
            with self.assertRaisesRegex(ValueError,'reparse'):runner.project_root(junction/'child')
            with self.assertRaisesRegex(ValueError,'reparse'):runner.confined(junction/'child','evidence.json')
            self.assertTrue(file.exists())
        finally:junction.rmdir()

    def test_actual_loaded_map_and_asset_bytes_bound(self):
        content=self.folder/'Content';content.mkdir();a=content/'Map.umap';b=content/'Person.uasset';a.write_bytes(b'map version one');b.write_bytes(b'mesh version one')
        snapshot={'valid':True,'map_package':'/Game/Map','packages':[{'package_name':'/Game/Map','root':'project','files':['Content/Map.umap']},{'package_name':'/Game/Person','root':'project','files':['Content/Person.uasset']}]}
        actual=runner.asset_set(snapshot);admitted=runner.hash_assets(self.folder,actual)
        runner.validate_assets({'actual_assets_before':snapshot,'actual_assets_after':snapshot},admitted,True)
        b.write_bytes(b'mesh version two')
        self.assertNotEqual(runner.hash_assets(self.folder,actual),admitted)
        missing=snapshot|{'packages':snapshot['packages'][1:]}
        with self.assertRaisesRegex(ValueError,'map'):runner.asset_set(missing)
        new=snapshot|{'packages':snapshot['packages']+[{'package_name':'/Game/New','root':'project','files':['Content/New.uasset']}]}
        with self.assertRaisesRegex(ValueError,'unbound'):runner.validate_assets({'actual_assets_before':snapshot,'actual_assets_after':new},admitted,True)

    def test_every_performance_prerequisite_binds_actual_dataset(self):
        data=self.folder/'data';data.mkdir()
        paths=[data/name for name in ['movement-network.json','support.json','osm.xml','movement-manifest.json','source-manifest.json']]
        for path in paths:path.write_text('admitted source version one: '+path.name)
        old={path.name:runner.digest(path) for path in paths}
        implementation={'module':'unchanged compiled code'};assets={'map':'unchanged loaded asset'}
        phases=['negative-input','report-write-negative','oversize-negative','suppressed-source-failure','controls']
        for path in paths[:3]:
            path.write_text('fresh admitted source version two: '+path.name)
            current={item.name:runner.digest(item) for item in paths}
            for phase in phases:
                roles={name:'source' for name in old}; source_path=next(iter(old))
                receipt={'passed':True,'phase':phase,'source_sha256':implementation,'asset_sha256':assets,'actual_input_sha256':old,'actual_input_roles':roles,'source_manifest_path':source_path}
                self.path.write_text(json.dumps(receipt));loaded=runner.read_report(self.path)
                with self.subTest(dataset=path.name,phase=phase):
                    with self.assertRaisesRegex(ValueError,'actual source inputs'):
                        runner.validate_prerequisite(loaded,phase,implementation,assets,current,roles,source_path)
                    runner.validate_prerequisite(loaded|{'actual_input_sha256':current},phase,implementation,assets,current,roles,source_path)
                    with self.assertRaisesRegex(ValueError,'actual source roles'):
                        runner.validate_prerequisite(loaded|{'actual_input_sha256':current,'actual_input_roles':{}},phase,implementation,assets,current,roles,source_path)
            path.write_text('admitted source version one: '+path.name)

    def test_missing_required_receipts_refuse_before_source_admission(self):
        from unittest import mock
        cases = [(['--phase','controls'], 'completed actual-loaded inventory'),
                 (['--phase','performance','--asset-receipt',str(self.path)], 'all five completed native')]
        for arguments, message in cases:
            with self.subTest(arguments=arguments):
                with mock.patch.object(sys,'argv',[str(source),*arguments]), mock.patch.object(runner,'project_root',side_effect=AssertionError('Missing arguments reached source admission')):
                    with self.assertRaisesRegex(ValueError,message):runner.main()

    def test_stale_inventory_refuses_before_unrelated_content_traversal(self):
        from unittest import mock
        arguments=[str(source),'--project-root',str(self.folder),'--phase','controls','--asset-receipt',str(self.path)]
        with mock.patch.object(sys,'argv',arguments), mock.patch.object(runner,'project_root',return_value=self.folder), mock.patch.object(runner,'confined',side_effect=lambda root,relative,exists=True: root/relative), mock.patch.object(runner,'digest',return_value='a'*64), mock.patch.object(runner,'read_report',return_value={'passed':False}), mock.patch.object(runner,'content_assets',side_effect=AssertionError('Stale inventory reached unrelated Content traversal')):
            with self.assertRaisesRegex(ValueError,'Actual asset preparation is missing, failed or stale'):runner.main()

    def test_performance_requires_complete_control_native_source_map(self):
        from unittest import mock
        a='a'*64; bindings={'data/'+str(i)+'.json':a for i in range(5)}; roles={name:'source' for name in bindings}; source_path='data/0.json'
        implementation={'ShibuyaUnreal.uproject':a,'Binaries/Win64/UnrealEditor-ShibuyaRuntime.dll':a,'@native_runner':a}
        assets={'project:Content/Map.umap':a}
        inventory_path=self.folder/'inventory'/'report.json'
        phases=['controls','negative-input','report-write-negative','oversize-negative','suppressed-source-failure']
        flags=['--controls-receipt','--negative-input-receipt','--report-failure-receipt','--oversize-receipt','--source-failure-receipt']
        prior_paths={phase:self.folder/phase/'report.json' for phase in phases}
        arguments=[str(source),'--project-root',str(self.folder),'--phase','performance','--asset-receipt',str(inventory_path)]
        for flag,phase in zip(flags,phases):arguments.extend([flag,str(prior_paths[phase])])
        maps=[('subset',{k:v for k,v in bindings.items() if k!='data/0.json'}),
              ('extra',bindings|{'data/extra.json':a}),
              ('wrong',bindings|{'data/0.json':'b'*64}),('complete',bindings)]
        for label,control_map in maps:
            def read_fixture(path):
                if path==inventory_path:return {'passed':True,'phase':'inventory','source_sha256':implementation,'asset_sha256':assets,'native_report_sha256':a,'actual_input_sha256':bindings,'actual_input_roles':roles,'source_manifest_path':source_path}
                if path==inventory_path.parent/'native.json':return {'actual_assets_after':{},'final_simulation':{'actual_input_sha256':bindings,'actual_input_roles':roles,'source_manifest_path':source_path,'source_manifest_sha256':a}}
                if path==prior_paths['controls'].parent/'native.json':return {'final_simulation':{'actual_input_sha256':control_map,'actual_input_roles':roles,'source_manifest_path':source_path,'source_manifest_sha256':a}}
                for phase,prior in prior_paths.items():
                    if path==prior:return {'passed':True,'phase':phase,'source_sha256':implementation,'asset_sha256':assets,'actual_input_sha256':bindings,'actual_input_roles':roles,'source_manifest_path':source_path,'native_report_sha256':a}
                self.fail('Unexpected fixture read: '+str(path))
            with self.subTest(control_map=label):
                with mock.patch.object(sys,'argv',arguments), mock.patch.object(runner,'project_root',return_value=self.folder), mock.patch.object(runner,'confined',side_effect=lambda root,relative,exists=True: root/relative), mock.patch.object(runner,'guard_path',side_effect=lambda path,exists=True:path), mock.patch.object(runner,'digest',return_value=a), mock.patch.object(runner,'read_report',side_effect=read_fixture), mock.patch.object(runner,'verify_source_inputs'), mock.patch.object(runner,'asset_set',return_value=assets), mock.patch.object(runner,'hash_assets',return_value=assets), mock.patch.object(runner,'content_assets',side_effect=AssertionError('All prerequisite admission completed')):
                    if label=='complete':
                        with self.assertRaisesRegex(AssertionError,'All prerequisite admission completed'):runner.main()
                    else:
                        with self.assertRaisesRegex(ValueError,'complete current admitted source input map'):runner.main()

    def test_job_cleanup_failure_still_waits_and_closes_process_with_red_receipt(self):
        from unittest import mock
        for cascading in (False, True):
            events = []
            class FailedJob:
                def close(self):
                    events.append('job.close')
                    raise OSError('controlled job close failure')
            class Process:
                pid = 43210
                resumed = True
                calls = 0
                def wait(self, timeout):
                    self.calls += 1; events.append('process.wait:'+str(timeout))
                    if cascading:
                        if self.calls == 1: raise RuntimeError('primary dispatch failure')
                        raise RuntimeError('controlled process wait failure')
                    return 0
                def close(self):
                    events.append('process.close')
                    if cascading: raise RuntimeError('controlled process handle failure')
            process = Process(); receipts = []
            def launch(command, root, log, job):
                # Model only native/process IO. Actual main cleanup, verdict
                # error accumulation and persisted receipt are exercised.
                relative = next(arg.split('=',1)[1] for arg in command if arg.startswith('-ShibuyaRuntimeCheck='))
                native = root/relative
                native.write_text(json.dumps({'final_simulation':{},'actual_assets_before':{},'actual_assets_after':{}}))
                receipts.append(native.parent/'report.json')
                return process
            bindings = {'data/source.json':'a'*64}; roles = {'data/source.json':'source'}
            arguments = [str(source),'--project-root',str(self.folder),'--phase','inventory']
            with self.subTest(cascading=cascading):
                with mock.patch.object(sys,'argv',arguments), mock.patch.object(runner,'project_root',return_value=self.folder), mock.patch.object(runner,'confined',side_effect=lambda root,relative,exists=True: root/relative), mock.patch.object(runner,'guard_path',side_effect=lambda path,exists=True:path), mock.patch.object(runner,'digest',return_value='a'*64), mock.patch.object(runner,'content_assets',return_value={}), mock.patch.object(runner,'OwnedJob',FailedJob), mock.patch.object(runner,'launch_owned',side_effect=launch), mock.patch.object(runner,'validate_arm'), mock.patch.object(runner,'source_binding_metadata',return_value=(bindings,roles,'data/source.json')), mock.patch.object(runner,'asset_set',return_value={}), mock.patch.object(runner,'hash_assets',return_value={}), mock.patch.object(runner,'validate_assets'), mock.patch.object(runner,'verify_source_inputs'), mock.patch('builtins.print'):
                    result = runner.main()
                self.assertEqual(events, ['process.wait:300','job.close','process.wait:30','process.close'])
                self.assertEqual(result, 1)
                self.assertEqual(len(receipts), 1)
                receipt = json.loads(receipts[0].read_text())
                self.assertIs(receipt['passed'], False)
                self.assertIs(receipt['cleanup']['job_empty_verified'], False)
                self.assertEqual(receipt['cleanup']['terminated_owned_remaining_pids'], [])
                self.assertIn('controlled job close failure', receipt['error'])
                if cascading:
                    for message in ('primary dispatch failure','controlled process wait failure','controlled process handle failure'):
                        self.assertIn(message, receipt['error'])
                    self.assertTrue(receipt['error'].startswith('primary dispatch failure'))
                else:
                    self.assertEqual(receipt['exit_code'], 0)

    def cleanup_known_child(self,pid):
        api=ctypes.WinDLL('kernel32',use_last_error=True)
        api.OpenProcess.argtypes=[wintypes.DWORD,wintypes.BOOL,wintypes.DWORD];api.OpenProcess.restype=wintypes.HANDLE
        api.WaitForSingleObject.argtypes=[wintypes.HANDLE,wintypes.DWORD];api.WaitForSingleObject.restype=wintypes.DWORD
        api.TerminateProcess.argtypes=[wintypes.HANDLE,wintypes.UINT];api.TerminateProcess.restype=wintypes.BOOL
        api.CloseHandle.argtypes=[wintypes.HANDLE]
        handle=api.OpenProcess(0x100001,False,pid)
        if not handle:
            self.assertEqual(ctypes.get_last_error(),87);return
        try:
            if api.WaitForSingleObject(handle,1000)==0x102:
                # This PID came synchronously from this test root's Popen,
                # before root exit. Never enumerate or kill shared processes.
                self.assertTrue(api.TerminateProcess(handle,1));self.assertEqual(api.WaitForSingleObject(handle,5000),0)
        finally:api.CloseHandle(handle)

    def test_native_process_suspended_before_job_and_early_child_owned_after_root_exit(self):
        marker=self.folder/'early-child.json';child="import time;time.sleep(20)"
        code="import subprocess,sys;from pathlib import Path;p=subprocess.Popen([sys.executable,'-c',"+repr(child)+"],creationflags=0x08000000);Path("+repr(str(marker))+").write_text(str(p.pid))"
        job=runner.OwnedJob();process=None
        try:
            with (self.folder/'ownership.log').open('wb') as log:
                process=runner.SuspendedProcess([sys.executable,'-c',code],self.folder,log)
                time.sleep(0.15);self.assertFalse(marker.exists())
                job.assign(process);self.assertIn(process.pid,job.active());time.sleep(0.15);self.assertFalse(marker.exists())
                process.resume();self.assertEqual(process.wait(10),0)
                deadline=time.monotonic()+5
                while not marker.exists() and time.monotonic()<deadline:time.sleep(0.05)
                self.assertTrue(marker.exists());child_pid=int(marker.read_text());self.assertIn(child_pid,job.active())
        finally:
            owned=job.close()
            if process is not None:
                try:process.wait(5)
                finally:process.close()
            if marker.exists():
                pid=int(marker.read_text());self.cleanup_known_child(pid)
                print(json.dumps({'proof':'known-early-child-cleanup','pid':pid,'stopped':True}),flush=True)
        self.assertIn(child_pid,owned)
        print(json.dumps({'proof':'suspended-root/early-child/root-exit','root_pid':process.pid,'child_pid':child_pid,'job_remaining_before_cleanup':owned,'known_child_stopped':True}),flush=True)

    def test_assignment_failure_never_runs_child_code(self):
        marker=self.folder/'forbidden-marker.json'
        class RejectedJob(runner.OwnedJob):
            def assign(self,process):self.attempt_pid=process.pid;raise RuntimeError('Controlled assignment failure')
        job=RejectedJob()
        try:
            with (self.folder/'assignment.log').open('wb') as log:
                with self.assertRaisesRegex(RuntimeError,'assignment failure'):
                    runner.launch_owned([sys.executable,'-c',"from pathlib import Path;Path("+repr(str(marker))+").write_text('executed')"],self.folder,log,job)
            self.assertFalse(marker.exists());self.assertEqual(job.active(),[])
        finally:
            job.close()
            if hasattr(job,'attempt_pid'):self.cleanup_known_child(job.attempt_pid)
        print(json.dumps({'proof':'assignment-failure-before-resume','root_pid':job.attempt_pid,'no_child_marker':not marker.exists(),'root_stopped':True}),flush=True)


if __name__=='__main__':unittest.main()
