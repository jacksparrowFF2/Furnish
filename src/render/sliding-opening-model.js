/* Production sliding doors/windows. Furniture input mm; raw openings input m. */
(function(root){
'use strict';
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncIdentity=root.FurnishPartIdentity||(typeof require==='function'?require('../core/part-identity.js'):null);

const supported=f=>['pocketdoor_triple','pocketdoor_double','slidingdoor','telescopicdoor20','doubleslidingdoor','tripleslidingdoor','tripleslidingwindow'].includes(f?.type);
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
  const glass=mat(products.slidingGlass.color,{transparent:true,opacity:products.slidingGlass.opacity,depthWrite:false,roughness:products.slidingGlass.roughness,side:THREE.DoubleSide});
  const slim=options.slim??count===3,bottom=options.floorTrack??!slim,floorTrackMode=options.floorTrackMode??(count>=3?'moving':'all');
  const layout=products.slidingLayout({w:w*1000,d:d*1000,h:h*1000},options.corner,{panels:count,slim,order:options.trackOrder,stackSide:options.stackSide,allMoving:options.allMoving,leafDepth:options.leafDepth,floorTrack:bottom,floorTrackMode}),edge=layout.edge/1000,jamb=layout.jamb/1000;
  const rail=Math.min(slim?.024:edge,h/10);
  const mirrored=options.stackSide==='right',corner=options.corner?{x:options.corner.x*(mirrored?-1:1)/1000,slope:options.corner.slope*(mirrored?-1:1),leafEnd:options.corner.leafEnd*(mirrored?-1:1)/1000,partnerLeafDepth:(options.corner.partnerLeafDepth||0)/1000}:null;
  const pw=layout.width/1000,leafDepth=layout.leafDepth/1000,floorRail=layout.floorRailHeight/1000,low=layout.bottomClearance/1000,high=h-rail,leafH=high-low;
  const door={kind:'slide',group,leaves:[],open:false,cur:0};
  const limit=z=>corner.x+corner.slope*z;
  syncIdentity.each("sliding-opening-model.js:generator-1",layout.allMoving?(corner?[]:[1]):corner?[-1]:[-1,1],side=>{const o=syncIdentity.produce("sliding-opening-model:site-1",()=>box(jamb,h,d,frame,side*(w-jamb)/2,0,0));o.name='side-jamb';group.add(o);});
  const top=syncIdentity.produce("sliding-opening-model:site-2",()=>layout.allMoving?prism(layout.railOutline.map(([x,z])=>[x*(mirrored?-1:1)/1000,z/1000]),h-rail,rail,frame):corner?prism([[-w/2,-d/2],[limit(-d/2),-d/2],[limit(d/2),d/2],[-w/2,d/2]],h-rail,rail,frame):box(w,rail,d,frame,0,h-rail,0));top.name='top-track';top.userData.slidingPart='top-track';group.add(top);
  if(bottom){const railGroup=new THREE.Group();railGroup.name='floor-track';
    const floorMaterial=floorTrackMode==='moving'?mat('#a8aaa6',{metalness:.8,roughness:.3}):frame;
    for(let i of syncIdentity.range("sliding-opening-model.js:generator-2",0,count,1,false)){const lane=layout.floorTracks.find(t=>t.leafIndex===i);if(!lane)continue;
      const mesh=syncIdentity.produce("sliding-opening-model:site-3",()=>layout.allMoving||corner?prism(lane.outline.map(([x,z])=>[x*(mirrored?-1:1)/1000,z/1000]),0,floorRail,floorMaterial):box(w,floorRail,.004,floorMaterial,0,0,lane.z/1000));
      mesh.name='floor-rail-'+i;mesh.userData.slidingPart='floor-rail';mesh.userData.slidingLeafIndex=i;railGroup.add(mesh);
    }
    group.add(railGroup);
  }
  for(let i of syncIdentity.range("sliding-opening-model.js:generator-3",0,count,1,false)){
    const leaf=new THREE.Group(),closed=layout.leaves[i].x*(mirrored?-1:1)/1000,opened=layout.leaves[i].opened*(mirrored?-1:1)/1000;
    leaf.position.set(closed,low,layout.leaves[i].z/1000);
    leaf.add(syncIdentity.produce("sliding-opening-model:site-4",()=>box(pw-2*edge,leafH-2*edge,Math.min(.006,leafDepth/2),glass,0,edge,0)));
    syncIdentity.each("sliding-opening-model.js:generator-4",[-1,1],side=>leaf.add(syncIdentity.produce("sliding-opening-model:site-5",()=>box(edge,leafH,leafDepth,frame,side*(pw-edge)/2,0,0))));
    syncIdentity.each("sliding-opening-model.js:generator-5",[0,leafH-edge],y=>leaf.add(syncIdentity.produce("sliding-opening-model:site-6",()=>box(pw-2*edge,edge,leafDepth,frame,0,y,0))));
    // Recessed grip stays clear of the perpendicular leaf's corner contact.
    if(i===count-1)leaf.add(syncIdentity.produce("sliding-opening-model:site-7",()=>box(Math.min(.006,edge*.4),Math.min(.18,leafH*.2),.004,frame,pw/2-(corner?Math.min(pw/2,Math.max(edge*2,leafDepth*2,corner.partnerLeafDepth*2)):edge*.5),leafH*.45,layout.allMoving?leafDepth/2-.002:leafDepth/2)));
    group.add(leaf);door.leaves.push({node:leaf,closed,opened,width:pw});
  }
  if(options.stackSide==='right')group.scale.x=-1;
  group.traverse(o=>{o.userData.door=door;});group.userData.slidingDoor=door;
  return group;
}
 function buildPocket(f){
  const layout=products.pocketLayout(f),g=new THREE.Group(),door={kind:'slide',group:g,leaves:[],open:products.value(f,'slidingOpen'),cur:products.value(f,'slidingOpen')?1:0};
  for(const p of syncIdentity.records('sliding-opening-model:pocket-parts',layout.parts,p=>p.partId)){
   const leaf=p.key==='pocket-leaf',mesh=syncIdentity.produce('sliding-opening-model:pocket-'+p.key,()=>box(p.w/1000,p.h/1000,p.d/1000,leaf?(f.color||'#c5b59d'):'#e8e3d9',0,p.bottom/1000,p.z/1000));
   mesh.userData.pocketPart=p.key;
   if(leaf){const node=new THREE.Group(),source=layout.leaves.find(l=>l.side===p.side);node.position.x=p.x/1000;node.add(mesh);node.traverse(o=>o.userData.door=door);g.add(node);door.leaves.push({node,closed:source.closed/1000,opened:source.opened/1000,width:source.width/1000});}
   else{mesh.position.x=p.x/1000;g.add(mesh);}
  }
  g.userData.slidingDoor=door;const outer=new THREE.Group();outer.add(g);outer.userData.slidingDoor=door;return outer;
 }
 function build(f,context={}){
  if(!supported(f))throw Error('Unsupported sliding opening: '+f?.type);
  if(products.definition(f)?.pocket)return buildPocket(f);
  const corner=context.corner===undefined?products.slidingCorner(f,context.furniture,context.plan):context.corner;
  const g=new THREE.Group(),model=syncIdentity.produce("sliding-opening-model.js:generator-call-1",()=>buildSlidingDoor(f.w/1000,f.d/1000,products.height(f)/1000,products.definition(f)?.telescopic?.panels||(f.type==='slidingdoor'?2:3),f.color||'#ddd',{floorTrack:products.value(f,'floorTrack'),floorTrackMode:products.definition(f)?.telescopic?'moving':'all',slim:f.type!=='slidingdoor',trackOrder:products.value(f,'slidingTrackOrder'),corner,allMoving:products.definition(f)?.telescopic?.allMoving,leafDepth:products.definition(f)?.telescopic?.leafDepth,stackSide:products.supports(f,'slidingStackSide')?products.value(f,'slidingStackSide'):corner?.side==='left'?'right':'left'}));
  if(products.value(f,'slidingOpen')){const door=model.userData.slidingDoor;door.open=true;door.cur=1;door.leaves.forEach(l=>l.node.position.x=l.opened);}
  if(f.type==='tripleslidingwindow')model.position.y=products.value(f,'mountHeight')/1000;g.add(model);g.userData.slidingDoor=model.userData.slidingDoor;
  return g;
 }
 return {supported,build,buildOpening:buildSlidingDoor};
}
const api={supported,create,build:(THREE,f,context={})=>create(THREE).build(f,context)};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishSlidingOpeningModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
