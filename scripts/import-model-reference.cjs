/* Import a chosen local reference into an existing product dossier; no network access. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),kinds=['user','product-page','product-page-original','annotations'];
function importReference(id,source,kind='user',repositoryRoot=root){
 if(!/^[a-z0-9][a-z0-9-]*$/.test(id)||!kinds.includes(kind))throw Error('Invalid product id or reference kind');
 const directory=path.join(repositoryRoot,'assets/models',id),manifest=path.join(directory,'asset.json');
 if(!fs.existsSync(manifest))throw Error('Create the product asset.json dossier first');
 const product=JSON.parse(fs.readFileSync(manifest,'utf8'));if(product.id!==id||product.format!==1||!Array.isArray(product.references))throw Error('Invalid product dossier');source=path.resolve(source);
 if(!/\.(png|jpe?g|webp|avif)$/i.test(source)||!fs.statSync(source).isFile())throw Error('Expected a local PNG/JPEG/WebP/AVIF image');
 const data=fs.readFileSync(source),sha256=crypto.createHash('sha256').update(data).digest('hex');
 const duplicate=product.references.find(r=>r.sha256===sha256);if(duplicate){require('./lib/model-asset-index.cjs').referenceFile(directory,duplicate);return {imported:false,path:duplicate.path,sha256};}
 let name=path.basename(source),target=path.join(directory,'references',kind,name);
 if(fs.existsSync(target)){name=path.parse(name).name+'-'+sha256.slice(0,12)+path.extname(name);target=path.join(directory,'references',kind,name);if(fs.existsSync(target))throw Error('Target already exists; inspect dossier before importing');}
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data,{flag:'wx'});
 const entry={path:path.relative(directory,target).split(path.sep).join('/'),kind,sha256,bytes:data.length,legacyPaths:[],uploadNames:path.basename(source).startsWith('codex-clipboard-')?[path.basename(source)]:[]};
 require('./lib/model-asset-index.cjs').referenceFile(directory,entry);product.references.push(entry);product.references.sort((a,b)=>a.path.localeCompare(b.path));
 fs.writeFileSync(manifest,JSON.stringify(product,null,2)+'\n');return {imported:true,path:entry.path,sha256};
}
if(require.main===module){try{const [id,source,kind]=process.argv.slice(2);if(!id||!source)throw Error('Usage: node scripts/import-model-reference.cjs <product-id> <local-image> [user|product-page|product-page-original|annotations]');console.log(JSON.stringify(importReference(id,source,kind)));console.log('Refresh navigation: node scripts/index-model-assets.cjs --write');}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={importReference};
