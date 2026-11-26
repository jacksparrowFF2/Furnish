/* Read-only preview of staged project sources, using the desktop import cores. */
(function(){
'use strict';
const D=FurnishDraft,P=FurnishProject;
const structureKinds={bearing:'b',partition:'n',exterior:'e'};
const previewId='custom_mcp_preview';
const evidenceAsset='furnish-survey-evidence.json';
const owns=(object,key)=>Object.hasOwn(object,key);
const asText=(value,max)=>typeof value==='string'&&value.trim()&&value.length<=max;

function evidence(staged){
 if(!staged)return null;
 const input=JSON.parse(staged.content);
 if(!input||input.version!==1||!Array.isArray(input.sources)||input.sources.length>150||!Array.isArray(input.measurements)||input.measurements.length>300)throw Error('量房证据须使用 v1 模板');
 const sources=new Set();
 for(const item of input.sources){
  if(!item||!asText(item.id,80)||!asText(item.file,500)||sources.has(item.id))throw Error('证据来源需要唯一 ID 和原文件索引');
  sources.add(item.id);
 }
 const measured=new Set();
 for(const item of input.measurements){
  if(!item||!asText(item.id,80)||measured.has(item.id)||!asText(item.target,150)||!asText(item.field,100)||!asText(item.datum,150)||
   !['verified','estimated','pending'].includes(item.status)||!(item.value===null||Number.isFinite(item.value))||
   (item.status==='verified'&&(item.value===null||!sources.has(item.sourceId)))||
   (item.sourceId!=null&&!sources.has(item.sourceId)))throw Error('尺寸证据格式或其来源无效');
  measured.add(item.id);
 }
 const review=input.structureReview;
 if(review!==undefined&&(!review||!['verified','pending'].includes(review.status)||!Array.isArray(review.sourceIds)||
  review.sourceIds.some(id=>!sources.has(id))||(review.status==='verified'&&(!review.sourceIds.length||!asText(review.note,1000)))))throw Error('结构确认需要有效来源与核对说明');
 return input;
}
function readEvidence(work){
 const asset=work.assets?.find(item=>item.name===evidenceAsset);
 return asset?evidence({content:JSON.stringify(FurnishMaterialSchedule.fromAsset(asset))}):null;
}
function attach(work,fileName,staged,source={}){
 if(!staged?.content)throw Error('请由桌面 MCP 读取量房证据文件');
 const reference=evidence(staged),previous=readEvidence(work);
 const saved=JSON.stringify({...reference,sourceFile:source.name??previous?.sourceFile,sourceSha256:source.sha256??previous?.sourceSha256,
  evidenceFile:fileName,evidenceSha256:staged.sha256});
 const bytes=new TextEncoder().encode(saved),chunks=[];
 for(let i=0;i<bytes.length;i+=32768)chunks.push(String.fromCharCode(...bytes.subarray(i,i+32768)));
 const assets=(work.assets||[]).filter(asset=>asset.name!==evidenceAsset);
 if(assets.length>=5)throw Error('项目附件已达上限，无法追加量房证据');
 work.assets=[...assets,{name:evidenceAsset,data:btoa(chunks.join(''))}];
 return reference;
}

function dxfDraft(parsed,options,name){
 if(!options?.layers?.length)return null;
 const {layers,mode,mmPerUnit=parsed.mmPerUnit}=options;
 if(!mode||!Number.isFinite(mmPerUnit))throw Error('请选择 DXF 转换方式并确认图纸单位');
 const names=layers.map(layer=>layer.name),inventory=new Set(parsed.inventory.map(layer=>layer.name));
 if(new Set(names).size!==names.length||names.some(layer=>!inventory.has(layer)))throw Error('DXF 图层重复或不存在');
 const walls=layers.filter(layer=>owns(structureKinds,layer.role)),wallNames=walls.map(layer=>layer.name);
 const layerKinds=Object.fromEntries(walls.map(layer=>[layer.name,structureKinds[layer.role]]));
 const byRole=role=>layers.filter(layer=>layer.role===role).map(layer=>layer.name);
 if(mode==='centerline'){
  if(walls.length!==layers.length||walls.some(layer=>!Number.isFinite(layer.thickness)))throw Error('中心线模式需要每个墙层的实际墙厚；窗、梁和既有接口可用轮廓模式或导入后补录');
  return {draft:FurnishDXF.draft(parsed,{layers:wallNames,mmPerUnit,layerKinds,name,id:previewId,layerThicknesses:Object.fromEntries(walls.map(layer=>[layer.name,layer.thickness]))})};
 }
 if(byRole('window').length&&(!Number.isFinite(options.windowSill)||!Number.isFinite(options.windowHead)||options.windowSill>=options.windowHead))
  throw Error('导入窗洞需要明确输入窗台及窗顶标高；录入后按洞口复尺项核对');
 return FurnishDXFOutline.convert(parsed,{layers:wallNames,mmPerUnit,layerKinds,name,id:previewId,
  beamLayers:byRole('beam'),windowLayers:byRole('window'),serviceLayers:byRole('service'),
  closeDoorGaps:options.closeDoorGaps===true,windowSill:options.windowSill,windowHead:options.windowHead});
}

function inspect(args,staged){
 if(!staged?.source)throw Error(staged?.error||'请由桌面 MCP 从 .local/mcp-imports 读取源文件');
 const {source}=staged,reference=evidence(staged.evidence),name=args.options?.name||args.fileName.replace(/\.(furnish\.json|json|dxf)$/,'').slice(0,80);
 let draft,payload,diagnostics,stats;
 if(args.fileName.endsWith('.dxf')){
  const parsed=FurnishDXF.parse(source.content);
  diagnostics=FurnishDXF.inspect(parsed,{mmPerUnit:args.options?.mmPerUnit??parsed.mmPerUnit,layers:args.options?.layers?.map(layer=>layer.name)||[]});
  const converted=dxfDraft(parsed,args.options,name);
  if(!converted)return {diagnostics,converted:false,sourceSha256:source.sha256,unit:'mm'};
  ({draft,stats}=converted);
  draft.sourceDXF=source.content;
 }else{
  const input=JSON.parse(source.content);
  if(input?.kind==='furnish-survey-draft'&&input.version===1){
   draft=D.upgrade({...input.draft,id:previewId,name:args.options?.name||input.draft?.name||name});
  }else payload=P.unpack(input);
  if(args.options&&Object.keys(args.options).some(key=>key!=='name'))throw Error('DXF 转换选项只适用于 DXF');
  if(payload&&args.options?.name)throw Error('完整项目沿用文件中的名称');
 }
 if(draft){
  const plan=D.build(draft),current={...freshWork(plan),architecture:{draft,phase:'survey'}};
  payload={planId:plan.id,name:draft.name,current,designs:[],catalog:[]};
 }
 if(reference)attach(payload.current,args.surveyFileName,staged.evidence,{name:args.fileName,sha256:source.sha256});
 const plan=P.previewPlan(payload,PLANS),architecture=payload.current.architecture;
 const pending=[
  ...(architecture?.draft.openings||[]).filter(item=>item.review).map(item=>({id:item.id,field:item.review,status:'pending'})),
  ...(plan.beams||[]).filter(item=>!Number.isFinite(item.bottomHeight)||!Number.isFinite(item.topHeight)).map(item=>({id:item.id,field:'梁底／梁顶标高',status:'pending'})),
  ...(reference?.measurements||[]).filter(item=>item.status!=='verified')
 ];
 const summary={name:payload.name||plan.name,bounds:plan.bounds,area:P.quantities(plan,architecture).net,
  rooms:plan.rooms.map(({id,name,poly,at})=>({id,name,poly,at})),wallCount:plan.walls.length,openingSchedule:P.openingSchedule(plan,payload.current),
  openings:architecture?.draft.openings.map(({id,kind,review})=>({id,kind,review})),beams:plan.beams||[],
  furnitureCount:payload.current.furniture.length,designCount:payload.designs.length,phase:architecture?.phase||null,
  structureEvidence:reference?.structureReview?.status||null,pending};
 return {payload,newDraft:!!draft,reference,public:{converted:true,unit:'mm',sourceSha256:source.sha256,evidenceSha256:staged.evidence?.sha256,
  ...(diagnostics?{diagnostics,stats}:{}),summary}};
}

function restore(candidate,confirmStructure){
 const {newDraft,reference,payload}=candidate;
 if(confirmStructure){
  if(!newDraft||reference?.structureReview?.status!=='verified')throw Error('锁定新建原始结构需要已核对的结构来源和说明');
  const {draft}=payload.current.architecture;
  payload.current.architecture={draft,phase:'design',baseline:draft};
 }
 FurnishWorkspace.restoreIndependent(payload,{newDraft});
}

window.FurnishProjectIntake={inspect,restore,attach,readEvidence};
})();
