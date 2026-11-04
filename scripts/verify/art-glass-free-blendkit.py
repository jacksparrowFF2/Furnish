import bpy,json,math,hashlib,importlib.util
from pathlib import Path
from mathutils import Vector
root=Path.cwd();source=root/'.local/art-glass-free-20261104';out=root/'output/art-glass-free-20261104'
spec=importlib.util.spec_from_file_location('worker',root/'scripts/blender-render.py');worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)
bpy.ops.wm.open_mainfile(filepath=str(root/'output/art-glass-20261103/art-glass-samples.blend'))
s=bpy.context.scene
old={k:next(o for o in s.objects if o.type=='MESH' and o.get('furnishId')=='sample-'+v) for k,v in [('fluted','fluted'),('wavy','water-wave')]}
for o in s.objects:
 if o.type=='MESH':o.hide_render=True
native={}
for key in ['fluted','wavy']:
 with bpy.data.libraries.load(str(source/key/(key+'.blend')),link=False) as (src,dst):dst.materials=list(src.materials)
 native[key]=next(m for m in dst.materials if m)
 native[key].name='Blendkit-Free-'+key
 native[key].use_fake_user=True
 native[key].asset_mark()
 native[key].asset_data.description='Local-use material from Blendkit; see accompanying source metadata.'
 native[key]['furnish_source']=str(source/key/'source.json')

def linear(c):return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
mats={}
def mat(color):
 if color in mats:return mats[color]
 m=bpy.data.materials.new('Backdrop-'+color);m.use_nodes=True;n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');n.inputs['Base Color'].default_value=(*[linear(int(color[i:i+2],16)/255) for i in [0,2,4]],1);n.inputs['Roughness'].default_value=.65;mats[color]=m;return m

def box(name,loc,dim,color):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=dim;o.data.materials.append(mat(color));return o
report={'assets':{},'paneDimensions':[.24,.008,.36],'surface':'patterned front only, original polished back and edge retained','images':[]}
new=[]
for row,key in enumerate(['fluted','wavy']):
 report['assets'][key]=json.loads((source/key/'source.json').read_text(encoding='utf-8'))
 for col in [0,1]:
  x=(col-.5)*.34;bottom=(1-row)*.44
  o=old[key].copy();o.data=old[key].data.copy();s.collection.objects.link(o);o.hide_render=False;o.location=(x,0,bottom+.18);o.name=('Current-' if col==0 else 'Free-')+key
  if col==1:
   for i,slot in enumerate(o.material_slots):
    if any(n.type=='NORMAL_MAP' for n in slot.material.node_tree.nodes):slot.material=native[key]
   new.append(o)
  box('Backdrop',(x,.09,bottom+.18),(.26,.008,.38),'d9cbb1')
  for j in range(7):box('Stripe',(x+(j-3)*.032,.08,bottom+.18),(.012,.004,.30),'7eaa97' if j%2 else '193746')
s.camera.location=(.025,-1.95,.47);s.camera.rotation_euler=(Vector((0,0,.40))-s.camera.location).to_track_quat('-Z','Y').to_euler();s.camera.data.type='PERSP';s.camera.data.lens=50
s.render.resolution_x=1200;s.render.resolution_y=1200;s.render.resolution_percentage=100;s.cycles.samples=128;s.cycles.use_denoising=True
report['device']=worker.select_device(s,'auto',bpy.context.preferences.addons['cycles'].preferences)
report['blender']=bpy.app.version_string
s.render.filepath=str(out/'01-native-settings.png');bpy.ops.render.render(write_still=True);report['images'].append('01-native-settings.png')
# Adapt source UVs to this pane. The source fluted map has horizontal bands.
# Rotating only UVs is insufficient for a normal map: rotate its tangent XY too.
report['adaptations']=[]
fm=native['fluted'];tree=fm.node_tree
mapping=next(n for n in tree.nodes if n.type=='MAPPING');mapping.inputs['Rotation'].default_value[2]=math.pi/2;mapping.inputs['Scale'].default_value=(1.25,1.875,1)
separate=next(n for n in tree.nodes if n.type=='SEPARATE_COLOR');combine=next(n for n in tree.nodes if n.type=='COMBINE_COLOR');invert_green=next(n for n in tree.nodes if n.type=='INVERT')
invert_red=tree.nodes.new('ShaderNodeInvert');invert_red.inputs['Factor'].default_value=1
for link in list(tree.links):
 if link.to_node==combine and link.to_socket.name in ['Red','Green']:tree.links.remove(link)
tree.links.new(invert_green.outputs['Color'],combine.inputs['Red']);tree.links.new(separate.outputs['Red'],invert_red.inputs['Color']);tree.links.new(invert_red.outputs['Color'],combine.inputs['Green'])
report['adaptations'].append({'material':'fluted','setting':'UV and tangent-normal rotation','degrees':90,'scale':[1.25,1.875,1],'estimatedPitchMm':24})
for n in native['wavy'].node_tree.nodes:
 if n.type=='MAPPING':n.inputs['Scale'].default_value=(.24,.36,1)
 if n.type=='DISPLACEMENT':
  prior=n.inputs['Scale'].default_value;n.inputs['Scale'].default_value=.0006;report['adaptations'].append({'material':'wavy','setting':'virtual bump height scale m; BUMP mode retained','before':prior,'after':.0006})
report['adaptations'].append({'material':'wavy','setting':'UV uses source 1m square physical tile','scale':[.24,.36,1]})
s.render.filepath=str(out/'02-adapted.png');bpy.ops.render.render(write_still=True);report['images'].append('02-adapted.png')
# A second controlled distance clarifies how much apparent distortion depends
# on the background, while keeping old/new conditions identical.
for o in s.objects:
 if o.name.startswith('Backdrop') and o.type=='MESH':
  o.location.y=.36;o.dimensions=(.32,.008,.48)
 if o.name.startswith('Stripe') and o.type=='MESH':
  o.location.y=.35;o.dimensions=(.016,.004,.42)
for row in [0,1]:
 for col in [0,1]:
  x=(col-.5)*.34;bottom=(1-row)*.44
  target=box('Dark-reference-target',(x,.33,bottom+.19),(.16,.012,.14),'273944')
  bevel=target.modifiers.new('Reference rounded corners','BEVEL');bevel.width=.018;bevel.segments=5
s.render.filepath=str(out/'03-distance-reference.png');bpy.ops.render.render(write_still=True);report['images'].append('03-distance-reference.png')
report['backgroundDistanceTestMm']={'firstPair':80,'secondPair':330}
# Keep packed, editable native material nodes in a local engineering file.
bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(out/'free-glass-comparison.blend'))
bpy.data.libraries.write(str(out/'free-glass-materials.blend'),set(native.values()),fake_user=True,compress=True)
for o in new:
 assert all(abs(a-b)<.00001 for a,b in zip(o.dimensions,(.24,.008,.36))),list(o.dimensions)
bpy.ops.wm.open_mainfile(filepath=str(out/'free-glass-comparison.blend'))
assert all(bpy.data.materials['Blendkit-Free-'+k].asset_data for k in ['fluted','wavy'])
report['reopened']=True
(out/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
