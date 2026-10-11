/* Shared Three.js cabinet construction. box uses bottom-based vertical coordinates. */
(function(root){
 function build(THREE,f,box,options={}){
  const C=root.FurnishCabinet,c=C.config(f),h=C.height(f)/1000,w=f.w/1000,d=f.d/1000,t=c.thickness/1000,p=c.plinth/1000,g=new THREE.Group(),color=f.color||'#efe6d8';
  const add=(parent,W,H,D,x,y,z,shade=color)=>{const mesh=box(W,H,D,shade,x,y,z);parent.add(mesh);return mesh;};
  if(p)add(g,w,p,d-.04,0,0,-.02,'#60574c');
  const movable=col=>col.top==='drawer';
  add(g,w,t,d,0,p,0);if(!c.columns.some(movable))add(g,w,t,d,0,h-t,0);
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
     const panel=add(g,cw,H,.012,x,base+bottom,-d/2+t+.006,'#d9bc93');panel.geometry.dispose();panel.geometry=new THREE.ExtrudeGeometry(shape,{depth:.012,bevelEnabled:false,curveSegments:8});panel.position.set(x,base+bottom,-d/2+t);panel.userData.cabinetBay={column:i};panel.userData.cabinetPegboard=true;
     for(const side of [-1,1])add(g,.006,H,d-2*t,x+side*(cw/2-.003),base+bottom,-t/2,wood);
     add(g,cw,t,d-2*t,x,base+bottom,-t/2,wood);
     add(g,cw,.006,d-2*t,x,base+top-.006,-t/2,wood);
     for(const level of [.68,.8])add(g,cw*.72,.015,Math.min(.12,d-3*t),x-cw*.1,base+bottom+H*level,-d/2+t+.06,wood).userData.cabinetAccessory='displayShelf';
     for(const offset of [-.28,0,.28]){add(g,.012,.06,.012,x+cw*offset,base+bottom+H*.48,-d/2+t+.018,'#806647');add(g,.012,.012,.045,x+cw*offset,base+bottom+H*.48,-d/2+t+.035,'#806647').userData.cabinetAccessory='hook';}
     const led=add(g,cw-.025,.004,.012,x,base+top-.01,d/2-t-.012,'#ffe4ab');led.material=led.material.clone();led.material.emissive=new THREE.Color('#ffe4ab');led.material.emissiveIntensity=.6;led.userData.cabinetOwnMaterial=true;
    }
   }
   const wall=add(g,t,h-p-2*t,d,bay.left/1000-t/2,p+t,0);if(i)wall.userData.cabinetDivider={divider:i-1,column:i-1};
  });
  add(g,t,h-p-2*t,d,w/2-t/2,p+t,0);
  c.columns.forEach((col,i)=>{
   const cw=bays[i].width/1000,x=bays[i].center/1000,base=p+t;
   const handle=col.handle||'bar',faceColor=col.doorColor||(col.finish==='wood'?'#b9946d':color);
   if(c.columns.some(movable)){
    const left=(i===0?-w/2:(bays[i].left-c.thickness/2)/1000),right=(i===bays.length-1?w/2:(bays[i].left+bays[i].width+c.thickness/2)/1000),W=right-left-.002;
    if(movable(col)){
     // Top, front and tray share one horizontal drawer translation.
     const lid=new THREE.Group();lid.position.set((left+right)/2,h-t,d/2+(col.top==='drawer'&&col.topOpen?d*.7:0));
     const gap=(col.cableGap||0)/1000,rear=-d+gap,notch=Math.min(.12,W*.35),cut=gap?Math.min(.015,d*.05):0,shape=new THREE.Shape();
     shape.moveTo(-W/2,0);shape.lineTo(W/2,0);shape.lineTo(W/2,rear);shape.lineTo(notch/2+.015,rear);shape.lineTo(notch/2,rear+cut);shape.lineTo(-notch/2,rear+cut);shape.lineTo(-notch/2-.015,rear);shape.lineTo(-W/2,rear);shape.closePath();
     const face=add(lid,W,t,d,0,0,-d/2);face.geometry.dispose();face.geometry=new THREE.ExtrudeGeometry(shape,{depth:t,bevelEnabled:false});face.geometry.rotateX(Math.PI/2);face.position.set(0,t,0);face.userData.cabinetPart={column:i,lid:true};g.add(lid);
     if(col.top==='drawer'){
      add(lid,cw-.004,inner,t,0,-inner,-t/2).userData.cabinetDrawerBoard='front';
      // Tray front ends at the front panel's inner face (local Z = -t).
      const depth=d-3*t,center=-d/2+t/2;
      add(lid,cw-2*t,.012,depth,0,-inner+.012,center).userData.cabinetDrawerBoard='bottom';
      for(const side of [-1,1])add(lid,t,Math.max(.04,inner-.04),depth,side*(cw/2-t),-inner+.024,center).userData.cabinetDrawerBoard='side';
      lid.traverse(o=>o.userData.cabinetPart={column:i,lid:true});
     }else add(g,cw,inner,t,x,base,d/2-t/2);
    }else add(g,W,t,d,(left+right)/2,h-t,0);
   }
   const handleMesh=(parent,X,Y,Z,vertical=false)=>{if(handle==='none')return;const mesh=add(parent,handle==='knob'?.025:vertical?.012:Math.min(.14,cw*.4),handle==='knob'?.025:vertical?.15:.012,.025,X,Y,Z,'#71685d');if(handle==='knob'){mesh.geometry.dispose();mesh.geometry=new THREE.SphereGeometry(.0125,12,8);}};
   col.shelves.forEach((y,j)=>{add(g,cw,t,d-2*t,x,base+y/1000,-t/2).userData.cabinetShelf={column:i,shelf:j};});
   let y=base;
   col.drawers.forEach((drawer,j)=>{
    const dh=drawer.height/1000,node=new THREE.Group();node.position.z=drawer.open?d*.7*(drawer.extension??1):0;
    add(node,cw-.004,dh-.004,t,x,y,d/2-t/2).userData.cabinetDrawerBoard='front';
    // Body spans from the rear panel's inner face to the front panel's inner face.
    add(node,cw-.02,.012,d-3*t,x,y+.012,t/2).userData.cabinetDrawerBoard='bottom';
    for(const side of [-1,1])add(node,t,dh-.03,d-3*t,x+side*(cw/2-t),y+.024,t/2).userData.cabinetDrawerBoard='side';
    add(node,cw-.02,dh-.03,t,x,y+.024,-d/2+1.5*t).userData.cabinetDrawerBoard='back';
    handleMesh(node,x,y+dh*.7,d/2+.012);
    node.traverse(o=>o.userData.cabinetPart={column:i,drawer:j});g.add(node);y+=dh;
   });
   if(col.doorBottom!==undefined)y=base+col.doorBottom/1000;
   if(col.door==='none'||options.doors==='hidden')return;
   const count=col.door==='double'?2:1,leafW=cw/count,dh=inner-(y-base);
   for(let j=0;j<count;j++){
    const right=col.door==='right'||col.door==='double'&&j===1,center=x-cw/2+leafW*(j+.5),pivot=new THREE.Group();
    pivot.position.set(center+(right?1:-1)*leafW/2,y,d/2-(col.doorBottom!==undefined?t/2:0));pivot.rotation.y=col.doorOpen?(right?1:-1)*(col.doorAngle??99)*Math.PI/180:0;
    const local=(right?-1:1)*leafW/2;
    const face=add(pivot,leafW-.004,dh-.004,t,local,0,0,faceColor);
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
