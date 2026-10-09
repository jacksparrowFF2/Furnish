/* Shared browser / Node module; no DOM or application state dependencies. */
(function(root){
'use strict';
const STYLES = [
  {id:'natural', zh:'原木', en:'Natural Oak', soft:'#cdbfa8', wood:'#d9bf98', textile:'#e7dccd', pop:'#9db08a', floor:['wood', 'wood']},
  {id:'cream', zh:'奶油', en:'Cream', soft:'#efe3cf', wood:'#e8dcc6', textile:'#f5ecdc', pop:'#d9b99a', floor:['tile800', 'wood']},
  {id:'nordic', zh:'北欧', en:'Nordic', soft:'#c9d3da', wood:'#e2d3bc', textile:'#dfe6ea', pop:'#8fa8ba', floor:['wood', 'wood']},
  {id:'industrial', zh:'工业', en:'Industrial', soft:'#6b6b6e', wood:'#8a6f5a', textile:'#7b7f84', pop:'#c0623a', floor:['terrazzo', 'walnut']},
  {id:'chinese', zh:'新中式', en:'New Chinese', soft:'#c2ae93', wood:'#6b4f3a', textile:'#e8dfc8', pop:'#8a3b2e', floor:['marble', 'walnut']},
  {id:'morandi', zh:'莫兰迪', en:'Morandi', soft:'#a3b1a8', wood:'#cbbfb2', textile:'#c4b8c9', pop:'#b8a0a0', floor:['tile800', 'carpet']},
];

const api=STYLES;
if(typeof module==='object'&&module.exports)module.exports=api;
else root.FurnishStylePresets=api;
})(typeof globalThis!=='undefined'?globalThis:this);
