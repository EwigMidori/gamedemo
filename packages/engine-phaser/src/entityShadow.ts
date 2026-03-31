import Phaser from "phaser";
import type { HeightClassification } from "@gamedemo/mod-api";

// =============================================================================
// Shadow Size Configuration
// =============================================================================

/** Shadow dimensions for each height classification */
export interface ShadowSize {
  width: number;
  height: number;
  /** Optional Y offset for tall shadows */
  offsetY?: number;
}

/** Shadow sizes per height classification (flat has no shadow) */
export const SHADOW_SIZES: Record<HeightClassification, ShadowSize | null> = {
  flat: null,           // No shadow for flat objects
  low: { width: 8, height: 3 },
  medium: { width: 12, height: 5 },
  tall: { width: 16, height: 6, offsetY: 2 }  // Slight offset for tall objects
};

/** Default shadow appearance */
export const SHADOW_DEFAULTS = {
  color: 0x000000,
  alpha: 0.4,
  depthOffset: -1  // Render 1 depth unit below entity
} as const;

// =============================================================================
// Entity Shadow Types
// =============================================================================

/**
 * Shadow state attached to an entity.
 * Shadow is positioned at entity base and scales with height.
 */
export interface EntityShadow {
  /** Reference to the shadow sprite */
  sprite: Phaser.GameObjects.Ellipse;
  /** Height classification that determined shadow size */
  heightClassification: HeightClassification;
  /** Shadow dimensions */
  size: ShadowSize;
  /** Entity depth at time of shadow creation (for relative positioning) */
  entityDepth: number;
}

/** Shadow creation options */
export interface ShadowCreationOptions {
  /** Override default shadow color */
  color?: number;
  /** Override default shadow alpha */
  alpha?: number;
  /** Override default depth offset */
  depthOffset?: number;
  /** Custom shadow size override */
  customSize?: ShadowSize;
}

// =============================================================================
// Shadow Creation
// =============================================================================

/**
 * Create a shadow sprite for an entity based on height classification.
 * 
 * @param scene - Phaser scene for sprite creation
 * @param heightClassification - Determines shadow size
 * @param entityDepth - Current depth of the entity (shadow renders below)
 * @param options - Optional overrides for shadow appearance
 * @returns EntityShadow object or null if flat (no shadow needed)
 */
export function createEntityShadow(
  scene: Phaser.Scene,
  heightClassification: HeightClassification,
  entityDepth: number,
  options?: ShadowCreationOptions
): EntityShadow | null {
  // Flat objects don't cast shadows
  if (heightClassification === "flat") {
    return null;
  }
  
  const size = options?.customSize ?? SHADOW_SIZES[heightClassification];
  if (!size) {
    return null;
  }
  
  const color = options?.color ?? SHADOW_DEFAULTS.color;
  const alpha = options?.alpha ?? SHADOW_DEFAULTS.alpha;
  const depthOffset = options?.depthOffset ?? SHADOW_DEFAULTS.depthOffset;
  
  // Create ellipse shadow at origin (position set by caller)
  const shadow = scene.add.ellipse(0, 0, size.width, size.height, color, alpha);
  
  // Set depth to render below entity
  const shadowDepth = entityDepth + depthOffset;
  shadow.setDepth(shadowDepth);
  
  // Store shadow state
  const entityShadow: EntityShadow = {
    sprite: shadow,
    heightClassification,
    size,
    entityDepth
  };
  
  return entityShadow;
}

// =============================================================================
// Shadow Updates
// =============================================================================

/**
 * Update shadow position to match entity position.
 * Shadow is positioned at entity base with optional offset.
 * 
 * @param shadow - EntityShadow to update
 * @param worldX - Entity world X position
 * @param worldY - Entity world Y position (base of sprite)
 */
export function updateShadowPosition(
  shadow: EntityShadow,
  worldX: number,
  worldY: number
): void {
  // Position shadow centered at entity base (worldY is the base/ground position)
  // Ellipse origin is center, so worldY puts shadow center at the base
  shadow.sprite.setPosition(worldX, worldY);
}

/**
 * Update shadow depth when entity depth changes.
 * Maintains shadow below entity by depthOffset.
 * 
 * @param shadow - EntityShadow to update
 * @param entityDepth - New entity depth
 * @param depthOffset - Offset from entity depth (default: -1)
 */
export function updateShadowDepth(
  shadow: EntityShadow,
  entityDepth: number,
  depthOffset: number = SHADOW_DEFAULTS.depthOffset
): void {
  shadow.entityDepth = entityDepth;
  shadow.sprite.setDepth(entityDepth + depthOffset);
}

// =============================================================================
// Shadow Destruction
// =============================================================================

/**
 * Destroy shadow sprite and clean up resources.
 * Call this when entity is removed.
 * 
 * @param shadow - EntityShadow to destroy (can be null)
 */
export function destroyEntityShadow(shadow: EntityShadow | null | undefined): void {
  if (!shadow) {
    return;
  }
  
  shadow.sprite.destroy();
}

// =============================================================================
// Batch Shadow Management
// =============================================================================

/** Shadow configuration for batch creation */
export interface BatchShadowConfig {
  entityId: string;
  heightClassification: HeightClassification;
  worldX: number;
  worldY: number;
  entityDepth: number;
}

/**
 * Create shadows for multiple entities in batch.
 * More efficient than individual createEntityShadow calls.
 * 
 * @param scene - Phaser scene
 * @param configs - Shadow configurations
 * @param options - Optional shadow appearance overrides
 * @returns Map of entityId to EntityShadow (null shadows omitted)
 */
export function createBatchShadows(
  scene: Phaser.Scene,
  configs: BatchShadowConfig[],
  options?: ShadowCreationOptions
): Map<string, EntityShadow> {
  const shadows = new Map<string, EntityShadow>();
  
  for (const config of configs) {
    const shadow = createEntityShadow(
      scene,
      config.heightClassification,
      config.entityDepth,
      options
    );
    
    if (shadow) {
      // Position shadow at entity base
      updateShadowPosition(shadow, config.worldX, config.worldY);
      shadows.set(config.entityId, shadow);
    }
  }
  
  return shadows;
}

/**
 * Update visibility for multiple shadows.
 * Useful for view frustum culling.
 * 
 * @param shadows - Map of shadows to update
 * @param visibleEntityIds - Set of entity IDs that should be visible
 */
export function updateShadowsVisibility(
  shadows: Map<string, EntityShadow>,
  visibleEntityIds: Set<string>
): void {
  for (const [entityId, shadow] of shadows) {
    const shouldBeVisible = visibleEntityIds.has(entityId);
    if (shadow.sprite.visible !== shouldBeVisible) {
      shadow.sprite.setVisible(shouldBeVisible);
    }
  }
}

/**
 * Destroy all shadows in a map.
 * 
 * @param shadows - Map of shadows to destroy
 */
export function destroyAllShadows(
  shadows: Map<string, EntityShadow>
): void {
  for (const shadow of shadows.values()) {
    shadow.sprite.destroy();
  }
  shadows.clear();
}

// =============================================================================
// Shadow Statistics
// =============================================================================

/**
 * Get statistics about shadows.
 */
export function getShadowStats(
  shadows: Map<string, EntityShadow>
): {
  total: number;
  byHeight: Record<HeightClassification, number>;
} {
  const byHeight: Record<HeightClassification, number> = {
    flat: 0,
    low: 0,
    medium: 0,
    tall: 0
  };
  
  for (const shadow of shadows.values()) {
    byHeight[shadow.heightClassification]++;
  }
  
  return {
    total: shadows.size,
    byHeight
  };
}
