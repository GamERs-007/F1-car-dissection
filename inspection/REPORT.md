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


## Asset summary

| Measure | Value |
|---|---|
| GLB | source/f1_2026_w17.glb |
| GLB bytes | 40,091,884 |
| Generator | Khronos glTF Blender I/O v4.4.56 |
| glTF version | 2.0 |
| Scenes / source nodes / source meshes | 1 / 1 / 1 |
| Primitives / runtime Mesh objects / materials | 29 / 29 / 29 |
| Texture objects / embedded PNG images | 46 / 33 |
| Exported vertices / triangles / indices | 195,161 / 267,698 / 803,094 |
| World size X, Y, Z | 1.9177, 1.2014, 5.3903 |
| World min | -0.9587, -0.0436, -2.5262 |
| World max | 0.9590, 1.1578, 2.8641 |
| Extensions used | KHR_materials_specular |
| Animation clips / skins / morph targets | 0 / 0 / 0 |

The dimensions are glTF world-coordinate units (nominally meters under the format convention), not independently calibrated real-car measurements. +Y is up after the source node transform; the nose points toward +Z. The source node has quaternion [0.7071068287, 0, 0, 0.7071068287], approximately +90° about X; local coordinates should not be confused with displayed world coordinates.

GLB SHA-256: `1d274f08d532e60826a7de5a93ccef7ddabe0b3377cca243679adb46e841a8d8`.

## Complete source hierarchy

```text
Scene (scene 0, default)
└── f1_2026_w17 (node 0; translation 0,0,0; scale 1,1,1; +90° X rotation)
    └── mesh 0: f1_2026_w17
        ├── primitive 0: TRIANGLES; material 0: generics.007
        ├── primitive 1: TRIANGLES; material 1: mercedes_decals.005
        ├── primitive 2: TRIANGLES; material 2: mercedes_carbon3.007
        ├── primitive 3: TRIANGLES; material 3: mercedes_detail.007
        ├── primitive 4: TRIANGLES; material 4: mercedes_carbon1.007
        ├── primitive 5: TRIANGLES; material 5: rear_light_2.007
        ├── primitive 6: TRIANGLES; material 6: mercedes_number_63.005
        ├── primitive 7: TRIANGLES; material 7: mercedes_mirror_left.005
        ├── primitive 8: TRIANGLES; material 8: mercedes_paint.007
        ├── primitive 9: TRIANGLES; material 9: mercedes_paint2.007
        ├── primitive 10: TRIANGLES; material 10: mercedes_mirror_right.005
        ├── primitive 11: TRIANGLES; material 11: mercedes_wheel_hub.007
        ├── primitive 12: TRIANGLES; material 12: discs.007
        ├── primitive 13: TRIANGLES; material 13: sidewall.007
        ├── primitive 14: TRIANGLES; material 14: tread_medium.007
        ├── primitive 15: TRIANGLES; material 15: chrome.004
        ├── primitive 16: TRIANGLES; material 16: gp21_cinture.004
        ├── primitive 17: TRIANGLES; material 17: mercedes_colordriver.005
        ├── primitive 18: TRIANGLES; material 18: mercedes_carbon2.005
        ├── primitive 19: TRIANGLES; material 19: mercedes_sw.005
        ├── primitive 20: TRIANGLES; material 20: sw_decals.003
        ├── primitive 21: TRIANGLES; material 21: sw_carbon.003
        ├── primitive 22: TRIANGLES; material 22: indicator_lights.004
        ├── primitive 23: TRIANGLES; material 23: rev_lights.003
        ├── primitive 24: TRIANGLES; material 24: generics_lcd.003
        ├── primitive 25: TRIANGLES; material 25: kers_red.003
        ├── primitive 26: TRIANGLES; material 26: kers_green.003
        ├── primitive 27: TRIANGLES; material 27: whitelight.003
        └── primitive 28: TRIANGLES; material 28: CLEARLED.003
```

There are no additional source nodes, children, hidden scene branches, cameras, light nodes or alternate mesh assets in the enumerated folders. Primitives in this tree are mesh data, not authored transform nodes.

