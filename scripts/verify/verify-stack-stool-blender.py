"""Independent source, production roundtrip and failed-publication preservation checks."""
import bpy, bmesh, pathlib, sys, json, math, importlib.util
root=pathlib.Path(__file__).resolve().parents[2];run=root/'output/stack-stool-validation';source_file=root/'assets/models/stack-stool/v4/stack-stool-v1.glb'
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
    points=[];c=math.cos(math.radians(37));s=math.sin(math.radians(37))
    for v in o.data.vertices:
        p=o.matrix_world@v.co;x,z,y=p.x,-p.y,p.z
        points.append((-x*c-z*s,-(-x*s+z*c),y))
    source[o.name]=bounds(points)
assert len(source)==5
for mode in ('http','file'):
    clear();bpy.ops.import_scene.gltf(filepath=str(run/(mode+'-production.glb')));actual={}
    for o in bpy.context.scene.objects:
        if o.type=='MESH' and o.get('furnishId')=='stool-test':
            key=o.get('furnishPartKey','').removeprefix('explicit:stack-stool-v1:')
            actual[key]=bounds([o.matrix_world@v.co for v in o.data.vertices])
    assert len(actual)==20,len(actual)
    anchor=actual['seat-cushion:stack-0']
    for i in range(4):
        for name,b in source.items():
            a=actual[name+':stack-'+str(i)]
            for k in range(3):
                for end in range(2):
                    expected=b[k][end]-source['seat-cushion'][k][0]+(i*.080 if k==2 else 0)
                    assert abs(a[k][end]-anchor[k][0]-expected)<3e-6,(mode,name,i,k,end)
clear();bpy.ops.import_scene.gltf(filepath=str(source_file));bpy.data.objects.remove(bpy.data.objects['seat-cushion'],do_unlink=True)
bad=run/'missing-seat.glb';bpy.ops.export_scene.gltf(filepath=str(bad),export_format='GLB',export_extras=True)
module=importlib.util.spec_from_file_location('publisher',root/'scripts/publish-blender-asset.py');publisher=importlib.util.module_from_spec(module);module.loader.exec_module(publisher)
target=run/'preserved-asset.js';target.write_text('previous valid asset',encoding='utf-8')
try:publisher.publish(bad,target,'stack-stool')
except ValueError as error:assert 'part set changed' in str(error),str(error)
else:raise AssertionError('Missing seat accepted')
assert target.read_text(encoding='utf-8')=='previous valid asset'
# Reopen the editable source without modifying it.
bpy.ops.wm.open_mainfile(filepath=str(source_file.with_suffix('.blend')));assert len([o for o in bpy.context.scene.objects if o.type=='MESH'])==5
(run/'blender-roundtrip.json').write_text(json.dumps({'passed':True,'blender':bpy.app.version_string,'closedMeshes':5,'productionParts':20,'httpAndFileRotateMirrorStackRelativeBounds':True,'missingPartRejectedPreservingAsset':True,'editableBlendReopened':True},indent=2),encoding='utf-8')
print('PASS STACK_STOOL_BLENDER_ROUNDTRIP')
