/* Dependency-free MCP stdio adapter. stdout is reserved for JSON-RPC. */
'use strict';
const {Client,object}=require('./client.cjs'),Furnish=require('./furnish.cjs');
const string={type:'string'},args={type:'object',additionalProperties:true};
function tool(name,description,properties,required=[],readOnly=false){return {name,description,inputSchema:{type:'object',properties,required,additionalProperties:false},annotations:{readOnlyHint:readOnly,destructiveHint:!readOnly,idempotentHint:readOnly,openWorldHint:!readOnly}};}
const tools=[
 tool('blender_session','Codex-owned Blender sessions: doctor/status/list; attach with args.instance_id; grant with args.scopes; release on completion. Never replaces an existing bridge.',{action:{type:'string',enum:['doctor','status','list','attach','claim','detach','release','grant','revoke','grants','mark_read','presence','heartbeat','pause','resume']},args},['action']),
 tool('blender_op','Pinned DSH modeling engine. op=catalog discovers operations and parameter skeletons. Default action=plan; also loop/opt/preset/txn. Furnish production publication remains separately verified.',{action:{type:'string',enum:['plan','loop','opt','preset','txn']},op:string,args},['op']),
 tool('blender_py','Run Python in an explicitly attached GUI with a write grant. Supply code or file; persistent kernel exposes K and bpy. Long scripts use blender_run.',{code:string,file:string}),
 tool('blender_see','Return a native MCP PNG from the attached GUI. viewpoint=viewport/camera/custom. args uses Gateway view fields: from/look_at arrays (m), width/height, lens, ortho, ortho_scale, shading. Does not change the user viewport.',{viewpoint:{type:'string',enum:['viewport','camera','custom']},args},[],true),
 tool('blender_run','Background job queue. submit args.kind=headless with script/script_file, or render with file/output/resolution/samples. status/wait/collect/cancel use id. wait is bounded to 30 seconds; jobs persist after client disconnect.',{action:{type:'string',enum:['submit','status','wait','collect','cancel','list','perf']},id:string,args}),
 tool('blender_inspect','Read-only command catalog when command is omitted. Execute a catalog read command with command and args. Python, export and internal transport commands are rejected.',{command:string,args},[],true),
 tool('furnish_model','Furnish checkout integration: bind with root remembers a checkout in plugin data; doctor/profiles; verify one registered profile in the existing isolated pipeline; status/collect by id. Technical success is separate from reference-image visual acceptance.',{action:{type:'string',enum:['bind','doctor','profiles','verify','status','collect']},root:string,profile:string,device:{type:'string',enum:['auto','gpu','cpu']},id:string},['action'])
];
function validate(name,a){const t=tools.find(t=>t.name===name);if(!t)throw Error('Unknown tool: '+name);if(!object(a))throw Error('Arguments must be an object');for(const k of t.inputSchema.required)if(a[k]===undefined)throw Error('Required argument: '+k);for(const [k,v] of Object.entries(a)){const p=t.inputSchema.properties[k];if(!p)throw Error('Unknown argument: '+k);if(p.type==='object'?!object(v):typeof v!==p.type)throw Error('Invalid type: '+k);if(p.enum&&!p.enum.includes(v))throw Error('Invalid value: '+k);}return t;}
function failed(r){return r?.ok===false||r?.passed===false||r?.result?.ok===false||['failed','canceled','interrupted'].includes(r?.job?.state)||['failed','interrupted'].includes(r?.state);}
function result(value){
 if(value.png){const {png,metadata}=value;return {content:[{type:'text',text:JSON.stringify(metadata)},{type:'image',mimeType:'image/png',data:png.toString('base64')}],structuredContent:metadata};}
 return {content:[{type:'text',text:JSON.stringify(value)}],structuredContent:object(value)?value:{value},...(failed(value)?{isError:true}:{})};
}
function serve({input=process.stdin,output=process.stdout,client=new Client(),furnish=a=>Furnish.execute(a,{data:client.data})}={}){
 let initialized=false,buffer='',overflow=false;const pending=new Set();
 const send=v=>output.write(JSON.stringify(v)+'\n');
 async function handle(m){
  const id=m?.id;if(!m||m.jsonrpc!=='2.0'||typeof m.method!=='string'){send({jsonrpc:'2.0',id:id??null,error:{code:-32600,message:'Invalid Request'}});return;}
  if(id===undefined)return;
  try{
   let value;
   if(m.method==='initialize'){initialized=true;const versions=['2025-11-25','2025-06-18','2025-03-26','2024-11-05'];value={protocolVersion:versions.includes(m.params?.protocolVersion)?m.params.protocolVersion:versions[0],capabilities:{tools:{listChanged:false}},serverInfo:{name:'furnish-blender',version:'1.0.0'},instructions:'Use furnish_model doctor/profiles for the checkout. Use blender_session doctor and attach explicitly before GUI edits; acquire a write grant. Work on a copy. Consult blender_op op=catalog before invoking upstream ops. Never infer visual acceptance from automated checks. Furnish owns production dimensions/layout and persistence.'};}
   else if(m.method==='ping')value={};
   else if(!initialized)throw Object.assign(Error('Initialize MCP first'),{code:-32002});
   else if(m.method==='tools/list')value={tools};
   else if(m.method==='tools/call'){
    try{const name=m.params?.name,a=m.params?.arguments||{};validate(name,a);value=result(await(name==='furnish_model'?furnish(a):client.execute(name,a)));}
    catch(e){value={isError:true,content:[{type:'text',text:e.message}]};}
   }else throw Object.assign(Error('Method not found'),{code:-32601});
   send({jsonrpc:'2.0',id,result:value});
  }catch(e){send({jsonrpc:'2.0',id,error:{code:e.code||-32602,message:e.message}});}
 }
 input.setEncoding('utf8');input.on('data',chunk=>{
  buffer+=chunk;
  let end;while((end=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,end);buffer=buffer.slice(end+1);if(overflow||Buffer.byteLength(line)>8*1024*1024){overflow=false;send({jsonrpc:'2.0',id:null,error:{code:-32600,message:'Request too large'}});continue;}if(!line.trim())continue;let m;try{m=JSON.parse(line);}catch{send({jsonrpc:'2.0',id:null,error:{code:-32700,message:'Parse error'}});continue;}const p=handle(m).finally(()=>pending.delete(p));pending.add(p);}
  if(Buffer.byteLength(buffer)>8*1024*1024){buffer='';overflow=true;}
 });
 input.on('end',async()=>{await Promise.allSettled([...pending]);await client.release();});
 return {idle:()=>Promise.allSettled([...pending])};
}
if(require.main===module)serve();
module.exports={serve,tools,validate,result,failed};
