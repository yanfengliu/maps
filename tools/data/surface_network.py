"""Fresh GSI photo ground and source-supported OSM movement paths.

Bound: admitted static source geometry, not surveyed placement or native motion.
No implicit remote fetch, generated imagery or invented last-to-first shortcuts.
"""
from __future__ import annotations

import argparse
import collections
import copy
import datetime
import hashlib
import io
import json
import math
import pathlib
import heapq
import socket
import os
import stat
import struct
import subprocess
import sys
import tempfile
import time
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from fractions import Fraction
import support_topology

ROOT = pathlib.Path(__file__).absolute().parents[2]
SUPPORT_MANIFEST_LIMIT_BYTES = 16 * 1024 * 1024
DERIVED_TERRAIN_LIMIT_BYTES = 64 * 1024 * 1024
DEFAULT_SUPPORT_CONSTRUCTION_SECONDS = 110
DEFAULT_SUPPORT_TOTAL_SECONDS = 150
MAX_SUPPORT_TOTAL_SECONDS = 600


def support_execution_budget(construction_seconds, total_seconds):
    """Offline execution limits; independent of geometry and runtime fps."""
    values=(construction_seconds,total_seconds)
    if any(type(value) not in (int,float) or value<=0 or (type(value) is float and not math.isfinite(value)) for value in values):
        raise ValueError('Support execution limits must be finite positive seconds')
    if not construction_seconds<=total_seconds<=MAX_SUPPORT_TOTAL_SECONDS:
        raise ValueError(f'Support execution limits require construction <= total <= {MAX_SUPPORT_TOTAL_SECONDS}s')
    return float(construction_seconds),float(total_seconds)


def admit_path(path, root, *, regular=False):
    """Confined lexical path; reject every existing Windows reparse ancestor."""
    path,root=pathlib.Path(path).absolute(),pathlib.Path(root).absolute()
    if not path.is_relative_to(root) or ".." in path.parts or any(":" in part for part in path.parts[1:]):
        raise ValueError(f"Path must stay inside its declared fresh-source/output root {root}: {path}")
    for candidate in (path,*path.parents):
        try:
            info=candidate.lstat()
        except FileNotFoundError:
            continue
        except OSError as error:
            raise ValueError(f"Cannot inspect source/output path ancestry: {candidate}; {error}") from error
        if stat.S_ISLNK(info.st_mode) or getattr(info,"st_file_attributes",0)&getattr(stat,"FILE_ATTRIBUTE_REPARSE_POINT",0x400):
            raise ValueError(f"Source/output path contains a symlink or reparse point: {candidate}")
        if candidate!=path and not stat.S_ISDIR(info.st_mode):
            raise ValueError(f"Source/output ancestor is not a directory: {candidate}")
        if candidate==path and regular and not stat.S_ISREG(info.st_mode):
            raise ValueError(f"Source/output input must be a regular file: {candidate}")
    try:
        if not path.resolve(strict=False).is_relative_to(root.resolve(strict=False)):
            raise ValueError(f"Source/output resolved path escapes declared root {root}: {path}")
    except OSError as error:
        raise ValueError(f"Cannot resolve source/output path: {path}; {error}") from error
    return path


def guarded_read(path, root=None, limit=64_000_000):
    path=admit_path(path,ROOT/"data" if root is None else root,regular=True)
    with path.open("rb") as stream:
        size=os.fstat(stream.fileno()).st_size
        if size>limit:
            raise ValueError(f"Source/output file exceeds its {limit}-byte admission bound before allocation: {path}")
        payload=stream.read(limit+1)
    admit_path(path,ROOT/"data" if root is None else root,regular=True)
    if len(payload)>limit:
        raise ValueError(f"Source/output grew beyond its {limit}-byte admission bound: {path}")
    return payload


def support_manifest_bytes(path):
    return guarded_read(path,ROOT/"data/prepared",SUPPORT_MANIFEST_LIMIT_BYTES)


def derived_terrain_bytes(record):
    return admitted_record(record,ROOT/"data/prepared",DERIVED_TERRAIN_LIMIT_BYTES)


def guarded_mkdir(path,root):
    path=admit_path(path,root)
    path.mkdir(parents=True,exist_ok=True)
    return admit_path(path,root)


def guarded_unlink(path,root):
    path=admit_path(path,root,regular=True)
    path.unlink(missing_ok=True)


def promote_file(temporary,path,root):
    temporary=admit_path(temporary,root,regular=True)
    path=admit_path(path,root,regular=True)
    os.replace(temporary,path)
    return admit_path(path,root,regular=True)


def guarded_write(path,payload,root=None):
    root=OUT if root is None else root
    path=admit_path(path,root,regular=True)
    guarded_mkdir(path.parent,root)
    temporary=None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent,prefix=f".{path.name}.",suffix=".tmp",delete=False) as stream:
            temporary=pathlib.Path(stream.name)
            admit_path(temporary,root,regular=True)
            stream.write(payload)
        promote_file(temporary,path,root)
    finally:
        if temporary is not None:
            guarded_unlink(temporary,root)


admit_path(ROOT/"data/runtime",ROOT)
admit_path(ROOT/"tools/data/build_city.py",ROOT/"tools/data",regular=True)
admit_path(ROOT/"sources/shibuya.json",ROOT/"sources",regular=True)
admit_path(ROOT/"data/runtime/numpy",ROOT/"data/runtime")
admit_path(ROOT/"data/runtime/PIL",ROOT/"data/runtime")
sys.path.insert(0, str(ROOT / "data/runtime"))
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import build_city as city
import support_surface as support_geometry
import numpy as np
from PIL import Image
import support_source3

CONFIG = json.loads(guarded_read(ROOT/"sources/surface_network.json",ROOT/"sources",100_000))
OUT = ROOT / "data/prepared/surface"


def sha(payload):
    return hashlib.sha256(payload).hexdigest()


def encoded(value):
    return (json.dumps(value, separators=(",", ":"), ensure_ascii=False) + "\n").encode("utf8")


def source_record(path,root=None):
    payload = guarded_read(path,root)
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(payload), "sha256": sha(payload)}


def _exact_orientation(a, b, c):
    ax, ay = map(lambda x: Fraction(float(x)), a)
    bx, by = map(lambda x: Fraction(float(x)), b)
    cx, cy = map(lambda x: Fraction(float(x)), c)
    return (bx-ax)*(cy-ay)-(by-ay)*(cx-ax)


def _orientation(a, b, c):
    # All inputs are literal binary64 values. Outward rounding after EVERY
    # difference/product/subtraction bounds the exact determinant. Unlike a
    # geometric epsilon this interval can only trigger exact arithmetic.
    ux, uy = b[:, 0]-a[:, 0], b[:, 1]-a[:, 1]
    vx, vy = c[:, 0]-a[:, 0], c[:, 1]-a[:, 1]
    def product_bounds(x, y):
        xl, xh = np.nextafter(x, -np.inf), np.nextafter(x, np.inf)
        yl, yh = np.nextafter(y, -np.inf), np.nextafter(y, np.inf)
        products = np.stack((xl*yl, xl*yh, xh*yl, xh*yh))
        return np.nextafter(products.min(axis=0), -np.inf), np.nextafter(products.max(axis=0), np.inf)
    pl, ph = product_bounds(ux, vy)
    ql, qh = product_bounds(uy, vx)
    lo, hi = np.nextafter(pl-qh, -np.inf), np.nextafter(ph-ql, np.inf)
    signs = np.where(lo > 0, 1, np.where(hi < 0, -1, 0))
    determinants = ux*vy-uy*vx
    exact = {}
    for i in np.flatnonzero(signs == 0):
        value = _exact_orientation(a[i], b[i], c[i])
        exact[int(i)] = value
        signs[i] = (value > 0)-(value < 0)
        determinants[i] = float(value)
    return signs, determinants, exact


def native_query_initialize(index, triangles, cell_m=12):
    original = np.asarray(triangles, dtype=np.float64).reshape(-1, 3, 3)
    if not np.isfinite(original).all(): raise ValueError('Native triangle query requires finite consumed vertices')
    with np.errstate(over='ignore'):
        index.native_triangles_cm = (original*100).astype(np.float32)
    if not np.isfinite(index.native_triangles_cm).all(): raise ValueError('Native triangle vertices exceed float32 centimetres')
    support_geometry.TriangleIndex.__init__(index, index.native_triangles_cm.astype(np.float64)/100, cell_m)

def native_query_hits(index, east, north):
    query_cm = np.asarray([float(east)*100, float(north)*100], dtype=np.float64)
    if not np.isfinite(query_cm).all(): raise ValueError('Native triangle query requires finite binary64 centimetre coordinates')
    query_m = query_cm/100
    ids = index.candidates(query_m, query_m)
    if not len(ids): return []
    triangles = index.native_triangles_cm[ids].astype(np.float64)
    a, b, c = triangles[:, 0, :2], triangles[:, 1, :2], triangles[:, 2, :2]
    q = np.broadcast_to(query_cm, a.shape)
    orientation, determinant, exact_d = _orientation(a, b, c)
    signs, values, exact_values = [], [], []
    for u, v in ((b, c), (c, a), (a, b)):
        sign, value, exact = _orientation(u, v, q)
        signs.append(sign); values.append(value); exact_values.append(exact)
    good = (orientation != 0)
    for sign in signs: good &= (sign == 0) | (sign == orientation)
    results = []
    for i in np.flatnonzero(good):
        triangle = triangles[i]
        normal = -np.cross(triangle[1]-triangle[0], triangle[2]-triangle[0])
        if i in exact_d or any(i in values for values in exact_values):
            denominator = _exact_orientation(a[i], b[i], c[i])
            weights_q = [_exact_orientation(u[i], v[i], q[i])/denominator for u, v in ((b,c),(c,a),(a,b))]
            weights = [float(w) for w in weights_q]
            height = float(sum(w*Fraction(float(z)) for w, z in zip(weights_q, triangle[:, 2]))/100)
            if i in exact_d:
                x, y, z = [[Fraction(float(v)) for v in p] for p in triangle]
                u, v = [b-a for a,b in zip(x,y)], [b-a for a,b in zip(x,z)]
                normal = -np.asarray([float(u[1]*v[2]-u[2]*v[1]),float(u[2]*v[0]-u[0]*v[2]),float(u[0]*v[1]-u[1]*v[0])])
        else:
            weights = [value[i]/determinant[i] for value in values]
            height = float(np.asarray(weights)@triangle[:, 2]/100)
        unit = normal/np.linalg.norm(normal)
        results.append({'height':height,'triangle':int(ids[i]),'barycentric':weights,
            'gradient_enu':(-normal[:2]/normal[2]).tolist(),'normal_enu':unit.tolist(),'normal_up_z':float(unit[2]),
            'query_coordinate_model':'binary64-cm-query-on-float32-cm-vertices-v1'})
    return results

class NativeTriangleIndex(support_geometry.TriangleIndex):
    """Actual packed-native all-hits index; eligibility/posed interval are separate."""
    def __init__(self, triangles, cell_m=12): native_query_initialize(self, triangles, cell_m)
    def hits(self, east, north): return native_query_hits(self, east, north)


def generation_code_record(name):
    """Snapshot executing bytes under data; never relabel an earlier run."""
    source=ROOT/'tools/data'/name
    payload=guarded_read(source,ROOT/'tools/data',2*1024*1024)
    digest=sha(payload)
    directory=ROOT/'data/source/provenance'
    path=directory/f'{pathlib.Path(name).stem}-{digest}.py'
    if path.exists():
        if guarded_read(path,directory,2*1024*1024)!=payload:
            raise ValueError(f'Generation code snapshot differs from its content-addressed digest: {path}')
    else:guarded_write(path,payload,directory)
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(payload),'sha256':digest}


def generation_configuration_record(name):
    """Data-only pinned configuration bytes; never executed by consumers."""
    payload=guarded_read(ROOT/'sources'/name,ROOT/'sources',100_000)
    directory=ROOT/'data/source/provenance';digest=sha(payload)
    path=directory/f'{pathlib.Path(name).stem}-{digest}.json'
    if path.exists():
        if guarded_read(path,directory,100_000)!=payload:
            raise ValueError(f'Configuration snapshot differs from content-addressed source bytes: {path}')
    else:guarded_write(path,payload,directory)
    return {'path':path.relative_to(ROOT).as_posix(),'bytes':len(payload),'sha256':digest}


def generation_bindings(algorithm,configurations):
    return [{'role':role,'execution_path':execution,
             'snapshot':{k:((algorithm if field is None else algorithm[field]) if execution.startswith('tools/') else configurations[field])[k]
                         for k in ('path','bytes','sha256')}}
            for role,execution,field,_ in support_topology.SNAPSHOT_ROLES]


def support_generation_inventory(base):
    """Complete declared input inventory before/after the actual constructor."""
    config=CONFIG['support_surface']
    photograph_manifest=json.loads(guarded_read(OUT/'road-photo-manifest.json',ROOT/'data/prepared',1_000_000))
    records=[(ROOT/'data/prepared/manifest.json',ROOT/'data/prepared',1_000_000),
             (ROOT/config['original_terrain_photo']['path'],ROOT/'data/prepared',32_000_000),
             (ROOT/config['atlas']['path'],ROOT/'data/prepared',32_000_000),
             (OUT/'road-photo-manifest.json',ROOT/'data/prepared',1_000_000),
             (ROOT/config['frozen_network']['path'],ROOT/'data/source',32_000_000),
             (ROOT/config['frozen_source_manifest']['path'],ROOT/'data/source',1_000_000),
             (ROOT/config['frozen_movement_manifest']['path'],ROOT/'data/source',1_000_000),
             (ROOT/CONFIG['osm']['path'],ROOT/'data/source',10_000_000),
             (ROOT/'sources/surface_network.json',ROOT/'sources',100_000),
             (ROOT/'sources/shibuya.json',ROOT/'sources',100_000)]
    records.extend((ROOT/r['path'],ROOT/'data/source',32_000_000) for r in config['native_ray_inputs'])
    records.extend((ROOT/r['path'],ROOT/'data/prepared',32_000_000) for r in base['outputs'] if r['kind'] in ('terrain','roads'))
    records.extend((ROOT/r['generated']['path'],ROOT/'data/prepared',32_000_000) for r in photograph_manifest['outputs'])
    records.extend((ROOT/'tools/data'/name,ROOT/'tools/data',2*1024*1024) for name in ('support_surface.py','support_topology.py','surface_network.py','build_city.py'))
    result=[]
    for path,root,limit in records:
        data=guarded_read(path,root,limit)
        result.append({'path':path.relative_to(ROOT).as_posix(),'bytes':len(data),'sha256':sha(data)})
    return result


def pinned_original_terrain_record(base):
    """The unique raw terrain role from the independently hash-admitted base."""
    records=[row for row in base['outputs'] if row['kind']=='terrain']
    if len(records)!=1:raise ValueError('Pinned base must declare exactly one original raw terrain input')
    row=records[0]
    return support_topology.typed_record({'path':row.get('path'),'bytes':row.get('bytes',row.get('size')),
        'sha256':row.get('sha256')},'base.original_terrain',32_000_000,True)


def verify_base(path):
    payload = guarded_read(path,ROOT/"data/prepared",1_000_000)
    if sha(payload) != CONFIG["base_manifest_sha256"]:
        raise ValueError(f"Base city manifest differs from admitted source: {path}; restore the reviewed fresh manifest or review new source")
    return json.loads(payload)


def tile_range(bounds, zoom):
    west, north = city.tile_xy(bounds["north"], bounds["west"], zoom)
    east, south = city.tile_xy(bounds["south"], bounds["east"], zoom)
    return math.floor(west), math.floor(north), math.floor(east), math.floor(south)


