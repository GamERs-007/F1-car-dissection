import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const bytes=fs.readFileSync(new URL('../../../v6 engine/v6_car_engine_with_engine_morethem.glb',import.meta.url));
const loader=new GLTFLoader();loader.register(()=>({name:'AUDIT_SKIP_IMAGES',loadTexture:()=>Promise.resolve(null)}));
const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');asset.scene.updateMatrixWorld(true);
let crank;asset.scene.traverse(o=>{if(asset.parser.associations.get(o)?.nodes===210)crank=o;});
const roots=[],points=[],triangles=[],weld=new Map(),meshes=[];
const find=i=>{while(roots[i]!==i){roots[i]=roots[roots[i]];i=roots[i];}return i;};
const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)roots[b]=a;};
crank.traverse(m=>{
 if(!m.isMesh)return;meshes.push(m);
 const base=roots.length,pos=m.geometry.attributes.position,index=m.geometry.index,v=new T.Vector3();
 for(let i=0;i<pos.count;i++){
  roots.push(base+i);v.fromBufferAttribute(pos,i).applyMatrix4(m.matrixWorld);points.push(v.clone());
  const key=v.toArray().map(x=>Math.round(x*1e6)).join(',');if(weld.has(key))join(base+i,weld.get(key));else weld.set(key,base+i);
 }
 for(let i=0;i<index.count;i+=3){const vertices=[index.getX(i),index.getX(i+1),index.getX(i+2)].map(x=>base+x);join(vertices[0],vertices[1]);join(vertices[1],vertices[2]);triangles.push({mesh:m.name,face:i/3,vertices});}
});
const islands=new Map();
for(const t of triangles){const id=find(t.vertices[0]);if(!islands.has(id))islands.set(id,{triangles:[],bounds:new T.Box3()});const p=islands.get(id);p.triangles.push(t);for(const v of t.vertices)p.bounds.expandByPoint(points[v]);}
// Select complete disconnected end fittings, not arbitrary cuts through journals.
const ends=[...islands.values()].filter(p=>p.bounds.min.x<1.10||p.bounds.max.x>1.49);
if(ends.length!==3)throw Error('Crankshaft end topology changed');
const patches=[];
for(const m of meshes){
 const faces=ends.flatMap(p=>p.triangles.filter(t=>t.mesh===m.name).map(t=>t.face)).sort((a,b)=>a-b),ranges=[];
 if(!faces.length)continue;
 for(const f of faces){if(ranges.length&&ranges.at(-1)[1]===f-1)ranges.at(-1)[1]=f;else ranges.push([f,f]);}
 patches.push({mesh:m.name,originalTriangles:m.geometry.index.count/3,triangles:faces.length,faceRanges:ranges});
}
const audit={node:210,triangles:patches.reduce((n,p)=>n+p.triangles,0),islands:ends.map(p=>({triangles:p.triangles.length,min:p.bounds.min.toArray(),max:p.bounds.max.toArray()})),patches};
fs.writeFileSync(new URL('../src/crank-fixed-ends.json',import.meta.url),JSON.stringify(audit,null,2)+'\n');
console.log(JSON.stringify(audit));
