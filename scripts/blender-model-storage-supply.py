"""Closed storage inventories, in metres. Dimensions/evidence live in the spec and docs.
No operating lids, internal capacity or packaging-batch fidelity is claimed.
"""
import bpy, bmesh, json, pathlib, sys, math
from mathutils import Vector, Matrix
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
if spec.get('shape')=='beverage-can':
 # Closed generic 202-end can. Outer envelope is sourced; local profiles are
 # visual estimates. One centre vertex per cap avoids degenerate axis rings.
 main.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.3
 def lathe(name,section,m):
  verts=[];rings=[];faces=[];N=64
  for y,r in section:
   ring=[]
   for j in range(1 if r==0 else N):
    a=j*math.tau/N;ring.append(len(verts));verts.append((r*math.cos(a),-r*math.sin(a),y))
   rings.append(ring)
  for first,second in zip(rings,rings[1:]):
   for j in range(N):
    if len(first)==1:faces.append((first[0],second[j],second[(j+1)%N]))
    elif len(second)==1:faces.append((first[j],second[0],first[(j+1)%N]))
    else:faces.append((first[j],second[j],second[(j+1)%N],first[(j+1)%N]))
  mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);identity(o,name,m)
  for p in mesh.polygons:p.use_smooth=True
  return o
 R=W/2
 lathe('body',[(.006,0),(.006,.017),(.004,.022),(.001,.025),(.0007,.026),(.002,.028),(.005,.0305),(.009,R-.0005),(.012,R),(H-.020,R),(H-.016,R-.0003),(H-.012,.030),(H-.008,.027),(H-.004,.0265),(H-.0035,0)],main)
 lathe('bottom-rim',[(.0007,.0255),(0,.026),(0,.027),(.0007,.028),(.002,.028),(.0025,.027),(.002,.026),(.0007,.0255)],silver)
 lathe('top-rim',[(H-.004,.0265),(H-.0025,.0274),(H-.001,.0277),(H,.0272),(H,.0265),(H-.001,.0258),(H-.003,.0258),(H-.004,.0265)],silver)
 lathe('lid',[(H-.0037,0),(H-.0037,.022),(H-.0028,.024),(H-.0018,.0258),(H-.0013,.026),(H-.002,.025),(H-.0032,.023),(H-.0032,0)],silver)
 # Closed scored tear panel; the tab opening itself is a real through-hole.
 curve=bpy.data.curves.new('score','CURVE');curve.dimensions='3D';curve.bevel_depth=.00013;curve.bevel_resolution=2;spline=curve.splines.new('POLY');spline.points.add(63)
 for j,p in enumerate(spline.points):
  a=j*math.tau/64;p.co=(.009*math.cos(a),-(.010+.008*math.sin(a)),H-.00305,1)
 spline.use_cyclic_u=True;o=bpy.data.objects.new('score-line',curve);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');identity(bpy.context.object,'score-line',dark)
 verts=[];faces=[];N=48
 for y,rx,rz,cz in [(H-.0025,.007,.012,-.003),(H-.0017,.007,.012,-.003),(H-.0017,.0042,.006,-.006),(H-.0025,.0042,.006,-.006)]:
  for j in range(N):
   a=j*math.tau/N;verts.append((rx*math.cos(a),-(cz+rz*math.sin(a)),y))
 for k in range(4):
  for j in range(N):faces.append((k*N+j,k*N+(j+1)%N,((k+1)%4)*N+(j+1)%N,((k+1)%4)*N+j))
 mesh=bpy.data.meshes.new('tab');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('pull-tab',mesh);bpy.context.collection.objects.link(o);identity(o,'pull-tab',silver)
 lathe('tab-rivet',[(H-.0032,0),(H-.0032,.0018),(H-.0011,.0018),(H-.0009,.0012),(H-.0009,0)],silver)
