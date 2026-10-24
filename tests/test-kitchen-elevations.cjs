const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),K=require('../src/core/kitchen-core.js'),C=require('../src/core/cabinet-core.js');
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 const frames=new Map(),renderers=[];let nextFrame=0,disposals=0;
 class Element{
  constructor(){this.children=[];this.style={};this.attrs={};this.handlers={};this.clientWidth=600;this.clientHeight=360;this.isConnected=true;}
  appendChild(el){el.parent=this;this.children.push(el);}replaceChildren(...els){this.children=els;els.forEach(el=>el.parent=this);}setAttribute(k,v){this.attrs[k]=v;}remove(){this.isConnected=false;if(this.parent)this.parent.children=this.parent.children.filter(el=>el!==this);}getBoundingClientRect(){return {left:0,top:0,width:600,height:360};}addEventListener(k,fn){(this.handlers[k]??=[]).push(fn);}focus(){}hasPointerCapture(){return false;}
  fire(k,e){for(const fn of this.handlers[k]||[])fn({button:0,pointerId:1,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){},...e});}
 }
 class Renderer{constructor(){this.domElement=new Element();renderers.push(this);}setPixelRatio(){}setSize(){}render(s,c){this.scene=s;this.camera=c;s.updateMatrixWorld(true);c.updateMatrixWorld(true);}dispose(){disposals++;this.disposed=true;}forceContextLoss(){}}
 class Controls{constructor(c){this.camera=c;this.target=new T.Vector3();}update(){this.camera.lookAt(this.target);this.camera.updateMatrixWorld(true);}dispose(){}}
 const context=vm.createContext(Object.assign({FurnishPartIdentity:require("../src/core/part-identity.js"),syncIdentity:require("../src/core/part-identity.js")},{FurnishKitchen:K,FurnishCabinet:C,document:{createElement:()=>new Element(),createElementNS:()=>new Element()},devicePixelRatio:1,requestAnimationFrame:fn=>{frames.set(++nextFrame,fn);return nextFrame;},cancelAnimationFrame:id=>frames.delete(id),ResizeObserver:class{observe(){}disconnect(){}}}));
 for(const file of ['cabinet-model','kitchen-model','cabinet-preview'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+file+'.js'),'utf8'),context);
 const box=(w,h,d,color,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;},tick=()=>{const callbacks=[...frames.values()];frames.clear();callbacks.forEach(fn=>fn());};
 function walk(el,cls){return (el.className===cls?[el]:[]).concat(...el.children.map(c=>walk(c,cls)));}
 for(const corner of ['left','right'])for(const flip of [false,true]){
  let f=K.configure({id:'k',type:'counter',cx:2000,cy:1500,rot:90,flip,color:'#eee'},{version:1,shape:'L',corner,depth:600,counterDepth:630,baseHeight:820,thickness:40,modules:[{run:0,width:800.125,role:'door'},{run:1,width:800,role:'drawer'},{run:0,width:450,role:'sink'},{run:1,width:300,role:'empty'}]});
  const before=JSON.stringify(f),rows=K.elevationRuns(f);assert.equal(rows[0].furniture.w,f.w);assert.equal(rows[1].furniture.w,f.d);assert.equal(rows[0].furniture.d,630);
  assert.deepEqual(rows[0].indices.filter(i=>i!==null),flip?[2,0]:[0,2]);assert.deepEqual(rows[1].indices.filter(i=>i!==null),(corner==='left')!==flip?[3,1]:[1,3]);assert.deepEqual(rows.flatMap(r=>r.indices.filter(i=>i!==null)).sort(),[0,1,2,3]);
  for(const row of rows){K.validate(row.furniture);const g=context.FurnishKitchenModel.build(T,row.furniture,box,{previewBlind:row.blind,previewMirror:row.mirror}),blind=g.children.find(o=>o.userData.kitchenPreviewBlind);assert(blind);assert(Math.abs(new T.Box3().setFromObject(blind).getSize(new T.Vector3()).x-.6)<1e-7);assert.equal(blind.position.z,row.blind.y/1000);const modules=g.children.filter(o=>o.isGroup&&!o.userData.kitchenPreviewBlind);assert(modules.every(o=>o.scale.x===(row.mirror?-1:1)));}
  const host=new Element();let picked=null,clicked=null,preview;
  preview=context.FurnishCabinetPreview.create({THREE:{...T,WebGLRenderer:Renderer},OrbitControls:Controls,box,host,f,background:'#eee',actions:{select:part=>{picked=part;return true;},inspect:part=>{clicked=part;return true;}}});
  preview.setView({front:true,unfolded:true});tick();assert.equal(walk(host,'cab-elevation').length,2);assert.equal(walk(host,'cab-module-number').length,4);
  const widths=walk(host,'cab-dimension').filter(e=>e.textContent.startsWith('模块外宽 '));assert.equal(widths.length,4);assert(widths.every(e=>!e.hidden));
  const badge=walk(host,'cab-module-number').find(e=>e.textContent==='4');badge.onclick();assert.equal(picked.column,3);
  // Shoot a real Three.js ray through the return drawer face; its local row index maps back.
  const returnRenderer=renderers.filter(r=>!r.disposed).at(-1),row=rows[1],local=row.indices.indexOf(1);let face;
  returnRenderer.scene.traverse(o=>{if(o.isMesh&&o.userData.cabinetPart?.column===local&&o.userData.cabinetPart.drawer===0&&o.geometry.parameters?.depth===.018)face=o;});assert(face);
  const projected=new T.Box3().setFromObject(face).getCenter(new T.Vector3()).project(returnRenderer.camera),event={clientX:(projected.x+1)*300,clientY:(1-projected.y)*180};returnRenderer.domElement.fire('pointerdown',event);returnRenderer.domElement.fire('pointerup',event);assert.equal(clicked.column,1);assert.equal(clicked.drawer,0);assert(!f.kitchen.modules[1].drawerOpen?.[0],'ray selection leaves the drawer closed');f=K.toggle(f,clicked.column,clicked.drawer);preview.update(f);assert(f.kitchen.modules[1].drawerOpen[0]);
  preview.setView({dimensions:false});tick();assert.equal(walk(host,'cab-module-number').length,4);assert.equal(walk(host,'cab-dimension').length,0);
  preview.setView({front:false,unfolded:false});tick();assert.equal(walk(host,'cab-elevation').length,0);assert.equal(renderers.filter(r=>!r.disposed).length,1,'only original renderer remains');
  preview.setView({front:true,unfolded:true});tick();const straight=K.configure(f,{...f.kitchen,shape:'straight',modules:f.kitchen.modules.map(m=>({...m,run:0}))});preview.update(straight);tick();assert.equal(walk(host,'cab-elevation').length,0,'shape change clears obsolete rows');preview.dispose();assert.equal(renderers.filter(r=>!r.disposed).length,0);
  assert.equal(JSON.stringify({...f,kitchen:{...f.kitchen,modules:f.kitchen.modules.map(m=>{const next={...m};delete next.drawerOpen;return next;})}}),before,'view changes preserve source structure');
 }
 assert(disposals>=16);console.log('PASS left/right/mirrored production elevation rows, real blind geometry, exact source module indices, all width labels, real drawer ray mapping, input isolation, shape/view switching and renderer cleanup');
})().catch(e=>{console.error(e);process.exitCode=1;});
