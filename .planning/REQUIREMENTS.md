# Requirements: Gamedemo 伪3D视觉改进

**Defined:** 2026-03-31
**Core Value:** 视觉呈现必须让玩家清晰感知空间层次和物体遮挡关系，营造沉浸式的2.5D游戏体验

## v1 Requirements

### Foundation (VIS-01 + VIS-02)

**Goal:** Establish coordinate discipline and height property system

- [ ] **COORD-01**: Type-safe coordinate system (TileCoord → WorldCoord → DepthValue)
- [ ] **COORD-02**: Bottom-center anchor point standard for all sprites
- [ ] **HEIGHT-01**: VisualPackRegistry extension for height metadata (`renderHeight` property)
- [ ] **HEIGHT-02**: Height validation at mod load time
- [ ] **FOOTPRINT-01**: Footprint definition separate from visual bounds (collision area)
- [ ] **SPATIAL-01**: Spatial indexing foundation (quadtree or spatial hash)
- [ ] **CAMERA-01**: Oblique perspective setup (45° angled view)

### Core Rendering (VIS-03)

**Goal:** Implement depth sorting system

- [ ] **DEPTH-01**: Pseudo3DDepthSorter with Y+height algorithm (`depth = y + heightOffset`)
- [ ] **DEPTH-02**: DepthSorter runtime system in renderPrepare phase
- [ ] **DEPTH-03**: Single-container rendering pipeline (replace fixed layers 0, 2, 3, 4, 7)
- [ ] **DEPTH-04**: Integration with existing gameViewport.ts
- [ ] **DEPTH-05**: Painter's algorithm implementation for correct occlusion
- [ ] **SHADOW-01**: Basic shadows driven by height classification

### Occlusion & Polish (VIS-04)

**Goal:** Dynamic occlusion effects and performance optimization

- [ ] **OCC-01**: OcclusionManager with player position tracking
- [ ] **OCC-02**: Alpha fade effect (0.3-0.5 alpha range) when player behind object
- [ ] **OCC-03**: Frame skipping for occlusion checks (every 2-3 frames)
- [ ] **OCC-04**: Split-layer objects support (trunk + canopy separately)
- [ ] **OCC-05**: Height classification system (flat/low/medium/tall)
- [ ] **PERF-01**: Maintain 60fps with 500+ visible objects
- [ ] **PERF-02**: Performance benchmarks and optimization validation

### Mod Integration (VIS-05)

**Goal:** Visual Pack extension and backward compatibility

- [ ] **MOD-01**: Visual Pack schema extension for pseudo-3D configuration
- [ ] **MOD-02**: Backward compatibility layer (legacy rendering fallback)
- [ ] **MOD-03**: Version-gating for new features (opt-in via Visual Pack version)
- [ ] **MOD-04**: Migration guide for mod authors
- [ ] **MOD-05**: Test suite with all core mods (core:base, core:worldgen, etc.)

## v2 Requirements

### Atmosphere & Content (Post-MVP)

- **ATM-01**: Seasonal art variants support (schema only in v1)
- **ATM-02**: Weather overlay system
- **ATM-03**: Time-of-day lighting effects
- **ATM-04**: Staged growth visuals for crops/trees
- **ATM-05**: Animated environmental elements

## Out of Scope

| Feature | Reason |
|---------|--------|
| True 3D rendering (WebGL 3D, Three.js) | Out of scope per PROJECT.md — keeps mod compatibility simple |
| Camera rotation | Out of scope per PROJECT.md — fixed perspective required |
| Vertical terrain (cliffs, multi-level maps) | Out of scope per PROJECT.md — single-layer map only |
| Physics-based height simulation | Out of scope per PROJECT.md — visual height only |
| Dynamic shadow casting | Out of scope — static height-class shadows only |
| Normal map lighting | Out of scope — simple sprite rendering |
| Z-axis movement | Out of scope — 2D plane movement only |
| Procedural sprite generation | Out of scope — artist-created assets only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| COORD-01 | Phase 1 | Pending |
| COORD-02 | Phase 1 | Pending |
| HEIGHT-01 | Phase 1 | Pending |
| HEIGHT-02 | Phase 1 | Pending |
| FOOTPRINT-01 | Phase 1 | Pending |
| SPATIAL-01 | Phase 1 | Pending |
| CAMERA-01 | Phase 1 | Pending |
| DEPTH-01 | Phase 2 | Pending |
| DEPTH-02 | Phase 2 | Pending |
| DEPTH-03 | Phase 2 | Pending |
| DEPTH-04 | Phase 2 | Pending |
| DEPTH-05 | Phase 2 | Pending |
| SHADOW-01 | Phase 2 | Pending |
| OCC-01 | Phase 3 | Pending |
| OCC-02 | Phase 3 | Pending |
| OCC-03 | Phase 3 | Pending |
| OCC-04 | Phase 3 | Pending |
| OCC-05 | Phase 3 | Pending |
| PERF-01 | Phase 3 | Pending |
| PERF-02 | Phase 3 | Pending |
| MOD-01 | Phase 4 | Pending |
| MOD-02 | Phase 4 | Pending |
| MOD-03 | Phase 4 | Pending |
| MOD-04 | Phase 4 | Pending |
| MOD-05 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-31*
*Last updated: 2026-03-31 after initial definition*
