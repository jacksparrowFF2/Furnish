"""Independent readback of a production-scene GLB against the Three manifest."""
import bpy
import hashlib
import json
import sys
from pathlib import Path
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
glb, manifest, report = map(Path, args)
expected = json.loads(manifest.read_text(encoding='utf-8'))['records']
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(glb))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
maximum = 0
for record in expected:
    matches = [o for o in meshes if o.get('furnishId') == record['id'] and o.get('furnishPartKey') == record['key']]
    assert len(matches) == 1, (record['id'], record['key'], len(matches))
    obj = matches[0]
    vertices = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    actual = [min(v[i] for v in vertices) for i in range(3)] + [max(v[i] for v in vertices) for i in range(3)]
    x0, y0, z0, x1, y1, z1 = record['bounds']
    target = [x0, -z1, y0, x1, -z0, y1]
    maximum = max(maximum, *(abs(a - b) * 1000 for a, b in zip(actual, target)))
assert maximum < .05, maximum
assert len([o for o in meshes if o.get('furnishId') in {r['id'] for r in expected}]) == len(expected)
result = {'passed': True, 'blender': bpy.app.version_string, 'executable': bpy.app.binary_path,
          'parts': len(expected), 'maxMm': maximum,
          'glbSha256': hashlib.sha256(glb.read_bytes()).hexdigest(),
          'manifestSha256': hashlib.sha256(manifest.read_bytes()).hexdigest()}
report.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(result, ensure_ascii=False))