elif spec.get('shape')=='roll-layer':
 # Measured outer dimensions; centre hole diameter is an explicit visual estimate.
 # Separate stable roll objects preserve quantity and measurable unit geometry.
 uw,uh,ud=[v/1000 for v in spec['unitSize']]
 for z in range(3):
  for x in range(3):
   verts=[];faces=[];N=48
   section=[(0,uw/2-.001),(.001,uw/2),(uh-.001,uw/2),(uh,uw/2-.001),(uh,.012),(0,.012)]
   for y,r in section:
    for j in range(N):
     a=j*math.tau/N;verts.append(((x-1)*uw+r*math.cos(a),-((z-1)*ud+r*math.sin(a)),y))
   for band in range(len(section)):
    for j in range(N):faces.append((band*N+j,band*N+(j+1)%N,((band+1)%len(section))*N+(j+1)%N,((band+1)%len(section))*N+j))
   data=bpy.data.meshes.new('roll');data.from_pydata(verts,[],faces);data.update();o=bpy.data.objects.new('roll',data);bpy.context.collection.objects.link(o)
   identity(o,'roll-'+str(z*3+x+1).zfill(2),white)
elif spec.get('shape')=='tissue-layer':
 uw,uh,ud=[v/1000 for v in spec['unitSize']]
 for z in range(2):
  for x in range(3):
   number=z*3+x+1;px=(x-1)*uw;pz=(z-.5)*ud
   box(f'pack-{number:02}-body',(uw,uh-.001,ud),(px,(uh-.001)/2,pz),main,.004)
   box(f'pack-{number:02}-seal',(uw-.012,.001,ud-.008),(px,uh-.0005,pz),white,.0002)
   box(f'pack-{number:02}-slot',(.065,.0003,.009),(px,uh-.00015,pz),dark,.0001)
elif spec.get('shape')=='freeze-dry-bucket':
 # Rounded-rectangle rings, sampled per physical corner. All values below are
 # visual estimates within the user's labelled 316 x 309 x 187 mm envelope.
 def outline(w,d,r):
  points=[]
  for cx,cz,a in [(w/2-r,d/2-r,0),(-w/2+r,d/2-r,90),(-w/2+r,-d/2+r,180),(w/2-r,-d/2+r,270)]:
   for j in range(17):
    t=math.radians(a+j*90/16);points.append((cx+r*math.cos(t),cz+r*math.sin(t)))
  return points
 def loft(name,rings,m):
  verts=[];faces=[];n=68
  for y,w,d,r in rings:verts.extend((x,-z,y) for x,z in outline(w,d,r))
  for k in range(len(rings)-1):
   for j in range(n):faces.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
  faces.extend([tuple(reversed(range(n))),tuple((len(rings)-1)*n+j for j in range(n))])
  mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);identity(o,name,m)
  for f in mesh.polygons:f.use_smooth=len(f.vertices)==4
  mod=o.modifiers.new('weighted-surface-normals','WEIGHTED_NORMAL');mod.keep_sharp=True;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
  return o
 seam=mat('warm-shadow','b7ab98',.65);ink=mat('pale-brand','c1b6a3',.65)
 loft('body',[(0,.246,.239,.044),(.002,.259,.252,.049),(.008,.270,.263,.052),(.019,.279,.272,.055),(.045,.285,.278,.055),(.157,.294,.287,.056),(.171,.301,.294,.058),(.174,.301,.294,.058)],main)
 loft('lid-seam',[(.173,.305,.298,.060),(.1785,.308,.301,.061)],seam)
 loft('lid',[(.178,.313,.306,.062),(.180,.316,.309,.063),(.185,.316,.309,.063),(.187,.312,.305,.061),(.187,.298,.291,.056),(.1855,.294,.287,.054)],main)
 loft('lid-recess',[(.1856,.291,.284,.053),(.1858,.290,.283,.053)],main)
 box('front-release',(.044,.006,.012),(-.080,.1725,.145),main,.002)
 # A folded strap on each side, with an open centre and separate pivot disks.
 for side,labelside in [(-1,'left'),(1,'right')]:
  verts=[];faces=[];steps=48
  for j in range(steps+1):
   t=math.pi*j/steps;z=.079*math.cos(t);y=.160-.109*math.sin(t);x=side*(.149+.006*math.sin(t))
   # ribbon width follows tangent in depth/height plane; thickness along X.
   dz=-.079*math.sin(t);dy=-.109*math.cos(t);length=math.hypot(dz,dy);nz=-dy/length*.006;ny=dz/length*.006
   for thick,width in [(-1,-1),(-1,1),(1,1),(1,-1)]:verts.append((x+thick*.0015,-(z+width*nz),y+width*ny))
  for j in range(steps):
   for k in range(4):faces.append((j*4+k,j*4+(k+1)%4,(j+1)*4+(k+1)%4,(j+1)*4+k))
  faces.extend([(3,2,1,0),tuple(steps*4+k for k in range(4))])
  mesh=bpy.data.meshes.new('strap');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(labelside+'-handle',mesh);bpy.context.collection.objects.link(o);identity(o,labelside+'-handle',main)
  bevel=o.modifiers.new('strap-edge','BEVEL');bevel.width=.0007;bevel.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=bevel.name)
  for f in o.data.polygons:f.use_smooth=True
  pivots=[]
  for z in [-.079,.079]:
   bpy.ops.mesh.primitive_cylinder_add(vertices=40,radius=.0105,depth=.004,location=(side*.149,-z,.160),rotation=(0,math.pi/2,0));o=bpy.context.object;identity(o,'pivot-temp',main);pivots.append(o)
  merge(labelside+'-pivots',pivots,main)
 # Readable brand only; unreadable small print is intentionally omitted.
 bpy.ops.object.text_add(location=(-.025,-.143,.135));o=bpy.context.object;o.rotation_euler=(Matrix.Rotation(math.pi/2,4,'X') @ Matrix.Rotation(-math.pi/2,4,'Z')).to_euler();o.data.body='meoof.';o.data.size=.029;o.data.extrude=.00012;o.data.resolution_u=5
 bpy.ops.object.convert(target='MESH');o=bpy.context.object
 # Wrap the vertical imprint onto the shallow taper instead of floating it.
 bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
 for v in o.data.vertices:
  h=v.co.z+o.location.z;depth=.278+(.287-.278)*(h-.045)/(.157-.045)
  v.co.y=-(depth/2+.00018)-o.location.y+v.co.y
 identity(o,'brand-mark',ink)
