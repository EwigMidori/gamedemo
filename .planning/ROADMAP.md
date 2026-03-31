# ROADMAP: Gamedemo 伪3D视觉改进

**Project:** Gamedemo Pseudo-3D Visual Enhancement  
**Created:** 2026-03-31  
**Mode:** YOLO (proceed without approval gates)  
**Granularity:** Coarse (4 phases)

## Phases

- [x] **Phase 1: Foundation** — Establish coordinate discipline and height property system
- [x] **Phase 2: Core Rendering** — Implement depth sorting and unified rendering pipeline
- [x] **Phase 3: Occlusion & Polish** — Dynamic occlusion effects and performance validation
- [x] **Phase 4: Mod Integration** — Visual Pack extension and backward compatibility

## Phase Details

### Phase 1: Foundation ✅ SHIPPED in v0.1

**Archived:** See [v0.1 milestone](milestones/v0.1-ROADMAP.md)  
**Status:** All 7 requirements satisfied — Coordinate system, height registry, spatial indexing complete

### Phase 2: Core Rendering ✅ SHIPPED in v0.1

**Archived:** See [v0.1 milestone](milestones/v0.1-ROADMAP.md)  
**Status:** All 6 requirements satisfied — Depth sorting, shadow system, unified pipeline complete

### Phase 3: Occlusion & Polish ✅ COMPLETE

**Goal:** Implement dynamic occlusion effects and validate 60fps performance with 500+ visible objects
**Status:** All 7 requirements satisfied — OcclusionManager, alpha fade, performance benchmarks complete

**Depends on:** Phase 2 (requires depth sorting for occlusion to know which objects are in front)

**Requirements:** OCC-01, OCC-02, OCC-03, OCC-04, OCC-05, PERF-01, PERF-02

**Success Criteria** (what must be TRUE when this phase completes):
1. When player walks behind tall objects (trees, buildings), those objects fade to 30-50% alpha so player remains visible
2. Occlusion checks run every 2-3 frames (not every frame) without noticeable delay in fade effect
3. Split-layer objects render correctly — tree trunks at one depth, canopy at another depth, with player visible between layers
4. Height classification system (flat/low/medium/tall) is in place and drives occlusion and shadow behavior
5. Game maintains consistent 60fps when 500+ objects are visible on screen (measured via performance benchmarks)
6. Performance benchmarks exist and validate that rendering time stays under 16ms per frame

**Plans:** 3 plans in 2 waves

**Plan List:**
- [x] `03-01-PLAN.md` — Occlusion Manager (OCC-01, OCC-02) — Wave 1
- [x] `03-02-PLAN.md` — Performance Optimization (PERF-01, PERF-02) — Wave 2
- [x] `03-03-PLAN.md` — Split-Layer Objects (OCC-04) — Wave 2

**Wave Structure:**
```
Wave 1 (Foundation):
  └─ Plan 03-01: Occlusion detection and alpha fade effects

Wave 2 (Advanced Features):
  ├─ Plan 03-02: Performance benchmarking and optimization
  └─ Plan 03-03: Multi-layer object rendering
```

### Phase 4: Mod Integration ✅ COMPLETE

**Goal:** Extend Visual Pack system for pseudo-3D configuration while maintaining 100% backward compatibility
**Status:** All 5 requirements satisfied — Visual Pack v2 schema, backward compatibility, migration guides complete

**Depends on:** Phase 1 (requires VisualPackRegistry extension from HEIGHT-01), can parallelize with Phase 3

**Requirements:** MOD-01, MOD-02, MOD-03, MOD-04, MOD-05

**Success Criteria** (what must be TRUE when this phase completes):
1. Visual Pack schema supports pseudo-3D configuration (height, footprint, occlusion rules) in a backward-compatible way
2. Legacy mods without pseudo-3D config render correctly using fallback defaults (height=0, flat classification)
3. New pseudo-3D features are opt-in via Visual Pack versioning — mods explicitly declare support for new features
4. Migration guide exists for mod authors explaining how to add pseudo-3D metadata to existing visual packs
5. All core mods (core:base, core:worldgen, core:player, core:inventory, core:survival, core:gathering, core:building, core:crafting, core:ui-hud) work without modification in both legacy and pseudo-3D rendering modes
6. Test suite validates that existing saves load correctly and render with new system

**Plans:** 2 plans in 2 waves

