/* Standalone viewer of the production geometry; existing offline Three.js import map. */
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(process.env.FURNISH_VERIFY_ROOT||path.join(__dirname,'..')),dir=path.join(root,'output/yeswood-sofa');fs.mkdirSync(dir,{recursive:true});
const map=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<script type="importmap">[\s\S]*?<\/script>/)[0];
fs.writeFileSync(path.join(dir,'preview.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>源氏木语 · 樱桃木沙发</title>
<style>*{box-sizing:border-box}body{margin:0;background:#f1ede5;color:#4a382c;font:15px system-ui}header{padding:28px 36px}h1{margin:0 0 9px;font-size:28px}p{margin:0;color:#796d60;line-height:1.8}.views{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:0 28px}article{background:#faf8f3;border-radius:14px;overflow:hidden}h2{margin:20px 24px 0;font-size:17px}canvas{display:block;width:100%;height:470px}footer{padding:20px 36px;color:#796d60}@media(max-width:800px){.views{grid-template-columns:1fr}}</style>
<header><h1>源氏木语 · 樱桃木三人沙发</h1><p>梨白仿棉麻 · 2160 × 892 × 895 mm · 标注坐深 580 mm<br>拖动旋转，滚轮缩放。与 Furnish 家具库使用同一模型。</p></header>
<div class="views"><article><h2>正面</h2><canvas></canvas></article><article><h2>斜视 · 实木侧框</h2><canvas></canvas></article></div><footer>双坐包、双靠包、软包扶手、樱桃木侧板及收分木腿。未标注部件尺寸、背部结构与布面褶皱为近似；价格未知。调整宽深高只作布局缩放。</footer>
<script src="../../src/core/part-identity.js"></script><script src="../../src/render/yeswood-sofa-model.js"></script>${map}<script type="module">
import * as THREE from 'three';import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const views=[];
for(const [i,canvas] of [...document.querySelectorAll('canvas')].entries()){
 const renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setPixelRatio(devicePixelRatio);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#faf8f3');const camera=new THREE.PerspectiveCamera(34,1,.01,30);camera.position.set(...(i?[2.9,1.85,3.15]:[0,1.1,4.1]));
 const controls=new OrbitControls(camera,canvas);controls.target.set(0,.43,0);camera.position.sub(controls.target).multiplyScalar(Math.max(1,.95/(canvas.clientWidth/canvas.clientHeight))).add(controls.target);controls.update();scene.add(new THREE.HemisphereLight(0xffffff,0x766755,2.2));
 const light=new THREE.DirectionalLight(0xfff2dc,3);light.position.set(-2,4,3);light.castShadow=true;light.shadow.mapSize.set(2048,2048);light.shadow.camera.left=-2;light.shadow.camera.right=2;light.shadow.camera.top=2;light.shadow.camera.bottom=-2;light.shadow.bias=-.0003;scene.add(light);
 scene.add(FurnishYeswoodSofaModel.build(THREE,{w:2160,d:892,h:895,color:'#eee9df'},RoundedBoxGeometry));
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(10,10),new THREE.ShadowMaterial({opacity:.17}));floor.rotation.x=-Math.PI/2;floor.position.y=-.001;floor.receiveShadow=true;scene.add(floor);
 function render(){renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.updateProjectionMatrix();renderer.render(scene,camera);}controls.addEventListener('change',render);window.addEventListener('resize',render);render();views.push({scene,camera,render});
}window.previewReady=true;
</script></html>`);
console.log(path.join(dir,'preview.html'));
