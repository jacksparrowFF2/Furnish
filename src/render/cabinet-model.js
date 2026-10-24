/* Shared Three.js cabinet construction. box uses bottom-based vertical coordinates. */
(function(root){
// Stable authoring-site labels: keep existing labels when moving code; allocate new labels for new sites.
const syncPart=(object,source)=>{if(object?.userData){object.userData.furnishPartSource=source;object.userData.furnishPartOrdinal??=object.id;}return object;};

 function buildRaw(THREE,f,box,options={}){
  if(f.laundryFloorOpen)options={...options,floorOpen:true};
  const C=root.FurnishCabinet||(typeof require==='function'?require('../core/cabinet-core.js'):null),c=C.config(f),h=C.height(f)/1000,w=f.w/1000,d=f.d/1000,t=c.thickness/1000,p=c.plinth/1000,g=new THREE.Group(),color=f.color||C.palette.front;
  const assembly=C.pegboardParts(f,c),hasUpper=assembly?.upper!==false,hasLower=assembly?.lower!==false;
  const entryStyle=C.doorOverlay(f,c)!=='inset',faceInset=C.frontInset(f,c)/1000,wood=C.palette.body,bodyColor=wood,shared=C.sharedSides(f,options.furniture||[]),bodyDepth=entryStyle?d-t:d,bodyZ=entryStyle?-t/2:0;
  const add=(parent,W,H,D,x,y,z,shade=bodyColor)=>{const mesh=syncPart(box(W,H,D,shade,x,y,z),"cabinet-model:site-1");parent.add(mesh);return mesh;};
  const nominalBays=C.layout(f),faceSpan=i=>{const span=C.frontSpan(f,i,c);return {left:span.left/1000,right:span.right/1000};};
  const rotation=(pose,angle)=>angle?pose.sign*angle*Math.PI/180:0;
  const cuts=options.sideCuts||C.sideOpenings(f,options.furniture||[]);
  const finishes=C.joinedSideFinishes(f,options.furniture||[]);
  if(c.sideboard){
   const s=c.sideboard,bays=C.layout(f),base=s.baseHeight/1000,ct=s.counterThickness/1000,niche=base+ct,display=niche+s.nicheHeight/1000,upper=display+s.displayHeight/1000,ld=s.lowerDepth/1000,ud=s.upperDepth/1000,back=-d/2;
   const storage=bays.filter((_,i)=>!c.columns[i].fridgeBay),left=storage[0].left/1000-t,right=(storage.at(-1).left+storage.at(-1).width)/1000+t,W=right-left,X=(left+right)/2;
   // Continuous counter and open working space: no vertical partitions in the niche.
   for(const [y,H,D,section] of [[p,t,ld,'bottom'],[base-t,t,ld,'baseTop'],[base,ct,ld,'counter'],[display,t,ud,'displayBottom'],[upper,t,ud,'displayTop'],[h-t,t,ud,'top']]){
    // Structural boards stop at the same front plane as the sides. Only the
    // worktop spans the full nominal depth; doors occupy the front panel band.
    const boardDepth=section==='counter'?D:D-t;
    syncPart(add(g,W,H,boardDepth,X,y,back+boardDepth/2),"cabinet-model:site-2").userData.cabinetSection=section;
   }
   if(p)syncPart(add(g,W,p,ld-.025,X,0,back+(ld-.025)/2),"cabinet-model:site-3");
   const backLeft=left+(c.columns[0].fridgeBay?t:0),backRight=right-(c.columns.at(-1).fridgeBay?t:0);
   syncPart(add(g,backRight-backLeft,s.nicheHeight/1000,t,(backLeft+backRight)/2,niche,back+t/2),"cabinet-model:site-4").userData.cabinetSection='operationBack';
   for(const [y,D] of [[display,ud],[upper,ud]]){
    const led=syncPart(add(g,W-2*t,.004,.012,X,y+.008,back+D-t-.014,'#ffe4ab'),"cabinet-model:site-5");led.material=led.material.clone();led.material.emissive=new THREE.Color('#ffe4ab');led.material.emissiveIntensity=.7;led.userData.cabinetOwnMaterial=true;led.userData.cabinetSection='led';
   }
   const door=(col,i,bottom,top,D,section,glass=false,span)=>{
    const kind=glass?C.displayDoor(col):col.door;if(kind==='none'||options.doors==='hidden')return;
    const nominal=span||bays[i],adjusted=!glass&&c.doorOverlay!==undefined?C.frontSpan(f,i,c):null,bay=adjusted?{left:adjusted.left,width:adjusted.right-adjusted.left}:nominal,count=kind==='double'?2:1,cw=bay.width/1000,leaf=cw/count;
    if(!glass&&c.doorOverlay!==undefined){bottom+=faceInset;top-=faceInset;}
    for(let j=0;j<count;j++){
     const pose=C.doorPose(kind,bay.left,bay.left+bay.width,bottom*1000,top*1000,(back+D-t/2)*1000,j,count,C.doorPairing(col),C.doorSingleHinge(col,kind),glass?undefined:col.doorLayout),pivot=new THREE.Group(),local=pose.localX/1000,localBottom=pose.localBottom/1000;
     pivot.position.set(...pose.pivot.map(v=>v/1000));pivot.rotation[pose.axis]=rotation(pose,glass?C.displayAngle(c,col):C.doorAngle(c,col,section));
     pivot.userData.motion={kind:'cabinetdoor',column:i,section,leaf:j,axis:pose.axis,angle:pose.sign*C.maxDoorAngle(c,col,glass?'display':undefined)*Math.PI/180};
     const face=syncPart(add(pivot,pose.width/1000,pose.height/1000,t,local,localBottom,0,glass?'#b3c5c8':col.doorColor||(col.finish==='wood'?wood:color)),"cabinet-model:site-6");face.userData.cabinetSection=section;face.userData.cabinetDoorSize={width:pose.width,height:pose.height,leaf:j,section};
     if(glass||col.finish==='glass'||options.doors==='ghost'){face.material=face.material.clone();face.material.transparent=true;face.material.opacity=options.doors==='ghost'?.15:.28;face.material.depthWrite=false;face.material.roughness=.12;face.userData.cabinetOwnMaterial=true;}
     if(glass){for(const y of [localBottom,localBottom+pose.height/1000-.018])syncPart(add(pivot,leaf-.002,.018,t+.002,local,y,0,'#333738'),"cabinet-model:site-7");for(const sign of [-1,1])syncPart(add(pivot,.018,pose.height/1000,t+.002,local+sign*(leaf/2-.01),localBottom,0,'#333738'),"cabinet-model:site-8");}
     else if(col.handle&&col.handle!=='none'){const vertical=!C.verticalDoor(kind);syncPart(add(pivot,vertical?.012:.12,vertical?.12:.012,.018,vertical?local+(pose.right?-1:1)*(leaf/2-.04):local,localBottom+(vertical?(top-bottom)/2:kind==='up'?.04:pose.height/1000-.04),.012,'#71685d'),"cabinet-model:site-9");}
     pivot.traverse(o=>{o.userData.cabinetPart={column:i,section,leaf:j};if(options.doors==='ghost')o.userData.cabinetIgnorePick=true;});g.add(pivot);
    }
   };
   bays.forEach((bay,i)=>{
    const col=c.columns[i],cw=bay.width/1000,x=bay.center/1000,drawerY=base-col.drawers.reduce((n,d)=>n+d.height,0)/1000;
    if(col.fridgeBay){
     const fh=s.fridgeHeight/1000,fd=(s.fridgeDepth??f.d)/1000,fz=back+fd/2;
     // Floor and rear remain clear for a separately placed refrigerator.
     for(const sign of [-1,1])syncPart(add(g,t,h,fd,x+sign*(cw/2+t/2),0,fz),"cabinet-model:site-10");
     syncPart(add(g,cw,t,fd,x,fh,fz),"cabinet-model:site-11").userData.cabinetSection='fridgeCeiling';syncPart(add(g,cw,t,fd,x,h-t,fz),"cabinet-model:site-12");
     syncPart(add(g,cw,h-fh-2*t,t,x,fh+t,back+t/2),"cabinet-model:site-13").userData.cabinetBay={column:i};door(col,i,fh+t,h,fd,'fridgeUpper');
    }else{
     for(const [bottom,top,D] of [[p+t,base-t,ld],[display+t,upper,ud],[upper+t,h-t,ud]]){
      if(bottom!==display+t)syncPart(add(g,cw,top-bottom,t,x,bottom,back+t/2),"cabinet-model:site-14").userData.cabinetBay={column:i};
      for(const sign of [-1,1]){
       const neighbor=i+(sign<0?-1:1);if(sign>0&&neighbor<bays.length&&!c.columns[neighbor].fridgeBay)continue;
       if(neighbor>=0&&neighbor<bays.length&&c.columns[neighbor].fridgeBay)continue;
       if(bottom===display+t&&neighbor>=0&&neighbor<bays.length&&C.sideboardDisplayGroups(f).some(group=>group.columns.includes(i)&&group.columns.includes(neighbor)))continue;
       const mesh=syncPart(add(g,t,top-bottom,D-t,x+sign*(cw/2+t/2),bottom,back+(D-t)/2),"cabinet-model:site-15");if(neighbor>=0&&neighbor<bays.length)mesh.userData.cabinetDivider={divider:i-1,column:i-1};else mesh.userData.cabinetSide=sign<0?'left':'right';
      }
     }
     if(col.drawers.length){
      syncPart(add(g,cw,t,ld-2*t,x,drawerY-t,back+ld/2),"cabinet-model:site-16").userData.cabinetSection='drawerSeparator';
      syncPart(add(g,cw,.012,.008,x,drawerY-.012,back+ld-t+.004,'#71685d'),"cabinet-model:site-17").userData.cabinetSection='drawerGrip';
      const dh=col.drawers[0].height/1000,lanes=C.drawerCount(col),span=faceSpan(i);
      for(let lane=1;lane<lanes;lane++)syncPart(add(g,t,dh-t,ld-2*t,x+(lane-lanes/2)*(cw+t)/lanes,drawerY,back+ld/2),"cabinet-model:site-18").userData.cabinetDrawerDivider=true;
      for(let lane=0;lane<lanes;lane++){
       const laneW=(cw-(lanes-1)*t)/lanes,laneX=x+(lane-(lanes-1)/2)*(laneW+t),faceW=(span.right-span.left)/lanes,faceX=span.left+faceW*(lane+.5),state=C.drawerState(col.drawers[0],lane),node=new THREE.Group(),faceColor=col.doorColor||(col.finish==='wood'?wood:color),bodyH=dh-t;
       node.position.z=state.open?ld*.7*(state.extension??1):0;
       node.userData.motion={kind:'cabinetdrawer',column:i,section:'storage',axis:'z',travel:ld*.7,closedZ:0};
       syncPart(add(node,faceW-.002,bodyH-.002,t,faceX,drawerY+.001,back+ld-t/2,faceColor),"cabinet-model:site-19").userData.cabinetDrawerBoard='front';
       syncPart(add(node,laneW-2*t,.012,ld-3*t,laneX,drawerY+.012,back+ld/2+t/2),"cabinet-model:site-20").userData.cabinetDrawerBoard='bottom';
       for(const sign of [-1,1])syncPart(add(node,t,bodyH-.03,ld-3*t,laneX+sign*(laneW/2-t),drawerY+.024,back+ld/2+t/2),"cabinet-model:site-21").userData.cabinetDrawerBoard='side';
       syncPart(add(node,laneW-2*t,bodyH-.03,t,laneX,drawerY+.024,back+1.5*t),"cabinet-model:site-22").userData.cabinetDrawerBoard='back';
       if(col.handle&&col.handle!=='none')syncPart(add(node,Math.min(.14,faceW*.4),.012,.018,faceX,drawerY+bodyH*.7,back+ld-.009,'#71685d'),"cabinet-model:site-23");
       node.traverse(o=>o.userData.cabinetPart={column:i,drawer:0,lane});g.add(node);
      }
     }
     door(col,i,p,drawerY-(col.drawers.length?.012:0),ld,'lower');door(col,i,upper,h,ud,'upper');
    }
    col.shelves.forEach((y,j)=>{const level=p+t+y/1000,D=col.fridgeBay?(s.fridgeDepth??f.d)/1000:level<base?ld:ud;syncPart(add(g,cw,t,D-2*t,x,level,back+D/2),"cabinet-model:site-24").userData.cabinetShelf={column:i,shelf:j};});
   });
   for(const group of C.sideboardDisplayGroups(f)){syncPart(add(g,group.width/1000,upper-display-t,t,(group.left+group.width/2)/1000,display+t,back+t/2),"cabinet-model:site-25").userData.cabinetBay={column:group.column};door(c.columns[group.column],group.column,display,upper,ud,'display',true,group);}
   if(options.outlines)g.traverse(o=>{if(o.isMesh){const edge=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry),new THREE.LineBasicMaterial({color:0x82776b,transparent:true,opacity:.4}));edge.userData.cabinetOwnMaterial=true;o.add(edge);}});
   return g;
  }
  // Split only the affected rectangle, retaining boards around a partial-depth hole.
  const sideBoard=(side,W,H,D,x,y,z,shade=bodyColor)=>{
   if(assembly?.[side]===false)return [];
   const joint=shared.find(v=>v.side===side);if(joint&&!joint.owner)return [];
   // Keep a wood rear edge inside each opening so adjacent backboards meet.
   // Removing the entire depth exposed a white slit between two cabinet backs.
   const relevant=cuts.filter(cut=>cut.side===side).map(cut=>({...cut,back:cut.back+c.thickness,bottom:cut.bottom-(joint?.owner?c.thickness:0),top:cut.top+(joint?.owner?c.thickness:0)})),ys=[y,y+H],zs=[z-D/2,z+D/2];
   const sideFinishes=finishes.filter(v=>v.side===side);for(const finish of sideFinishes)for(const value of [finish.bottom/1000,finish.top/1000])if(value>y&&value<y+H)ys.push(value);
   for(const cut of relevant){for(const value of [cut.bottom/1000,cut.top/1000])if(value>y&&value<y+H)ys.push(value);for(const value of [cut.back/1000,cut.front/1000])if(value>z-D/2&&value<z+D/2)zs.push(value);}
   ys.sort((a,b)=>a-b);zs.sort((a,b)=>a-b);const parts=[];
   for(let i=0;i<ys.length-1;i++)for(let j=0;j<zs.length-1;j++){const cy=(ys[i]+ys[i+1])/2,cz=(zs[j]+zs[j+1])/2;if(ys[i+1]-ys[i]<1e-8||zs[j+1]-zs[j]<1e-8||relevant.some(v=>cy>=v.bottom/1000&&cy<=v.top/1000&&cz>=v.back/1000&&cz<=v.front/1000))continue;const rearEdge=relevant.some(v=>cy>=v.bottom/1000&&cy<=v.top/1000&&cz<v.back/1000&&cz>=(v.back-c.thickness)/1000),joinedWood=sideFinishes.some(v=>cy>=v.bottom/1000&&cy<=v.top/1000),mesh=syncPart(add(g,W,ys[i+1]-ys[i],zs[j+1]-zs[j],x,ys[i],cz,rearEdge||joinedWood?wood:shade),"cabinet-model:site-26");mesh.userData.cabinetSide=side;if(joint)mesh.userData.cabinetSharedSide=true;if(rearEdge)mesh.userData.cabinetNicheRearEdge=true;parts.push(mesh);}return parts;
  };
  if(c.entry){
   const e=c.entry,shoe=p+e.shoeHeight/1000,lower=shoe+e.lowerHeight/1000,upper=lower+e.nicheHeight/1000,bays=C.layout(f);
   for(const joint of shared){const bay=bays[joint.side==='left'?0:bays.length-1];bay.width+=c.thickness;if(joint.side==='left')bay.left-=c.thickness;bay.center=bay.left+bay.width/2;}
   const interiorLeft=-w/2+(shared.some(v=>v.side==='left')?0:t),interiorRight=w/2-(shared.some(v=>v.side==='right')?0:t),interiorWidth=interiorRight-interiorLeft,interiorX=(interiorRight+interiorLeft)/2;
   if(p)syncPart(add(g,w,p,d-.04,0,0,-.02,wood),"cabinet-model:site-27");syncPart(add(g,w,t,bodyDepth,0,p,bodyZ),"cabinet-model:site-28");syncPart(add(g,w,t,bodyDepth,0,h-t,bodyZ),"cabinet-model:site-29");
   for(const [side,sign] of [['left',-1],['right',1]])sideBoard(side,t,h-p-2*t,bodyDepth,sign*(w/2-t/2),p+t,bodyZ);
   const extra=side=>Math.max(0,...finishes.filter(v=>v.side===side).map(v=>v.gap))/1000,edge=side=>{const common=shared.some(v=>v.side===side),open=e.openSide===side||e.openSide==='both';return open?t+extra(side)+(common?t:0):common?t:0;},leftEdge=edge('left'),rightEdge=edge('right');
   for(const level of [p+e.shoeHeight/2000,shoe,lower,upper+t]){const niche=level===lower||level===upper+t,counter=level===lower;const shelf=syncPart(add(g,niche?w-2*t+leftEdge+rightEdge:interiorWidth,t,counter?d-t:d-2*t,niche?(rightEdge-leftEdge)/2:interiorX,level-t,counter?t/2:level===upper+t?0:-t/2,wood),"cabinet-model:site-30");if(niche)shelf.userData.cabinetNicheSurface=counter?'counter':'ceiling';}
   syncPart(add(g,interiorWidth,e.nicheHeight/1000,t,interiorX,lower,-d/2+t/2,wood),"cabinet-model:site-31");
   syncPart(add(g,interiorWidth,shoe-p-t,t,interiorX,p+t,-d/2+t/2,wood),"cabinet-model:site-32");
   const led=syncPart(add(g,w-2*t,.004,.012,0,upper-.01,d/2-t-.012,'#ffe4ab'),"cabinet-model:site-33");led.material=led.material.clone();led.material.emissive=new THREE.Color('#ffe4ab');led.material.emissiveIntensity=.6;led.userData.cabinetOwnMaterial=true;
   c.columns.forEach((col,i)=>{
    const bay=bays[i],cw=bay.width/1000,x=bay.center/1000,drawerY=lower-col.drawers.reduce((n,v)=>n+v.height,0)/1000,faceColor=col.doorColor||(col.finish==='wood'?wood:color==='#d5c4bb'?'#f3f1ec':color),span=faceSpan(i),faceW=span.right-span.left,faceX=(span.left+span.right)/2;
    const handle=(parent,X,Y,Z,vertical=false)=>{const kind=col.handle||'bar';if(kind==='none')return;const m=syncPart(add(parent,kind==='knob'?.025:vertical?.012:Math.min(.14,faceW*.4),kind==='knob'?.025:vertical?.15:.012,.025,X,Y,Z,'#71685d'),"cabinet-model:site-34");if(kind==='knob'){m.geometry.dispose();m.geometry=new THREE.SphereGeometry(.0125,12,8);}};
    for(const [bottom,top] of [[shoe,lower-t],[upper+t,h-t]])syncPart(add(g,cw,top-bottom,t,x,bottom,-d/2+t/2),"cabinet-model:site-35").userData.cabinetBay={column:i};
    if(i)for(const [bottom,top] of [[shoe,lower-t],[upper+t,h-t]])syncPart(add(g,t,top-bottom,d-2*t,bay.left/1000-t/2,bottom,-t/2),"cabinet-model:site-36").userData.cabinetDivider={divider:i-1,column:i-1};
    col.shelves.forEach((y,j)=>syncPart(add(g,cw,t,d-2*t,x,p+t+y/1000,-t/2),"cabinet-model:site-37").userData.cabinetShelf={column:i,shelf:j});
    let y=drawerY;const lanes=C.drawerCount(col);for(let lane=1;lane<lanes;lane++)if(col.drawers.length)syncPart(add(g,t,lower-drawerY-t,d-2*t,x+(lane-lanes/2)*(cw+t)/lanes,drawerY,-t/2),"cabinet-model:site-38").userData.cabinetDrawerDivider=true;col.drawers.forEach((drawer,j)=>{const dh=drawer.height/1000;for(let lane=0;lane<lanes;lane++){const cw=(bay.width/1000-(lanes-1)*t)/lanes,x=bay.center/1000+(lane-(lanes-1)/2)*(cw+t),faceW=(span.right-span.left)/lanes,faceX=span.left+faceW*(lane+.5),state=C.drawerState(drawer,lane),bodyH=dh-(j===col.drawers.length-1?t:0),node=new THREE.Group();node.position.z=state.open?d*.7*(state.extension??1):0;
     syncPart(add(node,faceW-.002,bodyH-.002,t,faceX,y+.001,d/2-t/2,faceColor),"cabinet-model:site-39").userData.cabinetDrawerBoard='front';
     syncPart(add(node,cw-2*t,.012,d-3*t,x,y+.012,t/2),"cabinet-model:site-40");for(const sign of [-1,1])syncPart(add(node,t,bodyH-.03,d-3*t,x+sign*(cw/2-t),y+.024,t/2),"cabinet-model:site-41");syncPart(add(node,cw-2*t,bodyH-.03,t,x,y+.024,-d/2+1.5*t),"cabinet-model:site-42");
     node.userData.motion={kind:'cabinetdrawer',column:i,section:'storage',axis:'z',travel:d*.7,closedZ:0};handle(node,faceX,y+bodyH*.7,d/2+.012);node.traverse(o=>o.userData.cabinetPart={column:i,drawer:j,lane});g.add(node);}y+=dh;});
    if(col.door==='none'||options.doors==='hidden')return;
    for(const [bottom,top,section] of [[shoe-t+faceInset,(col.drawers.length?drawerY:lower-t)-faceInset,'lower'],[upper+faceInset,h-faceInset,'upper']]){
     const count=col.door==='double'?2:1,leaf=faceW/count;
     for(let j=0;j<count;j++){const pose=C.doorPose(col.door,span.left*1000,span.right*1000,bottom*1000,top*1000,(d/2-t/2)*1000,j,count,C.doorPairing(col),C.doorSingleHinge(col,col.door),col.doorLayout),pivot=new THREE.Group();pivot.position.set(...pose.pivot.map(v=>v/1000));pivot.rotation[pose.axis]=rotation(pose,C.doorAngle(c,col,section));
      const face=syncPart(add(pivot,pose.width/1000,pose.height/1000,t,pose.localX/1000,pose.localBottom/1000,0,faceColor),"cabinet-model:site-43");face.userData.cabinetSection=section;face.userData.cabinetDoorSize={width:pose.width,height:pose.height,leaf:j,section};
      if(options.doors==='ghost'||col.finish==='glass'){face.material=face.material.clone();face.material.transparent=true;face.material.opacity=options.doors==='ghost'?.15:.32;face.material.depthWrite=false;face.userData.cabinetOwnMaterial=true;}
      const local=pose.localX/1000,vertical=!C.verticalDoor(col.door);handle(pivot,vertical?local+(pose.right?-1:1)*(leaf/2-.04):local,pose.localBottom/1000+(vertical?(top-bottom)*.5:col.door==='up'?.04:pose.height/1000-.04),.025,vertical);
      pivot.traverse(o=>{o.userData.cabinetPart={column:i,section,leaf:j};if(options.doors==='ghost')o.userData.cabinetIgnorePick=true;});g.add(pivot);
      pivot.userData.motion={kind:'cabinetdoor',column:i,section:'storage',leaf:j,axis:pose.axis,angle:pose.sign*C.maxDoorAngle(c,col)*Math.PI/180};
     }
    }
   });
   if(options.outlines)g.traverse(o=>{if(o.isMesh){const edge=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry),new THREE.LineBasicMaterial({color:0x82776b,transparent:true,opacity:.55}));edge.userData.cabinetOwnMaterial=true;o.add(edge);}});return g;
  }
  if(hasLower&&p&&!options.floorOpen)syncPart(add(g,w,p,d-.04,0,0,-.02,wood),"cabinet-model:site-44").userData.cabinetSection='plinth';
  const movable=col=>col.top==='drawer';
  if(c.hoodBayHeight!==undefined){const bays=C.layout(f),bay=bays[1];for(const i of [0,2]){const left=i===0?-w/2:(bay.left+bay.width)/1000,right=i===2?w/2:bay.left/1000;syncPart(add(g,right-left,t,bodyDepth,(left+right)/2,p,bodyZ),"cabinet-model:site-45").userData.cabinetSection='hoodSideBottom';}if(C.hoodBayCeiling(f,c))syncPart(add(g,bay.width/1000,t,bodyDepth,bay.center/1000,c.hoodBayHeight/1000,bodyZ),"cabinet-model:site-46").userData.cabinetSection='hoodCeiling';}
  else if(hasLower&&!options.floorOpen)syncPart(add(g,w,t,bodyDepth,0,p,bodyZ),"cabinet-model:site-47").userData.cabinetSection='bottom';if(hasUpper&&!c.columns.some(movable))syncPart(add(g,w,t,bodyDepth,0,h-t,bodyZ),"cabinet-model:site-48").userData.cabinetTop=true;
  const bays=C.layout(f),inner=h-p-2*t;
  bays.forEach((bay,i)=>{
   if(!movable(c.columns[i])){
    const col=c.columns[i],cw=bay.width/1000,x=bay.center/1000,base=p+t;
    if(!col.pegboard){const start=c.hoodBayHeight!==undefined&&i===1?c.hoodBayHeight/1000+t:base;if(c.backPanel!==false)syncPart(add(g,cw,h-t-start,t,x,start,-d/2+t/2),"cabinet-model:site-49").userData.cabinetBay={column:i};}
    else{
     const bottom=col.drawers.reduce((n,v)=>n+v.height,0)/1000,top=col.doorBottom/1000-t,H=top-bottom,wood='#bc936b';
     if(hasLower&&bottom>0)syncPart(add(g,cw,bottom,t,x,base,-d/2+t/2),"cabinet-model:site-50");
     if(hasUpper)syncPart(add(g,cw,inner-top,t,x,base+top,-d/2+t/2),"cabinet-model:site-51");
     const grid=C.pegboardHoles(f,i,c),radius=grid.diameter/2000,panelThickness=(assembly?.thickness??12)/1000,hatch=C.pegboardHatch(f,i,c);
     const holes=[];for(let a=0;a<grid.columns;a++)for(let b=0;b<grid.rows;b++)holes.push([-cw/2+(grid.marginX+grid.pitchX*a)/1000,(grid.marginY+grid.pitchY*b)/1000]);
     function panel(parent,rect,originX=0,originY=0,moving=false,opening=null){
      const [left,right,bottom,top]=rect;if(right-left<1e-8||top-bottom<1e-8)return;
      const shape=new THREE.Shape();shape.moveTo(left-originX,bottom-originY);shape.lineTo(right-originX,bottom-originY);shape.lineTo(right-originX,top-originY);shape.lineTo(left-originX,top-originY);shape.closePath();
      if(opening){const [l,r,b,t]=opening,hole=new THREE.Path();hole.moveTo(l,b);hole.lineTo(l,t);hole.lineTo(r,t);hole.lineTo(r,b);hole.closePath();shape.holes.push(hole);}
      for(const [hx,hy] of holes)if(hx-radius>left&&hx+radius<right&&hy-radius>bottom&&hy+radius<top&&(!opening||hx+radius<opening[0]||hx-radius>opening[1]||hy+radius<opening[2]||hy-radius>opening[3])){const hole=new THREE.Path();hole.absarc(hx-originX,hy-originY,radius,0,Math.PI*2,true);shape.holes.push(hole);}
      const mesh=syncPart(add(parent,right-left,top-bottom,panelThickness,0,0,0,wood),"cabinet-model:site-52");mesh.geometry.dispose();mesh.geometry=new THREE.ExtrudeGeometry(shape,{depth:panelThickness,bevelEnabled:false,curveSegments:8});mesh.position.set(moving?0:x,moving?0:base+col.drawers.reduce((n,v)=>n+v.height,0)/1000,moving?-panelThickness:-d/2+t);mesh.userData.cabinetBay={column:i};mesh.userData.cabinetPegboard=true;
      if(moving){mesh.userData.cabinetPart={column:i,section:'pegboardHatch'};if(options.doors==='ghost'){mesh.material=mesh.material.clone();mesh.material.transparent=true;mesh.material.opacity=.15;mesh.userData.cabinetOwnMaterial=true;}}
     }
     if(!hatch)panel(g,[-cw/2,cw/2,0,H]);
     else{
      const left=hatch.left/1000-x,right=left+hatch.w/1000,bottom=hatch.bottom/1000-(base+col.drawers.reduce((n,v)=>n+v.height,0)/1000),top=bottom+hatch.h/1000,gap=hatch.gap/1000;
      panel(g,[-cw/2,cw/2,0,H],0,0,false,[left,right,bottom,top]);
      if(options.doors!=='hidden'){const hinge=hatch.hinge==='left'?left+gap:right-gap,sign=hatch.hinge==='left'?-1:1,pivot=new THREE.Group();pivot.position.set(x+hinge,base+col.drawers.reduce((n,v)=>n+v.height,0)/1000+bottom+gap,-d/2+t+panelThickness);pivot.rotation.y=hatch.open?sign*hatch.angle*Math.PI/180:0;pivot.userData.motion={kind:'cabinetdoor',column:i,section:'pegboardHatch',axis:'y',angle:sign*hatch.angle*Math.PI/180};pivot.userData.cabinetPart={column:i,section:'pegboardHatch'};panel(pivot,[left+gap,right-gap,bottom+gap,top-gap],hinge,bottom+gap,true);g.add(pivot);}
     }
     if(!entryStyle)for(const side of [-1,1]){const outer=side<0&&i===0||side>0&&i===bays.length-1;if(outer)sideBoard(side<0?'left':'right',.006,H,d-t,x+side*(cw/2-.003),base+bottom,t/2,wood);else syncPart(add(g,.006,H,d-t,x+side*(cw/2-.003),base+bottom,t/2,wood),"cabinet-model:site-53");}
     if(hasLower)syncPart(add(g,cw,t,d-t,x,base+bottom-(entryStyle?t:0),t/2,wood),"cabinet-model:site-54");
     if(hasUpper)syncPart(add(g,cw,.006,d-2*t,x,base+top-.006,-t/2,wood),"cabinet-model:site-55");
     if(assembly?.displayShelves!==false)for(const level of [.68,.8])syncPart(add(g,cw*.72,.015,Math.min(.12,d-3*t),x-cw*.1,base+bottom+H*level,-d/2+t+.06,wood),"cabinet-model:site-56").userData.cabinetAccessory='displayShelf';
     if(assembly?.hooks!==false)for(const offset of [-.28,0,.28]){syncPart(add(g,.012,.06,.012,x+cw*offset,base+bottom+H*.48,-d/2+t+.018,'#806647'),"cabinet-model:site-57").userData.cabinetAccessory='hook';syncPart(add(g,.012,.012,.045,x+cw*offset,base+bottom+H*.48,-d/2+t+.035,'#806647'),"cabinet-model:site-58").userData.cabinetAccessory='hook';}
     if(assembly?.light!==false){const led=syncPart(add(g,cw-.025,.004,.012,x,base+top-.01,d/2-t-.012,'#ffe4ab'),"cabinet-model:site-59");led.userData.cabinetAccessory='light';led.material=led.material.clone();led.material.emissive=new THREE.Color('#ffe4ab');led.material.emissiveIntensity=.6;led.userData.cabinetOwnMaterial=true;
     }
    }
   }
   if(!i)sideBoard('left',t,h-p-(options.floorOpen?t:2*t),bodyDepth,bay.left/1000-t/2,p+(options.floorOpen?0:t),bodyZ);else syncPart(add(g,t,h-p-(options.floorOpen?t:2*t),bodyDepth,bay.left/1000-t/2,p+(options.floorOpen?0:t),bodyZ),"cabinet-model:site-60").userData.cabinetDivider={divider:i-1,column:i-1};
  });
  sideBoard('right',t,h-p-(options.floorOpen?t:2*t),bodyDepth,w/2-t/2,p+(options.floorOpen?0:t),bodyZ);
  c.columns.forEach((col,i)=>{
   const cw=bays[i].width/1000,x=bays[i].center/1000,base=p+t;
   const handle=col.handle||'bar',faceColor=col.doorColor||(col.finish==='wood'?wood:entryStyle&&color==='#d5c4bb'?'#f3f1ec':color);
   if(c.columns.some(movable)){
    const left=(i===0?-w/2:(bays[i].left-c.thickness/2)/1000),right=(i===bays.length-1?w/2:(bays[i].left+bays[i].width+c.thickness/2)/1000),W=right-left-.002;
    if(movable(col)){
     // Top, front and tray share one horizontal drawer translation.
     const lid=new THREE.Group();lid.position.set((left+right)/2,h-t,d/2+(col.top==='drawer'&&col.topOpen?d*.7:0));
     lid.userData.motion={kind:'cabinetdrawer',column:i,section:'storage',axis:'z',travel:d*.7,closedZ:d/2};
     const gap=(col.cableGap||0)/1000,rear=-d+gap,notch=Math.min(.12,W*.35),cut=gap?Math.min(.015,d*.05):0,shape=new THREE.Shape();
     shape.moveTo(-W/2,0);shape.lineTo(W/2,0);shape.lineTo(W/2,rear);shape.lineTo(notch/2+.015,rear);shape.lineTo(notch/2,rear+cut);shape.lineTo(-notch/2,rear+cut);shape.lineTo(-notch/2-.015,rear);shape.lineTo(-W/2,rear);shape.closePath();
     const face=syncPart(add(lid,W,t,d,0,0,-d/2),"cabinet-model:site-61");face.geometry.dispose();face.geometry=new THREE.ExtrudeGeometry(shape,{depth:t,bevelEnabled:false});face.geometry.rotateX(Math.PI/2);face.position.set(0,t,0);face.userData.cabinetPart={column:i,lid:true};g.add(lid);
     if(col.top==='drawer'){
      syncPart(add(lid,cw-.004,inner,t,0,-inner,-t/2,faceColor),"cabinet-model:site-62").userData.cabinetDrawerBoard='front';
      // Tray front ends at the front panel's inner face (local Z = -t).
      const depth=d-3*t,center=-d/2+t/2;
      syncPart(add(lid,cw-2*t,.012,depth,0,-inner+.012,center),"cabinet-model:site-63").userData.cabinetDrawerBoard='bottom';
      for(const side of [-1,1])syncPart(add(lid,t,Math.max(.04,inner-.04),depth,side*(cw/2-t),-inner+.024,center),"cabinet-model:site-64").userData.cabinetDrawerBoard='side';
      lid.traverse(o=>o.userData.cabinetPart={column:i,lid:true});
     }else syncPart(add(g,cw,inner,t,x,base,d/2-t/2,faceColor),"cabinet-model:site-65");
    }else syncPart(add(g,W,t,d,(left+right)/2,h-t,0),"cabinet-model:site-66");
   }
   const handleMesh=(parent,X,Y,Z,vertical=false)=>{if(handle==='none')return;const mesh=syncPart(add(parent,handle==='knob'?.025:vertical?.012:Math.min(.14,cw*.4),handle==='knob'?.025:vertical?.15:.012,.025,X,Y,Z,'#71685d'),"cabinet-model:site-67");if(handle==='knob'){mesh.geometry.dispose();mesh.geometry=new THREE.SphereGeometry(.0125,12,8);}};
   if(hasUpper)col.shelves.forEach((y,j)=>{syncPart(add(g,cw,t,d-2*t,x,base+y/1000,-t/2),"cabinet-model:site-68").userData.cabinetShelf={column:i,shelf:j};});
   let y=base;const lanes=C.drawerCount(col),drawerHeight=col.drawers.reduce((sum,v)=>sum+v.height,0)/1000;for(let lane=1;lane<lanes;lane++)if(hasLower&&drawerHeight)syncPart(add(g,t,drawerHeight,d-2*t,x+(lane-lanes/2)*(cw+t)/lanes,base,-t/2),"cabinet-model:site-69").userData.cabinetDrawerDivider=true;
   if(hasLower)col.drawers.forEach((drawer,j)=>{
    const dh=drawer.height/1000;for(let lane=0;lane<lanes;lane++){const cw=(bays[i].width/1000-(lanes-1)*t)/lanes,x=bays[i].center/1000+(lane-(lanes-1)/2)*(cw+t),state=C.drawerState(drawer,lane),node=new THREE.Group();node.position.z=state.open?d*.7*(state.extension??1):0;
    node.userData.motion={kind:'cabinetdrawer',column:i,section:'storage',axis:'z',travel:d*.7,closedZ:0};
    const fullSpan=faceSpan(i),span={left:fullSpan.left+(fullSpan.right-fullSpan.left)*lane/lanes,right:fullSpan.left+(fullSpan.right-fullSpan.left)*(lane+1)/lanes},frontBottom=entryStyle&&j===0?p:y,bodyDh=dh-(entryStyle&&j===col.drawers.length-1?t:0);
    if(col.drawerStyle==='dish-basket'){
     // Two exterior fronts; the third runner carries a recessed cutlery tray.
     const hidden=j===2,top=j===1?C.frontHeight(f,c)/1000-faceInset:y+dh;
     if(!hidden){syncPart(add(node,span.right-span.left-.002,top-frontBottom-.002,t,(span.left+span.right)/2,frontBottom+.001,d/2-t/2,faceColor),"cabinet-model:site-70").userData.cabinetDrawerBoard='front';handleMesh(node,x,frontBottom+(top-frontBottom)*.7,d/2+.012);}
     const width=cw-.024,inset=Math.min(.016,(d-3*t)*.3),depth=d-3*t-inset,center=t/2-inset/2,rear=center-depth/2,front=center+depth/2,railH=Math.min(dh-.03,hidden?.055:.15),metal='#b8bdc1';
     const bar=(W,H,D,X,Y,Z,part)=>{const mesh=syncPart(add(node,W,H,D,X,Y,Z,metal),"cabinet-model:site-71");mesh.userData.cabinetBasketPart=part;mesh.material=mesh.material.clone();mesh.material.metalness=.65;mesh.material.roughness=.28;mesh.userData.cabinetOwnMaterial=true;return mesh;};
     bar(width,.005,depth,x,y+.012,center,'tray');
     for(const side of [-1,1]){bar(.006,railH,depth,x+side*width/2,y+.017,center,'side');bar(.009,.012,depth,x+side*(width/2+.004),y+.023,center,'runner');}
     for(const Z of [rear,front])bar(width,.008,.005,x,y+.017+railH-.008,Z,'rim');
     if(hidden){for(let divider=1;divider<4;divider++)bar(.004,railH*.65,depth,x-width/2+width*divider/4,y+.017,center,'cutlery-divider');bar(width,railH*.65,.005,x,y+.017,front,'inner-front');}
     else {const count=Math.min(20,Math.max(4,Math.round(width/.055)));for(let rack=1;rack<count;rack++){const X=x-width/2+width*rack/count;bar(.004,.004,depth,X,y+.018,center,'rack');if(j===0)bar(.004,railH*.65,.004,X,y+.019,rear+.012,'plate-divider');}}
     node.traverse(o=>o.userData.cabinetPart={column:i,drawer:j,lane});g.add(node);continue;
    }
    const frontTop=C.kitchenOverlay(f,c)&&col.door==='none'&&j===col.drawers.length-1?C.frontHeight(f,c)/1000-faceInset:y+bodyDh;
    syncPart(add(node,entryStyle?span.right-span.left-.002:cw-.004,entryStyle?frontTop-frontBottom-.002:dh-.004,t,entryStyle?(span.left+span.right)/2:x,entryStyle?frontBottom+.001:y,d/2-t/2,entryStyle?faceColor:color),"cabinet-model:site-72").userData.cabinetDrawerBoard='front';
    // Body spans from the rear panel's inner face to the front panel's inner face.
    syncPart(add(node,cw-.02,.012,d-3*t,x,y+.012,t/2),"cabinet-model:site-73").userData.cabinetDrawerBoard='bottom';
    for(const side of [-1,1])syncPart(add(node,t,bodyDh-.03,d-3*t,x+side*(cw/2-t),y+.024,t/2),"cabinet-model:site-74").userData.cabinetDrawerBoard='side';
    syncPart(add(node,cw-.02,bodyDh-.03,t,x,y+.024,-d/2+1.5*t),"cabinet-model:site-75").userData.cabinetDrawerBoard='back';
    handleMesh(node,x,y+dh*.7,d/2+.012);
    node.traverse(o=>o.userData.cabinetPart={column:i,drawer:j,lane});g.add(node);}y+=dh;
   });
   if(col.doorBottom!==undefined)y=base+col.doorBottom/1000;
   const door=C.frontDoor(f,i,c);if(door==='none'||options.doors==='hidden')return;
   const span=faceSpan(i),doorBottom=y-t+faceInset,doorTop=C.frontHeight(f,c)/1000-faceInset,count=C.frontLeafCount(f,i,c),dh=doorTop-doorBottom;
   for(let j=0;j<count;j++){
    const front=d/2-(entryStyle||c.doorOverlay!==undefined||col.doorBottom!==undefined?t/2:0),pose=C.doorPose(door,span.left*1000,span.right*1000,doorBottom*1000,doorTop*1000,front*1000,j,count,C.doorPairing(col),C.doorSingleHinge(col,door),col.doorLayout,col.doorRatios),pivot=new THREE.Group();
    pivot.position.set(...pose.pivot.map(v=>v/1000));pivot.rotation[pose.axis]=rotation(pose,C.doorLeafAngle(c,col,j));
    pivot.userData.motion={kind:'cabinetdoor',column:i,section:'storage',leaf:j,axis:pose.axis,angle:pose.sign*C.maxDoorAngle(c,col)*Math.PI/180};
    const local=pose.localX/1000,vertical=!C.verticalDoor(door);
    const face=syncPart(add(pivot,pose.width/1000,pose.height/1000,t,local,pose.localBottom/1000,0,faceColor),"cabinet-model:site-76");
    face.userData.cabinetDoorSize={width:pose.width,height:pose.height,leaf:j,section:'storage'};
    if(col.finish==='glass'||options.doors==='ghost'){face.material=face.material.clone();face.userData.cabinetOwnMaterial=true;face.material.transparent=true;face.material.opacity=options.doors==='ghost'?.15:.32;face.material.depthWrite=false;face.material.roughness=.15;}
    handleMesh(pivot,vertical?local+(pose.right?-1:1)*((pose.width+2)/2000-.04):local,pose.localBottom/1000+(vertical?dh*.5:door==='up'?.04:pose.height/1000-.04),.025,vertical);
    if(options.doors==='ghost')pivot.traverse(o=>o.userData.cabinetIgnorePick=true);
    pivot.traverse(o=>o.userData.cabinetPart={column:i,leaf:j});g.add(pivot);
   }
  });
  if(options.outlines)g.traverse(o=>{if(o.isMesh){const edges=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry),new THREE.LineBasicMaterial({color:0x82776b,transparent:true,opacity:.55}));edges.userData.cabinetOwnMaterial=true;o.add(edges);}});
  const placement=C.pegboardPlacement(f,c);if(placement?.offset)for(const child of g.children)child.position.y+=placement.offset/1000;
  return g;
 }
 function build(THREE,f,box,options={}){
  const model=buildRaw(THREE,f,box,options);
  // Capture the actual exterior front before service cuts replace its geometry.
  model.traverse(o=>{if(o.userData.cabinetDrawerBoard!=='front')return;const p=o.geometry.parameters;o.userData.cabinetDrawerSize={width:p.width*1000,height:p.height*1000};});
  return cutServices(THREE,model,f,{...options,cabinetOnly:f.type==='vanity'});
 }
 function cutServices(THREE,g,f,options={}){
  const services=root.FurnishServices;
  const pipes=services&&options.plan?services.pipes(options.plan).map(p=>{const z=(root.FurnishProducts||require('../core/product-rules.js')).floorBase(options.plan,f,options.furniture).z;return {...p,vertical:{bottom:p.vertical.bottom-z,top:p.vertical.top-z}};}).filter(p=>services.bodyHit(f,p,0)):[];
  if(!pipes.length)return g;
  // Cut in the closed pose once. The resulting holes travel with moving parts.
  const transforms=[];
  g.traverse(o=>{if(o.isGroup&&o.userData.cabinetPart){transforms.push([o,o.position.clone(),o.rotation.clone()]);o.rotation.set(0,0,0);if(o.userData.cabinetPart.lid)o.position.z=f.d/2000;else if(o.userData.cabinetPart.drawer!==undefined)o.position.z=0;}});
  g.updateMatrixWorld(true);
  for(const pipe of pipes){
   const local=services.local(f,pipe,{cabinetOnly:!!options.cabinetOnly}),height=(local.vertical.top-local.vertical.bottom)/1000;
   const cutter=new THREE.CylinderGeometry(pipe.radius/1000/Math.cos(Math.PI/64),pipe.radius/1000/Math.cos(Math.PI/64),height,64);cutter.translate(local.at[0]/1000,local.vertical.bottom/1000+height/2,local.at[1]/1000);
   const cutterBox=new THREE.Box3().setFromBufferAttribute(cutter.attributes.position);
   g.traverse(o=>{if(!o.isMesh)return;const bounds=new THREE.Box3().setFromBufferAttribute(o.geometry.attributes.position).applyMatrix4(o.matrixWorld);if(!bounds.intersectsBox(cutterBox))return;
    const geometry=root.FurnishSolidCut.subtract(THREE,o.geometry,o.matrixWorld,cutter);o.geometry.dispose();o.geometry=geometry;o.userData.serviceCuts=[...(o.userData.serviceCuts||[]),pipe.id];
    for(const edge of [...o.children])if(edge.isLineSegments){o.remove(edge);edge.geometry.dispose();edge.geometry=new THREE.EdgesGeometry(geometry);o.add(edge);}
   });cutter.dispose();
  }
  for(const [o,position,rotation]of transforms){o.position.copy(position);o.rotation.copy(rotation);}g.updateMatrixWorld(true);g.userData.serviceCuts=pipes.map(p=>p.id);return g;
 }
 root.FurnishCabinetModel={build,cutServices,buildRaw};
 if(typeof module!=='undefined')module.exports=root.FurnishCabinetModel;
})(typeof globalThis!=='undefined'?globalThis:this);
