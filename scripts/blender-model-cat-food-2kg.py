"""User reference pouch. Metres; label is rectified from supplied photograph.
260 x 400 + 120 mm is a generic pouch size, not measured Myfoodie packaging.
"""
import bpy, bmesh, math, pathlib, sys, json
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:];out=pathlib.Path(args[0]);out.mkdir(parents=True,exist_ok=True)
root=pathlib.Path(__file__).resolve().parent.parent
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
source=bpy.data.images.load(str(root/'assets/models/cat-food-2kg/references/style.png'))
pixels=list(source.pixels[:]);sw,sh=source.size
# An atlas: front half, explicitly simplified reverse/side half. Four-corner
# rectification removes the photographed bag's perspective, not its lighting.
tw,th=768,768;data=[]
def edge_at_y(points,y):
 for a,b in zip(points,points[1:]):
  if y<=b[0]:return a[1]+(b[1]-a[1])*(y-a[0])/(b[0]-a[0])
 return points[-1][1]
for y in range(th):
 v=y/(th-1);t=1-v
 for x in range(tw):
  u=x/(tw/2-1)
  if x<tw/2:
   def edge_at(points):
    for a,b in zip(points,points[1:]):
     if t<=b[0]:return a[1]+(b[1]-a[1])*(t-a[0])/(b[0]-a[0])
    return points[-1][1]
   left=edge_at([(0,208),(.20,199),(.55,151),(1,146)]);right=edge_at([(0,711),(.25,699),(.55,672),(1,657)])-12*min(1,t/.18)
   px=left+(right-left)*u;py=(885+(928-885)*u)*t+(100+(76-100)*u)*v
   ix=max(0,min(sw-1,round(px)));iy=max(0,min(sh-1,sh-1-round(py)));i=(iy*sw+ix)*4;data.extend(pixels[i:i+4])
  elif x>=tw*.89:
   # Only the visible physical right side is photographed. Preserve its logo,
   # pale panel, nutrition lines and handling pictograms without inventing text.
   side_u=(x-tw*.89)/(tw-1-tw*.89);py=76+(852-23*side_u)*t
   if py<250:
    # The photographed apex is nearly black purple; extend its measured centre
    # pixel into the occluded folded header instead of adding a pale triangle.
    i=((sh-1-270)*sw+713)*4;data.extend(pixels[i:i+4])
   else:
    left=edge_at_y([(250,712),(270,708),(300,701),(350,689),(400,678),(450,671),(500,667),(600,660),(750,658),(928,657)],py)
    right=edge_at_y([(250,713),(270,716),(300,723),(350,734),(400,745),(450,752),(500,756),(600,760),(800,760),(928,760)],py)
    inset=min(1,(right-left)*.2);left+=inset;right-=inset
    px=left+(right-left)*side_u;ix=max(0,min(sw-1,round(px)));iy=max(0,min(sh-1,sh-1-round(py)));i=(iy*sw+ix)*4;data.extend(pixels[i:i+4])
  else:
   c=(.37,.045,.34,1) if v<.11 or x<tw*.54 or x>tw*.81 else (.77,.74,.81,1)
   data.extend(c)
