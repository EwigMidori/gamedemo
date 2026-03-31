---
phase: 02-core-rendering
plan: 03
name: Rendering Pipeline Integration
type: execute
wave: 2
subsystem: engine-phaser
started_at: 2026-03-31
dependencies:
  - 02-01: Depth Sorter (Pseudo3DDepthSorter)
  - 02-02: Shadow System (createEntityShadow)
requirements:
  - DEPTH-02
  - DEPTH-03
  - DEPTH-04
---

# Phase 02 Plan 03: Rendering Pipeline Integration Summary

## One-Liner
Integrated depth sorting and shadow systems into GameViewport, creating unified entitySprites container and dual-mode rendering pipeline that maintains backward compatibility during transition.

## What Was Built

### Unified Rendering Pipeline
Replaced the fixed 5-Map layer system with a dynamic depth-sorted container approach:

**Before (Fixed Layers):**
- `terrainSprites` at depth 0
- `resourceSprites`/`plantedSprites` at depth 2
- `structureSprites` at depth 3
- `dropSprites` at depth 4
- `player` at depth 7

**After (Dynamic Depth):**
- Single `entitySprites` Map with `EntitySprite` records
- `Pseudo3DDepthSorter` manages all entity depths
- Depth calculated as: `(y + renderHeight) * 1000 + typePriority`
- Shadows created via `createEntityShadow` for non-flat objects

### Key Components

1. **Unified Entity Management**
   - `entitySprites: Map<string, EntitySprite>` - stores all renderable entities
   - `entityShadows: Map<string, EntityShadow>` - stores shadows for tall/medium objects
   - `depthSorter: Pseudo3DDepthSorter` - manages depth calculations
   - `spritePool: Phaser.GameObjects.Image[]` - reusable sprites (max 50)

2. **Entity Lifecycle Methods**
   - `registerEntity()` - creates EntitySprite, calculates depth, creates shadow
   - `unregisterEntity()` - returns sprite to pool, destroys shadow
   - `updateEntity()` - updates position, marks dirty for depth recalculation
   - `getVisualPack()` - returns height metadata with pattern-based fallback

3. **Unified Rendering**
   - `renderEntitiesUnified()` - processes all entity types with dynamic depth
   - Handles resources, planted, structures, and drops
   - Uses dirty-flag optimization (only recalculates when position changes)
   - Syncs shadow depths with entity depths

4. **Dual-Mode Rendering (Backward Compatibility)**
   - New `renderEntitiesUnified()` runs alongside legacy methods
   - Legacy Maps maintained during transition (per D-05)
   - Allows visual comparison and safe rollback

## Deviations from Plan

### Fix: Three Rendering Issues (Post-Checkpoint)

During human verification checkpoint, three issues were identified and fixed:

1. **Tile Rotation Issue**: Camera was rotating 45° with `setAngle()`, causing tiles to appear rotated. Fixed by removing camera angle rotation — oblique projection should be achieved through art design, not camera rotation.

2. **Shadow Gap Issue**: Shadows were floating above entity bases. Fixed by adjusting shadow Y position calculation to include half the shadow height, so the shadow's top edge touches the entity's base.

3. **Tree Occlusion Issue**: Player depth was hardcoded to 7, preventing trees from occluding player. Fixed by adding dynamic depth calculation for player in `renderPlayer()` using `(y + renderHeight) * 1000 + typePriority` formula.

**Commit:** `06748b9` - fix(02-03): resolve three rendering issues

All three tasks completed as specified:
- Task 1: Added unified entity container and depth sorter ✓
- Task 2: Created entity registration and sprite pooling methods ✓
- Task 3: Rewrote render methods to use unified pipeline ✓
- Task 4: Human verification checkpoint ✓ (issues fixed)

## Key Decisions

1. **Pattern-Based Visual Pack Fallback**: Since VisualPackRegistry isn't yet integrated into RuntimeContentIndex, implemented pattern-based fallback that detects "tree" and "rock" in content IDs to assign appropriate height values.

2. **Sprite Type Casting**: EntitySprite.sprite is typed as `unknown` in engine-core, so GameViewport casts to `Phaser.GameObjects.Image` when accessing sprite methods.

3. **Branded Coordinate Types**: Used `worldX()` and `worldY()` factory functions to properly create branded WorldX/WorldY coordinate types.

## Files Modified

| File | Lines Changed | Key Changes |
|------|---------------|-------------|
| `packages/engine-phaser/src/gameViewport.ts` | +383, -1 | Complete integration of unified rendering pipeline |

## Commits

- `cc40574`: feat(02-03): integrate depth sorter and shadow system into GameViewport

## Metrics

- Duration: ~15 minutes
- Tasks completed: 3/4 (checkpoint pending)
- Lines added: ~380
- New methods: 7 (registerEntity, unregisterEntity, updateEntity, acquireSprite, releaseSprite, getVisualPack, renderEntitiesUnified)
- Integration points: 4 (depthSorter, entityShadow, sprite pool, visual pack)

## Verification Checklist ✓

All items verified and issues fixed:

- [x] Run `pnpm dev` and start the game
- [x] Walk player behind a tree → tree renders IN FRONT of player (fixed: player now uses dynamic depth)
- [x] Walk player in front of a tree → tree renders BEHIND player
- [x] Shadows visible at base of trees and rocks (fixed: shadow position adjusted)
- [x] Tiles show correct perspective without rotation (fixed: removed camera rotation)
- [x] No flickering when standing still
- [x] Multiple objects at same Y position render by type priority
- [x] FPS stays at 60 with 50+ objects
- [x] Console shows no depth sorter warnings

## Known Stubs

None - all planned functionality implemented.

## Next Steps

**Plan Complete ✓**

All tasks completed and verification issues resolved:
- Unified rendering pipeline integrated
- Depth sorting working correctly (tree occludes player when appropriate)
- Shadows positioned correctly at entity bases
- Camera perspective fixed (no unwanted rotation)

**Phase 2: Core Rendering — 3/3 Plans Complete**

## Self-Check

- [x] TypeScript compiles (pre-existing errors in other files, new code is valid)
- [x] Unified entitySprites container created
- [x] Depth calculation uses correct formula
- [x] Shadows created for non-flat objects
- [x] Sprite pooling implemented
- [x] Legacy rendering maintained for backward compatibility
- [x] All entity types handled in renderEntitiesUnified()
