"""Explicit, hash-pinned migration of uniformly refined clipped wall faces.
Production receiver guards stay intact. Never overwrites its source or output.
"""
import argparse,hashlib,importlib.util,json,sys,traceback
from pathlib import Path
import bpy

def digest(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def key(obj):return (obj.get('furnishId') or obj.get('layerObject') or '',obj['furnishPartKey'])
def wall_family(obj):
    if obj.get('furnishPartVersion')!=3 or not obj.get('furnishPartKey','').startswith('named:'):return None
    if 'call:wall-tiling-model:site-1' not in obj['furnishPartKey']:return None
    tokens=json.loads(obj['furnishPartKey'][6:]);clips=[];rest=[]
    for token in tokens:
        if token.startswith('item:') and json.loads(token[5:])[0]=='wall-tiling-model.js:generator-2':clips.append(token)
        else:rest.append(token)
    if len(clips)!=1 or 'call:wall-tiling-model:site-1' not in rest:return None
    return (key(obj)[0],json.dumps(rest,ensure_ascii=True))

def review_families(old,new,review):
    changed={k for k in old.keys()&new.keys() if old[k].get('furnishPartCount')!=new[k].get('furnishPartCount')}
    expected={(r['scope'],r['key']) for r in review}
    if changed!=expected:raise ValueError('Count changes differ from the reviewed manifest')
    result=[];done=set()
    for row in review:
        k=(row['scope'],row['key']);family=wall_family(old[k])
        if family is None or wall_family(new[k])!=family:raise ValueError('Only explicitly identified clipped wall faces may migrate')
        if family in done:continue
        done.add(family);before={k:o for k,o in old.items() if wall_family(o)==family};after={k:o for k,o in new.items() if wall_family(o)==family}
        if len(before)!=row['before'] or len(after)!=row['after'] or not before.keys()<=after.keys():raise ValueError('Unexpected wall fragment membership')
        bindings=tuple(slot.material for slot in next(iter(before.values())).material_slots)
        if not bindings or any(m is None for m in bindings) or [m.name for m in bindings]!=row['materials']:raise ValueError('Refined wall material differs from the reviewed manifest')
        for part,o in before.items():
            if o.get('furnish_sync_keep_transform') or len(o.modifiers):raise ValueError('Refined wall has a pose lock or modifiers; manual review required')
            if tuple(slot.material for slot in o.material_slots)!=bindings:raise ValueError('Wall fragments have distinct refinements; never guess their inheritance')
            if o.get('furnishPartCount')!=row['before'] or new[part].get('furnishPartCount')!=row['after']:raise ValueError('Unexpected fragment count metadata')
        if any(o.get('furnishPartCount')!=row['after'] for o in after.values()):raise ValueError('New wall family count is inconsistent')
        result.append((before,after,bindings,row['after']))
    return result

def main(review_path,check_only=False):
    review=json.loads(review_path.read_text(encoding='utf-8'));source=Path(review['template']);input_file=Path(review['input']);output=Path(review['output'])
    if digest(source)!=review['sourceSha256'] or digest(input_file)!=review['inputSha256']:raise ValueError('Source/input differs from the reviewed immutable snapshot')
    if output.resolve()==source.resolve() or output.exists():raise ValueError('A fresh output file is required; originals are never overwritten')
    payload=input_file.read_bytes();g=json.loads(payload[20:20+int.from_bytes(payload[12:16],'little')]);meta=g['scenes'][0]['extras']['furnish']
    nodes=[n['extras'] for n in g['nodes'] if 'mesh' in n];new={key(n):n for n in nodes};assert len(new)==len(nodes) and all(n.get('furnishPartVersion')==3 for n in nodes)
    bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene;collection=next(c for c in scene.collection.children if c.get('furnishPlanId')==meta['planId'])
    old={key(o):o for o in collection.all_objects if o.type=='MESH' and o.get('furnishObjectId')};groups=review_families(old,new,review['countChanged'])
    if check_only:
        print('PASS reviewed uniform wall families:',len(groups));return
    original={k:(o.as_pointer(),tuple(slot.material for slot in o.material_slots),o.matrix_world.copy() if o.get('furnish_sync_keep_transform') else None) for k,o in old.items()};camera=scene.camera;world=scene.world;lights=[o for o in scene.objects if o.type=='LIGHT']
    for before,after,materials,count in groups:
        for o in before.values():o['furnishPartCount']=count
    spec=importlib.util.spec_from_file_location('review_sync',Path(__file__).resolve().parents[1]/'blender-sync-addon.py');addon=importlib.util.module_from_spec(spec);spec.loader.exec_module(addon)
    merged=addon.apply_snapshot(scene,str(input_file),dict(planId=meta['planId'],originMm=meta['originMm'],protocol=3,revision=digest(input_file)))
    live={key(o):o for o in collection.all_objects if o.type=='MESH' and o.get('furnishObjectId')}
    for before,after,materials,count in groups:
        for part in after:
            obj=live[part];assert len(obj.material_slots)==len(materials)
            for slot,material in zip(obj.material_slots,materials):slot.link='OBJECT';slot.material=material
    common=old.keys()&new.keys()
    for part in common:
        obj=live[part];pointer,materials,pose=original[part];assert obj.as_pointer()==pointer and tuple(s.material for s in obj.material_slots)==materials,part
        if pose is not None:assert max(abs(obj.matrix_world[i][j]-pose[i][j]) for i in range(4) for j in range(4))<2e-5
    assert len(live)==len(new) and scene.camera==camera and scene.world==world and all(o.name in scene.objects for o in lights)
    bindings={k:tuple(slot.material.name if slot.material else None for slot in o.material_slots) for k,o in live.items()}
    bpy.ops.file.pack_all();missing=[i.name for i in bpy.data.images if i.source=='FILE' and not i.packed_file and not Path(bpy.path.abspath(i.filepath)).is_file()];assert not missing,missing
    output.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(output));bpy.ops.wm.open_mainfile(filepath=str(output));scene=bpy.context.scene;collection=next(c for c in scene.collection.children if c.get('furnishPlanId')==meta['planId']);restored={key(o):o for o in collection.all_objects if o.type=='MESH' and o.get('furnishObjectId')}
    assert {k:tuple(s.material.name if s.material else None for s in o.material_slots) for k,o in restored.items()}==bindings
    assert digest(source)==review['sourceSha256'] and digest(input_file)==review['inputSha256']
    report=dict(passed=True,addonVersion=addon.bl_info['version'],sourceSha256=review['sourceSha256'],inputSha256=review['inputSha256'],oldMeshes=len(old),newMeshes=len(new),commonMaterialBindingsPreserved=len(common),newParts=len(new.keys()-old.keys()),removedParts=len(old.keys()-new.keys()),reviewedWallFamilies=len(groups),uniformWallFragments=sum(len(after) for before,after,materials,count in groups),lockedPosesPreserved=sum(v[2] is not None for k,v in original.items() if k in common),lights=len(lights),originalUnchanged=True,packedImages=True,reopen=True,merge=merged,output=str(output),sha256=digest(output))
    review_path.with_suffix('.result.json').write_text(json.dumps(report,indent=2),encoding='utf-8');print('PASS reviewed refinement copy:',output)

