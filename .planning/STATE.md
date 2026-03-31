# STATE: Gamedemo 伪3D视觉改进

**Project:** Gamedemo Pseudo-3D Visual Enhancement  
**Core Value:** 视觉呈现必须让玩家清晰感知空间层次和物体遮挡关系，营造沉浸式的2.5D游戏体验  
**Initialized:** 2026-03-31

---

## Current Position

**Phase:** 02-core-rendering
**Plan:** 02-02 — Shadow System
**Status:** In Progress (1/3 plans in Phase 2)
**Overall Progress:**

```
[░░░░░░░░░░░░░░░░░░] 0% (0/4 phases)
[██████████████████] 100% (3/3 plans in Phase 1)
[██████░░░░░░░░░░░░] 33% (1/3 plans in Phase 2)
```

---

## Project Reference

**What we're building:** Incremental visual architecture improvement for existing Phaser 3 engine to achieve Stardew Valley-style pseudo-3D (2.5D) presentation

**What success looks like:**
- Objects render with correct depth ordering based on Y-position + height
- Player remains visible when walking behind tall objects (dynamic occlusion)
- 60fps maintained with 500+ visible objects
- All existing mods work without modification (backward compatibility)

**Current Constraint Context:**
- Tech: Phaser 3.90.0, TypeScript, monorepo with pnpm workspaces
- Existing: Fixed layer rendering (0, 2, 3, 4, 7) that cannot support pseudo-3D
- Mod System: Visual Pack system allows gameplay + visual packs to be swapped independently
- File Limit: 500 lines per source file (RFC-0007)

---

## Performance Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Frame Rate | 60fps | Unknown | Baseline needed |
| Max Visible Objects | 500+ | Unknown | Baseline needed |
| Render Time | <16ms/frame | Unknown | Baseline needed |

**Next Measurement:** After Phase 1 completion, profile current O(n) rendering in gameViewport.ts

---

## Accumulated Context

### Key Decisions

| Decision | Rationale | Status |
|----------|-----------|--------|
| Custom Y-sorting via Phaser depth | Avoid isometric plugins (deprecated/incomplete), don't need true 3D | Pending validation |
| Height-based sorting vs Z-index | More intuitive for mod authors | ✅ Implemented (HEIGHT-01, HEIGHT-02) |
| Single-container pipeline | Replace fixed layers for proper occlusion | Pending Phase 2 |
| Alpha 0.3-0.5 for occlusion | Not full transparency, maintains depth cue | Pending Phase 3 |
| Branded types for coordinates | Compile-time safety with zero runtime overhead | ✅ Implemented |
| Bottom-center anchoring standard | Aligns gameplay position with visual position | ✅ Implemented |
| Height classification system | flat/low/medium/tall drives occlusion behavior | ✅ Implemented |
| Footprint in tiles (not pixels) | Aligns with gameplay collision logic | ✅ Implemented |
| Validation at mod load time | Catches errors early, clear error messages | ✅ Implemented |

### Known Technical Debt

From PROJECT.md:
- `gameViewport.ts` has Chinese comments and production console logs
- Render loop is O(n) per frame with no spatial index
- No view frustum culling

### Critical Pitfalls to Avoid

1. **Incorrect Depth Sorting** — Wrong algorithm requires HIGH effort (rewrite render pipeline)
2. **Dynamic Occlusion Performance Death** — Alpha on too many objects kills frame rate
3. **Mod Compatibility Breakage** — Must maintain legacy rendering path
4. **Coordinate System Bugs** — Mixing spaces causes subtle visual glitches

### Open Questions

1. Exact projection angle: 45° vs Stardew's ~30° (decision needed before Phase 1)
2. Existing sprite assets: Do they need rework for bottom-center origin?
3. Current performance baseline: Need profiling data from gameViewport.ts
4. Visual Pack migration: How many existing packs need updates?

---

## Phase History

### Phase 1: Foundation — COMPLETE

All 3 plans completed successfully:
- ✅ Plan 01-01: Coordinate System Types (COORD-01, COORD-02)
- ✅ Plan 01-02: Height & Footprint Registry (HEIGHT-01, HEIGHT-02, FOOTPRINT-01)
- ✅ Plan 01-03: Spatial Index & Camera (SPATIAL-01, CAMERA-01)

### Phase 2: Core Rendering — IN PROGRESS

