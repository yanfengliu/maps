"""Reintroduce each reviewed motion defect in ignored copies and require a red gate.

Never edits the production core. Compile controls serially, using the same actual
core fixture executable and requiring the specific assertion, not compile errors.
"""
from __future__ import annotations
import hashlib
import json
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parents[2]


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    core = ROOT / 'Source/ShibuyaRuntime/Public/CitySimulation.h'
    test = ROOT / 'tests/runtime/test_simulation.cpp'
    before = {'core': sha(core), 'test': sha(test)}
    limits=ROOT/'Source/ShibuyaRuntime/Public/RuntimeReadLimit.h'
    before['limits']=sha(limits)
    source = core.read_text(encoding='utf-8')
    limit_source=limits.read_text(encoding='utf-8')
    output = ROOT / 'Artifacts/runtime-mutations' / time.strftime('%Y%m%d-%H%M%S')
    output.mkdir(parents=True, exist_ok=False)
    cases = [
        ('R3', 'if(nextDistance<0)nextDistance+=route.length;', '', 'both directions remain in closed route domain'),
        ('R5', 'const double offset=lateral*std::min(1.0,nearest/1.5);', 'const double offset=lateral;', 'nonzero lateral right-angle trajectory is continuous'),
        ('R6', 'const Point delta=pb-pa;', 'return Distance2D(pa,pb)<4.5;\n    const Point delta=pb-pa;', 'vehicles actually pass in adjacent opposing lanes'),
        ('R14', 'if(closed && Length(points.back()-points.front())>1e-6)', 'if(closed && Length(points.back()-points.front())>0.05)', 'nonzero closed seam rejects former 0.04m gap in both directions'),
        ('BOUNDARY_ENTRY', 'if(entryOccupied)agent.speed=0;', 'if(false)agent.speed=0;', 'occupied entry keeps terminal generation at supported exit'),
        ('BOUNDARY_TRAVEL', 'agent.distance=0;agent.position=route.boundaryEntry;', 'agent.travelled+=Length(route.boundaryEntry-agent.position);agent.distance=0;agent.position=route.boundaryEntry;', 'boundary lifecycle jump contributes no travel'),
    ]
    results = []
    cases.append(('R13','size>maximum','false','bounded input size rejects oversize before allocation'))
    for name, old, new, message in cases:
        selected=limit_source if name=='R13' else source
        if selected.count(old) != 1:
            raise RuntimeError(f'Mutation {name} no longer selects exactly one reviewed mechanism; update the proof deliberately.')
        include = output / name
        include.mkdir()
        (include/'CitySimulation.h').write_text(source,encoding='utf-8')
        (include/'RuntimeReadLimit.h').write_text(limit_source,encoding='utf-8')
        header=include/('RuntimeReadLimit.h' if name=='R13' else 'CitySimulation.h')
        header.write_text(selected.replace(old,new,1),encoding='utf-8')
        command = ['pwsh', '-NoProfile', '-File', str(ROOT / 'tools/runtime/test_core.ps1'), '-HeaderDirectory', str(include)]
        process = subprocess.Popen(command, cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, creationflags=subprocess.CREATE_NO_WINDOW)
        try:
            log, _ = process.communicate(timeout=150)
        finally:
            if process.poll() is None:
                subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, creationflags=subprocess.CREATE_NO_WINDOW, check=False)
                process.wait(timeout=30)
        text = log.decode('utf-8', errors='replace')
        (include / 'gate.log').write_text(text, encoding='utf-8')
        result = {'finding': name, 'owned_pid': process.pid, 'exit_code': process.returncode, 'mutated_core_sha256': sha(header), 'specific_red_assertion': message, 'expected_red_observed': process.returncode != 0 and 'FAIL: ' + message in text}
        results.append(result)
        print(json.dumps(result), flush=True)
    after = {'core': sha(core), 'test': sha(test),'limits':sha(limits)}
    receipt = {'passed': before == after and all(result['expected_red_observed'] for result in results), 'bound': 'Compiled actual-core synthetic fixtures reject reintroduced reverse-wrap, discontinuous-offset, opposing-lane disc, noncoincident closure, entry overlap, lifecycle travel and preallocation-size defects; no native game or source-ground support claim.', 'original_source_unchanged': before == after, 'input_sha256': before, 'results': results}
    (output / 'report.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print('Receipt: ' + str(output / 'report.json'), flush=True)
    return 0 if receipt['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
