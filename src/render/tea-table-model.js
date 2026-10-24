/* Reference tea cabinet: 800 × 400 × 720 mm including casters and tray rails.
 * Internal divisions, tea ware and storage jars are visual estimates. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncIdentity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);

const supported=f=>f.type==='tea_table_800'&&!f.obj;
function build(T,f){
 const result=new T.Group(),body=new T.Group();result.add(body);
 const wood=new T.MeshStandardMaterial({color:f.color||'#68432e',roughness:.48});
 const inset=wood.clone();inset.color.multiplyScalar(.83);
 const black=new T.MeshStandardMaterial({color:'#171b19',roughness:.36});
 const glass=new T.MeshStandardMaterial({color:'#111918',roughness:.16,metalness:.15});
 const brass=new T.MeshStandardMaterial({color:'#c7a052',roughness:.3,metalness:.7});
 const cane=new T.MeshStandardMaterial({color:'#d6c294',roughness:.9});
 function mesh(g,m,part,x,y,z){const o=syncIdentity.produce("tea-table-model:site-1",()=>new T.Mesh(g,m));o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;o.userData.teaTablePart=part;body.add(o);return o;}
 function box(w,h,d,x,y,z,m,part){return syncIdentity.produce("tea-table-model:site-2",()=>mesh(new T.BoxGeometry(w,h,d),m,part,x,y,z));}
 function cyl(r,h,x,y,z,m,part){return syncIdentity.produce("tea-table-model:site-3",()=>mesh(new T.CylinderGeometry(r,r,h,24),m,part,x,y,z));}
 // Four casters define the floor datum, recessed within the footprint.
 for(const x of syncIdentity.items("tea-table-model.js:generator-1",[["item-a",-362],["item-b",362]]))for(const z of syncIdentity.items("tea-table-model.js:generator-2",[["item-a",-162],["item-b",162]])){
  const wheel=syncIdentity.produce("tea-table-model:site-4",()=>cyl(15,13,x,15,z,black,'caster'));wheel.rotation.z=Math.PI/2;
  syncIdentity.produce("tea-table-model:site-5",()=>box(19,17,10,x,28,z,brass,'caster-fork'));
 }
 syncIdentity.produce("tea-table-model:site-6",()=>box(800,25,400,0,49.5,0,wood,'base'));
 syncIdentity.produce("tea-table-model:site-7",()=>box(800,24,400,0,679,0,wood,'worktop'));
 for(const x of syncIdentity.items("tea-table-model.js:generator-3",[["item-a",-390],["item-b",390]]))syncIdentity.produce("tea-table-model:site-8",()=>box(18,605,400,x,364.5,0,wood,'side'));
 syncIdentity.produce("tea-table-model:site-9",()=>box(760,605,10,0,364.5,-195,inset,'back'));
 // Recessed side panels with structural rails.
 for(const x of syncIdentity.items("tea-table-model.js:generator-4",[["item-a",-399],["item-b",399]])){
  syncIdentity.produce("tea-table-model:site-10",()=>box(1,256,320,x,212,0,inset,'side-panel'));syncIdentity.produce("tea-table-model:site-11",()=>box(1,265,320,x,516,0,inset,'side-panel'));
  for(const z of syncIdentity.items("tea-table-model.js:generator-5",[["item-a",-180],["item-b",180]]))syncIdentity.produce("tea-table-model:site-12",()=>box(2,605,30,x,364.5,z,wood,'side-stile'));
  for(const y of syncIdentity.items("tea-table-model.js:generator-6",[["item-a",77],["item-b",365],["item-c",652]]))syncIdentity.produce("tea-table-model:site-13",()=>box(2,24,350,x,y,0,wood,'side-rail'));
 }
 syncIdentity.produce("tea-table-model:site-14",()=>box(18,605,380,105,364.5,0,wood,'divider'));
 syncIdentity.produce("tea-table-model:site-15",()=>box(476,18,380,-142,370,0,wood,'shelf'));
 // Drawer face stays behind the front footprint, including brass knob.
 syncIdentity.produce("tea-table-model:site-16",()=>box(472,94,18,-142,318,183,wood,'drawer'));
 syncIdentity.produce("tea-table-model:site-17",()=>box(450,70,345,-142,318,-1,inset,'drawer-body'));
 function knob(x,y){const o=syncIdentity.produce("tea-table-model:site-18",()=>cyl(7,8,x,y,196,brass,'knob'));o.rotation.x=Math.PI/2;}
 syncIdentity.produce("tea-table-model:site-19",()=>knob(-142,318));
 syncIdentity.produce("tea-table-model:site-20",()=>box(270,596,16,247,364,174,inset,'door-recess'));
 for(const x of syncIdentity.items("tea-table-model.js:generator-7",[["item-a",123],["item-b",371]]))syncIdentity.produce("tea-table-model:site-21",()=>box(22,596,20,x,364,183,wood,'door-stile'));
 for(const y of syncIdentity.items("tea-table-model.js:generator-8",[["item-a",78],["item-b",650]]))syncIdentity.produce("tea-table-model:site-22",()=>box(226,24,20,247,y,183,wood,'door-rail'));
 for(const x of syncIdentity.items("tea-table-model.js:generator-9",[["item-a",151],["item-b",174],["item-c",197]]))syncIdentity.produce("tea-table-model:site-23",()=>box(9,548,20,x,364,183,wood,'door-slat'));
 syncIdentity.produce("tea-table-model:site-24",()=>box(142,548,3,281,364,185,cane,'cane-panel'));
 // Instanced dark apertures keep the woven panel inexpensive and font/texture-free.
 const holes=[];for(let row=0;row<54;row++)for(let col=0;col<14;col++){
  const x=216+col*9.5+(row%2)*4.75;if(x<348)holes.push([x,101+row*9.8]);
 }
 const apertures=syncIdentity.produce("tea-table-model:site-25",()=>new T.InstancedMesh(new T.CircleGeometry(1.65,8),black,holes.length)),matrix=new T.Matrix4();
 syncIdentity.instances(apertures,'tea-table:cane-weave',holes.map(([x,y],i)=>{matrix.makeTranslation(x,y,186.6);return ['weave-'+i,{id:'weave-'+i,matrix:matrix.clone()}];}));
 apertures.userData.teaTablePart='cane-weave';body.add(apertures);syncIdentity.produce("tea-table-model:site-26",()=>knob(125,360));
 // Tray rails, open at the front; top rail sets the total height to 720 mm.
 syncIdentity.produce("tea-table-model:site-27",()=>box(800,29,14,0,705.5,-193,wood,'tray-back'));
 for(const x of syncIdentity.items("tea-table-model.js:generator-10",[["item-a",-393],["item-b",393]]))syncIdentity.produce("tea-table-model:site-28",()=>box(14,29,386,x,705.5,7,wood,'tray-side'));
 syncIdentity.produce("tea-table-model:site-29",()=>box(772,7,14,0,694.5,193,wood,'tray-front'));
 syncIdentity.produce("tea-table-model:site-30",()=>box(492,4,350,-132,693,0,black,'drain-tray'));
 for(let i of syncIdentity.range("tea-table-model.js:generator-11",0,28,1,false))syncIdentity.produce("tea-table-model:site-31",()=>box(7,2,308,-366+i*17.3,696,0,inset,'drain-slat'));
 syncIdentity.produce("tea-table-model:site-32",()=>box(258,5,350,251,693.5,0,glass,'heater-panel'));
 for(const z of syncIdentity.items("tea-table-model.js:generator-12",[["item-a",-84],["item-b",70]])){
  syncIdentity.produce("tea-table-model:site-33",()=>cyl(62,1,251,696.5,z,black,'heater-ring'));
  const ring=syncIdentity.produce("tea-table-model:site-34",()=>mesh(new T.TorusGeometry(59,.6,6,48),brass,'heater-outline',251,697.2,z));ring.rotation.x=Math.PI/2;
 }
 for(let i of syncIdentity.range("tea-table-model.js:generator-13",0,4,1,false))syncIdentity.produce("tea-table-model:site-35",()=>box(10,1,3,185+i*28,697,-151,brass,'heater-control'));
 // Static reference arrangement. Accessories remain within the cabinet footprint.
 const clear=new T.MeshPhysicalMaterial({color:'#e3f1ed',transparent:true,opacity:.24,roughness:.12,metalness:.05,depthWrite:false,side:T.DoubleSide});
 const steel=new T.MeshStandardMaterial({color:'#bdc2bd',roughness:.24,metalness:.8});
 const glaze=new T.MeshStandardMaterial({color:'#14221d',roughness:.22,metalness:.16});
 const turquoise=new T.MeshStandardMaterial({color:'#4a8276',roughness:.35});
 const ceramic=new T.MeshStandardMaterial({color:'#d3b57a',roughness:.55});
 const cream=new T.MeshStandardMaterial({color:'#eee0bb',roughness:.65});
 const tea=new T.MeshStandardMaterial({color:'#79603b',roughness:.95});
 function accessory(kind,x,y,z,scale=1){const g=new T.Group();g.position.set(x,y,z);g.scale.setScalar(scale);g.userData.teaTableAccessory=kind;body.add(g);return g;}
 function part(g,geometry,material,name,x=0,y=0,z=0){const o=syncIdentity.produce("tea-table-model:site-36",()=>new T.Mesh(geometry,material));o.position.set(x,y,z);o.castShadow=material!==clear;o.receiveShadow=true;o.userData.teaTablePart=name;g.add(o);return o;}
 function lathe(g,points,m,name){return syncIdentity.produce("tea-table-model.js:generator-call-1",()=>part(g,new T.LatheGeometry(points.map(([r,y])=>new T.Vector2(r,y)),40),m,name));}
 function disk(g,r,h,y,m,name){return syncIdentity.produce("tea-table-model.js:generator-call-2",()=>part(g,new T.CylinderGeometry(r,r,h,32),m,name,0,y));}
 function tube(g,points,r,m,name){return syncIdentity.produce("tea-table-model.js:generator-call-3",()=>part(g,new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),24,r,8,false),m,name));}
 function loop(g,x,y,rx,ry,m,name){const o=syncIdentity.produce("tea-table-model.js:generator-call-4",()=>part(g,new T.TorusGeometry(1,.13,8,40),m,name,x,y));o.scale.set(rx,ry,rx);return o;}
 function kettle(z,s){
  const g=accessory('glass-kettle',251,697,z,s);
  syncIdentity.produce("tea-table-model:site-37",()=>lathe(g,[[0,0],[29,0],[44,7],[57,40],[51,102],[36,145],[34,145],[49,102],[55,40],[42,9],[29,3],[0,3]],clear,'kettle-glass'));
  syncIdentity.produce("tea-table-model.js:generator-call-5",()=>disk(g,36,9,149,steel,'kettle-neck'));syncIdentity.produce("tea-table-model.js:generator-call-6",()=>disk(g,44,6,157,steel,'kettle-lid'));
  syncIdentity.produce("tea-table-model:site-38",()=>lathe(g,[[0,170],[18,169],[38,162],[44,160]],steel,'kettle-lid-dome'));
  syncIdentity.produce("tea-table-model.js:generator-call-7",()=>disk(g,7,14,178,clear,'kettle-lid-stem'));syncIdentity.produce("tea-table-model.js:generator-call-8",()=>part(g,new T.SphereGeometry(8,16,12),clear,'kettle-lid-knob',0,192));
  syncIdentity.produce("tea-table-model.js:generator-call-9",()=>loop(g,58,80,23,43,clear,'kettle-handle'));
  syncIdentity.produce("tea-table-model:site-39",()=>tube(g,[[-43,45,0],[-61,90,0],[-66,130,0],[-74,145,0]],5,clear,'kettle-spout'));
  syncIdentity.produce("tea-table-model.js:generator-call-10",()=>disk(g,37,4,6,steel,'kettle-base'));
 }
 syncIdentity.produce("tea-table-model.js:generator-call-11",()=>kettle(-84,1));syncIdentity.produce("tea-table-model.js:generator-call-12",()=>kettle(70,.925));
 function cup(x,z,r=24,h=29){const g=accessory('tea-cup',x,697,z);syncIdentity.produce("tea-table-model:site-40",()=>lathe(g,[[0,0],[r*.5,0],[r*.74,4],[r,h],[r-2,h],[r*.65,6],[0,5]],glaze,'tea-cup'));syncIdentity.produce("tea-table-model:site-41",()=>lathe(g,[[r-.7,h-5],[r,h-2],[r,h],[r-2,h]],turquoise,'cup-glaze-rim'));}
 for(let i of syncIdentity.range("tea-table-model.js:generator-14",0,6,1,false))syncIdentity.produce("tea-table-model.js:generator-call-13",()=>cup(-315+i*72,115));
 syncIdentity.produce("tea-table-model.js:generator-call-14",()=>cup(-310,-94,31,78));
 const pot=accessory('ceramic-teapot',-152,697,-80);
 syncIdentity.produce("tea-table-model:site-42",()=>lathe(pot,[[0,0],[21,0],[35,12],[41,37],[30,64],[23,68],[0,68]],glaze,'teapot-body'));
 syncIdentity.produce("tea-table-model:site-43",()=>lathe(pot,[[23,61],[32,64],[33,68],[23,71]],turquoise,'teapot-glaze'));syncIdentity.produce("tea-table-model.js:generator-call-15",()=>disk(pot,30,5,72,glaze,'teapot-lid'));syncIdentity.produce("tea-table-model.js:generator-call-16",()=>part(pot,new T.SphereGeometry(5,12,10),glaze,'teapot-knob',0,82));
 syncIdentity.produce("tea-table-model.js:generator-call-17",()=>loop(pot,-42,39,19,26,glaze,'teapot-handle'));syncIdentity.produce("tea-table-model:site-44",()=>tube(pot,[[32,26,0],[49,40,0],[58,59,0]],6,glaze,'teapot-spout'));
 const strainer=accessory('tea-strainer',-19,697,-86);syncIdentity.produce("tea-table-model:site-45",()=>lathe(strainer,[[26,0],[19,12],[17,28],[30,39],[33,44],[30,46],[26,39],[14,29],[0,28]],glaze,'strainer'));
 syncIdentity.produce("tea-table-model:site-46",()=>lathe(strainer,[[30,40],[33,44],[30,46]],turquoise,'strainer-rim'));
 // Upper shelf: two transparent tea jars and two low patterned ceramic caddies.
 for(const [x,h] of syncIdentity.items("tea-table-model.js:generator-15",[["item-a",[-318,183]],["item-b",[-210,193]]])){
  const g=accessory('glass-tea-jar',x,379,75);
  syncIdentity.produce("tea-table-model:site-47",()=>lathe(g,[[0,0],[35,0],[41,7],[41,h-22],[34,h-16],[32,h-16],[39,h-23],[39,8],[0,3]],clear,'storage-glass'));
  syncIdentity.produce("tea-table-model.js:generator-call-18",()=>disk(g,36,12,h-10,steel,'storage-lid'));
  // Deterministic coarse dried-leaf clusters visible through the glass.
  for(let i of syncIdentity.range("tea-table-model.js:generator-16",0,54,1,false)){const a=i*2.39996,r=28*Math.sqrt((i%13)/13),y=12+(i%17)*(h-50)/17;const leaf=syncIdentity.produce("tea-table-model.js:generator-call-19",()=>part(g,new T.IcosahedronGeometry(5+(i%3),0),tea,'tea-leaf',Math.cos(a)*r,y,Math.sin(a)*r));leaf.scale.set(1,.55,1.4);leaf.rotation.y=a;}
 }
 for(const [x,z]of syncIdentity.items("tea-table-model.js:generator-17",[["item-a",[-85,92]],["item-b",[29,46]]])){
  const g=accessory('ceramic-tea-jar',x,379,z);syncIdentity.produce("tea-table-model.js:generator-call-20",()=>disk(g,46,80,40,cream,'ceramic-jar'));syncIdentity.produce("tea-table-model.js:generator-call-21",()=>disk(g,48,11,84,ceramic,'ceramic-lid'));
  for(const y of syncIdentity.items("tea-table-model.js:generator-18",[["item-a",14],["item-b",20],["item-c",60],["item-d",66]]))syncIdentity.produce("tea-table-model.js:generator-call-22",()=>disk(g,46.6,2,y,ceramic,'jar-pattern-band'));
  syncIdentity.produce("tea-table-model.js:generator-call-23",()=>disk(g,36,1,90,brass,'jar-lid-decoration'));
 }
 for(const [x,h,m]of syncIdentity.items("tea-table-model.js:generator-19",[["item-a",[-305,167,cane]],["item-b",[-143,186,ceramic]],["item-c",[21,198,ceramic]]])){
  const g=accessory('storage-canister',x,62,75);syncIdentity.produce("tea-table-model:site-48",()=>lathe(g,[[0,0],[48,0],[57,9],[57,h-15],[50,h-9],[0,h-9]],m,'storage-canister'));
  syncIdentity.produce("tea-table-model.js:generator-call-24",()=>disk(g,52,9,h-5,black,'canister-lid'));syncIdentity.produce("tea-table-model.js:generator-call-25",()=>disk(g,49,3,h+1,brass,'canister-lid-rim'));
 }
 const products=root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null);
 body.scale.set(f.w/800/1000,products.height(f)/720/1000,f.d/400/1000);
 result.userData.teaTable=true;return result;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishTeaTableModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
