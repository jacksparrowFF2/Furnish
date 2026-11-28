"""Build closed, static balcony appliances from their catalog profiles."""
import argparse
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, str(Path(__file__).resolve().parent / 'lib'))
from blender_asset_preflight import from_args


def material(name, color, roughness, metallic=0):
    finish = bpy.data.materials.new(name)
    finish.diffuse_color = (*color, 1)
    finish.use_nodes = True
    shader = finish.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = finish.diffuse_color
    shader.inputs['Roughness'].default_value = roughness
    shader.inputs['Metallic'].default_value = metallic
    return finish


def finish_part(obj, name, finish):
    obj.name = name
    obj['furnishStablePart'] = profile + '-v1:' + name
    obj.data.materials.append(finish)


def shell(name, center, levels, finish):
    """Loft rounded rectangular cross sections. Each has z, width, depth and radius."""
    vertices = []
    for z, width, depth, radius in levels:
        for corner in range(4):
            cx = (-1 if corner in (1, 2) else 1) * (width / 2 - radius)
            cy = (-1 if corner in (2, 3) else 1) * (depth / 2 - radius)
            for step in range(9):
                angle = (corner + step / 8) * math.pi / 2
                vertices.append(((center[0] + cx + radius * math.cos(angle)) / 1000,
                                 (center[1] + cy + radius * math.sin(angle)) / 1000, z / 1000))
    n = 36
    faces = [tuple(reversed(range(n)))]
    for index in range(len(levels) - 1):
        a, b = index * n, (index + 1) * n
        faces.extend((a+i, a+(i+1)%n, b+(i+1)%n, b+i) for i in range(n))
    faces.append(tuple(range(len(vertices)-n, len(vertices))))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    finish_part(obj, name, finish)
    for polygon in mesh.polygons[1:-1]:
        polygon.use_smooth = True


def ring(name, center, radii, finish, front=False):
    """Generate an axial part. Repeated axial levels allow a hollow threaded opening."""
    vertices = []
    count = 48
    for height, radius in radii:
        for i in range(count):
            angle = math.tau * i / count
            dx, dy = radius * math.cos(angle), radius * math.sin(angle)
            x, y, z = center
            point = (x + dx, y - height, z + dy) if front else (x + dx, y + dy, z + height)
            vertices.append(tuple(v/1000 for v in point))
    faces = []
    for j in range(len(radii)):
        a, b = j * count, ((j + 1) % len(radii)) * count
        for i in range(count):
            k = (i+1)%count
            faces.append((a+i, a+k, b+k, b+i))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    finish_part(obj, name, finish)
    for polygon in mesh.polygons:
        polygon.use_smooth = True


def washer():
    white = material('Gloss white polymer', (.91, .915, .91), .31)
    lid = material('Satin white lid', (.94, .945, .94), .25)
    grey = material('Warm grey lower trim', (.36, .37, .37), .36)
    deck = material('Pearl grey control deck', (.68, .70, .70), .36)
    dark = material('Black control glass', (.014, .017, .020), .22)
    seam = material('Dark lid gasket', (.14, .16, .17), .47)
    shell('Lower skirt', (0, 0), [(0, 506, 350, 29), (4, 514, 358, 31),
                                (19, 519, 362, 33), (23, 523, 364, 33)], grey)
    shell('Rounded white housing', (0, 0), [(19, 519, 363, 33), (27, 530, 371, 39),
                                         (374, 530, 371, 39), (388, 526, 367, 39),
                                         (395, 511, 356, 36)], white)
    shell('Rear control deck', (0, 128), [(390, 507, 95, 28), (400, 504, 95, 27),
                                        (406, 497, 89, 25)], deck)
    shell('Recessed display strip', (0, 98), [(402, 455, 20, 9), (407, 452, 19, 9)], dark)
    for side, x in [('Left', -127), ('Right', 127)]:
        shell(side + ' lid seam', (x, -43), [(392, 248, 264, 29), (399, 248, 264, 29)], seam)
        shell(side + ' lid', (x, -44), [(397, 242, 258, 28), (404, 242, 258, 28),
                                      (410, 231, 247, 24)], lid)


