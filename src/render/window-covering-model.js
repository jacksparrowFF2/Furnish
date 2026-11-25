/* Generic made-to-measure coverings. Production geometry is also the numeric solid source. */
(function(root){'use strict';
const products=()=>root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null);
function addMotorHardware(T,f,l,add,g,box,mat){
 const asset=root.FurnishMijiaCurtain3ProMotorAsset||require('../data/curtain-mijia-3-pro-motor-blender-asset.js');
 const loader=root.FurnishStaticAssetModel||require('./static-asset-model.js');
 const {motor:{w,h,d,x,bottom}}=l;
 const hardware=loader.build(T,asset,{w,h,d},bottom);
 hardware.position.x=x/1000;
 hardware.children.forEach(part=>{part.userData.coveringPart='motor-housing';});
 g.add(hardware);
 const aluminum=mat('#dbdedc',{roughness:.4,metalness:.42});
 const width=f.w/1000,top=l.h/1000,depth=l.trackDepth/1000,height=l.trackHeight/1000;
 const count=Math.ceil(f.w/1000),span=width/count;
 // A slotted section and visible end-to-end seams, with rigid cross-sections.
 const section=[
  ['cap',.003,depth,top-.003,0],
  ['web',.002,depth-.006,top-height*.52,0],
  ...[-1,1].flatMap(side=>[
   ['side-'+side,height-.003,.003,top-height,side*(depth-.003)/2],
   ['lip-'+side,.003,.007,top-height,side*(depth-.007)/2],
  ]),
 ];
 for(let i=0;i<count;i++){
  const start=-width/2+i*span+(i>0?.0004:0),end=-width/2+(i+1)*span-(i<count-1?.0004:0);
  for(const [key,y,z,bottom,center] of section)add(box(end-start,y,z,aluminum,(start+end)/2,bottom,center),'curtain-rail',key+'-'+i);
 }
}
function build(T,f){
 const p=products(),l=p.coveringLayout(f),g=new T.Group();if(!l)return g;
 const primitives=(root.FurnishModelPrimitives||require('./model-primitives.js')).create(T),{box,mat,mesh}=primitives,I=root.FurnishPartIdentity||require('../core/part-identity.js'),w=f.w/1000,h=l.h/1000,d=f.d/1000;
 // Dense warm-white voile per the user's reference; zebra mesh keeps its lighter weave.
 const state={kind:'covering',open:l.open>0},color=f.color||'#e7dfd2',cloth=mat(color,{roughness:1,side:T.DoubleSide}),sheer=mat(color,{roughness:1,side:T.DoubleSide,transparent:true,opacity:l.soft ? .84 : .28,depthWrite:false}),rail=mat('#e6e3dc',{roughness:.45,metalness:.15});
 const add=(node,role,key)=>{node.name=role;node.userData.coveringPart=role;node.userData.furnishStablePart='covering:'+key;if(role!=='curtain-rail')node.userData.door=state;g.add(node);return node;};
 if(l.soft){
  if(l.motor)addMotorHardware(T,f,l,add,g,box,mat);
  else add(box(w,.016,Math.min(d,.024),rail,0,h-.016,0),'track','track');
  for(let panel=0;panel<l.count;panel++){
   const fabric=l.fabric?.[panel],width=fabric?fabric.width/1000:w/l.count-(l.count===2?.006:0);
   const closed=fabric?fabric.closed/1000:-w/2+w/l.count*(panel+.5);
   const opened=fabric?fabric.opened/1000:(panel===0?-1:1)*(w/2-width*.16/2);
   const folds=Math.max(4,Math.round(width/.12)),cols=folds*12,rows=12,positions=[],indices=[];
   const open=fabric?.open??l.open;
   const amplitude=Math.min(d*.4,.065),scale=1-.84*open;
   for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const t=i/cols,v=j/rows;positions.push(-width/2+width*t,.02+(h-.06)*v,Math.cos(t*folds*Math.PI*2)*amplitude*(.85+.15*(1-v)));}
   for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1);}
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
   const role=l.motor?'fabric-panel':'sheer-panel';
   const translucent=l.kind==='sheer',node=add(mesh(geo,translucent?sheer:cloth),role,role+'-'+panel);
   if(fabric)node.userData.door={kind:'covering',open:open>0,coveringField:fabric.field};
   node.position.x=closed+(opened-closed)*open;node.scale.x=scale;if(translucent)node.castShadow=false;
  }
 }else{
  l.parts.forEach((part,i)=>{
   const m=part.role==='sheer'?sheer:['headrail','bottom-rail'].includes(part.role)?rail:part.role==='binding'?mat('#79684e',{roughness:1}):cloth;
   const node=I.produce('window-covering:'+part.role,()=>box(part.w/1000,part.h/1000,part.d/1000,m,part.x/1000,part.bottom/1000,part.z/1000));
   node.rotation.x=part.angle;add(node,part.role,part.role+'-'+i);if(part.role==='sheer')node.castShadow=false;
  });
 }
 g.userData.covering=state;return g;
}
const api={build};root.FurnishWindowCoveringModel=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
