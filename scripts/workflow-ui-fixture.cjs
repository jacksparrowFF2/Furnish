/* Run only on a fresh test origin; seeds a synthetic workspace once. */
const fs=require('node:fs'),path=require('node:path');
require('./make-workflow-fixture.cjs');
const root=path.resolve(__dirname,'..'),payload=JSON.parse(fs.readFileSync(path.join(root,'output/playwright/workflow-tools/net-fixture.furnish.json'),'utf8')).payload;
const store={v:2,planId:payload.planId,work:{[payload.planId]:payload.current},designs:[],custom:[],customPlans:[payload.current.architecture.draft],updatedAt:Date.now()};
const seed=`<base href="/"><script>if(!sessionStorage.getItem('workflow-fixture-ready')){if(localStorage.getItem('huxing-design-v2'))throw Error('Test origin is not empty; do not overwrite it');localStorage.setItem('huxing-design-v2',${JSON.stringify(JSON.stringify(store)).replace(/</g,'\\u003c')});sessionStorage.setItem('workflow-fixture-ready','1');}</script>`;
const html=fs.readFileSync(path.join(root,'index.html'),'utf8').replace('<head>','<head>'+seed);
fs.writeFileSync(path.join(root,'output/playwright/workflow-tools/fixture.html'),html);console.log('Fresh-origin UI fixture prepared.');
