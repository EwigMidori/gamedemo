// Occlusion Manager for Pseudo-3D Rendering
// Detects when player is behind tall objects and manages occlusion state

import type { WorldX, WorldY } from "./coordinates";
import type { EntitySprite } from "./depthSorter";

// =============================================================================
// Height Classification System
// =============================================================================

/**
 * Height classification for pseudo-3D entities
 * Drives shadow rendering, occlusion behavior, and visual treatment
 */
export type HeightClassification = "flat" | "low" | "medium" | "tall";

/**
 * Height classification configuration
 * Defines behavior for each height class
 */
export interface HeightClassificationConfig {
  maxHeight: number;
  canOcclude: boolean | "configurable";
  shadowSize: "none" | "small" | "medium" | "large";
}

/**
 * Height classification constants per OCC-05 requirement
 */
export const HeightClassifications: Record<HeightClassification, HeightClassificationConfig> = {
  flat: { maxHeight: 0, canOcclude: false, shadowSize: "none" },
  low: { maxHeight: 16, canOcclude: false, shadowSize: "small" },
  medium: { maxHeight: 32, canOcclude: "configurable", shadowSize: "medium" },
  tall: { maxHeight: Infinity, canOcclude: true, shadowSize: "large" }
};

/**
 * Classify render height into height category
 * @param renderHeight - Visual height in pixels
 * @returns Height classification
 */
export function classifyHeight(renderHeight: number): HeightClassification {
  if (renderHeight <= 0) return "flat";
  if (renderHeight < 16) return "low";
  if (renderHeight < 32) return "medium";
  return "tall";
}

/**
 * Determine if an entity should occlude the player based on classification
 * @param classification - Height classification
 * @param explicitCanOcclude - Explicit override (for "medium" classification)
 * @returns Whether entity can occlude player
 */
export function shouldOccludePlayer(
  classification: HeightClassification,
  explicitCanOcclude?: boolean
): boolean {
  const config = HeightClassifications[classification];
  
  if (config.canOcclude === true) return true;
  if (config.canOcclude === false) return false;
  // configurable: use explicit or default to false
  return explicitCanOcclude ?? false;
}

// =============================================================================
// Occlusion State Types
// =============================================================================

/**
 * Tracks which entities are currently occluding the player
 */
export interface OcclusionState {
  /** Set of entity IDs that are occluding the player */
  occludedEntityIds: Set<string>;
  /** Map of entity ID to layer indices that should fade (for layered entities) */
  occludedLayers: Map<string, number[]>;
  /** Timestamp of last occlusion check */
  lastCheckTime: number;
  /** Frame counter for interval-based checks */
  frameCount: number;
}

/**
 * Result of an occlusion check
 */
export interface OcclusionCheckResult {
  /** Entity IDs that are occluding the player */
  occludedEntities: string[];
  /** Map of entity ID to layer indices that should fade */
  occludedLayers: Map<string, number[]>;
  /** Time taken for the check in milliseconds */
  checkTimeMs: number;
}

/**
 * Configuration options for OcclusionManager
 */
export interface OcclusionManagerOptions {
  /** Check occlusion every N frames (default: 2) */
  checkInterval?: number;
  /** Target alpha when occluded (0.0-1.0, default: 0.4) */
  targetAlpha?: number;
  /** Fade duration in milliseconds (default: 250) */
  fadeDurationMs?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

/**
 * Extended EntitySprite with occlusion metadata
 */
export interface OccludableEntity extends EntitySprite {
  /** Whether this entity can occlude the player */
  canOccludePlayer: boolean;
  /** Height classification */
  heightClassification: HeightClassification;
  /** Entity footprint in tiles */
  footprint: {
    widthTiles: number;
    depthTiles: number;
  };
  /** Target alpha when occluding (overrides global default) */
  occlusionAlpha?: number;
}

// =============================================================================
// OcclusionManager Class
// =============================================================================

/**
 * Manages player occlusion detection for pseudo-3D rendering.
 * 
 * Detects when the player is behind tall objects and tracks which
 * entities should be faded to reveal the player.
 * 
 * Key features:
 * - Frame-skipping for performance (checks every N frames)
 * - Spatial bounds checking for efficient detection
 * - Support for both single entities and layered entities
 * - O(1) lookup for occlusion state
 */
export class OcclusionManager {
  private readonly options: Required<OcclusionManagerOptions>;
  private readonly state: OcclusionState;

