import {Component,useCallback,useEffect,useRef,useState} from 'react';
import {Canvas} from '@react-three/fiber';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import {Scene,loadAssets} from './Scene.jsx';
import {chapterNav,focusChapters,copyAt,samplePlayback,ramp} from './timeline.js';
import {BASE_DURATION,progressAtScene,studyPoint,studyRange} from './playback.js';
import {motion} from './store.js';
import {createScrollController,PLAYBACK_DURATION,PLAYBACK_RATE} from './scroll-controller.js';
import {chapterAt} from './chapters.js';
import amgLogo from './assets/amg-logo.svg';
import {engineInteractive,engineSequence} from './engine-config.js';
gsap.registerPlugin(ScrollTrigger);

class SceneBoundary extends Component{state={error:null};static getDerivedStateFromError(error){return {error};}render(){return this.state.error?<div className="scene-error"><p>Unable to start the 3D experience.</p><small>{this.state.error.message}</small><button onClick={()=>location.reload()}>Try again</button></div>:this.props.children;}}
export default function App(){
 const [assets,setAssets]=useState(null),[load,setLoad]=useState(0),[ready,setReady]=useState(false),[error,setError]=useState(null),[p,setP]=useState(0),[reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),[picked,setPicked]=useState(null),[hovered,setHovered]=useState(null);const story=useRef(null);
 const onReady=useCallback(()=>{setReady(true);setLoad(1);},[]);
 const [playing,setPlaying]=useState(false),transport=useRef(null);
 const scrollToProgress=p=>transport.current?.go(progressAtScene(p));
 useEffect(()=>{transport.current=createScrollController(setPlaying,{readProgress:()=>motion.progress});return()=>transport.current?.destroy();},[]);
 useEffect(()=>{let alive=true;loadAssets(v=>{if(alive)setLoad(n=>Math.max(n,v));}).then(a=>{if(alive)setAssets(a);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[]);
 useEffect(()=>{const query=matchMedia('(prefers-reduced-motion: reduce)'),change=()=>setReduced(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
 useEffect(()=>{motion.reduced=reduced;motion.set(motion.progress);},[reduced]);
 useEffect(()=>{
  const sync=self=>{motion.set(self.progress);setP(self.progress);};
  const trigger=ScrollTrigger.create({trigger:story.current,start:'top top',end:'bottom bottom',invalidateOnRefresh:true,onUpdate:sync,onRefresh:sync});
  const refresh=()=>ScrollTrigger.refresh();window.addEventListener('resize',refresh);ScrollTrigger.refresh();sync(trigger);return()=>{trigger.kill();window.removeEventListener('resize',refresh);};
 },[]);
 useEffect(()=>{if(ready)ScrollTrigger.refresh();},[ready]);
 const state=samplePlayback(p,reduced),sceneP=state.p,copy=copyAt(sceneP),percent=Math.round(p*100),explore=state.stage===3,activeChapter=chapterAt(sceneP);
 const engineStudy=engineInteractive(sceneP);
 useEffect(()=>{if(!engineStudy){setHovered(null);motion.hover=null;if(motion.selected?.startsWith('V6:')){motion.selected=null;setPicked(null);}}},[engineStudy]);
 return <>
  <div ref={story} className="story-scroll" id="story" aria-label="Scroll-driven engineering story" style={{height:`calc(100vh + ${1700*PLAYBACK_DURATION/BASE_DURATION}vh)`,minHeight:`calc(100vh + ${11000*PLAYBACK_DURATION/BASE_DURATION}px)`}}/>
  <div className="film-stage">
   <SceneBoundary><Canvas shadows frameloop="demand" dpr={[1,Math.min(devicePixelRatio,1.5)]} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} camera={{position:[6.8,1.9,8.4],fov:38,near:.05,far:1600}} fallback={<div className="scene-error">This experience requires WebGL. Please try a browser with hardware acceleration.</div>}>
    {assets&&<Scene assets={assets} onReady={onReady} onPick={setPicked} onHover={setHovered} onError={setError}/>}
   </Canvas></SceneBoundary>
  </div>
  <div className="film-grain" aria-hidden="true"/>
  <div className="focus-shade" aria-hidden="true" style={{opacity:ramp(sceneP,.44,.46)*(1-ramp(sceneP,.85,.88))}}/>
  <header className="masthead fixed inset-x-0 top-0 z-20 flex items-center justify-between">
   <a href="#story" onClick={e=>{e.preventDefault();scrollToProgress(0);}} className="brand" aria-label="W17 — back to start"><span className="brand-mark" aria-hidden="true">W<span>17</span></span><span className="brand-sub">MERCEDES<br/>ENGINEERING STUDY</span></a>
   <div className="edition"><span className="live-dot"/> THE ARCHITECTURE OF SPEED <span className="edition-year">/ 2026</span></div>
  </header>
  <main className={'story-copy '+copy.kind+(state.focus?.id==='power-unit'?' engine-study':'')} style={{opacity:ready?copy.opacity:0,transform:`translateY(${(1-copy.opacity)*(reduced?0:18)}px)`}}>
   {copy.eyebrow&&<p className="eyebrow"><span/> {copy.eyebrow}</p>}
   <h1 aria-label={copy.kind==='hero'?'Mercedes-AMG F1 W17':undefined}>{copy.title.map((line,i)=>copy.kind==='hero'&&i===0?<span key={line} className="hero-title-line">Mercedes-<img className="hero-amg-logo" src={amgLogo} alt="AMG" width="628" height="85"/></span>:<span key={line} className={i===1?'accent-line':''}>{line}</span>)}</h1>
   {copy.description&&<p className="description">{copy.description}</p>}
   {copy.callout&&<div className="technical-callout"><span>PRINCIPLE</span><p>{copy.callout}</p><small>Diagrammatic motion · not a simulation</small></div>}
   {copy.note&&<p className="model-note">{copy.note}</p>}
   {copy.kind==='focus'&&state.focus?.id==='power-unit'&&<div className="engine-controls" aria-label="Engine study phases"><button aria-pressed={state.engineCycle===0} onClick={()=>scrollToProgress(engineSequence.complete)}>01 COMPLETE</button><button aria-pressed={state.engineCycle>0} onClick={()=>{const {from}=studyRange('engine-pistons');transport.current?.study(from,1);}}>02 RUN PISTONS</button><small>{state.engineCycle>0?'KINEMATIC STUDY · SHARED STORY CLOCK':'HOVER TO IDENTIFY · CLICK TO SELECT'}</small></div>}
   {copy.kind==='hero'&&<button className="start-cue" onClick={()=>scrollToProgress(.15)}><span>↓</span> SCROLL TO DISCOVER</button>}
   {copy.kind==='final'&&sceneP>.97&&<button className="replay" onClick={()=>scrollToProgress(0)}>REPLAY THE STORY <span>↗</span></button>}
  </main>
  <div className="hero-index" style={{opacity:ready?(1-state.studio)*Math.max(0,1-sceneP*5):0}} aria-hidden="true"><span>W17</span><small>FORM / FUNCTION / FORCE</small></div>
  <svg id="annotation" className="annotation" aria-hidden="true"><path id="annotation-path"/><circle id="annotation-dot" r="4"/></svg>
  <nav className="chapters" aria-label="Story chapters">
   {chapterNav.map((c,i)=><button key={c.id} onClick={()=>scrollToProgress(c.navAt??(c.timing?studyPoint(c):c.p))} aria-label={`Chapter ${i+1}: ${c.label}`} aria-current={activeChapter===i?'step':undefined} className={activeChapter===i?'active':''}><span className="chapter-name">{c.label}</span><span className="chapter-number">{String(i+1).padStart(2,'0')}</span><i/></button>)}
  </nav>
  {explore&&state.focus?.id!=='power-unit'&&<div className="component-index">COMPONENT {String(state.active+1).padStart(2,'0')} / {String(focusChapters.length).padStart(2,'0')}<span>SCROLL TO EXPLORE</span></div>}
  {engineStudy&&hovered?.engine&&<div className="engine-part-label" role="status">{hovered.label}</div>}
  {picked&&(!picked.engine||engineStudy)&&<button className="picked" onClick={()=>{setPicked(null);motion.selected=null;motion.set(p);}} aria-label="Dismiss selected component">{picked.label} <span>×</span></button>}
  <footer className="film-footer fixed inset-x-0 bottom-0 z-20 flex items-center justify-between">
   <div className="footer-label"><span className="small-cross">+</span> INTERACTIVE 3D <span className="footer-muted">/ {chapterNav[activeChapter].label.toUpperCase()}</span></div>
   <div className="footer-controls"><button disabled={!ready} onClick={()=>playing?transport.current.pause():transport.current.play()} aria-label={playing?'Pause story':'Play story'} aria-pressed={playing} className="play-toggle">{playing?'Ⅱ PAUSE':'▶ PLAY'}</button><button onClick={()=>setReduced(v=>!v)} aria-pressed={reduced} className="motion-toggle">{reduced?'REDUCED MOTION':'FULL MOTION'}</button><label className="scrub-label"><span className="sr-only">Story progress</span><input aria-label="Story progress" type="range" min="0" max="1000" value={Math.round(p*1000)} onChange={e=>transport.current?.seek(+e.target.value/1000)}/></label><output>{String(percent).padStart(2,'0')}<span> / 100</span></output></div>
  </footer>
  <div id="scene-status" className="sr-only" role="status" data-duration={PLAYBACK_DURATION/PLAYBACK_RATE} data-playback-rate={PLAYBACK_RATE} data-film-time={(p*PLAYBACK_DURATION).toFixed(3)} data-chapter={chapterNav[activeChapter].id}>{ready?'3D scene ready':error?'3D loading failed':'Loading 3D assets'}</div>
  {!ready&&<div className="loader" role="status"><div className="loader-word">W17<span> / </span></div><p>{error?'THE SCENE COULD NOT LOAD':'ASSEMBLING THE EXTRAORDINARY'}</p><div className="load-track"><i style={{transform:`scaleX(${load})`}}/></div><small>{error||`${Math.round(load*100)}% · CAR + V6 HYBRID ENGINE`}</small>{error&&<button onClick={()=>location.reload()}>RETRY</button>}</div>}
 </>;
}
