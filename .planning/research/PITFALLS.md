# Pitfalls Research: Pseudo-3D Visual Implementation

**Domain:** 2D Game Engine with Pseudo-3D (2.5D) Visual Effects
**Researched:** 2026-03-31
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Incorrect Depth Sorting Algorithm

**What goes wrong:**
Objects render in the wrong order, causing visual glitches where distant objects appear in front of closer ones. This destroys the illusion of depth and makes the game look broken. Common symptoms include: trees appearing behind players when they should be in front, buildings rendering in incorrect order, and flickering when objects overlap.

**Why it happens:**
Developers often default to using simple Z-index or layer-based rendering (terrain→resources→structures→player), which works for true top-down games but fails for pseudo-3D where objects occupy the same "layer" but need front-to-back ordering based on their spatial position. The current codebase uses this flawed approach:
- Terrain at depth 0
- Resources at depth 2  
- Structures at depth 3
- Drops at depth 4
- Player shadow at depth 5
- Player sprite at depth 7

This ignores the fact that a tree at Y=10 should render BEHIND a player at Y=12, but AHEAD of a player at Y=8.

**How to avoid:**
Implement painter's algorithm sorting based on Y-coordinate (or a combined Y+height metric). Sort all visible objects each frame before rendering:
```typescript
// Correct approach: sort by render position
const renderOrder = visibleObjects.sort((a, b) => {
  const aY = a.y * TILE_SIZE + a.height;
  const bY = b.y * TILE_SIZE + b.height;
  return aY - bY; // Lower Y renders first (behind)
});
```

Use a single container for all depth-sorted objects rather than separate maps per type.

**Warning signs:**
- Objects flicker or change order when moving
- Player walks "through" the trunk of a tree but behind its leaves
- Structures render inconsistently when placed near each other
- Need to manually adjust Z-index for every new object type

**Phase to address:**
VIS-03 (深度排序渲染) — This phase MUST establish the correct sorting algorithm. Getting this wrong requires rewriting the entire rendering pipeline.

---

### Pitfall 2: Height Property Misalignment

**What goes wrong:**
Objects with visual height (trees, buildings) don't align correctly with their logical positions. Players can walk "through" the visual sprite while being blocked by the logical tile, or vice versa. This creates gameplay confusion where visual feedback contradicts game logic.

**Why it happens:**
Sprite origins are set incorrectly for tall objects. In the current code, player sprite uses `setOrigin(0.5, 0.75)` to anchor at the feet, but tall objects like trees may have origins at their center or top. When combined with depth sorting, this causes misalignment. Additionally, the height value in mod definitions may not match the actual pixel height of the sprite.

**How to avoid:**
1. Standardize all sprite origins to the "foot point" (bottom-center for iso, bottom-left for orthogonal)
2. Define explicit `renderHeight` in object metadata separate from `logicalHeight`
3. Use the height value for depth sorting offset calculation
4. Validate sprite dimensions against metadata at mod load time

```typescript
interface VisualObject {
  x: number; y: number;           // Logical tile position
  renderHeight: number;           // Pixel height of sprite
  origin: { x: number; y: number }; // Anchor point (typically bottom)
  getRenderY(): number {          // Y position for depth sorting
    return this.y * TILE_SIZE + this.origin.y * this.renderHeight;
  }
}
```

**Warning signs:**
- Player appears to walk "through" the bottom of trees
- Hit detection doesn't match visual boundaries
- Objects seem to "float" or sink into ground
- Sorting appears correct but collision feels wrong

**Phase to address:**
VIS-02 (物体高度属性系统) — Establish height metadata and origin conventions here, before implementing depth sorting that depends on them.

---

### Pitfall 3: Dynamic Occlusion Performance Death

**What goes wrong:**
When implementing transparency/outline effects for objects occluding the player (VIS-04), frame rate plummets as more objects become semi-transparent. On mobile or lower-end devices, this can drop the game from 60fps to unplayable levels.

