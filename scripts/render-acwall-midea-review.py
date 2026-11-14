"""Controlled front/oblique and outlet-detail review, preserving the source file."""
import bpy, pathlib, sys, json, runpy
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:];source=pathlib.Path(args[0]).resolve();out=pathlib.Path(args[1]).resolve();stage=args[2];out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source));s=bpy.context.scene;meshes=list(s.objects)
s.render.engine='CYCLES';s.cycles.samples=40;s.cycles.use_denoising=True
device=runpy.run_path(str(pathlib.Path(__file__).with_name('blender-render.py')))['select_device'](s,'gpu',bpy.context.preferences.addons['cycles'].preferences)
s.render.resolution_x=1200;s.render.resolution_y=650;s.render.resolution_percentage=100;s.view_settings.view_transform='AgX';s.view_settings.exposure=0
s.world=bpy.data.worlds.new('neutral-review-world');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.7,.7,.7,1);s.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.3
if stage!='materials':
 m=bpy.data.materials.new('neutral-gray');m.use_nodes=True;m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.38,.38,.38,1);m.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.6
 for o in meshes:o.data.materials[0]=m
for loc,energy,size in [((-.5,-.9,1.2),70,1.2),((.9,-.4,.5),35,.8),((0,.4,1),45,.7)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=energy;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,.15))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();cam=bpy.context.object;cam.data.type='ORTHO';s.camera=cam
views=[('overall',(-.6,-1.8,.46),(0,0,.145),1.02),('front',(0,-2,.18),(0,0,.148),1.02),('detail',(-.18,-.8,.1),(-.22,-.075,.047),.44)]
for name,position,target,scale in views:
 cam.location=position;cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=scale;s.render.filepath=str(out/(stage+'-'+name+'.png'));bpy.ops.render.render(write_still=True)
(out/(stage+'.json')).write_text(json.dumps({'blender':bpy.app.version_string,'device':device,'views':views,'stage':stage,'samples':40,'exposure':0,'world':.3,'cameraMatch':'approximately matches annotated oblique product image; unknown marketing lens, no exact photographic registration'},indent=2),encoding='utf8')
