"""Owned offscreen native Game verification; ordinary viewport input only.

Controls/negative arms precede a separately requested full-population benchmark.
The Windows kill-on-close job owns the engine and children; no shared processes
are killed. A unique run id and absent initial output prevent stale receipts.
"""
from __future__ import annotations
import argparse
import ctypes
from ctypes import wintypes
import hashlib
import msvcrt
import json
import os
import re
from pathlib import Path
import stat
import subprocess
import time
import uuid

ROOT = Path(__file__).resolve().parents[2]
ENGINE = Path(r'C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\Win64\UnrealEditor-Cmd.exe')
LIMIT = 32 * 1024 * 1024
INPUT_ROLE_LIMITS = {'source': LIMIT, 'support_manifest': 16 * 1024 * 1024,
                     'derived_terrain': 64 * 1024 * 1024, 'code_snapshot': 2 * 1024 * 1024,
                     'configuration_snapshot': 100_000}
ENGINE_ROOT = ENGINE.parents[2]
ASSET_LIMIT = 512 * 1024 * 1024


def safe_parts(parts: tuple[str, ...] | list[str]) -> None:
    if not parts or any(p in ('', '.', '..') or p[-1:] in (' ', '.') or re.search(r'[\x00-\x1f<>:"\\|?*]', p) or re.fullmatch(r'(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])', p.split('.')[0], re.IGNORECASE) for p in parts):
        raise ValueError('Native evidence needs a real path without traversal, drive, ADS or reserved components.')


def guard_path(path: Path, exists: bool = True) -> Path:
    """Check every existing ancestor, including ancestors above the project."""
    if not path.is_absolute():
        raise ValueError('Native paths must be absolute before admission.')
    safe_parts(list(path.parts[1:]))
    for component in [*reversed(path.parents), path]:
        try:
            info = component.lstat()
        except FileNotFoundError:
            if exists:
                raise
            continue
        if getattr(info, 'st_file_attributes', 0) & stat.FILE_ATTRIBUTE_REPARSE_POINT or stat.S_ISLNK(info.st_mode):
            raise ValueError('Native evidence path crosses a reparse point: ' + str(component))
        if component != path and not stat.S_ISDIR(info.st_mode):
            raise ValueError('Native path ancestor is not a directory: ' + str(component))
    return path


def project_root(candidate: Path) -> Path:
    absolute = candidate.absolute()
    guard_path(absolute)
    authorized = guard_path(ROOT.parents[2] / 'artifacts')
    # Resolve only after rejecting every lexical traversal and reparse ancestor.
    real = absolute.resolve(strict=True)
    if real != absolute or real == authorized or not real.is_relative_to(authorized):
        raise ValueError('Native project must be a real isolated directory under the authorized artifacts root.')
    if not real.is_dir():
        raise ValueError('Native project root is not a directory.')
    return real


def confined(root: Path, relative: str, exists: bool = True) -> Path:
    root = project_root(root)
    parts = relative.split('/')
    if not relative or len(relative) > 4096:
        raise ValueError('Native evidence relative path is empty or exceeds its finite bound.')
    safe_parts(parts)
    return guard_path(root.joinpath(*parts), exists)


def digest(path: Path, maximum: int = 128 * 1024 * 1024) -> str:
    path = guard_path(path)
    initial = path.stat()
    value = hashlib.sha256()
    with path.open('rb') as stream:
        info = os.fstat(stream.fileno()); size = info.st_size
        if not stat.S_ISREG(info.st_mode) or not 1 <= size <= maximum or (info.st_dev, info.st_ino, size) != (initial.st_dev, initial.st_ino, initial.st_size):
            raise ValueError('Hash input must be a finite stable regular file within its admitted size bound: ' + str(path))
        consumed = 0
        for chunk in iter(lambda: stream.read(min(1024 * 1024, size - consumed + 1)), b''):
            consumed += len(chunk)
            if consumed > size: raise ValueError('Hash input grew during its bounded read.')
            value.update(chunk)
        if consumed != size or os.fstat(stream.fileno()).st_size != size:
            raise ValueError('Hash input changed size during read.')
    final = guard_path(path).stat()
    if (final.st_dev, final.st_ino, final.st_size, final.st_mtime_ns) != (initial.st_dev, initial.st_ino, initial.st_size, initial.st_mtime_ns):
        raise ValueError('Hash input changed or was replaced while reading.')
    return value.hexdigest()


def read_bytes(path: Path, maximum: int = LIMIT) -> bytes:
    path = guard_path(path); initial = path.stat()
    with path.open('rb') as stream:
        info = os.fstat(stream.fileno()); size = info.st_size
        if not stat.S_ISREG(info.st_mode) or not 1 <= size <= maximum:
            raise ValueError('Native receipt must exist and stay within32 MiB before reading.')
        if (info.st_dev, info.st_ino, size) != (initial.st_dev, initial.st_ino, initial.st_size):
            raise ValueError('Native input was replaced before reading.')
        raw = stream.read(size + 1)
        if len(raw) != size or os.fstat(stream.fileno()).st_size != size:
            raise ValueError('Native receipt changed while reading.')
    final = guard_path(path).stat()
    if (final.st_dev, final.st_ino, final.st_size, final.st_mtime_ns) != (initial.st_dev, initial.st_ino, initial.st_size, initial.st_mtime_ns):
        raise ValueError('Native input changed or was replaced while reading.')
    return raw


def read_report(path: Path) -> dict:
    return json.loads(read_bytes(path))


