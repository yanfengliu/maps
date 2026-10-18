"""Replay an immutable schema2 body sidecar through production portable C++.

This translator performs no fit, pose, hit or coverage calculation. The supplied
executable owns those decisions. The result is local diagnostic evidence, never
ordinary Source/Game admission or a claim about an unsampled continuum.
"""
import argparse
import hashlib
import io
import json
import math
import os
from pathlib import Path
import stat
import struct
import subprocess
import sys
import time

FRAME = {'schema_version':1, 'id':'native-centimetres-Xeast-Ysouth-Zup-v2',
         'definition_sha256':'2099342528416aa9dcdceea63e6d2604974341d8248f3b1c7ccf287008759170'}
MODEL = 'binary64-cm-query-on-float32-esu-cm-vertices-v2'
MAXIMUM_WINDOW_CANDIDATES = 1024
PHYSICAL = {'schema_version':1, 'id':'ue5.8.3-cl58210709-chaos-cook-float32-cm-v1',
            'definition_sha256':'e5ba1adad4fcab4e05d61d899babf8f6c789655cfe4637c393d7002f4f742428'}
BOUND = 'Local supplied schema2 physical windows through production C++ body/pose and fixed-step Route::At/heading calls; no Source admission, unsampled continuum, Game/native collision or population credit.'


def guard(path):
    path = Path(path).absolute()
    for item in (*reversed(path.parents), path):
        try:
            info = item.lstat()
        except FileNotFoundError:
            continue
        if stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & 0x400:
            raise ValueError(f'Body replay refuses reparse path {item}; use a real owned file.')
    return path


def acquire(path, maximum=32*1024*1024):
    path = guard(path)
    with path.open('rb') as handle:
        before = os.fstat(handle.fileno())
        if not 0 < before.st_size <= maximum:
            raise ValueError(f'Body replay input {path} must contain1..{maximum} bytes.')
        data = handle.read(maximum+1)
        after = os.fstat(handle.fileno())
    if ((before.st_size,before.st_mtime_ns,before.st_ctime_ns) !=
            (after.st_size,after.st_mtime_ns,after.st_ctime_ns) or len(data) != before.st_size):
        raise ValueError(f'Body replay input changed during acquisition: {path}.')
    return data, {'path':str(path), 'bytes':len(data), 'sha256':hashlib.sha256(data).hexdigest()}


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ValueError(f'Body replay JSON repeats field {key}.')
        result[key] = value
    return result


def decode(data):
    return json.loads(data, object_pairs_hook=unique_object,
                      parse_constant=lambda value: (_ for _ in ()).throw(ValueError(f'Nonfinite JSON {value}')))


def number(value):
    if type(value) not in (int,float) or not math.isfinite(value):
        raise ValueError('Body replay numeric data must be finite JSON numbers.')
    return value


def boolean(value):
    if type(value) is not bool:
        raise ValueError('Body replay support eligibility and flags must be literal JSON Booleans.')
    return value


def text(value):
    if type(value) is not str or len(value.encode('utf-8')) > 4096 or any(ord(c)<32 for c in value):
        raise ValueError('Body replay text must be bounded literal text without control characters.')
    return value


def known_frame(packet):
    frame = packet.get('native_frame')
    if (type(frame) is not dict or type(frame.get('schema_version')) not in (int,float) or
            frame != FRAME or type(frame['schema_version']) is bool):
        raise ValueError('Body replay requires the complete sealed current ESU frame on every supplied packet.')


def record_matches(record, pin, root):
    if type(record) is not dict or set(record) != {'path','bytes','sha256'}:
        raise ValueError('Body replay needs exact path/bytes/sha256 input records.')
    path = guard(root / text(record['path']))
    if not path.is_relative_to(root) or path != Path(pin['path']) or type(record['bytes']) is not int or record['bytes'] != pin['bytes'] or record['sha256'] != pin['sha256']:
        raise ValueError(f'Body replay binding differs from the actual supplied input {pin["path"]}.')


def eligibility(face):
    ref = face['layer_ref']
    kind = text(face['layer_kind'])
    if type(ref) is not dict or ref.get('kind') != kind:
        raise ValueError('Body replay face kind differs from source lineage.')
    eligible = boolean(ref.get('support_eligible'))
    role = ref.get('reconstruction_role', '')
    if 'reconstruction_role' in ref:
        text(role)
        if kind != 'inferred' or role not in ('support-top','physical-transition','physical-sidewall'):
            raise ValueError('Body replay reconstruction role must be closed known text on kind=inferred.')
    if eligible != (role in ('','support-top')):
        raise ValueError('Body replay role and literal eligibility Boolean disagree.')
    if kind not in ('road','derived-road','terrain','terrain-fragment','inferred'):
        raise ValueError('Body replay layer kind is unknown; roles cannot alias physical kinds.')
    road, interval = boolean(face['road']), boolean(face['requires_interval'])
    valid = ((road and kind == 'road' and not interval) or
             (road and kind == 'derived-road' and interval) or
             (kind == 'inferred' and interval) or
             (not road and kind in ('terrain','terrain-fragment') and interval))
    if not valid:
        raise ValueError('Body replay face road/layer/interval policy is invalid.')
    return eligible, role


