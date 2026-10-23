"""Original procedural 2026-style illustrative V6. No third-party engine geometry.
Build with bundled Blender. Original car assets are read only.
"""
import bpy, math, json, pathlib, struct, hashlib
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
R=pathlib.Path(__file__).resolve().parents[1]; W=R/'preparation/power-unit'; W.mkdir(exist_ok=True)
OUT=R/'2026-mercedes-w17/public/models'; bpy.ops.wm.read_factory_settings(use_empty=True)
def material(n,c,metal,rough):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
mats=[material('Cast aluminium',(.32,.37,.39),.75,.38),material('Machined titanium',(.62,.67,.7),.85,.25),material('Carbon composite',(.023,.035,.04),.35,.32),material('Heat bronze',(.34,.16,.075),.78,.33),material('Heat violet',(.14,.10,.19),.7,.3),material('HV orange',(.95,.16,.012),.15,.33),material('Teal identification',(.015,.48,.38),.5,.26),material('Rubber seals',(.009,.012,.015),0,.7)]
parts={}; current=None
def group(n,offset,label):
 global current;current=n;parts[n]={'verts':[],'faces':[],'mat':[],'offset':offset,'label':label}
def mesh(v,f,mat):
 p=parts[current];base=len(p['verts']);p['verts']+= [list(x) for x in v];p['faces'] += [tuple(base+i for i in x) for x in f];p['mat'] += [mat]*len(f)
def frame(axis):
 a=Vector(axis).normalized();u=a.cross(Vector((0,0,1)))
 if u.length<.01:u=a.cross(Vector((0,1,0)))
 u.normalize();return a,u,a.cross(u).normalized()
def lathe(c,axis,profile,mat=1,n=24):
 a,u,v=frame(axis);c=Vector(c);vs=[]
 for z,r in profile:
  for i in range(n):vs.append(c+a*z+(u*math.cos(i*2*math.pi/n)+v*math.sin(i*2*math.pi/n))*r)
 fs=[(j*n+i,j*n+(i+1)%n,(j+1)*n+(i+1)%n,(j+1)*n+i) for j in range(len(profile)-1) for i in range(n)];mesh(vs,fs,mat)
def cyl(c,axis,r,l,mat=1,n=20):lathe(c,axis,[(-l/2,0),(-l/2,r),(l/2,r),(l/2,0)],mat,n)
def ring(c,axis,r,l,mat=1):lathe(c,axis,[(-l/2,r*.84),(-l/2,r),(l/2,r),(l/2,r*.84),(-l/2,r*.84)],mat)
def box(c,size,mat=0,bevel=.008,angle=0):
 # Chamfered rectangular extrusion along longitudinal Z, custom topology.
 x,y,z=size; b=min(bevel,x/4,y/4);poly=[(-x/2+b,-y/2),(x/2-b,-y/2),(x/2,-y/2+b),(x/2,y/2-b),(x/2-b,y/2),(-x/2+b,y/2),(-x/2,y/2-b),(-x/2,-y/2+b)]
 ca,sa=math.cos(angle),math.sin(angle);vs=[]
 for zz in [-z/2,z/2]:
  for xx,yy in poly:vs.append((c[0]+xx*ca-yy*sa,c[1]+xx*sa+yy*ca,c[2]+zz))
 mesh(vs,[tuple(range(7,-1,-1)),tuple(range(8,16))]+[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)],mat)
def pipe(points,r,mat=3,n=10):
 # Catmull-Rom centerline with parallel local cross sections.
 pts=[Vector(p) for p in points]; path=[]
 for i in range(len(pts)-1):
  p0,p1,p2,p3=pts[max(0,i-1)],pts[i],pts[i+1],pts[min(len(pts)-1,i+2)]
  for j in range(6):
   t=j/6;path.append(.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t))
 path.append(pts[-1]);vs=[]
 for i,p in enumerate(path):
  _,u,v=frame(path[min(i+1,len(path)-1)]-path[max(i-1,0)])
  vs.extend(p+r*(u*math.cos(k*2*math.pi/n)+v*math.sin(k*2*math.pi/n)) for k in range(n))
 mesh(vs,[(i*n+k,i*n+(k+1)%n,(i+1)*n+(k+1)%n,(i+1)*n+k) for i in range(len(path)-1) for k in range(n)],mat)
