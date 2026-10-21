// Expected current records after the single production import upgrade boundary.
const U=require('../../src/core/furniture-upgrade.js');
const work=w=>U.upgradeWork(w),items=list=>U.upgradeList(list).furniture,item=f=>items([f])[0];
const project=p=>({...p,current:work(p.current),designs:p.designs.map(d=>({...d,work:work(d.work)}))});
module.exports={work,items,item,project};
