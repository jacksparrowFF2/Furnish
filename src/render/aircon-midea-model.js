/* Midea KFR-51LW/N8KS1-1U indoor unit only. Supplied envelope: 395/436/1856 mm.
 * +Z is the outlet/front; all smaller details are visual estimates. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncPart=(object,source)=>{if(object?.userData){object.userData.furnishPartSource=source;object.userData.furnishPartOrdinal??=object.id;}return object;};

const supported=f=>f.type==='aircon_midea_ultra_2hp'&&!f.obj;
function build(T,f){
 const products=root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null);
 const result=new T.Group(),body=new T.Group();result.add(body);
 const material=(color,roughness=.3,metalness=0)=>new T.MeshStandardMaterial({color,roughness,metalness});
 const white=material(f.color||'#e5e7e8'),silver=material('#aeb5b9',.24,.65),dark=material('#11191e',.31),vanes=material('#303c42',.26,.35),seam=material('#747e83',.5);
 const light=new T.MeshStandardMaterial({color:'#d4eff2',emissive:'#b4e4ef',emissiveIntensity:.5});
 function mesh(geo,mat,part){const o=syncPart(new T.Mesh(geo,mat),"aircon-midea-model:site-1");o.userData.airconPart=part;o.castShadow=o.receiveShadow=true;body.add(o);return o;}
 function outline(w,d,r){const s=new T.Shape();s.moveTo(-w/2+r,-d/2);s.lineTo(w/2-r,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);s.lineTo(w/2,d/2-r);s.quadraticCurveTo(w/2,d/2,w/2-r,d/2);s.lineTo(-w/2+r,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);s.lineTo(-w/2,-d/2+r);s.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);s.closePath();return s;}
 function oval(w,d){const s=new T.Shape();products.planBodyOutline({...f,w,d},192).forEach(([x,z],i)=>s[i?'lineTo':'moveTo'](x,z));s.closePath();return s;}
 function slab(w,d,r,h,bottom,mat,part){const o=syncPart(mesh(new T.ExtrudeGeometry(syncPart(oval(w,d),"aircon-midea-model:site-3"),{depth:h,bevelEnabled:false,curveSegments:24}),mat,part),"aircon-midea-model:site-2");o.rotation.x=-Math.PI/2;o.position.y=bottom;return o;}
 function face(w,h,r,y,z,mat,part){const o=syncPart(mesh(new T.ExtrudeGeometry(outline(w,h,r),{depth:1,bevelEnabled:false,curveSegments:20}),mat,part),"aircon-midea-model:site-4");o.position.set(0,y,z);return o;}
 function box(w,h,d,x,y,z,mat,part){const o=syncPart(mesh(new T.BoxGeometry(w,h,d),mat,part),"aircon-midea-model:site-5");o.position.set(x,y,z);return o;}
 syncPart(slab(395,436,130,8,0,dark,'base-foot'),"aircon-midea-model:site-6");syncPart(slab(395,436,130,8,8,silver,'base-trim'),"aircon-midea-model:site-7");
 syncPart(slab(383,424,125,10,16,seam,'base-seam'),"aircon-midea-model:site-8");
 // Oval shell with a real opening. The roof rolls into a shallow sloping lid,
 // rather than adding a thick, flat cylindrical collar above the cabinet.
 const planShape=products.definition(f).planShape,exponent=planShape.exponent,a=planShape.bodyWidth/2,b=planShape.bodyDepth/2,thetaMax=Math.asin(Math.pow(103/a,1/exponent));
 const signed=(v,p)=>Math.abs(v)<1e-10?0:Math.sign(v)*Math.pow(Math.abs(v),p);
 const point=t=>[a*signed(Math.sin(t),exponent),b*signed(Math.cos(t),exponent)];
 const frontZ=x=>b*Math.pow(Math.max(0,1-Math.pow(Math.abs(x/a),2/exponent)),exponent/2);
 const roof=z=>1828-18*z/b;
 function surface(rows,mat,part){const pos=[],idx=[];for(const row of rows)for(const p of row)pos.push(...p);const cols=rows[0].length;for(let j=0;j<rows.length-1;j++)for(let i=0;i<cols-1;i++){const n=j*cols+i;idx.push(n,n+1,n+cols,n+1,n+cols+1,n+cols);}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();return syncPart(mesh(geo,mat,part),"aircon-midea-model:site-9");}
 const angles=Array.from({length:193},(_,i)=>-Math.PI+i*Math.PI/96);angles.push(-thetaMax,thetaMax);angles.sort((x,y)=>x-y);
 function edge(x){const dx=Math.max(0,Math.abs(x)-83),curve=20-Math.sqrt(Math.max(0,400-dx*dx));return [420+curve,1710-curve];}
 for(let i=0;i<angles.length-1;i++){
  const ts=[angles[i],angles[i+1]],cut=Math.abs((ts[0]+ts[1])/2)<thetaMax;
  const section=(bottom,top,part,band)=>Object.assign(syncPart(surface([ts.map(t=>{const [x,z]=point(t);return [x,bottom(x,z),z];}),ts.map(t=>{const [x,z]=point(t);return [x,top(x,z),z];})],white,part),"aircon-midea-model:site-10"),{userData:{airconPart:part,furnishStablePart:`shell/segment-${i}/${band}`,furnishPartFamily:"shell-segments"}});
  if(cut){section(()=>26,x=>edge(x)[0],'body','lower');section(x=>edge(x)[1],(x,z)=>roof(z),'body','upper');}
  else section(()=>26,(x,z)=>roof(z),'body','whole');
 }
 // Slender wraparound reveal, rolled edge and gently raised lid centre.
 const contours=(scale,dy)=>angles.map(t=>{const [x,z]=point(t);return [x*scale,roof(z)+dy,z*scale];});
 syncPart(surface([contours(1,0),contours(1,1.4)],dark,'lid-seam'),"aircon-midea-model:site-11");
 syncPart(surface([contours(1,1.4),contours(.998,4),contours(.984,8),contours(.954,10)],white,'lid-roll'),"aircon-midea-model:site-12");
 const lidCentre=[0,1856,-35],lid=contours(.954,10),positions=[];
 for(let i=0;i<lid.length-1;i++)positions.push(...lidCentre,...lid[i],...lid[i+1]);
 const lidGeo=new T.BufferGeometry();lidGeo.setAttribute('position',new T.Float32BufferAttribute(positions,3));lidGeo.computeVertexNormals();const lidMesh=syncPart(mesh(lidGeo,white,'lid'),"aircon-midea-model:site-13");
 // Fine transverse panel join visible in the supplied high-angle photo.
 const join=[];lidMesh.updateMatrixWorld(true);for(let i=0;i<=64;i++){const x=-178+i*356/64,hit=new T.Raycaster(new T.Vector3(x,2000,-30),new T.Vector3(0,-1,0)).intersectObject(lidMesh)[0];if(hit)join.push(new T.Vector3(x,hit.point.y+.35,-30));}
 const topJoin=new T.Line(new T.BufferGeometry().setFromPoints(join),new T.LineBasicMaterial({color:'#c4c8ca'}));topJoin.userData.airconPart='top-panel-seam';body.add(topJoin);
 function curvedFace(w,h,r,y,offset,mat,part,hole,xShift=0){const shape=outline(w,h,r);if(hole)shape.holes.push(new T.Path(outline(...hole).getPoints(64)));const geo=new T.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false,curveSegments:24});const p=geo.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,p.getZ(i)+frontZ(p.getX(i)+xShift)+offset);geo.computeVertexNormals();const o=syncPart(mesh(geo,mat,part),"aircon-midea-model:site-14");o.position.set(xShift,y,0);return o;}
 syncPart(curvedFace(214,1306,25,1065,1,silver,'outlet-rim',[206,1290,20]),"aircon-midea-model:site-15");
 syncPart(curvedFace(206,1290,20,1065,-22,dark,'outlet-back'),"aircon-midea-model:site-16");
 // Physical black reveals connect the cut shell to the inset back.
 const border=outline(206,1290,20).getPoints(128);
 syncPart(surface([-22,0].map(offset=>border.map(p=>[p.x,p.y+1065,frontZ(p.x)+offset])),dark,'outlet-reveal'),"aircon-midea-model:site-17");
 syncPart(curvedFace(190,150,17,1634,-9,vanes,'display'),"aircon-midea-model:site-18");
 syncPart(curvedFace(190,86,16,479,-8,vanes,'lower-outlet-cap'),"aircon-midea-model:site-19");
 for(let i=0;i<9;i++){
  const x=(i-4)*17;
  syncPart(box(4,1060,12,x,1060,frontZ(x)-10,vanes,'vertical-vane'),"aircon-midea-model:site-20");
  syncPart(box(.9,1060,1,x-1.2,1060,frontZ(x)-3.5,silver,'vane-highlight'),"aircon-midea-model:site-21");
 }
 for(const y of [650,1020,1390])syncPart(curvedFace(178,4,1,y,-16,vanes,'cross-brace'),"aircon-midea-model:site-22");
 for(let i=0;i<11;i++)syncPart(curvedFace(172,1,0.4,455+i*3.5,-6,seam,'lower-grille'),"aircon-midea-model:site-23");
 for(let i=0;i<7;i++){const o=syncPart(face(3,3,1,435,frontZ((i-3)*21)-4,silver,'touch-control'),"aircon-midea-model:site-24");o.position.x=(i-3)*21;}
 // Geometry digits avoid fonts, canvas textures and network dependencies.
 const segments=[[0,20,16,2],[0,0,16,2],[0,-20,16,2],[-9,10,2,16],[9,10,2,16],[-9,-10,2,16],[9,-10,2,16]];
 for(const [x,ids]of [[-16,[0,1,2,4,5]],[10,[0,1,2,3,5,6]]])for(const i of ids){const [dx,dy,w,h]=segments[i];syncPart(box(w,h,1,x+dx,1635+dy,frontZ(x+dx)-6,light,'display-segment'),"aircon-midea-model:site-25");}
 syncPart(face(4,4,2,1656,frontZ(32)-6,light,'degree-dot'),"aircon-midea-model:site-26").position.x=32;
 for(let i=0;i<5;i++)syncPart(box(2,2,1,(i-2)*15,1598,frontZ((i-2)*15)-6,silver,'display-icon'),"aircon-midea-model:site-27");
 // Small vector wordmark and quality label, following the curved front.
 const strokes=[["m",[[0,0],[2,12],[7,3],[12,12],[14,0]]],["i-stem",[[18,0],[20,9]]],["i-dot",[[20,12],[20.5,13]]],["d-stem",[[33,0],[35,13]]],["d-bowl",[[33,8],[29,10],[25,7],[25,2],[28,0],[32,2]]],["e",[[39,5],[47,6],[46,9],[42,10],[38,7],[38,2],[41,0],[46,1]]],["a",[[58,0],[59,9],[55,10],[51,7],[50,3],[52,0],[57,2]]]];
 for(const [stroke,line] of strokes){const pts=line.map(([x,y])=>new T.Vector3((x-30)*.8,1734+y*.8,frontZ((x-30)*.8)+1));syncPart(mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),Math.max(8,line.length*4),.65,5,false),silver,'brand-mark'),"aircon-midea-model:site-28").userData.furnishStablePart=`brand/stroke-${stroke}`;}
 syncPart(curvedFace(27,55,6,1671,1,material('#d8dbdb',.65),'quality-label',null,-135),"aircon-midea-model:site-29");
 for(let i=0;i<4;i++){const x=planShape.label.x,y=1683-i*9;syncPart(box(planShape.label.width-i*2,1.2,1,x,y,frontZ(x)+planShape.label.offset,seam,'quality-label-print'),"aircon-midea-model:site-30");}
 // Rear filter panel and horizontal intake ribs, within the supplied depth.
 syncPart(face(220,1530,14,982,-212.5,seam,'rear-filter'),"aircon-midea-model:site-31").rotation.y=Math.PI;
 for(let i=0;i<43;i++)syncPart(box(205,3,1,0,285+i*32,-213,vanes,'rear-intake'),"aircon-midea-model:site-32");
 body.scale.set(f.w/395/1000,products.height(f)/1856/1000,f.d/436/1000);
 result.userData.airconMidea=true;return result;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishAirconMideaModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
