import * as T from 'three';
import {HDRLoader} from 'three/addons/loaders/HDRLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

export const HDR_URL='/lighting/studio_small_09_2k.hdr';
// Explicit, reversible interpretation of an export with disabled normals and no metal maps.
// These are visual calibrations, not recovered Sketchfab viewer settings.
export function materialRecipe(name){
 if(/carbon/.test(name))return {roughness:.44,metalness:0,specularIntensity:.65,clearcoat:.18,clearcoatRoughness:.35,normalStrength:.55};
 if(/mercedes_paint/.test(name))return {roughness:.38,metalness:.25,specularIntensity:.5,clearcoat:.12,clearcoatRoughness:.3};
 if(/sidewall|tread_/.test(name))return {roughness:.84,metalness:0,specularIntensity:.45,normalStrength:.45};
 if(/wheel_hub/.test(name))return {roughness:.38,metalness:.65,specularIntensity:1,normalStrength:.65};
 if(/^chrome\./.test(name))return {roughness:.23,metalness:1,specularIntensity:1};
 return {};
}
export function calibrateMaterial(material,renderer,{restore=true}={}){
 const m=material.clone(),recipe=materialRecipe(m.name);
 // GLTFLoader already marks base/emissive maps sRGB and data maps linear.
 // Preserve those assignments, image dimensions, UV transforms and samplers.
 for(const v of Object.values(m))if(v?.isTexture){v.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());v.needsUpdate=true;}
 if(restore){
  // The RGBA body atlas was exported with the default OPAQUE glTF mode.
  // Restore its authored alpha; never key out black (black lettering is legitimate).
  if(/^mercedes_decals\./.test(m.name)){
   m.transparent=true;m.alphaTest=.015;m.depthWrite=false;
   m.polygonOffset=true;m.polygonOffsetFactor=-1;m.polygonOffsetUnits=-1;
   m.userData.restoredDecalAlpha=true;
  }
  const {normalStrength,...pbr}=recipe;Object.assign(m,pbr);
  if(m.normalMap&&normalStrength!==undefined)m.normalScale.set(normalStrength,normalStrength);
  // Verified source UVs for these three materials are ALL (0,1).
  // Local-position projection repairs sampling without editing geometry or UV buffers.
  // Unlike world-space projection, it remains attached during exploded animation.
  if(/^mercedes_carbon[123]\./.test(m.name)){
   m.onBeforeCompile=shader=>{
    const varyings='varying vec3 vW17CarbonPosition; varying vec3 vW17CarbonNormal;';
    shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\n'+varyings).replace('#include <begin_vertex>','#include <begin_vertex>\nvW17CarbonPosition=position; vW17CarbonNormal=normal;');
    shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\n'+varyings).replace('void main() {',`void main() {
     vec3 cn=abs(normalize(vW17CarbonNormal));
     vec2 w17CarbonUv=(cn.z>cn.x&&cn.z>cn.y?vW17CarbonPosition.xy:(cn.y>cn.x?vW17CarbonPosition.xz:vW17CarbonPosition.yz))*80.0;`);
    for(const chunk of ['map_fragment','normal_fragment_begin','normal_fragment_maps'])shader.fragmentShader=shader.fragmentShader.replace('#include <'+chunk+'>',T.ShaderChunk[chunk].replaceAll('vMapUv','w17CarbonUv').replaceAll('vNormalMapUv','w17CarbonUv'));
   };
   m.customProgramCacheKey=()=> 'w17-local-carbon-projection-v1';
   m.userData.carbonProjection='object-local dominant plane, 80 texture repeats per model unit';
  }
 }
 m.userData.fidelity={mode:restore?'calibrated':'authored',recipe:restore?recipe:{},sourceName:material.name};
 return m;
}
export function configureRenderer(gl){
 T.ColorManagement.enabled=true;gl.outputColorSpace=T.SRGBColorSpace;
 gl.toneMapping=T.ACESFilmicToneMapping;gl.toneMappingExposure=.9;
 gl.shadowMap.enabled=true;gl.shadowMap.type=T.PCFSoftShadowMap;
}
export async function createEnvironment(gl){
 const hdr=await new HDRLoader().loadAsync(HDR_URL);hdr.mapping=T.EquirectangularReflectionMapping;
 const pmrem=new T.PMREMGenerator(gl);const env=pmrem.fromEquirectangular(hdr);hdr.dispose();pmrem.dispose();return env;
}
export function setLighting(scene,key,fill,rim,studio=0){
 scene.environmentIntensity=.65+studio*.10;scene.environmentRotation.set(0,.65,0);
 key.intensity=1.7-studio*.25;fill.intensity=.18;rim.intensity=.28+studio*.12;
}
// Speed cues remain on the environment, never blur the car or decals.
const grade={uniforms:{tDiffuse:{value:null},speed:{value:0}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`uniform sampler2D tDiffuse;uniform float speed;varying vec2 vUv;void main(){vec2 d=vUv-vec2(.55,.5);float edge=smoothstep(.38,.66,length(d));vec2 blur=d*.006*edge*speed;vec3 c=texture2D(tDiffuse,vUv).rgb*.6;c+=texture2D(tDiffuse,vUv+blur).rgb*.2;c+=texture2D(tDiffuse,vUv-blur).rgb*.2;gl_FragColor=vec4(c*(1.-.12*smoothstep(.4,.8,length(d))),1.);}`};
export function createPipeline(gl,scene,camera){
 const target=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,samples:Math.min(4,gl.capabilities.maxSamples)});
 const composer=new EffectComposer(gl,target);composer.addPass(new RenderPass(scene,camera));
 const ao=new GTAOPass(scene,camera,1,1,undefined,{radius:.12,thickness:.07,distanceExponent:2,distanceFallOff:1,scale:1,samples:8},{radius:4,rings:2,samples:8});
 ao.blendIntensity=.4;composer.addPass(ao);
 const film=new ShaderPass(grade);composer.addPass(film);composer.addPass(new OutputPass());
 return {composer,film,ao,resize(w,h){composer.setPixelRatio(gl.getPixelRatio());composer.setSize(w,h);},dispose(){for(const p of composer.passes)p.dispose?.();composer.dispose();}};
}
