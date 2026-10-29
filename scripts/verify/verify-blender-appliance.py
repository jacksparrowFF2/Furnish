"""Verify Furnish's exported pilot in real Blender without touching a live project."""
import bpy
import json
import pathlib
import sys
import math

run = pathlib.Path(sys.argv[sys.argv.index('--')+1])
expected = 12 if '--bookcase' in sys.argv else 29
results = []
for mode in ('http', 'file'):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(run/(mode+'-scene.glb')))
    parts = [obj for obj in bpy.context.scene.objects if obj.get('furnishId') == 'blender-pilot']
    assert len(parts) == expected, len(parts)
    keys = [obj['furnishPartKey'] for obj in parts]
    assert len(set(keys)) == len(keys)
    assert all(obj.type == 'MESH' and obj.get('furnishPartVersion') == 3 for obj in parts)
    assert all(obj.data.materials for obj in parts)
    details = {'mode': mode, 'parts': len(parts), 'stableKeys': len(set(keys))}
    if expected == 12:
        bpy.context.view_layer.update()
        points = [obj.matrix_world @ v.co for obj in parts for v in obj.data.vertices]
        span = [max(p[k] for p in points)-min(p[k] for p in points) for k in range(3)]
        angle = math.radians(37)
        bounds = (1.5*math.cos(angle)+.3*math.sin(angle),1.5*math.sin(angle)+.3*math.cos(angle),.9)
        assert abs(span[2]-.9) < 1e-5, span
        # Rounded edges stay inside the nominal rotated rectangular envelope.
        assert all(want-.012 < actual < want+1e-5 for actual,want in zip(span,bounds)), span
        details['worldSizeMm'] = [round(v*1000,3) for v in span]
    results.append(details)
bpy.ops.wm.save_as_mainfile(filepath=str(run/'furnish-roundtrip.blend'))
(run/'blender-result.json').write_text(json.dumps({'passed': True, 'blender': bpy.app.version_string, 'results': results}, indent=2), encoding='utf-8')
