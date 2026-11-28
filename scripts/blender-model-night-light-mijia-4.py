"""Editable MJYD06YL with the magnetic wall base fitted. Authoring units are mm."""
import json
import math
from pathlib import Path
import sys

import bmesh
import bpy
from mathutils import Vector

PROFILE = 'night-light-mijia-4'
ARGS = sys.argv[sys.argv.index('--') + 1:]
OUT = Path(ARGS[0]).resolve()
OUT.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1


def point(x, y, z):
    return (x / 1000, -z / 1000, y / 1000)


def material(name, color, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    rgb = [int(color[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    bsdf.inputs['Base Color'].default_value = (*(
        v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in rgb
    ), 1)
    bsdf.inputs['Roughness'].default_value = roughness
    return mat


shell = material('White molded PC', 'f1f0ec', .43)
insert = material('Satin center', 'f7f6f2', .36)
mark = material('Low contrast front relief', 'd5d4ce', .55)
diffuser = material('Opal rear diffuser', 'f6f4eb', .58)
track = material('Recessed control track', 'cbc9c3', .54)
pad = material('Adhesive backing', 'd5d3ce', .72)


def solid(name, vertices, faces, mat):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    if mat is not None:
        mesh.materials.append(mat)
        obj['furnishStablePart'] = PROFILE + '-v1:' + name
    return obj


def revolve(name, profile, mat):
    """Closed axisymmetric solid. Each pole is one vertex."""
    count = 96
    vertices, rings, faces = [], [], []
    for radius, depth in profile:
        start = len(vertices)
        if radius == 0:
            vertices.append(point(0, 46.7, depth))
            rings.append([start] * count)
        else:
            for i in range(count):
                a = math.tau * i / count
                vertices.append(point(radius * math.cos(a), 46.7 + radius * math.sin(a), depth))
            rings.append(list(range(start, start + count)))
    for first, second in zip(rings, rings[1:] + rings[:1]):
        for i in range(count):
            j = (i + 1) % count
            face = tuple(dict.fromkeys((first[i], first[j], second[j], second[i])))
            if len(face) >= 3:
                faces.append(face)
    obj = solid(name, vertices, faces, mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def capsule(name, x, z, width, height, low, high, mat=None):
    """Closed capsule on the underside, extruded along the Y datum."""
    radius = height / 2
    straight = (width - height) / 2
    outline = []
    for side, start in [(1, -math.pi / 2), (-1, math.pi / 2)]:
        for i in range(13):
            a = start + math.pi * i / 12
            outline.append((x + side * straight + radius * math.cos(a), z + radius * math.sin(a)))
    if straight == 0:
        outline = outline[:12] + outline[13:25]
    n = len(outline)
    vertices = [point(px, y, pz) for y in (low, high) for px, pz in outline]
    faces = [tuple(range(n)), tuple(range(n, 2 * n))]
    faces.extend((i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n))
    obj = solid(name, vertices, faces, mat)
    for face in obj.data.polygons:
        face.use_smooth = len(face.vertices) == 4
    return obj


def subtract(obj, cutter):
    bpy.context.view_layer.objects.active = obj
    modifier = obj.modifiers.new('Recessed control opening', 'BOOLEAN')
    modifier.object = cutter
    modifier.operation = 'DIFFERENCE'
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


front = revolve('front-shell', [(26.2, 20.43), (30, 20.18), (36, 19.39), (41, 18.17),
                        (44.4, 16.8), (46, 15.6), (46.6, 14.55), (46.7, 13.8),
                        (46.45, 13), (45.9, 12.45), (43.7, 12.15), (26.2, 12.15)], shell)
# The molded inner edge meets the insert at a crease. Keep the normals on
# the front annulus from blending with the concealed inner wall.
for edge in front.data.edges:
    if all(abs(front.data.vertices[i].co.y + .02043) < 1e-8 for i in edge.vertices):
        edge.use_edge_sharp = True

revolve('center-insert', [(0, 20.49), (5, 20.49), (24.8, 20.49),
                          (25.7, 20.45), (26.19, 20.40), (26.19, 12.16), (0, 12.16)], insert)
revolve('rear-diffuser', [(30, 12.15), (43.7, 12.15), (45.9, 12.45),
                          (45.5, 11.6), (44.6, 10.9), (42.8, 10.55), (30, 10.55)], diffuser)
housing = revolve('electronics-housing', [(0, 10.8), (29.1, 10.8), (30, 10.55),
                  (30.5, 9.9), (31.45, -16.9), (31.24, -17.8),
                  (30.65, -18.15), (0, -18.15)], shell)
subtract(housing, capsule('mode cut', 3.8, -4.3, 22.2, 6.8, 13, 18.7))
subtract(housing, capsule('brightness cut', -14, -4.3, 6.4, 6.4, 15, 20.4))
housing.data.materials.clear()
housing.data.materials.append(shell)
for face in housing.data.polygons:
    face.material_index = 0
# A cut through a long cylindrical quad otherwise averages the pocket wall
# into the entire curved highlight. Keep the analytic wall normals intact.
slope = (30.5 - 31.45) / (9.9 + 16.9)
normals = [(0, 0, 0)] * len(housing.data.loops)
for face in housing.data.polygons:
    coords = [housing.data.vertices[i].co for i in face.vertices]
    radial = [math.hypot(v.x, v.z - .0467) * 1000 for v in coords]
    depths = [-v.y * 1000 for v in coords]
    external = all(-16.901 <= z <= 9.901 and abs(r - (31.45 + (z + 16.9) * slope)) < .04
                   for r, z in zip(radial, depths))
    if external:
        for loop, v, r in zip(face.loop_indices, coords, radial):
            normals[loop] = Vector((v.x * 1000 / r, slope, (v.z - .0467) * 1000 / r)).normalized()
    elif any(13 < v.z * 1000 < 21 and -8 < z < 0 for v, z in zip(coords, depths)):
        face.use_smooth = False
housing.data.normals_split_custom_set(normals)
capsule('mode-track', 3.8, -4.3, 21.9, 6.52, 17.9, 18.65, track)
capsule('mode-slider', 3.1, -4.3, 13.4, 5.9, 16.3, 18.4, insert)
capsule('brightness-button', -14, -4.3, 5.75, 5.75, 18.9, 20.3, insert)
revolve('mount-base', [(0, -18.15), (31.45, -18.15), (31.8, -18.5),
                       (31.8, -19.7), (31.3, -20.15), (0, -20.15)], shell)
revolve('mount-pad', [(0, -20.15), (27, -20.15), (27.2, -20.35),
                      (27, -20.55), (0, -20.55)], pad)

# Shallow, low-contrast front mark as seen on the official front photograph.
logo_outline = [(-1.8, 1.25), (-1.65, -.45), (-1.43, -1.31), (-.82, -1.82),
                (.05, -1.95), (.95, -1.67), (1.48, -1.08), (1.65, -.28),
                (1.8, 1.25), (1.33, 1.25), (1.23, -.19), (1.04, -.88),
                (.62, -1.28), (.0, -1.45), (-.63, -1.33), (-1.03, -.99),
                (-1.22, -.31), (-1.32, 1.25)]
n = len(logo_outline)
solid('center-mark', [point(x, 46.7 + y, z) for z in (20.485, 20.55) for x, y in logo_outline],
      [tuple(range(n)), tuple(range(n, 2 * n))] +
      [(i, (i + 1) % n, (i + 1) % n + n, i + n) for i in range(n)], mark)

sys.path.insert(0, str(Path(__file__).parent / 'lib'))
from blender_asset_preflight import from_args

from_args(scene)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / (PROFILE + '-v1.blend')))
bpy.ops.export_scene.gltf(filepath=str(OUT / (PROFILE + '-v1.glb')),
                          export_format='GLB', export_extras=True, export_cameras=False, export_lights=False)
Path(ARGS[ARGS.index('--result') + 1]).write_text(json.dumps({
    'passed': True, 'blender': bpy.app.version_string, 'parts': len(scene.objects)
}), encoding='utf-8')
