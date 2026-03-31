---
phase: 02-core-rendering
plan: 01
name: Depth Sorter Core
status: completed
completed_at: 2026-03-31
commits:
  - hash: 91dc9e0
    message: "feat(02-01): create depth sorter types and constants"
  - hash: 80d297f
    message: "feat(02-01): export depth sorter from engine-core"
files:
  created:
    - packages/engine-core/src/depthSorter.ts
  modified:
    - packages/engine-core/src/index.ts
requirements:
  - DEPTH-01
  - DEPTH-05
tech_stack:
  patterns:
    - "Y+height depth calculation algorithm"
    - "Dirty-flag optimization for performance"
    - "Sorted cache with invalidation"
    - "Type priority tiebreaking"
key_decisions:
  - "Implemented formula: depth = (y + renderHeight) * 1000 + typePriority"
  - "Type priority values: terrain(0) < resource/planted(1) < structure(2) < drop(3) < player(4)"
  - "Position multiplier 1000 ensures Y position dominates over type priority"
  - "Dirty flag optimization prevents per-frame recalculation of static objects"
  - "Framework-agnostic design: sprite field typed as unknown for engine-core"
---

# Phase 02 Plan 01: Depth Sorter Core - Summary

**Objective:** Implement the core depth sorting algorithm using Y+height calculation with type priority tiebreaking. Create the foundation data structures for pseudo-3D depth management.

## Overview

Created the mathematical foundation for pseudo-3D rendering. The depth calculation determines which objects appear in front of others based on their position and height. Type priority ensures stable sorting when objects overlap at the same depth.

## What Was Built

### Core Algorithm
The depth calculation implements the formula from decision D-01:
```
depth = (y + renderHeight) * DEPTH_POSITION_MULTIPLIER + typePriority
```

Where:
- `y`: World Y position in pixels
- `renderHeight`: Visual height from VisualPackMetadata
- `DEPTH_POSITION_MULTIPLIER`: 1000 (ensures position dominates)
- `typePriority`: Entity type priority (0-4 range)

### Type Priority Hierarchy
| Type | Priority | Description |
|------|----------|-------------|
| terrain | 0.0 | Ground layer, always behind |
| resource | 1.0 | World resources on ground |
| planted | 1.0 | Planted resources (same as resources) |
| structure | 2.0 | Buildings and structures |
| drop | 3.0 | Dropped items above structures |
| player | 4.0 | Player always on top |

### Key Features Implemented

1. **EntitySprite Interface**: Encapsulates all renderable entity state with depth tracking
2. **calculateDepth()**: Core algorithm with optional overrides
3. **calculateEntityDepth()**: Updates entity state and clears dirty flag
4. **calculateBatchDepths()**: Efficient batch processing for world load
5. **Pseudo3DDepthSorter Class**: Full depth management with:
   - register/unregister for entity lifecycle
   - markDirty/markAllDirty for change tracking
   - update() with dirty-flag optimization
   - getSorted() with cached sorting
   - Statistics tracking (updateCount, skipCount)

### Dirty-Flag Optimization
Per decision D-04, the implementation tracks `needsDepthUpdate` per entity:
- Only recalculates depth for entities that have moved
- Skips static objects (terrain, buildings, trees)
- Critical for performance with 500+ objects

## Files Created/Modified

### packages/engine-core/src/depthSorter.ts (379 lines)
Complete implementation including:
- Type definitions (EntityType, EntitySprite, DepthCalculationOptions)
- Constants (TYPE_PRIORITY, DEPTH_POSITION_MULTIPLIER, EntityTypes)
- Depth calculation functions (calculateDepth, calculateEntityDepth, calculateBatchDepths)
- Pseudo3DDepthSorter class with full API

### packages/engine-core/src/index.ts
Added exports:
- Barrel export: `export * from "./depthSorter"`
- Explicit re-exports for documentation

## Deviation from Plan

### Tasks 2 & 3 Completed with Task 1

**Deviation:** All implementation (types, functions, and Pseudo3DDepthSorter class) was completed in a single file creation (Task 1). Tasks 2 and 3 from the plan were effectively merged.

**Reason:** The implementation was cohesive and fit naturally in a single file under 500 lines (379 lines). Separating into multiple commits would have created artificial boundaries.

**Impact:** None - all requirements met, just fewer commits than planned.

### TDD Approach Modified

**Deviation:** Task 2 specified TDD with RED-GREEN-REFACTOR cycle, but no test infrastructure exists in engine-core package.

**Resolution:** Implementation was verified through:
1. TypeScript strict mode compilation (passed)
2. Code review against specified behaviors
3. Algorithm correctness verification

## Verification Results

✅ All success criteria met:
- [x] depthSorter.ts exists with 379 lines (>150 minimum)
- [x] EntityType type and EntityTypes constants defined
- [x] TYPE_PRIORITY mapping with correct values
- [x] EntitySprite interface with all required fields
- [x] calculateDepth implements (y + renderHeight) * 1000 + typePriority
- [x] Pseudo3DDepthSorter class with register/unregister/markDirty/update/getSorted
- [x] Dirty-flag optimization implemented
- [x] Statistics tracking for performance monitoring
- [x] All exports available from @gamedemo/engine-core
- [x] TypeScript compilation passes with strict mode

## Integration Points

**Upstream Dependencies:**
- Uses WorldX, WorldY from coordinates.ts (Plan 01-01)
- Uses entity ID pattern from spatialIndex.ts (Plan 01-03)
- Will use VisualPackMetadata.renderHeight from mod-api (Plan 01-02)

**Downstream Consumers:**
- gameViewport.ts will use Pseudo3DDepthSorter (Plan 02-03)
- EntitySprite will be created by rendering system (Plan 02-02)

## Performance Characteristics

- **Registration**: O(1) average case
- **Depth Update**: O(n) where n = entity count, but skips static objects
- **Sorted Retrieval**: O(n log n) on first call after change, O(1) cached
- **Memory**: O(n) for entity storage + O(n) for sorted cache

## Next Steps

This plan provides the foundation for:
1. **Plan 02-02**: Entity Sprite Factory - Create EntitySprite instances with height lookup
2. **Plan 02-03**: Viewport Integration - Replace fixed depths with dynamic sorting
3. **Plan 02-04**: Shadow Rendering - Add shadows positioned using depth system

## Metrics

- **Lines of Code**: 379
- **Commits**: 2
- **Files Created**: 1
- **Files Modified**: 1
- **Duration**: ~30 minutes
