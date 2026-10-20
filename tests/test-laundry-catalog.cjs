const assert=require('node:assert/strict'),catalog=require('../src/data/catalog.js'),K=require('../src/core/kitchen-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js');
const items=catalog.library.find(c=>c.cat==='阳台柜').items;
assert.deepEqual(items.map(it=>it[1]),['完整阳台洗衣柜','基础洗衣机柜','阳台定制水槽（可设异形缺角）','阳台台上盆 · 圆角单盆']);
const complete=items[0],basic=items[1];assert(K.isLaundryAreaItem(complete));assert(!K.isLaundryAreaItem(basic));
const spec=K.catalogSpec(basic),base={id:'basic',type:'counter',name:basic[1],cx:2000,cy:2000,rot:0,color:basic[4],...spec};Object.assign(base,K.configure(base,base.kitchen));assert.equal(K.laundrySide(base),'left');assert(!base.kitchen.laundry.assembly);
let n=0;const full=K.createLaundryCabinet({id:'full',cx:2000,cy:2000,rot:0,color:complete[4]},()=>`part${++n}`,'left');assert.equal(full.length,2);assert(full[0].kitchen.laundry.assembly.sink);assert(full[0].kitchen.laundry.assembly.upper);assert.equal(K.laundrySide(full[0]),'left');
for(const [name,side,area] of [['完整阳台洗衣区 · 左洗衣机','left',true],['完整阳台洗衣区 · 右洗衣机','right',true],['洗衣机柜 · 左洗衣机／右水槽','left',false],['洗衣机柜 · 水槽与设备空位','right',false]]){
 const old=catalog.findItem('counter',name);assert(old);assert(!items.includes(old),'old entries are lookup only');assert.equal(K.isLaundryAreaItem(old),area);
 let source;if(area){source=K.createLaundryArea({id:'old',name,cx:2000,cy:2000,rot:37,color:'#f3f1ec'},()=>`old${++n}`,'old-group',side);source[0].name=name;}else source=[K.configure({id:'old',name,type:'counter',cx:2000,cy:2000,rot:37,color:'#f3f1ec',...K.catalogSpec(old)},K.catalogSpec(old).kitchen)];
 assert.equal(K.laundrySide(source[0]),side);const before=structuredClone(source),payload={planId:'demo',current:{furniture:source},designs:[{name:'旧洗衣区',work:{furniture:source}}],catalog:[]};const restored=P.unpack(P.pack(payload));assert.deepEqual(restored.current.furniture,before);assert.deepEqual(restored.designs[0].work.furniture,before);
 const recover=items=>D.restoreFurniture(items,{makeId:()=>'',colorFor:()=>''});assert.deepEqual(recover(recover(source)),recover(source));assert.deepEqual(source,before);
 for(const rot of [0,37,90,270]){const members=source.map(f=>({...f,rot}));const switched=K.switchLaundrySides(members,'old');assert.notEqual(K.laundrySide(switched[0]),side);assert.deepEqual(K.switchLaundrySides(switched,'old').map(f=>({side:!!f.flip,id:f.id})),members.map(f=>({side:!!f.flip,id:f.id})));}
}
assert.equal(K.catalogSpec(items[3]).sinkStyle,'vessel');assert.equal(items.filter(it=>it[0]==='ksink').length,2);
console.log('PASS two laundry catalog entries, both sinks, default left, four retired specifications, left/right and old project round trips');
