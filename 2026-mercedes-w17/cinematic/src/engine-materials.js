// User-requested finish replacement, applied only to runtime material clones.
// Original textures/materials in the supplied GLB remain available unchanged.
export const blackChromeParts=new Set([322,334]);
export const chromeParts=new Set([307,318,271,274,277,283,289,292,59,62,66,69,72,76,80,83,86,90,93,96,100,103,106,109,113,116,120,123]);
export const chromeBrightness=.70;
export function engineMaterial(original,{node=null}={}){
 const material=original.clone();
 const black=blackChromeParts.has(node);
 if(black||chromeParts.has(node)||original.name==='Metal_Paint'){
  material.color.set(black?'#252d36':'#e5edf5');material.metalness=1;material.roughness=black?.12:.16;
  material.color.multiplyScalar(chromeBrightness);
  material.map=null;material.normalMap=null;material.roughnessMap=null;material.metalnessMap=null;
  material.emissiveMap=null;material.emissive?.set(0);material.aoMap=null;
  material.userData.finish=black?'Black chrome':'Polished chrome';
 }
 return material;
}

// Cache once after loading; a null GLTF texture otherwise fails silently.
export function auditTextures(asset){
 const materials=new Map();asset.scene.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){const index=asset.parser.associations.get(m)?.materials;if(index!=null)materials.set(index,m);}});
 const slots=[['map',m=>m.pbrMetallicRoughness?.baseColorTexture],['normalMap',m=>m.normalTexture],['roughnessMap',m=>m.pbrMetallicRoughness?.metallicRoughnessTexture],['metalnessMap',m=>m.pbrMetallicRoughness?.metallicRoughnessTexture],['aoMap',m=>m.occlusionTexture],['emissiveMap',m=>m.emissiveTexture]];
 let expected=0,loaded=0;const missing=[];
 for(const [index,material] of materials){const raw=asset.parser.json.materials[index];for(const [slot,get] of slots)if(get(raw)){expected++;if(material[slot])loaded++;else missing.push(`${raw.name}:${slot}`);}}
 return {expected,loaded,missing};
}
