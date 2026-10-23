# W17 — The Architecture of Speed

Local cinematic experience built with React, Vite, React Three Fiber / Three.js, GSAP ScrollTrigger and Tailwind CSS. The original inspector remains in `../preview/` and is unchanged. No model was rebuilt or overwritten.

## Run

From this directory, with Node.js 20.19+ or 22.12+ and pnpm installed:

```powershell
pnpm install
pnpm dev
```

Development: http://127.0.0.1:5173/

On this computer the dependencies are already installed, so this also works without pnpm on PATH:

```powershell
node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173
```

Production build and local preview:

```powershell
node node_modules/vite/bin/vite.js build
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 5175
```

Production preview: http://127.0.0.1:5175/ . Build output is `dist/`. No deployment was performed. The build needs the sibling `preview/power-unit-motion.js` and `public/models/` directories; keep this project inside its existing parent folder.

## Controls

Scroll, drag the bottom progress slider, or press Play for an approximately 64-second run at 1.5× speed on a uniform film clock. The 95.267-second authored edit retains its study and landing proportions; all autoplay motion and holds run 1.5× faster. Set PLAYBACK_RATE in src/scroll-controller.js to adjust the multiplier. Pause holds the current position; Play resumes there. Wheel/touch scrolling, keyboard navigation, or dragging the scrollbar interrupts playback or chapter travel. Hidden tabs and resizing pause transport. Play at the end starts again.

The right-side navigation is generated from the chapter catalog: 14 chapters, including 10 component studies. Links travel smoothly in either direction in 1–3 seconds, passing through intermediate states. Each study displays its component name, a two-sentence explanation and an engineering principle. Click a visible mesh to highlight its assembly; dismiss the name to clear selection. The W17 mark and final replay button return smoothly to the beginning. Reduced motion defaults to the operating-system preference.

## Timeline

The coordinates below describe the original scene animation, not the expanded scroll percentage. The scroll playhead includes all added studies and landing time.

| Authored coordinate | Scene |
| --- | --- |
| 0–15% | Tracking shot, procedural circuit, wheel rotation and peripheral directional blur |
| 15–25% | Entry into bullet time, orbit, cyan scan and circuit-to-studio transition |
| 25–45% | Existing assembly offsets; original staged engine extraction path |
| 45–85% | Front Wing, Rear Wing, Wheels, Suspension, Brakes, Floor / Diffuser, Halo, Monocoque, Engine Cover, Power Unit |
| 79.5–84.5% | Power-unit secondary disassembly |
| 85–87.5% | Power-unit internals close before car reassembly |
| 87.5–93% | Car assemblies return to their exact base positions; wheel phase is retained |
| 93–95% | Circuit returns after assembly closure |
| 94–97.2% | Assembled car lowers onto the moving road over about 2.7 seconds, easing to contact |
| 97.2–98% | Grounded rolling transition |
| 98–100% | Accelerates 110 model units along +Z with the original ending camera move; wheel rotation follows distance / radius |

`src/chapters.js` is the shared catalog for navigation, names, descriptions, camera views and per-chapter arrive/study/leave timing. `src/playback.js` inserts configurable studies using `timing[1]`, preserves the speed of existing moves and extends the landing segment. `src/scroll-controller.js` advances this expanded film coordinate linearly with one cancellable tween. Chapter clicks, manual scrolling and autoplay all sample that same edit; `src/pacing.js` retains the legacy pacing preset for comparison. `src/timeline.js` contains absolute animation functions and generates component camera holds from that catalog. `src/explainers.js` adds deterministic diagrammatic flow, load, heat and energy guides without changing model physics. `src/rig.js` adapts existing component configurations and imports the shared engine motion functions. `src/running-gear.js` derives each wheel axle from its original disc plane, preserving authored camber without rotational wobble, and adds centered wheel pivots, non-destructive suspension separation and four brake assemblies. `src/Scene.jsx` keeps one canvas and scene mounted throughout. `src/environment.js` generates local circuit geometry and studio lighting surfaces. `src/scroll-controller.js` owns one cancellable ScrollToPlugin transport. `src/App.jsx` uses one ScrollTrigger as the source of scene progress for every control, including native scrolling.

All animation transforms are calculated from the scroll-derived film time, with no independent timer or accumulated rotations. At normal motion settings, wheels and brake discs continue at an illustrative 0.4 model units/second during bullet time, including every study hold. Diagram phases also continue through holds. Pausing scrolling pauses the scene. Reverse scrolling retraces the same state. Existing geometry masks suppress the same 5,240 legacy internal triangles as the engine preview, without editing the asset files. Loader scenes are cloned before masking so hot reload/remount does not repeat destructive operations.

## Preservation and performance

- Original source, prepared car, engine, texture files and existing preview code are untouched.
- Uses the existing 12 exterior assemblies plus 12 power-unit subassemblies, original materials/UVs and livery. Four procedural carbon-disc, caliper and hub assemblies replace the runtime display of the source's flat disc faces. Suspension islands retain all 13,928 triangles and their original UVs/normals. Highlighting changes only runtime cloned material parameters.
- Loads one prepared car (40,134,564 bytes) and one existing engine (662,988 bytes), in parallel. Does not load a second reference car.
- Uses demand rendering, DPR capped at 1.5, instanced circuit details/brake hardware, 2,048px shadows, cached assets, and peripheral single-frame blur. No video or raster backdrop substitutes for the 3D scene.
- Preserves the car GLB byte-for-byte rather than performing lossy texture or geometry recompression. Its roughly 40 MB download remains the main cold-load cost. The Three/R3F production chunk is about 894 KB / 243 KB gzip; Vite reports its standard large-chunk advisory. Frame rate on physical mobile devices has not been benchmarked.
- Reduced motion removes camera travel, moving circuit, wheel rotation, scanning and blur while preserving user-controlled assembly exploration.

## Accuracy limits

The existing component grouping and any inspection-report limitations are inherited. The power unit and added brakes are illustrative engineering models, not Mercedes engineering CAD. The circuit is procedural and is not a named real-world F1 venue. Blur is an inexpensive spatial speed effect, not a temporal velocity-buffer simulation. Decal transparency uses the original RGBA atlas; no black-pixel removal, texture repainting or original-file editing occurs.

## Validation

```powershell
node --test tests/*.test.mjs
```

Thirty-three checks cover cinematic timing and its inverse, chapter/copy coverage, camera holds, reversible guides, transport cancellation/resuming, resize preservation, complete world-matrix reversibility, wheel/brake alignment, landing-before-launch, suspension triangles, decal alpha, engine extraction, reduced motion and SHA-256 preservation. See `REFINEMENT.md`, `VERIFICATION.md` and local `evidence/` captures for browser checks.

