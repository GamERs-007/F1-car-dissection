# Mercedes W17 asset inspection

Inspected 13 October 2026. Scope: the supplied assets only; no full website or replacement car model was built. Original assets were opened read-only. All new files are under `inspection/`.

## Decision

**This is one authored glTF mesh, divided into 29 material primitives. It is not a component-organized car.** Three.js GLTFLoader creates 29 selectable runtime meshes from those primitives. Moving one usually moves unrelated physical parts together.

**An exterior exploded view is feasible after component separation and regrouping. It is not ready for a clean component-by-component explosion as supplied.** The halo is an unusually useful exception: its main geometry already occupies its own primitive. Individual wheels, front/rear wings, floor, suspension and body panels require face/island separation and assembly grouping in Blender or equivalent geometry processing.

**Some internal mechanical geometry is present.** P0 contains a simplified engine-bay representation, including a raised intake/plenum-like form and modeled curved pipework; P3 contains additional rear pipe/exhaust-like detail. This is more than a hollow exterior, but is not evidence of a complete, mechanically accurate W17 power unit. No separately identifiable complete engine assembly, battery, MGU-K, turbo assembly, or moving engine internals could be established. Do not invent those components or promise a detailed power-unit dissection from this GLB.

## How this was checked

1. Recursively enumerated the actual `source/` and **`textures/`** directories (the latter is plural, rather than the requested `texture/`). Found one GLB and 28 external PNG files; no other files in those directories.
2. Read the GLB header, JSON and binary chunk; retained its complete metadata in `gltf-metadata.json`.
3. Loaded the original geometry using **Three.js 0.180.0 GLTFLoader**, traversed the complete scene and recorded every runtime mesh, parent, material, vertex/index/triangle count, attributes and bounding box. The Node inspection bypasses image decoding only; the browser loads the original GLB including embedded images normally. See the [official GLTFLoader documentation](https://threejs.org/docs/#GLTFLoader).
4. Visually inspected all 29 primitives in isolation, the complete car, and multiple views of internal/carbon geometry, including neutral-material renders to distinguish real geometry from texture detail.
5. Computed connected geometry islands by joining triangles and welding exactly equal positions **within each primitive**, without changing the model. This is a diagnostic, not a physical component count. UV/normal seams, small gaps, coincident surfaces and material boundaries affect it.
6. Recorded SHA-256 checksums and compared them after inspection. See `preservation-check.json` for the final result.

The filename and visual livery are the supplied identification. This inspection does not authenticate real 2026 Mercedes engineering or dimensional accuracy.

## Component map

P numbers below are **zero-based GLB primitive indices**. Runtime names are `f1_2026_w17_` followed by P + 1. These are loader-generated names, not authored component labels. A primitive listed against a component generally contains only some of its surfaces and often other components too. The table is an evidenced starting point for face selection, not an exact semantic segmentation of every triangle.

| Requested component | Geometry evidence / primitive candidates | Independent movement now | Preparation needed |
|---|---|---|---|
| Front wing | Confirmed visible. Main carbon wing/nose surfaces in P4 (`mercedes_carbon1.007`), with paint P8 and decals P1; small details may involve P3. Located toward world +Z. | No complete front-wing object. | Separate front-wing faces from nose and the rest of P4; include matching painted/decal/detail faces. Set an assembly pivot. |
| Rear wing | Confirmed visible. P4 carbon wing surfaces/supports, P2 carbon/endplate-related surfaces, P8 paint and P1 decals; small details in P3. Toward world −Z. | No complete rear-wing object or flap rig. | Separate rear wing, endplates, supports and any desired flap independently; regroup their material surfaces. |
| Front wheels | Confirmed pair. Wheel surfaces shared with the rear pair across P11 hubs, P12 disc faces, P13 sidewalls and P14 tread; associated carbon brake/duct surfaces also occur in P4. Centers near Z +1.62. | All four hubs or all four treads can move together, but neither front wheel is independently assembled. | Split by spatial wheel region, gather its material surfaces, leave fixed ducts/suspension in the appropriate assembly, set axle and steering pivots. |
| Rear wheels | Confirmed pair in the same shared primitives. Centers near Z −1.78. | No individual rear-wheel object. | Same separation/regrouping as front wheels. Do not use the whole P4 carbon group as a wheel. |
| Chassis / bodywork | Confirmed. Main painted shell P8; extensive carbon surfaces P2/P4; cockpit/generic interior surfaces P0; decals P1 and number surfaces P6. | P8 can move as a material collection, but includes paint on nose and wing areas too. | Separate monocoque/body shell, engine cover, sidepods, nose and other intended panels; attach the matching decals to each. |
| Halo | Confirmed visually as P9 (`mercedes_paint2.007`, 6,998 triangles), using embedded `mercedes_paint_halo`. Its extent is limited to the cockpit protection structure. | **Main halo geometry can translate independently as one runtime mesh.** | Set an appropriate pivot; inspect overlapping decals or trim before treating it as a complete finished assembly. |
| Suspension | External suspension-like rods/arms are visible in the complete model and shared carbon/detail groups, principally P4 with neighboring P2/P3 surfaces. There are no authored wishbone, pushrod, damper or suspension nodes. Exact arm-by-arm mapping remains unsegmented. | No complete front/rear suspension assembly or articulation rig. | Select and separate each required arm/link, confirm attachment points and axle relation. Internal dampers/rockers are not established. |
| Floor / diffuser | Confirmed lower aero geometry. Broad floor and rear diffuser-like geometry in P2 (`mercedes_carbon3.007`); adjacent lower carbon surfaces in P4. | P2 moves independently, but also carries other carbon body/aero geometry. | Separate floor, diffuser and attached fins as intended; review connected surfaces manually. |
| Internal engine / power unit | **Partial internal representation**, mainly P0, with rear pipe-like detail in P3. Neutral-material renders show that some pipes/forms are geometry, not only painted texture. | No engine-only node or independently named power-unit subassemblies. | Extract only what can actually be identified. Any complete technical engine, hybrid system or internal mechanism needs additional verified modeling/assets. |

## What can move without cutting geometry

- The entire car using the source node / runtime parent `f1_2026_w17`.
- Any of the 29 material primitives through its Three.js Object3D transform. This is technically independent movement, **not** physical independence of the major car parts.
- P9 main halo; P7 and P10 individual mirror reflective surfaces (not complete mirror housings).
- Steering-wheel-specific surfaces P19–P28 can be grouped into a runtime steering-wheel assembly. This is a useful candidate for simple animation after checking nearby shared details and setting its pivot; there is no authored steering-wheel parent or rig.
- P15 harness hardware and P16 belts are separately selectable collections, not individually rigged buckles/straps.

The asset has no animation clips, skins/bones, or morph targets. All runtime primitive transforms are initially identity under the same car transform. There are no individual wheel centers, suspension joint pivots or authored explosion paths.

## Why “separate by material” is insufficient

Material separation has effectively already happened at glTF primitive level. For example, P14 contains all four tires, and P11 contains all four hubs. Conversely, one physical wheel draws surfaces from several primitives. P8 spans about 5.37 model units longitudinally, covering much more than one removable panel.

The exact-position diagnostic finds **1,102 islands across the 29 primitives**, not 1,102 parts. P14 has four islands corresponding spatially to the four treads; P13 has six, so even tire material islands do not map uniformly to wheels. P4 has 92 islands, including a 10,812-triangle island spanning the front nose/wing region. P2 has 73, including a 26,933-triangle island spanning over 4.1 longitudinal units. Automatic loose-part separation alone will not produce a clean component tree.

For a later Blender preparation pass, import a copy; use material and linked-face selections as aids; separate by intended assembly; retain normals, UVs and material assignments; group matching decals with their parent surface; create named component parents and correct pivots; then export to a **new** GLB. No such separation or export was performed here.

## Missing versus unverified

**Definitively absent from the file structure:** authored front/rear wing nodes, four individual wheel nodes, a named chassis/halo/suspension/floor hierarchy, named engine/power-unit objects, bones, animation clips, morph targets and mechanical pivot metadata.

**Present as geometry:** the requested exterior components, cockpit/seat/harness and steering wheel, simplified internal mechanical/engine-bay forms and rear pipe-like detail. Absence of an engine node must not be confused with absence of every internal surface.

**Not identified in the inspected geometry:** complete distinct engine block/cylinder-head assemblies suitable for technical dissection; pistons, crankshaft or valve train; a positively identifiable complete turbocharger, MGU-K, energy store/battery, control electronics, gearbox internals, or internal suspension mechanism. Treat these as unavailable for the planned dissection until separately verified or supplied. The generic mesh names do not let us prove that every small unidentified surface is unrelated to such systems.

Names such as `kers_red.003` and `kers_green.003` refer to tiny steering-wheel indicator surfaces at the dashboard, not a modeled energy recovery system. The `mercedes_colordriver.005` primitive is a small upper body/airbox-area surface; its name is not proof of a complete driver model.

## Exploded-view suitability

| Intended experience | Suitability of this GLB |
|---|---|
| Orbit, zoom, mesh picking, highlighting, hide/isolate and visual cutaways | Works now; implemented in the inspector. Cut planes do not add missing interior faces or cap open surfaces. |
| Demonstrating how the materials are divided | Works now, but should be labeled as material primitives. |
| Lifting the main halo | Works with a runtime transform and appropriate pivot. |
| Removing each wheel, wing, body panel and floor as coherent parts | Feasible after mesh separation and regrouping; not available directly. |
| Articulated suspension or mechanically correct wheel steering | Needs separated links, pivots and an animation setup. |
| Detailed engine/hybrid power-unit dissection | Unsupported by the verified content. A partial engine-bay reveal is possible after extraction, but must be described accurately. |

## Inspector and evidence

From the project directory, run `node inspection/server.mjs`, then open [the local inspector](http://127.0.0.1:4173/inspection/index.html). It runs entirely locally with a pinned vendored copy of Three.js. It neither uploads the model nor saves edits to it.

Click a rendered surface or select a material row to highlight it and see the runtime name, parent, source primitive, material, counts and world bounds. Use Isolate, Hide, Show all, presets, wireframe, top/side/underside views and the uncapped cutaway slider. Reset restores the original display. An entry remains selectable even when hidden, so Show all can recover it.

The [reference atlas](http://127.0.0.1:4173/inspection/atlas.html) provides isolated material renders. Its [internal/carbon detail page](http://127.0.0.1:4173/inspection/atlas.html?part=3) includes neutral-material renders. Saved evidence is in `inspection/evidence/`.

Verification: browser loaded all 29 meshes with embedded textures; direct canvas picking on a front wheel selected P11 and highlighted the shared wheel-hub primitive; list selection, halo isolation, hide/presets, fit and reset were exercised. No browser console errors or warnings were observed at that check. The source GLB is not claimed to have passed the Khronos validator; successful loading is not a full standards-conformance audit.
