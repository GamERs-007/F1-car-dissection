import * as T from 'three';
export {createBrakes,poseBrakeAssembly} from './brake-assembly.js';

// Re-parent the original geometry without baking or rewriting its UVs/normals.
export function wheelAxle(group){
 group.updateWorldMatrix(true,true);
 const box=new T.Box3();
 group.traverse(m=>{if(m.isMesh&&/tread_/.test(m.material.name))box.union(new T.Box3().setFromObject(m,true));});
 if(box.isEmpty())box.setFromObject(group,true);
 const center=group.worldToLocal(box.getCenter(new T.Vector3()));
 // The authored front wheels have camber baked into their vertices. Recover
 // the axle from the original disc plane instead of assuming horizontal X.
 const inverse=group.matrixWorld.clone().invert(),axis=new T.Vector3(1,0,0),discCenter=new T.Vector3();
 const a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3(),normal=new T.Vector3();
 let largestArea=0,totalArea=0;
 group.traverse(m=>{if(!m.isMesh||!/^discs\./.test(m.material.name))return;
  const transform=inverse.clone().multiply(m.matrixWorld),pos=m.geometry.attributes.position,idx=m.geometry.index;
  for(let i=0;i<(idx?.count??pos.count);i+=3){
   a.fromBufferAttribute(pos,idx?idx.getX(i):i).applyMatrix4(transform);
   b.fromBufferAttribute(pos,idx?idx.getX(i+1):i+1).applyMatrix4(transform);
   c.fromBufferAttribute(pos,idx?idx.getX(i+2):i+2).applyMatrix4(transform);
   normal.crossVectors(b.clone().sub(a),c.clone().sub(a));const area=normal.length();
   if(area>largestArea){largestArea=area;axis.copy(normal).normalize();}
   discCenter.addScaledVector(a.clone().add(b).add(c),area/3);totalArea+=area;
  }
 });
 if(axis.x<0)axis.negate();
 if(totalArea>0){discCenter.divideScalar(totalArea);center.copy(discCenter.clone().addScaledVector(axis,center.clone().sub(discCenter).dot(axis)));}
 let radius=0;
 group.traverse(m=>{if(!m.isMesh||!/tread_/.test(m.material.name))return;
  const transform=inverse.clone().multiply(m.matrixWorld),pos=m.geometry.attributes.position;
  for(let i=0;i<pos.count;i++){a.fromBufferAttribute(pos,i).applyMatrix4(transform).sub(center);radius=Math.max(radius,a.addScaledVector(axis,-a.dot(axis)).length());}
 });
 if(!radius)radius=(box.max.y-box.min.y+box.max.z-box.min.z)/4;
 const mount=new T.Group();mount.name=group.name+'_AxleMount';mount.position.copy(center);mount.quaternion.setFromUnitVectors(new T.Vector3(1,0,0),axis);
 const pivot=new T.Group();pivot.name=group.name+'_Axle';mount.add(pivot);
 const children=[...group.children];group.add(mount);group.updateMatrixWorld(true);
 for(const child of children)pivot.attach(child);
 // The source contains only two textured triangles per disc face, no brake assembly.
 pivot.traverse(m=>{if(m.isMesh&&/^discs\./.test(m.material.name))m.visible=false;});
 return {pivot,mount,radius,axis:axis.clone().transformDirection(group.matrix),orientation:group.quaternion.clone().multiply(mount.quaternion),center:center.clone().applyMatrix4(group.matrix)};
}

// Keep connected islands intact, including welded vertices across UV seams.
// Central cross-members stay on the chassis; the left/right arms translate laterally.
export function splitSuspension(group){
 const sides=[-1,0,1].map(side=>{const g=new T.Group();g.name=group.name+(side<0?'_Right':side>0?'_Left':'_Center');group.add(g);return {g,side};});
 const meshes=[];group.traverse(m=>{if(m.isMesh)meshes.push(m);});
 group.updateWorldMatrix(true,true);
 for(const mesh of meshes){
  const geo=mesh.geometry,pos=geo.attributes.position,idx=geo.index;
  const roots=Array.from({length:pos.count},(_,i)=>i),weld=new Map();
  const find=i=>{while(roots[i]!==i){roots[i]=roots[roots[i]];i=roots[i];}return i;};
  const join=(a,b)=>{roots[find(a)]=find(b);};
  for(let i=0;i<pos.count;i++){const k=[pos.getX(i),pos.getY(i),pos.getZ(i)].map(v=>Math.round(v*1e6)).join(',');if(weld.has(k))join(i,weld.get(k));else weld.set(k,i);}
  for(let i=0;i<idx.count;i+=3){join(idx.getX(i),idx.getX(i+1));join(idx.getX(i),idx.getX(i+2));}
  const extents=new Map(),v=new T.Vector3();
  for(let i=0;i<pos.count;i++){v.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld);const r=find(i),b=extents.get(r)||[Infinity,-Infinity];b[0]=Math.min(b[0],v.x);b[1]=Math.max(b[1],v.x);extents.set(r,b);}
  const indices=[[],[],[]];
  for(let i=0;i<idx.count;i+=3){const [lo,hi]=extents.get(find(idx.getX(i))),side=lo<-.015&&hi>.015?0:lo+hi<0?-1:1;indices[side+1].push(idx.getX(i),idx.getX(i+1),idx.getX(i+2));}
  for(let i=0;i<3;i++)if(indices[i].length){const part=mesh.clone();part.geometry=geo.clone();part.geometry.setIndex(indices[i]);part.geometry.computeBoundingBox();part.geometry.computeBoundingSphere();mesh.parent.add(part);sides[i].g.attach(part);}
  mesh.removeFromParent();
 }
 return sides;
}

