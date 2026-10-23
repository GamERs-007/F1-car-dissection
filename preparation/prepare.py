"""Conservative, whole-patch assembly processing using Blender bpy and BVH.
No triangle is cut, dissolved, duplicated, welded, or moved in the assembled state.
Run after analyze.py. Final GLB packing is lossless and separate from Blender's
material/image exporter so original texture bytes and PBR extensions survive.
"""
import bpy, json, struct, pathlib, numpy as np
from mathutils import Vector, Matrix, Quaternion
from mathutils.bvhtree import BVHTree
ROOT=pathlib.Path(__file__).resolve().parents[1]
WORK=ROOT/'preparation'; ASSET=ROOT/'2026-mercedes-w17'
raw=(ASSET/'source/f1_2026_w17.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0]
j=json.loads(raw[20:20+n]);binary=raw[28+n:]
def acc(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']]
 return np.frombuffer(binary,dtype={5126:'<f4',5123:'<u2',5125:'<u4'}[a['componentType']],count=a['count']*{'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']],offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(a['count'],-1).copy()
prims=j['meshes'][0]['primitives'];positions=[acc(p['attributes']['POSITION']) for p in prims];tris=[acc(p['indices']).reshape(-1,3) for p in prims]
# Source's +90 X rotation, retained verbatim in the final GLB. Analysis uses its
# equivalent axis mapping; negligible non-unit quaternion rounding is validated later.
world=[p[:,[0,2,1]].astype(float)*[1,-1,1] for p in positions]
islands=json.loads((WORK/'islands.json').read_text());welded=json.loads((WORK/'welded-islands.json').read_text())
byid={r['id']:r for r in islands}
names=['Chassis_Body','Front_Wing','Rear_Wing','Wheel_FL','Wheel_FR','Wheel_RL','Wheel_RR','Floor_Diffuser','Halo','Suspension_Front','Suspension_Rear','Engine_Cover']
for r in islands:r.update(component='Chassis_Body',reason='Conservative retained geometry',review=False)
def assign(r,c,why):r.update(component=c,reason=why)
def set_weld(p,ids,c,why):
 for r in islands:
  if r['primitive']==p and r['welded'] in ids:assign(r,c,why)
# The wheel-specific materials contain disjoint surface islands at four measured
# tire centers. +X is vehicle LEFT, corroborated by the authored left mirror.
wheel_centers={}
for w in welded:
 if w['primitive']==14:
  c=(np.array(w['min'])+w['max'])/2
  key='Wheel_'+('F' if c[2]>0 else 'R')+('L' if c[0]>0 else 'R');wheel_centers[key]=c
for r in islands:
 if r['primitive'] in [11,12,13,14]:
  coord=world[r['primitive']][tris[r['primitive']][r['faces']].reshape(-1)]
  keys=list(wheel_centers);dist=np.array([np.linalg.norm(coord-c,axis=1) for c in wheel_centers.values()])
  nearest=dist.argmin(0)
  assert np.all(nearest==nearest[0]),'A wheel patch crosses wheel clusters'
  assign(r,keys[int(nearest[0])],'Wheel material + intact island + unanimous nearest measured tire center')
 if r['primitive']==9:assign(r,'Halo','Visually verified dedicated halo primitive')
set_weld(2,[71,72],'Halo','Halo stalk underside, coincident with main halo at original seams')
# Explicit topology seeds verified against inspection geometry. These are whole
# connected components, not face coordinates clipped by a plane.
set_weld(4,[0,13,14,21,22,27,28,35,54,55,56],'Front_Wing','Verified front wing/nose connected surfaces')
set_weld(4,[7,8,15,16,17,47,48,51,52],'Rear_Wing','Verified rear wing, supports, beam surfaces and endplate trim')
set_weld(2,[4,5],'Rear_Wing','Rear wing endplate connected surfaces')
set_weld(8,[6,7,8,9,10],'Rear_Wing','Rear wing painted surfaces')
set_weld(8,[1],'Engine_Cover','Separate rear engine-cover painted shell')
set_weld(4,[24],'Engine_Cover','Matching rear engine-cover interior surface')
set_weld(2,[6,7,12,13,33,34,39,40,41,42,43,44,45,46,47,48,53,54,55,56,57,58,59,60],'Suspension_Front','Paired front external arms, rods and mounting surfaces')
set_weld(2,[8,9,23,24,29,30,31,32,35,36,49,50,51,52,63,64,65,66,67,68,69,70],'Suspension_Rear','Paired rear external arms, rods and mounting surfaces')
set_weld(4,[70,71,74,75,80,84,90,91],'Suspension_Rear','Matching rear link details')
set_weld(4,[72,73,76,77,78,79,81,82,83,85,86,87,88,89],'Suspension_Front','Matching front link details')
set_weld(2,[1,2,3,10,11,14,15,16,17,19,20,21,22,25,26,27,28,37,38,61,62],'Floor_Diffuser','Underfloor diffuser tunnels, outer fences and strakes')
set_weld(4,[9,10,44,46],'Floor_Diffuser','Rear lower floor strakes')
for r in islands:
 p=r['primitive'];lo=r['min'];hi=r['max']
 if p==8 and lo[2]>=1.633 and hi[2]>1.70:
  assign(r,'Front_Wing','Complete paint patch on verified nose/wing side of the existing z≈1.635 seam')
 if p==2 and r['welded']==0 and hi[1]<=0.30:
  assign(r,'Floor_Diffuser','Intact low underfloor patch of mixed carbon shell; floor seeds confirm neighboring surfaces')
# Match overlays/fittings to real underlying surfaces. The comparison includes
# the retained chassis so proximity cannot blindly pull every detail outward.
structural={c:[[],[]] for c in names}
for r in islands:
 if r['primitive'] in [1,3,5,6]:continue
 verts,faces=structural[r['component']];p=r['primitive'];t=tris[p][r['faces']];uv,inv=np.unique(t,return_inverse=True);base=len(verts)
 verts.extend(world[p][uv].tolist());faces.extend((inv.reshape(-1,3)+base).tolist())
bvhs={c:BVHTree.FromPolygons(v,f,all_triangles=True) for c,(v,f) in structural.items() if f}
for r in islands:
 if r['primitive'] not in [1,3,5,6]:continue
 p=r['primitive'];vid=np.unique(tris[p][r['faces']]);sample=world[p][vid]
 # Evenly sample large patches; also include all eight coordinate extremes.
 if len(sample)>64:
  ii=np.unique(np.r_[np.linspace(0,len(sample)-1,64).astype(int),sample.argmin(0),sample.argmax(0)]);sample=sample[ii]
 winners=[];distances=[]
 for point in sample:
  results=[(tree.find_nearest(Vector(point))[3],c) for c,tree in bvhs.items()]
  distance,c=min(results);winners.append(c);distances.append(distance)
 best=max(set(winners),key=winners.count);vote=winners.count(best)/len(winners)
 if vote>=0.95 and max(distances)<0.025:
  assign(r,best,f'Underlying-surface BVH match: {vote:.0%} samples; max distance {max(distances):.5f}')
 else:
  r['review']=True;r['reason']=f'Overlay/fitting attachment uncertain: best {best}, agreement {vote:.0%}, max distance {max(distances):.5f}; retained'
# Explicit user/visual-review overrides are by intact indexed patch ID only.
override_path=WORK/'overrides.json'
overrides=json.loads(override_path.read_text()) if override_path.exists() else {}
for key,value in overrides.items():
 assert key in byid and value in names
 assign(byid[key],value,'Explicit reviewed whole-patch assignment');byid[key]['review']=False
for r in islands:
 if r['component']=='Chassis_Body' and r['primitive'] in [2,4,8] and r['triangles']>=200:
  r['review']=True
(WORK/'assignments.json').write_text(json.dumps(islands,separators=(',',':')))
summary={c:sum(r['triangles'] for r in islands if r['component']==c) for c in names}
print('ASSIGNMENT SUMMARY',json.dumps(summary))
assert sum(summary.values())==267698
# Build editable Blender workfile with material/UV/normal preservation. Import
# only to obtain the actual source shader materials and embedded images.
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(ASSET/'source/f1_2026_w17.glb'))
material_by_name={m.name:m for m in bpy.data.materials}
for obj in list(bpy.data.objects):bpy.data.objects.remove(obj,do_unlink=True)
component_data=[]
for name in names:
 rows=[r for r in islands if r['component']==name]
 coords=np.vstack([world[r['primitive']][tris[r['primitive']][r['faces']].reshape(-1)] for r in rows]);lo=coords.min(0);hi=coords.max(0)
 pivot=(lo+hi)/2
 if name=='Chassis_Body':pivot=np.zeros(3)
 if name in wheel_centers:pivot=wheel_centers[name]
 if name=='Halo':pivot=np.array([0,lo[1],(lo[2]+hi[2])/2])
 parent=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(parent);parent.empty_display_type='PLAIN_AXES';parent.empty_display_size=.12
 # glTF world Y-up -> Blender Z-up.
 bp=np.array([pivot[0],-pivot[2],pivot[1]]);parent.location=bp
 parent['component_name']=name;parent['assembly_status']='Prepared from intact source patches; see preparation report'
 for pi in sorted(set(r['primitive'] for r in rows)):
  rr=[r for r in rows if r['primitive']==pi];face_ids=np.array(sorted(f for r in rr for f in r['faces']));tt=tris[pi][face_ids];unique,inv=np.unique(tt,return_inverse=True);idx=inv.reshape(-1,3)
  v=world[pi][unique][:,[0,2,1]]*[1,-1,1]-bp
  mesh=bpy.data.meshes.new(f'{name}_P{pi:02}');mesh.from_pydata(v.tolist(),[],idx.tolist());mesh.update()
  mat=material_by_name[j['materials'][prims[pi]['material']]['name']];mesh.materials.append(mat)
  uv=acc(prims[pi]['attributes']['TEXCOORD_0'])[unique][idx.reshape(-1)];uv[:,1]=1-uv[:,1]
  mesh.uv_layers.new(name='UVMap').data.foreach_set('uv',uv.astype(np.float32).ravel())
  normal=acc(prims[pi]['attributes']['NORMAL'])[unique]*[1,-1,-1]
  for poly in mesh.polygons:poly.use_smooth=True
  mesh.normals_split_custom_set_from_vertices(normal.tolist())
  source_attr=mesh.attributes.new('source_triangle','INT','FACE');source_attr.data.foreach_set('value',face_ids.astype(np.int32))
  patch_lookup={f:r['island'] for r in rr for f in r['faces']};patch_attr=mesh.attributes.new('source_patch','INT','FACE');patch_attr.data.foreach_set('value',np.array([patch_lookup[int(f)] for f in face_ids],dtype=np.int32))
  obj=bpy.data.objects.new(mesh.name,mesh);bpy.context.collection.objects.link(obj);obj.parent=parent;obj['source_primitive']=pi
 component_data.append({'name':name,'pivot':pivot.tolist(),'bounds':{'min':lo.tolist(),'max':hi.tolist()},'triangles':summary[name]})
bpy.context.scene['source_glb']=str(ASSET/'source/f1_2026_w17.glb')
bpy.context.scene['orientation']='Blender Z-up; GLB output preserves original +Y up, +Z nose; +X vehicle left'
for area in bpy.context.screen.areas:
 if area.type=='VIEW_3D':area.spaces.active.region_3d.view_distance=8
bpy.ops.wm.save_as_mainfile(filepath=str(WORK/'mercedes_w17_prepared.blend'))
(WORK/'component-analysis.json').write_text(json.dumps(component_data,indent=2))
print('Saved editable Blender assembly file')
