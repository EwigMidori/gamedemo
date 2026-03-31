# ROADMAP: Gamedemo 伪3D视觉改进

**Project:** Gamedemo Pseudo-3D Visual Enhancement  
**Created:** 2026-03-31  
**Mode:** YOLO (proceed without approval gates)  
**Granularity:** Coarse (4 phases)

## Phases

- [ ] **Phase 1: Foundation** — Establish coordinate discipline and height property system
- [ ] **Phase 2: Core Rendering** — Implement depth sorting and unified rendering pipeline
- [ ] **Phase 3: Occlusion & Polish** — Dynamic occlusion effects and performance validation
- [ ] **Phase 4: Mod Integration** — Visual Pack extension and backward compatibility

## Phase Details

### Phase 1: Foundation

**Goal:** Establish type-safe coordinate systems and height property infrastructure that all subsequent phases depend on

**Depends on:** Nothing (first phase)

**Requirements:** COORD-01, COORD-02, HEIGHT-01, HEIGHT-02, FOOTPRINT-01, SPATIAL-01, CAMERA-01

**Success Criteria** (what must be TRUE when this phase completes):
1. All sprite anchor points are standardized to bottom-center, with no visual misalignment between gameplay position and rendered position
2. Height metadata (`renderHeight`) is stored in VisualPackRegistry and validated at mod load time, with clear error messages for invalid values
3. Type-safe coordinate conversions between TileCoord, WorldCoord, and DepthValue are enforced by the TypeScript compiler
4. Spatial indexing structure (quadtree or spatial hash) exists and can efficiently query objects within a world region
5. Oblique perspective camera (45° angled view) is active and objects appear with correct depth perspective
6. Footprint bounds are stored separately from visual bounds and used for collision detection

**Plans:** TBD

### Phase 2: Core Rendering

**Goal:** Replace fixed layer rendering with Y+height depth sorting for correct spatial occlusion

**Depends on:** Phase 1 (requires HEIGHT-01 for height data, COORD-01 for position calculations)

**Requirements:** DEPTH-01, DEPTH-02, DEPTH-03, DEPTH-04, DEPTH-05, SHADOW-01

**Success Criteria** (what must be TRUE when this phase completes):
1. Objects are rendered in correct depth order using Y+height algorithm — tall objects (trees, buildings) appear behind shorter objects when appropriate based on position
2. Fixed layer system (layers 0, 2, 3, 4, 7) is replaced with single-container rendering pipeline
3. gameViewport.ts integration is complete — existing game viewport uses new depth sorter without breaking existing mod API
4. Depth sorting works correctly for overlapping objects at all angles with no flickering or z-fighting
5. Basic shadows are rendered based on height classification (tall objects cast shadows, flat objects don't)
6. Depth updates occur in renderPrepare phase without triggering per-frame full re-sort when positions haven't changed

**Plans:** TBD

### Phase 3: Occlusion & Polish

**Goal:** Implement dynamic occlusion effects and validate 60fps performance with 500+ visible objects

**Depends on:** Phase 2 (requires depth sorting for occlusion to know which objects are in front)

**Requirements:** OCC-01, OCC-02, OCC-03, OCC-04, OCC-05, PERF-01, PERF-02

**Success Criteria** (what must be TRUE when this phase completes):
1. When player walks behind tall objects (trees, buildings), those objects fade to 30-50% alpha so player remains visible
2. Occlusion checks run every 2-3 frames (not every frame) without noticeable delay in fade effect
3. Split-layer objects render correctly — tree trunks at one depth, canopy at another depth, with player visible between layers
4. Height classification system (flat/low/medium/tall) is in place and drives occlusion and shadow behavior
5. Game maintains consistent 60fps when 500+ objects are visible on screen (measured via performance benchmarks)
6. Performance benchmarks exist and validate that rendering time stays under 16ms per frame

**Plans:** TBD

### Phase 4: Mod Integration

**Goal:** Extend Visual Pack system for pseudo-3D configuration while maintaining 100% backward compatibility

**Depends on:** Phase 1 (requires VisualPackRegistry extension from HEIGHT-01), can parallelize with Phase 3

**Requirements:** MOD-01, MOD-02, MOD-03, MOD-04, MOD-05

**Success Criteria** (what must be TRUE when this phase completes):
1. Visual Pack schema supports pseudo-3D configuration (height, footprint, occlusion rules) in a backward-compatible way
2. Legacy mods without pseudo-3D config render correctly using fallback defaults (height=0, flat classification)
3. New pseudo-3D features are opt-in via Visual Pack versioning — mods explicitly declare support for new features
4. Migration guide exists for mod authors explaining how to add pseudo-3D metadata to existing visual packs
5. All core mods (core:base, core:worldgen, core:player, core:inventory, core:survival, core:gathering, core:building, core:crafting, core:ui-hud) work without modification in both legacy and pseudo-3D rendering modes
6. Test suite validates that existing saves load correctly and render with new system

**Plans:** TBD

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/0 | Not started | - |
| 2. Core Rendering | 0/0 | Not started | - |
| 3. Occlusion & Polish | 0/0 | Not started | - |
| 4. Mod Integration | 0/0 | Not started | - |

## Dependencies

```
Phase 1 (Foundation)
    ↓ (height data needed for sorting)
Phase 2 (Core Rendering)
    ↓ (depth sorting needed for occlusion)
Phase 3 (Occlusion & Polish)
    ↗
Phase 1 (VisualPackRegistry extension available)
    ↓
Phase 4 (Mod Integration) ── can start after Phase 1 completes
```

**Critical Path:** Phase 1 → Phase 2 → Phase 3

**Parallelizable:** Phase 4 can run concurrently with Phase 3 once Phase 1 is complete

## Coverage Summary

| Category | Requirements | Phase | Status |
|----------|--------------|-------|--------|
| Foundation | COORD-01, COORD-02, HEIGHT-01, HEIGHT-02, FOOTPRINT-01, SPATIAL-01, CAMERA-01 | Phase 1 | Pending |
| Core Rendering | DEPTH-01, DEPTH-02, DEPTH-03, DEPTH-04, DEPTH-05, SHADOW-01 | Phase 2 | Pending |
| Occlusion & Polish | OCC-01, OCC-02, OCC-03, OCC-04, OCC-05, PERF-01, PERF-02 | Phase 3 | Pending |
| Mod Integration | MOD-01, MOD-02, MOD-03, MOD-04, MOD-05 | Phase 4 | Pending |

**Coverage Check:**
- Total v1 requirements: 26
- Mapped to phases: 26
- Orphaned: 0 ✓

## Risk Indicators

| Phase | Key Risk | Success Indicator |
|-------|----------|-------------------|
| Phase 1 | Coordinate system bugs | Type-safe conversions at boundaries |
| Phase 2 | Incorrect depth sorting | No visual glitches with overlapping objects |
| Phase 3 | Performance death with occlusion | 60fps maintained with 500+ objects |
| Phase 4 | Mod compatibility breakage | All core mods work without modification |

## Next Steps

1. `/gsd-plan-phase 1` to begin planning Phase 1 (Foundation)
2. Execute Phase 1 plans via `/gsd-execute`
3. Transition to Phase 2 via `/gsd-transition` when Phase 1 success criteria met

---
*Roadmap created: 2026-03-31*  
*Granularity: Coarse | Mode: YOLO*
