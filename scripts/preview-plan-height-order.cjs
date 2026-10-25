const fs=require('node:fs'),path=require('node:path'),root=path.resolve(process.env.FURNISH_VERIFY_ROOT||path.join(__dirname,'..')),dir=path.join(root,'output/plan-height-order');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'preview.html'),`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>2D 高度遮挡修正</title>
<style>body{margin:0;background:#f2ede5;color:#463b31;font:16px system-ui}header,footer{padding:24px}h1{font-size:25px;margin:0 0 12px}p{line-height:1.7;margin:0}main{display:grid;gap:16px;padding:0 24px}article{background:#fffaf3;border-radius:12px;padding:16px}h2{font-size:17px;margin:0 0 14px}svg{display:block;width:100%;height:200px}button{padding:9px 16px}small{display:block;color:#796b5a;line-height:1.7}</style>
<header><h1>2D 高度遮挡修正</h1><p>墙挂电视位于低矮电视柜上方。平面占地重叠，高度范围分离。</p></header>
<main><article><h2>原有显示 · 电视先添加、柜体后添加</h2><svg id="before" viewBox="-1700 -360 3400 720"></svg><small>按添加顺序绘制，电视被柜体盖住。</small></article><article><h2>修正后 · 上方电视显示在柜体之上</h2><svg viewBox="-1700 -360 3400 720"><g id="gFurn"></g></svg><small id="order"></small></article></main>
<footer><button id="reverse">切换添加顺序</button><p>切换顺序后，按高度绘制的电视始终位于柜体之上。预览使用生产 2D 渲染器；不修改当前项目。</p></footer><div hidden id="emptyHint"></div><div hidden id="furnHidden"></div>
<script src="../../src/core/part-identity.js"></script><script src="../../src/core/cabinet-core.js"></script><script src="../../src/core/design-core.js"></script><script src="../../src/core/layout-geometry.js"></script><script src="../../src/render/furniture-svg.js"></script>
<script>
const $=s=>document.querySelector(s),PAL={ink:'#3a3833',text:'#544b3f'},ui={layers:{furn:true,collide:false}},esc=s=>s,nm=s=>s,collisions=()=>[],furnSVG=(t,w,d,c,f)=>FurnishFurnitureSVG.render(t,w,d,c,PAL,f);
const tv={id:'tv',type:'tv',name:'电视',w:1660,d:80,cx:0,cy:-150,rot:0,color:'#18181a'},cab={id:'cab',type:'cabinet',color:'#cbb08b',cx:0,cy:0,rot:0,...FurnishCabinet.preset('tv-floor')},state={furniture:[tv,cab]};
</script><script src="../../src/render/plan-renderer.js"></script><script>
function refresh(){document.querySelector('#before').innerHTML=state.furniture.map(f=>'<g transform="'+furnT(f)+'">'+furnSVG(f.type,f.w,f.d,f.color,f)+'</g>').join('');renderFurn();document.querySelector('#order').textContent='当前添加顺序：'+state.furniture.map(f=>f.name).join(' → ')+'；实际绘制：'+drawOrder().map(f=>f.name).join(' → ');}
document.querySelector('#reverse').onclick=()=>{state.furniture.reverse();refresh();};refresh();
</script></html>`);console.log(path.join(dir,'preview.html'));
