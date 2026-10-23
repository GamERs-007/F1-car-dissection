import * as T from 'three';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import {TextGeometry} from 'three/addons/geometries/TextGeometry.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeVertices,mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import helvetiker from 'three/examples/fonts/helvetiker_bold.typeface.json' with {type:'json'};

// Shared radius keeps the filled rotor center and half-round cover aligned.
export const BRAKE_PROPORTIONS={centerRadius:.118*.8,caliperRadiusScale:1,rotorRadius:.159,caliperLeftShift:2*.159*.10,clearanceRatio:.01};
const rotorHalfThickness=.0185;
const rotorGap=()=>BRAKE_PROPORTIONS.rotorRadius*BRAKE_PROPORTIONS.clearanceRatio;
const throatHalfWidth=()=>rotorHalfThickness+rotorGap();
// Multi-view reference reconstruction, mounted on the measured axle of each
// source wheel. The four corners share geometry and materials, but keep rigid
// groups so the disc can rotate while the caliper and shroud remain fixed.
function reverseWinding(geometry){
 if(geometry.index){const index=geometry.index.array;for(let i=0;i<index.length;i+=3)[index[i+1],index[i+2]]=[index[i+2],index[i+1]];}
 else for(const attr of Object.values(geometry.attributes)){
  const a=attr.array,n=attr.itemSize;for(let i=0;i<attr.count;i+=3)for(let c=0;c<n;c++){
   const first=(i+1)*n+c,second=(i+2)*n+c;[a[first],a[second]]=[a[second],a[first]];
  }
 }
 return geometry;
}
function ring(outer,inner,depth,holeRows=[]){
 const shape=new T.Shape();shape.absarc(0,0,outer,0,Math.PI*2,false);
 const bore=new T.Path();bore.absarc(0,0,inner,0,Math.PI*2,true);shape.holes.push(bore);
 for(const [radius,count,size] of holeRows)for(let i=0;i<count;i++){
  const angle=i*2*Math.PI/count,hole=new T.Path();
  hole.absarc(Math.cos(angle)*radius,Math.sin(angle)*radius,size,0,2*Math.PI,true);shape.holes.push(hole);
 }
 const geometry=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,curveSegments:48,steps:1});
 geometry.translate(0,0,-depth/2);geometry.rotateY(Math.PI/2);return geometry;
}

function castWidth(y){return .58+.42*Math.sqrt(Math.max(.02,1-(y/.155)**2));}

function caliperOutline(){
 // Lobed casting with folded shoulders and a pinched inner waist, traced
 // independently of the rotor circle. Its ends are not radial wedge cuts.
 const s=new T.Shape();s.moveTo(-.042,.128);
 s.bezierCurveTo(-.050,.142,-.059,.151,-.078,.147);
 s.bezierCurveTo(-.094,.139,-.098,.127,-.115,.125);
 s.quadraticCurveTo(-.127,.124,-.133,.111);
 s.bezierCurveTo(-.153,.078,-.168,.041,-.166,0);
 s.bezierCurveTo(-.168,-.041,-.153,-.078,-.133,-.111);
 s.quadraticCurveTo(-.127,-.124,-.115,-.125);
 s.bezierCurveTo(-.098,-.127,-.094,-.139,-.078,-.147);
 s.bezierCurveTo(-.059,-.151,-.050,-.142,-.042,-.128);
 const r=BRAKE_PROPORTIONS.centerRadius;
 s.bezierCurveTo(-.036,-.115,-.020,-.104,0,-r);
 // This edge is the same semicircle as the center cover's outer seat.
 s.absarc(0,0,r,-Math.PI/2,-3*Math.PI/2,true);
 s.bezierCurveTo(-.020,.104,-.036,.115,-.042,.128);s.closePath();return s;
}

function caliperShell(face){
 const shape=caliperOutline();
 for(const sign of [-1,1]){
  const pocket=new T.Path();pocket.absellipse(-.105,sign*.102,.010,.019,0,Math.PI*2,true,sign*-.45);shape.holes.push(pocket);
 }
 const geometry=new T.ExtrudeGeometry(shape,{depth:.009,bevelEnabled:true,bevelSegments:3,bevelSize:.003,bevelThickness:.002,curveSegments:48});
 geometry.translate(0,0,-.0045);geometry.rotateY(Math.PI/2);
 const p=geometry.attributes.position;for(let i=0;i<p.count;i++){p.setX(i,face*Math.max(throatHalfWidth(),.028*castWidth(p.getY(i))+p.getX(i)));p.setZ(i,Math.max(0,p.getZ(i)));}
 if(face<0)reverseWinding(geometry);
 geometry.computeVertexNormals();return geometry;
}

