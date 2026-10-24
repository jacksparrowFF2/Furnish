const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const imports=source.match(/<script type="importmap">[\s\S]*?<\/script>/)[0];
const dir=path.join(root,'output','fridges');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'preview.html'),`<!doctype html><html lang="zh"><meta charset="utf-8"><title>纯平四门冰箱预览</title><style>body{margin:0;background:#eeece7;font:16px sans-serif;color:#333}header{padding:20px}canvas{display:block;width:100%;height:82vh}button{padding:8px 20px;margin-right:10px}</style><header>纯平四门冰箱（双抽屉）· 宽 833 × 深 595 × 高 1910 mm · 布局与外观近似<p><button id="front">正面</button><button id="angle">斜视</button></p></header><canvas></canvas>${imports}<script src="../../src/core/part-identity.js"></script><script src="../../src/core/product-rules.js"></script><script src="../../src/render/model-primitives.js"></script><script src="../../src/render/appliance-model.js"></script><script type="module">
import * as THREE from 'three';import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
const primitives=FurnishModelPrimitives.create(THREE,RoundedBoxGeometry),{box}=primitives;
const models=FurnishApplianceModel.create(THREE,RoundedBoxGeometry,{primitives});
const canvas=document.querySelector('canvas'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);renderer.setPixelRatio(devicePixelRatio);
const scene=new THREE.Scene();scene.background=new THREE.Color('#eeece7');scene.add(new THREE.HemisphereLight(0xffffff,0x9a8c7d,2));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-2,4,3);scene.add(light);
const camera=new THREE.PerspectiveCamera(35,canvas.clientWidth/canvas.clientHeight,.01,50);
scene.add(models.build({id:'preview',type:'fridge_french_drawer',cx:0,cy:0,w:833,d:595,h:1910,rot:0,color:'#f1f0ed'}),box(5,.02,5,'#d7d2c9',0,-.02,0));
function view(front){camera.position.set(front?0:2,1.4,front?4:3.5);camera.lookAt(0,.97,0);renderer.render(scene,camera);}document.querySelector('#front').onclick=()=>view(true);document.querySelector('#angle').onclick=()=>view(false);view(false);window.previewReady=true;
</script>`);console.log(path.join(dir,'preview.html'));
