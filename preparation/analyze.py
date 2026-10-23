"""Read-only source topology analysis in Blender; no remeshing or cutting."""
import bpy, json, struct, pathlib, numpy as np
ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCE=ROOT/'2026-mercedes-w17/source/f1_2026_w17.glb'
data=SOURCE.read_bytes(); n=struct.unpack_from('<I',data,12)[0]
gltf=json.loads(data[20:20+n]); binary=data[28+n:]
DT={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}
SIZE={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}
def accessor(i):
 a=gltf['accessors'][i];v=gltf['bufferViews'][a['bufferView']]
 return np.frombuffer(binary,dtype=DT[a['componentType']],count=a['count']*SIZE[a['type']],offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(a['count'],SIZE[a['type']]).copy()
def group_faces(pos,tri,weld=False):
 parent=list(range(len(pos)))
 def find(a):
  while parent[a]!=a:parent[a]=parent[parent[a]];a=parent[a]
  return a
 def join(a,b):
  a=find(a);b=find(b)
  if a!=b:parent[b]=a
 if weld:
  seen={}
  for i,v in enumerate(pos):
   key=tuple(v)
   if key in seen:join(i,seen[key])
   else:seen[key]=i
 for a,b,c in tri:join(int(a),int(b));join(int(a),int(c))
 groups={}
 for i,t in enumerate(tri):groups.setdefault(find(int(t[0])),[]).append(i)
 return sorted(groups.values(),key=lambda f:(-len(f),f[0]))
bpy.ops.wm.read_factory_settings(use_empty=True)
records=[];counts=[];welded_records=[]
for pi,p in enumerate(gltf['meshes'][0]['primitives']):
 pos=accessor(p['attributes']['POSITION']);tri=accessor(p['indices']).reshape(-1,3)
 world=pos[:,[0,2,1]].astype(float);world[:,1]*=-1
 mesh=bpy.data.meshes.new(f'P{pi}_analysis');mesh.from_pydata(world.tolist(),[],tri.tolist());mesh.update()
 groups=group_faces(pos,tri); welded=group_faces(pos,tri,True)
 face_weld={f:wi for wi,faces in enumerate(welded) for f in faces}
 for wi,faces in enumerate(welded):
  coords=world[tri[faces].reshape(-1)];lo=coords.min(0);hi=coords.max(0)
  welded_records.append({'id':f'p{pi}_w{wi}','primitive':pi,'island':wi,'triangles':len(faces),'faces':faces,'min':lo.tolist(),'max':hi.tolist()})
 counts.append({'primitive':pi,'triangles':len(tri),'indexedIslands':len(groups),'weldedIslands':len(welded)})
 for gi,faces in enumerate(groups):
  coords=world[tri[faces].reshape(-1)];lo=coords.min(0);hi=coords.max(0)
  records.append({'id':f'p{pi}_i{gi}','primitive':pi,'island':gi,'welded':face_weld[faces[0]],'triangles':len(faces),'faces':faces,'min':lo.tolist(),'max':hi.tolist(),'center':((lo+hi)/2).tolist(),'size':(hi-lo).tolist()})
 bpy.data.meshes.remove(mesh)
(ROOT/'preparation/islands.json').write_text(json.dumps(records,separators=(',',':')))
(ROOT/'preparation/welded-islands.json').write_text(json.dumps(welded_records,separators=(',',':')))
(ROOT/'preparation/topology-summary.json').write_text(json.dumps(counts,indent=2))
print(json.dumps(counts));print('Islands',len(records))
