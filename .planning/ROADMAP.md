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
- [ ] **Phase 5: Performance & Optimization** — Frustum culling and large world support

## Phase Details

### Phase 1: Foundation ✅ SHIPPED in v0.1

**Archived:** See [v0.1 milestone](milestones/v0.1-ROADMAP.md)  
**Status:** All 7 requirements satisfied — Coordinate system, height registry, spatial indexing complete

### Phase 2: Core Rendering ✅ SHIPPED in v0.1

**Archived:** See [v0.1 milestone](milestones/v0.1-ROADMAP.md)  
**Status:** All 6 requirements satisfied — Depth sorting, shadow system, unified pipeline complete

### Phase 3: Occlusion & Polish ✅ SHIPPED in v1.0

**Archived:** See [v1.0 milestone](milestones/v1.0-ROADMAP.md)  
**Status:** All 7 requirements satisfied — OcclusionManager, alpha fade (40%), performance benchmarks (500+ @ 60fps)

### Phase 4: Mod Integration ✅ SHIPPED in v1.0

**Archived:** See [v1.0 milestone](milestones/v1.0-ROADMAP.md)  
**Status:** All 5 requirements satisfied — Visual Pack v2 schema, 100% backward compatibility, bilingual migration guides (77 tests)

### Phase 5: Performance & Optimization

**Goal:** Implement frustum culling and optimize rendering for large worlds (1000×1000) and lower-end devices

**Depends on:** Phase 2-4 (requires depth sorting, spatial indexing, and occlusion systems)

**Requirements:** PERF-03, PERF-04, PERF-05, PERF-06, PERF-07, PERF-08

**Success Criteria** (what must be TRUE when this phase completes):
1. Frustum culling skips 90%+ of off-screen objects, only processing visible entities
2. Render pipeline layers: Frustum → Depth Sort → Occlusion → Render
3. LOD system simplifies distant objects (Far = placeholder, Medium = no shadows)
4. Object pool optimized for zero GC pressure with >95% hit rate
5. 1000×1000 map runs at 60fps on mid-range hardware (GTX 1050)
6. Performance benchmarks validate 10-50x improvement over v1.0

**Plans:** TBD (~3-4 plans expected)

**Key Components:**
- **FrustumCuller**: Calculate screen bounds and filter entities
- **RenderPipeline**: Layered processing with early exit optimizations
- **LODManager**: Distance-based detail level selection
- **ChunkManager**: Map chunking for streaming large worlds

## Progress Table

| Phase | Plans Complete | Status | Milestone |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | ✅ **Shipped** | v0.1 |
| 2. Core Rendering | 3/3 | ✅ **Shipped** | v0.1 |
| 3. Occlusion & Polish | 3/3 | ✅ **Shipped** | v1.0 |
| 4. Mod Integration | 2/2 | ✅ **Shipped** | v1.0 |
| 5. Performance & Optimization | 0/0 | ⏳ **Planning** | v1.1 |

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

**v1.0 Archive:** [REQUIREMENTS.md](milestones/v1.0-REQUIREMENTS.md)

### v1.1 (Planning) — 0/6 Pending ⏳

| Category | Requirements | Phase | Status |
|----------|--------------|-------|--------|
| Performance | PERF-03, PERF-04, PERF-05, PERF-06, PERF-07, PERF-08 | Phase 5 | ⏳ v1.1 |

**v1.1 Requirements:** [REQUIREMENTS.md](REQUIREMENTS.md)

**Coverage Check:**
- Total requirements: 32 (12 v0.1 + 12 v1.0 + 6 v1.1 planned)
- v0.1 completed: 12 (37.5%) ✅
- v1.0 completed: 12 (37.5%) ✅
- v1.1 planned: 6 (18.75%) ⏳
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

### v1.1 IN PROGRESS ⏳

**Milestone v1.1 started:** 2026-04-01
**Goal:** Frustum culling and rendering optimization for large worlds (1000×1000) and lower-end devices
**Requirements:** 6 requirements ([REQUIREMENTS.md](REQUIREMENTS.md))
**Target:** 10-50x performance improvement, support for 1000×1000 maps at 60fps

**Ready to Execute:**
1. `/gsd-plan-phase 05` — Phase 5: Performance & Optimization

---
*Roadmap created: 2026-03-31*
*Last updated: 2026-04-01 (v1.1 STARTED)*
*v0.1: Phase 1-2 COMPLETE ✅ — Core Rendering Foundation*
*v1.0: Phase 3-4 COMPLETE ✅ — Occlusion & Mod Integration*
*v1.1: Phase 5 PLANNING ⏳ — Performance & Large World Support*
*Granularity: Coarse | Mode: YOLO*
