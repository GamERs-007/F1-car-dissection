import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const work=path.dirname(fileURLToPath(import.meta.url)),root=path.dirname(work),asset=path.join(root,'2026-mercedes-w17');
const input=fs.readFileSync(path.join(asset,'source/f1_2026_w17.glb')),n=input.readUInt32LE(12),source=JSON.parse(input.subarray(20,20+n)),bin=input.subarray(28+n);
const rows=JSON.parse(fs.readFileSync(path.join(work,'assignments.json'))),analysis=JSON.parse(fs.readFileSync(path.join(work,'component-analysis.json')));
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const width={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},bytes={5126:4,5125:4,5123:2};
function attribute(ai){const a=source.accessors[ai],v=source.bufferViews[a.bufferView],stride=width[a.type]*bytes[a.componentType];if(v.byteStride&&v.byteStride!==stride)throw Error('Unexpected interleaving');return {a,stride,data:bin.subarray((v.byteOffset??0)+(a.byteOffset??0),(v.byteOffset??0)+(a.byteOffset??0)+a.count*stride)};}
function indexArray(p){const {a,data}=attribute(p.indices);return Array.from({length:a.count},(_,i)=>a.componentType===5123?data.readUInt16LE(i*2):data.readUInt32LE(i*4));}
const indices=source.meshes[0].primitives.map(indexArray),seen=indices.map(a=>new Uint8Array(a.length/3));
const output={asset:{version:'2.0',generator:'W17 Blender whole-patch preparation + lossless GLB packer'},extensionsUsed:source.extensionsUsed,extensionsRequired:source.extensionsRequired,scene:0,scenes:[{name:'Mercedes_W17',nodes:[0]}],nodes:[{name:'W17_Assemblies',children:[]}],meshes:[],materials:structuredClone(source.materials),textures:structuredClone(source.textures),samplers:structuredClone(source.samplers),images:[],buffers:[{byteLength:0}],bufferViews:[],accessors:[]};
let offset=0;const chunks=[];
function view(data,target){const pad=(4-offset%4)%4;if(pad){chunks.push(Buffer.alloc(pad));offset+=pad;}const i=output.bufferViews.length;output.bufferViews.push({buffer:0,byteOffset:offset,byteLength:data.length,...(target?{target}:{})});chunks.push(data);offset+=data.length;return i;}
function addAccessor(data,description,target){const bufferView=view(data,target),i=output.accessors.length;output.accessors.push({...description,bufferView,byteOffset:0});return i;}
for(const image of source.images){const v=source.bufferViews[image.bufferView],data=bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength);output.images.push({...image,bufferView:view(data)});}
const offsets={Chassis_Body:[0,0,0],Front_Wing:[0,.1,1.5],Rear_Wing:[0,.8,-1.2],Wheel_FL:[1.15,.12,.1],Wheel_FR:[-1.15,.12,.1],Wheel_RL:[1.15,.12,-.1],Wheel_RR:[-1.15,.12,-.1],Floor_Diffuser:[0,-.9,0],Halo:[0,1.5,.1],Suspension_Front:[0,.75,.4],Suspension_Rear:[0,.65,-.4],Engine_Cover:[0,1.05,-.2]};
const config={schemaVersion:1,model:'mercedes_w17_disassembled.glb',sourceSha256:hash(input),orientation:{up:'+Y',nose:'+Z',vehicleLeft:'+X',vehicleRight:'-X',leftRightEvidence:'Source material mercedes_mirror_left.005 is on +X'},units:'Original glTF units, nominal meters; no rescaling',progress:{range:[0,1],easing:'smoothstep: t*t*(3-2*t)',application:'component.position = originalTransforms.position + explodedOffset * easedProgress; assign absolutely each frame, never accumulate'},components:[]};
const map=[];let copiedAttributes=0;
for(const c of analysis){
 const componentRows=rows.filter(r=>r.component===c.name),primList=[],mapping=[];
 for(const p of [...new Set(componentRows.map(r=>r.primitive))].sort((a,b)=>a-b)){
  const faceIds=componentRows.filter(r=>r.primitive===p).flatMap(r=>r.faces).sort((a,b)=>a-b),srcPrim=source.meshes[0].primitives[p],srcIdx=indices[p];
  const used=[...new Set(faceIds.flatMap(f=>srcIdx.slice(f*3,f*3+3)))].sort((a,b)=>a-b),remap=new Map(used.map((v,i)=>[v,i])),attributes={};
  for(const f of faceIds){if(seen[p][f]++)throw Error(`Duplicate triangle P${p}/${f}`);}
  for(const [semantic,ai] of Object.entries(srcPrim.attributes)){
   const a=attribute(ai),dst=Buffer.alloc(used.length*a.stride);for(let i=0;i<used.length;i++){a.data.copy(dst,i*a.stride,used[i]*a.stride,(used[i]+1)*a.stride);copiedAttributes++;}
   const desc={componentType:a.a.componentType,count:used.length,type:a.a.type};if(a.a.normalized!==undefined)desc.normalized=a.a.normalized;
   if(semantic==='POSITION'){desc.min=[Infinity,Infinity,Infinity];desc.max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<used.length;i++)for(let k=0;k<3;k++){const v=dst.readFloatLE(i*12+k*4);desc.min[k]=Math.min(desc.min[k],v);desc.max[k]=Math.max(desc.max[k],v);}}
   attributes[semantic]=addAccessor(dst,desc,34962);
  }
  const big=used.length>65535,ib=Buffer.alloc(faceIds.length*3*(big?4:2));let ii=0;for(const f of faceIds)for(let k=0;k<3;k++){const value=remap.get(srcIdx[f*3+k]);if(big)ib.writeUInt32LE(value,ii++*4);else ib.writeUInt16LE(value,ii++*2);}
  const ia=addAccessor(ib,{componentType:big?5125:5123,count:faceIds.length*3,type:'SCALAR'},34963);
  primList.push({attributes,indices:ia,material:srcPrim.material,mode:4,extras:{sourcePrimitive:p}});mapping.push({sourcePrimitive:p,sourceFaces:faceIds,sourceVertices:used});
 }
 const groupIndex=output.nodes.length,childIndex=groupIndex+1,meshIndex=output.meshes.length;
 output.nodes[0].children.push(groupIndex);output.nodes.push({name:c.name,translation:c.pivot,children:[childIndex],extras:{assembly:c.name,triangles:c.triangles}});
 output.nodes.push({name:c.name+'__Geometry',translation:c.pivot.map(v=>-v),rotation:source.nodes[0].rotation,mesh:meshIndex});output.meshes.push({name:c.name+'__Surfaces',primitives:primList});
 config.components.push({name:c.name,originalTransforms:{position:c.pivot,quaternion:[0,0,0,1],scale:[1,1,1]},pivotPosition:c.pivot,pivotSpace:'world/model root',geometryTransform:{position:c.pivot.map(v=>-v),quaternion:source.nodes[0].rotation,scale:[1,1,1]},explodedOffset:offsets[c.name],boundingBox:c.bounds,triangles:c.triangles,preparationStatus:c.name.startsWith('Suspension')?'External arms only; kinematics and retained brake ducts require review':c.name==='Front_Wing'?'Front wing plus removable nose to existing seam':c.name==='Floor_Diffuser'?'Underfloor/diffuser; mixed sidepod junction patches retained on chassis':'Whole-patch assembly'});
 map.push({component:c.name,meshIndex,primitives:mapping});
}
for(let p=0;p<seen.length;p++)if(seen[p].some(v=>v!==1))throw Error('Missing source triangles');
const binary=Buffer.concat(chunks),bpad=Buffer.alloc((4-binary.length%4)%4);output.buffers[0].byteLength=binary.length;
const json=Buffer.from(JSON.stringify(output)),jpad=Buffer.alloc((4-json.length%4)%4,0x20),jl=json.length+jpad.length,bl=binary.length+bpad.length;
const header=Buffer.alloc(20);header.writeUInt32LE(0x46546c67);header.writeUInt32LE(2,4);header.writeUInt32LE(28+jl+bl,8);header.writeUInt32LE(jl,12);header.writeUInt32LE(0x4e4f534a,16);
const bh=Buffer.alloc(8);bh.writeUInt32LE(bl);bh.writeUInt32LE(0x004e4942,4);
const dest=path.join(asset,'public/models');fs.mkdirSync(dest,{recursive:true});const exported=Buffer.concat([header,json,jpad,bh,binary,bpad]);
fs.writeFileSync(path.join(dest,'mercedes_w17_disassembled.glb'),exported);config.modelSha256=hash(exported);fs.writeFileSync(path.join(dest,'mercedes_w17_components.json'),JSON.stringify(config,null,2));fs.writeFileSync(path.join(work,'triangle-provenance.json'),JSON.stringify(map));
fs.writeFileSync(path.join(work,'export-audit.json'),JSON.stringify({sourceSha256:hash(input),outputSha256:hash(exported),triangles:seen.reduce((s,a)=>s+a.length,0),everySourceTriangleAssignedExactlyOnce:true,attributeElementsCopiedByteForByte:copiedAttributes,materialsPreservedVerbatim:JSON.stringify(output.materials)===JSON.stringify(source.materials),texturesPreservedVerbatim:JSON.stringify(output.textures)===JSON.stringify(source.textures),embeddedImages:output.images.length,components:config.components.length,outputBytes:exported.length},null,2));
console.log(`Exported ${exported.length} bytes, ${config.components.length} assemblies. All source triangles accounted for.`);
