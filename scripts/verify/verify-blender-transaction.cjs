'use strict';
const fs=require('fs'),path=require('path'),cp=require('child_process'),B=require('../blender-server.cjs');
(async()=>{const root=path.resolve(__dirname,'../..'),run=fs.mkdtempSync(path.join(root,'output/playwright/blender-transaction-'));fs.mkdirSync(path.join(run,'scripts'));
const executable=B.findBlender();if(!executable)throw Error('Installed Blender required');
const child=cp.spawn(executable,['--background','--factory-startup','--disable-autoexec','--python-exit-code','1','--python',path.join(__dirname,'verify-blender-transaction.py'),'--','--directory',run],{cwd:root,windowsHide:true,env:{...process.env,BLENDER_USER_SCRIPTS:path.join(run,'scripts')},stdio:'ignore'});child.on('error',e=>fs.writeFileSync(path.join(run,'transaction-error.txt'),e.stack));
for(let i=0;i<180;i++){if(fs.existsSync(path.join(run,'transaction-error.txt')))throw Error(fs.readFileSync(path.join(run,'transaction-error.txt'),'utf8'));if(fs.existsSync(path.join(run,'transaction-result.json'))){console.log('PASS real Blender transactions: '+run);return;}await new Promise(r=>setTimeout(r,1000));}throw Error('Blender transaction verification timed out: '+run);
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
