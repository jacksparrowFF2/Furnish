'use strict';
const fs=require('node:fs'),path=require('node:path'),{inspect}=require('./glb-model-evidence.cjs');
async function install(page,profile){
 await page.evaluate(profile=>{
  const plan={...PLANS[0],id:'model-pipeline-studio',name:'隔离模型验收',walls:[[-100000,-100000,100000,-100000,'e'],[-100000,-100000,-100000,100000,'e']],wins:[],doors:[],slides:[],beams:[],pillars:[],rooms:[{id:'studio',name:'验收地面',poly:[[-6000,-6000],[6000,-6000],[6000,6000],[-6000,6000]],at:[0,0],mat:'tile800'}],dims:[],bounds:{x:-100000,y:-100000,w:200000,h:200000},defaults:[]};
  const index=PLANS.findIndex(p=>p.id===plan.id);if(index>=0)PLANS[index]=plan;else PLANS.push(plan);setPlan(plan.id);
  mutate(()=>{state.furniture=structuredClone([profile.fixture,...(profile.companions||[])]);});
 },profile);
 await page.getByRole('button',{name:'3D 场景',exact:true}).click();await page.waitForFunction(()=>is3D()&&!switching);await page.waitForTimeout(150);
}
async function capture(page,file,view){
 // Match exported world bounds to the numeric production endpoint contract.
 // The live Three graph is private; inspect actual exports rather than reaching
 // into its closure or forcing mesh transforms from a verifier.
 const contracts=await page.evaluate(()=>state.furniture.filter(f=>FurnishProducts.supports(f,'slidingOpen')).map(f=>({id:f.id,target:FurnishProducts.value(f,'slidingOpen')?1:0,bounds:FurnishGeometry.bodyParts(f,FurnishProject.effectivePlan(PLAN,state),state.furniture).map(p=>[Math.min,Math.max].map(fn=>[0,1,2].map(i=>fn(...p.vertices.map(v=>v[i]))/1000)))})));
 const ids=await page.evaluate(()=>state.furniture.map(f=>f.id)),deadline=Date.now()+15000;
 for(;;){
 const array=await page.evaluate(async view=>{
  const options={includeHidden:false,expandInstances:true};
  if(view){const T=await import('three'),camera=new T.PerspectiveCamera(36,1,.01,100);camera.position.fromArray(view.position);camera.lookAt(...view.target);camera.updateMatrixWorld(true);options.camera=camera;const sun=new T.DirectionalLight(0xffffff,2000),direction=view.lightDirection||[-4,8,8];sun.position.fromArray(view.target.map((v,i)=>v+direction[i]));sun.target.position.fromArray(view.target);sun.updateMatrixWorld(true);sun.target.updateMatrixWorld(true);options.sun=sun;}
  for(let i=0;i<40;i++){try{return Array.from(new Uint8Array((await View3D.blenderScene(options)).buffer));}catch(e){if(!/视角稳定|camera to settle/.test(e.message)||i===39)throw e;await new Promise(r=>setTimeout(r,50));}}
 },view||null);
 const bytes=Buffer.from(array),geometry=inspect(bytes,ids),settledPoses=endpointEvidence(geometry.parts,contracts);
 if(settledPoses.every(p=>p.partBoundsMatched)){const evidence={...geometry,settledPoses};fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,bytes);return evidence;}
 if(Date.now()>deadline)throw Error('Saved sliding endpoint not reached: '+JSON.stringify(settledPoses));
 await page.waitForTimeout(50);
 }
}
function endpointEvidence(parts,contracts){
 return contracts.map(c=>{const remaining=parts.filter(p=>p.id===c.id).map(p=>p.bounds);let maxError=0,matched=remaining.length===c.bounds.length&&remaining.length>0;
  for(const expected of c.bounds){const index=remaining.findIndex(actual=>actual.every((row,k)=>row.every((v,i)=>Math.abs(v-expected[k][i])<2e-5)));if(index<0){matched=false;break;}const [actual]=remaining.splice(index,1);maxError=Math.max(maxError,...actual.flatMap((row,k)=>row.map((v,i)=>Math.abs(v-expected[k][i]))));}
  return {id:c.id,target:c.target,parts:c.bounds.length,partBoundsMatched:matched,maxError:matched?maxError:null};
 });
}
module.exports={install,capture,endpointEvidence};
