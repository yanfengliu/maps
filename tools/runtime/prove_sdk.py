"""Compile/link a bounded native header+import-library witness for the real SDK.

This does not invoke CLR, an installer, UBT or an Unreal editor. UBT discovery is
separately established by the successful Editor target under this AutoSDK root.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

ROOT = Path(__file__).resolve().parents[2]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sdk-manifest', required=True, type=Path)
    args = parser.parse_args()
    manifest_bytes = args.sdk_manifest.read_bytes()
    manifest = json.loads(manifest_bytes)
    sdk = Path(manifest['sdkDirectory'])
    header, library = sdk / 'Include/um/mscoree.h', sdk / 'Lib/um/x64/mscoree.lib'
    for path in [header, library]:
        records = [record for record in manifest['files'] if Path(record['path']) == path]
        if len(records) != 1 or path.stat().st_size != records[0]['bytes'] or hashlib.sha256(path.read_bytes()).hexdigest() != records[0]['sha256']:
            raise RuntimeError('Actual SDK header/library differs from the admitted signed-payload manifest.')
    output = ROOT / 'Artifacts/runtime-sdk-witness' / time.strftime('%Y%m%d-%H%M%S')
    output.mkdir(parents=True, exist_ok=False)
    source, exe, obj = output / 'sdk-witness.cpp', output / 'sdk-witness.exe', output / 'sdk-witness.obj'
    source.write_text('#include <windows.h>\n#include <mscoree.h>\n#include <cstdio>\nint main(){decltype(&CorBindToRuntimeEx) volatile sdkImport=&CorBindToRuntimeEx;if(sdkImport==nullptr)return1;std::puts("NETFX_SDK_LINK_READY");return0;}\n'.replace('return1', 'return 1').replace('return0', 'return 0'), encoding='ascii')
    dev = Path(r'C:\Program Files (x86)\Microsoft Visual Studio\18\BuildTools\Common7\Tools\VsDevCmd.bat')
    cl = ['cl', '/nologo', '/std:c++20', '/EHsc', '/showIncludes', '/I' + str(header.parent), '/Fe' + str(exe), '/Fo' + str(obj), str(source), '/link', '/LIBPATH:' + str(library.parent), 'mscoree.lib', '/VERBOSE:LIB']
    batch = output / 'run.cmd'
    batch.write_text('@echo off\ncall ' + subprocess.list2cmdline([str(dev), '-arch=amd64', '-host_arch=amd64']) + '\nif errorlevel 1 exit /b 1\n' + subprocess.list2cmdline(cl) + '\nif errorlevel 1 exit /b 1\n' + subprocess.list2cmdline([str(exe)]) + '\nif errorlevel 1 exit /b 1\ndumpbin /imports ' + subprocess.list2cmdline([str(exe)]) + '\nexit /b %errorlevel%\n', encoding='ascii')
    started = time.monotonic()
    process = subprocess.Popen([os.environ.get('ComSpec', 'cmd.exe'), '/d', '/c', str(batch)], cwd=output, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, creationflags=subprocess.CREATE_NO_WINDOW)
    try:
        log, _ = process.communicate(timeout=120)
    finally:
        if process.poll() is None:
            subprocess.run(['taskkill', '/PID', str(process.pid), '/T', '/F'], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, creationflags=subprocess.CREATE_NO_WINDOW, check=False)
            process.wait(timeout=30)
    text = log.decode('utf-8', errors='replace')
    (output / 'compiler-link-import.log').write_text(text, encoding='utf-8')
    passed = process.returncode == 0 and str(header).casefold() in text.casefold() and str(library).casefold() in text.casefold() and 'NETFX_SDK_LINK_READY' in text and 'CorBindToRuntimeEx' in text and 'mscoree.dll' in text.casefold()
    receipt = {'passed': passed, 'bound': 'Actual signed-payload-mapped4.6.2 mscoree.h inclusion and AMD64 mscoree.lib native import linkage; no CLR function called, no installer or Unreal launch.', 'owned_pid': process.pid, 'exit_code': process.returncode, 'duration_s': time.monotonic() - started, 'manifest_sha256': hashlib.sha256(manifest_bytes).hexdigest(), 'header': str(header), 'header_sha256': hashlib.sha256(header.read_bytes()).hexdigest(), 'import_library': str(library), 'import_library_sha256': hashlib.sha256(library.read_bytes()).hexdigest(), 'exe_sha256': hashlib.sha256(exe.read_bytes()).hexdigest() if exe.exists() else None, 'command': cl}
    (output / 'report.json').write_text(json.dumps(receipt, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(receipt, sort_keys=True), flush=True)
    print('Receipt: ' + str(output / 'report.json'), flush=True)
    if not passed:
        print(text[-12000:], flush=True)
    return 0 if passed else 1


if __name__ == '__main__':
    raise SystemExit(main())
