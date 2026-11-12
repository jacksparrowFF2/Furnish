"""Current 77cm RÅSKOG: scoped recipe in storage-supply's metre helpers.
Only the 350x450x770 outside size is labelled; local sections are photo estimates.
Basket walls/lips, expanded-mesh floors and caster assemblies are real geometry.
"""
rubber=mat('black-wheel-polymer','252724',.68)
hub=mat('wheel-hub','777c77',.38,.65)
main.node_tree.nodes.get('Principled BSDF').inputs['Roughness'].default_value=.43

def mesh_part(name,verts,faces,m):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
 return identity(o,name,m)

def pipe(name,points,r,m):
 curve=bpy.data.curves.new(name,'CURVE');curve.dimensions='3D'
 curve.bevel_depth=r;curve.bevel_resolution=3;curve.resolution_u=2;curve.use_fill_caps=True
 line=curve.splines.new('POLY');line.points.add(len(points)-1)
 for v,p in zip(line.points,points):v.co=(p[0],-p[2],p[1],1)
 o=bpy.data.objects.new(name,curve);bpy.context.collection.objects.link(o)
 bpy.context.view_layer.objects.active=o;bpy.ops.object.select_all(action='DESELECT');o.select_set(True)
 bpy.ops.object.convert(target='MESH');o=bpy.context.object
 for f in o.data.polygons:f.use_smooth=True
 return identity(o,name,m)

def cyl(name,r,depth,center,axis,m,N=32):
 rotation=Vector((axis[0],-axis[2],axis[1])).to_track_quat('Z','Y').to_euler()
 bpy.ops.mesh.primitive_cylinder_add(vertices=N,radius=r,depth=depth,location=(center[0],-center[2],center[1]),rotation=rotation)
 o=bpy.context.object;identity(o,name,m)
 bevel=o.modifiers.new('edge-round','BEVEL');bevel.width=.0008;bevel.segments=2
 bpy.ops.object.modifier_apply(modifier=bevel.name)
 for f in o.data.polygons:f.use_smooth=len(f.vertices)==4
 return o

def rr_segments(w,d,r):
 # Eight physical sides/arcs, counterclockwise in the X/depth plane.
 segments=[]
 corners=[(w/2-r,d/2-r,0),(-w/2+r,d/2-r,90),(-w/2+r,-d/2+r,180),(w/2-r,-d/2+r,270)]
 for j,(x,z,a) in enumerate(corners):
  arc=[(x+r*math.cos(math.radians(a+k*90/12)),z+r*math.sin(math.radians(a+k*90/12))) for k in range(13)]
  segments.append(arc)
  nx,nz,na=corners[(j+1)%4]
  segments.append([arc[-1],(nx+r*math.cos(math.radians(na)),nz+r*math.sin(math.radians(na)))])
 return segments

for level,top in enumerate([.260,.515,.770],1):
 bottom=top-.080;prefix='basket-'+str(level)
 # Thin open steel wall, rolled lip and lower turn. Each physical side is a
 # separate stable solid, avoiding a convex hull across the entire open basket.
 rings=[(bottom,.302,.412,.025),(bottom+.003,.310,.420,.027),
        (top-.004,.320,.430,.029),(top-.002,.323,.433,.0305),
        (top,.321,.431,.0295),(top,.318,.428,.028),
        (top-.004,.318,.428,.028),(bottom+.003,.308,.418,.026)]
 for section in range(8):
  verts=[];faces=[]
  for y,w,d,r in rings:verts.extend((x,-z,y) for x,z in rr_segments(w,d,r)[section])
  n=len(verts)//len(rings)
  for band in range(len(rings)):
   for j in range(n-1):faces.append((band*n+j,band*n+j+1,((band+1)%len(rings))*n+j+1,((band+1)%len(rings))*n+j))
  faces.extend([tuple(k*n for k in reversed(range(len(rings)))),tuple(k*n+n-1 for k in range(len(rings)))])
  o=mesh_part(prefix+'-wall-'+str(section+1),verts,faces,main)
  for f in o.data.polygons:f.use_smooth=section%2==0
 # Expanded steel sampled as diagonal ribbons. Real openings are preserved;
 # 9mm pitch is an authored sample, not a manufacturer hole count.
 grid=[]
 def inside(x,z):
  qx=max(abs(x)-(.150-.024),0);qz=max(abs(z)-(.205-.024),0)
  return qx*qx+qz*qz<=.024**2 and abs(x)<=.150 and abs(z)<=.205
 for direction in [-1,1]:
  for line in range(-39,40):
   c=line*.009;points=[]
   for step in range(301):
    x=-.150+step*.001;z=direction*x+c
    if inside(x,z):points.append((x,bottom+.001,z))
   if len(points)<2:continue
   a,b=Vector(points[0]),Vector(points[-1]);delta=b-a
   p=box('grid-temporary',(delta.length,.0008,.0011),tuple((a+b)/2),main,0)
   # Box long X follows line in the horizontal plane.
   p.rotation_euler.z=-math.atan2(delta.z,delta.x);grid.append(p)
 merge(prefix+'-mesh-floor',grid,main)
 for side,tag in [(-1,'back'),(1,'front')]:
  parts=[box('clamp-temp',(.069,.060,.0025),(0,top-.040,side*.220),main,.001)]
  for x in [-.029,.029]:
   parts.append(cyl('clamp-temp',.012,.060,(x,top-.040,side*.210),(0,1,0),main))
  merge(prefix+'-'+tag+'-clamp',parts,main)
  cyl(prefix+'-'+tag+'-bolt',.005,.002,(0,top-.041,side*.224),(0,0,1),hub,24)

