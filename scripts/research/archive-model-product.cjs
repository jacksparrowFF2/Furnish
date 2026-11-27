/* Archive one product observation from stdin and refresh the local model index. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {captureProduct}=require('../mcp-references.cjs');
const index=require('../index-model-assets.cjs');

if(require.main===module){
 try{
  const input=JSON.parse(fs.readFileSync(0,'utf8'));
  const receipt=captureProduct(path.resolve(__dirname,'../..'),input);
  try{
   index.main('--write',()=>{});
   receipt.indexUpdated=true;
  }catch(error){
   receipt.indexUpdated=false;
   receipt.indexError=error.message;
   process.exitCode=1;
  }
  console.log(JSON.stringify(receipt));
 }catch(error){
  console.error(error.message);
  process.exitCode=1;
 }
}
