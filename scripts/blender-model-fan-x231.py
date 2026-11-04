"""FA18-X231 static raised pose. Envelope: JD; unlabelled details: visual estimates."""
import bpy, bmesh, math, pathlib, sys, json
from mathutils import Vector
out=pathlib.Path(sys.argv[sys.argv.index('--')+1]);out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC'
def xyz(p):return Vector((p[0],-p[2],p[1]))
def mat(name,color,rough,metal=0):
    m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF')
    def linear(v):
        v=int(v,16)/255;return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
    n.inputs['Base Color'].default_value=(*[linear(color[i:i+2]) for i in (0,2,4)],1)
    n.inputs['Roughness'].default_value=rough;n.inputs['Metallic'].default_value=metal;return m
white=mat('warm-white-ABS','eeeee9',.32);grille=mat('white-grille','d9dcd7',.36)
black=mat('black-dial','242627',.28);rubber=mat('base-rubber','333638',.75);silver=mat('trim','a9aaa5',.24,.8)
def finish(o,name,m):
    o.name=name;o.data.materials.clear();o.data.materials.append(m);o['furnishStablePart']='fan-x231-v1:'+name;o['furnishRecolor']=m==white
    for p in o.data.polygons:p.use_smooth=True
    return o
def cyl(name,r,depth,center,m,axis=(0,1,0),bevel=.001):
    bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=r,depth=depth,location=xyz(center));o=bpy.context.object
    direction=xyz(axis);o.rotation_euler=Vector((0,0,1)).rotation_difference(direction).to_euler()
    if bevel:
        mod=o.modifiers.new('soft edge','BEVEL');mod.width=bevel;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
        mod=o.modifiers.new('weighted normals','WEIGHTED_NORMAL');bpy.ops.object.modifier_apply(modifier=mod.name)
    return finish(o,name,m)
def mesh(name,vertices,faces,m):
    data=bpy.data.meshes.new(name);data.from_pydata([xyz(v) for v in vertices],[],faces);data.update()
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);return finish(o,name,m)
def tube(name,paths,r,m):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=1;c.resolution_u=1;c.use_fill_caps=True
    for points in paths:
        s=c.splines.new('POLY');s.points.add(len(points)-1)
        for v,p in zip(s.points,points):v.co=(*xyz(p),1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
    return finish(bpy.context.object,name,m)
def ring(name,profile,m):
    # Closed meridian around forward (+Z) axis, no solid disc across the aperture.
    N=96;v=[];faces=[]
    for r,z in profile:
        for j in range(N):a=j*math.tau/N;v.append((r*math.cos(a),.965+r*math.sin(a),z))
    for k in range(len(profile)):
        for j in range(N):faces.append((k*N+j,k*N+(j+1)%N,((k+1)%len(profile))*N+(j+1)%N,((k+1)%len(profile))*N+j))
    return mesh(name,v,faces,m)
cyl('rubber-base',.146,.008,(0,.004,0),rubber)
cyl('round-base',.150,.022,(0,.019,0),white,bevel=.003)
cyl('base-collar',.029,.018,(0,.035,0),white)
cyl('upright',.018,.548,(0,.312,0),white)
cyl('collar-trim',.024,.012,(0,.588,0),silver)
cyl('control-column',.038,.180,(0,.682,0),white,bevel=.005)
cyl('oscillation-neck',.023,.025,(0,.783,0),silver)
cyl('dial-bezel',.027,.008,(0,.716,.037),silver,(0,0,1))
cyl('speed-dial',.024,.009,(0,.716,.043),black,(0,0,1))
tube('dial-pointer',[[(0,.730,.048),(0,.736,.048)]],.001,white)
for i in range(4):
    a=math.radians(-125+i*83);x=.020*math.sin(a);y=.716+.020*math.cos(a)
    cyl('dial-mark-'+str(i),.0012,.0006,(x,y,.048),white,(0,0,1),0)
path=[(-.140,.965,0),(-.140,.925,0)]
path +=[(.140*math.cos(a),.925+.140*math.sin(a),0) for a in [math.pi+j*math.pi/40 for j in range(41)]]
path +=[(.140,.965,0)]
tube('u-cradle',[path],.009,white)
for side in [-1,1]:cyl('tilt-pivot-'+str(side),.019,.018,(side*.132,.965,0),white,(1,0,0))
ring('barrel-shell',[(.127,.076),(.132,.069),(.135,.055),(.134,-.045),(.119,-.090),(.112,-.094),(.108,-.087),(.124,-.039),(.125,.063),(.122,.070)],white)
ring('front-rim',[(.122,.070),(.132,.069),(.135,.075),(.135,.082),(.131,.087),(.123,.087)],white)
ring('rear-rim',[(.108,-.092),(.118,-.092),(.119,-.087),(.110,-.084)],white)
# Curved ribs bow forward and rotate toward the central badge.
paths=[]
for j in range(72):
    a=j*math.tau/72;points=[]
    for k in range(22):
        t=k/21;r=.027+.096*t;angle=a+.65*(1-t)
        points.append((r*math.cos(angle),.965+r*math.sin(angle),.088+.018*(1-t*t)))
    paths.append(points)
paths += [[(r*math.cos(a),.965+r*math.sin(a),.088+.018*(1-(r/.123)**2)) for a in [j*math.tau/128 for j in range(129)]] for r in [.055,.09]]
tube('front-swirl-grille',paths,.00105,grille)
paths=[]
for j in range(48):
    a=j*math.tau/48;paths.append([(r*math.cos(a),.965+r*math.sin(a),-.094) for r in [.031,.110]])
tube('rear-grille',paths,.001,grille)
cyl('motor-body',.041,.095,(0,.965,-.045),white,(0,0,1))
cyl('blade-hub',.024,.029,(0,.965,.025),white,(0,0,1))
# Three visibly separate pitched paddle blades; hidden motor internals omitted.
for j in range(3):
    v=[];faces=[];a=j*math.tau/3
    for zoff in [-.002,.002]:
        for r,angle in [(.019,-.10),(.046,-.32),(.089,-.18),(.093,.20),(.075,.64),(.027,.50)]:
            b=a+angle;v.append((r*math.cos(b),.965+r*math.sin(b),.024+zoff+.012*math.sin(angle)))
    faces=[tuple(range(5,-1,-1)),tuple(range(6,12))]+[(k,(k+1)%6,(k+1)%6+6,k+6) for k in range(6)]
    mesh('blade-'+str(j),v,faces,grille)
cyl('centre-badge',.027,.007,(0,.965,.108),white,(0,0,1))
# Text is intentionally omitted where the available photograph cannot resolve it.
bpy.context.view_layer.update();objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in objects:
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=1e-8);bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
    if any(f.calc_area()<1e-15 for f in bm.faces):raise ValueError('Degenerate face: '+o.name)
    bm.to_mesh(o.data);bm.free()
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent/'lib'))
from blender_asset_preflight import from_args
from_args(bpy.context.scene)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'fan-x231-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'fan-x231-v1.glb'),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
if '--result' in sys.argv:pathlib.Path(sys.argv[sys.argv.index('--result')+1]).write_text(json.dumps({'passed':True,'parts':len(objects),'blender':bpy.app.version_string}),encoding='utf-8')
