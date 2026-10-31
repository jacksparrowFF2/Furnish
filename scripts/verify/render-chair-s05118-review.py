"""Controlled S05118 photo-review views; run with Blender --background --python.

Arguments: source.blend|glb output-directory gray|material. All coordinates here
use Blender metres (front -Y, up Z). Not a second production constructor.
"""
import bpy, sys, pathlib, math, json, hashlib
from mathutils import Vector

source, destination, mode = sys.argv[sys.argv.index('--')+1:][:3]
source=pathlib.Path(source).resolve(); out=pathlib.Path(destination).resolve();out.mkdir(parents=True,exist_ok=True)
if source.suffix=='.blend':bpy.ops.wm.open_mainfile(filepath=str(source),load_ui=False)
else:
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(source))
models=[o for o in bpy.context.scene.objects if o.type=='MESH']
if source.suffix=='.glb':
    models=[o for o in models if str(o.get('furnishPartKey','')).startswith('explicit:chair-s05118-v1:')]
    if len(models)!=17:raise ValueError('Expected 17 real Furnish production chair parts')
    for o in models:
        world=o.matrix_world.copy();o.parent=None;o.matrix_world=world
for o in list(bpy.context.scene.objects):
    if o not in models:bpy.data.objects.remove(o,do_unlink=True)
def mat(name,color,roughness):
    m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
    n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Roughness'].default_value=roughness
    return m
if mode=='gray':
    gray=mat('review neutral clay',(.42,.42,.42),.65)
    for o in models:o.data.materials.clear();o.data.materials.append(gray)
elif mode=='material-before':
    # Same final geometry, restore only the previous PBR palette for material A/B.
    for o in models:
        if o.name not in ('seat-cushion','back-cushion','seat-piping','back-piping'):continue
        seam='piping' in o.name;hexcolor='c7baa6' if seam else 'd8cdbc'
        def linear(v):
            v=int(v,16)/255;return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
        old=mat('previous '+o.name,tuple(linear(hexcolor[i:i+2]) for i in (0,2,4)),.65 if seam else .62)
        o.data.materials.clear();o.data.materials.append(old)
floor=mat('review floor',(.83,.83,.83),.8)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.001));bpy.context.object.data.materials.append(floor)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=48;scene.cycles.use_denoising=True
prefs=bpy.context.preferences.addons['cycles'].preferences;prefs.compute_device_type='OPTIX';prefs.get_devices()
for d in prefs.devices:d.use=d.type=='OPTIX'
scene.cycles.device='GPU' if any(d.use for d in prefs.devices) else 'CPU'
scene.world=bpy.data.worlds.new('review white studio');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.8,.8,.8,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
def area(name,location,power,size):
    light=bpy.data.lights.new(name,'AREA');light.energy=power;light.shape='DISK';light.size=size
    ob=bpy.data.objects.new(name,light);scene.collection.objects.link(ob);ob.location=location;ob.rotation_euler=(Vector((0,0,.45))-ob.location).to_track_quat('-Z','Y').to_euler()
area('large left softbox',(-2,-3,3.5),260,3)
area('right fill',(2,-1,2),100,2.5);area('rear rim',(0,2,3),150,2)
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=0
scene.render.resolution_x=768;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
camera=bpy.data.cameras.new('review-camera');ob=bpy.data.objects.new('review-camera',camera);scene.collection.objects.link(ob);scene.camera=ob
views={
 'matched':{'location':(-1.35,-3.4,1.25),'target':(0,0,.43),'lens':78},
 'back':{'location':(-1.65,3.2,1.65),'target':(0,0,.43),'lens':78},
 'side':{'location':(3.7,0,.75),'target':(0,0,.43),'lens':78},
}
record={'source':str(source),'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'mode':mode,'blender':bpy.app.version_string,'device':scene.cycles.device,'devices':[d.name for d in prefs.devices if d.use],'views':{},'render':{'resolution':[768,800],'samples':48,'engine':'CYCLES','exposure':0,'view':'AgX','look':scene.view_settings.look}}
for name,v in views.items():
    ob.location=v['location'];ob.rotation_euler=(Vector(v['target'])-ob.location).to_track_quat('-Z','Y').to_euler();camera.type='PERSP';camera.lens=v['lens'];camera.sensor_width=36
    scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
    record['views'][name]={**v,'rotationRadians':list(ob.rotation_euler),'sensorWidth':36}
(out/'conditions.json').write_text(json.dumps(record,indent=2),encoding='utf-8')
print('REVIEW_RENDER_COMPLETE',out)
