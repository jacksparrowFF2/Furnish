/* Local CLI registration; HTTP clients cannot choose a file to execute/open. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
function read(root){try{const value=JSON.parse(fs.readFileSync(path.join(root,'.local/blender-project.json'),'utf8'));if(value.version!==1||!/^[-\w.]{1,128}$/.test(value.planId)||!path.isAbsolute(value.file)||path.extname(value.file).toLowerCase()!=='.blend'||!fs.statSync(value.file).isFile())return null;return value;}catch{return null;}}
function register(root,file,planId){if(!/^[-\w.]{1,128}$/.test(planId))throw Error('需要有效户型ID');file=fs.realpathSync(file);if(path.extname(file).toLowerCase()!=='.blend'||!fs.statSync(file).isFile())throw Error('需要已保存的Blender工程');const value={version:1,file,planId,name:path.basename(file)};fs.mkdirSync(path.join(root,'.local'),{recursive:true});fs.writeFileSync(path.join(root,'.local/blender-project.json'),JSON.stringify(value,null,2));return value;}
if(require.main===module){try{const [file,planId]=process.argv.slice(2);if(!file||!planId)throw Error('用法：node scripts/blender-project.cjs <精修.blend> <户型ID>');console.log(JSON.stringify(register(path.resolve(__dirname,'..'),file,planId)));}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={read,register};
