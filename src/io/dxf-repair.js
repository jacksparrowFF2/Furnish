/* Conservative DXF cleanup. Original file is never overwritten. Coordinates below are mm. */
(function(root){
  'use strict';
  const EPS=1e-6, copy=v=>JSON.parse(JSON.stringify(v));
  const fail=m=>{throw new Error(m);};
  const horizontal=s=>Math.abs(s.a[1]-s.b[1])<EPS;
  const length=s=>Math.hypot(s.a[0]-s.b[0],s.a[1]-s.b[1]);
  function ordered(s){const axis=horizontal(s)?0:1;return s.a[axis]<=s.b[axis]?s:{...s,a:[...s.b],b:[...s.a]};}
  function merge(lines,stats){
    const groups=new Map();
    for(const raw of lines){const s=ordered(raw),h=horizontal(s),lane=s.a[h?1:0],key=JSON.stringify([s.kind||'',s.thickness||'',s.group||'',h,lane.toFixed(6)]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s);}
    const out=[];
    for(const group of groups.values()){
      const axis=horizontal(group[0])?0:1;group.sort((a,b)=>a.a[axis]-b.a[axis]);let current=copy(group[0]);
      for(const s of group.slice(1)){
        if(s.a[axis]<=current.b[axis]+EPS){if(s.b[axis]>current.b[axis])current.b[axis]=s.b[axis];stats.merged++;}
        else{out.push(current);current=copy(s);}
      }
      out.push(current);
    }
    return out;
  }
  // Merge only coordinate clusters whose full span fits the user's mm tolerance.
  // This prevents chained snapping from closing a substantially larger gap.
  function snapCoordinates(lines,tolerance,stats){
    if(!tolerance)return lines;
    for(let axis=0;axis<2;axis++){
      const values=[...new Set(lines.flatMap(s=>[s.a[axis],s.b[axis]]))].sort((a,b)=>a-b),map=new Map();
      for(let i=0;i<values.length;){const cluster=[values[i++]];while(i<values.length&&values[i]-cluster[0]<=tolerance+EPS)cluster.push(values[i++]);const center=cluster.reduce((a,b)=>a+b,0)/cluster.length;for(const v of cluster)map.set(v,center);}
      for(const s of lines)for(const p of [s.a,s.b]){const next=map.get(p[axis]);if(Math.abs(next-p[axis])>EPS){stats.snapped++;stats.maxShift=Math.max(stats.maxShift,Math.abs(next-p[axis]));p[axis]=next;}}
    }
    return lines;
  }
  function centerlines(lines,thickness,stats,warnings){
    if(lines.length>1000)fail('Select fewer layers: double-line conversion supports at most 1000 wall segments');
    const tolerance=Math.max(5,thickness*.1), candidates=lines.map(()=>[]);
    for(let i=0;i<lines.length;i++)for(let j=i+1;j<lines.length;j++){
      const a=ordered(lines[i]),b=ordered(lines[j]);if(a.kind!==b.kind||horizontal(a)!==horizontal(b))continue;
      const axis=horizontal(a)?0:1,lane=1-axis,gap=Math.abs(a.a[lane]-b.a[lane]);
      if(Math.abs(gap-thickness)>tolerance)continue;
      const overlap=Math.min(a.b[axis],b.b[axis])-Math.max(a.a[axis],b.a[axis]);
      if(overlap<=0||overlap/Math.max(length(a),length(b))<.7)continue;
      candidates[i].push(j);candidates[j].push(i);
    }
    const consumed=new Set(),bands=[],output=[];
    for(let i=0;i<lines.length;i++){
      if(consumed.has(i)||candidates[i].length!==1)continue;const j=candidates[i][0];if(candidates[j].length!==1||candidates[j][0]!==i)continue;
      const a=ordered(lines[i]),b=ordered(lines[j]),axis=horizontal(a)?0:1,lane=1-axis,lo=Math.min(a.a[axis],b.a[axis]),hi=Math.max(a.b[axis],b.b[axis]),v=(a.a[lane]+b.a[lane])/2;
      const start=[0,0],end=[0,0];start[axis]=lo;end[axis]=hi;start[lane]=end[lane]=v;output.push({a:start,b:end,...(a.kind?{kind:a.kind}:{})});
      bands.push({kind:a.kind,axis,lane,lo,hi,v,side0:Math.min(a.a[lane],b.a[lane]),side1:Math.max(a.a[lane],b.a[lane])});consumed.add(i);consumed.add(j);stats.pairs++;
    }
    // Remove short caps that connect the two sides of a successfully paired wall.
    for(let i=0;i<lines.length;i++){
      if(consumed.has(i))continue;const s=ordered(lines[i]),axis=horizontal(s)?0:1;
      const cap=bands.some(b=>s.kind===b.kind&&axis===b.lane&&Math.abs(s.a[axis]-b.side0)<=tolerance&&Math.abs(s.b[axis]-b.side1)<=tolerance&&(Math.abs(s.a[b.axis]-b.lo)<=thickness||Math.abs(s.a[b.axis]-b.hi)<=thickness));
      if(cap){stats.caps++;continue;}output.push(copy(s));
    }
    const ambiguous=candidates.filter(c=>c.length>1).length;
    if(ambiguous)warnings.push({code:'ambiguous-pairs',count:ambiguous});
    if(!stats.pairs)warnings.push({code:'no-pairs',count:0});
    // Extend a paired centerline only to an actual nearby perpendicular centerline.
    // A plain user supplied centerline is left untouched by this conversion step.
    for(let i=0;i<bands.length;i++){
      const s=output[i],b=bands[i];
      for(const p of [s.a,s.b]){
        const hits=output.filter(q=>horizontal(q)!==horizontal(s)).map(q=>ordered(q)).filter(q=>Math.abs(q.a[b.axis]-p[b.axis])<=thickness/2+tolerance&&p[b.lane]>=q.a[b.lane]-thickness/2-tolerance&&p[b.lane]<=q.b[b.lane]+thickness/2+tolerance);
        if(hits.length===1){const next=hits[0].a[b.axis];if(Math.abs(next-p[b.axis])>EPS){stats.centerJoins++;p[b.axis]=next;}}
      }
    }
    return output;
  }
  function repair(parsed,{layers,mmPerUnit,thickness=200,gapTolerance=30,angleTolerance=.5,doubleLines=false,layerKinds,layerThicknesses}={}){
    if(!parsed||!Array.isArray(parsed.records)||!Array.isArray(layers)||!layers.length)fail('Select wall layers first');
    if(!Number.isFinite(mmPerUnit)||mmPerUnit<=0)fail('Choose the drawing units');
    if(!Number.isFinite(gapTolerance)||gapTolerance<0||gapTolerance>100)fail('Gap tolerance must be 0–100 mm');
    if(!Number.isFinite(angleTolerance)||angleTolerance<0||angleTolerance>2)fail('Angle tolerance must be 0–2 degrees');
    if(!Number.isFinite(thickness)||thickness<60||thickness>600)fail('Wall thickness must be 60–600 mm');
    const records=parsed.records.filter(r=>layers.includes(r.layer));
    const unsupported=records.filter(r=>r.issue && r.issue!=='Diagonal walls are unsupported');
    if(unsupported.length)fail('Cannot safely repair selected entities: '+unsupported[0].issue);
    if(layerKinds&&layers.some(l=>!['n','e','b'].includes(layerKinds[l])))fail('Assign a wall type to each selected layer');
    if(layerThicknesses&&layers.some(l=>!Number.isFinite(layerThicknesses[l])||layerThicknesses[l]<60||layerThicknesses[l]>600))fail('Layer wall thickness must be 60–600 mm');
    if(doubleLines&&layerThicknesses&&new Set(layers.map(l=>layerThicknesses[l])).size>1)fail('Mixed thickness double-line conversion is unsupported; use centerlines');
    const original=records.flatMap(r=>r.segments.map(s=>({a:s.a.map(v=>v*mmPerUnit),b:s.b.map(v=>v*mmPerUnit),...(layerKinds?{kind:layerKinds[r.layer]}:{}),...(r.thickness!==undefined||layerThicknesses?{thickness:r.thickness??layerThicknesses[r.layer]}:{}),...(r.group?{group:r.group}:['LWPOLYLINE','POLYLINE'].includes(r.type)?{group:'dxf_entity_'+r.id}:{})})));
    if(original.length>10000)fail('Too many wall segments (maximum 10000 before cleanup)');
    if(original.some(s=>[...s.a,...s.b].some(v=>!Number.isFinite(v))))fail('Invalid coordinates');
    const stats={input:original.length,output:0,axisAligned:0,merged:0,snapped:0,maxShift:0,removed:0,pairs:0,caps:0,centerJoins:0},warnings=[];
    let lines=original.map(s=>copy(s)).filter(s=>{if(length(s)<EPS){stats.removed++;return false;}return true;});
    for(const s of lines){
      const dx=Math.abs(s.b[0]-s.a[0]),dy=Math.abs(s.b[1]-s.a[1]);if(Math.min(dx,dy)<=EPS){s.b[dx>dy?1:0]=s.a[dx>dy?1:0];continue;}
      const minor=dx>dy?1:0,drift=Math.min(dx,dy),degrees=Math.atan2(drift,Math.max(dx,dy))*180/Math.PI;
      if(degrees>angleTolerance+EPS||drift>Math.max(gapTolerance,1)+EPS)fail('A diagonal wall exceeds the automatic alignment tolerance');
      const center=(s.a[minor]+s.b[minor])/2;stats.maxShift=Math.max(stats.maxShift,drift/2);s.a[minor]=s.b[minor]=center;stats.axisAligned++;
    }
    lines=merge(lines,stats);
    if(doubleLines){const measured=layerThicknesses?layerThicknesses[layers[0]]:thickness;lines=centerlines(lines,measured,stats,warnings);if(layerThicknesses)lines.forEach(s=>s.thickness=measured);}
    lines=snapCoordinates(lines,gapTolerance,stats);
    lines=lines.filter(s=>{if(length(s)<EPS){stats.removed++;return false;}return true;});lines=merge(lines,stats);stats.output=lines.length;
    const layerFor=s=>s.kind?({b:'FURNISH_BEARING',e:'FURNISH_EXTERIOR',n:'FURNISH_PARTITION'}[s.kind]):'FURNISH_WALL_CENTER';
    const clean={unitCode:4,mmPerUnit:1,ignored:{},layers:[...new Set(lines.map(layerFor))].map(name=>({name,count:lines.filter(s=>layerFor(s)===name).length,issues:[]})),records:lines.map((s,i)=>({id:i,layer:layerFor(s),type:'LINE',segments:[s],issue:'',...(s.kind?{kind:s.kind}:{}),...(s.thickness!==undefined?{thickness:s.thickness}:{}),...(s.group?{group:s.group}:{})}))};
    return {parsed:clean,original,lines,stats,warnings,doubleLines,gapTolerance,angleTolerance};
  }
  function exportDXF(result){
    if(!result||!Array.isArray(result.lines))fail('No repaired DXF to export');
    const round=v=>Number(v.toFixed(6));
    const header=['0','SECTION','2','HEADER','9','$ACADVER','1','AC1015','9','$INSUNITS','70','4','0','ENDSEC','0','SECTION','2','ENTITIES'];
    if(result.lines.some(s=>s.group))header.splice(header.length-4,0,'0','SECTION','2','TABLES','0','TABLE','2','APPID','70','1','0','APPID','2','FURNISH','70','0','0','ENDTAB','0','ENDSEC');
    for(const s of result.lines){header.push('0','LINE','8',({b:'FURNISH_BEARING',e:'FURNISH_EXTERIOR',n:'FURNISH_PARTITION'}[s.kind]||'FURNISH_WALL_CENTER')+(s.thickness!==undefined?'_'+s.thickness:''),'10',String(round(s.a[0])),'20',String(round(s.a[1])),'30','0','11',String(round(s.b[0])),'21',String(round(s.b[1])),'31','0');if(s.group&&/^[A-Za-z0-9_-]{1,80}$/.test(s.group))header.push('1001','FURNISH','1000','WALL_GROUP:'+s.group);}
    header.push('0','ENDSEC','0','EOF');return header.join('\r\n')+'\r\n';
  }
  root.FurnishDXFRepair={repair,exportDXF};if(typeof module!=='undefined')module.exports=root.FurnishDXFRepair;
})(typeof window==='undefined'?globalThis:window);
