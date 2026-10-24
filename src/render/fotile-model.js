/* FOTILE production models. Nominal geometry in metres; input records in mm. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncPart=(object,source)=>{if(object?.userData){object.userData.furnishPartSource=source;object.userData.furnishPartOrdinal??=object.id;}return object;};

const supported=f=>['stove_fotile_th36b','rangehood_fotile_jcd10ta'].includes(f.type);
function build(THREE,f){
 const P=root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null),g=new THREE.Group();let cover;
 const material=(color,metalness=0,roughness=.45)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
 const glass=material('#101214',.28,.13),iron=material('#252729',.5,.55),steel=material('#aeb2b5',.8,.27),black=material('#17191b',.25,.4),gold=material('#ba8839',.55,.35);
 function add(geometry,mat,x,y,z,part){const o=syncPart(new THREE.Mesh(geometry,mat),"fotile-model:site-1");o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;o.userData.fotilePart=part;g.add(o);return o;}
 const box=(w,h,d,mat,x,y,z,part)=>syncPart(add(new THREE.BoxGeometry(w,h,d),mat,x,y+h/2,z,part),"fotile-model:site-2");
 const cylinder=(r,h,mat,x,y,z,part)=>syncPart(add(new THREE.CylinderGeometry(r,r,h,48),mat,x,y+h/2,z,part),"fotile-model:site-3");
 if(f.type==='stove_fotile_th36b'){
  // Panel datum 0; body extends down 80 mm and supports reach +58 mm.
  syncPart(box(.650,.080,.340,steel,0,-.080,0,'embedded-body'),"fotile-model:site-4");
  syncPart(box(.750,.008,.440,glass,0,0,0,'glass-panel'),"fotile-model:site-5");
  for(const x of [-.199,.199]){
   syncPart(box(.228,.012,.256,black,x,.009,-.032,'burner-tray'),"fotile-model:site-6");
   cylinder(.078,.012,steel,x,.021,-.032,'burner-ring');
   cylinder(.064,.019,iron,x,.022,-.032,'burner-head');
   cylinder(.037,.009,black,x,.037,-.032,'burner-cap');
   // Four-sided square pan support with inward spokes, as in the supplied photo.
   for(const side of [-1,1]){
    syncPart(box(.212,.025,.010,iron,x,.033,-.032+side*.110,'pan-support'),"fotile-model:site-7");
    syncPart(box(.010,.025,.220,iron,x+side*.101,.033,-.032,'pan-support'),"fotile-model:site-8");
    syncPart(box(.055,.014,.010,iron,x+side*.065,.044,-.032,'support-spoke'),"fotile-model:site-9");
    syncPart(box(.010,.014,.055,iron,x,.044,-.032+side*.076,'support-spoke'),"fotile-model:site-10");
   }
   // Small ceramic ignition pin, approximate position.
   cylinder(.003,.015,material('#e7e4dc'),x+.073,.026,-.006,'igniter');
  }
  for(const x of [-.0465,.0465]){
   cylinder(.023,.008,black,x,.008,.136,'knob-base');
   cylinder(.018,.026,steel,x,.016,.136,'knob');
   syncPart(box(.002,.001,.012,black,x,.042,.133,'knob-mark'),"fotile-model:site-11");
  }
  syncPart(box(.047,.0006,.006,gold,0,.0084,.105,'brand-mark'),"fotile-model:site-12");
  g.scale.set(f.w/750,P.height(f)/138,f.d/440);
  // Translate the local datum without scaling the recorded installation height.
  g.position.y=P.value(f,'counterElevation')/1000;
 }else if(f.type==='rangehood_fotile_jcd10ta'){
  // Wedge housing: back -Z; closed upper glass follows the sloping front.
  const profile=new THREE.Shape();profile.moveTo(-.175,0);profile.lineTo(-.095,0);profile.lineTo(.175,.345);profile.lineTo(-.175,.345);profile.closePath();
  const geometry=new THREE.ExtrudeGeometry(profile,{depth:.018,bevelEnabled:false});
  // Extrusion X, profile X -> Z, profile Y -> Y.
  geometry.rotateY(-Math.PI/2);
  syncPart(add(geometry,black,-.432,0,0,'left-side'),"fotile-model:site-13");syncPart(add(geometry.clone(),black,.450,0,0,'right-side'),"fotile-model:site-14");
  syncPart(box(.864,.345,.024,black,0,0,-.163,'rear-housing'),"fotile-model:site-15");
  syncPart(box(.900,.018,.350,black,0,.327,0,'housing-top'),"fotile-model:site-16");
  const angle=Math.atan2(.270,.345),length=Math.hypot(.270,.345);
  const filter=syncPart(box(.850,length-.040,.006,iron,0,0,0,'intake-filter'),"fotile-model:site-17");filter.position.set(0,.1725,.033);filter.rotation.x=angle;
  const lower=syncPart(box(.884,length*.27-.014,.006,glass,0,0,0,'fixed-lower-glass'),"fotile-model:site-18");lower.position.set(0,.049,.270*.049/.345-.092);lower.rotation.x=angle;
  const pivot=new THREE.Group();pivot.position.set(0,.345,.171);pivot.rotation.x=P.value(f,'hoodPanelOpen')?-.18:angle;g.add(pivot);pivot.userData.fotilePart='panel-hinge';
  const panelLength=length*.71;
  function onPanel(o,x,y,z){g.remove(o);pivot.add(o);o.position.set(x,y,z);return o;}
  onPanel(syncPart(box(.884,panelLength,.006,glass,0,0,0,'sloped-glass'),"fotile-model:site-19"),0,-panelLength/2-.008,.003);
  for(let i=0;i<9;i++){const rib=syncPart(box(.790,.003,.006,black,0,0,0,'filter-slat'),"fotile-model:site-20"),y=.092+i*.024;rib.position.set(0,y,.270*y/.345-.110);rib.rotation.x=angle;}
  syncPart(box(.900,.024,.100,iron,0,0,-.125,'oil-trough'),"fotile-model:site-21");
  const spec=P.hoodInstallation(f);
  cover=syncPart(box(spec.coverWidth/1000,spec.coverHeight/1000,spec.coverDepth/1000,steel,0,(P.value(f,'mountHeight')+spec.bodyHeight)/1000,spec.coverOffset/1000,'chimney-cover'),"fotile-model:site-22");g.remove(cover);
  // Filter intake and diagonal seams stay within the exterior envelope.
  syncPart(box(.800,.006,.020,iron,0,.026,-.078,'intake-slot'),"fotile-model:site-23");
  for(const x of [-.401,.401])syncPart(box(.055,.003,.018,material('#f1e9d7',.1,.2),x,.040,-.061,'lamp'),"fotile-model:site-24");
  onPanel(syncPart(add(new THREE.TorusGeometry(.010,.001,8,40),gold,0,0,0,'control-ring'),"fotile-model:site-25"),0,-.200,.007);
  for(const x of [-.064,-.040,.040,.064])onPanel(syncPart(box(.004,.006,.001,gold,0,0,0,'control-mark'),"fotile-model:site-26"),x,-.200,.007);
  onPanel(syncPart(box(.035,.006,.001,gold,0,0,0,'brand-mark'),"fotile-model:site-27"),-.385,-.058,.007);
  g.scale.set(f.w/900,spec.bodyHeight/345,f.d/350);g.position.y=P.value(f,'mountHeight')/1000;
 }else throw Error('Unsupported FOTILE model');
 // Installation translation lives on a wrapper so app transforms can set X/Z safely.
 const result=new THREE.Group();result.add(g);if(cover)result.add(cover);result.userData.fotile=true;return result;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishFotileModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
