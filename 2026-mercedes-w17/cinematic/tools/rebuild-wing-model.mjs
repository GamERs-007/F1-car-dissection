import fs from 'node:fs';
import crypto from 'node:crypto';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const read=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url)));
const write=(p,data)=>fs.writeFileSync(new URL(p,import.meta.url),JSON.stringify(data,null,2)+'\n');
const ids=['p2_i164','p2_i165','p3_i49','p3_i50','p4_i110','p4_i111','p3_i95','p3_i100','p3_i161','p3_i162','p3_i163','p3_i164'];
const provenance=read('../../../preparation/triangle-provenance.json');
const body=provenance.find(p=>p.component==='Chassis_Body');
const baselinePath='../evidence/wing-model-rebuild-baseline.json';
if(process.argv[2]==='--prepare'){
 const assignments=read('../../../preparation/assignments.json');
 if(ids.some(id=>assignments.find(p=>p.id===id)?.component!=='Chassis_Body'))throw Error('Model already regrouped; do not overwrite the baseline');
 const mask=read('../src/legacy-wheel-shells.json'),p=body.primitives.find(p=>p.sourcePrimitive===4),sourceFaces=[];
 for(const [a,b] of mask.faceRanges)for(let f=a;f<=b;f++)sourceFaces.push(p.sourceFaces[f]);
 write(baselinePath,{ids,legacyMask:mask,legacySourceFaces:sourceFaces,bodyTriangles:124629,wingTriangles:16720});
 const overrides=read('../../../preparation/overrides.json');for(const id of ids)overrides[id]='Rear_Wing';
 write('../../../preparation/overrides.json',overrides);
 console.log('Recorded source face provenance and merged 12 whole-patch overrides.');
}else if(process.argv[2]==='--finalize'){
 const baseline=read(baselinePath),assignments=read('../../../preparation/assignments.json');
 const rows=assignments.filter(p=>ids.includes(p.id));
 if(rows.length!==ids.length||rows.some(p=>p.component!=='Rear_Wing'))throw Error('Prepared assignments did not move all selected fittings');
 const ranges=faces=>{const out=[];for(const f of faces){if(out.length&&out.at(-1)[1]===f-1)out.at(-1)[1]=f;else out.push([f,f]);}return out;};
 const skip=new Set(baseline.legacySourceFaces),p=body.primitives.find(p=>p.sourcePrimitive===4);
 const maskFaces=p.sourceFaces.flatMap((f,i)=>skip.has(f)?[i]:[]);
 if(maskFaces.length!==skip.size)throw Error('Wheel-shell mask changed during regrouping');
 write('../src/legacy-wheel-shells.json',{...baseline.legacyMask,originalTriangles:p.sourceFaces.length,faceRanges:ranges(maskFaces)});
 const wing=provenance.find(p=>p.component==='Rear_Wing'),patches=[];
 const bytes=fs.readFileSync(new URL('../../public/models/mercedes_w17_disassembled.glb',import.meta.url));
 const modelSha256=crypto.createHash('sha256').update(bytes).digest('hex');
 const loader=new GLTFLoader();loader.register(()=>({name:'AUDIT_SKIP_IMAGES',loadTexture:()=>Promise.resolve(null)}));
 const asset=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');asset.scene.updateMatrixWorld(true);
 for(const primitive of [...new Set(rows.map(p=>p.primitive))]){
  const selected=rows.filter(p=>p.primitive===primitive),sourceFaces=selected.flatMap(p=>p.faces).sort((a,b)=>a-b),wanted=new Set(sourceFaces);
  const pi=wing.primitives.findIndex(p=>p.sourcePrimitive===primitive),mapping=wing.primitives[pi];
  if(body.primitives.find(p=>p.sourcePrimitive===primitive).sourceFaces.some(f=>wanted.has(f)))throw Error('Fitting triangles remain in Body');
  const preparedFaces=mapping.sourceFaces.flatMap((f,i)=>wanted.has(f)?[i]:[]);
  if(preparedFaces.length!==wanted.size)throw Error('Fitting triangles missing from Rear_Wing');
  let mesh;asset.scene.traverse(m=>{const a=asset.parser.associations.get(m);if(m.isMesh&&a?.meshes===wing.meshIndex&&a?.primitives===pi)mesh=m;});
  patches.push({mesh:mesh.name,material:mesh.material.name,sourcePrimitive:primitive,sourceIslands:selected.map(p=>p.id),sourceFaces,triangles:preparedFaces.length,faceRanges:ranges(preparedFaces)});
 }
 const config=read('../../public/models/mercedes_w17_components.json');
 const audit={from:'Chassis_Body',to:'Rear_Wing',modelSha256,sourceIslands:ids,triangles:rows.reduce((n,p)=>n+p.triangles,0),bodyTriangles:config.components.find(c=>c.name==='Chassis_Body').triangles,wingTriangles:config.components.find(c=>c.name==='Rear_Wing').triangles,patches};
 write('../src/rear-wing-supports.json',audit);write('../evidence/rear-wing-model-verification.json',audit);
 console.log(JSON.stringify({modelSha256,bodyTriangles:audit.bodyTriangles,wingTriangles:audit.wingTriangles,movedTriangles:audit.triangles}));
}else throw Error('Use --prepare before the Blender rebuild, then --finalize after export.');