**Why it happens:**
Naive implementations use alpha blending or complex shaders for occluding objects every frame. This causes:
1. Overdraw (same pixels drawn multiple times with blending)
2. Shader pipeline flushes
3. Increased draw calls when objects change from opaque to transparent
4. Garbage collection pressure from creating/destroying transparency effects

**How to avoid:**
1. **Use render texture caching:** Pre-render static occluding objects to textures
2. **Object pooling:** Reuse transparency effect containers instead of creating new ones
3. **Distance-based LOD:** Only apply effects within close range
4. **Frame skipping:** Update occlusion effects every 2-3 frames instead of every frame
5. **Opacity threshold:** Don't make objects fully transparent—use 0.3-0.5 alpha to reduce overdraw

```typescript
// Efficient approach: batch occlusion checks
const OCCLUSION_CHECK_INTERVAL = 3;
let occlusionFrameCounter = 0;

update() {
  occlusionFrameCounter++;
  if (occlusionFrameCounter % OCCLUSION_CHECK_INTERVAL === 0) {
    this.updateOcclusionEffects();
  }
}
```

**Warning signs:**
- Frame rate drops when player approaches dense forest
- Performance degrades as world size increases
- Memory usage grows over time (texture leaks)
- Jank during camera movement

**Phase to address:**
VIS-04 (动态遮挡处理) — Performance must be a primary acceptance criterion, not an afterthought.

---

### Pitfall 4: Mod Compatibility Breakage

**What goes wrong:**
Existing mods render incorrectly or break entirely after the pseudo-3D update. Visual packs that worked before now show objects floating, misaligned, or with broken sorting.

**Why it happens:**
The current mod system expects specific rendering behavior. Changes to:
- Sprite depth calculation
- Origin point assumptions  
- Rendering order
- Container hierarchy

...can all break existing mods that rely on the old system.

**How to avoid:**
1. **Version gate new features:** Mods opt-in via `visualPackVersion: 2` or similar
2. **Maintain backward compatibility layer:** Old mods render using legacy algorithm
3. **Provide migration guide:** Document how to upgrade visual packs
4. **Graceful degradation:** If height data is missing, fall back to reasonable defaults
5. **Test with existing mod suite:** Verify core mods still work before release

```typescript
// Version-based rendering selection
if (visualPack.version >= 2) {
  this.renderPseudo3D(snapshot);
} else {
  this.renderLegacy(snapshot); // Original behavior preserved
}
```

**Warning signs:**
- Core mods show visual glitches in test builds
- Mod authors report issues during beta
- Save files from old versions look wrong after upgrade
- Community feedback about "broken" mods

**Phase to address:**
VIS-05 (Visual Pack 扩展) — The extension phase MUST include backward compatibility as a core requirement.

---

### Pitfall 5: Over-Rendering (Per-Frame Full World Traversal)

**What goes wrong:**
The game becomes unplayable in large worlds because every frame iterates through ALL objects to determine visibility and render order. The current code shows this pattern in `renderResources`, `renderStructures`, `renderDrops`—each loops through all entities of that type every frame.

**Why it happens:**
Simple implementations use O(n) loops per entity type per frame. With 1000+ objects, this means 4000+ iterations per frame (terrain + resources + structures + drops). Without spatial indexing, this grows linearly with world size.

**How to avoid:**
1. **Spatial indexing:** Implement a spatial hash or quadtree for objects
2. **View culling:** Only iterate objects within camera view + margin
3. **Dirty tracking:** Only re-sort when objects move
4. **Incremental updates:** Update only changed objects, not entire world

```typescript
// Current (inefficient):
for (const resource of snapshot.resources) { // All resources, every frame
  if (!isVisible(resource)) continue;
  // render...
}

// Better: spatial index query
const visibleObjects = this.spatialIndex.query(cameraBounds);
for (const obj of visibleObjects) { // Only visible objects
  // render...
}
```