## Complete Three.js runtime hierarchy

```text
Scene [Group]
└── f1_2026_w17 [Group; source node 0 / mesh 0]
    ├── f1_2026_w17_1 [Mesh; P0; generics.007]
    ├── f1_2026_w17_2 [Mesh; P1; mercedes_decals.005]
    ├── f1_2026_w17_3 [Mesh; P2; mercedes_carbon3.007]
    ├── f1_2026_w17_4 [Mesh; P3; mercedes_detail.007]
    ├── f1_2026_w17_5 [Mesh; P4; mercedes_carbon1.007]
    ├── f1_2026_w17_6 [Mesh; P5; rear_light_2.007]
    ├── f1_2026_w17_7 [Mesh; P6; mercedes_number_63.005]
    ├── f1_2026_w17_8 [Mesh; P7; mercedes_mirror_left.005]
    ├── f1_2026_w17_9 [Mesh; P8; mercedes_paint.007]
    ├── f1_2026_w17_10 [Mesh; P9; mercedes_paint2.007]
    ├── f1_2026_w17_11 [Mesh; P10; mercedes_mirror_right.005]
    ├── f1_2026_w17_12 [Mesh; P11; mercedes_wheel_hub.007]
    ├── f1_2026_w17_13 [Mesh; P12; discs.007]
    ├── f1_2026_w17_14 [Mesh; P13; sidewall.007]
    ├── f1_2026_w17_15 [Mesh; P14; tread_medium.007]
    ├── f1_2026_w17_16 [Mesh; P15; chrome.004]
    ├── f1_2026_w17_17 [Mesh; P16; gp21_cinture.004]
    ├── f1_2026_w17_18 [Mesh; P17; mercedes_colordriver.005]
    ├── f1_2026_w17_19 [Mesh; P18; mercedes_carbon2.005]
    ├── f1_2026_w17_20 [Mesh; P19; mercedes_sw.005]
    ├── f1_2026_w17_21 [Mesh; P20; sw_decals.003]
    ├── f1_2026_w17_22 [Mesh; P21; sw_carbon.003]
    ├── f1_2026_w17_23 [Mesh; P22; indicator_lights.004]
    ├── f1_2026_w17_24 [Mesh; P23; rev_lights.003]
    ├── f1_2026_w17_25 [Mesh; P24; generics_lcd.003]
    ├── f1_2026_w17_26 [Mesh; P25; kers_red.003]
    ├── f1_2026_w17_27 [Mesh; P26; kers_green.003]
    ├── f1_2026_w17_28 [Mesh; P27; whitelight.003]
    └── f1_2026_w17_29 [Mesh; P28; CLEARLED.003]
```

All runtime meshes are direct children of `f1_2026_w17`, have no children, and initially use position [0,0,0], quaternion [0,0,0,1], and scale [1,1,1]. Their names are the actual observed names in the pinned GLTFLoader version.

## Every runtime mesh: geometry and material

All primitives are indexed TRIANGLES (mode omitted in the GLB, hence mode 4), with FLOAT32 POSITION (VEC3), NORMAL (VEC3), and TEXCOORD_0 (VEC2). Three.js names these attributes `position`, `normal`, `uv`. All three attributes have the stated vertex count. Indices are unsigned 16-bit for this asset. Each row has one material.

