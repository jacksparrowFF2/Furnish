'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{EventEmitter}=require('node:events');
const Gui=require('../plugins/furnish-blender/mcp/gui.cjs'),{Client}=require('../plugins/furnish-blender/mcp/client.cjs');
async function main(){
 const parent=path.resolve(__dirname,'../output/codex-blender-autostart-unit');fs.mkdirSync(parent,{recursive:true});const data=fs.mkdtempSync(path.join(parent,'run-'));
 const headers={'x-dsh-host-id':'codex','x-dsh-session-id':'test'},id=Gui.callerId(headers);let list=[{instanceId:'user-existing',ready:true}],count=0,options,tick=0;
 const manager=Gui.create({data,port:()=>43210,blender:'fixture-blender',instances:()=>list,now:()=>tick,delay:async()=>{tick+=200;list.push({instanceId:id,ready:true});},spawnImpl:(_exe,argv,opts)=>{count++;options={argv,opts};const child=new EventEmitter();child.pid=process.pid;child.unref=()=>{};return child;}});
 const [a,b]=await Promise.all([manager.ensure(headers),manager.ensure(headers)]);assert.equal(count,1);assert.equal(a.instance.instanceId,id);assert.equal(b.instance.instanceId,id);assert.notEqual(id,'user-existing');
 assert.equal((await manager.ensure(headers)).reused,true);assert.equal(count,1);assert.equal(options.opts.env.DSHBB_GATEWAY_PORT,'43210');assert.equal(options.opts.env.DSHBB_INSTANCE_ID,id);assert(options.argv.includes('--factory-startup'));assert(options.opts.env.BLENDER_USER_CONFIG.startsWith(data));
 assert.throws(()=>Gui.callerId({}),/identity/);
 const client=new Client({data,port:43210});const calls=[];
 client.call=async(route,payload)=>{calls.push(route);if(route==='/lease'&&payload.action==='status')return {ok:false,code:'session_not_found'};if(route==='/codex/gui')return {ok:true,instance:{instanceId:id}};if(route==='/lease'&&payload.action==='attach')return {ok:true,session:{id:'owned',status:'ready',instanceId:id}};if(route==='/act')return {ok:true};throw Error('Unexpected route');};
 await client.execute('blender_py',{code:'print(1)'});assert.deepEqual(calls,['/lease','/codex/gui','/lease','/act']);
 calls.length=0;await assert.rejects(()=>client.execute('blender_py',{}),/exactly one/);assert.equal(calls.length,0);
 client.autoGui=false;await assert.rejects(()=>client.ready(),/disabled/);assert(!calls.includes('/codex/gui'));
 calls.length=0;client.autoGui=true;client.call=async route=>{calls.push(route);return {ok:true,session:{id:'explicit-user',status:'ready'}};};await client.ready();assert.deepEqual(calls,['/lease']);
 console.log('PASS managed GUI concurrent launch, exact identity, user-instance exclusion, isolated config, reuse, opt-out and existing attachment');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
