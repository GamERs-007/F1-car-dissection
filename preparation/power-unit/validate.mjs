import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import * as T from '../../inspection/vendor/three/build/three.module.js';
import {GLTFLoader} from '../../inspection/vendor/three/examples/jsm/loaders/GLTFLoader.js';
import {powerUnitProgress,powerUnitRootPosition,offsetPosition} from '../../2026-mercedes-w17/preview/power-unit-motion.js';
const root=new URL('../../',import.meta.url),read=p=>fs.readFileSync(new URL(p,root));
const dir='2026-mercedes-w17/public/models/',config=JSON.parse(read(dir+'w17_v6_hybrid_config.json')),bytes=read(dir+config.model),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.equal(sha(bytes),config.sha256);const n=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+n));assert.equal(bytes.readUInt32LE(8),bytes.length);assert(!json.images?.length);assert(json.meshes.length<=50);assert.equal(config.components.length,12);
const loader=new GLTFLoader();const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');const pu=gltf.scene.getObjectByName('Power_Unit');assert(pu);
const baseRoot=pu.position.toArray(),groups=config.components.map(c=>{const g=pu.getObjectByName(c.name);assert(g);return {g,c,base:g.position.toArray()};});
for(let i=0;i<3;i++)assert(Math.abs(baseRoot[i]-config.root.originalPosition[i])<1e-6);
let triangles=0,meshes=0;pu.traverse(m=>{if(m.isMesh){meshes++;triangles+=(m.geometry.index?.count??m.geometry.attributes.position.count)/3;assert([...m.geometry.attributes.position.array].every(Number.isFinite));assert(m.material);}});
const matrices=()=>{gltf.scene.updateMatrixWorld(true);const a=[];pu.traverse(m=>a.push(...m.matrixWorld.elements));return a;};const initial=matrices();
function apply(t,detail=0,linked=true){pu.position.fromArray(powerUnitRootPosition(baseRoot,t));const state=powerUnitProgress(t,detail,linked);for(const {g,c,base} of groups)g.position.fromArray(offsetPosition(base,c.explodedOffset,state.detail));return matrices();}
const samples=[0,.15,.45,.53,.6,.7,.8,.9,1,.9,.7,.45,0];const seen=new Map();for(const t of samples){const value=apply(t);assert(value.every(Number.isFinite));if(seen.has(t))assert.deepEqual(value,seen.get(t));seen.set(t,value);}assert.deepEqual(apply(0),initial);
for(const t of [0,.5,1,.5,0])apply(1,t,false);assert.deepEqual(apply(0),initial);
// Confirm masks only refer to intended existing source patches and are reversible.
const provenance=JSON.parse(read('preparation/triangle-provenance.json'));const islands=JSON.parse(read('preparation/islands.json')),hidden=new Set(config.legacyPatches),sourceFaces=new Set(islands.filter(x=>hidden.has(x.id)).flatMap(r=>r.faces.map(f=>r.primitive+':'+f)));
let masked=0;for(const mask of config.legacyMasks){const p=provenance.find(e=>e.meshIndex===mask.mesh).primitives[mask.primitive];assert.equal(new Set(mask.faces).size,mask.faces.length);for(const f of mask.faces){assert(f>=0&&f<p.sourceFaces.length);assert(sourceFaces.has(p.sourcePrimitive+':'+p.sourceFaces[f]));masked++;}}assert.equal(masked,sourceFaces.size);
const old=JSON.parse(read('preparation/validation.json'));assert.equal(sha(read(dir+'mercedes_w17_disassembled.glb')),old.outputSha256);assert.equal(sha(read('2026-mercedes-w17/source/f1_2026_w17.glb')),old.sourceSha256);
const results={passed:true,bytes:bytes.length,sha256:config.sha256,triangles,drawMeshes:meshes,materials:json.materials.length,extraTextures:json.images?.length??0,subassemblies:groups.length,sourceAndPreparedGlbUnchanged:true,legacyMaskedTriangles:masked,absoluteAnimationRoundTripExact:true,forwardReverseSamplesIdentical:true,manualDetailRoundTripExact:true,samples};fs.writeFileSync(new URL('preparation/power-unit/validation.json',root),JSON.stringify(results,null,2));console.log(results);
