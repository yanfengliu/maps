"""Observed Windows path, process and receipt mutation controls; no Unreal launch."""
from pathlib import Path
import hashlib
import json
import os
import subprocess
import sys
import time

ROOT=Path(__file__).resolve().parents[2]

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    runner=ROOT/'tools/runtime/run_native.py';test=ROOT/'tests/runtime/test_runner.py'
    before={'runner':sha(runner),'test':sha(test)};source=runner.read_text()
    output=ROOT/'Artifacts/runtime-runner-mutations'/time.strftime('%Y%m%d-%H%M%S');output.mkdir(parents=True,exist_ok=False)
    cases=[
        ('R15_ANCESTORS', [('for component in [*reversed(path.parents), path]:','for component in [path]:')], 'test_actual_parent_junction_rejected_for_root_hash_and_cleanup'),
        ('R16_DURATION', [("minimum = 30 if phase == 'performance' else 10",'minimum = 10')], 'test_dedicated_performance_requires_thirty_seconds'),
        ('R17_BYTES', [('return {key: digest(asset_path(root, key), ASSET_LIMIT) for key in sorted(inventory)}',"return {key: 'unread' for key in sorted(inventory)}")], 'test_actual_loaded_map_and_asset_bytes_bound'),
        ('R17_PACKAGE_SET', [("    after = asset_set(report.get('actual_assets_after', {}))", "    return admitted\n    after = asset_set(report.get('actual_assets_after', {}))")], 'test_actual_loaded_map_and_asset_bytes_bound'),
        ('R18_EARLY_EXECUTION', [('0x08000000 | 0x00000004 | 0x00080000','0x08000000 | 0x00080000')], 'test_native_process_suspended_before_job_and_early_child_owned_after_root_exit'),
        ('R19_DID_NOT_RUN', [("    if report.get('inventory_only') is not False:","    if phase == 'negative-input': return\n    if report.get('inventory_only') is not False:")], 'test_negative_input_requires_full_independent_simulation'),
        ('R23_DATASET', [("if proof.get('actual_input_sha256') != source_inputs:", 'if False:')], 'test_every_performance_prerequisite_binds_actual_dataset'),
    ]
    results=[]
    for name,changes,predicate in [('BASELINE',[],'')]+cases:
        case=output/name;case.mkdir();modified=source
        for old,new in changes:
            if modified.count(old)!=1:raise RuntimeError('Mutation no longer selects exactly one mechanism: '+name)
            modified=modified.replace(old,new,1)
        # The copied module is a fixture; retain the production authorized root.
        modified=modified.replace('ROOT = Path(__file__).resolve().parents[2]','ROOT = Path('+repr(str(ROOT))+')',1)
        selected=case/'run_native.py';selected.write_text(modified)
        env=os.environ.copy();env['SHIBUYA_RUNNER_UNDER_TEST']=str(selected)
        command=[sys.executable,'-m','unittest','discover','-s','tests/runtime','-p','test_runner.py','-v']
        process=subprocess.Popen(command,cwd=ROOT,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,creationflags=subprocess.CREATE_NO_WINDOW)
        try:log,_=process.communicate(timeout=45)
        finally:
            if process.poll() is None:
                subprocess.run(['taskkill','/PID',str(process.pid),'/T','/F'],creationflags=subprocess.CREATE_NO_WINDOW,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,check=False,timeout=10);process.wait(timeout=10)
        text=log.decode('utf-8',errors='replace');(case/'gate.log').write_text(text)
        passed=process.returncode==0 if name=='BASELINE' else process.returncode!=0 and 'FAIL: '+predicate in text
        if name=='R18_EARLY_EXECUTION':passed=passed and 'ERROR:' not in text and '"stopped": true' in text
        result={'case':name,'owned_pid':process.pid,'exit_code':process.returncode,'expected_result_observed':passed,'specific_test':predicate,'fixture_sha256':sha(selected),'log_sha256':sha(case/'gate.log')};results.append(result);print(json.dumps(result),flush=True)
    after={'runner':sha(runner),'test':sha(test)}
    receipt={'passed':before==after and all(r['expected_result_observed'] for r in results),'bound':'Actual local Windows junction and suspended Python process/early-child cleanup controls plus duration, loaded-asset-byte/set and suppressed-source-failure/prerequisite-dataset receipt regressions. No Unreal Game or native C++ asset/collision observation.','original_source_unchanged':before==after,'input_sha256':before,'results':results}
    path=output/'report.json';path.write_text(json.dumps(receipt,indent=2)+'\n');print('Receipt: '+str(path),flush=True)
    return 0 if receipt['passed'] else 1

if __name__=='__main__':raise SystemExit(main())
