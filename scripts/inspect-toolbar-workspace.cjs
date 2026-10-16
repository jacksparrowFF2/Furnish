const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const repo=path.resolve(__dirname,'..'),V=require('./lib/browser-verification.cjs'),C=require('../src/core/repository-core.js');
if(!process.argv[2])throw Error('Usage: node scripts/inspect-toolbar-workspace.cjs <workspace.furnish.json>');
const input=path.resolve(process.argv[2]),bytes=fs.readFileSync(input),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const output=path.join(repo,'output/playwright');fs.mkdirSync(output,{recursive:true});
const data=C.parse(JSON.parse(bytes)),run=fs.mkdtempSync(path.join(output,'real-toolbar-')),root=path.join(run,'workspace');fs.mkdirSync(root);
for(const name of ['src','styles','assets','vendor'])fs.cpSync(path.join(repo,name),path.join(root,name),{recursive:true});fs.copyFileSync(path.join(repo,'index.html'),path.join(root,'index.html'));
process.env.FURNISH_VERIFY_ROOT=root;
(async()=>{
 const service=await V.staticServer(root);process.env.FURNISH_VERIFY_URL=service.baseURL;const browser=await V.launch(),rows=[],errors=[];
 try{
  const context=await browser.newContext({viewport:{width:1500,height:1000}});await context.route('**/*',route=>new URL(route.request().url()).origin===new URL(service.baseURL).origin?route.continue():route.abort());await context.addInitScript(value=>localStorage.setItem('huxing-design-v2',JSON.stringify(value)),data);const p=await context.newPage();p.on('pageerror',e=>errors.push(e.stack));
  await p.goto(service.baseURL);await p.waitForFunction(()=>document.querySelector('#lib .item'));await p.waitForFunction(()=>!document.querySelector('#toast.show'));
  const identity=await p.evaluate(()=>({id:PLAN.id,name:PLAN.name,count:state.furniture.length,baseline:JSON.stringify(state)}));if(identity.id!==data.planId||identity.count!==data.work[data.planId].furniture.length)throw Error('Actual design not loaded');
  console.log(JSON.stringify({run,identity:{...identity,baseline:undefined},sourceHash:hash(bytes)}));
  const all=await p.evaluate(()=>state.furniture.map(f=>({id:f.id,type:f.type,name:f.name,detailed:furnitureUsesDetailedDesign(f)})));
  const hot=all.filter(f=>/stove|sink_arrow|dishwasher|fridge|table|chair|washer|dryer/.test(f.type)||f.type==='counter');
  for(const [width,height] of [[1500,1000],[1024,768],[390,844],[320,740],[844,390]]){
   await p.setViewportSize({width,height});await p.evaluate(()=>{closeDrawers();fitView();});
   for(const scene of ['full','detail'])for(const f of scene==='full'?all:hot){
    await p.evaluate(({id,scene})=>{closeFabEditor(false);selectIds([id]);if(scene==='full')fitView();else{const f=getF(id),b=FurnishDesign.bounds(f),pad=1000;zoomToBox([b[0]-pad,b[1]-pad,b[2]+pad,b[3]+pad],80);}}, {id:f.id,scene});
    for(const kind of ['bar','distance',...(scene==='detail'&&!f.detailed?['size']:[])]){
     if(kind!=='bar'){const entry=p.locator('#fab [data-fab-edit="'+kind+'"]');if(!await entry.count()||await entry.isDisabled())continue;await entry.click();if(await p.locator('#dlg:not([hidden])').count()){await p.keyboard.press('Escape');continue;}if(!await p.locator('#fab-editor').count()){await p.evaluate(()=>closeDrawers());continue;}}
     await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))));
     const metric=await p.evaluate(()=>{
      positionFab();const stage=document.querySelector('#stage').getBoundingClientRect(),els=[document.querySelector('#fab'),document.querySelector('#fab-editor')].filter(Boolean),boxes=els.map(e=>e.getBoundingClientRect());
      const canvas=document.querySelector('#plan').getBoundingClientRect(),clip=r=>({left:Math.max(r.left,canvas.left),right:Math.min(r.right,canvas.right),top:Math.max(r.top,canvas.top),bottom:Math.min(r.bottom,canvas.bottom)});
      const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
      const visible=r=>r.width>0&&r.height>0&&r.right>stage.left&&r.left<stage.right&&r.bottom>stage.top&&r.top<stage.bottom;
      const f=selItems()[0],points=FurnishGeometry.corners(f).map(p=>drawingPoint(p)).map(p=>({x:canvas.left+(p[0]-view.x0)*view.s,y:canvas.top+(p[1]-view.y0)*view.s})),selected=clip({left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))});
      const labels=[...document.querySelectorAll('#gSel text,#gMeasure text,[data-hob-gap] text')].map(el=>({text:el.textContent,rect:clip(el.getBoundingClientRect())})).filter(v=>v.rect.right>v.rect.left&&v.rect.bottom>v.rect.top);
      const controls=[...document.querySelectorAll('.canvas-rail,.hud,.drawing-rotate,.space-status,.scalebar,.drawing-compass')].filter(el=>getComputedStyle(el).visibility!=='hidden'&&getComputedStyle(el).display!=='none').map(el=>({name:el.className,rect:el.getBoundingClientRect()})).filter(v=>visible(v.rect));
      const primary=document.querySelector('#fab .fab-primary').getBoundingClientRect();
      return {selectedVisible:selected.right>selected.left&&selected.bottom>selected.top,selectedArea:boxes.reduce((s,r)=>s+overlap(r,selected),0),labelHits:labels.filter(v=>boxes.some(r=>overlap(r,v.rect)>1)).map(v=>v.text),controlHits:controls.filter(v=>boxes.some(r=>overlap(r,v.rect)>1)).map(v=>v.name),inside:boxes.every(r=>r.left>=stage.left&&r.right<=stage.right+1&&r.top>=stage.top&&r.bottom<=stage.bottom+1),pair:boxes.length===2?overlap(...boxes):0,primaryInside:primary.right<=boxes[0].right+1,boxes:boxes.map(r=>({x:r.x,y:r.y,w:r.width,h:r.height}))};
     });
     const row={width,height,scene,id:f.id,type:f.type,name:f.name,kind,...metric};rows.push(row);
     fs.writeFileSync(path.join(run,'partial.json'),JSON.stringify(rows));
     if((metric.selectedArea>1||metric.labelHits.length||!metric.inside||!metric.primaryInside||metric.pair>1||metric.controlHits.length||scene==='detail'&&/sink_arrow|dishwasher|counter/.test(f.type))&&rows.filter(v=>v.screenshot&&v.width===width).length<8){const file=rows.length+'-'+width+'-'+f.type+'-'+kind+'.png';await p.screenshot({path:path.join(run,file)});row.screenshot=file;}
     if(kind!=='bar')await p.keyboard.press('Escape');
    }
   }
   console.log('Checked '+width+'x'+height+'; '+rows.length+' cases');
  }
  const after=await p.evaluate(()=>JSON.stringify(state));if(after!==identity.baseline)throw Error('Inspection modified design state');
  const summary={cases:rows.length,invisible:rows.filter(r=>!r.selectedVisible).length,selected:rows.filter(r=>r.selectedArea>1).length,labels:rows.filter(r=>r.labelHits.length).length,controls:rows.filter(r=>r.controlHits.length).length,overflow:rows.filter(r=>!r.inside||!r.primaryInside).length,pair:rows.filter(r=>r.pair>1).length};
  fs.writeFileSync(path.join(run,'results.json'),JSON.stringify({sourceHash:hash(bytes),sourceUnchanged:hash(fs.readFileSync(input))===hash(bytes),identity:{...identity,baseline:undefined},summary,errors,rows},null,2));console.log(JSON.stringify({run,summary,errors}));
  if(errors.length||Object.entries(summary).some(([key,value])=>key!=='cases'&&value>0))throw Error('Toolbar overlap detected; inspect '+path.join(run,'results.json'));
 }finally{await browser.close();await service.close();if(hash(fs.readFileSync(input))!==hash(bytes))throw Error('Source workspace file changed');}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
