const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),D=require('../src/core/design-core.js');
(async()=>{
 const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports,THREE=await import(imports.three);
 class Label extends THREE.Object3D{constructor(element){super();this.element=element;this.isCSS2DObject=true;}}
 let expired,cleared=0;const item={id:'f',type:'kitchenwall',w:800,d:350,cx:1000,cy:2000,rot:90},elevationG=new THREE.Group(),issueG=new THREE.Group(),clearanceG=new THREE.Group();
 const ctx=vm.createContext({state:{furniture:[item]},FurnishProject:{effectivePlan:()=>({})},PLAN:{},THREE,CSS2DObject:Label,elevationG,issueG,clearanceG,sceneIssue:null,issueTimer:0,active:true,FurnishDesign:D,getF:()=>item,ui:{sel:{kind:'furn',id:'f'}},tr:a=>a,wx:x=>(x-500)/1000,wz:y=>(y-500)/1000,M:v=>v/1000,invalidate(){},clearTimeout(){cleared++;},setTimeout(fn,ms){assert.equal(ms,8000);expired=fn;return 1;},document:{createElement:()=>({remove(){this.removed=true;}})}});
 const start=html.indexOf('function clearAnnotations(group)'),end=html.indexOf('/* ======================= 漫游',start);vm.runInContext(html.slice(start,end),ctx);
 const saved=JSON.stringify(item);ctx.buildSelectionElevation(['f']);assert.equal(elevationG.children.length,2);const line=elevationG.children[0],positions=line.geometry.attributes.position.array;
 assert(Math.abs(Math.max(...Array.from(positions).filter((_,i)=>i%3===1))-2.18)<1e-6,'absolute top is converted from mm to m once');assert(elevationG.children[1].element.textContent.includes('底部 1480 · 顶部 2180'));
 const volumes=[{poly:[[0,0],[1000,0],[1000,1000],[0,1000]],ranges:[[500,1500]]}];ctx.highlightIssue({id:'f',pending:true},volumes);assert.equal(issueG.children.length,2);assert(issueG.children[1].element.className.includes('pending'));assert(issueG.children[0].material.depthTest===false);const issuePos=issueG.children[0].geometry.attributes.position.array,ys=Array.from(issuePos).filter((_,i)=>i%3===1);assert.equal(Math.min(...ys),.5);assert.equal(Math.max(...ys),1.5);
 ctx.stage={getBoundingClientRect:()=>({left:10,right:380,top:90,bottom:800})};
 for(const group of [elevationG,issueG])group.traverse(o=>{if(o.isCSS2DObject){o.element.style={};o.element.getBoundingClientRect=()=>({left:300,right:482,top:400,bottom:427,width:182,height:27});}});
 ctx.fitSceneAnnotationLabels();assert.equal(elevationG.children[1].element.style.marginLeft,'-110px','narrow viewport keeps the complete elevation caption inside the canvas');
 assert.equal(issueG.children[1].element.style.marginTop,'35px','issue and elevation captions must remain separately readable');
 expired();assert.equal(issueG.children.length,0);assert.equal(ctx.sceneIssue,null);
 ctx.getF=()=>({...item,type:'unknown'});ctx.buildSelectionElevation(['f']);assert.equal(elevationG.children.length,1);assert(elevationG.children[0].element.textContent.includes('高度未知'));
 ctx.buildSelectionElevation([]);assert.equal(elevationG.children.length,0);assert.equal(JSON.stringify(item),saved);assert(cleared>0);
 console.log('PASS real Three.js annotation positions, mounting datum, unknown height, issue status and timed cleanup');
})().catch(e=>{console.error(e);process.exit(1);});
