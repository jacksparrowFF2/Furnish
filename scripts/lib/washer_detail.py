"""TG10K60W close-up details, authored as ordinary editable Blender meshes.
No photograph is pasted over the opening; labels are local vector approximations.
"""
import bpy
import math
from mathutils import Vector

def mesh_object(vertices,faces):
    mesh=bpy.data.meshes.new('washer-detail');mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new('washer-detail',mesh);bpy.context.collection.objects.link(obj);return obj

def lathe(profile,segments=96):
    vertices=[(r*math.cos(i*math.tau/segments)/1000,-z/1000,r*math.sin(i*math.tau/segments)/1000) for r,z in profile for i in range(segments)]
    faces=[(j*segments+i,j*segments+(i+1)%segments,((j+1)%len(profile))*segments+(i+1)%segments,((j+1)%len(profile))*segments+i) for j in range(len(profile)) for i in range(segments)]
    # Reverse the profile winding if necessary through Blender's consistent normal operation.
    obj=mesh_object(vertices,faces)
    bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
    for polygon in obj.data.polygons:polygon.use_smooth=True
    return obj

def normalize(obj,size):
    bpy.context.view_layer.update()
    points=[obj.matrix_world @ v.co for v in obj.data.vertices]
    lo=[min(v[k] for v in points) for k in range(3)];hi=[max(v[k] for v in points) for k in range(3)]
    target=(size[0]/1000,size[2]/1000,size[1]/1000)
    for vertex,point in zip(obj.data.vertices,points):vertex.co=Vector([(point[k]-(lo[k]+hi[k])/2)*target[k]/max(hi[k]-lo[k],1e-12) for k in range(3)])
    obj.matrix_world.identity();return obj

def combine(objects):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join();return objects[0]

def text(body,x=0,y=0,size=.012,font=None):
    curve=bpy.data.curves.new('washer-lettering','FONT');curve.body=body;curve.size=size;curve.extrude=.0002;curve.resolution_u=2
    if font:curve.font=font
    obj=bpy.data.objects.new('washer-lettering',curve);bpy.context.collection.objects.link(obj);obj.rotation_euler[0]=math.pi/2;obj.location=(x,0,y)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH');return bpy.context.object

def path(points,width=.0006,closed=False):
    curve=bpy.data.curves.new('washer-line','CURVE');curve.dimensions='3D';curve.bevel_depth=width;curve.bevel_resolution=1;curve.resolution_u=1
    spline=curve.splines.new('POLY');spline.points.add(len(points)-1)
    for point,(x,y) in zip(spline.points,points):point.co=(x,0,y,1)
    spline.use_cyclic_u=closed;obj=bpy.data.objects.new('washer-line',curve);bpy.context.collection.objects.link(obj)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.convert(target='MESH');return bpy.context.object

def graphics(part):
    shape=part['shape'];objects=[]
    latin=bpy.data.fonts.load('C:/Windows/Fonts/arial.ttf',check_existing=True)
    chinese=bpy.data.fonts.load('C:/Windows/Fonts/msyh.ttc',check_existing=True)
    if shape=='brand':
        objects.append(text('LittleSwan',.024,0,.015,latin))
        # Bird silhouette traced approximately from the supplied small logo.
        xy=[(0,.009),(.005,.006),(.003,.017),(.009,.012),(.013,.021),(.015,.014),(.023,.020),(.019,.010),(.026,.013),(.020,.005),(.012,.002),(.003,.004)]
        vertices=[(x,-z,y) for z in (0,.0004) for x,y in xy];n=len(xy);faces=[tuple(range(n-1,-1,-1)),tuple(range(n,n*2))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)];objects.append(mesh_object(vertices,faces))
    elif shape=='power':
        objects.append(path([(.004*math.cos(a),.004*math.sin(a)) for a in [math.pi*.65+i*math.pi*1.7/48 for i in range(49)]]));objects.append(path([(0,.001),(0,.006)]))
    elif shape=='caption':objects.append(text('超微净泡   水魔方   智能双投   10kg',0,0,.007,chinese))
    elif shape=='button-mark':
        objects.append(path([(.003*math.cos(i*math.tau/24),.003*math.sin(i*math.tau/24)+.018) for i in range(24)],.00035,True));objects.append(text('触\n控\n开\n门',0,-.006,.004,chinese))
    elif shape=='certification':
        for x in (0,.025):objects.append(path([(x+.008*math.cos(i*math.tau/32),.012+.008*math.sin(i*math.tau/32)) for i in range(32)],.00035,True))
        objects.extend([text('W',-.005,.007,.009,latin),text('W',.020,.007,.009,latin),text('WOOLMARK',-.008,-.003,.004,latin),text('超微净泡',.050,.003,.007,chinese)])
    elif shape=='energy-label':
        objects.extend([text('中国能效标识',0,.025,.006,chinese),text('CHINA ENERGY LABEL',0,.017,.003,latin),text('1 级',0,.005,.009,chinese),text('TG10K60W',0,-.007,.004,latin)])
        for y in (-.013,-.019,-.025):objects.append(path([(0,y),(.035,y)],.0002))
    return normalize(combine(objects),part['size'])

