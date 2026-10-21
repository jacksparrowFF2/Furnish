"""Local, one-way Furnish scene synchronization. Networking never calls bpy."""
bl_info = {"name": "Furnish Live Sync", "author": "Furnish", "version": (0, 1, 0),
           "blender": (4, 2, 0), "location": "3D View > Sidebar > Furnish", "category": "Import-Export"}

import hashlib
import json
import shutil
import tempfile
import threading
import time
from pathlib import Path
import urllib.error
import urllib.parse
import urllib.request

import bpy
from mathutils import Matrix

MAX_BYTES = 256 * 1024 * 1024
_runtime = dict(enabled=False, thread=None, pending=None, revision=None, scene=None, polled=0, generation=0)


def remove_temp(directory):
    target=Path(directory).resolve()
    if target.parent != Path(tempfile.gettempdir()).resolve() or not target.name.startswith('furnish-sync-'):
        raise ValueError('拒绝清理非同步临时目录')
    shutil.rmtree(target)


def stop_runtime():
    _runtime['enabled']=False;_runtime['generation']+=1
    pending=_runtime.get('pending');_runtime['pending']=None
    if pending and pending.get('directory'):remove_temp(pending['directory'])


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError('同步服务不能重定向到其他地址')


def connection(url, token):
    parsed = urllib.parse.urlsplit(url)
    if parsed.scheme != 'http' or parsed.hostname not in ('127.0.0.1', 'localhost') or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in ('', '/'):
        raise ValueError('仅支持本机 http://127.0.0.1:端口 或 localhost')
    if len(token) != 48 or any(c not in '0123456789abcdef' for c in token):
        raise ValueError('请从 Furnish 复制完整的连接密钥')
    return url.rstrip('/'), token


def request(url, token, route, value=None):
    headers = {'X-Furnish-Sync': token}
    data = None
    if value is not None:
        headers['Content-Type'] = 'application/json'
        data = json.dumps(value).encode('utf-8')
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
    return opener.open(urllib.request.Request(url+'/api/furnish/blender/sync/'+route, data=data, headers=headers), timeout=3)


def fetch_snapshot(url, token, revision):
    url, token = connection(url, token)
    with request(url, token, 'manifest') as response:
        manifest = json.loads(response.read(65536))
    latest = manifest.get('latest')
    if not latest or latest.get('revision') == revision:
        return None
    digest = latest.get('revision', '')
    if len(digest) != 64 or any(c not in '0123456789abcdef' for c in digest) or latest.get('protocol') != 1 or not 0 < latest.get('bytes', 0) <= MAX_BYTES:
        raise ValueError('同步版本信息无效')
    directory = Path(tempfile.mkdtemp(prefix='furnish-sync-'))
    try:
        target = directory/'scene.glb'
        size = 0; hasher = hashlib.sha256()
        with request(url, token, 'scene/'+digest) as response, target.open('wb') as output:
            while True:
                chunk = response.read(1024*1024)
                if not chunk: break
                size += len(chunk)
                if size > MAX_BYTES: raise ValueError('同步场景超过 256 MB')
                hasher.update(chunk); output.write(chunk)
        if size != latest['bytes'] or hasher.hexdigest() != digest:
            raise ValueError('同步场景校验失败，保留当前模型')
        return dict(path=str(target), directory=str(directory), manifest=latest)
    except Exception:
        remove_temp(directory)
        raise


