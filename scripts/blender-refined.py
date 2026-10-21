"""Merge production geometry into a saved refinement copy without resetting its look."""
import hashlib,importlib.util,json
from pathlib import Path
import bpy

def prepare(template,input_file,camera_mode):
    data=Path(input_file).read_bytes();gltf=json.loads(data[20:20+int.from_bytes(data[12:16],'little')]);meta=gltf['scenes'][0]['extras']['furnish']
    bpy.ops.wm.open_mainfile(filepath=str(Path(template).resolve()));scene=bpy.context.scene
    managed=[c for c in scene.collection.children if c.get('furnishPlanId')]
    if not managed or any(c.get('furnishPlanId')!=meta['planId'] for c in managed):raise ValueError('精修工程未绑定此户型；请先建立持续同步工程')
    spec=importlib.util.spec_from_file_location('furnish_render_sync',Path(__file__).with_name('blender-sync-addon.py'));sync=importlib.util.module_from_spec(spec);spec.loader.exec_module(sync)
    manifest=dict(planId=meta['planId'],originMm=meta['originMm'],revision=hashlib.sha256(data).hexdigest())
    materials={o['furnishObjectId']:[s.material.name if s.material else None for s in o.material_slots] for o in managed[0].all_objects if o.type=='MESH' and o.get('furnishObjectId')}
    world=scene.world;camera=scene.camera;lights={o.name:(tuple(o.matrix_world[i][j] for i in range(4) for j in range(4)),o.data.energy) for o in scene.objects if o.type=='LIGHT'}
    result=sync.apply_snapshot(scene,str(input_file),manifest,capture_camera=camera_mode=='source')
    if camera_mode=='source':scene.camera=bpy.data.objects[result['renderCamera']]
    elif camera_mode!='active':
        names={'living':'1601固定机位 | 01-客厅','dining':'1601固定机位 | 02-餐厅','kitchen':'1601固定机位 | 03-厨房','bedroom':'1601固定机位 | 04-主卧'}
        chosen=scene.objects.get(names.get(camera_mode,''))
        if chosen is None or chosen.type!='CAMERA':raise ValueError('精修工程缺少该固定机位')
        scene.camera=chosen
    if scene.camera is None:raise ValueError('精修工程没有活动相机')
    preserved=sum(1 for o in managed[0].all_objects if o.type=='MESH' and o.get('furnishObjectId') in materials and [s.material.name if s.material else None for s in o.material_slots]==materials[o['furnishObjectId']])
    if scene.world!=world:raise ValueError('精修世界设置意外改变')
    for name,(matrix,energy) in lights.items():
        obj=scene.objects.get(name)
        if not obj or obj.data.energy!=energy or tuple(obj.matrix_world[i][j] for i in range(4) for j in range(4))!=matrix:raise ValueError('精修灯光意外改变')
    return scene,dict(source='refined',cameraMode=camera_mode,camera=scene.camera.name,world=world.name if world else None,existingMaterialBindingsPreserved=preserved,existingManagedMeshes=len(materials),lightsPreserved=len(lights),sync=result)
