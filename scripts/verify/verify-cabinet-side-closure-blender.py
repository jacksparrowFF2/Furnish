import bpy, sys, json
from pathlib import Path
run=Path(sys.argv[sys.argv.index('--')+1])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(run/'production.glb'))
strips=[o for o in bpy.data.objects if o.get('furnishId')=='side-closure-fixture' and 'cabinet-side-closure:' in o.get('furnishPartKey','')]
assert len(strips)==2, len(strips)
report={'blender':bpy.app.version_string,'strips':[]}
for side,width in [('left',.05),('right',.08)]:
    o=next(o for o in strips if 'cabinet-side-closure:'+side+':' in o['furnishPartKey'])
    dims=sorted(o.dimensions)
    assert all(abs(a-b)<1e-5 for a,b in zip(dims,sorted([width,.018,2.2]))), (side,dims)
    assert len(o.material_slots)==1
    assert all(p.area>1e-12 for p in o.data.polygons)
    report['strips'].append({'side':side,'dimensionsM':list(o.dimensions),'partKey':o['furnishPartKey'],'material':o.material_slots[0].material.name})
assert strips[0].material_slots[0].material==strips[1].material_slots[0].material
bpy.ops.wm.save_as_mainfile(filepath=str(run/'production-readback.blend'))
(run/'blender-readback.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('PASS two unique front strips, exact dimensions, shared front material, nondegenerate mesh and editable Blender readback')