def perforations(part):
    vertices=[];faces=[]
    def dot(center,u,v,r=.0011):
        base=len(vertices);vertices.append(center)
        for i in range(8):vertices.append(tuple(center[k]+r*(u[k]*math.cos(i*math.tau/8)+v[k]*math.sin(i*math.tau/8)) for k in range(3)))
        for i in range(8):faces.append((base,base+1+i,base+1+(i+1)%8))
    for row in range(8):
        z=-.077+row*.022
        for j in range(36):
            a=(j+(row%2)*.5)*math.tau/36;dot((.179*math.cos(a),-z,.179*math.sin(a)),(-math.sin(a),0,math.cos(a)),(0,1,0))
    for r in (.045,.085,.125,.162):
        for j in range(36):
            a=j*math.tau/36;dot((r*math.cos(a),.084,r*math.sin(a)),(1,0,0),(0,0,1))
    return normalize(mesh_object(vertices,faces),part['size'])

def lifters(part):
    vertices=[];faces=[]
    for angle in (math.pi/2,math.pi/2+math.tau/3,math.pi/2+math.tau*2/3):
        base=len(vertices)
        for z in (-.065,.065):
            for offset,r in ((-.10,.176),(0,.150),(.10,.176)):
                vertices.append((r*math.cos(angle+offset),-z,r*math.sin(angle+offset)))
        faces.extend([tuple(base+i for i in (0,1,4,3)),tuple(base+i for i in (1,2,5,4)),tuple(base+i for i in (2,0,3,5)),tuple(base+i for i in (0,2,1)),tuple(base+i for i in (3,4,5))])
    obj=normalize(mesh_object(vertices,faces),part['size']);bevel=obj.modifiers.new('Soft drum lifters','BEVEL');bevel.width=.004;bevel.segments=3;bpy.context.view_layer.objects.active=obj;obj.select_set(True);bpy.ops.object.modifier_apply(modifier=bevel.name)
    # Restore exact declared bounds after corner easing.
    obj=normalize(obj,part['size'])
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj;bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
    return obj

def build(part):
    shape=part['shape'];a,b,c=part['size']
    if part['name']=='door-glass':
        # Shallow, approximately parallel glass skins. The previous solid
        # ellipsoid acted as a strong lens once physical refraction was enabled.
        # Preserve the existing declared outer bounds; 1.8mm is a visual estimate.
        return normalize(lathe([(0,-5),(40,-4.9),(90,-3.8),(140,-.5),(180,5),(188,6),
                                (188,4.2),(180,3.2),(140,-2.3),(90,-5.6),(40,-6.7),(0,-6.8)]),part['size'])
    if shape=='door-profile':return lathe([(255,-14),(255,-10),(253,-5),(246,-2),(235,-1),(222,0),(207,4),(195,11),(190,14),(190,-14)])
    if shape=='knob-profile':return lathe([(0,6),(12,7),(30,6),(34,4),(36,1),(36,-5),(34,-7),(0,-7)])
    if shape=='annulus':return lathe([(a/2,-c/2),(a/2,c/2),(part['inner'],c/2),(part['inner'],-c/2)])
    if shape=='drum-bowl':return lathe([(182.5,-90),(182.5,90),(179,90),(179,-79),(158,-86),(0,-86),(0,-90)])
    if shape=='drum-pressing':
        vertices=[(0,0,0)];segments=96;rings=12
        for j in range(1,rings+1):
            r=j/rings
            for i in range(segments):
                angle=i*math.tau/segments;z=.010*math.sin(math.pi*r)**2*math.cos(3*angle)+.003*r
                vertices.append((.155*r*math.cos(angle),-z,.155*r*math.sin(angle)))
        faces=[(0,1+i,1+(i+1)%segments) for i in range(segments)]
        for j in range(rings-1):
            for i in range(segments):a=1+j*segments+i;b=1+j*segments+(i+1)%segments;faces.append((a,a+segments,b+segments,b))
        obj=normalize(mesh_object(vertices,faces),part['size'])
        for polygon in obj.data.polygons:polygon.use_smooth=True
        return obj
    if shape=='perforations':return perforations(part)
    if shape=='lifters':return lifters(part)
    if shape in ('brand','power','caption','button-mark','certification','energy-label'):return graphics(part)
    return None
