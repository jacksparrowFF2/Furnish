const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),code=html.slice(html.indexOf('const STYLES ='),html.indexOf('const stylesHTML ='));
const rooms=[{id:'room_0',name:'房间 1'},{id:'room_1',name:'房间 2'},{id:'room_2',name:'房间 3'},{id:'bay_0',name:'飘窗台',counted:false}];
const ctx={FurnishDesign:require('./design-core.js'),PLAN:{customDraft:{}},ROOMS:rooms,state:{rooms:{room_0:{name:'房间 1',mat:'wood'},room_1:{name:'主卧',mat:'wood'},room_2:{name:'卫生间',mat:'tile800'},bay_0:{name:'飘窗台',mat:'marble'}},furniture:[{type:'sofa'}]},mutate:fn=>fn(),toast:()=>{},tr:s=>s,undo:()=>{}};
vm.createContext(ctx);vm.runInContext(code,ctx);ctx.applyStyle('industrial');
assert.equal(ctx.state.rooms.room_0.mat,'terrazzo');assert.equal(ctx.state.rooms.room_1.mat,'walnut');assert.equal(ctx.state.rooms.room_2.mat,'tile800');assert.equal(ctx.state.rooms.bay_0.mat,'marble');assert.equal(ctx.state.furniture[0].color,'#6b6b6e');
ctx.PLAN={};ctx.ROOMS=[{id:'living'},{id:'master'},{id:'bath'},{id:'unknown'}];ctx.state.rooms=Object.fromEntries(ctx.ROOMS.map(r=>[r.id,{mat:'tile800'}]));ctx.applyStyle('chinese');
assert.equal(ctx.state.rooms.living.mat,'marble');assert.equal(ctx.state.rooms.master.mat,'walnut');assert.equal(ctx.state.rooms.bath.mat,'tile800');assert.equal(ctx.state.rooms.unknown.mat,'tile800');
console.log('PASS custom and built-in style floors, Chinese room names, wet rooms, bay platform and furniture colors');
