"""Author the fixed Y52Y09 six-cubby bookcase in isolated background Blender."""
import bpy
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent/'lib'))
from y52y09_spec import boards

out = pathlib.Path(sys.argv[sys.argv.index('--')+1]).resolve()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system = 'METRIC'
wood = bpy.data.materials.new('beech-approximation')
wood.use_nodes = True
node = next(n for n in wood.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
def linear(v):
    v = v/255
    return v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4
node.inputs['Base Color'].default_value = (*[linear(v) for v in (196,155,112)],1)
node.inputs['Roughness'].default_value = .58
for name, size, center in boards():
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = (size[0],size[2],size[1])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.location = (center[0],-center[2],center[1])
    bevel = obj.modifiers.new('Estimated eased edges', 'BEVEL')
    bevel.width = min(.006,*(v/4 for v in size))
    bevel.segments = 3
    bpy.ops.object.modifier_apply(modifier=bevel.name)
    obj.data.materials.append(wood)
    obj['furnishStablePart'] = 'y52y09:'+name
    obj['furnishRecolor'] = True
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent/'lib'))
from blender_asset_preflight import from_args as declared_preflight
declared_preflight(bpy.context.scene)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'y52y09-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'y52y09-v1.glb'), export_format='GLB', export_extras=True, export_cameras=False, export_lights=False)
if '--result' in sys.argv:
    pathlib.Path(sys.argv[sys.argv.index('--result')+1]).write_text(json.dumps({'passed':True,'blender':bpy.app.version_string,'parts':len(boards())}),encoding='utf-8')
print('Y52Y09_AUTHOR_COMPLETE',len(boards()))
