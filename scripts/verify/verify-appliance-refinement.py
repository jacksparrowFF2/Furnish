"""Reopen API-delivered refinement files against production geometry manifests."""
import bpy
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[sys.argv.index('--')+1])
cases = json.loads((root/'geometry.json').read_text(encoding='utf-8'))
results = []
for case in cases:
    bpy.ops.wm.open_mainfile(filepath=str(root/case['id']/'scene.blend'))
    scene = bpy.context.scene
    assert scene.render.engine == 'CYCLES'
    assert scene.render.resolution_x == scene.render.resolution_y == 1024
    assert scene.cycles.samples == 128 and scene.view_settings.view_transform == 'AgX'
    assert abs(scene.view_settings.exposure+.7) < 1e-6
    assert len([o for o in scene.objects if o.type == 'LIGHT']) == (2 if case['id'] == 'laundry' else 3)
    expected = case['geometry']['parts']
    profile = case.get('profile', 'washer-tg10k60w')
    prefix,count = {'washer-tg10k60w':('washer-tg10k60w-v1:',47),'fridge':('fridge-v1:',30),'hood':('hood-v1:',27)}[profile]
    actual = {(o.get('furnishId'), o.get('furnishPartKey')): o for o in scene.objects if o.type == 'MESH' and o.get('furnishPartKey', '').removeprefix('explicit:').startswith(prefix)}
    assert len(actual) == len(expected) == count
    refined = case.get('refined', not case['id'].startswith('before-'))
    micro = 0
    for part in expected:
        obj = actual[(part['id'], part['key'])]
        xyz = [obj.matrix_world @ v.co for v in obj.data.vertices]
        coords = [(p.x, p.z, -p.y) for p in xyz]
        bounds = [[fn(p[i] for p in coords) for i in range(3)] for fn in (min, max)]
        assert all(abs(bounds[k][i]-part['bounds'][k][i]) < 2e-5 for k in range(2) for i in range(3)), part['key']
        if case.get('opticalPoles') and part['key'].endswith(':door-glass'):
            vertices=obj.data.vertices
            cx=(min(v.co.x for v in vertices)+max(v.co.x for v in vertices))/2
            cz=(min(v.co.z for v in vertices)+max(v.co.z for v in vertices))/2
            poles=[v for v in vertices if abs(v.co.x-cx)+abs(v.co.z-cz)<1e-6]
            assert poles and all(abs(v.normal.y)>.999 for v in poles), 'Refractive pole normal lost during production/sync'
        for slot in obj.material_slots:
            material = slot.material
            if material is None:
                continue
            nodes = material.node_tree.nodes
            shader = next((n for n in nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if nodes.get('Furnish microfinish'):
                micro += 1
                assert shader.inputs['Roughness'].is_linked and shader.inputs['Normal'].is_linked
            if profile == 'washer-tg10k60w' and part['key'].endswith(':door-glass'):
                assert shader
                optical = case.get('optical', refined)
                assert abs(shader.inputs['Alpha'].default_value-(1 if optical else .12)) < 1e-5
                assert abs(shader.inputs['Transmission Weight'].default_value-(1 if optical else 0)) < 1e-5
                if optical:
                    assert abs(shader.inputs['IOR'].default_value-1.47) < 1e-5
                    assert not obj.visible_shadow
                    thickness = [s.default_value for n in nodes if n.type == 'GROUP' for s in n.inputs if s.name == 'Thickness']
                    assert any(abs(t-.0018) < 1e-6 for t in thickness)
            if profile in {'fridge','hood'} and case.get('refined') and part['key'].endswith(':door-left' if profile=='fridge' else ':sloped-glass'):
                assert shader.inputs['Coat Weight'].default_value>.5
                assert shader.inputs['Metallic'].default_value==0 and shader.inputs['Transmission Weight'].default_value==0
    assert micro > 5 if refined else micro == 0
    results.append(dict(case=case['id'], profile=profile, parts=count, geometryPreserved=True, microfinishParts=micro, glassVerified=True))
(root/'reopen.json').write_text(json.dumps(dict(passed=True, blender=bpy.app.version_string, results=results), indent=2), encoding='utf-8')
print('PASS downloaded photographic BLEND geometry and materials', len(results))
