'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{PassThrough}=require('node:stream');
const Core=require('../src/core/mcp-core.js'),Bridge=require('../scripts/desktop-mcp.cjs'),Mcp=require('../scripts/furnish-mcp.cjs');
(async()=>{
 const root=fs.mkdtempSync(path.resolve(__dirname,'../output/mcp-unit-')),input=new PassThrough(),output=new PassThrough();
 let text='';output.on('data',c=>text+=c);const session=Mcp.serve({root,input,output});
 const message=async(method,params={},id=1)=>{text='';input.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');await session.idle();return JSON.parse(text);};
 assert.equal((await message('tools/list')).error.code,-32002);
 assert.equal((await message('initialize',{protocolVersion:'2025-11-25'})).result.protocolVersion,'2025-11-25');
 assert.equal((await message('tools/list')).result.tools.length,4);
 assert.equal((await message('execute_code')).error.code,-32601);
 assert.equal((await message('tools/call',{name:'get_current_plan'})).result.isError,true);
 const calls=[],server=await Bridge.start({root,dispatch:async(name,args)=>{calls.push([name,args]);return {name,args};}});
 try{
  const info=JSON.parse(fs.readFileSync(path.join(root,'.local/desktop-mcp/runtime.json'))),url=`http://127.0.0.1:${info.port}/command`;
  const command=JSON.stringify({name:'get_current_plan',arguments:{}}),headers={Authorization:'Bearer '+info.token,'Content-Type':'application/json'};
  assert.equal((await fetch(url,{method:'POST',body:command})).status,403);
  assert.equal((await fetch(url,{method:'POST',headers:{...headers,Origin:'http://evil.example'},body:command})).status,403);
  assert.equal((await fetch(url,{method:'POST',headers:{...headers,'Sec-Fetch-Site':'same-origin'},body:command})).status,403);
  assert.equal((await fetch(url,{method:'POST',headers,body:JSON.stringify({name:'get_current_plan',arguments:{code:'arbitrary'}})})).status,400);
  assert.equal((await fetch(url,{method:'POST',headers,body:JSON.stringify({name:'execute_code',arguments:{}})})).status,400);
  const reply=await message('tools/call',{name:'get_current_plan',arguments:{}});assert.equal(reply.result.structuredContent.name,'get_current_plan');assert.equal(calls.length,1);
  assert.throws(()=>Core.validate('update_furniture',{planId:'p',revision:'r',requestId:'i',updates:[{id:'f',w:-1}]}));
  assert.throws(()=>Core.validate('update_furniture',{planId:'p',revision:'r',requestId:'i',updates:[{id:'f',cx:1},{id:'f',cy:2}]}));
  assert.throws(()=>Core.validate('copy_design',{name:'x'}));
  input.write('{oops\n');await session.idle();assert.match(text,/-32700/);
 }finally{await server.close();}
 assert(!fs.existsSync(path.join(root,'.local/desktop-mcp/runtime.json')));
 console.log('PASS MCP initialization, discovery, tool calls, validation, auth/origin rejection, missing desktop, protocol errors and runtime cleanup');
})().catch(e=>{console.error(e);process.exitCode=1;});
