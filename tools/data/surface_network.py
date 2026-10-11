"""Fresh GSI photo ground and source-supported OSM movement paths.

Bound: admitted static source geometry, not surveyed placement or native motion.
No implicit remote fetch, generated imagery or invented last-to-first shortcuts.
"""
from __future__ import annotations

import argparse
import collections
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
import urllib.request
import xml.etree.ElementTree as ET

ROOT = pathlib.Path(__file__).absolute().parents[2]


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
import numpy as np
from PIL import Image

CONFIG = json.loads(guarded_read(ROOT/"sources/surface_network.json",ROOT/"sources",100_000))
OUT = ROOT / "data/prepared/surface"


def sha(payload):
    return hashlib.sha256(payload).hexdigest()


def encoded(value):
    return (json.dumps(value, separators=(",", ":"), ensure_ascii=False) + "\n").encode("utf8")


def source_record(path):
    payload = guarded_read(path)
    return {"path": path.relative_to(ROOT).as_posix(), "bytes": len(payload), "sha256": sha(payload)}


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


def save_glb(writer,path):
    """Same core GLB serialization as the base writer, through guarded output."""
    city.validate_native_textures(writer.doc,writer.binary)
    writer.doc["buffers"][0]["byteLength"]=len(writer.binary)
    document=json.dumps(writer.doc,separators=(",",":")).encode("utf8")
    document+=b" "*(-len(document)%4)
    writer.binary.extend(b"\0"*(-len(writer.binary)%4))
    size=28+len(document)+len(writer.binary)
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
        for row in base["outputs"]:
            if row["kind"] != "roads":
                continue
            path = ROOT / row["path"]
            payload = guarded_read(path,ROOT/"data/prepared/roads")
            if sha(payload) != row["sha256"]:
                raise ValueError(f"Prepared road source differs from admitted bytes: {path}")
            doc, binary = city.read_glb(payload)
            self.sources.append(source_record(path))
            for mesh in doc["meshes"]:
                for primitive in mesh["primitives"]:
                    points = accessor(doc,binary,primitive["attributes"]["POSITION"])[:, [0,2,1]]
                    indices = accessor(doc,binary,primitive["indices"]).reshape(-1,3)
                    for triangle in points[indices]:
                        index = len(self.triangles)
                        self.triangles.append(triangle)
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


class Surface:
    def __init__(self,base,buildings):
        self.base=base
        self.road=RoadSupport(base)
        self.elevation,self.dem_records=admitted_elevation(base)
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

    def check(self,point,kind):
        ids=self.building_bins.get((math.floor(point[0]/12),math.floor(point[1]/12)),[])
        for index in ids:
            if point_inside(point,self.buildings[index]["polygon"]):
                raise ValueError("building-interior")
        dem=self.dem_height(point)
        supported=self.road.height(point[0],point[1],dem)
        if supported:
            height,index,barycentric=supported
            return [float(point[0]),float(point[1]),height],{"source":"PLATEAU-road","triangle":index,"barycentric":barycentric,"dem_nearest_m":dem}
        if kind=="vehicle":
            raise ValueError("no-admitted-road-support")
        return [float(point[0]),float(point[1]),dem],{"source":"GSI-DEM5A","orthometric_to_local":"reviewed approximate calibration"}

    def corridor(self,polyline,kind,width):
        samples=[]
        spacing=CONFIG["simulation"]["support_spacing_m"]
        for a,b in zip(polyline,polyline[1:]):
            a,b=np.asarray(a[:2],dtype=float),np.asarray(b[:2],dtype=float)
            length=float(np.linalg.norm(b-a))
            if length<1e-5:
                continue
            normal=np.array([-(b-a)[1],(b-a)[0]])/length
            count=math.ceil(length/spacing)
            for i in range(count+1):
                centre=a+(b-a)*i/count
                point,record=self.check(centre,kind)
                if samples and np.linalg.norm(np.array(point[:2])-samples[-1]["point"][:2])<1e-6:
                    continue
                cross=[]
                for offset in (-width/2,0,width/2):
                    edge,proof=self.check(centre+normal*offset,kind)
                    if abs(edge[2]-point[2])>.5:
                        raise ValueError("corridor-height-discontinuity")
                    cross.append({"offset_m":offset,"point":edge,**proof})
                if samples:
                    previous=samples[-1]["point"]
                    distance=math.dist(point[:2],previous[:2])
                    if distance>1e-4 and abs(point[2]-previous[2])/distance>(.2 if kind=="vehicle" else .6):
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


