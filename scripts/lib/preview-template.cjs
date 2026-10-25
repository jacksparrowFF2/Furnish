/* Legacy standalone preview sources; inject the current offline import map. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
module.exports=function generatePreviewTemplate(name,destination){
 const root=path.resolve(process.env.FURNISH_VERIFY_ROOT||path.join(__dirname,'../..'));
 const template=fs.readFileSync(path.join(root,'templates/previews',name),'utf8');
 const entry=fs.readFileSync(path.join(root,'index.html'),'utf8');
 const map=entry.match(/<script type="importmap">[\s\S]*?<\/script>/)?.[0];
 if(!map||template.split('<!-- FURNISH_IMPORT_MAP -->').length!==2)throw Error('Preview template requires one offline import map placeholder');
 const file=path.join(root,destination);fs.mkdirSync(path.dirname(file),{recursive:true});
 let html=template.replace('<!-- FURNISH_IMPORT_MAP -->',()=>map);
 fs.writeFileSync(file,html);
 console.log(path.relative(root,file));
};