def fetch_sources():
    """Explicit bounded downloads; certificate/hostname checking remains on."""
    osm = CONFIG["osm"]
    target = admit_path(ROOT/osm["path"],ROOT/"data/source/osm",regular=True)
    if not target.exists():
        request = urllib.request.Request(osm["url"], headers={"User-Agent": "Shibuya-Unreal-crop/1.0"})
        with urllib.request.urlopen(request, timeout=70) as response:
            payload = response.read(10_000_001)
        if len(payload) > 10_000_000 or sha(payload) != osm["sha256"]:
            raise ValueError("Fresh OSM response differs from admitted bytes; source review is required before regeneration")
        guarded_write(target,payload,ROOT/"data/source/osm")
    else:
        cached=guarded_read(target,ROOT/"data/source/osm",10_000_000)
        if sha(cached)!=osm["sha256"]:
            raise ValueError(f"Cached OSM bytes differ from admitted source: {target}; restore pinned cache or obtain source review")
    host = "cyberjapandata.gsi.go.jp"
    addresses = sorted({item[4][0] for item in socket.getaddrinfo(host, 443, socket.AF_INET)})
    if not addresses:
        raise ValueError("Official GSI source hostname returned no IPv4 addresses")
    zoom = CONFIG["gsi"]["zoom"]
    x0, y0, x1, y1 = tile_range(city.CONFIG["bounds"], zoom)
    for x in range(x0, x1 + 1):
        for y in range(y0, y1 + 1):
            cache_root=ROOT/"data/source/gsi/imagery"
            path = admit_path(ROOT/f"data/source/gsi/imagery/{zoom}/{x}/{y}.jpg",cache_root,regular=True)
            if path.exists():
                validate_photo_tile(guarded_read(path,cache_root,5_000_000),path)
                continue
            guarded_mkdir(path.parent,cache_root)
            url = CONFIG["gsi"]["url_template"].format(z=zoom, x=x, y=y)
            errors = []
            for address in addresses[:3]:
                # --resolve selects a live public DNS address while HTTPS still
                # authenticates the original hostname. Never --insecure.
                temporary=None
                try:
                    with tempfile.NamedTemporaryFile(dir=path.parent,prefix=f".{path.name}.",suffix=".download",delete=False) as stream:
                        temporary=pathlib.Path(stream.name)
                    admit_path(temporary,cache_root,regular=True)
                    result = subprocess.run(["curl.exe", "--silent", "--show-error", "--fail", "--max-time", "15", "--max-filesize", "5000000", "--resolve", f"{host}:443:{address}", "--output", str(temporary), url], capture_output=True, text=True, timeout=20, creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0))
                    if result.returncode == 0:
                        validate_photo_tile(guarded_read(temporary,cache_root,5_000_000),temporary)
                        promote_file(temporary,path,cache_root)
                        break
                    errors.append(result.stderr.strip())
                finally:
                    if temporary is not None:
                        guarded_unlink(temporary,cache_root)
            else:
                raise ValueError(f"Official GSI imagery tile failed normal certificate-checked transport: {url}; {errors}")


def validate_photo_tile(payload,path):
    if len(payload)>5_000_000 or not payload.startswith(b"\xff\xd8"):
        raise ValueError(f"Official GSI photographic tile must contain bounded JPEG bytes: {path}")
    with Image.open(io.BytesIO(payload)) as image:
        if image.size!=(256,256):
            raise ValueError(f"Official GSI tile must decode to 256×256: {path}")
        image.load()
        if float(np.asarray(image.convert("RGB")).std())<3:
            raise ValueError(f"Official GSI photographic tile is blank or nearly uniform: {path}")


def save_glb(writer,path,*,limit_bytes=None):
    """Same core GLB serialization as the base writer, through guarded output."""
    city.validate_native_textures(writer.doc,writer.binary)
    writer.doc["buffers"][0]["byteLength"]=len(writer.binary)
    document=json.dumps(writer.doc,separators=(",",":")).encode("utf8")
    document+=b" "*(-len(document)%4)
    writer.binary.extend(b"\0"*(-len(writer.binary)%4))
    size=28+len(document)+len(writer.binary)
    if limit_bytes is not None and size>limit_bytes:
        raise ValueError(f'GLB output{path} requires{size} bytes above its{limit_bytes}-byte role bound; no output written')
    payload=struct.pack("<4sII",b"glTF",2,size)+struct.pack("<I4s",len(document),b"JSON")+document+struct.pack("<I4s",len(writer.binary),b"BIN\0")+writer.binary
    guarded_write(path,payload)
    return {"path":path.relative_to(ROOT).as_posix(),"size":len(payload),"sha256":sha(payload),"meshes":len(writer.doc["meshes"]),"textures":len(writer.doc.get("images",[]))}


def photo_ground(base, terrain_path):
    original = guarded_read(terrain_path,ROOT/"data/prepared")
    original_record = next(row for row in base["outputs"] if row["kind"] == "terrain")
    if sha(original) != original_record["sha256"]:
        raise ValueError("Original terrain bytes differ from the admitted city manifest; refusing replacement")
    zoom = CONFIG["gsi"]["zoom"]
    x0, y0, x1, y1 = tile_range(base["bounds"], zoom)
    mosaic = Image.new("RGB", ((x1-x0+1)*256, (y1-y0+1)*256))
    records = []
    for x in range(x0, x1+1):
        for y in range(y0, y1+1):
            path = admit_path(ROOT/f"data/source/gsi/imagery/{zoom}/{x}/{y}.jpg",ROOT/"data/source/gsi/imagery",regular=True)
            if not path.is_file():
                raise ValueError(f"Missing official GSI imagery tile: {path}; run explicit --fetch")
            payload = guarded_read(path,ROOT/"data/source/gsi/imagery",5_000_000)
            if len(payload) > 5_000_000 or not payload.startswith(b"\xff\xd8"):
                raise ValueError(f"Official GSI tile must be bounded JPEG bytes: {path}")
            with Image.open(io.BytesIO(payload)) as tile:
                if tile.size != (256, 256):
                    raise ValueError(f"Official GSI tile must decode to 256×256: {path}")
                pixels = np.asarray(tile.convert("RGB"))
                if float(pixels.std()) < 3:
                    raise ValueError(f"Official GSI photographic tile is blank or nearly uniform: {path}")
                mosaic.paste(tile, ((x-x0)*256, (y-y0)*256))
            records.append({**source_record(path), "url": CONFIG["gsi"]["url_template"].format(z=zoom,x=x,y=y), "tile": [zoom,x,y]})
    guarded_mkdir(OUT,ROOT/"data/prepared")
    image_path = OUT / "terrain-aerial.png"
    image_bytes=io.BytesIO()
    mosaic.save(image_bytes, format="PNG")
    guarded_write(image_path,image_bytes.getvalue())
    doc, binary = city.read_glb(original)
    writer = city.GlbWriter()
    writer.doc, writer.binary = doc, bytearray(binary)
    writer.doc["images"] = [{"bufferView": writer.view(guarded_read(image_path)), "mimeType": "image/png"}]
    writer.doc["textures"] = [{"source": 0, "sampler": 0}]
    writer.doc["samplers"] = [{"magFilter": 9729, "minFilter": 9987, "wrapS": 33071, "wrapT": 33071}]
    writer.doc["materials"] = [{"name": "Official GSI aerial photograph", "pbrMetallicRoughness": {"baseColorTexture": {"index": 0}, "roughnessFactor": .9, "metallicFactor": 0}}]
    glb_record = save_glb(writer,OUT/"terrain-photo.glb")
    return {"base_manifest_sha256": CONFIG["base_manifest_sha256"], "original_terrain_sha256": sha(original), "terrain_photo": glb_record, "image": source_record(image_path), "imagery_tiles": records, "geographic_bounds": base["bounds"], "mosaic_pixels": list(mosaic.size), "xyz_extent": [zoom,x0,y0,x1,y1], "uv_semantics": "Original UV0 preserved byte-for-byte. U=(fractional XYZ tile x-x0)/(x1-x0+1), V=(fractional XYZ tile y-y0)/(y1-y0+1), image top left is northwest. GLB X east/Y up/Z north metres.", "geometry_preserved": True, "attribution": CONFIG["gsi"]["attribution"], "license": CONFIG["gsi"]["license"]}


def geographic_uv(points,base):
    origin=np.array(city.ecef(base["origin"]["latitude"],base["origin"]["longitude"],base["origin"]["ellipsoidal_height_m"]))
    coordinates=city.geodetic(np.asarray(points,dtype=np.float64)@city.local_basis()+origin)
    zoom=CONFIG["gsi"]["zoom"]
    x0,y0,x1,y1=tile_range(base["bounds"],zoom)
    xy=np.array([city.tile_xy(latitude,longitude,zoom) for latitude,longitude,_ in coordinates])
    return (xy-np.array([x0,y0]))/np.array([x1-x0+1,y1-y0+1])


def road_photos(base):
    # Core GLBs deliberately share the already imported terrain atlas through
    # native material assignment, avoiding 25 identical embedded 10.9MB images.
    atlas=source_record(OUT/"terrain-aerial.png")
    if atlas["sha256"]!="b3ae2bdccd106b22f3a3ab0624a6f1a1c80410289c55429724f99029d8477e58":
        raise ValueError("Frozen aerial atlas differs; refuse shared road UV preparation")
    outputs=[]
    for source in base["outputs"]:
        if source["kind"]!="roads":
            continue
        path=ROOT/source["path"]
        payload=guarded_read(path,ROOT/"data/prepared/roads")
        if sha(payload)!=source["sha256"]:
            raise ValueError(f"Road source bytes differ from admitted geometry: {path}")
        doc,binary=city.read_glb(payload)
        writer=city.GlbWriter()
        writer.doc,writer.binary=doc,bytearray(binary)
        uv_digests=[]
        for mesh in writer.doc["meshes"]:
            for primitive in mesh["primitives"]:
                points=accessor(doc,binary,primitive["attributes"]["POSITION"])
                uv=geographic_uv(points,base).astype("<f4")
                if not np.all((uv>=0)&(uv<=1)):
                    raise ValueError(f"Road photo UVs must lie inside the admitted full atlas: {path}")
                primitive["attributes"]["TEXCOORD_0"]=writer.accessor(uv,"VEC2")
                uv_digests.append(sha(uv.tobytes()))
        writer.doc["materials"]=[{"name":"GSI shared aerial atlas assignment required","pbrMetallicRoughness":{"baseColorFactor":[.25,.25,.25,1],"roughnessFactor":.9,"metallicFactor":0}} for _ in doc.get("materials",[{}])]
        output=save_glb(writer,OUT/"roads"/path.name)
        outputs.append({"original":source_record(path),"generated":output,"uv_sha256":uv_digests,"vertices":source["vertices"],"triangles":source["triangles"],"bounds_glb_m":source["bounds_glb_m"]})
    manifest={"schema_version":1,"base_manifest_sha256":CONFIG["base_manifest_sha256"],"shared_atlas":atlas,"outputs":outputs,"uv_semantics":"GLB X east/Y up/Z north metres converted with the exact reviewed ECEF basis/origin to WGS84, then z18 XYZ atlas. UV0 upper-left is northwest, same as frozen terrain-photo UV0. Original positions/normals/indices and transforms are unchanged.","native_material_contract":"Import UV-bearing GLBs, then assign the already imported terrain-photo material/Texture2D to every road mesh material slot. Do not accept plain placeholder material as photo success. Share one atlas resource; do not generate world-space UVs or lift geometry.","totals":{"assets":len(outputs),"triangles":sum(row["triangles"] for row in outputs),"vertices":sum(row["vertices"] for row in outputs)},"attribution":CONFIG["gsi"]["attribution"],"license":CONFIG["gsi"]["license"]}
    guarded_write(OUT/"road-photo-manifest.json",encoded(manifest))
    return manifest


def accessor(doc, binary, index):
    row = doc["accessors"][index]
    view = doc["bufferViews"][row["bufferView"]]
    dtype = {5126: "<f4", 5125: "<u4", 5123: "<u2"}[row["componentType"]]
    width = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}[row["type"]]
    if "byteStride" in view or "sparse" in row:
        raise ValueError("Prepared support geometry must have tightly packed nonsparse accessors")
    offset = view.get("byteOffset", 0) + row.get("byteOffset", 0)
    return np.frombuffer(binary, dtype=dtype, count=row["count"]*width, offset=offset).reshape(-1, width)


class RoadSupport:
    """Projected barycentric road support, with DEM-nearest surface selection."""
    def __init__(self, base):
        self.triangles, self.sources, self.bins = [], [], collections.defaultdict(list)
        self.layer_refs=[]
        self.source_parts={}
        for row in base["outputs"]:
            if row["kind"] != "roads":
                continue
            path = ROOT / row["path"]
            payload = guarded_read(path,ROOT/"data/prepared/roads")
            if sha(payload) != row["sha256"]:
                raise ValueError(f"Prepared road source differs from admitted bytes: {path}")
            doc, binary = city.read_glb(payload)
            source_index=len(self.sources)
            self.sources.append(source_record(path))
            self.source_parts[source_index]=[]
            source_triangle_index=0
            for mesh_index,mesh in enumerate(doc["meshes"]):
                for primitive_index,primitive in enumerate(mesh["primitives"]):
                    raw_points = accessor(doc,binary,primitive["attributes"]["POSITION"])
                    points = raw_points[:, [0,2,1]]
                    indices = accessor(doc,binary,primitive["indices"]).reshape(-1,3)
                    self.source_parts[source_index].append((mesh_index,primitive_index,{"POSITION":raw_points},indices))
                    for triangle_index,triangle in enumerate(points[indices]):
                        index = len(self.triangles)
                        self.triangles.append(triangle)
                        self.layer_refs.append({"kind":"road","source":source_index,"mesh":mesh_index,"primitive":primitive_index,"triangle":triangle_index,"source_triangle_index":source_triangle_index})
                        source_triangle_index+=1
                        lo = np.floor(triangle[:,:2].min(axis=0)/12).astype(int)
                        hi = np.floor(triangle[:,:2].max(axis=0)/12).astype(int)
                        for x in range(lo[0], hi[0]+1):
                            for y in range(lo[1], hi[1]+1):
                                self.bins[(x,y)].append(index)
        self.triangles = np.asarray(self.triangles, dtype=np.float64)


    def height(self, east, north, near):
        ids = self.bins.get((math.floor(east/12), math.floor(north/12)), [])
        if not ids:
            return None
        triangles = self.triangles[ids]
        a,b,c = triangles[:,0,:2],triangles[:,1,:2],triangles[:,2,:2]
        u,v = b-a,c-a
        d = np.array([east,north])-a
        determinant = u[:,0]*v[:,1]-u[:,1]*v[:,0]
        good = abs(determinant)>1e-7
        s = np.divide(d[:,0]*v[:,1]-d[:,1]*v[:,0],determinant,out=np.full(len(ids),np.nan),where=good)
        t = np.divide(u[:,0]*d[:,1]-u[:,1]*d[:,0],determinant,out=np.full(len(ids),np.nan),where=good)
        good &= (s>=-1e-6)&(t>=-1e-6)&(s+t<=1+1e-6)
        found = np.flatnonzero(good)
        if not len(found):
            return None
        heights = triangles[:,0,2]*(1-s-t)+triangles[:,1,2]*s+triangles[:,2,2]*t
        selected = min(found,key=lambda i:abs(heights[i]-near))
        if abs(heights[selected]-near)>1.5:
            return None
        return float(heights[selected]), int(ids[selected]), [float(1-s[selected]-t[selected]),float(s[selected]),float(t[selected])]


def admitted_record(record,root,limit=32_000_000):
    path=ROOT/record["path"]
    payload=guarded_read(path,root,limit)
    if len(payload)!=record.get("bytes",record.get("size")) or sha(payload)!=record["sha256"]:
        raise ValueError(f"Support source differs from its exact admitted size/digest: {path}; restore its pinned bytes")
    return payload


