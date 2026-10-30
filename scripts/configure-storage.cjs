/* Explicit local configuration; never edits or deletes the source project. */
'use strict';
const path=require('node:path');
function main(args=process.argv.slice(2)){
 const api=require('./workspace-files.cjs').create(path.resolve(__dirname,'..'));
 if(args.length!==1)throw Error('用法：node scripts/configure-storage.cjs --status 或 "完整保存目录"');
 const info=args[0]==='--status'?api.info():api.setLocation(args[0],api.read().revision);
 console.log(JSON.stringify(info,null,2));
 if(args[0]!=='--status')console.log('原目录已保留。请重新启动 start-furnish.cmd（或桌面版）后刷新，以载入新的保存位置。');
}
if(require.main===module)try{main();}catch(e){console.error(e.message);process.exitCode=1;}
module.exports={main};
