"""Bounded hidden native build. No engine/editor is launched by this command."""
from __future__ import annotations
import argparse
import hashlib
import json
import os
import stat
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parents[2]
ENGINE = Path(r'C:\Program Files\Epic Games\UE_5.8')


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--target', choices=['editor', 'game', 'both'], default='both')
    parser.add_argument('--timeout', type=int, default=600)
    parser.add_argument('--sdk-manifest', type=Path, help='Genuine portable NETFXSDK manifest; only its validated AutoSDK root is set in the child build environment.')
    args = parser.parse_args()
    output = ROOT / 'Artifacts' / 'runtime-build' / time.strftime('%Y%m%d-%H%M%S')
    output.mkdir(parents=True, exist_ok=False)
    results = []
    build_env = os.environ.copy()
    sdk_receipt = None
    if args.sdk_manifest:
        manifest_bytes = args.sdk_manifest.read_bytes()
        sdk = json.loads(manifest_bytes)
        sdk_root = Path(sdk['ueSdksRoot']).absolute()
        if sdk['productName'] != 'Microsoft .NET Framework 4.6.2 SDK' or len(sdk['files']) != 152:
            raise RuntimeError('Portable SDK needs the actual Microsoft4.6.2 SDK with its complete152-file signed-payload mapping.')
        for record in sdk['files']:
            path = Path(record['path']).absolute()
            path.relative_to(sdk_root)
            for component in [sdk_root, *reversed([p for p in path.parents if p != sdk_root and sdk_root in p.parents]), path]:
                info = component.lstat()
                if getattr(info, 'st_file_attributes', 0) & stat.FILE_ATTRIBUTE_REPARSE_POINT:
                    raise RuntimeError('Portable SDK file path crosses a reparse point.')
            if path.stat().st_size != record['bytes'] or digest(path) != record['sha256']:
                raise RuntimeError('Portable SDK bytes differ from the admitted source mapping: ' + str(path))
        build_env['UE_SDKS_ROOT'] = str(sdk_root)
        sdk_receipt = {'manifest_sha256': hashlib.sha256(manifest_bytes).hexdigest(), 'root': str(sdk_root), 'verified_files': len(sdk['files']), 'sdk_directory': sdk['sdkDirectory']}
    sources = [ROOT / 'ShibuyaUnreal.uproject', *sorted((ROOT / 'Source').rglob('*.h')), *sorted((ROOT / 'Source').rglob('*.cpp')), *sorted((ROOT / 'Source').rglob('*.cs'))]
    before_hashes = {source.relative_to(ROOT).as_posix(): digest(source) for source in sources}
    targets = ['ShibuyaUnrealEditor', 'ShibuyaUnreal'] if args.target == 'both' else ['ShibuyaUnrealEditor' if args.target == 'editor' else 'ShibuyaUnreal']
    try:
        for target in targets:
            log = output / (target + '.log')
            commands = [str(ENGINE / 'Engine/Build/BatchFiles/Build.bat'), target, 'Win64', 'Development', str(ROOT / 'ShibuyaUnreal.uproject'), '-WaitMutex', '-NoHotReload', '-MaxParallelActions=4', '-NoUBA', '-Log=' + str(output / (target + '-ubt.log'))]
            command = subprocess.list2cmdline(commands)
            # Batch invocation has a different quoting boundary from an exe.
            # Put the exact tool invocation in an owned script rather than
            # passing nested quoted command strings through subprocess's MSVC
            # argument quoting and cmd.exe's /s quote removal a second time.
            batch = output / (target + '.cmd')
            batch.write_text('@echo off\ncall ' + command + '\nexit /b %errorlevel%\n', encoding='ascii')
            started = time.monotonic()
            with log.open('wb') as stream:
                process = subprocess.Popen([os.environ.get('ComSpec', 'cmd.exe'), '/d', '/c', str(batch)], cwd=ROOT, env=build_env, stdout=stream, stderr=subprocess.STDOUT, creationflags=subprocess.CREATE_NO_WINDOW)
                try:
                    code = process.wait(timeout=args.timeout)
                finally:
                    if process.poll() is None:
                        subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, creationflags=subprocess.CREATE_NO_WINDOW, check=False)
                        process.wait(timeout=30)
            binary = ROOT / ('Binaries/Win64/UnrealEditor-ShibuyaRuntime.dll' if target.endswith('Editor') else 'Binaries/Win64/ShibuyaUnreal.exe')
            result = {'target': target, 'command': commands, 'owned_pid': process.pid, 'exit_code': code, 'duration_s': time.monotonic() - started, 'binary_path': binary.relative_to(ROOT).as_posix(), 'binary_sha256': digest(binary) if binary.is_file() else None, 'passed': code == 0 and binary.is_file()}
            results.append(result)
            print(json.dumps(result, sort_keys=True), flush=True)
            if not result['passed']:
                print(log.read_text(encoding='utf-8', errors='replace')[-16000:], flush=True)
                break
    finally:
        after_hashes = {source.relative_to(ROOT).as_posix(): digest(source) for source in sources}
        receipt = {'passed': len(results) == len(targets) and all(result['passed'] for result in results) and before_hashes == after_hashes, 'bound': 'Installed Unreal5.8 native Win64 Development compilation/link; no game, renderer or input exercised', 'engine_build': json.loads((ENGINE / 'Engine/Build/Build.version').read_text(encoding='utf-8')), 'source_sha256': after_hashes, 'source_unchanged_during_build': before_hashes == after_hashes, 'portable_sdk': sdk_receipt, 'results': results}
        (output / 'report.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
        print('Receipt: ' + str(output / 'report.json'), flush=True)
    return 0 if receipt['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
