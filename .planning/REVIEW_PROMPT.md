# Code Review Request: Phase 5 & Phase 6 Implementation

## Context
Review the implementation of Phase 5 (Performance Optimization) and Phase 6 (Scalability Fix) for a pseudo-3D game engine using Phaser 3.

## Phase 5: Performance Optimization (3 Plans)

### Plan 05-01: Frustum Culling
**Files:**
- `packages/engine-core/src/frustumCuller.ts` (226 lines)
- `packages/engine-core/src/frustumCuller.test.ts` (311 lines)
- `packages/engine-core/src/spatialIndex.ts` (+28 lines)
- `packages/engine-phaser/src/gameViewport.ts` (+61/-9 lines)

**Key Features:**
- FrustumCuller class with AABB intersection tests
- Configurable 10% margin to prevent popping
- isVisible() for single-point checks
- cull() for batch processing with metrics
- Performance target: <0.1ms for 1000 objects

**Questions to Review:**
1. Is the frustum culling algorithm efficient for 1000+ objects?
2. Does the 10% margin prevent visual popping at screen edges?
3. Are there any edge cases in the AABB intersection tests?
4. Is the integration with GameViewport clean and maintainable?

### Plan 05-02: Render Pipeline + LOD
**Files:**
- `packages/engine-core/src/renderPipeline.ts` (575 lines)
- `packages/engine-core/src/lodManager.ts` (332 lines)
- `packages/engine-core/src/lodManager.test.ts` (341 lines)

**Key Features:**
- 4-stage pipeline: FrustumCull → DepthSort → Occlusion → Render
- LOD with 3 levels: Near (<200px), Medium (200-500px), Far (>500px)
- Hysteresis buffer (20px) to prevent flickering
- Per-stage timing tracking

**LOD Configuration:**
| Level | Distance | Shadows | Animation | Alpha | Scale |
|-------|----------|---------|-----------|-------|-------|
| Near | <200px | ✓ | ✓ | ✓ | 1.0 |
| Medium | 200-500px | ✗ | ✗ | ✓ | 1.0 |
| Far | >500px | ✗ | ✗ | ✗ | 0.5 |

**Questions to Review:**
1. Is the 4-stage pipeline architecture clean and extensible?
2. Are the LOD thresholds appropriate for the game's visual quality?
3. Does the hysteresis prevent flickering effectively?
4. Are there potential performance issues with per-stage timing overhead?

### Plan 05-03: Object Pool + Chunking
**Files:**
- `packages/engine-core/src/objectPool.ts` (395 lines)
- `packages/engine-core/src/chunkManager.ts` (431 lines)
- `packages/engine-phaser/src/gameViewport.ts` (+103/-18 lines)

**Key Features:**
- ObjectPool: 100 initial sprites (500 max), 50 initial shadows (200 max)
- ChunkManager: 64×64 tiles, 5×5 load radius, unload at 8 chunks distance
- Target: >95% hit rate, <2s load time for 1000×1000 world

**Questions to Review:**
1. Are the pool sizes appropriate for the view radius?
2. Is the chunk loading strategy optimal for player movement patterns?
3. Are there memory leaks in the pool expansion logic?
4. Does async chunk loading cause visual pop-in?

## Phase 6: Scalability Fix (Bug Fix)

**Problem:** Performance degrades as player moves away from spawn due to O(n) traversal of ever-growing resource arrays.

**Files:**
- `packages/engine-phaser/src/gameViewport.ts` (~100 lines changed)
- `mods/core-worldgen/src/distantEntityCleanupSystem.ts` (49 lines)

### PERF-09: Resource Frustum Culling
```typescript
// Early-out frustum culling in renderResources()
const entityX = resource.x * tileSize + tileSize * 0.5;
const entityY = (resource.y + 1) * tileSize;
if (!this.frustumCuller.isVisible(entityX, entityY, frustumBounds)) {
  const sprite = this.resourceSprites.get(resource.id);
  if (sprite) sprite.setVisible(false);
  continue;
}
```

### PERF-10: Structure Frustum Culling
- Applied to renderStructures(), renderPlantedResources(), renderDrops()
- calculateFrustumBounds() computed once per frame and shared

### PERF-11: Distant Entity Cleanup
```typescript
// Removes depleted resources >100 tiles from player (5x view frustum buffer)
state.resources = state.resources.filter((resource) => {
  if (!resource.depleted) return true;
  const distanceSq = (resource.x - playerX) ** 2 + (resource.y - playerY) ** 2;
  return distanceSq <= 10000; // 100^2
});
```
- Runs every 300 frames (~5 seconds)
- Keeps active resources and all structures

### PERF-12: World Tiles Optimization
```typescript
// View-based terrain rendering (40 tiles radius)
const viewRadius = 40;
for (const tile of world.tiles) {
  if (tile.x < minX || tile.x > maxX || tile.y < minY || tile.y > maxY) continue;
  if (this.terrainSprites.has(key)) continue;
  // Create sprite
}
```
- cleanupDistantTerrainSprites() destroys sprites >50 tiles away
- Automatically re-creates sprites when returning to cleaned areas

**Questions to Review:**
1. Is 100 tiles the right cleanup distance for resources?
2. Does the 300-frame cleanup interval cause memory spikes?
3. Is viewRadius=40 appropriate for all screen resolutions?
4. Does the terrain cleanup (50 tiles) happen too frequently?
5. Are there race conditions between cleanup and rendering?

## Review Output Format

Please provide:
1. **Overall Assessment:** Pass/Needs Work/Critical Issues
2. **Strengths:** What's implemented well
3. **Concerns:** Potential issues or improvements
4. **Specific Issues:** Line-by-line or file-by-file feedback
5. **Recommendations:** Actionable improvements with priority (High/Medium/Low)

## Code Quality Criteria
- **Correctness:** Does it work as intended?
- **Performance:** Are there obvious bottlenecks?
- **Maintainability:** Is the code readable and well-structured?
- **Testability:** Is it testable? Are tests adequate?
- **Edge Cases:** Are boundary conditions handled?
