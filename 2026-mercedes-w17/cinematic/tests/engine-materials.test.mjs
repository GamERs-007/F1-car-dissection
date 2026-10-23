import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {engineMaterial,chromeBrightness} from '../src/engine-materials.js';
test('rectangular covers are black chrome; specified heads and six pistons are silver chrome',()=>{
 const original=new T.MeshStandardMaterial({name:'Metall1',color:0x666666,map:new T.Texture(),normalMap:new T.Texture()});
 for(const node of [322,334]){const m=engineMaterial(original,{node});assert.equal(m.userData.finish,'Black chrome');assert.equal(m.metalness,1);assert.deepEqual(m.color.toArray(),new T.Color('#252d36').multiplyScalar(.7).toArray());assert.equal(m.map,null);}
 for(const node of [307,318,271,274,277,283,289,292,59,62,66,69,72,76,80,83,86,90,93,96,100,103,106,109,113,116,120,123]){const m=engineMaterial(original,{node});assert.equal(m.userData.finish,'Polished chrome');assert.equal(m.metalness,1);assert.equal(m.map,null);assert.deepEqual(m.color.toArray(),new T.Color('#e5edf5').multiplyScalar(.7).toArray());}
 assert.equal(chromeBrightness,.7);assert(original.map);assert.equal(engineMaterial(original,{node:210}).map,original.map);
});
test('worn red paint becomes chrome only on a clone, with chipped paint maps removed',()=>{
 const original=new T.MeshStandardMaterial({name:'Metal_Paint',color:0xaa0000,map:new T.Texture(),normalMap:new T.Texture(),roughnessMap:new T.Texture(),metalnessMap:new T.Texture(),metalness:0,roughness:.8});
 const chrome=engineMaterial(original);assert.notEqual(chrome,original);assert.equal(chrome.metalness,1);assert.equal(chrome.roughness,.16);
 for(const name of ['map','normalMap','roughnessMap','metalnessMap'])assert.equal(chrome[name],null);
 assert.equal(original.color.getHex(),0xaa0000);assert(original.map);assert(original.normalMap);assert.equal(original.roughness,.8);
 const other=new T.MeshStandardMaterial({name:'Plastic1',map:new T.Texture(),roughness:.5}),copy=engineMaterial(other);assert.equal(copy.map,other.map);assert.equal(copy.roughness,.5);
});
test('other engine metals and nonmetallic surfaces retain their source finish',()=>{
 for(const name of ['Metall1','Metall2','Metall3','Metall4','Trenie_C','Collector']){
  const original=new T.MeshStandardMaterial({name,color:0x555555,map:new T.Texture(),normalMap:new T.Texture(),roughness:.8});
  const copy=engineMaterial(original);assert.equal(copy.metalness,original.metalness);assert.equal(copy.roughness,original.roughness);assert.equal(copy.map,original.map);assert.equal(copy.normalMap,original.normalMap);assert.deepEqual(copy.normalScale.toArray(),original.normalScale.toArray());assert.deepEqual(copy.color.toArray(),original.color.toArray());
 }
 for(const name of ['Plastic1','plastic2','plastic3','Filter','Ceramic','Remen','Procladka']){
  const original=new T.MeshStandardMaterial({name,map:new T.Texture(),roughness:.7});const copy=engineMaterial(original);assert.equal(copy.map,original.map);assert.equal(copy.roughness,.7);
 }
});
