import test from 'node:test';
import assert from 'node:assert/strict';
import * as T from 'three';
import {createBrakes,poseBrakeAssembly,BRAKE_PROPORTIONS} from '../src/brake-assembly.js';

test('drilled disc, solid center and single folded shroud retain real openings and reversible poses',()=>{
 const brakes=createBrakes([-1,1].map(side=>({name:side>0?'Wheel_FL':'Wheel_FR',center:new T.Vector3(side*.075,0,0),axis:new T.Vector3(1,0,0),orientation:new T.Quaternion(),radius:.34})));
 brakes.root.updateMatrixWorld(true);
 const hit=(mesh,y,z)=>new T.Raycaster(new T.Vector3(.6,y,z),new T.Vector3(-1,0,0)).intersectObject(mesh,false).length>0;
 for(const b of brakes.assemblies){
  const plate=b.disc.getObjectByName(b.g.name+'_Friction_Face');
  assert.equal(hit(plate,.126,0),false,'drill center must pass through the disc');
  assert.equal(hit(plate,.126*Math.cos(Math.PI/56),.126*Math.sin(Math.PI/56)),true,'material remains between holes');
  const shroud=b.duct.getObjectByName(b.g.name+'_One_Piece_Carbon_Shroud');
  const inletZ=shroud.geometry.userData.inletZ;
  assert.equal(hit(shroud,.20,inletZ),false,'centered inlet is an opening');
  assert.equal(hit(shroud,.20,inletZ+.005),true,'material borders the inlet');
  shroud.geometry.computeBoundingBox();const bounds=shroud.geometry.boundingBox;
  assert(bounds.max.x-bounds.min.x>.05,'the same mesh folds forward at its crown');
  assert(bounds.max.z-bounds.min.z>.48&&bounds.max.z-bounds.min.z<.52,'backing leaves a visible carbon border');
  assert(bounds.min.y>-.21&&bounds.min.y<-.18,'backing extends beyond the lower caliper edge');
  for(let i=0;i<24;i++){
   const a=i*Math.PI/12;
   assert(hit(shroud,.182*Math.cos(a),.182*Math.sin(a)),'complete outer brake perimeter fits within the carbon backing');
  }
  const core=b.disc.getObjectByName(b.g.name+'_Solid_Center_Core');
  for(const radius of [.01,.04,.075])assert(hit(core,radius,0),'center stays filled beneath the carrier');
  core.geometry.computeBoundingBox();
  const halfCover=b.caliper.getObjectByName(b.g.name+'_Silver_Half_Cone');halfCover.geometry.computeBoundingBox();
  assert(Math.abs(core.geometry.boundingBox.max.y-BRAKE_PROPORTIONS.centerRadius)<1e-7);
  assert(Math.abs(halfCover.geometry.boundingBox.max.y-core.geometry.boundingBox.max.y)<1e-7,'filled rotor center and reduced half-cover share a radius');
  assert.equal(b.caliper.getObjectByName(b.g.name+'_Casting').scale.y,BRAKE_PROPORTIONS.caliperRadiusScale);
  assert.equal(b.caliper.getObjectByName(b.g.name+'_Casting').position.z,BRAKE_PROPORTIONS.caliperLeftShift);
  for(const a of [-.8,-.4,0,.4,.8]){
   const r=BRAKE_PROPORTIONS.centerRadius+.001;
   assert(hit(b.caliper.getObjectByName(b.g.name+'_Half_Cover_Seat_Bridge'),r*Math.sin(a),r*Math.cos(a)),'shifted caliper stays joined to the half-cover seat');
  }
  const body=b.caliper.getObjectByName(b.g.name+'_Solid_Cast_Body');body.geometry.computeBoundingBox();
  assert(body.geometry.boundingBox.max.x-body.geometry.boundingBox.min.x<.06,'caliper clamps only rotor thickness');
  const gap=BRAKE_PROPORTIONS.rotorRadius*.01;
  for(const sign of [-1,1]){
   const hits=new T.Raycaster(new T.Vector3(sign*.0185,0,.15),new T.Vector3(sign,0,0)).intersectObject(body,false);
   assert(hits.length>0&&Math.abs(hits[0].distance-gap)<1e-6,'open rotor throat leaves 1% of rotor radius on each face');
  }
  const throat=new T.Raycaster(new T.Vector3(0,0,0),new T.Vector3(0,0,1)).intersectObject(body,false);
  assert(throat.length>0&&Math.abs(throat[0].distance-(.163+gap))<1e-6,'central bridge is hollowed to clear the rotor perimeter');
  assert(new T.Box3().setFromObject(b.caliper).min.z>=-1e-6,'caliper and both wraparound lips stay within one half of the disc');
  const letters=b.caliper.getObjectByName(b.g.name+'_Brembo_Wordmark').geometry.attributes.position;
  let minZ=Infinity,maxZ=-Infinity;for(let i=0;i<letters.count;i++){minZ=Math.min(minZ,letters.getZ(i));maxZ=Math.max(maxZ,letters.getZ(i));}
  assert(maxZ-minZ>.015,'lettering follows a visible arc');
  const basket=b.duct.getObjectByName(b.g.name+'_Basket_Shell');
  assert(hit(basket,0,0),'center housing is capped and solid');
  for(const guard of ['Upper','Lower']){
   const cover=b.caliper.getObjectByName(b.g.name+'_'+guard+'_Cover_Extension');
   assert.equal(cover.geometry.type,'ExtrudeGeometry');
   assert.equal(cover.parent,b.caliper,'end covers remain concentric with the rotor instead of following the outward casting shift');
   const p=cover.geometry.attributes.position;let minRadius=Infinity;
   for(let i=0;i<p.count;i++)minRadius=Math.min(minRadius,Math.hypot(p.getY(i),p.getZ(i)));
   assert(Math.abs(minRadius-(.163+gap))<1e-6,'both end covers follow the disc rim with the same 1% radial clearance');
  }
  const before=b.g.matrixWorld.clone();poseBrakeAssembly(b,1);poseBrakeAssembly(b,0);brakes.root.updateMatrixWorld(true);assert.deepEqual(b.g.matrixWorld.elements,before.elements);
 }
 brakes.dispose();
});

