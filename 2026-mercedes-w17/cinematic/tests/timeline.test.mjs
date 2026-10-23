import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {sample,cameraAt,powerUnitRootPosition,sequence,copyAt,focusChapters,smooth} from '../src/timeline.js';
import * as T from 'three';
import {createRig} from '../src/rig.js';
import {studio} from '../src/environment.js';
import {createExplainers} from '../src/explainers.js';
import wingSupports from '../src/rear-wing-supports.json' with {type:'json'};
import wheelShells from '../src/legacy-wheel-shells.json' with {type:'json'};
const models=new URL('../../public/models/',import.meta.url);
const read=name=>fs.readFileSync(new URL(name,models));
const config=JSON.parse(read('mercedes_w17_components.json'));
const puConfig=JSON.parse(read('w17_v6_hybrid_config.json'));
const loader=new GLTFLoader();
loader.register(()=>({name:'TEST_SKIP_IMAGES',loadTexture:()=>Promise.resolve(null)}));
const load=async name=>{const b=read(name);return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');};
const suppliedEngine=fs.readFileSync(new URL('../../../v6 engine/v6_car_engine_with_engine_morethem.glb',import.meta.url));
const [car,engine]=await Promise.all([load('mercedes_w17_disassembled.glb'),loader.parseAsync(suppliedEngine.buffer.slice(suppliedEngine.byteOffset,suppliedEngine.byteOffset+suppliedEngine.byteLength),'')]);
const rig=createRig(car,engine,config,puConfig);
const engineBase=rig.root.position.toArray();
const matrices=()=>{const values=[];for(const scene of [rig.carScene,rig.engineScene]){scene.updateMatrixWorld(true);scene.traverse(o=>values.push(...o.matrixWorld.elements));}return values;};
test('remounting creates an isolated rig without applying geometry masks twice',()=>{
 const second=createRig(car,engine,config,puConfig);
 for(let i=0;i<rig.masks.length;i++)assert.equal(second.masks[i].mesh.geometry.index.count,rig.masks[i].mesh.geometry.index.count);
 assert.notEqual(second.root,rig.root);assert.notEqual(second.materials[0].m.material,rig.materials[0].m.material);
});
test('the complete GLB rig returns to exactly the same matrices in both directions',()=>{
 const seen=new Map();const checkpoints=[0,.08,.15,.2,.25,.31,.4,.45,.49,.54,.62,.68,.75,.79,.82,.845,.86,.875,.9,.94,.955,.98,1];
 for(const p of [...checkpoints,...checkpoints.toReversed(),...checkpoints]){rig.apply(sample(p));const m=matrices();assert(m.every(Number.isFinite));if(seen.has(p))assert.deepEqual(m,seen.get(p));seen.set(p,m);}
 // Compare structural reassembly at the same wheel phase: rolling orientation must not reset.
 rig.apply({...sample(0),wheelDistance:sample(sequence.assembled).wheelDistance});const start=matrices();rig.apply(sample(sequence.assembled));assert.deepEqual(matrices(),start);
 assert.equal(rig.groups.length,12);assert.equal(rig.engineGroups.length,51);
});
test('rebuilt Body and Rear_Wing assets assign all circled fittings to the wing and move them rigidly',()=>{
 rig.apply(sample(0));rig.carScene.updateMatrixWorld(true);car.scene.updateMatrixWorld(true);
 const wing=rig.carScene.getObjectByName('Rear_Wing'),parts=wingSupports.patches.map(p=>wing.getObjectByName(p.mesh));
 const count=g=>{let n=0;g.traverse(m=>{if(m.isMesh)n+=m.geometry.index.count/3;});return n;};
 assert.equal(count(car.scene.getObjectByName('Rear_Wing')),17366);
 assert.equal(count(car.scene.getObjectByName('Chassis_Body')),123983);
 assert.equal(count(wing),wingSupports.wingTriangles);
 const provenance=JSON.parse(fs.readFileSync(new URL('../../../preparation/triangle-provenance.json',import.meta.url)));
 const bodyMap=provenance.find(p=>p.component==='Chassis_Body'),wingMap=provenance.find(p=>p.component==='Rear_Wing');
 assert.equal(wingSupports.triangles,646);
 for(const id of ['p3_i95','p3_i100','p3_i161','p3_i162','p3_i163','p3_i164'])assert(wingSupports.sourceIslands.includes(id),'both circled fittings include all side and end faces');
 const relative=parts.map(p=>wing.matrixWorld.clone().invert().multiply(p.matrixWorld));
 parts.forEach((part,i)=>{
  const patch=wingSupports.patches[i],original=car.scene.getObjectByName(patch.mesh);
  const bodyFaces=new Set(bodyMap.primitives.find(p=>p.sourcePrimitive===patch.sourcePrimitive).sourceFaces);
  const wingFaces=new Set(wingMap.primitives.find(p=>p.sourcePrimitive===patch.sourcePrimitive).sourceFaces);
  for(const f of patch.sourceFaces){assert(!bodyFaces.has(f),'fitting is removed from the exported Body model');assert(wingFaces.has(f),'fitting is included in the exported Rear_Wing model');}
  assert.equal(part.userData.part,'Rear_Wing');assert.equal(part.material.name,original.material.name);
  assert.deepEqual(part.geometry.index.array,original.geometry.index.array);
  for(const [key,attr] of Object.entries(original.geometry.attributes))assert.deepEqual(part.geometry.attributes[key].array,attr.array);
  for(const vertex of new Set(part.geometry.index.array)){
   const a=new T.Vector3().fromBufferAttribute(part.geometry.attributes.position,vertex).applyMatrix4(part.matrixWorld);
   const b=new T.Vector3().fromBufferAttribute(original.geometry.attributes.position,vertex).applyMatrix4(original.matrixWorld);
   assert(a.distanceTo(b)<1e-9,'assembled support positions remain unchanged');
  }
 });
 const removedShells=wheelShells.faceRanges.reduce((n,[a,b])=>n+b-a+1,0);
 assert.equal(count(rig.carScene.getObjectByName('Chassis_Body')),wingSupports.bodyTriangles-removedShells-5240);
 for(const p of [.3,.45,.54,.85,.93,.54,.3,0]){
  rig.apply(sample(p));rig.carScene.updateMatrixWorld(true);
  parts.forEach((part,i)=>{
   const current=wing.matrixWorld.clone().invert().multiply(part.matrixWorld);
   current.elements.forEach((v,j)=>assert(Math.abs(v-relative[i].elements[j])<1e-9));
  });
 }
});

test('existing staged engine extraction and legacy geometry masks are preserved',()=>{
 for(let i=0;i<=100;i++){const state=sample(.25+i*.002);rig.apply(state);const expected=powerUnitRootPosition(engineBase,state.expansion);rig.root.position.toArray().forEach((v,j)=>assert(Math.abs(v-expected[j])<1e-12));}
 assert.equal(rig.masks.length,puConfig.legacyMasks.length);
 const removed=rig.masks.reduce((n,{original,mesh})=>n+(original.count-mesh.geometry.index.count)/3,0);assert.equal(removed,5240);
});
test('secondary assembly closes before car reassembly; circuit returns only after closure',()=>{
 for(let i=0;i<780;i++)assert.equal(sample(i/1000).detail,0);
 assert.equal(sample(.845).detail,0);assert.equal(sample(.875).detail,0);assert.equal(sample(.875).expansion,1);
 assert.equal(sample(sequence.assembled).expansion,0);assert.equal(sample(sequence.assembled).studio,1);
 assert.equal(sample(1).studio,0);assert.equal(sample(1).expansion,0);
});
test('landing completes before any forward acceleration, in either traversal direction',()=>{
 for(let i=0;i<=10000;i++){
  const s=sample(i/10000);
  if(s.p>sequence.assembled&&s.p<sequence.launch){assert.equal(s.expansion,0);assert.equal(s.departure,0);}
  if(s.departure>0){assert.equal(s.lift,0);assert.equal(s.expansion,0);assert.equal(s.detail,0);}
 }
 assert(sample(sequence.lowerStart).lift>0);assert.equal(sample(sequence.landed).lift,0);
});
test('landing holds camera framing and reduced-motion dissection clears the studio floor',()=>{
 assert.deepEqual(cameraAt(sequence.lowerStart),cameraAt(sequence.landed));
 const room=studio();
 for(const reduced of [false,true]){const s=sample(.68,reduced);room.update(s);const floorY=room.group.children[0].position.y;assert(floorY<s.lift-.9);}
});

test('departure retains the original landing and ending camera compositions',()=>{
 const landing=cameraAt(sequence.launch),ending=cameraAt(1);
 landing.position.forEach((value,i)=>assert(Math.abs(value-[6.8,2.3,8.4][i])<1e-10));
 assert.deepEqual(landing.target,[-.6,.9,0]);assert.equal(landing.fov,38);
 ending.position.forEach((value,i)=>assert(Math.abs(value-[8,3.3,-5.8][i])<1e-10));
 assert.deepEqual(ending.target,[0,.5,sample(1).departure*.8]);assert.equal(ending.fov,44);
 for(const aspect of [.46,1.7]){
  let previousDeparture=0;
  for(let i=0;i<=100;i++){
   const p=sequence.launch+(1-sequence.launch)*i/100,s=sample(p),v=cameraAt(p,false,aspect);
   assert([...v.position,...v.target,v.fov].every(Number.isFinite));
   assert(s.departure>=previousDeparture);previousDeparture=s.departure;
  }
  assert.equal(previousDeparture,110);
 }
});
test('wheel distance is continuous, slows into bullet time, and never stops during dissection',()=>{
 const dp=1e-6,speed=p=>(sample(p+dp).wheelDistance-sample(p-dp).wheelDistance)/(2*dp);
 let previous=Infinity;
 for(let i=0;i<100;i++){const p=.15+i*.001,v=speed(p);assert(v>0);assert(v<=previous+.001);previous=v;}
 for(const p of [.15,.25,.875,sequence.assembled,sequence.landed,sequence.launch])assert(Math.abs(sample(p-dp).wheelDistance-sample(p+dp).wheelDistance)<.002);
 assert(sample(sequence.launch).spin>sample(.25).spin);
 assert(sample(.99).spin>sample(sequence.launch).spin);
 for(const p of [.99,1])assert(Math.abs(sample(p).wheelDistance-sample(p).roadDistance-sample(p).departure)<1e-10);
});
test('four centered axle pivots keep a stable axis and rotate exactly distance/radius',()=>{
 for(const p of [0,.1,.2,.249,.4,.64,.94,.972,.985,1]){
  const s=sample(p);rig.apply(s);rig.carScene.updateMatrixWorld(true);
  for(const w of rig.wheels){
   assert(Math.abs(w.pivot.rotation.x*w.radius-s.wheelDistance)<1e-10);
   const axis=new T.Vector3(1,0,0).transformDirection(w.pivot.matrixWorld);assert(axis.distanceTo(w.axis)<1e-10);
   const center=w.pivot.getWorldPosition(new T.Vector3());assert(Math.abs(center.y-w.center.y)<1e-9);assert(Math.abs(center.z-w.center.z)<1e-9);
  }
 }
});
test('four brake rotors share wheel axes, calipers do not spin, and brakes sit inboard of wheels',()=>{
 assert.equal(rig.brakes.assemblies.length,4);
 for(const p of [0,.12,.249,.4,.64,.93,.99]){
  rig.apply(sample(p));rig.carScene.updateMatrixWorld(true);
  rig.brakes.assemblies.forEach((b,i)=>{
   const w=rig.wheels[i],wc=w.pivot.getWorldPosition(new T.Vector3()),bc=b.g.getWorldPosition(new T.Vector3());
   // Exploded assemblies retain their authored lateral spacing; at rest the
   // actual disc and wheel centers lie on the same cambered axle.
   const lateral=b.side*(1.15-.68)*smooth(sample(p).expansion);
   assert(wc.clone().sub(bc).sub(new T.Vector3(lateral,0,0)).cross(w.axis).length()<1e-9);
   assert((wc.x-bc.x)*b.side>0);assert.equal(b.rotor.rotation.x,w.pivot.rotation.x);assert.deepEqual(b.caliper.rotation.toArray(),[0,0,0,'XYZ']);
  });
 }
});
test('authored disc planes and hub centers remain stationary through a full wheel revolution',()=>{
 rig.apply(sample(0));
 for(const w of rig.wheels){
  let disc;w.pivot.traverse(m=>{if(m.isMesh&&/^discs\./.test(m.material.name))disc=m;});
  const pos=disc.geometry.attributes.position,idx=disc.geometry.index;
  const measure=()=>{
   rig.carScene.updateMatrixWorld(true);
   const point=i=>new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(disc.matrixWorld);
   const a=point(idx.getX(0)),b=point(idx.getX(1)),c=point(idx.getX(2));
   const normal=b.sub(a).cross(c.sub(a)).normalize(),center=new T.Vector3();
   for(let i=0;i<pos.count;i++)center.add(point(i));center.divideScalar(pos.count);
   return {normal,center};
  };
  w.pivot.rotation.x=0;const initial=measure();
  for(let i=1;i<=72;i++){
   w.pivot.rotation.x=i*Math.PI/36;const current=measure();
   assert(current.normal.distanceTo(initial.normal)<1e-5,w.name+' disc plane wobbles');
   assert(current.center.distanceTo(initial.center)<1e-5,w.name+' hub center orbits');
  }
  w.pivot.rotation.x=0;
 }
});
test('suspension retains every triangle and moves sideways without lifting or stretching',()=>{
 rig.apply(sample(.4));
 for(const name of ['Suspension_Front','Suspension_Rear']){
  let count=0;rig.carScene.getObjectByName(name).traverse(m=>{if(m.isMesh)count+=m.geometry.index.count/3;});
  assert.equal(count,config.components.find(c=>c.name===name).triangles);
 }
 for(const {g,side} of rig.suspension){assert.equal(g.position.y,0);assert.equal(g.position.z,0);assert.equal(Math.sign(g.position.x),side);assert.deepEqual(g.scale.toArray(),[1,1,1]);}
});
test('brake study stays assembled and spins the rotor in place while its caliper and duct remain fixed',()=>{
 const read=()=>rig.brakes.assemblies.map(b=>[...b.disc.position.toArray(),...b.bell.position.toArray(),...b.caliper.position.toArray(),...b.duct.position.toArray()]);
 rig.apply(sample(.628));const assembled=read();
 rig.carScene.updateMatrixWorld(true);
 const stationary=rig.brakes.assemblies.map(b=>[...b.caliper.matrixWorld.elements,...b.duct.matrixWorld.elements]);
 const initialAngle=rig.brakes.assemblies[0].rotor.rotation.x;
 for(const p of [.63,.635,.6412,.647,.65,.6412,.63,.628]){
  rig.apply(sample(p));rig.carScene.updateMatrixWorld(true);assert.deepEqual(read(),assembled);
  rig.brakes.assemblies.forEach((b,i)=>{
   assert.deepEqual([...b.caliper.matrixWorld.elements,...b.duct.matrixWorld.elements],stationary[i]);
   assert.equal(b.rotor.rotation.x,sample(p).wheelDistance/b.radius);
  });
 }
 rig.apply(sample(.6412));assert.notEqual(rig.brakes.assemblies[0].rotor.rotation.x,initialAngle);
 assert(rig.brakes.assemblies.every(b=>b.caliper.getObjectByName(b.g.name+'_Brembo_Wordmark')));
});
test('every modeled assembly has a named focus with educational copy',()=>{
 const covered=new Set(focusChapters.flatMap(c=>c.parts));for(const c of config.components)assert(covered.has(c.name),c.name);assert(covered.has('Brakes'));assert(covered.has('Power_Unit'));
 for(const chapter of focusChapters){const copy=copyAt((chapter.at+chapter.end)/2);assert.equal(copy.kind,'focus');assert(copy.description.length>80);assert(copy.eyebrow);assert(copy.callout);assert(copy.description.split(/[.!?](?: |$)/).filter(Boolean).length>=2);assert.equal(copy.title.length,1);}
});
test('camera and component motion remain continuous at every chapter boundary',()=>{
 for(const p of [.15,.25,.45,.515,.58,.65,.715,.78,.85,.875,.955,.96,.995]){
  const a=cameraAt(p-1e-7),b=cameraAt(p+1e-7);
  assert(Math.hypot(...a.position.map((v,i)=>v-b.position[i]))<.001);
  assert(Math.abs(sample(p-1e-7).expansion-sample(p+1e-7).expansion)<.00001);
 }
 for(let i=0;i<=1000;i++)for(const aspect of [.46,1,1.6,2.4]){const v=cameraAt(i/1000,false,aspect);assert([...v.position,...v.target,v.fov].every(Number.isFinite));}
});
test('reduced motion keeps a fixed camera, removes travel, spin and blur, and retains reversible dissection',()=>{
 for(const aspect of [.46,1.6])for(let i=0;i<=100;i++){
  const s=sample(i/100,true);for(const k of ['departure','spin','raceSpeed','roadDistance','scan'])assert.equal(s[k],0);
  assert.deepEqual(cameraAt(i/100,true,aspect),cameraAt(0,true,aspect));
  assert.equal(s.expansion,sample(i/100).expansion);
 }
});
test('rebuilt car matches its new model manifest; original source and legacy engine stay unchanged',()=>{
 const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
 assert.equal(sha(read('mercedes_w17_disassembled.glb')),wingSupports.modelSha256);
 assert.equal(config.modelSha256,wingSupports.modelSha256);
 assert.equal(sha(read('w17_v6_hybrid_power_unit.glb')),'40d524cabb3251c75fa314a2f336016bd43abb2062152a46a8c6c1e591281db9');
 assert.equal(sha(fs.readFileSync(new URL('../../source/f1_2026_w17.glb',import.meta.url))),'1d274f08d532e60826a7de5a93ccef7ddabe0b3377cca243679adb46e841a8d8');
});

test('five refined studies attach nonempty paths to the actual moving parts and dispose cleanly',()=>{
 rig.apply(sample(0));const guides=createExplainers(rig);
 for(const id of ['suspension','halo','monocoque','engine-cover','power-unit']){
  const study=guides.studies.find(s=>s.c.id===id);assert(study.fitted);assert(study.paths.length>0,id);
  for(const a of study.anchors)assert(a.parent&&a.parent!==guides.group);
  guides.update(sample((study.c.at+study.c.end)/2));assert(study.anchors.every(a=>a.visible));
 }
 const halo=guides.studies.find(s=>s.c.id==='halo'),anchor=halo.anchors[0];
 rig.apply(sample(0));const initial=anchor.getWorldPosition(new T.Vector3());rig.apply(sample(.73));const moved=anchor.getWorldPosition(new T.Vector3());assert(moved.distanceTo(initial)>1);
 guides.update(sample(0));assert(guides.studies.every(s=>s.anchors.every(a=>!a.visible)));
 guides.dispose();for(const study of guides.studies.filter(s=>s.fitted))assert(study.anchors.every(a=>a.parent===null));
});

