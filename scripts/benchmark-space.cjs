/* Deterministic spatial-check workload; run before/after optimizations. */
const {performance}=require('node:perf_hooks'),{createHash}=require('node:crypto'),P=require('../src/core/project-core.js');
const count=Number(process.argv[2]||350),plan={rooms:[{id:'r',name:'大方案',poly:[[0,0],[30000,0],[30000,24000],[0,24000]]}],walls:[],doors:[],wins:[]},furniture=Array.from({length:count},(_,i)=>({id:'f'+i,name:'柜'+i,type:'custom',cx:600+i%35*800,cy:600+Math.floor(i/35)*1000,w:300,d:400,h:800,rot:i%3*30,frontClearance:0}));
const start=performance.now(),issues=P.spaceCheck(plan,furniture),ms=performance.now()-start;
console.log(JSON.stringify({count,ms:Number(ms.toFixed(1)),issues:issues.length,resultHash:createHash('sha256').update(JSON.stringify(issues)).digest('hex')}));
