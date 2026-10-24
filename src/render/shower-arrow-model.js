/* ARROW AE34129ZMKW-P2: shared adjustable production/preview model, metres. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncIdentity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);

const products=root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null);
const type='shower_arrow_cream',spec=[420,515,products.height({type})],mountHeight=350;
function build(THREE,f,RoundedBoxGeometry){
 const g=new THREE.Group(),cream=new THREE.MeshStandardMaterial({color:f.color||'#eee7d8',roughness:.32,metalness:.12}),face=new THREE.MeshStandardMaterial({color:'#f7f2e8',roughness:.5}),hole=new THREE.MeshStandardMaterial({color:'#a99f8d',roughness:.8}),silver=new THREE.MeshStandardMaterial({color:'#b4b7b5',metalness:.75,roughness:.25});
 const v=p=>new THREE.Vector3(...p);
 function add(geo,mat,x,y,z,parent=g){const m=syncIdentity.produce("shower-arrow-model:site-1",()=>new THREE.Mesh(geo,mat));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 function box(w,h,d,x,y,z,r=.008,mat=cream,parent=g){return syncIdentity.produce("shower-arrow-model:site-2",()=>add(new RoundedBoxGeometry(w,h,d,4,Math.min(r,w/2,h/2,d/2)*.98),mat,x,y,z,parent));}
 function plate(w,h,d,r,x,y,z,mat,parent){
  const s=new THREE.Shape(),a=-w/2,b=-h/2;
  s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);s.lineTo(a+w,b+h-r);s.quadraticCurveTo(a+w,b+h,a+w-r,b+h);s.lineTo(a+r,b+h);s.quadraticCurveTo(a,b+h,a,b+h-r);s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);
  const geo=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.001,bevelThickness:.001,bevelSegments:2,steps:1,curveSegments:8});geo.translate(0,0,-d/2);return syncIdentity.produce("shower-arrow-model:site-3",()=>add(geo,mat,x,y,z,parent));
 }
 function pipe(points,r=.0125,mat=cream,parent=g){const curve=new THREE.CatmullRomCurve3(points.map(v),false,'centripetal');const m=syncIdentity.produce("shower-arrow-model:site-4",()=>add(new THREE.TubeGeometry(curve,Math.max(24,points.length*12),r,12,false),mat,0,0,0,parent));return m;}
 function cylinder(r,len,x,y,z,mat=cream,axis='y',parent=g){const m=syncIdentity.produce("shower-arrow-model:site-5",()=>add(new THREE.CylinderGeometry(r,r,len,24),mat,x,y,z,parent));if(axis==='z')m.rotation.x=Math.PI/2;return m;}
 // Rear escutcheons touch the mounting plane. Mixer centre is 650 mm above model bottom.
 for(const x of syncIdentity.items("shower-arrow-model.js:generator-1",[["item-a",-.075],["item-b",.075]])){syncIdentity.produce("shower-arrow-model.js:generator-call-1",()=>cylinder(.02975,.013,x,.650,.0065,cream,'z'));syncIdentity.produce("shower-arrow-model.js:generator-call-2",()=>cylinder(.013,.055,x,.650,.038, silver,'z'));}
 syncIdentity.produce("shower-arrow-model.js:generator-call-3",()=>cylinder(.02975,.015,0,1.349,.0075,cream,'z'));syncIdentity.produce("shower-arrow-model.js:generator-call-4",()=>cylinder(.010,.045,0,1.349,.038,cream,'z'));
 const upper=new THREE.Group();upper.name='shower-upper';g.add(upper);
 syncIdentity.produce("shower-arrow-model.js:generator-call-5",()=>pipe([[0,1.15,.065],[0,1.67,.065],[0,1.721,.065],[0,1.738,.086],[0,1.738,.12],[0,1.738,.369],[0,1.723,.4],[0,1.674,.4]],.011,cream,upper));
 syncIdentity.produce("shower-arrow-model.js:generator-call-6",()=>cylinder(.0125,.67,0,.989,.065));
 syncIdentity.produce("shower-arrow-model.js:generator-call-7",()=>cylinder(.0145,.020,0,1.324,.065));syncIdentity.produce("shower-arrow-model.js:generator-call-8",()=>cylinder(.015,.013,0,1.337,.065,silver));
 syncIdentity.produce("shower-arrow-model.js:generator-call-9",()=>cylinder(.018,.033,0,1.663,.4,cream,'y',upper));
 syncIdentity.produce("shower-arrow-model:site-6",()=>box(.320,.022,.230,0,1.635,.400,.018,cream,upper));syncIdentity.produce("shower-arrow-model:site-7",()=>box(.306,.004,.216,0,1.622,.400,.018,face,upper));
 // Instanced jets keep the dense spray pattern inexpensive in the full floor plan.
 function jets(points,r,axis,parent=g){const geo=new THREE.CylinderGeometry(r,r,.002,8),inst=syncIdentity.produce("shower-arrow-model:site-8",()=>new THREE.InstancedMesh(geo,hole,points.length)),dummy=new THREE.Object3D();const rows=points.map((p,i)=>{dummy.position.set(...p);dummy.rotation.set(axis==='z'?Math.PI/2:0,0,0);dummy.updateMatrix();return ['jet-'+i,{id:'jet-'+i,matrix:dummy.matrix.clone()}];});syncIdentity.instances(inst,'shower:jet-pattern',rows);parent.add(inst);}
 const top=[];for(let x=-.139;x<=.140;x+=.014)for(let z=.31;z<=.493;z+=.014)if(!(Math.abs(x)>.128&&(z<.321||z>.481)))top.push([x,1.619,z]);syncIdentity.produce("shower-arrow-model.js:generator-call-10",()=>jets(top,.0015,'y',upper));
 // Four piano keys on a shallow shelf/mixing valve.
 const mixer=syncIdentity.produce("shower-arrow-model:site-9",()=>box(.400,.058,.124,0,.650,.075,.015));mixer.name='shower-mixer';syncIdentity.produce("shower-arrow-model:site-10",()=>box(.392,.008,.127,0,.681,.073,.010,face));
 for(let i of syncIdentity.range("shower-arrow-model.js:generator-2",0,4,1,false))syncIdentity.produce("shower-arrow-model:site-11",()=>box(.062,.011,.088,-.135+i*.067,.686,.083,.004,face));
 syncIdentity.produce("shower-arrow-model:site-12",()=>box(.038,.004,.004,.128,.660,.140,.001,hole));
 syncIdentity.produce("shower-arrow-model.js:generator-call-11",()=>cylinder(.019,.05,0,.611,.080));syncIdentity.produce("shower-arrow-model.js:generator-call-12",()=>cylinder(.016,.044,-.146,.606,.085));syncIdentity.produce("shower-arrow-model.js:generator-call-13",()=>cylinder(.016,.044,-.207,.606,.085));
 // Slider bracket and angled rounded-square hand shower.
 syncIdentity.produce("shower-arrow-model:site-13",()=>box(.116,.032,.039,.024,1.105,.089,.009));syncIdentity.produce("shower-arrow-model.js:generator-call-14",()=>cylinder(.019,.030,-.027,1.105,.110,cream,'z'));
 const hand=new THREE.Group();hand.name='shower-hand';hand.position.set(.066,1.115,.116);hand.rotation.x=-.20;g.add(hand);
 syncIdentity.produce("shower-arrow-model.js:generator-call-15",()=>cylinder(.018,.038,.066,1.113,.104,cream,'z'));
 syncIdentity.produce("shower-arrow-model:site-14",()=>box(.024,.153,.027,0,.080,0,.010,cream,hand));syncIdentity.produce("shower-arrow-model:site-15",()=>box(.045,.040,.028,0,.165,0,.016,cream,hand));
 syncIdentity.produce("shower-arrow-model:site-16",()=>plate(.132,.137,.023,.034,0,.246,0,cream,hand));syncIdentity.produce("shower-arrow-model:site-17",()=>plate(.120,.124,.002,.032,0,.246,.014,face,hand));
 const small=[];for(let x=-.050;x<=.051;x+=.012)for(let y=.193;y<=.300;y+=.012)if((Math.abs(x)/.059)**4+(Math.abs(y-.246)/.060)**4<1&&Math.hypot(x,y-.246)>.012)small.push([x,y,.017]);syncIdentity.produce("shower-arrow-model.js:generator-call-16",()=>jets(small,.0016,'z',hand));syncIdentity.produce("shower-arrow-model.js:generator-call-17",()=>cylinder(.006,.004,0,.246,.019,silver,'z',hand));
 syncIdentity.produce("shower-arrow-model:site-18",()=>box(.022,.026,.005,0,.157,.016,.009,face,hand));
 // Left auxiliary spray gun with a slim handle and small perforated face.
 syncIdentity.produce("shower-arrow-model.js:generator-call-18",()=>cylinder(.013,.151,-.207,.763,.085));syncIdentity.produce("shower-arrow-model:site-19",()=>box(.024,.08,.018,-.207,.757,.070,.005));
 syncIdentity.produce("shower-arrow-model.js:generator-call-19",()=>cylinder(.018,.024,-.207,.845,.099,cream,'z'));syncIdentity.produce("shower-arrow-model.js:generator-call-20",()=>cylinder(.014,.003,-.207,.845,.112,face,'z'));
 const gun=[];for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)gun.push([-.207+x*.006,.845+y*.006,.115]);syncIdentity.produce("shower-arrow-model.js:generator-call-21",()=>jets(gun,.0011,'z'));
 syncIdentity.produce("shower-arrow-model:site-20",()=>box(.041,.020,.040,-.189,.686,.084,.006));
 // Two independent hanging PVC hoses, with both ends connected to the hardware.
 syncIdentity.produce("shower-arrow-model.js:generator-call-22",()=>pipe([[.066,1.113,.117],[.073,.99,.119],[.124,.81,.12],[.194,.62,.13],[.198,.38,.13],[.10,.30,.13],[-.075,.36,.11],[-.106,.49,.10],[-.146,.583,.085]],.006));
 syncIdentity.produce("shower-arrow-model.js:generator-call-23",()=>pipe([[-.207,.680,.085],[-.209,.52,.09],[-.213,.19,.09],[-.209,.049,.09],[-.18,.006,.09],[-.135,.07,.09],[-.145,.30,.09],[-.19,.49,.09],[-.207,.584,.085]],.006));
 // Fit the complete hardware and hanging hoses to the editable layout envelope.
 const b=new THREE.Box3().setFromObject(g),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());
 const body=new THREE.Group();body.add(g);g.position.set(-center.x,-b.min.y,-center.z);body.scale.set((f.w??spec[0])/1000/size.x,(f.h??spec[2])/1000/size.y,(f.d??spec[1])/1000/size.z);
 // Calibrate once at the nominal pose, then move only the telescopic assembly.
 upper.position.y=(products.value({...f,type},'showerRise')-products.types[type].defaults.showerRise)/1000*size.y/(spec[2]/1000);
 hand.rotation.x=-products.value({...f,type},'showerHandAngle')*Math.PI/180;
 const result=new THREE.Group();result.add(body);body.position.y=(f.mountHeight??mountHeight)/1000;
 result.userData.mixerOffset=(.650-b.min.y)*body.scale.y*1000;
 if(f.showerMixerHeight!==undefined||f.mountHeight===undefined)body.position.y=(f.showerMixerHeight??products.types[type].defaults.showerMixerHeight)/1000-result.userData.mixerOffset/1000;
 return result;
}
const api={type,spec,mountHeight,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishArrowShowerModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
