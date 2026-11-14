"""Controlled visual review of the authored lamp, without changing its source."""
import bpy, json, pathlib, sys
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:];source=pathlib.Path(args[0]).resolve();out=pathlib.Path(args[1]).resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.wm.open_mainfile(filepath=str(source))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
sys.path.insert(0,str(pathlib.Path(__file__).parent));import runpy
device=runpy.run_path(str(pathlib.Path(__file__).with_name('blender-render.py')))['select_device'](scene,'gpu',bpy.context.preferences.addons['cycles'].preferences)
scene.render.resolution_x=1000;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.view_settings.exposure=0
scene.world=bpy.data.worlds.new('Review world');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.8,.8,.8,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.15
meshes=list(scene.objects)
bpy.ops.object.camera_add(location=(.85,-1.35,.76));camera=bpy.context.object;camera.name='review-hero';camera.rotation_euler=(Vector((0,0,.24))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=.79;scene.camera=camera
for name,location,energy,size in [('key',(.3,-.6,1.1),10,.8),('fill',(-.7,-.1,.6),5,.7),('rim',(.1,.7,.8),8,.6)]:
 bpy.ops.object.light_add(type='AREA',location=location);o=bpy.context.object;o.name=name;o.data.energy=energy;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,.25))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=200);ground=bpy.context.object;ground.location.z=-.001;mat=bpy.data.materials.new('review-neutral-floor');mat.diffuse_color=(.6,.6,.6,1);ground.data.materials.append(mat)
original={o:o.data.materials[0] for o in meshes};gray=bpy.data.materials.new('review-gray');gray.use_nodes=True;gray.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.45,.45,.45,1);gray.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.6
for stage in ['silhouette','structure','materials']:
 for o in meshes:o.data.materials[0]=original[o] if stage=='materials' else gray
 camera.location=(-.85,-1.35,.36);camera.rotation_euler=(Vector((0,0,.24))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='PERSP';camera.data.lens=70
 scene.render.filepath=str(out/(stage+'-overall.png'));bpy.ops.render.render(write_still=True)
 camera.location=(-.35,-.75,.48);camera.rotation_euler=(Vector((0,-.167,.445))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=.27
 scene.render.filepath=str(out/(stage+'-detail.png'));bpy.ops.render.render(write_still=True)
(out/'render.json').write_text(json.dumps(dict(blender=bpy.app.version_string,device=device,stages=['silhouette','structure','materials'],camera='70mm perspective hero (-.85,-1.35,.36), target (0,0,.24); orthographic .27m detail; approximate reference with unknown photo lens',samples=48,exposure=0,transform='AgX'),indent=2),encoding='utf8')
