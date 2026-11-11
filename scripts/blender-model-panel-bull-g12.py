"""G12 visible faceplates, mm reference converted once to Blender metres.
86mm face is documented; 10mm exposed depth and occluded details are estimates.
Independent variants share an editable source scene and retain real openings.
"""
import bpy, bmesh, json, math, pathlib, sys
from mathutils import Vector

ROOT=pathlib.Path(__file__).resolve().parent.parent
args=sys.argv[sys.argv.index('--')+1:]
out=pathlib.Path(args[0]);out.mkdir(parents=True,exist_ok=True)
if (out/'panel-bull-g12-v1.blend').exists():raise ValueError('Use a new directory')
variants=json.loads(pathlib.Path(args[1]).read_text(encoding='utf8'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC'

def mat(name,color,rough,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF')
 rgb=[int(color[i:i+2],16)/255 for i in (0,2,4)]
 n.inputs['Base Color'].default_value=(*[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb],1)
 n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal;return m
white=mat('matte-white-PC','f5f5f2',.34);edge=mat('rear-PC','dfdfdb',.48)
dark=mat('recessed-shutter','282a28',.68);steel=mat('connector-metal','a6a9a5',.28,.85)
diffuser=mat('opaque-diffuser','faf7e9',.42);red=mat('red-call-button','bd1720',.3)
rubber=mat('flexible-grey-cable-disc','85888a',.7)
variant='';parts=[]
def finish(o,name,material):
 o.name=variant+':'+name;o.data.materials.clear();o.data.materials.append(material)
 o['furnishStablePart']='panel-bull-g12:'+o.name;o['furnishVariant']=variant;o['furnishRecolor']=material==white
 parts.append(o);return o
def box(name,x,y,z,w,h,d,material=white,r=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=(x/1000,-z/1000,y/1000));o=bpy.context.object
 o.scale=(w/1000,d/1000,h/1000);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if r:
  b=o.modifiers.new('edge-round','BEVEL');b.width=r/1000;b.segments=3
  bpy.ops.object.modifier_apply(modifier=b.name)
 return finish(o,name,material)
def cyl(name,x,y,z,r,d,material):
 bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=r/1000,depth=d/1000,location=(x/1000,-z/1000,y/1000),rotation=(math.pi/2,0,0))
 return finish(bpy.context.object,name,material)
def cut(target,x,y,w,h,angle=0,roundness=.35):
 tool=box('temporary',x,y,2,w,h,12,dark,roundness);parts.remove(tool)
 tool.rotation_euler.y=math.radians(angle)
 bpy.context.view_layer.objects.active=target
 m=target.modifiers.new('true-opening','BOOLEAN');m.operation='DIFFERENCE';m.solver='EXACT';m.object=tool
 bpy.ops.object.modifier_apply(modifier=m.name);bpy.data.objects.remove(tool,do_unlink=True)
def cutcircle(target,x,y,r):
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=r/1000,depth=.02,location=(x/1000,0,y/1000),rotation=(math.pi/2,0,0));tool=bpy.context.object
 bpy.context.view_layer.objects.active=target;m=target.modifiers.new('circular-opening','BOOLEAN');m.operation='DIFFERENCE';m.object=tool
 bpy.ops.object.modifier_apply(modifier=m.name);bpy.data.objects.remove(tool,do_unlink=True)
def slot(x,y,w=2.5,h=7,angle=0):
 cut(face,x,y,w,h,angle)
 # The safety shutter sits behind the actual hole, not on the face.
 o=box('shutter-%02d'%len(parts),x,y,-1.4,w+1,h+1,.5,dark,.2);o.rotation_euler.y=math.radians(angle)
def pair(x,y,h=7):
 for dx in (-6.5,6.5):slot(x+dx,y,2.5,h)
def triple(x,y,scale=1):
 slot(x,y+9*scale,2.7*scale,7*scale)
 slot(x-10*scale,y-5*scale,2.7*scale,8*scale,-30)
 slot(x+10*scale,y-5*scale,2.7*scale,8*scale,30)
def rocker(x=0,y=43,w=83,h=83,n=1,top=5):
 # Dark backing and spaced rigid caps create the perimeter and inter-key seams.
 box('rocker-recess',x,y,2.3,w+1,h+1,1,dark,.8)
 cut(face,x,y,w+1,h+1)
 for i in range(n):
  xx=x-w/2+(i+.5)*w/n
  box('rocker-%d'%(i+1),xx,y,top-1.1,w/n-.65,h,2.2,white,.7)
  if i==0:box('indicator',xx-w/n/2+6,y+h/2-7,top-.04,1.4,4,.08,edge,.2)
def usb(x,y,kind='a'):
 w,h=(4.8,11) if kind=='a' else (3.4,9)
 slot(x,y,w,h)
 box('usb-tongue-%02d'%len(parts),x+.5,y,-.8,1.1,h-2,.7,edge,.1)
def ethernet(x=0,y=43,phone=False):
 # Detail photo shows a closed dust flap, not an exposed black RJ45 opening.
 w=13 if phone else 15
 cut(face,x,y,w+.2,12.2)
 box('port-recess-%02d'%len(parts),x,y,4.55,w,12,.5,edge,.5)
 box('port-flap-%02d'%len(parts),x,y,4.85,w-1.5,10.5,.3,white,.4)
 box('port-icon-%02d'%len(parts),x,y,4.99,6,4,.02,edge,.2)
def coax(x=0,y=43):
 # Annular connector with real bore, closed recessed centre behind it.
 o=cyl('coax-%02d'%len(parts),x,y,3.3,4.1,3.4,steel)
 bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.0016,depth=.02,location=(x/1000,-.0033,y/1000),rotation=(math.pi/2,0,0));tool=bpy.context.object
 bpy.context.view_layer.objects.active=o;m=o.modifiers.new('connector-bore','BOOLEAN');m.object=tool;m.operation='DIFFERENCE';bpy.ops.object.modifier_apply(modifier=m.name);bpy.data.objects.remove(tool,do_unlink=True)
 cut(face,x,y,3.2,3.2,roundness=1.5)

