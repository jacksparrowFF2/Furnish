/* Production sliding doors/windows. Furniture input mm; raw openings input m. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncIdentity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);

const supported=f=>['slidingdoor','doubleslidingdoor','tripleslidingdoor','tripleslidingwindow'].includes(f?.type);
function create(THREE,options={}){
 const products=options.products||root.FurnishProducts||(typeof require==='function'?require('../core/product-rules.js'):null);
 const primitives=options.primitives||(root.FurnishModelPrimitives||(typeof require==='function'?require('./model-primitives.js'):null)).create(THREE);
 const {mat,box}=primitives;
 // Rail prism only. Door leaves remain rectangular at every opening position.
 function prism(poly,bottom,h,material){
  const n=poly.length,vertices=[...poly.map(([x,z])=>[x,bottom,z]),...poly.map(([x,z])=>[x,bottom+h,z])].flat(),indices=[];
  for(let i=1;i<n-1;i++)indices.push(0,i,i+1,n,n+i+1,n+i);
  for(let i=0;i<n;i++){const j=(i+1)%n;indices.push(i,n+i,n+j,i,n+j,j);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
  return new THREE.Mesh(geo,material);
 }
function buildSlidingDoor(w,d,h,count,color='#41474b',options={}){
  const group=new THREE.Group(),frame=mat(color,{metalness:.65,roughness:.35});
  const glass=mat('#d8e5e8',{transparent:true,opacity:.18,depthWrite:false,roughness:.12,side:THREE.DoubleSide});
  const slim=options.slim??count===3,layout=products.slidingLayout({w:w*1000,d:d*1000,h:h*1000},options.corner,{panels:count,slim,order:options.trackOrder,stackSide:options.stackSide}),edge=layout.edge/1000,jamb=layout.jamb/1000;
  const rail=Math.min(slim?.024:edge,h/10),bottom=options.floorTrack??!slim;
  const mirrored=options.stackSide==='right',corner=options.corner?{x:options.corner.x*(mirrored?-1:1)/1000,slope:options.corner.slope*(mirrored?-1:1),leafEnd:options.corner.leafEnd*(mirrored?-1:1)/1000}:null;
  const end=corner?corner.leafEnd:w/2-jamb;
  const overlap=edge,clear=end-(-w/2+jamb),pw=(clear+(count-1)*overlap)/count,step=pw-overlap;
  const tracks=products.slidingTracks({d:d*1000},{panels:count,slim,order:options.trackOrder}),leafDepth=tracks.leafDepth/1000,track=tracks.pitch/1000;
  const floorRail=bottom?Math.min(.008,h/20):0,low=options.corner?.floorClearance!==undefined?options.corner.floorClearance/1000:bottom?floorRail:.004,high=h-rail,leafH=high-low;
  const door={kind:'slide',group,leaves:[],open:false,cur:0};
  const limit=z=>corner.x+corner.slope*z;
  syncIdentity.each("sliding-opening-model.js:generator-1",corner?[-1]:[-1,1],side=>{const o=syncIdentity.produce("sliding-opening-model:site-1",()=>box(jamb,h,d,frame,side*(w-jamb)/2,0,0));o.name='side-jamb';group.add(o);});
  const top=syncIdentity.produce("sliding-opening-model:site-2",()=>corner?prism([[-w/2,-d/2],[limit(-d/2),-d/2],[limit(d/2),d/2],[-w/2,d/2]],h-rail,rail,frame):box(w,rail,d,frame,0,h-rail,0));top.name='top-track';top.userData.slidingPart='top-track';group.add(top);
  if(bottom){const railGroup=new THREE.Group();railGroup.name='floor-track';
    for(let i of syncIdentity.range("sliding-opening-model.js:generator-2",0,count,1,false)){const z=(i-(count-1)/2)*track;railGroup.add(syncIdentity.produce("sliding-opening-model:site-3",()=>corner?prism([[-w/2,z-.002],[limit(z-.002),z-.002],[limit(z+.002),z+.002],[-w/2,z+.002]],0,floorRail,frame):box(w,floorRail,.004,frame,0,0,z)));}
    group.add(railGroup);
  }
  for(let i of syncIdentity.range("sliding-opening-model.js:generator-3",0,count,1,false)){
    const leaf=new THREE.Group(),closed=-w/2+jamb+pw/2+step*i,opened=-w/2+jamb+pw/2;
    leaf.position.set(closed,low,(i-(count-1)/2)*track*tracks.direction);
    leaf.add(syncIdentity.produce("sliding-opening-model:site-4",()=>box(pw-2*edge,leafH-2*edge,Math.min(.006,leafDepth/2),glass,0,edge,0)));
    syncIdentity.each("sliding-opening-model.js:generator-4",[-1,1],side=>leaf.add(syncIdentity.produce("sliding-opening-model:site-5",()=>box(edge,leafH,leafDepth,frame,side*(pw-edge)/2,0,0))));
    syncIdentity.each("sliding-opening-model.js:generator-5",[0,leafH-edge],y=>leaf.add(syncIdentity.produce("sliding-opening-model:site-6",()=>box(pw-2*edge,edge,leafDepth,frame,0,y,0))));
    // Recessed grip stays clear of the perpendicular leaf's corner contact.
    if(i===count-1)leaf.add(syncIdentity.produce("sliding-opening-model:site-7",()=>box(Math.min(.006,edge*.4),Math.min(.18,leafH*.2),.004,frame,pw/2-(corner?Math.min(pw/2,Math.max(edge*2,leafDepth*2)):edge*.5),leafH*.45,leafDepth/2)));
    group.add(leaf);door.leaves.push({node:leaf,closed,opened,width:pw});
  }
  if(options.stackSide==='right')group.scale.x=-1;
  group.traverse(o=>{o.userData.door=door;});group.userData.slidingDoor=door;
  return group;
}
 function build(f,context={}){
  if(!supported(f))throw Error('Unsupported sliding opening: '+f?.type);
  const corner=context.corner===undefined?products.slidingCorner(f,context.furniture,context.plan):context.corner;
  const g=new THREE.Group(),model=syncIdentity.produce("sliding-opening-model.js:generator-call-1",()=>buildSlidingDoor(f.w/1000,f.d/1000,products.height(f)/1000,products.definition(f)?.telescopic?.panels||(f.type==='slidingdoor'?2:3),f.color||'#ddd',{floorTrack:products.value(f,'floorTrack'),slim:f.type!=='slidingdoor',trackOrder:products.value(f,'slidingTrackOrder'),corner,stackSide:corner?.side==='left'?'right':'left'}));
  if(f.type==='tripleslidingwindow')model.position.y=products.value(f,'mountHeight')/1000;g.add(model);g.userData.slidingDoor=model.userData.slidingDoor;
  return g;
 }
 return {supported,build,buildOpening:buildSlidingDoor};
}
const api={supported,create,build:(THREE,f,context={})=>create(THREE).build(f,context)};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishSlidingOpeningModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
