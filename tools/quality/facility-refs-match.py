"""Match local OSM exterior footprints with the public Stanford visitor map KMZ.
Run with Shapely 2 in a separate analysis environment. The application does not
load this tool or download the visitor map. Usage: script KMZ GEOJSON OUTPUT.
"""
import hashlib
import html
import json
import math
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET
from zipfile import ZipFile

from shapely.geometry import Polygon, shape
from shapely.ops import transform, unary_union
from shapely.strtree import STRtree

PUBLIC_LAYER = 'https://campus-map.stanford.edu/kml/Stanford_Buildings.kmz?z=45'
PINNED_HASH = 'beaf047bdde117bd2c15dd77c7c73035325ca80355f00d1a897503c79ccfb5ee'


def project(x, y, z=None):
    return ((x + 122.17) * 111320 * math.cos(math.radians(37.43)), (y - 37.43) * 111320)


def flat_shape(geom):
    value = transform(project, geom)
    return value if value.is_valid else value.buffer(0)


def coordinates(ring):
    return [tuple(map(float, line.split(',')[:2])) for line in ring.split()]


def read_campus(kmz):
    if hashlib.sha256(kmz.read_bytes()).hexdigest() != PINNED_HASH:
        raise ValueError('Stanford visitor map has changed. Review the new source before matching.')
    with ZipFile(kmz) as archive:
        [member] = [name for name in archive.namelist() if name.lower().endswith('.kml')]
        root = ET.fromstring(archive.read(member))
    facilities = {}
    for item in root.findall('.//{*}Placemark'):
        cells = [html.unescape(v.strip()) for v in re.findall(r'<td>([^<>]*)</td>', item.findtext('{*}description') or '', re.I)]
        if 'BLDG_ID' not in cells:
            continue
        code = cells[cells.index('BLDG_ID') + 1]
        if not code or code == 'NA':
            code = '@' + item.attrib['id']
        elif not re.fullmatch(r'[\w-]+', code):
            raise ValueError('Unrecognized facility ID ' + code)
        name = html.unescape(item.findtext('{*}name') or '').strip()
        key = (code, name)
        for polygon in item.findall('.//{*}Polygon'):
            outer = polygon.findtext('{*}outerBoundaryIs/{*}LinearRing/{*}coordinates')
            holes = [coordinates(v.text) for v in polygon.findall('{*}innerBoundaryIs/{*}LinearRing/{*}coordinates')]
            if outer:
                facilities.setdefault(key, []).append(flat_shape(Polygon(coordinates(outer), holes)))
    return [(code, name, unary_union(parts)) for (code, name), parts in sorted(facilities.items())]


def match(kmz, source):
    facilities = read_campus(kmz)
    index = STRtree([row[2] for row in facilities])
    rows = []
    for feature in json.loads(source.read_text())['features']:
        prop = feature['properties']
        geom = flat_shape(shape(feature['geometry']))
        candidates = []
        for n in index.query(geom, predicate='intersects'):
            code, name, official = facilities[n]
            common = official.intersection(geom).area
            if common < 1 or common / geom.area < .025:
                continue
            osm_fraction, official_fraction = common / geom.area, common / official.area
            iou = common / (geom.area + official.area - common)
            candidates.append((osm_fraction, official_fraction, iou, code, name))
        candidates.sort(key=lambda c: (-c[0], -c[2], c[3]))
        status = 'unmatched'
        if candidates:
            a, b, iou, _, _ = candidates[0]
            second = candidates[1][0] if len(candidates) > 1 else 0
            if a >= .72 and b >= .65 and iou >= .57 and second <= .15:
                status = 'footprint'
            elif a >= .80 and second <= .15:
                status = 'within-facility'
            elif a >= .20:
                status = 'overlap-only'
        if status != 'unmatched' and candidates[0][3].startswith('@'):
            status = 'anonymous-' + status
        rows.append({'id': prop['id'], 'name': prop.get('name') or '', 'part': prop.get('part',False), 'status': status,
                     'candidates': [{'code': c[3] if not c[3].startswith('@') else None, 'name': c[4] if c[4] != 'NA' else '', 'anonymousPlacemark': c[3][1:] if c[3].startswith('@') else None, 'sourceCoverage': round(c[0],5), 'facilityCoverage': round(c[1],5), 'iou': round(c[2],5)} for c in candidates]})
    return {'source':PUBLIC_LAYER,'sha256':PINNED_HASH,
            'identifiedFacilityGroups':sum(not code.startswith('@') for code, _, _ in facilities),
            'anonymousFootprints':sum(code.startswith('@') for code, _, _ in facilities),
            'rows':rows}


if __name__ == '__main__':
    kmz, source, output = map(Path, sys.argv[1:])
    result = match(kmz, source)
    # One footprint per line keeps diffs readable even for the full campus.
    records = result.pop('rows')
    header = json.dumps(result, ensure_ascii=False, indent=2)[:-2]
    data = ',\n'.join('    ' + json.dumps(row, ensure_ascii=False, separators=(',', ':')) for row in records)
    output.write_text(header + ',\n  "rows": [\n' + data + '\n  ]\n}\n')