def source_binding_metadata(state: dict) -> tuple[dict, dict, str]:
    bindings = state.get('actual_input_sha256'); roles = state.get('actual_input_roles')
    source_path = state.get('source_manifest_path')
    if not isinstance(bindings, dict) or len(bindings) < 5 or any(not isinstance(name, str) or not isinstance(value, str) or not re.fullmatch('[0-9a-f]{64}', value) for name, value in bindings.items()):
        raise ValueError('Native source binding needs the complete path/SHA-256 map.')
    if not isinstance(roles, dict) or roles.keys() != bindings.keys() or any(not isinstance(role, str) or role not in INPUT_ROLE_LIMITS for role in roles.values()):
        raise ValueError('Native source role map needs exactly the bound input keys and known fixed roles.')
    if not isinstance(source_path, str) or source_path not in bindings or roles[source_path] != 'source' or state.get('source_manifest_sha256') != bindings[source_path]:
        raise ValueError('Native source manifest path/SHA-256 must identify its ordinary admitted source input.')
    return bindings, roles, source_path


def source_digest_limits(root: Path, state: dict) -> dict:
    """Only a hash-bound Source2 pair can grant the fixed derived-terrain cap."""
    bindings, roles, source_path = source_binding_metadata(state)
    raw = read_bytes(confined(root, source_path), LIMIT)
    if hashlib.sha256(raw).hexdigest() != bindings[source_path]:
        raise ValueError('Actual source manifest differs from the native bound SHA-256: ' + source_path)
    source = json.loads(raw)
    if not isinstance(source, dict) or ('support_surface' in source) != ('derived_terrain' in source):
        raise ValueError('Source2 admission needs both support_surface and derived_terrain records.')
    derived_paths = {name for name, role in roles.items() if role == 'derived_terrain'}
    if 'support_surface' in source:
        def record(role, value):
            if not isinstance(value, dict): raise ValueError('Source2 ' + role + ' needs its published path/bytes/SHA-256 record.')
            name = value.get('path'); size = value.get('bytes'); sha = value.get('sha256')
            if not isinstance(name, str) or type(size) is not int or not 1 <= size <= INPUT_ROLE_LIMITS[role] or not isinstance(sha, str) or not re.fullmatch('[0-9a-f]{64}', sha):
                raise ValueError('Source2 ' + role + ' record exceeds or differs from its fixed role contract.')
            if roles.get(name) != role or bindings.get(name) != sha or confined(root, name).stat().st_size != size:
                raise ValueError('Source2 ' + role + ' record differs from the actual complete native binding: ' + name)
            return name
        support_path = record('support_manifest', source['support_surface'])
        support_raw = read_bytes(confined(root, support_path), INPUT_ROLE_LIMITS['support_manifest'])
        if hashlib.sha256(support_raw).hexdigest() != bindings[support_path]:
            raise ValueError('Actual Source2 support manifest SHA-256 changed: ' + support_path)
        support = json.loads(support_raw)
        if not isinstance(support, dict) or type(support.get('schema_version')) is not int or support['schema_version'] != 2 or json.dumps(support.get('derived_terrain'),sort_keys=True) != json.dumps(source['derived_terrain'],sort_keys=True):
            raise ValueError('Source2 needs schema2 and exactly the same derived terrain record in both admitted manifests.')
        if derived_paths != {record('derived_terrain', source['derived_terrain'])}:
            raise ValueError('Only the Source2 pair derived terrain may use the64 MiB role.')
    elif derived_paths:
        raise ValueError('Ordinary source inputs cannot claim the64 MiB derived-terrain role without a Source2 pair.')
    return {name: INPUT_ROLE_LIMITS[role] for name, role in roles.items()}


def verify_source_inputs(root: Path, state: dict) -> None:
    bindings, _, _ = source_binding_metadata(state)
    for name, maximum in source_digest_limits(root, state).items():
        if digest(confined(root, name), maximum) != bindings[name]:
            raise ValueError('Actual admitted source input changed; restore its bound bytes: ' + name)


def benchmark_duration(phase: str, value: int | None) -> int:
    seconds = (30 if phase == 'performance' else 10) if value is None else value
    minimum = 30 if phase == 'performance' else 10
    if not minimum <= seconds <= 120:
        raise ValueError('Dedicated performance needs at least30 seconds; functional checks need10, both bounded to120 seconds.')
    return seconds


def complete_probe(report: dict) -> dict:
    expected = ['initial', 'walk', 'look', 'flight_mode', 'flight', 'walk_refused', 'descent_ground', 'walk_recovered', 'pause_start', 'pause_end', 'resume', 'reset', 'benchmark_start', 'benchmark_end']
    snapshots = report.get('snapshots', [])
    if len(snapshots) != 14 or [s.get('stage') for s in snapshots] != expected or report.get('input_entry') != 'UGameViewportClient::InputKey/InputAxis':
        raise ValueError('Native report did not observe the complete ordinary viewport input flow.')
    for state in snapshots:
        sim = state.get('simulation', {}); geometry = state.get('native_geometry', {})
        if sim.get('ready') is not True or sim.get('error') or sim.get('pedestrian_count', 0) <= 0 or sim.get('vehicle_count', 0) <= 0 or geometry.get('actual_counts_and_transforms_valid') is not True:
            raise ValueError('Native control stage lacks a ready loaded world and actual populations.')
        if source_binding_metadata(sim) != source_binding_metadata(report.get('final_simulation', {})):
            raise ValueError('Native control stage changed its complete source digest/role/manifest binding.')
    return {s['stage']: s for s in snapshots}


