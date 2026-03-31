# Phase 2: Core Rendering - Context

**Gathered:** 2026-03-31  
**Phase 1:** Complete ✓  
**Status:** Ready for planning

## Phase Boundary

将固定层级渲染替换为基于 Y+height 的动态深度排序，实现正确的伪3D空间遮挡关系。

**Scope:**
- Pseudo3DDepthSorter with Y+height algorithm
- Single-container rendering pipeline (merge 5 Maps into 1)
- Depth calculation: depth = y + renderHeight
- Basic shadow rendering (simple ellipse per height class)
- Optimized updates with dirty flag
- Integration with existing gameViewport.ts

**Depends on:**
- Phase 1 (COORD-01 for coordinate types, HEIGHT-01 for height data)

**Not in this phase:**
- Dynamic occlusion effects (Phase 3)
- Split-layer objects (Phase 3)
- Performance benchmarks (Phase 3)
- Mod API migration (Phase 4)

## Implementation Decisions

### D-01: Depth Calculation Strategy — OPTION A
- **Formula:** `depth = y + renderHeight` (full height)
- **Rationale:** Object's top determines occlusion — tall objects properly block smaller ones behind
- **Same-depth handling:** Sort by type priority (terrain < resource < structure < player), then creation order
- **Type priority values:**
  - terrain: 0.0
  - resource: 1.0
  - structure: 2.0
  - player: 3.0
- **Final depth:** `(y + renderHeight) * 1000 + typePriority` — keeps objects sorted by position first, type second

### D-02: Container Merge Strategy — OPTION B
- **Approach:** Merge 5 separate Maps into single `entitySprites` Map
- **Key:** entity ID (string) — same as SpatialIndex from Phase 1
- **Value:** `{ sprite, type, depth, needsUpdate }`
- **Rationale:** 
  - Aligns with SpatialIndex design (unified entity ID space)
  - Simplifies rendering loop (single iteration)
  - Required for proper depth sorting across types
- **Migration:** Convert existing 5 Maps during first render cycle

### D-03: Shadow Implementation — OPTION A
- **Approach:** Simple ellipse shadow for all height classes
- **Style:** Similar to existing playerShadow (black ellipse, alpha 0.4)
- **Size per height class:**
  - flat: no shadow
  - low: 8x3 px ellipse
  - medium: 12x5 px ellipse
  - tall: 16x6 px ellipse with slight offset
- **Implementation:** Add shadow sprite to each entity object, positioned at base

### D-04: Update Optimization — OPTION A (Dirty Flag)
- **Approach:** Track `needsDepthUpdate` flag per entity
- **When to update depth:**
  - Flag is true (position changed)
  - First render (initial depth calculation)
  - Entity added/removed
- **Static optimization:** Skip depth recalculation for entities that haven't moved
- **Rationale:** Survival/building games have mostly static objects (terrain, buildings, trees)

### D-05: Integration Strategy
- **Backward compatibility:** Maintain existing `render()` method signature
- **Incremental adoption:** New depth sorter coexists with old layer system during transition
- **Mod API stability:** No changes to public mod API — purely internal rendering change
- **Fallback:** If depth sorting fails, fall back to fixed layers with console warning

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core Types & Architecture
- `packages/engine-core/src/coordinates.ts` — TileCoord, WorldCoord, DepthValue types
- `packages/engine-core/src/spatialIndex.ts` — SpatialIndex (entity ID pattern reference)
- `packages/mod-api/src/visualPack.ts` — HeightClassification, VisualPackMetadata
- `packages/engine-phaser/src/gameViewport.ts` — Current rendering implementation (lines 85-96 render flow)

### Current Rendering System
- **Fixed layers:** terrain(0), resources/planted(2), structures(3), drops(4), playerShadow(5), player(7), path(8), target(9), cursor(10)
- **5 separate Maps:** terrainSprites, resourceSprites, structureSprites, dropSprites, plantedSprites
- **Render flow:** `render() → renderTerrain() → renderResources() → renderPlanted() → renderStructures() → renderDrops() → renderPlayer()`

### Phase 1 Artifacts
- `.planning/phases/01-foundation/01-01-SUMMARY.md` — Coordinate types
- `.planning/phases/01-foundation/01-02-SUMMARY.md` — Height registry
- `.planning/phases/01-foundation/01-03-SUMMARY.md` — Spatial index & camera

## Code Context

### Reusable Patterns from Phase 1
- **SpatialIndex** — Uses entity ID as key, provides query methods
- **VisualPackRegistry** — Height data access via `getVisualPack(contentId)`
- **CoordinateConverters** — `worldToDepth()` function ready to use
- **ANCHOR_BOTTOM_CENTER** — All sprites now use (0.5, 1.0) origin

