const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const G=require('../src/core/layout-geometry.js');
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');
const door3D=html.slice(html.indexOf('  DOORS.forEach(d => {'),html.indexOf('  SLIDES.forEach',html.indexOf('  DOORS.forEach(d => {')));
const doorHeight=html.match(/const SWING_DOOR_HEIGHT = [^;]+;/)[0];
const lintels=html.slice(html.indexOf('  [...DOORS.map(d =>'),html.indexOf('  const bayPosts='));
const app=fs.readFileSync(require.resolve('../src/app.js'),'utf8');
const setup=app.slice(app.indexOf('const PLANS ='),app.indexOf('const {materials:'));
class Group {constructor(){this.children=[];this.position={set:(x,y,z)=>Object.assign(this.position,{x,y,z})};this.rotation={};}add(...v){this.children.push(...v);}}
class Mesh extends Group {constructor(){super();this.userData={};this.scale={};}}
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
for(const horizontal of [true,false])for(const end of [false,true])for(const face of [0,1])for(const thickness of [100,240]){
 const rect=horizontal?[0,0,900,thickness]:[0,0,thickness,900];
 const base={rect,h:horizontal?[end?900:0,face?thickness:0]:[face?thickness:0,end?900:0],c:horizontal?[end?-1:1,0]:[0,end?-1:1],o:horizontal?[0,face?1:-1]:[face?1:-1,0],len:900,entry:true};
 const nodes=new Map(),$=s=>{if(!nodes.has(s))nodes.set(s,{innerHTML:''});return nodes.get(s);};
 const plan={walls:[],wins:[],doors:[JSON.parse(JSON.stringify(base))],slides:[],rooms:[],bounds:{}};
 const ctx=vm.createContext({$,FurnishGeometry:G,FurnishPlans:[],state:{open:{d:{}}},window:{},PAL:{ink:'#000',leaf:'#fff'},tr:s=>s,select:()=>{}});
 vm.runInContext(setup,ctx);ctx.plan=plan;vm.runInContext('PLAN=plan;applyPlanData();',ctx);
 vm.runInContext(fs.readFileSync(require.resolve('../src/render/plan-renderer.js'),'utf8'),ctx);
 vm.runInContext(fs.readFileSync(require.resolve('../src/ui/property-panel.js'),'utf8'),ctx);
 ctx.mutate=fn=>{fn();vm.runInContext('applyOpeningOverrides();renderOpenings();',ctx);};
 vm.runInContext('renderOpenings();',ctx);
 const arrow=()=>$('#gOpen').innerHTML.slice($('#gOpen').innerHTML.lastIndexOf('<path'));
 const initialArrow=arrow();ctx.bindOpeningPanel({kind:'door',id:0});
 const read=()=>JSON.parse(vm.runInContext('JSON.stringify(DOORS[0])',ctx));
 // Legacy work files contain flipped swing vectors but an unchanged hinge face.
 ctx.state.open.d[0]={h:[...base.h],c:[...base.c],o:base.o.map(v=>-v)};
 vm.runInContext('applyOpeningOverrides();renderOpenings();',ctx);
 near(read().h[horizontal?1:0],thickness-base.h[horizontal?1:0]);assert.equal(arrow(),initialArrow);
 $('#oReset').onclick();
 $('#oFlip').onclick();let d=read(),normal=horizontal?1:0;
 near(d.h[normal],thickness-base.h[normal]);near(d.h[1-normal],base.h[1-normal]);assert.equal(arrow(),initialArrow);
 $('#oHinge').onclick();d=read();near(d.h[1-normal],900-base.h[1-normal]);near(d.h[normal],thickness-base.h[normal]);assert.equal(arrow(),initialArrow);
 // Run the actual production 3D door builder, then transform the closed leaf corners.
 const three={Group,Mesh,SphereGeometry:class{}};
 const spans=[];
 const scene=vm.createContext({DOORS:[d],SLIDES:[],wallBox:(r,bottom,top)=>spans.push({bottom,top}),THREE:three,FurnishGeometry:G,M:v=>v/1000,wx:v=>v/1000,wz:v=>v/1000,top:2.8,mat:()=>{},metal:()=>{},doors:[],archUp:new Group(),box:(w,h,t,m,x,y,z)=>{const leaf=new Mesh();leaf.position.set(x,y+h/2,z);leaf.width=w;leaf.height=h;leaf.depth=t;return leaf;}});
 vm.runInContext(doorHeight,scene);
 for(const cut of [1,2.05,2.1,2.8]){
  scene.top=cut;scene.doors.length=0;spans.length=0;
  vm.runInContext(lintels+door3D,scene);
  const leaf=scene.doors[0].pivot.children[0],leafTop=leaf.position.y+leaf.height/2;
  near(leafTop,Math.min(2.1,cut));
  if(cut>2.1){assert.equal(spans.length,1);near(leafTop,spans[0].bottom);}else assert.equal(spans.length,0);
 }
 const door=scene.doors[0],leaf=door.pivot.children[0];
 near(door.pivot.position[horizontal?'z':'x'],d.h[normal]/1000);
 const a=door.a0;
 for(const x of [0,leaf.width])for(const z of [leaf.position.z-leaf.depth/2,leaf.position.z+leaf.depth/2]){
  const p=[door.pivot.position.x+x*Math.cos(a)+z*Math.sin(a),door.pivot.position.z-x*Math.sin(a)+z*Math.cos(a)];
  assert.ok(p[normal]>=-1e-8&&p[normal]<=thickness/1000+1e-8,'closed leaf stays within wall thickness');
  assert.ok(p[1-normal]>=-1e-8&&p[1-normal]<=.9+1e-8,'closed leaf spans the opening');
 }
 near(Math.min(Math.abs(leaf.position.z-leaf.depth/2),Math.abs(leaf.position.z+leaf.depth/2)),0);
 $('#oFlip').onclick();$('#oHinge').onclick();d=read();assert.deepEqual(d.h,base.h);assert.deepEqual(d.c,base.c);assert.deepEqual(d.o,base.o);
 $('#oFlip').onclick();$('#oReset').onclick();d=read();assert.deepEqual(d.h,base.h);assert.equal(arrow(),initialArrow);
}
assert.ok(html.includes('ed.entryDirection || ed._base?.o || ed.o'),'walk entry uses the fixed inward direction');
console.log('PASS independent entry direction, reversible hinge faces/ends, and actual 3D closed-leaf alignment across horizontal/vertical doors and both wall thicknesses');
