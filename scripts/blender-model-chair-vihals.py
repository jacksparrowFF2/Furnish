"""Import the archived official VIHALS GLB, retain texture/UV, fit layout envelope.
Endpoint roles retain official geometry. Folding axes are layout estimates.
"""
import bpy,bmesh,pathlib,sys,json,hashlib
out=pathlib.Path(sys.argv[sys.argv.index('--')+1]).resolve();out.mkdir(parents=True,exist_ok=True)
source=pathlib.Path(__file__).resolve().parent.parent/'assets/models/chair-vihals/references/official-90592738.glb'
if hashlib.sha256(source.read_bytes()).hexdigest()!='79ce0e59c4c8690faf767d0d175c9613277eccced149e0f81577bc7423858b71':raise ValueError('Official source changed; re-review the source part mapping')
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC'
bpy.ops.import_scene.gltf(filepath=str(source))
obj=next(o for o in bpy.context.scene.objects if o.type=='MESH');base=obj.name
bpy.context.view_layer.objects.active=obj;obj.select_set(True)
# The official mini model duplicates vertices at UV seams. Weld only coincident
# coordinates (0.01 mm) to identify its physical disconnected components; UV loops remain.
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.remove_doubles(threshold=.00001);bpy.ops.mesh.separate(type='LOOSE');bpy.ops.object.mode_set(mode='OBJECT')
names=['rear-frame','seat-pin-left','seat-underside','upper-pin-right','upper-pin-left','back-pin-right','back-pin-left','main-frame','seat-axle-left','seat-axle-right','latch-right','hinge-right','hinge-left','backrest','seat-top']
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if len(meshes)!=len(names):raise ValueError('Official component set changed')
pts=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
lo=[min(p[k] for p in pts) for k in range(3)];hi=[max(p[k] for p in pts) for k in range(3)]
for o in meshes:
 index=0 if o.name==base else int(o.name.rsplit('.',1)[1]);name=names[index]
 matrix=o.matrix_world.copy()
 for v in o.data.vertices:
  p=matrix@v.co;v.co=((p.x-(lo[0]+hi[0])/2)*.430/(hi[0]-lo[0]),(p.y-(lo[1]+hi[1])/2)*.470/(hi[1]-lo[1]),(p.z-lo[2])*.800/(hi[2]-lo[2]))
 o.matrix_world.identity();o.name=name;o['furnishStablePart']='chair-vihals-v1:'+name
 o['furnishRecolor']=False
spec=json.loads(pathlib.Path(sys.argv[sys.argv.index('--spec')+1]).read_text(encoding='utf-8'))
parents={}
for m in spec['motions']:
 parent=bpy.data.objects.new('motion:'+m['role'],None);bpy.context.collection.objects.link(parent);parent.location=(m['pivot'][0]/1000,-m['pivot'][2]/1000,m['pivot'][1]/1000);parent['furnishMotionRole']=m['role'];parent['furnishHingeAxis']=m['axis'];parents[m['role']]=parent
bpy.context.view_layer.update()
for o in meshes:
 part=next(p for p in spec['parts'] if p['name']==o.name);matrix=o.matrix_world.copy();o.parent=parents[part['role']];o.matrix_world=matrix
for image in bpy.data.images:
 if image.source=='FILE':image.pack()
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent/'lib'))
from blender_asset_preflight import from_args
from_args(bpy.context.scene)
bpy.ops.wm.save_as_mainfile(filepath=str(out/'chair-vihals-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'chair-vihals-v1.glb'),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
if '--result' in sys.argv:pathlib.Path(sys.argv[sys.argv.index('--result')+1]).write_text(json.dumps({'passed':True,'parts':len(meshes),'blender':bpy.app.version_string,'officialBoundsMetres':[lo,hi]}),encoding='utf-8')
