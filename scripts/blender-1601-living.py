"""1601 living-room visualization study. Production layout stays in the source GLB.

The separate blend contains rendering-only materials, lights, cameras and open curtains.
"""
import argparse
import colorsys
import importlib.util
import json
import math
import struct
from pathlib import Path
import sys
import time

import bpy
from mathutils import Vector, Matrix


def principled(name, color, roughness=0.5, metallic=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    node = mat.node_tree.nodes.get('Principled BSDF')
    node.inputs['Base Color'].default_value = (*color[:3], 1)
    node.inputs['Roughness'].default_value = roughness
    node.inputs['Metallic'].default_value = metallic
    return mat, node


def noise_bump(mat, scale, distance, strength=0.2):
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = scale
    noise.inputs['Detail'].default_value = 2
    position = nodes.new('ShaderNodeNewGeometry')
    links.new(position.outputs['Position'], noise.inputs['Vector'])
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Distance'].default_value = distance
    bump.inputs['Strength'].default_value = strength
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(bump.outputs['Normal'], nodes.get('Principled BSDF').inputs['Normal'])
    return noise


def wood(name, color, axis):
    mat, bsdf = principled(name, color, 0.37)
    bsdf.inputs['Coat Weight'].default_value = 0.12
    bsdf.inputs['Coat Roughness'].default_value = 0.32
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    tex = nodes.new('ShaderNodeTexCoord')
    stretch = nodes.new('ShaderNodeVectorMath'); stretch.operation = 'MULTIPLY'
    grain_scale=[45,45,45];grain_scale[axis]=1.8
    stretch.inputs[1].default_value = grain_scale
    links.new(tex.outputs['Generated'], stretch.inputs[0])
    noise = noise_bump(mat, 3, 0.00015, 0.15)
    links.new(stretch.outputs['Vector'], noise.inputs['Vector'])
    ramp = nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.12
    ramp.color_ramp.elements[0].color = (*[c * 0.72 for c in color], 1)
    ramp.color_ramp.elements[1].position = 0.88
    ramp.color_ramp.elements[1].color = (*[min(0.8, c * 1.15) for c in color], 1)
    links.new(noise.outputs['Fac'], ramp.inputs[0]); links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    return mat


def fabric(name, color):
    mat, bsdf = principled(name, color, 0.82)
    bsdf.inputs['Sheen Weight'].default_value = 0.25
    noise_bump(mat, 420, 0.00032, 0.3)
    return mat


def tile(meta):
    mat, bsdf = principled('Study | 800mm satin porcelain', (0.49, 0.475, 0.445), 0.29)
    bsdf.inputs['Coat Weight'].default_value = 0.10
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    geom = nodes.new('ShaderNodeNewGeometry')
    subtract = nodes.new('ShaderNodeVectorMath'); subtract.operation = 'SUBTRACT'
    ox, oy = meta['export']['furnish']['originMm']
    layout = meta['floorFinishes']['areas']['area_fmv3qb1oi4']['layout']
    start = layout['origin']
    subtract.inputs[1].default_value = ((start[0]-ox)/1000, -(start[1]-oy)/1000, 0)
    links.new(geom.outputs['Position'], subtract.inputs[0])
    scale = nodes.new('ShaderNodeVectorMath'); scale.operation = 'SCALE'; scale.inputs['Scale'].default_value = 1/(layout['width']/1000)
    links.new(subtract.outputs['Vector'], scale.inputs[0])
    xyz = nodes.new('ShaderNodeSeparateXYZ'); links.new(scale.outputs['Vector'], xyz.inputs[0])
    joints = []
    for axis in ('X', 'Y'):
        ping = nodes.new('ShaderNodeMath'); ping.operation = 'PINGPONG'; ping.inputs[1].default_value = 0.5
        edge = nodes.new('ShaderNodeMath'); edge.operation = 'LESS_THAN'; edge.inputs[1].default_value = layout['gap']/2/layout['width']
        links.new(xyz.outputs[axis], ping.inputs[0]); links.new(ping.outputs[0], edge.inputs[0]); joints.append(edge)
    union = nodes.new('ShaderNodeMath'); union.operation = 'MAXIMUM'
    for i, j in enumerate(joints): links.new(j.outputs[0], union.inputs[i])
    mix = nodes.new('ShaderNodeMixRGB'); mix.inputs[1].default_value = (0.49,0.475,0.445,1); mix.inputs[2].default_value = (0.24,0.23,0.21,1)
    links.new(union.outputs[0], mix.inputs[0]); links.new(mix.outputs[0], bsdf.inputs['Base Color'])
    noise_bump(mat, 95, 0.00009, 0.12)
    return mat


def aim(obj, target):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat('-Z', 'Y').to_euler()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--directory', required=True)
    parser.add_argument('--width', type=int, default=1000)
    parser.add_argument('--samples', type=int, default=64)
    parser.add_argument('--views', default='sofa,tv')
    parser.add_argument('--baseline', action='store_true')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    directory = Path(args.directory).resolve()
    meta = json.loads((directory/'1601-metadata.json').read_text(encoding='utf-8'))
    glb=(directory/'1601-scene.glb').read_bytes()
    gltf=json.loads(glb[20:20+struct.unpack_from('<I',glb,12)[0]])
    source_nodes={n.get('name'):n for n in gltf['nodes'] if 'mesh' in n}
    ox, oy = meta['export']['furnish']['originMm']
    def point(x,y,z): return ((x-ox)/1000, -(y-oy)/1000, z/1000)
    def report(message):
        (directory/'study-progress.json').write_text(json.dumps(dict(message=message,pid=__import__('os').getpid())),encoding='utf-8')
        print(message,flush=True)
    report('Importing saved 1601 scene')
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(directory/'1601-scene.glb'))
    scene=bpy.context.scene
    furniture={f['id']:f for f in meta['furniture']}
    original_geometry={o.name:tuple(o.matrix_world[i][j] for i in range(4) for j in range(4)) for o in scene.objects if o.type=='MESH'}
    original_materials={o.name:list(o.data.materials) for o in scene.objects if o.type=='MESH'}
    original_lights=[]
    wall, _=principled('Study | warm white mineral paint',(0.78,0.755,0.71),0.82)
    noise_bump(wall,160,0.00012,0.12)
    ceiling, _=principled('Study | matte ceiling',(0.84,0.83,0.80),0.9)
    stone, _=principled('Study | white sintered stone',(0.8,0.79,0.76),0.27)
    noise_bump(stone,55,0.00006,0.1)
    floor=tile(meta)
    cloth=fabric('Study | pear white woven upholstery',(0.77,0.735,0.66))
    drape=fabric('Study | warm greige curtain',(0.40,0.37,0.31))
    screen, screen_bsdf=principled('Study | switched-off television glass',(0.006,0.008,0.012),.16,.1)
    screen_bsdf.inputs['Coat Weight'].default_value=.3
    glass=bpy.data.materials.new('Study | thin architectural glazing');glass.use_nodes=True
    gn,gl=glass.node_tree.nodes,glass.node_tree.links;gn.clear()
    out=gn.new('ShaderNodeOutputMaterial');mix=gn.new('ShaderNodeMixShader');mix.inputs[0].default_value=.08
    tr=gn.new('ShaderNodeBsdfTransparent');gb=gn.new('ShaderNodeBsdfGlass');gb.inputs['Roughness'].default_value=.04
    gl.new(tr.outputs[0],mix.inputs[1]);gl.new(gb.outputs[0],mix.inputs[2]);gl.new(mix.outputs[0],out.inputs[0])
    cache={};counts={};curtain_objects=[]
    for obj in list(scene.objects):
        if obj.type=='LIGHT': original_lights.append(obj);obj.hide_render=True;continue
        if obj.type!='MESH': continue
        fid=obj.get('furnishId','');f=furniture.get(fid,{});kind=f.get('type','');key=obj.get('layerObject','')
        if kind=='curtain' and fid=='fmvg9e7763' and len(obj.data.vertices)>500: curtain_objects.append(obj)
        for index,material in enumerate(list(obj.data.materials)):
            if not material: continue
            bsdf=material.node_tree.nodes.get('Principled BSDF') if material.use_nodes else None
            rawnode=source_nodes.get(obj.name)
            primitive=gltf['meshes'][rawnode['mesh']]['primitives'][index] if rawnode else {}
            rawmaterial=gltf['materials'][primitive['material']] if 'material' in primitive else {}
            pbr=rawmaterial.get('pbrMetallicRoughness',{})
            factor=pbr.get('baseColorFactor',[1,1,1,1])
            color=tuple(factor[:3])
            alpha=factor[3]
            metal=pbr.get('metallicFactor',1)
            h,s,v=colorsys.rgb_to_hsv(*color)
            new=None;role=None
            if key.startswith('floor:') and 'bay_' not in key: new=floor;role='floor'
            elif key.startswith('roomCeiling:'):new=ceiling;role='ceiling'
            elif not fid and alpha<.95:new=glass;role='glass'
            elif kind=='curtain' and len(obj.data.vertices)>500:new=drape;role='curtain'
            elif kind=='sofa_yeswood_cherry' and v>.45 and s<.35:new=cloth;role='fabric'
            elif kind=='coffeetable_yeswood_cherry' and v>.45 and s<.25:new=stone;role='stone'
            elif kind=='tv' and v<.08:new=screen;role='screen'
            elif kind in ('sofa_yeswood_cherry','coffeetable_yeswood_cherry','cabinet','tea_table_800','table_folding_1100','chair') and s>.22 and .015<h<.17 and v>.055 and metal<.2:
                bounds=[max(v[i] for v in obj.bound_box)-min(v[i] for v in obj.bound_box) for i in range(3)]
                axis=max(range(3),key=lambda i:bounds[i]);k=(tuple(round(c,3) for c in color),axis)
                if k not in cache:cache[k]=wood('Study | wood '+str(k),color,axis)
                new=cache[k];role='wood'
            elif not fid and v>.45 and s<.25 and metal<.2:new=wall;role='paint'
            if new:obj.data.materials[index]=new;counts[role]=counts.get(role,0)+1
    # Open only the existing living-room drapes; keep the original material/pose in source GLB.
    curtain=furniture['fmvg9e7763'];cx=point(curtain['cx'],curtain['cy'],0)[0]
    for obj in curtain_objects:
        side=-1 if obj.matrix_world.translation.x<cx else 1
        obj.scale.x*=.20;obj.location.x=cx+side*(curtain['w']/2000-curtain['w']/4000*.20)
    # The saved TV faces the wall (+X), the same direction as the sofa.
    # Correct front/back only in this rendering study, rotating around its saved centre.
    tv=furniture['fmv3w7rrw6'];pivot=Vector(point(tv['cx'],tv['cy'],0))
    turn=Matrix.Translation(pivot) @ Matrix.Rotation(math.pi,4,'Z') @ Matrix.Translation(-pivot)
    tv_objects=[]
    for obj in scene.objects:
        if obj.type=='MESH' and obj.get('furnishId')==tv['id']:
            obj.matrix_world=turn @ obj.matrix_world;tv_objects.append(obj.name)
    # True interior enclosure: the captured ceiling is retained rather than a cut-away shell.
    scene.world=bpy.data.worlds.new('Study | daylight sky');scene.world.use_nodes=True
    nodes,links=scene.world.node_tree.nodes,scene.world.node_tree.links
    sky=nodes.new('ShaderNodeTexSky');sky.sky_type='NISHITA';sky.sun_elevation=math.radians(35);sky.sun_rotation=math.radians(125);sky.sun_disc=False
    nodes.get('Background').inputs['Strength'].default_value=.08;links.new(sky.outputs['Color'],nodes.get('Background').inputs['Color'])
    def area(name,location,target,power,size,color=(1,1,1),size_y=None):
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='RECTANGLE' if size_y else 'DISK';data.size=size
        if size_y:data.size_y=size_y
        data.color=color;obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=point(*location);aim(obj,point(*target));return obj
    area('Study | balcony daylight',(8418,1660,1800),(8200,4600,950),300,2.8,(.86,.93,1),1.5)
    area('Study | subtle photographic fill',(8850,6100,2350),(7700,3700,1100),20,2.0,(1,.88,.74))
    area('Study | ceiling bounced warm fill',(8200,4250,2520),(8200,4250,800),15,1.5,(1,.86,.70))
    sun_data=bpy.data.lights.new('Study | soft morning sunlight','SUN');sun_data.energy=1.2;sun_data.angle=.08;sun_data.color=(1,.91,.78)
    sun=bpy.data.objects.new(sun_data.name,sun_data);scene.collection.objects.link(sun);sun.location=point(7500,600,4800);aim(sun,point(8800,5200,0))
    scene.render.engine='CYCLES'
    spec=importlib.util.spec_from_file_location('furnish_render',str(Path(__file__).with_name('blender-render.py')));worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)
    device=worker.select_device(scene,'gpu',bpy.context.preferences.addons['cycles'].preferences)
    scene.cycles.samples=args.samples;scene.cycles.use_denoising=True;scene.cycles.use_adaptive_sampling=True;scene.cycles.adaptive_threshold=.025
    scene.cycles.max_bounces=12;scene.cycles.diffuse_bounces=6;scene.cycles.glossy_bounces=6;scene.cycles.transmission_bounces=8;scene.cycles.transparent_max_bounces=12
    scene.render.resolution_x=args.width;scene.render.resolution_y=round(args.width*.75);scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.view_settings.view_transform='AgX';scene.view_settings.exposure=-.6
    scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
    shots={
        'sofa':((9700,6220,1480),(7800,3530,1080),23),
        'tv':((6900,5290,1460),(9850,3760,1120),23),
        'wide':((8350,6420,1450),(8418,3250,1150),20),
        'detail':((9750,5740,1400),(7180,3860,1080),27)
    }
    cameras={}
    for name,(location,target,lens) in shots.items():
        data=bpy.data.cameras.new('1601 | '+name);data.lens=lens;data.clip_start=.03;data.clip_end=100
        obj=bpy.data.objects.new(data.name,data);scene.collection.objects.link(obj);obj.location=point(*location);aim(obj,point(*target));cameras[name]=obj
    outputs=[]
    for name in args.views.split(','):
        scene.camera=cameras[name];scene.render.filepath=str(directory/('1601-living-'+name+'.png'));report('Rendering '+name+' with '+device['backend'])
        started=time.time();bpy.ops.render.render(write_still=True);outputs.append(dict(view=name,path=scene.render.filepath,seconds=round(time.time()-started,2)))
    scene.camera=cameras['detail'];bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(directory/'1601-living-study.blend'))
    moved=[o.name for o in scene.objects if o.type=='MESH' and o.name in original_geometry and tuple(o.matrix_world[i][j] for i in range(4) for j in range(4))!=original_geometry[o.name]]
    allowed={o.name for o in curtain_objects}|set(tv_objects)
    if set(moved)-allowed:raise RuntimeError('Unintended furniture movement: '+str(set(moved)-allowed))
    if len(original_geometry)!=sum(o.type=='MESH' for o in scene.objects):raise RuntimeError('Unexpected mesh count change')
    if args.baseline:
        # Same interior camera, current one-click pipeline's original materials/lights/world.
        # Source curtain closure and TV orientation are restored for this baseline only.
        for obj in scene.objects:
            if obj.type=='MESH' and obj.name in original_materials:
                obj.data.materials.clear()
                for material in original_materials[obj.name]:obj.data.materials.append(material)
                values=original_geometry[obj.name];obj.matrix_world=Matrix(tuple(values[i:i+4] for i in range(0,16,4)))
            if obj.type=='LIGHT':obj.hide_render=obj not in original_lights
        scene.world=bpy.data.worlds.new('Baseline | original one-click world');scene.world.use_nodes=True
        bg=scene.world.node_tree.nodes.get('Background');bg.inputs['Color'].default_value=(.75,.82,1,1);bg.inputs['Strength'].default_value=.35
        scene.view_settings.exposure=0
        scene.camera=cameras['detail'];scene.render.filepath=str(directory/'1601-living-baseline.png')
        report('Rendering same-camera baseline');started=time.time();bpy.ops.render.render(write_still=True)
        outputs.append(dict(view='baseline',path=scene.render.filepath,seconds=round(time.time()-started,2)))
    summary=dict(source=meta['source'],plan=meta['plan'],room='客厅',device=device,materialAssignments=counts,curtainObjects=[o.name for o in curtain_objects],tvFrontCorrection=tv_objects,changedMeshTransforms=moved,meshCount=len(original_geometry),geometryAudit='PASS: only curtain pose and TV front/back rotation changed',shots=shots,outputs=outputs,resolution=[scene.render.resolution_x,scene.render.resolution_y],samples=args.samples,renderOnlyChanges=['procedural PBR materials','daylight and soft fill (illustrative, not a calibrated sunlight study)','interior cameras','living curtain open pose','TV front/back corrected to face sofa, saved Furnish orientation unchanged'])
    (directory/'study-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2),encoding='utf-8');report('DONE')


if __name__=='__main__':
    try:main()
    except Exception:
        import traceback
        print(traceback.format_exc(),flush=True)
        for i,a in enumerate(sys.argv):
            if a=='--directory': (Path(sys.argv[i+1])/'study-error.txt').write_text(traceback.format_exc(),encoding='utf-8')
        raise
