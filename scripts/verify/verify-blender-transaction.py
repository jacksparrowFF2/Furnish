"""Real Blender failure injection; uses a factory scene and tiny private GLBs."""
import argparse,importlib.util,json,struct,sys,traceback
from pathlib import Path
import bpy

def glb(file,objects,version=None,previous=None):
    vertices=[[-.1,-.1,-.1],[.1,-.1,-.1],[.1,.1,-.1],[-.1,.1,-.1],[-.1,-.1,.1],[.1,-.1,.1],[.1,.1,.1],[-.1,.1,.1]]
    indices=[0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,2,3,7,2,7,6,0,4,7,0,7,3,1,2,6,1,6,5]
    binary=struct.pack('<24f',*sum(vertices,[]))+struct.pack('<36H',*indices)
    data=dict(asset={'version':'2.0'},buffers=[{'byteLength':len(binary)}],bufferViews=[{'buffer':0,'byteOffset':0,'byteLength':96},{'buffer':0,'byteOffset':96,'byteLength':72}],accessors=[{'bufferView':0,'componentType':5126,'count':8,'type':'VEC3','min':[-.1]*3,'max':[.1]*3},{'bufferView':1,'componentType':5123,'count':36,'type':'SCALAR'}],materials=[{'pbrMetallicRoughness':{'baseColorFactor':[.2,.4,.6,1]}}],meshes=[{'primitives':[{'attributes':{'POSITION':0},'indices':1,'material':0}]}],nodes=[{'mesh':0,'translation':[i,0,0],'extras':{'furnishObjectId':key,'furnishId':'owner','furnishPartKind':'BoxGeometry','furnishPartKey':role,'furnishPartCount':count,**({'furnishPartVersion':version} if version else {})}} for i,(key,role,count) in enumerate(objects)],scenes=[{'nodes':list(range(len(objects)))}],scene=0)
    if previous:
        for node,prior in zip(data['nodes'],previous):node['extras'].update(furnishPreviousPartKey=prior,furnishPreviousPartCount=1)
    text=json.dumps(data).encode();text+=b' '*(-len(text)%4);binary+=b'\0'*(-len(binary)%4)
    file.write_bytes(struct.pack('<III',0x46546c67,2,28+len(text)+len(binary))+struct.pack('<II',len(text),0x4e4f534a)+text+struct.pack('<II',len(binary),0x004e4942)+binary)

def fingerprint(scene):
    return dict(transformChannels=sorted((o.name,o.rotation_mode,tuple((k,tuple(getattr(o,k))) for k in ('location','rotation_euler','rotation_quaternion','rotation_axis_angle','scale','delta_location','delta_rotation_euler','delta_rotation_quaternion','delta_scale'))) for o in scene.objects),objects=sorted((o.name,o.as_pointer(),o.data.as_pointer() if o.data else 0,tuple(round(v,7) for row in o.matrix_world for v in row),tuple(sorted(c.name for c in o.users_collection)),o.hide_get(),o.hide_render,tuple((s.link,s.material.as_pointer() if s.material else 0) for s in o.material_slots) if o.type=='MESH' else (),tuple(sorted((k,str(o[k])) for k in o.keys())),o.select_get()) for o in scene.objects),collections=sorted((c.name,tuple(sorted(o.name for o in c.objects)),tuple(sorted((k,str(c[k])) for k in c.keys()))) for c in bpy.data.collections),meshes=sorted((m.name,m.as_pointer()) for m in bpy.data.meshes),materials=sorted((m.name,m.as_pointer(),m.use_fake_user,m.users) for m in bpy.data.materials),camera=scene.camera.as_pointer() if scene.camera else 0,world=scene.world.as_pointer() if scene.world else 0,active=bpy.context.view_layer.objects.active.name if bpy.context.view_layer.objects.active else None)

