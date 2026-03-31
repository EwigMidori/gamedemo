# Architecture Patterns: Pseudo-3D Visual Systems

**Domain:** Pseudo-3D 2D Game Rendering (Phaser 3-based)  
**Researched:** 2026-03-31  
**Target Style:** Stardew Valley-like isometric/perspective (non-true-3D)

## Summary

Pseudo-3D rendering systems create the illusion of depth in 2D engines through three core mechanisms: **perspective projection** (tilting the view), **depth sorting** (controlling render order), and **height simulation** (extending objects vertically). In Phaser 3, this requires extending the standard 2D orthographic pipeline with custom sorting and visual effects systems.

This document provides architectural guidance for integrating pseudo-3D features into the existing gamedemo mod-first architecture.

## Recommended Architecture

### High-Level Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                     VISUAL PACK SYSTEM                          │
│                    (Content Metadata Layer)                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Tile Config │  │ Object Config│  │ Occlusion Rules      │  │
│  │  - height    │  │ - renderHeight│  │ - fade triggers      │  │
│  │  - slope     │  │ - footprint   │  │ - outline rules      │  │
│  │  - depthBias │  │ - anchor      │  │ - transparency       │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                   ENGINE SCENE GRAPH LAYER                      │
│              (packages/engine-phaser extension)                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │DepthSorter   │  │RenderPipeline│  │OcclusionManager      │  │
│  │              │  │              │  │                      │  │
│  │- sort order │  │- batch by    │  │- player tracking     │  │
│  │- Z-index    │  │  depth       │  │- effect application  │  │
│  │  calculation│  │- layer       │  │- visual feedback     │  │
│  │              │  │  management  │  │                      │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                    PHASER PRIMITIVES LAYER                      │
│                   (Phaser 3 DisplayList)                        │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Sprites    │  │   Tilemaps   │  │  Containers  │          │
│  │  (entities)  │  │  (terrain)   │  │ (grouping)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **VisualPackRegistry** | Stores visual metadata per content ID | ContentRegistryBuilder, ModInstallContext |
| **DepthSorter** | Calculates render order from world position + height | RenderPipeline, all renderable entities |
| **RenderPipeline** | Manages draw calls and layer composition | Phaser DisplayList, DepthSorter |
| **OcclusionManager** | Detects player-behind-object and applies effects | Player position, all tall objects |
| **HeightPropertySystem** | Associates height values with game objects | Content definitions, Visual packs |
| **TileProjection** | Transforms tile coordinates to pseudo-3D positions | TilemapLayer, Camera |

### Data Flow

```
1. BOOT PHASE (One-time)
   ┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
   │ Mod Install │────▶│ VisualPack      │────▶│ VisualPackRegistry│
   │  Context    │     │ Config Loading  │     │ (frozen at boot) │
   └─────────────┘     └─────────────────┘     └──────────────────┘

2. RENDER PHASE (Per-frame)
   ┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
   │   Camera    │────▶│  DepthSorter    │────▶│  RenderPipeline  │
   │  Position   │     │ (Y-sort +       │     │ (Phaser DisplayList│
   └─────────────┘     │  height-based)  │     │  depth updates)   │
                       └─────────────────┘     └──────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │ OcclusionManager│
                       │ (player check)  │
                       └─────────────────┘

3. INTERACTION PHASE (Event-driven)
   ┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
   │ Player Move │────▶│ OcclusionManager│────▶│ Visual Effects   │
   │   Event     │     │ (spatial query) │     │ (alpha/outline)  │
   └─────────────┘     └─────────────────┘     └──────────────────┘
```

## Depth Sorting Strategy

### Core Algorithm: Y-Position + Height-Based Sorting

In pseudo-3D, objects closer to the bottom of the screen are typically "closer" to the viewer. The depth value calculation:

```typescript
// Standard formula for top-down/angled perspective
depth = (y_position * depth_scale) + (height_offset * height_factor)

// Where:
// - y_position: world Y coordinate (increases downward)
// - depth_scale: large constant to ensure unique depths (e.g., 10000)
// - height_offset: vertical offset from ground (for stacked objects)
// - height_factor: per-pixel height contribution to depth
```

### Phaser 3 Integration

Phaser 3 uses a `DisplayList` that sorts objects by `depth` property before rendering. Integration points:

