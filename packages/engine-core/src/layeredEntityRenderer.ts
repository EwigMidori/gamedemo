// Layered Entity Renderer for Split-Layer Objects
// Handles depth calculation and per-layer occlusion detection

import type { WorldX, WorldY } from "./coordinates";
import type { LayeredEntity, EntityLayer } from "./layeredEntity";
import {
  TYPE_PRIORITY,
  DEPTH_POSITION_MULTIPLIER,
  type EntityType
} from "./depthSorter";

/**
 * Options for layer depth calculation
 */
export interface LayerDepthOptions {
  /** Base X position */
  baseX: WorldX;
  /** Base Y position */
  baseY: WorldY;
  /** Additional depth offset */
  baseOffset?: number;
}

/**
 * Result of layer depth calculation
 */
export interface CalculatedLayer {
  /** The layer that was calculated */
  layer: EntityLayer;
  /** Calculated depth value */
  depth: number;
  /** The Y position this layer occupies for depth sorting */
  worldY: WorldY;
  /** Cumulative height from base to this layer */
  cumulativeHeight: number;
}

/**
 * Renderer for layered entities.
 * Handles depth calculation and occlusion detection per-layer.
 *
 * Key behaviors:
 * - Layers stack upward from base position
 * - Lower layers render first (lower depth)
 * - Upper layers have higher depth values
 * - Each layer can occlude independently
 *
 * Example for a tree (trunk + canopy):
 * ```
 * Layer 0 (trunk): Y = baseY, depth = baseDepth
 * Layer 1 (canopy): Y = baseY - trunkHeight, depth = higher
 * ```
 */
export class LayeredEntityRenderer {
  /**
   * Calculate depth for each layer of a layered entity.
   * Layers stack upward from base position.
   *
   * @param entity - The layered entity
   * @param baseOffset - Additional depth offset
   * @returns Array of calculated layers with depths
   */
  calculateLayerDepths(
    entity: LayeredEntity,
    baseOffset: number = 0
  ): CalculatedLayer[] {
    const results: CalculatedLayer[] = [];
    let currentY = entity.y;
    let cumulativeHeight = 0;

    // Process layers from bottom to top
    for (const layer of entity.layers) {
      // Layer's effective Y is base Y minus cumulative height of layers below
      // This makes upper layers render in front (higher depth value)
      const layerY = (currentY - layer.renderHeight) as WorldY;

      // Depth uses same formula as regular entities
      const depth =
        (layerY + layer.renderHeight) * DEPTH_POSITION_MULTIPLIER +
        TYPE_PRIORITY[entity.type] +
        baseOffset;

      results.push({
        layer,
        depth,
        worldY: layerY,
        cumulativeHeight
      });

      // Move up for next layer
      cumulativeHeight += layer.renderHeight;
      currentY -= layer.renderHeight;
    }

    return results;
  }

  /**
   * Check if a specific layer is occluding a position.
   * Used for per-layer occlusion detection.
   *
   * @param entity - The layered entity
   * @param layerIndex - Index of layer to check
   * @param playerX - Player X position
   * @param playerY - Player Y position
   * @returns True if this layer occludes the player position
   */
  isLayerOccludingPosition(
    entity: LayeredEntity,
    layerIndex: number,
    playerX: WorldX,
    playerY: WorldY
  ): boolean {
    const layer = entity.layers[layerIndex];
    if (!layer || !layer.canOcclude) {
      return false;
    }

    // Calculate cumulative height up to and including this layer
    let layerBaseY = entity.y;
    for (let i = 0; i < layerIndex; i++) {
      layerBaseY -= entity.layers[i].renderHeight;
    }
    const layerTopY = layerBaseY - layer.renderHeight;

    // Player is occluded by this layer if:
    // 1. Player is within entity footprint
    // 2. Player Y is between layer base and layer top
    const withinFootprint = this.isWithinFootprint(entity, playerX, playerY);
    const withinLayerHeight = playerY >= layerTopY && playerY <= layerBaseY;

    return withinFootprint && withinLayerHeight;
  }

