'use strict';
const A=require('node:assert/strict'),C=require('../src/core/ceiling-core.js'),P=require('../src/core/project-core.js'),W=require('../src/core/work-state.js'),{fixture}=require('./helpers/wall-finish-fixture.cjs');
const {plan,work}=fixture(),copy=v=>JSON.parse(JSON.stringify(v)),restore=W.create({makeId:()=> 'restore',colorFor:()=> '#ddd',materials:require('../src/data/catalog.js').materials}).restore;
for(const kind of ['plain','low','wide','wash','up','upMount']){
 const sections=C.sectionPreset(kind);A(sections.every(s=>['gypsum','aluminum'].includes(s.section.material)));A(sections.every(s=>!s.section.light||C.sectionRole(s.section)==='channel'),'light belongs to channel');
}
let next=copy(work);
for(const style of ['none','flat','aluminum','ring']){
 const r=C.stableRegionParts({id:'current_'+style,name:style,style,polygon:copy(plan.rooms[0].poly),height:2400,thickness:12,center:false,sections:C.sectionPreset('upMount')});next=C.setRegion(next,r);
}
const original=copy(next.ceilings);
for(let i=0;i<4;i++){
 const loaded=P.unpack(P.pack({planId:plan.id,current:next,designs:[{name:'当前吊顶',work:next}],catalog:[]}));
 A.deepEqual(loaded.current.ceilings,original);A.deepEqual(loaded.designs[0].work.ceilings,original);next=restore(loaded.current,plan);A.deepEqual(next.ceilings,original,'restore cannot mutate current components');
}
const flat=original.items.find(c=>c.kind==='flat');
for(const field of ['attachment','basePolygon'])A.throws(()=>C.validate({version:1,items:[{...flat,regionId:undefined,roomId:plan.rooms[0].id,[field]:{}}]}),/旧版平顶/);
A.equal(C.upgrade,undefined);A.equal(C.upgradeWork,undefined);A.equal(C.attach,undefined);
console.log('PASS all current styles and presets, explicit material/light ownership, stable identities, repeated current/named-design restoration, rejection of retired flat attachments and removed migration APIs');
