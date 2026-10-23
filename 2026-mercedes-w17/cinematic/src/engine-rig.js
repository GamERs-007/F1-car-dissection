import * as T from 'three';
import mapping from './engine-parts.json' with {type:'json'};
import {engineInstallation as installation,engineInteractive,engineStationaryNodes,engineRemovedNodes} from './engine-config.js';
import {ramp,focusStrength} from './timeline.js';
import {engineMaterial,auditTextures} from './engine-materials.js';
import {createPistonMotion,movingEngineNodes} from './piston-motion.js';

export function createEngineRig(asset){
 const source=asset.scene.clone(true),originals=[],clones=[];
 asset.scene.traverse(o=>originals.push(o));source.traverse(o=>clones.push(o));
 const nodes=new Map(clones.map((o,i)=>[asset.parser.associations.get(originals[i])?.nodes,o]));
 const sourceRoot=nodes.get(mapping.rootNode);if(!sourceRoot)throw Error('V6 source RootNode missing');
 const installed=mapping.parts.filter(p=>!engineRemovedNodes.has(p.node));
 const included=new Set(installed.map(p=>p.node));
 // Exclude the separate display layout without editing geometry or reparenting
 // any physical part. The original Sketchfab/FBX/RootNode hierarchy survives.
 for(const [index,node] of nodes)if(node?.parent===sourceRoot){node.visible=included.has(index);if(!node.visible)node.traverse(m=>{if(m.isMesh)m.raycast=()=>{};});}
 const root=new T.Group();root.name='V6_Installation';root.position.fromArray(installation.position);
 const alignment=new T.Group();alignment.name='V6_Alignment';alignment.rotation.fromArray([...installation.rotation,'XYZ']);alignment.scale.setScalar(installation.scale);
 const anchor=new T.Group();anchor.name='V6_SourceAnchor';anchor.position.fromArray(installation.sourceAnchor).negate();
 root.add(alignment);alignment.add(anchor);anchor.add(source);root.updateMatrixWorld(true);
 const materials=[],color=new T.Color(0x00d2be),hoverGlow=color.clone().multiplyScalar(.25),selectedGlow=color.clone().multiplyScalar(.14);
 const inverseSource=source.matrixWorld.clone().invert();
 const pistons=createPistonMotion(nodes);
 const parts=installed.map(config=>{
  const node=nodes.get(config.node);if(!node||node.parent!==sourceRoot)throw Error('V6 physical parent mismatch: '+config.sourceName);
  const base={position:node.position.clone(),quaternion:node.quaternion.clone(),scale:node.scale.clone()};
  const relative=new T.Matrix4().multiplyMatrices(inverseSource,node.parent.matrixWorld);
  // Translate a SOURCE-SCENE vector into this parent's coordinates, retaining
  // nested rotation and .01 / 100 scales. A direction transform would lose scale.
  const delta=new T.Vector3(...config.direction).normalize().multiplyScalar(config.distance*installation.explosionScale).applyMatrix3(new T.Matrix3().setFromMatrix4(relative).invert());
  const ownMaterials=new Map(),meshes=[];
  node.traverse(m=>{if(!m.isMesh)return;meshes.push(m);m.castShadow=m.receiveShadow=true;
   m.userData.part='Power_Unit';m.userData.enginePart=config.id;m.userData.partLabel=config.label;
   const clone=material=>{if(!ownMaterials.has(material)){const own=engineMaterial(material,{node:config.node}),fade=config.node===72||engineStationaryNodes.has(config.node);if(fade)own.transparent=true;ownMaterials.set(material,own);materials.push({material:own,base:own.color.clone(),emissive:own.emissive?.clone(),id:config.id,fade,opacity:own.opacity,depthWrite:own.depthWrite});}return ownMaterials.get(material);};
   m.material=Array.isArray(m.material)?m.material.map(clone):clone(m.material);
  });
  return {g:node,c:config,base,delta,meshes};
 });
 const blockRaycasts=parts.filter(p=>p.c.node===72||engineStationaryNodes.has(p.c.node)).flatMap(p=>p.meshes.map(mesh=>({mesh,raycast:mesh.raycast}))),ignoreRaycast=()=>{};
 return {scene:root,root,source,parts,materials,pistons,textureAudit:auditTextures(asset),
  apply(state,hover,selected){
   const clear=ramp(state.expansion,.45,.60),extract=ramp(state.expansion,.60,.80);
   root.position.fromArray(installation.position);root.position.x+=installation.extraction[0]*extract;root.position.y+=.22*clear+(installation.extraction[1]-.22)*extract;root.position.z+=installation.extraction[2]*extract;
   const cycle=state.engineCycle??0;
   for(const {g,c,base,delta} of parts){const t=engineStationaryNodes.has(c.node)?0:Math.max(ramp(state.detail,c.start,1),movingEngineNodes.has(c.node)?0:cycle);g.position.copy(base.position).addScaledVector(delta,t);g.quaternion.copy(base.quaternion);g.scale.copy(base.scale);}
   pistons.fixedEnds.quaternion.identity();
   const motion=state.engineMotion??cycle;
   if(motion>0)pistons.apply(state.crankAngle,motion);
   for(const {mesh,raycast} of blockRaycasts){mesh.raycast=cycle>.02?ignoreRaycast:raycast;mesh.castShadow=cycle<.02;}
   const interactive=engineInteractive(state.p),focus=state.focus,strength=focusStrength(state.p,focus),dim=focus&&!focus.parts.includes('Power_Unit')?1-.78*strength:1;
   for(const {material,base,emissive,id,fade,opacity,depthWrite} of materials){const active=interactive&&(hover===id||selected===id);material.color.copy(base).multiplyScalar(dim);if(fade){material.opacity=opacity*(1-.96*cycle);material.depthWrite=cycle===0?depthWrite:false;}if(active)material.color.lerp(color,.16);if(emissive){material.emissive.copy(emissive).multiplyScalar(dim);if(active)material.emissive.add(hover===id?hoverGlow:selectedGlow);}}
  },
  dispose(){pistons.dispose();for(const {material} of materials)material.dispose();},
 };
}
