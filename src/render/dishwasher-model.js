/* Mijia 5-place countertop dishwasher. Nominal geometry in mm, converted once. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncPart=(object,source)=>{if(object?.userData){object.userData.furnishPartSource=source;object.userData.furnishPartOrdinal??=object.id;}return object;};

const products=()=>root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null);
const supported=f=>f.type==='dishwasher_mijia_countertop'&&!f.obj;
function build(T,f){
 const P=products(),result=new T.Group(),body=new T.Group();result.add(body);
 const open=P.value(f,'dishwasherDoorOpen'),spec=P.definition(f).foldDoor,reach=spec.openDepth-spec.nominalDepth;
 const mat=(color,metalness=0,roughness=.4)=>new T.MeshStandardMaterial({color,metalness,roughness});
 const white=mat(f.color||'#f4f3ef',.04,.28),inner=mat('#999fa2',.65,.32),steel=mat('#b9bfc2',.8,.25),dark=mat('#282c2e',.2,.45),seal=mat('#4a4c4c',0,.8),base=mat('#d7d8d6'),ceramic=mat('#f5f3ed',.06,.2);
 const m=v=>v/1000;
 function mesh(geo,material,x,y,z,part,parent=body){const o=syncPart(new T.Mesh(geo,material),"dishwasher-model:site-1");o.position.set(m(x),m(y),m(z));o.castShadow=true;o.receiveShadow=true;o.userData.dishwasherPart=part;parent.add(o);return o;}
 function box(w,h,d,material,x,y,z,part,parent=body){return syncPart(mesh(new T.BoxGeometry(m(w),m(h),m(d)),material,x,y+h/2,z,part,parent),"dishwasher-model:site-2");}
 function roundedPath(path,x,y,w,h,r){path.moveTo(x+r,y);path.lineTo(x+w-r,y);path.quadraticCurveTo(x+w,y,x+w,y+r);path.lineTo(x+w,y+h-r);path.quadraticCurveTo(x+w,y+h,x+w-r,y+h);path.lineTo(x+r,y+h);path.quadraticCurveTo(x,y+h,x,y+h-r);path.lineTo(x,y+r);path.quadraticCurveTo(x,y,x+r,y);path.closePath();return path;}
 function extrude(shape,d){const g=new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false,curveSegments:8});g.scale(.001,.001,.001);return g;}
 function panel(w,h,d,x,y,z,part,parent=body){return syncPart(mesh(extrude(roundedPath(new T.Shape(),-w/2,0,w,h,6),d),white,x,y,z-d/2,part,parent),"dishwasher-model:site-3");}
 function wire(a,b,r=1.4,parent=body,part='basket-wire'){
  const start=new T.Vector3(...a.map(m)),end=new T.Vector3(...b.map(m)),delta=end.clone().sub(start),o=syncPart(new T.Mesh(new T.CylinderGeometry(m(r),m(r),delta.length(),6),steel),"dishwasher-model:site-4");o.position.copy(start.add(end).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());o.userData.dishwasherPart=part;parent.add(o);return o;
 }
 // Rounded exterior sleeve; the opening is real geometry, not a painted rectangle.
 const sleeve=roundedPath(new T.Shape(),-275,0,550,598,12),hole=roundedPath(new T.Path(),-252,53,504,524,19);sleeve.holes.push(hole);
 syncPart(mesh(extrude(sleeve,350),white.clone(),0,0,-175,'shell'),"dishwasher-model:site-5");
 syncPart(box(506,518,8,inner,0,55,-169,'inner-back'),"dishwasher-model:site-6");
 syncPart(box(6,504,316,inner,-249,62,-9,'inner-left'),"dishwasher-model:site-7");syncPart(box(6,504,316,inner,249,62,-9,'inner-right'),"dishwasher-model:site-8");
 syncPart(box(492,5,316,inner,0,61,-9,'sump'),"dishwasher-model:site-9");syncPart(box(492,5,316,inner,0,566,-9,'inner-ceiling'),"dishwasher-model:site-10");
 // Recessed bottom trim and foot recess are within the nominal body envelope.
 panel(538,27,7,0,6,171.5,'plinth');syncPart(box(115,6,1,dark,0,0,174.4,'foot-recess'),"dishwasher-model:site-11");
 for(const x of [-257,257])for(const z of [-150,150])syncPart(box(22,3,22,base,x,0,z,'feet'),"dishwasher-model:site-12");
 // Left-side steam outlet; its exact grille position is an appearance estimate.
 for(let i=0;i<5;i++)syncPart(box(.5,2,33,base,-274.7,494+i*5,-86,'steam-outlet'),"dishwasher-model:site-13");
 syncPart(box(1.5,470,3,seal,-254,76,161,'door-seal'),"dishwasher-model:site-14");syncPart(box(1.5,470,3,seal,254,76,161,'door-seal'),"dishwasher-model:site-15");
 // Two static end poses. These approximate the folded leaves, not linkage kinematics.
 const lower=new T.Group(),upper=new T.Group();lower.userData.dishwasherPart='lower-door';upper.userData.dishwasherPart='upper-door';body.add(lower,upper);
 if(open){
  lower.position.set(0,m(64),m(175));lower.rotation.x=Math.PI/2;
  upper.position.set(0,m(97),m(175+reach));upper.rotation.x=-Math.PI/2;
  panel(523,reach,18,0,0,0,'lower-front',lower);panel(523,reach,18,0,0,0,'upper-front',upper);
  syncPart(box(483,reach-18,3,inner,0,9,-10.5,'door-inner',lower),"dishwasher-model:site-16");
  for(const x of [-247,247])wire([x,68,155],[x,68,392],2,body,'hinge-rail');
 }else{
  panel(523,258,14,0,63,166,'lower-front',lower);
  panel(523,260,14,0,324,168,'upper-front',upper);
  syncPart(box(511,2.5,1,dark,0,320.5,174.5,'fold-seam'),"dishwasher-model:site-17");
 }
 // Controls belong to the lower leaf and follow its open pose.
 const controls=new T.Group();lower.add(controls);controls.position.set(0,m(open?reach*.56:235),m(open?10:173.3));
 const disc=syncPart(mesh(new T.CylinderGeometry(m(23),m(23),m(1),48),dark,0,0,0,'display',controls),"dishwasher-model:site-18");disc.rotation.x=Math.PI/2;
 const inactive=mat('#565c5d',.1,.65);
 // Dim seven-segment digits are decorative, with no invented live cycle state.
 for(const x of [-7,7])for(const [dx,dy,w,h] of [[0,12,7,1],[0,0,7,1],[0,-12,7,1],[-4,6,1,8],[4,6,1,8],[-4,-6,1,8],[4,-6,1,8]])syncPart(box(w,h,.3,inactive,x+dx,dy-h/2,.65,'display-segment',controls),"dishwasher-model:site-19");
 for(const x of [-154,-119,-84,84,119,154]){
  syncPart(mesh(new T.TorusGeometry(m(2.3),m(.45),5,16),base,x,0,1,'control-mark',controls),"dishwasher-model:site-20");
  syncPart(box(9,.6,.3,base,x,-8,1,'control-label',controls),"dishwasher-model:site-21");
 }
 syncPart(mesh(new T.TorusGeometry(m(4),m(.65),6,24),base,0,-54,1,'brand-symbol',controls),"dishwasher-model:site-22");
 // Top-front release button, inset into the top surface.
 syncPart(box(29,.5,10,base,0,597.3,153,'release-button'),"dishwasher-model:site-23");
 if(open){
  function basket(width,depth,y,z,height,part){
   const group=new T.Group();group.userData.dishwasherPart=part;body.add(group);group.position.z=m(z);
   const x=width/2,b=-depth/2,e=depth/2;
   for(const yy of [y,y+height*.48,y+height]){wire([-x,yy,b],[x,yy,b],1.5,group);wire([-x,yy,e],[x,yy,e],1.5,group);wire([-x,yy,b],[-x,yy,e],1.5,group);wire([x,yy,b],[x,yy,e],1.5,group);}
   for(let xx=-x;xx<=x;xx+=30){wire([xx,y,b],[xx,y,e],1.1,group);wire([xx,y,b],[xx,y+height,b],1.1,group);wire([xx,y,e],[xx,y+height,e],1.1,group);}
   for(let zz=b;zz<=e;zz+=28){wire([-x,y,zz],[x,y,zz],1.1,group);for(const side of [-1,1])wire([side*x,y,zz],[side*x,y+height,zz],1.1,group);}
   syncPart(box(92,16,7,mat('#c2a47f',0,.65),0,y+height-17,e+2,'basket-handle',group),"dishwasher-model:site-24");return group;
  }
  basket(461,304,113,110,108,'lower-basket');
  basket(451,280,432,-3,67,'upper-basket');
  for(const x of [-238,238])for(const z of [-16,218]){const wheel=syncPart(mesh(new T.CylinderGeometry(.009,.009,.008,16),base,x,111,z,'basket-wheel'),"dishwasher-model:site-25");wheel.rotation.z=Math.PI/2;}
  // Approximate dish loading gives scale and matches the two-tier reference.
  const plateGeo=new T.LatheGeometry([[0,0],[.062,0],[.091,.005],[.11,.014],[.112,.018],[.109,.021],[.09,.011],[.061,.005],[0,.005]].map(v=>new T.Vector2(...v)),48);
  for(let i=0;i<6;i++){const plate=syncPart(mesh(plateGeo,ceramic,-174+i*28,229,117,'plate'),"dishwasher-model:site-26");plate.rotation.z=Math.PI/2;plate.rotation.y=-.1;}
  const bowlGeo=new T.LatheGeometry([[0,0],[.026,0],[.041,.014],[.058,.052],[.058,.055],[.054,.055],[.037,.016],[.024,.004],[0,.004]].map(v=>new T.Vector2(...v)),32);
  for(const [x,y,z] of [[112,117,65],[112,134,65],[112,151,65],[172,117,187],[-100,438,-20],[-20,438,-20],[60,438,-20]])syncPart(mesh(bowlGeo,ceramic,x,y,z,'bowl'),"dishwasher-model:site-27");
  const cupGeo=new T.LatheGeometry([[0,0],[.028,0],[.032,.075],[.029,.078],[.028,.005],[0,.005]].map(v=>new T.Vector2(...v)),32);
  for(const x of [46,115]){syncPart(mesh(cupGeo,ceramic,x,117,201,'cup'),"dishwasher-model:site-28");const handle=syncPart(mesh(new T.TorusGeometry(.016,.004,8,24),ceramic,x+35,153,201,'cup-handle'),"dishwasher-model:site-29");handle.rotation.y=Math.PI/2;}
  for(const x of [-199,199])syncPart(box(8,8,291,base,x,423,-3,'upper-runner'),"dishwasher-model:site-30");
  syncPart(box(94,20,24,base,0,542,-139,'spray-hub'),"dishwasher-model:site-31");
  const spray=syncPart(box(365,9,17,base,0,527,-10,'spray-arm'),"dishwasher-model:site-32");spray.rotation.y=.2;
  for(let x=-150;x<=150;x+=38)syncPart(box(4,1,4,dark,x,536,-10,'spray-nozzle'),"dishwasher-model:site-33");
 }
 body.scale.set(f.w/550,P.height(f)/598,f.d/spec.nominalDepth);
 body.position.y=P.value(f,'mountHeight')/1000;
 result.userData.countertopDishwasher=true;return result;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishDishwasherModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