def bolts(c,axis,r,count=8):
 a,u,v=frame(axis)
 for i in range(count):cyl(Vector(c)+r*(u*math.cos(i*2*math.pi/count)+v*math.sin(i*2*math.pi/count)),a,.006,.007,1,6)
group('PU_Block',[0,0,0],'V6 crankcase / dry sump')
# Sculpted crankcase profile, sump flange and reinforcement webs.
profile=[(-.125,-.075),(.125,-.075),(.14,-.02),(.11,.065),(0,.025),(-.11,.065),(-.14,-.02)]
vs=[(x,y,z) for z in [-.205,.205] for x,y in profile];mesh(vs,[tuple(range(6,-1,-1)),tuple(range(7,14))]+[(i,(i+1)%7,(i+1)%7+7,i+7) for i in range(7)],0)
box((0,-.08,0),(.28,.025,.43),1);box((0,-.108,0),(.22,.04,.36),0)
for z in [-.18,-.12,-.06,0,.06,.12,.18]:
 box((0,-.13,z),(.23,.012,.008),0)
 for s in [-1,1]:box((s*.13,-.01,z),(.016,.09,.018),0,angle=s*-.25);cyl((s*.13,-.07,z),(0,1,0),.006,.009,1,6)
for z in [-.22,.22]:cyl((0,-.015,z),(0,0,1),.078,.025,0);ring((0,-.015,z*1.06),(0,0,1),.065,.01);bolts((0,-.015,z*1.09),(0,0,1),.055)
group('PU_Rotating_Assembly',[0,.03,.62],'Crankshaft / six pistons')
cyl((0,-.012,0),(0,0,1),.023,.49,1)
for z in [-.135,0,.135]:
 cyl((0,-.012,z),(0,0,1),.052,.024,0)
 for s in [-1,1]:
  a=Vector((s*.707,.707,0));p=Vector((0,.006,z+s*.006));cyl(p+a*.087,a,.038,.038,1)
  for t in [.075,.082,.09]:ring(p+a*t,a,.039,.003,7)
  pipe([p,p+a*.05],.009,1)
for s,name in [(1,'Left'),(-1,'Right')]:
 group('PU_Bank_'+name,[s*.48,.24,0],name+' cylinder bank / head / cam cover')
 a=Vector((s*.707,.707,0))
 for z in [-.135,0,.135]:
  p=Vector((0,.02,z));lathe(p,a,[(.038,.043),(.038,.057),(.13,.057),(.13,.043),(.038,.043)],0)
  ring(p+a*.135,a,.06,.012,1)
 # Two inclined head rails, valve cover with longitudinal ribs and six studs.
 c=a*.175+Vector((0,.02,0));box(c,(.13,.065,.435),0,angle=-s*math.pi/4)
 c2=a*.218+Vector((0,.02,0));box(c2,(.123,.035,.423),2,angle=-s*math.pi/4)
 for x in [-.032,0,.032]:
  tangent=Vector((.707,-s*.707,0));box(c2+tangent*x+a*.019,(.006,.008,.36),6 if x==0 else 1,angle=-s*math.pi/4)
 for z in [-.174,-.058,.058,.174]:
  for k in [-1,1]:cyl(c2+Vector((0,0,z))+Vector((.707,-s*.707,0))*k*.047+a*.022,a,.006,.008,1,6)
 for z in [-.135,0,.135]:
  cyl(c2+Vector((0,0,z))+a*.027,a,.013,.028,7)
  pipe([c2+Vector((0,0,z))+a*.047,(s*.12,.24,z),(s*.08,.24,.2)],.004,7,8)
group('PU_Intake',[0,.65,.08],'Intake plenum / six runners / charge pipe')
box((0,.265,0),(.145,.075,.42),2,.035)
for z in [-.135,0,.135]:
 for s in [-1,1]:pipe([(s*.04,.25,z),(s*.075,.23,z),(s*.12,.18,z)],.019,1);ring((s*.12,.18,z),(s*.7,.7,0),.022,.008,7)
