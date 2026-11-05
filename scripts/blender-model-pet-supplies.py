"""Two static pet supplies. Bowl: user image; bag dimensions/printing: declared estimates."""
import bpy, bmesh, math, pathlib, sys, json
from mathutils import Vector
out=pathlib.Path(sys.argv[sys.argv.index('--')+1]);out.mkdir(parents=True,exist_ok=True)
profile=sys.argv[sys.argv.index('--profile')+1]
if profile not in ('pet-bowl','litter-bag'):raise ValueError('Unknown pet supply')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC'
def xyz(p):return (p[0],-p[2],p[1])
def material(name,color,rough,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 values=[int(color[i:i+2],16)/255 for i in (0,2,4)];n.inputs['Base Color'].default_value=(*[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in values],1)
 n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal;return m
cream=material('cream-shell','f0dfb7',.38);steel=material('steel-liner','a9acaa',.24,1);rubber=material('anti-slip','484842',.78);water=material('opaque-water-indication','76abbc',.19,.15)
white=material('white-flexible-package','eeede8',.68);blue=material('blue-print','0068aa',.5);seal=material('crimped-seal','d8dad4',.68)
def mesh(name,verts,faces,mat,smooth=True):
 data=bpy.data.meshes.new(name);data.from_pydata([xyz(v) for v in verts],[],faces);data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(mat);o['furnishStablePart']=profile+'-v1:'+name;o['furnishRecolor']=mat in (cream,white)
 for p in data.polygons:p.use_smooth=smooth
 return o
def lathe(name,section,mat):
 # Axis points share one vertex, so no coincident rings or zero-area centre faces.
 verts=[];rings=[];faces=[];N=96
 for r,y in section:
  ids=[]
  for j in range(N if r else 1):
   a=j*math.tau/N;ids.append(len(verts));verts.append((r*math.cos(a),y,r*math.sin(a)))
  rings.append(ids)
 for k,a in enumerate(rings):
  b=rings[(k+1)%len(rings)]
  if len(a)==len(b)==1:continue
  for j in range(N):
   n=(j+1)%N
   faces.append((a[0],b[n],b[j]) if len(a)==1 else (a[j],a[n],b[0]) if len(b)==1 else (a[j],a[n],b[n],b[j]))
 return mesh(name,verts,faces,mat)
if profile=='pet-bowl':
 lathe('outer-shell',[(.080,0),(.086,.003),(.088,.052),(.087,.060),(.084,.060),(.081,.006),(.079,.003)],cream)
 lathe('steel-liner',[(0,.004),(.076,.004),(.082,.008),(.087,.060),(.090,.062),(.090,.065),(.086,.065),(.083,.061),(.078,.012),(.074,.010),(0,.010)],steel)
 lathe('anti-slip-base',[(0,0),(.080,0),(.080,.002),(0,.002)],rubber)
 lathe('water-surface',[(0,.048),(.080,.048),(.080,.049),(0,.049)],water)
else:
 # Flat bag, W300/D400/H100. Soft pillow with sealed ends, not a rigid carton.
 N=24;verts=[];faces=[]
 def top(x,z):return .015+.085*(1-(x/.15)**4)*(1-(z/.185)**4)
 for side in (1,-1):
  for j in range(N+1):
   z=-.185+.37*j/N
   for i in range(N+1):
    x=-.15+.30*i/N;y=top(x,z) if side==1 else .005-.005*(1-(x/.15)**4)*(1-(z/.185)**4)
    verts.append((x,y,z))
 count=(N+1)**2
 for s in (0,1):
  for j in range(N):
   for i in range(N):
    a=s*count+j*(N+1)+i;f=(a,a+1,a+N+2,a+N+1);faces.append(f if s==0 else tuple(reversed(f)))
 edges=list(range(N+1))+[j*(N+1)+N for j in range(1,N+1)]+[N*(N+1)+i for i in range(N-1,-1,-1)]+[j*(N+1) for j in range(N-1,0,-1)]
 for a,b in zip(edges,edges[1:]+edges[:1]):faces.append((a,b,b+count,a+count))
 mesh('soft-package',verts,faces,white)
 for side,name in [(-1,'seal-back'),(1,'seal-front')]:
  v=[];f=[]
  for z in [side*.185,side*.2]:
   for y in [.005,.015]:
    for i in range(33):x=-.15+.30*i/32;v.append((x,y+.0006*math.cos(i*math.pi),z))
  for layer in [0,1]:
   a=layer*33
   for i in range(32):f.append((a+i,a+i+1,a+i+67,a+i+66))
  for z in [0,1]:
   a=z*66
   for i in range(32):f.append((a+i,a+i+33,a+i+34,a+i+1))
  f.extend([(0,66,99,33),(32,65,131,98)])
  mesh(name,v,f,seal)
 for text,name,sz,z in [('Mix','mix-print',.065,-.130),('2.5 kg','weight-print',.023,.075)]:
  bpy.ops.object.text_add();o=bpy.context.object;o.data.body=text;o.data.size=sz;o.data.align_x='CENTER';o.data.resolution_u=3;o.data.extrude=.00015;o.data.bevel_depth=0
  bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.name=name
  bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.triangulate(bm,faces=list(bm.faces));bmesh.ops.subdivide_edges(bm,edges=list(bm.edges),cuts=1,use_grid_fill=True);bm.to_mesh(o.data);bm.free()
  for v in o.data.vertices:
   x=v.co.x;d=-(v.co.y+z);v.co=Vector(xyz((x,top(x,d)+.001+v.co.z,d)))
  o.data.materials.append(blue);o['furnishStablePart']=profile+'-v1:'+name
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in objects:
 if profile=='litter-bag':
  for v in o.data.vertices:v.co.x*=250/300;v.co.y*=220/400;v.co.z*=80/100
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=1e-8);bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
 if any(f.calc_area()<1e-15 for f in bm.faces):raise ValueError('Degenerate mesh: '+o.name)
 bm.to_mesh(o.data);bm.free()
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent/'lib'))
from blender_asset_preflight import from_args
from_args(bpy.context.scene)
bpy.ops.wm.save_as_mainfile(filepath=str(out/(profile+'-v1.blend')))
bpy.ops.export_scene.gltf(filepath=str(out/(profile+'-v1.glb')),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
# Same-camera geometry and material stages; scene helpers are excluded from published GLB.
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=800;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.world.color=(.5,.5,.5)
center=Vector((0,0,.032 if profile=='pet-bowl' else .05))
bpy.ops.object.camera_add(location=(.20,-.32,.23) if profile=='pet-bowl' else (.45,-.65,.62));cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=.27 if profile=='pet-bowl' else .57;scene.camera=cam
for p,power,size in [((-.4,-.4,.6),70,.5),((.4,.2,.4),50,.4)]:
 bpy.ops.object.light_add(type='AREA',location=p);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
gray=material('review-clay','a7a7a2',.7);old=[(o,list(o.data.materials)) for o in objects]
for o,_ in old:o.data.materials.clear();o.data.materials.append(gray)
scene.render.filepath=str(out/'clay-front.png');bpy.ops.render.render(write_still=True)
for o,mats in old:o.data.materials.clear();[o.data.materials.append(m) for m in mats]
scene.render.filepath=str(out/'material-front.png');bpy.ops.render.render(write_still=True)
cam.location=(.30,.2,.25) if profile=='pet-bowl' else (-.5,.6,.65);cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/'material-back.png');bpy.ops.render.render(write_still=True)
if '--result' in sys.argv:pathlib.Path(sys.argv[sys.argv.index('--result')+1]).write_text(json.dumps({'passed':True,'parts':len(objects),'blender':bpy.app.version_string}),encoding='utf-8')