# Four close-paired vertical steel tubes, matching the current screw-on design.
for side,tag in [(-1,'back'),(1,'front')]:
 for x,lr in [(-.029,'left'),(.029,'right')]:
  cyl('upright-'+tag+'-'+lr,.010,.638,(x,.449,side*.210),(0,1,0),main)

# Two opposed U base tubes. Smooth bends are sampled in their physical planes.
for sign,tag in [(-1,'left'),(1,'right')]:
 pts=[(sign*.029,.160,-.210),(sign*.029,.130,-.210)]
 for k in range(1,13):
  t=k*math.pi/24;pts.append((sign*(.059-.030*math.cos(t)),.130-.030*math.sin(t),-.210))
 pts.append((sign*.140,.100,-.210))
 for k in range(1,13):
  t=k*math.pi/24;pts.append((sign*(.140+.025*math.sin(t)),.100,-.185-.025*math.cos(t)))
 pts.append((sign*.165,.100,.185))
 for k in range(1,13):
  t=k*math.pi/24;pts.append((sign*(.140+.025*math.cos(t)),.100,.185+.025*math.sin(t)))
 pts.append((sign*.059,.100,.210))
 for k in range(1,13):
  t=k*math.pi/24;pts.append((sign*(.059-.030*math.sin(t)),.130-.030*math.cos(t),.210))
 pts.append((sign*.029,.160,.210));base=pipe('base-'+tag,pts,.010,main)
 # The sampled sweep is slightly inscribed. Fit this estimated base rail to
 # the labelled 350mm overall width using actual vertices, not object AABBs.
 lateral=max(abs(v.co.x) for v in base.data.vertices)
 for v in base.data.vertices:v.co.x*=.175/lateral

# Four casters, two brakes. Static forward orientation; no wheel sweep claimed.
for x,lr in [(-.153,'left'),(.153,'right')]:
 for z,fb in [(-.178,'back'),(.178,'front')]:
  name='caster-'+fb+'-'+lr
  cyl(name+'-tire',.026,.014,(x,.026,z),(1,0,0),rubber,40)
  cyl(name+'-hub',.019,.015,(x,.026,z),(1,0,0),hub,40)
  forks=[]
  for dx in [-.010,.010]:
   forks.append(box('fork-temp',(.0025,.042,.019),(x+dx,.047,z-.010),silver,.004))
   forks.append(cyl('fork-temp',.006,.003,(x+dx,.026,z),(1,0,0),silver,24))
  forks.append(box('fork-temp',(.023,.003,.022),(x,.069,z-.013),silver,.002))
  merge(name+'-fork',forks,silver)
  cyl(name+'-swivel',.016,.013,(x,.079,z-.013),(0,1,0),silver)
  cyl(name+'-stem',.004,.012,(x,.090,z-.013),(0,1,0),hub,20)
  if fb=='front':
   pedal=box(name+'-brake',(.013,.003,.041),(x,.054,z+.009),hub,.001)
   pedal.rotation_euler.x=math.radians(-32)
