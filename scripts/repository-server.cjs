/* Same-origin loopback archive API. Paths change only through explicit settings. */
'use strict';
const Files=require('./workspace-files.cjs'),digest=Files.digest;
function create(root){
 const files=Files.create(root),{read,write,recover,recoveries}=files;
 async function handle(req,res){
  const route=req.url.split('?')[0];if(!route.startsWith('/api/furnish/'))return false;
  const reply=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
  try{
   // No CORS; reject cross-site writes and DNS-rebinding hosts, even on loopback.
   const host=req.headers.host||'',origin=req.headers.origin;
   if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host)||origin&&origin!=='http://'+host||req.headers['sec-fetch-site']==='cross-site')throw Object.assign(Error('仅允许本机同源访问'),{status:403});
   if(req.method==='GET'&&route==='/api/furnish/workspace'){reply(200,{...read(),storage:files.info({inspect:false})});return true;}
   if(req.method==='GET'&&route==='/api/furnish/recoveries'){reply(200,recoveries());return true;}
   if(req.method==='GET'&&route==='/api/furnish/storage'){reply(200,files.info());return true;}
   if(req.method==='GET'&&route==='/api/furnish/backups'){reply(200,files.backups());return true;}
   if(req.method==='GET'&&route.startsWith('/api/furnish/backups/')){reply(200,files.getBackup(route.slice('/api/furnish/backups/'.length)));return true;}
   if(!['PUT','POST'].includes(req.method))throw Object.assign(Error('不支持的请求'),{status:405});
   if(req.headers['content-type']!=='application/json'||req.headers['x-furnish-request']!=='workspace-v1')throw Object.assign(Error('无效的保存请求'),{status:403});
   let size=0,chunks=[];for await(const chunk of req){size+=chunk.length;if(size>64e6)throw Object.assign(Error('工作区上限 64 MB'),{status:413});chunks.push(chunk);}
   const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   if(route==='/api/furnish/workspace'&&req.method==='PUT')reply(200,write(body.workspace,body.baseRevision));
   else if(route==='/api/furnish/recoveries'&&req.method==='POST')reply(200,recover(body.workspace));
   else if(route==='/api/furnish/storage'&&req.method==='POST')reply(200,files.setLocation(body.directory,body.baseRevision));
   else if(route==='/api/furnish/restore'&&req.method==='POST')reply(200,files.restore(body.id,body.baseRevision));
   else reply(404,{error:'接口不存在'});
  }catch(e){reply(e.status||400,{error:e.message});}return true;
 }
 return {handle,...files};
}
module.exports={create,digest};
