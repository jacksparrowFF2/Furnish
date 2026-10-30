"""Build the JCD10TA hood with a rigid top-hinged glass panel.
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
for name,hexcolor,rough,metal in [('white','f1f0ed',.4,.12),('dark','303234',.55,0),('shelf','d8dce0',.55,0),('screen','292e30',.3,0),('ink','c2d4d4',.5,0),('black','17191b',.4,.25),('glass','101214',.13,.28),('iron','252729',.55,.5),('steel','aeb2b5',.27,.8),('gold','ba8839',.35,.55),('lamp','f1e9d7',.2,.1)]:
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
    a,b,c=part['localSize'];shape=part.get('shape','box')
    if shape=='wedge':
        vs=[(x/1000,-z/1000,y/1000) for x in [-a/2,a/2] for y,z in [(-b/2,-175),(-b/2,-95),(b/2,175),(b/2,-175)]]
        mesh=bpy.data.meshes.new(part['name']);mesh.from_pydata(vs,[],[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]);mesh.update();obj=bpy.data.objects.new(part['name'],mesh);bpy.context.collection.objects.link(obj)
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
    elif shape=='ring':
        bpy.ops.mesh.primitive_torus_add(major_radius=.010,minor_radius=.001,major_segments=40,minor_segments=8);obj=bpy.context.object;obj.rotation_euler[0]=1.5707963267948966;bpy.ops.object.transform_apply(location=False,rotation=True,scale=False)
    else:
        bpy.ops.mesh.primitive_cube_add(size=1);obj=bpy.context.object;obj.dimensions=(a/1000,c/1000,b/1000);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.name=part['name'];obj.rotation_euler[0]=part['rotation']
    center=position(part['localCenter']);parent=parents.get(part['role']);obj.parent=parent;obj.location=tuple(center[i]-(parent.location[i] if parent else 0) for i in range(3))
    obj.data.materials.append(materials[part['material']]);obj['furnishStablePart']='hood-v1:'+part['name'];obj['furnishRecolor']=False
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent/'lib'))
from blender_asset_preflight import from_args as declared_preflight
declared_preflight(bpy.context.scene)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'hood-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'hood-v1.glb'),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
if '--result' in args:
    pathlib.Path(args[args.index('--result')+1]).write_text(json.dumps({'passed':True,'blender':bpy.app.version_string,'parts':len(spec['parts']),'motions':len(parents)}),encoding='utf-8')
