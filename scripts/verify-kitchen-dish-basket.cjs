// Local server and isolated Chrome profiles; does not touch the user's browser data.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {chromium}=require(process.env.FURNISH_PLAYWRIGHT||'C:/Users/SPH/AppData/Local/npm-cache/_npx/31e32ef8478fbf80/node_modules/playwright');
(async()=>{
 const root=path.resolve(__dirname,'..'),out=path.join(root,'output/playwright/kitchen-dish-basket');fs.mkdirSync(out,{recursive:true});
 const server=http.createServer((req,res)=>{const target=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!target.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}fs.readFile(target,(e,data)=>{if(e){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'})[path.extname(target)]||'application/octet-stream');res.end(data);});});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
 try{browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});const page=await browser.newPage(),verify=eval('('+fs.readFileSync(path.join(__dirname,'verify-kitchen-dish-basket.browser.js'),'utf8')+')');console.log(JSON.stringify(await verify(page,'http://127.0.0.1:'+server.address().port)));}finally{await browser?.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