def native_ray_samples(road,road_index,terrain_index,native_roads,terrain_record,buildings,*,output_directory=None):
    """Expected first intersections from exact output triangles, actual old rays."""
    samples=[];ambiguous=[]
    for input_index,record in enumerate(CONFIG["support_surface"]["native_ray_inputs"]):
        native=json.loads(admitted_record(record,ROOT/"data/source",32_000_000))
        examples=list(native["centre_support_examples"])
        for snapshot in native["physics_motion_samples"]:
            examples.extend(snapshot.get("contact_examples",[]))
        examples.extend(native["final_rendered_contacts"].get("contact_examples",[]))
        for i,example in enumerate(examples):
            start=np.asarray(example["ray_start_cm"])/100;end=np.asarray(example["ray_end_cm"])/100
            hits=[]
            for role,index in (("road",road_index),("terrain_support",terrain_index)):
                for hit in index.hits(*start[:2]):
                    if end[2]<=hit["height"]<=start[2]:hits.append((hit["height"],role,hit))
            sample={"id":f"native-{input_index}-{i}-{example['contact_kind']}-{example['agent_slot']}","start_m":start.tolist(),"end_m":end.tolist(),"expected_hit":bool(hits),"old_native_reason":example["reason"]}
            if hits:
                height,role,hit=max(hits,key=lambda row:row[0])
                if role=="road":
                    ref=road.layer_refs[hit["triangle"]];mapping=native_roads[ref["source"]]
                    label=mapping["actor_label"];source_path=mapping["source_path"];source_triangle=ref["source_triangle_index"]
                else:
                    ref={"kind":"terrain","triangle":hit["triangle"]};label="City_069_terrain";source_path=terrain_record["path"];source_triangle=hit["triangle"]
                tied=[]
                for other_height,other_role,other_hit in hits:
                    if abs(other_height-height)*100<=CONFIG["support_surface"]["native_collision_source_tolerance_cm"]:
                        other_label=native_roads[road.layer_refs[other_hit["triangle"]]["source"]]["actor_label"] if other_role=="road" else "City_069_terrain"
                        if other_label!=label:tied.append(other_label)
                if tied:
                    ambiguous.append({"id":sample["id"],"actor_labels":sorted(set([label,*tied]))})
                    continue
                sample["expected"]={"actor_label":label,"mesh_role":role,"position_m":[float(start[0]),float(start[1]),height],"normal_enu":hit["normal_enu"],"source_path":source_path,"source_triangle_index":source_triangle,"barycentric":hit["barycentric"],"layer_ref":ref}
            samples.append(sample)
    covered={row.get("expected",{}).get("actor_label") for row in samples if row.get("expected",{}).get("mesh_role")=="road"}
    uncovered=[]
    for source_index,mapping in enumerate(native_roads):
        if mapping["actor_label"] in covered:continue
        reasons=collections.Counter()
        for i,ref in enumerate(road.layer_refs):
            if ref["source"]!=source_index:continue
            xy=road.triangles[i,:,:2].mean(axis=0)
            if any(point_inside(xy,row["polygon"]) for row in buildings):reasons["mapped-building-footprint"]+=1;continue
            candidates=[(hit["height"],role,hit) for role,index in (("road",road_index),("terrain_support",terrain_index)) for hit in index.hits(*xy) if min(hit["barycentric"])>=0]
            if not candidates:reasons["no-rendered-ground"]+=1;continue
            height,role,hit=max(candidates,key=lambda row:row[0])
            if role!="road":reasons["buried-by-terrain"]+=1;continue
            layer=road.layer_refs[hit["triangle"]];actual=native_roads[layer["source"]]
            if actual["actor_label"]!=mapping["actor_label"]:reasons["occluded-by-other-road-actor"]+=1;continue
            ties={native_roads[road.layer_refs[h["triangle"]]["source"]]["actor_label"] if role=="road" else "City_069_terrain" for z,role,h in candidates if abs(z-height)<=.001}
            if ties!={mapping["actor_label"]}:reasons["actor-tie-within0.1cm"]+=1;continue
            if hit["normal_up_z"]<.7:reasons["normal-below0.7"]+=1;continue
            samples.append({"id":f"road-first-hit-{source_index}-{i}","start_m":[float(xy[0]),float(xy[1]),height+.8],"end_m":[float(xy[0]),float(xy[1]),height-1],"expected_hit":True,"expected":{"actor_label":mapping["actor_label"],"mesh_role":"road","position_m":[float(xy[0]),float(xy[1]),height],"normal_enu":hit["normal_enu"],"source_path":mapping["source_path"],"source_triangle_index":layer["source_triangle_index"],"barycentric":hit["barycentric"],"layer_ref":layer},"witness_source":"Exact unchanged road triangle centroid; globally highest strict source hit; mapped building footprint excluded"})
            covered.add(mapping["actor_label"])
            break
        if mapping["actor_label"] not in covered:uncovered.append({"road_index":source_index,"actor_label":mapping["actor_label"],"reasons":dict(reasons)})
    payload={"schema_version":1,"frame":"metres-Xeast-Ynorth-Zup","position_tolerance_cm":CONFIG["support_surface"]["native_collision_source_tolerance_cm"],"normal_dot_min":.999,"inputs":CONFIG["support_surface"]["native_ray_inputs"],"samples":samples,"ambiguous_actor_ties_omitted":ambiguous,"road_coverage":{"source_roads":len(native_roads),"covered_actor_labels":sorted(covered),"uncovered_roads":uncovered},"bound":"Exact first source-triangle intersections along retained actual native rays plus unambiguous strict highest-road centroid witnesses. Actor ties within0.1cm are explicitly omitted. Simple and complex native queries must both match these same source geometry witnesses; this does not prove every runtime agent contact."}
    path=(OUT if output_directory is None else output_directory)/"support-native-rays.json";guarded_write(path,encoded(payload))
    return source_record(path)


def construct_support_rows(triangles,indices,vertex_rows,cutting_roads,*,selection=None,
                           checkpoint=lambda:None,progress=lambda phase,values:None,piece_observer=None,
                           construction_seconds=DEFAULT_SUPPORT_CONSTRUCTION_SECONDS):
    """Same general producer for a full crop or an explicitly bounded sample."""
    import time
    construction_seconds,_=support_execution_budget(construction_seconds,MAX_SUPPORT_TOTAL_SECONDS)
    started=time.perf_counter()
    cutting_index=support_geometry.TriangleIndex(cutting_roads)
    selection=np.arange(len(triangles)) if selection is None else np.asarray(selection,dtype=int)
    if len(set(map(int,selection)))!=len(selection) or np.any(selection<0) or np.any(selection>=len(triangles)):
        raise ValueError('Terrain construction selection must contain distinct actual original-parent indices')
    result=[];refined_parents=[];piece_ids=[];original_piece_parents=[]
    road_counts=np.zeros(len(triangles),dtype=np.uint32)
    piece_counts=np.zeros(len(triangles),dtype=np.uint32)
    envelopes=abs(triangles[:,:,:2]).max(axis=1)
    registry=collections.Counter();changed=0
    context_seconds=clipping_seconds=refinement_seconds=0.
    original_area=remaining_area=restored_band_area=0.
    for visited,parent in enumerate(selection):
        checkpoint();triangle=triangles[parent]
        if time.perf_counter()-started>construction_seconds:
            raise ValueError(f'Support construction reached{construction_seconds:g}s clipping budget at original parent{int(parent)}; no source published')
        delta=support_geometry.UNION_CLEARANCE_M
        lo,hi=triangle[:,:2].min(axis=0)-delta,triangle[:,:2].max(axis=0)+delta
        candidates=cutting_index.candidates(lo,hi);road_counts[parent]=len(candidates)
        anchor=triangle[0,:2].copy();local=triangle.copy();local[:,:2]-=anchor
        local_roads=cutting_roads[candidates].copy();local_roads[:,:,:2]-=anchor
        tick=time.perf_counter()
        if len(candidates):
            envelopes[parent]=np.maximum(envelopes[parent],abs(cutting_roads[candidates,:,:2]).max(axis=(0,1))+delta)
            context=support_topology.CreatingLines(int(parent),local.tolist())
        else:context=None
        context_seconds+=time.perf_counter()-tick
        tick=time.perf_counter()
        pieces,face_stats=support_geometry.reconciled_face(local.tolist(),local_roads.tolist(),context=context)
        if piece_observer is not None:
            observation=(int(parent),len(pieces),sha(np.asarray(pieces,dtype='<f8').tobytes()),tuple(sorted(face_stats.items())))
            piece_observer(observation)
        clipping_seconds+=time.perf_counter()-tick
        piece_counts[parent]=len(pieces)
        offset=len(original_piece_parents);original_piece_parents.extend([int(parent)]*len(pieces))
        changed+=len(pieces)!=1 or (pieces and not np.array_equal(np.asarray(pieces[0]),local))
        original_area+=abs(support_geometry.signed_area(triangle.tolist()))
        remaining_area+=sum(abs(support_geometry.signed_area(p)) for p in pieces)
        restored_band_area+=face_stats['restored_band_area_upper_bound_m2']
        if context is not None:
            tick=time.perf_counter()
            rows,ids,stats=context.refine(pieces,anchor,checkpoint,maximum_output_triangles=2_000_000-len(result))
            refinement_seconds+=time.perf_counter()-tick
            registry.update(stats)
        else:
            rows=np.asarray(pieces,dtype=float).reshape(-1,3,vertex_rows.shape[1]);rows[:,:,:2]+=anchor
            ids=np.arange(len(pieces),dtype=np.uint32)
        result.extend(rows);piece_ids.extend((ids+offset).tolist());refined_parents.extend([int(parent)]*len(rows))
        if len(result)>2_000_000:
            raise ValueError('Support construction exceeds2M prepacking faces; no truncation or source publication')
        if (visited+1)%64==0 or visited+1==len(selection):
            progress('construction',{'parents_processed':visited+1,'parents_selected':len(selection),'prepacking_faces':len(result)})
    combined_seconds=time.perf_counter()-started
    accounting=support_topology.PieceAccounting(original_piece_parents)
    packing_started=time.perf_counter()
    rows,parents,packing,pieces=support_geometry.conform_source_edges(
        np.asarray(result,dtype=float).reshape(-1,3,vertex_rows.shape[1]),np.asarray(refined_parents,dtype=int),
        triangles,indices,vertex_rows,piece_ids=np.asarray(piece_ids,dtype=np.uint32),accounting=accounting,checkpoint=checkpoint)
    del result
    packing_seconds=time.perf_counter()-packing_started
    rows,swaps=support_topology.parent_winding(rows,parents,triangles)
    quantization=support_topology.quantization_check(rows,parents,triangles,road_counts,piece_counts,checkpoint,envelopes)
    progress('packed',{'triangles':len(rows),'index_swaps':swaps,'accounted_pieces':len(accounting.rows)})
    evidence={'selected_original_parents':len(selection),'changed_terrain_triangles':int(changed),
              'original_area_m2':original_area,'retained_triangle_area_before_float32_m2':remaining_area,
              'restored_band_area_upper_bound_m2':restored_band_area,'conforming':packing,
              'introduced_line_registry':dict(registry),'index_order_swaps':swaps,'quantization':quantization,
              'stages_seconds':{'creating_context':context_seconds,'numeric_clipping_with_context':clipping_seconds,
                               'introduced_line_refinement':refinement_seconds,'clipping_and_registry_total':combined_seconds,
                               'shared_edge_conforming':packing_seconds}}
    return rows,parents,pieces,accounting,evidence


def prepare_support_surface(base,*,construction_seconds=DEFAULT_SUPPORT_CONSTRUCTION_SECONDS,
                            total_seconds=DEFAULT_SUPPORT_TOTAL_SECONDS):
    """A unique staged generation; only its complete manifest can become active."""
    import time
    construction_seconds,total_seconds=support_execution_budget(construction_seconds,total_seconds)
    started=time.perf_counter()
    print(json.dumps({'support_execution_limits_seconds':{'construction':construction_seconds,'total':total_seconds},
                      'command':sys.argv}),flush=True)
    generations=guarded_mkdir(OUT/'generations',OUT)
    stage=admit_path(pathlib.Path(tempfile.mkdtemp(prefix='generation-',dir=generations)),OUT)
    active=OUT/'support-surface-manifest.json'
    prior=sha(guarded_read(active,OUT,SUPPORT_MANIFEST_LIMIT_BYTES)) if active.exists() else None
    try:return _prepare_support_surface(base,stage,construction_seconds=construction_seconds,total_seconds=total_seconds)
    except BaseException as error:
        current=sha(guarded_read(active,OUT,SUPPORT_MANIFEST_LIMIT_BYTES)) if active.exists() else None
        guarded_write(stage/'refused.json',encoded({'schema_version':1,'status':'refused-not-promoted',
            'error':f'{type(error).__name__}: {error}','prior_active_sha256':prior,'current_active_sha256':current,
            'active_manifest_conserved':prior==current,'bound':'Actual active-manifest comparison; unique staged outputs do not overwrite prior outputs'}))
        raise
    finally:
        print(json.dumps({'support_execution_elapsed_seconds':time.perf_counter()-started,
                          'support_execution_limits_seconds':{'construction':construction_seconds,'total':total_seconds}}),flush=True)


def complete_support_generation(stage,manifest,current_inventory,original_parent_count,*,pinned_original_terrain_record,manifest_limit=SUPPORT_MANIFEST_LIMIT_BYTES,
                                before_promotion=lambda:None):
    """Check the actual complete stage before the sole atomic manifest switch.

    Stable terrain/ledger/ray names are never overwritten. Old active manifest
    bytes are saved separately for recovery; new outputs retain immutable paths.
    The optional smaller bound supports a real late-cap negative, never a wider
    admission. Production always uses the fixed manifest role limit.
    """
    stage=admit_path(stage,OUT)
    if stage.parent!=OUT/'generations':raise ValueError('Support stage must be a unique direct child of the confined generation directory')
    if not 1<=manifest_limit<=SUPPORT_MANIFEST_LIMIT_BYTES:raise ValueError('Support manifest admission cannot widen its fixed role bound')
    payload=encoded(manifest)
    if len(payload)>manifest_limit:
        raise ValueError(f'Staged support manifest requires{len(payload)} bytes above its{manifest_limit}-byte bound; active generation conserved')
    for name,limit in (('derived_terrain',DERIVED_TERRAIN_LIMIT_BYTES),('native_ray_samples',32_000_000)):
        support_topology.typed_record(manifest[name],name,limit,True)
        path=admit_path(ROOT/manifest[name]['path'],stage,regular=True)
        admitted_record(manifest[name],stage,limit)
    meta=manifest['topology_provenance'];support_topology.typed_record(meta['record'],'topology.record',32_000_000,True)
    admit_path(ROOT/meta['record']['path'],stage,regular=True)
    ledger=support_topology.decode_accounting(admitted_record(meta['record'],stage,32_000_000))
    preservation=json.loads(admitted_record(manifest['source_preservation'],ROOT/'data/source/provenance',32_000_000))
    for _,execution,field,limit in support_topology.SNAPSHOT_ROLES:
        record=(manifest['algorithm'] if field is None else manifest['algorithm'][field]) if execution.startswith('tools/') else manifest['configuration_inputs'][field]
        support_topology.typed_record(record,'generation.snapshot',limit,True)
        admitted_record(record,ROOT/'data/source/provenance',limit)
    doc,binary=city.read_glb(derived_terrain_bytes(manifest['derived_terrain']))
    if len(doc['meshes'])!=1 or len(doc['meshes'][0]['primitives'])!=1:
        raise ValueError('Staged derived terrain requires exactly one complete source primitive')
    primitive=doc['meshes'][0]['primitives'][0]
    glb_points=accessor(doc,binary,primitive['attributes']['POSITION'])
    indices=accessor(doc,binary,primitive['indices']).reshape(-1,3)
    admission=support_topology.admit_schema2(manifest,preservation,ledger,glb_points[:,[0,2,1]][indices],
        np.asarray(manifest['terrain_source_triangle_indices']),original_parent_count=original_parent_count,
        actual_vertex_count=len(glb_points),actual_bounds=[glb_points.min(axis=0).tolist(),glb_points.max(axis=0).tolist()],
        current_inventory=current_inventory,clearance=support_geometry.UNION_CLEARANCE_M,
        pinned_original_terrain_record=pinned_original_terrain_record)
    guarded_write(stage/'support-surface-manifest.json',payload)
    if guarded_read(stage/'support-surface-manifest.json',stage,SUPPORT_MANIFEST_LIMIT_BYTES)!=payload:
        raise ValueError('Complete staged manifest actual readback differs; active generation conserved')
    active=OUT/'support-surface-manifest.json'
    prior=None
    if active.exists():
        prior=guarded_read(active,OUT,SUPPORT_MANIFEST_LIMIT_BYTES)
        backup=ROOT/'data/source/provenance'/f'support-active-manifest-{sha(prior)}.json'
        if backup.exists() and guarded_read(backup,ROOT/'data/source/provenance',SUPPORT_MANIFEST_LIMIT_BYTES)!=prior:
            raise ValueError('Saved active-manifest recovery bytes differ; refuse promotion')
        guarded_write(backup,prior,ROOT/'data/source/provenance')
    promotion={'schema2':admission,'previous_manifest_sha256':sha(prior) if prior is not None else None,
            'active_manifest_sha256':sha(payload),'generation_directory':stage.relative_to(ROOT).as_posix(),
            'status':'validated-ready-for-single-switch',
            'promotion':'sole atomic active-manifest switch; all referenced outputs already validated at immutable generation paths'}
    guarded_write(stage/'promotion.json',encoded(promotion))
    before_promotion()
    guarded_write(active,payload)
    return promotion


