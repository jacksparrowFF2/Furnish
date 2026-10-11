/* Generate a standalone viewer using the exact production model and local Three.js map. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),dir=path.join(root,'output/robot-p20max');fs.mkdirSync(dir,{recursive:true});
const map=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<script type="importmap">[\s\S]*?<\/script>/)[0];
fs.writeFileSync(path.join(dir,'preview.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>石头 P20 Max 模型预览</title>
<style>*{box-sizing:border-box}body{margin:0;background:#e9eef2;color:#233644;font:15px system-ui}header{padding:26px 36px}h1{margin:0 0 8px;font-size:28px}header p{margin:0;color:#617583}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:0 24px}article{background:#f8fafb;border-radius:18px;overflow:hidden}h2{margin:20px 24px 5px;font-size:20px}p{margin:0 24px 14px;color:#617583}canvas{width:100%;height:470px;display:block}footer{margin:20px 36px;color:#617583}button{padding:7px 14px;margin:0 6px;border:1px solid #a8bbc7;background:white;border-radius:6px;color:#233644}</style>
<header><h1>石头 P20 Max</h1><p>产品图驱动的布局与外观模型 · 拖动旋转，滚轮缩放<button id="front">正面</button><button id="angled">斜视</button></p></header>
<div class="grid"><article><h2>水箱版套装</h2><p>450 × 450 × 450 mm</p><canvas></canvas></article><article><h2>上下水版套装</h2><p>381 × 475 × 300 mm</p><canvas></canvas></article><article><h2>独立扫拖机器人</h2><p>350 × 352 × 79.8 mm</p><canvas></canvas></article></div><footer>白色外壳、托盘、进站开口与前置传感器为外观近似。基站尺寸不含安装预留；未建模水路、电路与内部清洗机构。</footer>
<script src="../../src/render/robot-vacuum-model.js"></script>${map}<script type="module">
import * as THREE from 'three';import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const views=[];for(const [i,type] of ['robot_p20max_tank','robot_p20max_plumbed','robot_p20max'].entries()){
 const canvas=document.querySelectorAll('canvas')[i],renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(devicePixelRatio);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#f8fafb');const camera=new THREE.PerspectiveCamera(34,1,.01,10),controls=new OrbitControls(camera,canvas);controls.target.set(0,i===2?.035:.20,0);camera.position.set(.68,.60,.90);controls.update();
 scene.add(new THREE.HemisphereLight(0xffffff,0x667587,2.4));const light=new THREE.DirectionalLight(0xffffff,3.2);light.position.set(-1,2,2);light.castShadow=true;light.shadow.mapSize.set(2048,2048);light.shadow.camera.left=-1;light.shadow.camera.right=1;light.shadow.camera.top=1;light.shadow.camera.bottom=-1;light.shadow.bias=-.0002;scene.add(light);
 const dims=FurnishRobotVacuumModel.specs[type],f={type,w:dims[0],d:dims[1],h:dims[2]};scene.add(FurnishRobotVacuumModel.build(THREE,f,RoundedBoxGeometry));const floor=new THREE.Mesh(new THREE.PlaneGeometry(5,5),new THREE.ShadowMaterial({opacity:.17}));floor.rotation.x=-Math.PI/2;floor.position.y=-.001;floor.receiveShadow=true;scene.add(floor);
 function render(){const w=canvas.clientWidth,h=canvas.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.render(scene,camera);}controls.addEventListener('change',render);window.addEventListener('resize',render);render();views.push({camera,controls,render,i});
}
document.querySelector('#front').onclick=()=>views.forEach(v=>{v.camera.position.set(0,v.i===2?.17:.30,1.15);v.controls.update();v.render();});document.querySelector('#angled').onclick=()=>views.forEach(v=>{v.camera.position.set(.68,.60,.90);v.controls.update();v.render();});window.previewReady=true;
</script></html>`);
console.log(path.join(dir,'preview.html'));