def validate_arm(phase: str, code: int, report: dict | None, log: str, run_id: str, started: float, path: Path, minimum_events: int) -> None:
    if phase == 'report-write-negative':
        if code == 0 or path.exists() or 'SHIBUYA_RUNTIME_CHECK FAIL report persistence' not in log or 'SHIBUYA_RUNTIME_CHECK PASS' in log:
            raise ValueError('Report-write negative control must fail native persistence, exit nonzero and leave no accepted receipt or PASS marker.')
        return
    if report is None or report.get('run_id') != run_id or path.stat().st_mtime < started - 2:
        raise ValueError('Native result is missing, stale or from a different run id.')
    if phase in ('oversize-negative', 'suppressed-source-failure'):
        state = report.get('load_state', {})
        if code == 0 or report.get('passed') is not False or state.get('ready') is not False or 'before allocation' not in state.get('error', ''):
            raise ValueError('Oversized actual input must fail native size admission before allocation and exit nonzero.')
        if phase == 'suppressed-source-failure':
            if report.get('negative_input_control') is not True:
                raise ValueError('Suppressed-source-failure control did not actually suppress input.')
            try: validate_arm('negative-input', code, report, log, run_id, started, path, minimum_events)
            except ValueError: return
            raise ValueError('Native failed startup masqueraded as successful input-suppression evidence.')
        return
    final = report.get('final_simulation', {})
    if phase == 'inventory':
        if code != 0 or report.get('passed') is not True or report.get('inventory_only') is not True or final.get('ready') is not True or report.get('actual_native_population_verified') is not True or report.get('actual_inputs_unchanged') is not True or 'SHIBUYA_RUNTIME_INVENTORY PASS' not in log:
            raise ValueError('Inventory preparation did not observe a ready loaded native world and real populations.')
        return
    if report.get('inventory_only') is not False:
        raise ValueError('Inventory-only preparation cannot qualify as native controls or a negative-input arm.')
    states = complete_probe(report)
    if phase == 'negative-input':
        independent = ['both_populations_moved', 'native_support_verified', 'agent_separation_verified', 'actual_native_population_verified', 'actual_inputs_unchanged', 'native_pedestrian_gait_rotated', 'native_vehicle_spokes_rotated', 'benchmark_unpaused_warm_interval']
        bindings = final.get('actual_input_sha256', {})
        if code == 0 or report.get('passed') is not False or report.get('negative_input_control') is not True or any(report.get(p) is not False for p in ['walk_input_moved', 'look_input_changed', 'flight_input_moved']) or any(report.get(p) is not True for p in independent) or final.get('ready') is not True or len(bindings) < 5:
            raise ValueError('Disabled-input control needs the ready complete populated simulation with only injection disabled.')
        a = states['benchmark_start']['simulation']; b = states['benchmark_end']['simulation']
        if b['fixed_steps'] <= a['fixed_steps'] or b['simulation_time_s'] <= a['simulation_time_s']:
            raise ValueError('Disabled-input control did not run the actual simulation over time.')
        for state in states.values():
            if state['simulation'].get('paused') is not False or state['simulation'].get('actual_input_sha256') != bindings:
                raise ValueError('Disabled-input stage paused or changed actual source bindings.')
            pawn = state.get('pawn', {})
            if any(pawn.get(p) != 0 for p in ['forward_input_events', 'look_input_events', 'mode_input_events', 'pause_input_events', 'reset_input_events']):
                raise ValueError('Suppressed input reached ordinary pawn action handlers.')
        return
    flags = ['walk_input_moved', 'look_input_changed', 'flight_input_moved', 'pause_held', 'resume_advanced', 'reset_restored', 'unsupported_walk_visibly_refused', 'walking_recovered_through_input', 'both_populations_moved', 'native_support_verified', 'agent_separation_verified', 'actual_native_population_verified', 'actual_inputs_unchanged', 'native_pedestrian_gait_rotated', 'native_vehicle_spokes_rotated']
    if code != 0 or report.get('passed') is not True or report.get('negative_input_control') is not False or any(report.get(p) is not True for p in flags) or 'SHIBUYA_RUNTIME_CHECK PASS' not in log:
        raise ValueError('Actual native gameplay did not satisfy all control, support, animation and population predicates.')
    a = states['descent_ground']['pawn']['position_cm']; b = states['walk_recovered']['pawn']['position_cm']
    if (a[0] - b[0])**2 + (a[1] - b[1])**2 <= 20**2:
        raise ValueError('Recovered walking did not actually move horizontally after descent.')
    if final.get('native_boundary_event_count', 0) < minimum_events or final.get('boundary_replacements', 0) < minimum_events:
        raise ValueError('Requested boundary lifecycle was not observed in actual native transforms and source endpoint events.')
    for event in final.get('native_boundary_events', []):
        if not event.get('before_transform_read') or not event.get('after_transform_read') or event.get('actual_body_instance_count') != final['vehicle_count'] or event['after_generation'] != event['before_generation'] + 1:
            raise ValueError('Native boundary generation lacks actual transforms or a continuous full-population slot count.')
    if phase == 'performance':
        duration = states['benchmark_end']['elapsed_s'] - states['benchmark_start']['elapsed_s']
        if duration < 30 or report.get('benchmark_seconds', 0) < 30 or report.get('performance_target_passed') is not True or final.get('pedestrian_count') != 3000 or final.get('vehicle_count') != 200:
            raise ValueError('Actual dedicated benchmark needs at least30 warm unpaused seconds and the full3000/200 population.')


