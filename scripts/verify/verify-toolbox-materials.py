"""Toolbox-only alpha permission: real GLB negatives preserve the last output."""
import bpy, bmesh, sys, pathlib, json, importlib.util, hashlib
args=sys.argv[sys.argv.index('--')+1:]
source=pathlib.Path(args[0]).resolve();out=pathlib.Path(args[1]).resolve();out.mkdir(parents=True,exist_ok=True)
module_path=pathlib.Path(__file__).resolve().parents[1]/'publish-blender-asset.py'
spec=importlib.util.spec_from_file_location('publisher',module_path);publisher=importlib.util.module_from_spec(spec);spec.loader.exec_module(publisher)
target=out/'accepted.js';publisher.publish(source,target,'toolbox-jiabangshou-390');accepted=target.read_bytes()
topology=[]
for obj in bpy.context.scene.objects:
 if obj.type!='MESH':continue
 bm=bmesh.new();bm.from_mesh(obj.data)
 # glTF splits vertices at normal seams; weld a private inspection copy only.
 bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-7)
 assert all(e.is_manifold for e in bm.edges),obj.name+' has open/nonmanifold edges'
 assert all(f.calc_area()>1e-14 for f in bm.faces),obj.name+' has degenerate faces'
 topology.append({'name':obj.name,'closed':True,'faces':len(bm.faces)});bm.free()
results=[]
for name,alpha in [('left-catch',.2),('body',.7)]:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);bpy.ops.import_scene.gltf(filepath=str(source))
 obj=bpy.data.objects[name];obj.data.materials[0]=obj.data.materials[0].copy();m=obj.data.materials[0]
 m.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=alpha;m.surface_render_method='DITHERED'
 bad=out/(name+'-negative.glb');bpy.ops.export_scene.gltf(filepath=str(bad),export_format='GLB',export_extras=True)
 try:publisher.publish(bad,target,'toolbox-jiabangshou-390')
 except ValueError as error:
  assert 'simple alpha' in str(error),str(error)
  assert target.read_bytes()==accepted,'failed publication overwrote accepted output'
  results.append({'name':name,'alpha':alpha,'rejected':True,'error':str(error)})
 else:raise AssertionError('Invalid alpha accepted: '+name)
(out/'result.json').write_text(json.dumps({'passed':True,'blender':bpy.app.version_string,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'topology':topology,'negatives':results},indent=2))
