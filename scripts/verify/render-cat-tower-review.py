"""Fixed source review views; no modifications to the editable product source."""
import bpy,sys,pathlib,math,json
from mathutils import Vector
root=pathlib.Path(__file__).resolve().parents[2];out=root/'docs/validation/cat-tower-visual-20261104';out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(root/'assets/models/cat-tower/v2/cat-tower-v1.blend'))
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=24
s.render.resolution_x=720;s.render.resolution_y=1000;s.render.resolution_percentage=100
s.world.color=(.65,.65,.65);s.view_settings.view_transform='AgX'
bpy.ops.object.camera_add(location=(3.2,-6,2.55));camera=bpy.context.object;camera.name='Review camera';s.camera=camera
camera.data.type='ORTHO';camera.data.ortho_scale=2.75
target=Vector((0,0,1.2));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler()
for pos,power,size in [((2,-4,4),450,4),((-3,-1,3),250,3),((0,2,4),350,3)]:
    bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.003));floor=bpy.context.object
m=bpy.data.materials.new('studio ground');m.diffuse_color=(.73,.73,.73,1);floor.data.materials.append(m)
gray=bpy.data.materials.new('clay');gray.diffuse_color=(.5,.5,.5,1)
for stage in ['clay','material']:
    s.view_layers[0].material_override=gray if stage=='clay' else None
    for view,loc,aim,scale in [('overall',(1.8,-6,2.1),(0,0,1.2),2.75),('detail',(1.8,-6,2.6),(0,0,1.33),1.45)]:
        camera.location=loc;camera.rotation_euler=(Vector(aim)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=scale
        s.render.filepath=str(out/(stage+'-'+view+'.png'));bpy.ops.render.render(write_still=True)
(out/'source-render.json').write_text(json.dumps({'blender':bpy.app.version_string,'engine':'CYCLES','samples':24,'projection':'ORTHO','exposure':s.view_settings.look,'resolution':[720,1000],'camera':'same fixed overall/detail positions for clay and material','referenceCamera':'approximate; JD image focal length and lighting unknown'}))
