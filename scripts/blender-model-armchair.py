"""YESWOOD single lounge chair, from user supplied annotated photographs.
Factory-startup background only. Furnish (X,Y,Z) maps to Blender (X,-Z,Y).
Unlabelled joinery, radii and hidden supports are visual approximations.
"""
import bpy, math, pathlib, sys, json
from mathutils import Vector

out=pathlib.Path(sys.argv[sys.argv.index('--')+1]).resolve()
out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC'

def material(name,hexcolor,rough):
    m=bpy.data.materials.new(name); m.use_nodes=True
    n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    def linear(c):
        v=int(c,16)/255; return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
    n.inputs['Base Color'].default_value=(*[linear(hexcolor[i:i+2]) for i in (0,2,4)],1)
    n.inputs['Roughness'].default_value=rough
    return m
wood=material('natural-ash','be9465',.43)
cloth=material('flax-beige','d5cbb9',.96)
seam=material('flax-seam','bfb39f',.98)
dark=material('floor-felt','49443b',1)

def xyz(p): return Vector((p[0],-p[2],p[1]))
def finish(o,name,mat):
    o.name=name; o.data.materials.append(mat)
    o['furnishStablePart']='armchair-v1:'+name
    o['furnishRecolor']=mat==wood
    return o
def box(name,size,center,mat,r=.008):
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(center)); o=bpy.context.object
    o.dimensions=(size[0],size[2],size[1]); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if r:
        m=o.modifiers.new('rounded edges','BEVEL');m.width=r;m.segments=4
        bpy.ops.object.modifier_apply(modifier=m.name)
        m=o.modifiers.new('weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=m.name)
    return finish(o,name,mat)
def beam(name,a,b,width,depth,mat):
    a,b=xyz(a),xyz(b); v=b-a
    o=box(name,(width,v.length,depth),(0,0,0),mat,min(width,depth)*.30)
    o.rotation_mode='QUATERNION';o.rotation_quaternion=Vector((0,0,1)).rotation_difference(v)
    o.location=(a+b)/2
    return o
def mesh(name,verts,faces,mat):
    data=bpy.data.meshes.new(name);data.from_pydata([xyz(p) for p in verts],[],faces);data.update()
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o)
    for p in data.polygons:p.use_smooth=True
    return finish(o,name,mat)

# Seat frame: separate front/back rails, side rails and five visible underside slats.
box('front-seat-rail',(.586,.060,.045),(0,.309,.343),wood,.012)
box('rear-seat-rail',(.586,.050,.042),(0,.301,-.231),wood,.01)
for s in (-1,1):
    beam('seat-side-'+str(s),(s*.284,.31,.34),(s*.284,.30,-.24),.037,.060,wood)
for i in range(5):box('seat-slat-'+str(i),(.066,.017,.540),((i-2)*.112,.333,.050),wood,.004)

# Soft seat with broad rounded front and a separate sewn border.
box('seat-cushion',(.580,.120,.620),(0,.400,.080),cloth,.049)
box('seat-front-seam',(.484,.002,.002),(0,.390,.390),seam,.0008)
for s in (-1,1):box('seat-side-seam-'+str(s),(.002,.002,.504),(s*.290,.390,.080),seam,.0008)

# Twenty degrees recline; two touching pads form the horizontal headrest seam.
angle=math.radians(20)
def backpoint(t,offset=0): return (0,.350+t*math.cos(angle)+offset*math.sin(angle),-.180-t*math.sin(angle)+offset*math.cos(angle))
# Continuous cover, with a shallow compression groove rather than a headrest gap.
verts=[];faces=[]
half=(.290,.300,.0525);radius=.038
for axis in range(3):
    other=[k for k in range(3) if k!=axis]
    for side in (-1,1):
        counts=[16 if k==0 else 32 if k==1 else 6 for k in other]
        start=len(verts)
        for j in range(counts[1]+1):
            for i in range(counts[0]+1):
                p=Vector((0,0,0));p[axis]=side*half[axis]
                p[other[0]]=(i/counts[0]*2-1)*half[other[0]];p[other[1]]=(j/counts[1]*2-1)*half[other[1]]
                inner=Vector([max(-half[k]+radius,min(half[k]-radius,p[k])) for k in range(3)])
                p=inner+(p-inner).normalized()*radius
                t=p.y+.300
                if p.z>0:
                    p.z-=.007*math.exp(-((t-.409)/.011)**2)
                    p.z+=.006*max(0,1-(p.x/.29)**2)*math.sin(math.pi*t/.6)
                c=backpoint(t,p.z);verts.append((p.x,c[1],c[2]))
        for j in range(counts[1]):
            for i in range(counts[0]):
                a=start+j*(counts[0]+1)+i;faces.append((a,a+1,a+counts[0]+2,a+counts[0]+1))
