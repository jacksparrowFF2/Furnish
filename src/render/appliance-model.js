/* First shared model batch: fridges and flat heater. Input mm; production local geometry in m. */
(function(root){
'use strict';
const supported=f=>['fridge','fridge_french_drawer','waterheater_flat'].includes(f?.type);
function create(THREE,RoundedBoxGeometry,options={}){
 const products=options.products||root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null);
 const primitives=options.primitives||(root.FurnishModelPrimitives||(typeof require==='function'?require('./model-primitives.js'):null)).create(THREE,RoundedBoxGeometry);
 const {mesh,box,rbox,cyl,metal,screenMat,glowMat,pull}=primitives;
 const M=v=>v/1000,mat=primitives.mat;
 function build(f){
  if(!supported(f))throw Error('Unsupported appliance model: '+f?.type);
  const g=new THREE.Group(),w=M(f.w),d=M(f.d),c=f.color||'#ddd';
  switch(f.type){
    case 'fridge': {
      const w = f.w > 850 ? .91 : .7, d = .7;
      const fm = mat(c, {metalness:.45, roughness:.28}), h = 1.8, fz = d/2 - .05;
      g.add(box(w - .02, .06, d - .06, '#2a2c2e', 0, 0, -.03), rbox(w, h - .06, d - .05, fm, 0, .06, -.025, .02), box(w - .01, h - .07, .003, '#2a2c2e', 0, .065, fz + .0015));
      if (w > .85){
        [-1, 1].forEach(s => { g.add(rbox(w/2 - .004, h - .08, .04, fm, s*w/4, .07, fz + .023, .012)); pull(g, .8, true, s*.035, 1.05, fz + .043); });
        g.add(box(.1, .14, .003, screenMat('#2a6f8f'), -w/4, 1.25, fz + .044));
      } else {
        g.add(rbox(w - .006, 1.06, .04, fm, 0, .72, fz + .023, .012), rbox(w - .006, .64, .04, fm, 0, .07, fz + .023, .012));
        pull(g, .5, true, -w/2 + .06, 1.05, fz + .043); pull(g, w*.5, false, 0, .64, fz + .043);
        g.add(box(.08, .1, .003, screenMat('#2a6f8f'), w*.22, 1.4, fz + .044));
      }
      break;
    }
    case 'fridge_french_drawer': {
      // Reference envelope 833 × 595 × 1910 mm; front is +Z.
      const w=.833,d=.595,h=1.91,fz=d/2,white=mat(c,{metalness:.12,roughness:.4}),dark=mat('#303234',{roughness:.55});
      g.add(box(w,h-.024,d-.036,white,0,.024,-.018));
      [-1,1].forEach(s=>[-1,1].forEach(t=>g.add(cyl(.012,.014,.024,dark,s*(w/2-.04),0,t*(d/2-.04),16))));
      // Recessed dark backing remains visible in the seams and handle channels.
      g.add(box(w-.006,h-.033,.012,dark,0,.025,fz-.03));
      const panel=(pw,ph,x,y)=>g.add(rbox(pw,ph,.032,white,x,y,fz-.016,.002));
      panel(w-.008,.400,0,.025);
      panel(w-.008,.306,0,.460);
      [-1,1].forEach(s=>panel(w/2-.006,1.102,s*w/4,.800));
      // Two horizontal recessed grips, no handles beyond the flush front.
      [.426,.767].forEach(y=>g.add(box(w-.012,.025,.010,dark,0,y,fz-.015),box(w-.012,.004,.013,metal(),0,y+.025,fz-.013)));
      g.add(box(.048,.208,.002,screenMat('#292e30'),.080,1.425,fz-.0005));
      [.034,.076,.118].forEach((offset,i)=>g.add(box(.018,.006,.001,glowMat(i===1?'#e8a55d':'#c2d4d4'),.080,1.44+offset,fz+.001)));
      g.add(box(.029,.003,.001,metal(),w*.39,1.846,fz+.001));
      break;
    }
    case 'waterheater_flat': {
      // Reference envelope includes the lower cover and short water outlets.
      // Legacy items without mountHeight keep their original 1650 mm placement.
      const h=M(products.height(f)), base=M(products.value(f,'mountHeight')), bottom=h*.062, bodyH=h-bottom;
      const capW=w*.012, white=mat(c,{roughness:.28}), gray=mat('#aeb0b2',{roughness:.42});
      const profile=(width,height)=>{
        const s=new THREE.Shape(),r=Math.min(width/2,height/2),lo=r,hi=height-r;
        s.moveTo(-width/2,lo);s.lineTo(-width/2,hi);
        s.absellipse(0,hi,width/2,r,Math.PI,0,true);s.lineTo(width/2,lo);
        s.absellipse(0,lo,width/2,r,0,-Math.PI,true);s.closePath();return s;
      };
      const section=(width,height,length,x,y,m)=>{
        const geo=new THREE.ExtrudeGeometry(profile(width,height),{depth:length,bevelEnabled:false,curveSegments:32});
        geo.rotateY(Math.PI/2);const o=mesh(geo,m);o.position.set(x,y,0);return o;
      };
      g.add(section(d,bodyH,w-2*capW,-w/2+capW,base+bottom,white));
      [-1,1].forEach(s=>{
        g.add(section(d,bodyH,capW*.76,s<0?-w/2+capW*.24:w/2-capW,base+bottom,white));
        g.add(section(d*.955,bodyH-h*.02,capW*.24,s<0?-w/2:w/2-capW*.24,base+bottom+h*.01,gray));
      });
      g.add(rbox(w*.33,h*.048,d*.38,gray,0,base+h*.018,0,h*.012));
      // 100 mm between water outlets; hot left / cold right facing the front.
      [[-.05,'#c0463a'],[.05,'#3b7bbf']].forEach(([x,cc])=>{
        const port=cyl(.01,.01,h*.024,mat(cc,{metalness:.35,roughness:.4}),x*w/.7,base,0,16);
        port.userData.waterOutlet=cc==='#c0463a'?'hot':'cold';g.add(port);
      });
      const panelZ=d*.35,panelY=base+h*.075;
      g.add(rbox(w*.86,h*.115,d*.11,mat('#17191c',{roughness:.18}),0,panelY,panelZ,h*.018));
      const faceZ=panelZ+d*.055+.0004;
      // Small geometric display stays crisp offline without an image texture.
      [-.23,-.15,-.07].forEach((x,i)=>g.add(box(w*.052,h*.035,.0006,glowMat(['#60b9df','#82b85c','#5cb4d2'][i],'#62b7b6',.4),w*x,panelY+h*.04,faceZ)));
      const segments=[[0,1,1,0],[0,0,1,0],[0,-1,1,0],[-1,.5,0,1],[-1,-.5,0,1],[1,.5,0,1],[1,-.5,0,1]];
      [[w*.12,[0,1,2,3,4,6]],[w*.17,[0,2,3,4,5,6]]].forEach(([x,on])=>on.forEach(k=>{
        const [sx,sy,horizontal]=segments[k],unit=h*.022;
        g.add(box(horizontal?unit*.8:unit*.14,horizontal?unit*.14:unit*.72,.0007,glowMat('#d5e7ee','#d5e7ee',.35),x+sx*unit*.45,panelY+h*.058+sy*unit,faceZ));
      }));
      [.27,.33].forEach(x=>g.add(box(w*.008,h*.01,.0006,'#969ca1',w*x,panelY+h*.05,faceZ)));
      break;
    }
  }
  if(['fridge','fridge_french_drawer'].includes(f.type)){
    // Scale the complete envelope (including existing handles), keeping the floor datum.
    const model=new THREE.Group();model.add(...g.children.slice());g.add(model);
    const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
    model.scale.set(w/size.x,M(products.height(f))/size.y,d/size.z);
    model.position.set(-(bounds.min.x+bounds.max.x)/2*model.scale.x,-bounds.min.y*model.scale.y,-(bounds.min.z+bounds.max.z)/2*model.scale.z);
  }
  return g;
 }
 return {supported,build};
}
const api={supported,create};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishApplianceModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
