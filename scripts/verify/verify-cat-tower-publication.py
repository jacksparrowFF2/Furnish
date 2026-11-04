"""Actual source topology and wrong-part alpha negative; previous publication preserved."""
import bpy,bmesh,pathlib,sys,json
root=pathlib.Path(__file__).resolve().parents[2];out=root/'.local/cat-tower-publication';out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(root/'assets/models/cat-tower/v2/cat-tower-v1.blend'))
for name in ['left-acrylic-bowl','right-acrylic-bowl']:
    bm=bmesh.new();bm.from_mesh(bpy.data.objects[name].data)
    assert all(e.is_manifold for e in bm.edges),name+' shell must be closed'
    assert all(f.calc_area()>1e-15 for f in bm.faces),name+' degenerate face'
    bm.free()
sys.path.insert(0,str(root/'scripts'));from importlib import import_module
publisher=import_module('publish-blender-asset')
target=out/'negative-target.js';target.write_text('previous-publication',encoding='utf-8')
base=bpy.data.objects['base'];material=base.data.materials[0].copy();base.data.materials[0]=material;material.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.2
glb=out/'wrong-base-alpha.glb';bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_extras=True)
try:publisher.publish(glb,target,'cat-tower')
except ValueError as e:
    assert 'alpha' in str(e);assert target.read_text()=='previous-publication';reason=str(e)
else:raise AssertionError('Wrong-part alpha accepted')
bpy.ops.wm.open_mainfile(filepath=str(root/'assets/models/cat-tower/v2/cat-tower-v1.blend'))
board=bpy.data.objects['left-bowl-board'];material=board.data.materials[0];bpy.data.objects.remove(board,do_unlink=True)
bpy.ops.mesh.primitive_cube_add(size=1,location=(-.155,.04,1.2));board=bpy.context.object;board.name='left-bowl-board';board.dimensions=(.49,.39,.018)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);board.data.materials.append(material);board['furnishStablePart']='cat-tower-v1:left-bowl-board'
glb=out/'filled-bowl-board.glb';bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',export_extras=True)
try:publisher.publish(glb,target,'cat-tower')
except ValueError as e:
    assert 'aperture filled' in str(e);assert target.read_text()=='previous-publication';aperture_reason=str(e)
else:raise AssertionError('Filled aperture accepted')
result={'passed':True,'closedNondegenerateBowls':True,'wrongBaseAlphaRejected':reason,'filledApertureRejected':aperture_reason,'previousPublicationPreserved':True,'blender':bpy.app.version_string}
(out/'result.json').write_text(json.dumps(result,indent=2));print(json.dumps(result))
