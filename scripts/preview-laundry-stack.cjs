const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'index.html'),'utf8');
const imports=source.match(/<script type="importmap">[\s\S]*?<\/script>/)[0];
const dir=path.join(root,'output','laundry-stack');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'preview.html'),`<!doctype html><html lang="zh"><meta charset="utf-8"><title>洗烘叠放预览</title><style>body{margin:0;background:#f5f2ed;font:16px sans-serif}header{padding:20px}canvas{width:100%;height:80vh}</style><header>洗衣机：机身 850 mm，Z=0；烘干机：机身 900 mm，Z=870 mm，中间自动连接层 20 mm（布局模型）</header><canvas></canvas>${imports}<script src="../../src/core/part-identity.js"></script><script src="../../src/core/cabinet-core.js"></script><script src="../../src/core/product-rules.js"></script><script src="../../src/core/design-core.js"></script><script src="../../src/render/model-primitives.js"></script><script src="../../src/render/appliance-model.js"></script><script type="module">
import * as THREE from 'three';import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
const primitives=FurnishModelPrimitives.create(THREE,RoundedBoxGeometry),{box}=primitives;
const models=FurnishApplianceModel.create(THREE,RoundedBoxGeometry,{primitives});
const canvas=document.querySelector('canvas'),renderer=new THREE.WebGLRenderer({canvas,antialias:true});renderer.setSize(canvas.clientWidth,canvas.clientHeight,false);renderer.setPixelRatio(devicePixelRatio);
const scene=new THREE.Scene();scene.background=new THREE.Color('#f5f2ed');scene.add(new THREE.HemisphereLight(0xffffff,0xb6a690,2.5));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(2,4,3);scene.add(light);
const camera=new THREE.PerspectiveCamera(35,canvas.clientWidth/canvas.clientHeight,.01,50);camera.position.set(2,1.9,3.5);camera.lookAt(0,.9,0);
const furniture=FurnishDesign.normalizeLaundryStacks([['washer',850,0],['dryer',900,850]].map(([type,h,mountHeight])=>({id:type,type,cx:0,cy:0,w:600,d:600,h,mountHeight,rot:0,color:'#e6ebee'})));for(const f of furniture){const model=models.build(f,{furniture});model.position.y=(f.mountHeight??0)/1000;scene.add(model);}
scene.add(box(3,.02,3,'#ded5c7',0,-.02,0));renderer.render(scene,camera);window.previewReady=true;
</script>`);console.log(path.join(dir,'preview.html'));
