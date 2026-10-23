// One catalog for navigation, educational copy, cameras and cinematic timing.
// timing[1] adds study seconds to the uniform edit; camera transitions retain
// their original speed. Other timing entries retain the legacy pacing preset.
export const focusChapters=[
 {id:'front-wing',at:.45,end:.515,name:'Front Wing',system:'AERODYNAMICS',timing:[1.6,6,1],parts:['Front_Wing'],point:[0,.55,3.8],camera:[4.4,2.2,8.5],target:[-.5,.65,3.25],fov:37,visual:'airflow',callout:'Pressure difference → front-axle load',
 description:'The front wing creates downforce through a pressure difference across its surfaces. It also directs airflow around the front tyres, shaping the air that reaches the rest of the car.'},
 {id:'rear-wing',at:.515,end:.58,name:'Rear Wing',system:'AERODYNAMIC BALANCE',timing:[1.8,6,1],parts:['Rear_Wing'],point:[0,1.55,-3.38],camera:[4.4,2.5,-7.7],target:[-.5,1.55,-3.4],fov:38,visual:'airflow',callout:'Downforce ↔ aerodynamic drag',
 description:'The rear wing generates downforce to help the rear tyres transmit cornering and traction forces. More aerodynamic load generally costs drag, so wing configuration balances grip against straight-line speed.'},
 {id:'wheels',at:.58,end:.605,name:'Wheels & Tyres',system:'CONTACT WITH THE TRACK',timing:[1.5,6,1],parts:['Wheel_FL','Wheel_FR','Wheel_RL','Wheel_RR'],point:[1.93,.32,1.62],camera:[5.4,1.35,4.8],target:[1.5,.35,1.62],fov:36,visual:'rotation',callout:'Contact patch → braking, cornering, traction',
 description:'The tyres transmit braking, cornering and driving forces through their contact patches. Their deformation and temperature affect grip; the wheels carry these loads into the hubs and suspension.'},
 {id:'suspension',at:.605,end:.628,name:'Suspension',system:'LOAD CONTROL',timing:[1.4,6,1],parts:['Suspension_Front','Suspension_Rear'],point:[.85,.45,1.44],camera:[4.3,1.9,4.5],target:[.5,.4,1.3],fov:36,visual:'load',callout:'Wheel load → wishbones → chassis',
 description:'Wishbones guide wheel movement, while push- or pull-rods transfer loads to inboard springs and dampers. Controlling wheel contact and ride height helps maintain both mechanical grip and a stable aerodynamic platform.'},
 {id:'brakes',at:.628,end:.65,name:'Brakes',system:'KINETIC ENERGY TO HEAT',timing:[1.3,6.5,1],parts:['Brakes'],point:[1.38,.32,1.62],camera:[3.2,1.15,3.6],target:[1.48,.34,1.62],fov:32,visual:'heat',callout:'Caliper pressure → disc friction → heat',
 description:'The layered carbon disc rotates with the wheel while a fixed silver Brembo caliper clamps its pads. A bronze-toned carrier joins the disc to the hub, and the swept carbon shroud guides cooling air around the brake.'},
 {id:'floor',at:.65,end:.715,name:'Floor / Diffuser',system:'UNDERFLOOR AERODYNAMICS',timing:[1.6,6.5,1],parts:['Floor_Diffuser'],point:[.5,-.6,-.7],camera:[5.7,1.25,6.2],target:[-.5,-.4,-.35],fov:41,visual:'airflow',callout:'Underfloor flow → controlled pressure recovery',
 description:'The floor helps create low pressure beneath the car, contributing downforce. The diffuser expands the flow toward the rear, recovering pressure while limiting separation; ride height strongly affects this airflow.'},
 {id:'halo',at:.715,end:.74,name:'Halo',system:'DRIVER PROTECTION',timing:[1.4,5.5,1],parts:['Halo'],point:[0,2.3,.3],camera:[3.5,3.6,3.8],target:[-.1,2.2,.3],fov:37,visual:'load',callout:'Protective structure → survival-cell mountings',
 description:'The halo forms a protective structure around the cockpit opening. Its titanium structure redirects impact loads into mountings on the survival cell, helping protect the driver from large objects and other cars.'},
 {id:'monocoque',at:.74,end:.762,name:'Monocoque',system:'SURVIVAL CELL',timing:[1.4,6,1],parts:['Chassis_Body'],point:[0,.6,.3],camera:[4.7,3,5.2],target:[-.3,.65,.3],fov:38,visual:'load',callout:'Composite shell → stiffness and protection',
 description:'The carbon-fibre composite monocoque is the car’s survival cell and central load-bearing structure. Its stiff shell supports the front suspension and protects the driver, while carefully arranged fibres carry loads efficiently.',note:'Survival cell shown within the existing body assembly.'},
 {id:'engine-cover',at:.762,end:.78,name:'Engine Cover',system:'BODYWORK & COOLING',timing:[1.3,5.5,.9],parts:['Engine_Cover'],point:[0,1.9,-1.25],camera:[4.8,3.6,-5.3],target:[-.2,1.8,-1.15],fov:38,visual:'airflow',callout:'External airflow ↔ cooling-air exit',
 description:'The engine cover encloses the power unit and shapes airflow toward the rear of the car. Its packaging and cooling exits balance heat rejection with aerodynamic performance.'},
 {id:'power-unit',at:.78,end:.85,holdAt:.825,navAt:.802,finalHold:1.8,name:'V6 Hybrid Engine',system:'V6 HYBRID ENGINE',timing:[2.2,9.2,1.4],parts:['Power_Unit'],point:[1.35,1.42,-1.18],camera:[3.36,2.47,1.42],target:[1.15,1.42,-1.18],fov:37,visual:'mechanism',callout:'Pistons → connecting rods → crankshaft',
 description:'A V6 hybrid engine study, focused on the mechanical V6 assembly. Watch six pistons drive their connecting rods and crankshaft, then follow the engine as it closes and returns to the car.',note:'Generic V6 geometry. Hybrid hardware is not represented by this model; this is not an exact Mercedes W17 power unit.'},
];
export const chapters=[
 {id:'racing',at:0,end:.15,name:'Racing',seconds:4.5},
 {id:'reveal',at:.15,end:.25,name:'Slow-motion reveal',seconds:5},
 {id:'dissection',at:.25,end:.45,name:'Dissection',seconds:6},
 ...focusChapters,
 {id:'reassemble',at:.85,end:1,name:'Reassemble & launch',seconds:8},
];
export const chapterNav=chapters.map(c=>({...c,label:c.name,p:c.at===0?0:c.at+(c.end-c.at)*.52}));
export const chapterAt=p=>Math.max(0,chapters.findIndex(c=>p>=c.at&&(p<c.end||c.end===1)));
