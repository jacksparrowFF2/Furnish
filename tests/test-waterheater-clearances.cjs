const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js');
const plan={id:'room',rooms:[],walls:[[-200,-200,0,4200],[4000,-200,4200,4200],[0,-200,4000,0],[0,4000,4000,4200]],wins:[],doors:[]};
const f={id:'heater',name:'扁桶电热水器 60L',type:'waterheater_flat',cx:3350,cy:1000,w:700,d:320,h:565,mountHeight:2195,rot:0};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const check=(item=f,p=plan)=>D.waterheaterClearances(p,item);
let c=check();near(c.top.gap,40);near(c.right.gap,300);assert.ok(c.top.ok&&c.right.ok);
c=check({...f,mountHeight:2196,cx:3351});near(c.top.gap,39);near(c.right.gap,299);assert.equal(c.top.ok,false);assert.equal(c.right.ok,false);
assert.equal(check({...f,mountHeight:2300}).top.gap,-65);
assert.equal(check({...f,mountHeight:undefined,h:undefined}).top.gap,585);
assert.equal(check({...f,h:600}).top.gap,5);
assert.equal(check({...f,cx:1000}).right.gap,2650);
// Physical right follows rotation and mirroring, not the screen's right edge.
for(const [rot,cx,cy] of [[0,3350,1000],[90,1000,3350],[180,650,1000],[270,1000,650]]){
 const item={...f,rot,cx,cy};near(check(item).right.gap,300);
 near(check({...item,flip:true}).right.gap,3000);
}
// Oblique nearest clearance must use the complete side, not just a centre ray.
const oblique={...f,cx:3200,cy:2000,rot:45};
near(check(oblique).right.gap,(4000-oblique.cx)*Math.SQRT2-oblique.w/2-oblique.d/2);
// A back wall touching the footprint is not a right-side obstruction.
const backing={...f,cy:160};near(check(backing).right.gap,300);
const touch={...f,cx:3650};near(check(touch).right.gap,0);
near(check({...f,cx:3700}).right.gap,0);
const windowOnly={...plan,walls:[],wins:[{rect:[4000,0,4200,4000]}]};near(check(f,windowOnly).right.gap,300);
const low={...plan,walls:[[4000,0,4200,4000,'low']]};
assert.equal(check(f,low).right.ok,null);near(check({...f,mountHeight:0},low).right.gap,300);
const unavailable=check(f,{walls:[],wins:[]});assert.equal(unavailable.right.gap,null);assert.equal(unavailable.right.ok,null);
assert.equal(check({...f,type:'waterheater'}),null);
// Recompute the same geometry after a complete project file round trip.
const restored=P.unpack(P.pack({planId:plan.id,current:{furniture:[f]},designs:[],catalog:[]})).current.furniture[0];
assert.deepEqual(check(restored),check(f));
const source=fs.readFileSync(require.resolve('../src/ui/property-panel.js'),'utf8');
const ctx=vm.createContext({FurnishDesign:D,FurnishProject:{effectivePlan:()=>plan},PLAN:plan,state:{},tr:zh=>zh});
vm.runInContext(source,ctx);
const render=item=>{ctx.f=item;return vm.runInContext('waterheaterInstallationPanel(f)',ctx);};
assert.match(render(f),/顶部净距：40 mm.*满足/);assert.match(render(f),/机身右侧净距：300 mm.*满足/);
const failed=render({...f,cx:3351,mountHeight:2196});assert.match(failed,/project-error.*顶部净距：39 mm.*不足 1 mm/);assert.match(failed,/project-error.*机身右侧净距：299 mm.*不足 1 mm/);
assert.equal(render({...f,type:'waterheater'}),'');
assert.ok(source.indexOf('${waterheaterInstallationPanel(f)}')>0,'the check is included in the live property panel');
console.log('PASS heater top/right clearance thresholds, moves, height changes, rotation/mirroring, oblique/back/low walls, windows, unknown clearance, project round trip and live panel messages');
