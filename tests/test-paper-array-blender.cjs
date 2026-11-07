'use strict';
// Read an actual desktop export back through Blender, then reopen its saved blend.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),run=path.resolve(process.argv[2]||'');assert(process.argv[2]&&run.startsWith(path.join(root,'output')+path.sep),'Pass the owned paper-array UI evidence directory');
const file=path.join(run,'arrays.glb'),source=fs.readFileSync(file),expected=require('../scripts/lib/glb-model-evidence.cjs').inspect(source,['array-0','array-1']),executable=require('../scripts/blender-server.cjs').findBlender();assert(executable,'Installed Blender required');
fs.writeFileSync(path.join(run,'blender-expected.json'),JSON.stringify({parts:expected.parts,sha256:crypto.createHash('sha256').update(source).digest('hex'),executable}));
const script=path.join(run,'readback.py');fs.writeFileSync(script,`
import bpy, json, pathlib, sys
run=pathlib.Path(sys.argv[sys.argv.index('--')+1])
expected=json.loads((run/'blender-expected.json').read_text(encoding='utf-8'))
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(run/'arrays.glb'))
def verify():
    objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('furnishId') in ('array-0','array-1')]
    found={(o['furnishId'],o['furnishPartKey']):o for o in objects}
    assert len(found)==len(objects)==len(expected['parts']), (len(objects),len(expected['parts']))
    rows=[]
    for part in expected['parts']:
        obj=found[(part['id'],part['key'])]
        points=[obj.matrix_world@v.co for v in obj.data.vertices]
        # Blender Z-up -> the exported glTF Y-up world frame.
        values=[(p.x,p.z,-p.y) for p in points]
        bounds=[[fn(p[i] for p in values) for i in range(3)] for fn in (min,max)]
        error=max(abs(bounds[k][i]-part['bounds'][k][i]) for k in range(2) for i in range(3))
        assert error<0.00003, (part['id'],part['key'],error)
        assert obj.material_slots and all(s.material for s in obj.material_slots)
        rows.append(dict(id=part['id'],key=part['key'],errorMm=error*1000))
    return rows
first=verify()
bpy.ops.wm.save_as_mainfile(filepath=str(run/'arrays-readback.blend'))
bpy.ops.wm.open_mainfile(filepath=str(run/'arrays-readback.blend'))
again=verify()
(run/'blender-readback.json').write_text(json.dumps(dict(passed=True,blender=bpy.app.version_string,executable=expected['executable'],sourceSha256=expected['sha256'],parts=len(first),maxErrorMm=max(p['errorMm'] for p in first),savedAndReopened=True,rows=again),indent=2),encoding='utf-8')
`);
const result=cp.spawnSync(executable,['--background','--factory-startup','--disable-autoexec','--python-exit-code','1','--python',script,'--',run],{cwd:root,windowsHide:true,encoding:'utf8',timeout:180000});fs.writeFileSync(path.join(run,'blender-readback.log'),(result.stdout||'')+(result.stderr||''));assert.equal(result.status,0,result.error?.message||'Inspect blender-readback.log');const report=JSON.parse(fs.readFileSync(path.join(run,'blender-readback.json')));assert(report.passed);console.log('PASS actual production GLB Blender readback and blend reopen: '+report.parts+' individually identified parts, max '+report.maxErrorMm.toFixed(5)+' mm');
