/**
 * Visual Pack Metadata Types
 * 
 * Defines pseudo-3D properties for game content, supporting height-based
 * depth sorting and dynamic occlusion. Visual packs are separate from
 * gameplay content definitions to allow visual styles to be swapped independently.
 * 
 * @see HEIGHT-01, HEIGHT-02, FOOTPRINT-01
 */

// =============================================================================
// Height Classification
// =============================================================================

/** Height classification drives occlusion and shadow behavior */
export type HeightClassification = "flat" | "low" | "medium" | "tall";

/** Height classification constants for type-safe usage */
export const HeightClassifications = {
  FLAT: "flat" as const,
  LOW: "low" as const,
  MEDIUM: "medium" as const,
  TALL: "tall" as const
};

/** Pixel range for each height classification */
export interface HeightRange {
  min: number;
  max: number;
}

/** Height ranges in pixels for validation */
export const HEIGHT_RANGES: Record<HeightClassification, HeightRange> = {
  flat: { min: 0, max: 0 },
  low: { min: 1, max: 16 },
  medium: { min: 17, max: 32 },
  tall: { min: 33, max: Infinity }
};

// =============================================================================
// Footprint Bounds
// =============================================================================

/** Footprint bounds for collision detection (separate from visual bounds) */
export interface FootprintBounds {
  /** Width in tiles */
  widthTiles: number;
  /** Height in tiles (depth in pseudo-3D terms) */
  depthTiles: number;
  /** Offset from position (for asymmetrical objects) */
  offsetXTiles?: number;
  offsetYTiles?: number;
}

/** Default footprint for single-tile objects */
export const DEFAULT_FOOTPRINT: FootprintBounds = {
  widthTiles: 1,
  depthTiles: 1,
  offsetXTiles: 0,
  offsetYTiles: 0
};

// =============================================================================
// Visual Pack Metadata
// =============================================================================

/** Visual pack metadata per content type */
export interface VisualPackMetadata {
  /** Content ID this visual pack applies to (e.g., "core:tree") */
  contentId: string;
  /** Visual pack version for feature gating */
  version?: string;
  /** Render height in pixels (for depth sorting) */
  renderHeight: number;
  /** Height classification for occlusion/shadow behavior */
  heightClassification: HeightClassification;
  /** Footprint for collision (separate from visual bounds) */
  footprint: FootprintBounds;
  /** Sprite anchor point override (defaults to bottom-center) */
  anchor?: { x: number; y: number };
  /** Shadow offset from base (for tall objects) */
  shadowOffsetY?: number;
  /** Whether this object can occlude the player */
  canOccludePlayer?: boolean;
  /** Alpha value when occluding player (0.3-0.5 recommended) */
  occlusionAlpha?: number;
}

/** Fallback defaults for legacy mods without visual pack config */
export const DEFAULT_VISUAL_PACK: Omit<VisualPackMetadata, "contentId"> = {
  renderHeight: 0,
  heightClassification: "flat",
  footprint: DEFAULT_FOOTPRINT,
  canOccludePlayer: false,
  occlusionAlpha: 0.4
};

// =============================================================================
// Visual Pack Registry
// =============================================================================

/** Registry interface for visual pack metadata */
export interface VisualPackRegistry {
  register(metadata: VisualPackMetadata): void;
  get(contentId: string): VisualPackMetadata | undefined;
  has(contentId: string): boolean;
  getAll(): ReadonlyArray<VisualPackMetadata>;
  getByClassification(classification: HeightClassification): ReadonlyArray<VisualPackMetadata>;
}
