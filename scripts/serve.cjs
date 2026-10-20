/* Optional local HTTP server for PDF reference imports. No npm installation needed. */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),port=Number(process.env.FURNISH_PORT||8765);
const runtime=require('./server-runtime.cjs'),codeFingerprint=runtime.fingerprint(__filename);
const instance={app:'furnish',protocol:1,root:fs.realpathSync(root),fingerprint:codeFingerprint,pid:process.pid,token:require('node:crypto').randomUUID()};
const repository=require('./repository-server.cjs').create(root);
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.mjs':'text/javascript;charset=utf-8','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json','.pdf':'application/pdf','.wasm':'application/wasm','.dxf':'text/plain','.obj':'text/plain'};
function control(req,res){
 const route=req.url.split('?')[0];if(!['/api/furnish/server','/api/furnish/server/restart'].includes(route))return false;
 const reply=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 const host=req.headers.host||'',origin=req.headers.origin;
 if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host)||origin&&origin!=='http://'+host||req.headers['sec-fetch-site']==='cross-site'){reply(403,{error:'Local same-origin requests only'});return true;}
 if(route==='/api/furnish/server'&&req.method==='GET')reply(200,instance);
 else if(route==='/api/furnish/server/restart'&&req.method==='POST'&&req.headers['x-furnish-restart']===instance.token){
  reply(200,{restarting:true});server.close(()=>process.exit(0));
 }else reply(403,{error:'Invalid control request'});
 return true;
}
const server=http.createServer(async(req,res)=>{if(control(req,res)||await repository.handle(req,res))return;let file;try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)||file.slice(root.length+1).split(path.sep).some(s=>s.startsWith('.'))){res.writeHead(403).end();return;}}catch{res.writeHead(400).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});});
const url=`http://127.0.0.1:${port}/`;
function openPage(){
 if(!process.argv.includes('--open')||process.platform!=='win32')return;
 const browser=require('node:child_process').spawn('explorer.exe',[url],{stdio:'ignore'});
 browser.on('error',e=>console.error(`Open the URL above in your browser: ${e.message}`));
 browser.unref();
}
let restartRetries=0;
server.on('error',async e=>{
 if(e.code==='EADDRINUSE'){
  if(restartRetries){if(--restartRetries){setTimeout(listen,100);return;}console.error('Furnish restart timed out; the original service has not released the port.');process.exitCode=1;return;}
  const existing=await runtime.request(url+'api/furnish/server');
  if(existing?.app==='furnish'&&existing.protocol===1&&existing.root===instance.root&&typeof existing.token==='string'){
   if(existing.fingerprint===codeFingerprint){console.log(`Furnish is already running: ${url}`);openPage();return;}
   console.log('Furnish backend code changed. Restarting the local service...');
   if((await runtime.request(url+'api/furnish/server/restart',{method:'POST',token:existing.token}))?.restarting){restartRetries=50;listen();return;}
   console.error('Furnish could not restart the existing service. Please close its server window and try again.');process.exitCode=1;return;
  }
 }
 console.error(e.code==='EADDRINUSE'?`Port ${port} is occupied by another or unrecognized service. Set FURNISH_PORT to another port.`:e.message);
 process.exitCode=1;
});
server.on('listening',()=>{
 console.log(`Furnish: ${url}`);
 console.log('Close this window or press Ctrl+C to stop the server.');
 openPage();
});
function listen(){server.listen(port,'127.0.0.1');}
listen();
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
