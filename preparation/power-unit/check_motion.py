import bpy,json,pathlib,struct,numpy as np
from mathutils.bvhtree import BVHTree
R=pathlib.Path(__file__).resolve().parents[2];OUT=R/'2026-mercedes-w17/public/models';W=R/'preparation/power-unit'
c=json.loads((OUT/'w17_v6_hybrid_config.json').read_text());cc=json.loads((OUT/'mercedes_w17_components.json').read_text());rows=json.loads((R/'preparation/assignments.json').read_text());islands=json.loads((R/'preparation/islands.json').read_text())
raw=(R/'2026-mercedes-w17/source/f1_2026_w17.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+n]);b=raw[28+n:]
def acc(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];return np.frombuffer(b,dtype={5126:'<f4',5123:'<u2',5125:'<u4'}[a['componentType']],count=a['count']*{'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']],offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(a['count'],-1)
pos=[acc(p['attributes']['POSITION'])[:,[0,2,1]]*[1,-1,1] for p in j['meshes'][0]['primitives']];tris=[acc(p['indices']).reshape(-1,3) for p in j['meshes'][0]['primitives']]
car={};hidden=set(c['legacyPatches'])
for comp in cc['components']:
 vv=[];ff=[];patchmeta=[]
 for row in rows:
  if row['component']!=comp['name'] or row['id'] in hidden:continue
  points=pos[row['primitive']][tris[row['primitive']][row['faces']]].reshape(-1,3);base=len(vv);vv.extend(points);patchmeta.extend([row['id']]*len(row['faces']));ff.extend((base+i,base+i+1,base+i+2) for i in range(0,len(points),3))
 car[comp['name']]=(np.array(vv),ff,np.array(comp['explodedOffset']),patchmeta)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(OUT/c['model']));bpy.context.view_layer.update()
engine={}
for comp in c['components']:
 g=bpy.data.objects[comp['name']];vv=[];ff=[]
 for ob in g.children:
  if ob.type!='MESH':continue
  ob.data.calc_loop_triangles();base=len(vv);vv.extend([(ob.matrix_world@v.co)[:] for v in ob.data.vertices]);ff.extend(tuple(base+i for i in t.vertices) for t in ob.data.loop_triangles)
 engine[comp['name']]=(np.array(vv)[:,[0,2,1]]*[1,1,-1],ff,np.array(comp['explodedOffset']))
def ease(t):t=max(0,min(1,t));return t*t*(3-2*t)
results=[]
for t in np.linspace(0,1,51):
 cv=[];cf=[];meta=[]
 for name,(v,f,o,pm) in car.items():
  base=len(cv);cv.extend(v+o*ease(t));cf.extend(tuple(base+i for i in tri) for tri in f);meta.extend(pm)
 tree=BVHTree.FromPolygons(cv,cf,all_triangles=True);hits={}
 for name,(v,f,o) in engine.items():
  clear=ease((t-.45)/.15);extract=ease((t-.6)/.2)
  ev=v+np.array([1.35*extract,.22*clear+.68*extract,-.05*extract])+o*ease((t-.8)/.2);et=BVHTree.FromPolygons(ev,f,all_triangles=True);overlap=et.overlap(tree)
  if overlap:hits[name]={'pairs':len(overlap),'car':sorted(set(meta[y] for x,y in overlap))}
 results.append({'progress':round(float(t),3),'intersections':hits});print(results[-1],flush=True)
(W/'motion-clearance.json').write_text(json.dumps(results,indent=2))


assert all(not row['intersections'] for row in results), 'Engine extraction intersects retained car surfaces'