| P | Runtime mesh | Parent | Material | Vertices | Indices | Triangles | Exact-position islands |
|---|---|---|---|---:|---:|---:|---:|
| 0 | f1_2026_w17_1 | f1_2026_w17 | generics.007 | 10,767 | 32,562 | 10,854 | 239 |
| 1 | f1_2026_w17_2 | f1_2026_w17 | mercedes_decals.005 | 4,912 | 21,795 | 7,265 | 75 |
| 2 | f1_2026_w17_3 | f1_2026_w17 | mercedes_carbon3.007 | 38,416 | 180,381 | 60,127 | 73 |
| 3 | f1_2026_w17_4 | f1_2026_w17 | mercedes_detail.007 | 10,877 | 36,051 | 12,017 | 233 |
| 4 | f1_2026_w17_5 | f1_2026_w17 | mercedes_carbon1.007 | 32,683 | 145,899 | 48,633 | 92 |
| 5 | f1_2026_w17_6 | f1_2026_w17 | rear_light_2.007 | 708 | 2,574 | 858 | 7 |
| 6 | f1_2026_w17_7 | f1_2026_w17 | mercedes_number_63.005 | 188 | 738 | 246 | 6 |
| 7 | f1_2026_w17_8 | f1_2026_w17 | mercedes_mirror_left.005 | 46 | 144 | 48 | 1 |
| 8 | f1_2026_w17_9 | f1_2026_w17 | mercedes_paint.007 | 21,153 | 96,633 | 32,211 | 24 |
| 9 | f1_2026_w17_10 | f1_2026_w17 | mercedes_paint2.007 | 3,826 | 20,994 | 6,998 | 4 |
| 10 | f1_2026_w17_11 | f1_2026_w17 | mercedes_mirror_right.005 | 46 | 144 | 48 | 1 |
| 11 | f1_2026_w17_12 | f1_2026_w17 | mercedes_wheel_hub.007 | 23,355 | 81,726 | 27,242 | 36 |
| 12 | f1_2026_w17_13 | f1_2026_w17 | discs.007 | 48 | 120 | 40 | 4 |
| 13 | f1_2026_w17_14 | f1_2026_w17 | sidewall.007 | 2,454 | 11,970 | 3,990 | 6 |
| 14 | f1_2026_w17_15 | f1_2026_w17 | tread_medium.007 | 8,034 | 45,150 | 15,050 | 4 |
| 15 | f1_2026_w17_16 | f1_2026_w17 | chrome.004 | 4,321 | 13,356 | 4,452 | 17 |
| 16 | f1_2026_w17_17 | f1_2026_w17 | gp21_cinture.004 | 9,524 | 38,280 | 12,760 | 17 |
| 17 | f1_2026_w17_18 | f1_2026_w17 | mercedes_colordriver.005 | 254 | 963 | 321 | 3 |
| 18 | f1_2026_w17_19 | f1_2026_w17 | mercedes_carbon2.005 | 1,496 | 6,243 | 2,081 | 4 |
| 19 | f1_2026_w17_20 | f1_2026_w17 | mercedes_sw.005 | 10,997 | 34,596 | 11,532 | 98 |
| 20 | f1_2026_w17_21 | f1_2026_w17 | sw_decals.003 | 3,093 | 7,914 | 2,638 | 85 |
| 21 | f1_2026_w17_22 | f1_2026_w17 | sw_carbon.003 | 7,251 | 23,565 | 7,855 | 14 |
| 22 | f1_2026_w17_23 | f1_2026_w17 | indicator_lights.004 | 192 | 504 | 168 | 12 |
| 23 | f1_2026_w17_24 | f1_2026_w17 | rev_lights.003 | 40 | 96 | 32 | 2 |
| 24 | f1_2026_w17_25 | f1_2026_w17 | generics_lcd.003 | 8 | 12 | 4 | 1 |
| 25 | f1_2026_w17_26 | f1_2026_w17 | kers_red.003 | 28 | 36 | 12 | 3 |
| 26 | f1_2026_w17_27 | f1_2026_w17 | kers_green.003 | 148 | 216 | 72 | 3 |
| 27 | f1_2026_w17_28 | f1_2026_w17 | whitelight.003 | 176 | 252 | 84 | 8 |
| 28 | f1_2026_w17_29 | f1_2026_w17 | CLEARLED.003 | 120 | 180 | 60 | 30 |

### Per-mesh world bounds

