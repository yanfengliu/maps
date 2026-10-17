"""Actual core-compiler fixture mutations and Windows reparse admission controls.

Disposable proof projects contain this runtime's current source/test bytes only.
No engine/GPU run is claimed. Evidence is retained; only created link objects are
removed, never their targets. Each compiler process tree belongs to a Windows Job.
"""
from pathlib import Path
import argparse,hashlib,json,os,re,shutil,stat,subprocess,time,uuid
import run_native as ownership

ROOT=Path(__file__).resolve().parents[2]

def sha(path):
    ownership.guard_path(path)
    if path.stat().st_size==0:
        with path.open('rb') as stream:
            if stream.read(1):raise RuntimeError('Zero-byte evidence changed during hash: '+str(path))
        ownership.guard_path(path)
        if path.stat().st_size!=0:raise RuntimeError('Zero-byte evidence changed during hash: '+str(path))
        return hashlib.sha256(b'').hexdigest()
    return ownership.digest(path,128*1024*1024)

def junction(path,target):
    result=subprocess.run(['cmd','/d','/c','mklink','/J',str(path),str(target)],capture_output=True,creationflags=subprocess.CREATE_NO_WINDOW,timeout=10)
    if result.returncode or not path.lstat().st_file_attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT:
        raise RuntimeError('Could not create actual owned junction: '+result.stdout.decode(errors='replace')+result.stderr.decode(errors='replace'))

