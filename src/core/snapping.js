/* Snapping calculations use explicit inputs and return guides without UI writes. */
(function(root){
  'use strict';
  const geometry = typeof module === 'object' && module.exports ? require('./layout-geometry.js') : root.FurnishGeometry;
  const tolerance=(f,scale)=>['curtain','slidingdoor','tripleslidingdoor','tripleslidingwindow'].includes(f.type)?Math.min(250,32/scale):10/scale;
  function move(f,cx,cy,{grid,scale,wallSnap,guides,rects,furniture,skip}){
    let nx=Math.round(cx/grid)*grid,ny=Math.round(cy/grid)*grid;
    // Long, thin curtains need a wider visible capture area at overview zoom.
    const {hw,hh}=geometry.aabb(f),tol=tolerance(f,scale);
    let bx=tol,by=tol,gx=null,gy=null;
    if(wallSnap)for(const r of rects){
      if(!(r[3]<cy-hh-tol||r[1]>cy+hh+tol))for(const ex of [r[0],r[2]])for(const c of [ex+hw,ex-hw])if(Math.abs(c-cx)<bx){bx=Math.abs(c-cx);nx=c;}
      if(!(r[2]<nx-hw-tol||r[0]>nx+hw+tol))for(const ey of [r[1],r[3]])for(const c of [ey+hh,ey-hh])if(Math.abs(c-cy)<by){by=Math.abs(c-cy);ny=c;}
    }
    if(guides)for(const o of furniture){
      if(o.id===f.id||skip?.has(o.id)||Math.abs(o.cx-cx)>6000||Math.abs(o.cy-cy)>6000)continue;
      const B=geometry.aabb(o);
      for(const v of [o.cx-B.hw,o.cx,o.cx+B.hw])for(const m of [-hw,0,hw]){const c=v-m;if(Math.abs(c-cx)<bx){bx=Math.abs(c-cx);nx=c;gx={x:v,o,B};}}
      for(const v of [o.cy-B.hh,o.cy,o.cy+B.hh])for(const m of [-hh,0,hh]){const c=v-m;if(Math.abs(c-cy)<by){by=Math.abs(c-cy);ny=c;gy={y:v,o,B};}}
    }
    const lines=[];
    if(gx)lines.push({v:true,x:gx.x,a:Math.min(ny-hh,gx.o.cy-gx.B.hh)-150,b:Math.max(ny+hh,gx.o.cy+gx.B.hh)+150});
    if(gy)lines.push({v:false,y:gy.y,a:Math.min(nx-hw,gy.o.cx-gy.B.hw)-150,b:Math.max(nx+hw,gy.o.cx+gy.B.hw)+150});
    return {position:[Math.round(nx),Math.round(ny)],guides:lines};
  }
  // Resize from the original opposite corner, so snapping never moves that anchor.
  function resize(f,p,{scale,wallSnap,rects,axis='both'}){
    const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
    const anchor={x:f.cx-f.w/2*c+f.d/2*s,y:f.cy-f.w/2*s-f.d/2*c};
    const dimensions=q=>({w:axis==='d'?f.w:Math.max(100,Math.round(((q.x-anchor.x)*c+(q.y-anchor.y)*s)/10)*10),d:axis==='w'?f.d:Math.max(100,Math.round((-(q.x-anchor.x)*s+(q.y-anchor.y)*c)/10)*10)});
    const build=({w,d})=>({...f,w,d,cx:anchor.x+w/2*c-d/2*s,cy:anchor.y+w/2*s+d/2*c});
    let next=build(dimensions(p));const guides=[];
    if(wallSnap&&Math.abs(Math.sin(2*a))<1e-6){
      const tol=tolerance(f,scale),B=geometry.aabb(next),corner={x:next.cx+next.w/2*c-next.d/2*s,y:next.cy+next.w/2*s+next.d/2*c};
      let bx=tol,by=tol,gx=null,gy=null;
      for(const r of rects){
        if((axis==='both'||(axis==='w'?Math.abs(c):Math.abs(s))>.5)&&r[3]>=next.cy-B.hh-tol&&r[1]<=next.cy+B.hh+tol)for(const x of [r[0],r[2]])if(Math.abs(x-p.x)<bx){bx=Math.abs(x-p.x);gx=x;}
        if((axis==='both'||(axis==='w'?Math.abs(s):Math.abs(c))>.5)&&r[2]>=next.cx-B.hw-tol&&r[0]<=next.cx+B.hw+tol)for(const y of [r[1],r[3]])if(Math.abs(y-p.y)<by){by=Math.abs(y-p.y);gy=y;}
      }
      // Keep exact wall coordinates rather than rounding a snapped dimension to grid.
      if(gx!==null)corner.x=gx;if(gy!==null)corner.y=gy;
      const w=(corner.x-anchor.x)*c+(corner.y-anchor.y)*s,d=-(corner.x-anchor.x)*s+(corner.y-anchor.y)*c;
      next=build({w:axis==='d'?f.w:Math.max(100,Math.round(w*1e6)/1e6),d:axis==='w'?f.d:Math.max(100,Math.round(d*1e6)/1e6)});
      const N=geometry.aabb(next),end={x:next.cx+next.w/2*c-next.d/2*s,y:next.cy+next.w/2*s+next.d/2*c};
      if(gx!==null&&Math.abs(end.x-gx)<.01)guides.push({v:true,x:gx,a:next.cy-N.hh-150,b:next.cy+N.hh+150});
      if(gy!==null&&Math.abs(end.y-gy)<.01)guides.push({v:false,y:gy,a:next.cx-N.hw-150,b:next.cx+N.hw+150});
    }
    return {furniture:next,guides};
  }
  // Snap the entire moving edge to finite parallel boundaries. Keep the old
  // wall/normal intersection for angled walls; furniture uses actual edge alignment.
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
        for(const s of source)if(Math.max(lo-s.hi,s.lo-hi)<=tol+1e-7)add(t,Math.min(lo,s.lo),Math.max(hi,s.hi));
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
    const K=root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null);if(!f.kitchen||!K.shapeRules(f)?.outerResize)return [];
    const targets=entities({furniture:furniture.filter(o=>o.id!==f.id&&o.counterLink?.hostId!==f.id&&(referenceId===undefined||o.id===referenceId))});
    return [...['left','right','top','bottom'].map(e=>'outer:'+e),...K.runs(f).map(run=>'run:'+run)].map(key=>kitchenGapForEdge(f,key,targets,scale)).filter(Boolean);
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
    if(!f.kitchen)return [geometry.corners(f)];
    const K=root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null);
    if(K.isWall(f))return K.footprints(f);
    // Match the visible counter perimeter, including cutouts and narrowed ends.
    return K.topGeometry(f).rings.map(r=>r.map(p=>K.world(f,...p)));
  }
  function entities({rects=[],furniture=[]}){
    const out=rects.map((r,i)=>({kind:'wall',id:i,name:'',rings:[[[r[0],r[1]],[r[2],r[1]],[r[2],r[3]],[r[0],r[3]]]]}));
    for(const f of furniture){try{out.push({kind:'furniture',id:f.id,name:f.name,rings:furnitureRings(f)});}catch{/* Invalid saved models cannot supply a reliable boundary. */}}
    return out.map(e=>({...e,edges:edges(e.rings)}));
  }
  function project(p,e){
    const dx=e.b.x-e.a.x,dy=e.b.y-e.a.y,t=((p.x-e.a.x)*dx+(p.y-e.a.y)*dy)/(dx*dx+dy*dy),u=Math.max(0,Math.min(1,t));
    return {point:{x:e.a.x+u*dx,y:e.a.y+u*dy},interior:t>=-1e-8&&t<=1+1e-8};
  }
  function measurePoint(p,{scale,rects=[],furniture=[],anchor}){
    const tol=8/scale,horizontal=anchor&&Math.abs(p.x-anchor.x)>Math.abs(p.y-anchor.y);
    const at=anchor?{x:horizontal?p.x:anchor.x,y:horizontal?anchor.y:p.y}:p;
    let best=tol,edge=null,point={x:Math.round(at.x/10)*10,y:Math.round(at.y/10)*10};
    if(anchor)point[horizontal?'y':'x']=anchor[horizontal?'y':'x'];
    for(const entity of entities({rects,furniture}))for(const e of entity.edges){
      let q;
      if(anchor){
        const key=horizontal?'y':'x',other=horizontal?'x':'y',delta=e.b[key]-e.a[key];
        if(Math.abs(delta)<1e-8){if(Math.abs(at[key]-e.a[key])>1e-7)continue;q=project(at,e).point;}
        else {const t=(at[key]-e.a[key])/delta;if(t<0||t>1)continue;q={...at,[other]:e.a[other]+t*(e.b[other]-e.a[other])};}
      }else q=project(at,e).point;
      const d=distance(at,q);if(d<best){best=d;point=q;edge=e;}
    }
    return {point,edge};
  }
  function point(p,options){return measurePoint(p,options).point;}
  function intersection(e,f){
    const dx=e.b.x-e.a.x,dy=e.b.y-e.a.y,ex=f.b.x-f.a.x,ey=f.b.y-f.a.y,den=dx*ey-dy*ex;
    if(Math.abs(den)<1e-8)return null;
    const x=f.a.x-e.a.x,y=f.a.y-e.a.y,t=(x*ey-y*ex)/den,u=(x*dy-y*dx)/den;
    return t>=0&&t<=1&&u>=0&&u<=1?{x:e.a.x+t*dx,y:e.a.y+t*dy}:null;
  }
  function contains(entity,p){return entity.rings.reduce((inside,ring)=>inside!==geometry.inPoly(p.x,p.y,ring),false);}
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
  function directional(f,{rotation=0,...options}){
    const out={l:null,r:null,t:null,b:null},angle=rotation*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
    const rotate=p=>({x:p.x*c-p.y*s,y:p.x*s+p.y*c}),unrotate=p=>({x:p.x*c+p.y*s,y:-p.x*s+p.y*c});
    const transform=e=>({...e,edges:e.edges.map(g=>({a:rotate(g.a),b:rotate(g.b)}))});
    const members=Array.isArray(f)?f:[f],sources=entities({furniture:members});if(!sources.length||sources.length!==members.length)return out;
    const ids=new Set(members.map(v=>v.id)),transformedSources=sources.map(transform);
    const products=root.FurnishProducts||(typeof require==='function'?require('./product-rules.js'):null),surfaceSource=members.length===1&&products?.definition(members[0])?.measureSurfaceBoundary&&!members[0].obj?members[0]:null;
    const K=surfaceSource&&(root.FurnishKitchen||(typeof require==='function'?require('./kitchen-core.js'):null)),furnitureById=new Map((options.furniture||[]).map(v=>[v.id,v]));
    const at=(edge,key,cross,value)=>edge.a[key]+(value-edge.a[cross])*(edge.b[key]-edge.a[key])/(edge.b[cross]-edge.a[cross]);
    const section=(entity,key,cross,value)=>entity.edges.filter(e=>value>Math.min(e.a[cross],e.b[cross])&&value<Math.max(e.a[cross],e.b[cross])).sort((a,b)=>at(a,key,cross,value)-at(b,key,cross,value));
    for(const originalTarget of entities(options)){
      if(originalTarget.kind==='furniture'&&ids.has(originalTarget.id))continue;
      // Only members sharing the target's height can define its measuring edge.
      // Unknown heights stay conservative; walls still use every member.
      const targetFurniture=originalTarget.kind==='furniture'?furnitureById.get(originalTarget.id):null;
      const eligible=transformedSources.filter((_,i)=>!targetFurniture||geometry.verticalOverlap(members[i],targetFurniture));
      if(!eligible.length)continue;
      const source={edges:eligible.flatMap(e=>e.edges)},sourceHits=[];
      // Overlapping rotated members may exchange the outermost edge between vertices.
      if(eligible.length>1)for(let i=0;i<source.edges.length;i++)for(let j=i+1;j<source.edges.length;j++){const p=intersection(source.edges[i],source.edges[j]);if(p)sourceHits.push(p);}
      // A supported hob sits inside the worktop: measure to the exit edge of
      // that surface, rather than treating the worktop beneath it as a collision.
      // Reuse full production-surface containment (concavities/cuts included).
      const surfaceBoundary=!!(surfaceSource&&originalTarget.kind==='furniture'&&K.onSurface(surfaceSource,furnitureById.get(originalTarget.id)));
      const target=transform(originalTarget),hits=[...sourceHits];
      for(const a of source.edges)for(const b of target.edges){const p=intersection(a,b);if(p)hits.push(p);}
      for(const [key,cross,negative,positive] of [['x','y','l','r'],['y','x','t','b']]){
        const coords=e=>e.edges.flatMap(g=>[g.a[cross],g.b[cross]]),a=coords(source),b=coords(target),lo=Math.max(Math.min(...a),Math.min(...b)),hi=Math.min(Math.max(...a),Math.max(...b));
        if(hi-lo<1e-7)continue; // A diagonal corner alone is not a directional clearance.
        const cuts=[lo,...a,...b,...hits.map(p=>p[cross]),hi].filter(v=>v>=lo&&v<=hi).sort((a,b)=>a-b).filter((v,i,all)=>!i||v-all[i-1]>1e-7);
        for(let i=1;i<cuts.length;i++){
          const low=cuts[i-1],high=cuts[i],mid=(low+high)/2,A=section(source,key,cross,mid),B=section(target,key,cross,mid);if(!A.length||B.length%2)continue;
          for(const [dir,sign,edge] of [[negative,-1,A[0]],[positive,1,A.at(-1)]])for(let j=0;j<B.length;j+=2){
            const near=surfaceBoundary?(sign>0?B[j+1]:B[j]):(sign>0?B[j]:B[j+1]),far=sign>0?B[j+1]:B[j];
            if(surfaceBoundary&&(at(edge,key,cross,mid)<at(B[j],key,cross,mid)-1e-7||at(edge,key,cross,mid)>at(B[j+1],key,cross,mid)+1e-7))continue;
            if(sign*(at(far,key,cross,mid)-at(edge,key,cross,mid))<-1e-7)continue; // Entirely behind the outward silhouette.
            for(const value of [mid,low,high]){
              const start=at(edge,key,cross,value),end=at(near,key,cross,value),gap=Math.max(0,sign*(end-start));
              if(out[dir]&&gap>=out[dir].distance-1e-7)continue;
              out[dir]={a:unrotate({[key]:start,[cross]:value}),b:unrotate({[key]:start+sign*gap,[cross]:value}),distance:gap,entity:{kind:target.kind,id:target.id,name:target.name},...(surfaceBoundary?{surfaceBoundary:true}:{})};
            }
          }
        }
      }
    }
    return out;
  }
  const api={kitchenGaps,setKitchenGap,resizeKitchenDivider,resizeKitchenExtension,resizeKitchenOuter,resizeKitchenRun,move,resize,point,measurePoint,nearest,directional};
  if(typeof module === 'object' && module.exports)module.exports=api;
  else root.FurnishSnapping=api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
