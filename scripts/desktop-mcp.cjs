/* Authenticated loopback bridge owned by the primary Electron process. */
'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const Core=require('../src/core/mcp-core.js');
async function start({root,dispatch}){
 const directory=path.join(root,'.local/desktop-mcp'),file=path.join(directory,'runtime.json'),token=crypto.randomBytes(32).toString('hex');
 let closing=false,queue=Promise.resolve();
 const server=http.createServer(async(req,res)=>{
  const reply=(status,value)=>{if(!res.destroyed){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}};
  const expected='Bearer '+token,actual=req.headers.authorization||'';
  if(closing||req.headers.origin||req.headers['sec-fetch-site']||req.headers.host!==`127.0.0.1:${server.address().port}`||actual.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))return reply(403,{error:'Authenticated local MCP client required'});
  if(req.method!=='POST'||req.url!=='/command'||req.headers['content-type']!=='application/json')return reply(404,{error:'Unknown request'});
  try{
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>128000)throw Error('MCP request exceeds 128 KB');chunks.push(chunk);}
   const command=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(!command||Object.keys(command).some(k=>!['name','arguments'].includes(k)))throw Error('Invalid command envelope');Core.validate(command.name,command.arguments||{});
   const task=queue.catch(()=>{}).then(()=>{if(closing||req.destroyed&&res.destroyed)throw Error('Desktop connection closed');return dispatch(command.name,command.arguments||{});});queue=task;
   reply(200,{result:await task});
  }catch(e){reply(400,{error:e.message});}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;server.maxConnections=16;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 try{fs.mkdirSync(directory,{recursive:true});fs.writeFileSync(file,JSON.stringify({version:1,root:fs.realpathSync(root),pid:process.pid,port:server.address().port,token}),{mode:0o600});}
 catch(e){server.close();throw e;}
 return {close:async()=>{closing=true;try{if(JSON.parse(fs.readFileSync(file,'utf8')).token===token)fs.unlinkSync(file);}catch{}server.closeIdleConnections();await new Promise(resolve=>server.close(resolve));}};
}
module.exports={start};