function outsideRotorProfile(shape){
 // Split the casting outline at the circular throat, then close each outside
 // chain along the cutter arc. The cutter stays centered on the rotor even
 // though the casting itself has been shifted outward.
 const points=shape.getPoints(128),cx=BRAKE_PROPORTIONS.caliperLeftShift,r=.163+rotorGap(),chains=[];
 let chain=null;
 for(let i=0;i<points.length-1;i++){
  const a=points[i],b=points[i+1],dx=b.x-a.x,dy=b.y-a.y,ax=a.x-cx;
  const A=dx*dx+dy*dy,B=2*(ax*dx+a.y*dy),C=ax*ax+a.y*a.y-r*r,D=B*B-4*A*C,ts=[0,1];
  if(A>1e-18&&D>0)for(const t of [(-B-Math.sqrt(D))/(2*A),(-B+Math.sqrt(D))/(2*A)])if(t>1e-9&&t<1-1e-9)ts.push(t);
  ts.sort((a,b)=>a-b);
  for(let j=0;j<ts.length-1;j++){
   const t0=ts[j],t1=ts[j+1],mid=(t0+t1)/2;
   if((ax+dx*mid)**2+(a.y+dy*mid)**2<r*r){chain=null;continue;}
   const p=new T.Vector2(a.x+dx*t0,a.y+dy*t0),q=new T.Vector2(a.x+dx*t1,a.y+dy*t1);
   if(!chain){chain=[p];chains.push(chain);}chain.push(q);
  }
 }
 if(chains.length>1&&chains.at(-1).at(-1).distanceTo(chains[0][0])<1e-8){chains[0]=[...chains.pop(),...chains[0].slice(1)];}
 return chains.map(points=>{
  const s=new T.Shape(points),first=points[0],last=points.at(-1);
  if(first.distanceTo(last)>1e-8)s.absarc(cx,0,r,Math.atan2(last.y,last.x-cx),Math.atan2(first.y,first.x-cx),true);
  s.closePath();return s;
 });
}

function caliperWrap(){
 const shape=caliperOutline(),half=throatHalfWidth(),parts=[];
 // Separate cheeks straddle a genuinely open rotor channel.
 for(const sign of [-1,1]){
  const g=new T.ExtrudeGeometry(shape,{depth:1,bevelEnabled:false,curveSegments:128});g.rotateY(Math.PI/2);
  const p=g.attributes.position;
  for(let i=0;i<p.count;i++){
   const outer=Math.max(half+.003,.028*castWidth(p.getY(i)));
   p.setX(i,sign*(half+(outer-half)*p.getX(i)));p.setZ(i,Math.max(0,p.getZ(i)));
  }
  if(sign<0)reverseWinding(g);g.computeVertexNormals();parts.push(g);
 }
 // The spine connects the cheeks only beyond the disc perimeter.
 const bridge=new T.ExtrudeGeometry(outsideRotorProfile(shape),{depth:2*half,bevelEnabled:false,curveSegments:128});
 bridge.translate(0,0,-half);bridge.rotateY(Math.PI/2);parts.push(bridge);
 const geometry=mergeGeometries(parts);for(const p of parts)p.dispose();geometry.computeVertexNormals();return geometry;
}

