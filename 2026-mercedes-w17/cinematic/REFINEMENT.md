# Cinematic component studies

The existing React/Three.js scene, assets, PBR materials, racetrack, wheel/brake rig and engine extraction are retained. This pass changes storytelling and transport, rather than rebuilding the experience.

## Configuration

- `src/chapters.js`: shared chapter catalog, component names, two-sentence descriptions, engineering callouts, focus groups and camera views. Includes the previously omitted engine cover. Symmetric wheels and suspension members remain grouped by system; the existing detailed engine is studied as the Power Unit.
- Each component's `timing` tuple is `[arrivalSeconds, studySeconds, departureSeconds]`. The `seconds` field controls non-component chapters.
- `src/pacing.js`: `createPacing(chapters, 112)` scales the configured beats to 112 seconds. Change the second argument to adjust the entire film (90–120 seconds is the intended range), or omit it to use raw chapter seconds. The camera is fixed between 38% and 82% of each component interval while the schematic guides advance slowly.
- Navigation is generated from the same catalog: 14 chapters, including 10 component studies. Active state uses actual section boundaries. Links land inside each component's reading hold.

## Shared transport

The existing single GSAP ScrollTo/ScrollTrigger transport remains authoritative. A continuous monotone cubic map converts film time into the original scene progress, so scrolling speed changes across chapters. Resume inverts that same map from the current native scroll position; chapter navigation traverses it in either direction. Only ScrollTrigger writes the scene playhead. No independent camera, mesh or explanation animation loop has been introduced.

Pausing freezes the current frame, including diagrammatic guides. Native wheel/touch/keyboard input interrupts transport. Resize and hidden-tab events pause it. Camera interpolation orbits around the target instead of crossing through the vehicle on front-to-rear transitions. Staged exterior separation reverses exactly through the same offsets; the original engine extraction path remains unchanged.

## Visual explanation

The studies preserve visible surrounding structure, dim non-focused parts and add original line/particle diagrams for airflow, rotation, friction heat, load paths and hybrid energy. These are explicitly diagrammatic, not CFD or mechanical simulations. They do not alter the wheel distance/radius relationship or deform suspension geometry. The projected leader connects the principle card to the component in desktop views; compact views keep the in-scene guide and remove the crossing leader.

## Reference and technical basis

The [Animagraffs reference](https://www.youtube.com/watch?v=V7707zEX9X4) was sampled for its overview-to-isolation approach, airflow visualization and mechanical close-ups. The adaptation uses existing project models and original procedural guides; it does not copy reference assets. The older video's technical details are not treated as W17 specifications.

- [Mercedes-AMG W17 overview](https://www.mercedesamgf1.com/car/2026): current hybrid architecture, including removal of the MGU-H.
- [Formula 1 terminology update](https://corp.formula1.com/f1-2026-regulations-terminology-update/): 2026 hybrid terminology.
- [F1 Explains: downforce](https://www.formula1.com/en/latest/article/f1-explains-downforce-and-why-f1-cars-have-wings-with-mclaren-aero.10xj8CJPz8s7CmwfoyWmCU): wing loading and the drag/downforce tradeoff.
- [Honda 2026 car engineering overview](https://global.honda/en/F1/machine/2026_AMR26/): general friction/regenerative braking and cooling principles, not a source of Mercedes specifications.

The educational copy deliberately avoids invented power, torque, mass, temperature or aerodynamic performance figures. The existing power-unit model remains labeled illustrative.

## Automated verification

`node --test tests/*.test.mjs` covers monotonic timing, inverse mapping, retiming, continuous beat velocity, camera holds, dynamic chapter coverage, reversible guide phases, pause/resume transport and manual interruption. Existing GLB hash, material/UV, complete rig reversal, brake/caliper alignment, wheel physics, engine masks, landing and reduced-motion checks remain in the suite.

`node node_modules/vite/bin/vite.js build` generates the production output. The existing large Three.js bundle still triggers Vite's chunk-size advisory; no new dependencies were added.