def asset_set(snapshot: dict) -> dict[str, Path]:
    if snapshot.get('valid') is not True or not isinstance(snapshot.get('packages'), list) or not 1 <= len(snapshot['packages']) <= 10000:
        raise ValueError('Native actual loaded package inventory is missing or invalid.')
    result = {}; names = set(); map_found = False
    for package in snapshot['packages']:
        name = package.get('package_name'); root = package.get('root'); files = package.get('files', [])
        if not isinstance(name, str) or not name.startswith('/') or len(name) > 512 or name in names or root not in ('project', 'engine') or not 1 <= len(files) <= 4:
            raise ValueError('Actual loaded package record has an invalid identity or file list.')
        safe_parts(name[1:].split('/')); names.add(name)
        for index, relative in enumerate(files):
            if not isinstance(relative, str) or not relative.startswith(('Content/', 'Plugins/')) or Path(relative).suffix not in ('.umap', '.uasset', '.uexp', '.ubulk', '.uptnl'):
                raise ValueError('Loaded asset path is not an admitted asset package or sidecar.')
            if index == 0 and Path(relative).suffix not in ('.umap', '.uasset'):
                raise ValueError('Actual loaded asset package lacks its header file.')
            safe_parts(relative.split('/'))
            key = root + ':' + relative
            if key in result: raise ValueError('Loaded package inventory repeats a physical asset file.')
            result[key] = Path(relative)
        if name == snapshot.get('map_package') and files[0].endswith('.umap') and root == 'project': map_found = True
    if not map_found: raise ValueError('Actual loaded world map is absent from the native package inventory.')
    return result


def asset_path(root: Path, key: str) -> Path:
    kind, relative = key.split(':', 1)
    safe_parts(relative.split('/'))
    if kind == 'project': return confined(root, relative)
    if kind == 'engine': return guard_path(ENGINE_ROOT.joinpath(*relative.split('/')))
    raise ValueError('Asset root is not project or installed engine.')


def hash_assets(root: Path, inventory: dict) -> dict:
    return {key: digest(asset_path(root, key), ASSET_LIMIT) for key in sorted(inventory)}


def content_assets(root: Path) -> dict:
    result = {}; pending = [confined(root, 'Content')]
    while pending:
        directory = guard_path(pending.pop())
        for path in directory.iterdir():
            info = guard_path(path).lstat()
            if stat.S_ISDIR(info.st_mode): pending.append(path)
            elif path.suffix in ('.umap', '.uasset', '.uexp', '.ubulk', '.uptnl'):
                key = 'project:' + path.relative_to(root).as_posix(); result[key] = digest(path, ASSET_LIMIT)
    return result


def validate_assets(report: dict, admitted: dict, full: bool, prepared_inventory: dict | None = None) -> dict:
    after = asset_set(report.get('actual_assets_after', {}))
    before = asset_set(report['actual_assets_before']) if 'actual_assets_before' in report else after
    actual = set(after) | set(before)
    if not actual <= set(admitted) or (full and (set(before) != set(admitted) or set(after) != set(admitted))):
        raise ValueError('Native arm loaded an unbound or changed asset package set; prepare its actual asset inventory again.')
    if prepared_inventory is not None:
        def identities(snapshot):
            return {p['package_name']:(p['root'],tuple(p['files'])) for p in snapshot['packages']}
        expected = identities(prepared_inventory)
        for snapshot in [report.get('actual_assets_before',report['actual_assets_after']), report['actual_assets_after']]:
            observed = identities(snapshot)
            if snapshot['map_package'] != prepared_inventory['map_package'] or any(expected.get(name) != files for name,files in observed.items()) or (full and observed != expected):
                raise ValueError('Actual loaded package identities or world map changed after preparation.')
    if full:
        names = {p['package_name'] for p in report['actual_assets_after']['packages']}
        for state in report.get('snapshots', []):
            for part in state.get('native_geometry', {}).get('parts', []):
                for field in ('mesh_asset', 'material_asset'):
                    if part.get(field, '').split('.')[0] not in names:
                        raise ValueError('Actual rendered agent asset is absent from loaded package binding.')
    return {key: admitted[key] for key in sorted(actual)}


def validate_prerequisite(proof: dict, phase: str, implementation: dict, assets: dict, source_inputs: dict, source_roles: dict, source_manifest_path: str) -> None:
    if proof.get('passed') is not True or proof.get('phase') != phase or proof.get('source_sha256') != implementation or proof.get('asset_sha256') != assets:
        raise ValueError('Prior native arm is missing, failed, wrong-phase or stale against current implementation: ' + phase)
    if proof.get('actual_input_sha256') != source_inputs:
        raise ValueError('Prior native arm has stale actual source inputs; rerun this arm against the current admitted dataset: ' + phase)
    if proof.get('actual_input_roles') != source_roles or proof.get('source_manifest_path') != source_manifest_path:
        raise ValueError('Prior native arm has stale actual source roles or manifest identity: ' + phase)


