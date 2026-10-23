import * as T from 'three';
import {calibrateMaterial} from './fidelity.js';
import {smooth,ramp,focusStrength,offsetPosition} from './timeline.js';
import {wheelAxle,splitSuspension,createBrakes,poseBrakeAssembly} from './running-gear.js';
import legacyWheelShells from './legacy-wheel-shells.json' with {type:'json'};
import {createEngineRig} from './engine-rig.js';
export function createRig(car,engine,config,puConfig,renderer){
 // Keep loader-cached scenes pristine across React remounts and hot reloads.
 const originalObjects=[],clonedObjects=[],carScene=car.scene.clone(true),v6=createEngineRig(engine),engineScene=v6.scene;
 car.scene.traverse(o=>originalObjects.push(o));carScene.traverse(o=>clonedObjects.push(o));
 const associations=new Map(clonedObjects.map((o,i)=>[o,car.parser.associations.get(originalObjects[i])]));
 car={scene:carScene,parser:{associations}};
 const groups=config.components.map(c=>{const g=car.scene.getObjectByName(c.name);if(!g)throw Error('Missing car component '+c.name);return {g,c,position:g.position.toArray(),quaternion:g.quaternion.clone()};});
 const root=v6.root,engineGroups=v6.parts;
 const materials=[],masks=[];
 for(const {g,c} of groups)g.traverse(m=>{if(!m.isMesh)return;m.userData.part=c.name;m.castShadow=true;m.receiveShadow=true;
  const association=car.parser.associations.get(m),mask=puConfig.legacyMasks.find(x=>x.mesh===association?.meshes&&x.primitive===association?.primitives);
  // Four audited connected shell islands remain attached to the source chassis
  // after wheel extraction. Remove only those faces from the runtime clone.
  if(m.name===legacyWheelShells.mesh&&m.material.name===legacyWheelShells.material){
   if(m.geometry.index.count!==legacyWheelShells.originalTriangles*3)throw Error('Legacy wheel-shell geometry changed; re-audit mask');
   const original=m.geometry.index,skip=new Set(),kept=[];
   for(const [start,end] of legacyWheelShells.faceRanges)for(let f=start;f<=end;f++)skip.add(f);
   for(let f=0;f<original.count/3;f++)if(!skip.has(f))kept.push(original.getX(f*3),original.getX(f*3+1),original.getX(f*3+2));
   m.geometry=m.geometry.clone();m.geometry.setIndex(kept);
  }
  if(mask){m.geometry=m.geometry.clone();const original=m.geometry.index,skip=new Set(mask.faces),kept=[];for(let f=0;f<original.count/3;f++)if(!skip.has(f))kept.push(original.getX(f*3),original.getX(f*3+1),original.getX(f*3+2));m.geometry.setIndex(kept);masks.push({mesh:m,original});}
  m.material=renderer?calibrateMaterial(m.material,renderer):m.material.clone();materials.push({m,base:m.material.color.clone(),emissive:m.material.emissive?.clone(),part:c.name});
 });
 if(masks.length!==puConfig.legacyMasks.length)throw Error('Power-unit legacy mask mismatch');
 const wheels=groups.filter(({c})=>c.name.startsWith('Wheel_')).map(({g,c})=>({...wheelAxle(g),name:c.name}));
 const suspension=groups.filter(({c})=>c.name.startsWith('Suspension_')).flatMap(({g})=>splitSuspension(g));
 // Split meshes share their calibrated materials with the original material records.
 const brakes=createBrakes(wheels);carScene.add(brakes.root);
 const brakeMaterials=new Set();brakes.root.traverse(m=>{if(m.isMesh&&!brakeMaterials.has(m.material)){brakeMaterials.add(m.material);materials.push({m,base:m.material.color.clone(),emissive:m.material.emissive.clone(),part:'Brakes'});}});
 const separation={Front_Wing:[0,.5],Rear_Wing:[.08,.58],Engine_Cover:[.18,.72],Halo:[.32,.85],Floor_Diffuser:[.42,1]};
 function apply(state,hover=null,selected=null){
  const amount=smooth(state.expansion);
  for(const {g,c,position,quaternion} of groups){const offset=c.name.startsWith('Suspension_')?[0,0,0]:c.name.startsWith('Wheel_')?[c.explodedOffset[0],0,0]:c.explodedOffset;const phase=separation[c.name],separated=phase?ramp(state.expansion,...phase):amount;g.position.fromArray(offsetPosition(position,offset,separated));g.quaternion.copy(quaternion);}
  // Positive Z travel is positive rotation about local X. Absolute angles never accumulate drift.
  for(const w of wheels)w.pivot.rotation.set(state.wheelDistance/w.radius,0,0);
  for(const {g,side} of suspension)g.position.set(side*.42*amount,0,0);
  for(const b of brakes.assemblies){
   b.g.position.copy(b.base);b.g.position.x+=b.side*.68*amount;
   b.rotor.rotation.set(state.wheelDistance/b.radius,0,0);
   poseBrakeAssembly(b,0);
  }
  v6.apply(state,hover,selected);
  const focus=state.focus?.parts;
  const strength=focusStrength(state.p,state.focus);
  for(const {m,base,emissive,part} of materials){const focused=focus?.includes(part),active=hover===part||selected===part,dim=focus&&!focused ? 1-.78*strength:1;m.material.color.copy(base).multiplyScalar(dim);if(emissive){m.material.emissive.copy(emissive).multiplyScalar(dim);if(focused||active)m.material.emissive.add(new T.Color(0x00d2be).multiplyScalar(active ? .3:(part==='Brakes'?.004:.035)*strength));}}
 }
 return {carScene,engineScene,groups,root,engineGroups,materials,apply,masks,wheels,suspension,brakes,v6};
}

