# Refinement verification — 2026-10-13

The current refinement passes **27 tests** and a production build (84 modules). The existing Three/R3F chunk-size advisory remains. No new dependencies were added.

Browser checks used the local Vite app in the Codex browser:

- Full 112-second playback reached progress 1.000000 and stopped with Play available. Final expansion, engine detail and lift were all 0; departure was 28 and wheel angle 393.616373.
- Front Wing, Brakes, Wheels and Power Unit chapter clicks were exercised, including backward travel from the final state. An immediate sample after the Front Wing click was 0.002859, followed by the intended 0.483824 reading hold, confirming intermediate traversal.
- Pause held progress 0.985294 and wheel angle 315.909196 unchanged across later observations. Play resumed from a component study.
- Reverse wheel scrolling during playback changed progress from approximately 0.593 to 0.575817 and changed Pause back to Play, correctly interrupting transport.
- Desktop front-wing, suspension, brake, monocoque and power-unit views were inspected. The engine camera was brought closer after visual review.
- The 390×844 portrait layout retained readable descriptions, all chapter numbers and playback controls. Resizing back to desktop retained progress within native scroll rounding: 0.816420 → 0.816422. The temporary viewport override was reset.
- The final browser console contained no warnings or errors. Screenshot: `evidence/refined-power-unit.jpg`.
- Automated checks additionally cover every chapter's readable landing point, all component camera holds, 90/112/120-second retiming, reversible guide motion, model hashes, brake and wheel physics, engine extraction, original geometry masks, reassembly, landing and reduced motion.

Technical context and tuning instructions are in `REFINEMENT.md`. Physical mobile hardware performance was not benchmarked.

---

## Earlier baseline verification (before this refinement)

Updated the existing cinematic project in place. Native scrolling is the single progress source; Play/Pause and chapter navigation use one cancellable GSAP ScrollToPlugin transport. The scene uses absolute transforms and demand rendering, with no independent wheel animation loop.

## Results

| Check | Result / evidence |
| --- | --- |
| Automated regression tests | 22 passed, 0 failed (`node --test tests/*.test.mjs`) |
| Production build | Pass; Vite 80 modules. Existing large Three/R3F chunk advisory remains. |
| Complete autoplay | Ran from 0 to 100%; stopped automatically with Play available again. `evidence/autoplay-trace.json` |
| Pause / resume | Identical scene progress and wheel angle while paused; both advance on resume. `evidence/playback-interruption.json` |
| Manual interruption | Native wheel scrolling interrupts autoplay and chapter navigation; reverse scrolling retraces the scene. |
| Chapters 1–5 | All visited forward and backward; sampled intermediate progress differs from both endpoints, proving animated travel. `evidence/chapter-navigation.json` |
| Whole timeline | 46 browser checkpoints in both directions. `evidence/final-scrub.json` |
| Brakes | Four assemblies, each with perforated carbon disc, vents, rotor hat, hub, bolts, fixed caliper and piston caps. Front brake close-up and portrait inspected. `evidence/brakes-final.png`, `evidence/brakes-mobile.png` |
| Wheel stability | Four centered local X axles; angle = common travel distance / measured tire radius. Brake rotors share wheel phase; calipers remain fixed. No phase reset entering dissection. |
| Slow motion | Integrated smooth deceleration remains positive up to the stop; rotation continues through slow motion and resumes continuously on launch. Browser pause/resume captured changing angle at ~20% progress. |
| Suspension | Left/right connected islands translated laterally. All 7,686 front and 6,242 rear triangles retained. `evidence/suspension-audit.json` |
| Labels | Nine component focus states show only names, with technical leader lines. |
| Decal alpha | Original 4096×4096 RGBA atlas contains 14,271,188 transparent pixels, 214,238 partial-alpha pixels and 879 opaque black pixels. Alpha restored at material level without black keying or image edits. `evidence/decal-alpha-audit.json` |
| Reassembly / landing / launch | Engine closes by 87.5%, car assembles by 93%, lowers from 94–97.2%, holds grounded until 98%, then accelerates. No forward travel during lowering. Corrected landing camera and replayed finale. |
| Reduced motion | Fixed camera, zero wheel/road motion, retained engine dissection. Corrected studio floor clearance and visually verified Floor / Diffuser. |
| Responsive layout | Desktop plus 390×844 portrait inspected; controls and name labels visible. Viewport override reset after testing. |
| Console | Final production browser check: no warnings/errors. |
| Original assets | Original source, prepared GLB and engine SHA-256 unchanged; source textures untouched. Existing engine masks and extraction path retained. |

## Corrections found during verification

- Retained wheel phase on entering the studio and returning to the track instead of snapping to zero.
- Removed double counting of departure in road movement, which previously caused wheel slip.
- Held the landing camera until launch; the inherited camera turn cropped the stationary car.
- Synchronized initial/refreshed scroll progress with scene and UI.
- Protected Play/Pause clicks and touches from the global manual-interruption handler.
- Kept the exploded floor above the studio surface in reduced-motion mode.

Brake geometry is an illustrative engineering assembly, not Mercedes CAD. No reference image attachments were available in this chat; the existing model, materials and engineering visual language guided the work. Physical-device frame-rate benchmarking and exhaustive geometric collision checking are not claimed. The original roughly 40 MB model download and existing inspection/grouping limitations remain.
