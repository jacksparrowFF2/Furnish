const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),V=require('../lib/browser-verification.cjs'),F=require('../lib/model-browser-fixture.cjs');
const source=path.resolve(__dirname,'../..');
async function main(){
 const run=path.join(source,process.env.FURNISH_ELEVATION_FILE==='1'?'output/elevation-offline':'output/elevation-audit'),root=path.join(run,'workspace');fs.mkdirSync(root,{recursive:true});
 for(const name of ['index.html','manifest.webmanifest','src','styles','vendor'])fs.cpSync(path.join(source,name),path.join(root,name),{recursive:true});
 const server=await V.staticServer(root);process.env.FURNISH_VERIFY_ROOT=root;process.env.FURNISH_VERIFY_URL=server.baseURL;let browser;const selected=process.env.FURNISH_ELEVATION_INDICES?.split(',').map(Number),start=Number(process.env.FURNISH_ELEVATION_START||0),previous=(start||selected)&&fs.existsSync(path.join(run,'report.json'))?JSON.parse(fs.readFileSync(path.join(run,'report.json'))):null;const report={passed:false,protocol:process.env.FURNISH_ELEVATION_FILE==='1'?'file':'http',generatedAt:new Date().toISOString(),rows:previous?previous.rows.filter(r=>selected?!selected.includes(r.index):r.index<start):[],errors:[]};
 try{
 browser=await V.launch();const context=await browser.newContext({viewport:{width:1300,height:1000}}),page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(process.env.FURNISH_ELEVATION_FILE==='1'?require('node:url').pathToFileURL(path.join(root,'index.html')).href:server.baseURL+'index.html');
 const fixtures=await page.evaluate(()=>FurnishCatalogData.library.flatMap(c=>c.items).map((item,i)=>{const result=createCatalogFurniture(item,0,0),list=Array.isArray(result)?result:[result];for(const f of list){if(FurnishProducts.bottomMode(f)==='offset')delete f.mountHeight;delete f.bottomPhysical;}return {index:i,type:item[0],name:item[1],list};}));
 await F.install(page,{fixture:fixtures[0].list[0]});
 fs.writeFileSync(path.join(run,'fixtures.json'),JSON.stringify(fixtures,null,2));
 for(const fixture of fixtures.filter(f=>selected?selected.includes(f.index):f.index>=start)){
  await page.evaluate(list=>mutate(()=>{state.furniture=list;}),fixture.list);await page.evaluate(()=>selectIds([state.furniture[0].id]));
  const controls=await page.evaluate(()=>({found:!!document.querySelector('#fBottomElevation,#fMountHeight,#stool-bottom,#covering-bottom'),bottom:FurnishProducts.bottomHeight(state.furniture[0]),range:FurnishDesign.furnitureVerticalBounds(state.furniture[0]),mode:FurnishProducts.bottomMode(state.furniture[0])}));
  const baseline=await F.capture(page,path.join(run,'exports',fixture.index+'-old.glb'));
  const bottom=controls.bottom+400,input=page.locator('#fBottomElevation,#fMountHeight,#stool-bottom,#covering-bottom').first();await input.fill(String(bottom));await input.press('Tab');
  const changed=await page.evaluate(bottom=>{const f=state.furniture[0],parts=FurnishGeometry.bodyParts(f);return {bottom,range:FurnishDesign.furnitureVerticalBounds(f),actualBottom:FurnishProducts.bottomHeight(f),solids:parts.length?{bottom:Math.min(...parts.map(p=>p.vertical?.bottom??Infinity)),top:Math.max(...parts.map(p=>p.vertical?.top??-Infinity))}:null};},bottom);
  const raised=await F.capture(page,path.join(run,'exports',fixture.index+'-raised.glb'));
  const id=fixture.list[0].id,bounds=g=>{const a=g.parts.filter(p=>p.id===id);return [0,1].map(k=>[0,1,2].map(axis=>Math[k?'max':'min'](...a.map(p=>p.bounds[k][axis]))));};
  const a=bounds(baseline),b=bounds(raised),row={type:fixture.type,name:fixture.name,index:fixture.index,controls,changed,baseline:a,raised:b,shiftMm:(b[0][1]-a[0][1])*1000,bottomErrorMm:b[0][1]*1000-changed.bottom,topErrorMm:changed.solids?b[1][1]*1000-changed.solids.top:null};
  row.unknownRange=!Number.isFinite(changed.solids?.bottom);row.passed=controls.found&&Math.abs(changed.actualBottom-changed.bottom)<.01&&Math.abs(row.bottomErrorMm)<2&&(!row.unknownRange&&Math.abs(b[0][1]*1000-changed.solids.bottom)<2)&&Math.abs(row.shiftMm-400)<2;
  report.rows.push(row);fs.writeFileSync(path.join(run,'report.json'),JSON.stringify(report,null,2));if(fixture.index%10===0||!row.passed)console.log(fixture.index+' '+fixture.type+' '+row.passed+' bottomError='+row.bottomErrorMm.toFixed(2)+' shift='+row.shiftMm.toFixed(2));
 }
 report.passed=report.rows.every(r=>r.passed)&&!report.errors.length;
 }catch(error){report.errors.push(error.stack);throw error;}finally{fs.writeFileSync(path.join(run,'report.json'),JSON.stringify(report,null,2));if(browser)await browser.close();await server.close();}
 console.log('Report '+path.join(run,'report.json'));if(!report.passed)throw Error('Elevation audit has failures');
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});module.exports={main};
