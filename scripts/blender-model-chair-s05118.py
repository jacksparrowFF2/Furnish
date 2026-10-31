"""S05118 from the user's six images and labelled dimensions. Background Blender.
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
wood=material('natural-wood','be9568',.42);cloth=material('linen-beige','d8cdbc',.62);seam=material('linen-piping','c7baa6',.65)
def finish(o,name,mat):
    o.name=name;o.data.materials.append(mat);o['furnishStablePart']='chair-s05118-v1:'+name;o['furnishRecolor']=mat==wood
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

def leg(name,a,b):
    # Rounded square tapered timber; 35 mm square at the floor (dimension image).
    vertices=[]
    for center,width in [(a,.035),(b,.043)]:
        for x,z in [(-1,-1),(1,-1),(1,1),(-1,1)]:
            vertices.append(xyz((center[0]+x*width/2,center[1],center[2]+z*width/2)))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)])
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);bpy.context.view_layer.objects.active=o
    m=o.modifiers.new('rounded timber edges','BEVEL');m.width=.006;m.segments=4;bpy.ops.object.modifier_apply(modifier=m.name)
    m=o.modifiers.new('timber normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=m.name)
    return finish(o,name,wood)

# Seat thickness 70, seat top 450, structural rails 55 mm. Hidden slats estimated.
box('seat-front-rail',(.55,.055,.035),(0,.3525,.274),wood,.006)
box('seat-back-rail',(.52,.055,.035),(0,.3525,-.242),wood,.006)
for side in (-1,1):
    box('seat-side-'+str(side),(.032,.055,.53),(side*.265,.3525,.018),wood,.006)
    leg('front-leg-'+str(side),(side*.275,0,.3125),(side*.282,.5825,.250))
    leg('rear-leg-'+str(side),(side*.275,0,-.3125),(side*.255,.5825,-.170))
for i in range(4):box('seat-slat-'+str(i),(.075,.016,.49),((i-1.5)*.126,.372,.018),wood,.003)
soft('seat-cushion',(.53,.07,.53),(0,.415,.025),r=.029,puff=.003)
seat=bpy.data.objects['seat-cushion']
# Fit the actual soft surface to the labelled envelope, including its small crown.
lo=[min(v.co[k] for v in seat.data.vertices) for k in range(3)];hi=[max(v.co[k] for v in seat.data.vertices) for k in range(3)]
for v in seat.data.vertices:v.co=tuple((v.co[k]-lo[k])*[.53,.53,.07][k]/(hi[k]-lo[k])+[-.265,-.290,.380][k] for k in range(3))
piping('seat-piping',.505,.505,0,(0,.402,.025),90,.060)

# 101 degree seat/back angle. Horizontal curvature cups the back; no adjustment rig.
soft('back-cushion',(.48,.47,.07),(0,.608,-.236),angle=11,r=.033,puff=.004)
back=bpy.data.objects['back-cushion']
for v in back.data.vertices:
    # Blender -Y is product front. The sides wrap forward by up to 35 mm.
    v.co.y-=.035*(v.co.x/.24)**2
lo=min(v.co.z for v in back.data.vertices);hi=max(v.co.z for v in back.data.vertices)
for v in back.data.vertices:v.co.z=.380+(v.co.z-lo)*.460/(hi-lo)
def shoulder(v):
    v.co.x*=1-.16*max(0,min(1,(v.co.z-.745)/.095))**1.7*min(1,abs(v.co.x/.24))**3
for v in back.data.vertices:shoulder(v)
piping('back-piping',.455,.442,.034,(0,.608,-.236),11,.052)
for v in bpy.data.objects['back-piping'].data.vertices:
    v.co.y-=.035*(v.co.x/.24)**2
    shoulder(v)

# One continuous U shaped timber hoop; 25 mm thick, up to 60 mm wide.
# Front at +Z, back at -Z. Smooth centre path from each front post around the back.
controls=[(.282,.255),(.296,.16),(.300,.04),(.293,-.11),(.260,-.215),(.16,-.272),(0,-.290),(-.16,-.272),(-.260,-.215),(-.293,-.11),(-.300,.04),(-.296,.16),(-.282,.255)]
points=[]
for i in range(len(controls)-1):
    a,b,c,d=[Vector(controls[min(len(controls)-1,max(0,j))]) for j in (i-1,i,i+1,i+2)]
    for j in range(8):
        t=j/8
        p=.5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)
        points.append(tuple(p))
points.append(controls[-1])
verts=[]
for i,(x,z) in enumerate(points):
    prev=Vector(points[max(0,i-1)]);nxt=Vector(points[min(len(points)-1,i+1)]);tan=(nxt-prev).normalized();normal=Vector((-tan.y,tan.x))
    width=.060 if i not in (0,len(points)-1) else .043
    for j in range(12):
        a=math.tau*j/12
        # Rounded rectangle cross section (superellipse).
        u=math.copysign(abs(math.cos(a))**.5,math.cos(a))*width/2
        h=math.copysign(abs(math.sin(a))**.5,math.sin(a))*.0125
        verts.append(xyz((x+normal.x*u,.5825+h,z+normal.y*u)))
faces=[]
for i in range(len(points)-1):
    for j in range(12):faces.append((i*12+j,i*12+(j+1)%12,(i+1)*12+(j+1)%12,(i+1)*12+j))
faces += [tuple(reversed(range(12))),tuple((len(points)-1)*12+j for j in range(12))]
mesh=bpy.data.meshes.new('wraparound-arm');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('wraparound-arm',mesh);bpy.context.collection.objects.link(o)
for p in mesh.polygons:p.use_smooth=True
finish(o,'wraparound-arm',wood)

bpy.context.view_layer.update();objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
# Close the 660 mm outside envelope with tiny X/depth fitting; seat dimensions stay fixed.
pts=[o.matrix_world@v.co for o in objects for v in o.data.vertices]
lx,hx=min(v.x for v in pts),max(v.x for v in pts);ly,hy=min(v.y for v in pts),max(v.y for v in pts)
for o in objects:
    matrix=o.matrix_world.copy()
    for v in o.data.vertices:
        p=matrix@v.co
        v.co=((p.x-(lx+hx)/2)*.660/(hx-lx),(p.y-(ly+hy)/2)*.660/(hy-ly),p.z)
    o.matrix_world.identity()
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=1e-7);bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
    if any(not e.is_manifold for e in bm.edges):raise ValueError('Open mesh '+o.name)
    if any(f.calc_area()<1e-14 for f in bm.faces):raise ValueError('Degenerate face '+o.name)
    bm.to_mesh(o.data);bm.free()
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent/'lib'))
from blender_asset_preflight import from_args
from_args(bpy.context.scene)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'chair-s05118-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'chair-s05118-v1.glb'),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
if '--result' in sys.argv:pathlib.Path(sys.argv[sys.argv.index('--result')+1]).write_text(json.dumps({'passed':True,'parts':len(objects),'blender':bpy.app.version_string}),encoding='utf-8')
