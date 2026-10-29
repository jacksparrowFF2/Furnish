/* Generic made-to-measure coverings. Production geometry is also the numeric solid source. */
(function(root){'use strict';
const products=()=>root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null);
function build(T,f){
 const p=products(),l=p.coveringLayout(f),g=new T.Group();if(!l)return g;
 const primitives=(root.FurnishModelPrimitives||require('./model-primitives.js')).create(T),{box,mat,mesh}=primitives,I=root.FurnishPartIdentity||require('../core/part-identity.js'),w=f.w/1000,h=l.h/1000,d=f.d/1000;
 const state={kind:'covering',open:l.open>0},color=f.color||'#e7dfd2',cloth=mat(color,{roughness:1,side:T.DoubleSide}),sheer=mat(color,{roughness:1,side:T.DoubleSide,transparent:true,opacity:.28,depthWrite:false}),rail=mat('#e6e3dc',{roughness:.45,metalness:.15});
 const add=(node,role,key)=>{node.name=role;node.userData.coveringPart=role;node.userData.furnishStablePart='covering:'+key;node.userData.door=state;g.add(node);return node;};
 if(l.soft){
  add(box(w,.016,Math.min(d,.024),rail,0,h-.016,0),'track','track');
  for(let panel=0;panel<l.count;panel++){
   const width=w/l.count-(l.count===2?.006:0),folds=Math.max(4,Math.round(width/.12)),cols=folds*12,rows=12,positions=[],indices=[],amplitude=Math.min(d*.4,.065),scale=1-.84*l.open,closed=-w/2+w/l.count*(panel+.5),opened=(panel===0?-1:1)*(w/2-width*.16/2);
   for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const t=i/cols,v=j/rows;positions.push(-width/2+width*t,.02+(h-.06)*v,Math.cos(t*folds*Math.PI*2)*amplitude*(.85+.15*(1-v)));}
   for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1);}
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();
   const node=add(mesh(geo,sheer),'sheer-panel','sheer-panel-'+panel);node.position.x=closed+(opened-closed)*l.open;node.scale.x=scale;node.castShadow=false;
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
