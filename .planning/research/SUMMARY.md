# Research Synthesis Summary: Pseudo-3D Visual Implementation

**Project:** Gamedemo Pseudo-3D Visual Enhancement  
**Synthesized:** 2026-03-31  
**Sources:** STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md, PROJECT.md

---

## Executive Summary

Based on comprehensive research across technology, features, architecture, and pitfalls, the recommended approach for implementing Stardew Valley-style pseudo-3D (2.5D) visuals in the Gamedemo engine is **custom Y-sorting using Phaser 3's native depth system** rather than third-party isometric plugins or true 3D libraries.

The key insight from all four research dimensions is that pseudo-3D is achieved through **proper depth sorting and visual effects, not projection math or complex 3D engines**. Phaser 3.90.0 provides all necessary primitives: depth sorting via the `depth` property, alpha manipulation for occlusion, and layer management. The architecture should extend the existing Visual Pack system to support height metadata and occlusion rules, ensuring backward compatibility with existing mods.

**Critical finding:** The current codebase uses fixed depth layers (0, 2, 3, 4, 7) which fundamentally cannot support proper pseudo-3D. This must be replaced with a unified Y+height sorting algorithm before any other features can work correctly.

---

## Key Findings by Dimension

### Technology Stack (STACK.md)

**Core Recommendation:** No additional libraries required beyond existing Phaser 3.90.0 + TypeScript.

| Component | Implementation | Rationale |
|-----------|---------------|-----------|
| **Depth Sorting** | Custom `Pseudo3DDepthSorter` class | `depth = y + heightOffset` is the industry standard pattern |
| **Height Metadata** | Extend Visual Pack registry | Required for mod configurability; per-object `renderHeight` property |
| **Occlusion System** | Custom `OcclusionManager` | Phaser's `setAlpha()` with 0.3-0.5 alpha for occluding objects |
| **Performance** | Optional `@timohausmann/quadtree-js` | Spatial indexing to reduce occlusion checks from O(n²) to O(log n) |

**Anti-Patterns Identified:**
- Avoid `phaser-plugin-isometric` (deprecated, Phaser 2 only)
- Avoid `phaser3-plugin-isometric` fork (WIP, incomplete)
- Avoid Three.js/Babylon.js (true 3D out of scope, breaks mod compatibility)

### Feature Landscape (FEATURES.md)

**Table Stakes (Must-Have for MVP):**
1. Oblique/angled perspective (45° view)
2. Multi-layer rendering (terrain → ground items → actors → tall objects)
3. Depth sorting (Y-position + height class)
4. Object height properties (visual height ≠ collision footprint)
5. Basic shadows (height-class driven)
6. Footprint definition (collision separate from visual bounds)
7. Consistent anchor points (bottom-center standard)

**Differentiators (Phase 2+):**
- Dynamic occlusion fade (Stardew signature feature)
- Split-layer objects (trunk + canopy separately)
- Visual Pack system integration
- Height classification system (flat/low/medium/tall)
- Seasonal art variants, weather overlays, time-of-day lighting

**Anti-Features (Explicitly Out of Scope):**
- True 3D rendering, camera rotation, vertical terrain (cliffs)
- Physics-based height, dynamic shadow casting, normal map lighting
- Z-axis movement, procedural sprite generation

**MVP Complexity Assessment:** Core rendering features are Medium complexity; the primary risk is depth sorting performance with many objects.

### Architecture (ARCHITECTURE.md)

**Recommended Architecture Layers:**

```
Visual Pack System (Content Metadata)
    ↓
Engine Scene Graph Layer (packages/engine-phaser extension)
    ↓
Phaser Primitives Layer (DisplayList)
```

**Key Components:**

| Component | Responsibility | Integration Point |
|-----------|---------------|-------------------|
| **VisualPackRegistry** | Stores height/occlusion metadata per content ID | ModInstallContext |
| **DepthSorter** | Calculates render order: `(y * scale) + height_offset` | Pseudo3DSystem in renderPrepare phase |
| **OcclusionManager** | Detects player-behind-object, applies alpha/outline effects | Player position system |
| **Pseudo3DSystem** | Runtime system that updates depths per frame | engine-runtime package |

**Critical Pattern:** Height-aware entity wrapper with standardized bottom-center origin:
```typescript
class Pseudo3DEntity {
  getRenderDepth(): number {
    return (sprite.y * DEPTH_SCALE) + (config.renderHeight * 0.5);
  }
  getFootprintBounds(): Rectangle { /* collision area */ }
}
```

**Anti-Patterns to Avoid:**
- Per-pixel depth sorting (performance killer)
- Multiple `setDepth()` calls per frame (triggers O(n log n) resort)
- Occlusion without spatial index (O(n) checks)
- Mixing screen/world coordinates for depth calculations

### Pitfalls (PITFALLS.md)

**Critical Pitfalls (Must Avoid):**

