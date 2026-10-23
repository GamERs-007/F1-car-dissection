// The explicit node list was audited in v6-lab.html against source-world boxes.
// Re-run inspect-v6.mjs before changing this list; do not infer membership by names.
import fs from 'node:fs';
const audit=JSON.parse(fs.readFileSync(new URL('../evidence/v6-source-audit.json',import.meta.url)));
const ids=[3,7,11,15,27,31,55,57,59,62,66,69,72,76,93,113,126,130,135,137,142,157,187,191,193,199,204,210,217,220,245,247,249,265,268,271,274,277,283,289,292,307,311,313,316,318,322,325,329,331,334,367,375];
const fixed={
 72:[[0,0,0],0,0], // Keep the central body as the spatial reference.
 367:[[-1,0,0],.30,0],375:[[1,0,0],.35,0],329:[[1,0,0],.25,0],
 313:[[0,-1,0],.32,.12],210:[[0,-1,0],.15,.36],
 245:[[0,1,0],.48,0],247:[[0,1,0],.58,0],249:[[0,1,0],.51,0],
 62:[[0,1,0],.37,.08],76:[[0,1,0],.37,.08],69:[[0,1,0],.39,.08],113:[[0,1,0],.39,.08],93:[[0,1,0],.26,.12],
 307:[[0,.8,1],.36,.15],318:[[0,.8,-1],.36,.15],
 311:[[0,.8,1],.26,.20],316:[[0,.8,-1],.26,.20],
 322:[[0,.9,-1],.57,.04],334:[[0,.9,1],.57,.04],
 130:[[0,.8,-1],.44,.12],137:[[0,.8,1],.44,.12],
 157:[[0,.9,1],.50,.08],187:[[0,.9,-1],.50,.08],
 220:[[0,.15,1],.46,.08],331:[[0,.15,-1],.46,.08],
 126:[[0,-1,0],.05,.35],59:[[0,-1,0],.09,.35],
};
const parts=audit.parts.filter(p=>ids.includes(p.node)).map(p=>{
 const bank=[3,7,11].includes(p.node)?1:[15,27,31].includes(p.node)?-1:p.center[2]>.02?1:-1;
 let [direction,distance,start]=fixed[p.node]??(p.sourceName.startsWith('Piston')?[[0,1,bank],.27,.30]:p.sourceName.startsWith('Bielle')?[[0,.8,bank],.21,.30]:[[p.center[0]>1.5?.7:0,.4,bank],.28,.12]);
 // Names confirmed against the rendered piston/rod/pulley shapes. Other names
 // intentionally retain source identifiers rather than inventing a subsystem.
 const label=p.sourceName.startsWith('Piston')?'Piston · '+p.sourceName.split('.').at(-1):p.sourceName.startsWith('Bielle')?'Connecting rod · '+p.sourceName.split('.').at(-1):p.node===367?'Gearbox housing':p.node===375?'Crank pulley':p.node===210?'Crankshaft':p.node===55?'Part · Curve.006':p.node===57?'Part · Curve.007':'Part · '+p.sourceName;
 return {id:`V6:${p.node}`,node:p.node,parentNode:2,sourceName:p.sourceName,label,initial:{position:p.position,quaternion:p.quaternion,scale:p.scale},center:p.center,direction,distance,start};
});
fs.writeFileSync(new URL('../src/engine-parts.json',import.meta.url),JSON.stringify({asset:'v6_car_engine_with_engine_morethem.glb',rootNode:2,selection:'Assembled source cluster only; surrounding laid-out duplicates excluded',parts},null,2)+'\n');
console.log(`Mapped ${parts.length} physical parents, ${audit.parts.filter(p=>ids.includes(p.node)).reduce((n,p)=>n+p.meshes.length,0)} material meshes`);
