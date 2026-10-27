'use strict';
const fs=require('node:fs'),path=require('node:path');
function workspaceRoot({appRoot,config,override}){
 const root=path.resolve(override||config?.root||appRoot);
 for(const file of ['index.html','scripts/serve.cjs','src/core/repository-core.js'])
  if(!fs.statSync(path.join(root,file),{throwIfNoEntry:false})?.isFile())throw Error('Furnish 工作目录不存在或不完整：'+root);
 return fs.realpathSync(root);
}
function localPage(url,base){try{const u=new URL(url);return u.origin===new URL(base).origin;}catch{return false;}}
function externalPage(url){try{return ['https:','http:'].includes(new URL(url).protocol);}catch{return false;}}
module.exports={workspaceRoot,localPage,externalPage};
