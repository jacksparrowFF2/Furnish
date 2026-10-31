/* Refresh the versioned repository index without moving or changing model assets. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),root=path.resolve(__dirname,'..');
function outputs(){
 const index=require('./lib/model-asset-index.cjs').build();
 const readme=['# 建模资产索引','','此目录保存正式作者源。下表由生产规则、验证清单和离线资产来源哈希生成；不能只按vN目录判断当前版本。所有链接相对项目，可随Git一起使用。','','更新：`node scripts/index-model-assets.cjs --write`；核对：`node scripts/index-model-assets.cjs --check`。','',''+index.counts.blenderModels+'组Blender模型；验证清单另有'+index.counts.parametricVerificationConfigurations+'组参数化配置；家具库'+index.counts.catalogEntries+'条目／'+index.counts.catalogTypes+'种类型。','','| 产品 | 当前源工程 | 当前GLB | 型号文档 |','|---|---|---|---|',...index.models.map(m=>'| '+m.name+' | [BLEND]('+path.posix.relative('assets/models',m.current.blend)+') | [GLB]('+path.posix.relative('assets/models',m.current.glb)+') | [说明]('+path.posix.relative('assets/models',m.document)+') |'),'','[完整机器可读索引](index.json)包含当前文件、源哈希、其他保留版本、材质精修工程、生产构造器、作者脚本、参数化验证配置与全部家具库条目。','','本索引仅管理资产元信息，不接管浏览器加载。旧版本保留，不自动清理；参数化模型不伪装成独立作者BLEND。','','本机D盘整理库是可选导出副本，全屋工程绑定继续由`.local/blender-project.json`维护；本机绝对路径不写入此索引。详见[存放与更新说明](../../docs/MODEL-ASSET-STORAGE.md)。',''].join('\n');
 return {'assets/models/index.json':JSON.stringify(index,null,2)+'\n','assets/models/README.md':readme};
}
function main(mode){
 if(!['--write','--check'].includes(mode))throw Error('Usage: node scripts/index-model-assets.cjs <--write|--check>');
 for(const [name,body]of Object.entries(outputs())){
  const file=path.join(root,name);
  if(mode==='--write')fs.writeFileSync(file,body);
  else if(!fs.existsSync(file)||fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')!==body)throw Error('Asset index is stale: '+name+'; run --write');
 }
 console.log(mode==='--write'?'Updated portable repository model index':'PASS repository model index, sources and relative links');
}
if(require.main===module){try{main(process.argv[2]);}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={outputs,main};