def main(directory):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    spec=importlib.util.spec_from_file_location('sync',Path(__file__).resolve().parents[1]/'blender-sync-addon.py');addon=importlib.util.module_from_spec(spec);spec.loader.exec_module(addon)
    scene=bpy.context.scene;first=directory/'first.glb';second=directory/'second.glb';glb(first,[('a','frame#0',1),('b','shelf#0',1)]);glb(second,[('b','frame#0',1),('c','new#0',1)])
    manifest=dict(planId='test',originMm=[1000,2000],revision='first')
    # First-connection failure must not leave a half-created managed collection.
    original=fingerprint(scene)
    addon._checkpoint=lambda stage:(_ for _ in ()).throw(RuntimeError('initial failure')) if stage=='metadata' else None
    try:addon.apply_snapshot(scene,str(first),manifest)
    except RuntimeError:pass
    else:raise AssertionError('Expected initial failure')
    assert fingerprint(scene)==original,'First connection did not roll back'
    addon._checkpoint=lambda stage:None;addon.apply_snapshot(scene,str(first),manifest)
    managed=next(c for c in scene.collection.children if c.get('furnishPlanId'));a=next(o for o in managed.objects if o.get('furnishObjectId')=='a');b=next(o for o in managed.objects if o.get('furnishObjectId')=='b')
    material=bpy.data.materials.new('User Refined');a.material_slots[0].material=material;b.material_slots[0].material=material
    extra=bpy.data.collections.new('User Collection');scene.collection.children.link(extra);extra.objects.link(a)
    unrelated=bpy.data.objects.new('User shared geometry',a.data);scene.collection.objects.link(unrelated)
    shared_material=bpy.data.materials.new('User Shared Mesh Material');unrelated.material_slots[0].link='DATA';unrelated.material_slots[0].material=shared_material
    camera=bpy.data.objects.new('User Camera',bpy.data.cameras.new('User Camera'));scene.collection.objects.link(camera);scene.camera=camera
    scene.world=bpy.data.worlds.new('User World');a.hide_render=True;a.hide_set(True);a['furnish_sync_keep_transform']=True
    a.rotation_euler=(.31,-.17,1.5707963267948966);a.scale=(-1.2345,.73,2.2)
    a.delta_location=(.002,-.003,.004);a.delta_rotation_euler=(.011,-.013,.017);a.delta_scale=(1.1,.9,1.02)
    b.rotation_mode='QUATERNION';b.rotation_quaternion=(.91,.17,-.21,.28);b.rotation_quaternion.normalize();b.scale=(1.3,.7,-1.1)
    b.select_set(True);bpy.context.view_layer.objects.active=b;bpy.context.view_layer.update()
    original=fingerprint(scene);passed=[]
    for fault in ['imported','matched','updated','removed','metadata','validated','partial-import','missing-camera']:
        if fault=='metadata':
            b.rotation_mode='AXIS_ANGLE';b.rotation_axis_angle=(.7,.2,.3,.4)
            bpy.context.view_layer.update();original=fingerprint(scene)
        count=0
        def fail(stage):
            nonlocal count
            if stage=='updated':count+=1
            if stage==fault and (stage!='updated' or count==2):raise RuntimeError('Injected '+fault)
        addon._checkpoint=fail;importer=addon._import_snapshot
        if fault=='partial-import':
            def partial(file):importer(file);raise RuntimeError('Partial import')
            addon._import_snapshot=partial
        try:addon.apply_snapshot(scene,str(second),{**manifest,'revision':'second'},capture_camera=fault=='missing-camera')
        except (RuntimeError,ValueError):pass
        else:raise AssertionError('Expected fault: '+fault)
        finally:addon._import_snapshot=importer;addon._checkpoint=lambda stage:None
        actual=fingerprint(scene)
        if actual!=original:
            (directory/'difference.json').write_text(json.dumps({k:dict(before=original[k],after=actual[k]) for k in original if actual[k]!=original[k]},indent=2))
            raise AssertionError('Scene changed after '+fault)
        passed.append(fault)
    # Source node paths changed: semantic identity retains the original object,
    # modifier stack, pose lock, and refinement instead of matching old path b.
    a.modifiers.new('User Subdivision','SUBSURF');pointer=a.as_pointer();pose=a.matrix_world.copy()
    result=addon.apply_snapshot(scene,str(second),{**manifest,'revision':'second'})
    assert result['matchedByPartKey']==1 and result['added']==1 and result['deleted']==1
    assert a.as_pointer()==pointer and a['furnishObjectId']=='b' and a.material_slots[0].material==material and a.matrix_world==pose and a.modifiers.get('User Subdivision')
    assert unrelated.data!=a.data and unrelated.material_slots[0].material==shared_material,'Unmanaged shared geometry and data materials must remain untouched'
    stable=fingerprint(scene);bad=directory/'ambiguous.glb'
    for entries in [[('x','frame#0',1),('y','frame#0',1)],[('x','frame#0',2),('y','frame#1',2)],[('x','frame#0',0)]]:
        glb(bad,entries)
        try:addon.apply_snapshot(scene,str(bad),{**manifest,'revision':'bad'})
        except ValueError:pass
        else:raise AssertionError('Ambiguous or count-changed parts must be rejected')
        assert fingerprint(scene)==stable
    addon.apply_snapshot(scene,str(first),{**manifest,'revision':'undo'})
    restored=next(o for o in managed.objects if o.get('furnishPartKey')=='shelf#0')
    assert restored.material_slots[0].material==material,'Semantic bank must restore deleted refinement after undo'
    addon.apply_snapshot(scene,str(second),{**manifest,'revision':'redo'})
    counts=lambda:tuple(len(v) for v in (bpy.data.objects,bpy.data.meshes,bpy.data.materials,bpy.data.collections))
    before=counts()
    for _ in range(3):addon.apply_snapshot(scene,str(second),{**manifest,'revision':'repeat'})
    assert counts()==before,'Repeated update leaked datablocks'
    # v2 upgrade uses exact imported geometry and changes identity only once.
    modern=directory/'modern.glb';glb(modern,[('b','v2-frame#0',1),('c','v2-new#0',1)],2)
    damaged=directory/'damaged-modern.glb';payload=bytearray(modern.read_bytes());offset=28+int.from_bytes(payload[12:16],'little');struct.pack_into('<f',payload,offset,.9);damaged.write_bytes(payload)
    stable=fingerprint(scene)
    try:addon.apply_snapshot(scene,str(damaged),{**manifest,'revision':'bad-upgrade'})
    except ValueError:pass
    else:raise AssertionError('Changed old geometry must reject v2 upgrade')
    assert fingerprint(scene)==stable
    result=addon.apply_snapshot(scene,str(modern),{**manifest,'revision':'v2'})
    assert result['migratedPartKeys']==2 and result['added']==result['deleted']==0
    assert all(o.get('furnishPartVersion')==2 for o in managed.objects)
    stable=fingerprint(scene)
    try:addon.apply_snapshot(scene,str(second),{**manifest,'revision':'v1-downgrade'})
    except ValueError:pass
    else:raise AssertionError('v2 refinement must reject old path snapshots')
    assert fingerprint(scene)==stable
    # Start a clean two-part fixture: unique refinements must follow named records,
    # even when equal-count parts exchange positions and old hierarchy paths.
    bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene
    old=directory/'v2-base.glb';glb(old,[('left','old-left',1),('right','old-right',1)],2)
    addon.apply_snapshot(scene,str(old),manifest)
    managed=next(c for c in scene.collection.children if c.get('furnishPlanId'))
    left=next(o for o in managed.objects if o.get('furnishObjectId')=='left');right=next(o for o in managed.objects if o.get('furnishObjectId')=='right')
    lm=bpy.data.materials.new('Left refinement');rm=bpy.data.materials.new('Right refinement');left.material_slots[0].material=lm;right.material_slots[0].material=rm
    upgrade=directory/'v3-base.glb';glb(upgrade,[('left','named:left',1),('right','named:right',1)],3,['old-left','old-right'])
    switched=directory/'v3-switched.glb';glb(switched,[('left','named:right',1),('right','named:left',1)],3,['old-right','old-left'])
    stable=fingerprint(scene)
    try:addon.apply_snapshot(scene,str(switched),manifest)
    except ValueError:pass
    else:raise AssertionError('Upgrade after position swap must be rejected')
    assert fingerprint(scene)==stable
    source_pose=left.matrix_world.copy();left['furnish_sync_keep_transform']=True;left.location.z+=.3;bpy.context.view_layer.update();locked_pose=left.matrix_world.copy()
    migrated=addon.apply_snapshot(scene,str(upgrade),manifest);assert migrated['migratedPartKeys']==2
    assert left.matrix_world==locked_pose,'Locked refinement must survive identity upgrade using source-pose stamp'
    left['furnish_sync_keep_transform']=False;left.matrix_world=source_pose;bpy.context.view_layer.update()
    pointers=(left.as_pointer(),right.as_pointer());left_pose=left.matrix_world.copy();right_pose=right.matrix_world.copy()
    swapped=addon.apply_snapshot(scene,str(switched),manifest)
    assert swapped['matchedByPartKey']==2 and swapped['added']==swapped['deleted']==0
    assert (left.as_pointer(),right.as_pointer())==pointers and left.matrix_world==right_pose and right.matrix_world==left_pose
    assert left.material_slots[0].material==lm and right.material_slots[0].material==rm
    stable=fingerprint(scene)
    try:addon.apply_snapshot(scene,str(old),manifest)
    except ValueError:pass
    else:raise AssertionError('v3 must reject v2 downgrade')
    assert fingerprint(scene)==stable
    (directory/'transaction-result.json').write_text(json.dumps(dict(passed=True,failureStages=passed,semanticReorder=True,duplicateAndCountGuards=True,objectIdentity=True,modifiersAndPoseLock=True,unmanagedSharedMesh=True,repeatNoLeak=True,semanticDeleteUndo=True,exactTransformChannels=True,v2GeometryGuard=True,v2OneTimeMigration=True,v1DowngradeRejected=True,v3MigrationPoseGuard=True,v3EqualCountSwap=True,v3UniqueMaterials=True,v3LockedPoseMigration=True,v2DowngradeRejected=True),indent=2))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--directory',required=True);directory=Path(parser.parse_args(sys.argv[sys.argv.index('--')+1:]).directory)
    try:main(directory)
    except Exception:(directory/'transaction-error.txt').write_text(traceback.format_exc());raise
