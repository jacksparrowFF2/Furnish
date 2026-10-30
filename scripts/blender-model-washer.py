"""Build the generic front-load washer with a circular left-hinged door.
The fixed authoring spec is supplied by the shared Furnish product/core rules.
"""
import bpy
import json
import pathlib
import sys
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent/'lib'))
from washer_detail import build as detail_mesh

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
for name,hexcolor,rough,metal in [('white','f1f0ed',.4,.12),('dark','303234',.55,0),('shelf','d8dce0',.55,0),('screen','292e30',.3,0),('ink','c2d4d4',.5,0),('base','8f969b',.55,0),('steel','c7cfd5',.25,.7),('glass','26343d',.09,.2),('drum','2b3034',.4,.6),('fascia','acb0b3',.3,.6),('blue','386382',.35,.2),('chrome','e2e3e3',.14,.85),('print','202225',.65,0),('rubber','555a5d',.75,0),('drum-steel','697582',.19,.82),('clear-glass','71818d',.08,.1),('label-black','202b33',.6,0),('label-green','4b7651',.6,0),('label-white','f3f3e8',.65,0),('label-blue','168ab1',.6,0)]:
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    node=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
    node.inputs['Base Color'].default_value=(*[linear(int(hexcolor[i:i+2],16)) for i in (0,2,4)],1)
    node.inputs['Roughness'].default_value=rough;node.inputs['Metallic'].default_value=metal
    if name=='clear-glass':
        node.inputs['Alpha'].default_value=.12;mat.surface_render_method='DITHERED'
    if name=='drum-steel':
        node.inputs['Emission Color'].default_value=(.08,.08,.08,1);node.inputs['Emission Strength'].default_value=.12
    materials[name]=mat
parents={}
for motion in spec['motions']:
    pivot=bpy.data.objects.new('motion-'+motion['role'],None);bpy.context.collection.objects.link(pivot)
    pivot.location=position(motion['pivot']);pivot['furnishMotionRole']=motion['role'];pivot['furnishHingeAxis']=motion['axis'];parents[motion['role']]=pivot
for part in spec['parts']:
    a,b,c=part['size'];shape=part.get('shape','box')
    q=spec['profile'];file_id=q['id']
    obj=detail_mesh(part) if q['id']=='washer-tg10k60w' else None
    if obj is not None:pass
    elif shape=='ring':
        bpy.ops.mesh.primitive_torus_add(major_radius=(q['radius']+q['inner'])/2000,minor_radius=(q['radius']-q['inner'])/2000,major_segments=64,minor_segments=12);obj=bpy.context.object;obj.rotation_euler[0]=1.5707963267948966;bpy.ops.object.transform_apply(location=False,rotation=True,scale=False);obj.dimensions=(a/1000,c/1000,b/1000);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    elif shape in ('lens','side-oval'):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,radius=1);obj=bpy.context.object;obj.dimensions=(a/1000,c/1000,b/1000);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    elif shape=='disc':
        bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=1,depth=1);obj=bpy.context.object;obj.rotation_euler[0]=1.5707963267948966;bpy.ops.object.transform_apply(location=False,rotation=True,scale=False);obj.dimensions=(a/1000,c/1000,b/1000);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    else:
        bpy.ops.mesh.primitive_cube_add(size=1);obj=bpy.context.object;obj.dimensions=(a/1000,c/1000,b/1000);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        if shape=='frame':
            bpy.ops.mesh.primitive_cylinder_add(vertices=96,radius=q['hole']/1000,depth=.050,location=(0,0,(q['cy']-part['center'][1])/1000),rotation=(1.5707963267948966,0,0));cutter=bpy.context.object
            mod=obj.modifiers.new('Circular drum aperture','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter;bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
        else:
            bevel=obj.modifiers.new('Visual eased edges','BEVEL');bevel.width=min(.002,a/8000,b/8000,c/8000);bevel.segments=2;bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=bevel.name)
        if q['id']=='washer-tg10k60w' and part['name'] in ('side--1','side-1'):
            # Cut actual shallow channels so detail inserts are visible without coplanar faces.
            side=1 if part['center'][0]>0 else -1
            for y in (158,244,652,756,448):
                if y==448:
                    bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=16,radius=1)
                    cutter=bpy.context.object;cutter.dimensions=(.008,.275,.170)
                else:
                    bpy.ops.mesh.primitive_cube_add(size=1);cutter=bpy.context.object;cutter.dimensions=(.008,.390,.018)
                bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
                cutter.location=(side*.0105,.002,(y-445)/1000)
                mod=obj.modifiers.new('Stamped side channel','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter;bpy.context.view_layer.objects.active=obj;bpy.ops.object.modifier_apply(modifier=mod.name);bpy.data.objects.remove(cutter,do_unlink=True)
    obj.name=part['name']
    if q['id']=='washer-tg10k60w' and shape in ('ring','lens','side-oval'):
        for polygon in obj.data.polygons:polygon.use_smooth=True
    center=position(part['center']);parent=parents.get(part['role']);obj.parent=parent;obj.location=tuple(center[i]-(parent.location[i] if parent else 0) for i in range(3))
    if q['id']=='washer-tg10k60w' and part['material']=='fascia':
        node=next(n for n in materials['fascia'].node_tree.nodes if n.type=='BSDF_PRINCIPLED');node.inputs['Metallic'].default_value=.25;node.inputs['Roughness'].default_value=.42
    # Boolean cutters can leave an empty slot in Blender 5.x. This product's
    # declared single material must own every face before exporting the GLB.
    obj.data.materials.clear();obj.data.materials.append(materials[part['material']])
    for polygon in obj.data.polygons:polygon.material_index=0
    obj['furnishStablePart']=file_id+'-v1:'+part['name'];obj['furnishRecolor']=part['material']=='white'
bpy.ops.wm.save_as_mainfile(filepath=str(out/(file_id+'-v1.blend')))
bpy.ops.export_scene.gltf(filepath=str(out/(file_id+'-v1.glb')),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
if '--result' in args:
    pathlib.Path(args[args.index('--result')+1]).write_text(json.dumps({'passed':True,'blender':bpy.app.version_string,'parts':len(spec['parts']),'motions':len(parents)}),encoding='utf-8')
