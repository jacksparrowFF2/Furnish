/* Check generated previews, while excluding archived complete verification checkouts. */
const fs=require('node:fs'),path=require('node:path');
function previewFiles(directory){
 if(!fs.existsSync(directory))return [];
 const checkout=['index.html','src/app.js','scripts/check.cjs'].every(name=>fs.existsSync(path.join(directory,name)));
 if(checkout)return [];
 return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
  const file=path.join(directory,entry.name);
  return entry.isDirectory()?previewFiles(file):entry.name==='preview.html'?[file]:[];
 });
}
module.exports={previewFiles};