| P | Min X, Y, Z | Max X, Y, Z |
|---|---|---|
| 0 | -0.6710, 0.0523, -1.3956 | 0.6710, 1.0464, 1.6838 |
| 1 | -0.8899, 0.1497, -2.5079 | 0.8899, 1.0271, 2.8413 |
| 2 | -0.8898, 0.0606, -2.5262 | 0.8898, 1.0055, 1.7441 |
| 3 | -0.9082, 0.0799, -2.4998 | 0.9083, 1.1155, 2.6902 |
| 4 | -0.8999, 0.0559, -2.4998 | 0.8999, 1.0262, 2.8641 |
| 5 | -0.6643, 0.3163, -2.5262 | 0.6643, 0.9133, 0.5653 |
| 6 | -0.1316, 0.5987, -1.6542 | 0.1316, 0.8725, 1.5733 |
| 7 | 0.4891, 0.7198, 0.4764 | 0.6772, 0.7698, 0.5447 |
| 8 | -0.7135, 0.1808, -2.5079 | 0.7135, 1.1578, 2.8601 |
| 9 | -0.3606, 0.6959, -0.2426 | 0.3606, 0.9323, 0.8691 |
| 10 | -0.6772, 0.7198, 0.4764 | -0.4891, 0.7698, 0.5447 |
| 11 | -0.9584, 0.0627, -2.0328 | 0.9585, 0.5760, 1.8632 |
| 12 | -0.7990, 0.1788, -1.9170 | 0.7991, 0.4523, 1.7474 |
| 13 | -0.9587, 0.0016, -2.0937 | 0.9590, 0.6362, 1.9246 |
| 14 | -0.9518, -0.0436, -2.1391 | 0.9522, 0.6740, 1.9684 |
| 15 | -0.1098, 0.1468, 0.1213 | 0.1098, 0.4615, 0.3626 |
| 16 | -0.1592, 0.1434, -0.1613 | 0.1592, 0.6242, 0.5340 |
| 17 | -0.1295, 1.0862, -0.4308 | 0.1293, 1.1324, -0.2585 |
| 18 | -0.3242, 0.3249, 0.4055 | 0.3242, 0.5968, 1.7543 |
| 19 | -0.1437, 0.4699, 0.5487 | 0.1440, 0.6350, 0.6949 |
| 20 | -0.1316, 0.4970, 0.5514 | 0.1319, 0.6284, 0.6066 |
| 21 | -0.1317, 0.4951, 0.5527 | 0.1320, 0.6331, 0.6485 |
| 22 | -0.0600, 0.5893, 0.5645 | 0.0604, 0.6045, 0.5647 |
| 23 | -0.0480, 0.6095, 0.5648 | 0.0483, 0.6178, 0.5650 |
| 24 | -0.0485, 0.5479, 0.5674 | 0.0489, 0.6050, 0.5685 |
| 25 | -0.0465, 0.5900, 0.5673 | -0.0426, 0.5967, 0.5675 |
| 26 | -0.0466, 0.5495, 0.5675 | -0.0426, 0.5900, 0.5682 |
| 27 | 0.0428, 0.5497, 0.5673 | 0.0465, 0.5968, 0.5682 |
| 28 | -0.0447, 0.6108, 0.5645 | 0.0463, 0.6162, 0.5645 |

Local bounds, typed attribute details, source associations and **all** island bounds/counts are in `inspection-data.json`. Full material factors and image/texture/sampler assignments are retained verbatim in `gltf-metadata.json`. All source materials are double-sided metallic/roughness PBR materials with the specular extension; normal maps often have a zero scale in the source. No material names encode a reliable component hierarchy.

## Complete recursive file inventory

