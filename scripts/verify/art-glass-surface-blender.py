"""Production GLB/material-slot readback and fixed-condition old/new Cycles views."""
import bpy, sys, json, importlib.util, hashlib
from pathlib import Path
from mathutils import Vector

root=Path(__file__).resolve().parents[2]
run=Path(sys.argv[sys.argv.index('--')+1]).resolve()
spec=importlib.util.spec_from_file_location('worker',root/'scripts/blender-render.py')
worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)
report={'blender':bpy.app.version_string,'executable':bpy.app.binary_path,'transfers':[],'views':[]}

def inspect(label,expected):
 panes=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.get('furnishPartKey')=='explicit:art-glass:pane']
 assert len(panes)==expected,(label,len(panes))
 grains=0
 for o in panes:
  assert all(p.area>0 for p in o.data.polygons)
  for slot in o.material_slots:
   m=slot.material
   if not m or not m.name.startswith('art-glass-'):continue
   bsdf=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
   assert bsdf.inputs['Transmission Weight'].default_value>.99
   assert bsdf.inputs['Metallic'].default_value==0
   grain=m.name.startswith(('art-glass-pear','art-glass-mist'))
   assert bool(bsdf.inputs['Roughness'].is_linked)==grain,(label,m.name)
   if grain:
    assert bsdf.inputs['Normal'].is_linked
    assert any(n.type=='TEX_IMAGE' and n.image and n.image.packed_file for n in m.node_tree.nodes)
    grains+=1
 report['transfers'].append({'file':label,'panes':len(panes),'grainMaterialSlots':grains})

for name in ['desktop.glb','file.glb']:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(root/'output/art-glass-verification'/name))
 inspect(name,1)
bpy.ops.wm.open_mainfile(filepath=str(root/'output/art-glass-verification/api-download.blend'))
inspect('api-download.blend',9)

for version in ['before','after']:
 for view in ['front','oblique']:
  bpy.ops.wm.read_factory_settings(use_empty=True)
  source=run/f'{version}-{view}.glb';bpy.ops.import_scene.gltf(filepath=str(source))
  if version=='after':inspect(source.name,9)
  s=bpy.context.scene;s.camera=next(o for o in s.objects if o.type=='CAMERA')
  s.render.engine='CYCLES';device=worker.select_device(s,'gpu',bpy.context.preferences.addons['cycles'].preferences)
  s.cycles.samples=96;s.cycles.use_denoising=True;s.cycles.seed=0;s.cycles.max_bounces=16;s.cycles.transmission_bounces=12
  s.render.resolution_x=1000;s.render.resolution_y=1000;s.render.resolution_percentage=100
  s.render.image_settings.file_format='PNG';s.view_settings.view_transform='AgX';s.view_settings.exposure=0
  s.world=bpy.data.worlds.new('Controlled studio');s.world.use_nodes=True
  s.world.node_tree.nodes['Background'].inputs[0].default_value=(.8,.85,.9,1);s.world.node_tree.nodes['Background'].inputs[1].default_value=.4
  for o in list(s.objects):
   if o.type=='LIGHT':bpy.data.objects.remove(o,do_unlink=True)
  for name,loc,power,size in [('key',(-1,-1.5,2.2),180,1.5),('rim',(1,-.3,1.8),100,1.0)]:
   data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='RECTANGLE';data.size=size;data.size_y=2
   o=bpy.data.objects.new(name,data);s.collection.objects.link(o);o.location=loc
   o.rotation_euler=(Vector((0,0,.6))-o.location).to_track_quat('-Z','Y').to_euler()
  panes=[o for o in s.objects if o.type=='MESH' and o.get('furnishPartKey')=='explicit:art-glass:pane']
  for o in panes:
   coords=[o.matrix_world@v.co for v in o.data.vertices]
   dims=[max(v[i] for v in coords)-min(v[i] for v in coords) for i in range(3)]
   assert all(abs(a-b)<1e-5 for a,b in zip(dims,(.24,.008,.36)))
  bpy.ops.file.pack_all();blend=run/f'{version}-{view}.blend';bpy.ops.wm.save_as_mainfile(filepath=str(blend))
  s.render.filepath=str(run/f'cycles-{version}-{view}.png');bpy.ops.render.render(write_still=True)
  bpy.ops.wm.open_mainfile(filepath=str(blend))
  if version=='after':inspect(blend.name,9)
  report['views'].append({'version':version,'view':view,'device':device,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'reopened':True})
(run/'blender-surface-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print('PASS actual material slots, packed normal/roughness, production exports/API blend reopen and four Cycles views')
