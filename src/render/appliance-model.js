/* Shared fridges, flat heater and laundry models. Input mm; local geometry in m. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncIdentity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);

const supported=f=>['fridge','fridge_french_drawer','waterheater_flat','washer','dryer'].includes(f?.type);
function create(THREE,RoundedBoxGeometry,options={}){
 const products=options.products||root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null);
 const design=options.design||root.FurnishDesign||(typeof require==='function'?require('../core/design-core.js'):null);
 const primitives=options.primitives||(root.FurnishModelPrimitives||(typeof require==='function'?require('./model-primitives.js'):null)).create(THREE,RoundedBoxGeometry);
 const {mesh,sh,box,rbox,cyl,lighter,chrome,metal,screenMat,glowMat,pull}=primitives;
 const M=v=>v/1000,mat=primitives.mat;
 function build(f,context={}){
  if(!supported(f))throw Error('Unsupported appliance model: '+f?.type);
  if(products.definition(f)?.fridgeMotion){const loader=root.FurnishFridgeModel||(typeof require==='function'?require('./fridge-model.js'):null);if(loader)return loader.build(THREE,f,{mat});}
  if(products.definition(f)?.washerMotion){const loader=root.FurnishWasherModel||(typeof require==='function'?require('./washer-model.js'):null);if(!loader)throw Error('Washer Blender model not loaded');const g=loader.build(THREE,f,{local:true,mat}),stack=design.laundryStack(f,context.furniture||[]);if(stack&&stack.height>0&&Math.abs((f.mountHeight??0)-stack.bottom-stack.height)<1e-6){const connector=syncIdentity.produce("appliance-model:site-38",()=>box(M(stack.w),M(stack.height),M(stack.d),'#aeb5bb',0,-M(stack.height),0));connector.userData.laundryConnector=true;g.add(connector);}return g;}
  const g=new THREE.Group(),w=M(f.w),d=M(f.d),c=f.color||'#ddd';
  switch(f.type){
    case 'washer': case 'dryer': {
      const bm = mat(c, {roughness:.35}), R0 = Math.min(w, d)*.25, fz = d/2 - .02;
      g.add(syncIdentity.produce("appliance-model:site-1",()=>box(w - .02, .04, d - .04, '#8f969b', 0, 0, -.02)), syncIdentity.produce("appliance-model:site-2",()=>rbox(w, .81, d - .02, bm, 0, .04, -.01, .025)));
      g.add(syncIdentity.produce("appliance-model:site-3",()=>box(w - .04, .1, .006, lighter(c, .3), 0, .72, fz + .003)), syncIdentity.produce("appliance-model:site-4",()=>rbox(.18, .07, .01, bm, -w/2 + .12, .735, fz + .006, .004)));
      g.add(syncIdentity.produce("appliance-model:site-5",()=>box(.12, .035, .003, screenMat('#1f6f6a'), w*.14, .745, fz + .007)));
      const kn = syncIdentity.produce("appliance-model:site-6",()=>cyl(.03, .03, .02, chrome(), -w*.02, .75, fz + .016, 28)); kn.rotation.x = Math.PI/2; g.add(kn);
      const dr = syncIdentity.produce("appliance-model:site-7",()=>new THREE.Mesh(new THREE.CircleGeometry(R0, 40), mat('#1b1f22', {roughness:.6}))); dr.position.set(0, .4, fz + .004); g.add(dr);
      const rg = syncIdentity.produce("appliance-model:site-8",()=>new THREE.Mesh(new THREE.TorusGeometry(R0 + .02, .022, 14, 48), mat('#c7cfd5', {metalness:.7, roughness:.25}))); rg.position.set(0, .4, fz + .016); sh(rg); g.add(rg);
      const Rs = R0*1.42, cap = syncIdentity.produce("appliance-model:site-9",()=>new THREE.Mesh(new THREE.SphereGeometry(Rs, 32, 12, 0, Math.PI*2, 0, .78), mat(f.type === 'dryer' ? '#4a4038' : '#26343d', {roughness:.04, metalness:.2, transparent:true, opacity:.8})));
      cap.rotation.x = Math.PI/2; cap.position.set(0, .4, fz + .012 - Rs*Math.cos(.78)); g.add(cap);
      g.add(syncIdentity.produce("appliance-model:site-10",()=>box(w - .06, .004, .003, '#b9c3ca', 0, .08, fz + .002)));
      g.scale.y = M(products.height(f))/.85;
      break;
    }

    case 'fridge': {
      const w = f.w > 850 ? .91 : .7, d = .7;
      const fm = mat(c, {metalness:.45, roughness:.28}), h = 1.8, fz = d/2 - .05;
      g.add(syncIdentity.produce("appliance-model:site-11",()=>box(w - .02, .06, d - .06, '#2a2c2e', 0, 0, -.03)), syncIdentity.produce("appliance-model:site-12",()=>rbox(w, h - .06, d - .05, fm, 0, .06, -.025, .02)), syncIdentity.produce("appliance-model:site-13",()=>box(w - .01, h - .07, .003, '#2a2c2e', 0, .065, fz + .0015)));
      if (w > .85){
        syncIdentity.each("appliance-model.js:generator-1",[-1, 1],s => { g.add(syncIdentity.produce("appliance-model:site-14",()=>rbox(w/2 - .004, h - .08, .04, fm, s*w/4, .07, fz + .023, .012))); syncIdentity.produce("appliance-model:site-15",()=>pull(g, .8, true, s*.035, 1.05, fz + .043)); });
        g.add(syncIdentity.produce("appliance-model:site-16",()=>box(.1, .14, .003, screenMat('#2a6f8f'), -w/4, 1.25, fz + .044)));
      } else {
        g.add(syncIdentity.produce("appliance-model:site-17",()=>rbox(w - .006, 1.06, .04, fm, 0, .72, fz + .023, .012)), syncIdentity.produce("appliance-model:site-18",()=>rbox(w - .006, .64, .04, fm, 0, .07, fz + .023, .012)));
        syncIdentity.produce("appliance-model:site-19",()=>pull(g, .5, true, -w/2 + .06, 1.05, fz + .043)); syncIdentity.produce("appliance-model:site-20",()=>pull(g, w*.5, false, 0, .64, fz + .043));
        g.add(syncIdentity.produce("appliance-model:site-21",()=>box(.08, .1, .003, screenMat('#2a6f8f'), w*.22, 1.4, fz + .044)));
      }
      break;
    }
    case 'fridge_french_drawer': {
      // Reference envelope 833 × 595 × 1910 mm; front is +Z.
      const w=.833,d=.595,h=1.91,fz=d/2,white=mat(c,{metalness:.12,roughness:.4}),dark=mat('#303234',{roughness:.55});
      g.add(syncIdentity.produce("appliance-model:site-22",()=>box(w,h-.024,d-.036,white,0,.024,-.018)));
      syncIdentity.each("appliance-model.js:generator-2",[-1,1],s=>syncIdentity.each("appliance-model.js:generator-3",[-1,1],t=>g.add(syncIdentity.produce("appliance-model:site-23",()=>cyl(.012,.014,.024,dark,s*(w/2-.04),0,t*(d/2-.04),16)))));
      // Recessed dark backing remains visible in the seams and handle channels.
      g.add(syncIdentity.produce("appliance-model:site-24",()=>box(w-.006,h-.033,.012,dark,0,.025,fz-.03)));
      const panel=(pw,ph,x,y)=>g.add(syncIdentity.produce("appliance-model:site-25",()=>rbox(pw,ph,.032,white,x,y,fz-.016,.002)));
      syncIdentity.produce("appliance-model.js:generator-call-1",()=>panel(w-.008,.400,0,.025));
      syncIdentity.produce("appliance-model.js:generator-call-2",()=>panel(w-.008,.306,0,.460));
      syncIdentity.each("appliance-model.js:generator-4",[-1,1],s=>syncIdentity.produce("appliance-model.js:generator-call-3",()=>panel(w/2-.006,1.102,s*w/4,.800)));
      // Two horizontal recessed grips, no handles beyond the flush front.
      syncIdentity.each("appliance-model.js:generator-5",[.426,.767],y=>g.add(syncIdentity.produce("appliance-model:site-26",()=>box(w-.012,.025,.010,dark,0,y,fz-.015)),syncIdentity.produce("appliance-model:site-27",()=>box(w-.012,.004,.013,metal(),0,y+.025,fz-.013))));
      g.add(syncIdentity.produce("appliance-model:site-28",()=>box(.048,.208,.002,screenMat('#292e30'),.080,1.425,fz-.0005)));
      syncIdentity.each("appliance-model.js:generator-6",[.034,.076,.118],(offset,i)=>g.add(syncIdentity.produce("appliance-model:site-29",()=>box(.018,.006,.001,glowMat(i===1?'#e8a55d':'#c2d4d4'),.080,1.44+offset,fz+.001))));
      g.add(syncIdentity.produce("appliance-model:site-30",()=>box(.029,.003,.001,metal(),w*.39,1.846,fz+.001)));
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
        geo.rotateY(Math.PI/2);const o=syncIdentity.produce("appliance-model:site-31",()=>mesh(geo,m));o.position.set(x,y,0);return o;
      };
      g.add(syncIdentity.produce("appliance-model.js:generator-call-4",()=>section(d,bodyH,w-2*capW,-w/2+capW,base+bottom,white)));
      syncIdentity.each("appliance-model.js:generator-7",[-1,1],s=>{
        g.add(syncIdentity.produce("appliance-model.js:generator-call-5",()=>section(d,bodyH,capW*.76,s<0?-w/2+capW*.24:w/2-capW,base+bottom,white)));
        g.add(syncIdentity.produce("appliance-model.js:generator-call-6",()=>section(d*.955,bodyH-h*.02,capW*.24,s<0?-w/2:w/2-capW*.24,base+bottom+h*.01,gray)));
      });
      g.add(syncIdentity.produce("appliance-model:site-32",()=>rbox(w*.33,h*.048,d*.38,gray,0,base+h*.018,0,h*.012)));
      // 100 mm between water outlets; hot left / cold right facing the front.
      syncIdentity.each("appliance-model.js:generator-8",[[-.05,'#c0463a'],[.05,'#3b7bbf']],([x,cc])=>{
        const port=syncIdentity.produce("appliance-model:site-33",()=>cyl(.01,.01,h*.024,mat(cc,{metalness:.35,roughness:.4}),x*w/.7,base,0,16));
        port.userData.waterOutlet=cc==='#c0463a'?'hot':'cold';g.add(port);
      });
      const panelZ=d*.35,panelY=base+h*.075;
      g.add(syncIdentity.produce("appliance-model:site-34",()=>rbox(w*.86,h*.115,d*.11,mat('#17191c',{roughness:.18}),0,panelY,panelZ,h*.018)));
      const faceZ=panelZ+d*.055+.0004;
      // Small geometric display stays crisp offline without an image texture.
      syncIdentity.each("appliance-model.js:generator-9",[-.23,-.15,-.07],(x,i)=>g.add(syncIdentity.produce("appliance-model:site-35",()=>box(w*.052,h*.035,.0006,glowMat(['#60b9df','#82b85c','#5cb4d2'][i],'#62b7b6',.4),w*x,panelY+h*.04,faceZ))));
      const segments=[[0,1,1,0],[0,0,1,0],[0,-1,1,0],[-1,.5,0,1],[-1,-.5,0,1],[1,.5,0,1],[1,-.5,0,1]];
      syncIdentity.each("appliance-model.js:generator-10",[[w*.12,[0,1,2,3,4,6]],[w*.17,[0,2,3,4,5,6]]],([x,on])=>syncIdentity.each("appliance-model.js:generator-11",on,k=>{
        const [sx,sy,horizontal]=segments[k],unit=h*.022;
        g.add(syncIdentity.produce("appliance-model:site-36",()=>box(horizontal?unit*.8:unit*.14,horizontal?unit*.14:unit*.72,.0007,glowMat('#d5e7ee','#d5e7ee',.35),x+sx*unit*.45,panelY+h*.058+sy*unit,faceZ)));
      }));
      syncIdentity.each("appliance-model.js:generator-12",[.27,.33],x=>g.add(syncIdentity.produce("appliance-model:site-37",()=>box(w*.008,h*.01,.0006,'#969ca1',w*x,panelY+h*.05,faceZ))));
      break;
    }
  }
  const stack=['washer','dryer'].includes(f.type)?design.laundryStack(f,context.furniture||[]):null;
  if(stack&&stack.height>0&&Math.abs((f.mountHeight??0)-stack.bottom-stack.height)<1e-6){
    const connector=syncIdentity.produce("appliance-model:site-38",()=>box(M(stack.w),M(stack.height)/g.scale.y,M(stack.d),'#aeb5bb',0,-M(stack.height)/g.scale.y,0));
    connector.userData.laundryConnector=true;g.add(connector);
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
