"""Verify Furnish's exported pilot in real Blender without touching a live project."""
import bpy
import json
import pathlib
import sys
import math

run = pathlib.Path(sys.argv[sys.argv.index('--')+1])
expected = 60 if '--dishwasher' in sys.argv else 30 if '--fridge' in sys.argv else 12 if '--bookcase' in sys.argv else 29
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
    if expected == 60:
        bpy.context.view_layer.update()
        opened={obj['furnishPartKey']:obj.matrix_world.copy() for obj in parts}
        bpy.ops.wm.save_as_mainfile(filepath=str(run/(mode+'-open-roundtrip.blend')))
        bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
        bpy.ops.import_scene.gltf(filepath=str(run/(mode+'-closed.glb')));bpy.context.view_layer.update()
        closed={obj['furnishPartKey']:obj.matrix_world.copy() for obj in bpy.context.scene.objects if obj.get('furnishId')=='blender-pilot'}
        assert set(opened)==set(closed)
        angles=[]
        for name in ('lower-front','upper-front'):
            key='explicit:dishwasher-v1:'+name
            delta=opened[key].to_3x3() @ closed[key].to_3x3().inverted();q=delta.to_quaternion()
            degrees=math.degrees(min(q.angle,2*math.pi-q.angle));assert abs(degrees-90)<.001,(name,degrees)
            assert abs(q.axis.z)<1e-5,'fold hinge must be horizontal'
            if name=='lower-front':
                assert (opened[key].translation-closed[key].translation).length<1e-5,'lower hinge drift'
                lower_delta=delta.copy()
            else:
                cancelled=lower_delta @ delta
                assert all(abs(cancelled[i][j]-(1 if i==j else 0))<1e-5 for i in range(3) for j in range(3)),'upper leaf folded in the wrong direction'
            angles.append(round(degrees,3))
        # Upper frame travels to the lower leaf tip; 250 mm fitted to edited body height.
        lower='explicit:dishwasher-v1:lower-front';upper='explicit:dishwasher-v1:upper-front'
        gap=(opened[upper].translation-opened[lower].translation).length
        assert abs(gap-.250*(750/598))<1e-5,gap
        details.update({'horizontalLeafAngles':angles,'fixedLowerHinge':True,'upperHingeDistanceMm':round(gap*1000,3),'continuousLinkageSupported':False})
    if expected == 30:
        bpy.context.view_layer.update()
        opened = {obj['furnishPartKey']:obj.matrix_world.copy() for obj in parts}
        bpy.ops.wm.save_as_mainfile(filepath=str(run/(mode+'-open-roundtrip.blend')))
        bpy.ops.object.select_all(action='SELECT')
        bpy.ops.object.delete(use_global=False)
        bpy.ops.import_scene.gltf(filepath=str(run/(mode+'-closed.glb')))
        bpy.context.view_layer.update()
        closed = {obj['furnishPartKey']:obj.matrix_world.copy() for obj in bpy.context.scene.objects if obj.get('furnishId')=='blender-pilot'}
        assert set(opened)==set(closed)
        for role,degrees in (('left',90),('right',70)):
            key='explicit:fridge-v1:door-'+role
            assert (opened[key].translation-closed[key].translation).length<1e-5,'hinge moved'
            delta=opened[key].to_3x3() @ closed[key].to_3x3().inverted()
            quaternion=delta.to_quaternion()
            actual=min(quaternion.angle,2*math.pi-quaternion.angle)
            assert abs(math.degrees(actual)-degrees)<.001,(role,actual)
            assert abs(quaternion.axis.z)>.99999,'door rotated about wrong world axis'
        travel=[]
        for role,fraction in (('upper',1),('lower',.4)):
            key='explicit:fridge-v1:drawer-'+role+'-front'
            distance=(opened[key].translation-closed[key].translation).length
            assert abs(distance-.350*(800/595)*fraction)<1e-5,(role,distance)
            travel.append(round(distance*1000,3))
        details.update({'hingeAngles':[90,70],'fixedHingeOrigins':True,'drawerTravelMm':travel})
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