  constructor(options: OcclusionManagerOptions = {}) {
    this.options = {
      checkInterval: options.checkInterval ?? 2,
      targetAlpha: options.targetAlpha ?? 0.4,
      fadeDurationMs: options.fadeDurationMs ?? 250,
      debug: options.debug ?? false
    };

    this.state = {
      occludedEntityIds: new Set(),
      occludedLayers: new Map(),
      lastCheckTime: 0,
      frameCount: 0
    };
  }

  /**
   * Check if occlusion should be evaluated this frame
   * @returns true if this frame should run occlusion check
   */
  shouldCheckThisFrame(): boolean {
    return this.state.frameCount % this.options.checkInterval === 0;
  }

  /**
   * Perform occlusion check for all entities against player position
   * 
   * Detection algorithm:
   * 1. Filter to entities with canOccludePlayer=true
   * 2. Check if player is within entity footprint
   * 3. Check if player is "behind" the entity (player Y < entity Y + renderHeight)
   * 
   * @param playerX - Player world X position
   * @param playerY - Player world Y position
   * @param entities - Map of all entities to check
   * @returns Occlusion check result
   */
  checkOcclusion(
    playerX: WorldX,
    playerY: WorldY,
    entities: Map<string, OccludableEntity>
  ): OcclusionCheckResult {
    const startTime = performance.now();
    this.state.frameCount++;

    // Skip if not this frame's turn (but still increment frame count)
    if (!this.shouldCheckThisFrame()) {
      return {
        occludedEntities: [...this.state.occludedEntityIds],
        occludedLayers: new Map(this.state.occludedLayers),
        checkTimeMs: 0
      };
    }

    // Clear previous state
    this.state.occludedEntityIds.clear();
    this.state.occludedLayers.clear();

    // Check each entity
    for (const [id, entity] of entities) {
      if (this.isEntityOccludingPlayer(entity, playerX, playerY)) {
        this.state.occludedEntityIds.add(id);
        
        if (this.options.debug) {
          console.log(`[Occlusion] Entity ${id} is occluding player at (${playerX}, ${playerY})`);
        }
      }
    }

    const checkTimeMs = performance.now() - startTime;
    this.state.lastCheckTime = startTime;

    if (this.options.debug && checkTimeMs > 0.1) {
      console.warn(`[Occlusion] Check took ${checkTimeMs.toFixed(3)}ms (target: <0.1ms)`);
    }

    return {
      occludedEntities: [...this.state.occludedEntityIds],
      occludedLayers: new Map(this.state.occludedLayers),
      checkTimeMs
    };
  }

  /**
   * Check if a specific entity is currently occluding the player
   * @param entityId - Entity ID to check
   * @returns true if entity is occluding
   */
  isEntityOccluding(entityId: string): boolean {
    return this.state.occludedEntityIds.has(entityId);
  }

  /**
   * Get all entities currently occluding the player
   * @returns Array of occluding entity IDs
   */
  getOccludedEntities(): string[] {
    return [...this.state.occludedEntityIds];
  }

  /**
   * Get which layers of an entity should fade (for layered entities)
   * @param entityId - Entity ID to check
   * @returns Array of layer indices that should fade, or empty array
   */
  getOccludedLayers(entityId: string): number[] {
    return this.state.occludedLayers.get(entityId) ?? [];
  }

  /**
   * Check if a specific layer of a layered entity is occluded
   * @param entityId - Entity ID
   * @param layerIndex - Layer index to check
   * @returns true if layer should fade
   */
  isLayerOccluded(entityId: string, layerIndex: number): boolean {
    const layers = this.state.occludedLayers.get(entityId);
    return layers?.includes(layerIndex) ?? false;
  }

