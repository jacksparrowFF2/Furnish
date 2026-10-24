/* ARROW side-drain sink. mm in; metres out. Front +Z, faucet at rear right. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncIdentity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);

const supported=f=>(root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null)).family(f,'arrow-sink');
function build(T,f){
 const P=root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null),K=root.FurnishKitchen||(typeof require==='function'?require('../core/kitchen-core.js'):null),g=new T.Group(),w=f.w/1000,d=f.d/1000,h=P.height(f)/1000,sy=h/.24,top=P.value(f,'counterElevation')/1000;
 const steel=new T.MeshStandardMaterial({color:f.color||'#797d7e',metalness:.58,roughness:.34,side:T.DoubleSide}),dark=new T.MeshStandardMaterial({color:'#31373a',roughness:.8}),chrome=new T.MeshStandardMaterial({color:'#aeb4b6',metalness:.8,roughness:.25});
 const add=(geo,material,name)=>{const o=syncIdentity.produce("sink-model:site-1",()=>new T.Mesh(geo,material));o.userData.sinkPart=name;o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
 const plate=(pw,pd,y,x,z,material,name)=>{const o=syncIdentity.produce("sink-model:site-2",()=>add(new T.BoxGeometry(pw,.0008*sy,pd),material,name));o.position.set(x,y-.0004*sy,z);return o;};
 const round=(pw,pd,r)=>{const p=new T.Shape();p.moveTo(-pw/2+r,-pd/2);p.lineTo(pw/2-r,-pd/2);p.quadraticCurveTo(pw/2,-pd/2,pw/2,-pd/2+r);p.lineTo(pw/2,pd/2-r);p.quadraticCurveTo(pw/2,pd/2,pw/2-r,pd/2);p.lineTo(-pw/2+r,pd/2);p.quadraticCurveTo(-pw/2,pd/2,-pw/2,pd/2-r);p.lineTo(-pw/2,-pd/2+r);p.quadraticCurveTo(-pw/2,-pd/2,-pw/2+r,-pd/2);return p;};
 const iw=w-.04,id=d*411/450,lip=P.definition(f).sink.rimThickness/1000,deckX=iw*.19,deckZ=-id*.28;
 // The right rear island is continuous with the rim. Its size is an appearance estimate.
 const corners=[[-iw/2,-id/2],[deckX,-id/2],[deckX,deckZ],[iw/2,deckZ],[iw/2,id/2],[-iw/2,id/2]],rounded=new T.Shape();
 for(let i=0;i<corners.length;i++){const a=corners[(i+corners.length-1)%corners.length],b=corners[i],c=corners[(i+1)%corners.length],ab=Math.hypot(a[0]-b[0],a[1]-b[1]),bc=Math.hypot(c[0]-b[0],c[1]-b[1]),r=Math.min(.015,ab*.15,bc*.15),start=[b[0]+(a[0]-b[0])*r/ab,b[1]+(a[1]-b[1])*r/ab],end=[b[0]+(c[0]-b[0])*r/bc,b[1]+(c[1]-b[1])*r/bc];if(i)rounded.lineTo(...start);else rounded.moveTo(...start);rounded.quadraticCurveTo(...b,...end);}rounded.closePath();const pts=rounded.getPoints(6).map(p=>[p.x,p.y]);pts.pop();
 const rim=round(w,d,Math.min(.012,w*.025,d*.025)),aperture=new T.Path();pts.forEach(([x,z],i)=>i?aperture.lineTo(x,z):aperture.moveTo(x,z));aperture.closePath();rim.holes.push(aperture);
 const rimGeo=new T.ExtrudeGeometry(rim,{depth:lip,bevelEnabled:false,curveSegments:8});rimGeo.rotateX(Math.PI/2);syncIdentity.produce("sink-model:site-3",()=>add(rimGeo,steel,'rim'));
 const floor=-.2*sy,verts=[];
 for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],aa=[a[0]*.95,a[1]*.91],bb=[b[0]*.95,b[1]*.91];verts.push(a[0],-lip,a[1],b[0],-lip,b[1],bb[0],floor,bb[1],a[0],-lip,a[1],bb[0],floor,bb[1],aa[0],floor,aa[1]);}
 const wall=new T.BufferGeometry();wall.setAttribute('position',new T.Float32BufferAttribute(verts,3));wall.computeVertexNormals();syncIdentity.produce("sink-model:site-4",()=>add(wall,steel,'bowl-walls'));
 const bottom=new T.Shape();pts.forEach(([x,z],i)=>i?bottom.lineTo(x*.95,-z*.91):bottom.moveTo(x*.95,-z*.91));bottom.closePath();const floorGeo=new T.ShapeGeometry(bottom);floorGeo.rotateX(-Math.PI/2);const base=syncIdentity.produce("sink-model:site-5",()=>add(floorGeo,steel,'bowl-floor'));base.position.y=floor;
 // Shallower right-hand area: 173 mm versus 200 mm on the left (reference drawing).
 syncIdentity.produce("sink-model:site-6",()=>plate(iw*.30,id*.58,-.173*sy,iw*.32,id*.16,steel,'right-step'));
 const step=syncIdentity.produce("sink-model:site-7",()=>add(new T.BoxGeometry(.0008*sy,.027*sy,id*.58),steel,'step-wall'));step.position.set(iw*.17,-.1865*sy,id*.16);
 const dx=-iw*.27,dz=id*.12,drain=round(iw*.29,id*.34,.014);const drainGeo=new T.ShapeGeometry(drain);drainGeo.rotateX(-Math.PI/2);const dr=syncIdentity.produce("sink-model:site-8",()=>add(drainGeo,dark,'drain-tray'));dr.position.set(dx,floor+.002,dz);
 const tube=(x,y,z,r,height,material,name)=>{const o=syncIdentity.produce("sink-model:site-9",()=>add(new T.CylinderGeometry(r,r,height,24),material,name));o.position.set(x,y+height/2,z);return o;};
 for(let i of syncIdentity.range("sink-model.js:generator-1",0,15,1,false))for(let j of syncIdentity.range("sink-model.js:generator-2",0,8,1,false))syncIdentity.produce("sink-model:site-10",()=>tube(dx+iw*.25*(i/14-.5),floor+.0025,dz+id*.28*(j/7-.5),Math.min(w,d)*.002,.001,chrome,'drain-perforation'));
 syncIdentity.produce("sink-model:site-11",()=>tube(dx,-h,dz,Math.min(.025,w*.04),h-.2*sy,chrome,'drain-outlet'));
 // Photo-based faucet: upright riser, smooth semicircular neck, flared pull-out
 // sprayer and a connected side cartridge with a flat paddle (no wire lever).
 const fx=iw*.33,fz=-id*.39,s=Math.min(d/.45,iw/.64),faucet=new T.Group();faucet.position.set(fx,0,fz);faucet.scale.setScalar(s);faucet.userData.sinkPart='faucet';g.add(faucet);
 const faucetMetal=new T.MeshStandardMaterial({color:'#858887',metalness:.65,roughness:.28}),seam=new T.MeshStandardMaterial({color:'#222829',metalness:.25,roughness:.5});
 const fa=(geo,material,name)=>{const o=syncIdentity.produce("sink-model:site-12",()=>add(geo,material,name));faucet.add(o);return o;};
 const turn=(profile,material,name)=>syncIdentity.produce("sink-model.js:generator-call-1",()=>fa(new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),64),material,name));
 syncIdentity.produce("sink-model.js:generator-call-2",()=>turn([[0,0],[.024,0],[.025,.0015],[.025,.0055],[.024,.007],[.021,.007],[.0205,.009],[.0205,.094],[.020,.099],[.019,.101],[0,.101]],faucetMetal,'faucet-base'));
 syncIdentity.produce("sink-model.js:generator-call-3",()=>turn([[.012,.099],[.014,.099],[.014,.101],[.012,.102]],seam,'faucet-neck-seam'));
 class NeckArc extends T.Curve{getPoint(t,target=new T.Vector3()){const a=Math.PI*t;return target.set(0,.26+.084*Math.sin(a),.084-.084*Math.cos(a));}}
 const path=new T.CurvePath();path.add(new T.LineCurve3(new T.Vector3(0,.10,0),new T.Vector3(0,.26,0)));path.add(new NeckArc());path.add(new T.LineCurve3(new T.Vector3(0,.26,.168),new T.Vector3(0,.25,.168)));
 syncIdentity.produce("sink-model.js:generator-call-4",()=>fa(new T.TubeGeometry(path,112,.012,24,false),faucetMetal,'faucet-arch'));
 // The sprayer is tilted 10 degrees toward the basin. All controls follow its axis.
 const head=new T.Group(),axis=new T.Vector3(0,Math.cos(Math.PI/18),-Math.sin(Math.PI/18)),headTop=new T.Vector3(0,.253,.168),length=.09;head.position.copy(headTop).addScaledVector(axis,-length);head.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),axis);head.userData.sinkPart='sprayer';faucet.add(head);
 const ha=(geo,material,name)=>{const o=syncIdentity.produce("sink-model.js:generator-call-5",()=>fa(geo,material,name));head.add(o);return o;};
 syncIdentity.produce("sink-model.js:generator-call-6",()=>ha(new T.LatheGeometry([[0,0],[.0185,0],[.0195,.002],[.0195,.008],[.0188,.025],[.017,.05],[.0142,.078],[.0128,.089],[.0128,.091],[0,.091]].map(([r,y])=>new T.Vector2(r,y)),64),faucetMetal,'spray-head'));
 const headSeam=syncIdentity.produce("sink-model.js:generator-call-7",()=>ha(new T.TorusGeometry(.0132,.00065,8,48),seam,'spray-head-seam'));headSeam.rotation.x=Math.PI/2;headSeam.position.y=.088;
 const outlet=syncIdentity.produce("sink-model.js:generator-call-8",()=>ha(new T.CylinderGeometry(.0158,.0158,.0016,48),seam,'spray-outlet'));outlet.position.y=-.0002;
 const aerator=syncIdentity.produce("sink-model.js:generator-call-9",()=>ha(new T.CylinderGeometry(.0115,.0115,.001,40),chrome,'spray-aerator'));aerator.position.y=-.0012;
 const button=syncIdentity.produce("sink-model.js:generator-call-10",()=>ha(new T.CylinderGeometry(.0043,.0043,.0025,24),seam,'spray-button'));button.rotation.x=Math.PI/2;button.position.set(0,.068,.015);
 const rockerShape=new T.Shape();rockerShape.moveTo(-.004,.024);rockerShape.lineTo(.004,.024);rockerShape.quadraticCurveTo(.0055,.024,.0055,.027);rockerShape.lineTo(.0055,.047);rockerShape.quadraticCurveTo(.0055,.05,.003,.05);rockerShape.lineTo(-.003,.05);rockerShape.quadraticCurveTo(-.0055,.05,-.0055,.047);rockerShape.lineTo(-.0055,.027);rockerShape.quadraticCurveTo(-.0055,.024,-.004,.024);
 const rocker=syncIdentity.produce("sink-model.js:generator-call-11",()=>ha(new T.ExtrudeGeometry(rockerShape,{depth:.002,bevelEnabled:true,bevelSize:.0005,bevelThickness:.0005,bevelSegments:2,steps:1}),seam,'spray-rocker'));rocker.position.z=.0177;
 // Side cartridge rotates about local X. The paddle face is in the YZ plane.
 // One shared axle datum prevents a hand-drawn paddle silhouette drifting off
 // the circular cap. The paddle's lower outline is an exact concentric arc.
 const lever=new T.Group();lever.position.y=.046;lever.userData.sinkPart='faucet-lever-assembly';faucet.add(lever);
 const la=(geo,material,name)=>{const o=syncIdentity.produce("sink-model.js:generator-call-12",()=>fa(geo,material,name));lever.add(o);return o;};
 const pivot=syncIdentity.produce("sink-model.js:generator-call-13",()=>la(new T.CylinderGeometry(.0175,.018,.027,48),faucetMetal,'faucet-lever-pivot'));pivot.rotation.z=-Math.PI/2;pivot.position.x=.027;
 const pivotSeam=syncIdentity.produce("sink-model.js:generator-call-14",()=>la(new T.TorusGeometry(.017,.0008,8,48),seam,'faucet-lever-seam'));pivotSeam.rotation.y=Math.PI/2;pivotSeam.position.x=.0405;
 const capRadius=.0164,cap=syncIdentity.produce("sink-model.js:generator-call-15",()=>la(new T.CylinderGeometry(capRadius,.0175,.006,64),faucetMetal,'faucet-lever-cap'));cap.rotation.z=-Math.PI/2;cap.position.x=.044;
 const paddleShape=new T.Shape(),start=115*Math.PI/180,end=65*Math.PI/180;
 paddleShape.absarc(0,0,capRadius,start,end,false);paddleShape.lineTo(-.011,.087);paddleShape.quadraticCurveTo(-.014,.099,-.022,.097);paddleShape.quadraticCurveTo(-.030,.096,-.026,.083);paddleShape.lineTo(capRadius*Math.cos(start),capRadius*Math.sin(start));paddleShape.closePath();
 const paddle=syncIdentity.produce("sink-model.js:generator-call-16",()=>la(new T.ExtrudeGeometry(paddleShape,{depth:.003,bevelEnabled:true,bevelSize:.0006,bevelThickness:.0006,bevelSegments:3,curveSegments:32,steps:1}),faucetMetal,'faucet-lever'));paddle.rotation.y=-Math.PI/2;paddle.position.x=.049;
 for(const [z,color]of syncIdentity.items("sink-model.js:generator-3",[["item-a",[-.007,'#477fa2']],["item-b",[.007,'#a75044']]])){const dot=syncIdentity.produce("sink-model.js:generator-call-17",()=>la(new T.SphereGeometry(.0012,10,8),new T.MeshStandardMaterial({color,roughness:.5}),'faucet-temperature-mark'));dot.position.set(.050,-.002,z);}
 syncIdentity.produce("sink-model:site-13",()=>tube(iw*.43,.001,-id*.39,.014*s,.002,chrome,'accessory-cap'));
 // Thin sound pads on the outside; no implied material performance.
 const pad=syncIdentity.produce("sink-model:site-14",()=>plate(iw*.65,id*.48,floor-.001,0,id*.2,dark,'sound-pad'));pad.position.y=floor-.001;
 g.position.y=top;g.userData.sinkInstallation=K.sinkMode(f);return g;
}
function buildNotched(T,f){
 const K=root.FurnishKitchen||(typeof require==='function'?require('../core/kitchen-core.js'):null),P=root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null);P.validate(f);
 const g=new T.Group(),material=new T.MeshStandardMaterial({color:f.color||'#e8e6df',roughness:.28,side:T.DoubleSide}),n=f.sinkNotch,r=P.definition(f).notch;
 const ring=(w,d)=>K.notchedRing(w,d,n),shape=points=>{const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x/1000,y/1000):s.moveTo(x/1000,y/1000));s.closePath();return s;};
 const outer=shape(syncIdentity.produce("sink-model:site-15",()=>ring(f.w,f.d))),inner=syncIdentity.produce("sink-model:site-16",()=>ring(f.w-2*r.rim,f.d-2*r.rim)),hole=new T.Path();inner.slice().reverse().forEach(([x,y],i)=>i?hole.lineTo(x/1000,y/1000):hole.moveTo(x/1000,y/1000));hole.closePath();outer.holes.push(hole);
 const add=(s,depth,top,name)=>{const geo=new T.ExtrudeGeometry(s,{depth,bevelEnabled:false});geo.rotateX(Math.PI/2);geo.translate(0,top,0);const mesh=syncIdentity.produce("sink-model:site-17",()=>new T.Mesh(geo,material));mesh.userData.sinkPart=name;g.add(mesh);};
 const depth=P.sinkBodyDepth(f);syncIdentity.produce("sink-model:site-18",()=>add(outer,depth/1000,.862,'notched-walls'));syncIdentity.produce("sink-model:site-19",()=>add(shape(inner),r.floor/1000,.862-(depth-r.floor)/1000,'notched-floor'));
 const chrome=new T.MeshStandardMaterial({color:'#abb2b8',metalness:.8,roughness:.22}),x=(n?.side==='left'?1:-1)*f.w*.32/1000,z=-f.d/2000+.035;
 const pipe=syncIdentity.produce("sink-model:site-20",()=>new T.Mesh(new T.CylinderGeometry(.012,.012,.28,16),chrome));pipe.position.set(x,1.002,z);g.add(pipe);
 const spout=syncIdentity.produce("sink-model:site-21",()=>new T.Mesh(new T.CylinderGeometry(.012,.012,.15,16),chrome));spout.rotation.x=Math.PI/2;spout.position.set(x,1.142,z+.075);g.add(spout);return g;
}
// Photo-based rectangular ceramic vessel. The underside rests on the top;
// only the drain penetrates it. Dimensions are editable layout assumptions.
function buildVessel(T,f){
 const P=root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null);P.validate(f);
 const r=P.definition(f).vessel,g=new T.Group(),w=f.w/1000,d=f.d/1000,h=P.value(f,'sinkBowlHeight')/1000,t=r.rim/1000,b=r.floor/1000;
 const ceramic=new T.MeshStandardMaterial({color:f.color||'#f6f5f1',roughness:.22,side:T.DoubleSide}),metal=new T.MeshStandardMaterial({color:'#f5f4ef',roughness:.24}),chrome=new T.MeshStandardMaterial({color:'#aab0b2',metalness:.75,roughness:.25});
 const rounded=(w,d,r)=>{const s=new T.Shape();s.moveTo(-w/2+r,-d/2);s.lineTo(w/2-r,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);s.lineTo(w/2,d/2-r);s.quadraticCurveTo(w/2,d/2,w/2-r,d/2);s.lineTo(-w/2+r,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);s.lineTo(-w/2,-d/2+r);s.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);return s;};
 const add=(shape,depth,top,name)=>{const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:12});geo.rotateX(Math.PI/2);geo.translate(0,.862+top,0);const o=syncIdentity.produce("sink-model:site-22",()=>new T.Mesh(geo,ceramic));o.userData.sinkPart=name;o.castShadow=true;o.receiveShadow=true;g.add(o);return o;};
 const radius=Math.min(.022,w*.08,d*.08),outer=syncIdentity.produce("sink-model:site-23",()=>rounded(w,d,radius)),inner=syncIdentity.produce("sink-model:site-24",()=>rounded(w-2*t,d-2*t,Math.max(.004,radius-t)));
 outer.holes.push(new T.Path(inner.getPoints(12)));syncIdentity.produce("sink-model:site-25",()=>add(outer,h,h,'vessel-walls'));
 const floor=syncIdentity.produce("sink-model:site-26",()=>rounded(w-2*t,d-2*t,Math.max(.004,radius-t))),hole=new T.Path();hole.absarc(0,0,r.drain/2000,0,Math.PI*2,true);floor.holes.push(hole);syncIdentity.produce("sink-model:site-27",()=>add(floor,b,b,'vessel-floor'));
 const cylinder=(radius,height,x,y,z,material,name)=>{const o=syncIdentity.produce("sink-model:site-28",()=>new T.Mesh(new T.CylinderGeometry(radius,radius,height,32),material));o.position.set(x,.862+y,z);o.userData.sinkPart=name;g.add(o);return o;};
 syncIdentity.produce("sink-model.js:generator-call-18",()=>cylinder(r.drain/2000-.002,.002,0,b-.001,0,chrome,'vessel-drain'));
 // The tall faucet sits on a small rear deck inside the product footprint.
 const fx=Math.min(w*.32,w/2-.055),fz=-d/2+t/2,rise=Math.max(r.faucetRise/1000,h+r.faucetClearance/1000);
 syncIdentity.produce("sink-model.js:generator-call-19",()=>cylinder(Math.min(.012,t*.45),rise,fx,rise/2,fz,metal,'vessel-faucet'));
 const spout=syncIdentity.produce("sink-model:site-29",()=>new T.Mesh(new T.BoxGeometry(.024,.022,Math.min(.12,d*.3)),metal));spout.position.set(fx,.862+rise-.025,fz+Math.min(.12,d*.3)/2);spout.userData.sinkPart='vessel-spout';g.add(spout);
 const lever=syncIdentity.produce("sink-model:site-30",()=>new T.Mesh(new T.BoxGeometry(.065,.009,.014),metal));lever.position.set(fx+.02,.862+rise,fz);g.add(lever);return g;
}
const api={supported,build,buildNotched,buildVessel};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishSinkModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
