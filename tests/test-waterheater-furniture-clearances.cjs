const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js'),C=require('../src/core/cabinet-core.js');
const plan={id:'furniture-clearance',rooms:[],walls:[[4000,0,4200,4000]],wins:[],doors:[]};
const heater={id:'heater',name:'热水器',type:'waterheater_flat',cx:2000,cy:1500,w:700,d:320,h:565,mountHeight:1650,rot:0};
const tall={id:'cabinet',name:'右侧高柜',type:'cabinet',cx:2650,cy:1500,w:400,d:600,h:2200,rot:0};
const check=(items=[tall],f=heater,p=plan)=>D.waterheaterClearances(p,f,{furniture:[f,...items]});
let result=check();assert.equal(result.right.gap,100);assert.equal(result.right.ok,false);assert.equal(result.right.blocker.id,tall.id);
assert.equal(result.right.blocker.top,2200);assert.equal(result.right.blocker.bottom,0);
for(const h of [850,1649,1650])assert.equal(check([{...tall,h}]).right.gap,1650,'below and touching bottom do not obstruct');
assert.equal(check([{...tall,h:1650.01}]).right.gap,100,'positive vertical overlap does obstruct');
assert.equal(check([tall],{...heater,mountHeight:2200}).right.gap,1650);
assert.equal(check([tall],{...heater,mountHeight:2199}).right.gap,100);
assert.equal(check([{...tall,cx:2850}]).right.gap,300);assert.equal(check([{...tall,cx:2850}]).right.ok,true);
assert.equal(check([{...tall,cx:2849}]).right.ok,false);
assert.equal(check([{...tall,cy:2200}]).right.gap,1650,'no depth overlap');
assert.equal(check([{...tall,cx:1200}]).right.gap,1650,'left furniture excluded');
assert.equal(check([{...tall,cy:1000,d:680}]).right.gap,1650,'back face contact alone excluded');
assert.equal(check([{...heater,id:'upper',cx:2650,w:400,mountHeight:2215}]).right.gap,1650,'above/touching top excluded');
assert.equal(check([{...heater,id:'upper',cx:2650,w:400,mountHeight:2214}]).right.gap,100);
// Rotated furniture uses the true rotated rectangle, not its axis-aligned box.
const sloped={...tall,w:400,d:400,rot:45};assert.ok(Math.abs(check([sloped]).right.gap-(300-200*Math.SQRT2))<1e-6);
for(const rot of [0,90,180,270])for(const flip of [false,true]){
 const a=rot*Math.PI/180,sign=flip?-1:1,f={...heater,rot,flip},item={...tall,cx:f.cx+650*Math.cos(a)*sign,cy:f.cy+650*Math.sin(a)*sign,rot};
 assert.ok(Math.abs(check([item],f,{...plan,walls:[]}).right.gap-100)<1e-6);
}
assert.equal(check([{...tall,id:'near',cx:2550},{...tall,id:'far',cx:2800}]).right.blocker.id,'near');
assert.equal(check([{...tall,type:'custom',h:900}]).right.gap,1650);
assert.equal(check([{...tall,type:'fridge',h:undefined}]).right.gap,100);
const cabinet={...tall,h:undefined,name:'收纳柜'};assert.equal(D.furnitureVerticalBounds(cabinet).top,C.height(cabinet));assert.equal(check([cabinet]).right.gap,100);
// A mounted TV is not placed at floor height; an unknown type is not asserted clear.
const tv={...tall,type:'tv',w:400,h:500};assert.equal(check([tv]).right.gap,1650);
assert.equal(check([tv],{...heater,mountHeight:1100}).right.gap,100);
const unknown={...tall,type:'unmodeled',h:undefined};result=check([unknown]);assert.equal(result.right.ok,null);assert.equal(result.right.unknown[0].id,unknown.id);
assert.equal(check([{...unknown,cx:3000}]).right.ok,true,'unknown item outside the required space does not prevent clearance');
assert.equal(check([unknown,tall]).right.ok,false,'known obstruction remains a definite failure');
assert.equal(check([],heater,{...plan,walls:[]}).right.ok,null);
const work={furniture:[heater,tall]},saved=P.unpack(P.pack({planId:plan.id,current:work,designs:[],catalog:[]}));
assert.deepEqual(check(saved.current.furniture.slice(1),saved.current.furniture[0]),check());
const context=vm.createContext({FurnishDesign:D,FurnishProject:P,PLAN:plan,state:work,tr:zh=>zh,nm:v=>v,esc:v=>String(v).replaceAll('<','&lt;').replaceAll('>','&gt;')});
vm.runInContext(fs.readFileSync(require.resolve('../src/ui/property-panel.js'),'utf8'),context);context.f=heater;
const render=()=>vm.runInContext('waterheaterInstallationPanel(f)',context);
assert.match(render(),/插座位置未设置，待核对/);assert.doesNotMatch(render(),/机身右侧净距/);
context.f={...heater,heaterSocket:{x:2450,y:1500,z:1900}};assert.match(render(),/机身到插座净距：100 mm.*不足 200 mm/);
context.state={furniture:[heater,{...tall,h:900}]};assert.match(render(),/机身到插座净距：100 mm.*不足 200 mm/,'furniture height is not socket distance');
console.log('PASS height-aware furniture side clearances: cabinet/custom/default/mounted heights, touching/no overlap, movement, mounting height, thresholds, rotation/mirror, oblique/back contacts, unknown heights, persistence and live property panel');
