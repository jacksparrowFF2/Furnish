/* Shared wheel interpretation. Device hints are heuristic; users can override them. */
(function(root){
 const key='furnish-navigation-input';let mode='auto';
 try{const saved=root.localStorage?.getItem(key);if(['auto','touchpad','mouse'].includes(saved))mode=saved;}catch(e){}
 function setMode(value){if(!['auto','touchpad','mouse'].includes(value))return;mode=value;try{root.localStorage?.setItem(key,value);}catch(e){}}
 function wheel(e){
  const unit=e.deltaMode===1?16:e.deltaMode===2?800:1,x=(e.deltaX||0)*unit,y=(e.deltaY||0)*unit;
  // Precision touchpads usually emit small pixel deltas or horizontal movement.
  const touchpad=mode==='touchpad'||mode==='auto'&&!e.deltaMode&&(x!==0||Math.abs(y)<50);
  return e.ctrlKey||e.metaKey||!touchpad?{kind:'zoom',factor:Math.exp(Math.max(-1,Math.min(1,-y*((e.ctrlKey||e.metaKey)? .01:.0015))))}:{kind:'pan',x,y};
 }
 function panBox(box,element,x,y){
  const m=element.getScreenCTM(),inverse=m.inverse();
  return [box[0]+inverse.a*x+inverse.c*y,box[1]+inverse.b*x+inverse.d*y,box[2],box[3]];
 }
 // Capture before OrbitControls: keep its pointer handling, but use continuous wheel zoom/pan.
 function bindOrbit(element,getControls){
  const handler=e=>{
   const c=getControls();if(!c?.enabled)return;e.preventDefault();e.stopImmediatePropagation();
   const action=wheel(e),camera=c.object;
   c.update();camera.updateMatrixWorld();
   if(action.kind==='pan'){
    if(!c.enablePan)return;
    const height=Math.max(1,element.clientHeight),span=camera.isOrthographicCamera?(camera.top-camera.bottom)/camera.zoom:2*camera.position.distanceTo(c.target)*Math.tan(camera.fov*Math.PI/360);
    const delta=camera.position.clone().set(0,0,0),axis=camera.position.clone();
    delta.addScaledVector(axis.setFromMatrixColumn(camera.matrix,0),action.x*span/height);
    delta.addScaledVector(axis.setFromMatrixColumn(camera.matrix,1),-action.y*span/height);
    camera.position.add(delta);c.target.add(delta);
   }else{
    if(!c.enableZoom)return;
    if(camera.isOrthographicCamera){camera.zoom=Math.max(c.minZoom,Math.min(c.maxZoom,camera.zoom*action.factor));camera.updateProjectionMatrix();}
    else {const offset=camera.position.clone().sub(c.target),length=offset.length();if(length)camera.position.copy(c.target).add(offset.multiplyScalar(Math.max(c.minDistance,Math.min(c.maxDistance,length/action.factor))/length));}
   }
   c.update();c.dispatchEvent({type:'change'});
  };
  element.addEventListener('wheel',handler,{capture:true,passive:false});
  return ()=>element.removeEventListener('wheel',handler,true);
 }
 const api={wheel,panBox,bindOrbit,setMode,getMode:()=>mode};
 if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishNavigation=api;
})(typeof globalThis!=='undefined'?globalThis:this);
