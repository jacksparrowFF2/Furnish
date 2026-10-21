'use strict';
const assert=require('node:assert/strict'),{spawnSync}=require('node:child_process');
const source=String.raw`
import runpy, sys, types
sys.modules['bpy'] = types.SimpleNamespace()
select = runpy.run_path('scripts/blender-render.py')['select_device']
class Prefs:
    def __init__(self, available):
        self.available = available
        self.tried = []
        self.compute_device_type = None
        self.devices = []
    def get_devices(self):
        backend = self.compute_device_type
        self.tried.append(backend)
        if backend not in self.available:
            raise ValueError('Backend unavailable')
        self.devices = [types.SimpleNamespace(type=backend, name='Test GPU', use=False),
                        types.SimpleNamespace(type='CPU', name='CPU', use=True)]
scene = types.SimpleNamespace(cycles=types.SimpleNamespace(device='CPU'))
p = Prefs({'OPTIX', 'CUDA'})
r = select(scene, 'auto', p)
assert r['backend'] == 'OPTIX' and scene.cycles.device == 'GPU'
assert p.tried == ['OPTIX'] and p.devices[0].use and not p.devices[1].use
for backend in ('CUDA', 'HIP', 'ONEAPI', 'METAL'):
    p = Prefs({backend})
    assert select(scene, 'gpu', p)['backend'] == backend
p = Prefs(set())
r = select(scene, 'auto', p)
assert r['type'] == 'CPU' and r['fallback'] and scene.cycles.device == 'CPU'
try:
    select(scene, 'gpu', p)
except RuntimeError:
    pass
else:
    raise AssertionError('GPU-only mode silently fell back')
p = Prefs({'OPTIX'})
r = select(scene, 'cpu', p)
assert r['backend'] == 'CPU' and not p.tried and not r['fallback']
print('PASS GPU backend order, CPU device exclusion, vendor alternatives, automatic fallback and strict GPU mode')
`;
const result=spawnSync('python',['-c',source],{encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr||result.error?.message);process.stdout.write(result.stdout);
