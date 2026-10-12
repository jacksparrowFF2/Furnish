const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const R=require('../src/core/product-rules.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js');
const base={id:'legacy',name:'旧设备',cx:2000,cy:2000,w:600,d:600,rot:0,color:'#eee'};
// Historical projects omitted parameters rather than recording new defaults.
for(const [type,bottom,top] of [['washer',0,850],['dryer',0,850],['waterheater_flat',1650,2215],['tripleslidingwindow',900,2400],['fridge',0,1800],['fridge_french_drawer',0,1910]]){
 const f={...base,type},before=JSON.stringify(f),saved=P.pack({planId:'p1',current:{furniture:[f]},designs:[{name:'旧版本',work:{furniture:[f]}}],catalog:[]}),result=P.unpack(saved);
 assert.deepEqual(result.current.furniture[0],f);assert.deepEqual(result.designs[0].work.furniture[0],f);
 const v=D.furnitureVerticalBounds(f);assert.equal(v.bottom,bottom);assert.equal(v.top,top);assert.equal(JSON.stringify(f),before);
}
const oldShower={...base,type:'shower_arrow_cream',h:1749,mountHeight:350};
const restored=D.restoreFurniture([oldShower],{makeId:()=> 'new',colorFor:()=> '#eee'}),again=D.restoreFurniture(restored,{makeId:()=> 'new',colorFor:()=> '#eee'});
assert.equal(D.showerInstallation(restored[0]).bottom,350);assert.deepEqual(again,restored);assert.equal(restored[0].mountHeight,undefined);
for(const [type,key,low,high] of [['washer','mountHeight',0,20000],['dryer','stackHeight',0,1000],['shower_arrow_cream','showerRise',100,500],['shower_arrow_cream','showerMixerHeight',0,40000],['shower_arrow_cream','showerHandAngle',0,35]]){
 for(const v of [low,high])P.validateWork({furniture:[{...base,type,[key]:v}]});
 for(const v of [low-1,high+1,NaN,Infinity,String(low),null])assert.throws(()=>P.validateWork({furniture:[{...base,type,[key]:v}]}));
 assert.throws(()=>P.validateWork({furniture:[{...base,type:'chair',[key]:low}]}));
}
const candidate=type=>({...base,id:undefined,type,price:0});
const laundry={...base,type:'washer',mountHeight:870,stackHeight:0};
const dry=D.replaceFurniture(laundry,candidate('dryer'));assert.equal(dry.mountHeight,870);assert.equal(dry.stackHeight,0);
const heater={...base,type:'waterheater_flat',mountHeight:0,heaterSocket:{x:0,y:0,z:0}};
assert.deepEqual(D.replaceFurniture(heater,candidate(heater.type)).heaterSocket,heater.heaterSocket);
for(const f of [laundry,heater,{...oldShower,showerRise:500,showerHandAngle:0},{...base,type:'tripleslidingwindow',mountHeight:0,floorTrack:false},{...base,type:'curtain',curtainStyle:'single'}]){
 const next=D.replaceFurniture(f,candidate('chair'));for(const key of Object.keys(R.fields))assert.equal(next[key],undefined,'foreign field '+key);P.validateWork({furniture:[next]});
}
assert.equal(D.replaceFurniture({...base,type:'tripleslidingdoor',floorTrack:false},candidate('slidingdoor')).floorTrack,false);
assert.equal(D.replaceFurniture({...base,type:'chair'},candidate('tripleslidingwindow')).mountHeight,900);
assert.equal(R.value({...base,type:'washer',mountHeight:0},'mountHeight'),0);
assert.equal(R.height({...base,type:'unregistered'}),undefined);assert.equal(R.definition('toString'),null);
assert(Object.isFrozen(R.types.washer.defaults));
// Same module executes as a classic offline script, without require or imports.
const context=vm.createContext({});vm.runInContext(fs.readFileSync(require.resolve('../src/core/product-rules.js'),'utf8'),context);
assert.equal(context.FurnishProducts.height({type:'fridge'}),1800);
assert.equal(context.FurnishProducts.showerInstallation(oldShower).bottom,350);
for(const [type,bottom,top] of [['mirror',50,1700],['waterheater',1300,2180],['tv',1031.25,1368.75],['stove',862,2330]]){
 const f={...base,type};assert.deepEqual(D.furnitureVerticalBounds(f),{bottom,top,source:'model'});
 assert.deepEqual(D.furnitureVerticalBounds({...f,h:100}),{bottom,top:bottom+100,source:'recorded'});
}
const fixture=P.unpack(JSON.parse(fs.readFileSync(require.resolve('./fixtures/legacy-product-project.json'),'utf8')));assert.equal(fixture.version,undefined);assert.equal(fixture.current.furniture.length,5);assert.equal(fixture.designs.length,1);
const html=fs.readFileSync(require.resolve('../index.html'),'utf8');assert(html.indexOf('src/core/product-rules.js')<html.indexOf('src/core/design-core.js'));assert(html.indexOf('src/core/product-rules.js')<html.indexOf('src/render/shower-arrow-model.js'));
console.log('PASS legacy omission/roundtrip, no-drift shower migration, field boundaries, cross-family replacement, zero values and offline classic-script API');
