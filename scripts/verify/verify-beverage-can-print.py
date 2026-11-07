"""Scoped publisher fault tests and production GLB/BLEND label readback."""
import bpy, pathlib, sys, json, runpy, hashlib, struct, base64
from collections import Counter
args=sys.argv[sys.argv.index('--')+1:];mode=args[0];root=pathlib.Path(__file__).resolve().parents[2]
def load(file):
 if str(file).endswith('.blend'):bpy.ops.wm.open_mainfile(filepath=str(file))
 else:
  bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(file))
def pixels(image):return hashlib.sha256(bytes(max(0,min(255,round(v*255))) for v in image.pixels[:])).hexdigest()
if mode=='negative':
 source=pathlib.Path(args[1]);profile=args[2];out=pathlib.Path(args[3]);out.mkdir(parents=True,exist_ok=True);rejected=[]
 def body():return bpy.data.objects['body']
 def missing_uv():
  for layer in list(body().data.uv_layers):body().data.uv_layers.remove(layer)
 def metal_label():bpy.data.objects['lid'].data.materials[0]=body().data.materials[0].copy()
 def resize_image():next(n.image for n in body().data.materials[0].node_tree.nodes if n.type=='TEX_IMAGE').scale(128,128)
 for name,corrupt in [('changed-geometry',lambda:setattr(body().data.vertices[0].co,'x',body().data.vertices[0].co.x+.001)),('missing-uv',missing_uv),('label-on-metal',metal_label),('wrong-image-size',resize_image),('transparent-body',lambda:setattr(body().data.materials[0].node_tree.nodes.get('Principled BSDF').inputs['Alpha'],'default_value',.4))]:
  load(source);corrupt();bad=out/(name+'.glb');bpy.ops.export_scene.gltf(filepath=str(bad),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
  target=out/'previous-valid.js';target.write_text('keep-previous-valid',encoding='utf-8');receipt=out/(name+'.json');sys.argv=['publish','--',str(bad),str(target),'--profile',profile,'--result',str(receipt)]
  try:runpy.run_path(str(root/'scripts/publish-beverage-can-printed.py'),run_name='__main__')
  except Exception:pass
  else:raise AssertionError('Publisher accepted '+name)
  report=json.loads(receipt.read_text(encoding='utf-8'));assert report['passed'] is False;assert target.read_text(encoding='utf-8')=='keep-previous-valid';rejected.append({'case':name,'error':report['error'],'previousPreserved':True})
 (out/'result.json').write_text(json.dumps({'passed':True,'profile':profile,'rejected':rejected,'blender':bpy.app.version_string},indent=2),encoding='utf-8')
elif mode=='readback':
 folder=pathlib.Path(args[1]);output=pathlib.Path(args[2]);results=[];files=sorted(folder.rglob('*.glb'))+sorted(folder.rglob('scene.blend'));expected={}
 for volume in [330,500]:
  script=(root/f'src/data/beverage-can-{volume}-blender-asset.js').read_text(encoding='utf-8');asset=json.loads(script.split('const asset=',1)[1].split(';if(typeof module',1)[0]);raw=base64.b64decode(asset['textures'][0]['rgba']);step=768*4
  flipped=b''.join(raw[y*step:(y+1)*step] for y in range(1023,-1,-1));part=next(p for p in asset['parts'] if p['name']=='body');uv=part['uvs']
  # Three's DataTexture array is written into a top-down PNG; Blender's glTF
  # importer also flips V. Verify both transformations, which cancel visually.
  expected[volume]=(hashlib.sha256(flipped).hexdigest(),Counter((round(uv[i],5),round(1-uv[i+1],5)) for i in range(0,len(uv),2)))
 for file in files:
  load(file);objects=[o for o in bpy.context.scene.objects if str(o.get('furnishPartKey','')).startswith(('explicit:beverage-can-330-v1:','explicit:beverage-can-500-v1:'))]
  if not objects:continue
  count=0;images=set()
  for o in objects:
   key=o['furnishPartKey'];label=key.endswith(':body');assert o.type=='MESH'
   for material in o.data.materials:
    node=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED');links=node.inputs['Base Color'].links
    if label:
     assert len(links)==1 and links[0].from_node.type=='TEX_IMAGE';image=links[0].from_node.image;assert tuple(image.size)==(768,1024);assert o.data.uv_layers.active;assert node.inputs['Alpha'].default_value==1
     volume=330 if '330-v1:' in key else 500
     if image.name not in images:assert pixels(image)==expected[volume][0],(file,key,'texture pixels changed')
     o.data.calc_loop_triangles();actual_uv=Counter((round(o.data.uv_layers.active.data[li].uv.x,5),round(o.data.uv_layers.active.data[li].uv.y,5)) for tri in o.data.loop_triangles for li in tri.loops)
     assert actual_uv==expected[volume][1],(file,key,'paired texture/UV orientation changed');images.add(image.name);count+=1
    else:assert not links,(file,key,'texture leaked to metal')
  assert count;results.append({'file':str(file),'canBodies':count,'parts':len(objects),'images':len(images),'pixelsAndUV':True})
 assert results,'No production can GLBs found';output.write_text(json.dumps({'passed':True,'blender':bpy.app.version_string,'results':results},indent=2),encoding='utf-8')
else:raise ValueError('Unknown verification mode')
