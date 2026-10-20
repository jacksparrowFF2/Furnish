/* Mijia Smart Tea Bar Pro, floor-standing. Supplied envelope 315×310×1155 mm.
 * Static visual study; component dimensions are estimates. Front is local +Z. */
(function(root){
'use strict';
const supported=f=>f.type==='tea_bar_mijia_pro'&&!f.obj;
function build(T,f){
 const result=new T.Group(),body=new T.Group();result.add(body);
 const shell=new T.MeshStandardMaterial({color:f.color||'#eeefec',roughness:.3});
 const seam=new T.MeshStandardMaterial({color:'#b5b8b6',roughness:.5});
 const dark=new T.MeshStandardMaterial({color:'#11191c',roughness:.23});
 const steel=new T.MeshStandardMaterial({color:'#b6bfbe',metalness:.75,roughness:.28});
 const glass=new T.MeshStandardMaterial({color:'#d9e8e9',transparent:true,opacity:.23,roughness:.12,depthWrite:false,side:T.DoubleSide});
 const water=new T.MeshStandardMaterial({color:'#93b9c8',transparent:true,opacity:.28,roughness:.2,depthWrite:false});
 const glow=new T.MeshStandardMaterial({color:'#a4ddec',emissive:'#6bb8d4',emissiveIntensity:.35});
 function mesh(g,m,part){const o=new T.Mesh(g,m);o.castShadow=o.receiveShadow=true;o.userData.teaBarPart=part;body.add(o);return o;}
 function outline(w,d,r){const s=new T.Shape();s.moveTo(-w/2+r,-d/2);s.lineTo(w/2-r,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);s.lineTo(w/2,d/2-r);s.quadraticCurveTo(w/2,d/2,w/2-r,d/2);s.lineTo(-w/2+r,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);s.lineTo(-w/2,-d/2+r);s.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);s.closePath();return s;}
 function slab(w,d,r,h,top,x,z,m,part){const o=mesh(new T.ExtrudeGeometry(outline(w,d,r),{depth:h,bevelEnabled:false,curveSegments:12}),m,part);o.rotation.x=Math.PI/2;o.position.set(x,top,z);return o;}
 function face(w,h,r,x,y,z,m,part){const o=mesh(new T.ExtrudeGeometry(outline(w,h,r),{depth:.5,bevelEnabled:false,curveSegments:12}),m,part);o.position.set(x,y,z);return o;}
 function cylinder(rt,rb,h,x,y,z,m,part,open=false){const o=mesh(new T.CylinderGeometry(rt,rb,h,48,1,open),m,part);o.position.set(x,y,z);return o;}
 function ring(r,t,x,y,z,m,part){const o=mesh(new T.TorusGeometry(r,t,8,48),m,part);o.rotation.x=Math.PI/2;o.position.set(x,y,z);return o;}
 function button(r,x,y,z,m,part){const o=mesh(new T.RingGeometry(r-.55,r,32),m,part);o.position.set(x,y,z);return o;}
 slab(315,310,19,12,12,0,0,shell,'base');
 slab(310,305,18,5,17,0,0,dark,'plinth-shadow');
 slab(315,306,20,583,600,0,0,shell,'lower-cabinet');
 slab(314,305,19.5,1.5,601.5,0,0,seam,'door-seam');
 slab(315,306,20,207.5,809,0,0,shell,'upper-cabinet');
 slab(315,310,19,16,825,0,0,steel,'worktop');
 // Broad rear spine carries the cantilever head; tank remains inside the envelope.
 slab(298,20,4,255,1080,0,-100,shell,'rear-spine');
 slab(315,263,20,75,1155,0,21.5,shell,'head');
 slab(270,42,6,270,1095,0,-134,glass,'rear-tank');
 slab(263,36,4,165,990,0,-134,water,'tank-water');
 slab(272,42,6,5,1100,0,-134,seam,'tank-lid');
 // Tank handle represented folded flat, without extending nominal height.
 slab(175,12,5,5,1105,0,-134,steel,'tank-handle');
 face(224,55,9,0,1118,153.05,dark,'display');
 for(const x of [-82,82])button(9,x,1118,153.7,seam,'dispense-button');
 for(const x of [-51,51])for(const y of [1100,1118,1136])button(5,x,y,153.7,seam,'mode-button');
 // Readable geometric 95 display, no font/texture/network dependency.
 for(const [x,segments] of [[-21,[0,1,2,3,5,6]],[-8,[0,1,3,5,6]]]){
  const bars=[[0,9,8,1.3],[-4,4.5,1.3,7],[4,4.5,1.3,7],[0,0,8,1.3],[-4,-4.5,1.3,7],[4,-4.5,1.3,7],[0,-9,8,1.3]];
  for(const i of segments){const [dx,dy,w,h]=bars[i];face(w,h,.4,x+dx,1119+dy,153.7,glow,'display-segment');}
 }
 face(13,16,3,23,1115,153.7,glow,'cup-icon');
 for(const x of [-82,67]){cylinder(11,10,8,x,1076,111,steel,'outlet');cylinder(7,7,1,x,1071.5,111,dark,'outlet-hole');}
 // Worktop left drainage slots and right circular kettle dock.
 for(const x of [-97,-81,-65])slab(3,34,1.4,.5,825.6,x,68,seam,'drip-slot');
 cylinder(65,65,3,58,826.5,35,seam,'kettle-dock');
 cylinder(63,61,20,58,838,35,shell,'kettle-base');
 cylinder(61,61,151,58,923.5,35,glass,'kettle-glass',true);
 ring(60,1.5,58,851,35,steel,'kettle-bottom-rim');
 cylinder(58,58,61,58,881,35,water,'kettle-water');
 cylinder(43,43,32,58,980,35,steel,'tea-filter',true);
 cylinder(3,3,126,58,915,35,steel,'tea-stem');
 cylinder(10,45,13,58,858,35,steel,'tea-filter-foot');
 ring(61,2,58,1000,35,steel,'kettle-lip');
 cylinder(64,64,6,58,1005,35,shell,'kettle-lid');
 cylinder(21,23,9,58,1012.5,35,shell,'kettle-knob');
 // Open handle in the XY plane, facing the product's right side.
 const handle=outline(36,150,17);handle.holes.push(new T.Path(outline(20,130,9).getPoints(48)));
 const h=mesh(new T.ExtrudeGeometry(handle,{depth:14,bevelEnabled:false,curveSegments:12}),shell,'kettle-handle');h.position.set(135,925,28);
 const spout=mesh(new T.ConeGeometry(13,30,3),glass,'kettle-spout');spout.rotation.z=Math.PI/2;spout.position.set(-10,985,35);
 face(2,59,1,143,768,153.1,seam,'upper-door-grip');face(2,72,1,143,550,153.1,seam,'lower-door-grip');
 for(const x of [-51,-28,-14,0,14,28,51])button(x===-51||x===51?6:1.5,x,787,153.2,seam,'cabinet-controls');
 const products=root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null);
 body.scale.set(f.w/315/1000,products.height(f)/1155/1000,f.d/310/1000);
 result.userData.teaBar=true;return result;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishTeaBarModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
