"""Reviewed TG10K60W appearance presets. Optical values are visual estimates.

Flat PBR travels through GLB; procedural microfinish belongs to saved Blender
refinement files. This module never modifies geometry, labels, rigs or dimensional contracts.
"""
import bpy
import json
import struct

PRESETS = {
    'white': dict(roughness=.27, metallic=0, coat=.65, coat_roughness=.16),
    'fascia': dict(roughness=.32, metallic=.45, coat=.25, coat_roughness=.22),
    'chrome': dict(roughness=.115, metallic=1),
    'rubber': dict(roughness=.73, metallic=0),
    'dark': dict(roughness=.53, metallic=0),
    'drum-steel': dict(roughness=.18, metallic=.95),
    'clear-glass': dict(roughness=.045, metallic=0, transmission=1, ior=1.47),
}


def configure(materials):
    for name, values in PRESETS.items():
        mat = materials[name]
        node = next(n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        for key, socket in [('roughness', 'Roughness'), ('metallic', 'Metallic'),
                            ('coat', 'Coat Weight'), ('coat_roughness', 'Coat Roughness'),
                            ('transmission', 'Transmission Weight'), ('ior', 'IOR')]:
            if key in values:
                node.inputs[socket].default_value = values[key]
        node.inputs['Emission Strength'].default_value = 0
        if name == 'fascia':
            node.inputs['Base Color'].default_value = (.24, .25, .27, 1)
        if name == 'clear-glass':
            node.inputs['Base Color'].default_value = (.98, .99, 1, 1)
            node.inputs['Alpha'].default_value = 1
            # glTF volume's thickness is an optical estimate, not a new solid.
            group = bpy.data.node_groups.new('glTF Material Output', 'ShaderNodeTree')
            group.interface.new_socket(name='Thickness', in_out='INPUT', socket_type='NodeSocketFloat')
            group.nodes.new('NodeGroupInput')
            group.nodes.new('NodeGroupOutput')
            settings = mat.node_tree.nodes.new('ShaderNodeGroup');settings.node_tree = group
            settings.inputs['Thickness'].default_value = .0018
            volume = mat.node_tree.nodes.new('ShaderNodeVolumeAbsorption')
            volume.inputs['Color'].default_value = (.97, .99, 1, 1)
            volume.inputs['Density'].default_value = .05
            output = next(n for n in mat.node_tree.nodes if n.type == 'OUTPUT_MATERIAL')
            mat.node_tree.links.new(volume.outputs['Volume'], output.inputs['Volume'])


def optical_volume(path):
    """Attach the declared constant optical thickness to the actual GLB.

    Blender 5.2's inlined shader exporter can omit an unconnected glTF settings
    group. This explicit constant adapter preserves its reviewed source value;
    mesh bytes and the rest of the interchange file remain untouched.
    """
    data = path.read_bytes();size = struct.unpack_from('<I', data, 12)[0]
    doc = json.loads(data[20:20+size]);materials = doc['materials']
    indices = [i for i, m in enumerate(materials) if m['name'] == 'clear-glass']
    if len(indices) != 1:
        raise ValueError('Expected one reviewed glass material')
    index = indices[0]
    users = {n['name'] for n in doc['nodes'] if 'mesh' in n for p in doc['meshes'][n['mesh']]['primitives'] if p.get('material') == index}
    if users != {'door-glass'}:
        raise ValueError('Optical volume must belong only to the reviewed door glass')
    materials[index].setdefault('extensions', {})['KHR_materials_volume'] = dict(thicknessFactor=.0018, attenuationDistance=20, attenuationColor=[.97, .99, 1])
    doc['extensionsUsed'] = sorted(set(doc.get('extensionsUsed', [])) | {'KHR_materials_volume'})
    body = json.dumps(doc, separators=(',', ':'), allow_nan=False).encode()
    body += b' ' * (-len(body) % 4)
    tail = data[20+size:]
    path.write_bytes(struct.pack('<4sIIII', b'glTF', 2, 20+len(body)+len(tail), len(body), 0x4e4f534a)+body+tail)


def microfinish(material, family):
    """Subtle physical-scale finish; never transported as unbaked node graphs."""
    if family not in {'white', 'fascia', 'chrome', 'rubber', 'drum-steel'}:
        return
    nodes, links = material.node_tree.nodes, material.node_tree.links
    if nodes.get('Furnish microfinish'):
        return
    p = next(n for n in nodes if n.type == 'BSDF_PRINCIPLED')
    coord = nodes.new('ShaderNodeTexCoord')
    mapping = nodes.new('ShaderNodeVectorMath');mapping.operation = 'MULTIPLY'
    mapping.inputs[1].default_value = (450, 450, 450) if family == 'white' else (80, 3500, 80) if family in {'fascia', 'drum-steel'} else (1800, 1800, 1800)
    noise = nodes.new('ShaderNodeTexNoise');noise.name = 'Furnish microfinish'
    noise.inputs['Scale'].default_value = 1;noise.inputs['Detail'].default_value = 2
    # Object coordinates retain metre-scale grains rather than one texture per part.
    links.new(coord.outputs['Object'], mapping.inputs[0]);links.new(mapping.outputs[0], noise.inputs['Vector'])
    ramp = nodes.new('ShaderNodeMapRange')
    base = p.inputs['Roughness'].default_value
    ramp.inputs['To Min'].default_value = max(.02, base-.035)
    ramp.inputs['To Max'].default_value = min(1, base+.035)
    links.new(noise.outputs['Fac'], ramp.inputs['Value']);links.new(ramp.outputs['Result'], p.inputs['Roughness'])
    bump = nodes.new('ShaderNodeBump');bump.inputs['Strength'].default_value = .12
    bump.inputs['Distance'].default_value = .000018 if family == 'white' else .000006
    links.new(noise.outputs['Fac'], bump.inputs['Height']);links.new(bump.outputs['Normal'], p.inputs['Normal'])
    if family in {'fascia', 'drum-steel'}:
        p.inputs['Anisotropic'].default_value = .25


def refine_scene(scene, parts):
    """Apply only explicitly identified TG10K60W parts, preserving all geometry."""
    families = {p['name']: p['material'] for p in parts}
    changed = []
    for obj in scene.objects:
        key = obj.get('furnishPartKey', '').removeprefix('explicit:') or obj.get('furnishStablePart', '')
        if not key.startswith('washer-tg10k60w-v1:') or obj.type != 'MESH':
            continue
        name = key.split(':', 1)[1]
        if name not in families:
            raise ValueError('Unknown refinement part: '+name)
        # Separate from unrelated objects that may share an imported material.
        for slot in obj.material_slots:
            slot.material = slot.material.copy()
            microfinish(slot.material, families[name])
        if name == 'door-glass':
            # Shadow-ray approximation lights the enclosed drum without requiring
            # refractive caustics. Camera transmission/refraction remains active.
            obj.visible_shadow = False
        changed.append(name)
    if set(changed) != set(families):
        raise ValueError('Refinement needs the complete named TG10K60W model')
    return changed