def _prepare_support_surface(base,stage,*,construction_seconds=DEFAULT_SUPPORT_CONSTRUCTION_SECONDS,
                             total_seconds=DEFAULT_SUPPORT_TOTAL_SECONDS):
    """Visible terrain minus only source terrain-above-road footprint conflicts."""
    construction_seconds,total_seconds=support_execution_budget(construction_seconds,total_seconds)
    started=__import__('time').perf_counter()
    def before_promotion():
        if __import__('time').perf_counter()-started>total_seconds:
            raise ValueError(f'Support surface preparation exceeded{total_seconds:g}s total execution budget; active generation conserved')
    config=CONFIG["support_surface"]
    inputs_before=support_generation_inventory(base)
    photo=admitted_record(config["original_terrain_photo"],ROOT/"data/prepared")
    admitted_record(config["atlas"],ROOT/"data/prepared")
    doc,binary=city.read_glb(photo)
    original_record=next(r for r in base["outputs"] if r["kind"]=="terrain")
    old_doc,old_binary=city.read_glb(admitted_record(original_record,ROOT/"data/prepared"))
    if doc["nodes"]!=old_doc["nodes"] or doc["meshes"]!=old_doc["meshes"] or len(doc["meshes"])!=1:
        raise ValueError("Admitted photograph terrain must preserve the original baked mesh/node contract")
    for i in range(len(old_doc["accessors"])):
        if not np.array_equal(accessor(doc,binary,i),accessor(old_doc,old_binary,i)):
            raise ValueError(f"Admitted photograph terrain geometry/UV accessor{i} differs from original source")
    primitive=doc["meshes"][0]["primitives"][0]
    positions=accessor(doc,binary,primitive["attributes"]["POSITION"])[:,[0,2,1]].astype(np.float64)
    uv=accessor(doc,binary,primitive["attributes"]["TEXCOORD_0"]).astype(np.float64)
    normals=accessor(doc,binary,primitive["attributes"]["NORMAL"]).astype(np.float64)
    indices=accessor(doc,binary,primitive["indices"]).reshape(-1,3)
    vertex_rows=np.concatenate((positions,uv,normals),axis=1)
    triangles=vertex_rows[indices]
    road=RoadSupport(base);road_index=support_geometry.TriangleIndex(road.triangles)
    # Deduplicate geometry only for subtraction; every unchanged source road,
    # layer/triangle alias and native actor remains in the authoritative manifest.
    distinct={}
    for i,triangle in enumerate(road.triangles):
        distinct.setdefault(tuple(sorted(tuple(row) for row in triangle)),i)
    cutting_roads=road.triangles[sorted(distinct.values())]
    def progress(phase,values):
        if phase=='packed' or values['parents_processed']%10000==0:
            print(f'Support surface{phase}: {values}',flush=True)
    rows,provenance,piece_ids,accounting,construction=construct_support_rows(triangles,indices,vertex_rows,cutting_roads,progress=progress,
                                                                       construction_seconds=construction_seconds)
    if not len(rows):raise ValueError('Derived terrain has no packed positive-area source faces; no geometry can be published')
    maximum_error=construction['quantization']['maximum_plane_uv_error'][0]
    maximum_uv_error=max(construction['quantization']['maximum_plane_uv_error'][1:])
    cross=np.cross(rows[:,1,:3].astype(float)-rows[:,0,:3],rows[:,2,:3].astype(float)-rows[:,0,:3])
    normal_up=abs(cross[:,2])/np.linalg.norm(cross,axis=1)
    normal_low=int((normal_up<.7).sum())
    minimum_normal=float(normal_up.min())
    del cross,normal_up
    flat=rows.reshape(-1,8)
    if np.any(np.linalg.norm(flat[:,5:8],axis=1)==0):raise ValueError('Derived terrain source NORMAL has a zero length; source review required')
    flat[:,5:8]/=np.linalg.norm(flat[:,5:8],axis=1)[:,None]
    unique,inverse=np.unique(flat,axis=0,return_inverse=True)
    if __import__('time').perf_counter()-started>total_seconds:
        raise ValueError(f"Support surface construction exceeded{total_seconds:g}s full geometry budget; no derived geometry was published")
    writer=city.GlbWriter()
    writer.doc["materials"]=[{"name":"Existing GSI aerial material assignment required","pbrMetallicRoughness":{"roughnessFactor":.9,"metallicFactor":0}}]
    writer.primitive({"POSITION":unique[:,[0,2,1]],"TEXCOORD_0":unique[:,3:5],"NORMAL":unique[:,5:8]},inverse.reshape(-1,3),name="Source-reconciled GSI terrain; original road planes unchanged")
    output=save_glb(writer,stage/"terrain-support.glb",limit_bytes=DERIVED_TERRAIN_LIMIT_BYTES)
    output={"path":output["path"],"bytes":output["size"],"sha256":output["sha256"],"triangles":len(rows),"vertices":len(unique),"bounds_glb_m":[unique[:,[0,2,1]].min(axis=0).tolist(),unique[:,[0,2,1]].max(axis=0).tolist()]}
    packed_doc,packed_binary=city.read_glb(guarded_read(ROOT/output["path"],ROOT/"data/prepared",DERIVED_TERRAIN_LIMIT_BYTES))
    packed_primitive=packed_doc["meshes"][0]["primitives"][0]
    packed_positions=accessor(packed_doc,packed_binary,packed_primitive["attributes"]["POSITION"])[:,[0,2,1]]
    packed_indices=accessor(packed_doc,packed_binary,packed_primitive["indices"]).reshape(-1,3)
    packed_rows,readback=support_topology.verify_writer_readback(packed_doc,packed_binary,accessor,unique,inverse,provenance,piece_ids,accounting)
    ledger_payload=accounting.encode()
    guarded_write(stage/'support-piece-provenance.bin',ledger_payload)
    ledger_record=source_record(stage/'support-piece-provenance.bin')
    terrain_index=support_geometry.TriangleIndex(packed_positions[packed_indices])
    native_roads=[]
    road_photo_manifest=json.loads(guarded_read(OUT/"road-photo-manifest.json",ROOT/"data/prepared",1_000_000))
    if road_photo_manifest["base_manifest_sha256"]!=CONFIG["base_manifest_sha256"] or road_photo_manifest["shared_atlas"]!=config["atlas"]:
        raise ValueError("Original photographic road manifest differs from source/base/atlas binding")
    for source_index,record in enumerate(road.sources):
        index=next(i for i,r in enumerate(base["outputs"]) if r["path"]==record["path"])
        stem=pathlib.PurePosixPath(record["path"]).stem
        generated=next(r for r in road_photo_manifest["outputs"] if r["original"]==record)["generated"]
        old_doc,old_bin=city.read_glb(admitted_record(record,ROOT/"data/prepared/roads"))
        new_doc,new_bin=city.read_glb(admitted_record(generated,ROOT/"data/prepared/surface/roads"))
        if old_doc["nodes"]!=new_doc["nodes"] or len(old_doc["meshes"])!=len(new_doc["meshes"]):
            raise ValueError(f"Native photographic road source changed baked mesh/node geometry: {record['path']}")
        for old_mesh,new_mesh in zip(old_doc["meshes"],new_doc["meshes"]):
            if len(old_mesh["primitives"])!=len(new_mesh["primitives"]):raise ValueError("Photographic road primitive count differs from raw source")
            for before,after in zip(old_mesh["primitives"],new_mesh["primitives"]):
                for key in ("POSITION","NORMAL"):
                    if accessor(old_doc,old_bin,before["attributes"][key]).tobytes()!=accessor(new_doc,new_bin,after["attributes"][key]).tobytes():raise ValueError(f"Photographic road {key} differs from raw source")
                if accessor(old_doc,old_bin,before["indices"]).tobytes()!=accessor(new_doc,new_bin,after["indices"]).tobytes():raise ValueError("Photographic road triangle indices differ from raw source")
        native_source=source_record(ROOT/generated["path"])
        native_roads.append({"source_index":index,"road_index":source_index,"source_path":generated["path"],"source":native_source,"original_source":record,"actor_label":f"City_{index:03}_{stem}","native_mesh_path":f"/Game/Surface/Roads/Tile_{index:03}/{stem}/StaticMeshes/{stem}.{stem}","triangles":sum(ref["source"]==source_index for ref in road.layer_refs)})
    _,_,_,buildings=osm_sources(base)
    rays=native_ray_samples(road,road_index,terrain_index,native_roads,output,buildings,output_directory=stage)
    inputs_after=support_generation_inventory(base)
    if inputs_before!=inputs_after:
        raise ValueError('Support constructor input inventory changed during generation; raw/photo roads, terrain/atlas/code/original network must remain exact, no manifest published')
    algorithm={**generation_code_record('support_surface.py'),'integration':generation_code_record('surface_network.py'),
               'topology':generation_code_record('support_topology.py'),'build_city':generation_code_record('build_city.py')}
    configurations={'surface_network':generation_configuration_record('surface_network.json'),
                    'city':generation_configuration_record('shibuya.json')}
    inventory_payload=encoded({'schema_version':1,'inputs_before':inputs_before,'inputs_after':inputs_after,'unchanged':True,
                              'data_bindings':generation_bindings(algorithm,configurations)})
    inventory_path=ROOT/'data/source/provenance'/f'support-input-inventory-{sha(inventory_payload)}.json'
    guarded_write(inventory_path,inventory_payload,ROOT/'data/source/provenance')
    manifest={"schema_version":2,"frame":{"glb":"metres-Xeast-Yup-Znorth","runtime":"metres-Xeast-Ynorth-Zup","unreal":"centimetres-Xeast-Ynorth-Zup"},
        "origin":base["origin"],"vertical_reference":base["vertical_reference"],
        "inputs":{"base_manifest":source_record(ROOT/"data/prepared/manifest.json"),"original_terrain":source_record(ROOT/original_record["path"]),"original_terrain_photo":config["original_terrain_photo"],"roads":road.sources,"road_photo_manifest":source_record(OUT/"road-photo-manifest.json")},
        "atlas":config["atlas"],"algorithm":algorithm,"configuration_inputs":configurations,
        "policy":config["policy"],"derived_terrain":output,"terrain_source_triangle_indices":provenance.tolist(),"native_roads":native_roads,"native_ray_samples":rays,
        "construction_policy":support_topology.construction_policy(support_geometry.UNION_CLEARANCE_M),
        "topology_provenance":{"schema_version":1,"record":ledger_record,"format":"SUPPPC01-le-u32-f32","piece_columns":list(accounting.stored_columns),"original_parent_count":len(triangles),"piece_count":len(accounting.rows),"output_triangle_count":len(rows),"exclusion_count":len(accounting.exclusions),"piece_identity":"global reconciled-piece ordinal in ascending original-parent order before introduced-line refinement","source_layer":"original-terrain-triangle","exclusion_predicates":{"exact_zero_3d":"all three rational cross components of actual packed XYZ equal zero","exact_zero_xy":"rational east/north determinant equals zero, but 3D cross is nonzero","collapsed":"packed polygon has fewer than three consecutive-distinct XYZ vertices"}},
        "source_preservation":source_record(inventory_path,ROOT/'data/source/provenance'),
        "native_assignment":{"material_path":config["native_material"],"texture_path":config["native_texture"],"original_actor_label":"City_069_terrain","original_mesh_path":"/Game/Surface/TerrainPhoto/terrain-photo/StaticMeshes/terrain-photo.terrain-photo","replacement_mesh_path":"/Game/Surface/TerrainSupport/terrain-support/StaticMeshes/terrain-support.terrain-support","replace_original_terrain_actor_only":True,"preserve_material_packages":True,"collision_source_tolerance_cm":config["native_collision_source_tolerance_cm"],"collision_requirement":"faithful full source triangles; complex capsule and ray queries; no coarse Nanite fallback or broad simple hull"},
        "evidence":{**construction,"writer_readback":readback,"original_terrain_triangles":len(triangles),"original_road_triangles":len(road.triangles),"distinct_road_geometry_triangles":len(cutting_roads),"derived_terrain_triangles":len(rows),"derived_vertices":len(unique),"area_bound":"Triangle and band areas count overlapping coplanar restoration; upper bounds, not retained/removed union area", "xy_clearance_m":support_geometry.UNION_CLEARANCE_M,"maximum_source_plane_interpolation_error_m":maximum_error,"maximum_source_uv_interpolation_error":maximum_uv_error,"nonzero_projected_triangle_normal_up_minimum":minimum_normal,"nonzero_projected_triangles_normal_up_below0_7":normal_low,"bounds_glb_m":[unique[:,[0,2,1]].min(axis=0).tolist(),unique[:,[0,2,1]].max(axis=0).tolist()],"runtime_seconds":__import__('time').perf_counter()-started},
        "attribution":[city.CONFIG["plateau"]["attribution"],CONFIG["gsi"]["attribution"]]}
    current=support_generation_inventory(base)
    if current!=inputs_before:raise ValueError('Actual source input changed after final snapshot/readback; active generation conserved')
    complete_support_generation(stage,manifest,current,len(triangles),pinned_original_terrain_record=pinned_original_terrain_record(base),
                                before_promotion=before_promotion)
    return manifest



def point_inside(point, polygon):
    x,y=point
    inside=False
    for a,b in zip(polygon,polygon[1:]+polygon[:1]):
        if (a[1]>y)!=(b[1]>y) and x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:
            inside=not inside
    return inside


def osm_tree():
    raw = guarded_read(ROOT/CONFIG["osm"]["path"],ROOT/"data/source/osm",10_000_000)
    if len(raw)!=CONFIG["osm"]["bytes"] or sha(raw)!=CONFIG["osm"]["sha256"]:
        raise ValueError("Cached OSM crop differs from admitted source; restore pinned bytes or review new source")
    return ET.fromstring(raw)


