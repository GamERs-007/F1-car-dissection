import * as T from 'three';
import {createFixedCrankEnds} from './crank-fixed-ends.js';

// Audited assembled source parents: piston, connecting rod. Material-split
// child meshes remain attached. The source bank angles and starting phases win.
export const pistonPairs=[[271,3],[274,7],[277,11],[283,15],[289,27],[292,31]];
export const movingEngineNodes=new Set([...pistonPairs.flat(),210,375]);
export function createPistonMotion(nodes){
 const get=id=>{const node=nodes.get(id);if(!node)throw Error('Missing piston-study node '+id);return node;};
 const snapshot=node=>({node,position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone()});
 const crank=snapshot(get(210)),pulley=snapshot(get(375));
 const endAssembly=createFixedCrankEnds(crank.node),fixedEnds=endAssembly.group;
 const pairs=pistonPairs.map(([pistonId,rodId])=>{
  const piston=snapshot(get(pistonId)),rod=snapshot(get(rodId));
  const axis=new T.Vector3(0,1,0).applyQuaternion(piston.quaternion).normalize();
  // The large bearing's measured local centre is y=-.14936049 metres.
  // RootNode is in FBX centimetres, with 100-scale geometry parents.
  const length=.14936049*rod.scale.y;
  const direction=new T.Vector3(0,-1,0).applyQuaternion(rod.quaternion).normalize();
  const pin=rod.position.clone().addScaledVector(direction,length),center=crank.position.clone();center.x=pin.x;
  const radius=Math.hypot(pin.y-center.y,pin.z-center.z),phase=Math.atan2(pin.z-center.z,pin.y-center.y);
  const w=rod.position.clone().sub(pin),along=w.dot(axis);
  const origin=-along+Math.sqrt(Math.max(0,length*length-(w.lengthSq()-along*along)));
  return {pistonId,rodId,piston,rod,axis,length,direction,center,radius,phase,origin,stroke:0};
 });
 const pin=new T.Vector3(),difference=new T.Vector3(),head=new T.Vector3(),direction=new T.Vector3();
 const swing=new T.Quaternion(),turn=new T.Quaternion(),rotationAxis=new T.Vector3(1,0,0);
 const resetFixedEnds=()=>fixedEnds.quaternion.copy(crank.node.quaternion).invert().multiply(crank.quaternion);
 const reset=()=>{for(const s of [crank,pulley,...pairs.flatMap(p=>[p.piston,p.rod])]){s.node.position.copy(s.position);s.node.quaternion.copy(s.quaternion);s.node.scale.copy(s.scale);}resetFixedEnds();};
 return {pairs,crank,pulley,fixedEnds,reset,dispose:endAssembly.dispose,
  apply(angle,weight=1){
   // Closed-form slider/crank constraint: piston remains on its bore axis and
   // each rigid rod keeps its measured bearing-centre distance. No integration.
   for(const p of pairs){
    pin.copy(p.center);pin.y+=p.radius*Math.cos(p.phase+angle);pin.z+=p.radius*Math.sin(p.phase+angle);
    difference.copy(p.rod.position).sub(pin);const along=difference.dot(p.axis);
    const displacement=-along+Math.sqrt(Math.max(0,p.length*p.length-(difference.lengthSq()-along*along)))-p.origin;
    p.stroke=displacement*weight;
    head.copy(p.rod.position).addScaledVector(p.axis,displacement);
    direction.copy(pin).sub(head).normalize();swing.setFromUnitVectors(p.direction,direction).multiply(p.rod.quaternion);
    p.piston.node.position.copy(p.piston.position).addScaledVector(p.axis,p.stroke);
    p.piston.node.quaternion.copy(p.piston.quaternion);
    p.rod.node.position.copy(p.rod.position).addScaledVector(p.axis,p.stroke);
    p.rod.node.quaternion.copy(p.rod.quaternion).slerp(swing,weight);
   }
   turn.setFromAxisAngle(rotationAxis,angle);
   for(const s of [crank,pulley])s.node.quaternion.copy(s.quaternion).slerp(swing.copy(turn).multiply(s.quaternion),weight);
   // Cancel only the end fittings' inherited turn, keeping their authored
   // position/orientation while the central crank and journals rotate.
   resetFixedEnds();
  },
 };
}
