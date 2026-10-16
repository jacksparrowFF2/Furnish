const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('../src/core/product-rules.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),K=require('../src/core/kitchen-core.js'),W=require('../src/core/work-state.js'),plans=require('../src/data/plans.js');
const f={id:'dish',name:'台面洗碗机',type:'dishwasher_mijia_countertop',cx:0,cy:0,w:550,d:350,h:598,rot:0,mountHeight:860};
const plan={id:'test',rooms:[{id:'room',name:'厨房',poly:[[-4000,-4000],[4000,-4000],[4000,4000],[-4000,4000]]}],walls:[],wins:[],doors:[],beams:[],ceilingHeight:2800};
const support=(d=600)=>({id:'top',name:'台面',type:'counter',cx:0,cy:-175+d/2,w:1200,d,h:860,rot:0,kitchen:K.defaults({type:'counter',w:1200,d})});
const side=(gap=199)=>({id:'side',name:'出气侧高柜',type:'cabinet',cx:-275-gap-100,cy:0,w:200,d:200,h:2200,rot:0});
const above=(tableGap=650,offset=0)=>({id:'upper',name:'吊柜',type:'kitchenwall',cx:0,cy:175-offset-160,w:800,d:320,h:700,mountHeight:860+tableGap,rot:0});
const obstacle=(y=450,h=1000)=>({id:'obstacle',name:'前方障碍',type:'custom',cx:0,cy:y,w:50,d:50,h,rot:0});
const checks=(items=[],item=f,p=plan)=>P.dishwasherChecks(p,item,{furniture:[item,...items]}).checks;
const rows=(kind,items=[],item=f,p=plan)=>checks(items,item,p).filter(v=>v.kind==='dishwasher-'+kind),bad=(kind,items=[],item=f,p=plan)=>rows(kind,items,item,p).filter(v=>v.ok!==true);
assert.equal(R.dishwasherInstallation({type:'dishwasher'}),null);assert.equal(R.dishwasherInstallation({...f,obj:{positions:[]}}),null);
assert.equal(R.dishwasherInstallation(f).extension,250);assert.equal(R.dishwasherInstallation(f).openingBottom,912);
assert.equal(bad('side',[side(200)],{...f,mountHeight:0}).length,0);assert.equal(bad('opening',[obstacle(449,52)],{...f,mountHeight:0}).length,0,'0 is a real bottom datum, not a missing value');
assert.equal(bad('side',[side(200)]).length,0);assert.equal(bad('side',[side(199)])[0].ok,false);assert.equal(bad('side',[side(199.99)])[0].ok,false);
assert.equal(bad('side',[{...side(),h:860}]).length,0,'body bottom contact is not an outlet obstruction');assert.equal(bad('side',[{...side(),h:860.1}])[0].ok,false);
assert.equal(bad('side',[{...side(),cx:500}]).length,0,'wrong side');assert.equal(bad('side',[{...side(),cy:-275,d:200}]).length,0,'back-face contact alone');
assert.equal(bad('side',[{...side(),type:'unmodelled',h:undefined}])[0].ok,null);assert.equal(bad('side',[{...side(200),type:'unmodelled',h:undefined}]).length,0);
const sideWall={...plan,walls:[[-675,-200,-475,200]]};assert.equal(bad('side',[],f,sideWall).length,0);assert.equal(bad('side',[],f,{...sideWall,walls:[[-674,-200,-474,200]]})[0].ok,false);
assert.equal(bad('side',[],{...f,mountHeight:1000},{...sideWall,walls:[[-674,-200,-474,200,'low']]}).length,0,'low wall touching bottom');
assert.equal(bad('side',[],f,{...plan,wins:[{rect:[-674,-200,-474,200],sill:1.458,head:2}]}).length,0,'window starts at machine top');
assert.equal(bad('side',[],f,{...plan,wins:[{rect:[-674,-200,-474,200],sill:.9,head:2}]})[0].ok,false);
// Exact 600 mm total opening and positive height intersections, unaffected by pose.
assert.equal(bad('opening',[obstacle(450)]).length,0);assert.equal(bad('opening',[obstacle(449)])[0].ok,false);assert.equal(bad('opening',[obstacle(449)],{...f,dishwasherDoorOpen:false})[0].ok,false);assert.deepEqual(checks([obstacle(449)]),checks([obstacle(449)],{...f,dishwasherDoorOpen:true}));
assert.equal(bad('opening',[obstacle(449,912)]).length,0);assert.equal(bad('opening',[obstacle(449,912.01)])[0].ok,false);
assert.equal(bad('opening',[{...obstacle(449),type:'unmodelled',h:undefined}])[0].ok,null);
assert.equal(bad('opening',[{...above(),cy:300,w:50,d:50,mountHeight:1444}]).length,0,'touch opening top');assert.equal(bad('opening',[{...above(),cy:300,w:50,d:50,mountHeight:1443.99}])[0].ok,false);
assert.equal(bad('opening',[],f,{...plan,walls:[[-100,425,100,500]]}).length,0);assert.equal(bad('opening',[],f,{...plan,walls:[[-100,424,100,500]]})[0].ok,false);
const beam={id:'beam',name:'梁',poly:[[-100,300],[100,300],[100,350],[-100,350]]};assert.equal(bad('opening',[],f,{...plan,beams:[beam]})[0].ok,null);assert.equal(bad('opening',[],f,{...plan,beams:[{...beam,bottomHeight:1300,topHeight:1500}]})[0].ok,false);
assert(bad('opening',[],f,{...plan,rooms:[{...plan.rooms[0],ceilingHeight:1400}]}).some(v=>v.section==='ceiling'));
assert(bad('opening',[],f,{...plan,rooms:[{...plan.rooms[0],poly:[[-1000,-1000],[1000,-1000],[1000,424],[-1000,424]]}]}).some(v=>v.section==='boundary'));
assert.equal(bad('opening',[],f,{...plan,markers:[{id:'pipe',name:'排水管',kind:'drain',at:[0,300],pipeDiameter:50}]})[0].ok,false);
// Guide conditions: table→cabinet 650, top access 50, strict outward offset >80.
assert.equal(bad('overhead',[above(650)]).length,0);assert.equal(bad('overhead',[above(649)])[0].ok,null,'reference has a 2 mm transition between 650 and 598+50');assert.equal(bad('overhead',[above(648)])[0].ok,null,'50 mm is not less than 50');
assert.equal(bad('overhead',[above(647,80)])[0].ok,false);assert.equal(bad('overhead',[above(647,80.01)]).length,0);assert.equal(bad('overhead',[above(647,79.99)])[0].ok,false);
assert.equal(bad('overhead',[above(598,81)]).length,0,'top contact with accessible front offset');assert.equal(bad('overhead',[above(597.99,81)])[0].ok,false,'front offset cannot waive body intrusion');
assert.equal(bad('overhead',[{...above(),type:'unmodelled',mountHeight:undefined,h:undefined}])[0].ok,null);
assert.equal(bad('overhead',[{...above(600),cx:675}]).length,0,'width contact alone');assert.equal(bad('overhead',[{...above(600),cy:-335}]).length,0,'back contact alone');
const sloped={...above(600,81),rot:20};assert.equal(bad('overhead',[sloped])[0].ok,false,'use worst edge over machine width, not cabinet centre');
// Actual module bodies: an empty appliance bay above is not a phantom cabinet.
const wall=K.configure({...above(600),w:1100,d:350},{version:1,shape:'straight',depth:350,baseHeight:700,thickness:0,modules:[{width:550,run:0,role:'empty'},{width:550,run:0,role:'door'}]});const bay=K.cabinetLayout(wall)[0],pt=K.world(wall,bay.x,bay.y);assert.equal(bad('overhead',[wall],{...f,cx:pt[0],cy:pt[1]}).length,0);
assert.equal(bad('support',[support()]).length,0);assert.equal(bad('support',[support(599)])[0].ok,false);assert.equal(bad('support',[support(349)])[0].ok,false);assert.equal(bad('support',[])[0].ok,null);
const holed=support(),sink={id:'sink',name:'槽',type:'ksink',cx:0,cy:300,w:150,d:120,rot:0,counterLink:{hostId:holed.id,module:0}};assert.equal(bad('support',[holed,sink])[0].ok,false,'real countertop device hole is not support');
const half=support(),left={...half,id:'left',w:600,cx:-300,kitchen:K.defaults({type:'counter',w:600,d:600})},right={...left,id:'right',cx:300};assert.equal(bad('support',[left,right]).length,0,'union across coplanar surfaces');
// Global rotations, mirror (outlet switches physical sides), translated datum.
const transform=(o,rot,flip)=>{const a=rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a),sign=flip?-1:1;return {...o,cx:2300+o.cx*sign*c-o.cy*s,cy:1700+o.cx*sign*s+o.cy*c,rot:(o.rot||0)*(flip?-1:1)+rot,flip};};
const source=[side(199),above(647,80),obstacle(449),support(599)],baseline=checks(source);
for(const rot of [0,37,90,180,270])for(const flip of [false,true]){const machine=transform(f,rot,flip),items=source.map(o=>transform(o,rot,flip));assert.deepEqual(checks(items,machine,{...plan,rooms:[]}).map(v=>[v.kind,v.ok]),baseline.map(v=>[v.kind,v.ok]));const safe=[side(200),above(647,80.01),support()].map(o=>transform(o,rot,flip));assert.equal(bad('side',safe,machine,{...plan,rooms:[]}).length,0);assert.equal(bad('overhead',safe,machine,{...plan,rooms:[]}).length,0);assert.equal(bad('support',safe,machine,{...plan,rooms:[]}).length,0);}
const scaled=R.dishwasherInstallation({...f,d:700,h:1196});assert.equal(scaled.extension,500);assert.equal(scaled.sideClearance,200);assert.equal(scaled.worktopToCabinet,650);assert.equal(scaled.frontOffset,80);assert.equal(bad('spec',[],{...f,d:700})[0].ok,null);
const global=P.spaceCheck(plan,[f,...source],{scanPassages:false});assert(global.some(v=>v.kind==='dishwasher-side'&&!v.pending));assert(global.some(v=>v.kind==='dishwasher-overhead'&&!v.pending));assert(global.some(v=>v.kind==='dishwasher-opening'&&!v.pending));assert(P.spaceCheck(plan,[f,...source],{focusId:'upper',scanPassages:false}).some(v=>v.kind==='dishwasher-overhead'&&v.id===f.id&&v.otherId==='upper'));
assert(!P.spaceCheck(plan,[{...f,frontClearance:600},support()],{scanPassages:false}).some(v=>v.kind==='front'),'extra generic operating reservation ignores lower supporting surface');
assert(P.spaceCheck(plan,[{...f,frontClearance:600},{...obstacle(449),type:'unmodelled',h:undefined}],{scanPassages:false}).find(v=>v.kind==='front').pending,'unknown extra operating-space obstacle remains pending too');
const work={furniture:[f,...source]},review=P.review(plan,work),{ignored,...issue}=review.find(v=>v.kind==='dishwasher-side'),accepted={...work,spaceIgnored:[P.checkFingerprint(issue,plan,work.furniture,800)]};assert(P.review(plan,accepted).find(v=>v.kind===issue.kind).ignored);
assert(P.review(plan,{...accepted,furniture:work.furniture.map(v=>({...v,price:100,color:'#abc',purchaseStatus:'ordered'}))}).find(v=>v.kind===issue.kind).ignored);
for(const changed of [{...f,mountHeight:900},{...f,flip:true},{...f,rot:90}])assert(!P.review(plan,{...accepted,furniture:[changed,...source]}).some(v=>v.ignored));
assert.notEqual(P.checkFingerprint(issue,plan,work.furniture,800),P.checkFingerprint(issue,{...plan,wins:[{rect:[-800,-200,-600,200],sill:0,head:2}]},work.furniture,800));
const payload=P.unpack(P.pack({planId:plans[0].id,current:work,designs:[{id:'named',name:'安装验证',work}],catalog:[]})),rules=W.create({makeId:()=> 'new',colorFor:()=> '#eee',materials:require('../src/data/catalog.js').materials});
for(const data of [payload.current,payload.designs[0].work]){for(let i=0;i<3;i++)rules.restore(data,plans[0]);assert.deepEqual(checks(data.furniture.slice(1),data.furniture[0]),baseline);}
const ctx=vm.createContext({FurnishDesign:D,FurnishProject:P,PLAN:plan,state:work,tr:zh=>zh,esc:v=>String(v).replaceAll('<','&lt;').replaceAll('>','&gt;')});vm.runInContext(fs.readFileSync(require.resolve('../src/ui/property-panel.js'),'utf8'),ctx);ctx.f=f;const panel=vm.runInContext('dishwasherInstallationPanel(f)',ctx);assert(panel.includes('data-check-ok="false"'));assert(panel.includes('要求 ≥200 mm'));assert(panel.includes('等于 80 mm 不满足'));assert(P.explainIssue(issue).category.includes('洗碗机'));
// The checked reservation contains real open-pose moving vertices, not just a
// separately invented serializer fixture. XY in the app corresponds to XZ in 3D.
(async()=>{const html=fs.readFileSync(require.resolve('../index.html'),'utf8'),T=await import(JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports.three),M=require('../src/render/dishwasher-model.js');for(const dims of [[550,350,598],[700,500,800]]){const item={...f,w:dims[0],d:dims[1],h:dims[2],dishwasherDoorOpen:true},spec=R.dishwasherInstallation(item),o=M.build(T,item);o.updateMatrixWorld(true);let n=0;o.traverse(m=>{if(!m.isMesh)return;const p=new T.Vector3(),attr=m.geometry.attributes.position;for(let i=0;i<attr.count;i++){p.fromBufferAttribute(attr,i).applyMatrix4(m.matrixWorld).multiplyScalar(1000);if(p.z<=item.d/2+.002)continue;n++;assert(p.x>=-item.w/2-.002&&p.x<=item.w/2+.002);assert(p.z<=item.d/2+spec.extension+.002);assert(p.y>=spec.openingBottom-.002&&p.y<=spec.openingTop+.002);}});assert(n>1000);}console.log('PASS dishwasher side / overhead / full opening / support conditions, exact thresholds, unknown heights, rotations/mirrors, real modules/holes, project focus/review and production moving vertices');})().catch(e=>{console.error(e);process.exitCode=1;});
