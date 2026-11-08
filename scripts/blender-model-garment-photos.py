"""Photo UVs on a closed garment silhouette and independent reference hook.
Reference pixels remain untouched. Rear and edges use a constant fabric sample.
"""
import bpy, bmesh, sys, json, pathlib, math
from mathutils import Vector
from mathutils.geometry import tessellate_polygon
root=pathlib.Path(__file__).resolve().parent.parent
specs=json.loads((root/'scripts/lib/garment-photo-specs.json').read_text(encoding='utf-8'))
args=sys.argv[sys.argv.index('--')+1:]; profile=args[0]; out=pathlib.Path(args[1]);out.mkdir(parents=True,exist_ok=True);s=specs[profile]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
im=bpy.data.images.load(str(root/'assets/models'/profile/'references/front.jpg'));im.pack()
# Analyse the unchanged source image to trace its outer silhouette. Only mesh
# vertices are produced; no cutout/repainted raster is saved or substituted.
cutout=root/'assets/models'/profile/'references/cutout-bg0.png'
outline=bpy.data.images.load(str(cutout)) if cutout.exists() else im
iw,ih=outline.size;px=list(outline.pixels[:]);mask=set()
for yy in range(ih):
 for xx in range(iw):
  k=((ih-1-yy)*iw+xx)*4;r,g,b=px[k:k+3]
  foreground=px[k+3]>.80 if cutout.exists() else (max(r,g,b)<.40 if profile!='garment-autumn-jacket' else (r>g*1.06 and g>b*1.04 or max(r,g,b)<.28))
  if foreground:mask.add((xx,yy))
largest=set()
while mask:
 seed=mask.pop();group={seed};todo=[seed]
 while todo:
  x,y=todo.pop()
  for p in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
   if p in mask:mask.remove(p);group.add(p);todo.append(p)
 if len(group)>len(largest):largest=group
edges={}
for x,y in largest:
 for neighbour,a,b in [((x,y-1),(x,y),(x+1,y)),((x+1,y),(x+1,y),(x+1,y+1)),((x,y+1),(x+1,y+1),(x,y+1)),((x-1,y),(x,y+1),(x,y))]:
  if neighbour not in largest:edges.setdefault(a,[]).append(b)
loops=[]
while edges:
 start=next(iter(edges));p=start;loop=[]
 while p in edges:
  loop.append(p);q=edges[p].pop()
  if not edges[p]:del edges[p]
  p=q
  if p==start:break
 if p==start and len(loop)>3:loops.append(loop)
poly=max(loops,key=len)
def area(points):return abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(points,points[1:]+points[:1])))
while len(set(poly))<len(poly):
 seen={}
 for j,p in enumerate(poly):
  if p in seen:
   i=seen[p];one=poly[i:j];two=poly[j:]+poly[:i];poly=one if area(one)>area(two) else two;break
  seen[p]=j
def simplify(points,tol):
 if len(points)<3:return points
 a,b=points[0],points[-1];dx=b[0]-a[0];dy=b[1]-a[1];den=math.hypot(dx,dy)
 distances=[abs(dy*(p[0]-a[0])-dx*(p[1]-a[1]))/den if den else math.dist(p,a) for p in points]
 i=max(range(len(points)),key=lambda j:distances[j])
 if distances[i]<=tol:return [a,b]
 return simplify(points[:i+1],tol)[:-1]+simplify(points[i:],tol)
split=max(range(len(poly)),key=lambda i:math.dist(poly[0],poly[i]));poly=simplify(poly[:split+1],2.5)[:-1]+simplify(poly[split:]+[poly[0]],2.5)[:-1]
# Remove collinear raster corners before triangulation; keep all real bends.
changed=True
while changed:
 changed=False;clean=[]
 for i,p in enumerate(poly):
  a,b=poly[i-1],poly[(i+1)%len(poly)];cross=(p[0]-a[0])*(b[1]-p[1])-(p[1]-a[1])*(b[0]-p[0])
  if abs(cross)<1e-8:changed=True
  else:clean.append(p)
 poly=clean
