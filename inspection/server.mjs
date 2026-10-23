import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.glb':'model/gltf-binary','.png':'image/png','.md':'text/plain'};
http.createServer((req,res)=>{
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);return res.end();}
 let p;try{p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end();}
 if(p==='/')p='/inspection/index.html';
 const file=path.resolve(root,'.'+p),relative=path.relative(root,file);
 if(relative.startsWith('..')||path.isAbsolute(relative)||!['inspection','2026-mercedes-w17'].includes(relative.split(path.sep)[0])||relative.split(path.sep).some(s=>s.startsWith('.'))){res.writeHead(403);return res.end();}
 fs.stat(file,(err,stat)=>{if(err||!stat.isFile()){res.writeHead(404);return res.end();}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache'});if(req.method==='HEAD')return res.end();const stream=fs.createReadStream(file);stream.on('error',()=>res.destroy());stream.pipe(res);});
}).listen(4173,'127.0.0.1',()=>console.log('Inspector: http://127.0.0.1:4173/inspection/index.html'));
