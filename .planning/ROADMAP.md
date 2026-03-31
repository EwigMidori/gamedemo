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

### Phase 1: Foundation ✅ SHIPPED in v0.1

**Archived:** See [v0.1 milestone](milestones/v0.1-ROADMAP.md)  
**Status:** All 7 requirements satisfied — Coordinate system, height registry, spatial indexing complete

### Phase 2: Core Rendering ✅ SHIPPED in v0.1

**Archived:** See [v0.1 milestone](milestones/v0.1-ROADMAP.md)  
**Status:** All 6 requirements satisfied — Depth sorting, shadow system, unified pipeline complete

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

| Phase | Plans Complete | Status | Milestone |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | ✅ **Shipped** | v0.1 |
| 2. Core Rendering | 3/3 | ✅ **Shipped** | v0.1 |
| 3. Occlusion & Polish | 0/0 | ⏳ Pending | v1.0 |
| 4. Mod Integration | 0/0 | ⏳ Pending | v1.0 |

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

### v0.1 (Shipped) — 13/13 Complete ✅

| Category | Requirements | Phase | Status |
|----------|--------------|-------|--------|
| Foundation | ~~COORD-01~~, ~~COORD-02~~, ~~HEIGHT-01~~, ~~HEIGHT-02~~, ~~FOOTPRINT-01~~, ~~SPATIAL-01~~, ~~CAMERA-01~~ | Phase 1 | ✅ v0.1 |
| Core Rendering | ~~DEPTH-01~~, ~~DEPTH-02~~, ~~DEPTH-03~~, ~~DEPTH-04~~, ~~DEPTH-05~~, ~~SHADOW-01~~ | Phase 2 | ✅ v0.1 |

**v0.1 Archive:** [REQUIREMENTS.md](milestones/v0.1-REQUIREMENTS.md)

### v1.0 (Pending) — 12/12 Remaining

| Category | Requirements | Phase | Status |
|----------|--------------|-------|--------|
| Occlusion & Polish | OCC-01, OCC-02, OCC-03, OCC-04, OCC-05, PERF-01, PERF-02 | Phase 3 | ⏳ Pending |
| Mod Integration | MOD-01, MOD-02, MOD-03, MOD-04, MOD-05 | Phase 4 | ⏳ Pending |

**Coverage Check:**
- Total requirements: 26
- v0.1 completed: 13 (50%)
- v1.0 pending: 13 (50%)
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

### v1.0 Planning

1. **Start next milestone** — Run `/gsd-new-milestone` to begin Phase 3-4
2. **Phase 3: Occlusion & Polish** — Dynamic alpha fade, performance benchmarks
3. **Phase 4: Mod Integration** — Visual Pack schema, backward compatibility

**Estimated:** Phase 3 (~3-4 plans), Phase 4 (~2-3 plans)

**Target:** Production-ready pseudo-3D with full mod support

---
*Roadmap created: 2026-03-31*
*Last updated: 2026-04-01 (v0.1 shipped)*
*v0.1: Phase 1-2 COMPLETE — Core Rendering Foundation*
*v1.0: Phase 3-4 PENDING — Occlusion & Mod Integration*
*Granularity: Coarse | Mode: YOLO*
