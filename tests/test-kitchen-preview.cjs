const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const K=require('../src/core/kitchen-core.js'),C=require('../src/core/cabinet-core.js'),P=require('../src/core/product-rules.js');
(async()=>{
 const imports=JSON.parse(fs.readFileSync(require.resolve('../index.html'),'utf8').match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,T=await import(imports.three);
 class Element{constructor(){this.style={};this.children=[];this.handlers={};this.isConnected=true;this.clientWidth=600;this.clientHeight=360;}appendChild(v){this.children.push(v);}replaceChildren(...v){this.children=v;}setAttribute(){}remove(){this.isConnected=false;}getBoundingClientRect(){return {left:0,top:0,width:600,height:360};}addEventListener(k,fn){(this.handlers[k]??=[]).push(fn);}hasPointerCapture(){return false;}fire(k,e){for(const fn of this.handlers[k]||[])fn({button:0,pointerId:1,clientX:300,clientY:180,...e});}}
 let scene,camera,canvas,tick,disposed=0,orbit=0;
 class Renderer{constructor(){canvas=this.domElement=new Element();}setPixelRatio(){}setSize(){}render(s,c){scene=s;camera=c;s.updateMatrixWorld(true);c.updateMatrixWorld(true);}dispose(){disposed++;}forceContextLoss(){}}
 class Controls{constructor(c,cv){this.camera=c;this.target=new T.Vector3();this.enabled=true;cv.addEventListener('pointerdown',()=>orbit++);}update(){this.camera.lookAt(this.target);}dispose(){}}
 const context=vm.createContext({FurnishKitchen:K,FurnishCabinet:C,document:{createElement:()=>new Element(),createElementNS:()=>new Element()},devicePixelRatio:1,requestAnimationFrame:fn=>{tick=fn;return 1;},cancelAnimationFrame(){},ResizeObserver:class{observe(){}disconnect(){}}});
 context.FurnishProducts=P;
 for(const file of ['cabinet-model','kitchen-model','fotile-model','cabinet-preview'])vm.runInContext(fs.readFileSync(require.resolve('../src/render/'+file+'.js'),'utf8'),context);
 const box=(w,h,d,color,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color}));m.position.set(x,y+h/2,z);return m;};
 let f=K.configure({id:'k',type:'counter',cx:0,cy:0,w:2400,d:1800,rot:0,color:'#eee'},{version:1,shape:'L',corner:'right',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:900,role:'door'},{run:0,width:900,role:'drawer'},{run:1,width:1200,role:'door'}]});
 for(const flip of [false,true]){
  const host=new Element(),before=JSON.stringify(f);let clicked=null,current={...f,flip},preview;
  preview=context.FurnishCabinetPreview.create({THREE:{...T,WebGLRenderer:Renderer},OrbitControls:Controls,box,host,f:current,background:'#eee',actions:{toggle(column,drawer,lid,lane,section,leaf){clicked={column,drawer,leaf};current=K.toggle(current,column,drawer,undefined,leaf);preview.update(current);},select(){throw Error('kitchen must not pick generic shelves');},move(){throw Error('kitchen must not drag generic shelves');}}});
  tick();assert(camera.position.x*(flip?-1:1)<0,'right return viewed from interior');
  const model=scene.children.find(o=>o.isGroup);assert(model);assert.equal(model.scale.x,flip?-1:1);assert(Math.abs(new T.Box3().setFromObject(model).max.y-.86)<1e-6);
  const tags=[];model.traverse(o=>{if(o.userData.cabinetShelf||o.userData.cabinetDivider||o.userData.cabinetBay)tags.push(o);});assert.equal(tags.length,0,'production module tags cannot trigger unrelated cabinet drags');
  canvas.fire('pointerdown',{});assert(orbit>0);preview.setView({front:true});tick();assert(camera.isOrthographicCamera);
  const frontModel=scene.children.find(o=>o.isGroup);let face;frontModel.traverse(o=>{if(o.isMesh&&o.userData.cabinetPart?.column===0&&o.parent.userData.motion?.kind==='cabinetdoor'&&o.geometry.parameters?.depth===.018)face=o;});assert(face);
  const screen=new T.Box3().setFromObject(face).getCenter(new T.Vector3()).project(camera),event={clientX:(screen.x+1)*300,clientY:(1-screen.y)*180};canvas.fire('pointerdown',event);canvas.fire('pointerup',event);tick();assert.equal(clicked?.column,0,'real preview ray dispatches the kitchen module');assert.equal(current.kitchen.modules[0].doorOpen,true);assert.equal(clicked.leaf,face.userData.cabinetPart.leaf);assert.equal(current.kitchen.modules[0].doorLeaves.filter(s=>s.open).length,1,'real ray opens one leaf only');let rotated=false;scene.children.find(o=>o.isGroup).traverse(o=>{if(o.userData.motion?.kind==='cabinetdoor'&&Math.abs(o.rotation.y)>.1)rotated=true;});assert(rotated,'click rotates production door pivots');
  preview.update({...f,flip,kitchen:{...f.kitchen,baseHeight:920}});tick();const updated=scene.children.find(o=>o.isGroup);assert(Math.abs(new T.Box3().setFromObject(updated).max.y-.96)<1e-6);assert.equal(JSON.stringify(f),before);
  const labels=host.children.find(el=>el.className==='cab-dimensions'),doorList=host.children.find(el=>el.className==='cab-door-sizes'),text=()=>labels.children.map(el=>el.textContent||'');
  preview.selectShelf({column:2});preview.setView({dimensionScope:'front'});tick();assert(text().some(s=>s.includes('×')));assert(labels.children.filter(el=>el.className==='cab-dimension cab-door-dimension').every(el=>el.title.startsWith('模块 3 ')),'projected door scope follows the production module index, including mirrored kitchens');assert(doorList.children.some(el=>el.textContent.startsWith('模块 1 '))&&doorList.children.some(el=>el.textContent.startsWith('模块 3 ')),'complete list preserves doors in unselected modules');
  preview.setView({dimensionScope:'modules'});tick();assert.equal(text().filter(s=>s.startsWith('宽 ')).length,1);assert(text().includes('宽 1200'));assert(!text().some(s=>/^\d+.*×/.test(s)));
  preview.selectShelf({column:0});tick();assert(text().includes('宽 900'));assert(!text().includes('宽 1200'));assert.equal(JSON.stringify(f),before);
  preview.dispose();assert.equal(canvas.isConnected,false);
 }
 assert.equal(disposed,2);
 // A fitting appliance belongs to the room, not to the cabinet being edited.
 const wall=C.configureHoodBay({...C.preset('wall'),id:'wall',type:'kitchenwall',w:970,cx:3000,cy:3000,mountHeight:1660,color:'#eee'}),hood={id:'hood',type:'rangehood_fotile_jcd10ta',w:900,d:350,h:520,cx:3000,cy:3000,rot:0,mountHeight:1315};
 for(const modular of [false,true])for(const [rot,flip] of [[0,false],[37,true],[180,false]]){
  const current={...(modular?K.fromWall(wall):wall),rot,flip},device=C.centerHoodInBay(current,hood,true),furniture=[current,device],before=JSON.stringify(furniture);assert(C.hoodBayFit(current,device).fits);
  let expected;
  for(const neighbors of [[],furniture]){
   const preview=context.FurnishCabinetPreview.create({THREE:{...T,WebGLRenderer:Renderer},OrbitControls:Controls,box,host:new Element(),f:current,furniture:neighbors,background:'#eee',actions:{}});
   for(const front of [false,true]){
    preview.setView({front});tick();const model=scene.children.find(o=>o.isGroup),bounds=new T.Box3().setFromObject(model);let appliances=0;model.traverse(o=>{if(o.userData.fotilePart)appliances++;});assert.equal(appliances,0,'cabinet preview must leave fitting room appliances out');assert(bounds.min.y>=-1e-6,'preview bounds begin at the cabinet bottom');
    const actual={bounds:[bounds.min.toArray(),bounds.max.toArray()],camera:camera.position.toArray()};
    if(!neighbors.length)(expected??={})[front]=actual;else assert.deepEqual(actual,expected[front],'room appliances must not alter preview geometry or framing');
   }
   preview.dispose();
  }
  assert.equal(JSON.stringify(furniture),before,'preview preserves the cabinet and independent appliance');
 }
 console.log('PASS kitchen production preview, mirrored camera, picking, draft isolation, disposal and cabinet-only hood cavity previews with fitting room appliances');
})().catch(e=>{console.error(e);process.exitCode=1;});