def movement_network(base):
    nodes,points,ways,buildings=osm_sources(base)
    restrictions=TurnRestrictions(osm_tree())
    surface=Surface(base,buildings)
    rejections=collections.Counter()
    rejection_witnesses=[]
    routes=[]
    samples_by_route={}
    boundary_samples=[]
    physical_pedestrian_length=0
    pedestrian_segments=set()
    vehicle_edges={}
    adjacency=collections.defaultdict(list)
    signals=[]
    sim=CONFIG["simulation"]
    def route_record(id,kind,polyline,width,tags,source_ways,closed=False):
        samples=surface.corridor(polyline,kind,width)
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
        if foot:
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
        else:
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
                try:
                    surface.corridor(polyline,"vehicle",sim["vehicle_corridor_width_m"])
                    id=f"car-edge-{way['id']}-{a}-{b}"
                    edge={"id":id,"way_id":way["id"],"from":a,"to":b,"points":polyline,"length":length,"tags":tags,"lane_offset_m":offset}
                    vehicle_edges[id]=edge
                    adjacency[a].append(edge)
                except (ValueError,KeyError) as error:
                    rejections[f"vehicle-segment:{error}"]+=1
                    if isinstance(error,SupportRejection):
                        rejection_witnesses.append({"kind":"vehicle-segment","way_id":way["id"],"from_node":a,"to_node":b,"source_tags":tags,"polyline":polyline,**error.witness})
    print(f"Supported pedestrian routes: {len(routes)}, unique physical length {physical_pedestrian_length:.1f}m; directed vehicle edges {len(vehicle_edges)}",flush=True)
    turns=collections.defaultdict(list)
    for edge in vehicle_edges.values():
        for next_edge in adjacency.get(edge["to"],[]):
            if next_edge["to"]==edge["from"]:
                continue
            restriction=restrictions.rejection(edge,next_edge)
            if restriction is not None:
                rejections[f"vehicle-turn:source-restriction-{restriction['relation_id']}"]+=1
                continue
            try:
                surface.corridor([edge["points"][-1],next_edge["points"][0]],"vehicle",sim["vehicle_corridor_width_m"])
                turns[edge["id"]].append(next_edge["id"])
            except ValueError as error:
                rejections[f"vehicle-turn:{error}"]+=1
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
        polyline=[]
        for piece in cycle:
            polyline.extend(piece["points"])
        polyline.append(polyline[0])
        try:
            row=route_record(f"vehicle-loop-{len([r for r in routes if r['kind']=='vehicle'])}","vehicle",polyline,sim["vehicle_corridor_width_m"],{"driving_side":"left","geometry":"source-directed block cycle with measured lane connectors"},[piece["way_id"] for piece in cycle],True)
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
    # The legal supported graph has no central SCC cycle. Admit at most ONE
    # boundary flow; never close it with an invented end-to-start connector.
    reverse=collections.defaultdict(list)
    for id,choices in turns.items():
        for next_id in choices:
            reverse[next_id].append(id)
    way_by_id={way["id"]:way for way in ways}
    entries={}
    exits={}
    for id,piece in vehicle_edges.items():
        for entry,targets in ((True,entries),(False,exits)):
            try:
                point,_=surface.check(piece["points"][0 if entry else -1],"vehicle")
                targets[id]=boundary_endpoint(piece,entry,point,nodes,way_by_id[piece["way_id"]],surface,base)
            except ValueError:
                continue
    flow_unique_length=0
    for edge in sorted(vehicle_edges.values(),key=edge_distance_from_crossing):
        if edge_distance_from_crossing(edge)>=30:
            break
        before=directed_path(edge["id"],entries,reverse)
        after=directed_path(edge["id"],exits,turns)
        if before is None or after is None:
            continue
        ids=before[::-1]+after[1:]
        if len(set(ids))!=len(ids):
            rejections["vehicle-boundary-flow-repeated-directed-edge"]+=1
            continue
        pieces=[vehicle_edges[id] for id in ids]
        try:
            row=route_record("vehicle-boundary-flow-0","vehicle",[point for piece in pieces for point in piece["points"]],sim["vehicle_corridor_width_m"],{"driving_side":"left","geometry":"legal source-directed crop entry/exit flow"},[piece["way_id"] for piece in pieces])
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
    source_payload=encoded({"base":CONFIG["base_manifest_sha256"],"osm":CONFIG["osm"]["sha256"],"roads":surface.road.sources,"dem":surface.dem_records})
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


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--fetch",action="store_true",help="Explicitly fetch missing admitted source; no implicit downloads")
    parser.add_argument("--terrain",type=pathlib.Path,default=ROOT/"data/prepared/terrain.glb")
    modes=parser.add_mutually_exclusive_group()
    modes.add_argument("--photo-only",action="store_true")
    modes.add_argument("--network-only",action="store_true",help="Build movement files without changing frozen photographic artifacts")
    modes.add_argument("--roads-only",action="store_true",help="Build UV-bearing shared-atlas road GLBs without changing frozen photographs")
    args=parser.parse_args(argv)
    admit_path(OUT,ROOT/"data/prepared")
    if not args.network_only and not args.roads_only:
        admit_path(args.terrain,ROOT/"data/prepared",regular=True)
    if args.fetch:
        fetch_sources()
    base=verify_base(ROOT/"data/prepared/manifest.json")
    if args.roads_only:
        result=road_photos(base)
        print(json.dumps(result["totals"],indent=2),flush=True)
        return
    if not args.network_only:
        photo=photo_ground(base,args.terrain)
        manifest={"schema_version":1,"built_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"photo_ground":photo,"source_config_sha256":sha(guarded_read(ROOT/"sources/surface_network.json",ROOT/"sources",100_000))}
        guarded_write(OUT/"surface-manifest.json",encoded(manifest))
        print(json.dumps({"photo_ground":photo["terrain_photo"],"image":photo["image"],"tiles":len(photo["imagery_tiles"])},indent=2),flush=True)
    if not args.photo_only:
        movement=movement_network(base)
        movement_manifest={"schema_version":1,"built_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"movement":movement,"source_config_sha256":sha(guarded_read(ROOT/"sources/surface_network.json",ROOT/"sources",100_000))}
        guarded_write(OUT/"movement-manifest.json",encoded(movement_manifest))
        print(json.dumps(movement["totals"],indent=2),flush=True)


if __name__=="__main__":
    main()