for z in [-.19,.19]:box((0,.268,z),(.15,.006,.01),1)
pipe([(0,.27,-.2),(0,.28,-.26),(.06,.22,-.31)],.032,2)
group('PU_Turbo',[0,.32,-.52],'Single turbocharger / compressor and turbine')
# Variable-section volutes, open throats, central bearing housing and impeller blades.
for z,mat in [(-.29,1),(-.39,3)]:
 vs=[];N=44;K=12
 for i in range(N+1):
  t=2*math.pi*i/N;rad=.052+.009*i/N;rr=.017+.014*i/N
  for k in range(K):
   q=k*2*math.pi/K;vs.append(((rad+rr*math.cos(q))*math.cos(t),.12+(rad+rr*math.cos(q))*math.sin(t),z+rr*math.sin(q)))
 mesh(vs,[(i*K+k,i*K+(k+1)%K,(i+1)*K+(k+1)%K,(i+1)*K+k) for i in range(N) for k in range(K)],mat)
 lathe((0,.12,z),(0,0,1),[(-.037,.032),(-.025,.045),(.025,.045),(.037,.032)],mat)
 ring((0,.12,z-.04),(0,0,1),.034,.014,1);bolts((0,.12,z+.029),(0,0,1),.043,8)
 for k in range(12):
  t=k*2*math.pi/12;mesh([(0,.12,z-.034),(.029*math.cos(t),.12+.029*math.sin(t),z-.03),(.028*math.cos(t+.22),.12+.028*math.sin(t+.22),z-.045)],[(0,1,2)],1)
cyl((0,.12,-.34),(0,0,1),.026,.06,0)
pipe([(.065,.12,-.29),(.083,.18,-.29),(.06,.22,-.31)],.026,1)
for s,name in [(1,'Left'),(-1,'Right')]:
 group('PU_Exhaust_'+name,[s*.62,.04,-.22],name+' three-into-one exhaust / collector')
 for i,z in enumerate([-.135,0,.135]):
  pipe([(s*.173,.124,z),(s*(.235+i*.016),.08,z-.03),(s*(.235+i*.014),.01,-.20-i*.025),(s*.12,.07,-.33),(s*.066,.12,-.39)],.016,3)
  ring((s*.173,.124,z),(1,0,0),.024,.008,1)
  ring((s*.24,.08,z-.03),(0,1,0),.018,.006,4)
 # Wastegate actuator and separate short bypass line.
 cyl((s*.19,.10,-.24),(0,0,1),.024,.055,1)
 pipe([(s*.16,.05,-.29),(s*.16,.035,-.38),(s*.055,.1,-.44)],.011,3)
group('PU_MGU_K',[.62,-.08,.25],'MGU-K / geared crankshaft coupling')
cyl((.19,-.045,.11),(0,0,1),.057,.17,0)
for z in [.04,.06,.08,.10,.12,.14,.16,.18]:ring((.19,-.045,z),(0,0,1),.062,.008,0)
for z in [.015,.205]:cyl((.19,-.045,z),(0,0,1),.055,.018,1);bolts((.19,-.045,z),(0,0,1),.041)
box((.10,-.035,.21),(.21,.06,.035),0)
box((.19,.02,.10),(.065,.022,.06),6)
group('PU_Energy_Store',[-.5,-.12,.48],'Energy store / sealed HV module (illustrative packaging)')
box((0,-.235,.02),(.255,.10,.30),0,.014);box((0,-.18,.02),(.263,.012,.31),2)
for x in [-.105,-.075,-.045,-.015,.015,.045,.075,.105]:box((x,-.168,.02),(.008,.012,.28),1)
for x in [-.117,.117]:
 for z in [-.11,.15]:cyl((x,-.167,z),(0,1,0),.006,.008,1,6)
