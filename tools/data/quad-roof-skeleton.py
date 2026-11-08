"""Offline topology only; invoked by build-quad-roofs.mjs with a verified wheel."""
import json
import sys

sys.path.insert(0, sys.argv[1])
from py_straight_skeleton import compute_skeleton

result = []
for case in json.load(sys.stdin):
    skeleton = compute_skeleton(exterior=case['rings'][0], holes=case['rings'][1:])
    result.append({'id': case['id'], 'vertices': [[node.position.x, node.position.y, node.time] for node in skeleton.nodes], 'faces': [face[:-1] for face in skeleton.get_faces()]})
json.dump(result, sys.stdout)
