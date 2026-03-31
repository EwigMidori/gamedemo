# Technology Stack: Pseudo-3D Visual Architecture

**Project:** Gamedemo Pseudo-3D Visual Enhancement
**Researched:** 2026-03-31
**Scope:** Stack dimension for adding pseudo-3D (2.5D) visual effects to existing Phaser 3 game engine

## Executive Summary

For implementing Stardew Valley-style pseudo-3D effects in a Phaser 3 browser-based game, **no additional core libraries are required**. Phaser 3.90.0 provides all necessary primitives: depth sorting via the `depth` property, alpha manipulation for occlusion effects, and native isometric tilemap support. The recommended approach is **custom Y-sorting implementation** using Phaser's built-in depth system rather than third-party isometric plugins, which are either deprecated (Phaser 2) or incomplete (Phaser 3 fork).

**Key insight:** Pseudo-3D is achieved through proper depth sorting, not projection math. The standard 2025 pattern is calculating `depth = y + heightOffset` per frame.

---

## Recommended Stack

### Core Framework (No Changes)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| **Phaser** | 3.90.0 | 2D game framework | Already in use; latest stable with full depth sorting and alpha support. Phaser 4.0.0-rc exists but is pre-release and unnecessary for pseudo-3D. |
| **TypeScript** | 5.9.3 | Type safety | Existing stack; strict mode recommended for catching depth calculation errors. |

### Rendering Components (New)

| Component | Implementation | Purpose | Rationale |
|-----------|---------------|---------|-----------|
| **Depth Sorting System** | Custom class `Pseudo3DDepthSorter` | Y-based depth calculation | Standard pattern: `depth = y + renderHeight`. See Phaser official examples for reference implementation. |
| **Height Metadata** | Extend content registry | Store render height per object type | Required for VIS-02; stores pixel height offset in Visual Pack definitions. |
| **Occlusion Manager** | Custom class `OcclusionManager` | Alpha fade when player behind objects | Uses `setAlpha()` on sprites; 0.3-0.5 alpha typical for occluding objects. |
| **Render Layer** | Phaser's built-in `Layer` | Group objects for batch depth sorting | Phaser 3.60+ `Layer` class manages display lists efficiently. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **phaser3-rex-plugins** | 1.80.19+ | UI components | Already in project; can be used for HUD elements but NOT for pseudo-3D core. |

---

## What NOT to Use

### phaser-plugin-isometric (lewster32) - DEPRECATED
- **Status:** Archived May 2018, Phaser 2 only
- **Why avoid:** Explicitly states "has NOT been tested with Phaser 3"
- **Confidence:** HIGH (official README)

### phaser3-plugin-isometric (sebashwa fork) - NOT PRODUCTION READY
- **Status:** Work in progress, 174 stars
- **Why avoid:** README states "WIP" and "debug utilities not working yet"
- **Confidence:** HIGH (official README)

### True 3D Libraries (Three.js, Babylon.js)
- **Why avoid:** Out of scope per PROJECT.md; breaks mod compatibility promise
- **Confidence:** HIGH (project requirements)

### Isometric Tilemaps (Phaser Native)
- **Why avoid:** Stardew Valley uses oblique projection, not true isometric
- **Note:** Phaser's `Orientation.ISOMETRIC` exists but creates diamond-shaped maps; project's 45-degree oblique view requires manual projection
- **Confidence:** MEDIUM (visual comparison)

---

## Implementation Patterns

### Depth Sorting (Y-Sort)

**Standard 2025 Pattern** (from Phaser 3 official examples):

```typescript
// Calculate depth based on Y position + visual height offset
sprite.depth = sprite.y + heightOffset;

// For objects with render height (trees, buildings):
// depth = worldY + renderHeight
// This places the "base" of tall objects at correct depth
```

**Reference:** Phaser 3 Examples - `depth sorting/isometric map.js`
- Uses `depth = y + 64` for skeleton sprites
- Uses `depth = centerY + ty` for tilemap tiles
- Updates depth every frame for moving objects

### Occlusion/Alpha Handling

```typescript
// When player is behind an object:
if (playerIsBehindObject(player, object)) {
    object.setAlpha(0.4); // Semi-transparent
} else {
    object.setAlpha(1.0); // Fully opaque
}
```

**Implementation options:**
1. **Per-frame check** (simpler, O(n) with spatial index)
2. **Event-driven** (complex, requires player position subscription)

Recommendation: Per-frame with spatial partitioning (quadtree) for performance.

### Oblique Projection Math

For 45-degree oblique projection (Stardew Valley style):

```typescript
// Screen position from grid coordinates
screenX = (gridX - gridY) * tileWidth / 2 + centerX;
screenY = (gridX + gridY) * tileHeight / 2 + centerY;

// Depth sort key
// Lower on screen = higher depth
// Must account for object's visual height
depth = screenY + (object.renderHeight || 0);
```

