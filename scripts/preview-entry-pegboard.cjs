/* Preview production cabinet geometry, including its real openings. */
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..'),dir=path.join(root,'output/entry-pegboard');fs.mkdirSync(dir,{recursive:true});
const map=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<script type="importmap">[\s\S]*?<\/script>/)[0];
fs.writeFileSync(path.join(dir,'preview.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>洞洞板玄关柜</title>
<style>body{margin:0;background:#f3eee8;color:#56473d;font:16px system-ui}header,footer{padding:20px 30px}h1{margin:0 0 8px;font-size:25px}p{margin:0;line-height:1.8}main{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:0 24px}article{background:#fcfaf7;border-radius:14px;overflow:hidden}h2{font-size:16px;margin:16px 22px}canvas{display:block;width:100%;height:560px}button{padding:8px 16px;margin-right:10px}@media(max-width:750px){main{grid-template-columns:1fr}}</style>
<header><h1>玄关柜 · 洞洞板换鞋区</h1><p>宽 674 × 深 350 × 高 2400 mm · 中间开放区净高 1418 mm<br>参考图红框左侧；深度与总高按用户确认作为草模尺寸。板厚、抽屉及上柜分配为草模假设。</p></header>
<main><article><h2>正面 · 双门上柜 / 洞洞板 / 两层抽屉</h2><canvas></canvas></article><article><h2>斜视 · 可旋转检查结构</h2><canvas></canvas></article></main>
<footer><button id="doors">开合上柜门</button><button id="drawers">开合抽屉</button><p>拖动旋转，滚轮缩放。洞洞板为真实通孔，短置物板与挂钩为固定示意；灯带仅作外观表示。装饰摆件、衣物与篮子省略。此模型用于布局与外观预览。</p></footer>
<script src="../../src/core/part-identity.js"></script><script src="../../src/core/cabinet-core.js"></script><script src="../../src/render/cabinet-model.js"></script>${map}<script type="module">
import * as THREE from 'three';import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const views=[],box=(w,h,d,color,x,y,z)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.72}));m.position.set(x,y+h/2,z);return m;};
for(const [i,canvas] of [...document.querySelectorAll('canvas')].entries()){
 const f={type:'cabinet',...FurnishCabinet.preset('entry-pegboard')},renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(devicePixelRatio);renderer.toneMapping=THREE.ACESFilmicToneMapping;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#fcfaf7');scene.add(new THREE.HemisphereLight(0xffffff,0xb0a393,2.3));const light=new THREE.DirectionalLight(0xffead6,2.3);light.position.set(-2,4,4);scene.add(light);
 const camera=new THREE.PerspectiveCamera(33,1,.01,30);camera.position.set(i?1.8:0,1.4,i?3.7:4.2);const controls=new OrbitControls(camera,canvas);controls.target.set(0,1.2,0);controls.update();
 let model=FurnishCabinetModel.build(THREE,f,box);scene.add(model);scene.add(box(4,.015,4,'#e1d5c4',0,-.016,0));
 const render=()=>{renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.updateProjectionMatrix();renderer.render(scene,camera);};controls.addEventListener('change',render);window.addEventListener('resize',render);render();
 views.push({f,rebuild(){scene.remove(model);model.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});model=FurnishCabinetModel.build(THREE,f,box);scene.add(model);render();}});
}
document.querySelector('#doors').onclick=()=>views.forEach(v=>{v.f.cabinet.columns[0].doorOpen=!v.f.cabinet.columns[0].doorOpen;v.rebuild();});document.querySelector('#drawers').onclick=()=>views.forEach(v=>{v.f.cabinet.columns[0].drawers.forEach(d=>d.open=!d.open);v.rebuild();});window.previewReady=true;
</script></html>`);console.log(path.join(dir,'preview.html'));
