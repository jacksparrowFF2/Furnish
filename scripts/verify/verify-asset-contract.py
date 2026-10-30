"""Real source fault injection; reload each case, never save corrupted geometry."""
import bpy
import json
import pathlib
import sys

args = sys.argv[sys.argv.index('--')+1:]
source, file, output = map(pathlib.Path, args)
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]/'lib'))
from blender_asset_preflight import check_contract
contract = json.loads(file.read_text(encoding='utf-8'))
rejected = []


def case(name, corrupt):
    bpy.ops.wm.open_mainfile(filepath=str(source))
    corrupt()
    try:
        check_contract(bpy.context.scene, contract)
    except ValueError:
        rejected.append(name)
    else:
        raise AssertionError('preflight accepted ' + name)


def obj():
    return next(o for o in bpy.context.scene.objects if o.type == 'MESH')


bpy.ops.wm.open_mainfile(filepath=str(source))
check_contract(bpy.context.scene, contract)
case('empty-material-slot', lambda: obj().data.materials.clear())
case('wrong-face-index', lambda: setattr(obj().data.polygons[0], 'material_index', 7))
case('wrong-stable-identity', lambda: obj().__setitem__('furnishStablePart', 'invalid'))
case('wrong-units', lambda: setattr(bpy.context.scene.unit_settings, 'scale_length', .001))
case('nonfinite-vertex', lambda: setattr(obj().data.vertices[0].co, 'x', float('nan')))
case('unexpected-part', lambda: setattr(obj(), 'name', 'unregistered-part'))
if contract.get('motions'):
    role = contract['motions'][0]['role']
    def pivot():
        return next(o for o in bpy.context.scene.objects if o.get('furnishMotionRole') == role)
    case('wrong-axis', lambda: pivot().__setitem__('furnishHingeAxis', 'invalid'))
    case('wrong-pivot', lambda: setattr(pivot().location, 'x', 1))
    moving = next((p['name'] for p in contract['parts'] if p.get('role')), None)
    if moving:
        case('detached-moving-part', lambda: setattr(bpy.data.objects[moving], 'parent', None))
output.write_text(json.dumps(dict(passed=True, profile=contract['profile'], blender=bpy.app.version_string, rejected=rejected, motionApplicable=bool(contract.get('motions'))), indent=2), encoding='utf-8')
