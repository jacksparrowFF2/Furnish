"""Isolated authoring: named solid boards, two drawer parents, editable source and GLB."""
import bpy, json, pathlib, sys
args=sys.argv[sys.argv.index('--')+1:]
out=pathlib.Path(args[0]).resolve();out.mkdir(parents=True,exist_ok=True)
spec=json.loads(pathlib.Path(args[args.index('--spec')+1]).read_text(encoding='utf-8'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC'
def linear(v):
    v=v/255;return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
mats={}
for key,color in [('wood',(189,142,93)),('stone',(238,237,225)),('dark',(48,45,41))]:
    m=bpy.data.materials.new(key);m.use_nodes=True;n=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED');n.inputs['Base Color'].default_value=(*[linear(v) for v in color],1);n.inputs['Roughness'].default_value=.52 if key=='wood' else .35;mats[key]=m
parents={}
for role in ['upper','lower']:
    o=bpy.data.objects.new('drawer-'+role,None);bpy.context.collection.objects.link(o);o['furnishMotionRole']=role;o['furnishHingeAxis']='x';parents[role]=o
for p in spec['parts']:
    if p['name'].startswith('castor-') and not p['name'].startswith('castor-stem-'):
        bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.5,depth=1,rotation=(0,1.5707963267948966,0));bpy.ops.object.transform_apply(location=False,rotation=True,scale=False)
    else:bpy.ops.mesh.primitive_cube_add(size=1)
    o=bpy.context.object;o.name=p['name'];s=p['size'];c=p['center'];o.dimensions=(s[0]/1000,s[2]/1000,s[1]/1000);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.location=(c[0]/1000,-c[2]/1000,c[1]/1000)
    b=o.modifiers.new('Eased reference-photo edges','BEVEL');b.width=min(p['radius']/1000,*[v/4000 for v in s]);b.segments=3;bpy.ops.object.modifier_apply(modifier=b.name)
    o.data.materials.append(mats[p['material']]);o['furnishStablePart']='side-table-v1:'+p['name'];o['furnishRecolor']=p['material']=='wood'
    if p['role']:o.parent=parents[p['role']]
bpy.ops.wm.save_as_mainfile(filepath=str(out/'side-table-v1.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'side-table-v1.glb'),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
pathlib.Path(args[args.index('--result')+1]).write_text(json.dumps({'passed':True,'parts':len(spec['parts']),'blender':bpy.app.version_string}),encoding='utf-8')
