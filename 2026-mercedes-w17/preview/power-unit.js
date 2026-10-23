import * as T from 'three';
import {powerUnitProgress,offsetPosition,powerUnitRootPosition} from './power-unit-motion.js';

export class PowerUnit {
  constructor({scene,loader,camera,controls,prepared,parser,host,onFit}) {
    Object.assign(this,{scene,loader,camera,controls,prepared,parser,host,onFit});
    this.meshes=[];this.groups=new Map();this.masks=[];this.t=0;this.currentMode='prepared';this.enabled=true;this.focusToken=0;
  }
  async init(){
    const response=await fetch('../public/models/w17_v6_hybrid_config.json');if(!response.ok)throw Error('Power unit configuration unavailable');this.config=await response.json();
    const asset=await this.loader.loadAsync('../public/models/'+this.config.model);this.root=asset.scene.getObjectByName('Power_Unit');if(!this.root)throw Error('Power_Unit root missing');this.scene.add(asset.scene);this.asset=asset.scene;
    this.rootBase=this.root.position.toArray();
    for(const c of this.config.components){const g=this.root.getObjectByName(c.name);if(!g)throw Error('Missing engine assembly '+c.name);this.groups.set(c.name,{g,c,base:g.position.toArray()});g.traverse(m=>{if(m.isMesh){m.userData.powerUnit=c.name;this.meshes.push(m);}});}
    this.prepared.traverse(m=>{if(!m.isMesh)return;const a=this.parser.associations.get(m);const mask=this.config.legacyMasks.find(x=>x.mesh===a?.meshes&&x.primitive===a?.primitives);if(!mask)return;const original=m.geometry.index,skip=new Set(mask.faces),kept=[];for(let f=0;f<original.count/3;f++)if(!skip.has(f))kept.push(original.getX(f*3),original.getX(f*3+1),original.getX(f*3+2));this.masks.push({m,original,enhanced:new T.BufferAttribute(new original.array.constructor(kept),1)});});
    if(this.masks.length!==this.config.legacyMasks.length)throw Error('Legacy geometry mask mismatch');
    const section=document.createElement('section');section.id='power-unit-controls';section.innerHTML=`<h2>V6 Turbo Hybrid · 2026 concept</h2><p class="small">Detailed illustrative power unit, fitted to this model. Not Mercedes CAD. MGU-K architecture; no MGU-H.</p><label><input id="pu-enabled" type="checkbox" checked> Added power unit</label><label><input id="pu-linked" type="checkbox" checked> Link engine dissection to main progress</label><label for="pu-progress">Engine subassembly progress</label><output id="pu-readout">0%</output><input id="pu-progress" type="range" min="0" max="100" value="0" aria-label="Engine subassembly progress" disabled><div class="row"><button id="pu-focus">Focus engine</button><button id="pu-isolate">Isolate engine</button><button id="pu-context">Restore car</button></div><label><input id="pu-camera" type="checkbox"> Cinematic camera follows progress</label><div id="pu-components"></div><pre id="pu-selection" aria-live="polite">Select an engine part to highlight and identify it.</pre><p class="small"><a href="../../preparation/power-unit/REPORT.md" target="_blank">Power unit report & sources</a></p>`;
    document.querySelector('aside').insertBefore(section,document.getElementById('compare'));
    this.ui=id=>document.getElementById(id);
    this.ui('pu-enabled').onchange=()=>{this.enabled=this.ui('pu-enabled').checked;this.update(this.t);};
    this.ui('pu-linked').onchange=()=>{this.ui('pu-progress').disabled=this.ui('pu-linked').checked;this.update(this.t);};
    this.ui('pu-progress').oninput=()=>this.update(this.t);
    this.ui('pu-focus').onclick=()=>this.focus();
    this.ui('pu-isolate').onclick=()=>{this.carSolo=false;this.prepared.visible=false;this.isolated=true;this.update(this.t);this.focus();};
    this.ui('pu-context').onclick=()=>{this.isolated=false;this.update(this.t);this.onFit();};
    this.ui('pu-camera').onchange=()=>{this.focusToken++;this.update(this.t);};
    this.controls.addEventListener('start',()=>{this.focusToken++;this.ui('pu-camera').checked=false;});
    const hint=document.createElement('p');hint.className='small';hint.textContent='For manual engine dissection, unlink progress and isolate the engine, or move the main slider to 80% first.';this.ui('pu-progress').after(hint);
    for(const {g,c} of this.groups.values()){
      const row=document.createElement('label'),check=document.createElement('input'),button=document.createElement('button');check.type='checkbox';check.checked=true;check.setAttribute('aria-label',c.label+' visibility');check.onchange=()=>g.visible=check.checked;button.textContent=c.label;button.onclick=()=>this.select(c.name);row.append(check,button);this.ui('pu-components').append(row);
    }
    this.label=document.createElement('div');this.label.className='pu-world-label';this.host.append(this.label);this.label.hidden=true;this.update(0);
  }
  mode(v){this.currentMode=v;this.asset.visible=v==='prepared'&&this.enabled&&!this.carSolo;this.prepared.visible=v==='prepared'&&!this.isolated;if(this.highlight)this.highlight.visible=this.asset.visible;this.label.hidden=true;}
  setCarSolo(value){this.carSolo=value;this.mode(this.currentMode);}
  applyMask(enabled){for(const x of this.masks)x.m.geometry.setIndex(enabled?x.enhanced:x.original);}
  update(t){
    this.t=t;const linked=this.ui('pu-linked').checked;
    this.ui('pu-progress').disabled=linked||(!this.isolated&&t<.8);
    if(!linked&&!this.isolated&&t<.8)this.ui('pu-progress').value=0;
    const {detach,detail}=powerUnitProgress(t,+this.ui('pu-progress').value/100,linked);
    this.detail=detail;this.root.position.fromArray(powerUnitRootPosition(this.rootBase,t));
    for(const {g,c,base} of this.groups.values())g.position.fromArray(offsetPosition(base,c.explodedOffset,detail));
    if(linked)this.ui('pu-progress').value=Math.round(Math.max(0,Math.min(1,(t-.8)/.2))*100);
    this.ui('pu-readout').textContent=this.ui('pu-progress').value+'%';
    this.applyMask(this.enabled);this.mode(this.currentMode);if(this.highlight)this.highlight.update();
    if(this.ui('pu-camera').checked){const center=this.root.getWorldPosition(new T.Vector3());const f=detach;this.controls.target.set(0,.45,0).lerp(center,f);this.camera.position.set(6,4,6).lerp(center.clone().add(new T.Vector3(1.7,1.25,1.8).multiplyScalar(1+detail*.8)),f);this.controls.update();}
  }
  reset(){this.focusToken++;this.carSolo=false;this.isolated=false;this.enabled=true;this.ui('pu-enabled').checked=true;this.ui('pu-linked').checked=true;this.ui('pu-progress').disabled=true;this.ui('pu-progress').value=0;this.ui('pu-camera').checked=false;for(const {g} of this.groups.values())g.visible=true;for(const el of this.ui('pu-components').querySelectorAll('input'))el.checked=true;this.clear();this.update(0);}
  clear(){if(this.highlight){this.scene.remove(this.highlight);this.highlight.dispose();this.highlight=null;}this.selected=null;this.label.hidden=true;this.ui('pu-selection').textContent='Select an engine part to highlight and identify it.';}
  select(name){this.clear();const {g,c}=this.groups.get(name);this.selected=g;this.highlight=new T.BoxHelper(g,0x77ffe0);this.scene.add(this.highlight);this.ui('pu-selection').textContent=c.label+'\n'+name+'\nIllustrative component · original pose restored at 0%';this.label.textContent=c.label;this.draw();}
  draw(){if(!this.selected)return;this.highlight.update();const shown=this.asset.visible&&this.selected.visible;this.highlight.visible=shown;const p=new T.Box3().setFromObject(this.selected).getCenter(new T.Vector3()).project(this.camera);this.label.hidden=!shown||p.z>1||p.z< -1;this.label.style.left=((p.x*.5+.5)*this.host.clientWidth)+'px';this.label.style.top=((-p.y*.5+.5)*this.host.clientHeight)+'px';}
  focus(){if(!this.enabled||this.currentMode!=='prepared')return;this.setCarSolo(false);this.ui('pu-camera').checked=false;const token=++this.focusToken,b=new T.Box3().setFromObject(this.root),target=b.getCenter(new T.Vector3()),r=b.getSize(new T.Vector3()).length()/2,d=r/Math.sin(T.MathUtils.degToRad(this.camera.fov/2))*1.12/Math.min(1,this.camera.aspect),end=target.clone().add(new T.Vector3(1,.7,1).normalize().multiplyScalar(d)),start=this.camera.position.clone(),startTarget=this.controls.target.clone(),now=performance.now();
    const tick=()=>{if(token!==this.focusToken)return;const t=Math.min(1,(performance.now()-now)/650),e=t*t*(3-2*t);this.camera.position.lerpVectors(start,end,e);this.controls.target.lerpVectors(startTarget,target,e);this.controls.update();if(t<1)requestAnimationFrame(tick);};requestAnimationFrame(tick);
  }
  beginComparison(){this.asset.visible=false;this.applyMask(false);if(this.highlight)this.highlight.visible=false;}
  endComparison(){this.applyMask(this.enabled);this.mode(this.currentMode);}
}