for x in [-.07,.07]:cyl((x,-.235,.18),(0,0,1),.013,.025,5)
group('PU_Control_Electronics',[-.56,.22,.22],'Inverter / control electronics / HV leads')
box((-.19,-.025,.12),(.09,.08,.17),0);box((-.19,.02,.12),(.096,.012,.176),2)
for z in [.05,.075,.10,.125,.15,.175]:box((-.19,.032,z),(.09,.014,.006),1)
pipe([(-.07,-.235,.18),(-.15,-.15,.23),(-.19,-.04,.205)],.009,5)
pipe([(-.19,-.05,.045),(-.20,-.11,-.12),(.20,-.11,-.12),(.20,-.04,.015)],.009,5)
group('PU_Cooling',[.46,.4,.25],'Coolant rails / oil filter / service lines')
for s in [-1,1]:
 pipe([(s*.11,.04,.215),(s*.21,.04,.2),(s*.21,.19,0),(s*.10,.19,-.22)],.009,1)
 for z in [-.15,0,.15]:ring((s*.21,.19,z),(0,0,1),.012,.009,6)
cyl((-.18,-.045,-.15),(0,1,0),.035,.10,1);cyl((-.18,.01,-.15),(0,1,0),.037,.016,2)

# Read source topology to suppress only intact existing internal engine patches.
raw=(R/'2026-mercedes-w17/source/f1_2026_w17.glb').read_bytes();n=struct.unpack_from('<I',raw,12)[0];j=json.loads(raw[20:20+n]);binary=raw[28+n:]
def acc(i):
 a=j['accessors'][i];v=j['bufferViews'][a['bufferView']];return np.frombuffer(binary,dtype={5126:'<f4',5123:'<u2',5125:'<u4'}[a['componentType']],count=a['count']*{'SCALAR':1,'VEC2':2,'VEC3':3}[a['type']],offset=v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(a['count'],-1).copy()
islands=json.loads((R/'preparation/islands.json').read_text())
legacy=[r for r in islands if r['primitive']==0 and r['max'][2]<-.44 and r['min'][2]>-1.43 and r['min'][0]>-.4 and r['max'][0]<.4]
# Existing rear exhaust stays: new turbine is placed forward of its inlet.
hidden={p:set(f for r in legacy if r['primitive']==p for f in r['faces']) for p in range(29)}
cv=[];cf=[];face_meta=[]
for pi,p in enumerate(j['meshes'][0]['primitives']):
 pos=acc(p['attributes']['POSITION'])[:,[0,2,1]]*[1,-1,1];tri=acc(p['indices']).reshape(-1,3);base=len(cv);cv+=pos.tolist()
 for fi,t in enumerate(tri):
  if fi not in hidden[pi]:cf.append(tuple(int(x)+base for x in t));face_meta.append((pi,fi))
car=BVHTree.FromPolygons(cv,cf,all_triangles=True)
# Physical envelope search: maximize scale in the measured bay; never deform engine.
allv=np.array([v for p in parts.values() for v in p['verts']]);allf=[];base=0
for p in parts.values():
 for f in p['faces']:
  for k in range(1,len(f)-1):allf.append((base+f[0],base+f[k],base+f[k+1]))
 base+=len(p['verts'])
best=None;attempts=[]
for scale in [1,.95,.9,.85,.8,.75]:
 for cy in [.42,.45,.48,.51,.54,.39]:
  for cz in [-1.01,-1.06,-.96,-1.11,-.91,-.86]:
   mount=np.array([0,cy,cz]);verts=allv*scale+mount;tree=BVHTree.FromPolygons(verts.tolist(),allf,all_triangles=True);hits=tree.overlap(car)
   attempts.append({'scale':scale,'mount':mount.tolist(),'intersections':len(hits)})
   if not hits:best=(scale,mount,verts);break
  if best:break
 if best:break
if not best:
 from collections import Counter
 trial=min(attempts,key=lambda a:a['intersections']);vv=allv*trial['scale']+trial['mount'];tt=BVHTree.FromPolygons(vv.tolist(),allf,all_triangles=True);hh=tt.overlap(car)
 print('BEST',trial,'HITS',Counter(face_meta[b][0] for a,b in hh))
 hitfaces=set(face_meta[b] for a,b in hh)
 print('PATCHES',[(r['id'],r['triangles'],r['min'],r['max']) for r in islands if any((r['primitive'],f) in hitfaces for f in r['faces'])])
 (W/'fit-attempts.json').write_text(json.dumps(attempts,indent=2));raise RuntimeError('No collision-free bay fit; inspect fit-attempts and revise geometry')
scale,mount,verts=best
print('FIT',scale,mount,'zero triangle intersections')
root=bpy.data.objects.new('Power_Unit',None);bpy.context.collection.objects.link(root);root.location=(mount[0],-mount[2],mount[1]);root['description']='Illustrative 2026-style V6 hybrid; not Mercedes CAD'
config={'schemaVersion':1,'model':'w17_v6_hybrid_power_unit.glb','authenticity':'Original procedural illustrative 2026-style architecture; not Mercedes engineering data','orientation':{'up':'+Y','nose':'+Z'},'root':{'name':'Power_Unit','originalPosition':mount.tolist(),'explodedOffset':[1.35,.9,-.05]},'fitScale':scale,'components':[],'legacyPatches':[r['id'] for r in legacy],'legacySourceFaces':{str(p):sorted(f) for p,f in hidden.items() if f}}
for name,p in parts.items():
 local=np.array(p['verts'])*scale;pivot=(local.min(0)+local.max(0))/2
 parent=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(parent);parent.parent=root;parent.location=(pivot[0],-pivot[2],pivot[1])
 # Merge detail geometry by subassembly and material: bounded draw calls.
 for mi in sorted(set(p['mat'])):
  fs=[f for f,m in zip(p['faces'],p['mat']) if m==mi];used=sorted(set(i for f in fs for i in f));remap={v:i for i,v in enumerate(used)};v=local[used]-pivot
  me=bpy.data.meshes.new(name+'_'+str(mi));me.from_pydata((v[:,[0,2,1]]*[1,-1,1]).tolist(),[],[tuple(remap[x] for x in f) for f in fs]);me.materials.append(mats[mi]);me.update()
  for poly in me.polygons:poly.use_smooth=len(poly.vertices)==4
  ob=bpy.data.objects.new(me.name,me);bpy.context.collection.objects.link(ob);ob.parent=parent
 config['components'].append({'name':name,'label':p['label'],'originalPosition':pivot.tolist(),'explodedOffset':p['offset'],'boundingBox':{'min':(local.min(0)+mount).tolist(),'max':(local.max(0)+mount).tolist()}})
bpy.ops.wm.save_as_mainfile(filepath=str(W/'w17_v6_hybrid.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'w17_v6_hybrid_power_unit.glb'),export_format='GLB',export_yup=True,export_extras=True,export_animations=False)
config['sha256']=hashlib.sha256((OUT/'w17_v6_hybrid_power_unit.glb').read_bytes()).hexdigest()
config['legacyMasks']=[]
for entry in json.loads((R/'preparation/triangle-provenance.json').read_text()):
 for pi,p in enumerate(entry['primitives']):
  faces=[i for i,f in enumerate(p['sourceFaces']) if f in hidden[p['sourcePrimitive']]]
  if faces:config['legacyMasks'].append({'mesh':entry['meshIndex'],'primitive':pi,'faces':faces})
del config['legacySourceFaces']
(OUT/'w17_v6_hybrid_config.json').write_text(json.dumps(config,indent=2))
(W/'fit-validation.json').write_text(json.dumps({'assembledTriangleIntersectionsWithRetainedCar':0,'scale':scale,'mount':mount.tolist(),'bounds':{'min':verts.min(0).tolist(),'max':verts.max(0).tolist()},'legacyPatchesSuppressedInEnhancedView':len(legacy),'legacyTriangles':sum(len(r['faces']) for r in legacy),'attempts':attempts,'method':'BVHTree triangle overlap against all retained original triangles; no car geometry modified. Tests surface intersections, not engineering tolerances.'},indent=2))
print('DONE',len(allf),'triangles',len(parts),'subassemblies')


