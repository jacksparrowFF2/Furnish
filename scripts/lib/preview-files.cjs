/* Check generated previews, while excluding archived complete verification checkouts. */
const fs=require('node:fs'),path=require('node:path');
const {fileURLToPath,pathToFileURL}=require('node:url');
// Resolve resources as the browser does, including escaped file URLs and suffixes.
function localAssetPath(reference,document){
 const url=new URL(reference,pathToFileURL(path.resolve(document)));
 return url.protocol==='file:'?fileURLToPath(url):null;
}
function previewFiles(directory){
 if(!fs.existsSync(directory))return [];
 // Test evidence may retain generated HTML after its disposable runtime was
 // archived. These batches are validated by their own run, not as assets.
 if(path.basename(path.dirname(directory))==='output'&&['playwright','desktop-verification'].includes(path.basename(directory)))return [];
 const checkout=['index.html','src/app.js','scripts/check.cjs'].every(name=>fs.existsSync(path.join(directory,name)));
 if(checkout)return [];
 return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
  const file=path.join(directory,entry.name);
  return entry.isDirectory()?previewFiles(file):entry.name==='preview.html'?[file]:[];
 });
}
module.exports={previewFiles,localAssetPath};