1. **Update object depths per frame** in the `renderPrepare` system phase
2. **Use `setDepth()`** on all pseudo-3D game objects
3. **Enable depth sorting on containers** when using grouped objects

```typescript
// In Phaser scene
class Pseudo3DScene extends Phaser.Scene {
  update() {
    // Calculate depths for all entities
    this.children.list.forEach(child => {
      if (child.getData('isPseudo3D')) {
        const depth = this.depthSorter.calculateDepth(child);
        child.setDepth(depth);
      }
    });
  }
}
```

### Depth Sorting Rules

| Object Type | Depth Calculation | Notes |
|-------------|-------------------|-------|
| Terrain tiles | `y * scale` | Base layer, no height offset |
| Flat objects | `y * scale + footprint_height` | Consider "bottom" of object |
| Tall objects | `y * scale + (height / 2)` | Center point for occlusion |
| Stacked objects | `base_depth + (stack_index * small_offset)` | Micro-offsets for layering |
| Player | `y * scale + player_height` | Same rules as other entities |

## Occlusion System Architecture

### Player-Behind-Object Detection

```typescript
interface OcclusionCheck {
  // Spatial check: is player behind this object?
  isOccluded(player: Entity, object: TallObject): boolean {
    const playerBounds = player.getBounds();
    const objectBounds = object.getBounds();
    
    // Check horizontal overlap
    const xOverlap = playerBounds.x < objectBounds.right && 
                     playerBounds.right > objectBounds.x;
    
    // Check if player Y is "behind" object Y (considering height)
    const playerBehind = playerBounds.bottom < objectBounds.bottom;
    
    return xOverlap && playerBehind;
  }
}
```

### Visual Effect Application

When occlusion is detected, apply effects to the occluding object:

| Effect | Implementation | Performance |
|--------|---------------|-------------|
| Alpha reduction | `setAlpha(0.4)` | Low - single property |
| Outline highlight | Post-processing shader | Medium - requires FX pipeline |
| Silhouette | `setTint(0x000000)` + alpha | Low - tint property |
| Pattern overlay | RenderTexture mask | Higher - extra draw call |

### Occlusion State Management

```typescript
class OcclusionManager {
  private occludedObjects: Set<GameObject> = new Set();
  
  update(playerPosition: Vector2) {
    // Find all tall objects that could occlude player
    const candidates = this.spatialIndex.query(playerPosition, radius);
    
    const newlyOccluded = candidates.filter(obj => 
      this.isOccludingPlayer(playerPosition, obj) &&
      !this.occludedObjects.has(obj)
    );
    
    const noLongerOccluded = Array.from(this.occludedObjects).filter(obj =>
      !this.isOccludingPlayer(playerPosition, obj)
    );
    
    // Apply effects
    newlyOccluded.forEach(obj => this.applyOcclusionEffect(obj));
    noLongerOccluded.forEach(obj => this.removeOcclusionEffect(obj));
    
    // Update tracking set
    this.occludedObjects = new Set(newlyOccluded);
  }
}
```

## Visual Pack Extension

### Content Metadata Schema

```typescript
interface VisualPackPseudo3DConfig {
  // Per-content-type configuration
  tiles?: {
    [tileId: string]: {
      height: number;        // Visual height in pixels
      slope: 'flat' | 'north' | 'east' | 'south' | 'west'; // For ramps
      depthBias: number;     // Manual depth adjustment
    }
  };
  
  objects?: {
    [objectId: string]: {
      renderHeight: number;  // How tall the sprite appears
      footprint: {          // Collision/ground area
        width: number;
        height: number;
        offsetY: number;    // From sprite bottom
      };
      anchor: {            // Sprite pivot point
        x: number;
        y: number;          // Typically at bottom center for tall objects
      };
      occludesPlayer: boolean;  // Can block player view?
      occlusionEffect: 'fade' | 'outline' | 'silhouette';
    }
  };
  
  // Global settings
  perspective?: {
    angle: number;         // View angle in degrees (0 = top-down, 45 = typical)
    tileHeightRatio: number; // Height/width ratio for tiles
  };
}
```

### Integration with Mod API

```typescript
// New registry for visual packs
interface VisualPackRegistry {
  registerPseudo3DConfig(
    contentId: string, 
    config: Pseudo3DObjectConfig
  ): void;
  
  getRenderHeight(contentId: string): number;
  getFootprint(contentId: string): BoundingBox;
  getOcclusionConfig(contentId: string): OcclusionConfig;
}

// Extended ModInstallContext
interface ExtendedModContext extends ModInstallContext {
  visualPacks: VisualPackRegistry;
}
```