### Integration Points
- **ContentRegistryBuilder.getVisualPack()** — Access height metadata
- **RuntimeSessionState** — Contains all entity positions (resources, structures, droppedItems)
- **GameViewport.render()** — Entry point for rendering

### Current Depth Values (to be replaced)
```typescript
.setDepth(0)   // terrain
.setDepth(2)   // resources, planted
.setDepth(3)   // structures
.setDepth(4)   // drops
.setDepth(5)   // playerShadow
.setDepth(7)   // player
.setDepth(8)   // path markers
.setDepth(9)   // move target
.setDepth(10)  // cursor
```

## Specific Ideas

### Depth Sorter Architecture
```typescript
class Pseudo3DDepthSorter {
  private entitySprites = new Map<string, EntitySprite>();
  
  // Calculate depth: y + renderHeight + typePriority
  calculateDepth(entity: Entity, visualPack: VisualPackMetadata): number {
    const baseDepth = entity.y + visualPack.renderHeight;
    const typePriority = this.getTypePriority(entity.type); // 0-3
    return baseDepth * 1000 + typePriority;
  }
  
  // Only update if needsDepthUpdate flag is set
  updateDepths(entities: Entity[]): void {
    for (const entity of entities) {
      if (entity.needsDepthUpdate || !entity.lastCalculatedDepth) {
        const depth = this.calculateDepth(entity, visualPack);
        entity.sprite.setDepth(depth);
        entity.lastCalculatedDepth = depth;
        entity.needsDepthUpdate = false;
      }
    }
  }
  
  // Sort and render
  renderSorted(): void {
    const sorted = [...this.entitySprites.values()]
      .sort((a, b) => a.sprite.depth - b.sprite.depth);
    
    for (const { sprite } of sorted) {
      // Phaser renders in add order, depth controls layering
      // No explicit render call needed — depth handles it
    }
  }
}
```

### Shadow Rendering
```typescript
interface EntityShadow {
  sprite: Phaser.GameObjects.Ellipse;
  size: { width: number; height: number };
}

function createShadow(
  scene: Phaser.Scene,
  heightClass: HeightClassification
): Phaser.GameObjects.Ellipse | null {
  const size = SHADOW_SIZES[heightClass];
  if (!size) return null; // flat has no shadow
  
  return scene.add.ellipse(0, 0, size.width, size.height, 0x000000, 0.4)
    .setDepth(entityDepth - 1); // Shadow just below object
}
```

### Migration Strategy
1. **Step 1:** Create Pseudo3DDepthSorter class alongside existing code
2. **Step 2:** Add entitySprites Map, populate from existing 5 Maps
3. **Step 3:** Calculate dynamic depths, compare with fixed depths (debug mode)
4. **Step 4:** Remove fixed depth calls once verified
5. **Step 5:** Deprecate separate Maps in favor of unified entitySprites

## Deferred Ideas

### Phase 3 (Occlusion & Polish)
- Split-layer objects (trunk vs canopy separately)
- Alpha fade when player behind objects
- Frame skipping for occlusion checks
- Performance benchmarks

### Phase 4 (Mod Integration)
- Visual Pack versioning for opt-in features
- Backward compatibility layer
- Migration guide for mod authors

### Future Enhancements
- Shadow direction based on time of day
- Dynamic shadow casting (complex)
- Normal map lighting (out of scope)

## Implementation Notes for Downstream Agents

### Critical Success Factors
1. **Depth calculation must be deterministic** — Same inputs always produce same depth
2. **Type priority prevents z-fighting** — Critical for objects at same position
3. **Dirty flag optimization is essential** — Without it, 500+ objects will cause lag
4. **Shadows must stay below objects** — Use `depth - 1` or `depth - 0.5`

### Risk Mitigation
- **Risk:** Merging Maps breaks existing visibility logic  
  **Mitigation:** Maintain visibility tracking during migration
- **Risk:** Dynamic depth causes flickering  
  **Mitigation:** Ensure stable sorting (type priority as tiebreaker)
- **Risk:** Shadow sprites leak memory  
  **Mitigation:** Properly destroy shadow when entity removed

### Testing Strategy
- Place tree behind player → tree should render behind player
- Place player behind tree → tree should render in front of player
- Multiple objects at same Y → type priority determines order
- Static scene → depth calculations should only happen once

---

*Phase: 02-core-rendering*  
*Depends on: Phase 1 (Foundation)*  
*Context gathered: 2026-03-31*  
*Next: `/gsd-plan-phase 2` to create detailed implementation plans*
