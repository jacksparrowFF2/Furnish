/* Blender-authored boards fitted to existing cabinet construction, never a filled outer box. */
(function(root){
'use strict';
const asset=()=>root.FurnishY52Y09BlenderAsset||(typeof require==='function'?require('../data/y52y09-blender-asset.js'):null);
function role(data){
 if(data.cabinetSection==='bottom')return 'bottom';if(data.cabinetTop)return 'top';
 if(data.cabinetSide)return 'side-'+data.cabinetSide;
 if(data.cabinetDivider)return 'divider-'+data.cabinetDivider.divider;
 if(data.cabinetShelf)return 'shelf-'+data.cabinetShelf.column;
 if(data.cabinetBay&&!data.cabinetPart&&!data.cabinetPegboard)return 'back-'+data.cabinetBay.column;
 return null;
}
function apply(T,group){
 const source=asset();if(!source)return group;let count=0;
 group.traverse(mesh=>{
  const name=role(mesh.userData),target=mesh.userData.furnishBoardSize;
  if(!name||!target||!mesh.isMesh)return;
  const part=source.parts.find(p=>p.name===name)||source.parts.find(p=>p.name===name.replace(/-\d+$/,'-0'));
  if(!part)return;
  // Numeric cabinet recorder keeps the same conservative board envelope as before.
  // It reads these construction dimensions through CabinetMotion.solidParts().
  if(T.BufferGeometry){
   const geometry=new T.BufferGeometry(),positions=[],normals=[],radius=Math.min(source.edgeRadiusMm/1000,...target.map(v=>v/4));
   for(let i=0;i<part.positions.length;i+=3){const derivatives=[];
    for(let k=0;k<3;k++){
     const v=part.positions[i+k]-part.center[k],half=part.size[k]/2,inner=half-part.radius,sign=v<0?-1:1;
     const edge=Math.abs(v)>inner,rate=edge?radius/part.radius:(target[k]/2-radius)/inner;
     positions.push(sign*(edge?target[k]/2-radius+(Math.abs(v)-inner)*rate:Math.abs(v)*rate));derivatives.push(rate);
    }
    const normal=part.normals.slice(i,i+3).map((v,k)=>v/derivatives[k]),length=Math.hypot(...normal);normals.push(...normal.map(v=>v/length));
   }
   geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geometry.setIndex(Array.from({length:positions.length/3},(_,i)=>i));
   mesh.geometry.dispose();mesh.geometry=geometry;
   mesh.material=mesh.material.clone();mesh.material.roughness=part.material.roughness;mesh.material.metalness=part.material.metalness;
  }
  mesh.name=name;mesh.userData.furnishBlenderSource=part.identity;count++;
 });
 if(count){group.userData.furnishAsset=source.id+'@'+source.version;group.userData.furnishAssetBoards=count;}
 return group;
}
const api={apply};if(typeof module==='object'&&module.exports)module.exports=api;else root.FurnishBookcaseAssetModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
