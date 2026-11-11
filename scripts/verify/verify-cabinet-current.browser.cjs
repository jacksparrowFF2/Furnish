'use strict';
const path=require('node:path');
// Current UI flows shared with the packaged-desktop regression suites.
const flows={
 'cabinet-components-current':['cabinet-builder-ui','cabinet-component-edit-ui','cabinet-component-parity-ui'],
 'cabinet-native-current':['cabinet-complete-lego-ui','cabinet-unified-details-ui','cabinet-placement-parity-ui','cabinet-assembly-ui'],
 'cabinet-structure-current':['cabinet-profile-thickness-ui','cabinet-native-independence-ui','laundry-carcass-ui'],
 'cabinet-resize-current':['cabinet-builder-resize-ui']
};
async function verify(page,V){
 const selected=flows[V.caseName];if(!selected)throw Error('Unknown current cabinet flow');
 const previous=process.env.FURNISH_TEST_PROJECT;process.env.FURNISH_TEST_PROJECT=path.join(V.root,'projects/workspace.furnish.json');
 const results=[];
 try{for(const mode of ['http','file'])for(const name of selected){
  const context=await page.context().browser().newContext({viewport:{width:1450,height:1000},offline:mode==='file'}),p=await context.newPage(),errors=[];
  p.on('pageerror',e=>errors.push(e.message));const output=file=>V.output('playwright/'+V.caseName+'/'+mode+'-'+name+'-'+file);
  try{
   console.log('FLOW '+mode+' '+name);await p.goto((mode==='file'?V.fileBase:V.baseURL)+'index.html');await p.waitForFunction(()=>!repositoryBooting);
   const report=await require('../../tests/helpers/'+name+'.js')(p,{...V,mode,artifact:output,screenshot:file=>p.screenshot({path:output(file+'.png')})});
   if(errors.length)throw Error(errors.join('; '));
   results.push({mode,flow:name,passed:true,...(Array.isArray(report)?{checks:report}:report)});
   console.log('FLOW PASS '+mode+' '+name);
  }catch(error){await p.screenshot({path:output('failure.png')}).catch(()=>{});throw error;}finally{await context.close();}
 }}finally{if(previous===undefined)delete process.env.FURNISH_TEST_PROJECT;else process.env.FURNISH_TEST_PROJECT=previous;}
 return results;
}
module.exports=Object.assign(verify,{flows});