mesh('back-lumbar',verts,faces,cloth)
c=backpoint(.409,.046)
o=box('back-headrest',(.502,.0013,.0013),c,seam,.0005);o.rotation_euler.x=-angle
for s in (-1,1):
    beam('back-stile-'+str(s),(s*.259,.318,-.255),(s*.259,.792,-.429),.041,.037,wood)
box('back-top-rail',(.540,.040,.031),(0,.775,-.430),wood,.009)
for i in range(4):beam('back-slat-'+str(i),((i-1.5)*.128,.352,-.268),((i-1.5)*.128,.772,-.421),.055,.016,wood)

# Splayed front legs continue up to the arms. Rear legs form the diagonal brace.
for s in (-1,1):
    beam('front-leg-'+str(s),(s*.328,.017,.427),(s*.311,.559,.288),.040,.043,wood)
    beam('rear-leg-'+str(s),(s*.310,.019,-.428),(s*.310,.568,-.150),.040,.043,wood)
    # Swept, rounded 80 x 28 mm arm section, shallow concave longitudinal curve.
    verts=[];faces=[];rings=37;sides=16
    for j in range(rings):
        t=j/(rings-1);z=.355-t*.680;y=.557+.044*t-.026*math.sin(math.pi*t)
        cap=min(1,math.sqrt(max(.001,1-((t-.045)/.045)**2))) if t<.045 else min(1,math.sqrt(max(.001,1-((t-.955)/.045)**2))) if t>.955 else 1
        for k in range(sides):
            a=2*math.pi*k/sides
            verts.append((s*.3225+.040*cap*math.cos(a),y+.014*cap*math.sin(a),z))
    for j in range(rings-1):
        for k in range(sides):
            a=j*sides+k;b=j*sides+(k+1)%sides;faces.append((a,b,b+sides,a+sides))
    faces.extend([tuple(reversed(range(sides))),tuple((rings-1)*sides+k for k in range(sides))])
    mesh('curved-arm-'+str(s),verts,faces,wood)

# Normalize only the tiny envelope rounding allowances to the annotated overall size.
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
bpy.context.view_layer.update()
points=[o.matrix_world@v.co for o in objects for v in o.data.vertices]
lo=[min(p[k] for p in points) for k in range(3)];hi=[max(p[k] for p in points) for k in range(3)]
target=(.725,.900,.905)
for o in objects:
    matrix=o.matrix_world.copy()
    for v in o.data.vertices:
        p=matrix@v.co
        # Preserve the explicitly labelled 120 mm seat and 460 mm seat top.
        y=p.z
        y=(y-lo[2])*.340/(.340-lo[2]) if y<.340 else y if y<=.460 else .460+(y-.460)*(.905-.460)/(hi[2]-.460)
        v.co=[(p[k]-lo[k])*target[k]/(hi[k]-lo[k])-target[k]/2 for k in range(2)]+[y]
    o.matrix_world.identity()
    # Recalculate outward normals after axis conversion and curved surface authoring.
    import bmesh
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=1e-7);bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
    if any(not e.is_manifold for e in bm.edges): raise ValueError('Open/non-manifold mesh: '+o.name)
    bm.to_mesh(o.data);bm.free()
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent/'lib'))
from blender_asset_preflight import from_args as declared_preflight
declared_preflight(bpy.context.scene)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'armchair-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'armchair-v1.glb'),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
if '--result' in sys.argv:
    pathlib.Path(sys.argv[sys.argv.index('--result')+1]).write_text(json.dumps({'passed':True,'parts':len(objects),'blender':bpy.app.version_string}),encoding='utf-8')
