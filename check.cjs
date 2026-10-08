/* One command for production syntax and geometry/project regression checks. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),{spawnSync}=require('node:child_process');
const run=(args)=>{const r=spawnSync(process.execPath,args,{cwd:__dirname,encoding:'utf8'});if(r.status!==0){process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');process.exit(r.status||1);}};
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
for(const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)){
 const attrs=match[1];if(/src=|importmap/.test(attrs))continue;
 if(/type="module"/.test(attrs)){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'furnish-check-'));const file=path.join(dir,'view3d.mjs');try{fs.writeFileSync(file,match[2]);run(['--check',file]);}finally{fs.rmSync(file);fs.rmdirSync(dir);}}
 else new vm.Script(match[2]);
}
for(const file of fs.readdirSync(__dirname).filter(f=>/\.js$/.test(f)))run(['--check',file]);
for(const file of fs.readdirSync(__dirname).filter(f=>/^test-.*\.cjs$/.test(f)).sort()){run([file]);console.log('PASS '+file);}
run(['validate-plans.mjs']);console.log('PASS 12 built-in plans and all production syntax checks');
