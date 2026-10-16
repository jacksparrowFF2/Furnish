/* Regenerate ignored model viewers from a checkout with no output directory. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
function generate(){
 const root=path.resolve(__dirname,'..');
 const scripts=fs.readdirSync(__dirname).filter(name=>/^preview-.*\.cjs$/.test(name)||name==='create-fotile-previews.cjs').sort();
 for(const name of scripts){
  const result=spawnSync(process.execPath,[path.join(__dirname,name)],{cwd:root,encoding:'utf8'});
  if(result.error)throw result.error;
  if(result.status!==0)throw Error(name+': '+(result.stderr||result.stdout));
  console.log('Generated '+name);
 }
 return scripts.length;
}
if(require.main===module)console.log('Generated '+generate()+' preview generators; output remains local.');
module.exports={generate};