| Relative path under 2026-mercedes-w17 | Bytes | Image dimensions |
|---|---:|---|
| source/f1_2026_w17.glb | 40,091,884 | — |
| textures/AC_silver_17.png | 71 | 8 × 8 |
| textures/carbon_fiber_1_4.png | 5,024 | 128 × 128 |
| textures/carbon_fiber_2_22.png | 98,927 | 512 × 512 |
| textures/carbon_fiber_3_26.png | 20,273 | 128 × 128 |
| textures/clearled_32.png | 943 | 32 × 32 |
| textures/disc_d_14.png | 2,291 | 64 × 64 |
| textures/driver_color_20.png | 87 | 64 × 64 |
| textures/ext_carbon_fiber_d_28.png | 5,024 | 128 × 128 |
| textures/flat_nm_0.png | 83 | 32 × 32 |
| textures/generic_main_d_1.png | 2,597,890 | 2048 × 2048 |
| textures/gp21_cinture_19.png | 214,352 | 1024 × 1024 |
| textures/gp21_cinture_NM_18.png | 439,329 | 1024 × 1024 |
| textures/int_indicator_d_27.png | 2,361 | 64 × 64 |
| textures/LIGHTGREEN_30.png | 83 | 16 × 16 |
| textures/LIGHTwhite_31.png | 83 | 16 × 16 |
| textures/mercedes_decal_da.tif_2.png | 864,541 | 4096 × 4096 |
| textures/mercedes_details_d.tif_5.png | 712,200 | 2048 × 2048 |
| textures/mercedes_driver_63.tif_8.png | 86,762 | 1024 × 512 |
| textures/mercedes_paint_d.tif_10.png | 264,555 | 4096 × 4096 |
| textures/mercedes_paint_halo_11.png | 264,555 | 4096 × 4096 |
| textures/mercedes_steering_wheel_d25_23.png | 1,337,904 | 2048 × 2048 |
| textures/mercedes_steering_wheel_decal_da.tif_24.png | 378,546 | 2048 × 2048 |
| textures/mercedes_wheel_d.tif_13.png | 2,069,694 | 2048 × 2048 |
| textures/Normal_15.png | 8,360,665 | 4096 × 4096 |
| textures/rear_light_2_d_7.png | 126,649 | 512 × 512 |
| textures/rear_light_2_n.tif_6.png | 82,917 | 512 × 512 |
| textures/S_16.png | 1,104,863 | 4096 × 4096 |
| textures/W13LCD2_29.png | 10,384 | 1024 × 1024 |

Total: 29 files / 59,142,940 bytes. No .blend, .fbx, .obj, external .bin, rig, animation file, README or license file was found under these two folders. The project root also contains the supplied 2026-mercedes-w17.zip (59,146,912 bytes); it was not extracted or modified during this inspection and is not an additional inspected source model.

## Embedded image resources

The GLB is self-contained: its one buffer and all 33 PNG images are embedded; there are no external buffer or image URI dependencies. It has 46 texture objects referencing those 33 images. The 28 adjacent PNG files are not required to load this GLB. Their names largely match embedded resources, but their encoded bytes differ (no SHA-256 matches), so this report does not claim byte-for-byte duplicates or pixel equivalence. Names containing `.tif` are still PNG images here.

| Image index | Embedded name | Dimensions | Bytes |
|---|---|---|---:|
| 0 | flat_nm | 32 × 32 | 257 |
| 1 | generic_main_d | 2048 × 2048 | 3,387,723 |
| 2 | mercedes_decal_da.tif | 4096 × 4096 | 1,264,164 |
| 3 | carbon_fiber_nm_1 | 128 × 128 | 9,525 |
| 4 | carbon_fiber_1 | 128 × 128 | 6,720 |
| 5 | mercedes_details_d.tif | 2048 × 2048 | 1,033,860 |
| 6 | rear_light_2_n.tif | 512 × 512 | 111,166 |
| 7 | rear_light_2_d | 512 × 512 | 173,973 |
| 8 | mercedes_driver_63.tif | 1024 × 512 | 113,818 |
| 9 | mirror | 128 × 64 | 7,063 |
| 10 | mercedes_paint_d.tif | 4096 × 4096 | 600,051 |
| 11 | mercedes_paint_halo | 4096 × 4096 | 600,051 |
| 12 | mercedes_wheel_n | 2048 × 2048 | 1,638,173 |
| 13 | mercedes_wheel_d.tif | 2048 × 2048 | 3,163,359 |
| 14 | disc_d | 64 × 64 | 4,008 |
| 15 | Normal | 4096 × 4096 | 13,950,082 |
| 16 | S | 4096 × 4096 | 1,857,762 |
| 17 | AC_silver | 8 × 8 | 227 |
| 18 | gp21_cinture_NM | 1024 × 1024 | 1,004,882 |
| 19 | gp21_cinture | 1024 × 1024 | 412,792 |
| 20 | driver_color | 64 × 64 | 299 |
| 21 | carbon_fiber_nm_2 | 512 × 512 | 146,998 |
| 22 | carbon_fiber_2 | 512 × 512 | 200,008 |
| 23 | mercedes_steering_wheel_d25 | 2048 × 2048 | 1,907,156 |
| 24 | mercedes_steering_wheel_decal_da.tif | 2048 × 2048 | 526,594 |
| 25 | carbon_fiber_nm_3 | 128 × 128 | 18,705 |
| 26 | carbon_fiber_3 | 128 × 128 | 23,295 |
| 27 | int_indicator_d | 64 × 64 | 3,924 |
| 28 | ext_carbon_fiber_d | 128 × 128 | 6,720 |
| 29 | W13LCD2 | 1024 × 1024 | 29,874 |
| 30 | LIGHTGREEN | 16 × 16 | 240 |
| 31 | LIGHTwhite | 16 × 16 | 240 |
| 32 | clearled | 32 × 32 | 1,419 |

