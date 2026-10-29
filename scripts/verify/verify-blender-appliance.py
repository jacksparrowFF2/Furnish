"""Verify Furnish's exported pilot in real Blender without touching a live project."""
import bpy
import json
import pathlib
import sys

run = pathlib.Path(sys.argv[sys.argv.index('--')+1])
results = []
for mode in ('http', 'file'):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(run/(mode+'-scene.glb')))
    parts = [obj for obj in bpy.context.scene.objects if obj.get('furnishId') == 'blender-pilot']
    assert len(parts) == 29, len(parts)
    keys = [obj['furnishPartKey'] for obj in parts]
    assert len(set(keys)) == len(keys)
    assert all(obj.type == 'MESH' and obj.get('furnishPartVersion') == 3 for obj in parts)
    assert all(obj.data.materials for obj in parts)
    results.append({'mode': mode, 'parts': len(parts), 'stableKeys': len(set(keys))})
bpy.ops.wm.save_as_mainfile(filepath=str(run/'furnish-roundtrip.blend'))
(run/'blender-result.json').write_text(json.dumps({'passed': True, 'blender': bpy.app.version_string, 'results': results}, indent=2), encoding='utf-8')