def apply_snapshot(scene, filepath, manifest, preserve_materials=True, adopt_legacy=False, capture_camera=False):
    """Called on Blender's main thread only. Managed meshes own geometry/transforms."""
    plan = manifest['planId']; origin = manifest['originMm']
    collections = [c for c in scene.collection.children if c.get('furnishPlanId')]
    if any(c.get('furnishPlanId') != plan for c in collections):
        raise ValueError('当前文件连接了另一户型；请新建 Blender 文件后连接新方案')
    collection = next((c for c in collections if c.get('furnishPlanId') == plan), None)
    bank=json.loads(collection.get('furnishMaterialBank','{}')) if collection else {}
    first = collection is None
    anchor = list(origin) if first else list(collection['furnishOriginMm'])
    delta = Matrix.Translation(((origin[0]-anchor[0])/1000, -(origin[1]-anchor[1])/1000, 0))
    existing = {}
    if collection:
        for obj in collection.all_objects:
            key = obj.get('furnishObjectId')
            if key:
                if key in existing: raise ValueError('Blender 中有重复同步标识，请先移出复制对象：'+key)
                if obj.type!='MESH':raise ValueError('同步实体类型已改变，请移出非网格对象')
                existing[key] = obj
    before = set(bpy.data.objects); before_meshes=set(bpy.data.meshes); before_mats=set(bpy.data.materials); before_images=set(bpy.data.images)
    before_cameras=set(bpy.data.cameras);before_lights=set(bpy.data.lights)
    incoming=[]; retained=set(); added=updated=deleted=adopted=0
    active_camera=scene.camera;world=scene.world
    try:
        bpy.ops.import_scene.gltf(filepath=filepath)
        incoming = list(set(bpy.data.objects)-before)
        meshes = [o for o in incoming if o.type == 'MESH']
        for material in set(bpy.data.materials)-before_mats:material['_furnish_sync_imported']=True
        for image in set(bpy.data.images)-before_images:image['_furnish_sync_imported']=True
        keys = [o.get('furnishObjectId') for o in meshes];key_set=set(keys)
        if not meshes or any(not isinstance(k,str) or not k for k in keys) or len(set(keys)) != len(keys):
            raise ValueError('导入实体缺少唯一标识；请使用 Furnish 的持续同步推送')
        # Check all candidates before modifying existing objects.
        if first and adopt_legacy:
            used=set()
            for obj in meshes:
                name=obj.get('furnishLegacyName',obj.name)
                eligible=[o for o in before if o.name in scene.objects and o not in used and o.type=='MESH' and (not o.get('furnishObjectId') or o.get('furnishObjectId')==obj['furnishObjectId']) and o.get('furnishId')==obj.get('furnishId') and o.get('layerObject')==obj.get('layerObject')]
                candidate=next((o for o in eligible if o.name==name and '/instance:' not in obj['furnishObjectId']),None)
                if candidate is None:
                    matrix=delta @ obj.matrix_world
                    matches=[o for o in eligible if len(o.data.vertices)==len(obj.data.vertices) and max(abs(o.matrix_world[i][j]-matrix[i][j]) for i in range(4) for j in range(4))<1e-5]
                    if len(matches)==1:candidate=matches[0]
                if candidate:existing[obj['furnishObjectId']]=candidate;used.add(candidate);adopted+=1
            legacy=[o for o in before if o.name in scene.objects and o.type=='MESH' and (o.get('furnishId') or o.get('layerObject') or o.name.startswith('Architecture_'))]
            if any(o not in used for o in legacy):raise ValueError('旧工程有无法唯一匹配的导出对象，请从新文件建立同步后迁移材质')
        if collection is None:
            collection=bpy.data.collections.new('Furnish | '+manifest.get('plan',plan));scene.collection.children.link(collection)
            collection['furnishPlanId']=plan;collection['furnishOriginMm']=anchor
        for obj in meshes:
            key=obj['furnishObjectId'];old=existing.get(key)
            matrix=delta @ obj.matrix_world
            source_materials=[slot.material for slot in obj.material_slots]
            if old:
                keep=[slot.material for slot in old.material_slots]
                compatible=old.get('furnishPartKind',obj.get('furnishPartKind'))==obj.get('furnishPartKind')
                previous=old.data;old.data=obj.data
                if not old.get('furnish_sync_keep_transform',False):old.matrix_world=matrix
                chosen=keep if preserve_materials and compatible and len(keep)==len(old.material_slots) else source_materials
                for i,material in enumerate(chosen):old.material_slots[i].link='OBJECT';old.material_slots[i].material=material
                if previous.users==0:bpy.data.meshes.remove(previous)
                updated+=1;target=old
            else:
                target=obj;target.matrix_world=matrix;retained.add(obj);added+=1
                saved=bank.get(key,{})
                if preserve_materials and saved.get('kind')==obj.get('furnishPartKind') and len(saved.get('materials',[]))==len(obj.material_slots):
                    for i,name in enumerate(saved['materials']):
                        material=bpy.data.materials.get(name) if name else None
                        if material:obj.material_slots[i].link='OBJECT';obj.material_slots[i].material=material
            if not preserve_materials:bank.pop(key,None)
            for property_name in ('furnishObjectId','furnishId','furnishPartKind','layerObject','furnishLegacyName'):
                if property_name in obj:target[property_name]=obj[property_name]
            if 'furnish_sync_keep_transform' not in target:target['furnish_sync_keep_transform']=False
            # Store every binding on the object. Shared imported mesh slots must not
            # keep a second, unused copy of source materials alive on every update.
            for slot in target.material_slots:
                material=slot.material;slot.link='OBJECT';slot.material=material
            target.hide_render=not obj.get('furnishVisible',True)
            target.hide_set(not obj.get('furnishVisible',True))
            if target.name not in collection.objects:collection.objects.link(target)
            for owner in list(target.users_collection):
                if owner != collection:owner.objects.unlink(target)
        for target in collection.all_objects:
            if target.type=='MESH' and target.get('furnishObjectId'):
                for i in range(len(target.data.materials)):target.data.materials[i]=None
        for key,old in existing.items():
            if key not in key_set:
                if preserve_materials:
                    materials=[s.material for s in old.material_slots]
                    bank[key]={'kind':old.get('furnishPartKind',''),'materials':[m.name if m else None for m in materials]}
                    for material in materials:
                        if material:material.use_fake_user=True
                data=old.data;bpy.data.objects.remove(old,do_unlink=True)
                if data.users==0:bpy.data.meshes.remove(data)
                deleted+=1
        scene.camera=active_camera;scene.world=world
        if first and active_camera is None:
            camera=next((o for o in incoming if o.type=='CAMERA'),None)
            if camera:camera.matrix_world=delta @ camera.matrix_world;collection.objects.link(camera);retained.add(camera);scene.camera=camera
        # Existing user lights and cameras, including the active camera, are never replaced.
        if first and not any(o.type=='LIGHT' for o in before if o.name in scene.objects):
            for light in (o for o in incoming if o.type=='LIGHT'):
                light.matrix_world=delta @ light.matrix_world;collection.objects.link(light);retained.add(light)
        render_camera=None
        if capture_camera:
            render_camera=next((o for o in incoming if o.type=='CAMERA'),None)
            if render_camera is None:raise ValueError('导出场景缺少渲染相机')
            render_camera.matrix_world=delta @ render_camera.matrix_world
            if render_camera.name not in scene.collection.objects:scene.collection.objects.link(render_camera)
            retained.add(render_camera)
        collection['furnishRevision']=manifest['revision']
        collection['furnishMaterialBank']=json.dumps(bank)
        bpy.context.view_layer.update()
        result=dict(added=added,updated=updated,deleted=deleted,adopted=adopted,revision=manifest['revision'])
        if render_camera:result['renderCamera']=render_camera.name
        return result
    finally:
        if active_camera:scene.camera=active_camera
        scene.world=world
        # Remove temporary imports and only their unused data, never unrelated user data.
        for obj in incoming:
            if obj not in retained and obj.name in bpy.data.objects:bpy.data.objects.remove(obj,do_unlink=True)
        for mesh in list(set(bpy.data.meshes)-before_meshes):
            if mesh.users==0:bpy.data.meshes.remove(mesh)
        for blocks,previous in ((bpy.data.cameras,before_cameras),(bpy.data.lights,before_lights)):
            for block in list(set(blocks)-previous):
                if block.users==0:blocks.remove(block)
        for mat in list(bpy.data.materials):
            if mat.get('_furnish_sync_imported') and mat.users==0:bpy.data.materials.remove(mat)
        for image in list(bpy.data.images):
            if image.get('_furnish_sync_imported') and image.users==0:bpy.data.images.remove(image)


