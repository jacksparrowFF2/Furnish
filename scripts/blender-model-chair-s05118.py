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
wood=material('natural-wood','be9568',.42);cloth=material('milk-tea-upholstery','d5c9b6',.48);seam=material('upholstery-piping','cfc2ae',.53)
def finish(o,name,mat):
    o.name=name;o.data.materials.append(mat);o['furnishStablePart']='chair-s05118-v1:'+name;o['furnishRecolor']=mat==wood
    return o
def box(name,size,center,mat,r=.006):
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(center));o=bpy.context.object;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    m=o.modifiers.new('soft corners','BEVEL');m.width=r;m.segments=4;bpy.ops.object.modifier_apply(modifier=m.name)
    m=o.modifiers.new('weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=m.name)
    return finish(o,name,mat)
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

def outline(w,h,rt,rb,inset=0):
    # Shoulder radius is independent of upholstery thickness.
    arcs=[]
    for cx,cy,r,start in [(w/2-rt,h/2-rt,rt,0),(-w/2+rt,h/2-rt,rt,90),(-w/2+rb,-h/2+rb,rb,180),(w/2-rb,-h/2+rb,rb,270)]:
        pts=[]
        for j in range(17):
            a=math.radians(start+j*90/16)
            pts.append((cx+(r-inset)*math.cos(a),cy+(r-inset)*math.sin(a)))
        arcs.append(pts)
    points=[]
    for i,arc in enumerate(arcs):
        points.extend(arc);a,b=arc[-1],arcs[(i+1)%4][0]
        # Sample straight spans too: corner-only loops create long triangles
        # and visible X-shaped interpolated normals under real WebGL sunlight.
        for j in range(1,24):points.append(tuple(a[k]+(b[k]-a[k])*j/24 for k in range(2)))
    return points

def upholstery(name,w,h,thickness,rt,rb,transform):
    vertices=[];faces=[];N=len(outline(w,h,rt,rb));edge=.012
    def crown(x,v):
        puff=.010 if name=='seat-cushion' else .008
        return puff*max(0,1-(x/(w/2-edge))**2)*max(0,1-(v/(h/2-edge))**2)
    def ring(points,t):
        start=len(vertices)
        for x,v in points:
            depth=t(x,v) if callable(t) else t
            vertices.append(xyz(transform(x,v,depth)))
        return start
    def connect(a,b):
        for j in range(N):faces.append((a+j,a+(j+1)%N,b+(j+1)%N,b+j))
    rings=[]
    for i in range(17):
        a=-math.pi/2+math.pi*i/16
        edge_radius=.003 if name=='seat-cushion' and a<0 else edge
        half=.035 if name=='seat-cushion' and a<0 else thickness/2
        sign=-1 if a<0 else 1
        def profile(x,v):
            extra=0 if name=='seat-cushion' and sign<0 else crown(x,v)*abs(math.sin(a))**8
            return half*math.sin(a)+sign*extra
        rings.append(ring(outline(w,h,rt,rb,edge_radius*(1-math.cos(a))),profile))
        if i:connect(rings[-2],rings[-1])
    for side,start in [(-1,rings[0]),(1,rings[-1])]:
        boundary=outline(w,h,rt,rb,.003 if name=='seat-cushion' and side<0 else edge)
        for scale in [.85,.65,.45,.25,.10]:
            def depth(x,v):return -.035 if name=='seat-cushion' and side<0 else side*(thickness/2+crown(x,v))
            nxt=ring([(x*scale,v*scale) for x,v in boundary],depth)
            connect(start,nxt);start=nxt
        depth=.035 if name=='seat-cushion' and side<0 else thickness/2+crown(0,0)
        center=len(vertices);vertices.append(xyz(transform(0,0,side*depth)))
        for j in range(N):faces.append((start+j,start+(j+1)%N,center))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update()
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
    for p in mesh.polygons:p.use_smooth=True
    return finish(o,name,cloth)

def surface_seam(name,points,transform,depth):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=.0008;c.bevel_resolution=3
    s=c.splines.new('POLY');s.points.add(len(points)-1)
    for p,(x,v) in zip(s.points,points):p.co=(*xyz(transform(x,v,depth)),1)
    s.use_cyclic_u=True;o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o)
    bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o=bpy.context.object;o.select_set(False)
    for p in o.data.polygons:p.use_smooth=True
    return finish(o,name,seam)

# Seat thickness 70, seat top 450, structural rails 55 mm. Hidden slats estimated.
box('seat-front-rail',(.55,.055,.035),(0,.3525,.274),wood,.006)
box('seat-back-rail',(.52,.055,.035),(0,.3525,-.242),wood,.006)
for side in (-1,1):
    box('seat-side-'+str(side),(.032,.055,.53),(side*.265,.3525,.018),wood,.006)
    leg('front-leg-'+str(side),(side*.275,0,.3125),(side*.282,.5825,.250))
    leg('rear-leg-'+str(side),(side*.275,0,-.3125),(side*.255,.5825,-.170))
for i in range(4):box('seat-slat-'+str(i),(.075,.016,.49),((i-1.5)*.126,.372,.018),wood,.003)
seat_transform=lambda x,v,t:(x,.415+t,.025+v)
upholstery('seat-cushion',.53,.53,.050,.075,.065,seat_transform)
seat=bpy.data.objects['seat-cushion']
# Fit the actual soft surface to the labelled envelope, including its small crown.
lo=[min(v.co[k] for v in seat.data.vertices) for k in range(3)];hi=[max(v.co[k] for v in seat.data.vertices) for k in range(3)]
for v in seat.data.vertices:v.co=tuple((v.co[k]-lo[k])*[.53,.53,.07][k]/(hi[k]-lo[k])+[-.265,-.290,.380][k] for k in range(3))
surface_seam('seat-piping',outline(.53,.53,.075,.065,.00043),seat_transform,-.018)

# 101 degree seat/back angle. Horizontal curvature cups the back; no adjustment rig.
angle=math.radians(11)
def back_transform(x,v,t):
    return (x,.608+v*math.cos(angle)+t*math.sin(angle),-.236-v*math.sin(angle)+t*math.cos(angle)+.035*(x/.24)**2)
upholstery('back-cushion',.48,.47,.054,.075,.045,back_transform)
back=bpy.data.objects['back-cushion']
lo=min(v.co.z for v in back.data.vertices);hi=max(v.co.z for v in back.data.vertices)
for v in back.data.vertices:v.co.z=.380+(v.co.z-lo)*.460/(hi-lo)
surface_seam('back-piping',outline(.48,.47,.075,.045,.00305),back_transform,-.018)
for v in bpy.data.objects['back-piping'].data.vertices:
    v.co.z=.380+(v.co.z-lo)*.460/(hi-lo)

# One continuous U shaped timber hoop; 25 mm thick, up to 60 mm wide.
# Front at +Z, back at -Z. Smooth centre path from each front post around the back.
controls=[(.282,.265),(.289,.225),(.296,.16),(.300,.04),(.293,-.11),(.260,-.215),(.16,-.272),(0,-.290),(-.16,-.272),(-.260,-.215),(-.293,-.11),(-.300,.04),(-.296,.16),(-.289,.225),(-.282,.265)]
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
    edge=min(i,len(points)-1-i)/16
    width=.043+.017*min(1,edge)**.7
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
bpy.context.view_layer.objects.active=o
m=o.modifiers.new('arm end and junction edge rounding','BEVEL');m.width=.002;m.segments=3;m.limit_method='ANGLE';m.angle_limit=.7
bpy.ops.object.modifier_apply(modifier=m.name)

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