def heater():
    white = material('White enameled body', (.91, .918, .921), .30)
    retainer = material('Porcelain white dial', (.86, .87, .872), .37)
    grey = material('Neutral grey control trim', (.26, .28, .29), .48)
    steel = material('Nickel-plated fitting', (.54, .56, .57), .28, .78)
    hot = material('Red outlet collar', (.67, .029, .014), .40)
    cold = material('Blue inlet collar', (.026, .23, .59), .40)
    lamp = material('Red indicator window', (.51, .017, .010), .24)
    # The housing is 248 mm deep. The dial adds an estimated 9 mm at the front.
    shell('White tank enclosure', (0, 4.5), [(0, 208, 211, 13), (5, 227, 225, 19),
                                           (18, 245, 245, 25), (36, 248, 248, 27),
                                           (297, 248, 248, 27), (315, 242, 241, 25),
                                           (327, 220, 219, 20), (330, 203, 201, 17)], white)
    ring('Control surround', (0, -119, 78), [(0, 1), (0, 29), (2, 29), (3, 27), (3, 1)], grey, True)
    ring('Temperature dial', (0, -119.5, 78), [(1, 1), (1, 22), (7, 22), (9, 19), (9, .4)], retainer, True)
    ring('Indicator lens', (0, -119.5, 116), [(0, .2), (0, 3), (2, 3), (2, .2)], lamp, True)
    for label, x, color in [('Hot outlet', -50, hot), ('Cold inlet', 50, cold)]:
        ring(label + ' collar', (x, 4.5, 329), [(0, 10), (0, 17), (3, 17), (5, 15), (5, 10)], color)
        ring(label + ' fitting', (x, 4.5, 332), [(0, 7), (0, 11), (4, 11), (6, 11.7),
             (7, 10.7), (9, 11.7), (10, 10.7), (12, 11.7), (13, 10.7), (13, 7)], steel)


def iron_body_part(name, sections, finish):
    """Elliptic sections perpendicular to the nose-to-heel axis."""
    count = 32
    vertices = [(width/2*math.cos(i*math.tau/count)/1000, y/1000,
                 (z+height/2*math.sin(i*math.tau/count))/1000)
                for y, z, width, height in sections for i in range(count)]
    faces = [tuple(range(count))]
    for index in range(len(sections)-1):
        a, b = index*count, (index+1)*count
        faces.extend((a+i, b+i, b+(i+1)%count, a+(i+1)%count) for i in range(count))
    faces.append(tuple(reversed(range(len(vertices)-count, len(vertices)))))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    finish_part(obj, name, finish)
    for polygon in mesh.polygons[1:-1]:
        polygon.use_smooth = True


