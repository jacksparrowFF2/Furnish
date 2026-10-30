"""Author the SE2 pilot in a factory-startup BACKGROUND Blender, never a live scene.
Dimensions follow docs/BATH-HEATER-AOPU-SE2.md; unmeasured details are visual assumptions.
Usage: blender -b --factory-startup --python this.py -- OUTPUT_DIRECTORY
"""
import bpy
import json
import math
import pathlib
import sys

out = pathlib.Path(sys.argv[sys.argv.index('--') + 1]).resolve()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system = 'METRIC'


def material(name, color, roughness=.4, metal=0, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    node = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
    # Hex references are sRGB; Blender shader inputs are linear.
    def linear(c):
        v = int(c, 16) / 255
        return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4
    rgb = tuple(linear(color[i:i+2]) for i in (0, 2, 4))
    node.inputs['Base Color'].default_value = (*rgb, 1)
    node.inputs['Roughness'].default_value = roughness
    node.inputs['Metallic'].default_value = metal
    if emission:
        node.inputs['Emission Color'].default_value = (1, 1, .87, 1)
        node.inputs['Emission Strength'].default_value = emission
    return mat


white = material('panel-white', 'f5f5f3')
metal = material('housing-metal', '9da3a6', .55, .55)
dark = material('vent-dark', '626b70', .65)
display = material('display-dark', '252e34', .28)
light = material('diffuser-light', 'fffffa', .65, emission=.65)
ink = material('display-ink', 'd9e5e8')
orange = material('brand-orange', 'ec7b28')


def finish(obj, name, x, y, z, mat):
    obj.name = name
    # Author in Blender Z-up; Furnish (x,y,z) -> Blender (x,-z,y).
    obj.location = (x, -z, y)
    obj.data.materials.append(mat)
    obj['furnishStablePart'] = 'bath-heater-se2:' + name
    obj['furnishRecolor'] = mat == white
    return obj


def box(name, a, b, c, x, y, z, mat):
    bpy.ops.mesh.primitive_cube_add(size=1)
    obj = bpy.context.object
    obj.dimensions = (a, c, b)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, x, y, z, mat)


w, d, r, h = .3, .6, .002, .112
box('face', w, r*.2, d, 0, r*.9, 0, white)
for side in (-1, 1):
    box('rim-side-'+str(side), w*.025, r, d, side*w*.4875, r/2, 0, white)
    box('rim-end-'+str(side), w*.95, r, d*.025, 0, r/2, side*d*.4875, white)
box('diffuser', w*.675, r*.35, d*.95, w*.1375, r*.475, 0, light)
for i in range(5):
    box('vent-'+str(i), w*.018, r*.2, d*.91, w*(-.45+i*.032), r*.55, 0, dark)
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=w*.036, depth=r*.2)
# Align the 32-gon with the existing Three cylinder angular samples.
bpy.context.object.rotation_euler.z = math.pi/2
finish(bpy.context.object, 'display', -w*.235, r*.5, -d*.425, display)
for i in range(3):
    box('display-mark-'+str(i), w*.007, r*.1, d*.009, -w*.235+w*(i-1)*.015, r*.35, -d*.425, ink)
for i in range(4):
    box('indicator-'+str(i), w*.015, r*.1, d*.012, -w*.235, r*.4, d*(-.29+i*.12), metal)
    box('indicator-label-'+str(i), w*.008, r*.1, d*.024, -w*.235, r*.4, d*(-.26+i*.12), metal)
box('brand-accent', w*.012, r*.1, d*.025, -w*.235, r*.35, d*.325, orange)
for i in range(4):
    box('brand-mark-'+str(i), w*.02, r*.1, d*.004, -w*.235, r*.35, d*(.37+i*.016), dark)
box('body', w*.86, h-r, d*.9, 0, r+(h-r)/2, 0, metal)
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent/'lib'))
from blender_asset_preflight import from_args as declared_preflight
declared_preflight(bpy.context.scene)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'se2-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'se2-v1.glb'), export_format='GLB',
                          export_extras=True, export_cameras=False, export_lights=False)
print('SE2_AUTHOR_COMPLETE', len(bpy.context.scene.objects))
if '--result' in sys.argv:
    pathlib.Path(sys.argv[sys.argv.index('--result')+1]).write_text(json.dumps({'passed': True, 'blender': bpy.app.version_string}), encoding='utf-8')