function carbonShroud(side){
 // Trace the rear reference silhouette in image coordinates. The axle projects
 // to (297,290), and the disc radius measures 105 px. This keeps the body,
 // narrow neck and small lower scallop in the same proportions as the photos.
 const scale=.159/105,point=(x,y)=>[(297-x)*scale,(290-y)*scale];
 const s=new T.Shape();
 s.moveTo(...point(260,78));
 s.bezierCurveTo(...point(272,75),...point(290,74),...point(303.7,75));
 s.lineTo(...point(303.7,171));s.quadraticCurveTo(...point(304.5,173),...point(305.3,171));
 s.lineTo(...point(305.3,75));
 s.bezierCurveTo(...point(325,75),...point(341,77),...point(349,80));
 s.bezierCurveTo(...point(359,104),...point(393,135),...point(423,164));
 s.bezierCurveTo(...point(460,199),...point(479,236),...point(480,278));
 s.bezierCurveTo(...point(482,321),...point(463,370),...point(426,389));
 s.bezierCurveTo(...point(418,393),...point(414,380),...point(398,382));
 s.bezierCurveTo(...point(369,389),...point(325,405),...point(289,402));
 s.bezierCurveTo(...point(245,400),...point(208,378),...point(193,342));
 s.bezierCurveTo(...point(181,315),...point(182,279),...point(190,254));
 s.bezierCurveTo(...point(196,233),...point(209,214),...point(219,199));
 s.bezierCurveTo(...point(231,170),...point(243,112),...point(260,78));
 s.closePath();
 // Subdivide the face before bending so the fold has continuous curvature.
 const flat=new T.ExtrudeGeometry(s,{depth:.0035,bevelEnabled:false,curveSegments:64,steps:1});
 const src=flat.getAttribute('position'),vertices=[];
 const bend=p=>{
  // Keep the traced front/rear silhouette; bend in depth along a quarter arc.
  const r=.075,d=T.MathUtils.clamp(p.y-.252,0,r),a=Math.asin(d/r),thickness=p.z-.00175;
  // Uniform planar scaling keeps every triangle edge coincident while adding
  // the visible black border around the entire brake perimeter.
  return new T.Vector3(side*(-.092+r*(1-Math.cos(a))+thickness*Math.cos(a)),(p.y-thickness*Math.sin(a))*1.08-.005,-p.x*1.12);
 };
 const subdivide=(a,b,c,depth)=>{
  if(depth&&Math.max(a.y,b.y,c.y)>.248&&Math.max(a.distanceTo(b),b.distanceTo(c),c.distanceTo(a))>.004){
   const ab=a.clone().add(b).multiplyScalar(.5),bc=b.clone().add(c).multiplyScalar(.5),ca=c.clone().add(a).multiplyScalar(.5);
   subdivide(a,ab,ca,depth-1);subdivide(ab,b,bc,depth-1);subdivide(ca,bc,c,depth-1);subdivide(ab,bc,ca,depth-1);
  }else for(const p of [a,b,c])vertices.push(...bend(p).toArray());
 };
 for(let i=0;i<src.count;i+=3)subdivide(new T.Vector3().fromBufferAttribute(src,i),new T.Vector3().fromBufferAttribute(src,i+1),new T.Vector3().fromBufferAttribute(src,i+2),7);
 flat.dispose();const raw=new T.BufferGeometry();raw.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
 const geometry=mergeVertices(raw,1e-7);raw.dispose();if(side<0)reverseWinding(geometry);geometry.computeVertexNormals();geometry.userData.inletZ=(304.5-297)*scale*1.12;return geometry;
}

function coverExtension(sign){
 // Broad cast lips run across the complete rotor thickness, curling around
 // the upper/lower edge instead of hovering as flat lines in front of it.
 const start=1.595,end=2.49; // stay on the caliper side of the disc centerline
 const inner=.163+rotorGap(),outer=inner+.014,bevel=.002;
 const s=new T.Shape();s.absarc(0,0,outer-bevel,start,end,false);
 s.absarc(0,0,inner+bevel,end,start,true);s.closePath();
 const geometry=new T.ExtrudeGeometry(s,{depth:.052,bevelEnabled:true,bevelSegments:5,bevelSize:bevel,bevelThickness:.002,curveSegments:64});
 geometry.translate(0,0,-.026);geometry.rotateY(Math.PI/2);
 const p=geometry.attributes.position;
 for(let i=0;i<p.count;i++){
  const angle=Math.atan2(p.getY(i),-p.getZ(i)),t=T.MathUtils.clamp((angle-start)/(end-start),0,1);
  const width=Math.min(1,.20+.70*Math.sin(Math.PI*t)**.65+.40*t);
  p.setX(i,p.getX(i)*width);
 }
 geometry.scale(1,sign,1);if(sign<0)reverseWinding(geometry);geometry.computeVertexNormals();return geometry;
}

function caliperTrim(side){
 const s=caliperOutline(),points=s.extractPoints(36).shape,hole=new T.Path();
 for(let i=0;i<points.length;i++){
  const p=points[i],u=-.12+(p.x+.12)*.91,v=p.y*.972;
  if(i===0)hole.moveTo(u,v);else hole.lineTo(u,v);
 }
 hole.closePath();s.holes.push(hole);
 const g=new T.ExtrudeGeometry(s,{depth:.0018,bevelEnabled:true,bevelSize:.0007,bevelThickness:.0005,bevelSegments:2,curveSegments:48});
 g.translate(0,0,-.0009);g.rotateY(Math.PI/2);
 const p=g.attributes.position;for(let i=0;i<p.count;i++){p.setX(i,side*(.034*castWidth(p.getY(i))+p.getX(i)));p.setZ(i,Math.max(0,p.getZ(i)));}
 if(side<0)reverseWinding(g);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
}

function caliperRib(sign){
 const s=new T.Shape();s.moveTo(-.139,sign*.070);s.lineTo(-.126,sign*.119);
 s.quadraticCurveTo(-.113,sign*.132,-.081,sign*.124);s.lineTo(-.089,sign*.112);
 s.quadraticCurveTo(-.113,sign*.116,-.121,sign*.084);s.closePath();
 const g=new T.ExtrudeGeometry(s,{depth:.004,bevelEnabled:true,bevelSegments:3,bevelSize:.0015,bevelThickness:.001,curveSegments:24});
 g.translate(0,0,-.002);g.rotateY(Math.PI/2);return g;
}

