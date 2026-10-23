import fs from 'node:fs';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
const path=new URL('../../../v6 engine/v6_car_engine_with_engine_morethem.glb',import.meta.url);
const bytes=fs.readFileSync(path),json=JSON.parse(bytes.subarray(20,20+bytes.readUInt32LE(12)));
const loader=new GLTFLoader();loader.register(()=>({name:'AUDIT_SKIP_IMAGES',loadTexture:()=>Promise.resolve(null)}));
const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
gltf.scene.updateMatrixWorld(true);
const root=gltf.scene.getObjectByName('RootNode');
const round=a=>a.map(x=>+x.toFixed(5));
const parts=root.children.map(o=>{
 const b=new T.Box3().setFromObject(o),meshes=[];o.traverse(m=>{if(m.isMesh)meshes.push({name:m.name,triangles:m.geometry.index?.count/3,material:m.material.name});});
 return {node:gltf.parser.associations.get(o)?.nodes,name:o.name,sourceName:json.nodes[gltf.parser.associations.get(o)?.nodes]?.name,center:round(b.getCenter(new T.Vector3()).toArray()),size:round(b.getSize(new T.Vector3()).toArray()),min:round(b.min.toArray()),max:round(b.max.toArray()),position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray(),meshes};
});
fs.writeFileSync(new URL('../evidence/v6-source-audit.json',import.meta.url),JSON.stringify({assetBytes:bytes.length,nodes:json.nodes.length,meshes:json.meshes.length,materials:json.materials.length,animations:gltf.animations.length,bounds:new T.Box3().setFromObject(gltf.scene),parts},null,2));
console.table(parts.map(({node,sourceName,center,size,meshes})=>({node,name:sourceName,center:center.join(','),size:size.join(','),meshes:meshes.length})));
