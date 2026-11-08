"""Independent bounded GLB import/publication; clothing profiles only."""
import bpy,bmesh,pathlib,sys,json,hashlib,base64,math
root=pathlib.Path(__file__).resolve().parent.parent;specs=json.loads((root/'scripts/lib/garment-photo-specs.json').read_text(encoding='utf-8'))
args=sys.argv[sys.argv.index('--')+1:];profile=args[0];source=pathlib.Path(args[1]);target=pathlib.Path(args[2]);s=specs[profile]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);bpy.ops.import_scene.gltf(filepath=str(source))
objects=sorted(bpy.context.scene.objects,key=lambda o:o.name);names=['body','hanger-hook']
if sorted(o.name for o in objects)!=names:raise ValueError('Unexpected garment objects')
parts=[];textures=[];images={}
for o in objects:
 if o.type!='MESH' or len(o.data.materials)!=1 or o.get('furnishStablePart')!=profile+'-v1:'+o.name:raise ValueError('Unexpected garment identity/material slots')
 mesh=o.data;bm=bmesh.new();bm.from_mesh(mesh)
 # GLB deliberately splits normals/UV seams. Weld a disposable topology copy,
 # without changing the imported production mesh or its texture coordinates.
 bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
 if any(not e.is_manifold for e in bm.edges) or any(f.calc_area()<1e-12 for f in bm.faces):raise ValueError('Open/degenerate published garment')
 bm.free();mesh.calc_loop_triangles();pos=[];norm=[];uv=[];nm=o.matrix_world.to_3x3().inverted().transposed()
 for tri in mesh.loop_triangles:
  for li in tri.loops:
   p=o.matrix_world@mesh.vertices[mesh.loops[li].vertex_index].co;n=(nm@mesh.corner_normals[li].vector).normalized();pos.extend([round(p.x,7),round(p.z,7),round(-p.y,7)]);norm.extend([n.x,n.z,-n.y])
   if mesh.uv_layers.active:uv.extend(mesh.uv_layers.active.data[li].uv)
 if not all(math.isfinite(v) for v in pos+norm+uv):raise ValueError('Nonfinite garment')
 mat=o.data.materials[0];bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 part={'name':o.name,'identity':o['furnishStablePart'],'positions':pos,'normals':norm,'recolor':False,'material':{'color':'#ffffff' if o.name!='hanger-hook' else '#999ca0','roughness':.95 if o.name!='hanger-hook' else .3,'metalness':0 if o.name!='hanger-hook' else .7}}
 links=bs.inputs['Base Color'].links
 if o.name!='hanger-hook':
  if len(links)!=1 or links[0].from_node.type!='TEX_IMAGE' or not uv:raise ValueError('Missing photo UVs')
  im=links[0].from_node.image;w,h=im.size
  if max(w,h)>512:raise ValueError('Garment texture exceeds profile bounds')
  rgba=bytes(max(0,min(255,round(v*255))) for v in im.pixels[:]);key=hashlib.sha256(rgba).hexdigest()
  if key not in images:images[key]=len(textures);textures.append({'width':w,'height':h,'rgba':base64.b64encode(rgba).decode()})
  part.update(uvs=uv,texture=images[key])
 elif links:raise ValueError('Photo leaked to hook')
 parts.append(part)
for k,(lo,hi) in enumerate([(-s['size'][0]/2000,s['size'][0]/2000),(0,s['size'][1]/1000),(-s['size'][2]/2000,s['size'][2]/2000)]):
 vals=[v for p in parts for v in p['positions'][k::3]]
 if max(abs(min(vals)-lo),abs(max(vals)-hi))>1e-6:raise ValueError('Garment dimensions differ')
asset={'format':1,'id':profile,'version':1,'sizeMm':s['size'],'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'parts':parts,'textures':textures}
script='/* Photo garment: closed silhouette, original photo UV, simplified reverse. */\n(function(root){const asset='+json.dumps(asset,separators=(',',':'))+';if(typeof module==="object"&&module.exports)module.exports=asset;else root.'+s['global']+'=asset;})(typeof globalThis!=="undefined"?globalThis:this);\n'
target.parent.mkdir(parents=True,exist_ok=True);target.write_text(script,encoding='utf8')
(source.parent/'publish.json').write_text(json.dumps({'passed':True,'profile':profile,'parts':len(parts),'textures':len(textures),'blender':bpy.app.version_string,'sourceSha256':asset['sourceSha256']},indent=2),encoding='utf8')
