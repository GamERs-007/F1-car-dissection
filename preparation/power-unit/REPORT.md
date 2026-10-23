# Added V6 Turbo Hybrid power unit

Implemented 13 October 2026 in the existing assembly preview. The car website was not rebuilt. This is a newly authored, mechanically motivated **illustrative 2026-style power unit**, not a scan, Mercedes CAD asset, or an authenticated W17 engine.

## Asset search and provenance

A free, downloadable F1 hybrid engine with verified permission for this web integration was not established among the candidates checked:

| Candidate | Evidence and decision |
|---|---|
| [V6 Turbo Hybrid Race Engine — TurboSquid](https://www.turbosquid.com/3d-models/v6-turbo-hybrid-race-engine-3d-model-2431422) | Listed at $129, 451,428 polygons. Commercial asset, not the requested free download. Not downloaded. |
| [F1 Mercedes W15 — Project 212, Sketchfab](https://sketchfab.com/3d-models/f1-mercedes-w15-3744cae78d4645029637077695263895) | Detailed complete car; page directs to ArtStation, does not establish a free downloadable engine with suitable license. Not downloaded. |
| [Modified F1 2023 Concept — Alfirasy-Studio, CGTrader](https://www.cgtrader.com/free-3d-models/car/racing-car/modified-f1-2023-concept) | Free full-car listing says working engine, but it is high-poly and its stated license is Royalty Free (no AI). Suitable redistribution of an extracted engine as a browser-readable GLB was not verified. Not downloaded. |
| [V6 90-degree 1.6L CAD listing — Marathon OS](https://marathon-os.com/library/v6-turbo-hybrid-engine-90-degree-1-6l-no-697f34cfe2eb5087a19c435f) | Search exposed a STEP listing; detailed page retrieval failed and reuse permission was not verified. Not used. |

The fallback requested by the user was used: Blender Python-generated original geometry. No third-party engine meshes, textures, logos or source files were incorporated, so there is no third-party engine attribution requirement to carry into the preview. The existing car assets retain their original provenance and licensing.

Architecture reference: the [FIA's 2026 regulation announcement](https://www.fia.com/news/new-era-competition-fia-showcases-future-focused-formula-1-regulations-2026-and-beyond) identifies removal of MGU-H and expanded electrical power. The [Formula 1 power-unit explainer](https://www.formula1.com/en/latest/article/all-you-need-to-know-about-f1s-new-power-units.14jfv7a36905uDJDdNyfQd) describes the retained 1.6-litre turbocharged V6. Accordingly this illustration includes an MGU-K and energy store, and deliberately does not include an MGU-H. These sources informed the architecture, not the proprietary component shapes or packaging.

## Delivered files

- `../../2026-mercedes-w17/public/models/w17_v6_hybrid_power_unit.glb`
- `../../2026-mercedes-w17/public/models/w17_v6_hybrid_config.json`
- `w17_v6_hybrid.blend` — editable engine-only Blender workfile.
- `../build_power_unit.py` — reproducible Blender generator, including fitted mount and legacy-patch mapping.
- `../../2026-mercedes-w17/preview/power-unit.js` — additive preview integration.
- `../../2026-mercedes-w17/preview/power-unit-motion.js` — pure reversible motion functions.
- `validation.json`, `fit-validation.json`, `motion-clearance.json` — generated test evidence.
- `baseline/` — preview HTML/JS before integration.

## Detail and component hierarchy

`Power_Unit` is the detachable parent. Its 12 independently controlled children are:

| Name | Visible construction |
|---|---|
| PU_Block | Profiled crankcase, dry sump, reinforcement ribs, end housings, flanges and fasteners |
| PU_Rotating_Assembly | Crankshaft, counterweight forms, six connecting rods and six ringed pistons |
| PU_Bank_Left / PU_Bank_Right | Three inclined cylinder sleeves per bank, machined deck collars, heads, cam covers, studs, coils and ignition leads |
| PU_Intake | Carbon-look plenum, six curved runners, charge pipe, seals and mounting bands |
| PU_Turbo | Variable-section compressor/turbine volutes, bearing housing, flanges, fasteners, throats and impeller blades |
| PU_Exhaust_Left / PU_Exhaust_Right | Curved three-into-one bronze headers, collector routing, flange rings and wastegate-related detail |
| PU_MGU_K | Finned motor housing, endcaps, fasteners and a crankcase coupling housing |
| PU_Energy_Store | Sealed lower-bay module, protective lid, fins, mounting screws and HV connectors |
| PU_Control_Electronics | Inverter enclosure, cooling ribs, orange high-voltage cable routing |
| PU_Cooling | Coolant/service rails, fittings, bands and oil-filter housing |

The two 45-degree banks illustrate a 90-degree V6. This is a presentation model: it does not simulate valve timing, fluid flow, electrical wiring or working piston kinematics. Dimensions were fitted to the supplied artistic car model, not calibrated to actual engine displacement. The energy-store packaging is illustrative; it should not be described as Mercedes' real battery location. Existing rear exhaust geometry remains a separate car surface; no claim of a complete sealed gas circuit is made.

## Placement and preservation

Verified original axes are retained: +Y up, +Z nose, +X vehicle left. The new root mounts at **[0, 0.45, -0.96]**, behind the cockpit and within the engine-cover region. The generator selects a uniform 0.85 fit scale without deforming individual parts. Final bounds are recorded in `fit-validation.json`.

The source contains simplified internal geometry despite lacking a usable complete engine. In the enhanced preview, **5,240 triangles across the listed intact P0 patches** are suppressed through a reversible index buffer mask. This avoids drawing two engines in the same volume. The masks and source patch IDs are in the new JSON configuration. No source faces are cut or removed from either original GLB; disabling **Added power unit** restores the original prepared geometry. Original-reference and patch-review modes remain available.

The engine loads as a separate GLB beside the unchanged prepared car. It uses the existing preview lights and camera. Original materials, livery, textures, vehicle scale and component configuration are unchanged.

## Animation and controls

The existing main slider remains the single car-progress driver:

1. 0–45%: existing exterior assemblies open; engine stays mounted.
2. 45–60%: engine lifts 0.22 original units to clear the bay.
3. 60–80%: engine moves outward and upward to its presentation position.
4. 80–100%: its major subassemblies separate with smoothstep interpolation.

Every position is derived from a stored original transform on each update. There are no accumulated deltas. Reversing progress follows the same path and returns exactly to the initial transforms. The final root offset is [1.35, 0.9, -0.05]. Subcomponent offsets live in the JSON configuration.

Added controls: engine enable/disable, linked or manual detail progress, individual visibility and component-selection labels, engine isolation, smooth focus-camera transition, restore-car button, and optional cinematic camera following progress. Manual detail control is enabled when isolated or after the main slider reaches 80%, to avoid taking the engine apart inside the bodywork. Reset restores the car and all engine controls.

The inspected project contained a slider inspector, not an existing scrolling website or GSAP timeline. A `w17:progress` event bridge was added for future ScrollTrigger integration without replacing the inspector:

```js
// A ScrollTrigger onUpdate callback may drive the same tested slider path:
window.dispatchEvent(new CustomEvent('w17:progress', { detail: self.progress }));
```

Use `powerUnitRootPosition` and `powerUnitProgress` from `power-unit-motion.js` when integrating elsewhere. Do not simply interpolate the final root offset: the staged lift is needed for clearance. Animate named assembly parents, never their material meshes.

## Validation and performance

- New GLB: **662,988 bytes**, **31,472 triangles**, **41 material meshes**, **8 shared PBR materials**, **0 extra textures**.
- GLTFLoader successfully loads all 12 named subassemblies. Numeric vertex/transform values are finite.
- Source and prepared GLB hashes are unchanged. All 29 original asset-file checksums pass the previous validator.
- All configured legacy mask faces map to the intended original patches; original index buffers remain available for restoration.
- Forward/reverse progress samples produce identical matrices. Returning to zero gives an exact matrix match, including after manual engine-detail animation.
- Assembled engine-versus-retained-car surface intersection count is zero.
- Blender BVH checks at **51 samples from 0 to 100%** find zero engine-versus-car triangle intersections along the linked path.

The clearance check is a sampled triangle-surface test, not a continuous swept-volume proof or engineering tolerance analysis. Engine internal mating overlaps are intentional and are not treated as collisions. The original car's own pre-existing assembly-to-assembly intersections are outside this added-engine test.

The browser was exercised for engine isolation, detail controls, visibility, selection labels, main progress, camera controls, reference comparison and reset. Evidence images are saved alongside this report. Original appearance comparison temporarily restores the original internals and hides the added unit, so it continues to compare the original car against the original prepared car.

## Rebuild and test

From `D:\CodeXProject\F1 car dissection`:

```powershell
$env:BLENDER_USER_RESOURCES = Join-Path $PWD 'preparation/tools/blender-user'
& 'preparation/tools/blender-4.5.0-windows-x64/blender.exe' -b --factory-startup --python preparation/build_power_unit.py
& 'preparation/tools/blender-4.5.0-windows-x64/blender.exe' -b --factory-startup --python preparation/power-unit/check_motion.py
node preparation/power-unit/validate.mjs
node preparation/validate.mjs
node preparation/server.mjs
```

Open `http://127.0.0.1:4174/2026-mercedes-w17/preview/index.html`. Reuse the running server if port 4174 is already occupied by it. No npm installation or external CDN is needed.
