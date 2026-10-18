/* Advisory volumes in metres, derived from the same checks as the property panel. */
(function(root){
 'use strict';
 function annotation(kind,check,tr=(zh,en)=>zh){
  const mm=n=>Math.floor((n+1e-6)*10)/10;
  const title=`${kind==='top'?tr('顶部','Top'):tr('机身到插座','Heater to socket')} ${check.required} mm`;
  const distance=Number.isFinite(check.gap)?`${tr('实际净距','Actual clearance')} ${mm(check.gap)} mm`:tr('实际净距待核对','Actual clearance unverified');
  const status=check.ok===false?`${tr('不足','Short by')} ${Math.max(.1,Math.ceil((check.required-check.gap-1e-6)*10)/10)} mm`:check.ok===null?tr('待核对','Unverified'):'';
  return {title,distance,status,color:check.ok===false?'#b62b20':check.ok===true?'#087a6d':'#946008'};
 }
 function build(THREE,f,checks,options={}){
  const group=new THREE.Group(),w=f.w/1000,d=f.d/1000,h=(f.h??565)/1000,bottom=((f.mountHeight??1650)+(checks.floorBase?.z??0))/1000;
  group.userData.heaterClearance=f.id;group.rotation.y=-(f.rot||0)*Math.PI/180;
  const addLabel=(kind,check,position,center)=>{
   if(!options.CSS2DObject||!options.document)return;
   const info=annotation(kind,check,options.tr),el=options.document.createElement('div');el.className='heater-clearance-label';
   Object.assign(el.style,{pointerEvents:'none',background:'rgba(255,255,255,.94)',color:info.color,border:`1px solid ${info.color}`,borderRadius:'6px',padding:'5px 8px',font:'600 12px/1.5 system-ui,sans-serif',whiteSpace:'nowrap',boxShadow:'0 2px 6px #0002'});
   for(const text of [info.title,info.distance,info.status].filter(Boolean)){const line=options.document.createElement('div');line.textContent=text;el.appendChild(line);}
   const label=new options.CSS2DObject(el);label.position.set(...position);label.center.set(...center);label.userData.clearanceKind=kind;label.renderOrder=22;group.add(label);
  };
  const volume=(kind,width,height,depth,x,y,check)=>{
   const color=check.ok===false?0xd64532:check.ok===true?0x139687:0xd89a33;
   const geometry=new THREE.BoxGeometry(width,height,depth),material=new THREE.MeshBasicMaterial({color,transparent:true,opacity:check.ok===false?.16:.035,depthWrite:false,side:THREE.DoubleSide});
   const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,0);mesh.userData.cabinetOwnMaterial=true;mesh.userData.clearanceKind=kind;mesh.renderOrder=20;
   const frame=new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color,transparent:true,opacity:check.ok===false?.9:.5,depthWrite:false,depthTest:false}));frame.position.copy(mesh.position);frame.userData.cabinetOwnMaterial=true;frame.userData.clearanceKind=kind;frame.renderOrder=21;
   group.add(mesh,frame);
   addLabel(kind,check,[0,y+height/2+.12,d/2+.06],[.5,1]);
  };
  volume('top',w,checks.top.required/1000,d,0,bottom+h+checks.top.required/2000,checks.top);
  const socket=checks.socket;
  if(socket.local){
   const point=socket.local.point.map(v=>v/1000),nearest=socket.local.nearest.map(v=>v/1000),color=socket.ok?0x139687:0xd64532;
   const marker=new THREE.Mesh(new THREE.BoxGeometry(.06,.06,.02),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.65,depthTest:false,depthWrite:false}));marker.position.set(...point);marker.userData.cabinetOwnMaterial=true;marker.userData.clearanceKind='socket';group.add(marker);
   const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...nearest),new THREE.Vector3(...point)]),new THREE.LineBasicMaterial({color,depthTest:false,transparent:true,opacity:.9}));line.userData.cabinetOwnMaterial=true;line.userData.clearanceKind='socket';group.add(line);
   addLabel('socket',socket,[point[0],point[1]-.08,point[2]],[point[0]<0?1:0,0]);
  }else addLabel('socket',socket,[w/2+.08,bottom+h/2,d/2+.06],[0,.5]);
  group.traverse(o=>{o.raycast=()=>{};}); // Frames must never intercept furniture picks.
  return group;
 }
 const api={build,annotation};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishHeaterClearanceModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