def send_ack(url,token,revision,state,message):
    try:
        with request(url,token,'ack',dict(revision=revision,state=state,message=message)) as response:response.read()
    except Exception:pass


def tick():
    if not _runtime['enabled']:return None
    scene=_runtime['scene']
    if not scene or bpy.context.scene != scene:
        stop_runtime();return None
    settings=scene.furnish_sync
    pending=_runtime.get('pending');_runtime['pending']=None
    if pending:
        if 'error' in pending:settings.status=pending['error'][:300]
        else:
            manifest=pending['manifest']
            try:
                result=apply_snapshot(scene,pending['path'],manifest,settings.preserve_materials,settings.adopt_legacy)
                _runtime['revision']=manifest['revision'];settings.status='已同步：新增 {added}／更新 {updated}／删除 {deleted}'.format(**result)
                threading.Thread(target=send_ack,args=(settings.server,settings.token,manifest['revision'],'applied',settings.status),daemon=True).start()
            except Exception as error:
                settings.status='同步失败，暂停：'+str(error)[:250];_runtime['enabled']=False
                threading.Thread(target=send_ack,args=(settings.server,settings.token,manifest['revision'],'failed',settings.status),daemon=True).start()
            finally:remove_temp(pending['directory'])
    thread=_runtime.get('thread')
    if _runtime['enabled'] and (not thread or not thread.is_alive()) and time.monotonic()-_runtime['polled']>2:
        url,token,revision=settings.server,settings.token,_runtime['revision'];_runtime['polled']=time.monotonic();generation=_runtime['generation']
        def work():
            try:result=fetch_snapshot(url,token,revision)
            except Exception as error:result={'error':'连接中断，将重试：'+str(error)[:220]}
            if _runtime['enabled'] and generation==_runtime['generation']:_runtime['pending']=result
            elif result and result.get('directory'):remove_temp(result['directory'])
        thread=threading.Thread(target=work,daemon=True);_runtime['thread']=thread;thread.start()
    for area in bpy.context.screen.areas if bpy.context.screen else []:
        if area.type=='VIEW_3D':area.tag_redraw()
    return .25 if _runtime['enabled'] else None


