/**
 * VisualPackCompatibility - Backward compatibility adapter for v1 → v2 migration
 * 
 * Formalizes v0.1 pattern-based fallback into explicit adapter.
 * Provides logging and effective config resolution for runtime compatibility.
 * 
 * @module engine-phaser/visualPackCompatibility
 */

import type {
  VisualPackMetadata,
  HeightClassification,
  VisualPackV2
} from "@gamedemo/mod-api";
import {
  isVisualPackV2,
  getCanOccludePlayer,
  getOcclusionAlpha,
  hasLayers,
  getTotalRenderHeight,
  validateVisualPack
} from "@gamedemo/mod-api";

// =============================================================================
// Types
// =============================================================================

export interface AdaptationResult {
  metadata: VisualPackMetadata;
  source: "v2-explicit" | "v1-adapted" | "pattern-fallback";
  warnings: string[];
}

export interface CompatibilityLogger {
  warn(message: string): void;
  info(message: string): void;
  debug?(message: string): void;
}

// =============================================================================
// Default Logger
// =============================================================================

const createDefaultLogger = (): CompatibilityLogger => ({
  warn: (msg: string) => console.warn(`[VisualPackCompatibility] ${msg}`),
  info: (msg: string) => console.info(`[VisualPackCompatibility] ${msg}`),
  debug: (msg: string) => console.debug(`[VisualPackCompatibility] ${msg}`)
});

// =============================================================================
// V1 Pack Detection
// =============================================================================

function isLegacyPack(pack: unknown): boolean {
  if (pack == null || typeof pack !== "object") {
    return false;
  }

  const obj = pack as Record<string, unknown>;

  // Legacy pack has no visualPackVersion or version !== 2
  if ("visualPackVersion" in obj) {
    return obj.visualPackVersion !== 2;
  }

  // Check for minimal v1 schema (just contentId)
  return typeof obj.contentId === "string";
}

function hasV1HeightField(pack: Record<string, unknown>): boolean {
  return typeof pack.height === "number";
}

function hasV1FramesField(pack: Record<string, unknown>): boolean {
  return Array.isArray(pack.frames);
}

// =============================================================================
// Classification Inference
// =============================================================================

function inferHeightClassification(renderHeight: number): HeightClassification {
  if (renderHeight <= 0) return "flat";
  if (renderHeight <= 16) return "low";
  if (renderHeight <= 32) return "medium";
  return "tall";
}

function inferFromFrames(frames: Array<{ height?: number }>): {
  renderHeight: number;
  heightClassification: HeightClassification;
} {
  const maxHeight = frames.reduce((max, frame) => {
    return Math.max(max, frame.height ?? 0);
  }, 0);

  return {
    renderHeight: maxHeight,
    heightClassification: inferHeightClassification(maxHeight)
  };
}

// =============================================================================
// Pattern-Based Fallback (mirrors VisualPackLoader logic)
// =============================================================================

interface PatternRule {
  pattern: RegExp;
  renderHeight: number;
  heightClassification: HeightClassification;
  canOccludePlayer: boolean;
}

const PATTERN_RULES: PatternRule[] = [
  {
    pattern: /(^|[:_\b])(tree|building|house|tower|pine|oak|birch)(?![a-z])/i,
    renderHeight: 48,
    heightClassification: "tall",
    canOccludePlayer: true
  },
  {
    pattern: /(?<!c)(ore|rock|stone|boulder|pebble|gem)(?![a-z])/i,
    renderHeight: 12,
    heightClassification: "low",
    canOccludePlayer: false
  },
  {
    pattern: /(^|[:_\b])(bush|shrub|flower|plant|grass|fern)(?![a-z])/i,
    renderHeight: 20,
    heightClassification: "medium",
    canOccludePlayer: false
  },
  {
    pattern: /(^|[:_\b])(castle|mansion|large_tree|ancient_tree)(?![a-z])/i,
    renderHeight: 64,
    heightClassification: "tall",
    canOccludePlayer: true
  }
];

function matchPattern(contentId: string): PatternRule | undefined {
  return PATTERN_RULES.find(rule => rule.pattern.test(contentId));
}

function createPatternFallback(contentId: string): VisualPackMetadata {
  const match = matchPattern(contentId);

  if (match) {
    return {
      contentId,
      renderHeight: match.renderHeight,
      heightClassification: match.heightClassification,
      footprint: { widthTiles: 1, depthTiles: 1 },
      canOccludePlayer: match.canOccludePlayer,
      occlusionAlpha: 0.4
    };
  }

  return {
    contentId,
    renderHeight: 0,
    heightClassification: "flat",
    footprint: { widthTiles: 1, depthTiles: 1 },
    canOccludePlayer: false,
    occlusionAlpha: 0.4
  };
}

