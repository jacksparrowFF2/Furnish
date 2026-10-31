"""Y107H03 closed sofa bed from JD dimension and appearance images. Background Blender only.
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
wood=material('natural-wood','c89d68',.46);cloth=material('linen-beige','e4dfd2',.96);seam=material('linen-piping','cfc6b4',.95)
def finish(o,name,mat):
    o.name=name;o.data.materials.append(mat);o['furnishStablePart']='sofa-bed-v1:'+name;o['furnishRecolor']=mat==wood
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

# Product geometry: no continuous mechanical path is inferred from marketing images.
steel=material('powder-coated-steel','252624',.64);rubber=material('caster-rubber','4d4640',.9)
def fitted_soft(name,size,center,angle=0,r=.03,puff=.004):
    o=soft(name,size,center,angle,r,puff);bpy.context.view_layer.update()
    # Keep each reference envelope exact despite the soft surface's crown.
    m=o.matrix_world.copy();vs=[m@v.co for v in o.data.vertices]
    low=[min(v[k] for v in vs) for k in range(3)];high=[max(v[k] for v in vs) for k in range(3)]
    target=[size[0],size[2],size[1]];c=xyz(center)
    for v,p in zip(o.data.vertices,vs):v.co=tuple(c[k]+(p[k]-(low[k]+high[k])/2)*target[k]/(high[k]-low[k]) for k in range(3))
    o.matrix_world.identity();return o
for side,x in [('left',-.600),('right',.600)]:
    box('front-post-'+side,(.050,.295,.050),(x,.1475,.394),wood,.0249)
    box('back-post-'+side,(.050,.722,.050),(x,.361,-.394),wood,.0249)
    box('side-panel-'+side,(.022,.260,.740),(x,.130,0),wood,.004)
    box('side-inset-'+side,(.004,.180,.620),(x+(-.012 if x<0 else .012),.137,0),wood,.003)
    box('metal-runner-'+side,(.030,.035,.738),(x*.80,.1025,.005),steel,.003)
    for label,z in [('front',.315),('back',-.310)]:
        box('wheel-fork-'+label+'-'+side,(.024,.082,.030),(x*.8,.063,z),steel,.002)
        bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.022,depth=.018,location=xyz((x*.8,.022,z)),rotation=(0,math.pi/2,0))
        finish(bpy.context.object,'wheel-'+label+'-'+side,rubber)
    fitted_soft('lumbar-'+side,(.560,.260,.095),(x*.49,.515,-.095),12,.027,.008)
    piping('lumbar-piping-'+side,.535,.235,.043,(x*.49,.515,-.095),12,.020)
box('front-rail',(1.150,.145,.026),(0,.213,.394),wood,.006)
box('back-rail',(1.150,.080,.030),(0,.274,-.394),wood,.004)
box('back-top-rail',(1.150,.040,.028),(0,.692,-.394),wood,.007)
for i in range(7):box('back-slat-'+str(i),(.038,.390,.022),((i-3)*.158,.497,-.394),wood,.005)
for i in range(12):box('steel-slat-'+str(i),(1.130,.020,.028),(0,.282,-.330+i*.061),steel,.002)
fitted_soft('seat-lower',(1.180,.050,.760),(0,.325,.030),r=.022,puff=.002)
fitted_soft('seat-upper',(1.180,.050,.760),(0,.375,.030),r=.022,puff=.003)
piping('seat-piping-lower',1.150,.730,0,(0,.336,.030),90,.026)
piping('seat-piping-upper',1.150,.730,0,(0,.386,.030),90,.026)
# Front depth reduces upward, reproducing the gently raked single back cushion.
o=fitted_soft('back-cushion',(1.180,.560,.160),(0,.490,-.339),r=.035,puff=.004)
for v in o.data.vertices:
    y=v.co.z;t=(y-.210)/.560
    front=-.220-.099*t;rear=-.380-.039*t
    z=-v.co.y;tdepth=(z-(-.419))/.160
    v.co.y=-(rear+tdepth*(front-rear))
# Back cushion's lowest area sits behind the folded seat; exact hidden joinery unknown.
bpy.context.view_layer.update();objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in objects:
    bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=1e-7);bmesh.ops.recalc_face_normals(bm,faces=bm.faces)
    if any(not e.is_manifold for e in bm.edges):raise ValueError('Open mesh '+o.name)
    bm.to_mesh(o.data);bm.free()
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent/'lib'))
from blender_asset_preflight import from_args as declared_preflight
declared_preflight(bpy.context.scene)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'sofa-bed-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'sofa-bed-v1.glb'),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
if '--result' in sys.argv:pathlib.Path(sys.argv[sys.argv.index('--result')+1]).write_text(json.dumps({'passed':True,'parts':len(objects),'blender':bpy.app.version_string}),encoding='utf-8')
