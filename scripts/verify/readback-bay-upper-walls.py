import bpy,sys,json,os,struct,contextlib,io
from mathutils import Vector
run=sys.argv[sys.argv.index('--')+1];results=[]
for entry in ['desktop','http','file']:
 # Retain the original binary/accessors and world transforms; import only the
 # two selected scene roots from the real production GLB. The importer may still
 # create unused mesh datablocks; only the selected architectural identities count.
 source=os.path.join(run,entry+'.glb');raw=open(source,'rb').read();size=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+size]);indices=[i for i,n in enumerate(gltf['nodes']) if n.get('extras',{}).get('furnishPartKey','').startswith('explicit:bay-upper-wall:')];assert len(indices)==2
 nodes=[gltf['nodes'][i] for i in indices];assert all(not n.get('children') and 'skin' not in n for n in nodes);gltf['nodes']=nodes;gltf['scenes']=[{'nodes':list(range(len(nodes)))}];gltf['scene']=0;gltf.pop('animations',None);gltf.pop('skins',None);data=json.dumps(gltf,separators=(',',':')).encode();data+=b' '*((-len(data))%4);tail=raw[20+size:];selected=os.path.join(run,entry+'-headers.glb')
 with open(selected,'wb') as f:f.write(struct.pack('<III',0x46546c67,2,20+len(data)+len(tail))+struct.pack('<II',len(data),0x4e4f534a)+data+tail)
 bpy.ops.wm.read_factory_settings(use_empty=True)
 with contextlib.redirect_stdout(io.StringIO()):bpy.ops.import_scene.gltf(filepath=selected)
 objs=[o for o in bpy.data.objects if o.type=='MESH' and str(o.get('furnishPartKey','')).startswith('explicit:bay-upper-wall:')];assert len(objs)==2,(entry,len(objs))
 parts=[]
 for o in objs:
  key=o['furnishPartKey'];master='cad_window_11_5' in key;bottom=2295 if master else 2304;expected=sorted([1971,712,405] if master else [1471,718,396]);v=[o.matrix_world@Vector(p) for p in o.bound_box];dims=sorted((max(p[i] for p in v)-min(p[i] for p in v))*1000 for i in range(3));assert all(abs(a-b)<.05 for a,b in zip(dims,expected)),(entry,key,dims)
  assert abs(min(p.z for p in v)*1000-bottom)<.05;assert abs(max(p.z for p in v)*1000-2700)<.05;assert all(s.material for s in o.material_slots);assert all(p.area>0 for p in o.data.polygons)
  parts.append(dict(key=key,dimensionsMm=dims,bottom=bottom,top=2700,materialSlots=len(o.material_slots)))
 results.append(dict(entry=entry,parts=parts))
with open(os.path.join(run,'blender-readback.json'),'w',encoding='utf-8') as f:json.dump(dict(blender=bpy.app.version_string,results=results),f,ensure_ascii=False,indent=2)
print('PASS Blender readback: 3 production entries, 6 header solids, physical dimensions/elevations/material slots and nondegenerate faces')
