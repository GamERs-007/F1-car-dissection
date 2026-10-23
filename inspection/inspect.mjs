import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import * as THREE from './vendor/three/build/three.module.js';
import {GLTFLoader} from './vendor/three/examples/jsm/loaders/GLTFLoader.js';
const out=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(out,'../2026-mercedes-w17');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function inventory(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{const p=path.join(dir,e.name);if(e.isDirectory())return inventory(p);const b=fs.readFileSync(p);return [{path:path.relative(root,p).replaceAll('\\','/'),bytes:b.length,sha256:hash(b),...(b.subarray(1,4).toString()==='PNG'?{width:b.readUInt32BE(16),height:b.readUInt32BE(20)}:{})}];});}
const files=inventory(root), b=fs.readFileSync(path.join(root,'source/f1_2026_w17.glb'));
if(b.readUInt32LE(0)!==0x46546c67||b.readUInt32LE(4)!==2||b.readUInt32LE(8)!==b.length)throw Error('Invalid GLB header');
const jsonLength=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+jsonLength));
const binStart=20+jsonLength+8;
fs.writeFileSync(path.join(out,'gltf-metadata.json'),JSON.stringify(j,null,2));
// Geometry and hierarchy are loaded unmodified. Skip browser-only image decoding in Node;
// the interactive inspector loads all embedded textures through the real browser loader.
const loader=new GLTFLoader();
loader.register(()=>({name:'INSPECTION_SKIP_IMAGE_DECODE',loadTexture:()=>Promise.resolve(null)}));
const gltf=await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');
gltf.scene.updateMatrixWorld(true);
const round=v=>v.map(x=>+x.toFixed(6));
const bounds=box=>({min:round(box.min.toArray()),max:round(box.max.toArray()),size:round(box.getSize(new THREE.Vector3()).toArray())});
function islands(g){
 const p=g.attributes.position,idx=g.index.array,parents=Int32Array.from({length:p.count},(_,i)=>i);
 const find=x=>{while(parents[x]!==x){parents[x]=parents[parents[x]];x=parents[x];}return x;};
 const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parents[b]=a;};
 const byPosition=new Map();
 for(let i=0;i<p.count;i++){const k=[p.getX(i),p.getY(i),p.getZ(i)].join(',');if(byPosition.has(k))join(i,byPosition.get(k));else byPosition.set(k,i);}
 for(let i=0;i<idx.length;i+=3){join(idx[i],idx[i+1]);join(idx[i],idx[i+2]);}
 const groups=new Map();
 for(let i=0;i<idx.length;i+=3){const r=find(idx[i]);if(!groups.has(r))groups.set(r,{triangles:0,box:new THREE.Box3()});const a=groups.get(r);a.triangles++;for(let k=0;k<3;k++)a.box.expandByPoint(new THREE.Vector3().fromBufferAttribute(p,idx[i+k]));}
 return [...groups.values()].sort((a,b)=>b.triangles-a.triangles).map(a=>({triangles:a.triangles,localBounds:bounds(a.box)}));
}
const hierarchy=[],meshes=[];
gltf.scene.traverse(o=>{
 const association=gltf.parser.associations.get(o);
 hierarchy.push({type:o.type,name:o.name,parent:o.parent?.name??null,children:o.children.map(c=>c.name),association,position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray()});
 if(!o.isMesh)return;
 const g=o.geometry;g.computeBoundingBox();
 meshes.push({name:o.name,parent:o.parent.name,association,material:o.material.name,materialIndex:j.meshes[association.meshes].primitives[association.primitives].material,vertices:g.attributes.position.count,indices:g.index.count,triangles:g.index.count/3,attributes:Object.fromEntries(Object.entries(g.attributes).map(([k,a])=>[k,{count:a.count,itemSize:a.itemSize,array:a.array.constructor.name,normalized:a.normalized}])),indexType:g.index.array.constructor.name,localBounds:bounds(g.boundingBox),worldBounds:bounds(new THREE.Box3().setFromObject(o)),morphTargets:Object.keys(g.morphAttributes),islands:islands(g)});
});
const images=j.images.map((im,i)=>{const v=j.bufferViews[im.bufferView],data=b.subarray(binStart+(v.byteOffset??0),binStart+(v.byteOffset??0)+v.byteLength),sha256=hash(data);return {i,...im,bytes:data.length,width:data.readUInt32BE(16),height:data.readUInt32BE(20),sha256,identicalExternalFiles:files.filter(f=>f.sha256===sha256).map(f=>f.path)};});
const report={method:'Three.js 0.180.0 GLTFLoader; Node image decode skipped, browser inspector loads original embedded textures. Islands weld exact equal POSITION coordinates within each primitive, for diagnostics only; not semantic parts.',assetRoot:root,files,asset:j.asset,glbBytes:b.length,sha256:hash(b),sceneCount:j.scenes.length,nodeCount:j.nodes.length,authoredMeshes:j.meshes.length,primitiveCount:meshes.length,materialCount:j.materials.length,textureCount:j.textures.length,images,animations:j.animations??[],skins:j.skins??[],extensionsUsed:j.extensionsUsed,worldBounds:bounds(new THREE.Box3().setFromObject(gltf.scene)),totalVertices:meshes.reduce((a,m)=>a+m.vertices,0),totalTriangles:meshes.reduce((a,m)=>a+m.triangles,0),hierarchy,meshes};
fs.writeFileSync(path.join(out,'inspection-data.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify({files:files.length,authoredMeshes:report.authoredMeshes,runtimeMeshes:meshes.length,vertices:report.totalVertices,triangles:report.totalTriangles,sha256:report.sha256},null,2));
