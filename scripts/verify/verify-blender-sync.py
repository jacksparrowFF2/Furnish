"""Real installed add-on receive/apply test. User Blender settings are isolated by the launcher."""
import argparse
import importlib
import importlib.util
import json
import math
from pathlib import Path
import sys
import struct
import time
import traceback
import urllib.request

import bpy
from mathutils import Matrix, Vector


def main(directory):
    settings=json.loads((directory/'receiver-input.json').read_text(encoding='utf-8'))
    base=settings['server'];token=settings['token']
    bpy.ops.wm.read_factory_settings(use_empty=True)
    assert Path(bpy.utils.user_resource('SCRIPTS')).resolve().is_relative_to(directory/'isolated-blender-scripts'), 'Blender test script directory must be isolated'
    bpy.ops.preferences.addon_install(filepath=str(directory/'furnish-sync.zip'))
    bpy.ops.preferences.addon_enable(module='furnish_sync')
    addon=importlib.import_module('furnish_sync')
    scene=bpy.context.scene
    camera_data=bpy.data.cameras.new('User Camera');camera=bpy.data.objects.new('User Camera',camera_data);scene.collection.objects.link(camera);scene.camera=camera
    light_data=bpy.data.lights.new('User Light','AREA');light_data.energy=437;light=bpy.data.objects.new('User Light',light_data);scene.collection.objects.link(light);light.location=(2,-2,6);light.rotation_euler=(0,0,0)
    mesh=bpy.data.meshes.new('User Unmanaged');mesh.from_pydata([(0,0,0),(.1,0,0),(0,.1,0)],[],[(0,1,2)]);unmanaged=bpy.data.objects.new('User Unmanaged',mesh);scene.collection.objects.link(unmanaged)
    scene.furnish_sync.server=base;scene.furnish_sync.token=token
    assert bpy.ops.furnish.sync_start()=={'FINISHED'}
    results=[];sofa_pointer=None;sofa_id=None;sofa_material=None;tea_id=None;tea_material=None;camera_matrix=None
    def post(route,data,headers):
        with urllib.request.urlopen(urllib.request.Request(base+route,data=data,headers=headers),timeout=20) as response:return json.load(response)
    def status():
        with urllib.request.urlopen(base+'/api/furnish/blender/sync/status',timeout=3) as response:return json.load(response)
    def managed():
        return next(c for c in scene.collection.children if c.get('furnishPlanId'))
    def objects(owner):return [o for o in managed().all_objects if o.get('furnishId')==owner]
    def find(key):return next(o for o in managed().all_objects if o.get('furnishObjectId')==key)
    def matrix_tuple(obj):return tuple(obj.matrix_world[i][j] for i in range(4) for j in range(4))
    for fixture in settings['fixtures']:
        name=fixture['name'];payload=(directory/fixture['file']).read_bytes()
        manifest=post('/api/furnish/blender/sync/publish',payload,{'Content-Type':'model/gltf-binary','X-Furnish-Request':'blender-v1'})
        assert manifest['revision']==fixture['manifest']['revision']
        addon._runtime['polled']=0
        deadline=time.monotonic()+80
        while time.monotonic()<deadline:
            addon.tick()
            if not addon._runtime['enabled']:raise AssertionError(scene.furnish_sync.status)
            if addon._runtime['revision']==manifest['revision']:break
            time.sleep(.05)
        else:raise AssertionError('Receiver timed out: '+name+' / '+scene.furnish_sync.status)
        for _ in range(60):
            received=status().get('ack')
            if received and received['revision']==manifest['revision'] and received['state']=='applied':break
            time.sleep(.05)
        else:raise AssertionError('Missing receive acknowledgement')
        ids=[o.get('furnishObjectId') for o in managed().all_objects if o.type=='MESH'];assert len(ids)==len(set(ids))==manifest['objects']
        assert scene.camera==camera and light_data.energy==437 and unmanaged.name in scene.objects
        if name=='first':
            sofa=objects('live-sofa')[0];sofa_id=sofa['furnishObjectId'];sofa_pointer=sofa.as_pointer()
            sofa_material=bpy.data.materials.new('User Refined Sofa');sofa_material.diffuse_color=(.7,.03,.2,1)
            sofa.material_slots[0].link='OBJECT';sofa.material_slots[0].material=sofa_material
            tea=objects('live-tea')[0];tea_id=tea['furnishObjectId'];tea_material=bpy.data.materials.new('User Refined Tea');tea.material_slots[0].link='OBJECT';tea.material_slots[0].material=tea_material
            centre=sofa.matrix_world.translation;camera.location=centre+Vector((4,-5,3));camera.rotation_euler=(centre-camera.location).to_track_quat('-Z','Y').to_euler();bpy.context.view_layer.update();camera_matrix=matrix_tuple(camera)
        else:
            sofa=find(sofa_id);assert sofa.as_pointer()==sofa_pointer;assert sofa.material_slots[0].material==sofa_material;assert max(abs(a-b) for a,b in zip(matrix_tuple(camera),camera_matrix))<1e-5, 'Camera moved: '+name
        if name=='moved':
            assert objects('live-new');gltf=json.loads(payload[20:20+int.from_bytes(payload[12:16],'little')]);node=next(n for n in gltf['nodes'] if n.get('extras',{}).get('furnishObjectId')==sofa_id)
            values=node.get('matrix',[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);m=Matrix(tuple(tuple(values[col*4+row] for col in range(4)) for row in range(4)))
            primitive=gltf['meshes'][node['mesh']]['primitives'][0];accessor=gltf['accessors'][primitive['attributes']['POSITION']];view=gltf['bufferViews'][accessor['bufferView']]
            offset=28+int.from_bytes(payload[12:16],'little')+view.get('byteOffset',0)+accessor.get('byteOffset',0);assert accessor['componentType']==5126
            expected=[]
            for i in range(accessor['count']):
                raw=Vector(struct.unpack_from('<fff',payload,offset+i*view.get('byteStride',12)));point=m @ raw;expected.append((point.x,-point.z,point.y))
            actual=[sofa.matrix_world @ v.co for v in sofa.data.vertices]
            expected_bounds=[fn(p[i] for p in expected) for fn in (min,max) for i in range(3)];actual_bounds=[fn(p[i] for p in actual) for fn in (min,max) for i in range(3)]
            assert max(abs(a-b) for a,b in zip(actual_bounds,expected_bounds))<2e-4, repr((actual_bounds,expected_bounds))
            assert sofa.matrix_world.determinant()<0
        if name=='hidden':assert all(o.hide_render and o.hide_get() for o in objects('live-sofa'))
        if name=='deleted':assert not objects('live-tea');assert not any(o.hide_render for o in objects('live-sofa'))
        if name=='restored':
            assert find(tea_id).material_slots[0].material==tea_material
            before_origin=matrix_tuple(sofa)
        if name=='origin':assert max(abs(a-b) for a,b in zip(matrix_tuple(sofa),before_origin))<2e-4
        results.append({'step':name,'objects':len(ids),'materialPreserved':True,'cameraAndLightPreserved':True,'acknowledged':True})
    bpy.ops.furnish.sync_stop()
    last=settings['fixtures'][-1];manifest=last['manifest'];file=str(directory/last['file'])
    count=len(bpy.data.objects);first=addon.apply_snapshot(scene,file,manifest);assert first['added']==first['deleted']==0 and len(bpy.data.objects)==count
    sofa=find(sofa_id);sofa['furnish_sync_keep_transform']=True;sofa.location.z+=.2;bpy.context.view_layer.update();locked=matrix_tuple(sofa);addon.apply_snapshot(scene,file,manifest);assert max(abs(a-b) for a,b in zip(locked,matrix_tuple(sofa)))<1e-5
    sofa['furnish_sync_keep_transform']=False;addon.apply_snapshot(scene,file,manifest,False);assert sofa.material_slots[0].material!=sofa_material
    def data_counts():return tuple(len(blocks) for blocks in (bpy.data.objects,bpy.data.meshes,bpy.data.materials,bpy.data.images,bpy.data.cameras,bpy.data.lights))
    stable=data_counts()
    for _ in range(3):addon.apply_snapshot(scene,file,manifest)
    assert data_counts()==stable, repr((stable,data_counts()))
    before=len(bpy.data.objects)
    try:addon.apply_snapshot(scene,file,{**manifest,'planId':'other-plan'})
    except ValueError:pass
    else:raise AssertionError('Plan switch must be explicit')
    assert len(bpy.data.objects)==before
    duplicate=sofa.copy();managed().objects.link(duplicate)
    try:addon.apply_snapshot(scene,file,manifest)
    except ValueError:pass
    else:raise AssertionError('Duplicate managed identities must be rejected')
    bpy.data.objects.remove(duplicate,do_unlink=True)
    scene.render.engine='CYCLES';scene.cycles.samples=16;scene.cycles.use_denoising=True;scene.render.resolution_x=640;scene.render.resolution_y=480;scene.render.resolution_percentage=100
    spec=importlib.util.spec_from_file_location('render_worker',str(Path(__file__).resolve().parents[1]/'blender-render.py'));worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker);device=worker.select_device(scene,'gpu',bpy.context.preferences.addons['cycles'].preferences)
    scene.world=bpy.data.worlds.new('User World');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.45
    scene.render.filepath=str(directory/'receiver-render.png');bpy.ops.render.render(write_still=True);bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(directory/'receiver.blend'))
    bpy.ops.preferences.addon_disable(module='furnish_sync')
    assert not hasattr(bpy.types.Scene,'furnish_sync')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    first=settings['fixtures'][0];legacy_file=str(directory/first['file']);bpy.ops.import_scene.gltf(filepath=legacy_file)
    scene=bpy.context.scene;legacy_meshes=[o for o in scene.objects if o.type=='MESH']
    for obj in legacy_meshes:del obj['furnishObjectId']
    custom=bpy.data.materials.new('Legacy Refined');legacy_meshes[0].material_slots[0].link='OBJECT';legacy_meshes[0].material_slots[0].material=custom
    adopted=addon.apply_snapshot(scene,legacy_file,first['manifest'],True,True)
    assert adopted['added']==0 and adopted['adopted']==len(legacy_meshes)
    assert len([o for o in scene.objects if o.type=='MESH'])==len(legacy_meshes) and legacy_meshes[0].material_slots[0].material==custom
    result={'passed':True,'steps':results,'zipInstalledAndRegistered':True,'sourceMatrixMirrorVerified':True,'hiddenMaterialRetained':True,'deleteUndoMaterialRestored':True,'originNoDrift':True,'repeatedApplyNoDuplicates':True,'poseLock':True,'sourceMaterialsOption':True,'unrelatedObjectsPreserved':True,'planAndDuplicateGuards':True,'addonUnregistered':True,'matchedLegacyAdoption':True,'renderDevice':device}
    (directory/'receiver-result.json').write_text(json.dumps(result,indent=2),encoding='utf-8')


if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--directory',required=True);args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);directory=Path(args.directory)
    try:main(directory)
    except Exception:
        (directory/'receiver-error.txt').write_text(traceback.format_exc(),encoding='utf-8');raise
