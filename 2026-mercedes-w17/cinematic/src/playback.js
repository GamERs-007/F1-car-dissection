import {focusChapters} from './chapters.js';
import {engineSequence} from './engine-config.js';

// Uniform film clock. Extend the edit with dwell segments rather than slowing
// existing camera moves. The scene coordinate preserves the authored animation.
export const BASE_DURATION=29.866666666666664;
export const LANDING_EXTRA_SECONDS=2.2;
export const studyPoint=c=>c.holdAt??c.at+(c.end-c.at)*.6;
const segments=[];
let cursor=0,seconds=0;
const add=(from,to,duration,kind,id)=>{
 segments.push({from,to,start:seconds,end:seconds+duration,kind,id});
 seconds+=duration;cursor=to;
};
for(const c of focusChapters){
 if(c.id==='power-unit'){
  add(cursor,engineSequence.complete,(engineSequence.complete-cursor)*BASE_DURATION,'move');
  add(engineSequence.complete,engineSequence.complete,engineSequence.completeHold,'study','engine-complete');
  add(cursor,engineSequence.pistons,engineSequence.expandSeconds,'engine-expand');
  add(engineSequence.pistons,engineSequence.pistons,engineSequence.pistonHold,'study','engine-pistons');
  add(cursor,engineSequence.restored,engineSequence.restoreSeconds,'engine-restore');
 }
 const p=studyPoint(c);
 if(p>cursor)add(cursor,p,(p-cursor)*BASE_DURATION,'move');
 add(p,p,c.finalHold??c.timing[1],'study',c.id);
}
add(cursor,.94,(.94-cursor)*BASE_DURATION,'move');
add(.94,.98,.04*BASE_DURATION+LANDING_EXTRA_SECONDS,'landing');
add(.98,1,.02*BASE_DURATION,'move');
export const PLAYBACK_DURATION=seconds;
export const playbackSegments=segments;
export const studyRange=id=>{const s=segments.find(s=>s.id===id);if(!s)throw Error('Unknown study '+id);return {from:(s.start+.001)/seconds,to:(s.end-.001)/seconds};};
export function playbackAt(progress){
 const filmSeconds=Math.max(0,Math.min(1,progress))*PLAYBACK_DURATION;
 const s=segments.find(s=>filmSeconds<s.end)??segments.at(-1);
 const u=Math.max(0,Math.min(1,(filmSeconds-s.start)/(s.end-s.start)));
 return {p:s.from+(s.to-s.from)*u,filmSeconds,holding:s.kind==='study'};
}
// A component link lands in the middle of its added study, so it has reading time
// remaining on resume. Other scene coordinates retain their exact authored state.
export function secondsAtScene(p){
 p=Math.max(0,Math.min(1,p));
 const hold=segments.find(s=>s.kind==='study'&&Math.abs(s.from-p)<1e-10);
 if(hold)return (hold.start+hold.end)/2;
 const s=segments.find(s=>s.to>s.from&&p>=s.from&&p<=s.to)??segments.at(-1);
 return s.start+(p-s.from)/(s.to-s.from)*(s.end-s.start);
}
export const progressAtScene=p=>secondsAtScene(p)/PLAYBACK_DURATION;