class Wire:
    def __init__(self):
        self.stream = io.BytesIO(b'SBODY002')
        self.stream.seek(8)

    def integer(self, value, maximum, minimum=0):
        if type(value) is not int or not minimum <= value <= maximum:
            raise ValueError(f'Body replay integer must be within{minimum}..{maximum}.')
        self.stream.write(struct.pack('<I', value))

    def number(self, value):
        self.stream.write(struct.pack('<d', number(value)))

    def boolean(self, value):
        self.stream.write(struct.pack('<B', boolean(value)))

    def text(self, value):
        data = text(value).encode('utf-8')
        self.integer(len(data),4096)
        self.stream.write(data)

    def tuple(self, value, count):
        if type(value) is not list or len(value) != count:
            raise ValueError(f'Body replay numeric tuple needs exactly{count} members.')
        for item in value:
            self.number(item)


def prepare(packet, network, source, pins, root, contract):
    known_frame(packet)
    known_frame(network)
    known_frame(source)
    if number(packet.get('schema_version')) != 2 or packet.get('frame') != FRAME['id'] or packet.get('coordinate_model') != MODEL or packet.get('physical_model') != PHYSICAL:
        raise ValueError('Body replay requires schema2, current coordinate model and unchanged sealed cook model.')
    binding = packet['bindings']
    for name in ('network','source_manifest'):
        record_matches(binding[name], pins[name], root)
    for name in ('support_surface','derived_terrain','roads','dem'):
        if binding[name] != source[name]:
            raise ValueError(f'Body replay {name} closure differs from actual source manifest.')
    # This local diagnostic deliberately does not call any alias-writing producer.
    vehicles = [route for route in network['routes'] if route.get('kind') == 'vehicle']
    if len(vehicles) != 1 or len(network['routes']) != 1 or len(packet['routes']) != 1:
        raise ValueError('Body replay requires exactly the one retained local three-interval vehicle route.')
    route, route_packet = vehicles[0], packet['routes'][0]
    expected = contract['route']
    if route['id'] != route_packet['route_id'] or route.get('closed') is not False or route['width_m'] != expected['width_m']:
        raise ValueError('Body replay route identity, open status or original width differs.')
    lanes = route['source_lane_segments']
    actual = [{name:lane[name] for name in ('way_id','from_osm_node','to_osm_node')} for lane in lanes]
    if actual != expected['source_lane_segments'] or len(actual) != 3:
        raise ValueError('Body replay requires all three original directed mapped intervals in original order.')
    # Adjacent joins retain their exact source lane endpoints and directed IDs.
    def edge(lane):
        return [lane[name] for name in ('way_id','from_osm_node','to_osm_node')]
    allowed = [(lane['lane_points'][0],lane['lane_points'][1],[edge(lane)]) for lane in lanes]
    allowed += [(a['lane_points'][1],b['lane_points'][0],[edge(a),edge(b)]) for a,b in zip(lanes,lanes[1:])]
    wire = Wire()
    wire.number(packet['schema_version'])
    for model in (FRAME,):
        wire.number(model['schema_version']);wire.text(model['id']);wire.text(model['definition_sha256'])
    wire.text(packet['coordinate_model'])
    wire.number(PHYSICAL['schema_version']);wire.text(PHYSICAL['id']);wire.text(PHYSICAL['definition_sha256'])
    faces = packet['faces']
    wire.integer(len(faces),150000,1)
    for face in faces:
        if type(face['native_cm']) is not list or len(face['native_cm']) != 3 or number(face['cook_state']) != 1:
            raise ValueError('Body replay requires complete three-vertex physical survivor faces.')
        eligible, role = eligibility(face)
        for point in face['native_cm']:
            wire.tuple(point,3)
        wire.boolean(face['road']);wire.boolean(face['requires_interval']);wire.boolean(eligible)
        for value in (face['layer_kind'],role,face['source']['path'],face['mesh_path']):
            wire.text(value)
        wire.integer(face['triangle'],2000000)
        wire.number(face['normal_z'])
    wire.integer(1,1,1)
    wire.text(route['id']);wire.number(route['width_m']);wire.number(route['speed_m_s'])
    wire.integer(len(route['points']),100000,2)
    for point in route['points']:
        wire.tuple(point,3)
    windows = route_packet['windows']
    wire.integer(len(windows),100000,1)
    for window in windows:
        wire.number(window['start_m']);wire.number(window['end_m'])
        wire.tuple(window['xy_bounds_m'],4)
        wire.tuple(window['dem_enclosure']['height_bounds_m'],2)
        ids = window['face_ids']
        if len(set(ids)) != len(ids):
            raise ValueError('Body replay physical candidates repeat; preserve their complete original population.')
        wire.integer(len(ids),MAXIMUM_WINDOW_CANDIDATES,1)
        for face_id in ids:
            wire.integer(face_id,len(faces)-1)
        intervals = window['intervals']
        wire.integer(len(intervals),100000)
        for interval in intervals:
            if not any(interval['start_m'] == a and interval['end_m'] == b and interval['directed_edges'] == edges for a,b,edges in allowed) or interval['width_m'] != route['width_m']:
                raise ValueError('Body replay directed interval/join differs from the unchanged mapped lane traversal.')
            wire.tuple(interval['start_m'],2);wire.tuple(interval['end_m'],2);wire.number(interval['width_m'])
        buildings = window['buildings_m']
        wire.integer(len(buildings),100000)
        for polygon in buildings:
            wire.integer(len(polygon),10000,3)
            for point in polygon:
                wire.tuple(point,2)
        domain = window.get('coverage_polygon_native_cm',[])
        wire.integer(len(domain),16)
        for point in domain:
            wire.tuple(point,2)
    return wire.stream.getvalue()


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    for field in ('root','packet','network','source-manifest','contract','executable','output'):
        parser.add_argument('--'+field,type=Path,required=True)
    parser.add_argument('--executable-sha256',required=True)
    parser.add_argument('--timeout-seconds',type=int,default=60)
    parser.add_argument('--preflight',action='store_true')
    args = parser.parse_args(argv)
    if not 1 <= args.timeout_seconds <= 120:
        parser.error('--timeout-seconds must stay within1..120.')
    root = guard(args.root)
    values, pins = {}, {}
    for name, path in (('packet',args.packet),('network',args.network),('source_manifest',args.source_manifest),('contract',args.contract)):
        data, pins[name] = acquire(path);values[name] = decode(data)
    executable, pins['executable'] = acquire(args.executable,128*1024*1024)
    if pins['executable']['sha256'] != args.executable_sha256:
        raise ValueError('Body replay executable differs from its explicitly accepted compiled hash.')
    wire = prepare(values['packet'],values['network'],values['source_manifest'],pins,root,values['contract'])
    output = guard(args.output)
    if output.exists() or output == root or root.is_relative_to(output):
        raise ValueError('Body replay output must be a new owned evidence directory, never an existing/source root.')
    report = {'bound':BOUND,'inputs':pins,'wire_bytes':len(wire),'wire_sha256':hashlib.sha256(wire).hexdigest(),'status':'PREFLIGHT_READY_NO_CHILD'}
    if args.preflight:
        print(json.dumps(report,ensure_ascii=True));return 0
    output.mkdir(parents=True)
    guard(output)
    (output/'input.bin').write_bytes(wire)
    # Reuse the existing owned launcher; no new process census or GUI surface.
    sys.path.insert(0,str(root/'tools/runtime'))
    from run_native import OwnedJob, launch_owned
    job, child = OwnedJob(), None
    report["errors"] = []
    started = time.monotonic()
    try:
        with (output/'driver.json').open('wb') as log:
            child = launch_owned([str(args.executable),str(output/'input.bin')],output,log,job)
            report['owned_pid'] = child.pid
            (output/'dispatch.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
            try:
                report['exit_code'] = child.wait(args.timeout_seconds)
                report['timed_out'] = False
            except subprocess.TimeoutExpired:
                report['timed_out'] = True
    except Exception as error:
        report['errors'].append(str(error))
    finally:
        try:
            report['terminated_owned_remaining_pids'] = job.close()
            report['owned_job_empty_verified'] = True
        except Exception as error:
            report['errors'].append('Owned job cleanup: '+str(error))
        finally:
            if child:
                try:
                    child.close()
                except Exception as error:
                    report['errors'].append('Owned process handle cleanup: '+str(error))
        report['elapsed_s'] = time.monotonic()-started
        report['status'] = 'REFUSED_DRIVER'
        try:
            report['inputs_stable'] = all(acquire(pin['path'],128*1024*1024 if name=='executable' else 32*1024*1024)[1] == pin for name,pin in pins.items())
            data, report['driver'] = acquire(output/'driver.json',128*1024*1024)
            result = decode(data)
            report['evaluation_count'] = result.get('evaluation_count')
            report['refused_count'] = result.get('refused_count')
            report['completed'] = result.get('complete') is True
            clean = report.get('owned_job_empty_verified') is True and not report['errors'] and not report.get('timed_out',True)
            report['status'] = 'ACCEPTED_LOCAL_ONLY' if result.get('accepted') is True and report.get('exit_code') == 0 and report['inputs_stable'] and clean else 'REFUSED_LOCAL'
        except Exception as error:
            report['errors'].append('Final artifact readback: '+str(error))
        guard(output/'report.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    print(json.dumps(report,ensure_ascii=True))
    return 0 if report['status'] == 'ACCEPTED_LOCAL_ONLY' else 2


if __name__ == '__main__':
    sys.exit(main())
