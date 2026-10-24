"""Verify v2 adoption and structural matching against a read-only refinement."""
import argparse, hashlib, importlib.util, json, sys, traceback
from pathlib import Path
import bpy
from array import array


def fingerprint(scene):
    return dict(objects=sorted((o.name,o.as_pointer(),o.data.as_pointer() if o.data else 0,
        tuple(v for row in o.matrix_world for v in row),o.rotation_mode,
        tuple((k,tuple(getattr(o,k))) for k in ('location','rotation_euler','rotation_quaternion','rotation_axis_angle','scale','delta_location','delta_rotation_euler','delta_rotation_quaternion','delta_scale')),
        tuple((s.link,s.material.name if s.material else None) for s in o.material_slots) if o.type=='MESH' else (),
        tuple(sorted((k,str(o[k])) for k in o.keys())),o.hide_get(),o.hide_render) for o in scene.objects),
        blocks=tuple(len(x) for x in (bpy.data.objects,bpy.data.meshes,bpy.data.materials,bpy.data.images,bpy.data.collections)),
        camera=scene.camera.as_pointer() if scene.camera else 0,world=scene.world.as_pointer() if scene.world else 0)


def main(directory):
    settings=json.loads((directory/'input.json').read_text(encoding='utf-8'))
    template=Path(settings['template']);template_hash=hashlib.sha256(template.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(template));scene=bpy.context.scene
    spec=importlib.util.spec_from_file_location('parts_sync',Path(__file__).resolve().parents[1]/'blender-sync-addon.py');addon=importlib.util.module_from_spec(spec);spec.loader.exec_module(addon)
    payload=(directory/'baseline.glb').read_bytes();gltf=json.loads(payload[20:20+int.from_bytes(payload[12:16],'little')]);meta=gltf['scenes'][0]['extras']['furnish']
    manifest=dict(planId=meta['planId'],originMm=meta['originMm'],revision='parts-baseline',protocol=2)
    collection=next(c for c in scene.collection.children if c.get('furnishPlanId')==meta['planId'])
    def meshes():return [o for o in collection.all_objects if o.type=='MESH' and o.get('furnishObjectId')]
    def progress(stage):(directory/'progress.json').write_text(json.dumps({'stage':stage}),encoding='utf-8')
    progress('loaded refinement')
    original={o['furnishObjectId']:(o.as_pointer(),tuple(s.material for s in o.material_slots)) for o in meshes()}
    assert len(original)==settings['coverage']['meshes']
    needs_upgrade=any(o.get('furnishPartVersion')!=2 for o in meshes())
    legacy=None
    if needs_upgrade:
        # Explicitly refresh only this disposable copy through the frozen v1 contract.
        legacy=addon.apply_snapshot(scene,str(directory/'legacy-baseline.glb'),{**manifest,'protocol':1,'revision':'legacy-refresh'})
        assert legacy['added']==legacy['deleted']==0
        assert sum((o.as_pointer(),tuple(slot.material for slot in o.material_slots))==original[o['furnishObjectId']] for o in meshes())==len(original)
        progress('refreshed old geometry in disposable copy')
        before=fingerprint(scene)
        try:addon.apply_snapshot(scene,str(directory/'bad-migration.glb'),manifest)
        except ValueError:pass
        else:raise AssertionError('Changed legacy geometry must not silently inherit material')
        assert fingerprint(scene)==before,'Rejected migration changed the refined scene'
        progress('rejected incompatible migration')
    migration=addon.apply_snapshot(scene,str(directory/'baseline.glb'),manifest)
    preserved=sum((o.as_pointer(),tuple(s.material for s in o.material_slots))==original[o['furnishObjectId']] for o in meshes())
    assert preserved==len(original) and migration['added']==migration['deleted']==0
    assert all(o.get('furnishPartVersion')==2 and o.get('furnishPartKey') and not o.get('furnishPartAmbiguous') for o in meshes())
    bpy.ops.wm.save_as_mainfile(filepath=str(directory/'upgraded-refinement.blend'))
    def key(o):return (o.get('furnishId') or o.get('layerObject') or '',o['furnishPartKey'])
    # Unique per-part materials catch swaps hidden by shared paint or wood bindings.
    progress('upgraded original material bindings')
    bindings={};pointers={};geometry={}
    def shape(o):
        vertices=array('f',[0])*(len(o.data.vertices)*3);o.data.vertices.foreach_get('co',vertices)
        loops=array('i',[0])*len(o.data.loops);o.data.loops.foreach_get('vertex_index',loops)
        starts=array('i',[0])*len(o.data.polygons);o.data.polygons.foreach_get('loop_start',starts)
        sizes=array('i',[0])*len(o.data.polygons);o.data.polygons.foreach_get('loop_total',sizes)
        return hashlib.sha256(vertices.tobytes()+loops.tobytes()+starts.tobytes()+sizes.tobytes()).hexdigest()
    for o in meshes():
        part=key(o);marker=hashlib.sha256(str(part).encode()).hexdigest()[:20]
        for i,slot in enumerate(o.material_slots):
            m=bpy.data.materials.new('Part verification '+marker+' '+str(i));slot.link='OBJECT';slot.material=m
        bindings[part]=tuple(s.material.name if s.material else None for s in o.material_slots);pointers[part]=o.as_pointer();geometry[part]=shape(o)
    def verify(existing,check_pointer=True):
        live={key(o):o for o in meshes()}
        for part in existing:
            o=live[part];assert tuple(s.material.name if s.material else None for s in o.material_slots)==bindings[part],repr(part)
            if check_pointer:assert o.as_pointer()==pointers[part]
            assert shape(o)==geometry[part],'Geometry assigned to wrong semantic part: '+repr(part)
    progress('assigned unique part materials')
    reordered=addon.apply_snapshot(scene,str(directory/'restructured.glb'),{**manifest,'revision':'restructured'})
    assert reordered['matchedByPartKey']==len(original) and reordered['added']==settings['changed']['added'] and reordered['deleted']==0
    verify(bindings)
    progress('verified structural reorder')
    after_reorder=fingerprint(scene)
    try:addon.apply_snapshot(scene,str(directory/'bad-count.glb'),{**manifest,'revision':'bad-count'})
    except ValueError:pass
    else:raise AssertionError('Changed repeated-part count must be rejected')
    assert fingerprint(scene)==after_reorder,'Count mismatch failed to roll back'
    progress('rejected count mismatch')
    deleted=addon.apply_snapshot(scene,str(directory/'deleted.glb'),{**manifest,'revision':'deleted'})
    assert deleted['deleted']==1
    live={key(o) for o in meshes()};removed=set(bindings)-live;assert len(removed)==1
    verify(set(bindings)-removed)
    restored=addon.apply_snapshot(scene,str(directory/'restored.glb'),{**manifest,'revision':'restored'})
    assert restored['added']==1;verify(bindings,False)
    stable=tuple(len(x) for x in (bpy.data.objects,bpy.data.meshes,bpy.data.materials,bpy.data.images))
    for i in range(3):
        progress('repeat synchronization '+str(i+1))
        addon.apply_snapshot(scene,str(directory/'restored.glb'),{**manifest,'revision':'repeat'})
    assert stable==tuple(len(x) for x in (bpy.data.objects,bpy.data.meshes,bpy.data.materials,bpy.data.images))
    progress('verified deletion restore and repeated sync')
    working=directory/'verified-copy.blend';bpy.ops.wm.save_as_mainfile(filepath=str(working));bpy.ops.wm.open_mainfile(filepath=str(working));scene=bpy.context.scene;collection=next(c for c in scene.collection.children if c.get('furnishPlanId')==meta['planId']);verify(bindings,False)
    assert hashlib.sha256(template.read_bytes()).hexdigest()==template_hash
    (directory/'result.json').write_text(json.dumps(dict(passed=True,sourceMaterialBindingsPreserved=preserved,uniquePartMaterialsVerified=len(bindings),legacyGeometryRefresh=legacy,migration=migration,restructured=reordered,deleted=deleted,restored=restored,geometryMismatchRejectedAndRolledBack=needs_upgrade,countMismatchRejectedAndRolledBack=True,exactTransformRollback=True,semanticDeletionUndo=True,repeatNoLeak=True,reopen=True,sourceTemplateUnchanged=True),indent=2),encoding='utf-8')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--directory',required=True);directory=Path(parser.parse_args(sys.argv[sys.argv.index('--')+1:]).directory)
    try:main(directory)
    except Exception:(directory/'error.txt').write_text(traceback.format_exc(),encoding='utf-8');raise
