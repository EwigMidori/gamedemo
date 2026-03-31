/**
 * Level of Detail (LOD) Management System
 * 
 * Provides distance-based detail reduction for improved rendering performance.
 * Three LOD levels with configurable thresholds:
 * - Near (<200px): Full detail (shadows, animation, alpha)
 * - Medium (200-500px): Simplified (no shadows, no animation)
 * - Far (>500px): Minimal (placeholder only, reduced scale)
 * 
 * Features hysteresis to prevent flickering at threshold boundaries.
 */

/**
 * LOD quality levels
 */
export type LODLevel = "near" | "medium" | "far";

/**
 * Configuration for LOD thresholds
 */
export interface LODConfig {
  /** Distance threshold for near level (default: 200px) */
  nearThreshold: number;
  /** Distance threshold for medium level (default: 500px) */
  mediumThreshold: number;
  /** Hysteresis buffer to prevent flickering (default: 20px) */
  transitionHysteresis: number;
}

/**
 * Settings applied at each LOD level
 */
export interface LODSettings {
  /** Whether to render shadow */
  shadowEnabled: boolean;
  /** Whether to play animation */
  animationEnabled: boolean;
  /** Whether alpha blending is enabled */
  alphaEnabled: boolean;
  /** Scale multiplier (1.0 = full, 0.5 = half) */
  scale: number;
  /** Optional detail level description */
  detailLevel?: string;
}

/**
 * Default LOD configuration
 */
export const DEFAULT_LOD_CONFIG: LODConfig = {
  nearThreshold: 200,
  mediumThreshold: 500,
  transitionHysteresis: 20
};

/**
 * Default settings for each LOD level
 */
export const DEFAULT_LOD_SETTINGS: Record<LODLevel, LODSettings> = {
  near: { 
    shadowEnabled: true, 
    animationEnabled: true, 
    alphaEnabled: true, 
    scale: 1.0,
    detailLevel: "full"
  },
  medium: { 
    shadowEnabled: true,  // Enable shadows for medium distance
    animationEnabled: false, 
    alphaEnabled: true, 
    scale: 1.0,
    detailLevel: "simplified"
  },
  far: { 
    shadowEnabled: true,  // Enable shadows even for far distance
    animationEnabled: false, 
    alphaEnabled: false, 
    scale: 0.5,
    detailLevel: "minimal"
  }
};

/**
 * LOD selection result with distance information
 */
export interface LODSelection {
  level: LODLevel;
  distance: number;
  settings: LODSettings;
}

/**
 * Manages Level of Detail (LOD) based on distance to camera
 * 
 * Key features:
 * - Distance-based level selection
 * - Hysteresis to prevent flickering at thresholds
 * - Per-entity state tracking
 * - Batch processing for efficiency
 */
export class LODManager {
  private config: LODConfig;
  private lastLOD = new Map<string, LODLevel>(); // For hysteresis
  private customSettings?: Partial<Record<LODLevel, Partial<LODSettings>>>;

  /**
   * Create LOD manager with optional configuration
   */
  constructor(
    config?: Partial<LODConfig>,
    customSettings?: Partial<Record<LODLevel, Partial<LODSettings>>>
  ) {
    this.config = { ...DEFAULT_LOD_CONFIG, ...config };
    this.customSettings = customSettings;
  }

  /**
   * Get LOD level for an entity based on distance to camera
   * 
   * @param entityX - Entity world X position
   * @param entityY - Entity world Y position
   * @param cameraX - Camera center X position
   * @param cameraY - Camera center Y position
   * @param entityId - Unique entity ID for hysteresis tracking
   * @returns LOD level (near/medium/far)
   */
  getLODForEntity(
    entityX: number,
    entityY: number,
    cameraX: number,
    cameraY: number,
    entityId: string
  ): LODLevel {
    const distance = this.calculateDistance(entityX, entityY, cameraX, cameraY);
    const newLevel = this.selectLevelFromDistance(distance);
    
    // Apply hysteresis to prevent flickering
    return this.applyHysteresis(entityId, newLevel, distance);
  }

  /**
   * Get full LOD selection with settings
   */
  getLODSelection(
    entityX: number,
    entityY: number,
    cameraX: number,
    cameraY: number,
    entityId: string
  ): LODSelection {
    const level = this.getLODForEntity(entityX, entityY, cameraX, cameraY, entityId);
    const distance = this.calculateDistance(entityX, entityY, cameraX, cameraY);
    
    return {
      level,
      distance,
      settings: this.getSettingsForLOD(level)
    };
  }

