// Visual Pack v2 Schema for Pseudo-3D Rendering
// Extends v1 with height metadata, occlusion rules, and layer support

/**
 * Individual layer definition within a Visual Pack v2
 */
export interface VisualPackLayer {
  /** Layer identifier (e.g., "trunk", "canopy") */
  id: string;
  /** Height of this layer in pixels */
  renderHeight: number;
  /** Sprite frame index for this layer */
  frame: number;
  /** Whether this layer can occlude the player */
  canOcclude?: boolean;
}

/**
 * Visual Pack v2 schema for pseudo-3D rendering.
 * Extends v1 with height metadata, occlusion rules, and layer support.
 *
 * Example tree visual pack:
 * ```typescript
 * {
 *   visualPackVersion: 2,
 *   contentId: "core:tree",
 *   renderHeight: 48,
 *   heightClassification: "tall",
 *   footprint: { widthTiles: 1, depthTiles: 1 },
 *   canOccludePlayer: true,
 *   occlusionAlpha: 0.4,
 *   layers: [
 *     { id: "trunk", renderHeight: 16, frame: 10, canOcclude: false },
 *     { id: "canopy", renderHeight: 32, frame: 11, canOcclude: true }
 *   ]
 * }
 * ```
 */
export interface VisualPackV2 {
  /** Schema version - must be 2 for v2 features */
  visualPackVersion: 2;
  /** Content ID this visual pack applies to */
  contentId: string;
  /** Total visual height in pixels (sum of layer heights if layered) */
  renderHeight: number;
  /** Height classification for shadow/occlusion behavior */
  heightClassification: "flat" | "low" | "medium" | "tall";
  /** Footprint in tiles for spatial queries */
  footprint: {
    widthTiles: number;
    depthTiles: number;
  };
  /** Whether this entity can occlude the player (default based on heightClassification) */
  canOccludePlayer?: boolean;
  /** Target alpha when occluding player (0.0-1.0, default 0.4) */
  occlusionAlpha?: number;
  /** Layer definitions for split-layer entities (optional) */
  layers?: VisualPackLayer[];
}

/**
 * Visual Pack v1 (legacy, backward compatible)
 * Minimal definition - most v1 packs were implicit
 */
export interface VisualPackV1 {
  contentId: string;
  frame?: number;
  // v1 has no formal schema - just basic frame/tint mappings
}

/**
 * Discriminated union of all visual pack versions
 */
export type VisualPack = VisualPackV1 | VisualPackV2;

/**
 * Type guard to detect v2 visual packs
 */
export function isVisualPackV2(pack: unknown): pack is VisualPackV2 {
  return (
    pack != null &&
    typeof pack === "object" &&
    "visualPackVersion" in pack &&
    (pack as VisualPackV2).visualPackVersion === 2
  );
}

/**
 * Type guard to detect v1 visual packs
 */
export function isVisualPackV1(pack: unknown): pack is VisualPackV1 {
  return (
    pack != null &&
    typeof pack === "object" &&
    (!("visualPackVersion" in pack) ||
      (pack as VisualPackV2).visualPackVersion !== 2)
  );
}

/**
 * Get effective canOccludePlayer value.
 * Uses height classification defaults if not explicitly set.
 *
 * @param pack - Visual Pack v2
 * @returns Whether entity can occlude player
 */
export function getCanOccludePlayer(pack: VisualPackV2): boolean {
  if (pack.canOccludePlayer !== undefined) {
    return pack.canOccludePlayer;
  }
  // Default based on height classification
  return pack.heightClassification === "tall";
}

/**
 * Get effective occlusion alpha value
 *
 * @param pack - Visual Pack v2
 * @returns Alpha value (0.0-1.0)
 */
export function getOcclusionAlpha(pack: VisualPackV2): number {
  return pack.occlusionAlpha ?? 0.4;
}

/**
 * Check if visual pack has layers
 */
export function hasLayers(pack: VisualPackV2): boolean {
  return pack.layers != null && pack.layers.length > 0;
}

/**
 * Get total render height from layers if present,
 * otherwise use explicit renderHeight
 */
export function getTotalRenderHeight(pack: VisualPackV2): number {
  if (hasLayers(pack)) {
    return pack.layers!.reduce((sum, layer) => sum + layer.renderHeight, 0);
  }
  return pack.renderHeight;
}

/**
 * Validate visual pack v2 configuration
 * Logs warnings for common misconfigurations
 */
export function validateVisualPack(pack: VisualPackV2): string[] {
  const warnings: string[] = [];

  // Check height classification vs render height
  const expectedMinHeight = {
    flat: 0,
    low: 1,
    medium: 16,
    tall: 32
  };

  const minHeight = expectedMinHeight[pack.heightClassification];
  if (pack.renderHeight < minHeight) {
    warnings.push(
      `Render height ${pack.renderHeight}px is below minimum for ${pack.heightClassification} classification (${minHeight}px)`
    );
  }

  // Check tall objects have canOccludePlayer
  if (pack.heightClassification === "tall" && pack.canOccludePlayer === false) {
    warnings.push(
      `Tall object ${pack.contentId} has canOccludePlayer=false - this is likely an error`
    );
  }

  // Check layers sum matches renderHeight
  if (hasLayers(pack)) {
    const layerSum = getTotalRenderHeight(pack);
    if (Math.abs(layerSum - pack.renderHeight) > 1) {
      warnings.push(
        `Layer heights sum (${layerSum}px) doesn't match renderHeight (${pack.renderHeight}px)`
      );
    }
  }

  // Check occlusion alpha is valid
  if (pack.occlusionAlpha !== undefined) {
    if (pack.occlusionAlpha < 0 || pack.occlusionAlpha > 1) {
      warnings.push(`Occlusion alpha ${pack.occlusionAlpha} is outside valid range 0.0-1.0`);
    }
  }

  return warnings;
}

/**
 * Create a Visual Pack v2 from partial config with sensible defaults
 */
export function createVisualPackV2(
  contentId: string,
  config: Partial<Omit<VisualPackV2, "contentId" | "visualPackVersion">>
): VisualPackV2 {
  const heightClassification = config.heightClassification ?? "flat";

  return {
    visualPackVersion: 2,
    contentId,
    renderHeight: config.renderHeight ?? 0,
    heightClassification,
    footprint: config.footprint ?? { widthTiles: 1, depthTiles: 1 },
    canOccludePlayer: config.canOccludePlayer ?? heightClassification === "tall",
    occlusionAlpha: config.occlusionAlpha ?? 0.4,
    layers: config.layers
  };
}