**Plan List:**
- [x] `04-01-PLAN.md` — Visual Pack Schema v2 (MOD-01, MOD-02, MOD-03) — Wave 1
- [x] `04-02-PLAN.md` — Core Mod Testing & Migration (MOD-04, MOD-05) — Wave 2

**Wave Structure:**
```
Wave 1 (Schema & Compatibility):
  └─ Plan 04-01: Visual Pack v2 schema and backward compatibility layer

Wave 2 (Testing & Documentation):
  └─ Plan 04-02: Test suite and migration guide for mod authors
```

## Progress Table

| Phase | Plans Complete | Status | Milestone |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | ✅ **Shipped** | v0.1 |
| 2. Core Rendering | 3/3 | ✅ **Shipped** | v0.1 |
| 3. Occlusion & Polish | 3/3 | ✅ **Shipped** | v1.0 |
| 4. Mod Integration | 2/2 | ✅ **Shipped** | v1.0 |

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

### v0.1 (Shipped) — 12/12 Complete ✅

| Category | Requirements | Phase | Status |
|----------|--------------|-------|--------|
| Foundation | ~~COORD-01~~, ~~COORD-02~~, ~~HEIGHT-01~~, ~~HEIGHT-02~~, ~~FOOTPRINT-01~~, ~~SPATIAL-01~~ | Phase 1 | ✅ v0.1 |
| Core Rendering | ~~DEPTH-01~~, ~~DEPTH-02~~, ~~DEPTH-03~~, ~~DEPTH-04~~, ~~DEPTH-05~~, ~~SHADOW-01~~ | Phase 2 | ✅ v0.1 |

**v0.1 Archive:** [REQUIREMENTS.md](milestones/v0.1-REQUIREMENTS.md)

### v1.0 (SHIPPED) — 12/12 Complete ✅

| Category | Requirements | Phase | Status |
|----------|--------------|-------|--------|
| Occlusion | ~~OCC-01~~, ~~OCC-02~~, ~~OCC-03~~, ~~OCC-04~~, ~~OCC-05~~, ~~PERF-01~~, ~~PERF-02~~ | Phase 3 | ✅ v1.0 |
| Mod Integration | ~~MOD-01~~, ~~MOD-02~~, ~~MOD-03~~, ~~MOD-04~~, ~~MOD-05~~ | Phase 4 | ✅ v1.0 |

**v1.0 Requirements:** [REQUIREMENTS.md](REQUIREMENTS.md)

**Coverage Check:**
- Total requirements: 26 (13 v0.1 + 12 v1.0)
- v0.1 completed: 13 (50%) ✅
- v1.0 completed: 12 (50%) ✅
- Orphaned: 0 ✓

## Risk Indicators

| Phase | Key Risk | Success Indicator |
|-------|----------|-------------------|
| Phase 1 | Coordinate system bugs | Type-safe conversions at boundaries |
| Phase 2 | Incorrect depth sorting | No visual glitches with overlapping objects |
| Phase 3 | Performance death with occlusion | 60fps maintained with 500+ objects |
| Phase 4 | Mod compatibility breakage | All core mods work without modification |

## Next Steps

### v0.1 Complete ✅

Milestone v0.1 shipped with Phase 1-2 complete. All core rendering infrastructure in place.

### v1.0 COMPLETE ✅

**Milestone v1.0 shipped:** 2026-04-01  
**Goal:** Production-ready pseudo-3D with dynamic occlusion and full mod support  
**Requirements:** 12 requirements ([REQUIREMENTS.md](REQUIREMENTS.md)) — ALL DELIVERED ✅  
**Plans:** 5 plans across Phase 3-4 — ALL COMPLETE ✅  

**Summary:**
- Phase 3: 3 plans, 7 requirements (OcclusionManager, PerformanceMonitor, LayeredEntity)
- Phase 4: 2 plans, 5 requirements (VisualPack v2 schema, backward compatibility, migration guides)
- Total: 77 tests passing, 100% backward compatibility verified

---
*Roadmap created: 2026-03-31*
*Last updated: 2026-04-01 (v1.0 SHIPPED)*
*v0.1: Phase 1-2 COMPLETE ✅ — Core Rendering Foundation*
*v1.0: Phase 3-4 COMPLETE ✅ — Occlusion & Mod Integration*
*Current: v1.0 PRODUCTION READY — All 25 requirements delivered*
*Granularity: Coarse | Mode: YOLO*