s['parts']={'body':[(x*s['imageSize'][0]/iw,y*s['imageSize'][1]/ih) for x,y in poly]}
(out/'silhouette.json').write_text(json.dumps({'method':'BG0 alpha contour' if cutout.exists() else 'largest connected fabric component; source pixels unchanged','points':s['parts']['body'],'textureSize':[iw,ih]}))
mat=bpy.data.materials.new('photo-fabric');mat.use_nodes=True
bs=next(n for n in mat.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Roughness'].default_value=.95
tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
w,h,d=[v/1000 for v in s['size']];points=[p for pp in s['parts'].values() for p in pp];minx=min(p[0] for p in points);maxx=max(p[0] for p in points);miny=min(p[1] for p in points);maxy=max(p[1] for p in points)
cloth_h=h-.09;sw,sh=s['imageSize'];objects=[]
for name,poly in s['parts'].items():
 n=len(poly);verts=[]
 for side in [1,-1]:
  for x,y in poly:verts.append(((x-(minx+maxx)/2)/(maxx-minx)*w,-side*d/2,(maxy-y)/(maxy-miny)*cloth_h))
 vv=[Vector((x,y,0)) for x,y in poly];tris=tessellate_polygon([vv]);lookup={(v.x,v.y):i for i,v in enumerate(vv)};faces=[];front=[]
 for tri in tris:
  ids=tuple(v if isinstance(v,int) else lookup[(v.x,v.y)] for v in tri);faces.append(ids);front.append(True)
 for tri in tris:
  ids=tuple((v if isinstance(v,int) else lookup[(v.x,v.y)])+n for v in tri[::-1]);faces.append(ids);front.append(False)
 for i in range(n):faces.append((i,(i+1)%n,(i+1)%n+n,i+n));front.append(False)
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();uv=mesh.uv_layers.new(name='unaltered-source-photo')
 for pi,p in enumerate(mesh.polygons):
  for li in p.loop_indices:
   vi=mesh.loops[li].vertex_index%n;x,y=poly[vi]
   uv.data[li].uv=(x/sw,1-y/sh) if front[pi] else (.50,.47)
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.data.materials.append(mat);objects.append(o)
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
# A visible hook above the hood/collar, behind the printed front. Layout reference,
# not a certified hanger/rail fit. Rigid and independent of fabric thickness.
metal=bpy.data.materials.new('hanger-metal');metal.diffuse_color=(.32,.34,.36,1);metal.use_nodes=True
bs=next(n for n in metal.node_tree.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Base Color'].default_value=(.32,.34,.36,1);bs.inputs['Metallic'].default_value=.7;bs.inputs['Roughness'].default_value=.3
curve=bpy.data.curves.new('hanger-hook','CURVE');curve.dimensions='3D';curve.bevel_depth=.0025;curve.bevel_resolution=2;curve.resolution_u=1;curve.use_fill_caps=True
pts=[(0,0,cloth_h-.025),(0,0,cloth_h+.025)]+[(.024*math.cos(a),0,cloth_h+.063+.024*math.sin(a)) for a in [(-math.pi/2)+i*(math.pi*1.65)/24 for i in range(25)]]
sp=curve.splines.new('POLY');sp.points.add(len(pts)-1)
for p,v in zip(sp.points,pts):p.co=(*v,1)
hook=bpy.data.objects.new('hanger-hook',curve);bpy.context.collection.objects.link(hook);hook.data.materials.append(metal);bpy.context.view_layer.objects.active=hook;hook.select_set(True);bpy.ops.object.convert(target='MESH');hook=bpy.context.object
bm=bmesh.new();bm.from_mesh(hook.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(hook.data);bm.free();objects.append(hook)
# Normalize all three axes once; dimensions are the entire garment+hook envelope.
mins=[min(v.co[k] for o in objects for v in o.data.vertices) for k in range(3)];maxs=[max(v.co[k] for o in objects for v in o.data.vertices) for k in range(3)]
for o in objects:
 for v in o.data.vertices:
  v.co.x=(v.co.x-(mins[0]+maxs[0])/2)*w/(maxs[0]-mins[0]);v.co.y=(v.co.y-(mins[1]+maxs[1])/2)*d/(maxs[1]-mins[1]);v.co.z=(v.co.z-mins[2])*h/(maxs[2]-mins[2])
 o['furnishStablePart']=profile+'-v1:'+o.name
 bpy.context.view_layer.objects.active=o;o.select_set(True)
mesh_objects=[o for o in scene.objects if o.type=='MESH']
for o in mesh_objects:
 bm=bmesh.new();bm.from_mesh(o.data)
 if any(not e.is_manifold for e in bm.edges):raise ValueError('Open clothing prism: '+o.name)
 if any(f.calc_area()<1e-12 for f in bm.faces):raise ValueError('Degenerate face: '+o.name)
 bm.free()
scene['garment-reference-basis']=s['basis'];scene['back-photo-available']=False
bpy.ops.wm.save_as_mainfile(filepath=str(out/(profile+'-v1.blend')))
bpy.ops.object.select_all(action='SELECT');bpy.ops.export_scene.gltf(filepath=str(out/(profile+'-v1.glb')),export_format='GLB',use_selection=True,export_extras=True)
(out/'author.json').write_text(json.dumps({'passed':True,'profile':profile,'parts':[o.name for o in objects],'blender':bpy.app.version_string,'basis':s['basis']},ensure_ascii=False,indent=2),encoding='utf-8')