class OwnedJob:
    """Windows Job with kill-on-close, including descendants after root exit."""
    def __init__(self):
        class Basic(ctypes.Structure):
            _fields_ = [('PerProcessUserTimeLimit', ctypes.c_longlong), ('PerJobUserTimeLimit', ctypes.c_longlong), ('LimitFlags', wintypes.DWORD), ('MinimumWorkingSetSize', ctypes.c_size_t), ('MaximumWorkingSetSize', ctypes.c_size_t), ('ActiveProcessLimit', wintypes.DWORD), ('Affinity', ctypes.c_size_t), ('PriorityClass', wintypes.DWORD), ('SchedulingClass', wintypes.DWORD)]
        class IO(ctypes.Structure):
            _fields_ = [(p, ctypes.c_ulonglong) for p in ['ReadOperationCount', 'WriteOperationCount', 'OtherOperationCount', 'ReadTransferCount', 'WriteTransferCount', 'OtherTransferCount']]
        class Extended(ctypes.Structure):
            _fields_ = [('BasicLimitInformation', Basic), ('IoInfo', IO), ('ProcessMemoryLimit', ctypes.c_size_t), ('JobMemoryLimit', ctypes.c_size_t), ('PeakProcessMemoryUsed', ctypes.c_size_t), ('PeakJobMemoryUsed', ctypes.c_size_t)]
        self.api = ctypes.WinDLL('kernel32', use_last_error=True)
        self.api.CreateJobObjectW.argtypes = [ctypes.c_void_p, wintypes.LPCWSTR]; self.api.CreateJobObjectW.restype = wintypes.HANDLE
        self.api.SetInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD]; self.api.SetInformationJobObject.restype = wintypes.BOOL
        self.api.AssignProcessToJobObject.argtypes = [wintypes.HANDLE, wintypes.HANDLE]; self.api.AssignProcessToJobObject.restype = wintypes.BOOL
        self.api.QueryInformationJobObject.argtypes = [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD, ctypes.c_void_p]; self.api.QueryInformationJobObject.restype = wintypes.BOOL
        self.api.TerminateJobObject.argtypes = [wintypes.HANDLE, wintypes.UINT]; self.api.TerminateJobObject.restype = wintypes.BOOL
        self.api.CloseHandle.argtypes = [wintypes.HANDLE]; self.api.CloseHandle.restype = wintypes.BOOL
        self.handle = self.api.CreateJobObjectW(None, None)
        if not self.handle:
            raise ctypes.WinError(ctypes.get_last_error())
        info = Extended(); info.BasicLimitInformation.LimitFlags = 0x2000  # KILL_ON_JOB_CLOSE
        if not self.api.SetInformationJobObject(self.handle, 9, ctypes.byref(info), ctypes.sizeof(info)):
            self.api.CloseHandle(self.handle)
            raise ctypes.WinError(ctypes.get_last_error())

    def assign(self, process: subprocess.Popen) -> None:
        if not self.api.AssignProcessToJobObject(self.handle, wintypes.HANDLE(int(process._handle))):
            raise ctypes.WinError(ctypes.get_last_error())

    def active(self) -> list[int]:
        class Pids(ctypes.Structure):
            _fields_ = [('assigned', wintypes.DWORD), ('listed', wintypes.DWORD), ('pids', ctypes.c_size_t * 2048)]
        result = Pids()
        if not self.api.QueryInformationJobObject(self.handle, 3, ctypes.byref(result), ctypes.sizeof(result), None):
            raise ctypes.WinError(ctypes.get_last_error())
        return list(result.pids[:result.listed])

    def close(self) -> list[int]:
        try:
            pids = self.active()
            if pids:
                if not self.api.TerminateJobObject(self.handle, 1):
                    raise ctypes.WinError(ctypes.get_last_error())
                deadline = time.monotonic() + 15
                while self.active() and time.monotonic() < deadline:
                    time.sleep(0.05)
            if self.active():
                raise RuntimeError('Owned native job children survived bounded cleanup.')
            return pids
        finally:
            self.api.CloseHandle(self.handle)


