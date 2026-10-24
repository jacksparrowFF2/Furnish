/* Reference-photo cat tree. Millimetre source geometry, local +Z at ladder.
 * Only the 500 x 500 x 1430 envelope is supplied; internal sizes are estimates. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncIdentity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);

function build(T,f,RoundedBoxGeometry){
 const result=new T.Group(),body=new T.Group();result.add(body);
 const wood=new T.MeshStandardMaterial({color:'#dfbd7d',roughness:.73});
 const green=new T.MeshStandardMaterial({color:f.color||'#75a533',roughness:1});
 const cream=new T.MeshStandardMaterial({color:'#eee7d2',roughness:1});
 const rope=new T.MeshStandardMaterial({color:'#c7af80',roughness:1});
 const glass=new T.MeshStandardMaterial({color:'#e9e2cf',transparent:true,opacity:.28,roughness:.18,side:T.DoubleSide,depthWrite:false});
 function mesh(g,m,part){const o=syncIdentity.produce("cat-tree-model:site-1",()=>new T.Mesh(g,m));o.castShadow=o.receiveShadow=true;o.userData.catTreePart=part;body.add(o);return o;}
 function box(w,h,d,x,y,z,m,part){const o=syncIdentity.produce("cat-tree-model:site-2",()=>mesh(new RoundedBoxGeometry(w,h,d,3,Math.min(5,w/4,h/4,d/4)),m,part));o.position.set(x,y+h/2,z);return o;}
 function cyl(r,h,x,y,z,m,part){const o=syncIdentity.produce("cat-tree-model:site-3",()=>mesh(new T.CylinderGeometry(r,r,h,40),m,part));o.position.set(x,y+h/2,z);return o;}
 function link(a,b,r,m,part){const p=new T.Vector3(...a),q=new T.Vector3(...b),v=q.clone().sub(p),o=syncIdentity.produce("cat-tree-model:site-4",()=>mesh(new T.CylinderGeometry(r,r,v.length(),20),m,part));o.position.copy(p.add(q).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return o;}
 function ring(r,t,x,y,z,m,part){const o=syncIdentity.produce("cat-tree-model:site-5",()=>mesh(new T.TorusGeometry(r,t,8,48),m,part));o.rotation.x=Math.PI/2;o.position.set(x,y,z);return o;}
 function post(x,z,y,h){syncIdentity.produce("cat-tree-model:site-6",()=>cyl(23,h,x,y,z,cream,'sisal-post'));for(let v of syncIdentity.range("cat-tree-model.js:generator-1",y+3,y+h-2,(7),false))syncIdentity.produce("cat-tree-model:site-7",()=>ring(23,1,x,v,z,rope,'sisal-winding'));}
 syncIdentity.produce("cat-tree-model:site-8",()=>box(500,16,500,0,0,0,wood,'base'));
 // Hollow green house. The right wall has a real arched doorway.
 syncIdentity.produce("cat-tree-model:site-9",()=>box(330,12,320,65,16,-40,wood,'house-floor'));
 syncIdentity.produce("cat-tree-model:site-10",()=>box(330,365,10,65,28,-195,green,'house-back'));
 syncIdentity.produce("cat-tree-model:site-11",()=>box(10,365,320,-95,28,-40,green,'house-left'));
 syncIdentity.produce("cat-tree-model:site-12",()=>box(330,365,10,65,28,115,green,'house-front'));
 const wall=new T.Shape();wall.moveTo(-160,0);wall.lineTo(-65,0);wall.lineTo(-65,205);wall.absarc(0,205,65,Math.PI,0,true);wall.lineTo(65,0);wall.lineTo(160,0);wall.lineTo(160,365);wall.lineTo(-160,365);wall.closePath();
 const door=syncIdentity.produce("cat-tree-model:site-13",()=>mesh(new T.ExtrudeGeometry(wall,{depth:10,bevelEnabled:false,curveSegments:20}),green,'house-door-wall'));door.rotation.y=-Math.PI/2;door.position.set(230,28,-40);
 syncIdentity.produce("cat-tree-model:site-14",()=>box(350,16,340,65,393,-40,wood,'house-roof'));
 // Small tree silhouettes on front wall.
 const forest=new T.MeshStandardMaterial({color:'#38552b',roughness:1});
 for(const [x,y] of syncIdentity.items("cat-tree-model.js:generator-2",[["item-a",[-50,70]],["item-b",[30,80]]])){const s=new T.Shape();s.moveTo(-18,0);s.lineTo(18,0);s.lineTo(11,30);s.lineTo(16,30);s.lineTo(0,80);s.lineTo(-16,30);s.lineTo(-11,30);s.closePath();const o=syncIdentity.produce("cat-tree-model:site-15",()=>mesh(new T.ShapeGeometry(s),forest,'tree-decoration'));o.position.set(x,y,120.2);syncIdentity.produce("cat-tree-model:site-16",()=>box(4,16,1,x,y-15,120.3,wood,'tree-trunk'));}
 // Front ladder, two padded rungs.
 for(const x of syncIdentity.items("cat-tree-model.js:generator-3",[["item-a",0],["item-b",150]])){const o=syncIdentity.produce("cat-tree-model:site-17",()=>box(20,400,22,x,0,0,wood,'ladder-rail'));const a=new T.Vector3(x,24,232),b=new T.Vector3(x,409,114);o.position.copy(a.clone().add(b).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.sub(a).normalize());}
 for(const t of syncIdentity.items("cat-tree-model.js:generator-4",[["item-a",.34],["item-b",.72]]))syncIdentity.produce("cat-tree-model.js:generator-call-1",()=>link([0,24+385*t,232-118*t],[150,24+385*t,232-118*t],20,cream,'ladder-rung'));
 // Left enclosed lookout, open between actual wooden balusters.
 syncIdentity.produce("cat-tree-model.js:generator-call-2",()=>post(-157,95,16,300));syncIdentity.produce("cat-tree-model:site-18",()=>cyl(93,12,-157,316,95,wood,'cage-floor'));syncIdentity.produce("cat-tree-model:site-19",()=>cyl(83,9,-157,328,95,cream,'cage-cushion'));syncIdentity.produce("cat-tree-model:site-20",()=>cyl(93,12,-157,590,95,wood,'cage-roof'));
 for(let i of syncIdentity.range("cat-tree-model.js:generator-5",0,8,1,false)){const a=i*Math.PI/4;syncIdentity.produce("cat-tree-model.js:generator-call-3",()=>link([-157+86*Math.cos(a),328,95+86*Math.sin(a)],[-157+86*Math.cos(a),590,95+86*Math.sin(a)],5,wood,'cage-baluster'));}
 syncIdentity.produce("cat-tree-model.js:generator-call-4",()=>post(-157,95,602,130));syncIdentity.produce("cat-tree-model:site-21",()=>box(220,12,205,-135,732,70,wood,'left-platform'));
 // Sisal exercise ball between two wooden uprights.
 for(const x of syncIdentity.items("cat-tree-model.js:generator-6",[["item-a",-213],["item-b",-83]]))syncIdentity.produce("cat-tree-model:site-22",()=>box(12,148,22,x,744,55,wood,'ball-upright'));
 syncIdentity.produce("cat-tree-model.js:generator-call-5",()=>link([-213,828,55],[-83,828,55],4,wood,'ball-axle'));
 const roller=syncIdentity.produce("cat-tree-model:site-23",()=>mesh(new T.SphereGeometry(62,36,24),rope,'scratch-ball'));roller.position.set(-148,828,55);
 for(let i of syncIdentity.range("cat-tree-model.js:generator-7",-7,7,1,true)){const xx=i*7,r=Math.sqrt(62*62-xx*xx),o=syncIdentity.produce("cat-tree-model:site-24",()=>mesh(new T.TorusGeometry(r,.8,6,40),cream,'ball-winding'));o.rotation.y=Math.PI/2;o.position.set(-148+xx,828,55);}
 // Rear columns, right jump platform, clear hemispherical bowl.
 syncIdentity.produce("cat-tree-model.js:generator-call-6",()=>post(-105,-135,409,905));syncIdentity.produce("cat-tree-model.js:generator-call-7",()=>post(193,-135,409,640));
 syncIdentity.produce("cat-tree-model:site-25",()=>box(140,12,170,172,732,-130,wood,'right-platform'));
 const deck=new T.Shape();deck.moveTo(-135,-245);deck.lineTo(245,-245);deck.lineTo(245,-5);deck.lineTo(-135,-5);deck.closePath();
 const cut=new T.Path();cut.absarc(65,-130,105,0,Math.PI*2,true);deck.holes.push(cut);
 const frame=syncIdentity.produce("cat-tree-model:site-26",()=>mesh(new T.ExtrudeGeometry(deck,{depth:14,bevelEnabled:false,curveSegments:48}),wood,'bowl-platform'));frame.rotation.x=Math.PI/2;frame.position.y=1063;
 const aperture=syncIdentity.produce("cat-tree-model:site-27",()=>mesh(new T.RingGeometry(105,115,48),wood,'bowl-rim'));aperture.rotation.x=-Math.PI/2;aperture.position.set(65,1064,-130);
 const points=[];for(let i=0;i<=24;i++){const a=i*Math.PI/48;points.push(new T.Vector2(105*Math.sin(a),-105*Math.cos(a)));}
 const bowl=syncIdentity.produce("cat-tree-model:site-28",()=>mesh(new T.LatheGeometry(points,56),glass,'space-bowl'));bowl.position.set(65,1062,-130);bowl.castShadow=false;
 // Sloping scratching board rests on the house roof and left platform.
 const ramp=syncIdentity.produce("cat-tree-model:site-29",()=>box(103,16,365,0,0,0,wood,'scratch-board'));ramp.position.set(-4,574,37);ramp.rotation.x=Math.atan2(330,155);
 const pad=syncIdentity.produce("cat-tree-model:site-30",()=>box(72,4,335,0,0,0,cream,'scratch-inlay'));pad.position.copy(ramp.position);pad.quaternion.copy(ramp.quaternion);pad.translateY(11);
 // Tall padded perch: actual hollow ring, cushion and hanging toy.
 syncIdentity.produce("cat-tree-model:site-31",()=>cyl(105,14,-105,1314,-135,wood,'perch-base'));syncIdentity.produce("cat-tree-model:site-32",()=>cyl(94,14,-105,1328,-135,cream,'perch-cushion'));
 const rimShape=new T.Shape();rimShape.absarc(0,0,105,0,Math.PI*2,false);const hole=new T.Path();hole.absarc(0,0,90,0,Math.PI*2,true);rimShape.holes.push(hole);
 const rim=syncIdentity.produce("cat-tree-model:site-33",()=>mesh(new T.ExtrudeGeometry(rimShape,{depth:102,bevelEnabled:false,curveSegments:48}),cream,'perch-fence'));rim.rotation.x=-Math.PI/2;rim.position.set(-105,1328,-135);
 syncIdentity.produce("cat-tree-model.js:generator-call-8",()=>link([-15,1320,-98],[-15,1230,-98],1.3,rope,'toy-string'));const toy=syncIdentity.produce("cat-tree-model:site-34",()=>mesh(new T.SphereGeometry(16,20,14),cream,'toy-ball'));toy.position.set(-15,1214,-98);
 const products=root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null);
 body.scale.set(f.w/500/1000,products.height(f)/1430/1000,f.d/500/1000);
 result.userData.catTree=true;return result;
}
const api={supported:f=>f.type==='cat_tree'&&!f.obj,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishCatTreeModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
