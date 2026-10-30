"""Read back every production part. --render reopens the API-downloaded BLEND."""
import bpy
import json
import pathlib
import sys

args = sys.argv[sys.argv.index('--')+1:]
run = pathlib.Path(args[0])
render = '--render' in args
manifest = json.loads((run/('studio/studio.json' if render else 'browser/production.json')).read_text(encoding='utf-8'))
cases = manifest['views'] if render else manifest['exports']
results = []
for case in cases:
    if render:
        bpy.ops.wm.open_mainfile(filepath=str(run/'studio'/case['id']/'scene.blend'))
        scene = bpy.context.scene
        assert scene.camera and scene.render.engine == 'CYCLES'
        assert scene.render.resolution_x == scene.render.resolution_y == 512
        assert scene.view_settings.view_transform == 'AgX'
        assert abs(scene.view_settings.exposure) < 1e-7
    else:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(run/'browser'/case['file']))
    expected = case['geometry']['parts']
    owners = {p['id'] for p in expected}
    objects = [o for o in bpy.context.scene.objects if o.get('furnishId') in owners]
    actual = {(o.get('furnishId'), o.get('furnishPartKey')): o for o in objects}
    assert len(actual) == len(objects), 'Duplicate owner/part identities'
    assert len(actual) == len(expected), (case.get('id'), len(actual), len(expected))
    for part in expected:
        obj = actual[(part['id'], part['key'])]
        assert obj.type == 'MESH' and obj.get('furnishPartVersion') == 3
        points = [obj.matrix_world @ v.co for v in obj.data.vertices]
        xyz = [(p.x, p.z, -p.y) for p in points]
        bounds = [[fn(p[i] for p in xyz) for i in range(3)] for fn in (min, max)]
        assert all(abs(bounds[k][i]-part['bounds'][k][i]) < 2e-5 for k in range(2) for i in range(3)), (part['key'], bounds, part['bounds'])
        alphas = []
        for material in obj.data.materials:
            node = next((n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if node:
                alphas.append(node.inputs['Alpha'].default_value)
            else:
                assert any(m['unlit'] for m in part['materials']), (part['key'], 'PBR shader missing')
                alphas.append(material.diffuse_color[3])
        assert all(any(abs(a-b) < 1e-5 for b in alphas) for a in part['alphas']), (part['key'], alphas, part['alphas'])
    results.append(dict(case=case.get('id', case.get('mode', '')+'-'+case.get('state', '')), parts=len(actual), boundsAndAlpha=True))
result = dict(passed=True, profile=manifest['profile'], blender=bpy.app.version_string, source='downloaded-render-blend' if render else 'production-glb', results=results)
(run/('reopen.json' if render else 'readback.json')).write_text(json.dumps(result, indent=2), encoding='utf-8')
