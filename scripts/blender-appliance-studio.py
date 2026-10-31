"""Create a saved, portable refinement template from a production snapshot.

Only reviewed TG10K60W materials and photographic lighting are refined. A
baseline template retains the incoming PBR. Source geometry is never edited.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT/'lib'))
from appliance_materials import refine_scene

parser = argparse.ArgumentParser()
parser.add_argument('input');parser.add_argument('spec');parser.add_argument('output')
parser.add_argument('--baseline', action='store_true')
parser.add_argument('--context', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
data = Path(args.input).read_bytes();doc = json.loads(data[20:20+int.from_bytes(data[12:16], 'little')])
meta = doc['scenes'][0]['extras']['furnish']
spec = importlib.util.spec_from_file_location('studio_sync', ROOT/'blender-sync-addon.py')
sync = importlib.util.module_from_spec(spec);spec.loader.exec_module(sync)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
receipt = sync.apply_snapshot(scene, args.input, dict(planId=meta['planId'], originMm=meta['originMm'], revision=hashlib.sha256(data).hexdigest()), capture_camera=True)
scene.camera = bpy.data.objects[receipt['renderCamera']]
for obj in list(scene.objects):
    if obj.type == 'LIGHT':
        bpy.data.objects.remove(obj, do_unlink=True)
parts = json.loads(Path(args.spec).read_text(encoding='utf-8'))['parts']
refined = [] if args.baseline else refine_scene(scene, parts)
meshes = [o for o in scene.objects if o.type == 'MESH' and o.get('furnishPartKey', '').startswith('explicit:washer-tg10k60w-v1:')]
points = [o.matrix_world @ Vector(c) for o in meshes for c in o.bound_box]
center = Vector([(min(p[i] for p in points)+max(p[i] for p in points))/2 for i in range(3)])

def area(name, offset, energy, width, height):
    light = bpy.data.lights.new(name, 'AREA');light.energy = energy;light.shape = 'RECTANGLE'
    light.size = width;light.size_y = height
    obj = bpy.data.objects.new(name, light);scene.collection.objects.link(obj)
    obj.location = center+Vector(offset);obj.rotation_euler = (center-obj.location).to_track_quat('-Z', 'Y').to_euler()

if args.context:
    # East-facing washer in this saved 1601 snapshot. These are photographic
    # supplements, not electrical/illuminance design or a global room preset.
    area('Laundry window softbox', (1.1, .65, 1), 220, 1.3, 1.8)
    area('Laundry front fill', (1.3, -.3, .35), 80, .5, 1.4)
else:
    area('Studio tall key', (-.85, -1.15, .8), 180, 1.25, 1.8)
    area('Studio strip reflection', (.85, -.45, .35), 95, .36, 1.6)
    area('Studio top rim', (.15, .6, 1.1), 160, 1.0, .75)
    # Photographic negative fill: give polished metal a dark region to reflect.
    card_mat = bpy.data.materials.new('Studio negative reflection card');card_mat.diffuse_color = (.008, .008, .008, 1)
    bpy.ops.mesh.primitive_plane_add(size=1, location=center+Vector((-.3, -.95, .35)), rotation=(1.5707963268, 0, 0))
    card = bpy.context.object;card.name = 'Studio negative fill';card.scale = (.6, 1.3, 1);card.data.materials.append(card_mat)
    card.visible_camera = False;card.visible_shadow = False;card.visible_diffuse = False;card.visible_transmission = False
    ground = bpy.data.materials.new('Studio neutral floor');ground.use_nodes = True
    shader = ground.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value = (.22, .23, .24, 1);shader.inputs['Roughness'].default_value = .72
    for obj in scene.objects:
        if obj.type == 'MESH' and not obj.get('furnishId'):
            for slot in obj.material_slots:slot.material = ground
world = bpy.data.worlds.new('Appliance studio environment');world.use_nodes = True;scene.world = world
background = world.node_tree.nodes.get('Background');background.inputs['Color'].default_value = (.18, .19, .21, 1);background.inputs['Strength'].default_value = .32
scene.unit_settings.system = 'METRIC';scene.unit_settings.scale_length = 1
scene.render.engine = 'CYCLES';scene.cycles.samples = 128;scene.cycles.use_denoising = True
scene.cycles.max_bounces = 12;scene.cycles.transmission_bounces = 8;scene.cycles.transparent_max_bounces = 8
scene.view_settings.view_transform = 'AgX';scene.view_settings.exposure = -.7
scene.render.resolution_x = scene.render.resolution_y = 1024;scene.render.resolution_percentage = 100
output = Path(args.output).resolve();output.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(output))
output.with_suffix('.json').write_text(json.dumps(dict(passed=True, baseline=args.baseline, context=args.context, parts=len(meshes), refined=refined, planId=meta['planId'], originMm=meta['originMm'], sourceSha256=hashlib.sha256(data).hexdigest(), lights=[o.name for o in scene.objects if o.type == 'LIGHT']), indent=2), encoding='utf-8')
