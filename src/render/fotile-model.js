/* FOTILE production models. Nominal geometry in metres; input records in mm. */
(function(root){
'use strict';
const supported=f=>['stove_fotile_th36b','rangehood_fotile_jcd10ta'].includes(f.type);
function build(THREE,f){
 const P=root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null),g=new THREE.Group();
 const material=(color,metalness=0,roughness=.45)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
 const glass=material('#101214',.28,.13),iron=material('#252729',.5,.55),steel=material('#aeb2b5',.8,.27),black=material('#17191b',.25,.4),gold=material('#ba8839',.55,.35);
 function add(geometry,mat,x,y,z,part){const o=new THREE.Mesh(geometry,mat);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;o.userData.fotilePart=part;g.add(o);return o;}
 const box=(w,h,d,mat,x,y,z,part)=>add(new THREE.BoxGeometry(w,h,d),mat,x,y+h/2,z,part);
 const cylinder=(r,h,mat,x,y,z,part)=>add(new THREE.CylinderGeometry(r,r,h,48),mat,x,y+h/2,z,part);
 if(f.type==='stove_fotile_th36b'){
  // Panel datum 0; body extends down 80 mm and supports reach +58 mm.
  box(.650,.080,.340,steel,0,-.080,0,'embedded-body');
  box(.750,.008,.440,glass,0,0,0,'glass-panel');
  for(const x of [-.199,.199]){
   box(.228,.012,.256,black,x,.009,-.032,'burner-tray');
   cylinder(.078,.012,steel,x,.021,-.032,'burner-ring');
   cylinder(.064,.019,iron,x,.022,-.032,'burner-head');
   cylinder(.037,.009,black,x,.037,-.032,'burner-cap');
   // Four-sided square pan support with inward spokes, as in the supplied photo.
   for(const side of [-1,1]){
    box(.212,.025,.010,iron,x,.033,-.032+side*.110,'pan-support');
    box(.010,.025,.220,iron,x+side*.101,.033,-.032,'pan-support');
    box(.055,.014,.010,iron,x+side*.065,.044,-.032,'support-spoke');
    box(.010,.014,.055,iron,x,.044,-.032+side*.076,'support-spoke');
   }
   // Small ceramic ignition pin, approximate position.
   cylinder(.003,.015,material('#e7e4dc'),x+.073,.026,-.006,'igniter');
  }
  for(const x of [-.0465,.0465]){
   cylinder(.023,.008,black,x,.008,.136,'knob-base');
   cylinder(.018,.026,steel,x,.016,.136,'knob');
   box(.002,.001,.012,black,x,.042,.133,'knob-mark');
  }
  box(.047,.0006,.006,gold,0,.0084,.105,'brand-mark');
  g.scale.set(f.w/750,P.height(f)/138,f.d/440);
  // Translate the local datum without scaling the recorded installation height.
  g.position.y=P.value(f,'counterElevation')/1000;
 }else if(f.type==='rangehood_fotile_jcd10ta'){
  // Wedge housing: back -Z; closed upper glass follows the sloping front.
  const profile=new THREE.Shape();profile.moveTo(-.175,0);profile.lineTo(-.095,0);profile.lineTo(.175,.345);profile.lineTo(-.175,.345);profile.closePath();
  const geometry=new THREE.ExtrudeGeometry(profile,{depth:.018,bevelEnabled:false});
  // Extrusion X, profile X -> Z, profile Y -> Y.
  geometry.rotateY(-Math.PI/2);
  add(geometry,black,-.432,0,0,'left-side');add(geometry.clone(),black,.450,0,0,'right-side');
  box(.864,.345,.024,black,0,0,-.163,'rear-housing');
  box(.900,.018,.350,black,0,.327,0,'housing-top');
  const angle=Math.atan2(.270,.345),length=Math.hypot(.270,.345);
  const filter=box(.850,length-.040,.006,iron,0,0,0,'intake-filter');filter.position.set(0,.1725,.033);filter.rotation.x=angle;
  const lower=box(.884,length*.27-.014,.006,glass,0,0,0,'fixed-lower-glass');lower.position.set(0,.049,.270*.049/.345-.092);lower.rotation.x=angle;
  const pivot=new THREE.Group();pivot.position.set(0,.345,.171);pivot.rotation.x=P.value(f,'hoodPanelOpen')?-.18:angle;g.add(pivot);pivot.userData.fotilePart='panel-hinge';
  const panelLength=length*.71;
  function onPanel(o,x,y,z){g.remove(o);pivot.add(o);o.position.set(x,y,z);return o;}
  onPanel(box(.884,panelLength,.006,glass,0,0,0,'sloped-glass'),0,-panelLength/2-.008,.003);
  for(let i=0;i<9;i++){const rib=box(.790,.003,.006,black,0,0,0,'filter-slat'),y=.092+i*.024;rib.position.set(0,y,.270*y/.345-.110);rib.rotation.x=angle;}
  box(.900,.024,.100,iron,0,0,-.125,'oil-trough');
  box(.480,.175,.310,steel,0,.345,-.020,'chimney-cover');
  // Filter intake and diagonal seams stay within the exterior envelope.
  box(.800,.006,.020,iron,0,.026,-.078,'intake-slot');
  for(const x of [-.401,.401])box(.055,.003,.018,material('#f1e9d7',.1,.2),x,.040,-.061,'lamp');
  onPanel(add(new THREE.TorusGeometry(.010,.001,8,40),gold,0,0,0,'control-ring'),0,-.200,.007);
  for(const x of [-.064,-.040,.040,.064])onPanel(box(.004,.006,.001,gold,0,0,0,'control-mark'),x,-.200,.007);
  onPanel(box(.035,.006,.001,gold,0,0,0,'brand-mark'),-.385,-.058,.007);
  g.scale.set(f.w/900,P.height(f)/520,f.d/350);g.position.y=P.value(f,'mountHeight')/1000;
 }else throw Error('Unsupported FOTILE model');
 // Installation translation lives on a wrapper so app transforms can set X/Z safely.
 const result=new THREE.Group();result.add(g);result.userData.fotile=true;return result;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishFotileModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
