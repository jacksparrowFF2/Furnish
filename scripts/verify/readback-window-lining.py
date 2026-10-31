import bpy,sys,json,os
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:];run=args[0];results=[]
for name in ['desktop','file']:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=os.path.join(run,name+'.glb'))
 objs=[o for o in bpy.data.objects if o.type=='MESH' and str(o.get('furnishPartKey','')).startswith(('explicit:quartz_sill:','explicit:window_surround:'))]
 expected={'left':([25,1475,500] if name=='desktop' else [18,1564,600]), 'right':([25,1475,500] if name=='desktop' else [18,1564,600]), 'top':([2000,25,500] if name=='desktop' else [1800,18,600]), 'slab':[2000,30,500], 'bottom':[1800,18,600]}
 assert len(objs)==4,(name,len(objs))
 assert len({(o.get('furnishId'),o.get('furnishPartKey')) for o in objs})==4
 entries=[]
 for o in objs:
  key=o['furnishPartKey'].split(':')[-1];vs=[o.matrix_world@Vector(v) for v in o.bound_box];dims=[(max(v[i] for v in vs)-min(v[i] for v in vs))*1000 for i in range(3)]
  # glTF Y-up becomes Blender Z-up; compare physical dimensions without assuming room rotation.
  assert all(abs(a-b)<.1 for a,b in zip(sorted(dims),sorted(expected[key]))),(name,key,dims,expected[key])
  elevations=({'slab':(620,650),'left':(650,2125),'right':(650,2125),'top':(2125,2150)} if name=='desktop' else {'left':(638,2202),'right':(638,2202),'top':(2202,2220),'bottom':(620,638)})
  actual=(min(v.z for v in vs)*1000,max(v.z for v in vs)*1000)
  assert all(abs(a-b)<.1 for a,b in zip(actual,elevations[key])),(name,key,actual,elevations[key])
  assert len(o.material_slots)==1 and o.material_slots[0].material
  assert o.data.polygons and all(p.area>0 for p in o.data.polygons)
  entries.append(dict(fid=o['furnishId'],key=o['furnishPartKey'],dimensionsMm=dims,elevationsMm=actual,materials=[s.material.name for s in o.material_slots]))
 results.append(dict(entry=name,parts=entries,status='passed'))
print('PASS production HTTP/file GLB Blender readback: 8 boards, stable owner+part identities, dimensions, nondegenerate faces and object material slots')
with open(os.path.join(run,'blender-readback.json'),'w',encoding='utf-8') as f:json.dump(dict(blender=bpy.app.version_string,results=results),f,ensure_ascii=False,indent=2)
