const assert=require('node:assert/strict'),C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js'),Motion=require('../src/core/cabinet-motion.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`),make=id=>({id:'module-cab',type:C.templateType(id),cx:1500,cy:1500,rot:0,...C.preset(id)});
for(const [id]of C.templates){
 const f=make(id),before=JSON.stringify(f),layout=C.moduleLayout(f),net=C.widths(f),t=f.cabinet.thickness;
 near(layout[0].left,-f.w/2);near(layout.at(-1).right,f.w/2);near(C.moduleWidths(f).reduce((a,b)=>a+b),f.w);
 // Legacy templates share each internal divider; the hanging wardrobe has
 // independent boxes with two complete side boards per module by design.
 layout.forEach((m,i)=>{const boards=f.cabinet.boxConstruction==='independent'?2:1+(i===0?.5:0)+(i===layout.length-1?.5:0);near(m.width,net[i]+t*boards);if(i)near(m.left,layout[i-1].right);});
 assert.equal(JSON.stringify(f),before);assert.equal(JSON.stringify(D.restoreFurniture([f],{makeId:()=>'',colorFor:()=>''})[0]),before);
 const round=P.unpack(P.pack({planId:'p',current:{furniture:[f]},designs:[{name:'外宽',work:{furniture:[f]}}],catalog:[]}));assert.deepEqual(round.current.furniture,[f]);assert.deepEqual(round.designs[0].work.furniture,[f]);
 if(f.cabinet.hoodBayHeight!==undefined)continue;
 if(layout.length>1){for(let i=0;i<layout.length;i++){const delta=10.25,next=C.adjustModuleWidth(f,i,layout[i].width+delta);near(next.w,f.w+delta);near(C.moduleWidths(next)[i],layout[i].width+delta);C.moduleWidths(next).forEach((v,j)=>{if(i!==j)near(v,layout[j].width);});const expected=C.setColumnWidth(f,i,net[i]+delta);C.widths(next).forEach((v,j)=>near(v,C.widths(expected)[j]));next.cabinet.columns.forEach((col,j)=>col.width=expected.cabinet.columns[j].width);assert.deepEqual(next,expected);}}
 const grown=C.adjustModuleWidth(f,0,layout[0].width+25,{grow:true});near(grown.w,f.w+25);near(C.moduleWidths(grown)[0],layout[0].width+25);
}
const f=make('sideboard-open'),limits=C.moduleWidthLimits(f,0);near(C.moduleWidths(C.adjustModuleWidth(f,0,limits.min))[0],limits.min);near(C.moduleWidths(C.adjustModuleWidth(f,0,limits.max))[0],limits.max);
for(const value of [limits.min-.01,limits.max+.01,NaN,Infinity])assert.throws(()=>C.adjustModuleWidth(f,0,value),/模块外宽/);
for(const rot of [0,37,90])for(const flip of [false,true]){const source={...f,rot,flip},width=C.moduleWidths(source)[0]+20;assert.deepEqual(C.adjustModuleWidth(source,0,width),C.moveDivider(source,0,20));const boards=Motion.boards(C.adjustModuleWidth(source,0,width),{includeStatic:true}),bottom=boards.find(b=>b.metadata.cabinetSection==='bottom');assert(bottom);near(Math.max(...bottom.poly.map(p=>p[0]))-Math.min(...bottom.poly.map(p=>p[0])),f.w+20);}
for(const count of [1,2,3,4,6]){const next=C.repartition(f,count),values=C.moduleWidths(next);values.forEach(v=>near(v,f.w/count));}
const single=make('pantry500');near(C.moduleWidths(single)[0],single.w);near(C.adjustModuleWidth(single,0,600,{grow:true}).w,600);
const fridge=make('sideboard-fridge'),i=fridge.cabinet.columns.findIndex(c=>c.fridgeBay),divided=C.repartition(fridge,4);near(C.widths(divided)[divided.cabinet.columns.findIndex(c=>c.fridgeBay)],C.widths(fridge)[i]);
const shrunk=C.adjustModuleWidth(f,1,C.moduleWidths(f)[1]-50.125);near(shrunk.w,f.w-50.125);for(const j of [0,2])near(C.moduleWidths(shrunk)[j],C.moduleWidths(f)[j]);
const packed=P.unpack(P.pack({planId:'p',current:{furniture:[shrunk]},designs:[{name:'宽度联动',work:{furniture:[shrunk]}}],catalog:[]}));assert.deepEqual(packed.current.furniture,[shrunk]);assert.deepEqual(packed.designs[0].work.furniture,[shrunk]);let restored=[shrunk];for(let n=0;n<3;n++)restored=D.restoreFurniture(restored,{makeId:()=>'',colorFor:()=>''});assert.deepEqual(restored,[shrunk]);
const hood=C.configureHoodBay({...make('wall'),w:1200}),hoodWidths=C.moduleWidths(hood),hoodNext=C.configureHoodBay(hood,C.widths(hood)[1]+50,C.hoodBay(hood).height,{grow:true});near(hoodNext.w,1250);for(const j of [0,2])near(C.moduleWidths(hoodNext)[j],hoodWidths[j]);
const device={id:'hood',type:'rangehood_fotile_jcd10ta',w:900,d:350,h:520,cx:0,cy:0,rot:0,mountHeight:1000},gapNext=C.setHoodSideGap(hood,device,30,{grow:true});for(const j of [0,2])near(C.moduleWidths(gapNext)[j],hoodWidths[j]);near(gapNext.w,hood.w+C.widths(gapNext)[1]-C.widths(hood)[1]);
console.log('PASS cabinet module outer widths: every template, shared panels/sums, numeric growth and independent divider movement, limits, equal module repartition, special bays, geometry and legacy roundtrip');
