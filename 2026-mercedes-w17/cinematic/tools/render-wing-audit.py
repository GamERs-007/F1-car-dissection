import bpy, json, os
from mathutils import Vector
root=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for p in json.load(open(os.path.join(root,'evidence','rear-wing-audit.json'))):
 mesh=bpy.data.meshes.new(p['id']);v=p['vertices'];mesh.from_pydata(v,[],[(i,i+1,i+2) for i in range(0,len(v),3)]);mesh.update()
 obj=bpy.data.objects.new(p['id'],mesh);bpy.context.collection.objects.link(obj)
 mat=bpy.data.materials.new(p['id']);mat.diffuse_color=(*p['color'],1);obj.data.materials.append(mat)
scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH';scene.display.shading.light='STUDIO';scene.display.shading.color_type='MATERIAL'
scene.display.shading.show_shadows=True;scene.display.shading.show_cavity=True;scene.display.shading.cavity_type='BOTH'
scene.render.resolution_x=1100;scene.render.resolution_y=800;scene.render.resolution_percentage=100
bpy.ops.object.camera_add(location=(1.4,3.8,1.2));camera=bpy.context.object;camera.rotation_euler=(Vector((0,2.12,.63))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=1.65;scene.camera=camera
scene.render.filepath=os.path.join(root,'evidence','rear-wing-audit.png');bpy.ops.render.render(write_still=True)
