/* Production rear-service assembly preview; no project workspace is read. */
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(process.env.FURNISH_VERIFY_ROOT||path.resolve(__dirname,'..'));
const map=fs.readFileSync(path.join(root,'index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1],out=path.join(root,'output/manifold-kitchen');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'preview.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>分水器与厨房地柜</title><style>body{margin:0;background:#e8e9e5;font:15px system-ui;color:#27342f}aside{position:absolute;top:20px;left:20px;z-index:2;width:250px;background:#fffE;padding:20px;border-radius:12px}h1{font-size:22px;margin:0}p{line-height:1.6}button{padding:8px;margin:4px}canvas{display:block}</style><aside><h1>分水器 · 后部让空</h1><p>分水器 800 × 180 × 600 mm<br>柜深 600 → 420 mm<br>层板／抽屉同步减深，背板取消。台面及柜门前沿不变。</p><button id="front">正面检修</button><button id="rear">后方结构</button><button id="toggle">全部打开</button><p>后部空间按模型外包预留，未附加厂家操作间距。抽屉柜检修需要取出抽屉。</p></aside>
${['core/part-identity','core/product-rules','core/zone-geometry','core/cabinet-core','core/kitchen-core','render/cabinet-model','render/kitchen-model','render/manifold-model'].map(s=>'<script src="../../src/'+s+'.js"></script>').join('')}
<script type="importmap">${map}</script><script type="module">
import * as T from 'three';
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor('#e8e9e5');document.body.appendChild(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(35,innerWidth/innerHeight,.01,100),light=new T.DirectionalLight('#fff5e8',3);light.position.set(-2,5,4);scene.add(light,new T.HemisphereLight('#eaf1ff','#626758',2));
const floor=new T.Mesh(new T.PlaneGeometry(30,30),new T.MeshStandardMaterial({color:'#c7ccc3'}));floor.rotation.x=-Math.PI/2;floor.position.y=-.005;scene.add(floor);
let f=FurnishKitchen.configure({id:'k',name:'厨房',type:'counter',cx:0,cy:0,rot:0,color:'#d4c8b6'},{version:1,shape:'straight',depth:600,counterDepth:630,baseHeight:820,thickness:20,autoAvoid:true,modules:[{run:0,width:600,role:'door'},{run:0,width:600,role:'drawer'}]});
f.kitchen.obstacleFit={depths:[{index:0,depth:420,rearService:true},{index:1,depth:420,rearService:true}],cuts:[]};
const m={id:'m',type:'heating_manifold',name:'分水器',cx:0,cy:-225,rot:0,w:800,d:180,h:600,color:'#c6a258',...FurnishProducts.initial({type:'heating_manifold'})};
const manifold=FurnishManifoldModel.build(T,m);manifold.position.z=-.225;scene.add(manifold);let model,rear=false,open=false;
const box=(w,h,d,color,x,y,z)=>{const o=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));o.position.set(x,y+h/2,z);return o;};
function render(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.position.set(rear?1.7:1.65,1.65,rear?-2.5:2.8);camera.lookAt(-.18,.4,0);camera.updateProjectionMatrix();renderer.render(scene,camera);}
function rebuild(){if(model){scene.remove(model);model.traverse(o=>{o.geometry?.dispose();});}model=FurnishKitchenModel.build(T,f,box);scene.add(model);render();window.previewReady=true;}
document.querySelector('#front').onclick=()=>{rear=false;render();};document.querySelector('#rear').onclick=()=>{rear=true;render();};document.querySelector('#toggle').onclick=()=>{open=!open;f=FurnishKitchen.toggle(f,0,undefined,open);for(let i=0;i<3;i++)f=FurnishKitchen.toggle(f,1,i,open);document.querySelector('#toggle').textContent=open?'全部关闭':'全部打开';rebuild();};window.onresize=render;rebuild();
</script></html>`,'utf8');console.log(path.join(out,'preview.html'));
