"""Author-side checks before saving/exporting; publishing remains independent.

The current adapter consumes washer core specs. Do not infer motion/scale rules
for another product from a mesh name. Errors include the responsible object.
"""
import math


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