manifest={}
for variant in variants:
 parts=[]
 box('rear-plate',0,43,-2.7,84,84,4.6,edge,1.7)
 face=box('face',0,43,2.2,86,86,5.6,white,2)
 if variant.startswith('switch'):
  rocker(n=int(variant[6]))
 elif variant=='doorbell':
  rocker(top=4.8)
  # Small bell outline, readable at the reference's scale; no invented text.
  curve=bpy.data.curves.new('bell-outline','CURVE');curve.dimensions='3D';curve.bevel_depth=.00018;curve.bevel_resolution=2
  points=[(-3,27),(-2,29),(-2,32),(-1,34),(1,34),(2,32),(2,29),(3,27),(-3,27)]
  spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
  for p,(x,y) in zip(spline.points,points):p.co=(x/1000,-.00475,y/1000,1)
  o=bpy.data.objects.new('bell-outline',curve);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');finish(bpy.context.object,'doorbell-outline',edge)
  cyl('doorbell-clapper',0,26,4.96,.65,.08,edge)
 elif variant=='bell':
  cutcircle(face,0,49,10.1);cutcircle(face,0,32,2.4)
  cyl('call-surround',0,49,4,10,1.5,edge);cyl('red-call-button',0,49,4.8,8.8,.4,red)
  cyl('key-socket',0,32,4.5,2.3,1,dark);slot(0,29,1.7,4)
 elif variant in ('socket5','socket5-wide','socket5-diagonal','socket5-separated'):
  pair(-13 if variant=='socket5-diagonal' else 0,66 if variant in ('socket5-wide','socket5-separated') else 62)
  triple(12 if variant=='socket5-diagonal' else 0,33)
 elif variant=='socket5-switch':
  rocker(0,65,43,13);slot(-20,37,7,2.5);slot(-20,29,7,2.5);triple(12,33)
 elif variant in ('socket5-ac','socket5-3usb'):
  if variant=='socket5-ac':usb(-10,63,'a');usb(10,63,'c')
  else:
   for x in (-14,0,14):usb(x,63)
  slot(-20,37,7,2.5);slot(-20,29,7,2.5);triple(12,33)
 elif variant=='socket4':pair(0,62);pair(0,31)
 elif variant=='socket7':
  for x in (-16,16):slot(x,67,7,2.5);slot(x,54,7,2.5)
  triple(0,29)
 elif variant in ('socket16','socket16-switch'):
  if variant=='socket16-switch':rocker(0,69,55,13);triple(0,33,1.15)
  else:triple(0,44,1.15)
 elif variant in ('tv','tv-push'):coax()
 elif variant=='phone':ethernet(phone=True)
 elif variant in ('net5','net6'):ethernet()
 elif variant in ('net5-double','net6-double','phone-net5','phone-net6'):
  ethernet(0,55,variant.startswith('phone'));ethernet(0,32)
 elif variant in ('tv-net5','tv-net6'):
  ethernet(0,55);coax(0,32)
  box('port-hood',0,62,4.6,16,3,.8,white,.5)
 elif variant=='cable':
  cutcircle(face,0,43,25.1)
  rim=cyl('cable-rim',0,43,3,25,4,edge);cutcircle(rim,0,43,22.2)
  cyl('rubber-disc',0,43,4.6,22,.6,rubber)
  for a in (45,-45):
   o=box('rubber-seam-%s'%a,0,43,4.94,.5,40,.02,edge,.1);o.rotation_euler.y=math.radians(a)
 elif variant=='nightlight':
  cut(face,0,43,49.2,49.2,roundness=4)
  frame=box('lamp-frame',0,43,3.2,49,49,3.6,edge,5)
  cut(frame,0,38,45.2,32.2,roundness=3)
  box('diffuser',0,38,4.1,45,32,1.4,diffuser,4)
  cutcircle(frame,0,57,5.1)
  cyl('sensor',0,57,4.25,5,1.4,diffuser)
 elif variant!='blank':raise ValueError(variant)
 # Unreadable embossed branding is deliberately omitted.
 for o in parts:
  material=o.data.materials[0];o.data.materials.clear();o.data.materials.append(material)
  for polygon in o.data.polygons:polygon.material_index=0
  bm=bmesh.new();bm.from_mesh(o.data)
  bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=1e-8)
  bmesh.ops.dissolve_degenerate(bm,edges=bm.edges,dist=1e-8)
  bmesh.ops.triangulate(bm,faces=list(bm.faces))
  zero=[f for f in bm.faces if f.calc_area()<1e-15]
  if zero:bmesh.ops.delete(bm,geom=zero,context='FACES')
  bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free()
 manifest[variant]=[o.name.split(':',1)[1] for o in parts]
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(out/(variant+'.glb')),export_format='GLB',use_selection=True,export_extras=True,export_cameras=False,export_lights=False)

