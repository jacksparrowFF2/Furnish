'use strict';
const assert=require('node:assert/strict'),C=require('../src/core/cabinet-core.js'),P=require('../src/core/project-core.js'),M=require('../src/core/cabinet-motion.js'),D=require('../src/core/design-core.js'),R=require('../src/core/repository-core.js');
const near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`);
let count=0;
for(const template of ['wardrobe','wardrobe-hanging'])for(const thickness of [12,18,30])for(const rot of [0,90,37])for(const flip of [false,true]){
 let f={id:'stacked',type:'wardrobe',cx:1000,cy:2000,rot,flip,mountHeight:120,...C.preset(template)};
 f.cabinet.thickness=thickness;f.cabinet.columns.forEach(c=>delete c.width);f=C.setConstruction(f,'independent',{left:0,right:0});
 const before=structuredClone(f),stack=C.setStackedBoxes(f,true),t=thickness,p=f.cabinet.plinth;
 assert.deepEqual(f,before);C.validate(stack);
 assert.deepEqual(stack.cabinet.columns,f.cabinet.columns);
 for(let i=0;i<f.cabinet.columns.length;i++){
  const old=C.spaces(f,i).at(-1),now=C.spaces(stack,i).at(-1);near(old.height-now.height,t);
  const shelf=stack.cabinet.columns[i].shelves.length-1,gaps=C.shelfClearances(stack,i,shelf);near(gaps.thickness,2*t);near(gaps.upper.height,now.height);
  const edited=C.editShelfClearance(stack,i,shelf,'upper',gaps.upper.height+10);near(C.shelfClearances(edited,i,shelf).upper.height,gaps.upper.height+10);
  const seam=p+2*t+stack.cabinet.columns[i].shelves.at(-1),boards=M.boards(stack,{includeStatic:true}).filter(b=>b.metadata.cabinetShelf?.column===i&&b.metadata.cabinetShelf.shelf===shelf||b.metadata.cabinetStackedBottom?.column===i);
  assert.equal(boards.length,2);near(boards[0].top,boards[1].bottom);near(boards[0].top,seam);
 }
 const boards=M.boards(stack,{includeStatic:true}),original=M.boards(f,{includeStatic:true});
 assert.equal(boards.filter(b=>b.metadata.cabinetSide).length,original.filter(b=>b.metadata.cabinetSide).length*2);
 for(const b of boards.filter(b=>b.metadata.cabinetSide)){const col=b.metadata.cabinetDivider?.column??(b.metadata.cabinetSide==='left'?0:f.cabinet.columns.length-1);assert(b.top>b.bottom);}
 const zones=C.openingZones(stack).filter(z=>z.kind==='cabinetdoor');assert(zones.some(z=>z.section==='upper')&&zones.some(z=>z.section==='lower'));
 const opened=C.setPartOpening(stack,{column:0,section:'upper',leaf:0},45);assert.equal(C.doorState(opened.cabinet.columns[0],'upper').open,true);assert.equal(C.doorState(opened.cabinet.columns[0],'lower').open,false);
 assert.equal(C.setStackedBoxes(opened,false).cabinet.stackedBoxes,undefined);
 const pack=P.pack({planId:'p',current:{furniture:[stack]},designs:[{id:'named',name:'named',planId:'p',work:{furniture:[stack]}}],catalog:[]});assert.equal(pack.version,50);
 let restored=P.unpack(pack).current.furniture[0];for(let j=0;j<3;j++)restored=P.unpack(P.pack({planId:'p',current:{furniture:[restored]},designs:[],catalog:[]})).current.furniture[0];assert.deepEqual(restored,stack);
 assert.deepEqual(C.spatialConfig({...stack,color:'#123456'}),C.spatialConfig(stack));assert.notDeepEqual(C.spatialConfig(stack),C.spatialConfig(f));assert.equal(D.applyCabinetTemplate(stack,'book').cabinet.stackedBoxes,undefined);
 count++;
}
let grouped={id:'g',type:'wardrobe',...C.preset('wardrobe-hanging')};grouped=C.setBoxJoints(grouped,['shared']);grouped=C.setStackedBoxes(grouped,true);
const last=grouped.cabinet.columns[0].shelves.length-1,old=grouped.cabinet.columns[0].shelves[last];const moved=C.moveShelf(grouped,0,last,old-50);assert.equal(moved.cabinet.columns[0].shelves.at(-1),moved.cabinet.columns[1].shelves.at(-1));
assert.equal(M.boards(grouped,{includeStatic:true}).filter(b=>b.metadata.cabinetStackedBottom).length,1);
for(const value of [false,0,'true',{},null])assert.throws(()=>C.validate({...grouped,cabinet:{...grouped.cabinet,stackedBoxes:value}}));
const mismatch=structuredClone(grouped);mismatch.cabinet.columns[1].shelves[mismatch.cabinet.columns[1].shelves.length-1]-=1;assert.throws(()=>C.validate(mismatch));
assert.throws(()=>C.setStackedBoxes(C.preset('base'),true));assert.throws(()=>C.setStackedBoxes({...grouped,locked:true},true));
const tight=structuredClone(grouped);tight.cabinet.columns.forEach(c=>c.shelves[c.shelves.length-1]=C.bodyHeight(tight)-tight.cabinet.plinth-4*tight.cabinet.thickness-39.99);assert.throws(()=>C.validate(tight));
for(const op of ['add','copy','delete','move'])C.validate(C.editModules(grouped,op,0,{at:1,width:400}).furniture);C.validate(C.autoDoors(grouped));
assert.throws(()=>C.editStructure(grouped,0,'deleteShelf',grouped.cabinet.columns[0].shelves.length-1));for(const op of ['addShelf','copyShelf','equalShelves'])assert.equal(C.editStructure(grouped,0,op,0).cabinet.columns[0].shelves.at(-1),grouped.cabinet.columns[0].shelves.at(-1));
const panels=C.setConstruction(grouped,'independent',{left:18,right:25}),panelBoards=M.boards(panels,{includeStatic:true}).filter(b=>b.metadata.cabinetEndPanel);assert.equal(panelBoards.length,2);for(const b of panelBoards){near(b.bottom,0);near(b.top,C.height(panels));}
const exactly=structuredClone(grouped);exactly.cabinet.columns.forEach(c=>c.shelves[c.shelves.length-1]=C.bodyHeight(exactly)-exactly.cabinet.plinth-4*exactly.cabinet.thickness-40);C.validate(exactly);
assert(R.workspaceVersions.includes(50));console.log(`PASS ${count} stacked configurations: actual double boards, split sides, net heights, movement, door states, rotation/mirror, mount height persistence, named/project roundtrip, invalid data and spatial signatures`);
