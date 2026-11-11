"""Independent, fail-closed import validation of the G12 faceplate bundle."""
import bpy, hashlib, json, math, pathlib, struct, sys
ROOT=pathlib.Path(__file__).resolve().parent.parent
args=sys.argv[sys.argv.index('--')+1:];source=pathlib.Path(args[0]);target=pathlib.Path(args[1])
keys=list(json.loads(pathlib.Path(args[2]).read_text(encoding='utf8')))
def srgb(v):
 return round(255*max(0,min(1,12.92*v if v<=.0031308 else 1.055*v**(1/2.4)-.055)))
def color(v):return '#'+''.join('%02x'%srgb(n) for n in v[:3])
def xyz(v):return [v.x,v.z,-v.y]
variants={};report=[]
for key in keys:
 glb=source.parent/(key+'.glb');raw=glb.read_bytes()
 if raw[:4]!=b'glTF' or struct.unpack_from('<II',raw,4)!=(2,len(raw)):raise ValueError('Bad GLB')
 n,kind=struct.unpack_from('<II',raw,12);doc=json.loads(raw[20:20+n])
 if kind!=0x4e4f534a or any(doc.get(k) for k in ('animations','skins','textures','images')):raise ValueError('Unsupported asset features')
 if any(b.get('uri') for b in doc.get('buffers',[])):raise ValueError('External buffer')
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 bpy.ops.import_scene.gltf(filepath=str(glb));parts=[];identities=set()
 for o in sorted(bpy.context.scene.objects,key=lambda o:o.name):
  if o.type!='MESH' or not o.name.startswith(key+':'):raise ValueError('Unexpected part')
  identity=o.get('furnishStablePart')
  if identity!='panel-bull-g12:'+o.name or identity in identities:raise ValueError('Part identity')
  identities.add(identity)
  if len(o.data.materials)!=1:raise ValueError('One material per part required: '+key+'/'+o.name)
  material=o.data.materials[0];bsdf=material.node_tree.nodes.get('Principled BSDF')
  if not bsdf or any(s.is_linked for s in bsdf.inputs) or bsdf.inputs['Alpha'].default_value!=1:raise ValueError('Opaque PBR only')
  if not 0<=bsdf.inputs['Roughness'].default_value<=1:raise ValueError('Roughness')
  o.data.calc_loop_triangles();positions=[];normals=[]
  for tri in o.data.loop_triangles:
   vs=[o.matrix_world@o.data.vertices[i].co for i in tri.vertices]
   if (vs[1]-vs[0]).cross(vs[2]-vs[0]).length<1e-15:raise ValueError('Degenerate triangle: '+key+'/'+o.name)
   for i in tri.vertices:
    positions.extend(round(v,8) for v in xyz(o.matrix_world@o.data.vertices[i].co))
    normals.extend(xyz((o.matrix_world.to_3x3().inverted().transposed()@tri.normal).normalized()))
  if not positions or not all(math.isfinite(v) for v in positions+normals):raise ValueError('Invalid geometry')
  parts.append(dict(name=o.name.split(':',1)[1],identity=identity,positions=positions,normals=normals,recolor=bool(o.get('furnishRecolor')),material=dict(color=color(bsdf.inputs['Base Color'].default_value),roughness=bsdf.inputs['Roughness'].default_value,metalness=bsdf.inputs['Metallic'].default_value)))
 names={p['name'] for p in parts}
 if not {'rear-plate','face'}<=names:raise ValueError('Missing shell')
 if key.startswith('switch') and not {f'rocker-{i+1}' for i in range(int(key[6]))}<=names:raise ValueError('Missing rocker')
 if key.startswith('socket') and not any(n.startswith('shutter-') for n in names):raise ValueError('Missing recessed holes')
 for axis,(lo,hi) in enumerate(((-.043,.043),(0,.086),(-.005,.005))):
  values=[v for p in parts for v in p['positions'][axis::3]]
  if abs(min(values)-lo)>1e-6 or abs(max(values)-hi)>2e-5:raise ValueError('Wrong faceplate dimensions/origin: '+key+':'+str(axis)+':'+str((min(values),max(values))))
 variants[key]=dict(format=1,version=1,id='panel-bull-g12:'+key,sizeMm=[86,86,10],sourceSha256=hashlib.sha256(raw).hexdigest(),parts=parts)
 report.append(dict(variant=key,parts=len(parts),sourceSha256=variants[key]['sourceSha256']))
payload={**variants['socket5-diagonal'], 'id':'panel-bull-g12','variants':variants}
payload['authorParts']=[dict(name=k+':'+p['name'],identity=p['identity']) for k,a in variants.items() for p in a['parts']]
# Replace only after every variant has passed. Failure leaves prior runtime intact.
body=json.dumps(payload,separators=(',',':'),ensure_ascii=False)
target.write_text("/* Independently imported Blender assets; do not hand edit. */\n(function(r){const a="+body+";if(typeof module==='object'&&module.exports)module.exports=a;else r.FurnishPanelBullG12Asset=a;})(typeof globalThis!=='undefined'?globalThis:this);\n",encoding='utf8')
(source.parent/'publish.json').write_text(json.dumps(dict(passed=True,variants=report),indent=2),encoding='utf8')
print('PANEL_PUBLISH_OK',len(variants))
