'use strict';
const A=require('node:assert/strict'),C=require('../src/core/cabinet-core.js'),M=require('../src/core/cabinet-motion.js'),J=require('../src/core/project-core.js'),D=require('../src/core/design-core.js');
const near=(a,b)=>A(Math.abs(a-b)<1e-6,`${a} != ${b}`),make=()=>({id:'entry',type:'cabinet',cx:2500,cy:2500,rot:0,...C.preset('entry-console')});
for(const shelfEnabled of [false,true]){
 const f=make();f.cabinet.entry.shoeShelf=shelfEnabled;const initial=JSON.stringify(f),rows=C.structuralBoards(f);A.equal(rows.length,3);
 for(const row of rows){
  const boards=M.boards(f,{includeStatic:true}).filter(b=>b.metadata?.cabinetInspect?.section===row.section);A.equal(boards.length,1,'one real continuous selectable board');near(boards[0].bottom,row.position);near(boards[0].top,row.position+row.thickness);
  for(const side of ['position','lower','upper']){
   const scale=side==='lower'?row.lowerScale??1:row.upperScale??1,mid=(row.min+row.max)/2,delta=mid-row.value,target=side==='position'?row.position+delta:side==='lower'?row.lower+delta*scale:row.upper-delta*scale;
   const q=C.editStructuralBoard(f,row.section,side,target),fresh=C.structuralBoards(q).find(b=>b.section===row.section);near(fresh.value,mid);near(fresh[side],target);near(q.h,f.h);near(q.w,f.w);A.deepEqual(q.cabinet.columns.map(c=>c.shelves),f.cabinet.columns.map(c=>c.shelves));
   const before=C.structuralBoards(f),after=C.structuralBoards(q);for(const other of before)if(other.section!==row.section)near(after.find(b=>b.section===other.section).position,other.position);
   const changed=M.boards(q,{includeStatic:true}).find(b=>b.metadata?.cabinetInspect?.section===row.section);near(changed.bottom,fresh.position);near(changed.top,fresh.position+fresh.thickness);
   let restored=q;for(let k=0;k<3;k++)restored=D.restoreFurniture(J.unpack(J.pack({planId:'p',current:{furniture:[restored]},designs:[{name:'named',work:{furniture:[restored]}}],catalog:[]})).current.furniture,{makeId:()=> 'new',colorFor:()=> '#fff'})[0];A.deepEqual(restored,q);
  }
  for(const value of [row.position+row.min-row.value,row.position+row.max-row.value])C.validate(C.editStructuralBoard(f,row.section,'position',value));A.throws(()=>C.editStructuralBoard(f,row.section,'position',row.position+row.min-row.value-.01));A.throws(()=>C.editStructuralBoard(f,row.section,'position',row.position+row.max-row.value+.01));
 }
 A.equal(JSON.stringify(f),initial,'derived rows and edits never mutate source');
}
const f=make(),rows=C.structuralBoards(f),row=rows[0],q=C.editStructuralBoard(f,row.section,'position',row.position+10),room={id:'p',walls:[],wins:[],doors:[],beams:[],rooms:[],ceilingHeight:3000};A.notEqual(J.checkFingerprint({id:f.id},room,[f],800),J.checkFingerprint({id:f.id},room,[q],800));
for(const rot of [0,37,90])for(const flip of [false,true])for(const mountHeight of [0,120]){const item={...f,rot,flip,mountHeight},next=C.editStructuralBoard(item,row.section,'position',row.position+10);near(next.cabinet.entry.shoeHeight,f.cabinet.entry.shoeHeight+10);const parts=M.solidParts(next);A(parts.length);A(parts.every(p=>p.vertical.bottom>=mountHeight-.001));}
A.throws(()=>C.editStructuralBoard({...f,locked:true},row.section,'position',row.position+1));
// Sideboard's existing linked boundaries retain their own edit semantics.
const side={id:'side',type:'cabinet',...C.preset('sideboard-fridge')};for(const r of C.structuralBoards(side)){const v=(r.min+r.max)/2,n=C.editStructuralBoard(side,r.section,'position',r.position+v-r.value);near(C.structuralBoards(n).find(b=>b.section===r.section).value,v);}
console.log('PASS entry structural boards: production tags/identity, linked boundaries and fixed neighbors, half-shelf clearance scale, exact limits, immutable dimensions, actual board positions, cached solids/confirmation, mounted/rotated/mirrored recovery and sideboard regression');
