import * as T from 'three';
import {focusChapters} from './chapters.js';
import {focusStrength} from './timeline.js';
import {secondsAtScene} from './playback.js';
import {suspensionTraces} from './surface-guides.js';

// Smooth streamlines broadly follow each component, with a little clearance.
// Physical parts own the groups, so the flow stays aligned during dissection.
export function createExplainers(rig=null){
 const group=new T.Group(),studies=[],attachments=[];
 const beadGeometry=new T.SphereGeometry(.012,8,6);
 for(const c of focusChapters){
  const study=new T.Group(),paths=[],anchors=[];
  const material=new T.LineBasicMaterial({color:c.visual==='heat'?0xffa66c:0x00d2be,transparent:true,opacity:0,depthWrite:false});
  const trailMaterial=new T.LineBasicMaterial({color:0x9bfff0,transparent:true,opacity:0,depthWrite:false});
  const beadMaterial=new T.MeshBasicMaterial({color:0xbaffef,transparent:true,opacity:0,depthWrite:false});
  const anchor=parent=>{const a=new T.Group();a.name='Guide_'+c.id;a.visible=false;parent.add(a);anchors.push(a);if(parent!==group)attachments.push(a);return a;};
  const add=(points,parent=study)=>{
   if(points.length<2)return;
   points=points.map(p=>p.isVector3?p:new T.Vector3(...p));
   const path=new T.CatmullRomCurve3(points,false,'centripetal');
   const samples=path.getSpacedPoints(128),geometry=new T.BufferGeometry().setFromPoints(samples);
   const line=new T.Line(geometry,material),trail=new T.Line(geometry.clone(),trailMaterial),bead=new T.Mesh(beadGeometry,beadMaterial);
   parent.updateWorldMatrix(true,false);const scale=parent.getWorldScale(new T.Vector3());bead.scale.setScalar(1/Math.max(.0001,scale.x));
   line.raycast=trail.raycast=bead.raycast=()=>{};line.renderOrder=10;trail.renderOrder=11;bead.renderOrder=12;parent.add(line,trail,bead);paths.push({samples,bead,trail,parent});
  };
  const modelPoints=(parent,points)=>{parent.updateWorldMatrix(true,false);return points.map(p=>parent.worldToLocal(new T.Vector3(...p)));};
  let fitted=false;
  if(rig&&c.id==='suspension'){
   for(const {g,side} of rig.suspension){if(side===0)continue;const a=anchor(g);for(const trace of suspensionTraces(g)){const controls=[trace[0].clone().add(new T.Vector3(0,.025,0)),trace[Math.round((trace.length-1)/2)].clone().add(new T.Vector3(0,.06,0)),trace.at(-1).clone().add(new T.Vector3(0,.025,0))];add(controls,a);}}
   fitted=true;
  }else if(rig&&c.id==='halo'){
   const parent=rig.carScene.getObjectByName('Halo'),a=anchor(parent);
   add(modelPoints(parent,[[-.39,.88,-.20],[-.40,1.00,.20],[-.25,1.02,.66],[0,1.03,.87],[.25,1.02,.66],[.40,1.00,.20],[.39,.88,-.20]]),a);
   add(modelPoints(parent,[[0,.67,.96],[0,.86,.91],[0,1.02,.82],[0,1.06,.44]]),a);fitted=true;
  }else if(rig&&c.id==='monocoque'){
   const parent=rig.carScene.getObjectByName('Chassis_Body'),a=anchor(parent);
   for(const side of [-1,1])add(modelPoints(parent,[[side*.30,.79,-.35],[side*.40,.79,.15],[side*.39,.71,.70],[side*.25,.64,1.32],[side*.16,.57,1.52]]),a);
   add(modelPoints(parent,[[-.36,.73,-.26],[0,.94,-.43],[.36,.73,-.26]]),a);fitted=true;
  }else if(rig&&c.id==='engine-cover'){
   const parent=rig.carScene.getObjectByName('Engine_Cover'),a=anchor(parent);
   for(const side of [-1,0,1])add(modelPoints(parent,[[side*.22,1.08,-.48],[side*.23,1.01,-.82],[side*.18,.89,-1.20],[side*.09,.74,-1.60],[side*.03,.65,-1.92]]),a);fitted=true;
  }else if(rig&&c.id==='power-unit'){
   const a=anchor(rig.v6.source.getObjectByName('RootNode'));
   for(const side of [-1,1])add([[108,44,side*14],[116,63,side*25],[134,68,side*27],[152,62,side*23],[162,49,side*14]],a);
   add([[35,53,2],[70,60,2],[107,68,2],[137,71,2],[167,59,2]],a);fitted=true;
  }
  if(!fitted){
   group.add(study);study.position.fromArray(c.point);anchors.push(study);
   if(c.visual==='airflow'){
    const length=c.id==='floor'?2.2:.95;for(const x of [-.6,0,.6])add([[x,.32,length],[x,.12,length*.3],[x,.06,-length*.25],[x,.4,-length]]);
   }else if(c.visual==='rotation'||c.visual==='heat'){
    for(let j=0;j<(c.visual==='heat'?3:1);j++){const radius=c.visual==='heat'?.2+j*.09:.43;add(Array.from({length:25},(_,i)=>[.08,Math.cos(i/24*Math.PI*1.8)*radius,Math.sin(i/24*Math.PI*1.8)*radius]));}
   }else{
    add([[.8,.7,0],[.7,.25,0],[.3,.05,0],[-.3,.05,0]]);add([[-.8,.7,0],[-.7,.25,0],[-.3,.05,0],[.3,.05,0]]);
   }
  }
  if(fitted)material.depthTest=trailMaterial.depthTest=beadMaterial.depthTest=false;
  studies.push({c,anchors,material,trailMaterial,beadMaterial,paths,fitted});
 }
 return {group,studies,update(s){
  for(const {c,anchors,material,trailMaterial,beadMaterial,paths,fitted} of studies){
   const visible=s.focus===c;for(const anchor of anchors)anchor.visible=visible;if(!visible)continue;
   const strength=focusStrength(s.p,c);material.opacity=(fitted?.22:.3)*strength;trailMaterial.opacity=.88*strength;beadMaterial.opacity=.95*strength;
   const phase=s.reduced?0:(s.filmSeconds-secondsAtScene(c.at))*.22;
   paths.forEach(({samples,bead,trail},i)=>{
    const t=((phase+i*.19)%1+1)%1,f=t*(samples.length-1),at=Math.min(samples.length-2,Math.floor(f));
    bead.position.copy(samples[at]).lerp(samples[at+1],f-at);
    trail.geometry.setDrawRange(Math.max(0,at-20),Math.min(21,at+1));
   });
  }
 },dispose(){
  for(const s of studies){for(const {trail} of s.paths)trail.geometry.dispose();for(const a of s.anchors)a.traverse(o=>{if(o.isLine&&o.material===s.material)o.geometry.dispose();});s.material.dispose();s.trailMaterial.dispose();s.beadMaterial.dispose();}
  for(const a of attachments)a.removeFromParent();beadGeometry.dispose();
 }};
}
