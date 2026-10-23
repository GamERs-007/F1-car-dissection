import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
const sourceGlb=new URL('../source/f1_2026_w17.glb',import.meta.url);
const v6Glb=new URL('../../v6 engine/v6_car_engine_with_engine_morethem.glb',import.meta.url);
const v6Asset={name:'provided-v6-asset',
 configureServer(server){server.middlewares.use('/models/v6_car_engine_with_engine_morethem.glb',(_req,res)=>{res.setHeader('Content-Type','model/gltf-binary');res.setHeader('Content-Length',fs.statSync(v6Glb).size);fs.createReadStream(v6Glb).pipe(res);});},
 generateBundle(){this.emitFile({type:'asset',fileName:'models/v6_car_engine_with_engine_morethem.glb',source:fs.readFileSync(v6Glb)});},
};
const referenceAsset={name:'read-only-source-reference',
 configureServer(server){server.middlewares.use('/reference/original.glb',(_req,res)=>{res.setHeader('Content-Type','model/gltf-binary');res.setHeader('Content-Length',fs.statSync(sourceGlb).size);fs.createReadStream(sourceGlb).pipe(res);});},
 generateBundle(){this.emitFile({type:'asset',fileName:'reference/original.glb',source:fs.readFileSync(sourceGlb)});},
};
export default defineConfig({
  plugins: [react(), tailwindcss(),referenceAsset,v6Asset],
  publicDir: '../public',
  server: {fs: {allow: ['../..']}},
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main:fileURLToPath(new URL('./index.html',import.meta.url)),
        brakeLab:fileURLToPath(new URL('./brake-lab.html',import.meta.url)),
        runningGearLab:fileURLToPath(new URL('./running-gear-lab.html',import.meta.url)),
      },
      output: {manualChunks: {three: ['three', '@react-three/fiber'], motion: ['gsap']}},
    },
  },
});
