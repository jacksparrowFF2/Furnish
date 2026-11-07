"""Publish only the two reviewed, photo-labelled cans; retain exact v1 triangles.
No extension of the general untextured asset publisher's accepted input.
"""
import bpy, pathlib, sys, json, hashlib, base64, math, struct
from collections import Counter
args=sys.argv[sys.argv.index('--')+1:];source=pathlib.Path(args[0]);target=pathlib.Path(args[1]);profile=args[args.index('--profile')+1];result=pathlib.Path(args[args.index('--result')+1]);root=pathlib.Path(__file__).resolve().parent.parent
def geometry(o):
 o.data.calc_loop_triangles()
 return Counter(tuple(sorted(tuple(round(c,7) for c in o.matrix_world@o.data.vertices[i].co) for i in tri.vertices)) for tri in o.data.loop_triangles)
def load(file):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);bpy.ops.import_scene.gltf(filepath=str(file))
 return {o.name:o for o in bpy.context.scene.objects}
try:
 if profile not in ('beverage-can-330','beverage-can-500'):raise ValueError('Unknown printed can profile')
 spec=json.loads((root/'scripts/lib/storage-supply-specs.json').read_text(encoding='utf-8'))[profile]
 raw=source.read_bytes()
 if len(raw)<20 or raw[:4]!=b'glTF' or struct.unpack_from('<II',raw,4)!=(2,len(raw)):raise ValueError('Invalid GLB')
 length,kind=struct.unpack_from('<II',raw,12)
 if kind!=0x4e4f534a:raise ValueError('Missing GLB JSON')
 doc=json.loads(raw[20:20+length])
 if doc.get('animations') or doc.get('skins') or any(b.get('uri') for b in doc.get('buffers',[])):raise ValueError('Only self-contained static cans')
 if len(doc.get('images',[]))!=1 or len(doc.get('textures',[]))!=1 or any(i.get('uri') or i.get('mimeType')!='image/png' for i in doc['images']):raise ValueError('Expected one embedded PNG label')
 for mesh in doc.get('meshes',[]):
  for p in mesh['primitives']:
   if p.get('mode',4)!=4 or p.get('targets'):raise ValueError('Only static triangle meshes')
 baseline=load(root/'assets/models/storage-supplies'/profile/'v1'/(profile+'-v1.glb'));baseline_geometry={name:geometry(o) for name,o in baseline.items()}
 objects=load(source)
 sys.path.insert(0,str(root/'scripts/lib'));from blender_asset_preflight import check_contract
 contract={'profile':profile,'materialSlots':1,'parts':[{'name':n,'identity':profile+'-v1:'+n} for n in spec['parts']],'motions':[]};check_contract(bpy.context.scene,contract)
 if set(objects)!=set(baseline_geometry):raise ValueError('Can parts changed')
 parts=[];textures=[]
 def srgb(values):
  return '#'+''.join(f'{max(0,min(255,round((12.92*v if v<=.0031308 else 1.055*v**(1/2.4)-.055)*255))):02x}' for v in values[:3])
 for name,o in sorted(objects.items()):
  if o.type!='MESH' or geometry(o)!=baseline_geometry[name]:raise ValueError('Can physical geometry changed: '+name)
  m=o.data;m.calc_loop_triangles();positions=[];normals=[];uvs=[];normal_matrix=o.matrix_world.to_3x3().inverted().transposed()
  for tri in m.loop_triangles:
   for li in tri.loops:
    p=o.matrix_world@m.vertices[m.loops[li].vertex_index].co;n=(normal_matrix@m.corner_normals[li].vector).normalized();positions.extend([round(p.x,7),round(p.z,7),round(-p.y,7)]);normals.extend([n.x,n.z,-n.y])
    if m.uv_layers.active:uvs.extend(m.uv_layers.active.data[li].uv)
  if not all(math.isfinite(v) for v in positions+normals+uvs):raise ValueError('Nonfinite can asset')
  node=next(n for n in o.data.materials[0].node_tree.nodes if n.type=='BSDF_PRINCIPLED')
  if node.inputs['Alpha'].default_value!=1:raise ValueError('Can must be opaque')
  part={'name':name,'identity':profile+'-v1:'+name,'positions':positions,'normals':normals,'recolor':False,'material':{'color':srgb(node.inputs['Base Color'].default_value),'roughness':node.inputs['Roughness'].default_value,'metalness':node.inputs['Metallic'].default_value,'emissive':'#000000','emissiveIntensity':0}}
  linked=[s for s in node.inputs if s.is_linked]
  if name=='body':
   links=node.inputs['Base Color'].links
   if len(linked)!=1 or len(links)!=1 or links[0].from_node.type!='TEX_IMAGE' or not uvs:raise ValueError('Expected image only on can body')
   image=links[0].from_node.image;w,h=image.size
   factors=[m.get('pbrMetallicRoughness',{}).get('baseColorFactor',[1,1,1,1]) for m in doc['materials'] if m.get('pbrMetallicRoughness',{}).get('baseColorTexture') is not None]
   if (w,h)!=(768,1024) or factors!=[[1,1,1,1]]:raise ValueError('Unexpected can label dimensions or tint')
   # An image-connected input's unused Blender default is not its glTF factor.
   part['material']['color']='#ffffff'
   if not .25<=part['material']['roughness']<=.5 or not 0<=part['material']['metalness']<=.5:raise ValueError('Unexpected printed can PBR')
   if len(uvs)!=len(positions)//3*2 or any(v<-.0001 or v>1.1 for v in uvs):raise ValueError('Invalid can UV')
   textures.append({'width':w,'height':h,'rgba':base64.b64encode(bytes(max(0,min(255,round(v*255))) for v in image.pixels[:])).decode()});part.update(uvs=uvs,texture=0)
  elif linked:raise ValueError('Label is not allowed on can metal parts: '+name)
  parts.append(part)
 payload={'format':1,'version':3,'id':profile,'sizeMm':spec['size'],'sourceSha256':hashlib.sha256(raw).hexdigest(),'parts':parts,'textures':textures}
 text='/* Reviewed Snow Refreshing reference print; unchanged can geometry. */\n(function(root){const asset='+json.dumps(payload,separators=(',',':'),allow_nan=False)+';if(typeof module==="object"&&module.exports)module.exports=asset;else root.'+spec['global']+'=asset;})(typeof globalThis!=="undefined"?globalThis:this);\n'
 temp=target.with_suffix('.tmp');temp.write_text(text,encoding='utf-8');temp.replace(target);result.write_text(json.dumps({'passed':True,'parts':len(parts),'textures':len(textures),'geometryUnchanged':True,'blender':bpy.app.version_string}),encoding='utf-8')
except Exception as e:
 result.write_text(json.dumps({'passed':False,'error':str(e)}),encoding='utf-8');raise
