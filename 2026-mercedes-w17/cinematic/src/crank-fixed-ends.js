import * as T from 'three';
import audit from './crank-fixed-ends.json' with {type:'json'};

export function createFixedCrankEnds(crank){
 const fixed=new T.Group(),geometries=[];fixed.name='Crankshaft_Fixed_Ends';
 for(const patch of audit.patches){
  const mesh=crank.getObjectByName(patch.mesh);
  if(!mesh||mesh.parent!==crank||mesh.geometry.index.count!==patch.originalTriangles*3)throw Error('Crankshaft end geometry changed; re-audit '+patch.mesh);
  const original=mesh.geometry,index=original.index,faces=new Set(),moving=[],stationary=[];
  for(const [a,b] of patch.faceRanges)for(let f=a;f<=b;f++)faces.add(f);
  for(let f=0;f<index.count/3;f++){
   const output=faces.has(f)?stationary:moving;
   output.push(index.getX(f*3),index.getX(f*3+1),index.getX(f*3+2));
  }
  const end=mesh.clone();end.name=mesh.name+'_Fixed_End';end.geometry=original.clone();end.geometry.setIndex(stationary);
  const box=new T.Box3(),v=new T.Vector3(),pos=original.attributes.position;
  for(const i of stationary)box.expandByPoint(v.fromBufferAttribute(pos,i));
  end.geometry.boundingBox=box;const sphere=new T.Sphere(box.getCenter(new T.Vector3()),0);
  for(const i of stationary)sphere.radius=Math.max(sphere.radius,v.fromBufferAttribute(pos,i).distanceTo(sphere.center));
  end.geometry.boundingSphere=sphere;fixed.add(end);
  mesh.geometry=original.clone();mesh.geometry.setIndex(moving);
  geometries.push(end.geometry,mesh.geometry);
 }
 crank.add(fixed);return {group:fixed,dispose(){for(const g of geometries)g.dispose();}};
}
