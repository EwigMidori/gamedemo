// Layered Entity Types for Split-Layer Rendering
// Enables entities like trees to have separate trunk and canopy layers

import type { WorldX, WorldY } from "./coordinates";
import type { EntityType } from "./depthSorter";

/**
 * Individual layer within a layered entity.
 * Each layer renders independently with its own depth and can have
 * different occlusion behavior.
 *
 * Example: A tree has trunk layer (bottom, doesn't occlude) and
 * canopy layer (top, does occlude when player behind).
 */
export interface EntityLayer {
  /** Layer identifier (e.g., "trunk", "canopy") */
  id: string;
  /** Visual height of this layer in pixels */
  renderHeight: number;
  /** Sprite frame index for this layer */
  frame: number;
  /** Whether this layer can occlude the player */
  canOcclude: boolean;
  /** Calculated depth value for rendering order */
  depth: number;
  /** Framework-agnostic sprite reference (Phaser.Image in practice) */
  sprite: unknown;
}

/**
 * Layered entity extending base entity concept.
 * Backward compatible: if layers is undefined/empty, renders as single entity.
 *
 * Used for complex objects like trees where the player can walk
 * "through" the object (between trunk and canopy layers).
 */
export interface LayeredEntity {
  /** Unique entity identifier */
  id: string;
  /** World X position (base of entity) */
  x: WorldX;
  /** World Y position (base of entity) */
  y: WorldY;
  /** Total render height (sum of all layer heights) */
  baseRenderHeight: number;
  /** Entity type for depth sorting priority */
  type: EntityType;
  /** Array of layers from bottom to top */
  layers: EntityLayer[];
  /** Whether depth needs recalculation */
  needsDepthUpdate: boolean;
  /** Height classification for shadow/occlusion defaults */
  heightClassification?: "flat" | "low" | "medium" | "tall";

  /** Cached bounds for occlusion detection */
  bounds: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  };
}

/**
 * Configuration for creating a layered entity
 */
export interface LayeredEntityConfig {
  /** Unique entity identifier */
  id: string;
  /** World X position */
  x: WorldX;
  /** World Y position */
  y: WorldY;
  /** Entity type */
  type: EntityType;
  /** Height classification */
  heightClassification?: "flat" | "low" | "medium" | "tall";
  /** Layer definitions */
  layers: LayerConfig[];
}

/**
 * Configuration for a single layer
 */
export interface LayerConfig {
  /** Layer identifier */
  id: string;
  /** Visual height in pixels */
  renderHeight: number;
  /** Sprite frame index */
  frame: number;
  /** Whether this layer can occlude (default: true for top layers) */
  canOcclude?: boolean;
}

/**
 * Type guard to check if an entity is layered.
 * Returns true if entity has a non-empty layers array.
 */
export function isLayeredEntity(entity: unknown): entity is LayeredEntity {
  return (
    entity != null &&
    typeof entity === "object" &&
    "layers" in entity &&
    Array.isArray((entity as LayeredEntity).layers) &&
    (entity as LayeredEntity).layers.length > 0
  );
}

/**
 * Calculate total height of all layers
 */
export function getTotalLayerHeight(entity: LayeredEntity): number {
  return entity.layers.reduce((sum, layer) => sum + layer.renderHeight, 0);
}

/**
 * Get layer at a specific index from bottom (0 = bottom layer)
 */
export function getLayerAtIndex(
  entity: LayeredEntity,
  index: number
): EntityLayer | undefined {
  // index 0 = bottom layer, index layers.length-1 = top layer
  if (index < 0 || index >= entity.layers.length) {
    return undefined;
  }
  return entity.layers[index];
}

/**
 * Get top-most layer
 */
export function getTopLayer(entity: LayeredEntity): EntityLayer | undefined {
  return entity.layers.length > 0
    ? entity.layers[entity.layers.length - 1]
    : undefined;
}

/**
 * Get bottom-most layer
 */
export function getBottomLayer(entity: LayeredEntity): EntityLayer | undefined {
  return entity.layers.length > 0 ? entity.layers[0] : undefined;
}

/**
 * Check if any layer in the entity can occlude
 */
export function canEntityOcclude(entity: LayeredEntity): boolean {
  return entity.layers.some((layer) => layer.canOcclude);
}

/**
 * Get layer indices that can occlude
 */
export function getOccludingLayerIndices(entity: LayeredEntity): number[] {
  return entity.layers
    .map((layer, index) => (layer.canOcclude ? index : -1))
    .filter((index) => index !== -1);
}

/**
 * Create default layer config for a single-layer entity
 * Useful for backward compatibility
 */
export function createSingleLayerConfig(
  frame: number,
  renderHeight: number,
  canOcclude: boolean
): LayerConfig {
  return {
    id: "main",
    frame,
    renderHeight,
    canOcclude
  };
}
