const assert=require('node:assert/strict'),C=require('../src/core/cabinet-core.js'),D=require('../src/core/design-core.js'),P=require('../src/core/project-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const make=id=>({id:'cab',type:C.templateType(id),cx:1000,cy:1000,rot:0,...C.preset(id)});
const round=f=>P.unpack(P.pack({planId:'demo',current:{furniture:[f]},designs:[{name:'旧方案',work:{furniture:[f]}}],catalog:[]})).current.furniture[0];
for(const [id] of C.templates){
 const f=make(id),before=JSON.stringify(f),next=D.resizeFurniture(f,{w:f.w+300});
 assert.equal(next.cabinet.columns.length,f.cabinet.columns.length,id+' preserves bay count');
 assert.deepEqual(next.cabinet.columns.map(c=>c.door),f.cabinet.columns.map(c=>c.door));
 assert.deepEqual(next.cabinet.columns.map(c=>c.shelves),f.cabinet.columns.map(c=>c.shelves));
 assert.deepEqual(round(next),next);assert.deepEqual(D.restoreFurniture([round(next)],{makeId:()=>'',colorFor:()=>''})[0],next);
 assert.equal(JSON.stringify(f),before);
}
const f=make('sideboard-open'),w=C.widths(f),before=JSON.stringify(f);
for(const rot of [0,37,90])for(const flip of [false,true]){
 const source={...f,rot,flip},typed=C.adjustColumnWidth(source,0,w[0]+20.25),dragged=C.moveDivider(source,0,20.25);
 assert.deepEqual(typed,dragged);near(typed.w,f.w);near(C.widths(typed)[1],w[1]-20.25);near(C.widths(typed)[2],w[2]);
 const last=C.adjustColumnWidth(source,2,w[2]+50);near(C.widths(last)[1],w[1]-50);near(last.w,f.w);
 assert.deepEqual(round(typed),typed);
}
near(C.widths(C.adjustColumnWidth(f,0,100))[0],100);
assert.throws(()=>C.adjustColumnWidth(f,0,99.99),/100/);
const max=w[0]+w[1]-100;near(C.widths(C.adjustColumnWidth(f,0,max))[1],100);
assert.throws(()=>C.adjustColumnWidth(f,0,max+.01),/相邻/);
assert.throws(()=>C.adjustColumnWidth(f,0,NaN));assert.throws(()=>C.adjustColumnWidth(f,-1,300));
const grown=C.adjustColumnWidth(f,0,w[0]+80,{grow:true});near(grown.w,f.w+80);near(C.widths(grown)[1],w[1]);
const single=make('pantry500');assert.throws(()=>C.adjustColumnWidth(single,0,550),/单分区/);near(C.adjustColumnWidth(single,0,550,{grow:true}).w,586);
assert.throws(()=>D.resizeFurniture(f,{w:300}),/净宽/);assert.equal(JSON.stringify(f),before);
const changed=C.repartition(f,4);assert.equal(changed.w,f.w);assert.equal(changed.cabinet.columns.length,4);near(C.widths(changed)[0],C.widths(changed)[3]);
assert.deepEqual(changed.cabinet.columns[0].shelves,f.cabinet.columns[0].shelves);changed.cabinet.columns[3].shelves[0]+=1;assert.equal(JSON.stringify(f),before);
assert.throws(()=>C.repartition(f,0));assert.throws(()=>C.repartition(f,1.5));assert.throws(()=>C.repartition(f,13));
const base=C.repartition(make('storage'),1),fitted=C.fitDoors(base,0);
assert.equal(fitted.cabinet.columns[0].door,'double');assert.equal(fitted.cabinet.columns.length,1);near(C.widths(fitted)[0],C.widths(base)[0]);
assert.deepEqual(fitted.cabinet.columns[0].shelves,base.cabinet.columns[0].shelves);assert.deepEqual(fitted.cabinet.columns[0].drawers,base.cabinet.columns[0].drawers);
const open=make('sideboard-open');const front=C.fitDoors(open,1);assert.deepEqual(front.cabinet.columns[1].drawers,open.cabinet.columns[1].drawers);assert.deepEqual(front.cabinet.columns[1].shelves,open.cabinet.columns[1].shelves);
const wideOpen=C.repartition(open,1),pairedFront=C.fitDoors(wideOpen,0);assert.equal(pairedFront.cabinet.columns[0].door,'double');assert.equal(C.drawerCount(pairedFront.cabinet.columns[0]),1,'pairing doors must not split implicitly full-width drawers');assert.deepEqual(pairedFront.cabinet.columns[0].drawers,wideOpen.cabinet.columns[0].drawers);
const hood=C.configureHoodBay(make('wall'));assert.throws(()=>C.repartition(hood,4),/烟机/);assert.throws(()=>C.fitDoors(hood,0),/烟机/);assert.throws(()=>C.adjustColumnWidth(hood,0,400),/烟机/);
const peg=make('entry-pegboard'),thick=structuredClone(peg);thick.cabinet.thickness=24;C.scaleStructure(peg,thick);C.validate(thick);
for(const col of thick.cabinet.columns)assert(col.shelves.some(y=>Math.abs(y+24-col.doorBottom)<1e-7),'door remains attached to divider');
const fractional=make('sideboard-fridge');if(!fractional.cabinet.sideboard)throw Error('expected sideboard fixture');
const fridge=fractional.cabinet.columns.findIndex(c=>c.fridgeBay),fixed=C.widths(fractional)[fridge];
const wide=D.resizeFurniture(fractional,{w:fractional.w+400}),divided=C.repartition(wide,4);near(C.widths(wide)[fridge],fixed);near(C.widths(divided)[0],fixed);
const exact=make('entry-console');exact.cabinet.entry.nicheHeight+=.125;const same=structuredClone(exact);C.scaleStructure(exact,same);assert.deepEqual(same,exact,'no-op must not round historical fractional dimensions');
const tolerant=make('sideboard-open');C.widths(tolerant).forEach((w,i)=>tolerant.cabinet.columns[i].width=w+(i===0?.001:0));C.validate(tolerant);const untouched=structuredClone(tolerant);C.scaleStructure(tolerant,untouched);assert.deepEqual(untouched,tolerant,'no-op preserves historical widths within the import tolerance');
for(let i=0,restored=round(fitted);i<4;i++){const next=round(restored);assert.deepEqual(next,restored);restored=next;}
console.log('PASS cabinet explicit edit operations: resize preservation, numeric/drag equivalence, thresholds, special bays, immutable actions and old project round trips');

