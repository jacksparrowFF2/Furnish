/* Backend source fingerprint, including lazy CommonJS dependencies. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function fingerprint(entry){
 const base=path.dirname(entry),sources=new Map();
 function visit(file){
  file=require.resolve(file);if(sources.has(file))return;
  const bytes=fs.readFileSync(file);sources.set(file,bytes);
  if(path.extname(file)!=='.js'&&path.extname(file)!=='.cjs')return;
  for(const match of bytes.toString('utf8').matchAll(/\brequire\(\s*['"](\.[^'"]+)['"]\s*\)/g))visit(path.resolve(path.dirname(file),match[1]));
 }
 visit(entry);
 const hash=crypto.createHash('sha256');
 for(const [file,bytes] of [...sources].sort(([a],[b])=>a.localeCompare(b)))hash.update(path.relative(base,file)).update('\0').update(bytes).update('\0');
 return hash.digest('hex');
}
function request(url,{method='GET',token}={}){return new Promise(resolve=>{
 let settled=false;
 const done=value=>{if(!settled){settled=true;clearTimeout(timer);resolve(value);}};
 const req=require('node:http').request(url,{method,headers:token?{'X-Furnish-Restart':token}:{}},res=>{
  if(res.statusCode!==200){res.destroy();done(null);return;}
  let size=0,chunks=[];
  res.on('data',chunk=>{size+=chunk.length;if(size>256*1024){res.destroy();done(null);}else chunks.push(chunk);});
  res.on('error',()=>done(null));
  res.on('end',()=>{try{done(JSON.parse(Buffer.concat(chunks).toString('utf8')));}catch{done(null);}});
 });
 const timer=setTimeout(()=>{done(null);req.destroy();},2500);
 req.on('error',()=>done(null));req.end();
});}
module.exports={fingerprint,request};
