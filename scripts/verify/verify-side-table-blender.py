"""Reimport production exports, measure rigid travel; reject a false closed pivot."""
import bpy, sys, pathlib, json, math, importlib.util, hashlib, traceback
args=sys.argv[sys.argv.index('--')+1:];root=pathlib.Path(args[0]);result=pathlib.Path(args[1]);run=root/'output/side-table-validation'
def read(path):
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False);bpy.ops.import_scene.gltf(filepath=str(path))
    return {o.get('furnishPartKey'): [o.matrix_world@v.co for v in o.data.vertices] for o in bpy.context.scene.objects if o.type=='MESH' and o.get('furnishId')=='table-validation'}
try:
    travel=((850-85)*270/595-50)/1000
    for mode in ['http','file']:
        closed=read(run/(mode+'-production-closed.glb'));opened=read(run/(mode+'-production-open.glb'));assert len(closed)==len(opened)==35
        moving=0
        for key,vs in closed.items():
            delta=[b-a for a,b in zip(vs,opened[key])];assert len(vs)==len(opened[key])
            if ':upper-' in key or ':lower-' in key:
                moving+=1;assert abs(delta[0].length-travel)<2e-6
                assert abs(delta[0].z)<1e-6
                assert all((d-delta[0]).length<2e-6 for d in delta)
                assert abs(delta[0].x-travel*math.cos(math.radians(37)))<2e-6
                assert abs(delta[0].y+travel*math.sin(math.radians(37)))<2e-6
            else:assert all(d.length<2e-6 for d in delta)
        assert moving==10
    # Alter the parent pivot, compensating child locations: the closed surface stays unchanged.
    read(root/'assets/models/side-table/side-table-v1.glb')
    hinge=next(o for o in bpy.context.scene.objects if o.get('furnishMotionRole')=='upper');children=list(hinge.children);before={o.name:o.matrix_world.copy() for o in children};hinge.location.x+=.01;bpy.context.view_layer.update()
    for o in children:o.matrix_world=before[o.name]
    bad=run/'bad-pivot.glb';bpy.ops.export_scene.gltf(filepath=str(bad),export_format='GLB',export_extras=True,export_cameras=False,export_lights=False)
    loader=importlib.util.spec_from_file_location('publisher',root/'scripts/publish-blender-asset.py');publisher=importlib.util.module_from_spec(loader);loader.loader.exec_module(publisher)
    spec=json.loads((run/'spec.json').read_text(encoding='utf-8'));target=run/'protected-asset.js';target.write_text('preserved-valid-asset',encoding='utf-8')
    try:publisher.publish(bad,target,'side-table',spec)
    except ValueError as e:assert 'pivot' in str(e).lower(),str(e)
    else:raise AssertionError('Incorrect pivot was accepted')
    assert target.read_text(encoding='utf-8')=='preserved-valid-asset'
    result.write_text(json.dumps({'passed':True,'blender':bpy.app.version_string,'productionParts':35,'movingParts':10,'modes':['http','file'],'travelMm':travel*1000,'negativePivotRejected':True}),encoding='utf-8')
except Exception as e:
    result.write_text(json.dumps({'passed':False,'error':traceback.format_exc()}),encoding='utf-8');raise