def osm_sources(base):
    tree = osm_tree()
    nodes = {int(row.attrib["id"]): row for row in tree.findall("node")}
    points = {}
    origin_height = base["origin"]["ellipsoidal_height_m"]
    for id,row in nodes.items():
        local = city.localize([city.ecef(float(row.attrib["lat"]),float(row.attrib["lon"]),origin_height)],origin_height)[0]
        points[id] = [float(local[0]),float(local[2])]
    ways = []
    buildings = []
    for row in tree.findall("way"):
        tags = {tag.attrib["k"]:tag.attrib["v"] for tag in row.findall("tag")}
        ids = [int(node.attrib["ref"]) for node in row.findall("nd")]
        if any(id not in nodes for id in ids):
            continue
        if "building" in tags and tags["building"]!="no" and len(ids)>3 and ids[0]==ids[-1]:
            buildings.append({"id":int(row.attrib["id"]),"polygon":[points[id] for id in ids[:-1]]})
        if "highway" in tags:
            ways.append({"id":int(row.attrib["id"]),"nodes":ids,"tags":tags})
    return nodes,points,ways,buildings


class TurnRestrictions:
    """Directed OSM no/only rules; unknown relevant forms block admission."""
    def __init__(self,tree):
        self.rules=[]
        self.unsupported=[]
        known={"no_left_turn","no_right_turn","no_straight_on","no_u_turn","no_entry","no_exit","only_left_turn","only_right_turn","only_straight_on","only_u_turn"}
        for relation in tree.findall("relation"):
            tags={tag.attrib["k"]:tag.attrib["v"] for tag in relation.findall("tag")}
            if not tags.get("type","").startswith("restriction"):
                continue
            members=[(m.attrib["role"],m.attrib["type"],int(m.attrib["ref"])) for m in relation.findall("member")]
            from_ways=[id for role,kind,id in members if role=="from" and kind=="way"]
            to_ways=[id for role,kind,id in members if role=="to" and kind=="way"]
            via_nodes=[id for role,kind,id in members if role=="via" and kind=="node"]
            via_ways=[id for role,kind,id in members if role=="via" and kind=="way"]
            rule=tags.get("restriction",tags.get("restriction:motorcar",tags.get("restriction:motor_vehicle","")))
            simple=(len(members)==3 and len(from_ways)==len(to_ways)==len(via_nodes)==1 and not via_ways and rule in known and not tags.get("except") and not any("conditional" in key for key in tags))
            row={"relation_id":int(relation.attrib["id"]),"rule":rule,"from_ways":from_ways,"to_ways":to_ways,"via_nodes":via_nodes,"via_ways":via_ways,"members":members,"tags":tags,"simple":simple}
            self.rules.append(row)
            if not simple:
                self.unsupported.append(row)

    def rejection(self,edge,next_edge):
        via=edge["to"]
        for row in self.rules:
            if row["simple"]:
                if edge["way_id"] not in row["from_ways"] or via not in row["via_nodes"]:
                    continue
                matching=next_edge["way_id"] in row["to_ways"]
                if row["rule"] in ("no_u_turn","only_u_turn"):
                    matching=matching and next_edge["to"]==edge["from"]
                if (row["rule"].startswith("no_") and matching) or (row["rule"].startswith("only_") and not matching):
                    return row
            else:
                # Block entry into any referenced via-way sequence from its
                # source from-way, rather than inventing sequence permission.
                if row["from_ways"] and row["via_ways"]:
                    relevant=edge["way_id"] in row["from_ways"] and next_edge["way_id"] in row["via_ways"]
                elif row["from_ways"]:
                    relevant=edge["way_id"] in row["from_ways"] and (not row["via_nodes"] or via in row["via_nodes"])
                else:
                    named_nodes={id for _,kind,id in row["members"] if kind=="node"}
                    named_ways={id for _,kind,id in row["members"] if kind=="way"}
                    relevant=via in named_nodes or edge["way_id"] in named_ways or next_edge["way_id"] in named_ways
                if relevant:
                    return row
        return None


class SupportRejection(ValueError):
    def __init__(self,reason,witness):
        super().__init__(reason)
        self.witness=witness


def admitted_elevation(base):
    """Read exact pinned DEM bytes once; missing source never fetches implicitly."""
    elevation=city.Elevation.__new__(city.Elevation)
    elevation.tiles={}
    elevation.zoom=15
    records={}
    x0,y0,x1,y1=tile_range(base["bounds"],15)
    for x in range(x0,x1+1):
        for y in range(y0,y1+1):
            url=city.CONFIG["gsi"]["dem"].format(z=15,x=x,y=y)
            record=base["source_verification"]["additional_sources"].get(url)
            if record is None:
                raise ValueError(f"Base manifest does not admit the required GSI DEM tile: {url}; source review required")
            path=admit_path(ROOT/record["path"],ROOT/"data/source/gsi/dem",regular=True)
            if not path.is_file():
                raise ValueError(f"Required admitted GSI DEM tile is missing: {path}; restore the reviewed fresh source cache")
            payload=guarded_read(path,ROOT/"data/source/gsi/dem",1_000_000)
            if sha(payload)!=record["sha256"] or len(payload)!=record["size"]:
                raise ValueError(f"Required GSI DEM bytes differ from the admitted manifest: {path}; restore pinned source or obtain new source review")
            values=[float(v) if v!="e" else float("nan") for v in payload.decode("utf8").strip().replace("\n",",").replace("\r","").split(",")]
            grid=np.array(values).reshape(256,256)
            if not np.all(np.isfinite(grid)):
                raise ValueError(f"Required GSI DEM has missing elevation values: {path}; source review required")
            elevation.tiles[x,y]=grid
            records[url]=record.copy()
    return elevation,records


@dataclass(frozen=True)
class VehicleInterval:
    start: tuple
    end: tuple
    width: float
    edges: tuple

    def covers(self,point):
        a,b=np.asarray(self.start),np.asarray(self.end)
        delta=b-a;length2=float(delta@delta)
        if length2<1e-10:return False
        t=float((np.asarray(point[:2])-a)@delta/length2)
        return -1e-8<=t<=1+1e-8 and float(np.linalg.norm(np.asarray(point[:2])-(a+t*delta)))<=self.width/2+1e-8


def vehicle_edge_key(edge):
    return (edge['way_id'],edge['from'],edge['to'])


def vehicle_polyline(edges,closed=False):
    """Keep one source context for each lane or connector interval."""
    points=[];contexts=[]
    for index,edge in enumerate(edges):
        if points:contexts.append((vehicle_edge_key(edges[index-1]),vehicle_edge_key(edge)))
        points.extend(edge['points'])
        contexts.append((vehicle_edge_key(edge),))
    if closed:
        points.append(points[0]);contexts.append((vehicle_edge_key(edges[-1]),vehicle_edge_key(edges[0])))
    return points,contexts


class Surface:
    def __init__(self,base,buildings,*,vehicle_source=None,support_path=None):
        support_path=OUT/"support-surface-manifest.json" if support_path is None else support_path
        manifest=json.loads(support_manifest_bytes(support_path))
        if type(manifest.get("schema_version")) is int and manifest["schema_version"]==3:
            support_source3.initialize(self,sys.modules[__name__],base,buildings,manifest,support_path,vehicle_source)
            return
        self.base=base
        self.vehicle_source=vehicle_source
        self.road=RoadSupport(base)
        self.elevation,self.dem_records=admitted_elevation(base)
        support_payload=support_manifest_bytes(support_path)
        self.support_manifest=json.loads(support_payload)
        manifest=self.support_manifest
        if not support_topology.json_integer(manifest.get('schema_version')) or manifest.get("schema_version") not in (1,2) or manifest.get("origin")!=base["origin"] or manifest.get("vertical_reference")!=base["vertical_reference"]:
            raise ValueError("Derived support manifest must use schema1/2 and the exact admitted origin/vertical reference")
        if manifest["inputs"]["roads"]!=self.road.sources or manifest["inputs"]["base_manifest"]["sha256"]!=CONFIG["base_manifest_sha256"]:
            raise ValueError("Derived support manifest source road/base bindings differ from current admitted source")
        if manifest["algorithm"]["sha256"]!=sha(guarded_read(ROOT/"tools/data/support_surface.py",ROOT/"tools/data",2*1024*1024)):
            raise ValueError("Derived support geometry algorithm changed; explicitly regenerate --support-only before route profiling")
        if manifest['schema_version']==2:
            support_topology.typed_record(manifest.get('source_preservation'),'source_preservation',32_000_000,True)
            preservation=json.loads(admitted_record(manifest['source_preservation'],ROOT/'data/source/provenance',32_000_000))
            current_inventory=support_generation_inventory(base)
            actual_original_terrain=support_topology.bind_original_terrain(manifest,current_inventory,pinned_original_terrain_record(base))
        admitted_record(manifest["atlas"],ROOT/"data/prepared")
        doc,binary=city.read_glb(derived_terrain_bytes(manifest["derived_terrain"]))
        if len(doc["meshes"])!=1 or any(set(node)-{"name","mesh"} for node in doc["nodes"]):
            raise ValueError("Derived support GLB requires one baked source mesh without additional node transforms")
        primitive=doc["meshes"][0]["primitives"][0]
        points=accessor(doc,binary,primitive["attributes"]["POSITION"])[:,[0,2,1]]
        indices=accessor(doc,binary,primitive["indices"]).reshape(-1,3)
        self.terrain_index=NativeTriangleIndex(points[indices])
        self.road_index=NativeTriangleIndex(self.road.triangles)
        self.terrain_sources=manifest["terrain_source_triangle_indices"]
        if len(self.terrain_sources)!=len(indices):
            raise ValueError("Derived support source triangle map must cover every output triangle")
        if manifest['schema_version']==2:
            provenance=manifest.get('topology_provenance')
            if not isinstance(provenance,dict):raise ValueError('Schema2 requires its complete topology provenance before reading ledger')
            support_topology.typed_record(provenance.get('record'),'topology.record',32_000_000,True)
            ledger=support_topology.decode_accounting(admitted_record(provenance['record'],ROOT/'data/prepared',32_000_000))
            support_topology.typed_record(manifest['inputs']['original_terrain'],'original_terrain',32_000_000,True)
            original_doc,original_binary=city.read_glb(admitted_record(actual_original_terrain,ROOT/'data/prepared',32_000_000))
            original_primitive=original_doc['meshes'][0]['primitives'][0]
            original_count=len(accessor(original_doc,original_binary,original_primitive['indices']))//3
            self.schema2_admission=support_topology.admit_schema2(manifest,preservation,ledger,points[indices],np.asarray(self.terrain_sources),
                original_parent_count=original_count,actual_vertex_count=len(points),
                actual_bounds=[points[:,[0,2,1]].min(axis=0).tolist(),points[:,[0,2,1]].max(axis=0).tolist()],
                current_inventory=current_inventory,clearance=support_geometry.UNION_CLEARANCE_M,
                pinned_original_terrain_record=actual_original_terrain,historical_code=True)
            for _,execution,field,limit in support_topology.SNAPSHOT_ROLES:
                record=(manifest['algorithm'] if field is None else manifest['algorithm'][field]) if execution.startswith('tools/') else manifest['configuration_inputs'][field]
                admitted_record(record,ROOT/'data/source/provenance',limit)
        self.support_record=source_record(support_path)
        self.derived_record=manifest["derived_terrain"]
        self.building_bins=collections.defaultdict(list)
        self.buildings=buildings
        for index,row in enumerate(buildings):
            polygon=np.asarray(row["polygon"])
            lo=np.floor(polygon.min(axis=0)/12).astype(int)
            hi=np.floor(polygon.max(axis=0)/12).astype(int)
            for x in range(lo[0],hi[0]+1):
                for y in range(lo[1],hi[1]+1):
                    self.building_bins[x,y].append(index)
        self.origin=np.array(city.ecef(base["origin"]["latitude"],base["origin"]["longitude"],base["origin"]["ellipsoidal_height_m"]))

    def dem_height(self,point):
        world=self.origin+np.array([point[0],0,point[1]])@city.local_basis()
        latitude,longitude,_=city.geodetic([world])[0]
        bounds=self.base["bounds"]
        if not (bounds["south"]<=latitude<=bounds["north"] and bounds["west"]<=longitude<=bounds["east"]):
            raise ValueError("outside-crop")
        orthometric=self.elevation.sample(latitude,longitude)
        up=city.localize([city.ecef(latitude,longitude,orthometric+self.base["vertical_reference"]["estimated_local_geoid_offset_m"])],self.base["origin"]["ellipsoidal_height_m"])[0,1]
        return float(up)

    def vehicle_interval(self,context,a,b,width):
        """Resolve only a directed ground OSM lane or its legal adjacent turn."""
        if self.vehicle_source is None or not isinstance(context,(list,tuple)) or len(context) not in (1,2):
            raise ValueError('vehicle-terrain-requires-directed-source-interval')
        points,ways,restrictions=self.vehicle_source
        edges=[]
        for key in context:
            if not isinstance(key,(list,tuple)) or len(key)!=3 or any(type(v) is not int for v in key):
                raise ValueError('vehicle-terrain-invalid-directed-edge-key')
            way_id,start,end=key;way=ways.get(way_id)
            if way is None or not allowed_way(way['tags'],'vehicle')[0]:
                raise ValueError('vehicle-terrain-source-way-not-admitted-ground-road')
            ordered=way['nodes'][::-1] if way['tags'].get('oneway')=='-1' else way['nodes']
            pairs=list(zip(ordered,ordered[1:]))
            if way['tags'].get('oneway') not in ('yes','1','true','-1') and way['tags'].get('junction')!='roundabout':
                pairs+=list(zip(ordered[1:],ordered))
            if (start,end) not in pairs:
                raise ValueError('vehicle-terrain-edge-not-in-source-direction')
            p,q=np.asarray(points[start]),np.asarray(points[end]);delta=q-p;length=float(np.linalg.norm(delta))
            if length<1:raise ValueError('vehicle-terrain-source-edge-too-short')
            offset=np.array([-delta[1],delta[0]])/length*lane_offset(way['tags'])
            edges.append({'way_id':way_id,'from':start,'to':end,'points':[(p+offset).tolist(),(q+offset).tolist()]})
        expected=edges[0]['points']
        if len(edges)==2:
            first,second=edges
            if first['to']!=second['from'] or first['from']==second['to'] or restrictions.rejection(first,second) is not None:
                raise ValueError('vehicle-terrain-turn-not-source-legal')
            expected=[first['points'][1],second['points'][0]]
        if width!=CONFIG['simulation']['vehicle_corridor_width_m'] or not np.allclose([a,b],expected,rtol=0,atol=1e-8):
            raise ValueError('vehicle-terrain-interval-does-not-match-source-lane-or-turn')
        return VehicleInterval(tuple(a),tuple(b),width,tuple(tuple(key) for key in context))

    def check(self,point,kind,*,vehicle_interval=None):
        if getattr(self,'diagnostic_counts',None) is not None:self.diagnostic_counts[f'check:{kind}']+=1
        ids=self.building_bins.get((math.floor(point[0]/12),math.floor(point[1]/12)),[])
        for index in ids:
            if point_inside(point,self.buildings[index]["polygon"]):
                raise ValueError("building-interior")
        dem=self.dem_height(point)
        road_hits=self.road_index.hits(*point[:2])
        terrain_hits=self.terrain_index.hits(*point[:2])
        supported=min(road_hits,key=lambda r:abs(r["height"]-dem)) if road_hits else None
        if supported and abs(supported["height"]-dem)>1.5:
            supported=None
        if supported:
            record={"source":"PLATEAU-road","layer_ref":self.road.layer_refs[supported["triangle"]],**supported,"dem_nearest_m":dem}
        elif kind=="vehicle" and (not isinstance(vehicle_interval,VehicleInterval) or not vehicle_interval.covers(point)):
            raise ValueError("no-admitted-road-support")
        elif terrain_hits:
            if kind=='vehicle':
                self.vehicle_interval(vehicle_interval.edges,vehicle_interval.start,vehicle_interval.end,vehicle_interval.width)
            supported=min(terrain_hits,key=lambda r:abs(r["height"]-dem))
            record={"source":"GSI-DEM5A","support_geometry":"exact-derived-triangle","layer_ref":{"kind":"terrain","triangle":supported["triangle"],"original_triangle":self.terrain_sources[supported["triangle"]]},**supported,"dem_nearest_m":dem}
            if kind=='vehicle':
                record['vehicle_source_interval']={'osm_sha256':CONFIG['osm']['sha256'],'directed_edges':[list(key) for key in vehicle_interval.edges],
                    'points':[list(vehicle_interval.start),list(vehicle_interval.end)],'width_m':vehicle_interval.width}
        else:
            raise ValueError("no-exact-rendered-terrain-support")
        if supported["normal_up_z"]<CONFIG["support_surface"]["minimum_support_normal_z"]:
            raise ValueError("source-support-normal-below-native-limit")
        for hit in road_hits+terrain_hits:
            gap=hit["height"]-supported["height"]
            if CONFIG["support_surface"]["contact_gap_m"]<gap<=CONFIG["support_surface"]["contact_ray_up_m"]:
                raise SupportRejection("stacked-rendered-support-layer",{"point":list(point),"selected":record,"conflicting_triangle":hit,"gap_m":gap})
        if getattr(self,"support_manifest",{}).get("schema_version")==3:
            record=support_source3.witness(self,sys.modules[__name__],record,point,kind,vehicle_interval)
        return [float(point[0]),float(point[1]),supported["height"]],record

    def corridor(self,polyline,kind,width,*,vehicle_contexts=None):
        if getattr(self,'diagnostic_counts',None) is not None:self.diagnostic_counts[f'corridor:{kind}']+=1
        samples=[]
        strict_native=getattr(self,"support_manifest",{}).get("schema_version")==3
        spacing=CONFIG["simulation"]["support_spacing_m"]
        if vehicle_contexts is not None and (kind!='vehicle' or len(vehicle_contexts)!=len(polyline)-1):
            raise ValueError('vehicle-terrain-context-must-cover-each-directed-interval')
        for segment,(a,b) in enumerate(zip(polyline,polyline[1:])):
            a,b=np.asarray(a[:2],dtype=float),np.asarray(b[:2],dtype=float)
            interval=None if vehicle_contexts is None else self.vehicle_interval(vehicle_contexts[segment],a,b,width)
            length=float(np.linalg.norm(b-a))
            if length==0 or (not strict_native and length<1e-5):
                continue
            normal=np.array([-(b-a)[1],(b-a)[0]])/length
            count=math.ceil(length/spacing)
            parameters=[i/count for i in range(count+1)]
            for offset in (-width/2,0,width/2):
                for mesh in (self.road_index,self.terrain_index):
                    parameters.extend(mesh.segment_breakpoints(a+normal*offset,b+normal*offset))
            parameters=sorted(set(float(t) if strict_native else round(float(t),12) for t in parameters))
            if strict_native:
                parameters=sorted(set(parameters+[(a+b)/2 for a,b in zip(parameters,parameters[1:])]))
            for t in parameters:
                centre=a+(b-a)*t
                if not strict_native and samples and np.linalg.norm(centre-np.asarray(samples[-1]["point"][:2]))<1e-7:
                    continue
                point,record=self.check(centre,kind,vehicle_interval=interval)
                if not strict_native and samples and np.linalg.norm(np.array(point[:2])-samples[-1]["point"][:2])<1e-6:
                    continue
                cross=[]
                for offset in (-width/2,0,width/2):
                    probe=centre+normal*offset
                    if offset==0 and probe.tobytes()==centre.tobytes():
                        edge,proof=point.copy(),copy.deepcopy(record)
                    else:
                        edge,proof=self.check(probe,kind,vehicle_interval=interval)
                    if abs(edge[2]-point[2])>.5:
                        raise ValueError("corridor-height-discontinuity")
                    plane=point[2]+float(np.asarray(record["gradient_enu"])@(normal*offset))
                    if abs(edge[2]-plane)>CONFIG["support_surface"]["contact_gap_m"]:
                        raise SupportRejection("corridor-contact-plane-discontinuity",{"centre":point,"offset_m":offset,"exact_edge":edge,"centre_triangle_plane_height_m":plane,"gap_m":abs(edge[2]-plane)})
                    cross.append({"offset_m":offset,"point":edge,**proof})
                if samples:
                    previous=samples[-1]["point"]
                    distance=math.dist(point[:2],previous[:2])
                    if strict_native:
                        try:support_source3.span_grade(previous,point,.2 if kind=="vehicle" else .6,
                            surface=self,previous_record=samples[-1],current_record=record)
                        except ValueError as error:
                            raise SupportRejection(str(error),{"previous":samples[-1],"current":{"point":point,"cross_section":cross,**record},"segment_xy_length_m":distance}) from error
                    if not strict_native and distance<=1e-4 and abs(point[2]-previous[2])>CONFIG["support_surface"]["contact_gap_m"]:
                        raise SupportRejection("source-mesh-edge-height-discontinuity",{"previous":samples[-1],"current":{"point":point,**record},"segment_xy_length_m":distance})
                    if not strict_native and distance>1e-4 and abs(point[2]-previous[2])/distance>(.2 if kind=="vehicle" else .6):
                        raise SupportRejection("unsupported-grade-change",{"previous":samples[-1],"current":{"point":point,"cross_section":cross,**record},"grade":abs(point[2]-previous[2])/distance,"segment_xy_length_m":distance})
                samples.append({"point":point,"cross_section":cross,**record})
        return samples


