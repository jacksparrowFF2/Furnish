/* MCP stdio transport. stdout contains newline-delimited JSON-RPC only. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const Core=require('../src/core/mcp-core.js');
function callDesktop(root,name,args){
 Core.validate(name,args);
 const file=path.join(root,'.local/desktop-mcp/runtime.json');let info;
 try{info=JSON.parse(fs.readFileSync(file,'utf8'));}catch{throw Error('请先启动此工作目录的 Furnish 桌面快捷方式（需支持 MCP 的桌面壳）');}
 if(info.version!==1||info.root!==fs.realpathSync(root)||!Number.isInteger(info.port)||info.port<1||info.port>65535||!/^[a-f0-9]{64}$/.test(info.token))throw Error('Furnish 桌面连接记录无效，请重新启动桌面版');
 return new Promise((resolve,reject)=>{
  const body=JSON.stringify({name,arguments:args});
  const req=http.request({hostname:'127.0.0.1',port:info.port,path:'/command',method:'POST',headers:{Authorization:'Bearer '+info.token,'Content-Type':'application/json','Content-Length':Buffer.byteLength(body)}},res=>{
   let data='',size=0;res.setEncoding('utf8');res.on('data',c=>{size+=Buffer.byteLength(c);if(size>64e6){res.destroy();reject(Error('MCP response exceeds 64 MB'));}else data+=c;});res.on('error',reject);res.on('end',()=>{try{const value=JSON.parse(data);if(res.statusCode!==200)throw Error(value.error||'Furnish command failed');resolve(value.result);}catch(e){reject(e);}});
  });
  req.setTimeout(180000,()=>req.destroy(Error('Furnish 响应超时；修改可能已应用，重新读取状态，勿更换 requestId 重试')));req.on('error',reject);req.end(body);
 });
}
function serve({input=process.stdin,output=process.stdout,root=path.resolve(__dirname,'..')}={}){
 const versions=['2025-11-25','2025-06-18','2025-03-26','2024-11-05'];let initialized=false,buffer='',queue=Promise.resolve();
 const send=value=>output.write(JSON.stringify(value)+'\n');
 async function handle(message){
  const id=message?.id;if(!message||message.jsonrpc!=='2.0'||typeof message.method!=='string'){send({jsonrpc:'2.0',id:id??null,error:{code:-32600,message:'Invalid JSON-RPC request'}});return;}
  if(id===undefined)return;
  try{
   let result;
   if(message.method==='initialize'){initialized=true;result={protocolVersion:versions.includes(message.params?.protocolVersion)?message.params.protocolVersion:versions[0],capabilities:{tools:{listChanged:false}},serverInfo:{name:'furnish',version:'1.0.0'},instructions:'Operate the live Furnish desktop. Read before editing; use returned planId/revision and a unique requestId. Retry the same edit only with the same requestId. Respect saved:false or persisted:false. Copy a design before experimenting. Furniture edits use existing undo; copying uses existing design creation semantics.'};}
   else if(message.method==='ping')result={};
   else if(!initialized)throw Object.assign(Error('Initialize MCP first'),{rpcCode:-32002});
   else if(message.method==='tools/list')result={tools:Core.tools.map(t=>({...t,annotations:{...t.annotations,openWorldHint:false}}))};
   else if(message.method==='tools/call'){
    try{const value=await callDesktop(root,message.params?.name,message.params?.arguments||{});result={content:[{type:'text',text:JSON.stringify(value)}],structuredContent:value,...(value.applied&&!value.persisted?{isError:true}:{})};}
    catch(e){result={isError:true,content:[{type:'text',text:e.message}]};}
   }else throw Object.assign(Error('Method not found'),{rpcCode:-32601});
   send({jsonrpc:'2.0',id,result});
  }catch(e){send({jsonrpc:'2.0',id,error:{code:e.rpcCode||-32602,message:e.message}});}
 }
 input.setEncoding('utf8');input.on('data',chunk=>{
  buffer+=chunk;if(Buffer.byteLength(buffer)>256000&&!buffer.includes('\n')){buffer='';send({jsonrpc:'2.0',id:null,error:{code:-32600,message:'Request too large'}});return;}
  let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(!line.trim())continue;queue=queue.catch(()=>{}).then(()=>{if(Buffer.byteLength(line)>256000){send({jsonrpc:'2.0',id:null,error:{code:-32600,message:'Request too large'}});return;}try{return handle(JSON.parse(line));}catch{send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});}});}
 });
 return {idle:()=>queue};
}
if(require.main===module){const args=process.argv.slice(2),i=args.indexOf('--root');serve({root:i>=0?path.resolve(args[i+1]||''):path.resolve(__dirname,'..')});}
module.exports={serve,callDesktop};