## Build Order Implications

Based on component dependencies:

```
Phase 1: Foundation (Weeks 1-2)
├── HeightPropertySystem
│   └── Depends on: ContentRegistryBuilder
│   └── Enables: All other pseudo-3D features
├── VisualPackRegistry
│   └── Depends on: ModInstallContext
│   └── Enables: Mod configurability
└── Depth calculation utilities
    └── Pure functions, no dependencies

Phase 2: Core Rendering (Weeks 3-4)
├── DepthSorter
│   └── Depends on: HeightPropertySystem
│   └── Depends on: Camera system
├── TileProjection (if implementing angled tiles)
│   └── Depends on: TilemapLayer
│   └── Optional: Can use flat tiles with Y-sort only
└── RenderPipeline modifications
    └── Depends on: DepthSorter
    └── Integrates with: Phaser DisplayList

Phase 3: Effects (Week 5)
├── OcclusionManager
│   └── Depends on: DepthSorter (for tall object query)
│   └── Depends on: Player positioning system
│   └── Depends on: VisualPackRegistry (for effect config)
└── Visual effect implementations
    └── Depends on: Phaser FX pipeline or custom shaders

Phase 4: Polish (Week 6)
├── Visual Pack content creation
│   └── Depends on: All systems functional
├── Performance optimization
│   └── Spatial indexing for occlusion queries
│   └── Render culling improvements
└── Mod API documentation
```

## Patterns to Follow

### Pattern 1: Height-Aware Entity Wrapper

**What:** Wrap game entities with a component that exposes height/footprint data

**When:** Every renderable object in the pseudo-3D world

**Example:**
```typescript
class Pseudo3DEntity {
  constructor(
    private sprite: Phaser.GameObjects.Sprite,
    private config: Pseudo3DConfig
  ) {
    // Set origin to bottom-center for proper positioning
    sprite.setOrigin(0.5, 1);
  }
  
  getRenderDepth(): number {
    const baseY = this.sprite.y;
    const heightOffset = this.config.renderHeight * 0.5;
    return (baseY * DEPTH_SCALE) + heightOffset;
  }
  
  getFootprintBounds(): Rectangle {
    // Return ground-level collision area
    return {
      x: this.sprite.x - this.config.footprint.width / 2,
      y: this.sprite.y - this.config.footprint.height,
      width: this.config.footprint.width,
      height: this.config.footprint.height
    };
  }
}
```

### Pattern 2: Spatial Index for Occlusion

**What:** Use a grid or R-tree to quickly find potentially occluding objects

**When:** When occlusion checks become expensive with many entities

**Benefits:**
- Reduces O(n) player-to-all-objects checks to O(k) where k = nearby objects
- Phaser has RTree implementation in `Phaser.Structs.RTree`

### Pattern 3: Deferred Depth Sorting

**What:** Sort objects by depth only when needed (camera moves, objects move)

**When:** Performance optimization when few objects move per frame

**Implementation:**
```typescript
class DepthSorter {
  private isDirty = true;
  
  markDirty() { this.isDirty = true; }
  
  sortIfNeeded(objects: GameObject[]) {
    if (!this.isDirty) return;
    
    objects.sort((a, b) => a.depth - b.depth);
    this.isDirty = false;
  }
  
  // Call markDirty() when:
  // - Any object moves
  // - Camera moves significantly
  // - New objects added/removed
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Per-Pixel Depth Sorting

**What:** Calculating depth based on every pixel or tile of an object

**Why bad:** Massive performance hit, negligible visual improvement

**Instead:** Use single depth value per object (center point or bottom edge)

### Anti-Pattern 2: Real-Time Z-Index Changes

**What:** Changing `depth` property multiple times per frame

**Why bad:** Triggers Phaser's internal resort, O(n log n) cost

**Instead:** Calculate all depths first, apply in batch; or use `setDepth()` once per object per frame

### Anti-Pattern 3: Occlusion Without Spatial Index

**What:** Checking every tall object against player every frame

**Why bad:** O(n) per frame, becomes bottleneck at 100+ objects

**Instead:** Use RTree or spatial hash for O(log n) or O(1) queries

### Anti-Pattern 4: Mixing 2D and Pseudo-3D Coordinates

**What:** Using screen coordinates for depth calculations

**Why bad:** Breaks when camera moves, zooms, or rotates

**Instead:** Always use world coordinates for depth, convert to screen only for rendering

## Integration with Existing Architecture

### Engine Phaser Package (`packages/engine-phaser/`)

**Current:** `gameViewport.ts` renders entities by type in fixed order

**Extension Points:**

1. **Replace fixed rendering order** with depth-sorted rendering:
```typescript
// Current (inferred from description)
renderOrder: ['terrain', 'resources', 'buildings', 'items', 'player']

