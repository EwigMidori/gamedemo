// Pseudo-3D Depth Sorting System
// Manages entity depth for proper occlusion in pseudo-3D rendering
//
// Formula: depth = (y + renderHeight) * MULTIPLIER + typePriority
//
// This ensures:
// - Objects with higher Y (lower on screen) render on top
// - Tall objects properly occlude smaller objects behind them
// - Type priority prevents z-fighting for overlapping objects

import type { WorldX, WorldY } from "./coordinates";

// =============================================================================
// Entity Type Definitions
// =============================================================================

/**
 * Entity type for pseudo-3D depth sorting classification
 * Used to determine type priority when objects overlap at similar depths
 */
export type EntityType = "terrain" | "resource" | "planted" | "structure" | "drop" | "player";

/**
 * Entity type constants for type-safe references
 */
export const EntityTypes = {
  TERRAIN: "terrain" as const,
  RESOURCE: "resource" as const,
  PLANTED: "planted" as const,
  STRUCTURE: "structure" as const,
  DROP: "drop" as const,
  PLAYER: "player" as const
};

// =============================================================================
// Type Priority Constants
// =============================================================================

/**
 * Type priority values for depth calculation tiebreaking.
 * Lower values render behind higher values when at similar positions.
 * 
 * Priority order (back to front):
 * - terrain: 0.0 (ground layer)
 * - resource/planted: 1.0 (world objects on ground)
 * - structure: 2.0 (buildings)
 * - drop: 3.0 (items on ground, above structures)
 * - player: 4.0 (always on top)
 */
export const TYPE_PRIORITY: Record<EntityType, number> = {
  terrain: 0.0,
  resource: 1.0,
  planted: 1.0,  // Same as resource (both are world objects)
  structure: 2.0,
  drop: 3.0,     // Drops render above structures
  player: 4.0    // Player renders on top
};

/**
 * Multiplier to ensure position dominates over type priority in depth calculation.
 * With multiplier 1000, an object 1 pixel higher will render behind regardless of type.
 */
export const DEPTH_POSITION_MULTIPLIER = 1000;

// =============================================================================
// Entity Sprite Interface
// =============================================================================

/**
 * Represents a renderable entity with depth tracking for pseudo-3D sorting.
 * Combines gameplay state with rendering metadata.
 */
export interface EntitySprite {
  /** Unique entity ID (matches SpatialIndex pattern) */
  id: string;
  
  /** Entity type for priority calculation */
  type: EntityType;
  
  /** World position X (pixels) */
  x: WorldX;
  
  /** World position Y (pixels) */
  y: WorldY;
  
  /** Reference to renderer-specific sprite object (optional during creation) */
  sprite?: unknown;
  
  /** Last calculated depth value */
  lastCalculatedDepth?: number;
  
  /** Whether depth needs recalculation (dirty flag optimization) */
  needsDepthUpdate: boolean;
  
  /** Visual pack content ID for height lookup */
  contentId?: string;
  
  /** Cached render height in pixels (from VisualPackMetadata) */
  renderHeight: number;
}

// =============================================================================
// Depth Calculation Options
// =============================================================================

/**
 * Options for customizing depth calculation
 */
export interface DepthCalculationOptions {
  /** Custom type priority override */
  typePriority?: number;
  
  /** Additional depth offset for special cases */
  depthOffset?: number;
}

// =============================================================================
// Depth Calculation Functions
// =============================================================================

/**
 * Calculate pseudo-3D depth value using Y+height algorithm.
 * 
 * Formula: depth = (y + renderHeight) * MULTIPLIER + typePriority
 * 
 * This ensures:
 * - Objects with higher Y (lower on screen) render on top
 * - Tall objects properly occlude smaller objects behind them
 * - Type priority prevents z-fighting for overlapping objects at same depth
 * 
 * @param y - World Y position (pixels)
 * @param renderHeight - Visual height in pixels (from VisualPackMetadata)
 * @param type - Entity type for priority calculation
 * @param options - Optional overrides
 * @returns Calculated depth value (higher = rendered on top)
 */
export function calculateDepth(
  y: number,
  renderHeight: number,
  type: EntityType,
  options?: DepthCalculationOptions
): number {
  const typePriority = options?.typePriority ?? TYPE_PRIORITY[type];
  const baseDepth = y + renderHeight;
  const depthOffset = options?.depthOffset ?? 0;
  
  return baseDepth * DEPTH_POSITION_MULTIPLIER + typePriority + depthOffset;
}

/**
 * Calculate depth for an EntitySprite.
 * Updates entity.lastCalculatedDepth and clears needsDepthUpdate flag.
 * 
 * @param entity - Entity to calculate depth for
 * @param options - Optional overrides
 * @returns Calculated depth value
 */
export function calculateEntityDepth(
  entity: EntitySprite,
  options?: DepthCalculationOptions
): number {
  const depth = calculateDepth(
    entity.y,
    entity.renderHeight,
    entity.type,
    options
  );
  
  entity.lastCalculatedDepth = depth;
  entity.needsDepthUpdate = false;
  
  return depth;
}

