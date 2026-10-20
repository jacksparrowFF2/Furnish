/* Exercise real Three.js ray picking and projection with a lightweight DOM/renderer. */
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),C=require('../src/core/cabinet-core.js');
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,three=await import(imports.three);
 class Element {
  constructor(){this.style={};this.handlers={};this.capture=null;this.isConnected=true;this.children=[];this.attributes={};}
  setAttribute(k,v){this.attributes[k]=v;} appendChild(el){this.children.push(el);} replaceChildren(...children){this.children=children;} focus(){} remove(){this.isConnected=false;}
  getBoundingClientRect(){return {left:0,top:0,width:500,height:440};}
  addEventListener(type,fn,capture=false){(this.handlers[type]??=[]).push({fn,capture});}
  setPointerCapture(id){this.capture=id;} hasPointerCapture(id){return this.capture===id;} releasePointerCapture(){this.capture=null;}
  fire(type,data){const e={button:0,pointerId:1,preventDefault(){},stopPropagation(){},stopImmediatePropagation(){this.stopped=true;},...data};for(const {fn} of (this.handlers[type]||[]).slice().sort((a,b)=>Number(b.capture)-Number(a.capture))){fn(e);if(e.stopped)break;}return e;}
 }
 let canvas,scene,camera,controls,orbitPresses=0,disconnected=false;
 class Renderer {
  constructor(){canvas=this.domElement=new Element();}
  setPixelRatio(){} setSize(){} dispose(){} forceContextLoss(){}
  render(sc,cam){scene=sc;camera=cam;sc.updateMatrixWorld(true);cam.updateMatrixWorld(true);}
 }
 class Controls {
  constructor(cam,cv){controls=this;this.cam=cam;this.target=new three.Vector3();this.enabled=true;cv.addEventListener('pointerdown',()=>{if(this.enabled)orbitPresses++;});}
  update(){this.cam.lookAt(this.target);this.cam.updateMatrixWorld(true);} dispose(){}
 }
 const host=new Element();host.clientWidth=500;host.clientHeight=440;
 let tick;const context=vm.createContext({FurnishCabinet:C,document:{createElement:()=>new Element(),createElementNS:()=>new Element()},devicePixelRatio:1,requestAnimationFrame:fn=>{tick=fn;return 1;},cancelAnimationFrame(){},ResizeObserver:class{observe(){}disconnect(){disconnected=true;}}});
 for(const file of ['cabinet-model','cabinet-preview'])vm.runInContext(fs.readFileSync(require.resolve(`../src/render/${file}.js`),'utf8'),context);
 const box=(w,h,d,color,x,y,z)=>{const mesh=new three.Mesh(new three.BoxGeometry(w,h,d),new three.MeshStandardMaterial({color}));mesh.position.set(x,y+h/2,z);return mesh;};
 let draft=C.setColumnWidth({type:'cabinet',color:'#efe6d8',...C.preset('sideboard-open')},0,350),picked=null,toggles=0;
 const preview=context.FurnishCabinetPreview.create({THREE:{...three,WebGLRenderer:Renderer},OrbitControls:Controls,box,host,f:draft,background:'#eeeae3',actions:{
  select:part=>{picked=part;return true;},move:(part,value)=>(draft=C.moveShelf(draft,part.column,part.shelf,value)),divider:(i,width)=>(draft=C.moveDivider(draft,i,width-C.widths(draft)[i])),toggle:()=>toggles++,
 }});
 const height=()=>draft.cabinet.columns[0].shelves[0];
 function atShelf(){scene.updateMatrixWorld(true);let mesh;scene.traverse(o=>{if(o.isMesh&&o.userData.cabinetShelf?.column===0&&o.userData.cabinetShelf.shelf===0)mesh=o;});const point=mesh.getWorldPosition(new three.Vector3());point.z+=mesh.geometry.parameters.depth/2;point.project(camera);return {clientX:(point.x+1)*250,clientY:(1-point.y)*220};}
 const original=height(),start=atShelf(),cameraStart=camera.position.clone();canvas.fire('pointerdown',start);
 assert.equal(picked.column,0);assert.equal(picked.shelf,0);assert.equal(controls.enabled,false);assert.equal(orbitPresses,0,'a shelf press must not reach orbit controls');
 canvas.fire('pointermove',{...start,clientY:start.clientY-25});assert(height()>original);assert(camera.position.equals(cameraStart));
 canvas.fire('pointermove',{...start,clientY:-10000});assert.equal(height(),C.shelfLimits(draft,0,0).max);
 canvas.fire('pointerup',{...start,clientY:-10000});assert.equal(controls.enabled,true);assert.equal(toggles,0,'dragging a shelf must not toggle a door or drawer');
 canvas.fire('keydown',{key:'ArrowDown'});const lower=height();canvas.fire('keydown',{key:'ArrowDown',shiftKey:true});assert.equal(height(),lower-1);
 const beforeCancel=height(),cancelStart=atShelf();canvas.fire('pointerdown',cancelStart);canvas.fire('pointermove',{...cancelStart,clientY:cancelStart.clientY+100});assert.equal(height(),C.shelfLimits(draft,0,0).min);canvas.fire('pointercancel',cancelStart);assert.equal(height(),beforeCancel);assert.equal(controls.enabled,true);
 const escapeStart=atShelf();canvas.fire('pointerdown',escapeStart);canvas.fire('pointermove',{...escapeStart,clientY:escapeStart.clientY-15});canvas.fire('keydown',{key:'Escape'});assert.equal(height(),beforeCancel);assert.equal(controls.enabled,true);
 canvas.fire('keydown',{key:'Escape'});assert.equal(picked,null);const unselectedHeight=height();canvas.fire('keydown',{key:'ArrowUp'});assert.equal(height(),unselectedHeight);
 canvas.fire('pointerdown',{clientX:10,clientY:10});assert.equal(orbitPresses,1,'empty-space presses remain available for orbit controls');canvas.fire('pointerup',{clientX:10,clientY:10});
 preview.setView({front:true,doors:'hidden'});tick();assert(camera.isOrthographicCamera);assert.equal(controls.enableRotate,false);
 let dividerMesh;scene.traverse(o=>{if(o.isMesh&&o.userData.cabinetDivider?.divider===0)dividerMesh=o;});const point=dividerMesh.getWorldPosition(new three.Vector3());point.z+=dividerMesh.geometry.parameters.depth/2;point.project(camera);const dividerStart={clientX:(point.x+1)*250,clientY:(1-point.y)*220},oldWidths=C.widths(draft),total=draft.w;
 canvas.fire('pointerdown',dividerStart);assert.equal(picked.divider,0);canvas.fire('pointermove',{...dividerStart,clientX:dividerStart.clientX+25});assert(C.widths(draft)[0]>oldWidths[0]);assert(C.widths(draft)[1]<oldWidths[1]);assert.equal(draft.w,total);canvas.fire('keydown',{key:'Escape'});assert.deepEqual(C.widths(draft),oldWidths);
 canvas.fire('keydown',{key:'ArrowRight',shiftKey:true});assert.equal(C.widths(draft)[0],oldWidths[0]+1);assert.equal(draft.w,total);
 preview.setView({front:false,doors:'ghost',dimensions:false});tick();assert(camera.isPerspectiveCamera);assert.equal(controls.enableRotate,true);
 const annotations=host.children.find(el=>el.className==='cab-dimensions'),texts=()=>annotations.children.map(el=>el.textContent||'');
 draft={...draft,...C.preset('wardrobe')};preview.update(draft);const saved=JSON.stringify(draft);
 preview.setView({dimensionScope:'size',dimensions:true});tick();assert(texts().some(s=>s.startsWith('总宽')));assert(!texts().some(s=>s.startsWith('净宽')));assert(texts().some(s=>/^\d+×\d+/.test(s)),'door sizes are visible on the initial overall-size step');
 preview.selectPart({column:1});preview.setView({dimensionScope:'bays'});tick();assert.equal(texts().filter(s=>s.startsWith('净宽')).length,1);assert(texts().includes('净宽 '+Number(C.widths(draft)[1].toFixed(2))));assert(!texts().some(s=>s.startsWith('总宽')));
 preview.selectPart({column:0});tick();assert(texts().includes('净宽 '+Number(C.widths(draft)[0].toFixed(2))));
 preview.setView({dimensionScope:'front'});tick();assert(!texts().some(s=>s.startsWith('净宽')));assert(texts().some(s=>/^\d+×\d+/.test(s)));
 preview.setView({dimensionScope:'space'});tick();assert(texts().some(s=>s.startsWith('总高')));assert(!texts().some(s=>/^\d+×\d+/.test(s)));assert.equal(JSON.stringify(draft),saved,'step navigation must not change the saved cabinet');
 preview.dispose();assert(disconnected);assert.equal(canvas.isConnected,false);
 // Real production ray picks now select objects rather than toggling motion.
 const fixture={type:'cabinet',...C.preset('sideboard-open')};fixture.cabinet.columns[1].door='double';let inspected=null;
 const accept=p=>{inspected=p;return true;},inspector=context.FurnishCabinetPreview.create({THREE:{...three,WebGLRenderer:Renderer},OrbitControls:Controls,box,host:new Element(),f:fixture,background:'#eeeae3',actions:{inspect:accept,select:accept,move:()=>null,divider:()=>null}});
 inspector.setView({front:true});tick();
 for(const [kind,match] of [['door',o=>o.userData.cabinetDoorSize],['drawer',o=>o.userData.cabinetDrawerBoard==='front'&&o.userData.cabinetPart.column===0],['bay',o=>o.userData.cabinetBay?.column===0],['shelf',o=>o.userData.cabinetShelf?.column===0]]){
  let mesh;scene.traverse(o=>{if(o.isMesh&&match(o))mesh=o;});mesh.geometry.computeBoundingBox();const at=mesh.localToWorld(mesh.geometry.boundingBox.getCenter(new three.Vector3()));at.z+=.0001;at.project(camera);const pos={clientX:(at.x+1)*250,clientY:(1-at.y)*220};canvas.fire('pointerdown',pos);canvas.fire('pointerup',pos);
  assert(inspected,kind+' can be selected by a real ray');assert.equal(kind==='shelf'&&inspected.shelf!==undefined?'shelf':inspected.kind,kind);
 }
 const untouched=JSON.stringify(fixture);canvas.fire('pointerdown',{clientX:5,clientY:5});canvas.fire('pointerup',{clientX:5,clientY:5});assert.equal(inspected.kind,'body');assert.equal(JSON.stringify(fixture),untouched,'selection must not toggle a door or drawer');inspector.dispose();
 console.log('PASS shelf/divider picking, constrained dragging, fixed total width, keyboard edits, cancellation, front view and preview cleanup');
})().catch(e=>{console.error(e);process.exit(1);});

