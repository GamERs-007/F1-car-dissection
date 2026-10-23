import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {splitSuspension} from '../src/running-gear.js';
import {createBrakes,poseBrakeAssembly} from '../src/brake-assembly.js';

const scene=new T.Scene();scene.background=new T.Color(0x071014);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.2;document.body.prepend(renderer.domElement);
const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(new RoomEnvironment(),.04);scene.environment=environment.texture;
scene.add(new T.AmbientLight(0xc4e4e2,.5));
const key=new T.DirectionalLight(0xffffff,3.3);key.position.set(2,3,4);scene.add(key);
const rim=new T.DirectionalLight(0x50e6dc,1.6);rim.position.set(-2,1,-1);scene.add(rim);
const camera=new T.PerspectiveCamera(40,innerWidth/innerHeight,.01,30);camera.position.set(1.4,1.10,3.05);camera.lookAt(0,.44,1.5);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,.44,1.5);controls.minDistance=.8;controls.maxDistance=6;
const slider=document.getElementById('separation'),status=document.getElementById('status');
let sides=[],brakes=null;
new GLTFLoader().load('/models/mercedes_w17_disassembled.glb',gltf=>{
 const suspension=gltf.scene.getObjectByName('Suspension_Front');scene.attach(suspension);
 sides=splitSuspension(suspension);
 const wheels=[-1,1].map(side=>({name:side<0?'Wheel_FR':'Wheel_FL',center:new T.Vector3(side*.779,.32,1.615),axis:new T.Vector3(1,0,0),orientation:new T.Quaternion(),radius:.34}));
 brakes=createBrakes(wheels);scene.add(brakes.root);setPose();status.textContent='3D preview · front assembly';
},undefined,error=>{status.textContent='Could not load the source suspension: '+error.message;});
function setPose(){if(!brakes)return;const t=Number(slider.value);
 for(const {g,side} of sides)g.position.set(side*.42*t,0,0);
 for(const b of brakes.assemblies){b.g.position.copy(b.base);b.g.position.x+=b.side*.68*t;poseBrakeAssembly(b,t);}
}
slider.addEventListener('input',setPose);
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
addEventListener('resize',resize);
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
