"""Read back production GLB by furniture ID and stable part key; no live scene."""
import bpy, sys, json, os
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]
source,report=args[:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=os.path.abspath(source))
expected_items={}
if len(args)>2:
    with open(args[2],encoding='utf-8') as inp:
        packet=json.load(inp);ws=packet.get('workspace',packet);work=ws.get('work',{}).get(ws.get('planId'),{});expected_items={f['id']:f for f in work.get('furniture',[])}
groups={}
for obj in bpy.data.objects:
    if obj.type=='MESH' and str(obj.get('furnishPartKey','')).startswith('explicit:garden-v1:'):
        groups.setdefault(obj.get('furnishId'),[]).append(obj)
assert len(groups)==7, len(groups)
results=[]
for fid,objects in groups.items():
    keys=[obj['furnishPartKey'] for obj in objects]
    assert len(keys)==len(set(keys)), (fid,'duplicate identity')
    pts=[obj.matrix_world@Vector(corner) for obj in objects for corner in obj.bound_box]
    size=[(max(p[k] for p in pts)-min(p[k] for p in pts))*1000 for k in range(3)]
    kind=keys[0].split(':')[2]
    expected={'balcony_plant_rack':[1880,550,1600],'plant_clivia':[600,450,650],'plant_spider':[450,450,450],'plant_peperomia':[400,400,500]}[kind]
    if fid in expected_items:
        f=expected_items[fid];expected=[f['d'],f['w'],f['h']] if f.get('rot',0)%180==90 else [f['w'],f['d'],f['h']]
    # Blender bound_box after rotation is conservative for tiny tilted stems.
    assert all(abs(a-b)<2 for a,b in zip(size,expected)), (fid,size,expected)
    for obj in objects:
        assert len(obj.data.vertices)>0
        assert len(obj.material_slots)>0
        assert all(poly.material_index<len(obj.material_slots) for poly in obj.data.polygons)
    if kind=='balcony_plant_rack':
        assert len(objects)==12
        assert sum('post-' in key for key in keys)==6
        assert sum('shelf-' in key for key in keys)==2
    results.append({'id':fid,'type':kind,'meshCount':len(objects),'sizeMm':size,'materialSlots':sum(len(o.material_slots) for o in objects)})
with open(report,'w',encoding='utf-8') as out:
    json.dump({'passed':True,'blenderVersion':bpy.app.version_string,'source':os.path.abspath(source),'groups':results},out,ensure_ascii=False,indent=2)
print('PASS garden production GLB: 7 furniture IDs, stable unique parts, dimensions, mesh/material slots')
