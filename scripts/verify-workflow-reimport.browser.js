/* Playwright CLI run-code --filename. Isolated contexts; synthetic project only.
 * This checks HTTP startup without external network, then offline editing and import.
 * It deliberately does not claim file:// startup verification. */
async (page) => {
 const root='C:/Users/SPH/Documents/GitHub/Furnish/',url='http://127.0.0.1:28418/index.html',dir=root+'output/playwright/workflow-tools/',results=[];
 const check=(value,label)=>{if(!value)throw Error(label);};
 const stable=v=>JSON.stringify(v,(_,x)=>x&&typeof x==='object'&&!Array.isArray(x)?Object.fromEntries(Object.entries(x).sort(([a],[b])=>a.localeCompare(b))):x);
 const diff=(a,b,path='')=>{if(stable(a)===stable(b))return [];if(a&&b&&typeof a==='object'&&typeof b==='object')return [...new Set([...Object.keys(a),...Object.keys(b)])].flatMap(k=>diff(a[k],b[k],path+'.'+k));return [{path,before:a,after:b}];};
 async function create(){
  const context=await page.context().browser().newContext({viewport:{width:1500,height:950}}),p=await context.newPage(),errors=[],external=[];
  p.on('pageerror',e=>errors.push(e.message));
  await context.route(/^https?:/,route=>{const request=route.request().url();if(new URL(request).origin===new URL(url).origin)return route.continue();external.push(request);return route.abort();});
  await p.goto(url);await p.locator('#lib .item').first().waitFor();
  check(await p.locator('#gFurn > *').count()>0,'2D production startup');
  await context.setOffline(true);
  return {context,p,errors,external};
 }
 async function importUI(p,file){
  await p.getByRole('button',{name:'工作台',exact:true}).click();
  await p.getByRole('button',{name:'备份／加载项目',exact:true}).click();
  await p.locator('#pr-file').setInputFiles(file);
  await p.locator('#project-import-preview').waitFor();
  check((await p.locator('#project-import-preview').innerText()).includes('原始结构已锁定'),'import preview locked baseline');
  await p.getByRole('button',{name:'确认恢复此项目',exact:true}).click();
  await p.locator('#dlg').waitFor({state:'hidden'});
 }
 // Custom catalog entries receive fresh local IDs on import; compare their data.
 async function snapshot(p){return p.evaluate(()=>({current:JSON.parse(snap()),designs:store.designs.filter(d=>d.planId===PLAN.id).map(({name,work,note})=>({name,work,...(note!==undefined?{note}:{})})),catalog:store.custom.map(({id,...spec})=>spec),budget:budget(),planId:PLAN.id,rooms:ROOMS,walls:WALLS,doors:DOORS,windows:WINS}));}
 const source=await create();
 try{
  await importUI(source.p,dir+'reimport-input.furnish.json');
  const initial=await snapshot(source.p);
  check(initial.current.pricing.materialSpecs.wood.pack===4&&initial.current.pricing.materials.wood===500,'material pack pricing');
  check(initial.current.architecture.draft.walls.find(w=>w.id==='partition').a[0]===450,'edited net wall');
  check(initial.current.architecture.baseline.walls.find(w=>w.id==='partition').a[0]===500,'original baseline');
  check(initial.current.furniture[0].rot===45&&initial.current.furniture[0].flip&&initial.current.furniture[0].price===0&&initial.current.furniture[0].purchaseStatus==='ordered','furniture transform and purchasing');
  check(initial.designs.length===2&&initial.current.assets.length===1&&initial.current.measures.length===1&&initial.current.notes.length===1&&initial.catalog.length===1,'named designs, attachment, measurements, note and custom catalog');
  await source.p.getByRole('button',{name:'3D 场景',exact:true}).click();
  await source.p.waitForFunction(()=>!switching&&viewMode==='3d'&&document.querySelector('main.is3d #view3d canvas')?.width>0);
  await source.p.screenshot({path:dir+'offline-production-3d.png'});
  await source.p.getByRole('button',{name:'2D 平面',exact:true}).click();await source.p.waitForFunction(()=>!switching&&viewMode==='2d');
  await source.p.getByRole('button',{name:'工作台',exact:true}).click();await source.p.getByRole('button',{name:'备份／加载项目',exact:true}).click();
  const downloadPromise=source.p.waitForEvent('download');await source.p.locator('#pr-export').click();const download=await downloadPromise;await download.saveAs(dir+'reimport-downloaded.furnish.json');
  const target=await create();
  try{
   await importUI(target.p,dir+'reimport-downloaded.furnish.json');
   const restored=await snapshot(target.p);
   check(stable(restored)===stable(initial),'fresh-browser import must restore complete state, designs, catalog, budget and geometry: '+JSON.stringify(diff(initial,restored)));
   await target.p.getByRole('button',{name:'撤销',exact:true}).first().click();
   check((await snapshot(target.p)).current.furniture.length!==initial.current.furniture.length,'import undo');
   await target.p.getByRole('button',{name:'重做',exact:true}).first().click();
   check(stable(await snapshot(target.p))===stable(restored),'import redo');
   await target.p.waitForFunction(()=>document.querySelector('#saved')?.textContent.includes('已自动保存'));
   await target.context.setOffline(false);await target.p.reload();await target.p.locator('#lib .item').first().waitFor();await target.context.setOffline(true);
   check(stable(await snapshot(target.p))===stable(restored),'reload restores complete imported project');
   await importUI(target.p,dir+'reimport-downloaded.furnish.json');
   check(stable(await snapshot(target.p))===stable(restored),'repeat import without state drift or duplicate named designs');
   await target.p.getByRole('button',{name:'3D 场景',exact:true}).click();await target.p.waitForFunction(()=>!switching&&viewMode==='3d'&&document.querySelector('main.is3d #view3d canvas')?.width>0);
   await target.p.screenshot({path:dir+'reimport-offline-3d.png'});
   await target.p.getByRole('button',{name:'2D 平面',exact:true}).click();await target.p.waitForFunction(()=>!switching&&viewMode==='2d');await target.p.locator('#fit').click();await target.p.screenshot({path:dir+'reimport-offline-2d.png'});
   check(source.errors.length===0&&target.errors.length===0,'application exceptions: '+[...source.errors,...target.errors].join('; '));
   check(source.external.length===0&&target.external.length===0,'unexpected external network dependency');
   results.push({mode:'HTTP startup with external requests blocked; offline editing/import/3D after load',fullProjectReimport:true,undoRedo:true,reload:true,repeatImport:true,externalRequests:[],pageErrors:[]});
  }finally{await target.context.close();}
 }finally{await source.context.close();}
 return results;
}