class FurnishSyncSettings(bpy.types.PropertyGroup):
    server: bpy.props.StringProperty(name='本地服务',default='http://127.0.0.1:8765')
    token: bpy.props.StringProperty(name='连接密钥',subtype='PASSWORD')
    preserve_materials: bpy.props.BoolProperty(name='保留 Blender 材质',default=True,description='保持已有部件的材质；关闭时同步 Furnish 的配色与材质')
    adopt_legacy: bpy.props.BoolProperty(name='接管同名旧导出对象',default=False,description='仅首次连接使用，适用于同一保存版本的旧 GLB／样板工程')
    status: bpy.props.StringProperty(default='尚未连接')


class FURNISH_OT_sync_start(bpy.types.Operator):
    bl_idname='furnish.sync_start';bl_label='连接并持续同步'
    def execute(self,context):
        settings=context.scene.furnish_sync
        try:connection(settings.server,settings.token)
        except ValueError as error:self.report({'ERROR'},str(error));return {'CANCELLED'}
        if _runtime.get('thread') and _runtime['thread'].is_alive():self.report({'WARNING'},'请等待上次网络请求结束');return {'CANCELLED'}
        stop_runtime();_runtime.update(enabled=True,pending=None,revision=None,scene=context.scene,polled=0)
        settings.status='等待 Furnish 推送…'
        if not bpy.app.timers.is_registered(tick):bpy.app.timers.register(tick,first_interval=.1)
        return {'FINISHED'}


class FURNISH_OT_sync_stop(bpy.types.Operator):
    bl_idname='furnish.sync_stop';bl_label='停止接收'
    def execute(self,context):
        stop_runtime();context.scene.furnish_sync.status='已停止接收';return {'FINISHED'}


class FURNISH_PT_sync(bpy.types.Panel):
    bl_label='Furnish 持续同步';bl_idname='FURNISH_PT_sync';bl_space_type='VIEW_3D';bl_region_type='UI';bl_category='Furnish'
    def draw(self,context):
        layout=self.layout;settings=context.scene.furnish_sync
        layout.prop(settings,'server');layout.prop(settings,'token');layout.prop(settings,'preserve_materials');layout.prop(settings,'adopt_legacy')
        row=layout.row();row.operator('furnish.sync_start');row.operator('furnish.sync_stop')
        layout.label(text=settings.status[:85])
        obj=context.object
        if obj and obj.get('furnishObjectId') and 'furnish_sync_keep_transform' in obj:
            layout.prop(obj,'["furnish_sync_keep_transform"]',text='保留此物体的 Blender 姿态')


classes=(FurnishSyncSettings,FURNISH_OT_sync_start,FURNISH_OT_sync_stop,FURNISH_PT_sync)


def register():
    for cls in classes:bpy.utils.register_class(cls)
    bpy.types.Scene.furnish_sync=bpy.props.PointerProperty(type=FurnishSyncSettings)
    if on_load not in bpy.app.handlers.load_pre:bpy.app.handlers.load_pre.append(on_load)


def unregister():
    stop_runtime()
    if on_load in bpy.app.handlers.load_pre:bpy.app.handlers.load_pre.remove(on_load)
    if bpy.app.timers.is_registered(tick):bpy.app.timers.unregister(tick)
    if hasattr(bpy.types.Scene,'furnish_sync'):del bpy.types.Scene.furnish_sync
    for cls in reversed(classes):bpy.utils.unregister_class(cls)


@bpy.app.handlers.persistent
def on_load(_):
    stop_runtime();_runtime['scene']=None


if __name__=='__main__':register()
