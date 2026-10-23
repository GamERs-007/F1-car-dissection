import {gsap} from 'gsap';
import {ScrollToPlugin} from 'gsap/ScrollToPlugin.js';
import {ScrollTrigger} from 'gsap/ScrollTrigger.js';
import {clamp} from './timeline.js';
import {PLAYBACK_DURATION} from './playback.js';
export {PLAYBACK_DURATION};
export const PLAYBACK_RATE=1.5;
gsap.registerPlugin(ScrollToPlugin,ScrollTrigger);
export const chapterDuration=(from,to)=>1+2*Math.sqrt(Math.abs(clamp(to)-clamp(from)));
const navigationEase=gsap.parseEase('power2.inOut');

// All transports move the native scroll position. Only ScrollTrigger writes scene progress.
export function createScrollController(onPlaying,{host=window,animate=gsap.to,update=()=>ScrollTrigger.update(),readProgress=null}={}){
 let tween=null,playing=false;
 const max=()=>Math.max(1,host.document.documentElement.scrollHeight-host.innerHeight);
 const progress=()=>clamp(host.scrollY/max());
 function stop(){tween?.kill();tween=null;if(playing){playing=false;onPlaying(false);}}
 function move(to,autoplay=false,after=null){
  stop();const from=progress();to=clamp(to);
  if(Math.abs(to-from)<.00001){after?.();return;}
  playing=autoplay;onPlaying(playing);
  // Navigate the same expanded film coordinate, including all study segments.
  const ease=navigationEase;
  tween=animate(host,{scrollTo:{y:()=>to*max(),autoKill:true,onAutoKill:stop},duration:autoplay?Math.abs(to-from)*PLAYBACK_DURATION/PLAYBACK_RATE:chapterDuration(from,to),ease:autoplay?'none':ease,overwrite:'auto',onUpdate:update,onComplete:()=>{tween=null;playing=false;onPlaying(false);after?.();}});
 }
 function play(){if(progress()>=.9999){host.scrollTo({top:0,behavior:'instant'});update();}move(1,true);}
 function seek(p){stop();host.scrollTo({top:clamp(p)*max(),behavior:'instant'});update();}
 const interrupt=e=>{
  if(['pointerdown','touchstart'].includes(e.type)&&e.target?.closest('button,input,a'))return;
  if(e.type==='keydown'&&!['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(e.key))return;
  if(e.type==='keydown'&&e.target?.closest('button,input,a'))return;
  stop();
 };
 const visibility=()=>{if(host.document.hidden)stop();};
 const resize=()=>{const p=readProgress?.();stop();if(p!=null)seek(p);};
 for(const event of ['wheel','touchstart','pointerdown','keydown'])host.addEventListener(event,interrupt,{passive:true});
 host.addEventListener('resize',resize);host.document.addEventListener('visibilitychange',visibility);
 return {play,pause:stop,go:move,seek,study(from,to){move(from,false,()=>move(to,true));},destroy(){stop();for(const event of ['wheel','touchstart','pointerdown','keydown'])host.removeEventListener(event,interrupt);host.removeEventListener('resize',resize);host.document.removeEventListener('visibilitychange',visibility);}};
}
