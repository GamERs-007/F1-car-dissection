# Mercedes W17 — component preparation report

Prepared 2026-10-13. This is an exterior assembly exploded-view asset, not a mechanically complete Formula 1 power-unit model. The original GLB and texture files are unchanged.

## Deliverables

- `../2026-mercedes-w17/public/models/mercedes_w17_disassembled.glb` — 40,134,564 bytes; 12 assembly parents.
- `../2026-mercedes-w17/public/models/mercedes_w17_components.json` — original transforms, world-space pivots, assembled bounding boxes, suggested explosion offsets and limitations.
- `../2026-mercedes-w17/preview/index.html` — Three.js preview with reversible progress slider, orbit controls, component visibility, solo, selection, reset, original comparison and source-patch review.
- `mercedes_w17_prepared.blend` — editable Blender workfile, with source provenance on faces.
- `validation.json`, `triangle-provenance.json`, `assignments.json`, `manual-review.json` — validation and traceability.

## Assembly hierarchy and result

The GLB scene contains `W17_Assemblies`, then the following named assembly parents. Each has a `Name__Geometry` child and its material primitives. Animate the named parent; its children preserve the original mesh coordinates and rotation. Material primitives are rendering subdivisions, not additional mechanical parts.

| Assembly parent | Triangles | Separation scope |
|---|---:|---|
| Chassis_Body | 124,629 | Central retained bodywork, cockpit, internal-looking details and uncertain attachments; stays centered |
| Front_Wing | 20,018 | Wing surfaces, endplates, fittings and removable nose up to an existing seam |
| Rear_Wing | 16,720 | Rear wing, endplates, beam/support surfaces and fittings |
| Wheel_FL | 12,272 | Front left tire/rim assembly |
| Wheel_FR | 12,272 | Front right tire/rim assembly |
| Wheel_RL | 10,985 | Rear left tire/rim assembly |
| Wheel_RR | 10,985 | Rear right tire/rim assembly |
| Floor_Diffuser | 31,253 | Separably identifiable underfloor/diffuser patches |
| Halo | 8,110 | Halo surfaces, stalk underside and associated overlays |
| Suspension_Front | 7,686 | Identifiable external front suspension links |
| Suspension_Rear | 6,242 | Identifiable external rear suspension links |
| Engine_Cover | 6,526 | Additional removable exterior cover shell and attached decals |
| **Total** | **267,698** | **Every original triangle exactly once** |

All twelve assembly parents can move independently. The suggested animation keeps Chassis_Body stationary. The cover is an extra useful exterior assembly; it is not an engine.

## Method and preservation

The starting point was `../inspection/REPORT.md` and its primitive map. Blender 4.5 Python (`bpy`) was used for topology analysis and the editable workfile. The original 29 material primitives contain 7,127 indexed patches and 1,102 exact-position welded connectivity groups. Welding was used only as an analytical relationship: no source vertices were welded or cut in the output.

Assignments combine complete connected patches, material semantics, measured wheel clusters, spatial bounds, and nearest underlying-surface tests. Overlay attachment tests include the retained chassis as a candidate, require at least 95% sampled agreement and a maximum distance below 0.025 original units. Ambiguous patches remain retained for review. Spatial thresholds select existing patches; they never slice triangles. An explicit map of 88 reviewed whole-patch overrides attaches wing fittings and cover boundary decals after visual atlas review.

The final GLB is packed from original attribute bytes using the Blender-produced assignment map. This avoids a material/image round trip through Blender's exporter. Positions, normals and UV values are copied byte for byte; triangle winding, source materials, textures, samplers and all embedded images are preserved. This is physical assembly grouping across materials, not separation by material.

The vehicle retains its original scale and world orientation: +Y up, nose toward +Z. Vehicle left is +X, consistent with the source's left mirror material on that side. Wheel origins use measured wheel centers, the halo origin is at its base, chassis origin is zero, and other assembly origins use their bounding-box centers. Opposing parent/geometry translations preserve the assembled surface locations exactly. Units remain the original glTF units; physical dimensions were not independently calibrated.

## Validation

Independent `validate.mjs` checks passed:

- All 267,698 source triangles occur exactly once, with original winding and attribute values.
- All original material/texture/sampler metadata and 33 embedded images match.
- GLTFLoader loaded source and output; maximum assembled world-space vertex error is **0**.
- Progress samples 0, 0.25, 0.5, 0.75, 1, 0.5, 0 returned exactly to original transforms.
- The 29 original asset files match their inspection checksums.

Browser comparison at 0%, using the same camera, lights and 640 × 400 render target:

| View | Mean RGB absolute difference / 255 | Pixels with channel difference >8 |
|---|---:|---:|
| Default perspective | 0.003082 | 6 / 256,000 (0.0023%) |
| Side | 0.000034 | 0 |
| Top | 0.020880 | 37 / 256,000 (0.0145%) |

The assembled geometry is mathematically identical. Raster output is not strictly pixel-identical: tiny edge/coincident-surface differences remain after draw grouping changes. The preview lets these comparisons be repeated. Browser checks exercised 0%, 50%, 100%, reset, component visibility and selection of a flagged original patch. Evidence images are in `evidence/`.

Source SHA-256: `1d274f08d532e60826a7de5a93ccef7ddabe0b3377cca243679adb46e841a8d8`

Output SHA-256: `5e0433c4275a838a6b7e4cc4845e2de2c5902f2eec62e2b0a775fb3be8ebc811`

## Manual Blender work still required

1. **Wing-only front assembly:** the prepared Front_Wing includes the removable nose. Further separation needs manual face selection at the attachment; no invented cutting plane was used.
2. **Floor/body junctions and individual body panels:** ambiguous mixed sidepod/floor surfaces stay with Chassis_Body. A complete removable body-panel system needs artist review and potentially new boundaries/caps.
3. **Brake ducts, uprights and small attachments:** retained chassis details need physical review before moving with wheels or suspension. The tires/rims are separate; this is not a complete wheel-corner mechanical assembly.
4. **Suspension mechanics:** exported groups contain external links, not individual articulated wishbones, dampers, pushrods or a kinematic rig. Review their joints before a mechanically accurate animation.
5. **Engine and power unit:** some internal-looking geometry exists, but it does not establish a complete modeled engine, battery, MGU-K, turbo or cooling circuit. No such assemblies were fabricated or labeled as verified internal parts. A detailed power-unit dissection requires further identification and likely new modeling.

`manual-review.json` lists 169 conservative review patches totaling 45,361 triangles. These are preserved geometry, not missing geometry. The list includes large retained chassis patches as well as uncertain details; it is a review queue rather than a claim that every entry is misassigned.

## Suitability for the next stage

The export supports a reversible cinematic exterior exploded view using named assembly transforms. It is ready to integrate with React Three Fiber and GSAP progress control. It is not yet a fully engineered mechanical disassembly model: use the limitations above in content and animation planning. No final scrolling website was built.

See `README.md` for preview startup, rebuilding, manual review and integration details.
