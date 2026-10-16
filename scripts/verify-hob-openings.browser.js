async page=>{
 const context=await page.context().browser().newContext({viewport:{width:1500,height:1000}}),p=await context.newPage(),errors=[],dir='output/playwright/hob-openings/';
 const check=(ok,message)=>{if(!ok)throw Error(message);};p.on('pageerror',e=>errors.push(e.message));
 try{
  await p.goto('http://127.0.0.1:18081/');await p.locator('#drawing-compass').waitFor();
  await p.evaluate(()=>{
   Object.assign(PLAN,{walls:[],wins:[],doors:[],slides:[]});applyPlanData();
   state=freshWork(PLAN);state.furniture=[F('counter','台面',3000,3000,1800,600,0,'#d5c9b6'),F('stove_fotile_th36b','方太燃气灶 TH36B-T',3100,3010,750,440,0,'#111214')];
   delete state.furniture[0].kitchen;state.furniture[0].id='top';state.furniture[1].id='hob';ui.layers.clear=false;ui.layers.grid=false;ui.layers.collide=false;ui.layers.dims=true;ui.layers.labels=false;Object.values(state.rooms).forEach(r=>r.mat='tile800');
   renderAll();selectIds([]);zoomToBox([1950,2450,4050,3550],60);
  });
  const margins=()=>p.evaluate(()=>Object.fromEntries(Object.entries(FurnishSnapping.hobOpening(getF('hob'),{furniture:state.furniture}).gaps).map(([k,v])=>[k,Number(v.distance.toFixed(1))])));
  check(JSON.stringify(await margins())===JSON.stringify({l:670,r:470,t:135,b:115}),'nominal cutout margins');
  check(await p.locator('[data-hob-cutout]').count()===1,'dashed outline');check(await p.locator('[data-hob-gap]').count()===4,'four labels');
  check(await p.locator('[data-hob-opening]').textContent().then(s=>s.includes('660 × 350 mm')),'cutout size');
  await p.screenshot({path:dir+'desktop.png',animations:'disabled'});
  check(await p.evaluate(()=>{const s=preparePlanSVG().svg,o=s.querySelector('[data-hob-opening]');return o&&o.querySelectorAll('[data-hob-gap]').length===4&&o.querySelector('[data-hob-cutout]').getAttribute('stroke-dasharray')==='6 4';}),'SVG/PNG export contains geometry and labels');
  check(await p.evaluate(()=>{const s=preparePlanSVG({dimensions:false}).svg;return s.querySelector('[data-hob-cutout]')&&!s.querySelector('[data-hob-gap]');}),'dimension-free export keeps only outline');
  check(await p.evaluate(async()=>{const s=preparePlanSVG().svg,img=new Image();img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(new XMLSerializer().serializeToString(s));await img.decode();const cv=document.createElement('canvas');cv.width=img.width;cv.height=img.height;cv.getContext('2d').drawImage(img,0,0);return cv.toDataURL('image/png').startsWith('data:image/png');}),'actual PNG rasterization');
  await p.evaluate(()=>{mutate(()=>state.furniture.push({...F('rangehood_fotile_jcd10ta','抽油烟机',3100,3150,900,350,0,'#222'),id:'hood'}));renderAll();selectIds([]);});
  check(await p.locator('[data-hob-gap]').count()===4,'hood does not cover cutout annotation');await p.screenshot({path:dir+'with-hood.png',animations:'disabled'});
  const slab=await p.locator('#gFurn > [data-fid="top"]').boundingBox();await p.screenshot({path:dir+'detail.png',clip:{x:slab.x-25,y:slab.y-25,width:slab.width+50,height:slab.height+50},animations:'disabled'});await p.evaluate(()=>undo());
  // Real drag redraws distances continuously and leaves the overlay transparent to picking.
  await p.evaluate(()=>{ui.grid=10;ui.layers.wallSnap=false;ui.layers.guides=false;});
  const point=async(x,y)=>p.evaluate(([x,y])=>{const v=new DOMPoint(x,y).matrixTransform(document.querySelector('#gFurn').getScreenCTM());return {x:v.x,y:v.y};},[x,y]);
  const a=await point(3100,3010),b=await point(3200,3010);
  await p.mouse.move(a.x,a.y);await p.mouse.down();await p.mouse.move(b.x,b.y,{steps:10});
  check((await p.locator('[data-hob-gap="r"]').textContent()).includes('370 mm'),'drag updates displayed opening margins');await p.mouse.up();
  check((await margins()).r===370,'drag applied');await p.evaluate(()=>undo());check((await margins()).r===470,'undo redraws margins');await p.evaluate(()=>redo());check((await margins()).r===370,'redo redraws margins');
  await p.evaluate(()=>undo());
  await p.evaluate(()=>{mutate(()=>{const f=getF('hob');f.rot=37;f.flip=true;getF('top').d=1400;});state.drawing={...state.drawing,rotation:90};renderAll();selectIds([]);zoomToBox([1850,2050,4150,3950],60);});
  check(await p.locator('[data-hob-gap]').count()===4,'rotated mirrored and drawing rotated');await p.screenshot({path:dir+'rotated.png',animations:'disabled'});
  await p.evaluate(()=>{mutate(()=>{state.drawing={...state.drawing,rotation:0};const h=getF('top');Object.assign(h,FurnishKitchen.configure({...h,rot:0,flip:false},{version:1,shape:'L',depth:600,baseHeight:820,thickness:40,modules:[{run:0,width:1200,role:'hob'},{run:1,width:1000,role:'door'}]}));Object.assign(getF('hob'),FurnishKitchen.attach({...getF('hob'),rot:0,flip:false},h,0));FurnishKitchen.normalize(state.furniture);});selectIds([]);zoomToBox([1850,1950,4150,4050],60);});
  check(JSON.stringify(await margins())===JSON.stringify({l:270,r:270,t:125,b:125}),'L production boundary');await p.screenshot({path:dir+'linked-l.png',animations:'disabled'});
  await p.evaluate(()=>{ui.layers.dims=false;renderAll();});check(await p.locator('[data-hob-gap]').count()===0,'hide dimensions');check(await p.locator('[data-hob-cutout]').count()===1,'outline remains');
  await p.evaluate(()=>{ui.layers.dims=true;renderAll();mutate(()=>{const f=getF('hob');delete f.counterLink;f.cx+=4000;});});check(await p.locator('[data-hob-cutout]').count()===0,'off countertop hides all cutout marks');await p.evaluate(()=>undo());check(await p.locator('[data-hob-gap]').count()===4,'undo restores outline and labels');
  await p.waitForFunction(()=>!savePending);const saved=await p.evaluate(()=>JSON.stringify(state.furniture));await p.reload();await p.locator('[data-hob-cutout]').waitFor();check(await p.evaluate(()=>JSON.stringify(state.furniture))===saved,'refresh restores source without new fields');
  await p.setViewportSize({width:390,height:844});await p.evaluate(()=>{closeDrawers();zoomToBox([1900,2300,3950,3750],30);});check(await p.locator('[data-hob-gap]').count()===4,'mobile labels present');check(await p.evaluate(()=>document.documentElement.scrollWidth<=390),'no page overflow');await p.screenshot({path:dir+'mobile.png',animations:'disabled'});
  check(!errors.length,errors.join('\n'));return {status:'PASS',margins:true,drag:true,undoRedo:true,rotationMirror:true,linkedL:true,dimensionToggle:true,exports:true,refresh:true,mobile390:true,errors};
 }finally{await context.close();}
}