**Key difference from isometric:** Oblique uses rectangular tiles (no diamond shape), simpler math.

---

## Performance Considerations

### Current State
Per PROJECT.md: "render loop per frame遍历所有实体，O(n) 复杂度" (iterates all entities, O(n))

### Recommended Optimizations

1. **Spatial Index (Quadtree)**
   - Library: **@timohausmann/quadtree-js** or custom implementation
   - Purpose: Reduce occlusion checks from O(n²) to O(log n)
   - Confidence: MEDIUM (common pattern, not verified with Phaser)

2. **Dirty Flag Depth Updates**
   - Only recalculate depth when objects move
   - Static objects: calculate once at spawn
   - Moving objects: calculate when position changes

3. **Layer-based Batching**
   - Use Phaser's `Layer` to group static tiles
   - Single depth value per layer for terrain
   - Individual depth for dynamic objects (player, NPCs, dropped items)

---

## Visual Pack Integration

Per PROJECT.md requirements (VIS-05), pseudo-3D configuration must be Visual Pack compatible:

```typescript
// Visual Pack schema extension
interface VisualPackPseudo3DConfig {
  objects: {
    [objectId: string]: {
      renderHeight: number;    // Pixel height for depth sorting
      occludable: boolean;     // Can fade when player behind
      occludeAlpha: number;    // Alpha when occluding (0.0-1.0)
      footprintOffset: {       // Where object's "feet" are in sprite
        x: number;
        y: number;
      };
    };
  };
  projection: {
    type: 'oblique' | 'orthogonal';
    angle: number;             // 45 for Stardew-like
    tileWidth: number;
    tileHeight: number;
  };
}
```

---

## Installation

No additional npm packages required. Core implementation uses:

```typescript
// Existing project dependencies (already installed)
import Phaser from 'phaser';

// New internal modules to create:
import { Pseudo3DDepthSorter } from './Pseudo3DDepthSorter';
import { OcclusionManager } from './OcclusionManager';
import { ObliqueProjection } from './ObliqueProjection';
```

Optional performance library (if spatial index needed):
```bash
npm install @timohausmann/quadtree-js
```

---

## Version Confidence

| Technology | Version | Confidence | Verification Source |
|------------|---------|------------|---------------------|
| Phaser | 3.90.0 | HIGH | npm registry, GitHub releases (23 May 2025) |
| phaser3-rex-plugins | 1.80.19+ | HIGH | npm registry, already in project |
| Isometric plugins | N/A | HIGH | GitHub READMEs (explicitly deprecated/WIP) |

---

## Sources

### Official Phaser Documentation
- Phaser 3.90.0 Release Notes (GitHub): https://github.com/phaserjs/phaser/releases
- Phaser 3 Examples - Depth Sorting: https://github.com/phaserjs/examples/tree/master/public/src/depth%20sorting
- Phaser 3 Examples - Isometric: https://github.com/phaserjs/examples/tree/master/public/src/tilemap/isometric

### Plugin Research
- phaser-plugin-isometric (archived): https://github.com/lewster32/phaser-plugin-isometric
- phaser3-plugin-isometric (WIP fork): https://github.com/sebashwa/phaser3-plugin-isometric

### Existing Project Context
- PROJECT.md (requirements VIS-01 through VIS-05)
- codebase/STACK.md (existing Phaser 3.90.0 stack)
- codebase/ARCHITECTURE.md (Visual Pack system, mod architecture)

---

## Research Confidence Summary

| Area | Confidence | Notes |
|------|------------|-------|
| **Core Stack** | HIGH | Phaser 3 native features, verified with examples |
| **Depth Sorting Pattern** | HIGH | Official Phaser examples demonstrate standard |
| **Isometric Plugin Viability** | HIGH | Explicitly deprecated/WIP per maintainers |
| **Oblique vs Isometric** | MEDIUM | Visual analysis, no official Stardew docs found |
| **Performance Optimization** | MEDIUM | Standard gamedev patterns, not Phaser-specific |
| **Visual Pack Schema** | MEDIUM | Inferred from project requirements |

---

## Recommendation for Roadmap

**Phase 1 (VIS-01/VIS-02):** Implement custom Y-sort depth system with Phaser native `depth` property. No new dependencies.

**Phase 2 (VIS-03/VIS-04):** Add occlusion system using `setAlpha()`. Consider spatial index if performance issues arise.

**Phase 3 (VIS-05):** Extend Visual Pack registry schema to include pseudo-3D metadata.

**Avoid:** Third-party isometric plugins. They add complexity without benefit for oblique projection.
