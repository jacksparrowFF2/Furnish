"""Build the Mijia 5-place dishwasher with a double folding-leaf rig.
The fixed authoring spec is supplied by the shared Furnish product/core rules.
"""
import bpy
import json
import pathlib
import sys

args=sys.argv[sys.argv.index('--')+1:]
out=pathlib.Path(args[0]).resolve()
spec=json.loads(pathlib.Path(args[args.index('--spec')+1]).read_text(encoding='utf-8'))
out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC'
def position(v):
    return (v[0]/1000,-v[2]/1000,v[1]/1000)
def linear(v):
    v=v/255
    return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
materials={}
for name,hexcolor,rough,metal in [('white','f4f3ef',.28,.04),('dark','303234',.55,0),('shelf','d8dce0',.55,0),('screen','292e30',.3,0),('ink','565c5d',.65,.1),('inner','999fa2',.32,.65),('steel','b9bfc2',.25,.8),('base','d7d8d6',.4,0),('seal','4a4c4c',.8,0),('ceramic','f5f3ed',.2,.06)]:
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    node=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    node.inputs['Base Color'].default_value=(*[linear(int(hexcolor[i:i+2],16)) for i in (0,2,4)],1)
    node.inputs['Roughness'].default_value=rough;node.inputs['Metallic'].default_value=metal
    materials[name]=mat
parents={}
for motion in spec['motions']:
    pivot=bpy.data.objects.new('motion-'+motion['role'],None);bpy.context.collection.objects.link(pivot)
    pivot.parent=parents.get(motion.get('parent'));origin=motion['pivot'];pivot.location=tuple(position(origin)[i]-(pivot.parent.matrix_world.translation[i] if pivot.parent else 0) for i in range(3));bpy.context.view_layer.update();pivot['furnishMotionRole']=motion['role'];pivot['furnishHingeAxis']=motion['axis'];parents[motion['role']]=pivot
for part in spec['parts']:
    a,b,c=part['size'];shape=part.get('shape','box')
    if shape=='basket':
        pieces=[]
        def rod(size,center):
            bpy.ops.mesh.primitive_cube_add(size=1);piece=bpy.context.object;piece.dimensions=position([size[0],size[1],-size[2]]);piece.location=position(center);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);pieces.append(piece)
        # Joined thin rails preserve the visible mesh basket; no closed solid tub.
        for y in [-b/2,0,b/2]:
            for z in [-c/2+1,c/2-1]: rod([a,2,2],[0,y+(1 if y<0 else -1 if y>0 else 0),z])
            for x in [-a/2+1,a/2-1]: rod([2,2,c],[x,y+(1 if y<0 else -1 if y>0 else 0),0])
        for i in range(15):
            x=-a/2+1+(a-2)*i/14;rod([2,2,c],[x,-b/2+1,0])
            for z in [-c/2+1,c/2-1]:rod([2,b,2],[x,0,z])
        bpy.ops.object.select_all(action='DESELECT')
        for piece in pieces:piece.select_set(True)
        bpy.context.view_layer.objects.active=pieces[0];bpy.ops.object.join();obj=bpy.context.object
        bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    elif shape in ('disc','plate'):
        # Blender cylinders are Z-axis; appliance front is Blender -Y.
        bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=1,depth=1);obj=bpy.context.object
        if shape=='disc':obj.rotation_euler[0]=1.5707963267948966
        else:obj.rotation_euler[1]=1.5707963267948966
        bpy.ops.object.transform_apply(location=False,rotation=True,scale=False)
        obj.dimensions=(a/1000,c/1000,b/1000);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    elif shape=='bowl':
        # Hollow bowl made from a spun cross-section, editable in source Blender.
        import math
        vs=[];faces=[]
        profile=[(0,-b/2),(.35*a,-b/2),(.5*a,b/2),(.46*a,b/2),(.31*a,-b/2+4),(0,-b/2+4)]
        for i in range(32):
            for radius,y in profile:vs.append((radius*math.cos(i*math.tau/32)/1000,radius*math.sin(i*math.tau/32)/1000,y/1000))
        for i in range(32):
            for j in range(len(profile)-1):faces.append((i*len(profile)+j,((i+1)%32)*len(profile)+j,((i+1)%32)*len(profile)+j+1,i*len(profile)+j+1))
        mesh=bpy.data.meshes.new(part['name']);mesh.from_pydata(vs,[],faces);mesh.update();obj=bpy.data.objects.new(part['name'],mesh);bpy.context.collection.objects.link(obj)
    else:
        bpy.ops.mesh.primitive_cube_add(size=1);obj=bpy.context.object;obj.dimensions=(a/1000,c/1000,b/1000);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        bevel=obj.modifiers.new('Visual eased edges','BEVEL');bevel.width=min(.002,a/8000,b/8000,c/8000);bevel.segments=2;bpy.ops.object.modifier_apply(modifier=bevel.name)
    obj.name=part['name']
    center=position(part['center']);parent=parents.get(part['role']);obj.parent=parent;obj.location=tuple(center[i]-(parent.matrix_world.translation[i] if parent else 0) for i in range(3))
    obj.data.materials.append(materials[part['material']]);obj['furnishStablePart']='dishwasher-v1:'+part['name'];obj['furnishRecolor']=part['material']=='white'
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent/'lib'))
from blender_asset_preflight import from_args as declared_preflight
declared_preflight(bpy.context.scene)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'dishwasher-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'dishwasher-v1.glb'),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
if '--result' in args:
    pathlib.Path(args[args.index('--result')+1]).write_text(json.dumps({'passed':True,'blender':bpy.app.version_string,'parts':len(spec['parts']),'motions':len(parents)}),encoding='utf-8')