**Warning signs:**
- Frame rate drops as world grows beyond initial size
- Profile shows significant time in render loops
- Memory usage spikes during render phase
- Camera movement becomes choppy

**Phase to address:**
VIS-01 (斜视角瓷砖渲染) — Foundation phase must establish efficient spatial structures before layering depth sorting on top.

---

### Pitfall 6: Inconsistent Coordinate Systems

**What goes wrong:**
Confusion between tile coordinates, world coordinates, screen coordinates, and depth-sort coordinates leads to subtle bugs where objects render at wrong positions or sorting breaks when combining different coordinate types.

**Why it happens:**
The codebase currently mixes:
- Tile coordinates (x, y as integers)
- World coordinates (x * TILE_SIZE)
- Depth values (arbitrary integers like 0, 2, 3, 4, 7)
- Render positions (world coords + offsets)

When implementing pseudo-3D, this becomes worse as height offsets get added. A tree at tile (5, 5) with height 32px might need to sort by world Y + height, but collision uses tile Y.

**How to avoid:**
1. **Type safety:** Use branded types to distinguish coordinate spaces
2. **Consistent origin:** Always use bottom-center for depth sorting
3. **Clear conversion functions:** Explicit `toWorld()`, `toScreen()`, `toDepth()` methods
4. **Unit tests:** Verify coordinate conversions at boundaries

```typescript
// Type-safe coordinate system
type TileCoord = { __brand: 'tile'; x: number; y: number };
type WorldCoord = { __brand: 'world'; x: number; y: number };
type DepthValue = { __brand: 'depth'; value: number };

function tileToWorld(tile: TileCoord): WorldCoord {
  return { 
    __brand: 'world', 
    x: tile.x * TILE_SIZE, 
    y: tile.y * TILE_SIZE 
  };
}

function worldToDepth(world: WorldCoord, height: number): DepthValue {
  return { 
    __brand: 'depth', 
    value: world.y + height 
  };
}
```

**Warning signs:**
- Objects render correctly at some positions but offset at others
- Sorting breaks near world boundaries
- Camera following feels "off"
- Difficult to reason about "where" a bug occurs

**Phase to address:**
VIS-01 (斜视角瓷砖渲染) — Establish coordinate system discipline in the foundation phase.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Fixed depth layers (0, 2, 3, 4...) | Simple to implement, works for small scenes | Breaks when objects need inter-layer ordering; requires constant tuning | Never—this is what we're replacing |
| Per-frame full world iteration | No need for spatial index maintenance | O(n) performance that degrades with world size | Only during initial prototype phase |
| Hardcoded sprite origins | Quick to set up per-object type | Inconsistent alignment, hard to maintain | Never—define origins in visual pack metadata |
| Alpha blending for all occluding objects | Visually correct | Severe performance hit with many objects | Use only for player-occlusion, with distance limits |
| Multiple containers per object type | Logical organization | Prevents proper depth sorting across types | Never—use single sorted container |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Phaser 3 Depth Component | Using `setDepth()` with arbitrary values for pseudo-3D | Use depth only for UI overlay level; implement custom Y-sort for world objects |
| Phaser Containers | Putting each object type in separate containers | Use single container with all objects sorted by Y+height |
| Sprite Origins | Setting origin to center for all sprites | Set origin to bottom (foot point) for all world objects |
| Camera Follow | Following logical position directly | Follow render position that accounts for height offsets |
| Mod System | Requiring all mods to update for pseudo-3D | Provide backward compatibility layer with opt-in upgrades |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Sorting every frame | High CPU in profiler, frame drops during movement | Sort only when objects move; use spatial index | Breaks at ~500+ moving objects |
| Alpha blending on many objects | GPU bottlenecks, fill-rate limited | Limit to 3-5 objects max; use distance culling | Breaks with dense forests |
| Creating/destroying sprites per frame | GC pauses, memory churn | Object pool all sprites | Breaks with frequent visibility changes |
| Naive visibility checks | Iterating all objects for culling | Use spatial index query for camera bounds | Breaks at ~1000+ world objects |
| Deep call stacks in render loop | Stack overflow with large worlds | Iterate flat arrays, avoid recursion | Breaks with very large (>10000) object counts |

