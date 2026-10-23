import {smooth,powerUnitRootPosition,offsetPosition} from '../../preview/power-unit-motion.js';
export {smooth,powerUnitRootPosition,offsetPosition};
export const clamp=t=>Math.max(0,Math.min(1,t));
export const ramp=(p,a,b)=>smooth((p-a)/(b-a));
export const mix=(a,b,t)=>a+(b-a)*t;
import {focusChapters,chapterNav} from './chapters.js';
import {BASE_DURATION,playbackAt,secondsAtScene} from './playback.js';
import {engineSequence} from './engine-config.js';
export {focusChapters,chapterNav};
export const focusStrength=(p,c)=>c?Math.min(ramp(p,c.at,c.at+(c.end-c.at)*.28),1-ramp(p,Math.max(c.at+(c.end-c.at)*.86,c.holdAt??0),c.end)):0;
export const engineFraming=p=>ramp(p,.775,.802)*(1-ramp(p,.85,.885));
// Integral of 1 - smoothstep: positive through slow motion, zero derivative at rest.
export function travel(p){if(p<=.15)return clamp(p/.2);if(p<.25){const u=(p-.15)/.1;return .75+.5*(u-u*u*u+.5*u*u*u*u);}return 1;}
export const sequence={assembled:.93,lowerStart:.94,landed:.972,launch:.98};
export const WHEEL_RADIUS=.3542;
export const BULLET_SPEED=.4;
const smoother=t=>{t=clamp(t);return t*t*t*(t*(t*6-15)+10);};
export function samplePlayback(progress,reduced=false){const frame=playbackAt(progress);return {...sample(frame.p,reduced,frame.filmSeconds),holding:frame.holding};}
export function sample(p,reduced=false,filmSeconds=secondsAtScene(p)){
 p=clamp(p);const expansion=p<.25?0:p<.45?clamp((p-.25)/.2):p<.875?1:1-ramp(p,.875,sequence.assembled);
 const detail=0;
 const engineCycle=ramp(p,engineSequence.complete,engineSequence.pistons)*(1-ramp(p,engineSequence.restoreStart,engineSequence.restored));
 // Start the mechanism with the opening, independently of cover displacement.
 // Angle zero is the authored rest pose, so activation stays continuous.
 const engineMotion=p>engineSequence.complete?1-ramp(p,engineSequence.restoreStart,engineSequence.restored):0;
 const crankAngle=reduced?0:Math.max(0,filmSeconds-(secondsAtScene(engineSequence.complete)+engineSequence.completeHold/2))*Math.PI*2;
 const studio=ramp(p,.15,.25)*(1-ramp(p,.93,.95));
 const lift=reduced?0:.96*ramp(p,.15,.25)*(1-smoother((p-sequence.lowerStart)/(sequence.landed-sequence.lowerStart)));
 const launch=clamp((p-sequence.launch)/(1-sequence.launch));
 const raceSpeed=(1-ramp(p,.15,.25))+.02*ramp(p,.15,.25)+launch*launch;
 const departure=reduced?0:launch**3*110;
 // Integrate the slow-motion speed on the same film clock, including dwell time.
 // Smooth entry adds no speed discontinuity; even fully exploded wheels roll.
 const u=clamp((p-.15)/.1),entry=.1*BASE_DURATION;
 const slowSeconds=p<.25?entry*(u*u*u-.5*u*u*u*u):entry*.5+filmSeconds-secondsAtScene(.25);
 const roadDistance=reduced?0:travel(p)*111.2+BULLET_SPEED*slowSeconds;
 const wheelDistance=roadDistance+departure;
 const active=focusChapters.findIndex(c=>p>=c.at&&p<c.end);
 let stage=p<.15?0:p<.25?1:p<.45?2:p<.85?3:4;
 return {p,filmSeconds,expansion,detail,engineCycle,engineMotion,crankAngle,studio,lift,raceSpeed:reduced?0:raceSpeed,departure,active,stage,spin:wheelDistance/WHEEL_RADIUS,wheelDistance,roadDistance,scan:reduced?0:Math.sin(Math.PI*clamp((p-.15)/.1)),focus:active>=0?focusChapters[active]:null};
}
const cameraKeys=[
 [0,[6.8,1.9,8.4],[-.6,1.1,0],38],
 [.15,[5.7,1.55,7.1],[-.6,.8,0],38],
 [.25,[6.8,3.9,8.4],[-.5,.8,.1],40],
 [.44,[8.4,4.7,10.6],[.1,1,0],43],
 ...focusChapters.flatMap(c=>[
  [c.at+(c.end-c.at)*.38,c.camera,c.target,c.fov],
  [Math.max(c.at+(c.end-c.at)*.82,c.holdAt??0),c.camera,c.target,c.fov],
 ]),
 [.88,[8.4,4.7,10.6],[.1,1,0],43],
 [.93,[6.8,2.3,8.4],[-.6,.9,0],38],
 [.98,[6.8,2.3,8.4],[-.6,.9,0],38],
 [1,[8,3.3,-5.8],[0,.5,0],44],
];
export function cameraAt(p,reduced=false,aspect=1.7){
 if(reduced){const f=aspect<1?.94/Math.max(.48,aspect):1;return {position:[6,.7+4.3*f,12*f],target:[0,aspect<1?1.4:.7,0],fov:43};}
 let i=0;while(i<cameraKeys.length-2&&p>cameraKeys[i+1][0])i++;
 const [a,ap,at,af]=cameraKeys[i],[b,bp,bt,bf]=cameraKeys[i+1],t=ramp(p,a,b),target=at.map((v,j)=>mix(v,bt[j],t));
 // Orbit around the moving target instead of cutting through the car on reversals.
 const yawA=Math.atan2(ap[0]-at[0],ap[2]-at[2]),yawB=Math.atan2(bp[0]-bt[0],bp[2]-bt[2]);
 const delta=Math.atan2(Math.sin(yawB-yawA),Math.cos(yawB-yawA)),yaw=yawA+delta*t;
 const radius=mix(Math.hypot(ap[0]-at[0],ap[2]-at[2]),Math.hypot(bp[0]-bt[0],bp[2]-bt[2]),t);
 const position=[target[0]+Math.sin(yaw)*radius,mix(ap[1],bp[1],t),target[2]+Math.cos(yaw)*radius];
 target[2]+=sample(p).departure*.8;
 if(aspect<1){const f=.94/Math.max(.48,aspect);for(let j=0;j<3;j++)position[j]=target[j]+(position[j]-target[j])*f;target[1]+=.7;
  // The portrait pullback must remain inside the circuit barriers/grandstands.
  const racing=(1-ramp(p,.15,.25))+ramp(p,.955,1);position[0]=mix(position[0],Math.min(6,position[0]),racing);
 }
 // Give the taller V6 layers their own portrait framing within the existing
 // camera track. Keep the whole study below the copy and above the transport.
 if(aspect<1.25){const engine=engineFraming(p);if(aspect<1)target[1]-=.7*engine;for(let j=0;j<3;j++)position[j]=target[j]+(position[j]-target[j])*(1+.30*engine);}
 return {position,target,fov:mix(af,bf,t)};
}
export function copyAt(p){
 const s=sample(p);if(s.focus)return {title:[s.focus.name],eyebrow:s.focus.system,description:s.focus.description,note:s.focus.note,callout:s.focus.callout,kind:'focus',opacity:focusStrength(p,s.focus)};
 if(p<.15)return {eyebrow:'W17 / AN ENGINEERING STUDY',title:['Mercedes-AMG','F1 W17'],description:'A machine defined by the details.',kind:'hero',opacity:1-ramp(p,.12,.15)};
 if(p<.25)return {eyebrow:'FROM MOTION TO MEANING',title:['BEYOND THE','BODYWORK.'],description:'Slow it down. Look closer.',kind:'chapter',opacity:Math.min(ramp(p,.15,.165),1-ramp(p,.235,.25))};
 if(p<.45)return {eyebrow:'THE ARCHITECTURE OF SPEED',title:['EVERY PART','MATTERS.'],description:'One machine. A system of extraordinary precision.',kind:'chapter',opacity:Math.min(ramp(p,.25,.265),1-ramp(p,.43,.45))};
 return {eyebrow:'BACK TO THE CIRCUIT',title:['PRECISION','IN MOTION.'],description:'Every component. One purpose.',kind:'final',opacity:ramp(p,.87,.90)};
}


