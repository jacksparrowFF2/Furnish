"""Read real exported panes; render controlled optical A/B and reopenable blend.
No generated Blender nodes are needed: all patterns are embedded in the GLB.
"""
import bpy, sys, json, importlib.util
from pathlib import Path
from mathutils import Vector
run=Path(sys.argv[sys.argv.index('--')+1]).resolve()
root=Path(__file__).resolve().parents[2]
spec=importlib.util.spec_from_file_location('worker',root/'scripts/blender-render.py')
worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)
# Formal EXE and file:// exports: inspect their actual geometry and material slots.
transfers=[]
for filename,expected in [('desktop.glb',(1.1,.0065,2.2)),('file.glb',(.9,.008,2.4))]:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(run/filename))
 panes=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('furnishPartKey')=='explicit:art-glass:pane']
 assert len(panes)==1
 obj=panes[0];assert all(abs(a-b)<1e-5 for a,b in zip(obj.dimensions,expected)),(filename,list(obj.dimensions))
 assert any(n.type=='NORMAL_MAP' for slot in obj.material_slots if slot.material for n in slot.material.node_tree.nodes)
 transfers.append({'file':filename,'dimensions':list(obj.dimensions),'id':obj.get('furnishId')})
bpy.ops.wm.open_mainfile(filepath=str(run/'api-download.blend'))
assert len([o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('furnishPartKey')=='explicit:art-glass:pane'])==9
assert any(n.type=='NORMAL_MAP' for m in bpy.data.materials if m.use_nodes for n in m.node_tree.nodes)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(run/'samples.glb'))
s=bpy.context.scene;s.camera=next(o for o in s.objects if o.type=='CAMERA')
s.render.engine='CYCLES';device=worker.select_device(s,'auto',bpy.context.preferences.addons['cycles'].preferences)
s.cycles.samples=96;s.cycles.use_denoising=True;s.cycles.max_bounces=16;s.cycles.transmission_bounces=12;s.cycles.transparent_max_bounces=12
s.render.resolution_x=1200;s.render.resolution_y=1200;s.render.resolution_percentage=100
s.render.image_settings.file_format='PNG';s.view_settings.view_transform='AgX';s.view_settings.exposure=0
s.world=bpy.data.worlds.new('Sample studio');s.world.use_nodes=True;s.world.node_tree.nodes['Background'].inputs[0].default_value=(.8,.85,.9,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.4
for o in list(s.objects):
 if o.type=='LIGHT':bpy.data.objects.remove(o,do_unlink=True)
for name,loc,power,size in [('key',(-1,-1.5,2.2),180,1.5),('rim',(1,-.3,1.8),100,1.0)]:
 data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='RECTANGLE';data.size=size;data.size_y=2
 obj=bpy.data.objects.new(name,data);s.collection.objects.link(obj);obj.location=loc;obj.rotation_euler=(Vector((0,0,.6))-obj.location).to_track_quat('-Z','Y').to_euler()
panes=[o for o in s.objects if o.type=='MESH' and o.get('furnishPartKey')=='explicit:art-glass:pane']
assert len(panes)==9,(len(panes),[o.name for o in panes])
report={'blender':bpy.app.version_string,'executable':bpy.app.binary_path,'device':device,'transfers':transfers,'apiDownloadReopened':True,'panes':[]}
for o in panes:
 mn=Vector((min((o.matrix_world@v.co).x for v in o.data.vertices),min((o.matrix_world@v.co).y for v in o.data.vertices),min((o.matrix_world@v.co).z for v in o.data.vertices)))
 mx=Vector((max((o.matrix_world@v.co).x for v in o.data.vertices),max((o.matrix_world@v.co).y for v in o.data.vertices),max((o.matrix_world@v.co).z for v in o.data.vertices)))
 dims=mx-mn;assert all(abs(a-b)<1e-5 for a,b in zip(dims,(.24,.008,.36))),tuple(dims)
 materials=[slot.material for slot in o.material_slots];pattern=next(m for m in materials if m and m.name.startswith('art-glass-') and any(n.type=='NORMAL_MAP' for n in m.node_tree.nodes))
 bsdf=next(n for n in pattern.node_tree.nodes if n.type=='BSDF_PRINCIPLED');assert bsdf.inputs['Transmission Weight'].default_value>.99
 assert bsdf.inputs['Normal'].is_linked
 assert any(n.type=='TEX_IMAGE' and n.image and n.image.packed_file for n in pattern.node_tree.nodes)
 assert all(p.area>0 for p in o.data.polygons)
 report['panes'].append({'name':o.name,'dimensions':list(dims),'pattern':pattern.name,'slots':[m.name if m else None for m in materials],'normalsEmbedded':True,'transmission':bsdf.inputs['Transmission Weight'].default_value})
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(run/'art-glass-samples.blend'))
# Same geometry, camera, lighting and exposure; only optical normal strength differs.
normal_nodes=[n for m in bpy.data.materials if m.use_nodes for n in m.node_tree.nodes if n.type=='NORMAL_MAP']
for n in normal_nodes:n.inputs['Strength'].default_value=0
s.render.filepath=str(run/'optical-before.png');bpy.ops.render.render(write_still=True)
for n in normal_nodes:n.inputs['Strength'].default_value=1
s.render.filepath=str(run/'optical-after.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(run/'art-glass-samples.blend'))
# Reload the delivered engineering file and verify object slots and actual shader links.
bpy.ops.wm.open_mainfile(filepath=str(run/'art-glass-samples.blend'))
assert len([o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('furnishPartKey')=='explicit:art-glass:pane'])==9
assert all(n.inputs['Strength'].default_value==1 for m in bpy.data.materials if m.use_nodes for n in m.node_tree.nodes if n.type=='NORMAL_MAP')
report['reopened']=True
(run/'blender-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
