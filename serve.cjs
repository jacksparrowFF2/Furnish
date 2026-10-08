/* Optional local HTTP server for PDF reference imports. No npm installation needed. */
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=__dirname,port=Number(process.env.FURNISH_PORT||8765);
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.mjs':'text/javascript;charset=utf-8','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json','.webmanifest':'application/manifest+json','.pdf':'application/pdf','.wasm':'application/wasm','.dxf':'text/plain','.obj':'text/plain'};
const server=http.createServer((req,res)=>{let file;try{const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)||file.slice(root.length+1).split(path.sep).some(s=>s.startsWith('.'))){res.writeHead(403).end();return;}}catch{res.writeHead(400).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});res.end(data);});});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} is already in use. If Furnish is running, use that page; otherwise set FURNISH_PORT to another port.`:e.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>{
 const url=`http://127.0.0.1:${port}/`;
 console.log(`Furnish: ${url}`);
 console.log('Close this window or press Ctrl+C to stop the server.');
 if(process.argv.includes('--open')&&process.platform==='win32'){
  const browser=require('node:child_process').spawn('explorer.exe',[url],{stdio:'ignore'});
  browser.on('error',e=>console.error(`Open the URL above in your browser: ${e.message}`));
  browser.unref();
 }
});
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
