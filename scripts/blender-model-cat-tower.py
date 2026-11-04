"""JD 10141711472484 package two. Labelled boards; unlabelled heights estimated."""
import bpy, bmesh, math, pathlib, sys, json
from mathutils import Vector
out=pathlib.Path(sys.argv[sys.argv.index('--')+1]);out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC'
def xyz(p):return Vector((p[0],-p[2],p[1]))
def mat(name,color,rough,metal=0,alpha=1):
    m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF')
    def linear(v):
        v=int(v,16)/255;return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
    n.inputs['Base Color'].default_value=(*[linear(color[i:i+2]) for i in (0,2,4)],1)
    n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal;n.inputs['Alpha'].default_value=alpha
    return m
wood=mat('pale plywood','dfc79d',.55);edge=mat('plywood edge','c8a77b',.68)
rope=mat('sisal warm tan','b99560',.95);weave=mat('basket wicker','ba8852',.9)
glass=mat('clear acrylic alpha approximation','dce8eb',.16,0,.24)
steel=mat('steel adjuster','a3a3a0',.25,.75);rubber=mat('pressure pad','d5caba',.9)
def finish(o,name,m):
    o.name=name;o.data.materials.clear();o.data.materials.append(m);o['furnishStablePart']='cat-tower-v1:'+name;o['furnishRecolor']=m==wood
    return o
def bevel(o,r=.003):
    bpy.context.view_layer.objects.active=o
    mod=o.modifiers.new('soft edge','BEVEL');mod.width=r;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
    mod=o.modifiers.new('weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
def box(name,size,center,m):
    bpy.ops.mesh.primitive_cube_add(size=1,location=xyz(center));o=bpy.context.object;o.dimensions=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);bevel(o);return finish(o,name,m)
def cyl(name,r,h,center,m):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=r,depth=h,location=xyz(center));o=bpy.context.object;bevel(o,.001)
    for p in o.data.polygons:p.use_smooth=True
    return finish(o,name,m)
