"""Fixed Blender 4.2+ worker. Input is a self-contained GLB; coordinates are metres.

Import the GLB manually for editing, or invoke this script through Blender --python.
Progress files also work with the Microsoft Store launcher, which hides stdout.
"""
import argparse
import json
import os
from pathlib import Path
import sys
import traceback

import bpy


def select_device(scene, mode, preferences):
    """Select only GPU devices from one backend; never save global preferences."""
    if mode != 'cpu':
        for backend in ('OPTIX', 'CUDA', 'HIP', 'ONEAPI', 'METAL'):
            try:
                preferences.compute_device_type = backend
                preferences.get_devices()
                devices = [d for d in preferences.devices if d.type == backend]
                if not devices:
                    continue
                for device in preferences.devices:
                    device.use = device.type == backend
                scene.cycles.device = 'GPU'
                return dict(requested=mode, type='GPU', backend=backend,
                            devices=[d.name for d in devices], fallback=None)
            except (TypeError, ValueError, RuntimeError):
                continue
        if mode == 'gpu':
            raise RuntimeError('未找到可用的 Cycles GPU，请检查显卡驱动或选择自动／CPU')
    scene.cycles.device = 'CPU'
    return dict(requested=mode, type='CPU', backend='CPU', devices=[],
                fallback='未检测到可用 GPU，已使用 CPU' if mode == 'auto' else None)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--input', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--blend', required=True)
    parser.add_argument('--progress', required=True)
    parser.add_argument('--token', required=True)
    parser.add_argument('--width', type=int, default=960)
    parser.add_argument('--height', type=int, default=640)
    parser.add_argument('--samples', type=int, default=32)
    parser.add_argument('--device', choices=('auto', 'gpu', 'cpu'), default='auto')
    args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
    target = Path(args.progress)
    render_device = None

    def progress(state, message):
        temp = target.with_suffix('.tmp')
        temp.write_text(json.dumps(dict(token=args.token, pid=os.getpid(), state=state,
                                        message=message, renderDevice=render_device)), encoding='utf-8')
        temp.replace(target)

    try:
        progress('importing', '正在导入场景')
        if (target.parent / 'cancel').exists():
            progress('cancelled', '已取消渲染')
            return
        if bpy.app.version < (4, 2, 0):
            raise RuntimeError('需要 Blender 4.2 或更高版本')
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(Path(args.input).resolve()))
        scene = bpy.context.scene
        cameras = [o for o in scene.objects if o.type == 'CAMERA']
        if not cameras:
            raise RuntimeError('导出场景缺少相机')
        scene.camera = next((o for o in cameras if o.name.startswith('FurnishCamera')), cameras[0])
        scene.unit_settings.system = 'METRIC'
        scene.unit_settings.scale_length = 1
        scene.render.engine = 'CYCLES'
        render_device = select_device(scene, args.device, bpy.context.preferences.addons['cycles'].preferences)
        scene.cycles.samples = args.samples
        scene.cycles.use_denoising = True
        scene.render.resolution_x = args.width
        scene.render.resolution_y = args.height
        scene.render.resolution_percentage = 100
        scene.render.image_settings.file_format = 'PNG'
        scene.render.filepath = str(Path(args.output).resolve())
        scene.render.film_transparent = False
        scene.world = bpy.data.worlds.new('Furnish World')
        scene.world.use_nodes = True
        background = scene.world.node_tree.nodes.get('Background')
        background.inputs['Color'].default_value = (0.75, 0.82, 1.0, 1.0)
        background.inputs['Strength'].default_value = 0.35
        scene.view_settings.view_transform = 'AgX'
        bpy.ops.file.pack_all()
        bpy.ops.wm.save_as_mainfile(filepath=str(Path(args.blend).resolve()))
        if (target.parent / 'cancel').exists():
            progress('cancelled', '已取消渲染')
            return
        progress('rendering', '正在使用 Cycles ' + render_device['backend'] + ' 渲染')
        try:
            bpy.ops.render.render(write_still=True)
        except RuntimeError:
            if args.device != 'auto' or render_device['type'] != 'GPU':
                raise
            scene.cycles.device = 'CPU'
            render_device = dict(requested='auto', type='CPU', backend='CPU', devices=[],
                                 fallback='GPU 渲染失败，已回退 CPU')
            if (target.parent / 'cancel').exists():
                progress('cancelled', '已取消渲染')
                return
            bpy.ops.wm.save_as_mainfile(filepath=str(Path(args.blend).resolve()))
            progress('rendering', render_device['fallback'])
            bpy.ops.render.render(write_still=True)
        progress('done', '渲染完成 · ' + render_device['backend'])
    except Exception:
        progress('failed', traceback.format_exc()[-3000:])
        raise


if __name__ == '__main__':
    main()
