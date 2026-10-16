/* Portable entry point for the existing browser acceptance cases. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const V=require('./lib/browser-verification.cjs');
const standalone=['beam-roof','cut-board-motion','dining-plan-order','dxf-supplement','furniture-recovery','multi-region-merge','pipe-collisions','recessed-bay'];
const dependencies={'drawing':['workflow-reimport'],'drawing-readability':['workflow-reimport'],'room-net':['workflow-reimport'],'purchase-orders':['room-net'],'purchase-relink':['purchase-orders'],'furniture-labels':['purchase-orders']};
function cases(){const entries=fs.readdirSync(__dirname).filter(n=>/^verify-.*\.browser\.js$/.test(n)).map(file=>[file.slice(7,-11),file]);return new Map([...entries,...standalone.map(n=>[n,'verify-'+n+'.cjs'])]);}
function plan(names,registry=cases()){
 const result=[],seen=new Set(),visiting=new Set();function add(name){if(!registry.has(name))throw Error('Unknown browser case: '+name+' (use --list)');if(visiting.has(name))throw Error('Cyclic browser dependency: '+name);if(seen.has(name))return;visiting.add(name);for(const dep of dependencies[name]||[])add(dep);visiting.delete(name);seen.add(name);result.push(name);}for(const name of names)add(name);return result;
}
function failed(value){return !!value&&typeof value==='object'&&(value.status==='FAIL'||value.passed===false||Object.values(value).some(v=>v&&typeof v==='object'&&failed(v)));}
async function worker(name){
 if(!process.env.FURNISH_VERIFY_ROOT||path.resolve(process.env.FURNISH_VERIFY_ROOT)===V.projectRoot)throw Error('Run browser cases through scripts/verify-browser.cjs; --worker requires an isolated copy.');
 const config=V.configuration(),file=cases().get(name);if(!file)throw Error('Unknown browser case '+name);
 if(file.endsWith('.cjs')){require(path.join(__dirname,file));return;}
 const browser=await V.launch();try{
  const page=await browser.newPage();if(name==='tank-preview')await page.goto(config.baseURL+'output/robot-p20max/preview.html');
  const source=fs.readFileSync(path.join(__dirname,file),'utf8');
  const verify=new Function('return ('+source+'\n);')();
  const result=await verify(page,config);if(failed(result))throw Error(JSON.stringify(result));console.log(JSON.stringify({case:name,status:'PASS',result}));
 }finally{await browser.close();}
}
function child(args,options={}){
 return new Promise((resolve,reject)=>{const env=options.env||process.env,p=spawn(process.execPath,args,{cwd:env.FURNISH_VERIFY_ROOT||V.projectRoot,env,stdio:['ignore','pipe','pipe'],windowsHide:true});let output='',timedOut=false;const timer=setTimeout(()=>{timedOut=true;p.kill();},Number(process.env.FURNISH_VERIFY_TIMEOUT||360000));
  for(const stream of [p.stdout,p.stderr])stream.on('data',data=>{output+=data;});p.on('error',e=>{clearTimeout(timer);reject(e);});p.on('close',code=>{clearTimeout(timer);resolve({code:timedOut?124:code,output:output+(timedOut?'\nBrowser case timed out\n':'')});});
 });
}
async function main(args=process.argv.slice(2)){
 const registry=cases();if(args[0]==='--worker'){await worker(args[1]);return;}
 if(args.includes('--list')){for(const name of registry.keys())console.log(name);return;}
 if(args.includes('--help')){console.log('node scripts/verify-browser.cjs [case ... | --all | --list]\nDefault: portable-smoke (HTTP and offline file://). Optional environment: FURNISH_VERIFY_URL (bind a dedicated loopback origin), FURNISH_BROWSER_CHANNEL, FURNISH_BROWSER_PATH, FURNISH_VERIFY_HEADED=1, FURNISH_VERIFY_TIMEOUT (ms).');return;}
 const selected=plan(args.includes('--all')?[...registry.keys()]:args.length?args:['portable-smoke']);
 // Validate dependency installation and URL before copying or starting work.
 V.loadPlaywright();V.configuration();
 const output=path.join(V.projectRoot,'output/playwright');fs.mkdirSync(output,{recursive:true});
 const run=fs.mkdtempSync(path.join(output,'verification-'));
 const root=path.join(run,'workspace 迁移 #');fs.mkdirSync(root);
 for(const name of ['src','styles','assets','vendor','templates','scripts'])if(fs.existsSync(path.join(V.projectRoot,name)))fs.cpSync(path.join(V.projectRoot,name),path.join(root,name),{recursive:true});
 fs.copyFileSync(path.join(V.projectRoot,'index.html'),path.join(root,'index.html'));
 fs.cpSync(path.join(V.projectRoot,'tests/fixtures'),path.join(root,'tests/fixtures'),{recursive:true});
 const fixtureDir=path.join(root,'tests/fixtures/browser');
 fs.mkdirSync(path.join(root,'output/playwright/workflow-tools'),{recursive:true});fs.copyFileSync(path.join(fixtureDir,'reimport-input.furnish.json'),path.join(root,'output/playwright/workflow-tools/reimport-input.furnish.json'));
 fs.cpSync(fixtureDir,path.join(root,'output/playwright/real-drawing'),{recursive:true});
 const prepared=await child([path.join(root,'scripts/generate-previews.cjs')]);fs.writeFileSync(path.join(run,'previews.log'),prepared.output);if(prepared.code!==0)throw Error('Preview preparation failed: '+prepared.output);
 const server=await V.staticServer(root,process.env.FURNISH_VERIFY_URL),env={...process.env,FURNISH_VERIFY_ROOT:root,FURNISH_VERIFY_URL:server.baseURL},results=[];
 console.log('Isolated browser verification: '+run+'\nStatic service: '+server.baseURL);
 try{for(const name of selected){console.log('RUN '+name);const started=Date.now(),result=await child([__filename,'--worker',name],{env});fs.writeFileSync(path.join(run,name+'.log'),result.output);results.push({name,status:result.code===0?'PASS':'FAIL',seconds:Math.round((Date.now()-started)/100)/10,log:name+'.log'});console.log(results.at(-1).status+' '+name);if(result.code!==0){console.error(result.output.slice(-6000));break;}}}
 finally{await server.close();fs.writeFileSync(path.join(run,'results.json'),JSON.stringify({selected,results,notRun:selected.slice(results.length)},null,2));console.log('Results: '+path.join(run,'results.json'));}
 if(results.some(r=>r.status==='FAIL'))throw Error('Browser verification failed; inspect the case log.');
}
if(require.main===module)main().catch(e=>{console.error(e.stack||e);process.exitCode=1;});
module.exports={main,cases,plan,failed};