| Pitfall | Phase | Risk | Prevention |
|---------|-------|------|------------|
| **Incorrect Depth Sorting** | VIS-03 | Visual glitches, destroys depth illusion | Implement painter's algorithm with Y+height sort; single container |
| **Height Property Misalignment** | VIS-02 | Gameplay/logic disconnect | Standardize bottom-center origins; validate at mod load |
| **Dynamic Occlusion Performance Death** | VIS-04 | Frame rate drops to unplayable | Use alpha threshold 0.3-0.5; frame skipping (every 2-3 frames); object pooling |
| **Mod Compatibility Breakage** | VIS-05 | Existing mods break | Version-gate features; provide legacy rendering fallback |
| **Over-Rendering (O(n) traversal)** | VIS-01 | Unplayable in large worlds | Spatial indexing; view culling; dirty tracking |
| **Inconsistent Coordinate Systems** | VIS-01 | Subtle position bugs | Type-safe coordinates; clear conversion functions |

**Performance Traps:**
- Sorting every frame → breaks at ~500+ moving objects
- Alpha blending on many objects → breaks with dense forests
- Per-frame full world iteration → breaks at ~1000+ objects

**Recovery Cost:** Wrong sorting algorithm requires HIGH effort (rewrite render pipeline); performance issues require MEDIUM-HIGH effort (architectural changes).

---

## Recommended Phase Structure

Based on all research inputs, the following phase structure balances dependencies, risk mitigation, and incremental value delivery:

### Phase 1: Foundation (VIS-01 + VIS-02) — Weeks 1-2
**Focus:** Establish coordinate discipline and height property system

**Deliverables:**
- Type-safe coordinate conversion system (TileCoord → WorldCoord → DepthValue)
- VisualPackRegistry extension for height metadata
- HeightPropertySystem with validation
- Spatial index foundation (optional quadtree)

**Features from FEATURES.md:**
- Oblique perspective setup
- Object height properties
- Consistent anchor points (bottom-center standard)
- Footprint definition

**Pitfalls to Avoid:**
- Inconsistent Coordinate Systems (Pitfall 6)
- Height Property Misalignment (Pitfall 2)
- Over-Rendering (Pitfall 5) — establish spatial structures now

**Research Flag:** ⭐ Standard pattern — spatial indexing is well-documented, may skip additional research

---

### Phase 2: Core Rendering (VIS-03) — Weeks 3-4
**Focus:** Implement depth sorting system

**Deliverables:**
- Pseudo3DDepthSorter with Y+height algorithm
- DepthSorter runtime system (renderPrepare phase)
- Single-container rendering pipeline (replace fixed layers)
- Integration with existing gameViewport.ts

**Features from FEATURES.md:**
- Depth sorting (Y-position + height)
- Multi-layer rendering unified into single sorted pipeline
- Basic shadows (height-class driven)

**Pitfalls to Avoid:**
- **Incorrect Depth Sorting** (Pitfall 1) — CRITICAL: This phase must get the algorithm right
- Per-frame full world traversal (Pitfall 5) — leverage spatial index from Phase 1

**Research Flag:** 🔍 Needs validation — Test with overlapping objects at all angles; visual regression tests required

---

### Phase 3: Occlusion & Polish (VIS-04) — Weeks 5-6
**Focus:** Dynamic occlusion effects and performance optimization

**Deliverables:**
- OcclusionManager with player tracking
- Alpha fade effect (0.3-0.5 range)
- Frame skipping for occlusion checks (every 2-3 frames)
- Performance benchmarks and optimization

**Features from FEATURES.md:**
- Dynamic occlusion fade
- Split-layer objects (body + front overlay)
- Height classification system (flat/low/medium/tall)

**Pitfalls to Avoid:**
- **Dynamic Occlusion Performance Death** (Pitfall 3) — Performance must be acceptance criterion
- Alpha blending on too many objects

**Research Flag:** 🔍 Needs research — Performance characteristics with 500+ objects; consider `/gsd-research-phase` for shader-based outline effects

---

### Phase 4: Mod Integration (VIS-05) — Weeks 7-8
**Focus:** Visual Pack extension and backward compatibility

**Deliverables:**
- Visual Pack schema extension for pseudo-3D config
- Backward compatibility layer (legacy rendering fallback)
- Migration guide for mod authors
- Test suite with all core mods

**Features from FEATURES.md:**
- Visual Pack system integration
- Data-driven rendering
- Seasonal variants support (schema only)

**Pitfalls to Avoid:**
- **Mod Compatibility Breakage** (Pitfall 4) — Must test all existing mods
- Breaking existing Visual Packs

**Research Flag:** ⭐ Standard pattern — Visual Pack extension follows existing mod API patterns

---

### Phase 5: Atmosphere & Content (Post-MVP)
**Focus:** Content variety and polish features

**Features:**
- Seasonal art variants
- Staged growth visuals
- Weather overlays
- Time-of-day lighting
- Animated elements

**Deferred from MVP:** These features require art pipeline support but don't block core functionality.

---

## Critical Success Factors

**What Must Go Right:**

