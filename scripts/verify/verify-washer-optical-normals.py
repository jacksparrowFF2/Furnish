"""Actual-source regression: old degenerate pole fails, repaired closed shell passes."""
import bpy,bmesh,json,sys,pathlib
old,new,result=sys.argv[sys.argv.index('--')+1:]
results=[]
for file,valid in [(old,False),(new,True)]:
    bpy.ops.wm.open_mainfile(filepath=str(pathlib.Path(file).resolve()))
    obj=next(o for o in bpy.context.scene.objects if o.get('furnishStablePart')=='washer-tg10k60w-v1:door-glass')
    pole=[v for v in obj.data.vertices if abs(v.co.x)+abs(v.co.z)<1e-8]
    aligned=all(abs(v.normal.y)>.9999 for v in pole)
    assert len(pole)>=2 and aligned==valid,(file,len(pole),aligned)
    bm=bmesh.new();bm.from_mesh(obj.data)
    closed=all(len(e.link_faces)==2 for e in bm.edges)
    if valid:assert closed and len(pole)==2
    bm.free()
    results.append(dict(file=file,expectedValid=valid,poles=len(pole),axisNormals=aligned,closedManifold=closed))
pathlib.Path(result).write_text(json.dumps(dict(passed=True,results=results),indent=2),encoding='utf-8')
print('PASS real v3 negative and v4 optical poles/manifold')