class SuspendedProcess:
    """CreateProcessW primary thread stays suspended until the Job owns it."""
    def __init__(self, command: list[str], cwd: Path, stdout):
        class Startup(ctypes.Structure):
            _fields_ = [('cb', wintypes.DWORD), ('lpReserved', wintypes.LPWSTR), ('lpDesktop', wintypes.LPWSTR), ('lpTitle', wintypes.LPWSTR), ('dwX', wintypes.DWORD), ('dwY', wintypes.DWORD), ('dwXSize', wintypes.DWORD), ('dwYSize', wintypes.DWORD), ('dwXCountChars', wintypes.DWORD), ('dwYCountChars', wintypes.DWORD), ('dwFillAttribute', wintypes.DWORD), ('dwFlags', wintypes.DWORD), ('wShowWindow', wintypes.WORD), ('cbReserved2', wintypes.WORD), ('lpReserved2', ctypes.c_void_p), ('hStdInput', wintypes.HANDLE), ('hStdOutput', wintypes.HANDLE), ('hStdError', wintypes.HANDLE)]
        class StartupEx(ctypes.Structure):
            _fields_ = [('StartupInfo', Startup), ('lpAttributeList', ctypes.c_void_p)]
        class Information(ctypes.Structure):
            _fields_ = [('hProcess', wintypes.HANDLE), ('hThread', wintypes.HANDLE), ('dwProcessId', wintypes.DWORD), ('dwThreadId', wintypes.DWORD)]
        self.api = ctypes.WinDLL('kernel32', use_last_error=True)
        self.api.GetCurrentProcess.restype = wintypes.HANDLE
        self.api.DuplicateHandle.argtypes = [wintypes.HANDLE, wintypes.HANDLE, wintypes.HANDLE, ctypes.POINTER(wintypes.HANDLE), wintypes.DWORD, wintypes.BOOL, wintypes.DWORD]; self.api.DuplicateHandle.restype = wintypes.BOOL
        self.api.InitializeProcThreadAttributeList.argtypes = [ctypes.c_void_p, wintypes.DWORD, wintypes.DWORD, ctypes.POINTER(ctypes.c_size_t)]; self.api.InitializeProcThreadAttributeList.restype = wintypes.BOOL
        self.api.UpdateProcThreadAttribute.argtypes = [ctypes.c_void_p, wintypes.DWORD, ctypes.c_size_t, ctypes.c_void_p, ctypes.c_size_t, ctypes.c_void_p, ctypes.c_void_p]; self.api.UpdateProcThreadAttribute.restype = wintypes.BOOL
        self.api.DeleteProcThreadAttributeList.argtypes = [ctypes.c_void_p]
        self.api.CreateProcessW.argtypes = [wintypes.LPCWSTR, wintypes.LPWSTR, ctypes.c_void_p, ctypes.c_void_p, wintypes.BOOL, wintypes.DWORD, ctypes.c_void_p, wintypes.LPCWSTR, ctypes.c_void_p, ctypes.POINTER(Information)]; self.api.CreateProcessW.restype = wintypes.BOOL
        self.api.ResumeThread.argtypes = [wintypes.HANDLE]; self.api.ResumeThread.restype = wintypes.DWORD
        self.api.WaitForSingleObject.argtypes = [wintypes.HANDLE, wintypes.DWORD]; self.api.WaitForSingleObject.restype = wintypes.DWORD
        self.api.GetExitCodeProcess.argtypes = [wintypes.HANDLE, ctypes.POINTER(wintypes.DWORD)]; self.api.GetExitCodeProcess.restype = wintypes.BOOL
        self.api.TerminateProcess.argtypes = [wintypes.HANDLE, wintypes.UINT]; self.api.TerminateProcess.restype = wintypes.BOOL
        self.api.CloseHandle.argtypes = [wintypes.HANDLE]; self.api.CloseHandle.restype = wintypes.BOOL
        self.command = command; self.resumed = False; self._handle = None; self.thread = None
        inherited = []; attributes = None; initialized = False
        try:
            with open(os.devnull, 'rb') as null:
                current = self.api.GetCurrentProcess()
                for file in (null, stdout):
                    duplicate = wintypes.HANDLE()
                    if not self.api.DuplicateHandle(current, wintypes.HANDLE(msvcrt.get_osfhandle(file.fileno())), current, ctypes.byref(duplicate), 0, True, 2):
                        raise ctypes.WinError(ctypes.get_last_error())
                    inherited.append(duplicate)
                size = ctypes.c_size_t()
                self.api.InitializeProcThreadAttributeList(None, 1, 0, ctypes.byref(size))
                attributes = ctypes.create_string_buffer(size.value)
                if not self.api.InitializeProcThreadAttributeList(attributes, 1, 0, ctypes.byref(size)):
                    raise ctypes.WinError(ctypes.get_last_error())
                initialized = True
                handles = (wintypes.HANDLE * 2)(*inherited)
                if not self.api.UpdateProcThreadAttribute(attributes, 0, 0x00020002, handles, ctypes.sizeof(handles), None, None):
                    raise ctypes.WinError(ctypes.get_last_error())
                startup = StartupEx(); startup.StartupInfo.cb = ctypes.sizeof(startup)
                startup.StartupInfo.dwFlags = 0x100; startup.StartupInfo.hStdInput = inherited[0]
                startup.StartupInfo.hStdOutput = inherited[1]; startup.StartupInfo.hStdError = inherited[1]
                startup.lpAttributeList = ctypes.cast(attributes, ctypes.c_void_p)
                info = Information(); command_line = ctypes.create_unicode_buffer(subprocess.list2cmdline(command))
                if not self.api.CreateProcessW(command[0], command_line, None, None, True, 0x08000000 | 0x00000004 | 0x00080000, None, str(cwd), ctypes.byref(startup), ctypes.byref(info)):
                    raise ctypes.WinError(ctypes.get_last_error())
                self._handle = info.hProcess; self.thread = info.hThread; self.pid = info.dwProcessId
        finally:
            if initialized: self.api.DeleteProcThreadAttributeList(attributes)
            for handle in inherited: self.api.CloseHandle(handle)

    def resume(self) -> None:
        if self.resumed or self.api.ResumeThread(self.thread) != 1:
            raise RuntimeError('Native primary thread was not born suspended or could not be resumed exactly once.')
        self.resumed = True; self.api.CloseHandle(self.thread); self.thread = None

    def wait(self, timeout: float) -> int:
        result = self.api.WaitForSingleObject(self._handle, int(max(0, timeout) * 1000))
        if result == 0x102: raise subprocess.TimeoutExpired(self.command, timeout)
        if result != 0: raise ctypes.WinError(ctypes.get_last_error())
        code = wintypes.DWORD()
        if not self.api.GetExitCodeProcess(self._handle, ctypes.byref(code)): raise ctypes.WinError(ctypes.get_last_error())
        return code.value

    def terminate_suspended(self) -> None:
        # Assignment failure happens before any engine code can spawn a child.
        if self.resumed: raise RuntimeError('Assignment-failure cleanup needs an unresumed process.')
        if not self.api.TerminateProcess(self._handle, 1): raise ctypes.WinError(ctypes.get_last_error())
        self.wait(5)

    def close(self) -> None:
        if self.thread: self.api.CloseHandle(self.thread); self.thread = None
        if self._handle: self.api.CloseHandle(self._handle); self._handle = None


def launch_owned(command: list[str], cwd: Path, stdout, job: OwnedJob) -> SuspendedProcess:
    process = SuspendedProcess(command, cwd, stdout)
    try:
        job.assign(process)
        if process.pid not in job.active(): raise RuntimeError('Suspended native process was not observed in its ownership Job.')
        process.resume()
        return process
    except BaseException:
        try: process.terminate_suspended()
        finally: process.close()
        raise