function curvedWordmark(side,font){
 const g=new TextGeometry('brembo',{font,size:.023,depth:.00045,curveSegments:5});
 g.rotateZ(Math.PI/2);g.center();const p=g.attributes.position,r=.140;
 for(let i=0;i<p.count;i++){
  const radius=r-p.getX(i),angle=p.getY(i)/r,depth=p.getZ(i);
  const y=radius*Math.sin(angle);
  p.setXYZ(i,side*(.037*castWidth(y)+depth),y,radius*Math.cos(angle));
 }
 if(side<0)reverseWinding(g);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;
}

function halfConeSurface(side){
 // The reference casting masks the caliper-side half of the hub cone while
 // the perforated carrier stays exposed on the other half.
 const profile=[[0,.118],[.003,.118],[.003,.112],[.012,.110],[.026,.100],[.043,.076],[.059,.049],[.073,.026]].map(([x,r])=>[x,r*.8]);
 const sectors=40,vertices=[],indices=[];
 for(const [offset,radius] of profile)for(let j=0;j<=sectors;j++){
  const a=Math.PI*j/sectors;
  vertices.push(side*offset,Math.cos(a)*radius,Math.sin(a)*radius);
 }
 for(let i=0;i<profile.length-1;i++)for(let j=0;j<sectors;j++){
  const a=i*(sectors+1)+j,b=a+sectors+1;
  if(side>0)indices.push(a,a+1,b,a+1,b+1,b);
  else indices.push(a,b,a+1,a+1,b,b+1);
 }
 // Close the back, nose and both cut planes so the large half-round cover
 // remains a solid piece when viewed from above, below or from the side.
 for(const row of [0,profile.length-1]){
  const center=vertices.length/3;vertices.push(side*profile[row][0],0,0);
  for(let j=0;j<sectors;j++)indices.push(center,row*(sectors+1)+j,row*(sectors+1)+j+1);
 }
 const boundary=profile.map(([x,r])=>new T.Vector2(x,r));boundary.push(new T.Vector2(profile.at(-1)[0],0),new T.Vector2(0,0));
 const faces=T.ShapeUtils.triangulateShape(boundary,[]);
 for(const sign of [-1,1]){
  const start=vertices.length/3;for(const p of boundary)vertices.push(side*p.x,sign*p.y,0);
  for(const face of faces)indices.push(...face.map(i=>start+i));
 }
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

function halfCoverSupport(side,sign){
 // A stepped cut-edge reinforcement sits on each end of the semicircle.
 const s=new T.Shape();s.moveTo(.034,sign*.0944);s.lineTo(.043,sign*.0944);
 s.lineTo(.043,sign*.084);s.lineTo(.055,sign*.084);s.lineTo(.071,sign*.062);
 s.lineTo(.086,sign*.041);s.lineTo(.086,sign*.034);s.lineTo(.063,sign*.055);
 s.lineTo(.048,sign*.077);s.lineTo(.034,sign*.077);s.closePath();
 const g=new T.ExtrudeGeometry(s,{depth:.004,bevelEnabled:true,bevelSegments:2,bevelSize:.0008,bevelThickness:.0005,curveSegments:10});
 g.translate(0,0,.0008);g.scale(side,1,1);if(side<0)reverseWinding(g);g.computeVertexNormals();return g;
}

function halfCoverSeatBridge(side){
 const r=BRAKE_PROPORTIONS.centerRadius,d=BRAKE_PROPORTIONS.caliperLeftShift,s=new T.Shape();
 s.moveTo(-d,-r-.002);s.absarc(-d,0,r+.002,-Math.PI/2,-3*Math.PI/2,true);
 s.lineTo(0,r-.001);s.absarc(0,0,r-.001,Math.PI/2,3*Math.PI/2,false);s.closePath();
 const g=new T.ExtrudeGeometry(s,{depth:.008,bevelEnabled:true,bevelSize:.0008,bevelThickness:.0005,bevelSegments:2,curveSegments:48});
 g.translate(0,0,-.004);g.rotateY(Math.PI/2);
 const p=g.attributes.position;for(let i=0;i<p.count;i++){p.setX(i,side*Math.max(throatHalfWidth(),.029*castWidth(p.getY(i))+p.getX(i)));p.setZ(i,Math.max(0,p.getZ(i)));}
 if(side<0)reverseWinding(g);g.computeVertexNormals();return g;
}

function copperCarrierSector(){
 const s=new T.Shape();s.absarc(0,0,.079,-Math.PI/2,Math.PI/2,false);
 s.absarc(0,0,.049,Math.PI/2,-Math.PI/2,true);s.closePath();
 for(let i=0;i<6;i++){
  const a=-1.25+i*.5,hole=new T.Path();
  hole.absarc(Math.cos(a)*.064,Math.sin(a)*.064,.0075,0,2*Math.PI,true);s.holes.push(hole);
 }
 const geometry=new T.ExtrudeGeometry(s,{depth:.003,bevelEnabled:false,curveSegments:40,steps:1});
 geometry.translate(0,0,-.0015);geometry.rotateY(Math.PI/2);geometry.scale(1,BRAKE_PROPORTIONS.centerRadius/.088,BRAKE_PROPORTIONS.centerRadius/.088);return geometry;
}

function material(name,color,metalness,roughness){return new T.MeshStandardMaterial({name,color,metalness,roughness});}
function piece(parent,name,geometry,finish,position=null){
 const mesh=new T.Mesh(geometry,finish);mesh.name=name;
 if(position)mesh.position.set(...position);
 parent.add(mesh);return mesh;
}
function instance(parent,name,geometry,finish,count,place){
 const mesh=new T.InstancedMesh(geometry,finish,count),dummy=new T.Object3D();mesh.name=name;
 for(let i=0;i<count;i++){dummy.position.set(0,0,0);dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);place(dummy,i);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
 mesh.instanceMatrix.needsUpdate=true;parent.add(mesh);return mesh;
}

export function poseBrakeAssembly(b,study){
 // Both sides use the left-hand local frame; the mount mirrors the whole
 // assembly, including its exploded poses, on the right of the car.
 b.disc.position.set(.19*study,0,0);
 b.bell.position.set(.075*study,0,0);
 b.caliper.position.set(.047*study,.103*study,-.055*study);
 b.duct.position.set(-.034*study,.052*study,.035*study);
}

export function createBrakes(wheels){
 const root=new T.Group();root.name='Brakes';
 const carbon=material('Brake_Carbon_Carbon',0x282a2b,.12,.73);
 carbon.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 brakePosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nbrakePosition=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 brakePosition;').replace('#include <color_fragment>',`#include <color_fragment>
   float wear=sin(length(brakePosition.yz)*9500.0)*.06;
   float grain=fract(sin(dot(brakePosition.yz,vec2(127.1,311.7))*800.0)*43758.5453);
   diffuseColor.rgb*=.84+grain*.22+wear;`);
 };
 carbon.customProgramCacheKey=()=> 'w17-carbon-brake-wear-v2';
 const edge=material('Brake_Carbon_Edge',0x17191a,.16,.79);
 const vent=material('Brake_Vent_Fins',0x454546,.35,.57);
 const bellMetal=material('Brake_Copper_Bell',0x714331,.86,.33);
 const brightMetal=material('Brake_Machined_Fasteners',0xaaaead,.93,.27);
 const caliperMetal=material('Brake_Brembo_Cast_Silver',0x878b8b,.97,.27);
 const wrapMetal=caliperMetal;
 const rearCaliper=caliperMetal;
 const wordmark=material('Brake_Brembo_Red_Wordmark',0x9b151c,.16,.46);
 const dark=new T.MeshPhysicalMaterial({name:'Brake_Carbon_Shroud',color:0x0d0e10,metalness:.02,roughness:.82,specularIntensity:.16});
 dark.side=T.DoubleSide;
 dark.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 shroudPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nshroudPosition=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 shroudPosition;').replace('#include <color_fragment>',`#include <color_fragment>
   float weave=sin(shroudPosition.y*2100.0)*sin(shroudPosition.z*2100.0);
   diffuseColor.rgb*=.80+.13*weave;`);
 };
 dark.customProgramCacheKey=()=> 'brake-carbon-shroud-weave-v1';
 const pad=material('Brake_Carbon_Pads',0x252320,.06,.89);
 const basketMetal=material('Brake_Upright_Basket',0x212527,.48,.62);
 const windowMetal=material('Brake_Basket_Machining',0x45494a,.78,.55);
 const bronzeRim=material('Brake_Carrier_Hole_Rims',0x975c3c,.9,.3);
 const recessMetal=material('Brake_Caliper_Recess_Floors',0x505657,.85,.42);
 wordmark.side=T.DoubleSide;
 caliperMetal.side=T.DoubleSide;
 caliperMetal.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 castPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\ncastPosition=position;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 castPosition;').replace('#include <color_fragment>',`#include <color_fragment>
   float castGrain=fract(sin(dot(castPosition.yz,vec2(127.1,311.7))*2410.0)*43758.5453);
   diffuseColor.rgb*=.83+castGrain*.19;`);
 };
 caliperMetal.customProgramCacheKey=()=> 'brembo-cast-silver-v1';
 const connectorGold=material('Brake_Basket_Connectors',0xa8895d,.88,.34);
 const font=new FontLoader().parse(helvetiker);
 const centerRadius=BRAKE_PROPORTIONS.centerRadius;
 const geometry={
  plate:ring(.159,centerRadius,.009,[[.107,48,.00145],[.126,56,.00155],[.145,64,.00165]]),innerRing:ring(centerRadius,.029,.011,[[centerRadius*.73,12,.009]]),
  core:new T.CylinderGeometry(centerRadius,centerRadius,.037,64),
  carrierBack:ring(centerRadius,.029,.009,[[centerRadius*.73,12,.009]]),lip:ring(.163,.157,.005),
  copperSector:copperCarrierSector(),
  rearCollar:ring(.170,.143,.013),basketBand:ring(.156,.143,.013),
  basketWall:new T.CylinderGeometry(.146,.146,.048,96,1,false),
  basketWindow:new RoundedBoxGeometry(.058,.003,.036,2,.001),
  basketWindowFrame:new RoundedBoxGeometry(.068,.003,.044,2,.001),
  basketModule:new RoundedBoxGeometry(.044,.060,.006,2,.002),
  connector:new T.CylinderGeometry(.004,.004,.015,10),
  edgePort:new T.BoxGeometry(.013,.003,.005),
  holeRim:new T.TorusGeometry(.009,.0017,5,16),
  logoMark:new T.TorusGeometry(.007,.0016,6,18),
  shellPlus:caliperShell(1),shellMinus:caliperShell(-1),wrap:caliperWrap(),shroudPlus:carbonShroud(1),shroudMinus:carbonShroud(-1),
  outerTrimPlus:caliperTrim(1),outerTrimMinus:caliperTrim(-1),
  upperRib:caliperRib(1),lowerRib:caliperRib(-1),
  tieBolt:new T.CylinderGeometry(.0034,.0034,.004,6),
  union:new T.CylinderGeometry(.004,.004,.008,6),
  recess:new T.SphereGeometry(1,16,8),
  silverHalfConePlus:halfConeSurface(1),silverHalfConeMinus:halfConeSurface(-1),
  supportPlusUpper:halfCoverSupport(1,1),supportPlusLower:halfCoverSupport(1,-1),
  supportMinusUpper:halfCoverSupport(-1,1),supportMinusLower:halfCoverSupport(-1,-1),
  seatBridgePlus:halfCoverSeatBridge(1),seatBridgeMinus:halfCoverSeatBridge(-1),
  fin:new T.BoxGeometry(.019,.029,.0025),
  bolt:new T.CylinderGeometry(.005,.005,.009,8),piston:new T.CylinderGeometry(.018,.018,.008,20),
  pistonCentre:new T.CylinderGeometry(.009,.009,.009,16),
  hub:new T.CylinderGeometry(.020,.024,.113,36),hubCollar:new T.CylinderGeometry(.032,.032,.010,36),
  spindle:new T.CylinderGeometry(.012,.043,.068,48),spindleTip:new T.CylinderGeometry(.012,.012,.028,24),
  bellCone:new T.CylinderGeometry(.040,.078,.038,40,1,false),
  guardUpper:coverExtension(1),guardLower:coverExtension(-1),
  bridge:new RoundedBoxGeometry(.052,.014,.020,3,.004),pad:new T.BoxGeometry(.006,.128,.025),
  bleeder:new T.CylinderGeometry(.004,.004,.024,8),
  wordmarkPlus:curvedWordmark(1,font),wordmarkMinus:curvedWordmark(-1,font),
 };
 for(const key of ['bolt','piston','pistonCentre','hub','hubCollar','bellCone','bleeder','basketWall','core','tieBolt','union'])geometry[key].rotateZ(Math.PI/2);
 geometry.connector.rotateX(Math.PI/2);
 geometry.holeRim.rotateY(Math.PI/2);geometry.logoMark.rotateY(Math.PI/2);
 const assemblies=wheels.map(w=>{
  // Author every part in the accepted left-hand frame, then reflect the full
  // right-hand assembly. This also mirrors details and instanced fittings.
  const mountSide=Math.sign(w.center.x),side=1,g=new T.Group();g.name='Brake_'+w.name.slice(-2);
  const base=w.center.clone().addScaledVector(w.axis,-mountSide*.075);g.position.copy(base);g.quaternion.copy(w.orientation);g.scale.x=mountSide;root.add(g);
  const rotor=new T.Group();rotor.name=g.name+'_Rotor';g.add(rotor);
  const disc=new T.Group();disc.name=g.name+'_Carbon_Discs';rotor.add(disc);
  piece(disc,g.name+'_Solid_Center_Core',geometry.core,basketMetal);
  for(const x of [-.014,.014]){
   piece(disc,g.name+'_Friction_Face',geometry.plate,carbon,[x,0,0]);
   piece(disc,g.name+'_Vent_Rim',geometry.lip,edge,[x,0,0]);
  }
  instance(disc,g.name+'_Radial_Vent_Walls',geometry.fin,vent,96,(dummy,i)=>{
   const angle=i*2*Math.PI/96;dummy.position.set(0,Math.cos(angle)*.147,Math.sin(angle)*.147);dummy.rotation.x=angle;
  });
  const bell=new T.Group();bell.name=g.name+'_Bronze_Carrier';rotor.add(bell);
  piece(bell,g.name+'_Copper_Carrier',geometry.carrierBack,bellMetal,[side*.017,0,0]);
  piece(bell,g.name+'_Perforated_Carrier_Face',geometry.innerRing,basketMetal,[side*.029,0,0]);
  piece(bell,g.name+'_Exposed_Copper_Carrier_Sector',geometry.copperSector,bellMetal,[side*.038,0,0]);
  piece(bell,g.name+'_Bell_Cone',geometry.bellCone,bellMetal,[-side*.029,0,0]);
  instance(bell,g.name+'_Copper_Hole_Rims',geometry.holeRim,bronzeRim,12,(dummy,i)=>{
   const angle=i*2*Math.PI/12;dummy.position.set(side*.042,Math.cos(angle)*centerRadius*.73,Math.sin(angle)*centerRadius*.73);
  });
  instance(bell,g.name+'_Bell_Fasteners',geometry.bolt,brightMetal,10,(dummy,i)=>{
   const angle=i*2*Math.PI/10;dummy.position.set(side*.043,Math.cos(angle)*centerRadius*.91,Math.sin(angle)*centerRadius*.91);
  });
  const hub=new T.Group();hub.name=g.name+'_Hub';rotor.add(hub);
  piece(hub,g.name+'_Axle_Sleeve',geometry.hub,brightMetal);
  for(const x of [-.055,.055])piece(hub,g.name+'_Bearing_Collar',geometry.hubCollar,brightMetal,[x,0,0]);
  const spindle=piece(hub,g.name+'_Tapered_Spindle',geometry.spindle,bellMetal,[side*.076,0,0]);
  spindle.rotation.z=-side*Math.PI/2;
  const tip=piece(hub,g.name+'_Spindle_End',geometry.spindleTip,brightMetal,[side*.124,0,0]);
  tip.rotation.z=-side*Math.PI/2;
  const caliper=new T.Group();caliper.name=g.name+'_Caliper';g.add(caliper);
  const casting=new T.Group();casting.name=g.name+'_Casting';casting.scale.set(1,BRAKE_PROPORTIONS.caliperRadiusScale,BRAKE_PROPORTIONS.caliperRadiusScale);casting.position.z=BRAKE_PROPORTIONS.caliperLeftShift;caliper.add(casting);
  piece(casting,g.name+'_Solid_Cast_Body',geometry.wrap,wrapMetal);
  for(const face of [-1,1]){
   piece(casting,g.name+'_Caliper_Half',geometry[face>0?'shellPlus':'shellMinus'],face===side?caliperMetal:rearCaliper);
   piece(caliper,g.name+'_Pad',geometry.pad,pad,[face*(throatHalfWidth()+.003),0,.146]);
  }
  piece(casting,g.name+'_Brembo_Wordmark',geometry[side>0?'wordmarkPlus':'wordmarkMinus'],wordmark);
  piece(casting,g.name+'_Brembo_Logo_Mark',geometry.logoMark,wordmark,[side*.038,.084,.102]);
  piece(casting,g.name+'_Outer_Machined_Ridge',geometry[side>0?'outerTrimPlus':'outerTrimMinus'],brightMetal);
  for(const sign of [-1,1]){
   piece(casting,g.name+'_Reinforcement_Rib',geometry[sign>0?'upperRib':'lowerRib'],caliperMetal,[side*.035,0,0]);
   const recess=piece(casting,g.name+'_Recessed_End_Pocket',geometry.recess,recessMetal,[side*.027,sign*.102,.105]);
   recess.scale.set(.002,.019,.011);recess.rotation.x=sign*.45;
   for(const z of [.107,.127])piece(casting,g.name+'_Tie_Bolt',geometry.tieBolt,brightMetal,[side*.038,sign*.108,z]);
  }
  piece(caliper,g.name+'_Silver_Half_Cone',geometry[side>0?'silverHalfConePlus':'silverHalfConeMinus'],caliperMetal,[side*.034,0,0]);
  piece(caliper,g.name+'_Half_Cover_Seat_Bridge',geometry[side>0?'seatBridgePlus':'seatBridgeMinus'],caliperMetal);
  for(const name of ['Upper','Lower']){
   piece(caliper,g.name+'_Half_Cover_Cut_Edge_'+name,geometry['support'+(side>0?'Plus':'Minus')+name],brightMetal);
   const sign=name==='Upper'?1:-1;
   piece(caliper,g.name+'_Half_Cover_Attachment',geometry.tieBolt,brightMetal,[side*.046,sign*.078,.005]);
  }
  piece(caliper,g.name+'_Upper_Cover_Extension',geometry.guardUpper,caliperMetal);
  piece(caliper,g.name+'_Lower_Cover_Extension',geometry.guardLower,caliperMetal);
  for(const y of [-.128,.128])piece(casting,g.name+'_Caliper_Cross_Bridge',geometry.bridge,rearCaliper,[0,y,.108]);
  instance(caliper,g.name+'_Hydraulic_Piston_Caps',geometry.piston,brightMetal,6,(dummy,i)=>{
   const face=i<3?-1:1;dummy.position.set(face*.025,(i%3-1)*.054,.147);dummy.scale.set(.55,.75,.75);
  });
  instance(caliper,g.name+'_Piston_Centres',geometry.pistonCentre,caliperMetal,6,(dummy,i)=>{
   const face=i<3?-1:1;dummy.position.set(face*.028,(i%3-1)*.054,.147);dummy.scale.set(.55,.75,.75);
  });
  piece(casting,g.name+'_Bleed_Screw',geometry.bleeder,brightMetal,[0,.14,.07]);
  piece(casting,g.name+'_Hydraulic_Union',geometry.union,brightMetal,[-side*.025,.125,.088]);
  const duct=new T.Group();duct.name=g.name+'_Cooling_Duct';g.add(duct);
  piece(duct,g.name+'_One_Piece_Carbon_Shroud',geometry[side>0?'shroudPlus':'shroudMinus'],dark);
  piece(duct,g.name+'_Rear_Machined_Collar',geometry.rearCollar,brightMetal,[-side*.075,0,0]);
  instance(duct,g.name+'_Rear_Collar_Bolts',geometry.bolt,brightMetal,12,(dummy,i)=>{
   const a=i*2*Math.PI/12;dummy.position.set(-side*.064,Math.cos(a)*.156,Math.sin(a)*.156);
  });
  piece(duct,g.name+'_Basket_Shell',geometry.basketWall,basketMetal,[-side*.055,0,0]);
  piece(duct,g.name+'_Forward_Basket_Band',geometry.basketBand,windowMetal,[-side*.030,0,0]);
  instance(duct,g.name+'_Basket_Window_Frames',geometry.basketWindowFrame,windowMetal,8,(dummy,i)=>{
   const a=i*2*Math.PI/8;dummy.position.set(-side*.055,Math.cos(a)*.148,Math.sin(a)*.148);dummy.rotation.x=a;dummy.scale.x=.68;
  });
  instance(duct,g.name+'_Basket_Windows',geometry.basketWindow,basketMetal,8,(dummy,i)=>{
   const a=i*2*Math.PI/8;dummy.position.set(-side*.055,Math.cos(a)*.152,Math.sin(a)*.152);dummy.rotation.x=a;dummy.scale.x=.68;
  });
  instance(duct,g.name+'_Cooling_Edge_Ports',geometry.edgePort,brightMetal,56,(dummy,i)=>{
   const a=i*2*Math.PI/56;dummy.position.set(-side*.030,Math.cos(a)*.157,Math.sin(a)*.157);dummy.rotation.x=a;
  });
  for(const front of [-1,1]){
   const module=piece(duct,g.name+'_Basket_Service_Module',geometry.basketModule,basketMetal,[-side*.055,0,front*.155]);module.scale.x=.72;
   for(const y of [-.018,0,.018])piece(duct,g.name+'_Service_Connector',geometry.connector,connectorGold,[-side*.055,y,front*.161]);
  }
  g.traverse(m=>{if(m.isMesh){m.userData.part='Brakes';m.castShadow=true;m.receiveShadow=true;}});
  return {g,base,side:mountSide,rotor,disc,bell,caliper,duct,radius:w.radius};
 });
 return {root,assemblies,dispose(){for(const g of Object.values(geometry))g.dispose();for(const m of [carbon,edge,vent,bellMetal,brightMetal,caliperMetal,wrapMetal,rearCaliper,wordmark,dark,pad,basketMetal,windowMetal,bronzeRim,connectorGold,recessMetal])m.dispose();}};
}
