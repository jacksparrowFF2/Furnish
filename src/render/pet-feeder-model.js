/* Mijia Smart Pet Feeder 2: supplied envelope 220 × 324 × 370 mm.
 * +Z faces the bowl. Internal sizes and surface details are visual estimates. */
(function(root){
'use strict';
const supported=f=>f.type==='pet_feeder_mijia_2'&&!f.obj;
function build(T,f,RoundedBoxGeometry){
 const result=new T.Group(),body=new T.Group();result.add(body);
 const shell=new T.MeshStandardMaterial({color:f.color||'#efeee8',roughness:.3});
 const seam=new T.MeshStandardMaterial({color:'#c7c6be',roughness:.5});
 const dark=new T.MeshStandardMaterial({color:'#373531',roughness:.6});
 const screen=new T.MeshStandardMaterial({color:'#080b0c',roughness:.19});
 const windowMat=new T.MeshStandardMaterial({color:'#70645c',roughness:.28});
 const steel=new T.MeshStandardMaterial({color:'#b6b9b7',metalness:.78,roughness:.3});
 const light=new T.MeshStandardMaterial({color:'#d5e1d8',emissive:'#859d8a',emissiveIntensity:.25});
 function mesh(g,m,part){const o=new T.Mesh(g,m);o.castShadow=o.receiveShadow=true;o.userData.petFeederPart=part;body.add(o);return o;}
 function outline(w,d,r){const s=new T.Shape();s.moveTo(-w/2+r,-d/2);s.lineTo(w/2-r,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);s.lineTo(w/2,d/2-r);s.quadraticCurveTo(w/2,d/2,w/2-r,d/2);s.lineTo(-w/2+r,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);s.lineTo(-w/2,-d/2+r);s.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);s.closePath();return s;}
 function horizontal(s,h,top,z,m,part){const o=mesh(new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:16}),m,part);o.rotation.x=Math.PI/2;o.position.set(0,top,z);return o;}
 function slab(w,d,r,h,top,z,m,part){return horizontal(outline(w,d,r),h,top,z,m,part);}
 function ring(w,d,r,t,h,top,z,m,part){const s=outline(w,d,r);s.holes.push(new T.Path(outline(w-2*t,d-2*t,r-t).getPoints(64)));return horizontal(s,h,top,z,m,part);}
 function face(w,h,r,x,y,z,m,part){const o=mesh(new T.ExtrudeGeometry(outline(w,h,r),{depth:.6,bevelEnabled:false,curveSegments:16}),m,part);o.position.set(x,y,z);return o;}
 function disc(r,x,y,z,m,part){const o=mesh(new T.CircleGeometry(r,48),m,part);o.position.set(x,y,z);o.castShadow=false;return o;}
 // Rounded plan extrusion keeps the supplied width/depth exact, including lid.
 slab(220,220,37,22,22,-52,shell,'body-base');
 slab(218,218,36,1,23,-52,seam,'base-seam');
 slab(220,220,37,189,212,-52,shell,'lower-body');
 slab(219,219,36.5,1,213,-52,seam,'hopper-seam');
 slab(220,220,37,151,364,-52,shell,'hopper');
 slab(219,219,36.5,1,365,-52,seam,'lid-seam');
 slab(220,220,37,5,370,-52,shell,'lid');
 // Recess-like dark outlet behind the open bowl, not a black cavity in the lid.
 face(184,65,18,0,77,58.1,dark,'outlet');
 face(10,88,5,0,285,58.1,seam,'level-rim');
 face(7,84,3.5,0,285,58.8,windowMat,'level-window');
 disc(19,0,175,58.2,seam,'display-rim');disc(18,0,175,58.4,screen,'display');
 // Small geometric seven-segment digits avoid a font or remote texture dependency.
 for(const x of [-9,0,9])for(const [dx,dy,w,h] of [[0,5,5,1],[0,0,5,1],[0,-5,5,1],[-3,2.5,1,4],[3,2.5,1,4],[-3,-2.5,1,4],[3,-2.5,1,4]])face(w,h,.3,x+dx,175+dy,59.1,light,'display-segment');
 disc(7.7,0,134,58.2,seam,'button-rim');disc(6.7,0,134,58.5,shell,'button');
 slab(198,190,25,18,18,67,shell,'bowl-base');
 slab(196,188,24,1.5,19.5,67,seam,'bowl-base-seam');
 // Physical open basin: floor plus hollow outer shell and stainless liner.
 slab(198,180,24,7,27,72,shell,'bowl-floor');
 ring(198,180,24,5,45,72,72,shell,'bowl-shell');
 slab(187,169,18.5,2,30,72,steel,'bowl-inner-floor');
 ring(188,170,19,1.5,42,72,72,steel,'bowl-liner');
 ring(198,180,24,5,1.5,73.5,72,steel,'bowl-lip');
 // Top release button; side release seam, without inventing a moving lid.
 const release=ring(34,24,7,1,0.5,370,-80,seam,'lid-button-rim');release.position.x=-44;
 const sideButton=face(34,18,6,0,0,0,seam,'side-release-rim');sideButton.rotation.y=Math.PI/2;sideButton.position.set(109.2,235,-45);
 const sideCenter=face(32,16,5,0,0,0,shell,'side-release');sideCenter.rotation.y=Math.PI/2;sideCenter.position.set(109.3,235,-45);
 const products=root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null);
 body.scale.set(f.w/220/1000,products.height(f)/370/1000,f.d/324/1000);
 result.userData.petFeeder=true;return result;
}
const api={supported,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishPetFeederModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