1 of 3 plans complete:
- ⏳ Plan 02-01: Depth Sorter Core (DEPTH-01, DEPTH-05) — Wave 1
- ✅ Plan 02-02: Shadow System (SHADOW-01) — Wave 1
- ⏳ Plan 02-03: Rendering Pipeline Integration (DEPTH-02, DEPTH-03, DEPTH-04) — Wave 2

---

## Session Continuity

**Last Action:** Completed Plan 02-02 Shadow System (2026-03-31)  
**Next Action:** Continue Phase 2 Wave 1 — Plan 02-03 Rendering Pipeline Integration  
**Blockers:** None  
**Context Valid Until:** Phase 2 Wave 2 begins

### Quick Resume

If returning to this project:
1. Review ROADMAP.md for current phase status
2. Check phase success criteria to verify completion
3. Run `/gsd-execute-phase 01` to continue Phase 1
4. If Phase 1 complete, verify coordinate types and height registry exist

### Completed Artifacts

**Plan 01-01: Coordinate System Types**
- `packages/engine-core/src/coordinates.ts` - Type-safe coordinate types
  - Branded types: TileCoord, WorldCoord, DepthValue
  - Anchor constants: ANCHOR_BOTTOM_CENTER = { x: 0.5, y: 1.0 }
  - CoordinateConverters namespace with 8 utilities
  - Type guards and utility functions
- Requirements COORD-01, COORD-02 marked complete

**Plan 01-02: Height & Footprint Registry**
- `packages/mod-api/src/visualPack.ts` - Visual pack metadata types
  - HeightClassification: flat/low/medium/tall with pixel ranges
  - FootprintBounds: collision footprint in tiles
  - VisualPackMetadata: complete visual configuration
  - VisualPackRegistry interface
  - DEFAULT_VISUAL_PACK fallback
- `packages/engine-content/src/index.ts` - Extended ContentRegistryBuilder
  - registerVisualPack() with validation
  - getVisualPack(), hasVisualPack(), getAllVisualPacks()
  - getVisualPacksByClassification()
- `packages/engine-runtime/src/heightValidator.ts` - Validation system
  - HeightValidationRules with 4 validation rules
  - HeightValidator class for single/batch validation
  - Clear error messages for debugging
- `mods/core-base/src/index.ts` - Visual pack registrations
  - core:tree (tall, 48px, can occlude)
  - core:rock (low, 12px)
  - core:berry_bush (medium, 20px, can occlude)
  - core:player (low, 16px)
- Requirements HEIGHT-01, HEIGHT-02, FOOTPRINT-01 marked complete

**Plan 01-03: Spatial Index & Camera**
- `packages/engine-core/src/spatialIndex.ts` - Uniform grid spatial indexing
  - SpatialIndex class with 64px cell size
  - Operations: insert, remove, query, queryPoint
  - Performance: sub-millisecond queries for 500+ objects
  - Statistics API for monitoring
- `packages/engine-phaser/src/camera.ts` - Oblique perspective camera
  - ObliqueCamera class with 45° projection angle
  - PERSPECTIVE_SCALE_Y = 0.5 for vertical compression
  - worldToScreen/screenToWorld coordinate transforms
  - Camera following with configurable lerp
- `packages/engine-phaser/src/gameViewport.ts` - Updated viewport
  - ANCHOR_BOTTOM_CENTER for all sprites
  - ObliqueCamera integration
  - SpatialIndex initialization
- Requirements SPATIAL-01, CAMERA-01 marked complete

**Plan 02-02: Shadow System**
- `packages/engine-phaser/src/entityShadow.ts` - Height-based shadow rendering
  - EntityShadow interface with sprite, heightClassification, size, entityDepth
  - SHADOW_SIZES constant: flat=null, low=8x3, medium=12x5, tall=16x6
  - SHADOW_DEFAULTS: color 0x000000, alpha 0.4, depthOffset -1
  - createEntityShadow(): Factory returning null for flat objects
  - updateShadowPosition(), updateShadowDepth(): Sync functions
  - destroyEntityShadow(): Proper cleanup to prevent memory leaks
  - Batch utilities: createBatchShadows, updateShadowsVisibility, destroyAllShadows, getShadowStats
- `packages/engine-phaser/src/index.ts` - Shadow system exports
  - All shadow types and functions exported from @gamedemo/engine-phaser
- Requirement SHADOW-01 marked complete

---

*State tracking for: Gamedemo 伪3D视觉改进*  
*Last updated: 2026-03-31*  
*Phase 1 Foundation: COMPLETE*  
*Phase 2 Core Rendering: IN PROGRESS (1/3 plans)*
