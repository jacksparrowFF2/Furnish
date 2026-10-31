"""Reviewed constant glTF contracts: optical TG, coated fridge and opaque hood."""
import math

PHYSICAL = {'KHR_materials_clearcoat', 'KHR_materials_transmission', 'KHR_materials_ior', 'KHR_materials_volume'}


def physical_materials(doc, profile, spec):
    used = set(doc.get('extensionsUsed', []))
    coats = {'washer-tg10k60w': {'white', 'fascia'}, 'fridge': {'white', 'screen'}, 'hood': {'black', 'glass'}}
    allowed = {'KHR_materials_emissive_strength'} | (PHYSICAL if profile == 'washer-tg10k60w' else {'KHR_materials_clearcoat'} if profile in coats else set())
    if used - allowed:
        raise ValueError('Unsupported glTF extension')
    reference = {p['name']: p for p in (spec or {}).get('parts', [])}
    result = {}

    def number(value, low, high, label):
        if isinstance(value, bool) or not isinstance(value, (float, int)) or not math.isfinite(value) or not low <= value <= high:
            raise ValueError('Invalid physical material '+label)
        return value

    for node in doc.get('nodes', []):
        if 'mesh' not in node:
            continue
        name = node.get('name', '');identity = node.get('extras', {}).get('furnishStablePart')
        props = {}
        for primitive in doc['meshes'][node['mesh']]['primitives']:
            material = doc.get('materials', [])[primitive['material']]
            extensions = material.get('extensions', {})
            if set(extensions) - allowed:
                raise ValueError('Unsupported material extension: '+name)
            for kind, values in extensions.items():
                if kind not in PHYSICAL:
                    continue
                if kind == 'KHR_materials_clearcoat':
                    if reference.get(name, {}).get('material') not in coats.get(profile, set()):
                        raise ValueError('Clearcoat on an unreviewed part: '+name)
                    if set(values) - {'clearcoatFactor', 'clearcoatRoughnessFactor'}:
                        raise ValueError('Unbaked clearcoat texture is unsupported')
                    props.update(clearcoat=number(values.get('clearcoatFactor', 0), 0, 1, name), clearcoatRoughness=number(values.get('clearcoatRoughnessFactor', 0), 0, 1, name))
                else:
                    if profile != 'washer-tg10k60w' or name != 'door-glass':
                        raise ValueError('Optical material on an unreviewed part: '+name)
                    if material.get('alphaMode', 'OPAQUE') != 'OPAQUE' or material.get('pbrMetallicRoughness', {}).get('baseColorFactor', [1, 1, 1, 1])[3] != 1:
                        raise ValueError('Transmission glass cannot also use alpha blending')
                    if kind == 'KHR_materials_transmission':
                        if set(values) - {'transmissionFactor'}:
                            raise ValueError('Unbaked transmission texture is unsupported')
                        props['transmission'] = number(values.get('transmissionFactor', 0), .9, 1, name)
                    elif kind == 'KHR_materials_ior':
                        if set(values) != {'ior'}:
                            raise ValueError('Invalid IOR contract')
                        props['ior'] = number(values['ior'], 1.3, 1.7, name)
                    else:
                        if set(values) - {'thicknessFactor', 'attenuationDistance', 'attenuationColor'}:
                            raise ValueError('Unbaked volume texture is unsupported')
                        props['thickness'] = number(values.get('thicknessFactor', 0), .001, .02, name)
                        props['attenuationDistance'] = number(values.get('attenuationDistance', 20), .1, 1000, name)
                        color = values.get('attenuationColor', [1, 1, 1])
                        if len(color) != 3:
                            raise ValueError('Invalid attenuation color')
                        # glTF/Three attenuationColor is linear, unlike color hex.
                        props['attenuationColor'] = [number(v, 0, 1, name) for v in color]
        if props:
            result[identity] = props
    glass = next((v for k, v in result.items() if k == 'washer-tg10k60w-v1:door-glass'), None)
    if glass and set(glass) != {'transmission', 'ior', 'thickness', 'attenuationDistance', 'attenuationColor'}:
        raise ValueError('Reviewed glass requires complete transmission, IOR and volume')
    return result
