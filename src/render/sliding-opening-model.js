/* Production sliding doors/windows. Furniture input mm; raw openings input m. */
(function(root){
'use strict';
const supported=f=>['slidingdoor','tripleslidingdoor','tripleslidingwindow'].includes(f?.type);
function create(THREE,options={}){
 const products=options.products||root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null);
 const primitives=options.primitives||(root.FurnishModelPrimitives||(typeof require==='function'?require('./model-primitives.js'):null)).create(THREE);
 const {mat,box}=primitives;
function buildSlidingDoor(w,d,h,count,color='#41474b',options={}){
  const group=new THREE.Group(),frame=mat(color,{metalness:.65,roughness:.35});
  const glass=mat('#d8e5e8',{transparent:true,opacity:.18,depthWrite:false,roughness:.12,side:THREE.DoubleSide});
  const slim=count===3,edge=Math.min(slim?.016:.028,w/20,h/12),jamb=slim?.009:edge;
  const rail=Math.min(slim?.024:edge,h/10),bottom=options.floorTrack??!slim;
  const overlap=edge,clear=w-2*jamb,pw=(clear+(count-1)*overlap)/count,step=pw-overlap;
  const leafDepth=Math.min(slim?.018:.025,d/(count+1)*.7),track=(d-leafDepth)/count;
  const low=bottom?Math.min(.008,h/20):.004,high=h-rail,leafH=high-low;
  const door={kind:'slide',group,leaves:[],open:false,cur:0};
  [-1,1].forEach(side=>group.add(box(jamb,h,d,frame,side*(w-jamb)/2,0,0)));
  group.add(box(w,rail,d,frame,0,h-rail,0));
  if(bottom){const railGroup=new THREE.Group();railGroup.name='floor-track';
    for(let i=0;i<count;i++)railGroup.add(box(w,low,.004,frame,0,0,(i-(count-1)/2)*track));
    group.add(railGroup);
  }
  for(let i=0;i<count;i++){
    const leaf=new THREE.Group(),closed=-w/2+jamb+pw/2+step*i,opened=-w/2+jamb+pw/2;
    leaf.position.set(closed,low,(i-(count-1)/2)*track);
    leaf.add(box(pw-2*edge,leafH-2*edge,Math.min(.006,leafDepth/2),glass,0,edge,0));
    [-1,1].forEach(side=>leaf.add(box(edge,leafH,leafDepth,frame,side*(pw-edge)/2,0,0)));
    [0,leafH-edge].forEach(y=>leaf.add(box(pw-2*edge,edge,leafDepth,frame,0,y,0)));
    // Recessed slim grip on the leading leaf; no repeated projecting handles.
    if(i===count-1)leaf.add(box(Math.min(.006,edge*.4),Math.min(.18,leafH*.2),.004,frame,pw/2-edge*.5,leafH*.45,leafDepth/2));
    group.add(leaf);door.leaves.push({node:leaf,closed,opened,width:pw});
  }
  if(options.stackSide==='right')group.scale.x=-1;
  group.traverse(o=>{o.userData.door=door;});group.userData.slidingDoor=door;
  return group;
}
 function build(f){
  if(!supported(f))throw Error('Unsupported sliding opening: '+f?.type);
  const g=new THREE.Group(),model=buildSlidingDoor(f.w/1000,f.d/1000,products.height(f)/1000,f.type==='slidingdoor'?2:3,f.color||'#ddd',{floorTrack:products.value(f,'floorTrack')});
  if(f.type==='tripleslidingwindow')model.position.y=products.value(f,'mountHeight')/1000;g.add(model);g.userData.slidingDoor=model.userData.slidingDoor;
  return g;
 }
 return {supported,build,buildOpening:buildSlidingDoor};
}
const api={supported,create};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishSlidingOpeningModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
