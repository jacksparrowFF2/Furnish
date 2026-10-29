"""Publish a static, untextured GLB as an offline Furnish mesh module.
Run in a separate factory-startup Blender: --python this.py -- INPUT.glb OUTPUT.js
This deliberately limited pilot rejects animation, skins and textures.
Product dimensions, installation and behaviour stay in Furnish product rules.
"""
import bpy
import hashlib
import json
import math
import pathlib
import struct
import sys


def publish(source, target, profile='se2', spec=None):
    if profile not in ('se2', 'y52y09', 'fridge', 'dishwasher'):
        raise ValueError('Unknown asset profile')
    prefix = {'se2':'bath-heater-se2:','y52y09':'y52y09:','fridge':'fridge-v1:','dishwasher':'dishwasher-v1:'}[profile]
    raw = source.read_bytes()
    if len(raw) < 20 or raw[:4] != b'glTF' or struct.unpack_from('<II', raw, 4) != (2, len(raw)):
        raise ValueError('Invalid GLB header')
    size, kind = struct.unpack_from('<II', raw, 12)
    if kind != 0x4e4f534a:
        raise ValueError('Missing GLB JSON')
    doc = json.loads(raw[20:20+size])
    if doc.get('animations') or doc.get('skins') or doc.get('textures') or doc.get('images'):
        raise ValueError('Pilot supports static untextured meshes only')
    if any(b.get('uri') for b in doc.get('buffers', [])):
        raise ValueError('External resources are unsupported')
    allowed = {'KHR_materials_emissive_strength'}
    if set(doc.get('extensionsUsed', [])) - allowed:
        raise ValueError('Unsupported glTF extension')
    for mesh in doc.get('meshes', []):
        for primitive in mesh['primitives']:
            if primitive.get('mode', 4) != 4 or primitive.get('targets'):
                raise ValueError('Only triangle meshes without morphs are supported')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(source))
    parts = []
    names = set()
    hinges = {}

    def xyz(v):
        # Remove float32 interchange noise at exact contact planes (0.0001 mm grid).
        result = [round(v.x, 7), round(v.z, 7), round(-v.y, 7)]
        if not all(math.isfinite(x) for x in result):
            raise ValueError('Non-finite geometry')
        return result

    def srgb_hex(values):
        def channel(v):
            v = 12.92*v if v <= .0031308 else 1.055*v**(1/2.4)-.055
            return max(0, min(255, round(v*255)))
        return '#' + ''.join(format(channel(v), '02x') for v in values[:3])

    for obj in sorted(bpy.context.scene.objects, key=lambda o: o.name):
        if profile in ('fridge','dishwasher') and obj.type=='EMPTY':
            role=obj.get('furnishMotionRole')
            expected=next((m for m in spec['motions'] if m['role']==role),None)
            if not expected or role in hinges or obj.get('furnishHingeAxis')!=expected['axis']:
                raise ValueError('Unknown/duplicate hinge or wrong axis')
            location=xyz(obj.matrix_world.translation)
            if any(abs(location[k]-expected['pivot'][k]/1000)>1e-6 for k in range(3)) or any(abs(obj.matrix_world[i][j]-(1 if i==j else 0))>1e-6 for i in range(3) for j in range(3)):
                raise ValueError('Hinge pivot/closed transform changed: '+role)
            parent_role=obj.parent.get('furnishMotionRole') if obj.parent else None
            if parent_role!=expected.get('parent'):
                raise ValueError('Wrong motion hierarchy: '+role)
            hinges[role]=expected
            continue
        if obj.type != 'MESH':
            raise ValueError('Non-mesh object in static asset: ' + obj.name)
        identity = obj.get('furnishStablePart')
        if identity != prefix + obj.name or identity in names:
            raise ValueError('Missing or duplicate stable part: ' + obj.name)
        names.add(identity)
        if len(obj.data.materials) != 1:
            raise ValueError('Pilot requires one material per named part')
        node = next(n for n in obj.data.materials[0].node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
        if any(s.is_linked for s in node.inputs):
            raise ValueError('Bake node materials before publishing')
        if node.inputs['Alpha'].default_value != 1:
            raise ValueError('Pilot supports opaque materials only')
        mat = {'color': srgb_hex(node.inputs['Base Color'].default_value),
               'roughness': node.inputs['Roughness'].default_value,
               'metalness': node.inputs['Metallic'].default_value,
               'emissive': srgb_hex(node.inputs['Emission Color'].default_value),
               'emissiveIntensity': node.inputs['Emission Strength'].default_value}
        mesh = obj.data
        mesh.calc_loop_triangles()
        normal_matrix = obj.matrix_world.to_3x3().inverted().transposed()
        positions, normals = [], []
        for tri in mesh.loop_triangles:
            for loop in (tri.loops if obj.matrix_world.determinant() > 0 else reversed(tri.loops)):
                positions.extend(xyz(obj.matrix_world @ mesh.vertices[mesh.loops[loop].vertex_index].co))
                normals.extend(xyz((normal_matrix @ mesh.corner_normals[loop].vector).normalized()))
        if not positions:
            raise ValueError('Empty mesh')
        if profile in ('fridge','dishwasher'):
            reference=next((p for p in spec['parts'] if p['name']==obj.name),None)
            role=obj.parent.get('furnishMotionRole') if obj.parent else None
            if not reference or reference['role']!=role:
                raise ValueError('Moving part attached to wrong hinge: '+obj.name)
            low=[min(positions[k::3]) for k in range(3)];high=[max(positions[k::3]) for k in range(3)]
            if any(abs(high[k]-low[k]-reference['size'][k]/1000)>1e-6 or abs((high[k]+low[k])/2-reference['center'][k]/1000)>1e-6 for k in range(3)):
                raise ValueError('Articulated part dimensions/closed pose changed: '+obj.name)
            parts.append({'name':obj.name,'identity':identity,'role':role,'label':reference.get('label',obj.name),'positions':positions,'normals':normals,'material':mat,'recolor':bool(obj.get('furnishRecolor'))})
            continue
        if profile == 'y52y09':
            low = [min(positions[k::3]) for k in range(3)]
            high = [max(positions[k::3]) for k in range(3)]
            dimensions = [high[k]-low[k] for k in range(3)]
            parts.append({'name':obj.name,'identity':identity,'material':mat,'recolor':True,
                          'positions':positions,'normals':normals,'size':dimensions,
                          'center':[(high[k]+low[k])/2 for k in range(3)],
                          'radius':min(.006,*(v/4 for v in dimensions))})
            continue
        # Existing height edits preserve the 2 mm face and resize only the upper box.
        band = 'upper' if obj.name == 'body' else 'base'
        ys = positions[1::3]
        if min(ys) < (0.002 if band == 'upper' else 0)-1e-6 or max(ys) > (0.112 if band == 'upper' else .002)+1e-6:
            raise ValueError('Mesh crosses the fixed face resize band: ' + obj.name)
        parts.append({'name': obj.name, 'identity': identity, 'heightBand': band,
                      'depthScaleFromWidth': obj.name == 'display', 'originZ': xyz(obj.matrix_world.translation)[2],
                      'recolor': bool(obj.get('furnishRecolor')),
                      'material': mat, 'positions': positions, 'normals': normals})
    if not parts:
        raise ValueError('No meshes')
    if profile in ('fridge','dishwasher'):
        expected={p['name'] for p in spec['parts']}
        if set(hinges)!={m['role'] for m in spec['motions']}:
            raise ValueError('Missing hinge/slide parents')
    elif profile == 'y52y09':
        sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent/'lib'))
        from y52y09_spec import boards
        reference = {name:(size,center) for name,size,center in boards()}
        expected = set(reference)
        for part in parts:
            if part['name'] not in reference:
                raise ValueError('Unknown bookcase board')
            size,center = reference[part['name']]
            if any(abs(part['size'][k]-size[k]) > 1e-6 or abs(part['center'][k]-center[k]) > 1e-6 for k in range(3)):
                raise ValueError('Bookcase board dimensions/origin changed: '+part['name'])
    else:
        expected = {'face', 'diffuser', 'display', 'brand-accent', 'body'}
        expected.update('rim-'+axis+'-'+str(side) for axis in ('side', 'end') for side in (-1, 1))
        expected.update('vent-'+str(i) for i in range(5))
        expected.update('display-mark-'+str(i) for i in range(3))
        expected.update(prefix+'-'+str(i) for prefix in ('indicator', 'indicator-label', 'brand-mark') for i in range(4))
    if {p['name'] for p in parts} != expected:
        raise ValueError('Asset part set changed; review resize and stable identities before publishing')
    bounds = {'se2':((-.15,.15),(0,.112),(-.3,.3)),'y52y09':((-.5575,.5575),(0,.75),(-.115,.115)),'fridge':((-.4165,.4165),(0,1.910),(-.2975,.2975)),'dishwasher':((-.275,.275),(0,.598),(-.175,.175))}[profile]
    for axis, limits in enumerate(bounds):
        values = [v for p in parts for v in p['positions'][axis::3]]
        if max(abs(min(values)-limits[0]), abs(max(values)-limits[1])) > 1e-6:
            raise ValueError('Reference dimensions/origin changed; review product rules first')
    payload = {'format':1,'version':1,'sourceSha256':hashlib.sha256(raw).hexdigest(),'parts':parts}
    payload.update({'id':'bath-heater-aopu-se2','sizeMm':[300,112,600],'fixedBaseMm':2} if profile=='se2' else {'id':'bookcase-y52y09','sizeMm':[1115,750,230],'edgeRadiusMm':6} if profile=='y52y09' else {'id':'fridge-french-drawer' if profile=='fridge' else 'dishwasher-mijia-countertop','sizeMm':spec['size'],'motions':list(hinges.values())})
    # Publish only after successful import and validation; a failed attempt preserves the old asset.
    body = json.dumps(payload, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
    text = '/* Generated from '+source.name+'; scripts/publish-blender-asset.py. Do not hand-edit. */\n'
    global_name = {'se2':'FurnishSE2BlenderAsset','y52y09':'FurnishY52Y09BlenderAsset','fridge':'FurnishFridgeBlenderAsset','dishwasher':'FurnishDishwasherBlenderAsset'}[profile]
    text += '(function(root){const asset=' + body + ';if(typeof module==="object"&&module.exports)module.exports=asset;else root.'+global_name+'=asset;})(typeof globalThis!=="undefined"?globalThis:this);\n'
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(target.suffix + '.tmp')
    temporary.write_text(text, encoding='utf-8')
    temporary.replace(target)
    print('FURNISH_ASSET_PUBLISHED', len(parts), len(text), payload['sourceSha256'])


if __name__ == '__main__':
    args = sys.argv[sys.argv.index('--')+1:]
    result = pathlib.Path(args[args.index('--result')+1]) if '--result' in args else None
    try:
        profile = args[args.index('--profile')+1] if '--profile' in args else 'se2'
        spec=json.loads(pathlib.Path(args[args.index('--spec')+1]).read_text(encoding='utf-8')) if '--spec' in args else None
        publish(pathlib.Path(args[0]).resolve(), pathlib.Path(args[1]).resolve(), profile, spec)
        if result:
            result.write_text(json.dumps({'passed': True, 'blender': bpy.app.version_string}), encoding='utf-8')
    except Exception as error:
        if result:
            result.write_text(json.dumps({'passed': False, 'error': str(error)}), encoding='utf-8')
        raise