test('front and rear right brakes mirror the complete left assemblies, including camber and study poses',()=>{
 const wheels=[];
 for(const [axle,z,camber] of [['F',1.6,.035],['R',-1.4,.015]])for(const side of [1,-1]){
  const orientation=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),-side*camber);
  wheels.push({name:'Wheel_'+axle+(side>0?'L':'R'),center:new T.Vector3(side*.78,.32,z),axis:new T.Vector3(1,0,0).applyQuaternion(orientation),orientation,radius:.34});
 }
 const brakes=createBrakes(wheels),mirror=new T.Matrix4().makeScale(-1,1,1);
 try{
  assert.equal(brakes.assemblies.length,4);
  for(const study of [0,.5,1]){
   for(const b of brakes.assemblies){poseBrakeAssembly(b,study);b.rotor.rotation.x=1.3;}
   brakes.root.updateMatrixWorld(true);
   for(let axle=0;axle<2;axle++){
    const left=brakes.assemblies[axle*2],right=brakes.assemblies[axle*2+1],lm=[],rm=[];
    left.g.traverse(o=>{if(o.isMesh)lm.push(o);});right.g.traverse(o=>{if(o.isMesh)rm.push(o);});
    assert.equal(lm.length,rm.length);
    for(let i=0;i<lm.length;i++){
     assert.equal(lm[i].geometry,rm[i].geometry,'right side uses the same accepted model geometry');
     const expected=mirror.clone().multiply(lm[i].matrixWorld);
     for(let j=0;j<16;j++)assert(Math.abs(expected.elements[j]-rm[i].matrixWorld.elements[j])<1e-9,'every fitting is reflected across the car centerline');
     if(lm[i].isInstancedMesh)assert.deepEqual(rm[i].instanceMatrix.array,lm[i].instanceMatrix.array);
    }
    const shaft=right.hub??right.g.getObjectByName(right.g.name+'_Spindle_End');
    assert(shaft.getWorldPosition(new T.Vector3()).x<right.base.x,'right spindle points outward');
   }
  }
 }finally{brakes.dispose();}
});
