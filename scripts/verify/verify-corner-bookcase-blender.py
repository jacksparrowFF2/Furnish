"""Independent source, production roundtrip and failed-publication preservation checks."""
import bpy, bmesh, pathlib, sys, json, math, importlib.util, os
root=pathlib.Path(__file__).resolve().parents[2];wide=os.environ.get('FURNISH_CORNER_PROFILE')=='580';profile='corner-bookcase-580' if wide else 'corner-bookcase';run=root/('output/playwright/'+profile+'-validation');source_file=root/('assets/models/'+profile+'/v1/'+profile+'-v1.glb')
spec=json.loads((run/'spec.json').read_text())
def clear():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def bounds(points):return [[min(p[k] for p in points),max(p[k] for p in points)] for k in range(3)]
clear();bpy.ops.import_scene.gltf(filepath=str(source_file));source={}
for o in bpy.context.scene.objects:
    if o.type!='MESH':continue
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=1e-6)
    assert all(e.is_manifold for e in bm.edges),o.name
    assert bm.calc_volume(signed=True)>0,o.name
    bm.free()
    source[o.name]=True
assert len(source)==14
for mode in ('http','file'):
    clear();bpy.ops.import_scene.gltf(filepath=str(run/(mode+'-production.glb')));actual={}
    for o in bpy.context.scene.objects:
        if o.type=='MESH' and o.get('furnishId')=='corner-test':
            key=o.get('furnishPartKey','').removeprefix('explicit:'+profile+'-v1:')
            actual[key]=bounds([o.matrix_world@v.co for v in o.data.vertices])
    assert len(actual)==14,len(actual)
    # Horizontal rotation and mirror preserve the vertical board thickness chain.
    for name,b in actual.items():
        if name.startswith('shelf-'):assert abs(b[2][1]-b[2][0]-.020)<3e-6,(name,b)
    allbounds=bounds([o.matrix_world@v.co for o in bpy.context.scene.objects if o.type=='MESH' and o.get('furnishId')=='corner-test' for v in o.data.vertices])
    assert abs(allbounds[2][1]-allbounds[2][0]-2.100)<3e-6
clear();bpy.ops.import_scene.gltf(filepath=str(source_file));bpy.data.objects.remove(bpy.data.objects['shelf-3'],do_unlink=True)
bad=run/'missing-shelf.glb';bpy.ops.export_scene.gltf(filepath=str(bad),export_format='GLB',export_extras=True)
module=importlib.util.spec_from_file_location('publisher',root/'scripts/publish-blender-asset.py');publisher=importlib.util.module_from_spec(module);module.loader.exec_module(publisher)
target=run/'preserved-asset.js';target.write_text('previous valid asset',encoding='utf-8')
try:publisher.publish(bad,target,profile,spec)
except ValueError as error:assert 'part set changed' in str(error),str(error)
else:raise AssertionError('Missing shelf accepted')
assert target.read_text(encoding='utf-8')=='previous valid asset'
# Same outside bounds must not allow a filled-in L shelf to be published.
clear();bpy.ops.import_scene.gltf(filepath=str(source_file));old=bpy.data.objects['shelf-2'];material=old.data.materials[0];bpy.data.objects.remove(old,do_unlink=True)
bpy.ops.mesh.primitive_cube_add(size=1,location=(0,0,.780));cube=bpy.context.object;cube.name='shelf-2';cube.dimensions=(spec['size'][0]/1000,spec['size'][2]/1000,.020);cube.data.materials.append(material);cube['furnishStablePart']=profile+'-v1:shelf-2';cube['furnishRecolor']=True
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
bad=run/'filled-notch.glb';bpy.ops.export_scene.gltf(filepath=str(bad),export_format='GLB',export_extras=True)
try:publisher.publish(bad,target,profile,spec)
except ValueError as error:assert 'front notch is filled' in str(error),str(error)
else:raise AssertionError('Filled front notch accepted')
assert target.read_text(encoding='utf-8')=='previous valid asset'
# Reopen the editable source without modifying it.
bpy.ops.wm.open_mainfile(filepath=str(source_file.with_suffix('.blend')));assert len([o for o in bpy.context.scene.objects if o.type=='MESH'])==14
(run/'blender-roundtrip.json').write_text(json.dumps({'passed':True,'blender':bpy.app.version_string,'closedMeshes':14,'productionParts':14,'httpAndFileResizedBoardThickness':True,'missingPartRejectedPreservingAsset':True,'filledNotchRejectedPreservingAsset':True,'editableBlendReopened':True},indent=2),encoding='utf-8')
print('PASS CORNER_BOOKCASE_BLENDER_ROUNDTRIP')

args=sys.argv[sys.argv.index('--')+1:];pathlib.Path(args[1]).write_text((run/'blender-roundtrip.json').read_text(),encoding='utf-8')
