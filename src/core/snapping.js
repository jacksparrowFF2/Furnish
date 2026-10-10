/* Snapping calculations use explicit inputs and return guides without UI writes. */
(function(root){
  'use strict';
  const geometry = typeof module === 'object' && module.exports ? require('./layout-geometry.js') : root.FurnishGeometry;
  const tolerance=(f,scale)=>['curtain','slidingdoor','tripleslidingdoor'].includes(f.type)?Math.min(250,32/scale):10/scale;
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
  function resize(f,p,{scale,wallSnap,rects}){
    const a=f.rot*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
    const anchor={x:f.cx-f.w/2*c+f.d/2*s,y:f.cy-f.w/2*s-f.d/2*c};
    const dimensions=q=>({w:Math.max(100,Math.round(((q.x-anchor.x)*c+(q.y-anchor.y)*s)/10)*10),d:Math.max(100,Math.round((-(q.x-anchor.x)*s+(q.y-anchor.y)*c)/10)*10)});
    const build=({w,d})=>({...f,w,d,cx:anchor.x+w/2*c-d/2*s,cy:anchor.y+w/2*s+d/2*c});
    let next=build(dimensions(p));const guides=[];
    if(wallSnap&&Math.abs(Math.sin(2*a))<1e-6){
      const tol=tolerance(f,scale),B=geometry.aabb(next),corner={x:next.cx+next.w/2*c-next.d/2*s,y:next.cy+next.w/2*s+next.d/2*c};
      let bx=tol,by=tol,gx=null,gy=null;
      for(const r of rects){
        if(r[3]>=next.cy-B.hh-tol&&r[1]<=next.cy+B.hh+tol)for(const x of [r[0],r[2]])if(Math.abs(x-p.x)<bx){bx=Math.abs(x-p.x);gx=x;}
        if(r[2]>=next.cx-B.hw-tol&&r[0]<=next.cx+B.hw+tol)for(const y of [r[1],r[3]])if(Math.abs(y-p.y)<by){by=Math.abs(y-p.y);gy=y;}
      }
      // Keep exact wall coordinates rather than rounding a snapped dimension to grid.
      if(gx!==null)corner.x=gx;if(gy!==null)corner.y=gy;
      const w=(corner.x-anchor.x)*c+(corner.y-anchor.y)*s,d=-(corner.x-anchor.x)*s+(corner.y-anchor.y)*c;
      next=build({w:Math.max(100,w),d:Math.max(100,d)});
      const N=geometry.aabb(next),end={x:next.cx+next.w/2*c-next.d/2*s,y:next.cy+next.w/2*s+next.d/2*c};
      if(gx!==null&&Math.abs(end.x-gx)<.01)guides.push({v:true,x:gx,a:next.cy-N.hh-150,b:next.cy+N.hh+150});
      if(gy!==null&&Math.abs(end.y-gy)<.01)guides.push({v:false,y:gy,a:next.cx-N.hw-150,b:next.cx+N.hw+150});
    }
    return {furniture:next,guides};
  }
  function point(p,{scale,rects,anchor}){
    let x=Math.round(p.x/10)*10,y=Math.round(p.y/10)*10;
    const tol=8/scale;let bx=tol,by=tol;
    for(const r of rects){
      for(const ex of [r[0],r[2]])if(Math.abs(ex-p.x)<bx){bx=Math.abs(ex-p.x);x=ex;}
      for(const ey of [r[1],r[3]])if(Math.abs(ey-p.y)<by){by=Math.abs(ey-p.y);y=ey;}
    }
    if(anchor){if(Math.abs(x-anchor.x)>Math.abs(y-anchor.y))y=anchor.y;else x=anchor.x;}
    return {x,y};
  }
  const api={move,resize,point};
  if(typeof module === 'object' && module.exports)module.exports=api;
  else root.FurnishSnapping=api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
