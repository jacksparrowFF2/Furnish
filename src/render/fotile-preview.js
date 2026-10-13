/* Standalone preview: exactly one independent production appliance per page. */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
const hob=document.body.dataset.appliance==='hob';
const f=hob?{type:'stove_fotile_th36b',w:750,d:440,h:138,counterElevation:80}:{type:'rangehood_fotile_jcd10ta',w:900,d:350,h:520,mountHeight:0,hoodPanelOpen:false};
const scene=new THREE.Scene();scene.background=new THREE.Color('#e9e6e0');
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(devicePixelRatio);document.body.appendChild(renderer.domElement);
const camera=new THREE.PerspectiveCamera(35,innerWidth/innerHeight,.01,30),controls=new OrbitControls(camera,renderer.domElement);
scene.add(new THREE.HemisphereLight('#ffffff','#87796c',2));
for(const [x,y,z,power] of [[2,4,3,3],[-3,2,1,2]]){const light=new THREE.DirectionalLight('#ffffff',power);light.position.set(x,y,z);scene.add(light);}
let model=FurnishFotileModel.build(THREE,f);scene.add(model);
function view(kind){
 const target=hob?[0,.08,0]:[0,.26,0];
 const position=kind==='front'?(hob?[0,.55,1.2]:[0,.45,1.8]):kind==='top'?[0,1.5,.05]:(hob?[.75,.70,1.05]:[1.05,.75,1.45]);
 camera.position.set(...position);controls.target.set(...target);controls.update();
}
document.querySelector('#angle').onclick=()=>view('angle');document.querySelector('#front').onclick=()=>view('front');
const top=document.querySelector('#top');if(top)top.onclick=()=>view('top');
const panel=document.querySelector('#panel');if(panel)panel.onclick=()=>{
 f.hoodPanelOpen=!f.hoodPanelOpen;scene.remove(model);model.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 model=FurnishFotileModel.build(THREE,f);scene.add(model);panel.textContent=f.hoodPanelOpen?'闭合面板':'打开面板';window.fotilePreview.model=model;
};
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
view('angle');renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
window.fotilePreview={scene,model,f,view};window.previewReady=true;