import shutil
shutil.copyfile(out/'socket5-diagonal.glb',out/'panel-bull-g12-v1.glb')
sys.path.insert(0,str(ROOT/'scripts/lib'))
from blender_asset_preflight import check_contract
contract=dict(profile='panel-bull-g12',materialSlots=1,motions=[],parts=[dict(name=k+':'+n,identity='panel-bull-g12:'+k+':'+n,role=None) for k,names in manifest.items() for n in names])
preflight=check_contract(bpy.context.scene,contract)
(out/'preflight-result.json').write_text(json.dumps(preflight),encoding='utf8')
# All variants at the origin, selectable by collection/identity; first visible.
for o in list(bpy.context.scene.objects):
 if o.type=='MESH':o.hide_render=not o.name.startswith('socket5-diagonal:');o.hide_set(o.hide_render)
(out/'parts.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
bpy.ops.wm.save_as_mainfile(filepath=str(out/'panel-bull-g12-v1.blend'))

# Fixed inspection conditions: front and oblique, same diffuse world/exposure.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=700;scene.render.resolution_y=700;scene.render.resolution_percentage=100
scene.world.color=(.65,.65,.65);scene.view_settings.view_transform='AgX'
bpy.ops.object.light_add(type='AREA',location=(.03,-.16,.17));bpy.context.object.data.energy=8;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=.18
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=.115
for view,pos in [('front',(0,-.22,.043)),('oblique',(.13,-.24,.13))]:
 cam.location=pos;cam.rotation_euler=(Vector((0,0,.043))-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=str(out/(view+'.png'));bpy.ops.render.render(write_still=True)
scene.view_layers[0].material_override=mat('inspection-grey','aaaaaa',.6)
scene.render.filepath=str(out/'grey-oblique.png');bpy.ops.render.render(write_still=True)
scene.view_layers[0].material_override=None
# Save inspection conditions in the editable source.
bpy.ops.wm.save_as_mainfile(filepath=str(out/'panel-bull-g12-v1.blend'))
# Front material contact sheet uses the same meshes as the exported variants.
scene.render.resolution_x=1600;scene.render.resolution_y=1050;scene.cycles.samples=12
for o in scene.objects:
 if o.type=='LIGHT':o.location=(.385,-.6,.15);o.data.size=1.5;o.data.energy=35
for index,key in enumerate(variants):
 for o in list(scene.objects):
  if o.type=='MESH' and o.get('furnishVariant')==key:
   o.hide_set(False);o.hide_render=False;o.location.x+=(index%8)*.11;o.location.z-=(index//8)*.12
cam.location=(.385,-1,-.197);cam.rotation_euler=(math.pi/2,0,0);cam.data.ortho_scale=.94
# aim front, using the same tracking convention as the single views
cam.rotation_euler=(Vector((.385,0,-.197))-cam.location).to_track_quat('-Z','Y').to_euler()
scene.render.filepath=str(out/'variants.png');bpy.ops.render.render(write_still=True)
print('PANEL_AUTHOR_OK',len(manifest))
