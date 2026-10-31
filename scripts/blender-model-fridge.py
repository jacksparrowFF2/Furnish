"""Build the existing 833x595x1910 fridge with independent hinge/slide parents.
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
for name,hexcolor,rough,metal in [('white','f1f0ed',.4,.12),('dark','303234',.55,0),('shelf','d8dce0',.55,0),('screen','292e30',.3,0),('ink','c2d4d4',.5,0)]:
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
    bpy.ops.mesh.primitive_cube_add(size=1);obj=bpy.context.object;obj.name=part['name'];a,b,c=part['size'];obj.dimensions=(a/1000,c/1000,b/1000)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    bevel=obj.modifiers.new('Visual eased edges','BEVEL');bevel.width=min(.002,a/8000,b/8000,c/8000);bevel.segments=2;bpy.ops.object.modifier_apply(modifier=bevel.name)
    center=position(part['center']);parent=parents.get(part['role']);obj.parent=parent;obj.location=tuple(center[i]-(parent.location[i] if parent else 0) for i in range(3))
    obj.data.materials.append(materials[part['material']]);obj['furnishStablePart']='fridge-v1:'+part['name'];obj['furnishRecolor']=part['material']=='white'
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent/'lib'))
from blender_asset_preflight import from_args as declared_preflight
from appliance_materials import configure
configure(materials, 'fridge')
declared_preflight(bpy.context.scene)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'fridge-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'fridge-v1.glb'),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
if '--result' in args:
    pathlib.Path(args[args.index('--result')+1]).write_text(json.dumps({'passed':True,'blender':bpy.app.version_string,'parts':len(spec['parts']),'motions':len(parents)}),encoding='utf-8')
