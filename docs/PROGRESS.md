# WORLD — Progress tracker

Last updated: 2026-11-13

## Current baseline
- Repository: https://github.com/JonaDev2026/world3d
- Published prototype: GitHub Pages
- Current milestone: 0.6 — Living Characters
- Rendering: Three.js, browser-based, no build step.
- Languages: Italian, English, Spanish, French.
- Player setup: name and appearance stored in browser localStorage.
- Camera: first-person default; third-person selectable from pause settings.
- Pause menu: camera, language, map entry, music and SFX controls (audio playback not connected yet).
- World prototype: small handcrafted/procedural test area, not yet the 300 km² world.

## Implemented in 0.6
- Player model now has separate torso, head, shoulder and hip pivots.
- Arms and legs swing while walking; torso and head have subtle motion.
- NPCs have articulated limbs and subtle idle animation.
- Player appearance has a more deliberate silhouette, clothing layers, boots, hair fringe and eyes.
- Preview still updates from the creator's appearance controls.

## Known limitations
- No browser-based visual/runtime test has been performed for this milestone.
- NPCs are stationary ambient characters; schedules, navigation and dialogue are future work.
- Current playable terrain is only 96 × 96 world units. It is a prototype, not a 300 km² landscape.
- Current character rig is procedural geometry; replaceable by authored GLTF/GLB characters later.
- World persistence is currently localStorage for player settings/markers; persistent world edits will need IndexedDB or a server save system.

## Design scale for the full world
- Target land area: 300 km².
- Adopt 1 world unit = 1 metre for terrain and navigation.
- Use a rectangular 20 km × 15 km world = 300 km².
- Divide into 1 km × 1 km named regions.
- Subdivide each region into 256 m streaming chunks (edge chunks may be clipped); stream only nearby chunks.
- Keep terrain, roads, buildings, vegetation, props and NPCs as separate systems.
- Store deterministic generation seeds and player-made changes separately so updates do not erase world progress.
- First settlement is planned in the south-west corner of the world map; expand outward from that anchor.

## Next work
1. Verify the articulated rig in the actual browser and fix any visual issues.
2. Add proper walk/run/idle transitions and foot-ground alignment.
3. Improve character anatomy, face, hair, clothing and proportions; prepare a GLTF asset pipeline.
4. Build chunk/region streaming and a minimap/world-coordinate system.
5. Design the first city district-by-district: terrain grading, roads, blocks, public square, homes, shops, civic buildings, vegetation and props.
6. Add NPC daily routines, walking paths, interaction and localised names/dialogue.
7. Add IndexedDB persistence for discoveries and world edits.