  /**
   * Check which layers (if any) are occluding the player.
   * Returns array of layer indices that should fade.
   *
   * @param entity - The layered entity
   * @param playerX - Player X position
   * @param playerY - Player Y position
   * @returns Array of layer indices that should be faded
   */
  getOccludingLayers(
    entity: LayeredEntity,
    playerX: WorldX,
    playerY: WorldY
  ): number[] {
    const occluding: number[] = [];

    for (let i = 0; i < entity.layers.length; i++) {
      if (this.isLayerOccludingPosition(entity, i, playerX, playerY)) {
        occluding.push(i);
      }
    }

    return occluding;
  }

  /**
   * Get total render height (sum of all layers)
   */
  getTotalHeight(entity: LayeredEntity): number {
    return entity.layers.reduce((sum, layer) => sum + layer.renderHeight, 0);
  }

  /**
   * Get the layer at a specific world Y position.
   * Returns layer index or -1 if outside entity bounds.
   *
   * @param entity - The layered entity
   * @param worldY - World Y position to check
   * @returns Layer index or -1
   */
  getLayerAtPosition(entity: LayeredEntity, worldY: WorldY): number {
    let currentY = entity.y;

    for (let i = 0; i < entity.layers.length; i++) {
      const layerTopY = currentY - entity.layers[i].renderHeight;
      if (worldY >= layerTopY && worldY <= currentY) {
        return i;
      }
      currentY = layerTopY;
    }

    return -1;
  }

  /**
   * Calculate which layers should be visible when player is at a position.
   * Useful for determining rendering order when player is inside entity.
   *
   * @param entity - The layered entity
   * @param playerY - Player Y position
   * @returns Object with layer visibility info
   */
  calculateLayerVisibility(
    entity: LayeredEntity,
    playerY: WorldY
  ): { index: number; visible: boolean; fade: boolean }[] {
    const playerLayerIndex = this.getLayerAtPosition(entity, playerY);

    return entity.layers.map((layer, index) => {
      // Layers below player are visible
      // Layer containing player may fade if canOcclude
      // Layers above player are visible
      const visible = true; // All layers are visible by default
      const fade = index === playerLayerIndex && layer.canOcclude;

      return { index, visible, fade };
    });
  }

  /**
   * Update layer sprite positions for visual stacking.
   * Each layer is positioned relative to the base.
   *
   * @param entity - The layered entity
   * @returns Array of {layer, x, y} for each layer
   */
  calculateLayerPositions(
    entity: LayeredEntity
  ): { layer: EntityLayer; x: number; y: number }[] {
    const positions: { layer: EntityLayer; x: number; y: number }[] = [];
    let currentY = entity.y;

    for (const layer of entity.layers) {
      // Position layer at its height
      positions.push({
        layer,
        x: entity.x,
        y: currentY - layer.renderHeight / 2
      });

      currentY -= layer.renderHeight;
    }

    return positions;
  }

  private isWithinFootprint(
    entity: LayeredEntity,
    x: WorldX,
    y: WorldY
  ): boolean {
    return (
      x >= entity.bounds.minX &&
      x <= entity.bounds.maxX &&
      y >= entity.bounds.minY &&
      y <= entity.bounds.maxY
    );
  }
}

/**
 * Utility to create a layered entity from config
 */
export function createLayeredEntity(
  config: import("./layeredEntity").LayeredEntityConfig,
  spriteFactory: (frame: number) => unknown
): LayeredEntity {
  const layers = config.layers.map((layerConfig) => ({
    id: layerConfig.id,
    renderHeight: layerConfig.renderHeight,
    frame: layerConfig.frame,
    canOcclude: layerConfig.canOcclude ?? true,
    depth: 0,
    sprite: spriteFactory(layerConfig.frame)
  }));

  const totalHeight = layers.reduce((sum, l) => sum + l.renderHeight, 0);

  return {
    id: config.id,
    x: config.x,
    y: config.y,
    baseRenderHeight: totalHeight,
    type: config.type,
    layers,
    needsDepthUpdate: true,
    heightClassification: config.heightClassification,
    bounds: {
      minX: config.x,
      minY: config.y,
      maxX: config.x + 16, // Default 1 tile footprint
      maxY: config.y + 16
    }
  };
}
