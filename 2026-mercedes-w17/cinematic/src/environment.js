import * as T from 'three';
// Deterministic, locally generated circuit materials. No remote textures.
function asphalt(){const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d'),data=ctx.createImageData(256,256);let seed=7619;for(let i=0;i<data.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const v=55+(seed%27);data.data.set([v,v+1,v+2,255],i);}ctx.putImageData(data,0,0);const t=new T.CanvasTexture(canvas);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(14,650);t.colorSpace=T.SRGBColorSpace;t.anisotropy=4;return t;}
export function circuit(){
 const group=new T.Group(),materials=[];const mat=(color,roughness=1)=>{const m=new T.MeshStandardMaterial({color,roughness,transparent:true});materials.push(m);return m;};
 const roadmat=mat(0x81888a);roadmat.map=asphalt();
 const road=new T.Mesh(new T.PlaneGeometry(14,1200),roadmat);road.rotation.x=-Math.PI/2;road.position.set(0,-.052,350);road.receiveShadow=true;group.add(road);
 const grass=mat(0x253e33);for(const s of [-1,1]){const m=new T.Mesh(new T.PlaneGeometry(130,1200),grass);m.rotation.x=-Math.PI/2;m.position.set(s*72,-.068,350);group.add(m);}
 const white=mat(0xc0c4ba),red=mat(0xa13037),barrier=mat(0x637079,.48),dark=mat(0x17252c),stand=mat(0x303d42);
 function instances(geo,material,poses){const mesh=new T.InstancedMesh(geo,material,poses.length),dummy=new T.Object3D();poses.forEach((p,i)=>{dummy.position.set(...p.slice(0,3));dummy.rotation.set(0,0,0);if(p[3])dummy.rotation.y=p[3];dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});mesh.receiveShadow=true;group.add(mesh);return mesh;}
 for(const side of [-1,1]){
  const border=new T.Mesh(new T.BoxGeometry(.10,.006,1200),white);border.position.set(side*6.65,-.043,350);group.add(border);
  const reds=[],whites=[];for(let i=0;i<300;i++)(i%2?reds:whites).push([side*7.25,-.035,-240+i*4]);instances(new T.BoxGeometry(1.1,.055,4),red,reds);instances(new T.BoxGeometry(1.1,.055,4),white,whites);
  for(let y=.25;y<.9;y+=.25){const rail=new T.Mesh(new T.BoxGeometry(.11,.19,1100),barrier);rail.position.set(side*9.1,y,280);group.add(rail);}
  const posts=[];for(let z=-230;z<810;z+=8)posts.push([side*9.15,1.7,z]);instances(new T.CylinderGeometry(.035,.035,3.4,6),barrier,posts);
  const fence=[];for(let z=-230;z<810;z+=2.0)fence.push(side*9.13,.8,z,side*9.13,3.3,z+2);for(let y=1;y<3.3;y+=.45)fence.push(side*9.13,y,-230,side*9.13,y,810);const fg=new T.BufferGeometry();fg.setAttribute('position',new T.Float32BufferAttribute(fence,3));const fm=new T.LineBasicMaterial({color:0x688084,transparent:true,opacity:.25});materials.push(fm);group.add(new T.LineSegments(fg,fm));
  for(let z=30;z<700;z+=72){for(let tier=0;tier<6;tier++){const seats=new T.Mesh(new T.BoxGeometry(4,.5,48),tier%2?dark:stand);seats.position.set(side*(13+tier*.7),.4+tier*.65,z);group.add(seats);}const roof=new T.Mesh(new T.BoxGeometry(9,.13,52),barrier);roof.position.set(side*16,5.5,z);group.add(roof);}
 }
 // Pit-side architecture and gantries anchor the speed cues in physical geometry.
 for(let z=5;z<760;z+=110){const beam=new T.Mesh(new T.BoxGeometry(21,.7,.6),dark);beam.position.set(0,7,z);group.add(beam);for(const s of [-1,1]){const post=new T.Mesh(new T.BoxGeometry(.35,7,.35),barrier);post.position.set(s*10,3.5,z);group.add(post);}const stripe=new T.Mesh(new T.BoxGeometry(9,.065,.64),new T.MeshBasicMaterial({color:0x00d2be,transparent:true}));stripe.position.set(0,7.12,z);materials.push(stripe.material);group.add(stripe);}
 const mountains=new T.BufferGeometry(),v=[];for(let i=0;i<55;i++){const x=-350+i*14,h=18+Math.sin(i*2.1)*9+Math.cos(i*.37)*16;v.push(x,-1,600,x,h,600,x+14,-1,600);}mountains.setAttribute('position',new T.Float32BufferAttribute(v,3));mountains.computeVertexNormals();const mm=new T.MeshBasicMaterial({color:0x223d49,side:T.DoubleSide,transparent:true});materials.push(mm);group.add(new T.Mesh(mountains,mm));
 const originals=materials.map(m=>m.opacity);
 return {group,update(state){group.visible=state.studio<.999;group.position.z=-state.roadDistance;materials.forEach((m,i)=>m.opacity=originals[i]*(1-state.studio));}};
}
export function studio(){
 const group=new T.Group(),floorMat=new T.MeshBasicMaterial({color:0x020709,transparent:true,opacity:0}),floor=new T.Mesh(new T.PlaneGeometry(220,220),floorMat);floor.rotation.x=-Math.PI/2;floor.position.y=-.075;floor.receiveShadow=true;group.add(floor);
 const grid=new T.GridHelper(60,90,0x16413f,0x102224);grid.position.y=-.067;grid.material.transparent=true;grid.material.opacity=0;grid.material.depthWrite=false;group.add(grid);
 const scanMat=new T.MeshBasicMaterial({color:0x00d2be,side:T.DoubleSide,transparent:true,opacity:0,depthWrite:false});const scan=new T.Mesh(new T.PlaneGeometry(5,2.3),scanMat);scan.position.y=1;group.add(scan);
 return {group,update(s){group.visible=s.studio>.001;floor.position.y=s.lift-1.035;grid.position.y=s.lift-1.027;scan.position.y=1+s.lift;floorMat.opacity=s.studio;grid.material.opacity=s.studio*.13;scanMat.opacity=s.scan*.10;scan.position.z=3.5-7*Math.min(1,Math.max(0,(s.p-.15)/.1));}};
}



