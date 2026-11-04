import bpy,sys,pathlib,math
from mathutils import Vector
root=pathlib.Path.cwd();out=root/'docs/validation/fan-x231-visual-20261104';out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(root/'assets/models/fan-x231/v1/fan-x231-v1.blend'))
s=bpy.context.scene;s.render.engine='CYCLES';s.cycles.samples=24;s.render.resolution_x=640;s.render.resolution_y=960;s.render.resolution_percentage=100
s.world.color=(.3,.3,.3);s.view_settings.view_transform='AgX'
for name,loc,power,size in [('key',(1,-2,2.3),140,2),('fill',(-1,-1,1),70,1.5),('rim',(1,1,1.8),110,1.2)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,.6))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(1.5,-2.7,1.35));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.57))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=1.28;s.camera=cam
m=bpy.data.materials.new('review-grey');m.diffuse_color=(.45,.45,.45,1)
s.view_layers[0].material_override=m
s.render.filepath=str(out/'01-silhouette-grey.png');bpy.ops.render.render(write_still=True)
s.render.resolution_x=800;s.render.resolution_y=800;cam.location=(.58,-1,.995);cam.rotation_euler=(Vector((0,0,.92))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=.37
s.render.filepath=str(out/'02-structure-grey.png');bpy.ops.render.render(write_still=True)
s.view_layers[0].material_override=None;s.render.filepath=str(out/'03-material-detail.png');bpy.ops.render.render(write_still=True)
s.render.resolution_x=640;s.render.resolution_y=960;cam.location=(1.5,-2.7,1.35);cam.rotation_euler=(Vector((0,0,.57))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=1.28
s.render.filepath=str(out/'04-material-full.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(root/'.local/fan-x231-review.blend'))