def tube(name,paths,r,m):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=0;c.resolution_u=1;c.use_fill_caps=True
    for points in paths:
        s=c.splines.new('POLY');s.points.add(len(points)-1)
        for v,p in zip(s.points,points):v.co=(*xyz(p),1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return finish(bpy.context.object,name,m)
def circle(cx,y,cz,r):return [(cx+r*math.cos(a),y,cz+r*math.sin(a)) for a in [j*math.tau/96 for j in range(97)]]
def shell(name,cx,top,cz,r,depth,m):
    # Closed thin hemispherical shell, an open mouth and a single axis vertex per skin.
    N=80;steps=20;v=[];faces=[]
    for skin in range(2):
        rr=r-skin*.002;dd=depth-skin*.002;start=len(v);v.append((cx,top-dd,cz))
        for k in range(1,steps+1):
            a=k*math.pi/(2*steps)
            for j in range(N):
                t=j*math.tau/N;v.append((cx+rr*math.sin(a)*math.cos(t),top-dd*math.cos(a),cz+rr*math.sin(a)*math.sin(t)))
        for j in range(N):faces.append((start,start+1+j,start+1+(j+1)%N))
        for k in range(steps-1):
            for j in range(N):
                a=start+1+k*N+j;b=start+1+k*N+(j+1)%N;faces.append((a,b,b+N,a+N))
    stride=1+steps*N
    for j in range(N):a=1+(steps-1)*N+j;b=1+(steps-1)*N+(j+1)%N;faces.append((a,b,b+stride,a+stride))
    mesh=bpy.data.meshes.new(name);mesh.from_pydata([xyz(p) for p in v],[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
    for p in mesh.polygons:p.use_smooth=True
    return finish(o,name,m)
def bowl_board(name,size,center,cx,cz,r):
    o=box(name,size,center,wood)
    bpy.ops.mesh.primitive_cylinder_add(vertices=80,radius=r,depth=.1,location=xyz((cx,center[1],cz)));cut=bpy.context.object
    bpy.context.view_layer.objects.active=o;mod=o.modifiers.new('real bowl aperture','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cut;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cut,do_unlink=True)
    return finish(o,name,wood)
box('base',( .4,.024,.4),(0,.012,0),wood)
cyl('sisal-column',.052,1.976,(0,1.012,0),rope)
# Visible rope coils are model sampling, 5mm pitch; fine fibres intentionally omitted.
for section in range(6):
    lo=round(section*6304/6);hi=round((section+1)*6304/6)
    tube('sisal-coils-'+str(section),[[(.0525*math.cos(t),.026+1.970*j/6304,.0525*math.sin(t)) for j in range(lo,hi+1) for t in [j*math.tau/16]]],.0014,rope)
cyl('column-top-collar',.066,.016,(0,1.992,0),wood)
box('lower-platform',(.35,.018,.35),(0,.500,0),wood)
box('upper-platform',(.60,.018,.30),(0,1.800,0),wood)
for prefix,y,w,d in [('lower',.509,.35,.35),('upper',1.809,.60,.30)]:
    # Rear and side guards, front access left open as in reference.
    for side in [-1,1]:
        x=side*(w/2-.011)
        box(prefix+'-side-rail-'+str(side),(.018,.018,d),(x,y+.112,0),wood)
        for j,z in enumerate([-d/2+.012,-d/6,d/6,d/2-.012]):cyl(prefix+'-side-spindle-'+str(side)+'-'+str(j),.007,.106,(x,y+.053,z),wood)
    box(prefix+'-rear-rail',(w,.018,.018),(0,y+.112,-d/2+.009),wood)
    for j in range(1,6):cyl(prefix+'-rear-spindle-'+str(j),.007,.106,(-w/2+w*j/6,y+.053,-d/2+.009),wood)
bowl_board('right-bowl-board',(.47,.018,.40),(.165,.930,.035),.215,.035,.174)
bowl_board('left-bowl-board',(.49,.018,.39),(-.155,1.200,-.04),-.215,-.04,.174)
for side,cx,y,cz in [('right',.215,.939,.035),('left',-.215,1.209,-.04)]:
    shell(side+'-acrylic-bowl',cx,y,cz,.177,.135,glass)
    tube(side+'-bowl-rim',[circle(cx,y+.001,cz,.179)],.002,glass)
box('basket-platform',(.40,.018,.30),(.20,1.500,0),wood)
# Woven open basket, separate crossing strands and rim; no filled top.
cx=.235;bottom=1.509;paths=[]
for j in range(48):
    a=j*math.tau/48;paths.append([(cx+(.115+.045*k/16)*math.cos(a+.045*math.sin(k*math.pi/2)),bottom+.105*k/16,(.115+.045*k/16)*math.sin(a+.045*math.sin(k*math.pi/2))) for k in range(17)])
for k in range(15):paths.append(circle(cx,bottom+.006+k*.0068,0,.115+.045*(.006+k*.0068)/.105))
tube('basket-weave',paths,.0021,weave)
cyl('basket-bottom',.115,.006,(cx,bottom+.003,0),weave)
tube('basket-rim',[circle(cx,bottom+.105,0,.160)],.004,weave)
cyl('adjuster-rod',.009,.32,(0,2.140,0),steel)
cyl('spring-washer',.050,.012,(0,2.306,0),wood)
tube('pressure-spring',[[(.032*math.cos(j*math.tau/32),2.312+.048*j/192,.032*math.sin(j*math.tau/32)) for j in range(193)]],.003,steel)
cyl('top-disc-lower',.10,.012,(0,2.366,0),wood)
cyl('top-disc-middle',.12,.012,(0,2.378,0),wood)
cyl('top-disc',.15,.008,(0,2.388,0),wood)
cyl('ceiling-pad',.15,.008,(0,2.396,0),rubber)
bpy.context.view_layer.update();objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in objects:
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=1e-8);bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
    if any(f.calc_area()<1e-15 for f in bm.faces):raise ValueError('Degenerate face: '+o.name)
    bm.to_mesh(o.data);bm.free()
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent/'lib'))
from blender_asset_preflight import from_args
from_args(bpy.context.scene)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'cat-tower-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'cat-tower-v1.glb'),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
if '--result' in sys.argv:pathlib.Path(sys.argv[sys.argv.index('--result')+1]).write_text(json.dumps({'passed':True,'parts':len(objects),'blender':bpy.app.version_string}),encoding='utf-8')
