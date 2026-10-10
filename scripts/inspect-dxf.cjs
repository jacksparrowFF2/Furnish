/* Local, read-only DXF diagnosis. Optional HTML report never changes the source. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const DXF=require('../src/io/dxf-import.js'),Repair=require('../src/io/dxf-repair.js'),Core=require('../src/core/floorplan-core.js'),Project=require('../src/core/project-core.js');
const [input,htmlFlag,output]=process.argv.slice(2);
if(!input||(htmlFlag&&htmlFlag!=='--html')||(htmlFlag&&!output)){
  console.error('Usage: node scripts/inspect-dxf.cjs input.dxf [--html report.html]');process.exit(1);
}
if(output&&path.resolve(input)===path.resolve(output))throw Error('Report must not overwrite the input');
const bytes=fs.readFileSync(input);
if(bytes.length>20e6)throw Error('DXF exceeds 20 MB');
let raw=new TextDecoder('utf-8').decode(bytes),encoding='UTF-8';
if(raw.includes('\ufffd')){raw=new TextDecoder('gb18030').decode(bytes);encoding='GB18030';}
const parsed=DXF.parse(raw),inspection=DXF.inspect(parsed,{layers:parsed.layers.filter(l=>DXF.layerRole(l.name).role==='wall').map(l=>l.name)});
const selected=inspection.layers.filter(l=>l.role==='wall'&&l.count),layers=selected.map(l=>l.name);
// Unknown types use n ONLY for a diagnostic experiment. Never write a project from it.
const layerKinds=Object.fromEntries(selected.map(l=>[l.name,l.kind||'n']));
const attempts=[];
for(const doubleLines of [false,true]){
  try{
    const result=Repair.repair(parsed,{layers,mmPerUnit:parsed.mmPerUnit,layerKinds,thickness:200,doubleLines});
    const draft=DXF.draft(result.parsed,{layers:result.parsed.layers.map(l=>l.name),mmPerUnit:1,id:'custom_dxf_diagnosis',name:'DXF diagnosis'});
    const plan=Core.build(draft);
    attempts.push({doubleLines,stats:result.stats,warnings:result.warnings,rooms:plan.rooms.length,area:plan.rooms.reduce((n,r)=>n+Project.area(r.poly),0),status:'geometry-validation-only'});
  }catch(error){attempts.push({doubleLines,error:error.message});}
}
let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
for(const r of parsed.records)for(const s of r.segments)for(const p of [s.a,s.b]){x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);}
const report={file:path.basename(input),bytes:bytes.length,encoding,unitCode:parsed.unitCode,mmPerUnit:parsed.mmPerUnit,bounds:Number.isFinite(x0)?{x0,y0,x1,y1,widthMM:parsed.mmPerUnit?(x1-x0)*parsed.mmPerUnit:null,heightMM:parsed.mmPerUnit?(y1-y0)*parsed.mmPerUnit:null}:null,...inspection,ignored:parsed.ignored,attempts,assumptions:'Diagnostic trials only: unknown wall types use n and all wall thicknesses use 200 mm. Room closure is not evidence that wall profiles converted correctly.'};
console.log(JSON.stringify(report,null,2));
if(output){
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const roleName={wall:'墙体候选',window:'窗位参考',bay:'飘窗参考',door:'门位参考',drain:'下水点位',gas:'燃气点位',reference:'辅助参考',unknown:'用途待核对'};
  const colors=['#95652e','#1674c4','#222','#568755','#a4417e'];
  const layerColors=new Map(inspection.layers.map((l,i)=>[l.name,colors[i%colors.length]]));
  const segments=parsed.records.flatMap(r=>r.segments.map(s=>({...s,layer:r.layer}))),pad=Math.max(x1-x0,y1-y0)*.04+1;
  const svg=segments.length?`<svg viewBox="${x0-pad} ${-y1-pad} ${x1-x0+pad*2} ${y1-y0+pad*2}" role="img" aria-label="原图可解析线条"><g fill="none">${segments.slice(0,10000).map(s=>`<path d="M ${s.a[0]} ${-s.a[1]} L ${s.b[0]} ${-s.b[1]}" stroke="${layerColors.get(s.layer)}" stroke-width="2" vector-effect="non-scaling-stroke"><title>${esc(s.layer)}</title></path>`).join('')}</g></svg>`:'';
  const rows=inspection.layers.map(l=>`<tr><td><span style="color:${layerColors.get(l.name)}">●</span> ${esc(l.name)}</td><td>${roleName[l.role]}</td><td>${l.entities}</td><td>${l.count}</td><td>${l.profiles}</td><td>${l.rectangles.length}</td><td>${esc(Object.entries(l.types).map(([k,v])=>`${k} × ${v}`).join(', '))}</td></tr>`).join('');
  const html=`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Furnish DXF 导入诊断</title><style>body{font:16px/1.65 system-ui,sans-serif;color:#26313b;background:#f4f1eb;max-width:1100px;margin:auto;padding:24px}section{background:white;padding:24px;margin:20px 0;border-radius:14px}svg{width:100%;height:560px;background:#faf8f3}table{border-collapse:collapse;width:100%;font-size:14px}td,th{border-bottom:1px solid #ddd;padding:9px;text-align:left}.scroll{overflow:auto}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:13px}h1{font-size:28px}small{color:#63717c}</style><h1>Furnish DXF 导入诊断</h1><p>${esc(report.file)} · ${(bytes.length/1024).toFixed(1)} KB · ${encoding} · INSUNITS=${parsed.unitCode}${report.bounds&&parsed.mmPerUnit?` · ${report.bounds.widthMM.toFixed(1)} × ${report.bounds.heightMM.toFixed(1)} mm`:''}</p><section><h2>原图线条与图层</h2>${svg}<small>显示可解析的 LINE / POLYLINE / LWPOLYLINE；圆、弧、块、填充等未渲染。${segments.length>10000?'预览仅显示前 10000 段。':''}此图不是生成后的 Furnish 户型。</small><div class="scroll"><table><thead><tr><th>图层</th><th>用途建议</th><th>实体</th><th>线段</th><th>疑似细长轮廓</th><th>矩形轮廓</th><th>实体类型</th></tr></thead><tbody>${rows}</tbody></table></div></section><section><h2>现有转换试验</h2><p>按墙体候选层试验；名称未明确类型时仅为测试设为非承重，墙厚统一假设 200 mm。结果不能作为承重分类、房间面积或实际尺寸依据。</p>${attempts.map(a=>`<p><b>${a.doubleLines?'启用':'关闭'}双线转中心线：</b>${esc(a.error||`几何校验识别 ${a.rooms} 个房间；仍需核对是否误把墙体内部当作房间`)}</p>`).join('')}<p>当前门窗不自动生成。复杂墙轮廓、多种厚度、门窗断口与跨层重合需要进一步转换和人工核对。</p></section><section><h2>推荐改进顺序</h2><ol><li>按图层指定墙体、门、窗、房间与参考用途，保留原始实体与坐标；不把“房屋”直接等同于非承重墙。</li><li>增加墙轮廓导入模式：先识别矩形墙段的实际厚度，再处理折形墙的局部条带，合并跨层重复边并保留来源；歧义留给用户选择。</li><li>将矩形窗位匹配到墙段，确认长边是洞宽、短边是墙厚后补齐基墙并创建窗洞；窗台高、窗高和飘窗进深仍需录入。</li><li>统一墙交点、连接与门窗断口后识别房间，排除墙体内部形成的假房间，提供尺寸和原图叠加核对。</li><li>建立真实图纸回归集，再扩展块、弧、填充与 CAD 文字；保持文件解析离线。</li></ol></section><details><summary>完整诊断数据</summary><pre>${esc(JSON.stringify(report,null,2))}</pre></details></html>`;
  fs.writeFileSync(output,html,'utf8');
}
