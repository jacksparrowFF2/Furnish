/* Made-to-measure open rack and generic botanical layout models, mm inputs.
 * Plant shapes and rack construction are design assumptions, not product specs. */
(function(root){'use strict';
const P=()=>root.FurnishProducts||require('../core/product-rules.js');
const supported=f=>!!P().definition(f)?.garden&&!f.obj;
function rackParts(f){
 const {post:t,board:b}=P().definition(f).garden,w=f.w,d=f.d,h=P().height(f),parts=[];
 const add=(name,size,center,material)=>parts.push({name,size,center,material});
 for(const [side,x]of [['left',-w/2+t/2],['middle',0],['right',w/2-t/2]])for(const [face,z]of [['back',-d/2+t/2],['front',d/2-t/2]])add('post-'+side+'-'+face,[t,h,t],[x,h/2,z],'frame');
 for(const [level,y]of [['lower',h/2],['upper',h-100]]){
  add('shelf-'+level,[w-t*2,b,d-t*2],[0,y-b/2,0],'shelf');
  for(const [face,z]of [['back',-d/2+t/2],['front',d/2-t/2]])add('rail-'+level+'-'+face,[w-t*2,t,t],[0,y-b-t/2,z],'frame');
 }
 return parts;
}
function build(T,f){
 const rule=P().definition(f).garden,g=new T.Group(),I=root.FurnishPartIdentity||require('../core/part-identity.js');
 const materials={frame:new T.MeshStandardMaterial({color:f.color||'#5b615a',roughness:.65,metalness:.4}),shelf:new T.MeshStandardMaterial({color:'#b89b74',roughness:.65}),pot:new T.MeshStandardMaterial({color:'#e6ddcd',roughness:.5}),soil:new T.MeshStandardMaterial({color:'#49382b',roughness:1}),leaf:new T.MeshStandardMaterial({color:'#264d25',roughness:.38}),lightLeaf:new T.MeshStandardMaterial({color:'#477643',roughness:.45}),stripe:new T.MeshStandardMaterial({color:'#d2ddb0',roughness:.6}),stem:new T.MeshStandardMaterial({color:'#53702f',roughness:.6}),petal:new T.MeshStandardMaterial({color:'#ef6516',roughness:.42}),throat:new T.MeshStandardMaterial({color:'#ffc02f',roughness:.5})};
 function add(name,geometry,material){const m=I.produce('balcony-garden:'+f.type+':'+name,()=>new T.Mesh(geometry,materials[material]));m.name=name;m.userData.gardenPart=name;m.userData.furnishStablePart='garden-v1:'+f.type+':'+name;m.castShadow=m.receiveShadow=true;g.add(m);return m;}
 if(rule.kind==='rack'){
  for(const p of rackParts(f)){const m=add(p.name,new T.BoxGeometry(...p.size.map(v=>v/1000)),p.material);m.position.set(...p.center.map(v=>v/1000));}
  g.userData.furnishAsset='balcony-open-rack-parametric@1';return g;
 }
 // Every leaf is a closed thin ribbon, including a curved midrib and a real edge.
 function ribbon(name,center,width,material,sideAt){const N=20,vertices=[],faces=[];
  for(let skin=0;skin<2;skin++)for(let i=0;i<=N;i++){const t=i/N,pt=center(t),a=center(Math.max(0,t-.005)),b=center(Math.min(1,t+.005)),dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],l=Math.hypot(dx,dz)||1,wd=width(t),side=sideAt?sideAt(t,[dx,dy,dz]):[dz/l,0,-dx/l],n=[dy*side[2]-dz*side[1],dz*side[0]-dx*side[2],dx*side[1]-dy*side[0]],nl=Math.hypot(...n)||1;for(const q of [-1,0,1])vertices.push(pt.map((v,k)=>v+side[k]*wd*q+n[k]/nl*((q===0?.002:0)+(skin===0?.001:-.001))));}
  const stride=(N+1)*3;
  const edges=new Map();
  for(let i=0;i<N;i++)for(let j=0;j<2;j++){const a=i*3+j,b=a+1,c=a+4,d=a+3;for(const face of [[a,c,b],[a,d,c]]){faces.push(face,face.slice().reverse().map(v=>v+stride));for(let k=0;k<3;k++){const a=face[k],b=face[(k+1)%3],key=[a,b].sort((a,b)=>a-b).join(':');if(edges.has(key))edges.delete(key);else edges.set(key,[a,b]);}}}
  for(const [a,b]of edges.values())faces.push([b,a,a+stride],[b,a+stride,b+stride]);
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices.flat(),3));geo.setIndex(faces.flat());geo.computeVertexNormals();return add(name,geo,material);
 }
 function cylinder(name,a,b,r,material){const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],len=Math.hypot(dx,dy,dz),m=add(name,new T.CylinderGeometry(r*.85,r,len,10),material);m.position.set((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2);m.rotation.set(Math.atan2(dz,dy),0,-Math.atan2(dx,Math.hypot(dy,dz)));return m;}
 const profile=[[0,0],[.128,0],[.145,.018],[.172,.245],[.176,.267],[.166,.278],[.154,.268],[.151,.246],[.132,.035],[0,.035]].map(([x,y])=>new T.Vector2(x,y));
 add('pot',new T.LatheGeometry(profile,40),'pot');const soil=add('soil',new T.CylinderGeometry(.15,.15,.012,32),'soil');soil.position.y=.25;
 const saucer=add('saucer',new T.CylinderGeometry(.18,.176,.018,40),'pot');saucer.position.y=.009;
 if(rule.kind==='clivia'){
  for(let i=0;i<12;i++){const side=i%2?-1:1,k=Math.floor(i/2),angle=side<0?Math.PI:0,reach=.16+k*.065,lift=.62-k*.028,az=angle+(k%3-1)*.18;
   ribbon('leaf-'+i,t=>[Math.cos(az)*reach*Math.pow(t,.8),.25+lift*Math.sin(t*1.55)-(.06+k*.025)*Math.pow(t,4),Math.sin(az)*reach*t+(i%2?.025:-.025)],t=>.001+(.035+k*.004)*Math.pow(Math.sin(Math.PI*t),.5),'leaf',(_t,[dx,dy])=>{const l=Math.hypot(dx,dy)||1;return [-dy/l,dx/l,0];});
  }
  cylinder('flower-stem',[0,.26,0],[.015,.87,0],.011,'stem');
  for(let i=0;i<9;i++){const az=i*2.399,r=.035+(i%3)*.04,base=[Math.cos(az)*r,.83+(i%3)*.032,Math.sin(az)*r];cylinder('pedicel-'+i,[.015,.82,0],base,.003,'stem');
   const axis=[Math.cos(az)*.72,.69,Math.sin(az)*.72],u=[-Math.sin(az),0,Math.cos(az)],v=[-Math.cos(az)*.69,.72,-Math.sin(az)*.69];
   for(let j=0;j<6;j++){const a=j*Math.PI/3,rad=u.map((n,k)=>n*Math.cos(a)+v[k]*Math.sin(a)),tangent=u.map((n,k)=>-n*Math.sin(a)+v[k]*Math.cos(a));ribbon('flower-'+i+'-petal-'+j,t=>base.map((n,k)=>n+axis[k]*.12*t+rad[k]*(.007+.055*t*t)),t=>.0004+.025*Math.sin(Math.PI*t*.9),'petal',()=>tangent);}
   cylinder('flower-throat-'+i,base,[base[0],base[1]+.055,base[2]],.009,'throat');
  }
 }else if(rule.kind==='spider'){
  for(let i=0;i<30;i++){const az=i*2.399,reach=.28+(i%5)*.035,up=.24+(i%4)*.035;
   const center=t=>[Math.cos(az)*reach*t,.25+up*Math.sin(t*2.1)-.10*t*t,Math.sin(az)*reach*t];
   ribbon('leaf-'+i,center,t=>.0007+.012*Math.sin(Math.PI*t),'leaf');
   ribbon('leaf-stripe-'+i,t=>{const p=center(t);return [p[0],p[1]+.003,p[2]];},t=>.0002+.003*Math.sin(Math.PI*t),'stripe');
  }
 }else{
  for(let i=0;i<5;i++){const az=i*2.399,top=.53+(i%3)*.12,tip=[Math.cos(az)*.10,top,Math.sin(az)*.10];cylinder('stem-'+i,[0,.25,0],tip,.004,'stem');
   for(let j=1;j<=5;j++){const a=az+j*2.5,start=[tip[0]*j/5,.29+(top-.29)*j/5,tip[2]*j/5],len=.14+(j%2)*.035;
    ribbon('leaf-'+i+'-'+j,t=>[start[0]+Math.cos(a)*len*t,start[1]+.07*Math.sin(t*2),start[2]+Math.sin(a)*len*t],t=>.001+.055*Math.pow(Math.sin(Math.PI*t),.6),i%2?'leaf':'lightLeaf');
   }
  }
 }
 // Fit foliage separately: crown edits must not turn round pots into ellipses.
 const records=[],crown=[];if(g.updateMatrixWorld)g.updateMatrixWorld(true);g.traverse(m=>{if(m.geometry){const a=m.geometry.attributes.position.array,vertices=[];for(let i=0;i<a.length;i+=3){const v=new T.Vector3(a[i],a[i+1],a[i+2]);if(m.localToWorld)m.localToWorld(v);else v.set(...(root.FurnishModelSolidRecorder||require('../core/model-solid-recorder.js')).transform(m)([v.x,v.y,v.z]));vertices.push([v.x,v.y,v.z]);}const pot=['pot','soil','saucer'].includes(m.name);records.push({m,vertices,pot});if(!pot)crown.push(...vertices);}});
 const lo=[0,1,2].map(k=>Math.min(...crown.map(v=>v[k]))),hi=[0,1,2].map(k=>Math.max(...crown.map(v=>v[k]))),diameter=Math.min(rule.potDiameter,Math.min(f.w,f.d)*.8)/1000,potHeight=Math.min(rule.potHeight,P().height(f)*.4)/1000,soilY=potHeight*.25/.278,H=P().height(f)/1000;
 for(const {m,vertices,pot}of records){const geometry=new T.BufferGeometry(),positions=vertices.map(v=>pot?[v[0]/.176*diameter/2,v[1]/.278*potHeight,v[2]/.176*diameter/2]:[(v[0]-(lo[0]+hi[0])/2)*f.w/1000/(hi[0]-lo[0]),soilY+(v[1]-.25)*(H-soilY)/(hi[1]-.25),(v[2]-(lo[2]+hi[2])/2)*f.d/1000/(hi[2]-lo[2])]);geometry.setAttribute('position',new T.Float32BufferAttribute(positions.flat(),3));const old=m.geometry;if(old.faces)geometry.faces=old.faces;geometry.setIndex(Array.from(old.index?.array||old.index||[]));geometry.computeVertexNormals();m.geometry=geometry;m.position.set(0,0,0);m.rotation.set(0,0,0);m.scale.set(1,1,1);old.dispose?.();}
 g.position.y=(P().value(f,'mountHeight')||0)/1000;g.userData.furnishAsset='botanical-layout-'+rule.kind+'@2';return g;
}
const api={supported,rackParts,build};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishBalconyGardenModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