def self_test(output):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    material=bpy.data.materials.new('Uniform refinement');other=bpy.data.materials.new('Distinct refinement')
    def metadata(i,count):
        tokens=['item:'+json.dumps(['wall-tiling-model.js:generator-1','face-id']),'item:'+json.dumps(['wall-tiling-model.js:generator-2','slot:'+str(i)]),'call:wall-tiling-model:site-1']
        return dict(layerObject='tile-face',furnishPartKey='named:'+json.dumps(tokens),furnishPartVersion=3,furnishPartCount=count)
    old={};new={}
    for i in range(4):
        n=metadata(i,4);new[key(n)]=n
        if i<2:
            obj=bpy.data.objects.new('Wall '+str(i),bpy.data.meshes.new('Wall mesh'));obj.data.materials.append(material)
            for k,v in metadata(i,2).items():obj[k]=v
            old[key(obj)]=obj
    review=[dict(scope=k[0],key=k[1],before=2,after=4,materials=[material.name]) for k in old]
    result=review_families(old,new,review);assert len(result)==1 and len(result[0][1])==4
    values=list(old.values());keys=list(old);passed=[]
    def reject(name,rows=review):
        before=[(o.get('furnishPartCount'),tuple(s.material for s in o.material_slots),bool(o.get('furnish_sync_keep_transform')),len(o.modifiers)) for o in values]
        try:review_families(old,new,rows)
        except ValueError:pass
        else:raise AssertionError('Unsafe review accepted: '+name)
        assert before==[(o.get('furnishPartCount'),tuple(s.material for s in o.material_slots),bool(o.get('furnish_sync_keep_transform')),len(o.modifiers)) for o in values]
        passed.append(name)
    values[1].material_slots[0].material=other;reject('distinct per-fragment materials');values[1].material_slots[0].material=material
    values[0]['furnish_sync_keep_transform']=True;reject('locked refinement pose');values[0]['furnish_sync_keep_transform']=False
    mod=values[0].modifiers.new('User refinement','SOLIDIFY');reject('user modifier');values[0].modifiers.remove(mod)
    new[keys[0]]['furnishPartCount']=5;reject('unreviewed count');new[keys[0]]['furnishPartCount']=4
    original_key=values[0]['furnishPartKey'];values[0]['furnishPartKey']='named:'+json.dumps(['call:unrelated']);reject('unrelated generator');values[0]['furnishPartKey']=original_key
    reject('incomplete reviewed key set',review[:1])
    assert wall_family(dict(furnishPartVersion=3,furnishPartKey='named:["call:instance-owner"]/instance:grain-1')) is None
    output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(dict(passed=True,uniformFamilyAccepted=True,validationReadOnly=True,rejected=passed,instanceSuffixNotParsedAsWall=True),indent=2),encoding='utf-8');print('PASS reviewed wall migration guards')

if __name__=='__main__':
    p=argparse.ArgumentParser();group=p.add_mutually_exclusive_group(required=True);group.add_argument('--review');group.add_argument('--self-test');p.add_argument('--check-only',action='store_true');a=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else None)
    if a.self_test:self_test(Path(a.self_test))
    else:
        review_path=Path(a.review)
        try:main(review_path,a.check_only)
        except Exception:review_path.with_suffix('.error.txt').write_text(traceback.format_exc(),encoding='utf-8');raise
