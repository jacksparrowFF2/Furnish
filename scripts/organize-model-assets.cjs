/* Build a reviewable model library copy. Production paths and user projects stay intact. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),P=require('../src/core/product-rules.js'),C=require('../src/data/catalog.js');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const relative=p=>p.split(path.sep).join('/'),safe=s=>s.replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').replace(/[. ]+$/,'');
const link=(f,label)=>'<a href="'+esc(pathToFileURL(f).href)+'">'+esc(label)+'</a>';
const {docs}=require('./lib/model-asset-index.cjs');
function sceneIndex(dest){
 // Whole-room projects remain in their own locations: keep bindings and large files intact.
 const config=path.join(root,'.local/blender-project.json');let bound=null;
 if(fs.existsSync(config)){const c=JSON.parse(fs.readFileSync(config,'utf8'));if(typeof c.file==='string'&&fs.existsSync(c.file))bound=c.file;}
 const scenes=[],base=path.resolve(path.dirname(dest),'渲染');
 function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,e.name);if(e.isDirectory()){if(!/(?:工作区|node_modules|^assets$|^\.git$)/i.test(e.name))walk(file);}else if(/\.blend$/i.test(e.name)&&!/^userpref|^startup/i.test(e.name))scenes.push({file,bytes:fs.statSync(file).size,bound:bound&&path.resolve(bound)===path.resolve(file)});}}
 if(fs.existsSync(base))walk(base);
 if(bound&&!scenes.some(s=>s.bound))scenes.unshift({file:bound,bytes:fs.statSync(bound).size,bound:true});
 scenes.sort((a,b)=>Number(b.bound)-Number(a.bound)||a.file.localeCompare(b.file));
 fs.mkdirSync(path.join(dest,'全屋场景与精修'),{recursive:true});fs.writeFileSync(path.join(dest,'全屋场景与精修','工程索引.json'),JSON.stringify({boundProject:bound,scanRoot:base,filesCopied:false,scenes},null,2));
 const view='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>全屋场景与精修</title><style>body{font:16px/1.8 system-ui;max-width:1200px;margin:32px auto;padding:24px}li{margin:12px 0}small{color:#666}</style><h1>全屋场景与精修</h1><p>这些是整屋工程，保留原位置，仅建立入口。当前绑定来自本机blender-project配置，不按修改时间猜测最新工程。历史验证／备份工程不等于当前模型资产；不扫描名含“工作区”的目录，不收入userpref／startup。</p><ul>'+scenes.map(s=>'<li>'+(s.bound?'<strong>当前Furnish绑定 · </strong>':'')+link(s.file,path.relative(base,s.file))+' <small>'+Math.round(s.bytes/1048576)+' MB</small></li>').join('')+'</ul></html>';
 fs.writeFileSync(path.join(dest,'全屋场景与精修','工程入口.html'),view);return {boundProject:bound,sceneCount:scenes.length,filesCopied:false};
}
function main(target){
 if(!target)throw Error('Usage: node scripts/organize-model-assets.cjs <new-empty-directory>');
 const dest=path.resolve(target);if(dest===root||dest.startsWith(path.join(root,'assets')+path.sep)||dest.startsWith(path.join(root,'src')+path.sep))throw Error('Choose a separate library directory');
 if(fs.existsSync(dest)&&fs.readdirSync(dest).length)throw Error('Output must be empty; use a new directory to preserve existing edits');
 const profiles=require('./lib/model-profiles.cjs').profiles(),blender=profiles.filter(p=>p.asset),files=[],models=[],before={};
 function copy(source,to,profile,kind){
  source=path.resolve(root,source);const digest=hash(source),output=path.join(dest,to);before[source]=digest;
  fs.mkdirSync(path.dirname(output),{recursive:true});fs.copyFileSync(source,output);if(hash(output)!==digest)throw Error('Copy mismatch: '+output);
  const row={profile,kind,source,library:relative(to),sha256:digest,bytes:fs.statSync(source).size};files.push(row);return row;
 }
 fs.mkdirSync(dest,{recursive:true});
 for(const p of blender){
  const directory=path.join('Blender成品模型',safe(p.fixture.name)+' ['+p.id+']'),base=path.join(root,'assets/models',p.id),runtime=require(path.join(root,p.asset.runtime));
  if(hash(path.join(root,p.asset.glb))!==runtime.sourceSha256)throw Error('Published source mismatch: '+p.id);
  const current=new Set([p.asset.blend,p.asset.glb].map(f=>path.resolve(root,f))),row={id:p.id,type:p.type,name:p.fixture.name,directory:relative(directory),parts:p.asset.parts,runtimeVersion:runtime.version,sourceSha256:runtime.sourceSha256,active:[],other:[],documents:[]};
  for(const key of ['blend','glb'])row.active.push(copy(p.asset[key],path.join(directory,'当前发布源',path.basename(p.asset[key])),p.id,'当前发布源'));
  copy(p.asset.runtime,path.join(directory,'离线运行资产',path.basename(p.asset.runtime)),p.id,'离线运行资产');
  function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name);if(e.isDirectory())walk(f);else if(/\.(blend|glb)$/i.test(f)&&!current.has(f)){const kind=e.name==='material-studio.blend'?'材质精修工程':'其他保留版本';row.other.push(copy(f,path.join(directory,kind,path.relative(base,f)),p.id,kind));}}}walk(base);
  const document=path.join(root,'docs',docs[p.id]);if(!fs.existsSync(document))throw Error('Missing product document: '+document);row.documents.push(document);
  const renderModule=P.definition(p.fixture)?.solidModel?.module,constructor=renderModule?path.join(root,'src/render',renderModule+'-model.js'):null;
  const author=path.join(root,'scripts','blender-model-'+(p.id.startsWith('washer')?'washer':p.id==='corner-bookcase-580'?'corner-bookcase':p.id)+'.py');
  row.constructor=constructor&&fs.existsSync(constructor)?constructor:null;row.author=fs.existsSync(author)?author:null;
  const lines=['产品：'+row.name,'标识：'+row.type,'当前运行资产版本：'+runtime.version,'当前源GLB SHA256：'+runtime.sourceSha256,'源位置：'+path.join(root,p.asset.glb),'',
   '当前发布源为按运行资产来源哈希匹配的BLEND/GLB副本，不按vN目录排序。',
   '“其他保留版本”只表示非当前发布源，不证明无用或均已通过验证。',
   '“材质精修工程”与发布几何源分开；程序节点效果未必能传到GLB。',
   '副本可用于查看、导入和精修；修改副本不会自动更新Furnish。发布仍沿原建模／校验流程。',
   '模型合同与验收资料仍在源仓库；本目录不是独立可运行的Furnish发布包。'];
  fs.writeFileSync(path.join(dest,directory,'来源与使用说明.txt'),'\ufeff'+lines.join('\r\n'));
  fs.writeFileSync(path.join(dest,directory,'来源记录.json'),JSON.stringify(row,null,2));models.push(row);
 }
 // Include the canonical input dossiers so new exports no longer depend on the old D-drive photo archive.
 const inputs=require('./lib/model-asset-index.cjs').dossiers();
 for(const product of inputs){
  const directory=path.join('产品输入资料',safe(product.name)+' ['+product.id+']');
  copy(product.manifest,path.join(directory,'asset.json'),product.id,'产品资料清单');
  for(const reference of [...product.references,...(product.supportingFiles||[])])copy('assets/models/'+product.id+'/'+reference.path,path.join(directory,...reference.path.split('/')),product.id,'输入参考资料');
  fs.writeFileSync(path.join(dest,directory,'说明.txt'),'\ufeff输入资料来自Furnish项目产品档案；图片及来源清单保持原字节。asset.json中的document等项目相对路径需在源仓库中解析，references路径可相对本目录解析。此目录为快照，修改不会自动发布。');
 }
 const items=C.library.flatMap(category=>category.items.map(i=>({category:category.cat,type:i[0],name:i[1],w:i[2],d:i[3],h:i[6]??P.height({type:i[0]}),route:P.definition(i[0])?.solidModel?.module||'index-inline'}))),types=[...new Set(items.map(i=>i.type))];
 const parametric=profiles.filter(p=>!p.asset).map(p=>({id:p.id,type:p.type,name:p.fixture.name,route:'parametric',fixture:p.fixture,module:P.definition(p.fixture)?.solidModel?.module||'index-inline'}));
 fs.mkdirSync(path.join(dest,'参数化模型'),{recursive:true});fs.writeFileSync(path.join(dest,'参数化模型','配置索引.json'),JSON.stringify(parametric,null,2));
 fs.writeFileSync(path.join(dest,'参数化模型','说明.txt'),'\ufeff参数化模型由src/core和src/render构造，部分旧入口在index.html。\r\n配置索引列出验证清单中的参数化配置，不等于全部家具库条目。\r\n这些模型没有独立作者BLEND；如需静态文件，应在Furnish设置实际尺寸与姿态后从生产入口导出GLB。output内历史导出不作为当前正式资产。\r\n');
 fs.writeFileSync(path.join(dest,'全部家具库条目.json'),JSON.stringify(items,null,2));
 const csv=rows=>'\ufeff'+rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 fs.writeFileSync(path.join(dest,'资产文件清单.csv'),csv([['产品标识','类别','整理位置','源位置','SHA256','字节数'],...files.map(f=>[f.profile,f.kind,f.library,f.source,f.sha256,f.bytes])]));
 fs.writeFileSync(path.join(dest,'家具库条目.csv'),csv([['类别','类型','名称','宽mm','深mm','高mm','构造模块'],...items.map(i=>[i.category,i.type,i.name,i.w,i.d,i.h,i.route])]));
 const revision=require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',windowsHide:true}).trim();
 const summary={generated:new Date().toISOString(),sourceRoot:root,sourceRevision:revision,libraryRoot:dest,blenderModels:models.length,parametricVerificationConfigurations:parametric.length,verificationConfigurations:profiles.length,catalogEntries:items.length,catalogTypes:types.length,files:files.length,bytes:files.reduce((n,f)=>n+f.bytes,0),models,scenes:sceneIndex(dest),sourceFilesUnchanged:Object.entries(before).every(([f,h])=>hash(f)===h)};
 if(!summary.sourceFilesUnchanged)throw Error('Source changed during copying; keep this snapshot for review and create a new one');
 fs.writeFileSync(path.join(dest,'资产索引.json'),JSON.stringify(summary,null,2));
 const cards=models.map(m=>'<section data-name="'+esc(m.name+' '+m.id)+'"><h2>'+esc(m.name)+'</h2><p>'+esc(m.type)+' · '+m.parts+'件 · 运行资产v'+m.runtimeVersion+'</p><p>'+m.active.map(f=>link(path.join(dest,f.library),path.extname(f.library).slice(1).toUpperCase())).join(' · ')+' · '+link(m.documents[0],'型号文档')+(m.constructor?' · '+link(m.constructor,'生产构造器'):'')+(m.author?' · '+link(m.author,'作者脚本'):'')+'</p><details><summary>其他版本与材质工程（'+m.other.length+'）</summary>'+m.other.map(f=>'<p>'+esc(f.kind)+' · '+link(path.join(dest,f.library),path.relative(path.join(dest,m.directory),path.join(dest,f.library)))+'</p>').join('')+'</details></section>').join('');
 const photo=path.join(root,'assets/models/index.html');
 const page='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>建模资产库</title><style>body{font:16px/1.7 system-ui;max-width:1200px;margin:32px auto;padding:0 24px;background:#f4f1ea;color:#302d27}section{background:white;padding:20px 24px;margin:16px 0;border-radius:12px}h2{font-size:20px}input{padding:12px;font:inherit;width:min(90%,500px)}a{color:#386a85}summary{cursor:pointer}td,th{text-align:left;padding:8px;border-bottom:1px solid #ccc}table{width:100%}</style><h1>建模资产库</h1><p>'+models.length+'组Blender成品模型 · '+parametric.length+'组参数化验证配置 · 家具库'+items.length+'条目／'+types.length+'种类型</p><p>此处是整理副本。正式模型仍由Furnish仓库加载；副本修改不会自动发布。当前源按运行资产来源哈希确认，历史／精修工程单独保留。</p><p>'+link(path.join(dest,'资产文件清单.csv'),'文件与哈希清单')+' · '+link(path.join(dest,'家具库条目.csv'),'全部家具库条目')+' · '+link(path.join(dest,'参数化模型','配置索引.json'),'参数化配置')+(fs.existsSync(photo)?' · '+link(photo,'项目输入资料与模型总览'):'')+'</p><input placeholder="搜索产品／型号" oninput="document.querySelectorAll(\'section\').forEach(s=>s.hidden=!s.dataset.name.toLowerCase().includes(this.value.toLowerCase()))">'+cards+'<h2>正式存放位置</h2><table><tr><th>用途</th><th>位置</th></tr>'+[['源工程与交换模型','assets/models'],['离线运行网格','src/data'],['生产模型与产品规则','src/render · src/core'],['资料与验证记录','docs'],['临时生成、验证及测试副本（非正式库）','output · .local']].map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>').join('')+'</table></html>';
 fs.writeFileSync(path.join(dest,'资产总览.html'),page.replace('<h2>正式存放位置</h2>','<h2>全屋场景与精修</h2><p>'+link(path.join(dest,'全屋场景与精修','工程入口.html'),'全屋BLEND工程索引（'+summary.scenes.sceneCount+'份）')+'，原位置与当前绑定保留。</p><h2>正式存放位置</h2>'));fs.writeFileSync(path.join(dest,'整理说明.txt'),'\ufeff'+['建模资产库整理副本','源仓库：'+root,'源提交：'+revision,'',models.length+'组Blender模型：当前源BLEND/GLB、离线运行网格、其他保留版本和材质精修工程。',parametric.length+'组参数化配置在索引中；全部家具库另列'+items.length+'条目。','所有复制文件逐项SHA256比对，源文件未移动、重命名、覆盖或删除。','产品参考图使用同级“建模参考图片”入口，避免另复制一套图片。','output/.local中的试验、渲染下载、完整测试副本不批量收入或清理。','Tripo下载请先放单独待审核目录，验证尺寸、材质、身份后再进入正式发布链路。','后续更新：运行本脚本生成新的空目录快照，再比对来源记录；不覆盖已精修的副本。'].join('\r\n'));
 return summary;
}
if(require.main===module){try{const s=main(process.argv[2]);console.log(JSON.stringify({directory:s.libraryRoot,blender:s.blenderModels,parametricConfigurations:s.parametricVerificationConfigurations,catalogEntries:s.catalogEntries,catalogTypes:s.catalogTypes,files:s.files,sourceFilesUnchanged:s.sourceFilesUnchanged}));}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={main,sceneIndex};