def iron():
    alloy = material('Dark titanium-coloured sole', (.077,.083,.088), .29, .65)
    lower = material('Blush pink lower shell', (.73,.35,.38), .36)
    reservoir = material('Tinted pink reservoir', (.43,.18,.21), .24)
    upper = material('Pearl pink grip', (.78,.50,.51), .28)
    buttons = material('Pink steam controls', (.64,.27,.31), .34)
    insert = material('Off-white cable sleeve', (.79,.76,.74), .44)
    iron_body_part('Pointed soleplate', [(-127.5,4,3,3),(-118,4,25,8),(-82,4,70,8),
                   (-32,4,101,8),(32,4,113,8),(76,5,105,8),(96,6,68,8),(99,7,18,5)], alloy)
    iron_body_part('Lower pink housing', [(-125,12,4,5),(-111,14,28,12),(-79,17,65,22),
                   (-29,20,96,27),(37,24,109,35),(76,31,101,39),(109,47,77,42),
                   (123,58,53,26),(127.5,64,27,14)], lower)
    iron_body_part('Water reservoir', [(-115,19,12,6),(-90,29,45,16),(-54,34,69,26),
                   (2,37,90,27),(54,46,100,41),(91,62,87,44),(118,70,62,33)], reservoir)
    iron_body_part('Front grip support', [(-122,22,7,7),(-94,37,27,27),(-67,57,40,53),
                   (-49,75,37,42),(-30,96,34,18)], upper)
    iron_body_part('Rear grip support', [(51,55,58,26),(63,74,66,53),(83,83,61,62),
                   (107,77,53,49),(123,68,44,25)], upper)
    iron_body_part('Open bridge handle', [(-53,85,35,18),(-38,97,38,21),(-10,105,39,22),
                   (30,110,39,22),(66,111,38,22),(83,108,39,17)], upper)
    shell('Steam and spray triggers', (0,-51), [(98,32,35,7),(103,31,33,7),(107,28,29,6)], buttons)
    shell('Temperature wheel', (0,-26), [(48,35,35,17),(53,42,42,20),(57,40,40,19)], upper)
    iron_body_part('Cord strain relief', [(67,109,12,10),(74,118,14,16),(94,120,13,12),(105,119,9,9)], insert)


def studio(output, size):
    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.samples = 18
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 780
    scene.render.resolution_y = 680
    scene.render.resolution_percentage = 100
    scene.world = bpy.data.worlds.new('Studio')
    scene.world.color = (.28, .28, .28)
    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.data.type = 'ORTHO'
    scene.camera = camera
    height = size[1] / 1000
    for position, energy, light_size in [((.4, -.6, .8), 44, .75), ((-.5, -.2, .65), 22, .52), ((0, .5, .69), 36, .65)]:
        bpy.ops.object.light_add(type='AREA', location=position)
        light = bpy.context.object
        light.data.energy = energy
        light.data.shape = 'DISK'
        light.data.size = light_size
        light.rotation_euler = (Vector((0, 0, height/2)) - light.location).to_track_quat('-Z', 'Y').to_euler()
    gray = material('Inspection neutral', (.41, .41, .41), .43)
    for name, position, override in [
        ('01-outline', (.5, -1, height+.4), gray),
        ('02-top-structure', (.32, -.63, height+.85), gray),
        ('03-front', (0, -1.2, height/2+.045), None),
        ('04-perspective', (.55, -1, height+.35), None),
        ('05-opposite', (-.55, -1, height+.32), None),
    ]:
        camera.location = position
        camera.rotation_euler = (Vector((0, 0, height*.51))-camera.location).to_track_quat('-Z', 'Y').to_euler()
        camera.data.ortho_scale = max(size)/1000*1.48
        scene.view_layers[0].material_override = override
        scene.render.image_settings.file_format = 'JPEG'
        scene.render.filepath = str(output / (name+'.jpg'))
        bpy.ops.render.render(write_still=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('output', type=Path)
    models = {'mijia-xhqb10mj103': washer, 'haier-ec8fa': heater, 'panasonic-ni-m150np-p': iron}
    parser.add_argument('--profile', required=True, choices=models)
    parser.add_argument('--preflight-contract', type=Path)
    parser.add_argument('--result', type=Path, required=True)
    parser.add_argument('--studio', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    global profile
    profile = args.profile
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=True)
    blend, glb = (output / (profile+'-v1.'+ext) for ext in ('blend', 'glb'))
    if blend.exists() or glb.exists():
        raise FileExistsError('Use a new output directory')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    models[profile]()
    preflight = from_args(scene)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend), compress=True)
    bpy.ops.export_scene.gltf(filepath=str(glb), export_format='GLB', export_extras=True)
    if args.studio:
        spec = json.loads((Path(__file__).parent/'lib'/'kitchen-countertop-assets.json').read_text())
        studio(output, spec[profile]['size'])
    args.result.write_text(json.dumps(dict(passed=True, blend=str(blend), glb=str(glb), preflight=preflight)))


if __name__ == '__main__':
    main()
