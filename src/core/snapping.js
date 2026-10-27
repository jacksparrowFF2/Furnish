/* Snapping calculations use explicit inputs and return guides without UI writes. */
(function(root){
  'use strict';
  const geometry = typeof module === 'object' && module.exports ? require('./layout-geometry.js') : root.FurnishGeometry;
  const tolerance=(f,scale)=>['curtain','slidingdoor','doubleslidingdoor','tripleslidingdoor','tripleslidingwindow'].includes(f.type)?Math.min(250,32/scale):10/scale;
  function spanSupport(rings,lo,hi){
    let max=-Infinity;for(const ring of rings)for(let i=0;i<ring.length;i++){
      const p=ring[i],q=ring[(i+1)%ring.length];if(p.t>=lo-1e-7&&p.t<=hi+1e-7)max=Math.max(max,p.n);
      if(Math.abs(q.t-p.t)>1e-9)for(const t of [lo,hi]){const k=(t-p.t)/(q.t-p.t);if(k>=0&&k<=1)max=Math.max(max,p.n+k*(q.n-p.n));}
    }return max;
  }
  function move(f,cx,cy,{grid,scale,wallSnap,guides,rects,furniture,skip,moving,disabled=false,axis,anchor,finishFaces=[]}){
    if(f.cx===undefined||f.cy===undefined)f={...f,cx:f.cx??cx,cy:f.cy??cy};
    if(axis==='x')cy=anchor.y;else if(axis==='y')cx=anchor.x;
    if(disabled)return {position:[cx,cy],guides:[]};
    const targetRects=wallSnap?rects:[],targets=guides?furniture.filter(o=>o.id!==f.id&&!skip?.has(o.id)):[];
    const scene=entities({rects:targetRects,furniture:targets}),capture=12/scale;
    const finish=[null,null],finishGuides=[];
    if(wallSnap)for(const member of moving||[f]){
      const placed={...member,cx:member.cx+cx-f.cx,cy:member.cy+cy-f.cy},points=geometry.footprints(placed).flat();
      for(const face of finishFaces){const n=face.normal,a=1-n;if(axis==='x'&&n===1||axis==='y'&&n===0)continue;
        const support=face.side===1?Math.min(...points.map(p=>p[n])):Math.max(...points.map(p=>p[n])),delta=face.position-support,error=Math.abs(delta),lo=Math.min(...points.map(p=>p[a])),hi=Math.max(...points.map(p=>p[a]));
        if(error>capture+1e-7||Math.min(hi,face.hi)-Math.max(lo,face.lo)<1e-7||finish[n]&&error>=finish[n].error-1e-7)continue;
        const p=[0,0];p[n]=face.position+face.side*.01;p[a]=(Math.max(lo,face.lo)+Math.min(hi,face.hi))/2;if(targetRects.some(r=>p[0]>r[0]+1e-7&&p[0]<r[2]-1e-7&&p[1]>r[1]+1e-7&&p[1]<r[3]-1e-7))continue;
        finish[n]={value:(n===0?cx:cy)+delta,error,guide:{v:n===0,...(n===0?{x:face.position}:{y:face.position}),a:Math.min(lo,face.lo),b:Math.max(hi,face.hi)}};
      }
    }
    for(const hit of finish)if(hit)finishGuides.push(hit.guide);
    // A point magnet must not pull a closer face contact off its boundary.
    // Opposing edges and finite overlap describe contact, not center alignment.
    const boundaryContact=[null,null],slopedContacts=[];
    for(const member of moving||[f]){
      const placed={...member,cx:member.cx+cx-f.cx,cy:member.cy+cy-f.cy};
      if(geometry.localOutline(placed))for(const target of scene)for(const edge of target.edges){
        const dx=edge.b.x-edge.a.x,dy=edge.b.y-edge.a.y,L=Math.hypot(dx,dy),u=[dx/L,dy/L],out=[u[1],-u[0]],points=geometry.footprints(placed).flat();
        const project=p=>p[0]*out[0]+p[1]*out[1],support=Math.min(...points.map(project)),ends=points.filter(p=>Math.abs(project(p)-support)<1e-7);
        if(!ends.some(p=>{const t=(p[0]-edge.a.x)*u[0]+(p[1]-edge.a.y)*u[1];return t>=-1e-7&&t<=L+1e-7;}))continue;
        const delta=edge.a.x*out[0]+edge.a.y*out[1]-support,factor=axis?out[axis==='x'?0:1]:1,error=Math.abs(delta/factor);
        if(error<=tolerance(f,scale)+1e-7)slopedContacts.push({normal:out,delta,error,edge});
      }
      for(const source of entities({furniture:[placed]}))for(const a of source.edges)for(const target of scene)for(const b of target.edges){
        const n=Math.abs(a.a.x-a.b.x)<1e-7?0:Math.abs(a.a.y-a.b.y)<1e-7?1:null;
        if(n===null){
          const dx=a.b.x-a.a.x,dy=a.b.y-a.a.y,L=Math.hypot(dx,dy),ex=b.b.x-b.a.x,ey=b.b.y-b.a.y;
          if(Math.abs(dx*ey-dy*ex)>L*Math.hypot(ex,ey)*1e-7||dx*ex+dy*ey>=0)continue;
          const u=[dx/L,dy/L],normal=[u[1],-u[0]],dot=p=>(p.x-a.a.x)*u[0]+(p.y-a.a.y)*u[1],lo=Math.min(dot(b.a),dot(b.b)),hi=Math.max(dot(b.a),dot(b.b));
          const delta=(b.a.x-a.a.x)*normal[0]+(b.a.y-a.a.y)*normal[1],factor=axis?normal[axis==='x'?0:1]:1,error=Math.abs(delta/factor);
          if(Math.min(L,hi)-Math.max(0,lo)>1e-7&&error<=tolerance(f,scale)+1e-7)slopedContacts.push({normal,delta,error,edge:b});
          continue;
        }
        const t=1-n,key=n===0?'x':'y',other=t===0?'x':'y';
        if(Math.abs(b.a[key]-b.b[key])>1e-7||axis==='x'&&n===1||axis==='y'&&n===0)continue;
        if((a.b.x-a.a.x)*(b.b.x-b.a.x)+(a.b.y-a.a.y)*(b.b.y-b.a.y)>=0)continue;
        const overlap=Math.min(Math.max(a.a[other],a.b[other]),Math.max(b.a[other],b.b[other]))-Math.max(Math.min(a.a[other],a.b[other]),Math.min(b.a[other],b.b[other]));
        const delta=b.a[key]-a.a[key],error=Math.abs(delta);
        if(overlap>1e-7&&error<=tolerance(f,scale)+1e-7&&(!boundaryContact[n]||error<boundaryContact[n].error))boundaryContact[n]={delta,error,edge:b,kind:target.kind};
      }
    }
    let feature=null;
    // Every moving member contributes actual outline points; all share one delta.
    // Smooth tessellation vertices are not physical corner/midpoint magnets.
    for(const member of moving||[f]){
      const placed={...member,cx:member.cx+cx-f.cx,cy:member.cy+cy-f.cy};
      for(const entity of entities({furniture:[placed]}).filter(e=>!e.smooth))for(const e of entity.edges)for(const source of [{point:e.a,kind:'corner'},{point:{x:(e.a.x+e.b.x)/2,y:(e.a.y+e.b.y)/2},kind:'midpoint'}]){
        const hit=featureSnap(source.point,{scene,rects:targetRects,tol:capture,anchor:axis?source.point:null,horizontal:axis==='x'});
        if(hit){const delta=[hit.point.x-source.point.x,hit.point.y-source.point.y];
          if(boundaryContact.some((contact,n)=>contact&&Math.abs(contact.delta-delta[n])>1e-7))continue;
          if(slopedContacts.some(contact=>{const along=delta[0]*contact.normal[0]+delta[1]*contact.normal[1];return Math.abs(contact.delta-along)>1e-7;}))continue;
          if(!feature||hit.distance<feature.distance-1e-7)feature={...hit,source};
        }
      }
    }
    if(feature){
      const x=axis==='y'?cx:cx+feature.point.x-feature.source.point.x,y=axis==='x'?cy:cy+feature.point.y-feature.source.point.y;
      return {position:[finish[0]?.value??x,finish[1]?.value??y],guides:finishGuides.length?finishGuides:[{point:feature.point,kind:feature.kind,sourceKind:feature.source.kind,edge:feature.edge}]};
    }
    let nx=Math.round(cx/grid)*grid,ny=Math.round(cy/grid)*grid;
    if(axis==='x')ny=cy;else if(axis==='y')nx=cx;
    // Long, thin curtains need a wider visible capture area at overview zoom.
    const {hw,hh}=geometry.aabb(f),tol=tolerance(f,scale),bounds=geometry.localOutline(f)?geometry.bbox(geometry.footprints(f).flat()):[f.cx-hw,f.cy-hh,f.cx+hw,f.cy+hh],xs=[bounds[0]-f.cx,0,bounds[2]-f.cx],ys=[bounds[1]-f.cy,0,bounds[3]-f.cy];
    if(finish[0])nx=finish[0].value;if(finish[1])ny=finish[1].value;
    if(!finish[0]&&boundaryContact[0])nx=cx+boundaryContact[0].delta;if(!finish[1]&&boundaryContact[1])ny=cy+boundaryContact[1].delta;
    let bx=finish[0]||boundaryContact[0]?0:tol,by=finish[1]||boundaryContact[1]?0:tol,gx=null,gy=null;
    // With alignment guides enabled, wall edges also supply remote datum
    // lines. Face contact above still takes precedence over remote alignment.
    const wallGuides=[];
    if(wallSnap)for(const r of rects){
      if(axis!=='y'&&Math.max(r[1]-cy-hh,cy-hh-r[3])<=(guides?6000:tol))for(const ex of [r[0],r[2]])for(const c of [ex-xs[0],ex-xs[2]])if(Math.abs(c-cx)<bx){bx=Math.abs(c-cx);nx=c;wallGuides[0]=r[3]<cy-hh-tol||r[1]>cy+hh+tol?{v:true,x:ex,a:Math.min(cy-hh,r[1])-150,b:Math.max(cy+hh,r[3])+150}:null;}
      if(axis!=='x'&&Math.max(r[0]-nx-hw,nx-hw-r[2])<=(guides?6000:tol))for(const ey of [r[1],r[3]])for(const c of [ey-ys[0],ey-ys[2]])if(Math.abs(c-cy)<by){by=Math.abs(c-cy);ny=c;wallGuides[1]=r[2]<nx-hw-tol||r[0]>nx+hw+tol?{v:false,y:ey,a:Math.min(nx-hw,r[0])-150,b:Math.max(nx+hw,r[2])+150}:null;}
    }
    if(guides)for(const o of furniture){
      if(o.id===f.id||skip?.has(o.id)||Math.abs(o.cx-cx)>6000||Math.abs(o.cy-cy)>6000)continue;
      const B=geometry.aabb(o),bounds=geometry.localOutline(o)?geometry.bbox(geometry.footprints(o).flat()):[o.cx-B.hw,o.cy-B.hh,o.cx+B.hw,o.cy+B.hh];
      if(axis!=='y')for(const v of [bounds[0],o.cx,bounds[2]])for(const m of xs){const c=v-m;if(Math.abs(c-cx)<bx){bx=Math.abs(c-cx);nx=c;gx={x:v,o,B};}}
      if(axis!=='x')for(const v of [bounds[1],o.cy,bounds[3]])for(const m of ys){const c=v-m;if(Math.abs(c-cy)<by){by=Math.abs(c-cy);ny=c;gy={y:v,o,B};}}
    }
    const lines=[...finishGuides];
    if(guides)wallGuides.forEach((g,n)=>{if(g&&!(n===0?gx:gy))lines.push(g);});
    boundaryContact.forEach((contact,n)=>{if(contact?.kind==='furniture'&&!finish[n])lines.push({line:[contact.edge.a,contact.edge.b]});});
    if(gx)lines.push({v:true,x:gx.x,a:Math.min(ny-hh,gx.o.cy-gx.B.hh)-150,b:Math.max(ny+hh,gx.o.cy+gx.B.hh)+150});
    if(gy)lines.push({v:false,y:gy.y,a:Math.min(nx-hw,gy.o.cx-gy.B.hw)-150,b:Math.max(nx+hw,gy.o.cx+gy.B.hw)+150});
    const exact=value=>Math.round(value*1e6)/1e6;
    const position=[axis==='y'?cx:finish[0]?.value??(bx<tol?exact(nx):Math.round(nx)),axis==='x'?cy:finish[1]?.value??(by<tol?exact(ny):Math.round(ny))];
    // Keep oblique face contact after grid/AABB alignment too. Use the nearest
    // reachable face; an axis lock still permits only its original motion axis.
    const sloped=slopedContacts.sort((a,b)=>a.error-b.error)[0];
    if(sloped){const normal=sloped.normal,remaining=sloped.delta-(position[0]-cx)*normal[0]-(position[1]-cy)*normal[1],u=axis?(axis==='x'?[1,0]:[0,1]):normal,factor=u[0]*normal[0]+u[1]*normal[1];
      const next=position.map((value,n)=>value+u[n]*remaining/factor);
      if(Math.hypot(next[0]-cx,next[1]-cy)<=Math.SQRT2*tol+1e-7){position[0]=next[0];position[1]=next[1];lines.push({line:[sloped.edge.a,sloped.edge.b]});}
    }
    return {position,guides:lines};
  }
  // Resize from the original opposite corner, so snapping never moves that anchor.
  function resize(f,p,{scale,wallSnap,rects,furniture=[],guides=false,axis='both'}){
    const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
    const anchor={x:f.cx-f.w/2*c+f.d/2*s,y:f.cy-f.w/2*s-f.d/2*c};
    const dimensions=q=>({w:axis==='d'?f.w:Math.max(100,Math.round(((q.x-anchor.x)*c+(q.y-anchor.y)*s)/10)*10),d:axis==='w'?f.d:Math.max(100,Math.round((-(q.x-anchor.x)*s+(q.y-anchor.y)*c)/10)*10)});
    const build=({w,d})=>({...f,w,d,cx:anchor.x+w/2*c-d/2*s,cy:anchor.y+w/2*s+d/2*c});
    let next=build(dimensions(p));
    const hits=[];
    const targets=entities({rects:wallSnap?rects:[],furniture:guides?furniture.filter(o=>o.id!==f.id):[]}),tol=tolerance(f,scale);
    for(const dim of ['w','d']){
      if(axis===(dim==='w'?'d':'w'))continue;
      const u=dim==='w'?[c,s]:[-s,c],v=dim==='w'?[-s,c]:[c,s],span=next[dim==='w'?'d':'w'];
      const dot=(q,b)=>(q.x-anchor.x)*b[0]+(q.y-anchor.y)*b[1],raw=dot(p,u);let best=null;
      // A curved silhouette does not fill its nominal side. Clip its unit
      // outline to the finite target span before solving the scaled support.
      const unit=geometry.localOutline(f)?furnitureRings(build({...next,[dim]:1})).map(r=>r.map(p=>({n:dot({x:p[0],y:p[1]},u),t:dot({x:p[0],y:p[1]},v)}))):null;
      for(const target of targets)for(const e of target.edges){
        const dx=e.b.x-e.a.x,dy=e.b.y-e.a.y;
        if(Math.abs(dx*u[0]+dy*u[1])>Math.hypot(dx,dy)*1e-7)continue;
        const lo=Math.min(dot(e.a,v),dot(e.b,v)),hi=Math.max(dot(e.a,v),dot(e.b,v)),factor=unit?spanSupport(unit,lo,hi):1;
        if(!(factor>1e-7))continue;
        const value=dot(e.a,u)/factor,error=Math.abs(value-raw);
        // Contact remains finite. A wall datum may extend across a gap only
        // when guides are enabled, within the same 6 m alignment search span.
        const gap=Math.max(lo-span,-hi),extension=gap>1e-7;
        if(value<100||extension&&!(target.kind==='wall'&&guides&&gap<=6000)||error>tol+1e-7||best&&(Number(extension)>Number(best.extension)||extension===best.extension&&error>=best.error-1e-7))continue;
        const guide=extension?{line:[
          {x:anchor.x+u[0]*value+v[0]*Math.min(0,lo),y:anchor.y+u[1]*value+v[1]*Math.min(0,lo)},
          {x:anchor.x+u[0]*value+v[0]*Math.max(span,hi),y:anchor.y+u[1]*value+v[1]*Math.max(span,hi)}
        ]}:{line:[e.a,e.b]};
        best={value,error,e,extension,guide};
      }
      if(best){next=build({...next,[dim]:Math.round(best.value*1e6)/1e6});hits.push({dim,e:best.e,extension:best.extension,guide:best.guide});}
    }
    // A corner grip can shorten the other dimension after the first hit.
    // Recheck the final finite span rather than showing a now unreachable edge.
    for(let i=0;i<hits.length;){const {dim,e}=hits[i],v=dim==='w'?[-s,c]:[c,s],dot=q=>(q.x-anchor.x)*v[0]+(q.y-anchor.y)*v[1],lo=Math.min(dot(e.a),dot(e.b)),hi=Math.max(dot(e.a),dot(e.b));
      const u=dim==='w'?[c,s]:[-s,c],normal=q=>(q.x-anchor.x)*u[0]+(q.y-anchor.y)*u[1];
      const curved=geometry.localOutline(f)&&furnitureRings(next).map(r=>r.map(p=>({n:normal({x:p[0],y:p[1]}),t:dot({x:p[0],y:p[1]})})));
      if(!hits[i].extension&&(Math.min(next[dim==='w'?'d':'w'],hi)-Math.max(0,lo)<-1e-7||curved&&Math.abs(spanSupport(curved,lo,hi)-normal(e.a))>2e-6)){next=build({...next,[dim]:dimensions(p)[dim]});hits.splice(i,1);i=0;}else i++;
    }
    return {furniture:next,guides:hits.map(hit=>hit.guide)};
  }
  // Snap the entire moving edge to parallel boundaries; guides also permit
  // remote wall datum lines. Keep wall/normal intersections for angled walls.
  function kitchenEdgeSnap(f,center,u,segments,raw,{grid,scale,wallSnap,rects,furniture,guides},apply){
    const step=Number.isFinite(grid)&&grid>0?grid:10,delta=Math.round(raw/step)*step;
    if(Math.abs(raw)<1e-8)return {furniture:apply(0),guides:[]};
    const tol=tolerance(f,scale),v=[-u[1],u[0]],dot=(p,axis)=>p.x*axis[0]+p.y*axis[1],cross=(a,b)=>a.x*b.y-a.y*b.x,candidates=[];
    const source=segments.map(e=>({lo:Math.min(dot(e.a,v),dot(e.b,v)),hi:Math.max(dot(e.a,v),dot(e.b,v))})),along=dot(center,u);
    const line=(t,lo,hi)=>{
      const at=s=>({x:u[0]*(along+t)+v[0]*s,y:u[1]*(along+t)+v[1]*s}),a=at(lo-150),b=at(hi+150);
      return Math.abs(u[0])>1-1e-8?{v:true,x:a.x,a:Math.min(a.y,b.y),b:Math.max(a.y,b.y)}:Math.abs(u[1])>1-1e-8?{v:false,y:a.y,a:Math.min(a.x,b.x),b:Math.max(a.x,b.x)}:{line:[a,b]};
    };
    const add=(t,lo,hi)=>{t=Math.round(t*1e6)/1e6;const error=Math.abs(t-raw);if(Number.isFinite(t)&&error<=tol+1e-7)candidates.push({t,error,guide:line(t,lo,hi)});};
    const targets=entities({rects:wallSnap?rects:[],furniture:guides?furniture.filter(o=>o.id!==f.id&&o.counterLink?.hostId!==f.id):[]});
    for(const target of targets)for(const e of target.edges){
      const d={x:e.b.x-e.a.x,y:e.b.y-e.a.y},length=Math.hypot(d.x,d.y);
      if(Math.abs(d.x*u[0]+d.y*u[1])<=length*1e-7){
        const t=dot(e.a,u)-along,lo=Math.min(dot(e.a,v),dot(e.b,v)),hi=Math.max(dot(e.a,v),dot(e.b,v));
        for(const s of source)if(Math.max(lo-s.hi,s.lo-hi)<=(target.kind==='wall'&&guides?6000:tol)+1e-7)add(t,Math.min(lo,s.lo),Math.max(hi,s.hi));
      }else if(target.kind==='wall'){
        const motion={x:u[0],y:u[1]},den=cross(motion,d);
        for(const segment of segments){const mid={x:(segment.a.x+segment.b.x)/2,y:(segment.a.y+segment.b.y)/2},offset={x:e.a.x-mid.x,y:e.a.y-mid.y},t=cross(offset,d)/den,at=cross(offset,motion)/den;
          if(at>=-1e-8&&at<=1+1e-8){const span=dot(mid,v);add(t,Math.min(span,dot(e.a,v),dot(e.b,v)),Math.max(span,dot(e.a,v),dot(e.b,v)));}
        }
      }
    }
    candidates.sort((a,b)=>a.error-b.error);
    for(const candidate of candidates){try{return {furniture:apply(candidate.t),guides:[candidate.guide]};}catch{/* Ignore an inadmissible magnet; retain normal model validation below. */}}
    return {furniture:apply(delta),guides:[]};
  }
  // Constrain a run's grip to its production length axis, including its full end span.
  function kitchenEdgeData(f,key){
    const K=root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null),[kind,value]=String(key).split(':');let x,y,dx,dy,segments,canonical;
    if(kind==='run'){
      const h=K.runHandles(f).find(h=>String(h.run)===value);if(!h)throw Error('厨房所在边已变化');({x,y,dx,dy}=h);
      const a=K.world(f,x-h.dy*h.span/2,y+h.dx*h.span/2),b=K.world(f,x+h.dy*h.span/2,y-h.dx*h.span/2);segments=[{a:{x:a[0],y:a[1]},b:{x:b[0],y:b[1]}}];
    }else if(kind==='outer'&&['left','right','top','bottom'].includes(value)){
      canonical=f.flip?(value==='left'?'right':value==='right'?'left':value):value;K.outerEdge(f,canonical);dx=canonical==='left'?-1:canonical==='right'?1:0;dy=canonical==='top'?-1:canonical==='bottom'?1:0;x=dx*f.w/2;y=dy*f.d/2;
      const axis=dx?0:1,bound=dx?x:y,r=K.outline(f);segments=r.flatMap((p,i)=>{const q=r[(i+1)%r.length];if(Math.abs(p[axis]-bound)>.01||Math.abs(q[axis]-bound)>.01)return [];const a=K.world(f,...p),b=K.world(f,...q);return [{a:{x:a[0],y:a[1]},b:{x:b[0],y:b[1]}}];});
    }else throw Error('厨房边界无效');
    const a=K.world(f,x,y),b=K.world(f,x+dx,y+dy);return {key,kind,run:kind==='run'?Number(value):K.outerEdge(f,canonical).run,canonical,center:{x:a[0],y:a[1]},u:[b[0]-a[0],b[1]-a[1]],segments};
  }
  function kitchenGapForEdge(f,key,targets,scale){
    const data=kitchenEdgeData(f,key),u=data.u,v=[-u[1],u[0]],dot=(p,a)=>p.x*a[0]+p.y*a[1],tol=tolerance(f,scale);let best=null;
    for(const target of targets)for(const e of target.edges){
      const dx=e.b.x-e.a.x,dy=e.b.y-e.a.y;if(Math.abs(dx*u[0]+dy*u[1])>Math.hypot(dx,dy)*1e-7)continue;
      const gap=dot(e.a,u)-dot(data.center,u);if(gap<-tol-1e-7)continue;
      const lo=Math.min(dot(e.a,v),dot(e.b,v)),hi=Math.max(dot(e.a,v),dot(e.b,v));
      for(const s of data.segments){const low=Math.min(dot(s.a,v),dot(s.b,v)),high=Math.max(dot(s.a,v),dot(s.b,v)),score=Math.hypot(gap,Math.max(0,lo-high,low-hi));
        if(best&&score>=best.score-1e-7)continue;
        best={key,kind:data.kind,run:data.run,score,gap:Math.round(gap*1e6)/1e6,reference:{id:target.id,name:target.name},edge:{a:{...e.a},b:{...e.b}}};
      }
    }
    return best;
  }
  function kitchenGaps(f,{furniture=[],scale=1,referenceId}={}){
    const K=root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null);if(!f.kitchen||!K.outerResizable(f))return [];
    const targets=entities({furniture:furniture.filter(o=>o.id!==f.id&&o.counterLink?.hostId!==f.id&&o.laundryHostId!==f.id&&(referenceId===undefined||o.id===referenceId))});
    return [...['left','right','top','bottom'].map(e=>'outer:'+e),...K.runHandles(f).map(h=>'run:'+h.run)].map(key=>kitchenGapForEdge(f,key,targets,scale)).filter(Boolean);
  }
  function setKitchenGap(f,key,referenceId,gap,{furniture=[],scale=1}={}){
    if(!Number.isFinite(gap)||gap<0||gap>20000)throw Error('预留间距须为 0–20000 mm');
    const current=kitchenGaps(f,{furniture,scale,referenceId}).find(row=>row.key===key);if(!current)throw Error('这条边与参考家具没有可用的平行边，请重新选择');
    const K=root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null),data=kitchenEdgeData(f,key),delta=current.gap-gap;
    const next=data.kind==='outer'?K.resizeOuter(f,data.canonical,delta,{furniture}):K.resizeRun(f,data.run,K.runHandles(f).find(h=>h.run===data.run).length+delta,{furniture});
    const now=kitchenEdgeData(next,key),actual=(current.edge.a.x-now.center.x)*data.u[0]+(current.edge.a.y-now.center.y)*data.u[1];if(Math.abs(actual-gap)>1e-5)throw Error('预留间距无法通过该边尺寸实现');
    return next;
  }
  function resizeKitchenRun(f,run,p,{start,grid=10,scale=1,wallSnap=false,rects=[],furniture=[],guides=true}={}){
    const K=root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null),h=K.runHandles(f).find(h=>h.run===run);
    if(!h||!start)throw Error('厨房拉伸手柄已失效，请重新选择');
    const a=K.world(f,h.x,h.y),b=K.world(f,h.x+h.dx,h.y+h.dy),u=[b[0]-a[0],b[1]-a[1]],raw=(p.x-start.x)*u[0]+(p.y-start.y)*u[1],center={x:a[0],y:a[1]},v=[-u[1]*h.span/2,u[0]*h.span/2],segments=[{a:{x:a[0]-v[0],y:a[1]-v[1]},b:{x:a[0]+v[0],y:a[1]+v[1]}}];
    return kitchenEdgeSnap(f,center,u,segments,raw,{grid,scale,wallSnap,rects,furniture,guides},delta=>K.resizeRun(f,run,h.length+delta,{furniture}));
  }
  function resizeKitchenExtension(f,run,field,p,{start,grid=10,scale=1,wallSnap=false,rects=[],furniture=[],guides=true}={}){
    const K=root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null),h=K.extensionHandles(f).find(h=>h.run===run&&h.field===field);
    if(!h||!start)throw Error('薄柜拉伸手柄已失效，请重新选择');
    const a=K.world(f,h.x,h.y),b=K.world(f,h.x+h.dx,h.y+h.dy),u=[b[0]-a[0],b[1]-a[1]],raw=(p.x-start.x)*u[0]+(p.y-start.y)*u[1],v=[-u[1]*h.span/2,u[0]*h.span/2],segments=[{a:{x:a[0]-v[0],y:a[1]-v[1]},b:{x:a[0]+v[0],y:a[1]+v[1]}}];
    return kitchenEdgeSnap(f,{x:a[0],y:a[1]},u,segments,raw,{grid,scale,wallSnap,rects,furniture,guides},delta=>K.resizeExtension(f,run,field,h.value+delta));
  }
  function resizeKitchenDivider(f,key,p,{start,grid=10,scale=1,wallSnap=false,rects=[],furniture=[],guides=true}={}){
    const K=root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null),h=K.dividerHandles(f).find(h=>h.key===key);
    if(!h||!start)throw Error('柜间分界线已失效，请重新选择');
    const a=K.world(f,h.x,h.y),b=K.world(f,h.x+h.dx,h.y+h.dy),u=[b[0]-a[0],b[1]-a[1]],raw=(p.x-start.x)*u[0]+(p.y-start.y)*u[1],v=[-u[1]*h.span/2,u[0]*h.span/2],segments=[{a:{x:a[0]-v[0],y:a[1]-v[1]},b:{x:a[0]+v[0],y:a[1]+v[1]}}];
    return kitchenEdgeSnap(f,{x:a[0],y:a[1]},u,segments,raw,{grid,scale,wallSnap,rects,furniture,guides},delta=>K.resizeDivider(f,key,delta,{furniture}));
  }
  function resizeKitchenOuter(f,edge,p,{start,grid=10,scale=1,wallSnap=false,rects=[],furniture=[],guides=true}={}){
    const K=root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null);
    if(!start||!['left','right','top','bottom','corner'].includes(edge))throw Error('厨房外边拖动已失效，请重新选择');
    const sides=edge==='corner'?['right','bottom']:[edge],lines=[];let next=f;
    for(const side of sides){
      const canonical=f.flip?(side==='left'?'right':side==='right'?'left':side):side,dx=canonical==='left'?-1:canonical==='right'?1:0,dy=canonical==='top'?-1:canonical==='bottom'?1:0;
      const a=K.world(f,dx*f.w/2,dy*f.d/2),b=K.world(f,dx*f.w/2+dx,dy*f.d/2+dy),u=[b[0]-a[0],b[1]-a[1]],raw=(p.x-start.x)*u[0]+(p.y-start.y)*u[1];
      const axis=dx?0:1,bound=dx?dx*f.w/2:dy*f.d/2,segments=[K.outline(f)].flatMap(r=>r.flatMap((p,i)=>{const q=r[(i+1)%r.length];if(Math.abs(p[axis]-bound)>.01||Math.abs(q[axis]-bound)>.01)return [];const x=K.world(f,...p),y=K.world(f,...q);return [{a:{x:x[0],y:x[1]},b:{x:y[0],y:y[1]}}];}));
      const result=kitchenEdgeSnap(f,{x:a[0],y:a[1]},u,segments,raw,{grid,scale,wallSnap,rects,furniture,guides},delta=>K.resizeOuter(next,canonical,delta,{furniture}));next=result.furniture;lines.push(...result.guides);
    }
    return {furniture:next,guides:lines};
  }
  const xy=p=>({x:p[0],y:p[1]}),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function edges(rings){return rings.flatMap(poly=>poly.map((p,i)=>({a:xy(p),b:xy(poly[(i+1)%poly.length])}))).filter(e=>distance(e.a,e.b)>1e-7);}
  function furnitureRings(f){
    if(!f.kitchen)return geometry.footprints(f);
    const K=root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null);
    if(K.isWall(f))return K.footprints(f);
    // Match the visible counter perimeter, including cutouts and narrowed ends.
    return K.topGeometry(f).rings.map(r=>r.map(p=>K.world(f,...p)));
  }
  const furnitureEntityCache=new WeakMap();
  function orientEntity(e){const ring=e.rings[0]||[],signed=ring.reduce((sum,p,i)=>{const q=ring[(i+1)%ring.length];return sum+p[0]*q[1]-q[0]*p[1];},0),boundary=edges(e.rings);return {...e,edges:signed<0?boundary.map(edge=>({a:edge.b,b:edge.a})):boundary};}
  function furnitureEntity(f){const key=JSON.stringify(f),old=furnitureEntityCache.get(f);if(old?.key===key)return old.entity;const entity=orientEntity({kind:'furniture',id:f.id,name:f.name,smooth:!!geometry.localOutline(f),rings:furnitureRings(f)});furnitureEntityCache.set(f,{key,entity});return entity;}
  function entities({rects=[],furniture=[]}){
    const out=rects.map((r,i)=>({kind:'wall',id:i,name:'',rings:[[[r[0],r[1]],[r[2],r[1]],[r[2],r[3]],[r[0],r[3]]]]}));
    const walls=out.map(e=>{
      // Mirroring reverses winding, but must not reverse which side of a
      // boundary is solid. Preserve hole winding relative to the outer ring.
      const ring=e.rings[0]||[],signed=ring.reduce((sum,p,i)=>{const q=ring[(i+1)%ring.length];return sum+p[0]*q[1]-q[0]*p[1];},0);
      const boundary=edges(e.rings);return {...e,edges:signed<0?boundary.map(edge=>({a:edge.b,b:edge.a})):boundary};
    });
    for(const f of furniture){try{walls.push(furnitureEntity(f));}catch{/* Invalid saved models cannot supply a reliable boundary. */}}
    return walls;
  }
  function project(p,e){
    const dx=e.b.x-e.a.x,dy=e.b.y-e.a.y,t=((p.x-e.a.x)*dx+(p.y-e.a.y)*dy)/(dx*dx+dy*dy),u=Math.max(0,Math.min(1,t));
    return {point:{x:e.a.x+u*dx,y:e.a.y+u*dy},interior:t>=-1e-8&&t<=1+1e-8};
  }
  function featureSnap(at,{scene,rects,tol,anchor,horizontal}){
    // Feature points outrank edge projections, but never break the Shift axis.
    let feature=null;
    const considerFeature=(q,e,wall,kind='corner')=>{
      if(anchor&&Math.abs(q[horizontal?'y':'x']-at[horizontal?'y':'x'])>1e-7)return;
      const d=distance(at,q);if(d>tol+1e-7||feature&&d>=feature.distance-1e-7)return;
      // Overlapping wall rectangles can hide their original end features.
      if(wall&&rects.some(r=>q.x>r[0]+1e-7&&q.x<r[2]-1e-7&&q.y>r[1]+1e-7&&q.y<r[3]-1e-7))return;
      feature={point:{x:q.x,y:q.y},edge:e,distance:d,kind};
    };
    for(const entity of scene.filter(e=>!e.smooth))for(const e of entity.edges)considerFeature(e.a,e,entity.kind==='wall');
    const nearbyWallEdges=scene.filter(e=>e.kind==='wall').flatMap(e=>e.edges).filter(e=>distance(at,project(at,e).point)<=tol+1e-7);
    for(let i=0;i<nearbyWallEdges.length;i++)for(let j=i+1;j<nearbyWallEdges.length;j++){
      const q=intersection(nearbyWallEdges[i],nearbyWallEdges[j]);if(q)considerFeature(q,nearbyWallEdges[i],true);
    }
    for(const entity of scene.filter(e=>!e.smooth))for(const e of entity.edges)considerFeature({x:(e.a.x+e.b.x)/2,y:(e.a.y+e.b.y)/2},e,entity.kind==='wall','midpoint');
    return feature;
  }
  function measurePoint(p,{scale,rects=[],furniture=[],anchor}){
    const tol=12/scale,horizontal=anchor&&Math.abs(p.x-anchor.x)>Math.abs(p.y-anchor.y);
    const at=anchor?{x:horizontal?p.x:anchor.x,y:horizontal?anchor.y:p.y}:p;
    let best=tol,edge=null,point={x:Math.round(at.x/10)*10,y:Math.round(at.y/10)*10};
    if(anchor)point[horizontal?'y':'x']=anchor[horizontal?'y':'x'];
    const scene=entities({rects,furniture});
    const feature=featureSnap(at,{scene,rects,tol,anchor,horizontal});
    if(feature)return {point:feature.point,edge:feature.edge,kind:feature.kind};
    for(const entity of scene)for(const e of entity.edges){
      let q;
      if(anchor){
        const key=horizontal?'y':'x',other=horizontal?'x':'y',delta=e.b[key]-e.a[key];
        if(Math.abs(delta)<1e-8){if(Math.abs(at[key]-e.a[key])>1e-7)continue;q=project(at,e).point;}
        else {const t=(at[key]-e.a[key])/delta;if(t<0||t>1)continue;q={...at,[other]:e.a[other]+t*(e.b[other]-e.a[other])};}
      }else q=project(at,e).point;
      const d=distance(at,q);if(d<=tol+1e-7&&(!edge||d<best-1e-7)){best=d;point=q;edge=e;}
    }
    return {point,edge,kind:edge?'edge':null};
  }
  function point(p,options){return measurePoint(p,options).point;}
  function intersection(e,f){
    const dx=e.b.x-e.a.x,dy=e.b.y-e.a.y,ex=f.b.x-f.a.x,ey=f.b.y-f.a.y,den=dx*ey-dy*ex;
    if(Math.abs(den)<1e-8)return null;
    const x=f.a.x-e.a.x,y=f.a.y-e.a.y,t=(x*ey-y*ex)/den,u=(x*dy-y*dx)/den;
    return t>=0&&t<=1&&u>=0&&u<=1?{x:e.a.x+t*dx,y:e.a.y+t*dy}:null;
  }
  function contains(entity,p){return entity.rings.reduce((inside,ring)=>inside!==geometry.inPoly(p.x,p.y,ring),false);}
  // A fully enclosed projection has distances to the enclosing exit edges.
  // This is a boundary measurement only, never evidence of a usable cavity.
  function encloses(target,sources){
    const box=e=>geometry.bbox(e.rings.flat()),B=box(target);
    if(sources.some(e=>{const A=box(e);return A[0]<B[0]-1e-7||A[1]<B[1]-1e-7||A[2]>B[2]+1e-7||A[3]>B[3]+1e-7;}))return false;
    const Z=root.FurnishZoneGeometry||(typeof require==='function'?require('./zone-geometry.js'):null);
    return sources.every(e=>Z.area(Z.decompose([...e.rings,...target.rings],p=>contains(e,{x:p[0],y:p[1]})&&!contains(target,{x:p[0],y:p[1]})))<1e-6);
  }
  // Only a finite wall face alongside the measuring cell can outrank its edge.
  // A wall elsewhere across the room, or touching only a corner, cannot.
  function adjoiningWall(wall,cell,tolerance){
    for(const a of cell.edges){const dx=a.b.x-a.a.x,dy=a.b.y-a.a.y,L=Math.hypot(dx,dy),ux=dx/L,uy=dy/L;
      for(const b of wall.edges){const ex=b.b.x-b.a.x,ey=b.b.y-b.a.y,B=Math.hypot(ex,ey);if(Math.abs(dx*ey-dy*ex)>L*B*1e-7)continue;
        const offset=p=>({along:(p.x-a.a.x)*ux+(p.y-a.a.y)*uy,normal:-(p.x-a.a.x)*uy+(p.y-a.a.y)*ux}),p=offset(b.a),q=offset(b.b);
        if(Math.abs(p.normal)<=tolerance+1e-7&&Math.min(L,Math.max(p.along,q.along))-Math.max(0,Math.min(p.along,q.along))>1e-6)return true;
      }
    }return false;
  }
  function nearest(f,options){
    const source=entities({furniture:[f]})[0];if(!source)return null;
    let best=null;
    const consider=(a,b,perpendicular,entity)=>{const d=distance(a,b);if(!best||d<best.distance-1e-7||Math.abs(d-best.distance)<1e-7&&perpendicular&&!best.perpendicular)best={a,b,distance:d,perpendicular,entity:{kind:entity.kind,id:entity.id,name:entity.name}};};
    for(const target of entities(options)){
      if(target.kind==='furniture'&&target.id===f.id)continue;
      for(const e of source.edges)for(const g of target.edges){
        const hit=intersection(e,g);if(hit)consider(hit,hit,false,target);
        for(const p of [e.a,e.b]){const q=project(p,g);consider(p,q.point,q.interior,target);}
        for(const p of [g.a,g.b]){const q=project(p,e);consider(q.point,p,q.interior,target);}
      }
      const inside=source.edges.find(e=>contains(target,e.a))?.a||target.edges.find(e=>contains(source,e.a))?.a;
      if(inside)consider(inside,inside,false,target);
    }
    return best;
  }
  // Sweep the actual silhouette in drawing coordinates. Within each slab the
  // boundary coordinates and directional gaps are affine, so endpoints suffice.
  const targetPartsCache=new WeakMap(),targetSectionsCache=new WeakMap(),targetRotationCache=new WeakMap();
  function solidTargets(entity,parts){let cache=targetPartsCache.get(parts);if(!cache){cache=new WeakMap();targetPartsCache.set(parts,cache);}let targets=cache.get(entity);if(!targets){targets=parts.map(part=>({...entity,...part,rings:[part.p],edges:edges([part.p])}));cache.set(entity,targets);}return targets;}
  function clippedTarget(source,range,M){let cache=targetSectionsCache.get(source);if(!cache){cache=new Map();targetSectionsCache.set(source,cache);}const key=range?range.bottom+':'+range.top:'all';if(cache.has(key))return cache.get(key);const p=M.section(source,range),value={...source,rings:[p],edges:edges([p])};cache.set(key,value);if(cache.size>8)cache.delete(cache.keys().next().value);return value;}
  function rotatedTarget(target,rotation,rotate){let cache=targetRotationCache.get(target);if(!cache){cache=new Map();targetRotationCache.set(target,cache);}if(!cache.has(rotation)){const list=target.edges.map(g=>({a:rotate(g.a),b:rotate(g.b)})),points=list.flatMap(e=>[e.a,e.b]),bounds={x0:Math.min(...points.map(p=>p.x)),x1:Math.max(...points.map(p=>p.x)),y0:Math.min(...points.map(p=>p.y)),y1:Math.max(...points.map(p=>p.y))};cache.set(rotation,{...target,edges:list,bounds});if(cache.size>4)cache.delete(cache.keys().next().value);}return cache.get(rotation);}
  function directional(f,{rotation=0,...options}){
    const out={l:null,r:null,t:null,b:null},preferredWalls={l:null,r:null,t:null,b:null},angle=rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
    const rotate=p=>({x:p.x*c-p.y*s,y:p.x*s+p.y*c}),unrotate=p=>({x:p.x*c+p.y*s,y:-p.x*s+p.y*c});
    const transform=e=>({...e,edges:e.edges.map(g=>({a:rotate(g.a),b:rotate(g.b)}))});
    const members=Array.isArray(f)?f:[f],sources=entities({furniture:members});if(!sources.length||sources.length!==members.length)return out;
    const ids=new Set(members.map(v=>v.id)),transformedSources=sources.map(transform);
    const sourceBounds=new Map(transformedSources.map(source=>{const points=source.edges.flatMap(e=>[e.a,e.b]);return [source,{x0:Math.min(...points.map(p=>p.x)),x1:Math.max(...points.map(p=>p.x)),y0:Math.min(...points.map(p=>p.y)),y1:Math.max(...points.map(p=>p.y))}];}));
    const products=root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null),surfaceSource=members.length===1&&(products?.definition(members[0])?.measureSurfaceBoundary||members[0].counterLink&&products?.definition(members[0])?.linkedSurfaceOffset)&&!members[0].obj?members[0]:null;
    const cabinets=root.FurnishCabinet||(typeof require==='function'?require('./cabinet-core.js'):null);
    const design=root.FurnishDesign||(typeof require==='function'?require('./design-core.js'):null),verticals=members.map(member=>design.furnitureVerticalBounds(member,options.plan,options.furniture));
    const fitsHoodBay=(a,b)=>products.hoodInstallation(b)&&cabinets.hoodBayFit(a,b)?.fits||products.hoodInstallation(a)&&cabinets.hoodBayFit(b,a)?.fits;
    const K=surfaceSource&&(root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null)),furnitureById=new Map((options.furniture||[]).map(v=>[v.id,v])),host=K&&K.support(surfaceSource,options.furniture||[]),region=host&&K.measurementSurface(surfaceSource,host),cell=region&&{rings:region.rings.map(r=>r.map(p=>K.world(host,...p)))};
    if(cell)cell.edges=edges(cell.rings);
    const finishes=root.FurnishWallFinish||(typeof require==='function'?require('./wall-finish-core.js'):null),walls=options.plan?finishes.spatial(options.plan).walls:[];
    const at=(edge,key,cross,value)=>edge.a[key]+(value-edge.a[cross])*(edge.b[key]-edge.a[key])/(edge.b[cross]-edge.a[cross]);
    const section=(entity,key,cross,value)=>entity.edges.filter(e=>value>Math.min(e.a[cross],e.b[cross])&&value<Math.max(e.a[cross],e.b[cross])).sort((a,b)=>at(a,key,cross,value)-at(b,key,cross,value));
    for(const entity of entities(options)){
      if(host&&entity.kind==='wall'&&entity.id>=(options.solidWallCount??(options.rects||[]).length))continue;
      const moduleTarget=host&&entity.kind==='furniture'&&entity.id===host.id;
      if(entity.kind==='furniture'&&ids.has(entity.id))continue;
      const targetFurniture=entity.kind==='furniture'?furnitureById.get(entity.id):null;
      if(targetFurniture&&products.modelError(targetFurniture))continue;
      // The top projection includes appliance bays and overhead slabs. Only
      // actual kitchen solids sharing the source height can obstruct a gap.
      // Supported hobs/sinks still measure to their worktop's exit boundary.
      const targets=moduleTarget?[{...entity,...cell,name:region.moduleKey?host.name+' · '+region.moduleName:host.name}]:targetFurniture?solidTargets(entity,geometry.bodyParts(targetFurniture,options.plan,options.furniture)):[entity];
      for(const baseTarget of targets)for(let memberIndex=0;memberIndex<(baseTarget.actualBoard?members.length:1);memberIndex++){
      let originalTarget=baseTarget;const sourceIndex=baseTarget.actualBoard?memberIndex:undefined;
      // Only members sharing the target's height can define its measuring edge.
      // Unknown heights stay conservative; walls still use every member.
      const wall=entity.kind==='wall'&&entity.id<(options.solidWallCount??(options.rects||[]).length)&&walls[entity.id]?.slice(0,4).every((v,i)=>Math.abs(v-options.rects[entity.id][i])<1e-6)?walls[entity.id]:null;
      const eligible=transformedSources.filter((_,i)=>(!wall||finishes.measurementWallRelevant(wall,members[i],verticals[i]))&&(sourceIndex===undefined||sourceIndex===i)&&(!targetFurniture||(moduleTarget||geometry.verticalOverlap(members[i],targetFurniture,[verticals[i],originalTarget.vertical]))&&!fitsHoodBay(members[i],targetFurniture)));
      if(!eligible.length)continue;
      // A directional ray requires positive overlap on its cross axis. Reject
      // diagonal parts using their full production projection before clipping
      // expensive mesh sections. This is conservative for groups and holes.
      const box=rotatedTarget(originalTarget,rotation,rotate).bounds,boxes=eligible.map(e=>sourceBounds.get(e)),sourceBox=boxes.length===1?boxes[0]:{x0:Math.min(...boxes.map(b=>b.x0)),x1:Math.max(...boxes.map(b=>b.x1)),y0:Math.min(...boxes.map(b=>b.y0)),y1:Math.max(...boxes.map(b=>b.y1))};
      const overlapX=Math.min(sourceBox.x1,box.x1)-Math.max(sourceBox.x0,box.x0);
      const overlapY=Math.min(sourceBox.y1,box.y1)-Math.max(sourceBox.y0,box.y0);
      if(overlapX<1e-7&&overlapY<1e-7)continue;
      // Full production projections give lower bounds even before height
      // clipping. Skip only when no ray can improve an existing exact result.
      // Adjoining worktop walls retain their independent priority search.
      if(!(cell&&entity.kind==='wall')){
        const left=box.x0>sourceBox.x1+1e-7||out.l&&Math.max(0,sourceBox.x0-box.x1)>=out.l.distance-1e-7;
        const right=box.x1<sourceBox.x0-1e-7||out.r&&Math.max(0,box.x0-sourceBox.x1)>=out.r.distance-1e-7;
        const top=box.y0>sourceBox.y1+1e-7||out.t&&Math.max(0,sourceBox.y0-box.y1)>=out.t.distance-1e-7;
        const bottom=box.y1<sourceBox.y0-1e-7||out.b&&Math.max(0,box.y0-sourceBox.y1)>=out.b.distance-1e-7;
        if((overlapY<1e-7||left&&right)&&(overlapX<1e-7||top&&bottom))continue;
      }
      if(originalTarget.actualBoard){
        const M=root.FurnishCabinetMotion||require('./cabinet-motion.js'),ranges=verticals.filter((_,i)=>eligible.includes(transformedSources[i])),range=ranges.every(Boolean)?{bottom:Math.min(...ranges.map(r=>r.bottom)),top:Math.max(...ranges.map(r=>r.top))}:null;
        originalTarget=clippedTarget(originalTarget,range,M);if(originalTarget.rings[0].length<3)continue;
      }
      const source=eligible.length===1?eligible[0]:{edges:eligible.flatMap(e=>e.edges)},sourceHits=[];
      // Overlapping rotated members may exchange the outermost edge between vertices.
      if(eligible.length>1)for(let i=0;i<source.edges.length;i++)for(let j=i+1;j<source.edges.length;j++){const p=intersection(source.edges[i],source.edges[j]);if(p)sourceHits.push(p);}
      // A supported appliance sits inside the worktop: measure to the exit edge of
      // that surface, rather than treating the worktop beneath it as a collision.
      // Reuse full production-surface containment (concavities/cuts included).
      const containedBoundary=!!targetFurniture&&!moduleTarget&&!originalTarget.actualBoard&&encloses(originalTarget,sources.filter((_,i)=>eligible.includes(transformedSources[i])));
      const surfaceBoundary=!!moduleTarget,exitBoundary=surfaceBoundary||containedBoundary,wallPriority=!!(cell&&originalTarget.kind==='wall'&&adjoiningWall(originalTarget,cell,products.definition(surfaceSource).surfaceMeasurement.wallContactTolerance));
      const target=rotatedTarget(originalTarget,rotation,rotate),hits=[...sourceHits];
      for(const a of source.edges)for(const b of target.edges){const p=intersection(a,b);if(p)hits.push(p);}
      for(const [key,cross,negative,positive] of [['x','y','l','r'],['y','x','t','b']]){
        const coords=e=>e.edges.flatMap(g=>[g.a[cross],g.b[cross]]),a=coords(source),b=coords(target),lo=Math.max(Math.min(...a),Math.min(...b)),hi=Math.min(Math.max(...a),Math.max(...b));
        if(hi-lo<1e-7)continue; // A diagonal corner alone is not a directional clearance.
        const cuts=[lo,...a,...b,...hits.map(p=>p[cross]),hi].filter(v=>v>=lo&&v<=hi).sort((a,b)=>a-b).filter((v,i,all)=>!i||v-all[i-1]>1e-7);
        for(let i=1;i<cuts.length;i++){
          const low=cuts[i-1],high=cuts[i],mid=(low+high)/2,A=section(source,key,cross,mid),B=section(target,key,cross,mid);if(!A.length||B.length%2)continue;
          for(const [dir,sign,edge] of [[negative,-1,A[0]],[positive,1,A.at(-1)]])for(let j=0;j<B.length;j+=2){
            const near=exitBoundary?(sign>0?B[j+1]:B[j]):(sign>0?B[j]:B[j+1]),far=sign>0?B[j+1]:B[j];
            if(exitBoundary&&(at(edge,key,cross,mid)<at(B[j],key,cross,mid)-1e-7||at(edge,key,cross,mid)>at(B[j+1],key,cross,mid)+1e-7))continue;
            if(sign*(at(far,key,cross,mid)-at(edge,key,cross,mid))<-1e-7)continue; // Entirely behind the outward silhouette.
            for(const value of [mid,low,high]){
              const start=at(edge,key,cross,value),end=at(near,key,cross,value),gap=Math.max(0,sign*(end-start));
              const best=!out[dir]||gap<out[dir].distance-1e-7,preferred=wallPriority&&(!preferredWalls[dir]||gap<preferredWalls[dir].distance-1e-7);
              if(!best&&!preferred)continue;
              const result={a:unrotate({[key]:start,[cross]:value}),b:unrotate({[key]:start+sign*gap,[cross]:value}),distance:gap,entity:{kind:target.kind,id:target.id,name:target.name,...(wall?{wallDatum:wall[4]==='finish'?'finished':'survey'}:{}),...(target.actualBoard?{boardKey:target.boardKey,boardName:target.boardName}:{}),...(surfaceBoundary&&region.moduleKey?{moduleKey:region.moduleKey,moduleIndex:region.moduleIndex}:{})},...(target.actualBoard?{cabinetInterior:true}:{}),...(surfaceBoundary?{surfaceBoundary:true,...(region.moduleKey?{moduleBoundary:true}:{})}:{}),...(containedBoundary?{containedBoundary:true}:{}),...(wallPriority?{wallPriority:true}:{})};
              if(best)out[dir]=result;
              if(preferred)preferredWalls[dir]=result;
            }
          }
        }
      }
    }
    }
    for(const dir of Object.keys(out))if(preferredWalls[dir])out[dir]=preferredWalls[dir];return out;
  }
  // Opening measurements use the production cutout, rather than the product's
  // outer rim. Use the local supporting module and its adjoining solid walls;
  // neighboring appliances are not references for countertop opening margins.
  function surfaceOpening(f,{furniture=[],rects=[],solidWallCount=rects.length}={}){
    const P=root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null);
    if(f.obj||!P.definition(f)?.measureSurfaceBoundary)return null;
    const K=root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null),host=K.support(f,furniture);
    if(!host)return null;
    const size=K.cutout(f);if(!(size.w>0&&size.d>0))return null;
    const proxy={...f,w:size.w,d:size.d},gaps=directional(proxy,{rotation:-(f.rot||0),furniture:[host],rects,solidWallCount});
    if(f.flip)[gaps.l,gaps.r]=[gaps.r,gaps.l];
    return {hostId:host.id,size,ring:K.openingRing(f).map(p=>K.world(f,...p)),gaps};
  }
  function cabinetInterior(f,{furniture=[],plan}={}){
    if(!f||Array.isArray(f)||f.obj)return null;
    const M=root.FurnishCabinetMotion||require('./cabinet-motion.js'),D=root.FurnishDesign||require('./design-core.js'),products=root.FurnishProducts||require('./product-rules.js'),source=entities({furniture:[f]})[0],vertical=D.furnitureVerticalBounds(f,plan,furniture);
    if(!source)return null;
    const candidates=furniture.filter(v=>v.id!==f.id&&M.supportsSolids(v)&&!products.modelError(v)&&geometry.verticalOverlap(f,v,[vertical,D.furnitureVerticalBounds(v,plan,furniture)])&&encloses({rings:geometry.footprints(v)},[source]));
    if(!candidates.length)return null;
    const parts=candidates.flatMap(host=>geometry.bodyParts(host,plan,furniture).map(part=>({...part,host}))),out={bottom:null,top:null,pending:!vertical,collisions:[]};
    if(!vertical)return out;
    for(const part of parts){
      if(!geometry.footprints(f).some(p=>geometry.polygonOverlap(p,part.p,1e-7)))continue;
      const reference={hostId:part.host.id,hostName:part.host.name,boardKey:part.boardKey,boardName:part.boardName};
      if(!part.vertical){out.pending=true;continue;}
      if(geometry.verticalOverlap(f,part.host,[vertical,part.vertical])&&geometry.footprints(f).some(p=>geometry.polygonOverlap(p,M.section(part,vertical),1e-7)))out.collisions.push(reference);
      const ranges=geometry.footprints(f).map(p=>M.verticalSection(part,p)).filter(Boolean);if(!ranges.length)continue;
      const lower=vertical.bottom-Math.max(...ranges.map(r=>r.top)),upper=Math.min(...ranges.map(r=>r.bottom))-vertical.top;
      const box=geometry.bbox(part.p),horizontal=part.vertical.top-part.vertical.bottom<Math.min(box[2]-box[0],box[3]-box[1])/2,center=(vertical.bottom+vertical.top)/2;
      for(const [dir,gap,penetrates]of [['bottom',lower,horizontal&&part.vertical.top<=center],['top',upper,horizontal&&part.vertical.bottom>=center]])if((gap>=-1e-7||penetrates)&&(!out[dir]||gap<out[dir].distance))out[dir]={distance:Math.abs(gap)<1e-7?0:gap,...reference};
    }
    return out;
  }
  const api={cabinetInterior,surfaceOpening,hobOpening:surfaceOpening,kitchenGaps,setKitchenGap,resizeKitchenDivider,resizeKitchenExtension,resizeKitchenOuter,resizeKitchenRun,move,resize,point,measurePoint,nearest,directional};
  if(typeof module === 'object' && module.exports)module.exports=api;
  else root.FurnishSnapping=api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
