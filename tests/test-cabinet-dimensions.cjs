/* Overlay regression uses production meshes and real camera projection, without WebGL. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../src/core/cabinet-core.js'),K=require('../src/core/kitchen-core.js');
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 class Element{
  constructor(){this.style={};this.children=[];this.attrs={};this.clientWidth=600;this.clientHeight=440;}
  appendChild(el){this.children.push(el);}replaceChildren(...els){this.children=els;}setAttribute(k,v){this.attrs[k]=v;}remove(){}addEventListener(){}hasPointerCapture(){return false;}
  getBoundingClientRect(){return {left:0,top:0,width:this.clientWidth,height:this.clientHeight};}
 }
 let tick;
 class Renderer{constructor(){this.domElement=new Element();}setPixelRatio(){}setSize(){}render(s,c){s.updateMatrixWorld(true);c.updateMatrixWorld(true);}dispose(){}forceContextLoss(){}}
 class Controls{constructor(c){this.camera=c;this.target=new T.Vector3();}update(){this.camera.lookAt(this.target);this.camera.updateMatrixWorld(true);}dispose(){}}
 const ctx=vm.createContext({FurnishCabinet:C,FurnishKitchen:K,document:{createElement:()=>new Element(),createElementNS:()=>new Element()},devicePixelRatio:1,requestAnimationFrame:fn=>{tick=fn;return 1;},cancelAnimationFrame(){},ResizeObserver:class{observe(){}disconnect(){}}});
 for(const file of ['cabinet-model','kitchen-model','cabinet-preview'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+file+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
 function inspect(f){
  const before=JSON.stringify(f),host=new Element();let picked=null,allow=true;
  const preview=ctx.FurnishCabinetPreview.create({THREE:{...T,WebGLRenderer:Renderer},OrbitControls:Controls,box,host,f,background:'#eee',actions:{select:part=>{picked=part;return allow;}}});
  const overlay=host.children.find(e=>e.className==='cab-dimensions'),items=cls=>overlay.children.filter(e=>e.className===cls),count=f.kitchen?f.kitchen.modules.length:C.config(f).columns.length;
  const product=f.kitchen?ctx.FurnishKitchenModel.build(T,f,box):ctx.FurnishCabinetModel.build(T,f,box),faces=[];product.traverse(o=>{if(o.userData.cabinetDoorSize)faces.push(o);});
  const doors=overlay.children.filter(e=>e.className==='cab-dimension cab-door-dimension'),list=host.children.find(e=>e.className==='cab-door-sizes');assert.equal(doors.length,faces.length,'every actual door has a size label');assert.equal(list.hidden,!faces.length);assert.equal(list.children.length,faces.length?faces.length+1:0,'full list preserves all door sizes even if projected labels overlap');
  faces.forEach((mesh,i)=>{const size=mesh.userData.cabinetDoorSize;assert(Math.abs(size.width-mesh.geometry.parameters.width*1000)<1e-6);assert(Math.abs(size.height-mesh.geometry.parameters.height*1000)<1e-6);assert.equal(doors[i].attrs['data-door-width'],String(size.width));assert.equal(doors[i].attrs['data-door-height'],String(size.height));});
  assert.deepEqual(items('cab-module-number').map(e=>e.textContent),Array.from({length:count},(_,i)=>String(i+1)));
  const widths=f.kitchen?f.kitchen.modules.map(m=>m.width):C.widths(f);
  widths.forEach(v=>assert(items('cab-dimension').some(e=>e.textContent===(f.kitchen?'宽 ':'净宽 ')+Number(v.toFixed(2)))));
  for(const front of [true,false]){
   preview.setView({front,doors:'hidden'});tick();
   assert.equal(items('cab-size-summary').length,1,'depth remains available even in front projection');
   for(const e of items('cab-dimension').concat(items('cab-module-number')).filter(e=>!e.hidden))assert(Number.isFinite(parseFloat(e.style.left))&&Number.isFinite(parseFloat(e.style.top)),'finite projected annotations');
   assert(!overlay.children[0].children[0].attrs.d.includes('NaN'),'finite ruler segments');
  }
  const badge=items('cab-module-number')[count-1];allow=false;badge.onclick();assert.equal(badge.attrs['aria-pressed'],'false','rejected selection stays unselected');allow=true;badge.onclick();assert.equal(picked.column,count-1);assert.equal(badge.attrs['aria-pressed'],'true');
  preview.setView({dimensions:false});tick();assert.equal(items('cab-module-number').length,count);assert.equal(items('cab-dimension').length,0);assert.equal(items('cab-size-summary').length,0);assert(!overlay.children.some(e=>e.className==='cab-dimension cab-door-dimension'));assert.equal(list.hidden,true);if(f.kitchen?.shape!=='U')assert.equal(overlay.children[0].children[0].attrs.d,'');
  preview.update(f);assert.equal(items('cab-module-number').length,count,'updates do not accumulate badges');assert.equal(JSON.stringify(f),before,'annotations do not add persistent fields');preview.dispose();
 }
  for(const [id] of C.templates)inspect({type:'cabinet',...C.preset(id)});
  for(const door of ['left','right','double','up','down','none']){const f={type:'cabinet',...C.preset('storage')};f.cabinet.columns.forEach(col=>col.door=door);inspect(f);}
 for(const shape of ['straight','L','U'])for(const corner of ['left','right'])for(const flip of [false,true]){
  const modules=[{run:0,width:800.125,role:'door'},{run:shape==='L'?1:0,width:600,role:'empty'},{run:0,width:450,role:'sink'},...(shape==='U'?[{run:1,width:400,role:'door'},{run:2,width:800,role:'door'}]:[])];
  inspect(K.configure({type:'counter',cx:0,cy:0,rot:90,flip,color:'#eee'},{version:1,shape,corner,depth:600,baseHeight:820,thickness:40,modules}));
 }
 console.log('PASS all cabinet templates, straight/left/right/mirrored kitchen module numbering, empty/interleaved modules, precise clear/nominal dimensions, production projection, selection refusal, dimension toggle and draft isolation');
})().catch(e=>{console.error(e);process.exitCode=1;});