---

## Security Mistakes

This domain (visual rendering) has limited security concerns, but consider:

| Mistake | Risk | Prevention |
|---------|------|------------|
| Loading mod textures without validation | Malicious textures could cause GPU driver crashes | Validate image dimensions, format, and size |
| Infinite loops in custom render code | Mods could freeze the game | Implement frame time limits for mod render callbacks |
| Excessive memory allocation in visual packs | Mods could cause OOM | Set texture atlas size limits |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Inconsistent occlusion behavior | Confusion about where player is relative to objects | Apply transparency consistently based on clear rules (player Y vs object Y+height) |
| Objects popping in/out at screen edge | Jarring visual artifacts | Use generous margin (3-5 tiles) for visibility culling |
| Occlusion making game unplayable | Can't see character behind trees | Use outline shader, not just transparency; allow players to toggle effect |
| Height confusion | Can't tell which objects are "tall" | Visual distinction in sprites; consider height indicator in UI |
| Camera obscured by tall objects | Can't see where you're going | Smart camera that adjusts zoom/position when player is occluded |

---

## "Looks Done But Isn't" Checklist

- [ ] **Depth Sorting:** Sorts correctly when player walks around a single tree — verify all 4 sides
- [ ] **Multiple Objects:** Sorts correctly when 3+ objects overlap at same general Y position
- [ ] **Moving Objects:** Sorting updates correctly when objects move (player walking, animated objects)
- [ ] **Object Creation:** Newly spawned objects (drops, construction) appear at correct depth immediately
- [ ] **Camera Bounds:** Objects at extreme camera positions (corners) still sort correctly
- [ ] **Performance:** Maintains 60fps with 500+ visible objects on target hardware
- [ ] **Mod Compatibility:** All existing core mods render without visual glitches
- [ ] **Save/Load:** World state saves and loads with correct visual positions
- [ ] **Edge Cases:** Very tall objects (2+ tiles height) sort correctly with short objects
- [ ] **Visual Pack Override:** Custom visual packs can override height/sorting behavior

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Wrong sorting algorithm | HIGH | Rewrite render pipeline; potentially break mod compatibility |
| Height misalignment | MEDIUM | Audit all sprite origins; update mod metadata; may need asset fixes |
| Performance issues | MEDIUM-HIGH | Implement spatial indexing; add object pooling; may require architectural changes |
| Broken mod compatibility | MEDIUM | Add backward compatibility layer; document migration path |
| Coordinate system confusion | MEDIUM | Add type safety; refactor conversion functions; extensive testing |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Incorrect Depth Sorting | VIS-03 | Unit tests with overlapping objects; visual regression tests |
| Height Property Misalignment | VIS-02 | Sprite alignment tests with reference images |
| Dynamic Occlusion Performance | VIS-04 | Performance benchmarks with 500+ objects; profiling |
| Mod Compatibility Breakage | VIS-05 | Test suite with all core mods; visual diff comparison |
| Over-Rendering | VIS-01 | Profiling with large worlds; scalability tests |
| Inconsistent Coordinates | VIS-01 | Type system enforcement; unit tests for conversions |

---

## Sources

- Current codebase analysis (`gameViewport.ts`)
- Phaser 3 Rex Notes documentation (rexrainbow.github.io)
- Gamasutra isometric rendering articles (archived research)
- Stardew Valley technical postmortems
- 2D depth sorting algorithm literature (painter's algorithm variations)
- Mod system architecture review (RFC-0016 context)

---
*Pitfalls research for: Pseudo-3D Visual Implementation in Gamedemo Engine*
*Researched: 2026-03-31*
