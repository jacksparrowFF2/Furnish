import bpy,sys,json,struct,hashlib
from pathlib import Path
from mathutils import Matrix,Vector
source=Path(sys.argv[sys.argv.index('--')+1]);out=Path(sys.argv[-1]);raw=source.read_bytes();length=struct.unpack_from('<I',raw,12)[0];g=json.loads(raw[20:20+length]);expected={}
def visit(i,parent):
 n=g['nodes'][i]
 if 'matrix' in n:m=Matrix([n['matrix'][i:i+4] for i in range(0,16,4)]).transposed()
 else:
  from mathutils import Quaternion
  q=n.get('rotation',[0,0,0,1]);m=Matrix.LocRotScale(Vector(n.get('translation',[0,0,0])),Quaternion((q[3],q[0],q[1],q[2])),Vector(n.get('scale',[1,1,1])))
 world=parent@m
 if 'mesh' in n and n.get('extras',{}).get('furnishId')=='fmv9dos7j1':
  ex=n.get('extras',{});key=(ex.get('furnishId'),ex.get('furnishPartKey'));points=[]
  for p in g['meshes'][n['mesh']]['primitives']:
   a=g['accessors'][p['attributes']['POSITION']]
   for x in [a['min'][0],a['max'][0]]:
    for y in [a['min'][1],a['max'][1]]:
     for z in [a['min'][2],a['max'][2]]:
      v=world@Vector((x,y,z));points.append((v.x,-v.z,v.y))
  assert all(key),key
  assert key not in expected,key
  expected[key]=([min(p[i] for p in points) for i in range(3)],[max(p[i] for p in points) for i in range(3)])
 for child in n.get('children',[]):visit(child,world)
for i in g['scenes'][g.get('scene',0)]['nodes']:visit(i,Matrix.Identity(4))
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(source));actual={}
for o in bpy.data.objects:
 if o.type!='MESH' or o.get('furnishId')!='fmv9dos7j1':continue
 key=(o.get('furnishId'),o.get('furnishPartKey'));assert key in expected,key;assert key not in actual,key
 points=[o.matrix_world@v.co for v in o.data.vertices];actual[key]=([min(p[i] for p in points) for i in range(3)],[max(p[i] for p in points) for i in range(3)])
 assert all(len(poly.vertices)>=3 and poly.area>1e-15 for poly in o.data.polygons),o.name
assert actual.keys()==expected.keys(),(len(actual),len(expected))
error=max(abs(actual[k][j][i]-expected[k][j][i])*1000 for k in expected for j in [0,1] for i in range(3));assert error<.05,error
report={'passed':True,'blender':bpy.app.version_string,'source':str(source),'sha256':hashlib.sha256(raw).hexdigest(),'parts':len(actual),'uniqueFurniturePartIdentity':True,'maxBoundsErrorMm':error,'nondegenerateImportedFaces':True}
out.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(report,ensure_ascii=False))