  /**
   * Get the target alpha for occluded entities
   * @returns Alpha value (0.0-1.0)
   */
  getTargetAlpha(): number {
    return this.options.targetAlpha;
  }

  /**
   * Get the fade duration in milliseconds
   * @returns Duration in ms
   */
  getFadeDurationMs(): number {
    return this.options.fadeDurationMs;
  }

  /**
   * Get current occlusion state (for serialization/debugging)
   * @returns Current state
   */
  getState(): Readonly<OcclusionState> {
    return this.state;
  }

  /**
   * Clear all occlusion state
   */
  clear(): void {
    this.state.occludedEntityIds.clear();
    this.state.occludedLayers.clear();
    this.state.frameCount = 0;
    this.state.lastCheckTime = 0;
  }

  /**
   * Core occlusion detection logic
   * 
   * Player is occluded by entity E if:
   * 1. E.canOccludePlayer === true
   * 2. Player X is within E's footprint (E.x to E.x + width)
   * 3. Player Y is within E's footprint (E.y to E.y + depth)
   * 4. Player Y < E.y (player is "behind"/above the entity in screen space)
   * 
   * Note: In screen coordinates, smaller Y is "up" (behind), larger Y is "down" (in front)
   */
  private isEntityOccludingPlayer(
    entity: OccludableEntity,
    playerX: WorldX,
    playerY: WorldY
  ): boolean {
    // Must be able to occlude
    if (!entity.canOccludePlayer) {
      return false;
    }

    const tileSize = 16; // Standard tile size in pixels
    const footprintWidth = entity.footprint.widthTiles * tileSize;
    const footprintDepth = entity.footprint.depthTiles * tileSize;

    // Check if player is within entity footprint
    const withinX = playerX >= entity.x && playerX <= entity.x + footprintWidth;
    const withinY = playerY >= entity.y - footprintDepth && playerY <= entity.y;

    // Player is occluded if within footprint AND behind the entity
    // (player Y < entity Y means player is "above" the entity in screen space)
    const isBehind = playerY < entity.y;

    return withinX && withinY && isBehind;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Create an occludable entity from a base EntitySprite
 * @param base - Base entity sprite
 * @param visualPack - Visual pack metadata with occlusion config
 * @returns Occludable entity
 */
export function createOccludableEntity(
  base: EntitySprite,
  visualPack: {
    heightClassification?: HeightClassification;
    canOccludePlayer?: boolean;
    footprint?: { widthTiles: number; depthTiles: number };
    occlusionAlpha?: number;
  }
): OccludableEntity {
  const classification = visualPack.heightClassification ?? classifyHeight(base.renderHeight);
  const canOcclude = shouldOccludePlayer(classification, visualPack.canOccludePlayer);

  return {
    ...base,
    canOccludePlayer: canOcclude,
    heightClassification: classification,
    footprint: visualPack.footprint ?? { widthTiles: 1, depthTiles: 1 },
    occlusionAlpha: visualPack.occlusionAlpha
  };
}

/**
 * Validate height classification configuration
 * Logs warnings for common misconfigurations
 * @param entityId - Entity ID for logging
 * @param classification - Height classification
 * @param canOccludePlayer - Explicit canOcclude value
 */
export function validateHeightClassification(
  entityId: string,
  classification: HeightClassification,
  canOccludePlayer?: boolean
): void {
  // Tall objects should occlude by default
  if (classification === "tall" && canOccludePlayer === false) {
    console.warn(
      `[Occlusion] Tall object ${entityId} has canOccludePlayer=false - this is likely an error`
    );
  }

  // Flat/low objects shouldn't occlude
  if ((classification === "flat" || classification === "low") && canOccludePlayer === true) {
    console.warn(
      `[Occlusion] ${classification} object ${entityId} has canOccludePlayer=true - this is likely an error`
    );
  }
}
