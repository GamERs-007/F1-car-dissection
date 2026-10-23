import {memo,useEffect,useMemo,useRef} from 'react';
import {useFrame,useThree} from '@react-three/fiber';
import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {configureRenderer,createEnvironment,createPipeline,setLighting} from './fidelity.js';
import {createRig} from './rig.js';
import {circuit,studio} from './environment.js';
import {samplePlayback,cameraAt,ramp,focusStrength,engineFraming} from './timeline.js';
import {motion} from './store.js';
import {createExplainers} from './explainers.js';
import {engineInteractive} from './engine-config.js';
import carModelRevision from './rear-wing-supports.json' with {type:'json'};

let assetPromise;
export function loadAssets(onProgress){
 if(assetPromise)return assetPromise;
 const manager=new T.LoadingManager();manager.onProgress=(_,loaded,total)=>onProgress(Math.min(.98,loaded/Math.max(1,total)));
 const loader=new GLTFLoader(manager);
 assetPromise=Promise.all([loader.loadAsync('/models/mercedes_w17_disassembled.glb?v='+carModelRevision.modelSha256,e=>onProgress(Math.min(.3,(e.loaded/40134564)*.3))),loader.loadAsync('/models/v6_car_engine_with_engine_morethem.glb',e=>onProgress(.3+Math.min(.55,e.loaded/108200860*.55))),fetch('/models/mercedes_w17_components.json?v='+carModelRevision.modelSha256).then(r=>{if(!r.ok)throw Error('Car configuration unavailable');return r.json();}),fetch('/models/w17_v6_hybrid_config.json').then(r=>{if(!r.ok)throw Error('Legacy geometry mask configuration unavailable');return r.json();})]);return assetPromise;
}
export const Scene=memo(function Scene({assets,onReady,onPick,onHover,onError}){
 const {gl,scene,camera,size,invalidate}=useThree(),key=useRef(),fill=useRef(),rim=useRef(),carRoot=useRef(),lastState=useRef(null);
 const [car,engine,config,puConfig]=assets;
 const rig=useMemo(()=>createRig(car,engine,config,puConfig,gl),[car,engine,config,puConfig,gl]);
 useEffect(()=>()=>{rig.v6.dispose();rig.brakes.dispose();},[rig]);
 const track=useMemo(()=>circuit(),[]),room=useMemo(()=>studio(),[]);
 const explainers=useMemo(()=>createExplainers(rig),[rig]);
 useEffect(()=>()=>explainers.dispose(),[explainers]);
 const post=useMemo(()=>createPipeline(gl,scene,camera),[gl,scene,camera]);
 useEffect(()=>{let alive=true,env;configureRenderer(gl);scene.fog=new T.FogExp2(0x122029,.012);
  createEnvironment(gl).then(value=>{if(!alive){value.dispose();return;}env=value;scene.environment=env.texture;onReady();invalidate();}).catch(error=>{if(alive)onError('HDRI lighting failed to load: '+error.message);});
  return()=>{alive=false;env?.dispose();scene.environment=null;};},[gl,scene,invalidate,onReady,onError]);
 useEffect(()=>motion.subscribe(invalidate),[invalidate]);
 useEffect(()=>{post.resize(size.width,size.height);invalidate();},[post,size,invalidate]);
 useEffect(()=>()=>post.dispose(),[post]);
 const point=useMemo(()=>new T.Vector3(),[]),bg=useMemo(()=>new T.Color(),[]);
 useFrame(()=>{
  const s=samplePlayback(motion.progress,motion.reduced);lastState.current=s;rig.apply(s,motion.hover,motion.selected);explainers.update({...s,reduced:motion.reduced});carRoot.current.position.set(0,s.lift,s.departure);
  track.update(s);room.update(s);const view=cameraAt(s.p,motion.reduced,size.width/size.height);
  // Follow the lift into the studio; hold the camera during landing so the lowering is visible.
  const cameraLift=motion.reduced?0:.96*ramp(s.p,.15,.25)*(1-ramp(s.p,.98,1));
  view.position[1]+=cameraLift;view.target[1]+=cameraLift;
  camera.position.fromArray(view.position);camera.lookAt(...view.target);camera.fov=view.fov;
  const focusing=motion.reduced?0:ramp(s.p,.42,.475)*(1-ramp(s.p,.85,.89));
  const enginePortrait=!motion.reduced&&size.width/size.height<1.25?engineFraming(s.p):0;
  const frameShift=(size.width>=1000?.14+.01*focusing:0)*(1-enginePortrait);
  const baseDown=size.width/size.height<1?.13:size.width>=1000?.035*(1-focusing):0;
  const frameDown=baseDown+(.15-baseDown)*enginePortrait;
  camera.setViewOffset(size.width,size.height,-size.width*frameShift,-size.height*frameDown,size.width,size.height);camera.updateProjectionMatrix();camera.updateMatrixWorld();
  bg.setRGB(.033,.064,.082).lerp(new T.Color(0x04090b),s.studio);scene.background=bg;if(scene.fog){scene.fog.color.copy(bg);scene.fog.density=.008+s.studio*.012;}
  setLighting(scene,key.current,fill.current,rim.current,s.studio);
  const engineLight=engineInteractive(s.p)?focusStrength(s.p,s.focus):0;fill.current.intensity+=.48*engineLight;rim.current.intensity+=.32*engineLight;
  post.film.uniforms.speed.value=s.raceSpeed;
  const svg=document.getElementById('annotation'),path=document.getElementById('annotation-path'),dot=document.getElementById('annotation-dot');
  if(svg){svg.style.opacity=String(focusStrength(s.p,s.focus));if(s.focus){point.fromArray(s.focus.point);point.y+=s.lift;point.z+=s.departure;point.project(camera);const x=(point.x*.5+.5)*size.width,y=(-point.y*.5+.5)*size.height;const copy=document.querySelector('.technical-callout')?.getBoundingClientRect();const startX=copy?copy.right+12:size.width*.32,startY=copy?copy.top+20:size.height*.55;path.setAttribute('d',`M ${startX} ${startY} L ${startX+25} ${startY} L ${x} ${y}`);dot.setAttribute('cx',x);dot.setAttribute('cy',y);if(Math.abs(point.x)>1||Math.abs(point.y)>1||point.z>1)svg.style.opacity='0';}}
  gl.info.autoReset=false;gl.info.reset();post.composer.render();
  const telemetry=document.getElementById('scene-status');if(telemetry){telemetry.dataset.progress=motion.progress.toFixed(6);telemetry.dataset.sceneProgress=s.p.toFixed(6);telemetry.dataset.holding=String(s.holding);telemetry.dataset.roadDistance=s.roadDistance.toFixed(6);telemetry.dataset.expansion=s.expansion.toFixed(6);telemetry.dataset.engineDetail=s.detail.toFixed(6);telemetry.dataset.drawCalls=gl.info.render.calls;telemetry.dataset.lift=s.lift.toFixed(6);telemetry.dataset.departure=s.departure.toFixed(6);telemetry.dataset.wheelAngle=rig.wheels[0].pivot.rotation.x.toFixed(6);telemetry.dataset.brakes=rig.brakes.assemblies.length;telemetry.dataset.engineParts=rig.v6.parts.length;telemetry.dataset.enginePosition=rig.root.position.toArray().join(',');telemetry.dataset.engineHover=motion.hover??'';telemetry.dataset.engineSelected=motion.selected??'';}
  if(telemetry){telemetry.dataset.crankAngle=s.crankAngle.toFixed(6);telemetry.dataset.pistonStudy=s.engineCycle.toFixed(6);telemetry.dataset.pistonPosition=rig.v6.pistons.pairs[0].piston.node.position.toArray().join(',');telemetry.dataset.engineTextures=JSON.stringify(rig.v6.textureAudit);}
 },1);
 const identify=e=>{const {part,enginePart,partLabel}=e.object.userData;if(!part)return null;if(enginePart)return engineInteractive(lastState.current?.p??0)?{id:enginePart,label:partLabel,engine:true}:null;return {id:part,label:part.replaceAll('_',' '),engine:false};};
 const pick=e=>{const part=identify(e);if(!part)return;e.stopPropagation();motion.selected=part.id;onPick(part);invalidate();};
 const hover=e=>{const part=identify(e);if(!part)return;e.stopPropagation();gl.domElement.style.cursor='crosshair';if(motion.hover===part.id)return;motion.hover=part.id;onHover(part);invalidate();};
 const unhover=()=>{gl.domElement.style.cursor='default';motion.hover=null;onHover(null);invalidate();};
 return <>
  <hemisphereLight args={[0xffffff,0x151515,.12]}/>
  <directionalLight ref={key} position={[5,10,6]} color="#fff5e9" intensity={1.7} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-5} shadow-camera-right={5} shadow-camera-top={5} shadow-camera-bottom={-5} shadow-camera-far={35} shadow-bias={-.00003} shadow-normalBias={.012}/>
  <directionalLight ref={fill} position={[-8,3,1]} color="#d8e0ef" intensity={.18}/>
  <directionalLight ref={rim} position={[-2,4,-8]} color="#d5e9e6" intensity={.28}/>
  <primitive object={track.group}/><primitive object={room.group}/>
  <group ref={carRoot} onClick={pick} onPointerMove={hover} onPointerOver={hover} onPointerOut={unhover}>
    <primitive object={rig.carScene} dispose={null}/><primitive object={rig.engineScene} dispose={null}/><primitive object={explainers.group}/>
  </group>
 </>;
});


