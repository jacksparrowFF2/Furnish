const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),P=require('../src/core/project-core.js'),D=require('../src/core/design-core.js');
const heater={id:'heater',type:'waterheater_flat',cx:2000,cy:1500,w:700,d:320,h:565,mountHeight:1650,rot:0},node={};
const ctx=vm.createContext({FurnishProject:P,FurnishDesign:D,PLAN:{rooms:[],walls:[[2400,0,2500,4000]],wins:[],doors:[]},state:{furniture:[heater]},ui:{layers:{furn:true},sel:null},view:{s:.1},PAL:{halo:'#fff'},tr:zh=>zh,esc:String,selIds:()=>[],$:()=>node,ACC:'#ff0'});
vm.runInContext(fs.readFileSync(require.resolve('../src/render/plan-renderer.js'),'utf8'),ctx);const draw=()=>vm.runInContext('waterheaterClearanceSVG()',ctx);
assert.equal(draw(),'','unset socket must not show false side conflict');heater.heaterSocket={x:2450,y:1500,z:1900};let s=draw();assert.match(s,/data-clearance-kind="socket"/);assert.match(s,/插座净距不足/);assert.match(s,/pointer-events="none"/);assert.doesNotMatch(s,/data-clearance-kind="right"/);
const before=JSON.stringify(ctx.state);vm.runInContext('renderSelectedGeometry()',ctx);assert.equal(node.innerHTML,s);assert.equal(JSON.stringify(ctx.state),before);
heater.heaterSocket.x=2650;assert.equal(draw(),'');heater.mountHeight=2300;assert.match(draw(),/data-clearance-kind="top"/);ctx.ui.layers.furn=false;assert.equal(draw(),'');
console.log('PASS top and actual-socket advisory overlays, unset position, 300 mm boundary and unchanged project state');
