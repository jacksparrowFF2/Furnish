"""Y00Y06045: six L boards, two backs, five alternating ends, low base."""
import bpy,bmesh,json,pathlib,sys
args=sys.argv[sys.argv.index('--')+1:];out=pathlib.Path(args[0]);out.mkdir(parents=True,exist_ok=True)
spec=json.loads(pathlib.Path(args[args.index('--spec')+1]).read_text())
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC'
mat=bpy.data.materials.new('warm natural oak');mat.use_nodes=True;n=mat.node_tree.nodes.get('Principled BSDF')
def lin(v):
 v=int(v,16)/255;return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
n.inputs['Base Color'].default_value=(*[lin(v) for v in ('c4','9b','70')],1);n.inputs['Roughness'].default_value=.55
for p in spec['parts']:
 w,h,d=[v/1000 for v in p['size']];cx,cy,cz=[v/1000 for v in p['center']]
 poly=[(x/1000,z/1000) for x,z in spec['outline']] if p.get('shape')=='L' else [(-w/2,-d/2),(w/2,-d/2),(w/2,d/2),(-w/2,d/2)]
 N=len(poly);vs=[(x+cx,-(z+cz),y+cy) for y in (-h/2,h/2) for x,z in poly]
 fs=[tuple(reversed(range(N))),tuple(range(N,2*N))]+[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)]
 data=bpy.data.meshes.new(p['name']);data.from_pydata(vs,[],fs);data.update();bm=bmesh.new();bm.from_mesh(data);bmesh.ops.recalc_face_normals(bm,faces=bm.faces);bm.to_mesh(data);bm.free()
 o=bpy.data.objects.new(p['name'],data);bpy.context.collection.objects.link(o);o.data.materials.append(mat);o['furnishStablePart']=spec['prefix']+p['name'];o['furnishRecolor']=True
 bpy.context.view_layer.objects.active=o;o.select_set(True)
 bevel=o.modifiers.new('softened exposed edges','BEVEL');bevel.width=.004;bevel.segments=3;bpy.ops.object.modifier_apply(modifier=bevel.name)
 for face in o.data.polygons:face.use_smooth=True
 normals=o.modifiers.new('weighted board normals','WEIGHTED_NORMAL');normals.keep_sharp=True;bpy.ops.object.modifier_apply(modifier=normals.name);o.select_set(False)
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent/'lib'))
from blender_asset_preflight import from_args as declared_preflight
declared_preflight(bpy.context.scene)
bpy.ops.wm.save_as_mainfile(filepath=str(out/(spec['prefix'].rstrip(':')+'.blend')))
bpy.ops.export_scene.gltf(filepath=str(out/(spec['prefix'].rstrip(':')+'.glb')),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
pathlib.Path(args[args.index('--result')+1]).write_text(json.dumps({'passed':True,'blenderVersion':bpy.app.version_string,'parts':len(spec['parts'])}))
