import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {createEngineRig} from '../src/engine-rig.js';
import {engineInstallation,engineSequence,engineStationaryNodes,engineRemovedNodes} from '../src/engine-config.js';
import {sample,samplePlayback} from '../src/timeline.js';
import {playbackSegments,PLAYBACK_DURATION,progressAtScene} from '../src/playback.js';
import crankEnds from '../src/crank-fixed-ends.json' with {type:'json'};
const bytes=fs.readFileSync(new URL('../../../v6 engine/v6_car_engine_with_engine_morethem.glb',import.meta.url));
const loader=new GLTFLoader();loader.register(()=>({name:'TEST_SKIP_IMAGES',loadTexture:()=>Promise.resolve(null)}));
const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const rig=createEngineRig(asset);
const matrices=()=>{rig.scene.updateMatrixWorld(true);const out=[];rig.source.traverse(o=>out.push(...o.matrixWorld.elements));return out;};
const bbox=()=>{rig.scene.updateMatrixWorld(true);const box=new T.Box3();for(const p of rig.parts)for(const m of p.meshes){m.geometry.computeBoundingBox();box.union(m.geometry.boundingBox.clone().applyMatrix4(m.matrixWorld));}return box;};

test('only the audited assembled set is installed; each material mesh belongs to one physical parent',()=>{
 assert.equal(rig.parts.length,51);assert.equal(rig.parts.flatMap(p=>p.meshes).length,121);
 assert.equal(rig.parts.filter(p=>p.c.sourceName.startsWith('Piston')).length,6);
 assert.equal(rig.parts.filter(p=>p.c.sourceName.startsWith('Bielle')).length,6);
 const root=rig.source.getObjectByName('RootNode');assert.equal(root.children.filter(o=>o.visible).length,51);
 assert.equal(root.children.filter(o=>!o.visible).length,65);
 for(const p of rig.parts){assert.equal(p.g.parent,root);for(const m of p.meshes){assert.equal(m.userData.enginePart,p.c.id);assert.equal(m.userData.partLabel,p.c.label);}}
 const originals=[];asset.scene.traverse(m=>{if(m.isMesh)originals.push(m.material);});
 for(const p of rig.parts)for(const m of p.meshes)assert(!originals.includes(m.material));
});

test('nested source transforms and geometry survive unchanged, with a separate installation wrapper',()=>{
 rig.apply(sample(0));
 for(const p of rig.parts){assert.deepEqual(p.g.position.toArray(),p.c.initial.position);assert.deepEqual(p.g.quaternion.toArray(),p.c.initial.quaternion);assert.deepEqual(p.g.scale.toArray(),p.c.initial.scale);}
 assert.deepEqual(rig.root.position.toArray(),engineInstallation.position);
 const box=bbox();assert(box.min.x>-.52&&box.max.x<.52);assert(box.min.y>.24&&box.max.y<.70);assert(box.max.z<-.49&&box.min.z>-2.1);
 assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),JSON.parse(fs.readFileSync(new URL('../evidence/v6-verification.json',import.meta.url))).sourceSha256);
});

test('all descendants travel rigidly by the configured source-space vector, including nested scale',()=>{
 rig.apply(sample(engineSequence.complete));rig.scene.updateMatrixWorld(true);
 const original=new Map(rig.parts.flatMap(p=>p.meshes.map(m=>[m,m.getWorldPosition(new T.Vector3())])));
 rig.apply({...sample(engineSequence.complete),detail:1});rig.scene.updateMatrixWorld(true);
 const rotation=new T.Euler(...engineInstallation.rotation);
 for(const p of rig.parts){
  const expected=new T.Vector3(...p.c.direction).normalize().multiplyScalar(p.c.distance*engineInstallation.explosionScale*engineInstallation.scale).applyEuler(rotation);
  if(engineStationaryNodes.has(p.c.node))expected.set(0,0,0);
  for(const m of p.meshes)assert(m.getWorldPosition(new T.Vector3()).sub(original.get(m)).distanceTo(expected)<1e-9,p.c.sourceName);
  assert.deepEqual(p.g.quaternion.toArray(),p.base.quaternion.toArray());assert.deepEqual(p.g.scale.toArray(),p.base.scale.toArray());
 }
});

test('repeat dissection, reverse scrolling and reassembly produce exactly identical matrices',()=>{
 const checkpoints=[0,.25,.32,.45,.78,.802,.812,.82,.832,.845,.85,.86,.875,.93,1],seen=new Map();
 for(let n=0;n<8;n++)for(const p of n%2?checkpoints.toReversed():checkpoints){rig.apply(sample(p));const value=matrices();assert(value.every(Number.isFinite));if(seen.has(p))assert.deepEqual(value,seen.get(p));seen.set(p,value);}
 rig.apply(sample(0));const base=matrices();rig.apply(sample(.93));assert.deepEqual(matrices(),base);
});

