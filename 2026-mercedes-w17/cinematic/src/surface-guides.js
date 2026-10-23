import * as T from 'three';

// Cache a graph of referenced mesh triangles, welding UV/material seams.
// All routing happens once; animation follows the resulting surface edges.
export function surfaceGraph(parent,{region=()=>true,meshFilter=()=>true}={}){
 parent.updateWorldMatrix(true,true);
 const inverse=parent.matrixWorld.clone().invert(),points=[],normals=[],edges=[],weld=new Map();
 const p=new T.Vector3(),n=new T.Vector3(),world=new T.Vector3();
 parent.traverse(mesh=>{
  if(!mesh.isMesh||!meshFilter(mesh))return;
  const geometry=mesh.geometry,position=geometry.attributes.position,normal=geometry.attributes.normal,index=geometry.index;
  const transform=new T.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld),normalTransform=new T.Matrix3().getNormalMatrix(transform);
  const cached=new Int32Array(position.count).fill(-2);
  const vertex=i=>{
   if(cached[i]!==-2)return cached[i];
   p.fromBufferAttribute(position,i).applyMatrix4(transform);world.copy(p).applyMatrix4(parent.matrixWorld);
   if(!region(world)){cached[i]=-1;return -1;}
   const key=`${Math.round(p.x*1e5)},${Math.round(p.y*1e5)},${Math.round(p.z*1e5)}`;
   n.set(0,1,0);if(normal)n.fromBufferAttribute(normal,i).applyMatrix3(normalTransform).normalize();
   let id=weld.get(key);if(id===undefined){id=points.length;weld.set(key,id);points.push(p.clone());normals.push(n.clone());edges.push(new Map());}else normals[id].add(n);
   cached[i]=id;return id;
  };
  const connect=(a,b)=>{if(a<0||b<0||a===b)return;const length=points[a].distanceTo(points[b]);edges[a].set(b,length);edges[b].set(a,length);};
  for(let i=0;i<(index?.count??position.count);i+=3){const a=vertex(index?index.getX(i):i),b=vertex(index?index.getX(i+1):i+1),c=vertex(index?index.getX(i+2):i+2);connect(a,b);connect(b,c);connect(c,a);}
 });
 for(const normal of normals)normal.normalize();
 const components=[],seen=new Uint8Array(points.length);
 for(let i=0;i<points.length;i++){if(seen[i])continue;const stack=[i],component=[];seen[i]=1;while(stack.length){const at=stack.pop();component.push(at);for(const to of edges[at].keys())if(!seen[to]){seen[to]=1;stack.push(to);}}if(component.length>2)components.push(component);}
 const nearest=(point,indices=null)=>{let best=-1,distance=Infinity;for(const i of indices??points.keys()){const d=points[i].distanceToSquared(point);if(d<distance){distance=d;best=i;}}return best;};
 function route(from,to){
  const distance=new Float64Array(points.length).fill(Infinity),previous=new Int32Array(points.length).fill(-1),heap=[];
  const push=(id,d)=>{let i=heap.length;heap.push([id,d]);while(i>0){const up=(i-1)>>1;if(heap[up][1]<=d)break;heap[i]=heap[up];i=up;}heap[i]=[id,d];};
  const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let child=i*2+1;if(child+1<heap.length&&heap[child+1][1]<heap[child][1])child++;if(heap[child][1]>=last[1])break;heap[i]=heap[child];i=child;}heap[i]=last;}return first;};
  distance[from]=0;push(from,0);
  while(heap.length){const [at,d]=pop();if(d!==distance[at])continue;if(at===to)break;for(const [next,length] of edges[at]){const cost=d+length;if(cost<distance[next]){distance[next]=cost;previous[next]=at;push(next,cost);}}}
  if(!Number.isFinite(distance[to]))return [];
  const result=[];for(let at=to;at>=0;at=previous[at]){result.push(at);if(at===from)break;}return result.reverse();
 }
 const offset=(indices,clearance=.006)=>indices.map(i=>points[i].clone().addScaledVector(normals[i],clearance));
 return {parent,points,normals,edges,components,nearest,route,offset};
}
export function surfaceTrace(graph,worldSeeds,clearance=.006){
 if(!graph.points.length)return [];
 const seeds=worldSeeds.map(p=>graph.parent.worldToLocal(new T.Vector3(...p))),first=graph.nearest(seeds[0]);
 const component=graph.components.find(ids=>ids.includes(first));if(!component)return [];
 const ids=seeds.map(p=>graph.nearest(p,component)),path=[];
 for(let i=1;i<ids.length;i++){const section=graph.route(ids[i-1],ids[i]);if(path.length)section.shift();path.push(...section);}
 return graph.offset(path,clearance);
}
export function suspensionTraces(parent){
 const graph=surfaceGraph(parent),traces=[];
 const candidates=graph.components.map(ids=>{const box=new T.Box3().setFromPoints(ids.map(i=>graph.points[i]));return {ids,length:box.getSize(new T.Vector3()).length()};}).filter(c=>c.length>.16).sort((a,b)=>b.length-a.length).slice(0,3);
 for(const {ids} of candidates){const farthest=from=>ids.reduce((best,i)=>graph.points[i].distanceToSquared(graph.points[from])>graph.points[best].distanceToSquared(graph.points[from])?i:best,ids[0]);const a=farthest(ids[0]),b=farthest(a),path=graph.route(a,b);if(path.length>2)traces.push(graph.offset(path,.005));}
 return traces;
}
