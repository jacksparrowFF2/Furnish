"""MXC3P indoor unit. Product-image scale; finer geometry is an appearance estimate.
Furnish X,Y,Z -> Blender X,-Z,Y; installation height belongs to product rules.
"""
import bpy, bmesh, json, math, pathlib, sys
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]
out=pathlib.Path(args[0]).resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
def point(p):return Vector((p[0]/1000,-p[2]/1000,p[1]/1000))
def material(name,color,roughness,metal=0):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF')
 def linear(v):v=int(v,16)/255;return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
 n.inputs['Base Color'].default_value=(*[linear(color[i:i+2]) for i in (0,2,4)],1);n.inputs['Roughness'].default_value=roughness;n.inputs['Metallic'].default_value=metal;return m
white=material('warm-white-ABS','f4f4f1',.28)
rear=material('rear-white-ABS','ecece8',.43)
dark=material('outlet-dark-polymer','262b2a',.7)
chrome=material('reflective-silver-trim','bfc3c4',.19,.92)
mark=material('silver-brand','969d9e',.3,.65)
def finish(o,name,mat):
 o.name=name;o.data.materials.append(mat);o['furnishStablePart']='acwall-midea-mxc3p-v1:'+name;o['furnishRecolor']=mat==white
 bpy.context.view_layer.objects.active=o
 for mod in list(o.modifiers):bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def box(name,size,center,mat,r=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=point(center));o=bpy.context.object;o.dimensions=(size[0]/1000,size[2]/1000,size[1]/1000);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if r:
  m=o.modifiers.new('molded-edge','BEVEL');m.width=r/1000;m.segments=6
  m=o.modifiers.new('weighted-face-normal','WEIGHTED_NORMAL');m.keep_sharp=True
 for poly in o.data.polygons:poly.use_smooth=True
 return finish(o,name,mat)
def section(name,points,width,mat,x=0):
 # Closed Y/Z cross-section, extruded rigidly along X. Caps and rounded tips.
 n=len(points);vs=[point([side*width/2+x,y,z]) for side in [-1,1] for y,z in points]
 fs=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vs,[],fs);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(mesh);bm.free()
 for p in mesh.polygons:p.use_smooth=len(p.vertices)==4
 return finish(o,name,mat)
def arc_band(name,cy,cz,ry,rz,a,b,width,thick,mat):
 pts=[]
 for inset,angles in [(0,range(49)),(thick,range(48,-1,-1))]:
  for i in angles:
   t=a+(b-a)*i/48;pts.append((cy+(ry-inset)*math.sin(t),cz+(rz-inset)*math.cos(t)))
 return section(name,pts,width,mat)
def join_parts(objects,name,mat):
 bpy.ops.object.select_all(action='DESELECT')
 for o in objects:o.select_set(True)
 bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();o=bpy.context.object
 o.data.materials.clear();o.data.materials.append(mat)
 for p in o.data.polygons:p.material_index=0
 o.name=name;o['furnishStablePart']='acwall-midea-mxc3p-v1:'+name
 return o
# Broad softly molded panel above a separate lower outlet, not a filled front box.
shell=box('rear-shell',[858,295,135],[0,147.5,-32],rear,15)
# Recess the top inlet in the production shell so its grid is not buried.
cutter=box('temporary-intake-cut',[788,14,75],[0,294,-46],rear)
bpy.context.view_layer.objects.active=shell
mod=shell.modifiers.new('actual-top-intake-recess','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
box('front-panel',[858,218,46],[0,186,76.5],white,11)
for x,side in [(-427,'left'),(427,'right')]:
 box(side+'-cheek',[16,287,188],[x,145.5,-1.5],white,7.9)
# A true 39 mm deep dark recess with independent roof/floor. No black decal.
box('outlet-back',[822,57,3],[0,37,42],dark,1)
box('outlet-floor',[821,3,45],[0,9,65],dark,1)
box('outlet-roof',[821,3,42],[0,67,64],dark,1)
# Chrome line wraps around rounded ends of the mouth, as in the close-up.
box('chrome-upper',[830,2.4,2.2],[0,73,97],chrome,1)
box('chrome-lower',[815,1.7,2],[0,5.5,87],chrome,.7)
for x,side in [(-416,'left'),(416,'right')]:
 pts=[]
 for r,seq in [(35,range(49)),(33.2,range(48,-1,-1))]:
  for i in seq:
   t=-math.pi/2+math.pi*i/48;pts.append((39+r*math.sin(t),85+(10-(35-r))*math.cos(t)))
 section('chrome-'+side,pts,2,chrome,x)
# Nearly closed catalogue pose: the two curved vanes retain a shadow opening.
arc_band('upper-vane',40,52,31,44,.45,1.45,816,2,white)
arc_band('lower-vane',40,52,37,42,-1.52,.08,815,2.2,white)
louvers=[]
for i in range(27):louvers.append(box('louver-'+str(i),[1.2,38,22],[-390+i*30,35,59],dark,.4))
join_parts(louvers,'outlet-louvers',dark)
# Top intake has real slots; grid bars are visual sampling, not a factory count.
box('top-intake-frame',[786,2,73],[0,292,-46],dark,.8)
bars=[]
for i in range(43):bars.append(box('intake-rib-'+str(i),[3,3,72],[-378+i*18,293.5,-46],rear,.7))
for z in [-79,-13]:bars.append(box('intake-edge',[783,3,3],[0,293.5,z],rear,.7))
join_parts(bars,'top-intake-bars',rear)
# The legible brand is geometry. No invented small label, energy sticker or digits.
curve=bpy.data.curves.new('Midea-mark','FONT');curve.body='Midea';curve.size=.012;curve.extrude=.00010;curve.bevel_depth=.00003;curve.resolution_u=8
o=bpy.data.objects.new('brand-mark',curve);bpy.context.collection.objects.link(o);o.location=point([-389,101,99.37]);o.rotation_euler=(math.pi/2,0,0)
bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');finish(bpy.context.object,'brand-mark',mark)
sys.path.insert(0,str(pathlib.Path(__file__).parent/'lib'))
from blender_asset_preflight import from_args
from_args(scene)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'acwall-midea-mxc3p-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'acwall-midea-mxc3p-v1.glb'),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
pathlib.Path(args[args.index('--result')+1]).write_text(json.dumps({'passed':True,'parts':len([o for o in scene.objects if o.type=='MESH']),'blender':bpy.app.version_string,'pose':'static nearly closed reference'}),encoding='utf8')