def allowed_way(tags,kind):
    if tags.get("area")=="yes" or tags.get("indoor")=="yes" or tags.get("tunnel") not in (None,"no") or tags.get("bridge") not in (None,"no"):
        return False,"area-indoor-tunnel-or-bridge"
    if tags.get("layer","0")!="0" or tags.get("level","0")!="0":
        return False,"non-ground-layer"
    if tags.get("access") in ("no","private","customers"):
        return False,"restricted-access"
    if kind=="vehicle" and any(tags.get(key+":conditional") for key in ("access","motor_vehicle","motorcar","vehicle")):
        return False,"conditional-vehicle-access-without-source-clock"
    if kind=="pedestrian":
        good=tags.get("highway") in ("footway","pedestrian","path","living_street") and tags.get("foot") not in ("no","private")
    else:
        good=tags.get("highway") in ("primary","secondary","tertiary","unclassified","residential","service","living_street","primary_link","secondary_link","tertiary_link") and tags.get("motor_vehicle") not in ("no","private","delivery") and tags.get("motorcar") not in ("no","private") and tags.get("vehicle") not in ("no","private") and tags.get("service") not in ("parking_aisle","driveway")
    return good,"unsupported-highway-or-mode-access"


def lane_offset(tags):
    # A separately mapped one-way carriageway is already the source centreline.
    # Keep a single-lane road centred; for multiple lanes use a left lane relative
    # to its directed centre. Approximate lane width is a simulation parameter,
    # not a measured lane marking; actual corridor support must still pass.
    if tags.get("oneway") in ("yes","1","true","-1"):
        try:
            lanes=int(tags.get("lanes","1"))
        except ValueError:
            lanes=1
        return max(0,min(lanes-1,2))*.9
    return CONFIG["simulation"]["vehicle_left_offset_m"]


def polyline_length(points):
    return sum(math.dist(a,b) for a,b in zip(points,points[1:]))


def return_path(adjacency,start,end,excluded_way,max_length=2000):
    heap=[(0,start,[])]
    visited={}
    while heap:
        distance,node,path=heapq.heappop(heap)
        if node==end:
            return path
        if distance>=visited.get(node,float("inf")) or distance>max_length:
            continue
        visited[node]=distance
        for edge in adjacency.get(node,[]):
            # Prohibit the initial edge's immediate reverse. Excluding the
            # entire OSM way also suppressed genuine block cycles when several
            # consecutive road segments shared one source way identifier.
            if node==start and edge["to"]==end:
                continue
            heapq.heappush(heap,(distance+edge["length"],edge["to"],path+[edge["id"]]))
    return None


def lane_cycle(turns,edges,start,max_length=2000):
    """Find a real cycle over already measured directed lane/turn states."""
    heap=[(edges[start]["length"],start,[start])]
    visited={}
    while heap:
        distance,id,path=heapq.heappop(heap)
        if distance>=visited.get(id,float("inf")) or distance>max_length:
            continue
        visited[id]=distance
        for next_id in turns.get(id,[]):
            if next_id==start and len(path)>=3:
                return path
            if next_id in path:
                continue
            heapq.heappush(heap,(distance+edges[next_id]["length"],next_id,path+[next_id]))
    return None


def directed_path(start,targets,adjacency):
    queue=collections.deque([start])
    parent={start:None}
    while queue:
        id=queue.popleft()
        if id in targets:
            result=[]
            while id is not None:
                result.append(id)
                id=parent[id]
            return result[::-1]
        for next_id in adjacency.get(id,[]):
            if next_id not in parent:
                parent[next_id]=id
                queue.append(next_id)
    return None


def edge_distance_from_crossing(edge):
    a,b=np.asarray(edge["points"],dtype=np.float64)
    delta=b-a
    t=float(np.clip(-a@delta/(delta@delta),0,1))
    return float(np.linalg.norm(a+t*delta))


def write_vehicle_graph_diagnostic(edges,turns,entries,exits,routes,rejections,boundary_rejections,boundary_details,flow_counts,bindings,*,phase='routes-selected',metrics=None,segment_refusals=None):
    """Retain computed graph even when publication succeeds below product capacity."""
    graph={key:list(turns.get(key,[])) for key in edges}
    seen=set();order=[]
    for start in graph:
        stack=[(start,False)]
        while stack:
            node,done=stack.pop()
            if done:order.append(node)
            elif node not in seen:
                seen.add(node);stack.append((node,True))
                stack.extend((child,False) for child in graph[node] if child not in seen)
    reverse={key:[] for key in graph}
    for node,targets in graph.items():
        for target in targets:reverse[target].append(node)
    seen=set();components=[]
    for start in reversed(order):
        if start in seen:continue
        component=[];stack=[start];seen.add(start)
        while stack:
            node=stack.pop();component.append(node)
            for parent in reverse[node]:
                if parent not in seen:seen.add(parent);stack.append(parent)
        components.append(component)
    central=[{'edge_id':key,'entry_path_reversed':directed_path(key,entries,reverse),
              'exit_path':directed_path(key,exits,graph)}
             for key,edge in edges.items() if edge_distance_from_crossing(edge)<30]
    record={'bound':'Computed supported graph and source bindings; not native motion or population acceptance',
            'phase':phase,'metrics':metrics,
            'bindings':bindings,'vehicle_edges':edges,'turns':graph,'turn_links':sum(map(len,graph.values())),
            'strongly_connected_components':components,'scc_sizes':sorted(map(len,components),reverse=True),
            'entries':{key:value[0] for key,value in entries.items()},
            'exits':{key:value[0] for key,value in exits.items()},'central_paths':central,
            'selected_vehicle_routes':[{key:row[key] for key in ('id','closed','source_lane_segments')} for row in routes if row['kind']=='vehicle'],
            'rejections':dict(rejections),'boundary_rejections':dict(boundary_rejections),
            'boundary_rejection_details':boundary_details,'flow_search_counts':dict(flow_counts),
            'segment_refusals':segment_refusals,'segments_complete':phase!='segments-partial',
            'turns_complete':phase!='segments-partial'}
    if phase=='segments-partial':
        record.update(turns=None,turn_links=None,strongly_connected_components=None,scc_sizes=None,central_paths=None)
    payload=encoded(record)
    if len(payload)>16*1024*1024:raise ValueError('Vehicle graph diagnostic exceeds 16 MiB; retained graph unavailable')
    directory=ROOT/'Artifacts/surface-network'
    path=directory/f"vehicle-graph-{datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')}-{os.getpid()}.json"
    guarded_write(path,payload,directory)
    print(f"Vehicle graph diagnostic: {path.relative_to(ROOT).as_posix()}",flush=True)
    return path


def boundary_endpoint(piece,entry,point,nodes,way,surface,base):
    """Source continuation plus sampled full car footprint at a crop boundary."""
    bounds=base["bounds"]
    def coordinate(id):
        return [float(nodes[id].attrib["lat"]),float(nodes[id].attrib["lon"])]
    def inside(coordinate):
        lat,lon=coordinate
        return bounds["south"]<=lat<=bounds["north"] and bounds["west"]<=lon<=bounds["east"]
    endpoint=piece["from"] if entry else piece["to"]
    ordered=way["nodes"]
    pair=next(((index,1) for index,(a,b) in enumerate(zip(ordered,ordered[1:])) if (a,b)==(piece["from"],piece["to"])),None)
    if pair is None:
        pair=next(((index+1,-1) for index,(a,b) in enumerate(zip(ordered,ordered[1:])) if (b,a)==(piece["from"],piece["to"])),None)
    if pair is None:
        raise ValueError("boundary-endpoint-missing-original-directed-way-segment")
    index,step=pair
    if not entry:
        index+=step
    continuation_step=-step if entry else step
    continuation_ids=[endpoint]
    while 0<=index+continuation_step<len(ordered):
        index+=continuation_step
        id=ordered[index]
        continuation_ids.append(id)
        if not inside(coordinate(id)):
            break
    if len(continuation_ids)<2 or inside(coordinate(continuation_ids[-1])):
        raise ValueError("boundary-original-way-does-not-continue-outside-crop")
    inside_id,outside_id=continuation_ids[-2:]
    inside_coordinate,outside_coordinate=coordinate(inside_id),coordinate(outside_id)
    crossings=[]
    for dimension,side,value in ((0,"south",bounds["south"]),(0,"north",bounds["north"]),(1,"west",bounds["west"]),(1,"east",bounds["east"])):
        delta=outside_coordinate[dimension]-inside_coordinate[dimension]
        if abs(delta)<1e-15:
            continue
        t=(value-inside_coordinate[dimension])/delta
        if 0<=t<=1:
            intersection=(np.asarray(inside_coordinate)+t*(np.asarray(outside_coordinate)-inside_coordinate)).tolist()
            if inside(intersection):
                crossings.append((t,side,intersection))
    if not crossings:
        raise ValueError("boundary-original-source-segment-does-not-cross-crop")
    _,side,intersection=min(crossings)
    origin=np.array(city.ecef(base["origin"]["latitude"],base["origin"]["longitude"],base["origin"]["ellipsoidal_height_m"]))
    latitude,longitude,height=city.geodetic(np.array([[point[0],point[2],point[1]]])@city.local_basis()+origin)[0]
    if not inside([latitude,longitude]):
        raise ValueError("boundary-supported-endpoint-is-outside-crop")
    nearest=[latitude,longitude]
    nearest[0 if side in ("south","north") else 1]=bounds[side]
    boundary_distance=float(np.linalg.norm(np.array(city.ecef(latitude,longitude,height))-city.ecef(*nearest,height)))
    if boundary_distance>20:
        raise ValueError(f"boundary-endpoint-more-than-20m-inside-crop:{boundary_distance}")
    tangent=np.asarray(piece["points"][1])-piece["points"][0]
    tangent/=np.linalg.norm(tangent)
    outward={"west":np.array([-1.,0]),"east":np.array([1.,0]),"south":np.array([0,-1.]),"north":np.array([0,1.])}[side]
    if float(tangent@outward)*(-1 if entry else 1)<=1e-6:
        raise ValueError("boundary-heading-does-not-enter-or-exit-crop")
    extension=[(np.asarray(point[:2])-2.2*tangent).tolist(),(np.asarray(point[:2])+2.2*tangent).tolist()]
    footprint=surface.corridor(extension,"vehicle",1.8)
    id=f"vehicle-boundary-flow-0-{'entry' if entry else 'exit'}"
    path=OUT/"support"/(id+".json")
    payload=encoded(footprint)
    return {"source_way_id":piece["way_id"],"source_node_id":endpoint,"point":point.copy(),"heading_enu":[*tangent.tolist(),0],"boundary_side":side,"distance_to_crop_boundary_m":boundary_distance,"point_wgs84":[latitude,longitude],"continuation":{"inside_node_id":inside_id,"outside_node_id":outside_id,"inside_wgs84":inside_coordinate,"outside_wgs84":outside_coordinate,"boundary_wgs84":intersection,"source_node_ids":continuation_ids,"source_direction":"outside-to-entry" if entry else "exit-to-outside"},"footprint":{"length_m":4.4,"width_m":1.8,"verified":True,"sample_count":len(footprint),"samples_path":path.relative_to(ROOT).as_posix(),"samples_sha256":sha(payload)}},(path,payload)