// =============================================================================
// Adaptation Logic
// =============================================================================

function adaptV1Pack(
  pack: Record<string, unknown>,
  logger: CompatibilityLogger
): AdaptationResult {
  const contentId = pack.contentId as string;
  const warnings: string[] = [];

  logger.info(`Adapting legacy v1 pack for ${contentId}`);

  // Try to extract explicit height info from v1 pack
  if (hasV1HeightField(pack)) {
    const height = pack.height as number;
    const heightClassification = inferHeightClassification(height);

    logger.debug?.(`Using explicit height from v1 pack: ${height}px (${heightClassification})`);

    return {
      metadata: {
        contentId,
        renderHeight: height,
        heightClassification,
        footprint: { widthTiles: 1, depthTiles: 1 },
        canOccludePlayer: heightClassification === "tall",
        occlusionAlpha: 0.4
      },
      source: "v1-adapted",
      warnings
    };
  }

  // Try to infer from frames array
  if (hasV1FramesField(pack)) {
    const { renderHeight, heightClassification } = inferFromFrames(
      pack.frames as Array<{ height?: number }>
    );

    logger.debug?.(`Inferred height from frames: ${renderHeight}px (${heightClassification})`);

    return {
      metadata: {
        contentId,
        renderHeight,
        heightClassification,
        footprint: { widthTiles: 1, depthTiles: 1 },
        canOccludePlayer: heightClassification === "tall",
        occlusionAlpha: 0.4
      },
      source: "v1-adapted",
      warnings
    };
  }

  // Fall back to pattern matching
  logger.warn(`No explicit height found for ${contentId}, using pattern-based fallback`);
  const metadata = createPatternFallback(contentId);

  if (metadata.heightClassification === "flat") {
    warnings.push(`Using flat defaults for ${contentId} - no pattern matched`);
  }

  return {
    metadata,
    source: "pattern-fallback",
    warnings
  };
}

// =============================================================================
// Effective Config Resolution
// =============================================================================

function getEffectiveConfig(v2: VisualPackV2): Required<VisualPackMetadata> {
  const canOccludePlayer = v2.canOccludePlayer ?? v2.heightClassification === "tall";

  return {
    contentId: v2.contentId,
    renderHeight: v2.renderHeight,
    heightClassification: v2.heightClassification,
    footprint: v2.footprint,
    canOccludePlayer,
    occlusionAlpha: v2.occlusionAlpha ?? 0.4
  };
}

// =============================================================================
// Main Compatibility Object
// =============================================================================

export const VisualPackCompatibility = {
  /**
   * Adapt an unknown pack to VisualPackMetadata.
   * 
   * @param pack - Unknown pack data (v1 or v2)
   * @param logger - Optional logger for compatibility messages
   * @returns Adaptation result with metadata and source info
   */
  adapt(
    pack: unknown,
    logger?: CompatibilityLogger
  ): AdaptationResult {
    const log = logger ?? createDefaultLogger();

    if (isVisualPackV2(pack)) {
      // V2 pack - use explicit config
      const warnings = validateVisualPack(pack);
      
      if (warnings.length > 0) {
        warnings.forEach(w => log.warn(w));
      }

      log.info(`Loading v2 pack for ${pack.contentId}`);

      return {
        metadata: getEffectiveConfig(pack),
        source: "v2-explicit",
        warnings
      };
    }

    if (isLegacyPack(pack)) {
      // V1 pack - adapt
      return adaptV1Pack(pack as Record<string, unknown>, log);
    }

    // Unknown format
    throw new Error(
      "Cannot adapt visual pack: not a valid v1 or v2 pack. " +
      "V2 packs require visualPackVersion: 2. " +
      "V1 packs require at least a contentId string."
    );
  },

  /**
   * Get effective configuration with all defaults applied.
   * 
   * @param v2 - Visual Pack v2
   * @returns Complete metadata with all fields populated
   */
  getEffectiveConfig(v2: VisualPackV2): Required<VisualPackMetadata> {
    return getEffectiveConfig(v2);
  },

  /**
   * Check if a pack is a legacy v1 pack.
   * 
   * @param pack - Unknown pack data
   * @returns True if pack appears to be v1
   */
  isLegacyPack(pack: unknown): boolean {
    return isLegacyPack(pack);
  },

  /**
   * Create a pattern-based fallback for a content ID.
   * 
   * @param contentId - Content ID to create fallback for
   * @returns Visual pack metadata with pattern-based defaults
   */
  createPatternFallback(contentId: string): VisualPackMetadata {
    return createPatternFallback(contentId);
  }
};
