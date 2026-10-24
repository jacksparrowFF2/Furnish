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
    manifest=dict(planId=meta['planId'],originMm=meta['originMm'],revision='parts-baseline',protocol=3)
    collection=next(c for c in scene.collection.children if c.get('furnishPlanId')==meta['planId'])
    def meshes():return [o for o in collection.all_objects if o.type=='MESH' and o.get('furnishObjectId')]
    def progress(stage):(directory/'progress.json').write_text(json.dumps({'stage':stage}),encoding='utf-8')
    progress('loaded refinement')
    original={o['furnishObjectId']:(o.as_pointer(),tuple(s.material for s in o.material_slots)) for o in meshes()}
    assert len(original)==settings['coverage']['meshes']
    # The source refinement has six user-adjusted poses (TV / curtains).
    # Record source poses only on this disposable copy through frozen v2 before
    # strict v3 adoption. Current v2 bytes equal the previous release capture.
    bridge=None
    if any(o.get('furnishPartVersion',1)<3 for o in meshes()) and settings.get('v2BridgeSha256'):
        assert hashlib.sha256((directory/'baseline-v2.glb').read_bytes()).hexdigest()==settings['v2BridgeSha256'],'Unconfirmed v2 source snapshot'
        bridge=addon.apply_snapshot(scene,str(directory/'baseline-v2.glb'),{**manifest,'protocol':2,'revision':'unchanged-v2-bridge'})
        assert bridge['added']==bridge['deleted']==0
    assert all((o.as_pointer(),tuple(slot.material for slot in o.material_slots))==original[o['furnishObjectId']] for o in meshes())
    progress('recorded source poses on disposable v2 copy; refinement locks retained')
    migration=addon.apply_snapshot(scene,str(directory/'baseline.glb'),manifest)
    preserved=sum((o.as_pointer(),tuple(s.material for s in o.material_slots))==original[o['furnishObjectId']] for o in meshes())
    assert preserved==len(original) and migration['added']==migration['deleted']==0
    assert all(o.get('furnishPartVersion')==3 and o.get('furnishPartKey') and not o.get('furnishPartAmbiguous') for o in meshes())
    bpy.ops.wm.save_as_mainfile(filepath=str(directory/'upgraded-refinement.blend'))
    def key(o):return (o.get('furnishId') or o.get('layerObject') or '',o['furnishPartKey'])
    # Unique per-part materials catch swaps hidden by shared paint or wood bindings.
    progress('upgraded original material bindings')
    bindings={};pointers={};geometry={};poses={}
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
        bindings[part]=tuple(s.material.name if s.material else None for s in o.material_slots);pointers[part]=o.as_pointer();geometry[part]=shape(o);poses[part]=o.matrix_world.copy()
    expected={}
    importer=addon._import_snapshot
    def capture(file):
        prior=set(bpy.data.objects);result=importer(file)
        for o in set(bpy.data.objects)-prior:
            if o.type=='MESH' and o.get('furnishPartVersion')==3 and o.get('furnishObjectId'):
                expected[key(o)]=(shape(o),o.matrix_world.copy())
        return result
    addon._import_snapshot=capture
    progress('assigned unique part materials')
    reordered=addon.apply_snapshot(scene,str(directory/'permuted.glb'),{**manifest,'revision':'permuted'})
    addon._import_snapshot=importer
    assert reordered['matchedByPartKey']==len(original) and reordered['added']==reordered['deleted']==0
    assert len(expected)==len(original)
    def verify(existing,check_pointer=True):
        live={key(o):o for o in meshes()}
        for part in existing:
            o=live[part];assert tuple(s.material.name if s.material else None for s in o.material_slots)==bindings[part],repr(part)
            if check_pointer:assert o.as_pointer()==pointers[part]
            expected_shape,expected_matrix=expected[part]
            if o.get('furnish_sync_keep_transform'):expected_matrix=poses[part]
            assert shape(o)==expected_shape,'Wrong geometry: '+repr(part)
            assert max(abs(o.matrix_world[i][j]-expected_matrix[i][j]) for i in range(4) for j in range(4))<2e-5,'Wrong pose: '+repr(part)
    verify(bindings)
    progress('verified equal-count generator permutation')
    working=directory/'verified-copy.blend';bpy.ops.wm.save_as_mainfile(filepath=str(working));bpy.ops.wm.open_mainfile(filepath=str(working));scene=bpy.context.scene;collection=next(c for c in scene.collection.children if c.get('furnishPlanId')==meta['planId']);verify(bindings,False)
    assert hashlib.sha256(template.read_bytes()).hexdigest()==template_hash
    (directory/'result.json').write_text(json.dumps(dict(passed=True,sourceMaterialBindingsPreserved=preserved,uniquePartMaterialsVerified=len(bindings),v2Bridge=bridge,migration=migration,permuted=reordered,equalCountGeometryAndPose=True,lockedRefinementPosesPreserved=sum(bool(o.get('furnish_sync_keep_transform')) for o in meshes()),reopen=True,sourceTemplateUnchanged=True),indent=2),encoding='utf-8')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--directory',required=True);directory=Path(parser.parse_args(sys.argv[sys.argv.index('--')+1:]).directory)
    try:main(directory)
    except Exception:(directory/'error.txt').write_text(traceback.format_exc(),encoding='utf-8');raise