def movement_network(base,*,vehicle_graph_only=False):
    started=time.perf_counter()
    nodes,points,ways,buildings=osm_sources(base)
    restrictions=TurnRestrictions(osm_tree())
    surface=Surface(base,buildings,vehicle_source=(points,{way['id']:way for way in ways},restrictions))
    surface.diagnostic_counts=collections.Counter()
    phase_seconds={'source_and_surface_initialized':time.perf_counter()-started}
    rejections=collections.Counter()
    rejection_witnesses=[]
    routes=[]
    samples_by_route={}
    boundary_samples=[]
    physical_pedestrian_length=0
    pedestrian_segments=set()
    vehicle_edges={}
    vehicle_segment_refusals=[]
    turns=collections.defaultdict(list)
    adjacency=collections.defaultdict(list)
    signals=[]
    sim=CONFIG["simulation"]
    vehicle_attempts=0
    def retain_graph(phase,entries,exits,boundary_rejections,boundary_details,flow_counts):
        try:
            return write_vehicle_graph_diagnostic(vehicle_edges,turns,entries,exits,routes,rejections,
                boundary_rejections,boundary_details,flow_counts,
                {'osm_sha256':CONFIG['osm']['sha256'],'support_surface':surface.support_record,
                 'producer':source_record(pathlib.Path(__file__).absolute(),ROOT/'tools/data'),
                 'config':source_record(ROOT/'sources/surface_network.json',ROOT/'sources')},
                phase=phase,metrics={'vehicle_graph_only':vehicle_graph_only,'elapsed_seconds':time.perf_counter()-started,
                    'cumulative_phase_seconds':phase_seconds,'vehicle_segment_attempts':vehicle_attempts,
                    'support_queries':dict(surface.diagnostic_counts)},segment_refusals=vehicle_segment_refusals)
        except Exception as error:
            print(f"Secondary failure retaining vehicle graph diagnostic: {type(error).__name__}: {error}",file=sys.stderr,flush=True)
            return None
    def route_record(id,kind,polyline,width,tags,source_ways,closed=False,vehicle_contexts=None):
        samples=surface.corridor(polyline,kind,width,vehicle_contexts=vehicle_contexts)
        if len(samples)<2:
            raise ValueError("empty-supported-route")
        route_points=[row["point"] for row in samples]
        if closed:
            if math.dist(route_points[0],route_points[-1])>1e-6:
                raise ValueError("unverified-cycle-closure")
            route_points[-1]=route_points[0].copy()
        payload=encoded(samples)
        row={"id":id,"kind":kind,"points":route_points,"closed":closed,"speed_m_s":1.35 if kind=="pedestrian" else 6.5,"width_m":width,"source_way_ids":source_ways,"source_tags":tags,"support":{"source":"PLATEAU-road triangles and GSI DEM5A; OSM mapped ways; checked OSM building interiors","verified":True,"sample_count":len(samples),"samples_sha256":sha(payload)},"stops":[]}
        samples_by_route[id]=samples
        return row
    for way in ways:
        tags=way["tags"]
        foot,why=allowed_way(tags,"pedestrian")
        if foot and not vehicle_graph_only:
            # Split at rejected segments; never join across missing support.
            chunks=[]
            current=[]
            for a,b in zip(way["nodes"],way["nodes"][1:]):
                try:
                    surface.corridor([points[a],points[b]],"pedestrian",sim["pedestrian_corridor_width_m"])
                    if not current:
                        current=[a]
                    current.append(b)
                except (ValueError,KeyError) as error:
                    rejections[f"pedestrian-segment:{error}"]+=1
                    if len(current)>1:
                        chunks.append(current)
                    current=[]
            if len(current)>1:
                chunks.append(current)
            for index,chunk in enumerate(chunks):
                try:
                    row=route_record(f"foot-{way['id']}-{index}","pedestrian",[points[n] for n in chunk],sim["pedestrian_corridor_width_m"],tags,[way["id"]])
                    if polyline_length(row["points"])<4:
                        rejections["pedestrian-short-route"]+=1
                        del samples_by_route[row["id"]]
                        continue
                    if tags.get("footway")=="crossing" or tags.get("crossing") in ("traffic_signals","marked"):
                        signal_id="crossing-pedestrian-phase"
                        row["stops"]=[{"distance_m":0,"direction":1,"signal_id":signal_id},{"distance_m":polyline_length(row["points"]),"direction":-1,"signal_id":signal_id}]
                    for a,b in zip(chunk,chunk[1:]):
                        key=tuple(sorted((tuple(round(v,3) for v in points[a]),tuple(round(v,3) for v in points[b]))))
                        if key not in pedestrian_segments:
                            pedestrian_segments.add(key)
                            physical_pedestrian_length+=math.dist(points[a],points[b])
                    routes.append(row)
                except (ValueError,KeyError) as error:
                    rejections[f"pedestrian-route:{error}"]+=1
        elif not foot:
            rejections[f"pedestrian-way:{why}"]+=1
        cars,why=allowed_way(tags,"vehicle")
        if not cars:
            rejections[f"vehicle-way:{why}"]+=1
            continue
        ordered=list(way["nodes"])
        if tags.get("oneway")=="-1":
            ordered.reverse()
        directions=[ordered]
        if tags.get("oneway") not in ("yes","1","true","-1") and tags.get("junction")!="roundabout":
            directions.append(list(reversed(ordered)))
        for ordered in directions:
            for a,b in zip(ordered,ordered[1:]):
                delta=np.array(points[b])-points[a]
                length=float(np.linalg.norm(delta))
                if length<1:
                    continue
                offset=lane_offset(tags)
                left=np.array([-delta[1],delta[0]])/length*offset
                polyline=[(np.array(points[a])+left).tolist(),(np.array(points[b])+left).tolist()]
                vehicle_attempts+=1
                try:
                    id=f"car-edge-{way['id']}-{a}-{b}"
                    edge={"id":id,"way_id":way["id"],"from":a,"to":b,"points":polyline,"length":length,"tags":tags,"lane_offset_m":offset}
                    surface.corridor(polyline,"vehicle",sim["vehicle_corridor_width_m"],vehicle_contexts=[(vehicle_edge_key(edge),)])
                    vehicle_edges[id]=edge
                    adjacency[a].append(edge)
                except (ValueError,KeyError) as error:
                    rejections[f"vehicle-segment:{error}"]+=1
                    vehicle_segment_refusals.append({'edge_id':id,'reason':str(error),'witness':getattr(error,'witness',None)})
                    if isinstance(error,SupportRejection):
                        rejection_witnesses.append({"kind":"vehicle-segment","way_id":way["id"],"from_node":a,"to_node":b,"source_tags":tags,"polyline":polyline,**error.witness})
                if vehicle_graph_only and vehicle_attempts%100==0:
                    print(json.dumps({'vehicle_segment_attempts':vehicle_attempts,'admitted_edges':len(vehicle_edges),
                        'elapsed_seconds':time.perf_counter()-started,'support_queries':dict(surface.diagnostic_counts)}),flush=True)
                if vehicle_graph_only and vehicle_attempts%500==0:
                    retain_graph('segments-partial',{}, {}, {}, [], {})
    phase_seconds['segments_admitted']=time.perf_counter()-started
    print(f"Supported pedestrian routes: {len(routes)}, unique physical length {physical_pedestrian_length:.1f}m; directed vehicle edges {len(vehicle_edges)}",flush=True)
    for edge in vehicle_edges.values():
        for next_edge in adjacency.get(edge["to"],[]):
            if next_edge["to"]==edge["from"]:
                continue
            restriction=restrictions.rejection(edge,next_edge)
            if restriction is not None:
                rejections[f"vehicle-turn:source-restriction-{restriction['relation_id']}"]+=1
                continue
            try:
                surface.corridor([edge["points"][-1],next_edge["points"][0]],"vehicle",sim["vehicle_corridor_width_m"],
                    vehicle_contexts=[(vehicle_edge_key(edge),vehicle_edge_key(next_edge))])
                turns[edge["id"]].append(next_edge["id"])
            except ValueError as error:
                rejections[f"vehicle-turn:{error}"]+=1
    phase_seconds['turns_admitted']=time.perf_counter()-started
    retain_graph('graph-admitted',{}, {}, {}, [], {})
    used_edges=set()
    vehicle_cycle_length=0
    for edge in sorted(vehicle_edges.values(),key=lambda row:row["id"]):
        if edge["id"] in used_edges:
            continue
        found=lane_cycle(turns,vehicle_edges,edge["id"])
        if not found:
            rejections["vehicle-edge-without-directed-cycle"]+=1
            continue
        ids=found
        cycle=[vehicle_edges[id] for id in ids]
        polyline,contexts=vehicle_polyline(cycle,closed=True)
        try:
            row=route_record(f"vehicle-loop-{len([r for r in routes if r['kind']=='vehicle'])}","vehicle",polyline,sim["vehicle_corridor_width_m"],{"driving_side":"left","geometry":"source-directed block cycle with measured lane connectors"},[piece["way_id"] for piece in cycle],True,contexts)
            row["source_lane_segments"]=[{"way_id":piece["way_id"],"from_osm_node":piece["from"],"to_osm_node":piece["to"],"lane_points":piece["points"],"left_offset_m":piece["lane_offset_m"]} for piece in cycle]
            if polyline_length(row["points"])<70:
                rejections["vehicle-cycle-too-short"]+=1
                del samples_by_route[row["id"]]
                continue
            routes.append(row)
            unique=[piece for piece in cycle if piece["id"] not in used_edges]
            vehicle_cycle_length+=sum(piece["length"] for piece in unique)
            used_edges.update(ids)
        except (ValueError,KeyError) as error:
            rejections[f"vehicle-cycle:{error}"]+=1
            if isinstance(error,SupportRejection):
                rejection_witnesses.append({"kind":"vehicle-cycle","source_way_ids":[piece["way_id"] for piece in cycle],**error.witness})
    phase_seconds['cycles_selected']=time.perf_counter()-started
    # Admit at most ONE
    # boundary flow; never close it with an invented end-to-start connector.
    reverse=collections.defaultdict(list)
    for id,choices in turns.items():
        for next_id in choices:
            reverse[next_id].append(id)
    way_by_id={way["id"]:way for way in ways}
    entries={}
    exits={}
    boundary_rejections=collections.Counter()
    boundary_rejection_details=[]
    for id,piece in vehicle_edges.items():
        for entry,targets in ((True,entries),(False,exits)):
            try:
                point,_=surface.check(piece["points"][0 if entry else -1],"vehicle")
                targets[id]=boundary_endpoint(piece,entry,point,nodes,way_by_id[piece["way_id"]],surface,base)
            except ValueError as error:
                boundary_rejections[str(error).partition(':')[0]]+=1
                boundary_rejection_details.append({'edge_id':id,'entry':entry,'reason':str(error),'witness':getattr(error,'witness',None)})
                continue
    phase_seconds['boundary_endpoints_admitted']=time.perf_counter()-started
    flow_unique_length=0
    flow_search_counts=collections.Counter()
    for edge in sorted(vehicle_edges.values(),key=edge_distance_from_crossing):
        if edge_distance_from_crossing(edge)>=30:
            break
        flow_search_counts['central_candidates']+=1
        before=directed_path(edge["id"],entries,reverse)
        after=directed_path(edge["id"],exits,turns)
        if before is None:flow_search_counts['no_entry_path']+=1
        if after is None:flow_search_counts['no_exit_path']+=1
        if before is None or after is None:
            continue
        ids=before[::-1]+after[1:]
        if len(set(ids))!=len(ids):
            rejections["vehicle-boundary-flow-repeated-directed-edge"]+=1
            continue
        pieces=[vehicle_edges[id] for id in ids]
        try:
            polyline,contexts=vehicle_polyline(pieces)
            row=route_record("vehicle-boundary-flow-0","vehicle",polyline,sim["vehicle_corridor_width_m"],{"driving_side":"left","geometry":"legal source-directed crop entry/exit flow"},[piece["way_id"] for piece in pieces],vehicle_contexts=contexts)
            entry,entry_samples=entries[ids[0]]
            exit,exit_samples=exits[ids[-1]]
            if math.dist(entry["point"],row["points"][0])>1e-6 or math.dist(exit["point"],row["points"][-1])>1e-6:
                raise ValueError("boundary-flow-endpoint-height-does-not-match-route")
            row["boundary_flow"]={"crop_bounds":base["bounds"],"entry":entry,"exit":exit}
            row["source_lane_segments"]=[{"way_id":piece["way_id"],"from_osm_node":piece["from"],"to_osm_node":piece["to"],"lane_points":piece["points"],"left_offset_m":piece["lane_offset_m"]} for piece in pieces]
            boundary_samples=[("entry",entry_samples),("exit",exit_samples)]
            routes.append(row)
            flow_unique_length=sum(piece["length"] for piece in pieces if piece["id"] not in used_edges)
            used_edges.update(ids)
            break
        except ValueError as error:
            rejections[f"vehicle-boundary-flow:{error}"]+=1
            samples_by_route.pop("vehicle-boundary-flow-0",None)
    phase_seconds['boundary_paths_selected']=time.perf_counter()-started
    diagnostic=retain_graph('routes-selected',entries,exits,boundary_rejections,boundary_rejection_details,flow_search_counts)
    if vehicle_graph_only:
        if diagnostic is None:raise ValueError('Vehicle-only diagnostic was not retained; no movement data published')
        return diagnostic
    # One simulated scramble clock coordinates actual source crossings. Timing
    # is declared simulation; no claim that it matches Tokyo's signal program.
    crossing_points=[point for row in routes if row["kind"]=="pedestrian" and row["stops"] for point in row["points"]]
    if crossing_points:
        signals=[{"id":"crossing-pedestrian-phase","period_s":sim["signal_period_s"],"pedestrian_green_start_s":sim["pedestrian_green_start_s"],"pedestrian_green_end_s":sim["pedestrian_green_end_s"],"timing_source":"simulated; OSM maps crossing geometry and traffic-signals tags, not timings"}]
        for row in routes:
            if row["kind"]!="vehicle":
                continue
            travelled=0
            hits=[]
            for a,b in zip(row["points"],row["points"][1:]):
                if any(math.dist(a[:2],point[:2])<4 for point in crossing_points):
                    stop=max(0,travelled-9)
                    if not hits or abs(stop-hits[-1])>20:
                        hits.append(stop)
                travelled+=math.dist(a,b)
            row["stops"]=[{"distance_m":distance,"direction":1,"signal_id":"crossing-pedestrian-phase"} for distance in hits]
    ped_routes=[r for r in routes if r["kind"]=="pedestrian"]
    if not ped_routes or not any(r["kind"]=="vehicle" for r in routes):
        raise ValueError("Fresh source lacks both supported pedestrian corridors and directed vehicle cycles; source review needed")
    # Spawn on a mapped pavement rather than in a crosswalk/car lane. Check a
    # capsule-sized footprint against source building/road support; the runtime
    # still has to verify its actual native capsule volume and input behavior.
    car_points=[p for r in routes if r["kind"]=="vehicle" for p in r["points"]]
    spawn_candidates=sorted((p for r in ped_routes if not r["stops"] for p in r["points"] if math.hypot(p[0],p[1])<80),key=lambda p:math.hypot(p[0],p[1]))
    spawn=None
    for candidate in spawn_candidates:
        if any(math.dist(candidate[:2],p[:2])<3.5 for p in car_points):
            continue
        try:
            for angle in range(0,360,45):
                probe=[candidate[0]+.8*math.cos(math.radians(angle)),candidate[1]+.8*math.sin(math.radians(angle))]
                supported,_=surface.check(probe,"pedestrian")
                if abs(supported[2]-candidate[2])>.3:
                    raise ValueError("spawn-footprint-height-change")
            spawn=candidate
            break
        except ValueError:
            continue
    if spawn is None:
        raise ValueError("No mapped supported crossing-side pavement fits the walking spawn footprint; native/source review required")
    support_paths=[]
    for row in routes:
        path=OUT/"support"/(row["id"]+".json")
        guarded_write(path,encoded(samples_by_route[row["id"]]))
        support_paths.append({"route_id":row["id"],**source_record(path)})
    source_payload=encoded({"base":CONFIG["base_manifest_sha256"],"osm":CONFIG["osm"]["sha256"],"roads":surface.road.sources,"dem":surface.dem_records,"support_surface":surface.support_record,"derived_terrain":surface.derived_record})
    source_path=OUT/"movement-source-manifest.json"
    guarded_write(source_path,source_payload)
    source_digest=sha(source_payload)
    boundary_support_paths=[]
    for endpoint,(path,payload) in boundary_samples:
        guarded_write(path,payload)
        boundary_support_paths.append({"route_id":"vehicle-boundary-flow-0","endpoint":endpoint,**source_record(path)})
    for row in routes:
        if "boundary_flow" in row:
            row["boundary_flow"]["source_manifest_sha256"]=source_digest
    network={"schema_version":1,"frame":"local-east-north-up","units":"metres","origin":city.CONFIG["origin"],"seed":sim["seed"],"source_manifest_sha256":source_digest,"routes":routes,"signals":signals,"default_population":{"pedestrian_count":3000,"vehicle_count":200},"default_spawn":spawn,"spawn_yaw_degrees":math.degrees(math.atan2(-spawn[1],-spawn[0])),"population_support":{"unique_pedestrian_corridor_length_m":physical_pedestrian_length,"pedestrian_corridor_width_m":sim["pedestrian_corridor_width_m"],"unique_vehicle_cycle_lane_length_m":vehicle_cycle_length,"unique_vehicle_lane_length_m":vehicle_cycle_length+flow_unique_length,"vehicle_static_spacing_m":6.4,"vehicle_length_m":4.4,"vehicle_static_gap_m":2,"vehicle_unique_lane_static_capacity":math.floor((vehicle_cycle_length+flow_unique_length)/6.4),"note":"Length and static capacity are bounds, not moving/queue capacity measurements. Closed cycles and the one boundary flow can share edges; runtime must enforce physical following and crowd occupancy across route IDs. Pedestrian length deduplicates coincident OSM segments at millimetre resolution, not adjacent crossing footprints."}}
    path=OUT/"movement-network.json"
    guarded_write(path,encoded(network))
    return {"network":source_record(path),"source_manifest_sha256":source_digest,"source_manifest":source_record(source_path),"source_osm":{**CONFIG["osm"],"building_polygons":len(buildings),"highway_ways":len(ways)},"turn_restrictions":{"source_count":len(restrictions.rules),"simple_count":len(restrictions.rules)-len(restrictions.unsupported),"unsupported_conservatively_blocked":restrictions.unsupported,"policy":"Apply directed no/only via-node restrictions before lane-cycle selection including closure; reject affected transitions for unsupported conditional/via-way/incomplete forms."},"source_roads":surface.road.sources,"source_dem":surface.dem_records,"support_samples":support_paths,"boundary_support_samples":boundary_support_paths,"support_spacing_m":sim["support_spacing_m"],"corridor_measurement":"Centre and both width edges sampled at <=1.5m; full source-width interior every sample <=1m cross-spacing. Building interiors and unknown road surfaces fail admission.","rejections":dict(sorted(rejections.items())),"rejection_witnesses":rejection_witnesses,"totals":{"pedestrian_routes":len(ped_routes),"vehicle_routes":sum(r["kind"]=="vehicle" for r in routes),"vehicle_closed_routes":sum(r["kind"]=="vehicle" and r["closed"] for r in routes),"vehicle_boundary_flows":sum("boundary_flow" in r for r in routes),"support_samples":sum(len(samples_by_route[r["id"]]) for r in routes),**network["population_support"]},"vertical_reference":base["vertical_reference"],"default_spawn":spawn,"attribution":[CONFIG["osm"]["attribution"],city.CONFIG["plateau"]["attribution"],city.CONFIG["gsi"]["attribution"]],"scope":"Approximate local surface support, OSM source paths and simulated signal timing; not survey-grade or a navigation product."}


