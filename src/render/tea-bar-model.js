/* Mijia Smart Tea Bar Pro, floor-standing. Supplied envelope 315×310×1155 mm.
 * Component dimensions and door angle are visual estimates. Front is local +Z. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncIdentity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);

const supported=f=>f.type==='tea_bar_mijia_pro'&&!f.obj;
function build(T,f){
 const result=new T.Group(),body=new T.Group();result.add(body);
 const products=root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null),spec=products.definition(f).teaBar;
 const shell=new T.MeshStandardMaterial({color:f.color||'#eeefec',roughness:.3});
 const seam=new T.MeshStandardMaterial({color:'#b5b8b6',roughness:.5});
 const dark=new T.MeshStandardMaterial({color:'#11191c',roughness:.23});
 const steel=new T.MeshStandardMaterial({color:'#b6bfbe',metalness:.75,roughness:.28});
 const glass=new T.MeshStandardMaterial({color:'#d9e8e9',transparent:true,opacity:.23,roughness:.12,depthWrite:false,side:T.DoubleSide});
 const water=new T.MeshStandardMaterial({color:'#93b9c8',transparent:true,opacity:.28,roughness:.2,depthWrite:false});
 const glow=new T.MeshStandardMaterial({color:'#a4ddec',emissive:'#6bb8d4',emissiveIntensity:.35});
 const liner=new T.MeshStandardMaterial({color:'#c2cbd4',roughness:.35,metalness:.25});
 const bottleMat=new T.MeshStandardMaterial({color:'#769fb2',transparent:true,opacity:.38,roughness:.18,depthWrite:false,side:T.DoubleSide});
 const uv=new T.MeshStandardMaterial({color:'#b5c9ff',emissive:'#7086ee',emissiveIntensity:.5,roughness:.4});
 function mesh(g,m,part){const o=syncIdentity.produce("tea-bar-model:site-1",()=>new T.Mesh(g,m));o.castShadow=o.receiveShadow=true;o.userData.teaBarPart=part;body.add(o);return o;}
 function outline(w,d,r){r=Math.min(r,w/2,d/2);const s=new T.Shape();s.moveTo(-w/2+r,-d/2);s.lineTo(w/2-r,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);s.lineTo(w/2,d/2-r);s.quadraticCurveTo(w/2,d/2,w/2-r,d/2);s.lineTo(-w/2+r,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);s.lineTo(-w/2,-d/2+r);s.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);s.closePath();return s;}
 function slab(w,d,r,h,top,x,z,m,part){const o=syncIdentity.produce("tea-bar-model:site-2",()=>mesh(new T.ExtrudeGeometry(outline(w,d,r),{depth:h,bevelEnabled:false,curveSegments:12}),m,part));o.rotation.x=Math.PI/2;o.position.set(x,top,z);return o;}
 function face(w,h,r,x,y,z,m,part){const o=syncIdentity.produce("tea-bar-model:site-3",()=>mesh(new T.ExtrudeGeometry(outline(w,h,r),{depth:.5,bevelEnabled:false,curveSegments:12}),m,part));o.position.set(x,y,z);return o;}
 function cylinder(rt,rb,h,x,y,z,m,part,open=false){const o=syncIdentity.produce("tea-bar-model:site-4",()=>mesh(new T.CylinderGeometry(rt,rb,h,48,1,open),m,part));o.position.set(x,y,z);return o;}
 function ring(r,t,x,y,z,m,part){const o=syncIdentity.produce("tea-bar-model:site-5",()=>mesh(new T.TorusGeometry(r,t,8,48),m,part));o.rotation.x=Math.PI/2;o.position.set(x,y,z);return o;}
 function button(r,x,y,z,m,part){const o=syncIdentity.produce("tea-bar-model:site-6",()=>mesh(new T.RingGeometry(r-.55,r,32),m,part));o.position.set(x,y,z);return o;}
 function box(w,h,d,x,y,z,m,part){const o=syncIdentity.produce("tea-bar-model:site-7",()=>mesh(new T.BoxGeometry(w,h,d),m,part));o.position.set(x,y,z);return o;}
 syncIdentity.produce("tea-bar-model:site-8",()=>slab(315,310,19,12,12,0,0,shell,'base'));
 syncIdentity.produce("tea-bar-model:site-9",()=>slab(310,305,18,5,17,0,0,dark,'plinth-shadow'));
 // Real open cabinets: side/back boards and horizontal partitions, no solid fill.
 for(const x of syncIdentity.items("tea-bar-model.js:generator-1",[["item-a",-149.5],["item-b",149.5]]))syncIdentity.produce("tea-bar-model:site-10",()=>box(16,792,292,x,413,-7,shell,'cabinet-side'));
 syncIdentity.produce("tea-bar-model:site-11",()=>box(283,792,16,0,413,-145,shell,'cabinet-back'));
 syncIdentity.produce("tea-bar-model:site-12",()=>slab(283,276,4,15,32,0,-8,liner,'bottle-floor'));
 syncIdentity.produce("tea-bar-model:site-13",()=>slab(283,276,4,16,616,0,-8,shell,'partition'));
 syncIdentity.produce("tea-bar-model:site-14",()=>slab(283,276,4,12,809,0,-8,shell,'cabinet-ceiling'));
 // Disinfection/storage liner, rear air slots and wire cup basket.
 syncIdentity.produce("tea-bar-model:site-15",()=>box(279,178,2,0,707,-135,liner,'sterilizer-back'));
 for(const x of syncIdentity.items("tea-bar-model.js:generator-2",[["item-a",-140],["item-b",140]]))syncIdentity.produce("tea-bar-model:site-16",()=>box(2,178,268,x,707,-1,liner,'sterilizer-side'));
 for(const y of syncIdentity.items("tea-bar-model.js:generator-3",[["item-a",746],["item-b",755],["item-c",764],["item-d",773]]))for(const x of syncIdentity.items("tea-bar-model.js:generator-4",[["item-a",-102],["item-b",-68],["item-c",-34],["item-d",0],["item-e",34],["item-f",68],["item-g",102]]))syncIdentity.produce("tea-bar-model:site-17",()=>box(24,2,1,x,y,-133.5,dark,'vent-slot'));
 for(const x of syncIdentity.items("tea-bar-model.js:generator-5",[["item-a",-105],["item-b",105]]))syncIdentity.produce("tea-bar-model:site-18",()=>box(4,3,220,x,781,0,uv,'sterilizer-light'));
 for(const y of syncIdentity.items("tea-bar-model.js:generator-6",[["item-a",638],["item-b",670]])){for(const z of syncIdentity.items("tea-bar-model.js:generator-7",[["item-a",-106],["item-b",108]]))syncIdentity.produce("tea-bar-model:site-19",()=>box(266,2,2,0,y,z,steel,'basket-rail'));for(const x of syncIdentity.items("tea-bar-model.js:generator-8",[["item-a",-132],["item-b",132]]))syncIdentity.produce("tea-bar-model:site-20",()=>box(2,2,214,x,y,1,steel,'basket-rail'));}
 for(const x of syncIdentity.items("tea-bar-model.js:generator-9",[["item-a",-120],["item-b",-80],["item-c",-40],["item-d",0],["item-e",40],["item-f",80],["item-g",120]]))syncIdentity.produce("tea-bar-model:site-21",()=>box(2,2,210,x,638,0,steel,'basket-floor'));
 for(const z of syncIdentity.items("tea-bar-model.js:generator-10",[["item-a",-95],["item-b",-60],["item-c",-25],["item-d",10],["item-e",45],["item-f",80]]))syncIdentity.produce("tea-bar-model:site-22",()=>box(260,2,2,0,639,z,steel,'basket-floor'));
 for(const x of syncIdentity.items("tea-bar-model.js:generator-11",[["item-a",-132],["item-b",132]]))for(const z of syncIdentity.items("tea-bar-model.js:generator-12",[["item-a",-106],["item-b",108]]))syncIdentity.produce("tea-bar-model:site-23",()=>box(2,33,2,x,654,z,steel,'basket-upright'));
 for(const x of syncIdentity.items("tea-bar-model.js:generator-13",[["item-a",-88],["item-b",0],["item-c",88]]))for(const z of syncIdentity.items("tea-bar-model.js:generator-14",[["item-a",-53],["item-b",53]])){
  syncIdentity.produce("tea-bar-model.js:generator-call-1",()=>cylinder(24,27,112,x,696,z,glass,'stored-cup',true));
  syncIdentity.produce("tea-bar-model.js:generator-call-2",()=>cylinder(24,24,2,x,753,z,glass,'stored-cup-base'));
  syncIdentity.produce("tea-bar-model:site-24",()=>ring(27,1.2,x,640,z,glass,'stored-cup-rim'));
 }
 // Lower replaceable bottle, ribs, neck, pump cap and immersed extraction tube.
 const b=spec.bottle,radius=b.diameter/2,neck=b.neckDiameter/2,shoulder=b.height-b.neckHeight;
 const profile=[[0,0],[radius*.8,0],[radius*.95,9],[radius,26],[radius,334],[radius*.97,357],[radius*.83,380],[radius*.53,404],[neck+3.5,shoulder],[neck,shoulder+14],[neck,b.height-b.capHeight],[0,b.height-b.capHeight]];
 syncIdentity.produce("tea-bar-model:site-25",()=>mesh(new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y+b.bottom)),64),bottleMat,'water-bottle')).position.z=b.z;
 syncIdentity.produce("tea-bar-model.js:generator-call-3",()=>cylinder(radius-5,radius-5,310,0,b.bottom+158,b.z,water,'bottle-water'));
 for(const y of syncIdentity.items("tea-bar-model.js:generator-15",[["item-a",34],["item-b",205],["item-c",350]]))for(const offset of syncIdentity.items("tea-bar-model.js:generator-16",[["item-a",-7],["item-b",7]]))syncIdentity.produce("tea-bar-model:site-26",()=>ring(radius-2.5,2.5,0,b.bottom+y+offset,b.z,bottleMat,'bottle-rib'));
 syncIdentity.produce("tea-bar-model.js:generator-call-4",()=>cylinder(neck,neck,b.capHeight,0,b.bottom+b.height-b.capHeight/2,b.z,seam,'bottle-cap'));
 const pumpTop=b.bottom+b.height+b.adapterHeight,tubeBottom=b.bottom+12,tubeTop=pumpTop-11;
 syncIdentity.produce("tea-bar-model.js:generator-call-5",()=>cylinder(18,18,b.adapterHeight,0,pumpTop-b.adapterHeight/2,b.z,shell,'bottle-pump'));
 syncIdentity.produce("tea-bar-model.js:generator-call-6",()=>cylinder(3,3,tubeTop-tubeBottom,0,(tubeBottom+tubeTop)/2,b.z,steel,'bottle-tube'));
 syncIdentity.produce("tea-bar-model:site-27",()=>box(10,584-pumpTop,12,0,(584+pumpTop)/2,b.z,shell,'pump-line'));
 // Shallow front ramp and transverse rollers: illustrative replacement access.
 const rampShape=new T.Shape();rampShape.moveTo(120,32);rampShape.lineTo(155,17);rampShape.lineTo(155,12);rampShape.lineTo(120,12);rampShape.closePath();
 const ramp=syncIdentity.produce("tea-bar-model:site-28",()=>mesh(new T.ExtrudeGeometry(rampShape,{depth:265,bevelEnabled:false}),shell,'bottle-ramp'));ramp.rotation.y=-Math.PI/2;ramp.position.x=132.5;
 for(const x of syncIdentity.items("tea-bar-model.js:generator-17",[["item-a",-72],["item-b",72]])){const roller=syncIdentity.produce("tea-bar-model.js:generator-call-7",()=>cylinder(6,6,38,x,27,108,seam,'bottle-roller'));roller.rotation.z=Math.PI/2;}
 // Independent full-height leaves. All details are reparented to the same hinge.
 const leaves={};
 for(const door of syncIdentity.records("tea-bar-model.js:generator-18",spec.doors)){
  const pivot=new T.Group();pivot.position.set(spec.hingeX,0,spec.front);pivot.userData.teaBarHinge=door.section;body.add(pivot);
  const panel=syncIdentity.produce("tea-bar-model:site-29",()=>slab(315,spec.thickness,18,door.top-door.bottom,door.top,0,spec.front,shell,door.section+'-door'));pivot.attach(panel);
  leaves[door.section]=pivot;
 }
 syncIdentity.produce("tea-bar-model:site-30",()=>slab(315,310,19,16,825,0,0,steel,'worktop'));
 // Broad rear spine carries the cantilever head; tank remains inside the envelope.
 syncIdentity.produce("tea-bar-model:site-31",()=>slab(298,20,4,255,1080,0,-100,shell,'rear-spine'));
 syncIdentity.produce("tea-bar-model:site-32",()=>slab(315,263,20,75,1155,0,21.5,shell,'head'));
 syncIdentity.produce("tea-bar-model:site-33",()=>slab(270,42,6,270,1095,0,-134,glass,'rear-tank'));
 syncIdentity.produce("tea-bar-model:site-34",()=>slab(263,36,4,165,990,0,-134,water,'tank-water'));
 syncIdentity.produce("tea-bar-model:site-35",()=>slab(272,42,6,5,1100,0,-134,seam,'tank-lid'));
 // Tank handle represented folded flat, without extending nominal height.
 syncIdentity.produce("tea-bar-model:site-36",()=>slab(175,12,5,5,1105,0,-134,steel,'tank-handle'));
 syncIdentity.produce("tea-bar-model:site-37",()=>face(224,55,9,0,1118,153.05,dark,'display'));
 for(const x of syncIdentity.items("tea-bar-model.js:generator-19",[["item-a",-82],["item-b",82]]))syncIdentity.produce("tea-bar-model.js:generator-call-8",()=>button(9,x,1118,153.7,seam,'dispense-button'));
 for(const x of syncIdentity.items("tea-bar-model.js:generator-20",[["item-a",-51],["item-b",51]]))for(const y of syncIdentity.items("tea-bar-model.js:generator-21",[["item-a",1100],["item-b",1118],["item-c",1136]]))syncIdentity.produce("tea-bar-model.js:generator-call-9",()=>button(5,x,y,153.7,seam,'mode-button'));
 // Readable geometric 95 display, no font/texture/network dependency.
 for(const [x,segments] of syncIdentity.items("tea-bar-model.js:generator-22",[["item-a",[-21,[0,1,2,3,5,6]]],["item-b",[-8,[0,1,3,5,6]]]])){
  const bars=[[0,9,8,1.3],[-4,4.5,1.3,7],[4,4.5,1.3,7],[0,0,8,1.3],[-4,-4.5,1.3,7],[4,-4.5,1.3,7],[0,-9,8,1.3]];
  for(const i of syncIdentity.records("tea-bar-model.js:generator-23",segments)){const [dx,dy,w,h]=bars[i];syncIdentity.produce("tea-bar-model:site-38",()=>face(w,h,.4,x+dx,1119+dy,153.7,glow,'display-segment'));}
 }
 syncIdentity.produce("tea-bar-model:site-39",()=>face(13,16,3,23,1115,153.7,glow,'cup-icon'));
 for(const x of syncIdentity.items("tea-bar-model.js:generator-24",[["item-a",-82],["item-b",67]])){syncIdentity.produce("tea-bar-model.js:generator-call-10",()=>cylinder(11,10,8,x,1076,111,steel,'outlet'));syncIdentity.produce("tea-bar-model.js:generator-call-11",()=>cylinder(7,7,1,x,1071.5,111,dark,'outlet-hole'));}
 // Worktop left drainage slots and right circular kettle dock.
 for(const x of syncIdentity.items("tea-bar-model.js:generator-25",[["item-a",-97],["item-b",-81],["item-c",-65]]))syncIdentity.produce("tea-bar-model:site-40",()=>slab(3,34,1.4,.5,825.6,x,68,seam,'drip-slot'));
 syncIdentity.produce("tea-bar-model.js:generator-call-12",()=>cylinder(65,65,3,58,826.5,35,seam,'kettle-dock'));
 syncIdentity.produce("tea-bar-model.js:generator-call-13",()=>cylinder(63,61,20,58,838,35,shell,'kettle-base'));
 syncIdentity.produce("tea-bar-model.js:generator-call-14",()=>cylinder(61,61,151,58,923.5,35,glass,'kettle-glass',true));
 syncIdentity.produce("tea-bar-model:site-41",()=>ring(60,1.5,58,851,35,steel,'kettle-bottom-rim'));
 syncIdentity.produce("tea-bar-model.js:generator-call-15",()=>cylinder(58,58,61,58,881,35,water,'kettle-water'));
 syncIdentity.produce("tea-bar-model.js:generator-call-16",()=>cylinder(43,43,32,58,980,35,steel,'tea-filter',true));
 syncIdentity.produce("tea-bar-model.js:generator-call-17",()=>cylinder(3,3,126,58,915,35,steel,'tea-stem'));
 syncIdentity.produce("tea-bar-model.js:generator-call-18",()=>cylinder(10,45,13,58,858,35,steel,'tea-filter-foot'));
 syncIdentity.produce("tea-bar-model:site-42",()=>ring(61,2,58,1000,35,steel,'kettle-lip'));
 syncIdentity.produce("tea-bar-model.js:generator-call-19",()=>cylinder(64,64,6,58,1005,35,shell,'kettle-lid'));
 syncIdentity.produce("tea-bar-model.js:generator-call-20",()=>cylinder(21,23,9,58,1012.5,35,shell,'kettle-knob'));
 // Open handle in the XY plane, facing the product's right side.
 const handle=outline(36,150,17);handle.holes.push(new T.Path(outline(20,130,9).getPoints(48)));
 const h=syncIdentity.produce("tea-bar-model:site-43",()=>mesh(new T.ExtrudeGeometry(handle,{depth:14,bevelEnabled:false,curveSegments:12}),shell,'kettle-handle'));h.position.set(135,925,28);
 const spout=syncIdentity.produce("tea-bar-model:site-44",()=>mesh(new T.ConeGeometry(13,30,3),glass,'kettle-spout'));spout.rotation.z=Math.PI/2;spout.position.set(-10,985,35);
 leaves.upper.attach(syncIdentity.produce("tea-bar-model:site-45",()=>face(2,59,1,143,768,153.1,seam,'upper-door-grip')));leaves.lower.attach(syncIdentity.produce("tea-bar-model:site-46",()=>face(2,72,1,143,550,153.1,seam,'lower-door-grip')));
 for(const x of syncIdentity.items("tea-bar-model.js:generator-26",[["item-a",-51],["item-b",-28],["item-c",-14],["item-d",0],["item-e",14],["item-f",28],["item-g",51]]))leaves.upper.attach(syncIdentity.produce("tea-bar-model.js:generator-call-21",()=>button(x===-51||x===51?6:1.5,x,787,153.2,seam,'cabinet-controls')));
 for(const door of spec.doors){const pivot=leaves[door.section];pivot.traverse(o=>{if(o.isMesh)o.userData.teaBarDoor=door.key;});pivot.rotation.y=products.value(f,door.key)?-spec.angle*Math.PI/180:0;}
 body.scale.set(f.w/315/1000,products.height(f)/1155/1000,f.d/310/1000);
 result.userData.teaBar=true;return result;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishTeaBarModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
