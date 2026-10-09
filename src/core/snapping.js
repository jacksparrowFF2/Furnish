/* Snapping calculations use explicit inputs and return guides without UI writes. */
(function(root){
  'use strict';
  const geometry = typeof module === 'object' && module.exports ? require('./layout-geometry.js') : root.FurnishGeometry;
  function move(f,cx,cy,{grid,scale,wallSnap,guides,rects,furniture,skip}){
    let nx=Math.round(cx/grid)*grid,ny=Math.round(cy/grid)*grid;
    const {hw,hh}=geometry.aabb(f),tol=10/scale;
    let bx=tol,by=tol,gx=null,gy=null;
    if(wallSnap)for(const r of rects){
      if(!(r[3]<cy-hh-tol||r[1]>cy+hh+tol))for(const ex of [r[0],r[2]])for(const c of [ex+hw,ex-hw])if(Math.abs(c-cx)<bx){bx=Math.abs(c-cx);nx=c;}
      if(!(r[2]<cx-hw-tol||r[0]>cx+hw+tol))for(const ey of [r[1],r[3]])for(const c of [ey+hh,ey-hh])if(Math.abs(c-cy)<by){by=Math.abs(c-cy);ny=c;}
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
  const api={move,point};
  if(typeof module === 'object' && module.exports)module.exports=api;
  else root.FurnishSnapping=api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