test('Cube.001 and Cylinder.001 stay mounted through opening; Curve.006 and Curve.007 are excluded',()=>{
 const fixed=rig.parts.filter(p=>engineStationaryNodes.has(p.c.node));
 assert.deepEqual(fixed.map(p=>p.c.sourceName).sort(),['Cube.001','Cylinder.001']);
 rig.apply(sample(engineSequence.complete));rig.scene.updateMatrixWorld(true);
 const original=fixed.map(p=>p.g.matrixWorld.clone());
 for(const p of [.803,.805,.807,.815,.825,.807,.802]){
  rig.apply({...sample(p),detail:1});rig.scene.updateMatrixWorld(true);
  fixed.forEach((part,i)=>assert.deepEqual(part.g.matrixWorld.elements,original[i].elements));
 }
 for(const id of engineRemovedNodes){
  assert(!rig.parts.some(p=>p.c.node===id));
  let sourceNode;asset.scene.traverse(o=>{if(asset.parser.associations.get(o)?.nodes===id)sourceNode=o;});
  const node=rig.source.getObjectByName(sourceNode.name);
  assert.equal(node.visible,false);
  node.traverse(m=>{if(m.isMesh){const hits=[];m.raycast({},hits);assert.deepEqual(hits,[]);}});
  assert.equal(sourceNode.visible,true,'source asset stays untouched');
 }
});

test('pistons run immediately as the engine starts to unfold, before the covers finish opening',()=>{
 const opening=playbackSegments.find(s=>s.kind==='engine-expand');
 const state=seconds=>samplePlayback(seconds/PLAYBACK_DURATION);
 const a=state(opening.start+.02),b=state(opening.start+.12);
 assert(a.engineCycle>0&&b.engineCycle<.01);
 assert.equal(a.engineMotion,1);assert.equal(b.engineMotion,1);
 assert(a.crankAngle>0&&b.crankAngle>a.crankAngle);
 rig.apply(a);const first=rig.pistons.pairs.map(p=>p.piston.node.position.toArray());
 rig.apply(b);assert.notDeepEqual(rig.pistons.pairs.map(p=>p.piston.node.position.toArray()),first);
 for(const pair of rig.pistons.pairs){
  const bigEnd=new T.Vector3(0,-pair.length,0).applyQuaternion(pair.rod.node.quaternion).add(pair.rod.node.position);
  const expected=pair.center.clone();expected.y+=pair.radius*Math.cos(pair.phase+b.crankAngle);expected.z+=pair.radius*Math.sin(pair.phase+b.crankAngle);
  assert(bigEnd.distanceTo(expected)<1e-9,'early motion retains rigid connecting-rod constraints');
 }
 rig.apply(a);assert.deepEqual(rig.pistons.pairs.map(p=>p.piston.node.position.toArray()),first);
});

test('stationary Cube.001 and Cylinder.001 fade with opening and restore opacity, shadows and picking on closure',()=>{
 const covers=rig.parts.filter(p=>engineStationaryNodes.has(p.c.node)),ids=new Set(covers.map(p=>p.c.id));
 const finishes=rig.materials.filter(m=>ids.has(m.id));assert.equal(finishes.length,5);
 rig.apply(sample(engineSequence.complete));
 const raycasts=covers.flatMap(p=>p.meshes.map(m=>m.raycast));
 for(const cycle of [0,.3,1,.3,0]){
  rig.apply({...sample(.805),engineCycle:cycle});
  for(const {material,opacity,depthWrite} of finishes){
   assert.equal(material.transparent,true);
   assert(Math.abs(material.opacity-opacity*(1-.96*cycle))<1e-10);
   assert.equal(material.depthWrite,cycle===0?depthWrite:false);
  }
  covers.flatMap(p=>p.meshes).forEach((m,i)=>{
   assert.equal(m.castShadow,cycle<.02);
   if(cycle===0)assert.equal(m.raycast,raycasts[i]);else assert.notEqual(m.raycast,raycasts[i]);
  });
 }
});

test('crank end fittings stay fixed through a full turn while the middle rotates, without losing source triangles',()=>{
 const {crank,fixedEnds}=rig.pistons;
 for(const patch of crankEnds.patches){
  const moving=crank.node.getObjectByName(patch.mesh),fixed=fixedEnds.getObjectByName(patch.mesh+'_Fixed_End');
  const original=asset.scene.getObjectByName(patch.mesh);
  assert.equal(moving.geometry.index.count+fixed.geometry.index.count,original.geometry.index.count);
  assert.equal(fixed.geometry.index.count/3,patch.triangles);
  assert.deepEqual(fixed.geometry.attributes.position.array,original.geometry.attributes.position.array);
  const moved=new Set(moving.geometry.index.array.length?Array.from({length:moving.geometry.index.count/3},(_,i)=>[moving.geometry.index.getX(i*3),moving.geometry.index.getX(i*3+1),moving.geometry.index.getX(i*3+2)].join(',')):[]);
  for(let f=0;f<fixed.geometry.index.count/3;f++)assert(!moved.has([fixed.geometry.index.getX(f*3),fixed.geometry.index.getX(f*3+1),fixed.geometry.index.getX(f*3+2)].join(',')));
 }
 rig.apply({...sample(engineSequence.pistons),crankAngle:0});rig.scene.updateMatrixWorld(true);
 const baseline=fixedEnds.children.map(m=>m.matrixWorld.clone());
 for(const angle of [.1,.8,1.7,Math.PI,2*Math.PI,.8])for(const weight of [1,.5]){
  rig.apply({...sample(engineSequence.pistons),crankAngle:angle,engineMotion:weight});rig.scene.updateMatrixWorld(true);
  fixedEnds.children.forEach((m,i)=>m.matrixWorld.elements.forEach((v,j)=>assert(Math.abs(v-baseline[i].elements[j])<1e-9,'both end fittings retain their assembled world transform')));
  if(angle===.8)assert(crank.node.quaternion.angleTo(crank.quaternion)>.3,'central shaft rotates independently');
 }
 rig.apply(sample(0));assert.deepEqual(fixedEnds.quaternion.toArray(),[0,0,0,1]);
});

