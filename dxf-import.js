/* ASCII DXF LINE / LWPOLYLINE / POLYLINE reader. Dimensions are never used as walls. */
(function(root){
  'use strict';
  const error=message=>{throw new Error(message);};
  const number=value=>{const n=Number(value);if(!Number.isFinite(n))error('Invalid DXF number');return n;};
  const units={1:25.4,2:304.8,4:1,5:10,6:1000};
  function parse(input){
    if(typeof input!=='string'||input.length>20e6)error('DXF exceeds 20 MB');
    if(input.startsWith('AutoCAD Binary DXF'))error('Binary DXF is not supported. Export ASCII DXF.');
    const lines=input.replace(/^\uFEFF/,'').split(/\r\n|\n|\r/);while(lines.length&&lines.at(-1).trim()==='')lines.pop();
    if(lines.length%2)error('Invalid DXF code/value pairs');
    const pairs=[];
    for(let i=0;i<lines.length;i+=2){const code=Number(lines[i].trim());if(!Number.isInteger(code)||lines[i].trim()==='')error('Invalid DXF group code');pairs.push([code,lines[i+1].trim()]);}
    let section='',unitCode=0,found=false;const entities=[];
    for(let i=0;i<pairs.length;i++){
      const [code,value]=pairs[i];
      if(code===0&&value==='SECTION'){if(pairs[i+1]?.[0]!==2)error('Invalid DXF section');section=pairs[++i][1];if(section==='ENTITIES')found=true;continue;}
      if(code===0&&value==='ENDSEC'){section='';continue;}
      if(section==='HEADER'&&code===9&&value==='$INSUNITS'){const p=pairs[i+1];if(p?.[0]===70)unitCode=number(p[1]);}
      if(section==='ENTITIES'&&code===0){const fields=[];while(i+1<pairs.length&&pairs[i+1][0]!==0)fields.push(pairs[++i]);entities.push({type:value,fields});}
    }
    if(!found)error('No ENTITIES section found');
    const value=(e,k,fallback)=>e.fields.find(p=>p[0]===k)?.[1]??fallback;
    const records=[],ignored={};let serial=0;
    for(let i=0;i<entities.length;i++){
      const e=entities[i],layer=value(e,8,'0');let points=[],closed=false,issue='';
      if(e.type==='LINE'){
        points=[[number(value(e,10,'NaN')),number(value(e,20,'NaN'))],[number(value(e,11,'NaN')),number(value(e,21,'NaN'))]];
        if(number(value(e,30,0))!==0||number(value(e,31,0))!==0)issue='3D lines are unsupported';
      }else if(e.type==='LWPOLYLINE'){
        closed=(number(value(e,70,0))&1)!==0;
        if(e.fields.some(([c,v])=>c===42&&number(v)!==0))issue='Curved polyline segments are unsupported';
        if(number(value(e,210,0))!==0||number(value(e,220,0))!==0||number(value(e,230,1))!==1)issue='Non-planar polylines are unsupported';
        if(number(value(e,38,0))!==0)issue='Non-planar polylines are unsupported';
        for(const [c,v] of e.fields){if(c===10)points.push([number(v),NaN]);else if(c===20&&points.length)points.at(-1)[1]=number(v);}
        if(points.some(p=>!p.every(Number.isFinite)))error('Incomplete polyline vertex');
      }else if(e.type==='POLYLINE'){
        const flags=number(value(e,70,0));closed=(flags&1)!==0;if(flags&(8|16|64))issue='3D polylines and meshes are unsupported';if(flags&(2|4))issue='Curve-fit and spline-fit polylines are unsupported';
        while(entities[i+1]?.type==='VERTEX'){const v=entities[++i];points.push([number(value(v,10,'NaN')),number(value(v,20,'NaN'))]);if(number(value(v,30,0))!==0)issue='3D polylines and meshes are unsupported';if(number(value(v,42,0))!==0)issue='Curved polyline segments are unsupported';}
        if(entities[i+1]?.type==='SEQEND')i++;
      }else {ignored[e.type]=(ignored[e.type]||0)+1;continue;}
      if(points.length<2)issue='Polyline has fewer than two vertices';
      const segments=[];
      for(let j=0;j<points.length-1+(closed?1:0);j++){
        const a=points[j],b=points[(j+1)%points.length],dx=Math.abs(a[0]-b[0]),dy=Math.abs(a[1]-b[1]);
        if(dx<1e-8&&dy<1e-8)continue;
        if(dx>1e-6&&dy>1e-6&&!issue)issue='Diagonal walls are unsupported';
        segments.push({a:[...a],b:[...b]});
      }
      if(!segments.length&&!issue)issue='Empty entity';
      let group;const app=e.fields.findIndex(([c,v])=>c===1001&&v==='FURNISH');if(app>=0){for(const [c,v] of e.fields.slice(app+1)){if(c===1001)break;if(c===1000&&/^WALL_GROUP:[A-Za-z0-9_-]{1,80}$/.test(v))group=v.slice(11);}}
      records.push({id:serial++,layer,type:e.type,segments,issue,...(group?{group}:{})});
    }
    const layers=[...new Set(records.map(r=>r.layer))].map(name=>({name,count:records.filter(r=>r.layer===name).reduce((n,r)=>n+r.segments.length,0),issues:records.filter(r=>r.layer===name&&r.issue).map(r=>r.issue)}));
    return {unitCode,mmPerUnit:units[unitCode]||null,records,layers,ignored};
  }
  function layerDefaults(name){const match=/^FURNISH_(BEARING|EXTERIOR|PARTITION)(?:_(\d+(?:\.\d+)?))?$/i.exec(name);return match?{kind:{BEARING:'b',EXTERIOR:'e',PARTITION:'n'}[match[1].toUpperCase()],thickness:match[2]?Number(match[2]):null}:{kind:'',thickness:null};}
  function draft(parsed,{layers,mmPerUnit,name,id,thickness=200,kind='n',layerKinds,layerThicknesses}){
    if(!Array.isArray(layers)||!layers.length)error('Select at least one wall centerline layer');
    if(!Number.isFinite(mmPerUnit)||mmPerUnit<=0)error('Choose the DXF drawing units');
    if(!Number.isFinite(thickness)||thickness<60||thickness>600)error('Wall thickness must be 60–600 mm');
    const records=parsed.records.filter(r=>layers.includes(r.layer));
    if(layerThicknesses&&layers.some(l=>!Number.isFinite(layerThicknesses[l])||layerThicknesses[l]<60||layerThicknesses[l]>600))error('Layer wall thickness must be 60–600 mm');
    if(layerKinds && records.some(r=>!r.kind && !['n','e','b'].includes(layerKinds[r.layer])))error('Assign a wall type to each selected layer');
    if(records.some(r=>r.issue))error(records.find(r=>r.issue).issue);
    const seen=new Map(),segments=[];
    for(const s of records.flatMap(r=>r.segments.map(s=>({...s,kind:r.kind??layerKinds?.[r.layer]??kind,thickness:r.thickness??layerThicknesses?.[r.layer]??thickness,group:r.group??(['LWPOLYLINE','POLYLINE'].includes(r.type)?'dxf_entity_'+r.id:undefined)})))){
      if(!['n','b','e'].includes(s.kind))error('Assign a wall type to each selected layer');
      const a=s.a.map(v=>v*mmPerUnit),b=s.b.map(v=>v*mmPerUnit);
      if(Math.abs(a[0]-b[0])<1e-6)b[0]=a[0];if(Math.abs(a[1]-b[1])<1e-6)b[1]=a[1];
      if(!Number.isFinite(s.thickness)||s.thickness<60||s.thickness>600)error('Layer wall thickness must be 60–600 mm');
      const key=[a.join(','),b.join(',')].sort().join('|');if(seen.has(key)){if(seen.get(key).kind!==s.kind)error('Conflicting wall types on duplicate geometry');if(seen.get(key).thickness!==s.thickness)error('Conflicting wall thicknesses on duplicate geometry');continue;}seen.set(key,s);segments.push({...s,a,b});
    }
    if(segments.length<4||segments.length>100)error('Select 4–100 wall centerline segments');
    const xs=segments.flatMap(s=>[s.a[0],s.b[0]]),ys=segments.flatMap(s=>[s.a[1],s.b[1]]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),extent=Math.max(x1-x0,y1-y0);
    if(extent<=0||extent>95000||x1===x0||y1===y0)error('Invalid extent; maximum plan size is 95 m');
    const pad=Math.max(...segments.map(s=>s.thickness)),scale=(extent+pad*2)/1600;
    // CAD Y points up; SVG Y points down. Keep precision until rendering.
    const convert=p=>[(p[0]-x0+pad)/scale,(y1-p[1]+pad)/scale];
    return {version:1,id,name,source:'dxf',sourceUnits:mmPerUnit,sourceLayers:[...layers],width:(x1-x0+pad*2)/scale,height:(y1-y0+pad*2)/scale,image:'',scale,walls:segments.map((s,i)=>({id:'dxf_'+i,a:convert(s.a),b:convert(s.b),thickness:s.thickness,kind:s.kind,...(s.group?{group:s.group}:{})})),openings:[],...(layerKinds?{layerKinds:{...layerKinds}}:{}),...(layerThicknesses?{layerThicknesses:{...layerThicknesses}}:{})};
  }
  root.FurnishDXF={parse,draft,layerDefaults};if(typeof module!=='undefined')module.exports=root.FurnishDXF;
})(typeof window==='undefined'?globalThis:window);
