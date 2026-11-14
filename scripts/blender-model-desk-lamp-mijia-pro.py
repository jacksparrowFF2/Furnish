"""MJTD07YL reference pose: labelled dimensions plus documented visual estimates.
Blender mesh coordinates X,-Z,Y correspond to Furnish X,Y,Z. No install height.
"""
import bpy, json, math, pathlib, sys
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]
out=pathlib.Path(args[0]).resolve();out.mkdir(parents=True,exist_ok=True)
spec=json.loads((pathlib.Path(__file__).parent/'lib/desk-lamp-mijia-pro-spec.json').read_text(encoding='utf-8'))
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
def material(name,color,roughness,metallic=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF')
 def linear(v):v=int(v,16)/255;return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
 n.inputs['Base Color'].default_value=(*[linear(color[i:i+2]) for i in (0,2,4)],1);n.inputs['Roughness'].default_value=roughness;n.inputs['Metallic'].default_value=metallic;return m
white=material('white-coated-shell','f5f5f2',.38)
diffuse=material('opal-diffuser','f9faf5',.62)
metal=material('hinge-satin-metal','b6b8b7',.32,.7)
seam=material('subtle-shadow-seam','c5c7c5',.65)
rubber=material('rubber-and-wire','656969',.83)
ink=material('control-gray-symbols','a5a9a7',.64)
def point(p):return Vector((p[0]/1000,-p[2]/1000,p[1]/1000))
def finish(o,name,mat):
 o.name=name;o.data.materials.append(mat);o['furnishStablePart']='desk-lamp-mijia-pro-v1:'+name;o['furnishRecolor']=mat==white
 bpy.context.view_layer.objects.active=o
 if o.modifiers:
  for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def box(name,size,center,mat,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=point(center));o=bpy.context.object;o.dimensions=(size[0]/1000,size[2]/1000,size[1]/1000);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('physical-soft-edge','BEVEL');mod.width=bevel/1000;mod.segments=4
  mod=o.modifiers.new('face-normals','WEIGHTED_NORMAL');mod.keep_sharp=True
 return finish(o,name,mat)
def cylinder(name,radius,depth,center,axis,mat):
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=radius/1000,depth=depth/1000,location=point(center));o=bpy.context.object
 direction=point(axis).normalized();o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(direction)
 for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
 mod=o.modifiers.new('rounded-lip','BEVEL');mod.width=min(.00055,depth/6000);mod.segments=3
 mod=o.modifiers.new('weighted-cap-normals','WEIGHTED_NORMAL');mod.keep_sharp=True
 return finish(o,name,mat)
# Separate sole, perimeter seam, rigid weighted base and actual feet.
box('base-shell',[213,12,159],[0,9.5,-130.5],white,5)
box('base-seam',[211,1.2,157],[0,3.2,-130.5],seam,.5)
box('base-sole',[208,1.3,154],[0,2,-130.5],white,.6)
for x,side in [(-85,'left'),(85,'right')]:
 for z,end in [(-190,'back'),(-71,'front')]:box('foot-'+side+'-'+end,[18,1.4,12],[x,.7,z],rubber,2)
box('post',[22,419,20],[0,225,-177],white,1.6)
box('post-socket',[26,5,24],[0,17.5,-177],white,2)
cylinder('rear-hinge',19,25,[0,451,-177],[1,0,0],metal)
for x,side in [(-13.1,'left'),(13.1,'right')]:cylinder('rear-hinge-cap-'+side,15.2,1.4,[x,451,-177],[1,0,0],white)
box('reach-arm',[22,18,344],[0,451,-5],white,1.8)
box('arm-seam',[16,1,327],[0,441.8,-5],seam,.4)
cylinder('front-joint',13,32,[0,449,167],[1,0,0],metal)
box('head-center',[57,24,56],[0,443.5,167],white,4)
for x,side in [(-143,'left'),(143,'right')]:
 box('head-'+side,[234,16,56],[x,443.5,167],white,3.7)
 box('diffuser-'+side,[226,1.2,44],[x,436.3,167],diffuse,3)
# Real annular rim: a solid cylinder would hide the recessed face and controls.
verts=[];faces=[];segments=64
for z,r in [(-12,21.5),(12,21.5),(-12,19.4),(12,19.4)]:
 for i in range(segments):t=i*math.tau/segments;verts.append((r*math.cos(t)/1000,r*math.sin(t)/1000,z/1000))
for i in range(segments):
 j=(i+1)%segments
 for a,b,c,d in [(i,j,segments+j,segments+i),(2*segments+i,3*segments+i,3*segments+j,2*segments+j),(i,2*segments+i,2*segments+j,j),(segments+i,segments+j,3*segments+j,3*segments+i)]:faces.append((a,b,c,d))
mesh=bpy.data.meshes.new('open-control-rim');mesh.from_pydata(verts,[],faces);mesh.update()
import bmesh
bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(mesh);bm.free()
o=bpy.data.objects.new('control-rim',mesh);bpy.context.collection.objects.link(o);o.location=point([0,443,198]);o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(point([0,0,1]).normalized());finish(o,'control-rim',metal)
cylinder('control-face',19.3,1,[0,443,209.4],[0,0,1],white)
for name,x,y in [('power',0,452),('auto',9,443),('seat',0,434),('time',-9,443)]:cylinder('control-mark-'+name,.8,.12,[x,y,209.92],[0,0,1],ink)
curve=bpy.data.curves.new('hinge-cable','CURVE');curve.dimensions='3D';curve.bevel_depth=.00065;curve.bevel_resolution=3
spline=curve.splines.new('BEZIER');spline.bezier_points.add(3)
for p,co in zip(spline.bezier_points,[[0,451,-195],[0,466,-191],[0,467,-174],[0,455,-160]]):p.co=point(co);p.handle_left_type=p.handle_right_type='AUTO'
o=bpy.data.objects.new('hinge-cable',curve);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True)
bpy.ops.object.convert(target='MESH');finish(bpy.context.object,'hinge-cable',rubber)
sys.path.insert(0,str(pathlib.Path(__file__).parent/'lib'))
from blender_asset_preflight import from_args
from_args(scene)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'desk-lamp-mijia-pro-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'desk-lamp-mijia-pro-v1.glb'),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
result={'passed':True,'parts':len(spec['parts']),'blender':bpy.app.version_string,'pose':'static horizontal; overall depth 420mm is a model estimate'}
pathlib.Path(args[args.index('--result')+1]).write_text(json.dumps(result),encoding='utf-8')
