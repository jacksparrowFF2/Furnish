"""Build the generic front-load washer with a circular left-hinged door.
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
for name,hexcolor,rough,metal in [('white','f1f0ed',.4,.12),('dark','303234',.55,0),('shelf','d8dce0',.55,0),('screen','292e30',.3,0),('ink','c2d4d4',.5,0),('base','8f969b',.55,0),('steel','c7cfd5',.25,.7),('glass','26343d',.09,.2),('drum','2b3034',.4,.6)]:
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    node=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    node.inputs['Base Color'].default_value=(*[linear(int(hexcolor[i:i+2],16)) for i in (0,2,4)],1)
    node.inputs['Roughness'].default_value=rough;node.inputs['Metallic'].default_value=metal
    materials[name]=mat
parents={}
for motion in spec['motions']:
    pivot=bpy.data.objects.new('motion-'+motion['role'],None);bpy.context.collection.objects.link(pivot)
    pivot.location=position(motion['pivot']);pivot['furnishMotionRole']=motion['role'];pivot['furnishHingeAxis']=motion['axis'];parents[motion['role']]=pivot
for part in spec['parts']:
    a,b,c=part['size'];shape=part.get('shape','box')
    if shape=='ring':
        bpy.ops.mesh.primitive_torus_add(major_radius=.178,minor_radius=.014,major_segments=64,minor_segments=12);obj=bpy.context.object;obj.rotation_euler[0]=1.5707963267948966;bpy.ops.object.transform_apply(location=False,rotation=True,scale=False)
    elif shape=='lens':
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,radius=1);obj=bpy.context.object;obj.dimensions=(a/1000,c/1000,b/1000);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    elif shape=='disc':
        bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=1,depth=1);obj=bpy.context.object;obj.rotation_euler[0]=1.5707963267948966;bpy.ops.object.transform_apply(location=False,rotation=True,scale=False);obj.dimensions=(a/1000,c/1000,b/1000);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    else:
        bpy.ops.mesh.primitive_cube_add(size=1);obj=bpy.context.object;obj.dimensions=(a/1000,c/1000,b/1000);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        if shape=='frame':
            bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=.170,depth=.050,location=(0,0,.020),rotation=(1.5707963267948966,0,0));cutter=bpy.context.object
            mod=obj.modifiers.new('Circular drum aperture','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter;bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
        else:
            bevel=obj.modifiers.new('Visual eased edges','BEVEL');bevel.width=min(.002,a/8000,b/8000,c/8000);bevel.segments=2;bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=bevel.name)
    obj.name=part['name']
    center=position(part['center']);parent=parents.get(part['role']);obj.parent=parent;obj.location=tuple(center[i]-(parent.location[i] if parent else 0) for i in range(3))
    obj.data.materials.append(materials[part['material']]);obj['furnishStablePart']='washer-v1:'+part['name'];obj['furnishRecolor']=part['material']=='white'
bpy.ops.wm.save_as_mainfile(filepath=str(out/'washer-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'washer-v1.glb'),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
if '--result' in args:
    pathlib.Path(args[args.index('--result')+1]).write_text(json.dumps({'passed':True,'blender':bpy.app.version_string,'parts':len(spec['parts']),'motions':len(parents)}),encoding='utf-8')
