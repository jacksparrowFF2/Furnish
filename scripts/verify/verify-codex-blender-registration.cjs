/* Read Codex's resolved plugin launch entry, then use that exact transport for MCP discovery. */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {findCodex,probe}=require('../register-codex-mcp.cjs');
async function main(){
 const codex=findCodex(),r=cp.spawnSync(codex,['mcp','get','furnish_blender','--json'],{encoding:'utf8',windowsHide:true,timeout:20000});
 if(r.status!==0)throw Error(r.stderr||'Codex could not resolve furnish_blender');
 const entry=JSON.parse(r.stdout),transport=entry.transport;
 assert.equal(entry.enabled,true,'furnish_blender is disabled');assert.equal(transport.type,'stdio');
 assert(transport.cwd&&path.isAbsolute(transport.cwd),'Codex must resolve the plugin cwd to an absolute directory');
 assert(transport.args.every(a=>!a.includes('${')),'Unexpanded plugin placeholder in resolved launch arguments');
 const names=await probe(entry);
 const expected=require('../../plugins/furnish-blender/mcp/server.cjs').tools.map(t=>t.name);
 assert.deepEqual([...names].sort(),expected.sort());
 const report={passed:true,checked:new Date().toISOString(),transport:{command:transport.command,args:transport.args,cwd:transport.cwd},tools:names};
 const target=path.resolve(__dirname,'../../output/codex-blender-registration.json');fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));return report;
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={main};
