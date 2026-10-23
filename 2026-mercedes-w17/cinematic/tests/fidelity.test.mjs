import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {calibrateMaterial,materialRecipe,configureRenderer} from '../src/fidelity.js';
const renderer={capabilities:{getMaxAnisotropy:()=>16},shadowMap:{}};
test('material calibration preserves the original material, every texture binding, UV transform and color space',()=>{
 const original=new T.MeshPhysicalMaterial({name:'mercedes_carbon1.007',color:0xffffff,metalness:0,roughness:.683772,specularIntensity:.2});
 original.map=new T.Texture({width:4096,height:4096});original.map.colorSpace=T.SRGBColorSpace;original.map.repeat.set(12,8);original.normalMap=new T.Texture();original.normalScale.set(0,0);
 const calibrated=calibrateMaterial(original,renderer);
 assert.notEqual(calibrated,original);assert.equal(original.normalScale.x,0);assert.equal(original.roughness,.683772);
 assert.equal(calibrated.map,original.map);assert.equal(calibrated.normalMap,original.normalMap);assert.equal(calibrated.map.image.width,4096);assert.deepEqual(calibrated.map.repeat.toArray(),[12,8]);assert.equal(calibrated.map.colorSpace,T.SRGBColorSpace);assert.equal(calibrated.normalMap.colorSpace,T.NoColorSpace);
 assert.equal(calibrated.normalScale.x,.55);assert.deepEqual(calibrated.color.toArray(),original.color.toArray());
 const raw=calibrateMaterial(original,renderer,{restore:false});assert.equal(raw.normalScale.x,0);assert.equal(raw.roughness,original.roughness);assert.equal(raw.metalness,original.metalness);
});
test('calibration is narrowly scoped and does not replace decals or engine materials',()=>{
 for(const name of ['mercedes_decals.005','mercedes_number_63.005','PU_Block'])assert.deepEqual(materialRecipe(name),{});
 assert.equal(materialRecipe('sidewall.007').metalness,0);assert(materialRecipe('sidewall.007').roughness>.8);
});
test('only the three verified constant-UV carbon materials receive object-local sampling repair',()=>{
 for(const name of ['mercedes_carbon1.007','mercedes_carbon2.005','mercedes_carbon3.007']){
  const source=new T.MeshPhysicalMaterial({name}),fixed=calibrateMaterial(source,renderer);
  assert(fixed.userData.carbonProjection);assert(!source.userData.carbonProjection);
  const shader={vertexShader:'#include <common>\n#include <begin_vertex>',fragmentShader:'#include <common>\nvoid main() {\n#include <map_fragment>\n#include <normal_fragment_begin>\n#include <normal_fragment_maps>\n}'};
  fixed.onBeforeCompile(shader);assert(shader.vertexShader.includes('vW17CarbonPosition=position'));assert(shader.fragmentShader.includes('w17CarbonUv'));assert(!shader.fragmentShader.includes('vNormalMapUv'));
 }
 const wheel=calibrateMaterial(new T.MeshPhysicalMaterial({name:'sw_carbon.003'}),renderer);assert(!wheel.userData.carbonProjection);
});
test('linear PBR renderer uses explicit sRGB output, one ACES output stage and filtered shadows',()=>{
 configureRenderer(renderer);assert.equal(renderer.outputColorSpace,T.SRGBColorSpace);assert.equal(renderer.toneMapping,T.ACESFilmicToneMapping);assert.equal(renderer.toneMappingExposure,.9);assert.equal(renderer.shadowMap.type,T.PCFSoftShadowMap);
});
test('body decal restores authored alpha without removing black lettering or changing the atlas',()=>{
 const source=new T.MeshPhysicalMaterial({name:'mercedes_decals.005',map:new T.Texture()});
 const fixed=calibrateMaterial(source,renderer);
 assert(fixed.transparent);assert.equal(fixed.depthWrite,false);assert.equal(fixed.map,source.map);assert.equal(fixed.alphaTest,.015);assert.equal(source.transparent,false);
 assert.equal(calibrateMaterial(new T.MeshPhysicalMaterial({name:'mercedes_paint.007'}),renderer).transparent,false);
});
