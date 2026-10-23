import bpy, math, os
from mathutils import Vector

root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=os.path.join(root,'evidence','brake-corrected.glb'))
scene=bpy.context.scene
scene.render.engine='CYCLES'
scene.cycles.samples=24
scene.cycles.use_denoising=True
scene.render.resolution_x=900
scene.render.resolution_y=900
scene.render.resolution_percentage=100
scene.world.color=(.15,.15,.15)
scene.view_settings.view_transform='AgX'
for name,location,power,size in [
 ('Key',(1.0,-.8,1.3),120,1.1),
 ('Fill',(.8,1.3,.3),80,1.0),
 ('Rim',(-.7,.2,.8),100,.8),
]:
 bpy.ops.object.light_add(type='AREA',location=location)
 light=bpy.context.object;light.name=name;light.data.energy=power;light.data.shape='DISK';light.data.size=size
 light.rotation_euler=(Vector((0,0,.04))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add()
camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=.74
# glTF Y-up becomes Blender Z-up; front has the caliper on image left.
views={'front':(1.2,0,.05),'side':(0,-1.2,.05),'rear':(-1.2,0,.05),'angle':(1.1,-.65,.43),'top':(.1,0,1.3),'bottom':(.1,0,-1.3)}
for name,position in views.items():
 camera.location=position
 camera.rotation_euler=(Vector((0,0,.05))-camera.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=os.path.join(root,'evidence',f'brake-corrected-{name}.png')
 bpy.ops.render.render(write_still=True)