image=bpy.data.images.new('supplied-front-rectified-and-unprinted-reverse',width=tw,height=th);image.colorspace_settings.name='sRGB';image.pixels[:]=data;image.filepath_raw=str(out/'label-atlas.png');image.file_format='PNG';image.save();image.pack()
def material(name,color):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Roughness'].default_value=.46;return m
printed=material('printed-laminate',(.8,.8,.8));node=printed.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;printed.node_tree.links.new(node.outputs['Color'],printed.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
seal=material('zipper-lavender',(.53,.49,.58))
def point(u,v,side):
 # Smooth inflated body, flattened sealed header, rounded corners, edge folds.
 w=.260*(1-.065*math.sin(math.pi*v)**2)
 fill=min(1,max(0,(.92-v)/.20))
 edge=.002+.038*fill
 depth=.003+.057*fill*min(1,.8+v*5)
 pillow=max(0,1-(2*u-1)**8)**.45
 z=side*(edge+(depth-edge)*pillow)
 z+=side*.0012*math.sin(v*61+u*9)*math.sin(math.pi*u)**2*math.sin(math.pi*v)**2
 return ((u-.5)*w,-z,v*.400)
verts=[];uvs=[];faces=[];nx,ny=48,80
for side in [1,-1]:
 for j in range(ny+1):
  for i in range(nx+1):
   u=i/nx;v=j/ny;verts.append(point(u,v,side));uvs.append((u*.499 if side==1 else .501+(1-u)*.348,v))
stride=nx+1;layer=stride*(ny+1)
for side in range(2):
 off=side*layer
 for j in range(ny):
  for i in range(nx):
   a=off+j*stride+i;f=(a,a+1,a+1+stride,a+stride);faces.append(f if side==0 else f[::-1])
for j in range(ny):
 a=j*stride;b=(j+1)*stride;faces.append((a,b,b+layer,a+layer));a+=nx;b+=nx;faces.append((a,a+layer,b+layer,b))
for i in range(nx):
 faces.append((i,i+layer,i+1+layer,i+1));a=ny*stride+i;faces.append((a,a+1,a+1+layer,a+layer))
mesh=bpy.data.meshes.new('closed-inflated-pouch');mesh.from_pydata(verts,[],faces);mesh.update()
uv=mesh.uv_layers.new(name='label')
for pi,p in enumerate(mesh.polygons):
 p.use_smooth=True
 for li in p.loop_indices:
  vi=mesh.loops[li].vertex_index
  if pi<2*nx*ny:coord=uvs[vi]
  elif pi<2*nx*ny+2*ny and (pi-2*nx*ny)%2==1:coord=(.89+(.109 if vi>=layer else 0),verts[vi][2]/.4)
  else:coord=(.87,verts[vi][2]/.4)
  uv.data[li].uv=coord
o=bpy.data.objects.new('pouch-body',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(printed)
objects=[o]
for index,h in enumerate([.348,.357]):
 # Low relief sealed zipper; no fictitious opening action.
 zv=[];zf=[]
 for j in range(2):
  for i in range(49):
   p=point(.02+.96*i/48,(h+(j-.5)*.0014)/.4,1);zv.append((p[0],p[1]-.0006,p[2]))
 for i in range(48):zf.append((i,i+1,i+50,i+49))
 zm=bpy.data.meshes.new('zipper-relief');zm.from_pydata(zv,[],zf);zm.update();z=bpy.data.objects.new('zipper-'+str(index+1),zm);bpy.context.collection.objects.link(z);z.data.materials.append(seal);objects.append(z)
for o in objects:
 o['furnishStablePart']='cat-food-2kg-v1:'+o.name
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free()
# Normalize the authored maximum envelope, retaining folds and the closed shell.
mins=[min((o.matrix_world@v.co)[i] for o in objects for v in o.data.vertices) for i in range(3)];maxs=[max((o.matrix_world@v.co)[i] for o in objects for v in o.data.vertices) for i in range(3)]
for o in objects:
 for v in o.data.vertices:
  p=o.matrix_world@v.co;p.x=(p.x-(mins[0]+maxs[0])/2)*.260/(maxs[0]-mins[0]);p.y=(p.y-(mins[1]+maxs[1])/2)*.120/(maxs[1]-mins[1]);p.z=(p.z-mins[2])*.400/(maxs[2]-mins[2]);v.co=o.matrix_world.inverted()@p
sys.path.insert(0,str(root/'scripts/lib'));from blender_asset_preflight import from_args
result=from_args(scene)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'cat-food-2kg-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'cat-food-2kg-v1.glb'),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=800;scene.render.resolution_y=900;scene.render.resolution_percentage=100
scene.world.color=(.4,.4,.4);scene.view_settings.view_transform='AgX'
center=Vector((0,0,.20));bpy.ops.object.camera_add(location=(.62,-1.35,.55));camera=bpy.context.object;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=.51;scene.camera=camera
for pos,power in [((-.6,-.8,1),55),((.8,.1,.8),35)]:
 bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.data.energy=power;light.data.size=.8;light.rotation_euler=(center-light.location).to_track_quat('-Z','Y').to_euler()
saved=[(o,o.data.materials[0]) for o in objects];clay=material('review-clay',(.6,.6,.6))
for o,_ in saved:o.data.materials[0]=clay
scene.render.filepath=str(out/'clay.png');bpy.ops.render.render(write_still=True)
for o,m in saved:o.data.materials[0]=m
scene.render.filepath=str(out/'material.png');bpy.ops.render.render(write_still=True)
camera.data.ortho_scale=.47;center=Vector((.06,0,.20));camera.location=Vector((1,-.6,.38));camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/'right-side.png');bpy.ops.render.render(write_still=True)
camera.data.ortho_scale=.13;center=Vector((-.02,-.02,.35));camera.location=center+Vector((.15,-.6,.15));camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/'seal-detail.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'review.blend'))
pathlib.Path(args[args.index('--result')+1]).write_text(json.dumps(dict(result,blender=bpy.app.version_string)))
