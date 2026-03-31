---
phase: 02-core-rendering
plan: 02
subsystem: engine-phaser
tags: [shadow, rendering, pseudo-3d, height-classification]
dependency_graph:
  requires:
    - packages/mod-api/src/visualPack.ts (HeightClassification)
    - packages/engine-phaser/src/gameViewport.ts (playerShadow pattern)
  provides:
    - packages/engine-phaser/src/entityShadow.ts (shadow system)
  affects:
    - Plan 02-03 (Rendering Pipeline Integration)
tech_stack:
  added: []
  patterns:
    - Ellipse sprites for performant shadows
    - Batch operations for world loading
    - Depth-relative positioning (entityDepth - 1)
key_files:
  created:
    - packages/engine-phaser/src/entityShadow.ts (277 lines)
  modified:
    - packages/engine-phaser/src/index.ts (added shadow exports)
decisions:
  - D-03 from 02-CONTEXT.md: Simple ellipse shadow per height class (matching playerShadow style)
  - Shadow sizes: flat=null, low=8x3, medium=12x5, tall=16x6+offset
  - Shadow color: 0x000000 with alpha 0.4
  - Shadow depth: entityDepth - 1 (always below entity)
  - Optional shadows (null for flat objects) for memory efficiency
metrics:
  duration: 15 minutes
  completed_date: 2026-03-31
---

# Phase 2 Plan 2: Shadow System Summary

**One-liner:** Height-based ellipse shadow rendering system with size variations per height class and batch management utilities.

## What Was Built

Created a complete shadow system for pseudo-3D rendering that provides visual depth cues through simple ellipse shadows scaled by object height classification.

### Core Components

1. **Shadow Types and Constants** (`packages/engine-phaser/src/entityShadow.ts` lines 1-50)
   - `ShadowSize` interface with width, height, and optional offsetY
   - `SHADOW_SIZES` constant mapping height classifications to dimensions:
     - `flat`: null (no shadow)
     - `low`: 8x3 px ellipse
     - `medium`: 12x5 px ellipse
     - `tall`: 16x6 px ellipse with 2px Y offset
   - `SHADOW_DEFAULTS` with color 0x000000, alpha 0.4, depthOffset -1

2. **Entity Shadow State** (lines 52-68)
   - `EntityShadow` interface tracking sprite, height classification, size, and entity depth
   - `ShadowCreationOptions` for customizing shadow appearance

3. **Shadow Management Functions** (lines 70-153)
   - `createEntityShadow()`: Factory function returning null for flat objects
   - `updateShadowPosition()`: Sync shadow position with entity base
   - `updateShadowDepth()`: Maintain shadow below entity when depth changes
   - `destroyEntityShadow()`: Proper cleanup to prevent memory leaks

4. **Batch Operations** (lines 155-225)
   - `createBatchShadows()`: Efficient bulk shadow creation for world loading
   - `updateShadowsVisibility()`: View frustum culling support
   - `destroyAllShadows()`: Scene cleanup utility
   - `getShadowStats()`: Debug statistics by height classification

### Integration

Shadow system is now exported from `@gamedemo/engine-phaser`:

```typescript
// Available exports
import {
  EntityShadow,
  ShadowSize,
  ShadowCreationOptions,
  BatchShadowConfig,
  SHADOW_SIZES,
  SHADOW_DEFAULTS,
  createEntityShadow,
  updateShadowPosition,
  updateShadowDepth,
  destroyEntityShadow,
  createBatchShadows,
  updateShadowsVisibility,
  destroyAllShadows,
  getShadowStats
} from "@gamedemo/engine-phaser";
```

## Design Decisions

### Simple Ellipse Style
Following decision D-03 from context, shadows use the same style as the existing playerShadow in gameViewport.ts:
- Black ellipse (`0x000000`) with 40% alpha
- No complex shadow mapping or dynamic lighting
- Consistent with game's 2.5D visual style

### Height-Based Sizing
Shadow size correlates with object height to reinforce spatial relationships:
- Larger shadows for taller objects (more prominent presence)
- Small shadows for low objects (rocks, stumps)
- No shadows for flat objects (ground items, terrain)

### Memory Efficiency
Shadows are optional (return null for flat objects) rather than creating invisible sprites. This avoids unnecessary Phaser game objects for the majority of flat terrain and items.

### Depth Management
Shadows always render at `entityDepth - 1`, ensuring they appear below their casting object while maintaining correct occlusion with other world objects.

## Verification

All success criteria from plan were met:

- ✅ `packages/engine-phaser/src/entityShadow.ts` exists with 277 lines
- ✅ `ShadowSize` and `EntityShadow` interfaces defined
- ✅ `SHADOW_SIZES` constant with correct dimensions per height class
- ✅ `SHADOW_DEFAULTS` with color 0x000000, alpha 0.4, depthOffset -1
- ✅ `createEntityShadow` creates ellipse shadows (returns null for flat)
- ✅ `updateShadowPosition` and `updateShadowDepth` for syncing
- ✅ `destroyEntityShadow` for proper cleanup
- ✅ Batch utilities: `createBatchShadows`, `updateShadowsVisibility`, `destroyAllShadows`
- ✅ All exports available from `@gamedemo/engine-phaser`
- ✅ TypeScript compilation passes

## Downstream Impact

This shadow system will be consumed by:
- **Plan 02-03**: Rendering Pipeline Integration — gameViewport.ts will use these utilities for resource, structure, and drop shadows
- **Phase 3**: Dynamic occlusion — shadow visibility will be coordinated with fade effects

## Commits

| Commit | Description |
|--------|-------------|
| `6dabc50` | feat(02-02): add shadow type definitions and constants |
| `f81dc9d` | feat(02-02): export shadow system from engine-phaser |

## Deviations from Plan

**None** — plan executed exactly as written.

All code was written according to the specification:
- Shadow dimensions match D-03 decision exactly
- API signatures follow plan's function signatures
- Batch utilities match specified interfaces
- File structure follows RFC-0007 (277 lines, well under 500 limit)

## Notes for Future Work

1. **Shadow Direction**: Currently static. Future enhancement could add time-of-day shadow angle (Phase 3 deferred ideas).

2. **Shadow Caching**: Batch utilities use simple iteration. If worlds grow to 1000+ objects, consider spatial indexing for shadow culling.

3. **Player Shadow Migration**: The existing `playerShadow` in gameViewport.ts could eventually use this system for consistency.

## Files

```
packages/engine-phaser/src/
├── entityShadow.ts     (NEW - 277 lines)
└── index.ts            (MODIFIED - added shadow exports)
```