1. **Depth Sorting Algorithm Correctness** — The Y+height sort must be mathematically correct from the start. Wrong algorithm = rewrite entire render pipeline.

2. **Coordinate System Discipline** — Type-safe coordinates (TileCoord, WorldCoord, DepthValue) must be enforced from Phase 1. Mixing coordinate spaces will cause subtle, hard-to-debug visual bugs.

3. **Performance Budget** — Must maintain 60fps with 500+ visible objects on target hardware. Occlusion checks every 2-3 frames, not every frame.

4. **Mod Compatibility** — All existing core mods must work without modification. New features must be opt-in via Visual Pack versioning.

5. **Art Pipeline Alignment** — Sprite origins must be standardized to bottom-center. Artists need clear guidelines for tall object sprites (trunk + canopy layers).

---

## Risk Mitigation

### Top Risks and Mitigation Strategies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Depth sorting performance issues** | Medium | High | Implement spatial indexing in Phase 1; use dirty tracking; profile early with 500+ objects |
| **Mod compatibility breakage** | Medium | High | Maintain legacy rendering path; version-gate new features; test all core mods before release |
| **Art pipeline disruption** | Medium | Medium | Document sprite conventions early; provide validation tools; gradual migration for existing assets |
| **Occlusion performance death** | Medium | High | Set alpha threshold to 0.3-0.5 (not full transparency); implement frame skipping; distance-based LOD |
| **Coordinate system bugs** | High | Medium | Enforce type-safe coordinates from Phase 1; unit test all conversion functions at boundaries |
| **Scope creep to true 3D** | Low | High | Explicitly reject Three.js/3D proposals; reference PROJECT.md Out of Scope section |

### Risk Triggers to Watch

- **Performance:** Frame rate drops when player approaches dense forest → Occlusion system overloaded
- **Compatibility:** Core mods show visual glitches in test builds → Breaking change introduced
- **Quality:** Objects flicker when moving → Depth sorting algorithm flawed
- **Scope:** Discussions of camera rotation or vertical terrain → Violation of Out of Scope items

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| **Core Stack** | **HIGH** | Phaser 3 native features verified with official examples |
| **Depth Sorting Pattern** | **HIGH** | Standard Y-sort well-established in 2D gamedev |
| **Architecture Integration** | **MEDIUM-HIGH** | Clear extension points identified; follows existing patterns |
| **Performance Projections** | **MEDIUM** | Standard techniques but not yet validated with Phaser 3 |
| **Mod Compatibility** | **MEDIUM** | Backward compatibility strategy clear but needs testing |
| **Visual Pack Schema** | **MEDIUM** | Based on RFCs; needs mod author feedback |

### Gaps to Address During Planning

1. **Exact projection angle:** 45° vs Stardew's ~30° — decision needed before VIS-01
2. **Art asset availability:** Do existing sprites need rework or can they be used as-is initially?
3. **Performance baseline:** Current O(n) rendering — need profiling data to set improvement targets
4. **Visual Pack migration:** How many existing packs need updates? What's the migration effort?

---

## Next Steps

### Immediate Actions (This Week)

1. **Decision:** Confirm projection angle (45° vs shallower angle)
2. **Audit:** Review existing sprite assets for origin point consistency
3. **Baseline:** Profile current rendering performance (O(n) loop in gameViewport.ts)
4. **Validate:** Test depth sorting algorithm with simple prototype (1-2 days spike)

### Before Phase 1 Starts

- [ ] Define Visual Pack schema extension for height metadata
- [ ] Document sprite authoring guidelines (origin points, split layers)
- [ ] Set up performance benchmark harness
- [ ] Inventory existing mods for compatibility testing

### Research Flags for Planning

| Phase | Research Needed? | Notes |
|-------|-----------------|-------|
| Phase 1 (Foundation) | No | Standard patterns, proceed with implementation |
| Phase 2 (Core Rendering) | Validation only | Test algorithm with complex overlapping scenarios |
| Phase 3 (Occlusion) | **Yes** | Consider `/gsd-research-phase` for shader-based outline effects vs alpha fade |
| Phase 4 (Mod Integration) | No | Follows existing patterns |

---

## Sources

### Official Documentation
- Phaser 3.90.0 Release Notes (GitHub)
- Phaser 3 Examples - Depth Sorting
- Phaser 3 Examples - Isometric

### Project Documents
- PROJECT.md — Requirements VIS-01 through VIS-05
- RFC-0016: Pseudo-3D 2D Visual Architecture
- RFC-0017: Pseudo-3D 2D Implementation Plan And Guardrails
- codebase/STACK.md — Existing Phaser 3.90.0 stack
- codebase/ARCHITECTURE.md — Visual Pack system, mod architecture

### External Research
- Stardew Valley Wiki - Modding:Maps
- Stardew Valley modding documentation (layer system, tile properties)
- Red Blob Games Grid Guide - Spatial coordinate systems
- Phaser 3 Rex Notes documentation

---

*Synthesis completed: 2026-03-31*  
*Next step: Requirements definition and phase planning*
