import test from 'node:test';
import assert from 'node:assert/strict';
import {BASE_DURATION,PLAYBACK_DURATION,playbackSegments,playbackAt,secondsAtScene,progressAtScene,studyPoint} from '../src/playback.js';
import {focusChapters} from '../src/chapters.js';
import {samplePlayback,cameraAt,sequence,BULLET_SPEED,copyAt} from '../src/timeline.js';
import {createExplainers} from '../src/explainers.js';
import {engineSequence} from '../src/engine-config.js';
const at=seconds=>samplePlayback(seconds/PLAYBACK_DURATION);
const near=(a,b,tolerance=1e-8)=>assert(Math.abs(a-b)<tolerance,`${a} ≠ ${b}`);

test('added studies preserve the opening and transition speeds on a uniform film clock',()=>{
 near(PLAYBACK_DURATION,BASE_DURATION+focusChapters.reduce((sum,c)=>sum+(c.finalHold??c.timing[1]),0)+2.2+engineSequence.completeHold+engineSequence.pistonHold+engineSequence.expandSeconds+engineSequence.restoreSeconds-(engineSequence.restored-engineSequence.complete)*BASE_DURATION);
 near(secondsAtScene(.15),BASE_DURATION*.15);
 for(const s of playbackSegments){
  if(s.kind==='move')near((s.to-s.from)/(s.end-s.start),1/BASE_DURATION);
  near(playbackAt(s.start/PLAYBACK_DURATION).p,s.from);
  near(playbackAt(s.end/PLAYBACK_DURATION).p,s.to);
 }
});

test('engine unfolds gradually over 3.2 seconds before the piston study, with smooth endpoints and reversible scrubbing',()=>{
 const opening=playbackSegments.find(s=>s.kind==='engine-expand');
 near(opening.end-opening.start,3.2);
 const cycle=u=>at(opening.start+(opening.end-opening.start)*u).engineCycle;
 near(cycle(0),0);near(cycle(.5),.5);near(cycle(1),1);
 assert(cycle(.25)>.1&&cycle(.25)<.2);assert(cycle(.75)>.8&&cycle(.75)<.9);
 const h=.001;assert(cycle(h)/h<.01);assert((1-cycle(1-h))/h<.01);
 const middle=at(opening.start+1.1);at(opening.end+1);at(0);assert.deepEqual(at(opening.start+1.1),middle);
 near(playbackSegments.find(s=>s.id==='engine-pistons').start,opening.end);
});
test('every added study holds the component camera and copy while wheels and guides keep moving',()=>{
 const guides=createExplainers(),snapshot=()=>{const out=[];guides.group.traverse(o=>out.push(...o.position.toArray()));return out;};
 for(const c of focusChapters){
  const hold=playbackSegments.find(s=>s.id===c.id);
  near(hold.end-hold.start,c.finalHold??c.timing[1]);
  const a=at(hold.start+.1),b=at(hold.end-.1);
  assert.equal(a.p,b.p);assert.equal(a.focus,c);assert(a.holding&&b.holding);
  assert.deepEqual(cameraAt(a.p),cameraAt(b.p));assert.deepEqual(copyAt(a.p),copyAt(b.p));
  assert(copyAt(a.p).opacity>.99);assert.equal(a.expansion,b.expansion);
  near(b.wheelDistance-a.wheelDistance,BULLET_SPEED*(hold.end-hold.start-.2));
  assert(b.spin>a.spin);if(c.id==='power-unit'){assert.equal(a.detail,0);assert.equal(a.engineCycle,0);}
  guides.update(a);const first=snapshot();guides.update(at(hold.start+1));assert.notDeepEqual(snapshot(),first);
  guides.update(a);assert.deepEqual(snapshot(),first);
  const middle=samplePlayback(progressAtScene(studyPoint(c)));
  assert.equal(middle.focus,c);near(middle.filmSeconds,(hold.start+hold.end)/2);
 }
 guides.dispose();
});
test('film scrubbing continuously retraces travel, including every dwell boundary',()=>{
 let previous=-1;
 for(let i=0;i<=10000;i++){const s=samplePlayback(i/10000);assert(s.wheelDistance>previous);previous=s.wheelDistance;}
 for(const segment of playbackSegments){
  for(const t of [segment.start,segment.end]){
   if(t<=0||t>=PLAYBACK_DURATION)continue;
   const a=at(t-1e-6),b=at(t+1e-6);
   assert(Math.abs(a.wheelDistance-b.wheelDistance)<.002);
   assert(Math.abs(a.lift-b.lift)<.00001);
  }
  const p=(segment.start+segment.end)/2/PLAYBACK_DURATION,s=samplePlayback(p);
  samplePlayback(1);samplePlayback(0);assert.deepEqual(samplePlayback(p),s);
  const reduced=samplePlayback(p,true);assert.equal(reduced.spin,0);assert.equal(reduced.roadDistance,0);
 }
});
test('landing has a longer eased descent, stationary framing and a grounded rolling transition',()=>{
 const start=secondsAtScene(sequence.lowerStart),end=secondsAtScene(sequence.landed);
 assert(end-start>2.5);
 const a=at(start),b=at(end);
 near(a.lift,.96);near(b.lift,0);assert.deepEqual(cameraAt(a.p),cameraAt(b.p));
 const h=.001;
 assert(Math.abs((at(start+h).lift-a.lift)/h)<.001);
 assert(Math.abs((b.lift-at(end-h).lift)/h)<.001);
 let previous=a.lift;
 for(let i=1;i<=200;i++){const s=at(start+(end-start)*i/200);assert(s.lift>=0&&s.lift<=previous);assert.equal(s.departure,0);previous=s.lift;}
 assert(at(end+.1).wheelDistance>b.wheelDistance);assert.equal(at(end+.1).lift,0);
});
