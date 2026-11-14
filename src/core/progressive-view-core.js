/* Local observation policy only: no project state, geometry, exposure or light edits. */
(function(root){'use strict';
const rounded=a=>Array.from(a,n=>Math.round(n*1e8)/1e8);
function cameraKey(camera){return JSON.stringify([rounded(camera.matrixWorld),rounded(camera.projectionMatrix)]);}
function size(aspect,edge=1200){if(!Number.isFinite(aspect)||aspect<.1||aspect>10)throw Error('Invalid progressive viewport');return aspect>=1?{width:edge,height:Math.max(1,Math.round(edge/aspect))}:{width:Math.max(1,Math.round(edge*aspect)),height:edge};}
// Measure only a settled view after compilation; the first slow scene build is not a GPU benchmark.
function performancePolicy(){let start=null,slow=0,edge=1200;return {reset(){start=null;slow=0;},sample({now,samples,frameTime}){if(start===null&&samples<1)return {action:'keep',edge};if(start===null){start={now,samples};return {action:'keep',edge};}const seconds=(now-start.now)/1000,rate=(samples-start.samples)/Math.max(.001,seconds);slow=Number.isFinite(frameTime)&&frameTime>100?slow+1:0;if(seconds<12||samples>=256)return {action:'keep',edge};if(rate<.25||slow>=4){start={now,samples};slow=0;if(edge>640){edge=640;return {action:'reduce',edge,rate};}return {action:'fallback',edge,rate};}return {action:'keep',edge};}};}
const api={cameraKey,size,performancePolicy};root.FurnishProgressivePolicy=api;if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
