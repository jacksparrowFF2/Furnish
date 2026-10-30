"""Reopen downloaded studio BLEND files, not merely the exchange GLBs."""
import bpy
import json
import pathlib
import sys

run = pathlib.Path(sys.argv[sys.argv.index('--')+1])
results = []
for view in ('front', 'oblique', 'open'):
    bpy.ops.wm.open_mainfile(filepath=str(run/'studio'/view/'scene.blend'))
    scene = bpy.context.scene
    parts = [o for o in scene.objects if o.get('furnishId') == 'blender-pilot']
    assert len(parts) == 47
    assert len({o['furnishPartKey'] for o in parts}) == 47
    glass = next(o for o in parts if o['furnishPartKey'].endswith(':door-glass'))
    node = next(n for n in glass.data.materials[0].node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    assert abs(node.inputs['Alpha'].default_value - .12) < 1e-5
    assert scene.camera and scene.render.engine == 'CYCLES'
    assert (scene.render.resolution_x, scene.render.resolution_y) == (512, 512)
    assert scene.view_settings.view_transform == 'AgX' and abs(scene.view_settings.exposure) < 1e-7
    points = [o.matrix_world @ v.co for o in parts for v in o.data.vertices]
    size = [(max(p[i] for p in points)-min(p[i] for p in points))*1000 for i in range(3)]
    if view != 'open':
        assert all(abs(a-b) < .02 for a, b in zip(size, (595, 560, 850))), size
    results.append(dict(view=view, parts=len(parts), sizeMm=size, alpha=.12,
                        device=scene.cycles.device, samples=scene.cycles.samples))
(run/'reopen.json').write_text(json.dumps(dict(passed=True, blender=bpy.app.version_string, results=results), indent=2), encoding='utf-8')
