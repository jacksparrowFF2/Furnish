"""Fixed interior cameras in a separate copy of the refined, managed 1601 scene."""
import argparse,importlib.util,json,math,sys,time,traceback
from pathlib import Path
import bpy
from mathutils import Vector

SHOTS={
    'living':dict(name='01-客厅',position=[9750,5740,1400],target=[7180,3860,1080],lens=27),
    'dining':dict(name='02-餐厅',position=[9470,6350,1500],target=[7350,7460,1000],lens=24),
    'kitchen':dict(name='03-厨房',position=[8350,8620,1450],target=[6540,9580,1050],lens=20),
    'bedroom':dict(name='04-主卧',position=[3400,5800,1450],target=[1820,3600,950],lens=24),
}
def main():
    parser=argparse.ArgumentParser();parser.add_argument('--project',required=True);parser.add_argument('--output',required=True);parser.add_argument('--width',type=int,default=1600);parser.add_argument('--samples',type=int,default=128);parser.add_argument('--views',default=','.join(SHOTS));args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
    output=Path(args.output).resolve();output.mkdir(parents=True,exist_ok=True)
    def report(**value):(output/'progress.json').write_text(json.dumps(value,ensure_ascii=False),encoding='utf-8')
    try:
        report(stage='loading');bpy.ops.wm.open_mainfile(filepath=str(Path(args.project).resolve()));scene=bpy.context.scene
        managed=next(c for c in scene.collection.children if c.get('furnishPlanId')=='custom_mv37igji');ox,oy=managed['furnishOriginMm']
        def point(p):return Vector(((p[0]-ox)/1000,(oy-p[1])/1000,p[2]/1000))
        def aim(obj,p):obj.rotation_euler=(point(p)-obj.location).to_track_quat('-Z','Y').to_euler()
        # Photographic soft fill, not a luminaire or illuminance specification.
        for name,position,power,size in [('餐厅',[7850,7430,2470],55,1.6),('厨房',[7370,9140,2470],65,1.3),('主卧',[2200,4250,2470],100,2.0)]:
            data=bpy.data.lights.new('Regions | '+name+' soft fill','AREA');data.energy=power;data.shape='DISK';data.size=size;data.color=(1,.93,.84)
            obj=bpy.data.objects.new(data.name,data);scene.collection.objects.link(obj);obj.location=point(position);aim(obj,[position[0],position[1],700])
        worker_path=Path(__file__).with_name('blender-render.py');spec=importlib.util.spec_from_file_location('region_worker',str(worker_path));worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)
        scene.render.engine='CYCLES';device=worker.select_device(scene,'gpu',bpy.context.preferences.addons['cycles'].preferences)
        scene.cycles.samples=args.samples;scene.cycles.use_denoising=True;scene.cycles.use_adaptive_sampling=True;scene.cycles.adaptive_threshold=.02
        scene.render.resolution_x=args.width;scene.render.resolution_y=round(args.width*.75);scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
        cameras={}
        for key,shot in SHOTS.items():
            data=bpy.data.cameras.new('1601固定机位 | '+shot['name']);data.lens=shot['lens'];data.clip_start=.03;data.clip_end=100
            obj=bpy.data.objects.new(data.name,data);scene.collection.objects.link(obj);obj.location=point(shot['position']);aim(obj,shot['target']);cameras[key]=obj
        images=[]
        for key in args.views.split(','):
            shot=SHOTS[key];scene.camera=cameras[key];scene.render.filepath=str(output/(shot['name']+'.png'));report(stage='rendering',view=shot['name'],device=device);start=time.time();bpy.ops.render.render(write_still=True);images.append(dict(view=key,file=scene.render.filepath,seconds=round(time.time()-start,2)))
        scene.camera=cameras['living'];bpy.ops.file.pack_all();bpy.ops.wm.save_as_mainfile(filepath=str(output/'1601-固定区域机位.blend'))
        result=dict(passed=True,source=args.project,shots=SHOTS,device=device,images=images,resolution=[scene.render.resolution_x,scene.render.resolution_y],samples=args.samples,note='Independent copy; source layout unchanged. Added illustrative soft fill only.');(output/'summary.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');report(stage='done')
    except Exception:report(stage='failed',error=traceback.format_exc());raise
if __name__=='__main__':main()
