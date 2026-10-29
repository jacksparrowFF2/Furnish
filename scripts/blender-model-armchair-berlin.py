"""Berlin armchair from the user's two product images. Background Blender only.
Dimensions are metres; photographed joinery and unlabelled details are approximate.
"""
import bpy, bmesh, math, pathlib, sys, json
from mathutils import Vector
out=pathlib.Path(sys.argv[sys.argv.index('--')+1]).resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC'
def xyz(p):return Vector((p[0],-p[2],p[1]))
def material(name,color,rough):
    m=bpy.data.materials.new(name);m.use_nodes=True;n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    def lin(v):
        v=int(v,16)/255;return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
    n.inputs['Base Color'].default_value=(*[lin(color[i:i+2]) for i in (0,2,4)],1);n.inputs['Roughness'].default_value=rough
    return m
wood=material('natural-wood','bd915f',.46);cloth=material('linen-beige','d3c9b8',.96);seam=material('linen-piping','c1b59f',.95)
def finish(o,name,mat):
    o.name=name;o.data.materials.append(mat);o['furnishStablePart']='armchair-berlin-v1:'+name;o['furnishRecolor']=mat==wood
    return o
def box(name,size,center,mat,r=.006):
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(center));o=bpy.context.object;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    m=o.modifiers.new('soft corners','BEVEL');m.width=r;m.segments=4;bpy.ops.object.modifier_apply(modifier=m.name)
    m=o.modifiers.new('weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=m.name)
    return finish(o,name,mat)
def rod(name,a,b,r1,r2):
    a,b=xyz(a),xyz(b);delta=b-a
    bpy.ops.mesh.primitive_cone_add(vertices=20,radius1=r1,radius2=r2,depth=delta.length,location=(a+b)/2)
    o=bpy.context.object;o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(delta)
    for p in o.data.polygons:p.use_smooth=len(p.vertices)==4
    m=o.modifiers.new('rounded ends','BEVEL');m.width=.002;m.segments=3;bpy.ops.object.modifier_apply(modifier=m.name)
    return finish(o,name,wood)
def soft(name,size,center,angle=0,r=.035,puff=.008):
    half=[v/2 for v in size];vertices=[];faces=[];a=math.radians(angle)
    def transform(p):return (center[0]+p[0],center[1]+p[1]*math.cos(a)+p[2]*math.sin(a),center[2]-p[1]*math.sin(a)+p[2]*math.cos(a))
    for axis in range(3):
        other=[k for k in range(3) if k!=axis]
        for side in (-1,1):
            n=[16 if size[k]>.2 else 6 for k in other];start=len(vertices)
            for j in range(n[1]+1):
                for i in range(n[0]+1):
                    p=Vector((0,0,0));p[axis]=side*half[axis];p[other[0]]=(2*i/n[0]-1)*half[other[0]];p[other[1]]=(2*j/n[1]-1)*half[other[1]]
                    inner=Vector([max(-half[k]+r,min(half[k]-r,p[k])) for k in range(3)]);p=inner+(p-inner).normalized()*r
                    original=p.copy()
                    for k in range(3):
                        axes=[m for m in range(3) if m!=k]
                        edge=math.prod(max(0,1-(original[m]/half[m])**2) for m in axes)
                        p[k]+=math.copysign(puff*edge*max(0,(abs(original[k])-half[k]+r)/r),original[k])
                    vertices.append(xyz(transform(p)))
            for j in range(n[1]):
                for i in range(n[0]):
                    k=start+j*(n[0]+1)+i;faces.append((k,k+1,k+n[0]+2,k+n[0]+1))
    data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o)
    for p in data.polygons:p.use_smooth=True
    return finish(o,name,cloth)
def piping(name,w,h,depth,center,angle=0,r=.025):
    points=[];a=math.radians(angle)
    for cx,cy,start in [(w/2-r,h/2-r,0),(-w/2+r,h/2-r,90),(-w/2+r,-h/2+r,180),(w/2-r,-h/2+r,270)]:
        for i in range(9):
            t=math.radians(start+i*90/8);x=cx+r*math.cos(t);y=cy+r*math.sin(t)
            points.append(xyz((center[0]+x,center[1]+y*math.cos(a)+depth*math.sin(a),center[2]-y*math.sin(a)+depth*math.cos(a))))
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=.0013;c.bevel_resolution=2;s=c.splines.new('POLY');s.points.add(len(points)-1)
    for p,v in zip(s.points,points):p.co=(*v,1)
    s.use_cyclic_u=True;o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o;o.select_set(True)
    bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.select_set(False);finish(o,name,seam)

