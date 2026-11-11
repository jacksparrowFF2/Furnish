"""Xiaomi switch 2/2 Pro exposed fronts. Millimetre reference, Blender metres.
Opaque AG glass appearance is PBR approximation; wall-embedded bases omitted.
"""
import bpy,bmesh,json,math,pathlib,sys,shutil
from mathutils import Vector
ROOT=pathlib.Path(__file__).resolve().parent.parent
args=sys.argv[sys.argv.index('--')+1:];out=pathlib.Path(args[0]);out.mkdir(parents=True,exist_ok=True)
if (out/'panel-xiaomi-switch2-v1.blend').exists():raise ValueError('Use a new author directory')
variants=json.loads(pathlib.Path(args[1]).read_text(encoding='utf8'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC'
def mat(name,c,rough,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');rgb=[int(c[i:i+2],16)/255 for i in (0,2,4)]
 n.inputs['Base Color'].default_value=(*[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb],1);n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal;return m
materials={}
for color in ['white','grey']:
 for series in ['2','2pro']:
  materials[(color,series)]=mat(series+'-'+color+'-opaque-face','f5f5f3' if color=='white' else '535558',.22 if series=='2pro' else .31,.08 if color=='grey' else 0)
backs={c:mat(c+'-painted-frame','e5e5e2' if c=='white' else '45474a',.4) for c in ['white','grey']}
seam=mat('recess-shadow','16191c',.65);led=mat('static-indicator-diffuser','c8d6da',.4)
parts=[];variant='';spec={}
def finish(o,name,m):
 o.name=variant+':'+name;o.data.materials.append(m);o['furnishStablePart']='panel-xiaomi-switch2:'+o.name;o['furnishVariant']=variant;o['furnishRecolor']=False;parts.append(o);return o
def plate(name,x,y,w,h,back,front,m,radii):
 # Independent corner radii: exterior outline stays round, internal key seams crisp.
 points=[]
 for (cx,cy,start),r in zip([(x+w/2-radii[0],y+h/2-radii[0],0),(x-w/2+radii[1],y+h/2-radii[1],90),(x-w/2+radii[2],y-h/2+radii[2],180),(x+w/2-radii[3],y-h/2+radii[3],270)],radii):
  for j in range(7):
   a=math.radians(start+j*90/6);points.append((cx+r*math.cos(a),cy+r*math.sin(a)))
 n=len(points);verts=[]
 for z in [back,front]:
  for px,py in points:
   zz=z-(py/86*1.5 if spec['series']=='2pro' and z> -spec['depth']/2+.01 else 0)
   verts.append((px/1000,-zz/1000,py/1000))
 faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
 return finish(o,name,m)
manifest={}
for variant,spec in variants.items():
 parts=[];d=spec['depth'];front=d/2;n=spec['gangs'];color=spec['color'];pro=spec['series']=='2pro'
 plate('rear-plate',0,43,86,86,-d/2,front-1,backs[color],[2.5]*4)
 plate('rocker-recess',0,43,85.6,85.6,front-1,front-.65,seam,[2.3]*4)
 for i in range(n):
  w=85.4/n-.36;x=-42.7+(i+.5)*85.4/n
  plate('rocker-'+str(i+1),x,43,w,85.4,front-.6,front,materials[(color,spec['series'])],[2.1 if i==n-1 else .24,2.1 if i==0 else .24,2.1 if i==0 else .24,2.1 if i==n-1 else .24])
  # Small, non-emissive status dot near the lower fifth of each key.
  y=15.7;z=front-(y/86*1.5 if pro else 0)
  bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,radius=1,location=(x/1000,-(z+.0002)/1000,y/1000));o=bpy.context.object;o.scale=(.00032,.0000001,.00032)
  if pro:o.rotation_euler.x=-math.atan(1.5/86)
  bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);finish(o,'indicator-'+str(i+1),led)
 for o in parts:
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=1e-9);bmesh.ops.dissolve_degenerate(bm,edges=bm.edges,dist=1e-10);bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(o.data);bm.free()
 manifest[variant]=[o.name.split(':',1)[1] for o in parts]
 bpy.ops.object.select_all(action='DESELECT')
 for o in parts:o.select_set(True)
 bpy.ops.export_scene.gltf(filepath=str(out/(variant+'.glb')),export_format='GLB',use_selection=True,export_extras=True,export_cameras=False,export_lights=False)
default='xiaomi-2pro-2-white';shutil.copyfile(out/(default+'.glb'),out/'panel-xiaomi-switch2-v1.glb')
sys.path.insert(0,str(ROOT/'scripts/lib'));from blender_asset_preflight import check_contract
contract=dict(profile='panel-xiaomi-switch2',materialSlots=1,motions=[],parts=[dict(name=k+':'+n,identity='panel-xiaomi-switch2:'+k+':'+n,role=None) for k,names in manifest.items() for n in names])
(out/'preflight-result.json').write_text(json.dumps(check_contract(bpy.context.scene,contract)),encoding='utf8');(out/'parts.json').write_text(json.dumps(manifest,indent=2),encoding='utf8')
for o in bpy.context.scene.objects:o.hide_render=o.get('furnishVariant')!=default;o.hide_set(o.hide_render)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=700;scene.render.resolution_y=700;scene.render.resolution_percentage=100;scene.world.color=(.65,.65,.65);scene.view_settings.view_transform='AgX'
bpy.ops.object.light_add(type='AREA',location=(.03,-.16,.17));bpy.context.object.data.energy=8;bpy.context.object.data.shape='DISK';bpy.context.object.data.size=.18
bpy.ops.object.camera_add();cam=bpy.context.object;scene.camera=cam;cam.data.type='ORTHO';cam.data.ortho_scale=.115
for view,pos in [('front',(0,-.22,.043)),('oblique',(.13,-.24,.13))]:
 cam.location=pos;cam.rotation_euler=(Vector((0,0,.043))-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/(view+'.png'));bpy.ops.render.render(write_still=True)
scene.view_layers[0].material_override=mat('inspection-grey','aaaaaa',.6);scene.render.filepath=str(out/'grey-oblique.png');bpy.ops.render.render(write_still=True);scene.view_layers[0].material_override=None
bpy.ops.wm.save_as_mainfile(filepath=str(out/'panel-xiaomi-switch2-v1.blend'))
scene.render.resolution_x=1500;scene.render.resolution_y=650;scene.cycles.samples=16
for o in scene.objects:
 if o.type=='LIGHT':o.location=(.275,-.5,.4);o.rotation_euler=(Vector((.275,0,-.017))-o.location).to_track_quat('-Z','Y').to_euler();o.data.size=1.5;o.data.energy=35
for i,k in enumerate(variants):
 for o in scene.objects:
  if o.type=='MESH' and o.get('furnishVariant')==k:o.hide_set(False);o.hide_render=False;o.location.x+=(i%6)*.11;o.location.z-=(i//6)*.12
cam.location=(.275,-1,-.017);cam.rotation_euler=(Vector((.275,0,-.017))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=.69
scene.render.filepath=str(out/'variants.png');bpy.ops.render.render(write_still=True)
print('PANEL_AUTHOR_OK',len(manifest))
