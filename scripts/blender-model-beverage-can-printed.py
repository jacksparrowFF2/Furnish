"""Apply the user's photographed Snow Refreshing print to the existing can.
Geometry is loaded from the retained v1 source; no spatial change is intended.
The unseen reverse is deliberately unlettered green, not invented packaging.
"""
import bpy, pathlib, sys, math, json, hashlib
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:];out=pathlib.Path(args[0]);profile=args[args.index('--profile')+1]
root=pathlib.Path(__file__).resolve().parent.parent
if profile not in ('beverage-can-330','beverage-can-500'):raise ValueError('Only reviewed can profiles')
out.mkdir(parents=True,exist_ok=True)
if (out/(profile+'-v1.blend')).exists():raise ValueError('Use a new output directory')
volume=int(profile.rsplit('-',1)[1]);H=.1152 if volume==330 else .168
baseline=root/'assets/models/storage-supplies'/profile/'v1'/(profile+'-v1.blend')
bpy.ops.wm.open_mainfile(filepath=str(baseline));scene=bpy.context.scene
reference=root/'assets/models/beverage-cans/references'/('user-4.png' if volume==330 else 'user-3.png')
source=bpy.data.images.load(str(reference),check_existing=False);sw,sh=source.size;pixels=list(source.pixels[:])
body=scene.objects['body'];body.data.materials[0]=body.data.materials[0].copy();material=body.data.materials[0]
node=material.node_tree.nodes.get('Principled BSDF');node.inputs['Base Color'].default_value=(1,1,1,1);node.inputs['Roughness'].default_value=.42;node.inputs['Metallic'].default_value=.12
# Vertical landmarks are observed pixels, not physical manufacturer dimensions.
landmarks=[(0,769,119,299),(.06,751,109,309),(.83,488,108,310),(.97,435,119,298),(1,427,121,297)] if volume==330 else [(0,1135,365,668),(.04,1110,347,684),(.88,361,350,684),(.98,306,369,665),(1,295,370,663)]
def row(v):
 for a,b in zip(landmarks,landmarks[1:]):
  if v<=b[0]:
   t=(v-a[0])/(b[0]-a[0]);return [a[k]+t*(b[k]-a[k]) for k in range(1,4)]
 return list(landmarks[-1][1:])
def sample(x,y):
 x=max(0,min(sw-1,x));y=max(0,min(sh-1,sh-1-y));ix=int(x);iy=int(y);fx=x-ix;fy=y-iy
 return [sum(pixels[(min(sh-1,iy+dy)*sw+min(sw-1,ix+dx))*4+k]*(fx if dx else 1-fx)*(fy if dy else 1-fy) for dx in range(2) for dy in range(2)) for k in range(3)]
W=768;T=1024;rgba=[];green=(.015,.30,.14)
for y in range(T):
 v=y/(T-1);py,left,right=row(v);cx=(left+right)/2;radius=(right-left)/2
 for x in range(W):
  theta=(x/(W-1)-.5)*math.tau
  if abs(theta)<=math.pi/2:
   color=sample(cx+radius*.985*math.sin(theta),py)
   # The source already contains a glossy highlight. Reduce only the dark
   # emerald ink's photographed brightness before adding scene lighting;
   # white lettering, silver panels and the pale lime motif stay untouched.
   clamp=lambda v:max(0,min(1,v))
   ink=clamp((color[1]-color[0]-.05)/.2)*clamp((color[1]-color[2]-.03)/.2)*clamp((.45-color[0])/.3)
   color=[c*(1-.35*ink) for c in color]
   # Blend only near the photographed silhouette into the unknown back.
   fade=max(0,min(1,(abs(theta)-math.radians(76))/math.radians(14)))
   color=[color[k]*(1-fade)+green[k]*fade for k in range(3)]
  else:color=green
  rgba.extend((*color,1))
image=bpy.data.images.new('snow-refreshing-'+str(volume)+'-reference-front',width=W,height=T);image.colorspace_settings.name='sRGB';image.pixels[:]=rgba;image.filepath_raw=str(out/'label-atlas.png');image.file_format='PNG';image.save();image.pack()
tex=material.node_tree.nodes.new('ShaderNodeTexImage');tex.image=image;tex.interpolation='Linear';material.node_tree.links.new(tex.outputs['Color'],node.inputs['Base Color']);body['furnishRecolor']=False
uv=body.data.uv_layers.new(name='reference-cylinder')
for poly in body.data.polygons:
 angles=[]
 for li in poly.loop_indices:
  p=body.matrix_world@body.data.vertices[body.data.loops[li].vertex_index].co;angles.append(.5+math.atan2(p.x,-p.y)/math.tau if math.hypot(p.x,p.y)>1e-9 else None)
 valid=[u for u in angles if u is not None]
 if max(valid)-min(valid)>.5:angles=[u+1 if u is not None and u<.5 else u for u in angles]
 valid=[u for u in angles if u is not None];angles=[sum(valid)/len(valid) if u is None else u for u in angles]
 for li,u in zip(poly.loop_indices,angles):
  p=body.matrix_world@body.data.vertices[body.data.loops[li].vertex_index].co;uv.data[li].uv=(u,max(0,min(1,p.z/H)))
sys.path.insert(0,str(root/'scripts/lib'));from blender_asset_preflight import from_args
result=from_args(scene);(out/'preflight-result.json').write_text(json.dumps(result),encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(out/(profile+'-v1.blend')))
bpy.ops.export_scene.gltf(filepath=str(out/(profile+'-v1.glb')),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
# Same geometry, camera and lighting for original white and printed can.
scene.render.engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in scene.render.bl_rna.properties['engine'].enum_items.keys() else 'BLENDER_EEVEE';scene.render.resolution_x=720;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.world.color=(.35,.35,.35);scene.view_settings.view_transform='AgX'
center=Vector((0,0,H/2));bpy.ops.object.camera_add(location=(0,-H*2.8,H*.5+H*.38));camera=bpy.context.object;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=H*1.28;camera.data.clip_start=.001;scene.camera=camera
for pos,power in [((-.4,-.6,.6),38),((.4,-.3,.3),18)]:
 bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.data.energy=power;light.data.size=.65;light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
for name,printed in [('before',False),('after',True)]:
 if printed:material.node_tree.links.new(tex.outputs['Color'],node.inputs['Base Color'])
 else:
  for link in list(node.inputs['Base Color'].links):material.node_tree.links.remove(link)
  node.inputs['Base Color'].default_value=(.8796,.8879,.8469,1)
 scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True)
scene.render.filepath=str(out/'detail.png');camera.location=(0,-H*.95,H*1.02);target=Vector((0,0,H*.52));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=H*.84;bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'review.blend'))
result.update(passed=True,blender=bpy.app.version_string,referenceSha256=hashlib.sha256(reference.read_bytes()).hexdigest(),baselineSha256=hashlib.sha256(baseline.read_bytes()).hexdigest(),texture=[W,T])
pathlib.Path(args[args.index('--result')+1]).write_text(json.dumps(result),encoding='utf-8')
