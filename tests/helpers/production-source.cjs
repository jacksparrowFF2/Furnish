/* Extract current production functions without coupling fixtures to parameter defaults. */
'use strict';
function betweenFunctions(source,start,end){
 const marker=name=>new RegExp('^function '+name+'\\(', 'm').exec(source),a=marker(start),b=marker(end);
 if(!a||!b||b.index<=a.index)throw Error('Missing production source range: '+start+' → '+end);
 return source.slice(a.index,b.index);
}
module.exports={betweenFunctions};
