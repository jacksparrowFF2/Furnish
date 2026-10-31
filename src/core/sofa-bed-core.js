/* Y107H03 closed reference. mm; unlabelled joinery is a visual approximation. */
(function(root){
'use strict';
function spec(){
 const names=['front-rail','back-rail','back-top-rail','seat-lower','seat-upper','back-cushion','seat-piping-lower','seat-piping-upper'];
 for(const side of ['left','right'])names.push(...['front-post','back-post','side-panel','side-inset','metal-runner','wheel-front','wheel-back','wheel-fork-front','wheel-fork-back','lumbar','lumbar-piping'].map(n=>n+'-'+side));
 for(let i=0;i<7;i++)names.push('back-slat-'+i);
 for(let i=0;i<12;i++)names.push('steel-slat-'+i);
 return {assetId:'sofa-bed-yeswood-y107h03',prefix:'sofa-bed-v1:',size:[1250,770,838],parts:names.map(name=>({name,identity:'sofa-bed-v1:'+name})),motions:[]};
}
const api={spec};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishSofaBed=api;
})(typeof globalThis!=='undefined'?globalThis:this);
