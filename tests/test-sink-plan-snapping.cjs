const assert=require('node:assert/strict'),K=require('../src/core/kitchen-core.js'),S=require('../src/core/snapping.js'),SVG=require('../src/render/furniture-svg.js');
const palette={ink:'#333',text:'#333'},near=(a,b)=>assert(Math.abs(a-b)<1e-5,`${a} != ${b}`);
let count=0;
for(const shape of ['straight','L','U'])for(const corner of ['left','right'])for(const rot of [0,37,180,270])for(const flip of [false,true]){
 const host=K.configure({id:'top',type:'counter',cx:3000,cy:3000,w:1200,d:600,rot,flip},{version:1,shape,corner,depth:600,counterDepth:620,baseHeight:830,thickness:20,modules:[{run:0,width:1200,role:'sink'},...(shape==='straight'?[]:[{run:1,width:1104,role:'sink'}]),...(shape==='U'?[{run:2,width:1200,role:'sink'}]:[])]});
 for(const m of K.layout(host)){
  const device={id:'sink',type:'sink_arrow_750',w:750,d:450,h:240,cx:0,cy:0,rot:(rot+(flip?-m.rot:m.rot)+360)%360,flip},[cx,cy]=K.world(host,m.x+3,m.y+4),sink={...device,cx,cy};
  const options={grid:10,scale:1,wallSnap:false,guides:true,rects:[],furniture:[host,sink],moving:[sink]},result=S.move(sink,cx,cy,options),expected=K.world(host,m.x,m.y);
  near(result.position[0],expected[0]);near(result.position[1],expected[1]);assert(K.onSurface({...sink,cx:result.position[0],cy:result.position[1]},host));
  assert.deepEqual(S.move(sink,cx,cy,{...options,disabled:true}).position,[cx,cy]);
  const html=SVG.render(host.type,host.w,host.d,'#eee',palette,host,{furniture:[host,sink]});assert(html.includes('data-kitchen-opening="true"'));assert(html.includes('mask="url(#kitchen-openings-top)"'));
  const moved={...sink,cx:100000,cy:100000};assert(!SVG.render(host.type,host.w,host.d,'#eee',palette,host,{furniture:[host,moved]}).includes('data-kitchen-opening="true"'));
  const locked=S.move(sink,cx,cy,{...options,axis:'x',anchor:{x:cx,y:cy}});near(locked.position[1],cy);
  count++;
 }
}
// Near an inner edge, the rim snaps to the material side of that edge.
for(const flip of [false,true])for(const rot of [0,37,180]){
 const host=K.configure({id:'rim-top',type:'counter',cx:3000,cy:3000,w:1200,d:600,rot,flip},{version:1,shape:'L',corner:'right',depth:600,counterDepth:620,baseHeight:830,thickness:20,modules:[{run:0,width:1200,role:'door'},{run:1,width:1104,role:'sink'}]}),m=K.layout(host)[1],[cx,cy]=K.world(host,m.x-300+225-20+4,m.y+81),sink={id:'rim',type:'sink_arrow_750',w:750,d:450,rot:(rot+(flip?-90:90)+360)%360,flip,cx,cy};
 const hit=S.move(sink,cx,cy,{grid:10,scale:1,wallSnap:false,guides:true,rects:[],furniture:[host,sink]}),p=K.local(host,...hit.position);
 near(p[0],m.x-300+225-20);assert(K.onSurface({...sink,cx:hit.position[0],cy:hit.position[1]},host));
}
// A concave top's empty interior is not a supporting surface or a host magnet.
const host=K.configure({id:'top',type:'counter',cx:0,cy:0,w:1200,d:600,rot:0},{version:1,shape:'L',corner:'right',depth:600,baseHeight:830,thickness:20,modules:[{run:0,width:1200,role:'door'},{run:1,width:1104,role:'sink'}]}),m=K.layout(host)[1],sink={id:'sink',type:'sink_arrow_750',w:750,d:450,h:240,rot:90,cx:m.x-530,cy:m.y};
const outside=S.move(sink,sink.cx,sink.cy,{grid:1,scale:1,wallSnap:false,guides:true,rects:[],furniture:[host,sink]});assert(!K.onSurface({...sink,cx:outside.position[0],cy:outside.position[1]},host),'outside edge contact must not be mistaken for support');assert(!SVG.render(host.type,host.w,host.d,'#eee',palette,host,{furniture:[host,sink]}).includes('data-kitchen-opening="true"'));
host.kitchen.obstacleFit={depths:[],cuts:[[[m.x-50,m.y-50],[m.x+50,m.y-50],[m.x+50,m.y+50],[m.x-50,m.y+50]]]};
const blocked={...sink,cx:m.x+3,cy:m.y+4},result=S.move(blocked,blocked.cx,blocked.cy,{grid:1,scale:1,wallSnap:false,guides:true,rects:[],furniture:[host,blocked]});assert.equal(result.guides.length,0,'obstacle holes cannot become valid interior magnets');
console.log(`PASS ${count} worktop interior magnets and SVG openings across shapes, runs, rotations and mirrors; voids, cut surfaces, axis locks and disabled snapping`);