// Proposed
renderOrder: 'depth-sorted' // All entities in single sorted list
```

2. **Add Pseudo3DSystem** alongside existing systems:
```typescript
// In runtime system phases
systems: [
  { name: 'input', phase: 'preUpdate' },
  { name: 'simulation', phase: 'simulation' },
  { name: 'pseudo3d', phase: 'renderPrepare' },  // NEW
  { name: 'render', phase: 'render' }
]
```

### Mod API Extension (`packages/mod-api/`)

**New Registry:** `VisualPackRegistry`

```typescript
// Registration interface
interface VisualPackRegistrar {
  registerTileHeight(tileId: string, height: number, slope?: SlopeType): void;
  registerObjectHeight(objectId: string, renderHeight: number, footprint: Box): void;
  registerOcclusionEffect(objectId: string, effect: OcclusionEffectType): void;
}

// Add to ModInstallContext
interface ModInstallContext {
  // ... existing registries
  visualPacks: VisualPackRegistrar;
}
```

### Runtime Integration (`packages/engine-runtime/`)

**New System:** `Pseudo3DSystem`

```typescript
class Pseudo3DSystem implements RuntimeSystem {
  readonly phase = 'renderPrepare';
  
  constructor(
    private depthSorter: DepthSorter,
    private occlusionManager: OcclusionManager,
    private visualPackRegistry: VisualPackRegistry
  ) {}
  
  tick(context: RuntimeSystemContext): void {
    // Update all renderable entity depths
    const entities = this.getAllRenderableEntities(context.state);
    
    entities.forEach(entity => {
      const depth = this.depthSorter.calculateDepth(entity);
      entity.setDepth(depth);
    });
    
    // Check and apply occlusion effects
    const player = this.getPlayerEntity(context.state);
    this.occlusionManager.update(player.position);
  }
}
```

## Scalability Considerations

| Concern | At 100 objects | At 1K objects | At 10K objects |
|---------|---------------|---------------|----------------|
| Depth sorting | `Array.sort()` - fine | `Array.sort()` - acceptable | Spatial partition + partial sort |
| Occlusion checks | O(n) brute force | RTree spatial index | Grid-based spatial hash |
| Visual effects | Direct alpha changes | Batch FX updates | Shader-based global effect |
| Render culling | None needed | Frustum culling | LOD + distance culling |

## Sources

- **HIGH Confidence:** Phaser 3 API Documentation (v3.90.0) - Official depth component and IsoBox/IsoTriangle shapes
- **HIGH Confidence:** MDN Tilemaps Guide - Isometric rendering fundamentals and depth sorting concepts
- **HIGH Confidence:** Red Blob Games Grid Guide - Spatial coordinate systems and relationships
- **MEDIUM Confidence:** Stardew Valley visual analysis and community documentation
- **RFC-0016** (Internal): Project's own Pseudo-3D 2D Visual Architecture RFC

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Phaser 3 Integration | HIGH | Based on official API docs and Shape components |
| Depth Sorting Algorithms | HIGH | Well-established Y-sort pattern in 2D games |
| Occlusion System | MEDIUM | Established pattern, implementation details vary |
| Visual Pack Schema | MEDIUM | Based on project RFC, needs validation |
| Performance at Scale | MEDIUM | Projections based on standard techniques |

## Open Questions

1. **Exact projection angle:** Will the project use 45-degree isometric or a shallower angle like Stardew Valley's ~30 degrees?
2. **Tile-based vs. freeform:** Are objects strictly tile-aligned or can they have sub-tile positions?
3. **Multi-tile objects:** How to handle buildings that span multiple tiles with different heights?
4. **Visual Pack format:** JSON schema needs refinement based on mod author feedback

---

*Research completed: 2026-03-31*  
*Next step: Detailed design of specific components based on this architecture*