/**
 * Calculate depths for multiple entities.
 * Efficient batch processing for initial world load.
 * 
 * @param entities - Array of entities to process
 * @param options - Optional overrides applied to all entities
 * @returns Map of entity IDs to calculated depths
 */
export function calculateBatchDepths(
  entities: EntitySprite[],
  options?: DepthCalculationOptions
): Map<string, number> {
  const depths = new Map<string, number>();
  
  for (const entity of entities) {
    const depth = calculateEntityDepth(entity, options);
    depths.set(entity.id, depth);
  }
  
  return depths;
}

// =============================================================================
// Pseudo3DDepthSorter Class
// =============================================================================

/**
 * Manages entity depth sorting for pseudo-3D rendering.
 * 
 * Maintains entity registry and provides efficient depth updates
 * with dirty-flag optimization (only recalculate when positions change).
 * 
 * Key features:
 * - O(1) entity registration/unregistration
 * - O(n log n) sorted retrieval (cached until invalidated)
 * - Dirty-flag optimization skips unchanged entities
 * - Statistics tracking for performance monitoring
 */
export class Pseudo3DDepthSorter {
  /** Entity registry keyed by entity ID */
  private readonly entities = new Map<string, EntitySprite>();
  
  /** Cached sorted order (invalidated when depths change) */
  private sortedCache: EntitySprite[] | null = null;
  
  /** Statistics for performance monitoring */
  private updateCount = 0;
  private skipCount = 0;
  
  /**
   * Register a new entity for depth tracking.
   * Entity will have its depth calculated on next update().
   * 
   * @param entity - Entity to register
   */
  register(entity: EntitySprite): void {
    if (this.entities.has(entity.id)) {
      console.warn(`[Pseudo3DDepthSorter] Duplicate entity ID: ${entity.id}`);
      return;
    }
    
    // Mark for immediate depth calculation
    entity.needsDepthUpdate = true;
    this.entities.set(entity.id, entity);
    this.sortedCache = null; // Invalidate cache
  }
  
  /**
   * Remove an entity from depth tracking.
   * 
   * @param entityId - ID of entity to remove
   */
  unregister(entityId: string): void {
    this.entities.delete(entityId);
    this.sortedCache = null; // Invalidate cache
  }
  
  /**
   * Mark an entity's depth as needing recalculation.
   * Call this when entity position or height changes.
   * 
   * @param entityId - ID of entity to mark dirty
   */
  markDirty(entityId: string): void {
    const entity = this.entities.get(entityId);
    if (entity) {
      entity.needsDepthUpdate = true;
      this.sortedCache = null; // Invalidate cache
    }
  }
  
  /**
   * Mark all entities as needing depth recalculation.
   * Use sparingly - prefer markDirty() for individual changes.
   */
  markAllDirty(): void {
    for (const entity of this.entities.values()) {
      entity.needsDepthUpdate = true;
    }
    this.sortedCache = null;
  }
  
  /**
   * Update depths for all dirty entities.
   * Returns count of updated entities.
   * 
   * @returns Number of entities updated
   */
  update(): number {
    let updated = 0;
    
    for (const entity of this.entities.values()) {
      if (entity.needsDepthUpdate) {
        calculateEntityDepth(entity);
        updated++;
        this.updateCount++;
      } else {
        this.skipCount++;
      }
    }
    
    if (updated > 0) {
      this.sortedCache = null; // Invalidate on any update
    }
    
    return updated;
  }
  
  /**
   * Get entities sorted by depth (back to front).
   * Cache is invalidated automatically when depths change.
   * 
   * @returns Readonly array of entities sorted by depth
   */
  getSorted(): ReadonlyArray<EntitySprite> {
    if (this.sortedCache === null) {
      this.sortedCache = [...this.entities.values()].sort((a, b) => {
        const depthA = a.lastCalculatedDepth ?? -Infinity;
        const depthB = b.lastCalculatedDepth ?? -Infinity;
        return depthA - depthB; // Ascending: back to front
      });
    }
    
    return this.sortedCache;
  }
  
  /**
   * Get entity by ID.
   * 
   * @param entityId - Entity ID to look up
   * @returns Entity or undefined if not found
   */
  get(entityId: string): EntitySprite | undefined {
    return this.entities.get(entityId);
  }
  
  /**
   * Check if entity is registered.
   * 
   * @param entityId - Entity ID to check
   * @returns True if entity is registered
   */
  has(entityId: string): boolean {
    return this.entities.has(entityId);
  }
  
  /**
   * Get all registered entities.
   * 
   * @returns Readonly array of all entities
   */
  getAll(): ReadonlyArray<EntitySprite> {
    return [...this.entities.values()];
  }
  
  /**
   * Get count of registered entities.
   */
  get count(): number {
    return this.entities.size;
  }
  
  /**
   * Get performance statistics.
   * 
   * @returns Statistics object with updateCount, skipCount, and entityCount
   */
  getStats(): { updateCount: number; skipCount: number; entityCount: number } {
    return {
      updateCount: this.updateCount,
      skipCount: this.skipCount,
      entityCount: this.entities.size
    };
  }
  
  /**
   * Clear all entities and reset statistics.
   */
  clear(): void {
    this.entities.clear();
    this.sortedCache = null;
    this.updateCount = 0;
    this.skipCount = 0;
  }
}
