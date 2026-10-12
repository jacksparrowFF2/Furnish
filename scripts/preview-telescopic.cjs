const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const imports=source.match(/<script type="importmap">[\s\S]*?<\/script>/)[0];
const model=source.slice(source.indexOf('const asMat ='),source.indexOf('/* ======================= 建筑'));
const dir=path.join(root,'output','telescopic');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'preview.html'),`<!doctype html><html lang="zh"><meta charset="utf-8"><title>极简三联动门窗</title><style>body{margin:0;background:#eeece7;font:16px sans-serif;color:#333}header{padding:16px}canvas{display:block;width:100%;height:78vh}button,select{padding:8px 16px;margin-right:12px}p{margin:10px 0}</style><header>极简三联动门窗 · 应用实际模型<p><button id="door">开合门</button><button id="window">开合窗</button><label>门地轨 <select id="track"><option value="false">无地轨 · 吊轨</option><option value="true">有地轨</option></select></label><button id="side">切换叠合侧</button><button id="front">正面 / 斜视</button></p><small>门 2400 × 90 × 2400 mm；窗 1800 × 90 × 1500 mm，窗台 900 mm。尺寸为可调布局参数，边框为参考图外观近似。点击门窗玻璃也可开合。</small></header><canvas></canvas>${imports}<script src="../../src/core/cabinet-core.js"></script><script src="../../src/core/product-rules.js"></script><script src="../../src/core/design-core.js"></script><script type="module">
import * as THREE from 'three';import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
const M=v=>v/1000,wx=M,wz=M,rng=()=>()=>.5,mat=(color,o={})=>new THREE.MeshStandardMaterial({color,...o});
${model}
const canvas=document.querySelector('canvas'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);renderer.setPixelRatio(devicePixelRatio);
const scene=new THREE.Scene();scene.background=new THREE.Color('#eeece7');scene.add(new THREE.HemisphereLight(0xffffff,0x9a8c7d,2));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-2,4,3);scene.add(light);
const camera=new THREE.PerspectiveCamera(38,canvas.clientWidth/canvas.clientHeight,.01,50);
scene.add(box(7,.02,5,'#d7d2c9',0,-.02,0),box(1.8,.9,.45,'#c7b69a',-1.7,0,-1.2));
let doorModel,windowModel,flip=false,front=false;
function build(){for(const g of [doorModel,windowModel])if(g){scene.remove(g);g.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});}
doorModel=buildFurniture({id:'door',type:'tripleslidingdoor',cx:400,cy:0,w:2400,d:90,h:2400,rot:0,color:'#727571',floorTrack:document.querySelector('#track').value==='true',flip});
windowModel=buildFurniture({id:'window',type:'tripleslidingwindow',cx:-1700,cy:-900,w:1800,d:90,h:1500,mountHeight:900,rot:90,color:'#727571',flip});scene.add(doorModel,windowModel);}
function view(){camera.position.set(front?0:4,2.4,front?7:5);camera.lookAt(-.3,1.2,-.5);}build();view();
document.querySelector('#door').onclick=()=>{const d=doorModel.userData.slidingDoor;d.open=!d.open;};document.querySelector('#window').onclick=()=>{const d=windowModel.userData.slidingDoor;d.open=!d.open;};document.querySelector('#track').onchange=build;document.querySelector('#side').onclick=()=>{flip=!flip;build();};document.querySelector('#front').onclick=()=>{front=!front;view();};
canvas.onclick=e=>{const r=canvas.getBoundingClientRect(),ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,1-(e.clientY-r.top)/r.height*2),camera);const hit=ray.intersectObjects([doorModel,windowModel],true).find(h=>h.object.userData.door);if(hit){const d=hit.object.userData.door;d.open=!d.open;}};
const clock=new THREE.Clock();function render(){requestAnimationFrame(render);const dt=clock.getDelta();for(const g of [doorModel,windowModel]){const d=g.userData.slidingDoor,target=d.open?1:0;d.cur=Math.abs(target-d.cur)<.001?target:d.cur+(target-d.cur)*Math.min(1,dt*6);for(const leaf of d.leaves)leaf.node.position.x=leaf.closed+(leaf.opened-leaf.closed)*d.cur;}renderer.render(scene,camera);}render();window.previewReady=true;
</script>`);console.log(path.join(dir,'preview.html'));