def reprofile_frozen_network(base):
    """Keep admitted legal XY/order/IDs; return every refusal before publishing."""
    import copy
    config=CONFIG["support_surface"]
    original=json.loads(admitted_record(config["frozen_network"],ROOT/"data/source",10_000_000))
    original_movement=json.loads(admitted_record(config["frozen_movement_manifest"],ROOT/"data/source",1_000_000))["movement"]
    original_sources=json.loads(admitted_record(config["frozen_source_manifest"],ROOT/"data/source",1_000_000))
    if original["source_manifest_sha256"]!=config["frozen_source_manifest"]["sha256"] or original_sources["base"]!=CONFIG["base_manifest_sha256"]:
        raise ValueError("Frozen route source/base receipt differs from its pinned reprofiling inputs")
    nodes,source_points,ways,buildings=osm_sources(base)
    way_by_id={way["id"]:way for way in ways}
    restrictions=TurnRestrictions(osm_tree())
    surface=Surface(base,buildings,vehicle_source=(source_points,way_by_id,restrictions))
    network=copy.deepcopy(original)
    samples_by_route={};refusals=[];boundary_samples=[]
    for number,row in enumerate(network["routes"]):
        try:
            if row["kind"]=="vehicle":
                legal_points,contexts,edges=support_source3.frozen_vehicle_path(sys.modules[__name__],row,surface)
                samples=surface.corridor(legal_points,"vehicle",row["width_m"],vehicle_contexts=contexts)
            else:
                samples=surface.corridor(row["points"],row["kind"],row["width_m"])
            points=[sample["point"] for sample in samples]
            if len(points)<2:raise ValueError("empty-supported-route")
            if row["closed"]:
                if math.dist(points[0],points[-1])>1e-6:raise ValueError("source-cycle-closure-differed-after-profiling")
                points[-1]=points[0].copy()
            old_points=row["points"]
            # Stop locations retain their old mapped XY along the same source
            # polyline; only their cumulative distance changes with real height.
            old_lengths=[0.];new_lengths=[0.]
            for a,b in zip(old_points,old_points[1:]):old_lengths.append(old_lengths[-1]+math.dist(a,b))
            for a,b in zip(points,points[1:]):new_lengths.append(new_lengths[-1]+math.dist(a,b))
            for stop in row["stops"]:
                index=min(len(old_points)-2,max(0,next((i for i in range(len(old_points)-1) if old_lengths[i+1]>=stop["distance_m"]),len(old_points)-2)))
                span=old_lengths[index+1]-old_lengths[index]
                fraction=0 if span==0 else (stop["distance_m"]-old_lengths[index])/span
                xy=np.asarray(old_points[index][:2])+(np.asarray(old_points[index+1][:2])-old_points[index][:2])*fraction
                best=None
                for i,(a,b) in enumerate(zip(points,points[1:])):
                    a,b=np.asarray(a[:2]),np.asarray(b[:2]);delta=b-a;denominator=float(delta@delta)
                    t=0 if denominator==0 else min(1,max(0,float((xy-a)@delta/denominator)))
                    error=float(np.linalg.norm(a+t*delta-xy));candidate=(error,new_lengths[i]+t*(new_lengths[i+1]-new_lengths[i]))
                    if best is None or candidate<best:best=candidate
                if best[0]>1e-5:raise ValueError("original-signal-stop-XY-not-on-reprofiled-source-path")
                stop["distance_m"]=best[1]
            row["points"]=points
            row["support"]={"source":"Exact admitted PLATEAU road/GSI derived terrain triangles; original legal XY plus facet edge subdivisions","verified":True,"sample_count":len(samples),"samples_sha256":sha(encoded(samples)),"support_surface_sha256":surface.support_record["sha256"]}
            samples_by_route[row["id"]]=samples
            if "boundary_flow" in row:
                for endpoint,index in (("entry",0),("exit",-1)):
                    edge=edges[index]
                    admitted,(unused_path,payload)=boundary_endpoint(edge,endpoint=="entry",points[index],nodes,way_by_id[edge["way_id"]],surface,base)
                    path=OUT/"support"/f"{row['id']}-{endpoint}.json"
                    admitted["footprint"]["samples_path"]=path.relative_to(ROOT).as_posix()
                    row["boundary_flow"][endpoint]=admitted
                    boundary_samples.append((row["id"],endpoint,path,payload))
        except ValueError as error:
            refusals.append({"route_id":row["id"],"kind":row["kind"],"reason":str(error),"witness":getattr(error,"witness",None)})
        if (number+1)%50==0:
            print(f"Frozen route profiles: {number+1}/{len(network['routes'])}; refusals={len(refusals)}",flush=True)
    diagnostics={"schema_version":1,"original_network":config["frozen_network"],"original_movement_manifest":config["frozen_movement_manifest"],"original_source_manifest":config["frozen_source_manifest"],"support_surface":surface.support_record,"derived_terrain":surface.derived_record,"original_route_count":len(original["routes"]),"successful_route_count":len(samples_by_route),"refusal_count":len(refusals),"refusals":refusals,"bound":"All frozen route IDs/order/XY are retained. Refusals prevent publication; no silent route removal, splitting or rerouting. Source mesh-edge subdivisions preserve the original straight legal XY segments."}
    guarded_write(OUT/"support-reprofile-report.json",encoded(diagnostics))
    if refusals:
        raise ValueError(f"Exact source support refused {len(refusals)} of {len(original['routes'])} frozen routes; inspect data/prepared/surface/support-reprofile-report.json before any admission change")
    source_metadata={**original_sources,"support_surface":surface.support_record,"derived_terrain":surface.derived_record,"original_network":config["frozen_network"]}
    if surface.support_manifest["schema_version"]==3:
        source_metadata.update(roads=[r["source"] for r in surface.support_manifest["native_roads"]],raw_roads=surface.support_manifest["inputs"]["roads"])
    source_payload=encoded(source_metadata)
    source_path=OUT/"movement-source-manifest.json";source_digest=sha(source_payload)
    support_paths=[];boundary_paths=[]
    for row in network["routes"]:
        path=OUT/"support"/(row["id"]+".json");guarded_write(path,encoded(samples_by_route[row["id"]]));support_paths.append({"route_id":row["id"],**source_record(path)})
        if "boundary_flow" in row:row["boundary_flow"]["source_manifest_sha256"]=source_digest
    for route_id,endpoint,path,payload in boundary_samples:
        guarded_write(path,payload);boundary_paths.append({"route_id":route_id,"endpoint":endpoint,**source_record(path)})
    network["source_manifest_sha256"]=source_digest
    network["default_spawn"]=surface.check(network["default_spawn"][:2],"pedestrian")[0]
    guarded_write(source_path,source_payload)
    path=OUT/"movement-network.json";guarded_write(path,encoded(network))
    movement=copy.deepcopy(original_movement)
    movement.update({"network":source_record(path),"source_manifest_sha256":source_digest,"source_manifest":source_record(source_path),"support_samples":support_paths,"boundary_support_samples":boundary_paths,"support_surface":surface.support_record,"derived_terrain":surface.derived_record,"original_network":config["frozen_network"],"reprofile_inputs":{"original_movement_manifest":config["frozen_movement_manifest"],"original_source_manifest":config["frozen_source_manifest"]},"default_spawn":network["default_spawn"],"corridor_measurement":"Original legal XY/route order with actual source triangle-edge subdivisions and<=1.5m spacing; centre/right/left exact triangle/barycentric refs, full original width, grade and source/contact plane admission."})
    if surface.support_manifest["schema_version"]==3:
        movement["source_roads"]=source_metadata["roads"]
        movement["source_raw_roads"]=source_metadata["raw_roads"]
    movement["totals"]["support_samples"]=sum(len(s) for s in samples_by_route.values())
    return movement


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fetch",action="store_true",help="Explicitly fetch missing admitted source; no implicit downloads")
    parser.add_argument("--terrain",type=pathlib.Path,default=ROOT/"data/prepared/terrain.glb")
    parser.add_argument("--support-construction-seconds",type=float,default=DEFAULT_SUPPORT_CONSTRUCTION_SECONDS,
                        help="Offline support clipping limit in seconds; default110")
    parser.add_argument("--support-total-seconds",type=float,default=DEFAULT_SUPPORT_TOTAL_SECONDS,
                        help="Cumulative offline support preparation limit in seconds; default150, maximum600")
    parser.add_argument("--support-edits",type=pathlib.Path,help="Explicit confined Source3 local edit ledger; requires --support-only")
    modes=parser.add_mutually_exclusive_group()
    modes.add_argument("--photo-only",action="store_true")
    modes.add_argument("--network-only",action="store_true",help="Build movement files without changing frozen photographic artifacts")
    modes.add_argument("--vehicle-graph-only",action="store_true",help="Diagnose normal vehicle admission without pedestrians or movement publication")
    modes.add_argument("--roads-only",action="store_true",help="Build UV-bearing shared-atlas road GLBs without changing frozen photographs")
    modes.add_argument("--support-only",action="store_true",help="Build only source-reconciled terrain and its exact source manifest")
    modes.add_argument("--reprofile-frozen",action="store_true",help="Keep frozen route IDs/order/legal XY and regenerate exact triangle profiles; refuse all admission failures")
    args=parser.parse_args(argv)
    if args.support_edits is not None and not args.support_only:
        parser.error("--support-edits requires --support-only")
    construction_seconds,total_seconds=support_execution_budget(args.support_construction_seconds,args.support_total_seconds)
    admit_path(OUT,ROOT/"data/prepared")
    if not any((args.network_only,args.vehicle_graph_only,args.roads_only,args.support_only,args.reprofile_frozen)):
        admit_path(args.terrain,ROOT/"data/prepared",regular=True)
    if args.fetch:
        fetch_sources()
    base=verify_base(ROOT/"data/prepared/manifest.json")
    if args.vehicle_graph_only:
        movement_network(base,vehicle_graph_only=True)
        return
    if args.support_only:
        result=(support_source3.prepare(sys.modules[__name__],base,args.support_edits,total_seconds=total_seconds)
                if args.support_edits is not None else prepare_support_surface(base,construction_seconds=construction_seconds,total_seconds=total_seconds))
        print(json.dumps(result["evidence"],indent=2),flush=True)
        return
    if args.roads_only:
        result=road_photos(base)
        print(json.dumps(result["totals"],indent=2),flush=True)
        return
    if not args.network_only and not args.reprofile_frozen:
        photo=photo_ground(base,args.terrain)
        manifest={"schema_version":1,"built_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"photo_ground":photo,"source_config_sha256":sha(guarded_read(ROOT/"sources/surface_network.json",ROOT/"sources",100_000))}
        guarded_write(OUT/"surface-manifest.json",encoded(manifest))
        print(json.dumps({"photo_ground":photo["terrain_photo"],"image":photo["image"],"tiles":len(photo["imagery_tiles"])},indent=2),flush=True)
    if not args.photo_only:
        if not args.network_only and not args.reprofile_frozen:
            prepare_support_surface(base,construction_seconds=construction_seconds,total_seconds=total_seconds)
        movement=reprofile_frozen_network(base) if args.reprofile_frozen else movement_network(base)
        movement_manifest={"schema_version":1,"built_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"movement":movement,"source_config_sha256":sha(guarded_read(ROOT/"sources/surface_network.json",ROOT/"sources",100_000))}
        guarded_write(OUT/"movement-manifest.json",encoded(movement_manifest))
        print(json.dumps(movement["totals"],indent=2),flush=True)


if __name__=="__main__":
    main()
