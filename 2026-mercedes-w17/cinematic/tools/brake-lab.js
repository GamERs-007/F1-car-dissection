import * as T from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {createBrakes,poseBrakeAssembly} from '../src/brake-assembly.js';

const scene=new T.Scene();scene.background=new T.Color(0x071014);
const renderer=new T.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;document.body.prepend(renderer.domElement);
const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(new RoomEnvironment(),.04);scene.environment=environment.texture;
scene.add(new T.AmbientLight(0xc4e4e2,.55));
const key=new T.DirectionalLight(0xffffff,3.2);key.position.set(1.5,2,2);scene.add(key);
const rim=new T.DirectionalLight(0x5df2db,2);rim.position.set(-1,1,-1);scene.add(rim);
const camera=new T.PerspectiveCamera(34,innerWidth/innerHeight,.01,20);camera.position.set(1.22,.07,0);camera.lookAt(0,0,0);
const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.target.set(0,0,0);controls.minDistance=.52;controls.maxDistance=2.8;
const brakes=createBrakes([{name:'Wheel_FL',center:new T.Vector3(.075,0,0),axis:new T.Vector3(1,0,0),orientation:new T.Quaternion(),radius:.34}]);scene.add(brakes.root);
const slider=document.getElementById('separation'),assembly=brakes.assemblies[0];
slider.addEventListener('input',()=>poseBrakeAssembly(assembly,Number(slider.value)));
poseBrakeAssembly(assembly,Number(slider.value));
const viewpoints={front:[1.22,.07,0],side:[0,.07,1.12],rear:[-1.22,.07,0]};
for(const button of document.querySelectorAll('[data-view]'))button.addEventListener('click',()=>{
 const [x,y,z]=viewpoints[button.dataset.view];camera.position.set(x,y,z);controls.target.set(0,0,0);controls.update();
});
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);}
addEventListener('resize',resize);
renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
