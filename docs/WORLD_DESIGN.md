# WORLD — World structure and technical design

## World dimensions
The target world covers exactly 300 km² as a 20,000 m × 15,000 m rectangle. Coordinates use metres (1 Three.js world unit = 1 metre). The south-west corner is the initial origin/anchor for the founding city.

## Hierarchy
- World: 20 km × 15 km.
- Regions: 1 km × 1 km; 20 columns × 15 rows = 300 regions.
- Streaming chunks: nominally 256 m × 256 m. A 1 km region contains a 4 × 4 grid of chunks with edge overlap/clipping handled by the region boundary.
- Subsystems: terrain, water, roads, buildings, vegetation, props, NPCs, lighting, audio and points of interest.

## Streaming policy
- Do not instantiate all geometry at startup.
- Keep a small radius of chunks around the player active; unload distant geometry and dispose GPU resources.
- Use deterministic seeds based on world seed + region + chunk coordinates.
- Use instancing for repeated vegetation, rocks, street lamps and other props.
- Add multiple levels of detail for terrain, trees and buildings.
- Keep collision/navigation data lighter than render geometry.
- Keep the city centre and nearby approach routes at higher detail; distant landscape uses lower detail.

## Persistence
- Browser localStorage is suitable for small preferences and player settings only.
- IndexedDB should store larger local data: discovered places, modified objects, construction state and region change records.
- Generated world data is reproducible from seeds; save only changes and player discoveries, not every generated tree.
- Future optional cloud accounts must be additive; the world must remain playable without an account.
- GitHub Pages is static hosting and cannot provide shared authoritative multiplayer persistence by itself.

## Founding city
The first city begins in the south-west corner. It will be designed as a coherent settlement, not a random collection of buildings:
1. A central civic square and market.
2. Main street connecting the entrance road to the square.
3. Residential streets with varied house footprints and gardens.
4. Workshops, bakery, inn, small shops and service buildings.
5. Public buildings and a recognisable landmark.
6. A green edge: park, river/pond if terrain permits, fields and forest.
7. NPC routes connecting homes, work, shops and public places.

## Visual direction
- Soft low-poly, not voxel/block-world.
- Rounded or bevelled silhouettes where appropriate; clean topology and consistent proportions.
- Distinct materials and believable scale.
- Terrain should have broad walkable plains and gently graded buildable areas.
- Roads and paths must be continuous and navigable.
- Each region gets its own palette, architecture, vegetation and objects based on climate, geography and settlement identity.
- Characters need articulated rigs, varied proportions, expressive faces, hair, clothing and readable animations.
