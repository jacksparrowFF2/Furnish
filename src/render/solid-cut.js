/* Triangle BSP subtraction, used only for boards intersecting a service riser.
 * Geometry inputs/output retain their own local coordinates and texture UVs. */
(function(root){
 function subtract(THREE,geometry,matrix,cutter){
  const EPS=1e-7;
  class Vertex{
   constructor(pos,normal,uv){this.pos=pos;this.normal=normal;this.uv=uv;}
   clone(){return new Vertex(this.pos.clone(),this.normal.clone(),this.uv.clone());}
   flip(){this.normal.negate();}
   mix(b,t){return new Vertex(this.pos.clone().lerp(b.pos,t),this.normal.clone().lerp(b.normal,t),this.uv.clone().lerp(b.uv,t));}
  }
  class Plane{
   constructor(normal,w){this.normal=normal;this.w=w;}
   clone(){return new Plane(this.normal.clone(),this.w);}
   flip(){this.normal.negate();this.w=-this.w;}
   split(p,cf,cb,front,back){
    const types=p.v.map(v=>{const t=this.normal.dot(v.pos)-this.w;return t<-EPS?2:t>EPS?1:0;}),type=types.reduce((a,b)=>a|b,0);
    if(!type){(this.normal.dot(p.plane.normal)>0?cf:cb).push(p);return;}
    if(type===1){front.push(p);return;}if(type===2){back.push(p);return;}
    const f=[],b=[];
    for(let i=0;i<p.v.length;i++){const j=(i+1)%p.v.length,vi=p.v[i],vj=p.v[j],ti=types[i],tj=types[j];if(ti!==2)f.push(vi);if(ti!==1)b.push(ti!==2?vi.clone():vi);if((ti|tj)===3){const v=vi.mix(vj,(this.w-this.normal.dot(vi.pos))/this.normal.dot(vj.pos.clone().sub(vi.pos)));f.push(v);b.push(v.clone());}}
    if(f.length>=3)front.push(new Polygon(f));if(b.length>=3)back.push(new Polygon(b));
   }
  }
  class Polygon{
   constructor(v){this.v=v;const n=v[1].pos.clone().sub(v[0].pos).cross(v[2].pos.clone().sub(v[0].pos)).normalize();this.plane=new Plane(n,n.dot(v[0].pos));}
   clone(){return new Polygon(this.v.map(v=>v.clone()));}
   flip(){this.v.reverse().forEach(v=>v.flip());this.plane.flip();}
  }
  class Node{
   constructor(polys=[]){this.polys=[];this.plane=null;this.front=null;this.back=null;this.build(polys);}
   invert(){this.polys.forEach(p=>p.flip());this.plane?.flip();this.front?.invert();this.back?.invert();[this.front,this.back]=[this.back,this.front];}
   clip(polys){if(!this.plane)return polys.slice();let f=[],b=[];for(const p of polys)this.plane.split(p,f,b,f,b);if(this.front)f=this.front.clip(f);b=this.back?this.back.clip(b):[];return f.concat(b);}
   clipTo(other){this.polys=other.clip(this.polys);this.front?.clipTo(other);this.back?.clipTo(other);}
   all(){return this.polys.concat(this.front?this.front.all():[],this.back?this.back.all():[]);}
   build(polys){if(!polys.length)return;if(!this.plane)this.plane=polys[0].plane.clone();const f=[],b=[];for(const p of polys)this.plane.split(p,this.polys,this.polys,f,b);if(f.length){this.front=this.front||new Node();this.front.build(f);}if(b.length){this.back=this.back||new Node();this.back.build(b);}}
  }
  function polygons(g,m){
   const pos=g.attributes.position,norm=g.attributes.normal,uv=g.attributes.uv,index=g.index,normalMatrix=new THREE.Matrix3().getNormalMatrix(m),result=[];
   for(let i=0;i<(index?index.count:pos.count);i+=3){const v=[];for(let j=0;j<3;j++){const k=index?index.getX(i+j):i+j;v.push(new Vertex(new THREE.Vector3().fromBufferAttribute(pos,k).applyMatrix4(m),new THREE.Vector3().fromBufferAttribute(norm,k).applyMatrix3(normalMatrix).normalize(),uv?new THREE.Vector2().fromBufferAttribute(uv,k):new THREE.Vector2()));}if(v[1].pos.clone().sub(v[0].pos).cross(v[2].pos.clone().sub(v[0].pos)).lengthSq()>1e-20)result.push(new Polygon(v));}
   return result;
  }
  const a=new Node(polygons(geometry,matrix)),b=new Node(polygons(cutter,new THREE.Matrix4()));
  a.invert();a.clipTo(b);b.clipTo(a);b.invert();b.clipTo(a);b.invert();a.build(b.all());a.invert();
  const inverse=matrix.clone().invert(),normalMatrix=new THREE.Matrix3().getNormalMatrix(inverse),positions=[],normals=[],uvs=[];
  for(const p of a.all())for(let j=2;j<p.v.length;j++)for(const v of [p.v[0],p.v[j-1],p.v[j]]){positions.push(...v.pos.clone().applyMatrix4(inverse).toArray());normals.push(...v.normal.clone().applyMatrix3(normalMatrix).normalize().toArray());uvs.push(v.uv.x,v.uv.y);}
  const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));result.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));result.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));return result;
 }
 root.FurnishSolidCut={subtract};if(typeof module!=='undefined')module.exports=root.FurnishSolidCut;
})(typeof globalThis!=='undefined'?globalThis:this);
