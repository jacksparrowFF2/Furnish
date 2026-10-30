"""Real Blender fault injection against a freshly authored source; never save it."""
import bpy
import json
import pathlib
import sys

args = sys.argv[sys.argv.index('--')+1:]
source, spec_file, result = map(pathlib.Path, args)
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]/'lib'))
from blender_asset_preflight import check

spec = json.loads(spec_file.read_text(encoding='utf-8'))
passed = []


def case(name, mutate, fragment):
    bpy.ops.wm.open_mainfile(filepath=str(source))
    mutate()
    try:
        check(bpy.context.scene, spec)
    except ValueError as error:
        assert fragment in str(error), str(error)
        passed.append(name)
    else:
        raise AssertionError('preflight accepted bad source: ' + name)


def obj(name):
    return bpy.data.objects[name]


bpy.ops.wm.open_mainfile(filepath=str(source))
check(bpy.context.scene, spec)
case('empty-material', lambda: obj('front-frame').data.materials.clear(), 'front-frame: expected one non-empty')
case('wrong-face-index', lambda: setattr(obj('door-ring').data.polygons[0], 'material_index', 3), 'door-ring: face references')
case('duplicate-id', lambda: obj('door-ring').__setitem__('furnishStablePart', obj('front-frame')['furnishStablePart']), 'stable identity')
case('detached-moving-part', lambda: setattr(obj('door-ring'), 'parent', None), 'door-ring: motion parent')
case('wrong-pivot', lambda: setattr(obj('motion-door').location, 'x', 1), 'motion-door: hinge pivot')
case('wrong-units', lambda: setattr(bpy.context.scene.unit_settings, 'scale_length', .001), 'scene: expected metric')
case('unexpected-part', lambda: setattr(obj('door-ring'), 'name', 'unregistered'), 'unexpected=')
result.write_text(json.dumps(dict(passed=True, blender=bpy.app.version_string, rejected=passed)), encoding='utf-8')
