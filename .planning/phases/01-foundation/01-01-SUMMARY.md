---
phase: 01-foundation
plan: 01
subsystem: engine-core
tags: [coordinates, types, pseudo-3d, branded-types]
requirements:
  - COORD-01
  - COORD-02
tech-stack:
  added:
    - Branded type pattern for compile-time coordinate safety
    - Coordinate conversion utilities namespace
  patterns:
    - Type guards for runtime validation
    - Immutable coordinate interfaces
key-files:
  created:
    - packages/engine-core/src/coordinates.ts (407 lines)
  modified:
    - packages/engine-core/src/index.ts (added coordinate exports)
decisions:
  - "Use branded types (number & { __brand: 'x' }) for TileX/WorldX distinction"
  - "Standardize ANCHOR_BOTTOM_CENTER = { x: 0.5, y: 1.0 } for pseudo-3D sprites"
  - "Include heightOffset in worldToDepth for tall objects support"
  - "DepthValue normalized to 0-1 range for consistent sorting"
metrics:
  duration: 15m
  completed-date: 2026-03-31
  lines-added: 455
  lines-modified: 48
---

# Phase 01 Plan 01: Coordinate System Types Summary

## Overview

Type-safe coordinate systems that prevent mixing tile and world coordinate spaces, with standardized bottom-center sprite anchoring for pseudo-3D rendering.

## What Was Built

### Coordinate Types (packages/engine-core/src/coordinates.ts)

**Branded Types for Compile-Time Safety:**
- `TileX`, `TileY` - Grid-based integer coordinates
- `TileCoord` - Combined tile position interface
- `WorldX`, `WorldY` - Pixel-based float coordinates  
- `WorldCoord` - Combined world position interface
- `DepthValue` - Normalized depth (0-1) for pseudo-3D sorting

**Anchor Points:**
- `ANCHOR_BOTTOM_CENTER: { x: 0.5, y: 1.0 }` - Standard for pseudo-3D sprites
- `ANCHOR_CENTER: { x: 0.5, y: 0.5 }` - Traditional sprites
- `ANCHOR_TOP_LEFT: { x: 0, y: 0 }` - UI elements
- `ANCHOR_BOTTOM_LEFT: { x: 0, y: 1 }` - Ground-aligned UI

**Factory Functions:**
- `tileX()`, `tileY()`, `worldX()`, `worldY()` - Create branded values
- `tileCoord(x, y)`, `worldCoord(x, y)` - Create coordinate objects
- `depthValue(value)` - Validated depth creation (0-1 range)
- `createTileSize(value)` - Tile size with positive validation

**CoordinateConverters Namespace:**
- `tileToWorld(tile, tileSize, options?)` - Tile to world with optional centering
- `worldToTile(world, tileSize)` - World to tile (floor)
- `worldToDepth(world, heightOffset, bounds)` - Calculate normalized depth
- `applyAnchorOffset(world, height, anchor)` - Adjust for sprite anchor
- `worldDistance(a, b)` - Euclidean distance
- `tileManhattanDistance(a, b)` - Grid distance
- `tileEquals(a, b)`, `worldEquals(a, b)` - Equality checks
- `worldToTileCenter(world, tileSize)` - Snap to tile center

**Utilities:**
- `isTileCoord()`, `isWorldCoord()` - Type guards
- `cloneTileCoord()`, `cloneWorldCoord()` - Immutable cloning
- `tileCoordAdd()`, `worldCoordAdd()` - Offset operations

### Exports (packages/engine-core/src/index.ts)

All coordinate types, constants, and utilities are exported via:
- Barrel export: `export * from "./coordinates"`
- Explicit re-exports for documentation (48 lines added)

## Verification

- ✓ TypeScript strict mode compiles without errors
- ✓ Types can be imported: `import type { TileCoord, WorldCoord, DepthValue } from "@gamedemo/engine-core"`
- ✓ Branded types prevent mixing: `const tile: TileX = 5; const world: WorldX = tile; // Type error!`
- ✓ `ANCHOR_BOTTOM_CENTER` constant available at `{ x: 0.5, y: 1.0 }`

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | 2a6ec63 | feat(01-foundation-01): create coordinate type definitions |
| 3 | 0adde3d | feat(01-foundation-01): export coordinate types from engine-core |

Note: Task 2 (CoordinateConverters) was included in Task 1 commit as the conversion utilities were part of the coordinates.ts file creation.

## Next Steps

This foundation enables:
1. **01-02 Height Metadata** - Use DepthValue for height-based sorting
2. **01-03 Sprite Anchoring** - Apply ANCHOR_BOTTOM_CENTER to renderers
3. **01-04 Depth Calculation** - Implement worldToDepth for sorting pipeline

## Key Design Decisions

1. **Branded types over distinct interfaces**: Using `number & { __brand: 'x' }` provides zero runtime overhead while preventing coordinate space bugs at compile time.

2. **Bottom-center anchoring**: Position (0.5, 1.0) aligns gameplay position (feet) with visual sprite registration point for natural depth sorting.

3. **Height-aware depth**: `worldToDepth` accepts a heightOffset parameter to support tall objects (trees, buildings) that extend upward from their tile position.

4. **Normalized depth range**: 0-1 allows consistent depth sorting regardless of world size, with validation to catch errors early.
