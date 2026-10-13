async(page)=>{
 const root='C:/Users/SPH/Documents/GitHub/Furnish/',results=[];
 for(const mode of ['file','http'])for(const kind of ['hob','hood']){
  const context=await page.context().browser().newContext({viewport:{width:1400,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
  await p.goto((mode==='file'?'file:///'+root:'http://127.0.0.1:8765/')+'output/fotile/'+kind+'.html');await p.waitForFunction(()=>window.previewReady);
  if(!await p.evaluate(kind=>{const v=window.fotilePreview;return v.scene.children.filter(o=>o.userData.fotile).length===1&&v.f.type===(kind==='hob'?'stove_fotile_th36b':'rangehood_fotile_jcd10ta');},kind))throw Error('Preview must contain exactly one independent appliance: '+kind);
  for(const [label,file] of [['正面',kind+'-front'],['斜视',kind+'-angle']]){await p.getByRole('button',{name:label,exact:true}).click();await p.waitForTimeout(250);if(mode==='file')await p.screenshot({path:root+'output/fotile/'+file+'.png'});}
  if(kind==='hood'){await p.getByRole('button',{name:'打开面板',exact:true}).click();if(!await p.evaluate(()=>window.fotilePreview.f.hoodPanelOpen))throw Error('Hood opening failed');await p.waitForTimeout(250);if(mode==='file')await p.screenshot({path:root+'output/fotile/hood-open.png'});}
  if(errors.length)throw Error(errors.join(';'));await context.close();results.push({mode,preview:kind,status:'PASS',appliances:1});
 }return results;
}
