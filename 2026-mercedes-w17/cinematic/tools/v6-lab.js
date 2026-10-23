import * as T from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import mapping from '../src/engine-parts.json';
import {engineMaterial} from '../src/engine-materials.js';
import {createPistonMotion,movingEngineNodes} from '../src/piston-motion.js';
const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(devicePixelRatio);renderer.toneMapping=T.ACESFilmicToneMapping;document.body.append(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color('#252e34');const pmrem=new T.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(new RoomEnvironment(),.04).texture;
const camera=new T.PerspectiveCamera(36,innerWidth/innerHeight,.01,100);const controls=new OrbitControls(camera,renderer.domElement);
scene.add(new T.HemisphereLight(0xffffff,0x444444,2));const light=new T.DirectionalLight(0xffffff,3);light.position.set(2,4,3);scene.add(light);
const gltf=await new GLTFLoader().loadAsync('/models/v6_car_engine_with_engine_morethem.glb'),root=gltf.scene.getObjectByName('RootNode');
const finishes=new Map();gltf.scene.traverse(m=>{if(m.isMesh){let owner=m;while(owner.parent&&owner.parent!==root)owner=owner.parent;const node=gltf.parser.associations.get(owner)?.nodes,key=String(node)+m.material.uuid;if(!finishes.has(key))finishes.set(key,engineMaterial(m.material,{node}));m.material=finishes.get(key);}});scene.add(gltf.scene);scene.updateMatrixWorld(true);
const boxes=root.children.map(o=>({o,box:new T.Box3().setFromObject(o)}));
const nodes=new Map(root.children.map(o=>[gltf.parser.associations.get(o)?.nodes,o])),pistonMotion=createPistonMotion(nodes);
let running=false,started=0,elapsed=0,pistonView=false;
const runButton=document.querySelector('#pistons');runButton.disabled=false;
const resetMotion=()=>{running=false;pistonView=false;elapsed=0;pistonMotion.reset();runButton.textContent='Run pistons';};
const fit=()=>{const box=new T.Box3();for(const {o,box:b} of boxes)if(o.visible)box.union(b);const c=box.getCenter(new T.Vector3()),d=box.getSize(new T.Vector3()).length();controls.target.copy(c);camera.position.copy(c).add(new T.Vector3(1,.8,1.2).normalize().multiplyScalar(d*1.5));controls.update();};
document.querySelector('#all').onclick=()=>{resetMotion();root.children.forEach(o=>o.visible=true);fit();};
document.querySelector('#assembled').onclick=()=>{resetMotion();for(const {o} of boxes)o.visible=mapping.parts.some(p=>p.node===gltf.parser.associations.get(o)?.nodes);fit();};fit();
runButton.onclick=()=>{
 if(running){elapsed=(performance.now()-started)/1000;running=false;runButton.textContent='Resume pistons';return;}
 if(!pistonView){for(const [id,o] of nodes)o.visible=movingEngineNodes.has(id);fit();pistonView=true;}
 started=performance.now()-elapsed*1000;running=true;runButton.textContent='Pause pistons';
 document.querySelector('#hint').textContent='Six source pistons + rigid connecting rods · Illustrative kinematic study';
};
const select=document.createElement('select');select.ariaLabel='Inspect source part';select.innerHTML='<option value="">Isolate a physical parent</option>'+root.children.map(o=>`<option value="${gltf.parser.associations.get(o)?.nodes}">${o.name}</option>`).join('');document.querySelector('#controls').append(select);select.onchange=()=>{resetMotion();for(const o of root.children)o.visible=String(gltf.parser.associations.get(o)?.nodes)===select.value;fit();};
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();});
const ray=new T.Raycaster(),mouse=new T.Vector2();renderer.domElement.addEventListener('pointermove',e=>{mouse.set(e.clientX/innerWidth*2-1,1-e.clientY/innerHeight*2);ray.setFromCamera(mouse,camera);const hit=ray.intersectObjects(root.children,true).find(h=>{let o=h.object;while(o&&o!==root){if(!o.visible)return false;o=o.parent;}return true;});if(hit){let o=hit.object;while(o.parent!==root)o=o.parent;document.querySelector('#label').textContent=`${o.name} · node ${gltf.parser.associations.get(o)?.nodes} · ${o.children.length} material meshes`;}});
renderer.setAnimationLoop(()=>{if(running){elapsed=(performance.now()-started)/1000;pistonMotion.apply(elapsed*Math.PI*2*.65);runButton.dataset.angle=String(elapsed*Math.PI*2*.65);runButton.dataset.pistonY=String(pistonMotion.pairs[0].piston.node.position.y);}controls.update();renderer.render(scene,camera);});
