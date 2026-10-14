/* Enrich the synthetic project actually downloaded during the workflow acceptance. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),P=require('../src/core/project-core.js');
const dir=path.resolve(__dirname,'../output/playwright/workflow-tools'),source=process.argv[2]||path.join(os.homedir(),'Downloads/custom_workflow_acceptance.furnish.json');
const payload=P.unpack(JSON.parse(fs.readFileSync(source,'utf8')));
if(payload.planId!=='custom_workflow_acceptance'||payload.current.furniture[0]?.id!=='outside_chair')throw Error('Expected the synthetic acceptance project; do not use user data');
payload.current.assets=[{name:'验收说明.txt',data:Buffer.from('合成附件：项目往返验收').toString('base64')}];
payload.current.measures=[{a:{x:2500,y:1500},b:{x:3500,y:1500}}];
payload.current.notes=[{id:'acceptance_note',x:2500,y:1800,text:'完整项目恢复验收',color:'paper',size:1}];
payload.catalog=[{id:'c_acceptance',name:'合成自定义柜',type:'custom',w:800,d:500,h:900,color:'#d9bf98',price:1800}];
payload.designs=[{name:'材料采购版',work:structuredClone(payload.current)},{name:'对比配色版',work:structuredClone(payload.current)}];
payload.designs[1].work.furniture[0].color='#789090';
fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'reimport-input.furnish.json'),JSON.stringify(P.pack(payload),null,2));
console.log('Synthetic reimport fixture prepared: materials, baseline, metadata, named designs, attachment, notes, measures and custom catalog.');
