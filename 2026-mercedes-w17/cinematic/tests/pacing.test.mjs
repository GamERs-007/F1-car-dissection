import test from 'node:test';
import assert from 'node:assert/strict';
import {chapters,chapterNav,chapterAt,focusChapters} from '../src/chapters.js';
import {createPacing,pacing} from '../src/pacing.js';
import {cameraAt,sample,copyAt} from '../src/timeline.js';
import {createExplainers} from '../src/explainers.js';

test('timing map is monotone, invertible, bounded and adjustable without changing scene states',()=>{
 assert.equal(pacing.duration,112);
 for(const duration of [90,112,120]){
  const map=createPacing(chapters,duration);let last=-1;
  for(let i=0;i<=4000;i++){
   const t=i/4000*duration,p=map.progressAt(t);
   assert(p>last);assert(p>=0&&p<=1);assert(Math.abs(map.timeAt(p)-t)<1e-8);last=p;
  }
 }
});
test('racing and transitions are faster than studies, with continuous beat velocity',()=>{
 const speed=t=>(pacing.progressAt(t+.00001)-pacing.progressAt(t-.00001))/.00002;
 for(const c of focusChapters){
  const span=c.end-c.at,study=pacing.timeAt(c.at+span*.6),arrive=pacing.timeAt(c.at+span*.15);
  assert(speed(arrive)>speed(study)*1.5,c.name);assert(speed(2)>speed(study)*2,c.name);
 }
 for(const k of pacing.knots.slice(1,-1))assert(Math.abs(speed(k.t-.0001)-speed(k.t+.0001))<.0001);
});
test('all chapter links resolve to their own section and every camera has a study hold',()=>{
 assert.equal(chapterNav.length,chapters.length);
 chapterNav.forEach((c,i)=>{assert.equal(chapterAt(c.p),i);assert(copyAt(c.p).opacity>.9,c.name);});
 for(const c of focusChapters){
  const a=c.at+(c.end-c.at)*.45,b=c.at+(c.end-c.at)*.75;
  const va=cameraAt(a),vb=cameraAt(b);
  va.position.forEach((v,i)=>assert(Math.abs(v-vb.position[i])<1e-10,c.name));
  assert.deepEqual(va.target,vb.target);assert.equal(va.fov,vb.fov);
 }
});
test('technical guides freeze and exactly retrace their phase after reverse navigation',()=>{
 const guides=createExplainers();
 const snapshot=()=>{const out=[];guides.group.traverse(o=>out.push(...o.position.toArray(),Number(o.visible)));return out;};
 for(const c of focusChapters){
  const p=(c.at+c.end)/2;guides.update(sample(p));const before=snapshot();
  guides.update(sample(p));assert.deepEqual(snapshot(),before);
  guides.update(sample(1));guides.update(sample(0));guides.update(sample(p));assert.deepEqual(snapshot(),before);
 }
 guides.dispose();
});
