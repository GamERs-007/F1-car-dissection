import test from 'node:test';
import assert from 'node:assert/strict';
import {createScrollController,chapterDuration,PLAYBACK_DURATION} from '../src/scroll-controller.js';
function setup(options={}){
 const events=new Map(),docEvents=new Map(),runs=[],states=[];
 const host={innerHeight:1000,scrollY:0,document:{hidden:false,documentElement:{scrollHeight:11000},addEventListener:(k,f)=>docEvents.set(k,f),removeEventListener:k=>docEvents.delete(k)},addEventListener:(k,f)=>events.set(k,f),removeEventListener:k=>events.delete(k),scrollTo({top}){this.scrollY=top;}};
 const animate=(target,options)=>{const run={target,options,killed:false,kill(){this.killed=true;}};runs.push(run);return run;};
 return {host,events,docEvents,runs,states,control:createScrollController(v=>states.push(v),{host,animate,update(){},...options})};
}
test('chapters use one replaceable scroll transport with a distance-aware 1–3 second duration',()=>{
 const {host,runs,control}=setup();
 for(const p of [0,.152,.252,.452,.852,.452,.252,.152,0]){host.scrollY=3000;control.go(p);const run=runs.at(-1);assert.equal(run.target,host);assert.equal(run.options.scrollTo.y(),p*10000);assert(run.options.duration>=1&&run.options.duration<=3);assert.equal(typeof run.options.ease,'function');assert(Math.abs(run.options.ease(0))<1e-9);assert(Math.abs(run.options.ease(1)-1)<1e-9);}
 assert(runs.slice(0,-1).every(t=>t.killed));assert(chapterDuration(0,1)>chapterDuration(.1,.2));control.destroy();
});
test('pause/resume and manual interrupts preserve the exact native scroll position',()=>{
 const {host,runs,events,states,control}=setup();host.scrollY=2350;control.play();assert.equal(runs.at(-1).options.ease,'none');assert.equal(runs.at(-1).options.duration,(1-.235)*PLAYBACK_DURATION/1.5);
 host.scrollY=4234;control.pause();assert.equal(host.scrollY,4234);assert.equal(states.at(-1),false);
 control.play();assert.equal(runs.at(-1).options.duration,(1-.4234)*PLAYBACK_DURATION/1.5);
 for(const type of ['wheel','touchstart','pointerdown','keydown']){control.play();events.get(type)({type,key:'ArrowDown'});assert(runs.at(-1).killed);assert.equal(host.scrollY,4234);}
 control.play();events.get('pointerdown')({type:'pointerdown',target:{closest:()=>true}});assert.equal(runs.at(-1).killed,false);control.pause();
 control.play();events.get('touchstart')({type:'touchstart',target:{closest:()=>true}});assert.equal(runs.at(-1).killed,false);control.pause();
 control.destroy();assert.equal(events.size,0);
});
test('scrubbing cancels navigation; hidden tabs pause; replay restarts and resizes cancel safely',()=>{
 const {host,runs,events,docEvents,control,states}=setup();control.go(.85);control.seek(.64);assert(runs.at(-1).killed);assert.equal(host.scrollY,6400);
 control.play();host.document.hidden=true;docEvents.get('visibilitychange')();assert.equal(states.at(-1),false);
 host.scrollY=10000;control.play();assert.equal(host.scrollY,0);assert.equal(runs.at(-1).options.duration,PLAYBACK_DURATION/1.5);
 events.get('resize')();assert(runs.at(-1).killed);control.destroy();assert.equal(docEvents.size,0);
});

test('resizing preserves canonical scene progress as document dimensions change',()=>{
 const {host,events,control}=setup({readProgress:()=>.64});host.scrollY=6400;
 control.play();host.document.documentElement.scrollHeight=21000;host.innerHeight=800;
 events.get('resize')();assert.equal(host.scrollY,.64*20200);control.destroy();
});

test('piston study navigates and then continues through reassembly on the same scroll transport',()=>{
 const {host,runs,events,control}=setup();control.study(.8,1);
 const navigation=runs.at(-1);assert.equal(navigation.options.scrollTo.y(),8000);host.scrollY=8000;navigation.options.onComplete();
 const playing=runs.at(-1);assert.notEqual(playing,navigation);assert.equal(playing.target,host);assert.equal(playing.options.scrollTo.y(),10000);assert.equal(playing.options.ease,'none');
 host.scrollY=8500;events.get('wheel')({type:'wheel'});assert(playing.killed);assert.equal(host.scrollY,8500);control.destroy();
});
