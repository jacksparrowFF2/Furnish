/* Legacy standalone preview sources; inject the current offline import map. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
module.exports=function generatePreviewTemplate(name,destination){
 const root=path.resolve(__dirname,'../..');
 const template=fs.readFileSync(path.join(root,'templates/previews',name),'utf8');
 const entry=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const map=entry.match(/<script type="importmap">[\s\S]*?<\/script>/)?.[0];
 if(!map||template.split('<!-- FURNISH_IMPORT_MAP -->').length!==2)throw Error('Preview template requires one offline import map placeholder');
 const file=path.join(root,destination);fs.mkdirSync(path.dirname(file),{recursive:true});
 let html=template.replace('<!-- FURNISH_IMPORT_MAP -->',()=>map);
 if(html.includes('/* FURNISH_MODEL */')){
  const start=entry.indexOf('const asMat ='),end=entry.indexOf('/* ======================= 建筑',start);
  if(start<0||end<=start)throw Error('Production furniture source markers are missing');
  html=html.replace('/* FURNISH_MODEL */',()=>entry.slice(start,end));
 }
 fs.writeFileSync(file,html);
 console.log(path.relative(root,file));
};