# Open timber structure, thin straight arms, four splayed tapered legs.
box('seat-front-rail',(.618,.043,.034),(0,.2925,.353),wood,.007)
box('seat-back-rail',(.600,.043,.032),(0,.2925,-.285),wood,.007)
for s in (-1,1):
    box('seat-side-'+str(s),(.033,.044,.657),(s*.297,.292,.032),wood,.007)
    rod('front-leg-'+str(s),(s*.331,.012,.400),(s*.317,.556,.295),.014,.0175)
    rod('rear-leg-'+str(s),(s*.326,.013,-.405),(s*.317,.556,-.185),.014,.0175)
    box('straight-arm-'+str(s),(.050,.024,.662),(s*.330,.568,.020),wood,.0115)
    rod('back-stile-'+str(s),(s*.252,.297,-.248),(s*.252,.730,-.374),.016,.017)
for i in range(5):box('seat-slat-'+str(i),(.070,.016,.632),((i-2)*.117,.303,.035),wood,.003)
box('back-top-rail',(.517,.030,.027),(0,.720,-.373),wood,.006)
for i in range(4):rod('back-slat-'+str(i),((i-1.5)*.132,.320,-.256),((i-1.5)*.132,.716,-.367),.010,.010)

# Annotated cushion envelope: seat 620 x 710 x 150, back 530 x 580 x 120.
soft('seat-cushion',(.620,.150,.710),(0,.385,.045),r=.042,puff=.006)
soft('back-cushion',(.530,.580,.120),(0,.564,-.233),angle=18,r=.038,puff=.008)
piping('back-piping',.504,.552,.050,(0,.564,-.233),18,.042)
# Waist pillow size/tilt estimated from the photograph; not a measured SKU dimension.
soft('waist-pillow',(.405,.190,.080),(0,.525,-.110),angle=18,r=.030,puff=.012)
piping('waist-piping',.381,.166,.043,(0,.525,-.110),18,.020)
# Seat piping is a horizontal loop, 22 mm below the top of the cushion.
piping('seat-piping',.592,.682,0,(0,.436,.045),90,.042)

bpy.context.view_layer.update();objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
points=[o.matrix_world@v.co for o in objects for v in o.data.vertices];lo=[min(p[k] for p in points) for k in range(3)];hi=[max(p[k] for p in points) for k in range(3)]
for o in objects:
    matrix=o.matrix_world.copy()
    for v in o.data.vertices:
        p=matrix@v.co
        y=(p.z-lo[2])*.310/(.310-lo[2]) if p.z<.310 else p.z if p.z<=.460 else .460+(p.z-.460)*(.845-.460)/(hi[2]-.460)
        v.co=((p.x-lo[0])*.710/(hi[0]-lo[0])-.355,(p.y-lo[1])*.850/(hi[1]-lo[1])-.425,y)
    o.matrix_world.identity()
    if o.name=='seat-cushion':
        low=[min(v.co[k] for v in o.data.vertices) for k in range(3)];high=[max(v.co[k] for v in o.data.vertices) for k in range(3)]
        for v in o.data.vertices:v.co=tuple((v.co[k]-low[k])*[.620,.710,.150][k]/(high[k]-low[k])+[-.310,-.400,.310][k] for k in range(3))
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=1e-7);bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
    if any(not e.is_manifold for e in bm.edges):raise ValueError('Open mesh '+o.name)
    bm.to_mesh(o.data);bm.free()
bpy.ops.wm.save_as_mainfile(filepath=str(out/'armchair-berlin-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'armchair-berlin-v1.glb'),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
if '--result' in sys.argv:pathlib.Path(sys.argv[sys.argv.index('--result')+1]).write_text(json.dumps({'passed':True,'parts':len(objects),'blender':bpy.app.version_string}),encoding='utf-8')
