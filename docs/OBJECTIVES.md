# WORLD — Objectives and roadmap

## Foundation
- [x] Public GitHub Pages prototype.
- [x] Player creation with name and appearance controls.
- [x] Italian, English, Spanish and French language files.
- [x] First-person default camera.
- [x] Third-person camera setting.
- [x] Pause/settings menu.
- [x] Local player/marker save.
- [x] Articulated procedural player rig.
- [x] Initial NPC idle animation.

## Character quality
- [ ] Verify animation in browser at desktop and mobile sizes.
- [ ] Add idle, walk, run, jump and landing states.
- [ ] Improve foot placement and slopes.
- [ ] Add head/eye direction, facial variation and expressions.
- [ ] Add body proportions and varied silhouettes.
- [ ] Add hairstyles, outfits, accessories and profession-specific clothing.
- [ ] Introduce GLTF/GLB model support without losing the procedural fallback.

## World technology
- [ ] Define authoritative world coordinate system (1 unit = 1 metre).
- [ ] Build 20 km × 15 km region index (300 km²).
- [ ] Implement 256 m chunk streaming with load/unload distance.
- [ ] Deterministic terrain generation by region seed.
- [ ] LOD for terrain, buildings, vegetation and distant scenery.
- [ ] Occlusion/frustum culling and instancing for repeated props.
- [ ] Persist player edits and discoveries in IndexedDB.
- [ ] Keep generated baseline separate from user changes.

## Founding city — south-west corner
- [ ] Choose city name, history, climate and local identity.
- [ ] Lay out terrain, flat buildable districts and a walkable street network.
- [ ] Create central square, market, town hall, inn, workshops and homes.
- [ ] Add district-specific architecture and material palette.
- [ ] Add sidewalks, crossings, lamps, benches, bins, signs, fences and street details.
- [ ] Add parks, gardens, tree belts, nearby forest and fields.
- [ ] Populate with residents, merchants, workers, children and visitors (age-appropriate).
- [ ] Give NPCs routes, daily schedules, idle behaviours and interactions.
- [ ] Add services, interiors and discoverable locations.

## Sound and game systems
- [ ] Ambient sound by biome and district.
- [ ] Footsteps by surface.
- [ ] Music zones and volume controls.
- [ ] Interaction system and dialogue.
- [ ] Quests, journals and world discoveries.
- [ ] Save slots/export-import for player progress.
