"""Closed storage inventories, in metres. Dimensions/evidence live in the spec and docs.
No operating lids, internal capacity or packaging-batch fidelity is claimed.
"""
import bpy, bmesh, json, pathlib, sys, math
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]
out=pathlib.Path(args[0]); profile=args[args.index('--profile')+1]
spec=json.loads((pathlib.Path(__file__).parent/'lib/storage-supply-specs.json').read_text(encoding='utf-8'))[profile]
out.mkdir(parents=True,exist_ok=True)
if (out/(profile+'-v1.blend')).exists(): raise ValueError('Use a new directory')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
def mat(name,color,rough=.55,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF')
 values=[int(color[i:i+2],16)/255 for i in (0,2,4)]
 n.inputs['Base Color'].default_value=(*[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in values],1)
 n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal
 return m
main=mat('main',spec['color'].lstrip('#'),.42,.45 if profile=='storage-toolbox' else 0)
white=mat('paper-white','f2f0e8',.85);dark=mat('seam','414844',.7);silver=mat('metal-latch','a3a5a3',.25,.9)
label=mat('label','294982',.5);accent=mat('identification','b27165',.6)
def identity(o,name,m):
 o.name=name;o.data.materials.clear();o.data.materials.append(m);o['furnishStablePart']=profile+'-v1:'+name;o['furnishRecolor']=m==main
 return o
def box(name,size,pos,m,bevel=.0015):
 # Furnish X/Y/Z -> Blender X/-Z/Y; dimensions are W/H/D.
 bpy.ops.mesh.primitive_cube_add(size=1,location=(pos[0],-pos[2],pos[1]));o=bpy.context.object
 o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('edge-radius-estimated','BEVEL');mod.width=min(bevel,min(size)/4);mod.segments=2;bpy.ops.object.modifier_apply(modifier=mod.name)
 return identity(o,name,m)
def merge(name,objects,m):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();return identity(bpy.context.object,name,m)
def front_text(text,x,height,size):
 bpy.ops.object.text_add(location=(x,-(D/2-.0004),height),rotation=(math.pi/2,0,0))
 o=bpy.context.object;o.data.body=text;o.data.size=size;o.data.align_x='CENTER';o.data.resolution_u=3;o.data.extrude=.0004
 bpy.ops.object.convert(target='MESH');return identity(bpy.context.object,'quantity-mark',white)
W,H,D=[v/1000 for v in spec['size']]
if profile in ('storage-toolbox','medicine-box'):
 med=profile=='medicine-box';bodytop=H-(.048 if med else .026)
 box('body',(W,bodytop,D),(0,bodytop/2,0),main,.004 if med else .001)
 if med:box('upper-band',(W,.018,D),(0,bodytop+.009,0),dark,.003)
 lidbottom=bodytop+(.018 if med else .002);lidtop=H-.008
 box('lid',(W,lidtop-lidbottom,D),(0,(lidbottom+lidtop)/2,0),main,.004 if med else .001)
 if med:
  for side,name in [(-1,'left-latch'),(1,'right-latch')]:box(name,(.008,.035,.070),(side*(W/2-.004),bodytop,0),main)
  box('identification-horizontal',(.042,.012,.001),(0,bodytop*.52,D/2-.0005),accent,.0003)
  box('identification-vertical',(.012,.042,.001),(0,bodytop*.52,D/2-.0005),accent,.0003)
 else:
  box('front-latch',(.021,.038,.006),(0,bodytop,D/2-.003),silver,.001)
  for side,name in [(-1,'hinge-left'),(1,'hinge-right')]:box(name,(.030,.012,.006),(side*W*.28,bodytop,-D/2+.003),silver,.001)
 # Handle is folded flat for storage: visible open centre, no filled slab.
 for side,name in [(-1,'handle-left'),(1,'handle-right')]:box(name,(.012,.008,.040),(side*.055,H-.004,0),dark)
 box('handle-grip',(.110,.008,.012),(0,H-.004,.014),dark)
elif profile=='toilet-paper-pack':
 objects=[]
 for row in range(3):
  for side in range(2):
   for deep in range(2):
    bpy.ops.mesh.primitive_cylinder_add(vertices=32,radius=.053,depth=.108,location=((side-.5)*.108,-(deep-.5)*.108,.054+row*.108))
    o=bpy.context.object;identity(o,'temporary-roll',white);objects.append(o)
 merge('rolls',objects,white)
 box('front-label',(W,.210,.002),(0,.125,D/2-.002),main,.001)
 box('back-label',(W,.210,.002),(0,.125,-D/2+.001),main,.001)
 for side,name in [(-1,'left-wrap'),(1,'right-wrap')]:box(name,(.002,.325,D),(side*(W/2-.001),.1625,0),main,.001)
 box('top-seal',(W,.015,.018),(0,H-.0075,0),main,.001)
 front_text('12',0,.125,.050)
else:
 objects=[]
 for row in range(3):
  for side in range(2):objects.append(box('temporary-pack',(.161,.060,.116),((side-.5)*.164,.030+row*.061,0),main,.005))
 merge('packs',objects,main)
 box('front-label',(W,.050,.002),(0,.030,D/2-.002),label,.001)
 box('back-label',(W,.050,.002),(0,.030,-D/2+.001),label,.001)
 for side,name in [(-1,'left-seal'),(1,'right-seal')]:box(name,(.003,.185,D),(side*(W/2-.0015),.0925,0),white,.001)
 box('top-flap',(W-.015,.017,.003),(0,H-.0085,0),white,.001)
 front_text('6',W*.30,.020,.027)
objects=[o for o in scene.objects if o.type=='MESH']
for o in objects:
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
contract={'profile':profile,'materialSlots':1,'parts':[{'name':n,'identity':profile+'-v1:'+n} for n in spec['parts']],'motions':[]}
sys.path.insert(0,str(pathlib.Path(__file__).parent/'lib'))
from blender_asset_preflight import check_contract, from_args
result=check_contract(scene,contract)
from_args(scene)
(out/'preflight-result.json').write_text(json.dumps(result),encoding='utf-8')
bpy.ops.wm.save_as_mainfile(filepath=str(out/(profile+'-v1.blend')))
bpy.ops.export_scene.gltf(filepath=str(out/(profile+'-v1.glb')),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
# Same framing for clay and PBR reviews. Helpers never enter the exported GLB.
engines=scene.render.bl_rna.properties['engine'].enum_items.keys()
scene.render.engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in engines else 'BLENDER_EEVEE';scene.render.resolution_x=640;scene.render.resolution_y=640;scene.render.resolution_percentage=100
scene.world.color=(.35,.35,.35);scene.view_settings.view_transform='AgX'
center=Vector((0,0,H/2));span=max(W,H,D)
bpy.ops.object.camera_add(location=(span*1.2,-span*2.1,H*.5+span*1.3));camera=bpy.context.object;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=span*1.65;scene.camera=camera
for pos,power in [((-.8,-.8,1),90),((.7,.2,.8),70)]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.size=.8;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
clay=mat('review-clay','b5b1a8',.7);saved=[(o,o.data.materials[0]) for o in objects]
for o,_ in saved:o.data.materials[0]=clay
scene.render.filepath=str(out/'clay.png');bpy.ops.render.render(write_still=True)
for o,m in saved:o.data.materials[0]=m
scene.render.filepath=str(out/'material.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'review.blend'))
if '--result' in args:pathlib.Path(args[args.index('--result')+1]).write_text(json.dumps(dict(result,blender=bpy.app.version_string)),encoding='utf-8')
