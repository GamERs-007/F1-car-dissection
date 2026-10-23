import fs from 'node:fs';
import * as T from 'three';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {createBrakes} from '../src/brake-assembly.js';

// Export the runtime geometry itself for offline multi-view inspection.
globalThis.FileReader=class {
 readAsArrayBuffer(blob){blob.arrayBuffer().then(buffer=>{this.result=buffer;this.onloadend?.();});}
 readAsDataURL(blob){blob.arrayBuffer().then(buffer=>{this.result=`data:${blob.type};base64,${Buffer.from(buffer).toString('base64')}`;this.onloadend?.();});}
};
const brakes=createBrakes([{name:'Wheel_FL',center:new T.Vector3(.075,0,0),axis:new T.Vector3(1,0,0),orientation:new T.Quaternion(),radius:.34}]);
brakes.root.updateMatrixWorld(true);
const output=await new GLTFExporter().parseAsync(brakes.root,{binary:true});
const path=new URL('../evidence/brake-corrected.glb',import.meta.url);
fs.writeFileSync(path,Buffer.from(output));
console.log(`Exported ${output.byteLength} bytes`);
brakes.dispose();
