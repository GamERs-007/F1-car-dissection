import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {surfaceGraph,surfaceTrace} from '../src/surface-guides.js';
test('surface routing stays on referenced geometry and ignores unused source vertices',()=>{
 const parent=new T.Group();parent.position.set(4,2,-3);parent.rotation.y=.7;
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute([0,0,0,1,0,0,1,0,1,0,0,1,100,100,100],3));geometry.setIndex([0,2,1,0,3,2]);geometry.computeVertexNormals();
 parent.add(new T.Mesh(geometry,new T.MeshBasicMaterial()));parent.updateMatrixWorld(true);
 const graph=surfaceGraph(parent);assert.equal(graph.points.length,4);assert.equal(graph.components.length,1);
 const seeds=[[0,0,0],[1,0,1]].map(p=>parent.localToWorld(new T.Vector3(...p)).toArray());const trace=surfaceTrace(graph,seeds,.006);
 assert(trace.length>1);for(const point of trace){assert(Math.abs(point.y-.006)<1e-9);assert(point.x>=-1e-10&&point.x<=1+1e-10&&point.z>=-1e-10&&point.z<=1+1e-10);}
});
