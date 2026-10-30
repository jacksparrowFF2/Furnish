"""Author-side checks before saving/exporting; publishing remains independent.

The current adapter consumes washer core specs. Do not infer motion/scale rules
for another product from a mesh name. Errors include the responsible object.
"""
import math


def check_contract(scene, contract):
    """Validate declared identities and rig; never impose one product's shape on another."""
    errors = []
    for layer in scene.view_layers:
        layer.update()
    meshes = [o for o in scene.objects if o.type == 'MESH']
    expected = {p['name']: p for p in contract['parts']}
    if {o.name for o in meshes} != set(expected):
        errors.append('scene: named part set differs from the product contract')
    if scene.unit_settings.system != 'METRIC' or abs(scene.unit_settings.scale_length-1) > 1e-8:
        errors.append('scene: expected metre geometry with metric units')
    identities, roles = set(), {}
    for obj in scene.objects:
        role = obj.get('furnishMotionRole')
        if role:
            if role in roles:
                errors.append(obj.name + ': duplicate motion role')
            roles[role] = obj
    for obj in meshes:
        def fail(message):
            errors.append(obj.name + ': ' + message)
        part = expected.get(obj.name)
        identity = obj.get('furnishStablePart')
        if not identity or identity in identities or part and identity != part['identity']:
            fail('missing, duplicate or incorrect stable identity')
        identities.add(identity)
        if not obj.data.vertices or not obj.data.polygons:
            fail('empty mesh')
        if any(not math.isfinite(v) for vertex in obj.data.vertices for v in vertex.co) or any(
                not math.isfinite(v) for row in obj.matrix_world for v in row):
            fail('non-finite geometry or transform')
        # All currently registered offline profiles explicitly declare this
        # publisher contract. Future multi-material adapters must declare theirs.
        if len(obj.data.materials) != contract['materialSlots'] or any(m is None for m in obj.data.materials):
            fail('invalid material slots')
        if any(p.material_index >= len(obj.data.materials) or obj.data.materials[p.material_index] is None for p in obj.data.polygons):
            fail('invalid face material index')
        if part and obj.parent != roles.get(part.get('role')):
            fail('wrong moving/static parent')
    motions = {m['role']: m for m in contract.get('motions', [])}
    if set(roles) != set(motions):
        errors.append('scene: motion roles differ from the product contract')
    for role, motion in motions.items():
        obj = roles.get(role)
        if obj is None:
            continue
        pivot = motion['pivot']
        expected_pivot = (pivot[0]/1000, -pivot[2]/1000, pivot[1]/1000)
        if any(abs(obj.matrix_world.translation[i]-expected_pivot[i]) > 1e-6 for i in range(3)):
            errors.append(obj.name + ': wrong world hinge pivot')
        if obj.get('furnishHingeAxis') != motion['axis']:
            errors.append(obj.name + ': wrong hinge axis')
        if (obj.parent.get('furnishMotionRole') if obj.parent else None) != motion.get('parent'):
            errors.append(obj.name + ': wrong nested motion hierarchy')
        if any(abs(obj.matrix_world[i][j]-(1 if i == j else 0)) > 1e-6 for i in range(3) for j in range(3)):
            errors.append(obj.name + ': non-rigid rest transform')
    if errors:
        raise ValueError('Blender asset preflight failed:\n' + '\n'.join(errors))
    return dict(passed=True, profile=contract['profile'], parts=len(meshes), motions=len(roles))


def from_args(scene):
    import json
    import pathlib
    import sys
    if '--preflight-contract' not in sys.argv:
        return None
    file = pathlib.Path(sys.argv[sys.argv.index('--preflight-contract')+1])
    result = check_contract(scene, json.loads(file.read_text(encoding='utf-8')))
    file.with_name('preflight-result.json').write_text(json.dumps(result), encoding='utf-8')
    return result


def check(scene, spec):
    errors = []
    meshes = [o for o in scene.objects if o.type == 'MESH']
    expected = {p['name']: p for p in spec['parts']}
    prefix = spec['profile']['id'] + '-v1:'
    identities = set()
    roles = {}
    for obj in scene.objects:
        role = obj.get('furnishMotionRole')
        if role:
            if role in roles:
                errors.append(obj.name + ': duplicate motion role ' + role)
            roles[role] = obj
    if scene.unit_settings.system != 'METRIC' or abs(scene.unit_settings.scale_length - 1) > 1e-8:
        errors.append('scene: expected metric units, scale_length=1')
    if {o.name for o in meshes} != set(expected):
        errors.append('scene: mesh names differ; missing=' + str(sorted(set(expected) - {o.name for o in meshes})) +
                      ', unexpected=' + str(sorted({o.name for o in meshes} - set(expected))))
    for obj in meshes:
        def fail(message):
            errors.append(obj.name + ': ' + message)
        part = expected.get(obj.name)
        identity = obj.get('furnishStablePart')
        if not identity or identity in identities:
            fail('missing or duplicate stable identity')
        identities.add(identity)
        if part and identity != prefix + part['name']:
            fail('stable identity differs from spec')
        if not obj.data.vertices or not obj.data.polygons:
            fail('empty mesh')
        if any(not math.isfinite(v) for row in obj.matrix_world for v in row) or any(
                not math.isfinite(v) for vertex in obj.data.vertices for v in vertex.co):
            fail('non-finite coordinates')
        # This adapter's contract is one declared material on every face.
        slots = obj.data.materials
        if len(slots) != 1 or slots[0] is None:
            fail('expected one non-empty material slot')
        elif part and slots[0].name != part['material']:
            fail('material differs from spec: ' + slots[0].name)
        if any(p.material_index >= len(slots) or slots[p.material_index] is None for p in obj.data.polygons):
            fail('face references an invalid material slot')
        if part:
            parent = roles.get(part['role'])
            if obj.parent != parent:
                fail('motion parent differs from role ' + part['role'])
    for motion in spec['motions']:
        parent = roles.get(motion['role'])
        if parent is None:
            errors.append('motion: missing role ' + motion['role'])
            continue
        pivot = motion['pivot']
        want = (pivot[0]/1000, -pivot[2]/1000, pivot[1]/1000)
        if parent.parent or any(abs(parent.location[i]-want[i]) > 1e-7 for i in range(3)):
            errors.append(parent.name + ': hinge pivot differs from spec')
        if parent.get('furnishHingeAxis') != motion['axis'] or any(abs(v) > 1e-7 for v in parent.rotation_euler) or any(abs(v-1) > 1e-7 for v in parent.scale):
            errors.append(parent.name + ': hinge axis/rest transform differs from spec')
    if set(roles) != {m['role'] for m in spec['motions']}:
        errors.append('scene: unexpected motion roles')
    if errors:
        raise ValueError('Blender asset preflight failed:\n' + '\n'.join(errors))
    return dict(passed=True, adapter=spec['profile']['id'], parts=len(meshes), motions=len(roles))
