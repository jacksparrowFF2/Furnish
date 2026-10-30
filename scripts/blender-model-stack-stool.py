"""370 x 370 x 467 mm upholstered nesting stool, user reference photographs.
Unlabelled shell taper, opening and cushion dimensions are visual estimates.
Run only in an isolated background Blender factory scene.
"""
import bpy, bmesh, math, pathlib, sys, json
from mathutils import Vector
out=pathlib.Path(sys.argv[sys.argv.index('--')+1]).resolve();out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC'
def mat(name,color,rough):
    m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF')
    def lin(v):
        v=int(v,16)/255;return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
    n.inputs['Base Color'].default_value=(*[lin(color[i:i+2]) for i in (0,2,4)],1);n.inputs['Roughness'].default_value=rough
    return m
shell=mat('cream polypropylene','eee9dc',.42);cloth=mat('cream upholstered seat','e2dfd3',.93)
def mesh(name,vs,fs,material):
    data=bpy.data.meshes.new(name);data.from_pydata([(x,-z,y) for x,y,z in vs],[],fs);data.update()
    bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
    o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(material)
    o['furnishStablePart']='stack-stool-v1:'+name;o['furnishRecolor']=material==shell
    for p in data.polygons:p.use_smooth=True
    if name.startswith('corner-shell-'):
        # Keep the long moulded faces smooth without averaging in the narrow
        # cut-edge faces. Matching normals also avoid seams at side midpoints.
        normals=[None]*len(data.loops)
        for p in data.polygons:
            broad=p.index<48*4 and p.index%4<2
            for li in p.loop_indices:
                if broad:
                    x,y,z=vs[data.loops[li].vertex_index];scale=(.185-.035*y/.445)/.160
                    nx=math.copysign(max(0,abs(x)-.135*scale),x);nz=math.copysign(max(0,abs(z)-.135*scale),z)
                    n=Vector((nx,-nz,math.hypot(nx,nz)*.035/.445)).normalized()
                    if p.index%4==1:n=-n
                    normals[li]=n
                else:normals[li]=p.normal
        data.normals_split_custom_set(normals)
    return o
# Four thin corner shells. Rounded-square perimeter, true underside openings.
# Divide on the midpoint of each side so no single mesh seals all four arches.
for side in range(4):
    vs=[];N=48
    for inner in (False,True):
        for top in (False,True):
            for j in range(N+1):
                a=(side*90+j*90/N)*math.pi/180
                # rounded-square: straight sides connected by 25 mm corner arcs
                dx,dz=math.cos(a),math.sin(a);t=.160/max(abs(dx),abs(dz));x,z=t*dx,t*dz
                x=max(-.135,min(.135,x));z=max(-.135,min(.135,z))
                l=math.hypot(t*dx-x,t*dz-z);x+=(t*dx-x)*.025/l;z+=(t*dz-z)*.025/l
                # opening at side midpoints, feet at the rounded corners
                edge=min(abs(x),abs(z));b=0 if edge>=.108 else .285+.060*math.sqrt(max(0,1-(edge/.108)**2))
                y=.445 if top else b
                scale=(.185-(.035*y/.445))/.160
                inset=.005 if inner else 0
                xx=x*scale-math.copysign(inset*abs(dx),x);zz=z*scale-math.copysign(inset*abs(dz),z)
                vs.append((xx,y,zz))
    fs=[];L=N+1
    for j in range(N):
        fs.extend([(j,j+1,L+j+1,L+j),(2*L+j,3*L+j,3*L+j+1,2*L+j+1),(j,2*L+j,2*L+j+1,j+1),(L+j,L+j+1,3*L+j+1,3*L+j)])
    fs.extend([(0,L,3*L,2*L),(N,2*L+N,3*L+N,L+N)])
    mesh('corner-shell-'+str(side),vs,fs,shell)
# Rounded cushion, ring slices form a softly domed top without external maps.
vs=[];fs=[];N=64
for y,half,r in [(.441,.140,.042),(.446,.144,.046),(.454,.143,.046),(.463,.133,.043),(.467,.108,.038)]:
    for j in range(N):
        a=j*math.tau/N;dx,dz=math.cos(a),math.sin(a);t=(half-r)/max(abs(dx),abs(dz));x,z=t*dx,t*dz
        l=math.hypot(dx,dz);vs.append((x+r*dx/l,y,z+r*dz/l))
for k in range(4):
    for j in range(N):q=k*N+j;n=k*N+(j+1)%N;fs.append((q,n,n+N,q+N))
fs.append(tuple(reversed(range(N))));fs.append(tuple(range(4*N,5*N)))
mesh('seat-cushion',vs,fs,cloth)
# Accurate extrema: rounded contour cardinal points are +/-185 at the feet.
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent/'lib'))
from blender_asset_preflight import from_args as declared_preflight
declared_preflight(bpy.context.scene)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'stack-stool-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'stack-stool-v1.glb'),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
if '--result' in sys.argv:pathlib.Path(sys.argv[sys.argv.index('--result')+1]).write_text(json.dumps({'passed':True,'blenderVersion':bpy.app.version_string,'parts':5}))
