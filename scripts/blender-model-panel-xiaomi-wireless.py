"""Xiaomi XMWS01XS from measured envelope and visible exterior references."""
import argparse
import json
import math
import pathlib
import sys

import bmesh
import bpy
from mathutils import Vector

ROOT = pathlib.Path(__file__).resolve().parent
PROFILE = 'panel-xiaomi-wireless'
parser = argparse.ArgumentParser()
parser.add_argument('output', type=pathlib.Path)
parser.add_argument('--preflight-contract', required=True)
parser.add_argument('--result', type=pathlib.Path, required=True)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
out = args.output
out.mkdir(parents=True, exist_ok=True)
blend = out / (PROFILE + '-v1.blend')
glb = blend.with_suffix('.glb')
if blend.exists() or glb.exists():
    raise ValueError('Use a new authoring directory')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'


def material(name, hex_rgb, roughness):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get('Principled BSDF')
    rgb = [int(hex_rgb[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    bsdf.inputs['Base Color'].default_value = tuple(
        v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb
    ) + (1,)
    bsdf.inputs['Roughness'].default_value = roughness
    return m


def ring(x, y, w, h, radii):
    corners = ((1, 1), (-1, 1), (-1, -1), (1, -1))
    points = []
    for corner, ((sx, sy), radius) in enumerate(zip(corners, radii)):
        cx, cy = x + sx * (w / 2 - radius), y + sy * (h / 2 - radius)
        for step in range(9):
            a = (corner + step / 8) * math.pi / 2
            points.append((cx + radius * math.cos(a), cy + radius * math.sin(a)))
    return points


def loft(name, x, y, w, h, radii, levels):
    vertices = [
        (px / 1000, -z / 1000, py / 1000)
        for z, inset in levels
        for px, py in ring(x, y, w - 2 * inset, h - 2 * inset,
                           [max(.025, r - inset) for r in radii])
    ]
    n = len(vertices) // len(levels)
    last = (len(levels) - 1) * n
    faces = [tuple(reversed(range(n))), tuple(range(last, last + n))]
    for a in range(0, last, n):
        faces.extend((a + i, a + (i + 1) % n, a + n + (i + 1) % n, a + n + i)
                     for i in range(n))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    return obj


def capsule(name, x, y, w, h, back, front):
    # Leave a small straight segment at the ends to avoid coincident ring vertices.
    radius = w * .47
    return loft(name, x, y, w, h, [radius] * 4, [(back, 0), (front, 0)])


def recess(obj, cutter):
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new('Blind recess', 'BOOLEAN')
    modifier.operation = 'DIFFERENCE'
    modifier.solver = 'EXACT'
    modifier.object = cutter
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


def finish(obj, surface):
    obj.data.materials.clear()
    obj.data.materials.append(surface)
    obj['furnishStablePart'] = PROFILE + '-v1:' + obj.name
    obj['furnishRecolor'] = False
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    bmesh.ops.remove_doubles(mesh, verts=list(mesh.verts), dist=1e-9)
    bmesh.ops.triangulate(mesh, faces=list(mesh.faces))
    bmesh.ops.recalc_face_normals(mesh, faces=list(mesh.faces))
    for face in mesh.faces:
        face.material_index = 0
    if not all(edge.is_manifold for edge in mesh.edges) or any(
            face.calc_area() < 1e-15 for face in mesh.faces):
        raise ValueError('Open or degenerate mesh: ' + obj.name)
    mesh.to_mesh(obj.data)
    mesh.free()


body_mat = material('Satin white housing', 'e5e5e3', .42)
back_mat = material('Rear molded white plastic', 'dededb', .49)
rocker_mat = material('Satin white rocker plastic', 'f3f3f1', .33)
lens_mat = material('Unlit indicator diffuser', 'a3a6a4', .43)

back = loft('mounting-back', 0, 43, 82.8, 82.8, [2.3] * 4,
            [(-5.5, .35), (-5.15, 0), (-3.9, 0)])
finish(back, back_mat)
body = loft('housing', 0, 43, 85.6, 85.5, [2.8] * 4,
            [(-4.0, 1.25), (-3.25, .5), (-2.15, 0), (2.25, 0), (2.45, .14)])
for x in [-32, 32]:
    notch = loft('pry-tool', x, .2, 5.7, 1.9, [.38] * 4,
                 [(-.2, 0), (2.7, 0)])
    recess(body, notch)
finish(body, body_mat)

for side, sign in [('left', -1), ('right', 1)]:
    x = sign * 21.605
    radii = [.18, 2.8, 2.8, .18] if sign < 0 else [2.8, .18, .18, 2.8]
    rocker = loft(side + '-rocker', x, 43, 42.79, 86, radii,
                  [(2.35, .15), (2.7, 0), (5.27, 0), (5.5, .16)])
    recess(rocker, capsule('indicator-tool', sign * 21.5, 13.6, .69, 1.66, 4.8, 5.8))
    finish(rocker, rocker_mat)
    finish(capsule(side + '-indicator', sign * 21.5, 13.6, .56, 1.5, 4.82, 5.33),
           lens_mat)

sys.path.insert(0, str(ROOT / 'lib'))
from blender_asset_preflight import from_args

preflight = from_args(scene)
bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', export_extras=True,
                          export_cameras=False, export_lights=False)

# Fixed studio views for the whole silhouette and a lower-edge structure detail.
scene.render.engine = 'CYCLES'
scene.cycles.samples = 20
scene.cycles.use_denoising = True
scene.render.resolution_x = scene.render.resolution_y = 640
scene.render.resolution_percentage = 100
scene.world.use_nodes = True
background = scene.world.node_tree.nodes.get('Background')
background.inputs['Color'].default_value = (.23, .25, .28, 1)
background.inputs['Strength'].default_value = .5
scene.view_settings.view_transform = 'AgX'


def aim(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat('-Z', 'Y').to_euler()


for loc, size, energy in [((-.09, -.15, .17), .16, 3.0), ((.13, -.09, .05), .16, .65)]:
    bpy.ops.object.light_add(type='AREA', location=loc)
    light = bpy.context.object
    light.data.size, light.data.energy = size, energy
    aim(light, (0, 0, .043))

bpy.ops.object.camera_add()
camera = bpy.context.object
scene.camera = camera
camera.data.type = 'ORTHO'
camera.data.clip_start = .002
inspection_mat = material('Inspection clay', 'aaa9a8', .58)


def render(name, position, target, scale, clay):
    camera.location = position
    aim(camera, target)
    camera.data.ortho_scale = scale
    scene.view_layers[0].material_override = inspection_mat if clay else None
    scene.render.filepath = str(out / (name + '.png'))
    bpy.ops.render.render(write_still=True)


front = ((0, -.23, .043), (0, 0, .043), .108)
oblique = ((.105, -.24, .059), (0, 0, .043), .112)
detail = ((.09, -.17, -.068), (0, 0, .009), .097)
render('clay-front', *front, True)
render('clay-oblique', *oblique, True)
render('clay-detail', *detail, True)
render('front', *front, False)
render('detail', *detail, False)
render('oblique', *oblique, False)
bpy.ops.wm.save_as_mainfile(filepath=str(blend))
args.result.write_text(json.dumps({'passed': True, 'profile': PROFILE,
                                  'parts': preflight['parts'], 'version': bpy.app.version_string}),
                       encoding='utf-8')
