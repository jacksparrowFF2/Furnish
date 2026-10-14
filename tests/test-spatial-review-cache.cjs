const assert=require('node:assert/strict'),P=require('../src/core/project-core.js');
const plan={rooms:[{id:'r',name:'客厅',poly:[[0,0],[5000,0],[5000,5000],[0,5000]]}],walls:[],doors:[]},f={id:'a',name:'柜甲',type:'custom',cx:1000,cy:1000,w:1000,d:1000,h:800,rot:30,frontClearance:0},work={furniture:[f,{...f,id:'b',name:'柜乙',cx:1100}],rooms:{}};
const first=P.review(plan,work),{ignored,...issue}=first.find(v=>v.kind==='overlap'),key=P.checkFingerprint(issue,plan,work.furniture,800);work.spaceIgnored=[key];assert(P.review(plan,work).find(v=>v.kind==='overlap').ignored);
const cached=P.review(plan,work);cached[0].message='修改返回值';assert.notEqual(P.review(plan,work)[0].message,'修改返回值');
work.furniture[0].price=500;work.furniture[0].color='#789090';assert(P.review(plan,work).find(v=>v.kind==='overlap').ignored);work.drawing={northAngle:90,rotation:90};assert(P.review(plan,work).find(v=>v.kind==='overlap').ignored);
work.furniture[0].name='新名字';assert(P.review(plan,work).some(v=>v.name.includes('新名字')));work.furniture[1].cx=4000;assert(!P.review(plan,work).some(v=>v.kind==='overlap'));
assert(P.explainIssue({kind:'passage'}).action.includes('不是连续通行路径'));assert(P.explainIssue({kind:'beam',pending:true}).status.includes('待确认'));
console.log('PASS spatial review cache source immutability, pricing/north independence, naming/geometry invalidation and issue explanation');
