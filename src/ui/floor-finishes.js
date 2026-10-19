/* Height readout plus compatibility links into the single tiling workspace. */
(function(){
const F=FurnishFloorFinish,open=scope=>FurnishTileWorkspace.open(scope);
function furniturePanel(f){
 const p=FurnishProject.effectivePlan(PLAN,state),areas=F.at(p,[f.cx,f.cy]).filter(a=>!a.legacy);if(!areas.length)return '';
 const v=FurnishDesign.furnitureVerticalBounds(f,p,state.furniture);
 return `<section data-floor-furniture><h3>完成地面与安装高度</h3>${areas.map(a=>`<p>${esc(a.room.name)}：完成标高 ${a.finishedZ??'待核对'} mm；家具底部距完成地面 ${v&&Number.isFinite(a.finishedZ)?Number((v.bottom-a.finishedZ).toFixed(2)):'待核对'} mm</p>`).join('')}<p class="muted">${state.furnitureDatum==='finished-floor'?'家具输入高度以完成地面为基准，地面变化自动派生抬高；宿主与附属设备共用一次基准偏移。':'旧方案保留毛坯高度基准；可在铺砖的整案基准设置中切换为完成地面。'}</p></section>`;
}
function panel(room){return room.counted===false?'':`<section><h3>铺砖与完成面</h3><button class="btn" data-tiling-open data-tiling-room="${esc(room.id)}">铺砖</button></section>`;}
window.FurnishFloorFinishUI={panel,furniturePanel,bind:()=>{},openFloating:()=>open({kind:'floor'}),openList:()=>open({kind:'floor'}),openUnified:()=>open({kind:'floor',all:true,section:'layout'}),openLevels:()=>open({kind:'floor',all:true,section:'finish'}),open3DOrigin:roomId=>open({kind:'floor',roomId,view:'3d',picking:true})};
})();
