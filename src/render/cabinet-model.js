/* Shared Three.js cabinet construction. box uses bottom-based vertical coordinates. */
(function(root){
 function build(THREE,f,box,options={}){
  const C=root.FurnishCabinet,c=C.config(f),h=C.height(f)/1000,w=f.w/1000,d=f.d/1000,t=c.thickness/1000,p=c.plinth/1000,g=new THREE.Group(),color=f.color||C.palette.front;
  const entryStyle=!!c.entry||c.template==='entry-pegboard',wood=C.palette.body,bodyColor=wood,shared=C.sharedSides(f,options.furniture||[]),bodyDepth=entryStyle?d-t:d,bodyZ=entryStyle?-t/2:0;
  const add=(parent,W,H,D,x,y,z,shade=bodyColor)=>{const mesh=box(W,H,D,shade,x,y,z);parent.add(mesh);return mesh;};
  const nominalBays=C.layout(f),faceSpan=i=>({left:i===0?-w/2:(nominalBays[i].left-c.thickness/2)/1000,right:i===nominalBays.length-1?w/2:(nominalBays[i].left+nominalBays[i].width+c.thickness/2)/1000});
  const cuts=options.sideCuts||C.sideOpenings(f,options.furniture||[]);
  const finishes=C.joinedSideFinishes(f,options.furniture||[]);
  if(c.sideboard){
   const s=c.sideboard,bays=C.layout(f),base=s.baseHeight/1000,ct=s.counterThickness/1000,niche=base+ct,display=niche+s.nicheHeight/1000,upper=display+s.displayHeight/1000,ld=s.lowerDepth/1000,ud=s.upperDepth/1000,back=-d/2;
   const storage=bays.filter((_,i)=>!c.columns[i].fridgeBay),left=storage[0].left/1000-t,right=(storage.at(-1).left+storage.at(-1).width)/1000+t,W=right-left,X=(left+right)/2;
   // Continuous counter and open working space: no vertical partitions in the niche.
   for(const [y,H,D,section] of [[p,t,ld,'bottom'],[base-t,t,ld,'baseTop'],[base,ct,ld,'counter'],[display,t,ud,'displayBottom'],[upper,t,ud,'displayTop'],[h-t,t,ud,'top']])add(g,W,H,D,X,y,back+D/2).userData.cabinetSection=section;
   if(p)add(g,W,p,ld-.025,X,0,back+(ld-.025)/2);
   const backLeft=left+(c.columns[0].fridgeBay?t:0),backRight=right-(c.columns.at(-1).fridgeBay?t:0);
   add(g,backRight-backLeft,s.nicheHeight/1000,t,(backLeft+backRight)/2,niche,back+t/2).userData.cabinetSection='operationBack';
   for(const [y,D] of [[display,ud],[upper,ud]]){
    const led=add(g,W-2*t,.004,.012,X,y+.008,back+D-t-.014,'#ffe4ab');led.material=led.material.clone();led.material.emissive=new THREE.Color('#ffe4ab');led.material.emissiveIntensity=.7;led.userData.cabinetOwnMaterial=true;led.userData.cabinetSection='led';
   }
   const door=(col,i,bottom,top,D,section,glass=false,span)=>{
    if(col.door==='none'||options.doors==='hidden')return;
    const bay=span||bays[i],count=glass?1:col.door==='double'?2:1,cw=bay.width/1000,leaf=cw/count;
    for(let j=0;j<count;j++){
     const rightHinge=col.door==='right'||col.door==='double'&&j===1,pivot=new THREE.Group(),center=bay.left/1000+leaf*(j+.5),local=glass?0:(rightHinge?-1:1)*leaf/2;
     pivot.position.set(glass?center:center+(rightHinge?1:-1)*leaf/2,glass?top-.001:bottom+.001,back+D-t/2);if(glass)pivot.rotation.x=col.displayOpen?-Math.min(col.displayAngle??C.maxDoorAngle(c),C.maxDoorAngle(c))*Math.PI/180:0;else pivot.rotation.y=col.doorOpen?(rightHinge?1:-1)*C.doorAngle(c,col)*Math.PI/180:0;
     const face=add(pivot,leaf-.002,top-bottom-.002,t,local,glass?-(top-bottom-.002):0,0,glass?'#b3c5c8':col.doorColor||(col.finish==='wood'?wood:color));face.userData.cabinetSection=section;
     if(glass||col.finish==='glass'||options.doors==='ghost'){face.material=face.material.clone();face.material.transparent=true;face.material.opacity=options.doors==='ghost'?.15:.28;face.material.depthWrite=false;face.material.roughness=.12;face.userData.cabinetOwnMaterial=true;}
     if(glass){for(const y of [-(top-bottom-.002),-.018])add(pivot,leaf-.002,.018,t+.002,local,y,0,'#333738');for(const sign of [-1,1])add(pivot,.018,top-bottom-.002,t+.002,local+sign*(leaf/2-.01),-(top-bottom-.002),0,'#333738');}
     else if(col.handle&&col.handle!=='none')add(pivot,.012,.12,.018,local+(rightHinge?-1:1)*(leaf/2-.04),(top-bottom)/2,.012,'#71685d');
     pivot.traverse(o=>{o.userData.cabinetPart={column:i,section};if(options.doors==='ghost')o.userData.cabinetIgnorePick=true;});g.add(pivot);
    }
   };
   bays.forEach((bay,i)=>{
    const col=c.columns[i],cw=bay.width/1000,x=bay.center/1000,drawerY=base-col.drawers.reduce((n,d)=>n+d.height,0)/1000;
    if(col.fridgeBay){
     const fh=s.fridgeHeight/1000,fd=(s.fridgeDepth??f.d)/1000,fz=back+fd/2;
     // Floor and rear remain clear for a separately placed refrigerator.
     for(const sign of [-1,1])add(g,t,h,fd,x+sign*(cw/2+t/2),0,fz);
     add(g,cw,t,fd,x,fh,fz).userData.cabinetSection='fridgeCeiling';add(g,cw,t,fd,x,h-t,fz);
     add(g,cw,h-fh-2*t,t,x,fh+t,back+t/2).userData.cabinetBay={column:i};door(col,i,fh+t,h,fd,'fridgeUpper');
    }else{
     for(const [bottom,top,D] of [[p+t,base-t,ld],[display+t,upper,ud],[upper+t,h-t,ud]]){
      if(bottom!==display+t)add(g,cw,top-bottom,t,x,bottom,back+t/2).userData.cabinetBay={column:i};
      for(const sign of [-1,1]){
       const neighbor=i+(sign<0?-1:1);if(sign>0&&neighbor<bays.length&&!c.columns[neighbor].fridgeBay)continue;
       if(neighbor>=0&&neighbor<bays.length&&c.columns[neighbor].fridgeBay)continue;
       if(bottom===display+t&&neighbor>=0&&neighbor<bays.length&&C.sideboardDisplayGroups(f).some(group=>group.columns.includes(i)&&group.columns.includes(neighbor)))continue;
       const mesh=add(g,t,top-bottom,D-t,x+sign*(cw/2+t/2),bottom,back+(D-t)/2);if(neighbor>=0&&neighbor<bays.length)mesh.userData.cabinetDivider={divider:i-1,column:i-1};
      }
     }
     if(col.drawers.length){
      add(g,cw,t,ld-2*t,x,drawerY-t,back+ld/2).userData.cabinetSection='drawerSeparator';
      add(g,cw,.012,.008,x,drawerY-.012,back+ld-t+.004,'#71685d').userData.cabinetSection='drawerGrip';
      const dh=col.drawers[0].height/1000,lanes=C.drawerCount(col),span=faceSpan(i);
      for(let lane=1;lane<lanes;lane++)add(g,t,dh-t,ld-2*t,x+(lane-lanes/2)*(cw+t)/lanes,drawerY,back+ld/2).userData.cabinetDrawerDivider=true;
      for(let lane=0;lane<lanes;lane++){
       const laneW=(cw-(lanes-1)*t)/lanes,laneX=x+(lane-(lanes-1)/2)*(laneW+t),faceW=(span.right-span.left)/lanes,faceX=span.left+faceW*(lane+.5),state=C.drawerState(col.drawers[0],lane),node=new THREE.Group(),faceColor=col.doorColor||(col.finish==='wood'?wood:color),bodyH=dh-t;
       node.position.z=state.open?ld*.7*(state.extension??1):0;
       add(node,faceW-.002,bodyH-.002,t,faceX,drawerY+.001,back+ld-t/2,faceColor).userData.cabinetDrawerBoard='front';
       add(node,laneW-2*t,.012,ld-3*t,laneX,drawerY+.012,back+ld/2+t/2).userData.cabinetDrawerBoard='bottom';
       for(const sign of [-1,1])add(node,t,bodyH-.03,ld-3*t,laneX+sign*(laneW/2-t),drawerY+.024,back+ld/2+t/2).userData.cabinetDrawerBoard='side';
       add(node,laneW-2*t,bodyH-.03,t,laneX,drawerY+.024,back+1.5*t).userData.cabinetDrawerBoard='back';
       if(col.handle&&col.handle!=='none')add(node,Math.min(.14,faceW*.4),.012,.018,faceX,drawerY+bodyH*.7,back+ld-.009,'#71685d');
       node.traverse(o=>o.userData.cabinetPart={column:i,drawer:0,lane});g.add(node);
      }
     }
     door(col,i,p,drawerY-(col.drawers.length?.012:0),ld,'lower');door(col,i,upper,h,ud,'upper');
    }
    col.shelves.forEach((y,j)=>{const level=p+t+y/1000,D=col.fridgeBay?(s.fridgeDepth??f.d)/1000:level<base?ld:ud;add(g,cw,t,D-2*t,x,level,back+D/2).userData.cabinetShelf={column:i,shelf:j};});
   });
   for(const group of C.sideboardDisplayGroups(f)){add(g,group.width/1000,upper-display-t,t,(group.left+group.width/2)/1000,display+t,back+t/2).userData.cabinetBay={column:group.column};door(c.columns[group.column],group.column,display,upper,ud,'display',true,group);}
   if(options.outlines)g.traverse(o=>{if(o.isMesh){const edge=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry),new THREE.LineBasicMaterial({color:0x82776b,transparent:true,opacity:.4}));edge.userData.cabinetOwnMaterial=true;o.add(edge);}});
   return g;
  }
  // Split only the affected rectangle, retaining boards around a partial-depth hole.
  const sideBoard=(side,W,H,D,x,y,z,shade=bodyColor)=>{
   const joint=shared.find(v=>v.side===side);if(joint&&!joint.owner)return [];
   // Keep a wood rear edge inside each opening so adjacent backboards meet.
   // Removing the entire depth exposed a white slit between two cabinet backs.
   const relevant=cuts.filter(cut=>cut.side===side).map(cut=>({...cut,back:cut.back+c.thickness,bottom:cut.bottom-(joint?.owner?c.thickness:0),top:cut.top+(joint?.owner?c.thickness:0)})),ys=[y,y+H],zs=[z-D/2,z+D/2];
   const sideFinishes=finishes.filter(v=>v.side===side);for(const finish of sideFinishes)for(const value of [finish.bottom/1000,finish.top/1000])if(value>y&&value<y+H)ys.push(value);
   for(const cut of relevant){for(const value of [cut.bottom/1000,cut.top/1000])if(value>y&&value<y+H)ys.push(value);for(const value of [cut.back/1000,cut.front/1000])if(value>z-D/2&&value<z+D/2)zs.push(value);}
   ys.sort((a,b)=>a-b);zs.sort((a,b)=>a-b);const parts=[];
   for(let i=0;i<ys.length-1;i++)for(let j=0;j<zs.length-1;j++){const cy=(ys[i]+ys[i+1])/2,cz=(zs[j]+zs[j+1])/2;if(ys[i+1]-ys[i]<1e-8||zs[j+1]-zs[j]<1e-8||relevant.some(v=>cy>=v.bottom/1000&&cy<=v.top/1000&&cz>=v.back/1000&&cz<=v.front/1000))continue;const rearEdge=relevant.some(v=>cy>=v.bottom/1000&&cy<=v.top/1000&&cz<v.back/1000&&cz>=(v.back-c.thickness)/1000),joinedWood=sideFinishes.some(v=>cy>=v.bottom/1000&&cy<=v.top/1000),mesh=add(g,W,ys[i+1]-ys[i],zs[j+1]-zs[j],x,ys[i],cz,rearEdge||joinedWood?wood:shade);mesh.userData.cabinetSide=side;if(joint)mesh.userData.cabinetSharedSide=true;if(rearEdge)mesh.userData.cabinetNicheRearEdge=true;parts.push(mesh);}return parts;
  };
  if(c.entry){
   const e=c.entry,shoe=p+e.shoeHeight/1000,lower=shoe+e.lowerHeight/1000,upper=lower+e.nicheHeight/1000,bays=C.layout(f);
   for(const joint of shared){const bay=bays[joint.side==='left'?0:bays.length-1];bay.width+=c.thickness;if(joint.side==='left')bay.left-=c.thickness;bay.center=bay.left+bay.width/2;}
   const interiorLeft=-w/2+(shared.some(v=>v.side==='left')?0:t),interiorRight=w/2-(shared.some(v=>v.side==='right')?0:t),interiorWidth=interiorRight-interiorLeft,interiorX=(interiorRight+interiorLeft)/2;
   if(p)add(g,w,p,d-.04,0,0,-.02,wood);add(g,w,t,bodyDepth,0,p,bodyZ);add(g,w,t,bodyDepth,0,h-t,bodyZ);
   for(const [side,sign] of [['left',-1],['right',1]])sideBoard(side,t,h-p-2*t,bodyDepth,sign*(w/2-t/2),p+t,bodyZ);
   const extra=side=>Math.max(0,...finishes.filter(v=>v.side===side).map(v=>v.gap))/1000,edge=side=>{const common=shared.some(v=>v.side===side),open=e.openSide===side||e.openSide==='both';return open?t+extra(side)+(common?t:0):common?t:0;},leftEdge=edge('left'),rightEdge=edge('right');
   for(const level of [p+e.shoeHeight/2000,shoe,lower,upper+t]){const niche=level===lower||level===upper+t,counter=level===lower;const shelf=add(g,niche?w-2*t+leftEdge+rightEdge:interiorWidth,t,counter?d-t:d-2*t,niche?(rightEdge-leftEdge)/2:interiorX,level-t,counter?t/2:level===upper+t?0:-t/2,wood);if(niche)shelf.userData.cabinetNicheSurface=counter?'counter':'ceiling';}
   add(g,interiorWidth,e.nicheHeight/1000,t,interiorX,lower,-d/2+t/2,wood);
   add(g,interiorWidth,shoe-p-t,t,interiorX,p+t,-d/2+t/2,wood);
   const led=add(g,w-2*t,.004,.012,0,upper-.01,d/2-t-.012,'#ffe4ab');led.material=led.material.clone();led.material.emissive=new THREE.Color('#ffe4ab');led.material.emissiveIntensity=.6;led.userData.cabinetOwnMaterial=true;
   c.columns.forEach((col,i)=>{
    const bay=bays[i],cw=bay.width/1000,x=bay.center/1000,drawerY=lower-col.drawers.reduce((n,v)=>n+v.height,0)/1000,faceColor=col.doorColor||(col.finish==='wood'?wood:color==='#d5c4bb'?'#f3f1ec':color),span=faceSpan(i),faceW=span.right-span.left,faceX=(span.left+span.right)/2;
    const handle=(parent,X,Y,Z,vertical=false)=>{const kind=col.handle||'bar';if(kind==='none')return;const m=add(parent,kind==='knob'?.025:vertical?.012:Math.min(.14,faceW*.4),kind==='knob'?.025:vertical?.15:.012,.025,X,Y,Z,'#71685d');if(kind==='knob'){m.geometry.dispose();m.geometry=new THREE.SphereGeometry(.0125,12,8);}};
    for(const [bottom,top] of [[shoe,lower-t],[upper+t,h-t]])add(g,cw,top-bottom,t,x,bottom,-d/2+t/2).userData.cabinetBay={column:i};
    if(i)for(const [bottom,top] of [[shoe,lower-t],[upper+t,h-t]])add(g,t,top-bottom,d-2*t,bay.left/1000-t/2,bottom,-t/2).userData.cabinetDivider={divider:i-1,column:i-1};
    col.shelves.forEach((y,j)=>add(g,cw,t,d-2*t,x,p+t+y/1000,-t/2).userData.cabinetShelf={column:i,shelf:j});
    let y=drawerY;const lanes=C.drawerCount(col);for(let lane=1;lane<lanes;lane++)if(col.drawers.length)add(g,t,lower-drawerY-t,d-2*t,x+(lane-lanes/2)*(cw+t)/lanes,drawerY,-t/2).userData.cabinetDrawerDivider=true;col.drawers.forEach((drawer,j)=>{const dh=drawer.height/1000;for(let lane=0;lane<lanes;lane++){const cw=(bay.width/1000-(lanes-1)*t)/lanes,x=bay.center/1000+(lane-(lanes-1)/2)*(cw+t),faceW=(span.right-span.left)/lanes,faceX=span.left+faceW*(lane+.5),state=C.drawerState(drawer,lane),bodyH=dh-(j===col.drawers.length-1?t:0),node=new THREE.Group();node.position.z=state.open?d*.7*(state.extension??1):0;
     add(node,faceW-.002,bodyH-.002,t,faceX,y+.001,d/2-t/2,faceColor).userData.cabinetDrawerBoard='front';
     add(node,cw-2*t,.012,d-3*t,x,y+.012,t/2);for(const sign of [-1,1])add(node,t,bodyH-.03,d-3*t,x+sign*(cw/2-t),y+.024,t/2);add(node,cw-2*t,bodyH-.03,t,x,y+.024,-d/2+1.5*t);
     handle(node,faceX,y+bodyH*.7,d/2+.012);node.traverse(o=>o.userData.cabinetPart={column:i,drawer:j,lane});g.add(node);}y+=dh;});
    if(col.door==='none'||options.doors==='hidden')return;
    for(const [bottom,top,section] of [[shoe-t,col.drawers.length?drawerY:lower-t,'lower'],[upper,h,'upper']]){
     const count=col.door==='double'?2:1,leaf=faceW/count;
     for(let j=0;j<count;j++){const right=col.door==='right'||col.door==='double'&&j===1,pivot=new THREE.Group(),center=span.left+leaf*(j+.5);pivot.position.set(center+(right?1:-1)*leaf/2,bottom+.001,d/2-t/2);pivot.rotation.y=col.doorOpen?(right?1:-1)*C.doorAngle(c,col)*Math.PI/180:0;
      const face=add(pivot,leaf-.002,top-bottom-.002,t,(right?-1:1)*leaf/2,0,0,faceColor);face.userData.cabinetSection=section;
      if(options.doors==='ghost'||col.finish==='glass'){face.material=face.material.clone();face.material.transparent=true;face.material.opacity=options.doors==='ghost'?.15:.32;face.material.depthWrite=false;face.userData.cabinetOwnMaterial=true;}
      const local=(right?-1:1)*leaf/2;handle(pivot,local+(right?-1:1)*(leaf/2-.04),(top-bottom)*.5,.025,true);
      pivot.traverse(o=>{o.userData.cabinetPart={column:i};if(options.doors==='ghost')o.userData.cabinetIgnorePick=true;});g.add(pivot);
     }
    }
   });
   if(options.outlines)g.traverse(o=>{if(o.isMesh){const edge=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry),new THREE.LineBasicMaterial({color:0x82776b,transparent:true,opacity:.55}));edge.userData.cabinetOwnMaterial=true;o.add(edge);}});return g;
  }
  if(p)add(g,w,p,d-.04,0,0,-.02,wood);
  const movable=col=>col.top==='drawer';
  add(g,w,t,bodyDepth,0,p,bodyZ);if(!c.columns.some(movable))add(g,w,t,bodyDepth,0,h-t,bodyZ);
  const bays=C.layout(f),inner=h-p-2*t;
  bays.forEach((bay,i)=>{
   if(!movable(c.columns[i])){
    const col=c.columns[i],cw=bay.width/1000,x=bay.center/1000,base=p+t;
    if(!col.pegboard)add(g,cw,inner,t,x,base,-d/2+t/2).userData.cabinetBay={column:i};
    else{
     const bottom=col.drawers.reduce((n,v)=>n+v.height,0)/1000,top=col.doorBottom/1000-t,H=top-bottom,wood='#bc936b';
     add(g,cw,bottom,t,x,base,-d/2+t/2);
     add(g,cw,inner-top,t,x,base+top,-d/2+t/2);
     const shape=new THREE.Shape();shape.moveTo(-cw/2,0);shape.lineTo(cw/2,0);shape.lineTo(cw/2,H);shape.lineTo(-cw/2,H);shape.closePath();
     const nx=Math.max(2,Math.floor((cw-.06)/.04)),ny=Math.max(2,Math.floor((H-.06)/.045));
     for(let a=0;a<nx;a++)for(let b=0;b<ny;b++){const hole=new THREE.Path();hole.absarc(-cw/2+.03+(cw-.06)*a/(nx-1),.03+(H-.06)*b/(ny-1),.0045,0,Math.PI*2,true);shape.holes.push(hole);}
     const panel=add(g,cw,H,.012,x,base+bottom,-d/2+t+.006,wood);panel.geometry.dispose();panel.geometry=new THREE.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:false,curveSegments:8});panel.position.set(x,base+bottom,-d/2+t);panel.userData.cabinetBay={column:i};panel.userData.cabinetPegboard=true;
     if(!entryStyle)for(const side of [-1,1]){const outer=side<0&&i===0||side>0&&i===bays.length-1;if(outer)sideBoard(side<0?'left':'right',.006,H,d-t,x+side*(cw/2-.003),base+bottom,t/2,wood);else add(g,.006,H,d-t,x+side*(cw/2-.003),base+bottom,t/2,wood);}
     add(g,cw,t,d-t,x,base+bottom-(entryStyle?t:0),t/2,wood);
     add(g,cw,.006,d-2*t,x,base+top-.006,-t/2,wood);
     for(const level of [.68,.8])add(g,cw*.72,.015,Math.min(.12,d-3*t),x-cw*.1,base+bottom+H*level,-d/2+t+.06,wood).userData.cabinetAccessory='displayShelf';
     for(const offset of [-.28,0,.28]){add(g,.012,.06,.012,x+cw*offset,base+bottom+H*.48,-d/2+t+.018,'#806647');add(g,.012,.012,.045,x+cw*offset,base+bottom+H*.48,-d/2+t+.035,'#806647').userData.cabinetAccessory='hook';}
     const led=add(g,cw-.025,.004,.012,x,base+top-.01,d/2-t-.012,'#ffe4ab');led.material=led.material.clone();led.material.emissive=new THREE.Color('#ffe4ab');led.material.emissiveIntensity=.6;led.userData.cabinetOwnMaterial=true;
    }
   }
   if(!i)sideBoard('left',t,h-p-2*t,bodyDepth,bay.left/1000-t/2,p+t,bodyZ);else add(g,t,h-p-2*t,bodyDepth,bay.left/1000-t/2,p+t,bodyZ).userData.cabinetDivider={divider:i-1,column:i-1};
  });
  sideBoard('right',t,h-p-2*t,bodyDepth,w/2-t/2,p+t,bodyZ);
  c.columns.forEach((col,i)=>{
   const cw=bays[i].width/1000,x=bays[i].center/1000,base=p+t;
   const handle=col.handle||'bar',faceColor=col.doorColor||(col.finish==='wood'?wood:entryStyle&&color==='#d5c4bb'?'#f3f1ec':color);
   if(c.columns.some(movable)){
    const left=(i===0?-w/2:(bays[i].left-c.thickness/2)/1000),right=(i===bays.length-1?w/2:(bays[i].left+bays[i].width+c.thickness/2)/1000),W=right-left-.002;
    if(movable(col)){
     // Top, front and tray share one horizontal drawer translation.
     const lid=new THREE.Group();lid.position.set((left+right)/2,h-t,d/2+(col.top==='drawer'&&col.topOpen?d*.7:0));
     const gap=(col.cableGap||0)/1000,rear=-d+gap,notch=Math.min(.12,W*.35),cut=gap?Math.min(.015,d*.05):0,shape=new THREE.Shape();
     shape.moveTo(-W/2,0);shape.lineTo(W/2,0);shape.lineTo(W/2,rear);shape.lineTo(notch/2+.015,rear);shape.lineTo(notch/2,rear+cut);shape.lineTo(-notch/2,rear+cut);shape.lineTo(-notch/2-.015,rear);shape.lineTo(-W/2,rear);shape.closePath();
     const face=add(lid,W,t,d,0,0,-d/2);face.geometry.dispose();face.geometry=new THREE.ExtrudeGeometry(shape,{depth:t,bevelEnabled:false});face.geometry.rotateX(Math.PI/2);face.position.set(0,t,0);face.userData.cabinetPart={column:i,lid:true};g.add(lid);
     if(col.top==='drawer'){
      add(lid,cw-.004,inner,t,0,-inner,-t/2,faceColor).userData.cabinetDrawerBoard='front';
      // Tray front ends at the front panel's inner face (local Z = -t).
      const depth=d-3*t,center=-d/2+t/2;
      add(lid,cw-2*t,.012,depth,0,-inner+.012,center).userData.cabinetDrawerBoard='bottom';
      for(const side of [-1,1])add(lid,t,Math.max(.04,inner-.04),depth,side*(cw/2-t),-inner+.024,center).userData.cabinetDrawerBoard='side';
      lid.traverse(o=>o.userData.cabinetPart={column:i,lid:true});
     }else add(g,cw,inner,t,x,base,d/2-t/2,faceColor);
    }else add(g,W,t,d,(left+right)/2,h-t,0);
   }
   const handleMesh=(parent,X,Y,Z,vertical=false)=>{if(handle==='none')return;const mesh=add(parent,handle==='knob'?.025:vertical?.012:Math.min(.14,cw*.4),handle==='knob'?.025:vertical?.15:.012,.025,X,Y,Z,'#71685d');if(handle==='knob'){mesh.geometry.dispose();mesh.geometry=new THREE.SphereGeometry(.0125,12,8);}};
   col.shelves.forEach((y,j)=>{add(g,cw,t,d-2*t,x,base+y/1000,-t/2).userData.cabinetShelf={column:i,shelf:j};});
   let y=base;const lanes=C.drawerCount(col),drawerHeight=col.drawers.reduce((sum,v)=>sum+v.height,0)/1000;for(let lane=1;lane<lanes;lane++)if(drawerHeight)add(g,t,drawerHeight,d-2*t,x+(lane-lanes/2)*(cw+t)/lanes,base,-t/2).userData.cabinetDrawerDivider=true;
   col.drawers.forEach((drawer,j)=>{
    const dh=drawer.height/1000;for(let lane=0;lane<lanes;lane++){const cw=(bays[i].width/1000-(lanes-1)*t)/lanes,x=bays[i].center/1000+(lane-(lanes-1)/2)*(cw+t),state=C.drawerState(drawer,lane),node=new THREE.Group();node.position.z=state.open?d*.7*(state.extension??1):0;
    const fullSpan=faceSpan(i),span={left:fullSpan.left+(fullSpan.right-fullSpan.left)*lane/lanes,right:fullSpan.left+(fullSpan.right-fullSpan.left)*(lane+1)/lanes},frontBottom=entryStyle&&j===0?p:y,bodyDh=dh-(entryStyle&&j===col.drawers.length-1?t:0);
    add(node,entryStyle?span.right-span.left-.002:cw-.004,entryStyle?y+bodyDh-frontBottom-.002:dh-.004,t,entryStyle?(span.left+span.right)/2:x,entryStyle?frontBottom+.001:y,d/2-t/2,entryStyle?faceColor:color).userData.cabinetDrawerBoard='front';
    // Body spans from the rear panel's inner face to the front panel's inner face.
    add(node,cw-.02,.012,d-3*t,x,y+.012,t/2).userData.cabinetDrawerBoard='bottom';
    for(const side of [-1,1])add(node,t,bodyDh-.03,d-3*t,x+side*(cw/2-t),y+.024,t/2).userData.cabinetDrawerBoard='side';
    add(node,cw-.02,bodyDh-.03,t,x,y+.024,-d/2+1.5*t).userData.cabinetDrawerBoard='back';
    handleMesh(node,x,y+dh*.7,d/2+.012);
    node.traverse(o=>o.userData.cabinetPart={column:i,drawer:j,lane});g.add(node);}y+=dh;
   });
   if(col.doorBottom!==undefined)y=base+col.doorBottom/1000;
   if(col.door==='none'||options.doors==='hidden')return;
   const span=faceSpan(i),doorBottom=entryStyle?y-t:y,doorTop=entryStyle?h:base+inner,count=col.door==='double'?2:1,leafW=(entryStyle?span.right-span.left:cw)/count,dh=doorTop-doorBottom;
   for(let j=0;j<count;j++){
    const right=col.door==='right'||col.door==='double'&&j===1,center=(entryStyle?span.left:x-cw/2)+leafW*(j+.5),pivot=new THREE.Group();
    pivot.position.set(center+(right?1:-1)*leafW/2,doorBottom+(entryStyle?.001:0),d/2-(col.doorBottom!==undefined?t/2:0));pivot.rotation.y=col.doorOpen?(right?1:-1)*C.doorAngle(c,col)*Math.PI/180:0;
    const local=(right?-1:1)*leafW/2;
    const face=add(pivot,leafW-(entryStyle?.002:.004),dh-(entryStyle?.002:.004),t,local,0,0,faceColor);
    if(col.finish==='glass'||options.doors==='ghost'){face.material=face.material.clone();face.userData.cabinetOwnMaterial=true;face.material.transparent=true;face.material.opacity=options.doors==='ghost'?.15:.32;face.material.depthWrite=false;face.material.roughness=.15;}
    handleMesh(pivot,local+(right?-1:1)*(leafW/2-.04),dh*.5,.025,true);
    if(options.doors==='ghost')pivot.traverse(o=>o.userData.cabinetIgnorePick=true);
    pivot.traverse(o=>o.userData.cabinetPart={column:i});g.add(pivot);
   }
  });
  if(options.outlines)g.traverse(o=>{if(o.isMesh){const edges=new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry),new THREE.LineBasicMaterial({color:0x82776b,transparent:true,opacity:.55}));edges.userData.cabinetOwnMaterial=true;o.add(edges);}});
  return g;
 }
 root.FurnishCabinetModel={build};
})(typeof globalThis!=='undefined'?globalThis:this);
