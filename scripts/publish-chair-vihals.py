"""Scoped official textured asset publisher. Other product publication is unchanged."""
import bpy,json,pathlib,sys,hashlib,base64,math
args=sys.argv[sys.argv.index('--')+1:];source=pathlib.Path(args[0]);target=pathlib.Path(args[1]);result=pathlib.Path(args[args.index('--result')+1])
try:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);bpy.ops.import_scene.gltf(filepath=str(source))
 contract=json.loads((pathlib.Path(__file__).parent/'lib/chair-vihals-contract.json').read_text())
 sys.path.insert(0,str(pathlib.Path(__file__).parent/'lib'))
 from blender_asset_preflight import check_contract
 check_contract(bpy.context.scene,contract)
 textures=[];image_indices={}
 def image_index(image):
  if image.name in image_indices:return image_indices[image.name]
  w,h=image.size
  if not (0<w<=2048 and 0<h<=2048):raise ValueError('Unexpected official texture dimensions')
  # Keep the full-resolution official GLB/BLEND; bounded offline textures avoid
  # shipping several megabytes of uncompressed mostly-white texels per chair.
  if max(w,h)>512:
   scale=512/max(w,h);image.scale(round(w*scale),round(h*scale));w,h=image.size
  rgba=bytes(max(0,min(255,round(v*255))) for v in image.pixels[:])
  index=len(textures);textures.append({'width':w,'height':h,'rgba':base64.b64encode(rgba).decode()});image_indices[image.name]=index;return index
 parts=[]
 for o in sorted(bpy.context.scene.objects,key=lambda o:o.name):
  if o.type!='MESH':raise ValueError('Official adapter supports deployed static meshes only')
  mesh=o.data;mesh.calc_loop_triangles();uv=mesh.uv_layers.active
  if not uv:raise ValueError('Missing UV '+o.name)
  positions=[];normals=[];uvs=[];normal_matrix=o.matrix_world.to_3x3().inverted().transposed()
  for tri in mesh.loop_triangles:
   for loop in tri.loops:
    p=o.matrix_world@mesh.vertices[mesh.loops[loop].vertex_index].co;n=(normal_matrix@mesh.corner_normals[loop].vector).normalized()
    positions.extend([round(p.x,7),round(p.z,7),round(-p.y,7)]);normals.extend([n.x,n.z,-n.y]);uvs.extend(uv.data[loop].uv)
  if not all(math.isfinite(v) for v in positions+normals+uvs):raise ValueError('Nonfinite mesh')
  material=o.data.materials[0];node=next(n for n in material.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
  def texture_at(socket):
   links=node.inputs[socket].links
   if not links:raise ValueError('Missing official texture '+socket)
   n=links[0].from_node
   if n.type=='SEPARATE_COLOR':n=n.inputs[0].links[0].from_node
   if n.type!='TEX_IMAGE':raise ValueError('Unexpected texture graph')
   return image_index(n.image)
  parts.append({'name':o.name,'identity':o['furnishStablePart'],'recolor':False,'positions':positions,'normals':normals,'uvs':uvs,'texture':texture_at('Base Color'),'ormTexture':texture_at('Roughness'),'material':{'color':'#ffffff','roughness':1,'metalness':1}})
 for k,(low,high) in enumerate([(-.215,.215),(0,.8),(-.235,.235)]):
  values=[v for p in parts for v in p['positions'][k::3]]
  if max(abs(min(values)-low),abs(max(values)-high))>1e-6:raise ValueError('Reference envelope changed')
 payload={'format':1,'version':1,'id':'chair-ikea-vihals','sizeMm':[430,800,470],'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'parts':parts,'textures':textures}
 body=json.dumps(payload,separators=(',',':'),allow_nan=False)
 text='/* Official VIHALS derived asset; see assets/models/chair-vihals/README.md. */\n(function(root){const asset='+body+';if(typeof module==="object"&&module.exports)module.exports=asset;else root.FurnishVihalsBlenderAsset=asset;})(typeof globalThis!=="undefined"?globalThis:this);\n'
 target.parent.mkdir(parents=True,exist_ok=True);temp=target.with_suffix('.tmp');temp.write_text(text,encoding='utf-8');temp.replace(target)
 result.write_text(json.dumps({'passed':True,'parts':len(parts),'textures':len(textures),'blender':bpy.app.version_string}))
except Exception as e:
 result.write_text(json.dumps({'passed':False,'error':str(e)}));raise
