/* Copy a pinned, reachable ESM graph. No bundler and no network at runtime. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
function build(source,weights,out=path.resolve(__dirname,'../vendor/lighting-preview')){
 const pins={three:'0.187.0','three-gpu-pathtracer':'0.0.28','three-mesh-bvh':'0.9.17','oidn-webgpu':'0.6.0'};
 for(const [pkg,version]of Object.entries(pins))if(JSON.parse(fs.readFileSync(path.join(source,pkg,'package.json'))).version!==version)throw Error('Unexpected version: '+pkg);
 const aliases={'three':'three/build/three.webgpu.js','three/webgpu':'three/build/three.webgpu.js','three/tsl':'three/build/three.tsl.js','three-mesh-bvh':'three-mesh-bvh/src/index.js','three-mesh-bvh/webgpu':'three-mesh-bvh/src/webgpu/index.js','three-mesh-bvh/worker':'three-mesh-bvh/src/workers/index.js'};
 const queue=['three/build/three.webgpu.js','three/examples/jsm/loaders/GLTFLoader.js','three-gpu-pathtracer/src/webgpu/index.js','three-mesh-bvh/src/workers/GenerateMeshBVHWorker.js','oidn-webgpu/dist/oidn.js'],seen=new Set(),hash=v=>crypto.createHash('sha256').update(v).digest('hex'),files=[];
 // AUX.ext is a reserved Windows device name, even with multiple extensions.
 const portable=name=>name.replace(/(^|\/)(aux|con|prn|nul|com[1-9]|lpt[1-9])(?=\.|\/|$)/gi,'$1furnish-$2');
 function save(name,data,original){const target=path.join(out,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,data);files.push({path:name,sha256:hash(data),...(original?{sourceSha256:hash(original)}:{})});}
 while(queue.length){const name=queue.shift();if(seen.has(name))continue;seen.add(name);const original=fs.readFileSync(path.join(source,name),'utf8');
  const code=original.replace(/((?:^\s*(?:import|export)\s+(?:[\w*{},\s]+?\s+from\s*)?|\bimport\s*\(\s*|\bnew\s+URL\s*\(\s*)['"])([.@\w][\w@./-]*)(['"])/gm,(match,start,spec,end)=>{
   let target;if(spec.startsWith('.'))target=path.posix.normalize(path.posix.join(path.posix.dirname(name),spec));
   else if(aliases[spec])target=aliases[spec];else if(spec.startsWith('three/addons/'))target='three/examples/jsm/'+spec.slice(13);else if(spec.startsWith('three/examples/'))target=spec;else throw Error('Unresolved import '+name+': '+spec);
   if(!target.startsWith('three/')&&!target.startsWith('three-')&&!target.startsWith('oidn-webgpu/'))throw Error('Escaping dependency: '+target);
   queue.push(target);let relative=path.posix.relative(path.posix.dirname(portable(name)),portable(target));if(!relative.startsWith('.'))relative='./'+relative;return start+relative+end;
  });save(portable(name),code,original);
 }
 for(const pkg of Object.keys(pins)){const license=['LICENSE','LICENSE.md','LICENSE.txt'].find(n=>fs.existsSync(path.join(source,pkg,n)));if(!license)throw Error('License missing: '+pkg);save(pkg+'/'+license,fs.readFileSync(path.join(source,pkg,license)));}
 const weight=fs.readFileSync(weights);if(hash(weight)!=='980ea307e7825cae23ed8b1addf8de62ece84b61094795a5631ebf1c91b2e1a7')throw Error('Unexpected OIDN weights');save('rt_hdr_alb_nrm_small.tza',weight);
 save('OIDN-WEIGHTS-LICENSE.txt',fs.readFileSync(path.join(path.dirname(weights),'OIDN-WEIGHTS-LICENSE.txt')));
 fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify({schema:1,packages:pins,policy:'Pinned local ESM graph; import paths rewritten to local relative paths, including module workers. No runtime CDN.',weightsSource:'https://raw.githubusercontent.com/pissang/oidn-webgpu/main/weights/rt_hdr_alb_nrm_small.tza',files},null,2)+'\n');
 return {files:files.length,bytes:files.reduce((s,f)=>s+fs.statSync(path.join(out,f.path)).size,0)};
}
if(require.main===module){if(process.argv.length!==4)throw Error('Usage: node scripts/vendor-lighting-preview.cjs <node_modules> <weights.tza>');console.log(build(process.argv[2],process.argv[3]));}
module.exports={build};