def fixture_inventory(directory):
    ownership.guard_path(directory)
    inventory={}
    for path in directory.iterdir():
        ownership.guard_path(path)
        if not path.is_file() or not 1<=path.stat().st_size<=1024*1024:
            raise ValueError('Core fixture must be a bounded regular file: '+str(path))
        inventory[path.name]={'bytes':path.stat().st_size,'sha256':sha(path)}
    ownership.guard_path(directory)
    if not 1<=len(inventory)<=100:raise ValueError('Core fixture inventory needs1-100 bounded regular files: '+str(directory))
    return inventory

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--under-test',type=Path)
    parser.add_argument('--core-receipt',type=Path,required=True,help='Independent passing test_core.ps1 receipt for the exact current core, test, fixture and executable bytes.')
    args=parser.parse_args()
    source=(args.under_test or ROOT/'tools/runtime/test_core.ps1').absolute()
    ownership.guard_path(source)
    if not source.is_relative_to(ROOT):raise ValueError('Harness under test must stay in the worker tree.')
    if not 1<=source.stat().st_size<=1024*1024:raise ValueError('Harness script exceeds the finite1MiB bound.')
    receipt_path=args.core_receipt.absolute();ownership.guard_path(receipt_path)
    if not receipt_path.is_relative_to(ROOT):raise ValueError('Independent core receipt must stay in the worker tree.')
    receipt_hash=sha(receipt_path)
    if not 1<=receipt_path.stat().st_size<=1024*1024:raise ValueError('Independent core receipt exceeds the finite1MiB bound.')
    receipt=json.loads(receipt_path.read_bytes())
    if sha(receipt_path)!=receipt_hash or receipt.get('passed') is not True or receipt.get('exit_code')!=0:
        raise ValueError('Independent core receipt is changed, failed or did not run.')
    inputs=['Source/ShibuyaRuntime/Public/CitySimulation.h','Source/ShibuyaRuntime/Public/RuntimePath.h','Source/ShibuyaRuntime/Public/RuntimeReadLimit.h','tests/runtime/test_simulation.cpp']
    fixture_directory=ROOT/'tests/runtime/fixtures';ownership.guard_path(fixture_directory)
    fixtures=fixture_inventory(fixture_directory)
    inputs += [(fixture_directory/name).relative_to(ROOT).as_posix() for name in fixtures]
    if receipt.get('fixture_inventory')!=fixtures:
        raise ValueError('Independent core receipt does not bind the exact current fixture membership, sizes and hashes.')
    for name in inputs[:4]:
        path=ROOT/name;ownership.guard_path(path)
        if receipt.get('input_inventory',{}).get(path.name)!={'bytes':path.stat().st_size,'sha256':sha(path)}:
            raise ValueError('Independent core receipt has stale actual compiler input: '+name)
    executable=receipt_path.parent/'simulation-tests.exe'
    executable_hash=sha(executable)
    if executable_hash!=receipt.get('executable_sha256'):raise ValueError('Independent core executable changed after its receipt.')
    core_stdout=receipt_path.parent/'stdout.log';stdout_hash=sha(core_stdout)
    counts=re.findall(r'^PASS: ([0-9]+) actual-core assertions\s*$',core_stdout.read_text(encoding='utf-8',errors='strict'),re.MULTILINE)
    if sha(core_stdout)!=stdout_hash or len(counts)!=1 or not 1<=int(counts[0])<=1000000:
        raise ValueError('Independent actual core output needs exactly one finite passing assertion count.')
    expected_marker='PASS: '+counts[0]+' actual-core assertions'
    # Keep real MSVC include paths below its MAX_PATH bound in disposable copies.
    output=ownership.confined(ROOT,'Artifacts/h/'+uuid.uuid4().hex[:8],False);output.mkdir(parents=True)
    script=source.read_bytes()
    before={p:sha(ROOT/p) for p in inputs};before['tools/runtime/test_core.ps1']=sha(source);before['@proof_driver']=sha(Path(__file__))
    before['@independent_core_receipt']=receipt_hash;before['@independent_core_stdout']=stdout_hash
    before['@independent_core_executable']=executable_hash
    records=[]
    cases=['green','fixture-remove','fixture-add','fixture-size','fixture-bytes','header-leaf-junction','header-parent-junction','fixture-leaf-junction','fixture-parent-junction','output-leaf-junction','output-parent-junction','project-parent-junction']
    for number,case in enumerate(cases):
        case_root=output/str(number);case_root.mkdir();project=case_root/'p';project.mkdir();links=[]
        tool=project/'tools/runtime/test_core.ps1';tool.parent.mkdir(parents=True);tool.write_bytes(script)
        for name in inputs:
            target=project/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((ROOT/name).read_bytes())
        (project/'Artifacts').mkdir()
        fixture=project/'tests/runtime/fixtures/source_endpoint_foot_204019090.h'
        external=case_root/'external';external.mkdir()
        header_directory=None;launch_tool=tool
        if case.startswith('header-'):
            (external/'CitySimulation.h').write_bytes((ROOT/inputs[0]).read_bytes())
            link=project/'Artifacts/probe';junction(link,external);links.append(link)
            if case=='header-parent-junction':
                (external/'headers').mkdir();(external/'headers/CitySimulation.h').write_bytes((ROOT/inputs[0]).read_bytes());header_directory=link/'headers'
            else:header_directory=link
        elif case.startswith('fixture-') and case.endswith('junction'):
            link=project/('tests/runtime/fixtures' if case=='fixture-leaf-junction' else 'tests/runtime')
            # Move only our freshly created directory before replacing its name.
            moved=case_root/'fixture-original';link.rename(moved);junction(link,moved);links.append(link)
        elif case.startswith('output-'):
            if case=='output-leaf-junction':link=project/'Artifacts/runtime-core'
            else:
                link=project/'Artifacts';link.rmdir()
            junction(link,external);links.append(link)
        elif case=='project-parent-junction':
            alias=case_root/'alias';junction(alias,project);links.append(alias);launch_tool=alias/'tools/runtime/test_core.ps1'
        external_before={str(p.relative_to(external)):sha(p) for p in external.rglob('*') if p.is_file()}
        command=[str(Path(shutil.which('pwsh')).resolve()),'-NoProfile','-File',str(launch_tool)]
        if header_directory is not None:command += ['-HeaderDirectory',str(header_directory)]
        process=None;job=ownership.OwnedJob();raw=[];admitted=None;mutation=False;cleanup=[];failure=None
        try:
            log_path=case_root/'process.log'
            with log_path.open('wb') as log:
                process=ownership.launch_owned(command,project,log,job)
                # Observe the real admitted-input marker, then mutate only the
                # disposable original while the genuine copied C++ test compiles.
                deadline=time.monotonic()+120
                while time.monotonic()<deadline:
                    text=log_path.read_text(encoding='utf-8',errors='replace')
                    if 'CORE_PROOF_INPUTS_ADMITTED ' in text and admitted is None:
                        admitted=text.split('CORE_PROOF_INPUTS_ADMITTED ',1)[1].splitlines()[0].strip()
                        if case=='fixture-remove':fixture.unlink();mutation=True
                        elif case=='fixture-add':(fixture.parent/'added.h').write_text('// added actual fixture\n');mutation=True
                        elif case=='fixture-size':fixture.write_bytes(fixture.read_bytes()+b'\n');mutation=True
                        elif case=='fixture-bytes':
                            value=fixture.read_bytes();fixture.write_bytes(value.replace(b'Promoted',b'promoted',1));mutation=True
                    try:
                        process.wait(timeout=0.02)
                        break
                    except subprocess.TimeoutExpired:
                        pass
                code=process.wait(timeout=5)
        except BaseException as error:
            failure=str(error);code=None
        finally:
            cleanup=job.close()
            if process:
                try:process.wait(timeout=15)
                finally:process.close()
            for link in reversed(links):
                attributes=link.lstat().st_file_attributes
                if not attributes & stat.FILE_ATTRIBUTE_REPARSE_POINT:raise RuntimeError('Refusing link cleanup after its identity changed: '+str(link))
                # rmdir removes this junction object only and never its target.
                os.rmdir(link)
        text=(case_root/'process.log').read_text(encoding='utf-8',errors='replace')
        receipts=list((project/'Artifacts/runtime-core').glob('*/report.json')) if (project/'Artifacts/runtime-core').exists() else []
        passed_receipts=[p for p in receipts if json.loads(p.read_text(encoding='utf-8')).get('passed') is True]
        if case=='green':expected=code==0 and len(passed_receipts)==1 and expected_marker in text
        elif case in ['fixture-remove','fixture-add','fixture-size','fixture-bytes']:
            message={'fixture-remove':'input disappeared: source_endpoint_foot_204019090.h','fixture-add':'input was added: added.h','fixture-size':'input changed size or hash: source_endpoint_foot_204019090.h','fixture-bytes':'input changed size or hash: source_endpoint_foot_204019090.h'}[case]
            compiler_log=Path(admitted)/'stdout.log' if admitted else None
            actual_core_green=compiler_log is not None and compiler_log.exists() and expected_marker in compiler_log.read_text(encoding='utf-8',errors='replace')
            expected=mutation and actual_core_green and code not in (None,0) and not passed_receipts and message in text
        else:expected=code not in (None,0) and admitted is None and 'rejects reparse path:' in text and not passed_receipts
        external_after={str(p.relative_to(external)):sha(p) for p in external.rglob('*') if p.is_file()}
        record={'case':case,'owned_pid':process.pid if process else None,'exit_code':code,'expected_result_observed':expected and failure is None and external_before==external_after,'mutation_after_actual_admission':mutation,'compiled_input_snapshot_observed':admitted,'passed_receipts':len(passed_receipts),'log_sha256':hashlib.sha256((case_root/'process.log').read_bytes()).hexdigest(),'outside_lexical_project_unchanged':external_before==external_after,'cleanup_job_empty':True,'terminated_owned_pids':cleanup,'error':failure}
        records.append(record);print(json.dumps(record),flush=True)
    final_fixtures=fixture_inventory(fixture_directory)
    after={p:sha(ROOT/p) for p in inputs};after['tools/runtime/test_core.ps1']=sha(source);after['@proof_driver']=sha(Path(__file__))
    after['@independent_core_receipt']=sha(receipt_path);after['@independent_core_stdout']=sha(core_stdout)
    after['@independent_core_executable']=sha(executable)
    unchanged=before==after and fixtures==final_fixtures
    report={'passed':unchanged and all(r['expected_result_observed'] for r in records),'independent_core_receipt':str(receipt_path),'actual_assertion_count':int(counts[0]),'input_sha256':before,'fixture_inventory_before':fixtures,'fixture_inventory_after':final_fixtures,'authored_inputs_unchanged':unchanged,'cases':records,'bound':'Actual MSVC C++ test snapshots, exact root fixture membership/sizes/hashes re-enumerated before and after, and assertion count admitted from an independent byte-bound passing core receipt, real fixture removal/addition/same-size/size changes and actual Windows parent/leaf directory junction refusal; no engine, GPU, physics, input or hostile concurrent kernel race claim.'}
    (output/'report.json').write_text(json.dumps(report,indent=2)+'\n');print('Receipt: '+str(output/'report.json'),flush=True)
    return 0 if report['passed'] else 1

if __name__=='__main__':raise SystemExit(main())
