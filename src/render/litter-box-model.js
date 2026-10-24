/* Static covered litter box. Supplied envelope 440 × 510 × 400 mm;
 * local +Z is the cat door. Internal dimensions/details are visual estimates. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncIdentity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);

const supported=f=>f.type==='litter_box'&&!f.obj;
function build(T,f,RoundedBoxGeometry){
 const result=new T.Group(),body=new T.Group();result.add(body);
 const shell=new T.MeshStandardMaterial({color:f.color||'#eeede5',roughness:.34});
 const base=new T.MeshStandardMaterial({color:'#858b8e',roughness:.42});
 const grid=new T.MeshStandardMaterial({color:'#e5e5df',roughness:.46});
 const dark=new T.MeshStandardMaterial({color:'#737875',roughness:.8});
 const glass=new T.MeshStandardMaterial({color:'#8c999b',transparent:true,opacity:.45,roughness:.18,side:T.DoubleSide,depthWrite:false});
 function mesh(geometry,material,part){const o=syncIdentity.produce("litter-box-model:site-1",()=>new T.Mesh(geometry,material));o.castShadow=o.receiveShadow=true;o.userData.litterBoxPart=part;body.add(o);return o;}
 function rounded(w,h,d,r,material,x,y,z,part){const o=syncIdentity.produce("litter-box-model:site-2",()=>mesh(new RoundedBoxGeometry(w,h,d,4,r),material,part));o.position.set(x,y+h/2,z);return o;}
 function outline(w,d,r){const s=new T.Shape();s.moveTo(-w/2+r,-d/2);s.lineTo(w/2-r,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);s.lineTo(w/2,d/2-r);s.quadraticCurveTo(w/2,d/2,w/2-r,d/2);s.lineTo(-w/2+r,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);s.lineTo(-w/2,-d/2+r);s.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);s.closePath();return s;}
 function horizontal(shape,height,top,material,part){const o=syncIdentity.produce("litter-box-model:site-3",()=>mesh(new T.ExtrudeGeometry(shape,{depth:height,bevelEnabled:false,curveSegments:12}),material,part));o.rotation.x=Math.PI/2;o.position.y=top;return o;}
 function ring(w,d,r,t,height,top,material,part){const s=outline(w,d,r);s.holes.push(new T.Path(outline(w-2*t,d-2*t,r-t).getPoints(48)));return syncIdentity.produce("litter-box-model.js:generator-call-1",()=>horizontal(s,height,top,material,part));}
 syncIdentity.produce("litter-box-model.js:generator-call-2",()=>horizontal(outline(440,510,74),12,12,base,'basin-floor'));
 syncIdentity.produce("litter-box-model:site-4",()=>ring(440,510,74,8,123,135,base,'basin-wall'));
 syncIdentity.produce("litter-box-model:site-5",()=>ring(440,510,74,13,12,147,shell,'joint-rim'));
 // Hollow U shell, open across the front doorway. Both surfaces and jamb caps
 // belong to one solid polygon; no opaque box sits behind the transparent door.
 function uEdge(w,d,r){const points=[[105,d/2],[w/2-r,d/2]];for(const [cx,cz,a] of [[w/2-r,d/2-r,0],[w/2-r,-d/2+r,90],[-w/2+r,-d/2+r,180],[-w/2+r,d/2-r,270]])for(let i=0;i<=12;i++){const theta=(a+i*90/12)*Math.PI/180;points.push([cx+r*Math.sin(theta),cz+r*Math.cos(theta)]);}points.push([-105,d/2]);return points;}
 const contour=[...uEdge(430,500,70),...uEdge(414,484,62).reverse()],u=new T.Shape();contour.forEach(([x,z],i)=>i?u.lineTo(x,z):u.moveTo(x,z));u.closePath();syncIdentity.produce("litter-box-model.js:generator-call-3",()=>horizontal(u,253,400,shell,'upper-shell'));
 syncIdentity.produce("litter-box-model:site-6",()=>rounded(216,23,10,4,shell,0,147,245,'door-sill'));
 syncIdentity.produce("litter-box-model:site-7",()=>rounded(216,12,15,3,grid,0,375,242,'door-header'));
 // Fixed translucent flap with a softly rounded lower edge and paw emblem.
 const flap=syncIdentity.produce("litter-box-model:site-8",()=>mesh(new T.ExtrudeGeometry(outline(202,207,28),{depth:3,bevelEnabled:false,curveSegments:16}),glass,'cat-door'));flap.position.set(0,272,244);
 function pad(x,y,rx,ry){const o=syncIdentity.produce("litter-box-model:site-9",()=>mesh(new T.CircleGeometry(1,24),grid,'paw'));o.scale.set(rx,ry,1);o.position.set(x,y,247.2);o.castShadow=false;}
 syncIdentity.produce("litter-box-model.js:generator-call-4",()=>pad(0,213,18,14));for(const [x,y,rx,ry] of syncIdentity.items("litter-box-model.js:generator-1",[["item-a",[-26,233,7,10]],["item-b",[-10,246,7,11]],["item-c",[10,246,7,11]],["item-d",[26,233,7,10]]]))syncIdentity.produce("litter-box-model.js:generator-call-5",()=>pad(x,y,rx,ry));
 // Actual slots in the top deck, leaving a solid central service hatch.
 const deck=outline(410,480,64);
 for(let x=-177;x<=177;x+=15)for(let z=-207;z<=207;z+=31){
  if(Math.abs(x)<85&&z>-92&&z<80)continue;
  if(Math.hypot(Math.max(0,Math.abs(x)-137),Math.max(0,Math.abs(z)-171))>50)continue;
  const slot=outline(5,22,2.5);deck.holes.push(new T.Path(slot.getPoints(16).map(p=>new T.Vector2(p.x+x,p.y+z))));
 }
 syncIdentity.produce("litter-box-model.js:generator-call-6",()=>horizontal(deck,7,382,grid,'slotted-deck'));
 const hatch=syncIdentity.produce("litter-box-model:site-10",()=>ring(161,151,22,3,2,384,shell,'top-hatch-seam'));hatch.position.z=-9;
 syncIdentity.produce("litter-box-model:site-11",()=>rounded(31,3,8,2,dark,0,383,48,'hatch-grip'));
 // Dark interior floor reads through the door and the real grate openings.
 syncIdentity.produce("litter-box-model.js:generator-call-7",()=>horizontal(outline(390,450,55),2,24,dark,'interior'));
 const products=root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null);
 body.scale.set(f.w/440/1000,products.height(f)/400/1000,f.d/510/1000);
 result.userData.litterBox=true;return result;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishLitterBoxModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