Five embedded resources have no corresponding named external PNG in the supplied directory: `carbon_fiber_nm_1`, `mirror`, `mercedes_wheel_n`, `carbon_fiber_nm_2`, `carbon_fiber_nm_3`. They are present inside the GLB, so this is not a missing-texture dependency.

### Material → image roles

| P / material | Base color image | Normal image |
|---|---|---|
| 0 / generics.007 | generic_main_d | flat_nm |
| 1 / mercedes_decals.005 | mercedes_decal_da.tif | — |
| 2 / mercedes_carbon3.007 | carbon_fiber_1 | carbon_fiber_nm_1 |
| 3 / mercedes_detail.007 | mercedes_details_d.tif | flat_nm |
| 4 / mercedes_carbon1.007 | carbon_fiber_1 | carbon_fiber_nm_1 |
| 5 / rear_light_2.007 | rear_light_2_d | rear_light_2_n.tif |
| 6 / mercedes_number_63.005 | mercedes_driver_63.tif | — |
| 7 / mercedes_mirror_left.005 | mirror | — |
| 8 / mercedes_paint.007 | mercedes_paint_d.tif | flat_nm |
| 9 / mercedes_paint2.007 | mercedes_paint_halo | flat_nm |
| 10 / mercedes_mirror_right.005 | mirror | — |
| 11 / mercedes_wheel_hub.007 | mercedes_wheel_d.tif | mercedes_wheel_n |
| 12 / discs.007 | disc_d | — |
| 13 / sidewall.007 | S | Normal |
| 14 / tread_medium.007 | S | Normal |
| 15 / chrome.004 | AC_silver | flat_nm |
| 16 / gp21_cinture.004 | gp21_cinture | gp21_cinture_NM |
| 17 / mercedes_colordriver.005 | driver_color | — |
| 18 / mercedes_carbon2.005 | carbon_fiber_2 | carbon_fiber_nm_2 |
| 19 / mercedes_sw.005 | mercedes_steering_wheel_d25 | flat_nm |
| 20 / sw_decals.003 | mercedes_steering_wheel_decal_da.tif | — |
| 21 / sw_carbon.003 | carbon_fiber_3 | carbon_fiber_nm_3 |
| 22 / indicator_lights.004 | int_indicator_d | — |
| 23 / rev_lights.003 | ext_carbon_fiber_d | flat_nm |
| 24 / generics_lcd.003 | W13LCD2 | flat_nm |
| 25 / kers_red.003 | LIGHTGREEN | — |
| 26 / kers_green.003 | LIGHTGREEN | — |
| 27 / whitelight.003 | LIGHTwhite | — |
| 28 / CLEARLED.003 | clearled | — |

## Preservation result

All 29 original files match their initial size and SHA-256 checksum after inspection. No original mesh, texture or other source file was modified. The inspector changes only in-memory display state.
