# Preview and preparation workflow

Run from `D:\CodeXProject\F1 car dissection`:

```powershell
node preparation/server.mjs
```

Open http://127.0.0.1:4174/2026-mercedes-w17/preview/index.html . The read-only server binds to loopback. It uses the existing locally vendored Three.js files; no CDN is required. Stop it with Ctrl+C. If the port is already serving the preview, reuse it.

The preview provides orbit/zoom, click-to-identify, visibility toggles, solo, 0–100% progress and Reset. The comparison button renders original/prepared at 0% with the current camera. Atlas pages: `/preparation/atlas.html?part=0` and `?part=1`; append `&clay=1` for neutral geometry.

## Rebuild

Portable official Blender 4.5 is under `preparation/tools/`; nothing was installed system-wide. These commands regenerate the prepared outputs, not the original assets:

```powershell
$env:BLENDER_USER_RESOURCES = Join-Path $PWD 'preparation/tools/blender-user'
& 'preparation/tools/blender-4.5.0-windows-x64/blender.exe' -b --factory-startup --python preparation/analyze.py
& 'preparation/tools/blender-4.5.0-windows-x64/blender.exe' -b --factory-startup --python preparation/prepare.py
node preparation/export.mjs
node preparation/validate.mjs
```

Read `REPORT.md` and `validation.json` before integration. `export.mjs` packs the original GLB using `assignments.json`; it intentionally does not re-export the Blender shaders.

## Non-destructive manual review

Choose **Review source patches** in the preview. Click a surface, enter a patch ID from `manual-review.json`, or use **Next uncertain**. Inspect the highlighted entire patch, isolate it, and restore context. Queue a different assembly only after checking its physical attachment.

The downloaded `overrides.json` contains only newly queued choices. **Merge it into the existing `preparation/overrides.json`; do not replace the existing 88 reviewed assignments.** Re-run `prepare.py`, `export.mjs` and `validate.mjs`, then reload the preview. Browser review never modifies the GLB.

For finer work, open `mercedes_w17_prepared.blend`. Each assembly is an Empty parent with material-specific mesh children. Mesh objects store `source_primitive`; face-domain integer attributes `source_patch` and `source_triangle` trace back to the source. Patch IDs have the form `p<primitive>_i<source_patch>`.

Example in Blender's Python Console, after selecting the appropriate mesh object and staying in Object Mode:

```python
o = bpy.context.active_object
patch_id = 8  # Example p2_i8: select the mesh with source_primitive == 2
assert o.type == 'MESH' and o['source_primitive'] == 2
a = o.data.attributes['source_patch']
for face in o.data.polygons:
    face.select = a.data[face.index].value == patch_id
bpy.ops.object.mode_set(mode='EDIT')
```

Save manual edits to a separate workfile. Arbitrary Blender face edits are **not** consumed by the lossless packer. For whole-patch regrouping, use the override workflow. New cuts, new geometry or changed materials require a deliberate Blender export and new appearance/provenance validation; do not run the current packer expecting it to include those edits.

## React Three Fiber / GSAP integration contract

Load the exported GLB and JSON. Resolve each `components[].name` with `scene.getObjectByName`. Animate the assembly parent, not its `__Geometry` child. Config bounds are assembled world/model-root bounds, and offsets are in the unchanged model-root axes. The prepared root has identity rotation/scale.

```js
function applyExplosion(scene, config, progress) {
  const t = Math.max(0, Math.min(1, progress));
  const eased = t * t * (3 - 2 * t);
  for (const c of config.components) {
    const group = scene.getObjectByName(c.name);
    group.position.set(...c.originalTransforms.position);
    group.position.x += c.explodedOffset[0] * eased;
    group.position.y += c.explodedOffset[1] * eased;
    group.position.z += c.explodedOffset[2] * eased;
  }
}
```

Drive `progress` from a GSAP/ScrollTrigger value in [0,1], using a linear driver if retaining this smoothstep. Always derive positions from the stored transforms; never add deltas cumulatively. Reverse scrolling restores the assembly exactly. Suggested offsets are a presentation layout, not a collision-free service procedure.
