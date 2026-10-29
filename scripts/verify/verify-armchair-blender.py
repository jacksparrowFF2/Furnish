"""Independent Blender roundtrip of source and final Furnish export, plus rejected publication."""
import bpy, pathlib, sys, json, math, importlib.util, bmesh
root=pathlib.Path(__file__).resolve().parents[2]
berlin='--berlin' in sys.argv
profile='armchair-berlin' if berlin else 'armchair'
source_file=root/('assets/models/armchair-berlin/v3/armchair-berlin-v1.glb' if berlin else 'assets/models/armchair/v4/armchair-v1.glb')
run=root/('output/'+profile+'-validation')
def clear():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def bounds(points):return [[min(p[k] for p in points),max(p[k] for p in points)] for k in range(3)]
clear();bpy.ops.import_scene.gltf(filepath=str(source_file))
source={}
for o in bpy.context.scene.objects:
    if o.type!='MESH':continue
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=1e-6)
    assert all(e.is_manifold for e in bm.edges),o.name
    assert bm.calc_volume(signed=True)>0,o.name
    bm.free()
    points=[];c=math.cos(math.radians(37));s=math.sin(math.radians(37))
    for v in o.data.vertices:
        p=o.matrix_world@v.co;x,z,y=p.x,-p.y,p.z
        points.append((1.2*(-x*c-z*s),-1.2*(-x*s+z*c),1.2*y))
    source[o.name]=bounds(points)
assert len(source)==28
clear();bpy.ops.import_scene.gltf(filepath=str(run/'http-production.glb'))
actual={}
for o in bpy.context.scene.objects:
    if o.type=='MESH' and o.get('furnishId')=='chair-test':
        key=o.get('furnishPartKey','').removeprefix('explicit:'+profile+'-v1:')
        actual[key]=bounds([o.matrix_world@v.co for v in o.data.vertices])
assert set(actual)==set(source),(actual.keys(),source.keys())
anchor='seat-cushion'
for name in source:
    for k in range(3):
        for end in range(2):
            # Compare shape and placement relative to the seat, independent of the plan origin.
            assert abs((actual[name][k][end]-actual[anchor][k][0])-(source[name][k][end]-source[anchor][k][0]))<3e-6,(name,k,end)

# Missing-arm GLB must not replace an existing published file.
clear();bpy.ops.import_scene.gltf(filepath=str(source_file))
bpy.data.objects.remove(bpy.data.objects['straight-arm-1' if berlin else 'curved-arm-1'],do_unlink=True)
bad=run/'missing-arm.glb';bpy.ops.export_scene.gltf(filepath=str(bad),export_format='GLB',export_extras=True)
module=importlib.util.spec_from_file_location('publisher',root/'scripts/publish-blender-asset.py');publisher=importlib.util.module_from_spec(module);module.loader.exec_module(publisher)
target=run/'preserved-asset.js';target.write_text('previous valid asset',encoding='utf-8')
try:publisher.publish(bad,target,profile)
except ValueError as error:assert 'part set changed' in str(error),str(error)
else:raise AssertionError('Missing arm was accepted')
assert target.read_text(encoding='utf-8')=='previous valid asset'
(run/'blender-roundtrip.json').write_text(json.dumps({'passed':True,'blender':bpy.app.version_string,'closedMeshes':28,'productionParts':28,'resizeRotateMirrorRelativeBounds':True,'missingPartRejectedPreservingAsset':True},indent=2),encoding='utf-8')
print('PASS ARMCHAIR_BLENDER_ROUNDTRIP')
