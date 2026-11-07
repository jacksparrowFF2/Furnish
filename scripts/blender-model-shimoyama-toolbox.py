"""Scoped author recipe, executed by storage-supply author with its shared helpers.
Labelled envelope 340x240x180mm, 220mm with upright handle. Detail sizes estimated.
"""
def outline(w,d,r):
 pts=[]
 for x,z,a in [(w/2-r,d/2-r,0),(-w/2+r,d/2-r,90),(-w/2+r,-d/2+r,180),(w/2-r,-d/2+r,270)]:
  for j in range(13):
   t=math.radians(a+j*90/12);pts.append((x+r*math.cos(t),z+r*math.sin(t)))
 return pts

def loft(name,rings,m,closed=False):
 verts=[];faces=[];n=52
 for y,w,d,r in rings:verts.extend((x,-z,y) for x,z in outline(w,d,r))
 for k in range(len(rings) if closed else len(rings)-1):
  k2=(k+1)%len(rings)
  for j in range(n):faces.append((k*n+j,k*n+(j+1)%n,k2*n+(j+1)%n,k2*n+j))
 if not closed:faces.extend([tuple(reversed(range(n))),tuple((len(rings)-1)*n+j for j in range(n))])
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);identity(o,name,m)
 for p in mesh.polygons:p.use_smooth=len(p.vertices)==4
 mod=o.modifiers.new('weighted-normals','WEIGHTED_NORMAL');mod.keep_sharp=True;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o

seam=mat('subtle-lid-shadow','c7c6be',.6)
ink=mat('charcoal-sticker','555654',.64)
# Continuous closed wall section: actual open interior below a separate lid.
loft('body',[(0,.296,.196,.020),(.004,.302,.202,.022),(.061,.3113,.2113,.023),(.063,.3135,.2135,.023),(.065,.3135,.2135,.023),(.067,.3123,.2123,.023),(.139,.324,.224,.024),(.145,.326,.226,.025),(.145,.320,.220,.022),(.005,.296,.196,.019)],main)
loft('lid-seam',[(.143,.329,.229,.025),(.146,.330,.230,.025)],seam)
loft('lid',[(.145,.334,.234,.026),(.148,.340,.240,.027),(.154,.340,.240,.027),(.157,.332,.232,.026),(.173,.316,.216,.024),(.180,.302,.202,.021),(.180,.278,.178,.016),(.177,.274,.174,.014)],main)
panel=loft('lid-inset',[(.172,.273,.173,.014),(.1774,.272,.172,.014)],main)
# Real recessed locating well: its bottom is independent of the upright handle.
cutter=box('well-cutter',(.120,.009,.030),(0,.179,0),main,.004)
for target in [panel,bpy.data.objects['lid']]:
 mod=target.modifiers.new('handle-locating-well','BOOLEAN');mod.operation='DIFFERENCE';mod.object=cutter
 bpy.context.view_layer.objects.active=target;bpy.ops.object.modifier_apply(modifier=mod.name)
bpy.data.objects.remove(cutter,do_unlink=True)
# Upright U handle, true opening; shallow feet straddle its locating recess.
# One planar U contour with curved corners, extruded across the depth.
pts=[(-.0545,.177)]
for cx,cy,a in [(-.0445,.210,180),(.0445,.210,90)]:
 for j in range(9):
  t=math.radians(a-j*90/8);pts.append((cx+.010*math.cos(t),cy+.010*math.sin(t)))
pts.extend([(.0545,.177),(.0455,.177)])
for cx,cy,a in [(.0415,.207,0),(-.0415,.207,90)]:
 for j in range(9):
  t=math.radians(a+j*90/8);pts.append((cx+.004*math.cos(t),cy+.004*math.sin(t)))
pts.append((-.0455,.177))
n=len(pts);verts=[(x,-z,y) for z in [-.0065,.0065] for x,y in pts]
faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(j,(j+1)%n,(j+1)%n+n,j+n) for j in range(n)]
mesh=bpy.data.meshes.new('handle');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('handle',mesh);bpy.context.collection.objects.link(o);identity(o,'handle',main)
mod=o.modifiers.new('soft-handle-edges','BEVEL');mod.width=.0007;mod.segments=3;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
merge('handle-pivots',[box('tmp',(.019,.005,.023),(x,.1795,0),main,.002) for x in [-.050,.050]],main)
for sign,tag in [(-1,'left'),(1,'right')]:
 pieces=[box('tmp',(.006,.024,.085),(sign*.167,.140,0),main,.002)]
 for z in [-.040,.040]:pieces.append(box('tmp',(.010,.010,.009),(sign*.163,.127,z),main,.0015))
 merge(tag+'-catch',pieces,main)
for sign,tag in [(-1,'back'),(1,'front')]:
 pieces=[]
 for x in [-.094,0,.094]:
  o=box('tmp',(.003,.057,.002),(x,.035,sign*.104),main,.0005)
  o.rotation_euler.x=sign*math.atan(.011/.14);pieces.append(o)
 merge(tag+'-ribs',pieces,main)
# Hidden removable tray, three compartments per dimension reference; not a cavity exemption.
loft('tray',[(.101,.207,.207,.014),(.104,.215,.215,.016),(.141,.215,.215,.016),(.141,.211,.211,.014),(.105,.203,.203,.012)],main)
merge('tray-dividers',[box('tmp',(.208,.036,.002),(0,.123,0),main,.0005),box('tmp',(.002,.036,.102),(0,.123,.052),main,.0005)],main)
# Recognisable wrench sticker silhouette, no invented lettering. Local front +Z.
pts=[(-.029,.006),(-.034,.014),(-.027,.022),(-.021,.020),(-.025,.014),(-.019,.009),(-.012,.010),(.023,-.010),(.028,-.013),(.027,-.019),(.022,-.022),(.016,-.020),(-.017,-.001),(-.024,-.003)]
verts=[(x,-(.10067+(.101+y)*(.011/.135)+.0002),.101+y) for x,y in pts]
mesh=bpy.data.meshes.new('wrench');mesh.from_pydata(verts,[],[tuple(range(len(pts)))]);mesh.update()
o=bpy.data.objects.new('wrench-mark',mesh);bpy.context.collection.objects.link(o);identity(o,'wrench-mark',ink)
mod=o.modifiers.new('printed-film','SOLIDIFY');mod.thickness=.00012;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
