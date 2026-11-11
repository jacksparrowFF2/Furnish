'use strict';
const fs=require('node:fs'),path=require('node:path');
const [root,profile,device,dir]=process.argv.slice(2),file=path.join(dir,'job.json');
let job=JSON.parse(fs.readFileSync(file,'utf8'));
function save(patch){job={...job,...patch};const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(job,null,2));fs.renameSync(temp,file);}
save({state:'running',pid:process.pid});
require(path.join(root,'scripts/verify/verify-model-pipeline.cjs')).main([profile,device]).then(result=>save({state:'completed',passed:result.passed,finished:new Date().toISOString(),result,visualReview:{status:'not-executed',reason:'Technical verification never substitutes for viewing references and renders.'}})).catch(e=>{save({state:'failed',passed:false,error:e.message,finished:new Date().toISOString()});console.error(e.stack);process.exitCode=1;});
