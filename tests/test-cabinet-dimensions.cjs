/* Overlay regression uses production meshes and real camera projection, without WebGL. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../src/core/cabinet-core.js'),K=require('../src/core/kitchen-core.js');
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 class Element{
  constructor(){this.style={};this.children=[];this.attrs={};this.clientWidth=600;this.clientHeight=440;}
  focus(){}select(){}
  appendChild(el){this.children.push(el);}replaceChildren(...els){this.children=els;}setAttribute(k,v){this.attrs[k]=v;}remove(){}addEventListener(){}hasPointerCapture(){return false;}
  getBoundingClientRect(){return {left:0,top:0,width:this.clientWidth,height:this.clientHeight};}
 }
 let tick;
 class Renderer{constructor(){this.domElement=new Element();}setPixelRatio(){}setSize(){}render(s,c){s.updateMatrixWorld(true);c.updateMatrixWorld(true);}dispose(){}forceContextLoss(){}}
 class Controls{constructor(c){this.camera=c;this.target=new T.Vector3();}update(){this.camera.lookAt(this.target);this.camera.updateMatrixWorld(true);}dispose(){}}
 const ctx=vm.createContext({FurnishCabinet:C,FurnishKitchen:K,FurnishProducts:require('../src/core/product-rules.js'),document:{createElement:()=>new Element(),createElementNS:()=>new Element()},devicePixelRatio:1,requestAnimationFrame:fn=>{tick=fn;return 1;},cancelAnimationFrame(){},ResizeObserver:class{observe(){}disconnect(){}}});
 for(const file of ['solid-cut','cabinet-model','sink-model','kitchen-model','cabinet-preview'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+file+'.js'),'utf8'),ctx);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
 function inspect(f){
  const before=JSON.stringify(f),host=new Element();let picked=null,allow=true;
  const preview=ctx.FurnishCabinetPreview.create({THREE:{...T,WebGLRenderer:Renderer},OrbitControls:Controls,box,host,f,background:'#eee',actions:{select:part=>{picked=part;return allow;}}});
  const overlay=host.children.find(e=>e.className==='cab-dimensions'),items=cls=>overlay.children.filter(e=>e.className===cls),count=f.kitchen?f.kitchen.modules.length:C.config(f).columns.length;
  const product=f.kitchen?ctx.FurnishKitchenModel.build(T,f,box):ctx.FurnishCabinetModel.build(T,f,box),faces=[];let movingDoors=0;product.traverse(o=>{if(o.userData.cabinetDoorSize)faces.push(o);if(o.userData.motion?.kind==='cabinetdoor')movingDoors++;});assert.equal(faces.length,movingDoors,'each actual hinged door has production size metadata');
  const drawers=[];product.traverse(o=>{if(o.userData.cabinetDrawerBoard==='front')drawers.push(o);});const frontCount=faces.length+drawers.length;
  const drawerLabels=overlay.children.filter(e=>e.className==='cab-dimension cab-drawer-front-dimension');assert.equal(drawerLabels.length,drawers.length,'every exterior drawer front is annotated');drawers.forEach((mesh,i)=>{const size=mesh.userData.cabinetDrawerSize;assert(size,'each production drawer front has dimensions');const p=mesh.geometry.parameters;assert(Math.abs(size.width-p.width*1000)<1e-6);assert(Math.abs(size.height-p.height*1000)<1e-6);assert.equal(drawerLabels[i].attrs['data-drawer-width'],String(size.width));assert.equal(drawerLabels[i].attrs['data-drawer-height'],String(size.height));});
  const doors=overlay.children.filter(e=>e.className==='cab-dimension cab-door-dimension'),list=host.children.find(e=>e.className==='cab-door-sizes');assert.equal(doors.length,faces.length,'every actual door has a size label');assert.equal(list.hidden,!frontCount);assert.equal(list.children.length,frontCount?frontCount+1:0,'full list preserves all door sizes even if projected labels overlap');
  assert(list.children.every(row=>!String(row.textContent).includes('undefined')),'all panels have readable captions');
  faces.forEach((mesh,i)=>{const size=mesh.userData.cabinetDoorSize,geometry=mesh.geometry.parameters;if(geometry){assert(Math.abs(size.width-geometry.width*1000)<1e-6);assert(Math.abs(size.height-geometry.height*1000)<1e-6);}else{const bounds=new T.Box3().setFromBufferAttribute(mesh.geometry.attributes.position).getSize(new T.Vector3());assert(bounds.x*1000<=size.width+.001&&bounds.y*1000<=size.height+.001,'cut panel stays within its nominal size');}assert.equal(doors[i].attrs['data-door-width'],String(size.width));assert.equal(doors[i].attrs['data-door-height'],String(size.height));});
  preview.setView({dimensionScope:'size'});tick();assert.equal(overlay.children.filter(el=>el.className==='cab-dimension cab-door-dimension').length,faces.length,'initial overall-size tab includes every production door');assert.equal(overlay.children.filter(el=>el.className==='cab-dimension cab-drawer-front-dimension').length,drawers.length,'initial tab includes all drawer fronts');assert.equal(list.hidden,!frontCount);assert(items('cab-dimension').some(el=>el.textContent.startsWith('总高')||el.textContent.startsWith('台面高')||el.textContent.startsWith('整柜高')||el.textContent.startsWith('柜高')),'outer dimensions remain alongside doors');
  preview.selectPart({column:count-1});preview.setView({dimensionScope:'front'});tick();
  assert.equal(list.children.length,frontCount?frontCount+1:0,'complete list includes all doors regardless of selected bay');
  const extra=faces.filter(mesh=>mesh.userData.cabinetDoorSize.assembly||f.kitchen&&mesh.userData.cabinetPart.column>=count);
  for(const mesh of extra){const size=mesh.userData.cabinetDoorSize;assert(overlay.children.some(el=>el.className==='cab-dimension cab-door-dimension'&&el.attrs['data-door-width']===String(size.width)&&el.attrs['data-door-height']===String(size.height)),'assembly and end doors stay annotated outside base-module selection');}
  if(f.kitchen?.laundry?.assembly){assert(list.children.some(el=>el.textContent.includes('洗衣柜吊柜 · 分区 4')),'assembly caption identifies its own bay');}
  if(f.kitchen?.modules.some(m=>m.role==='custom'))assert(list.children.some(el=>el.textContent.includes('内部分区 2')),'custom-module captions distinguish interior bays');
  preview.setView({dimensionScope:'all'});
  if(['L','U'].includes(f.kitchen?.shape)){const parentTick=tick;preview.setView({front:true,unfolded:true,dimensionScope:'size'});preview.selectPart({column:0});assert.equal(list.hidden,true,'selection in unfolded view cannot redisplay the duplicate parent list');preview.setView({front:false,unfolded:false,dimensionScope:'all'});tick=parentTick;}
  assert.deepEqual(items('cab-module-number').map(e=>e.textContent),Array.from({length:count},(_,i)=>String(i+1)));
  const widths=f.kitchen?f.kitchen.modules.map(m=>m.width):C.moduleWidths(f);
  widths.forEach(v=>assert(items('cab-dimension').some(e=>e.textContent==='模块外宽 '+Number(v.toFixed(2)))));
  for(const front of [true,false]){
   preview.setView({front,doors:'hidden'});tick();
   assert.equal(items('cab-size-summary').length,1,'depth remains available even in front projection');
   for(const e of items('cab-dimension').concat(items('cab-module-number')).filter(e=>!e.hidden))assert(Number.isFinite(parseFloat(e.style.left))&&Number.isFinite(parseFloat(e.style.top)),'finite projected annotations');
   assert(!overlay.children[0].children[0].attrs.d.includes('NaN'),'finite ruler segments');
  }
  preview.selectPart(null);const badge=items('cab-module-number')[count-1];allow=false;badge.onclick();assert.equal(badge.attrs['aria-pressed'],'false','rejected selection stays unselected');allow=true;badge.onclick();assert.equal(picked.column,count-1);assert.equal(badge.attrs['aria-pressed'],'true');
  preview.setView({dimensions:false});tick();assert.equal(items('cab-module-number').length,count);assert.equal(items('cab-dimension').length,0);assert.equal(items('cab-size-summary').length,0);assert(!overlay.children.some(e=>e.className==='cab-dimension cab-door-dimension'));assert.equal(list.hidden,true);if(f.kitchen?.shape!=='U')assert.equal(overlay.children[0].children[0].attrs.d,'');
  preview.update(f);assert.equal(items('cab-module-number').length,count,'updates do not accumulate badges');assert.equal(JSON.stringify(f),before,'annotations do not add persistent fields');preview.dispose();
 }
  for(const [id] of C.templates)inspect({type:'cabinet',...C.preset(id)});
  for(const id of ['wardrobe','entry-console','sideboard-wall','tv-floor'])for(const overlay of ['full','half','inset']){const f={type:'cabinet',rot:37,flip:true,...C.preset(id)};f.cabinet.doorOverlay=overlay;f.cabinet.columns.forEach(col=>{col.topOpen=true;col.drawers.forEach(drawer=>Object.assign(drawer,{open:true,extension:.5}));});inspect(f);}
  for(const door of ['left','right','double','up','down','none']){const f={type:'cabinet',...C.preset('storage')};f.cabinet.columns.forEach(col=>col.door=door);inspect(f);}
 for(const shape of ['straight','L','U'])for(const corner of ['left','right'])for(const flip of [false,true])for(const role of ['empty','drawer']){
  const modules=[{run:0,width:800.125,role:'door'},{run:shape==='L'?1:0,width:600,role},{run:0,width:450,role:'sink'},...(shape==='U'?[{run:1,width:400,role:'door'},{run:2,width:800,role:'door'}]:[])];
  inspect(K.configure({type:'counter',cx:0,cy:0,rot:90,flip,color:'#eee'},{version:1,shape,corner,depth:600,baseHeight:820,thickness:40,modules,endExtensions:[{run:0,length:200,depth:600}]}));
 }
 const basket=K.configure({type:'counter',cx:0,cy:0,rot:0,color:'#eee'},{version:1,shape:'straight',depth:600,baseHeight:830,thickness:20,modules:[{run:0,width:800,role:'drawer'}]});inspect(K.setDrawerStyle(basket,0,'dish-basket'));
 for(const type of C.types)inspect({type,...C.preset(type==='vanity'?'base':'storage')});
 const wall=C.preset('wall');wall.cabinet.autoDoors=false;wall.cabinet.columns.push(structuredClone(wall.cabinet.columns[0]));wall.cabinet.columns.forEach(col=>delete col.width);C.validate({type:'kitchenwall',...wall});
 const custom=K.configure({type:'kitchenwall',cx:0,cy:0,rot:90,color:'#eee'},{version:1,shape:'straight',depth:wall.d,baseHeight:wall.h,thickness:0,modules:[{run:0,width:wall.w,role:'custom',structure:{w:wall.w,d:wall.d,h:wall.h,cabinet:wall.cabinet}},{run:0,width:450,role:'door'}]});inspect(custom);
 custom.kitchen.modules[0].structure.cabinet.columns[0].drawers=[{height:120,open:true}];K.validate(custom);inspect(custom);
 let serial=0;for(const side of ['left','right']){const f=K.createLaundryCabinet({id:'laundry',cx:0,cy:0,rot:37,color:'#eee'},()=>`part${++serial}`,side)[0];inspect(f);f.kitchen.laundry.assembly.open.cabinet.columns.forEach(col=>col.door='left');inspect(f);}
 // Actual preview projection must retain even sub-pixel/zero gap annotations.
 const peg={...C.preset('entry-pegboard'),id:'peg',type:'cabinet',cx:0,cy:0,rot:0};peg.cabinet.pegboardParts=Object.fromEntries(ctx.FurnishProducts.pegboardAssembly.parts.map(k=>[k,false]));peg.cabinet.pegboardBottom=600;
 const electrical={id:'box',type:'electrical_box_strong',w:300,d:120,h:220,mountHeight:1200,cx:0,cy:-227,rot:0},pegPlan={walls:[],rooms:[]},fitted=C.setPegboardHatchMode(peg,0,'auto',{plan:pegPlan,furniture:[peg,electrical]}),surface=new Element();
 const pegPreview=ctx.FurnishCabinetPreview.create({THREE:{...T,WebGLRenderer:Renderer},OrbitControls:Controls,box,host:surface,f:fitted,furniture:[electrical],plan:pegPlan,background:'#eee',actions:{hatchMargin:(column,side,value)=>C.editPegboardHatchMargin(fitted,column,side,value,{plan:pegPlan,furniture:[electrical]})}}),layer=surface.children.find(e=>e.className==='cab-dimensions'),margins=()=>layer.children.filter(e=>e.attrs['data-hatch-margin']);
 assert.equal(margins().length,4);assert(margins().every(e=>!e.hidden));const svg=layer.children.find(e=>e.attrs.class==='cab-dimension-lines'),outlines=()=>svg.children.filter(e=>e.attrs.class?.includes('outline'));assert(outlines().every(e=>e.attrs.d.includes('Z')));
 const topLabel=margins().find(e=>e.attrs['data-hatch-margin']==='top');assert.equal(topLabel.attrs.role,'button');topLabel.onclick({stopPropagation(){}});let marginForm=surface.children.filter(e=>e.className==='cab-hatch-input').at(-1),marginInput=marginForm.children[0].children[0];marginInput.value='25';assert(pegPreview.finishHatchInput());tick();assert.equal(margins().find(e=>e.attrs['data-hatch-margin']==='top').attrs['data-hatch-target'],'25');
 margins().find(e=>e.attrs['data-hatch-margin']==='left').onclick({stopPropagation(){}});marginForm=surface.children.filter(e=>e.className==='cab-hatch-input').at(-1);marginInput=marginForm.children[0].children[0];marginInput.value='-1';assert.equal(pegPreview.finishHatchInput(),false);assert.equal(marginInput.attrs['aria-invalid'],'true');marginInput.onkeydown({key:'Escape',preventDefault(){},stopPropagation(){}});assert(pegPreview.finishHatchInput());
 const changed=structuredClone(fitted);changed.cabinet.columns[0].pegboardHatch.padding={top:0,bottom:10,left:10,right:10};pegPreview.update(C.fitPegboardHatch(changed,0,{plan:pegPlan,furniture:[electrical]}));tick();assert.equal(margins().find(e=>e.attrs['data-hatch-margin']==='top').attrs['data-hatch-actual'],'0');assert(margins().every(e=>!e.hidden));
 pegPreview.setView({dimensions:false});tick();assert.equal(margins().length,0);assert(outlines().every(e=>e.attrs.d===''));pegPreview.setView({dimensions:true,front:true});tick();assert.equal(margins().length,4);assert(margins().every(e=>!e.hidden));pegPreview.dispose();
 console.log('PASS all cabinet templates, straight/left/right/mirrored kitchen module numbering, empty/interleaved modules, precise clear/nominal dimensions, production projection, selection refusal, dimension toggle and draft isolation');
})().catch(e=>{console.error(e);process.exitCode=1;});