elif spec.get('shape')=='wet-wipes':
 box('soft-body',(W,H-.009,D),(0,(H-.009)/2,0),main,.006)
 box('top-seal',(W-.012,.001,D-.012),(0,H-.0085,0),white,.0002)
 box('lid-frame',(.085,.004,.055),(0,H-.006,0),dark,.001)
 box('lid',(.080,.004,.050),(0,H-.002,0),white,.001)
elif profile in ('storage-toolbox','medicine-box'):
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
bpy.ops.object.camera_add(location=(span*1.2,-span*2.1,H*.5+span*1.3));camera=bpy.context.object
if spec.get('shape')=='freeze-dry-bucket':camera.location=(span*1.15,-span*2.5,H*.5+span*.65)
camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=span*1.65;scene.camera=camera
for pos,power in [((-.8,-.8,1),90),((.7,.2,.8),70)]:
 bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.size=.8;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
clay=mat('review-clay','b5b1a8',.7);saved=[(o,o.data.materials[0]) for o in objects]
for o,_ in saved:o.data.materials[0]=clay
if spec.get('shape') in ('freeze-dry-bucket','beverage-can'):
 silhouette_parts=('body','top-rim','bottom-rim') if spec.get('shape')=='beverage-can' else ('body','lid','lid-seam','lid-recess')
 for o in objects:o.hide_render=o.name not in silhouette_parts
 scene.render.filepath=str(out/'silhouette.png');bpy.ops.render.render(write_still=True)
 for o in objects:o.hide_render=False
scene.render.filepath=str(out/'clay.png');bpy.ops.render.render(write_still=True)
for o,m in saved:o.data.materials[0]=m
scene.render.filepath=str(out/'material.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'review.blend'))
if '--result' in args:pathlib.Path(args[args.index('--result')+1]).write_text(json.dumps(dict(result,blender=bpy.app.version_string)),encoding='utf-8')