  /**
   * Get settings for a specific LOD level
   */
  getSettingsForLOD(level: LODLevel): LODSettings {
    const baseSettings = DEFAULT_LOD_SETTINGS[level];
    const custom = this.customSettings?.[level];
    
    if (custom) {
      return { ...baseSettings, ...custom };
    }
    
    return { ...baseSettings };
  }

  /**
   * Process multiple entities efficiently
   * 
   * @returns Map of entity IDs to their LOD levels
   */
  processEntities(
    entities: Array<{ id: string; x: number; y: number }>,
    cameraX: number,
    cameraY: number
  ): Map<string, LODLevel> {
    const results = new Map<string, LODLevel>();
    
    for (const entity of entities) {
      const lod = this.getLODForEntity(entity.x, entity.y, cameraX, cameraY, entity.id);
      results.set(entity.id, lod);
    }
    
    return results;
  }

  /**
   * Calculate full LOD selections for multiple entities
   */
  processEntitiesWithSettings(
    entities: Array<{ id: string; x: number; y: number }>,
    cameraX: number,
    cameraY: number
  ): Map<string, LODSelection> {
    const results = new Map<string, LODSelection>();
    
    for (const entity of entities) {
      const selection = this.getLODSelection(entity.x, entity.y, cameraX, cameraY, entity.id);
      results.set(entity.id, selection);
    }
    
    return results;
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<LODConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): LODConfig {
    return { ...this.config };
  }

  /**
   * Set custom settings for LOD levels
   */
  setCustomSettings(settings: Partial<Record<LODLevel, Partial<LODSettings>>>): void {
    this.customSettings = settings;
  }

  /**
   * Clear hysteresis state
   * Call when camera jumps or scene changes
   */
  clear(): void {
    this.lastLOD.clear();
  }

  /**
   * Reset hysteresis for specific entity
   */
  clearEntity(entityId: string): void {
    this.lastLOD.delete(entityId);
  }

  /**
   * Calculate Euclidean distance from entity to camera
   */
  calculateDistance(
    entityX: number,
    entityY: number,
    cameraX: number,
    cameraY: number
  ): number {
    const dx = entityX - cameraX;
    const dy = entityY - cameraY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Get statistics about current state
   */
  getStats(): {
    trackedEntityCount: number;
    config: LODConfig;
  } {
    return {
      trackedEntityCount: this.lastLOD.size,
      config: this.getConfig()
    };
  }

  /**
   * Select LOD level based on distance
   */
  private selectLevelFromDistance(distance: number): LODLevel {
    if (distance < this.config.nearThreshold) {
      return "near";
    } else if (distance < this.config.mediumThreshold) {
      return "medium";
    } else {
      return "far";
    }
  }

  /**
   * Apply hysteresis to prevent flickering at thresholds
   * 
   * If entity was at a certain level, it needs to move further
   * than the threshold before switching to prevent rapid toggling.
   */
  private applyHysteresis(
    entityId: string,
    newLevel: LODLevel,
    distance: number
  ): LODLevel {
    const lastLevel = this.lastLOD.get(entityId);
    
    if (!lastLevel || lastLevel === newLevel) {
      // First time or same level - accept new level
      this.lastLOD.set(entityId, newLevel);
      return newLevel;
    }

    const h = this.config.transitionHysteresis;
    let shouldSwitch = false;

    // Check if we've moved far enough to warrant a switch
    switch (lastLevel) {
      case "near":
        // Was near, can switch to medium only if beyond threshold + hysteresis
        shouldSwitch = distance >= this.config.nearThreshold + h;
        break;
      case "medium":
        // Was medium
        if (newLevel === "near") {
          // Switching to near: must be below threshold - hysteresis
          shouldSwitch = distance <= this.config.nearThreshold - h;
        } else {
          // Switching to far: must be above threshold + hysteresis
          shouldSwitch = distance >= this.config.mediumThreshold + h;
        }
        break;
      case "far":
        // Was far, can switch to medium only if below threshold - hysteresis
        shouldSwitch = distance <= this.config.mediumThreshold - h;
        break;
    }

    if (shouldSwitch) {
      this.lastLOD.set(entityId, newLevel);
      return newLevel;
    }

    // Stay at current level
    return lastLevel;
  }
}

/**
 * Utility function to check if a LOD level has shadows enabled
 */
export function hasShadows(level: LODLevel): boolean {
  return DEFAULT_LOD_SETTINGS[level].shadowEnabled;
}

/**
 * Utility function to check if a LOD level has animation enabled
 */
export function hasAnimation(level: LODLevel): boolean {
  return DEFAULT_LOD_SETTINGS[level].animationEnabled;
}

/**
 * Utility function to check if a LOD level has alpha enabled
 */
export function hasAlpha(level: LODLevel): boolean {
  return DEFAULT_LOD_SETTINGS[level].alphaEnabled;
}
