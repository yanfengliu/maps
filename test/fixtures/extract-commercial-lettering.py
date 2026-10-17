"""Extract two small raw RGB fields from the pinned embedded PLATEAU atlas.

Run from the repository root with Python/Pillow. No network, source edits or
processed colour field is used to create the test fixture.
"""
from pathlib import Path
from hashlib import sha256
from io import BytesIO
import argparse, base64, json, struct
from PIL import Image

root = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--tileset', type=Path, default=root/'data/scene/buildings/tileset.json')
args = parser.parse_args()
raw = (root / 'data/scene/buildings/data/data518.b3dm').read_bytes()
tile_sha = '5e611688344a50142147c0c60442c893dd8f3a45b10ee264067b0275bb4fa96b'
atlas_sha = 'eed564fded549988afc20edc49a5bc67c19590c4ea53b4324eaee34ac76179fb'
assert sha256(raw).hexdigest() == tile_sha
offset = 28 + sum(struct.unpack_from('<4I', raw, 12))
glb = raw[offset:]
length = struct.unpack_from('<I', glb, 12)[0]
gltf = json.loads(glb[20:20+length])
binary = glb[28+length:]
view = gltf['bufferViews'][gltf['images'][0]['bufferView']]
atlas = binary[view.get('byteOffset', 0):view.get('byteOffset', 0)+view['byteLength']]
assert sha256(atlas).hexdigest() == atlas_sha
image = Image.open(BytesIO(atlas)).convert('RGB')
assert image.size == (4096, 4096)
tileset_bytes = args.tileset.read_bytes()
assert sha256(tileset_bytes).hexdigest() == '71b1716f6fafd028e1f6bad46fb8f7848c36f941c30d428be21828e9902b4483'
def find_leaf(tile):
    if tile.get('content', {}).get('uri') == 'data/data518.b3dm': return tile
    for child in tile.get('children', []):
        found = find_leaf(child)
        if found: return found
leaf = find_leaf(json.loads(tileset_bytes)['root'])
assert leaf and leaf.get('geometricError') == 0 and not leaf.get('children')
labels = []
for name, box, crop, band in [
    ('STARBUCKS COFFEE', [280,3483,365,3502], [282,3487,363,3499], [3487,3498,0,0]),
    ('TSUTAYA', [345,3512,394,3537], [346,3514,392,3534], [3523,3533,-.25,353]),
]:
    pixels = image.crop(box).tobytes()
    labels.append(dict(name=name, box=box, crop=crop, band=band,
                       width=box[2]-box[0], height=box[3]-box[1],
                       rgbSha256=sha256(pixels).hexdigest(), rgbBase64=base64.b64encode(pixels).decode()))
fixture = dict(sourceTileSha256=tile_sha, embeddedAtlasSha256=atlas_sha,
               sourceTilesetSha256=sha256(tileset_bytes).hexdigest(), sourceTilesetBytes=len(tileset_bytes), nativeLeaf=leaf,
               atlasDimensions=[4096,4096], encoding='base64 row-major top-to-bottom interleaved RGB uint8, sRGB encoded',
               provenance='Unaltered decoded source pixels from GLB image0 in data518; Pillow RGB extraction. No background subtraction, mask, resampling or font replacement.', labels=labels)
target = root / 'test/fixtures/commercial-lettering-source.json'
target.write_text(json.dumps(fixture, indent=2)+'\n', encoding='utf8')
print(f'{target.name}: {target.stat().st_size} bytes SHA256 {sha256(target.read_bytes()).hexdigest()}')
