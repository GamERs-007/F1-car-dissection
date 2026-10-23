import {chapters} from './chapters.js';

// A monotone cubic map gives continuous velocity at every beat, without a second
// animation clock. Tiny progress during study keeps scroll ↔ film time invertible;
// camera keyframes supply the visual hold. Legacy preset; playback.js now owns
// the uniform film edit with inserted dwell time.
export function createPacing(catalog=chapters,targetSeconds=null){
 const knots=[{p:0,t:0}];
 const add=(p,seconds)=>knots.push({p,t:knots.at(-1).t+seconds});
 for(const c of catalog){
  if(c.timing){const span=c.end-c.at;add(c.at+span*.38,c.timing[0]);add(c.at+span*.82,c.timing[1]);add(c.end,c.timing[2]);}
  else if(c.id==='reassemble'){add(.875,c.seconds*.27);add(.93,c.seconds*.34);add(.98,c.seconds*.27);add(1,c.seconds*.12);}
  else add(c.end,c.seconds);
 }
 const scale=targetSeconds?targetSeconds/knots.at(-1).t:1;knots.forEach(k=>k.t*=scale);
 const slopes=knots.slice(1).map((k,i)=>(k.p-knots[i].p)/(k.t-knots[i].t));
 const tangents=knots.map((_,i)=>i===0?slopes[0]:i===knots.length-1?slopes.at(-1):2/(1/slopes[i-1]+1/slopes[i]));
 const duration=knots.at(-1).t;
 function progressAt(seconds){
  const t=Math.max(0,Math.min(duration,seconds));let i=0;while(i<knots.length-2&&t>knots[i+1].t)i++;
  const a=knots[i],b=knots[i+1],h=b.t-a.t,u=(t-a.t)/h,u2=u*u,u3=u2*u;
  return (2*u3-3*u2+1)*a.p+(u3-2*u2+u)*h*tangents[i]+(-2*u3+3*u2)*b.p+(u3-u2)*h*tangents[i+1];
 }
 function timeAt(progress){if(progress<=0)return 0;if(progress>=1)return duration;let lo=0,hi=duration;const p=Math.max(0,Math.min(1,progress));for(let i=0;i<45;i++){const mid=(lo+hi)/2;if(progressAt(mid)<p)lo=mid;else hi=mid;}return (lo+hi)/2;}
 return {duration,knots,progressAt,timeAt};
}
// Set targetSeconds to retime the complete film without touching model keyframes.
export const pacing=createPacing(chapters,112);