def main() -> int:
    whole_started = time.perf_counter()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project-root', type=Path, default=ROOT)
    parser.add_argument('--phase', choices=['inventory', 'controls', 'negative-input', 'report-write-negative', 'oversize-negative', 'suppressed-source-failure', 'performance'], default='controls')
    parser.add_argument('--timeout', type=int, default=300)
    parser.add_argument('--pedestrians', type=int, default=60)
    parser.add_argument('--vehicles', type=int, default=12)
    parser.add_argument('--benchmark-seconds', type=int)
    parser.add_argument('--minimum-boundary-events', type=int, default=0)
    parser.add_argument('--asset-receipt', type=Path)
    parser.add_argument('--source-failure-receipt', type=Path)
    parser.add_argument('--controls-receipt', type=Path)
    parser.add_argument('--negative-input-receipt', type=Path)
    parser.add_argument('--report-failure-receipt', type=Path)
    parser.add_argument('--oversize-receipt', type=Path)
    args = parser.parse_args()
    if args.phase != 'inventory' and args.asset_receipt is None:
        raise ValueError('Native arms first need the completed actual-loaded inventory preparation receipt.')
    if args.phase == 'performance':
        prerequisites = [args.controls_receipt, args.negative_input_receipt, args.report_failure_receipt, args.oversize_receipt, args.source_failure_receipt]
        if any(prior is None for prior in prerequisites):
            raise ValueError('Full population benchmark first needs all five completed native functional/negative arms on the same exact project.')
    root = project_root(args.project_root)
    args.benchmark_seconds = benchmark_duration(args.phase, args.benchmark_seconds)
    if not 30 <= args.timeout <= 600 or not 1 <= args.pedestrians <= 10000 or not 1 <= args.vehicles <= 1000 or args.minimum_boundary_events < 0:
        raise ValueError('Native run needs the authorized isolated artifacts project and finite time/population bounds.')
    confined(root, 'ShibuyaUnreal.uproject')
    run_id = uuid.uuid4().hex
    relative = 'Artifacts/runtime-game/' + run_id
    sources = [root/'ShibuyaUnreal.uproject', *sorted((root/'Config').glob('*.ini')), *sorted((root/'Source').rglob('*.h')), *sorted((root/'Source').rglob('*.cpp')), *sorted((root/'Source').rglob('*.cs')), root/'Binaries/Win64/UnrealEditor-ShibuyaRuntime.dll']
    before = {p.relative_to(root).as_posix(): digest(confined(root, p.relative_to(root).as_posix())) for p in sources}
    before['@native_runner']=digest(Path(__file__))
    asset_before = {}; asset_preparation = None; prepared_inventory = None; source_inputs = {}; source_roles = {}; source_manifest_path = ''
    if args.phase != 'inventory':
        if args.asset_receipt is None: raise ValueError('Native arms first need the completed actual-loaded inventory preparation receipt.')
        prepared_path = confined(root, guard_path(args.asset_receipt.absolute()).relative_to(root).as_posix()); prepared = read_report(prepared_path)
        if prepared.get('passed') is not True or prepared.get('phase') != 'inventory' or prepared.get('source_sha256') != before:
            raise ValueError('Actual asset preparation is missing, failed or stale against this implementation.')
        preparation_native = confined(root,(prepared_path.parent/'native.json').relative_to(root).as_posix())
        if digest(preparation_native) != prepared.get('native_report_sha256'): raise ValueError('Native inventory preparation receipt bytes changed.')
        native_preparation = read_report(preparation_native)
        prepared_inventory = native_preparation['actual_assets_after']
        if set(asset_set(prepared_inventory)) != set(prepared['asset_sha256']): raise ValueError('Preparation asset binding does not match actual loaded native packages.')
        source_inputs, source_roles, source_manifest_path = source_binding_metadata(native_preparation['final_simulation'])
        if prepared.get('actual_input_sha256') != source_inputs or prepared.get('actual_input_roles') != source_roles or prepared.get('source_manifest_path') != source_manifest_path:
            raise ValueError('Inventory receipt differs from its complete native source binding.')
        verify_source_inputs(root, native_preparation['final_simulation'])
        asset_before = hash_assets(root, prepared['asset_sha256'])
        if asset_before != prepared['asset_sha256']: raise ValueError('Actual asset bytes changed after native preparation.')
        asset_preparation = {'path':str(prepared_path), 'sha256':digest(prepared_path)}
    if args.phase=='performance':
        for expected,prior in [('controls',args.controls_receipt),('negative-input',args.negative_input_receipt),('report-write-negative',args.report_failure_receipt),('oversize-negative',args.oversize_receipt),('suppressed-source-failure',args.source_failure_receipt)]:
            if prior is None:raise ValueError('Full population benchmark first needs all five completed native functional/negative arms on the same exact project.')
            previous=confined(root,guard_path(prior.absolute()).relative_to(root).as_posix());proof=read_report(previous)
            validate_prerequisite(proof,expected,before,asset_before,source_inputs,source_roles,source_manifest_path)
            if expected=='controls':
                native=confined(root,(previous.parent/'native.json').relative_to(root).as_posix())
                if digest(native)!=proof.get('native_report_sha256'):raise ValueError('Prior native control result bytes changed.')
                control_state = read_report(native)['final_simulation']
                if control_state.get('actual_input_sha256') != source_inputs or control_state.get('actual_input_roles') != source_roles or control_state.get('source_manifest_path') != source_manifest_path:
                    raise ValueError('Prior native control source map differs from the complete current admitted source input map.')
                source_binding_metadata(control_state)
    content_before = content_assets(root)
    output = confined(root,relative,False); output.mkdir(parents=True,exist_ok=False); output = confined(root,relative)
    native_path = confined(root,relative+'/native.json',False)
    guard_path(ENGINE)
    people, cars = (3000, 200) if args.phase == 'performance' else (args.pedestrians, args.vehicles)
    command = [str(ENGINE), str(root/'ShibuyaUnreal.uproject'), '-game', '-RenderOffscreen', '-Unattended', '-NoSound', '-NoSplash', '-NoP4', '-windowed', '-ForceRes', '-ResX=1920', '-ResY=1080', '-stdout', '-FullStdOutLogOutput', '-DDC=Shibuya', '-ShaderWorkingDir='+str(confined(root,'Intermediate/Shaders',False)), '-ShibuyaRuntimeCheck='+relative+'/native.json', '-ShibuyaRunId='+run_id, '-ShibuyaBenchmarkSeconds='+str(args.benchmark_seconds), '-ShibuyaPedestrians='+str(people), '-ShibuyaVehicles='+str(cars), '-log='+str(output/'engine.log')]
    if args.phase == 'inventory': command.append('-ShibuyaAssetInventoryOnly')
    if args.phase in ('controls','performance'): command.append('-ShibuyaRuntimeCapture='+relative+'/runtime.png')
    if args.phase in ('negative-input','suppressed-source-failure'): command.append('-ShibuyaDisableProbeInput')
    if args.phase == 'report-write-negative': command.append('-ShibuyaFailReportWrite')
    oversized = None
    if args.phase in ('oversize-negative','suppressed-source-failure'):
        rel = 'data/runtime-probes/'+run_id+'/oversized-network.json'
        oversized = confined(root, rel, False); oversized.parent.mkdir(parents=True, exist_ok=False)
        with oversized.open('wb') as stream: stream.truncate(LIMIT+1)
        command.append('-ShibuyaNetwork='+rel)
    process = None; job = None; started = time.time(); error = None; code = None; cleaned = [];cleanup_complete=False
    engine_started = time.perf_counter()
    try:
        job=OwnedJob()
        with confined(root,relative+'/stdout.log',False).open('wb') as log:
            process = launch_owned(command, root, log, job)
            print(json.dumps({'owned_pid':process.pid, 'run_id':run_id, 'output':str(output)}), flush=True)
            code = process.wait(timeout=args.timeout)
    except BaseException as failure:
        error = str(failure)
    finally:
        try:
            if job is not None:cleaned = job.close();cleanup_complete=True
        except BaseException as failure:
            error = (error or '') + ' Cleanup: ' + str(failure)
        finally:
            if process is not None:
                try:
                    process.wait(timeout=30)
                except BaseException as failure:
                    error = (error or '') + ' Process wait cleanup: ' + str(failure)
                finally:
                    try: process.close()
                    except BaseException as failure:
                        error = (error or '') + ' Process handle cleanup: ' + str(failure)
        if oversized is not None:
            try:
                confined(root,oversized.relative_to(root).as_posix()).unlink(); confined(root,oversized.parent.relative_to(root).as_posix()).rmdir()
            except BaseException as failure: error = (error or '') + ' Guarded temporary cleanup: ' + str(failure)
    engine_and_cleanup_seconds = time.perf_counter() - engine_started
    verdict_started = time.perf_counter()
    report = None
    try:
        if native_path.exists(): report = read_report(confined(root, relative+'/native.json'))
        text = read_bytes(confined(root,relative+'/stdout.log'),64*1024*1024).decode('utf-8', errors='replace')
        validate_arm(args.phase, code, report, text, run_id, started, native_path, args.minimum_boundary_events)
        after = {p.relative_to(root).as_posix():digest(confined(root,p.relative_to(root).as_posix())) for p in sources};after['@native_runner']=digest(Path(__file__))
        if before != after: raise ValueError('Native project implementation or compiled module changed during the gate.')
        if args.phase in ['inventory', 'controls', 'negative-input', 'performance']:
            bindings, roles, manifest_path = source_binding_metadata(report['final_simulation'])
            if source_inputs and (bindings != source_inputs or roles != source_roles or manifest_path != source_manifest_path): raise ValueError('Actual loaded source input bindings changed after native preparation.')
            source_inputs, source_roles, source_manifest_path = bindings, roles, manifest_path
        content_after = content_assets(root)
        if content_before != content_after: raise ValueError('Project Content asset package bytes changed during the native arm.')
        if args.phase == 'inventory':
            inventory = asset_set(report.get('actual_assets_after', {}))
            initial_inventory = asset_set(report.get('actual_assets_before', {}))
            if set(inventory) != set(initial_inventory): raise ValueError('Loaded package set changed during preparation warmup; prepare the stable variant again.')
            asset_before = hash_assets(root, inventory)
            validate_assets(report,asset_before,True,report['actual_assets_after'])
            for key, value in asset_before.items():
                if key.startswith('project:') and content_before.get(key) != value:
                    raise ValueError('Actual project-loaded asset was not bound before inventory preparation.')
        elif args.phase != 'report-write-negative':
            validate_assets(report, asset_before, args.phase in ('controls','negative-input','performance'),prepared_inventory)
        verify_source_inputs(root, {'actual_input_sha256':source_inputs, 'actual_input_roles':source_roles,
                                    'source_manifest_path':source_manifest_path, 'source_manifest_sha256':source_inputs.get(source_manifest_path)})
        if hash_assets(root, asset_before) != asset_before: raise ValueError('Admitted actual asset bytes changed during the native arm.')
    except BaseException as failure:
        error = (error or '')+' Verdict: '+str(failure)
    receipt = {'passed':error is None, 'phase':args.phase, 'run_id':run_id, 'owned_pid':process.pid if process else None, 'exit_code':code, 'duration_s':time.time()-started, 'error':error, 'command':command, 'source_sha256':before, 'asset_sha256':asset_before, 'project_content_sha256':content_before, 'asset_preparation':asset_preparation, 'actual_input_sha256':source_inputs, 'actual_input_roles':source_roles, 'source_manifest_path':source_manifest_path, 'actual_loaded_assets':report.get('actual_assets_after') if report else None, 'native_report_sha256':digest(native_path) if native_path.exists() else None, 'timing':{'preflight_s':engine_started-whole_started, 'engine_and_cleanup_s':engine_and_cleanup_seconds, 'verdict_s':time.perf_counter()-verdict_started, 'total_through_verdict_s':time.perf_counter()-whole_started, 'bound':'main entry through native report digest; excludes receipt publication, interpreter startup and outer orchestration'}, 'cleanup':{'assigned_before_resume':process is not None and process.resumed,'kill_on_close_job':job is not None,'job_empty_verified':cleanup_complete,'terminated_owned_remaining_pids':cleaned}, 'bound':'Actual offscreen native Game through ordinary viewport keyboard/mouse events; arm-specific fresh run-id receipt and exit validation. Performance is accepted only in separately requested full-population phase.'}
    confined(root,relative+'/report.json',False).write_text(json.dumps(receipt,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'passed':receipt['passed'],'receipt':str(output/'report.json'),'error':error,'total_main_s':time.perf_counter()-whole_started}),flush=True)
    return 0 if receipt['passed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
