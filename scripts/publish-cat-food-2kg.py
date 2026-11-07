"""Independent, bounded publication of the reference-printed pouch only."""
import bpy, pathlib, sys, json, hashlib, base64, math
args=sys.argv[sys.argv.index('--')+1:];source=pathlib.Path(args[0]);target=pathlib.Path(args[1]);result=pathlib.Path(args[args.index('--result')+1])
try:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);bpy.ops.import_scene.gltf(filepath=str(source))
 sys.path.insert(0,str(pathlib.Path(__file__).parent/'lib'));from blender_asset_preflight import check_contract
 names=['pouch-body','zipper-1','zipper-2'];contract={'profile':'cat-food-2kg','materialSlots':1,'parts':[{'name':n,'identity':'cat-food-2kg-v1:'+n} for n in names],'motions':[]};check_contract(bpy.context.scene,contract)
 parts=[];textures=[]
 for o in sorted(bpy.context.scene.objects,key=lambda o:o.name):
  if o.type!='MESH':raise ValueError('Only static pouch meshes allowed')
  m=o.data;m.calc_loop_triangles();positions=[];normals=[];uvs=[];normal_matrix=o.matrix_world.to_3x3().inverted().transposed()
  for tri in m.loop_triangles:
   for li in tri.loops:
    p=o.matrix_world@m.vertices[m.loops[li].vertex_index].co;n=(normal_matrix@m.corner_normals[li].vector).normalized();positions.extend([round(p.x,7),round(p.z,7),round(-p.y,7)]);normals.extend([n.x,n.z,-n.y])
    if m.uv_layers.active:uvs.extend(m.uv_layers.active.data[li].uv)
  if not all(math.isfinite(v) for v in positions+normals+uvs):raise ValueError('Nonfinite asset')
  node=next(n for n in o.data.materials[0].node_tree.nodes if n.type=='BSDF_PRINCIPLED');part={'name':o.name,'identity':o['furnishStablePart'],'positions':positions,'normals':normals,'recolor':False,'material':{'color':'#ffffff' if o.name=='pouch-body' else '#c0b8c8','roughness':.46,'metalness':0}}
  if o.name=='pouch-body':
   links=node.inputs['Base Color'].links
   if len(links)!=1 or links[0].from_node.type!='TEX_IMAGE' or not uvs:raise ValueError('Expected image-labelled pouch')
   im=links[0].from_node.image;w,h=im.size
   if (w,h)!=(768,768):raise ValueError('Unexpected label dimensions')
   textures.append({'width':w,'height':h,'rgba':base64.b64encode(bytes(max(0,min(255,round(v*255))) for v in im.pixels[:])).decode()});part.update(uvs=uvs,texture=0)
  elif any(s.is_linked for s in node.inputs):raise ValueError('Unexpected zipper texture')
  parts.append(part)
 for k,(low,high) in enumerate([(-.13,.13),(0,.4),(-.06,.06)]):
  vals=[v for p in parts for v in p['positions'][k::3]]
  if max(abs(min(vals)-low),abs(max(vals)-high))>1e-6:raise ValueError('Pouch envelope differs from reference')
 payload={'format':1,'version':2,'id':'cat-food-2kg','sizeMm':[260,400,120],'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'parts':parts,'textures':textures}
 text='/* User reference printed pouch, scoped texture asset. */\n(function(root){const asset='+json.dumps(payload,separators=(',',':'),allow_nan=False)+';if(typeof module==="object"&&module.exports)module.exports=asset;else root.FurnishCatFood2kgAsset=asset;})(typeof globalThis!=="undefined"?globalThis:this);\n'
 temp=target.with_suffix('.tmp');temp.write_text(text,encoding='utf-8');temp.replace(target);result.write_text(json.dumps({'passed':True,'parts':len(parts),'textures':len(textures),'blender':bpy.app.version_string}))
except Exception as e:
 result.write_text(json.dumps({'passed':False,'error':str(e)}));raise
