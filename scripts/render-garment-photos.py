"""Controlled author comparison, four models with fixed camera and environment."""
import bpy,sys,pathlib,json,math,hashlib,re
from mathutils import Vector
root=pathlib.Path(__file__).resolve().parent.parent;out=pathlib.Path(sys.argv[sys.argv.index('--')+1]);out=out if out.is_absolute() else root/out;out.mkdir(parents=True,exist_ok=True)
specs=json.loads((root/'scripts/lib/garment-photo-specs.json').read_text(encoding='utf8'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
for i,(id,s) in enumerate(specs.items()):
 sha=re.search(r'"sourceSha256":"([^"]+)"',(root/'src/data'/(id+'-blender-asset.js')).read_text()).group(1)
 file=next(p for p in (root/'assets/models'/id).rglob(id+'-v1.glb') if hashlib.sha256(p.read_bytes()).hexdigest()==sha).with_suffix('.blend')
 with bpy.data.libraries.load(str(file),link=False) as (src,dst):dst.objects=[n for n in src.objects]
 for o in dst.objects:
  if o and o.type=='MESH':bpy.context.collection.objects.link(o);o.location.x+=(i-1.5)*1.0;o.location.z+=1.26-s['size'][1]/1000
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=20
scene.render.resolution_x=1600;scene.render.resolution_y=750;scene.render.resolution_percentage=100
scene.world.color=(.65,.65,.65);scene.view_settings.view_transform='Standard'
for x,y,z,power,size in [(-3,-4,5,900,5),(3,-2,3,650,4)]:
 data=bpy.data.lights.new('softbox','AREA');data.energy=power;data.shape='DISK';data.size=size;o=bpy.data.objects.new('softbox',data);bpy.context.collection.objects.link(o);o.location=(x,y,z);o.rotation_euler=(Vector((0,0,.8))-o.location).to_track_quat('-Z','Y').to_euler()
data=bpy.data.cameras.new('comparison');cam=bpy.data.objects.new('comparison',data);bpy.context.collection.objects.link(cam);scene.camera=cam;data.type='ORTHO';data.ortho_scale=4.2
gray=bpy.data.materials.new('neutral-gray');gray.diffuse_color=(.45,.45,.45,1)
for view,loc in [('front',(0,-6,.8)),('oblique',(2.5,-6,2.5)),('back',(0,6,.8))]:
 cam.location=loc;cam.rotation_euler=(Vector((0,0,.8))-cam.location).to_track_quat('-Z','Y').to_euler()
 for stage in (['silhouette','photo'] if view=='front' else ['photo']):
  scene.view_layers[0].material_override=gray if stage=='silhouette' else None;scene.render.filepath=str(out/(view+'-'+stage+'.png'));bpy.ops.render.render(write_still=True)
(out/'render.json').write_text(json.dumps({'passed':True,'blender':bpy.app.version_string,'views':['front-silhouette','front-photo','oblique-photo','back-photo'],'engine':'CYCLES','device':scene.cycles.device},indent=2))