test('hover and selection highlight a complete part without tinting shared source or adjacent materials',()=>{
 const a=rig.parts.find(p=>p.c.node===271),b=rig.parts.find(p=>p.c.node===274),sourceColors=[];
 asset.scene.traverse(m=>{if(m.isMesh)sourceColors.push(m.material.color.toArray());});
 rig.apply(sample(.845));const own=a.meshes.map(m=>m.material.color.toArray()),other=b.meshes.map(m=>m.material.color.toArray());
 rig.apply(sample(.845),a.c.id);for(let i=0;i<a.meshes.length;i++)assert.notDeepEqual(a.meshes[i].material.color.toArray(),own[i]);
 assert.deepEqual(b.meshes.map(m=>m.material.color.toArray()),other);
 rig.apply(sample(.845),null,a.c.id);assert.notDeepEqual(a.meshes.map(m=>m.material.color.toArray()),own);
 rig.apply(sample(0),a.c.id,a.c.id);assert.deepEqual(a.meshes.map(m=>m.material.color.toArray()),own);
 const after=[];asset.scene.traverse(m=>{if(m.isMesh)after.push(m.material.color.toArray());});assert.deepEqual(after,sourceColors);
});

test('complete and exploded substeps, autoplay dwells and scrubbing share one reversible film clock',()=>{
 const hold=playbackSegments.find(s=>s.id==='engine-complete');assert(Math.abs(hold.end-hold.start-engineSequence.completeHold)<1e-10);
 for(const seconds of [hold.start+.1,hold.end-.1]){const state=samplePlayback(seconds/PLAYBACK_DURATION);assert.equal(state.p,engineSequence.complete);assert.equal(state.detail,0);assert(state.holding);}
 for(const p of [.802,.82,.845,.86,.875,.93])assert(Math.abs(samplePlayback(progressAtScene(p)).detail-sample(p).detail)<1e-10);
 for(const p of [.825,.835,.845,.85,.875,.9]){assert.equal(sample(p).detail,0);assert.equal(sample(p).engineCycle,0);}assert.equal(sample(.875).expansion,1);
});

test('six piston/rod pairs obey their bore axes and retain rigid rod lengths through a full crank turn',()=>{
 const p=engineSequence.pistons;
 for(let i=0;i<=90;i++){
  const angle=i/90*Math.PI*2;rig.apply({...sample(p),crankAngle:angle});
  for(const pair of rig.pistons.pairs){
   const pistonDelta=pair.piston.node.position.clone().sub(pair.piston.position);
   assert(pistonDelta.cross(pair.axis).length()<1e-10);
   assert.deepEqual(pair.piston.node.scale.toArray(),pair.piston.scale.toArray());
   const bigEnd=new T.Vector3(0,-pair.length,0).applyQuaternion(pair.rod.node.quaternion).add(pair.rod.node.position);
   const expected=pair.center.clone();expected.y+=pair.radius*Math.cos(pair.phase+angle);expected.z+=pair.radius*Math.sin(pair.phase+angle);
   assert(bigEnd.distanceTo(expected)<1e-9);
  }
 }
 rig.apply({...sample(p),crankAngle:.6});const first=matrices();rig.apply({...sample(p),crankAngle:5});rig.apply({...sample(p),crankAngle:.6});assert.deepEqual(matrices(),first);
 rig.apply(sample(0));const original=matrices();rig.apply({...sample(p),crankAngle:4});rig.apply(sample(0));assert.deepEqual(matrices(),original);
});

test('piston study advances on the film clock while its scene coordinate and camera hold still',()=>{
 const hold=playbackSegments.find(s=>s.id==='engine-pistons'),a=samplePlayback((hold.start+.1)/PLAYBACK_DURATION),b=samplePlayback((hold.start+.35)/PLAYBACK_DURATION);
 assert.equal(a.p,b.p);assert.equal(a.engineCycle,1);assert(b.crankAngle>a.crankAngle);
 rig.apply(a);const first=rig.pistons.pairs.map(p=>p.piston.node.position.toArray());rig.apply(b);assert.notDeepEqual(rig.pistons.pairs.map(p=>p.piston.node.position.toArray()),first);
 rig.apply(a);assert.deepEqual(rig.pistons.pairs.map(p=>p.piston.node.position.toArray()),first);
 assert.equal(sample(engineSequence.pistons,true).crankAngle,0);
});
