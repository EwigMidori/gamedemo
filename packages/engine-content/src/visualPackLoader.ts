/**
 * VisualPackLoader - Version-gated loading with pattern-based fallback
 * 
 * Routes visual packs based on version:
 * - v2 packs: Full validation and feature access
 * - v1 packs: Pattern-based fallback with sensible defaults
 * 
 * @module engine-content/visualPackLoader
 */

import type {
  VisualPackMetadata,
  HeightClassification,
  FootprintBounds
} from "@gamedemo/mod-api";
import { isVisualPackV2, type VisualPackV2 } from "@gamedemo/mod-api";

// =============================================================================
// Types
// =============================================================================

export interface LoadResult {
  metadata: VisualPackMetadata;
  version: 1 | 2;
  usedFallback: boolean;
}

export interface PatternRule {
  pattern: RegExp;
  renderHeight: number;
  heightClassification: HeightClassification;
  canOccludePlayer: boolean;
}

// =============================================================================
// Pattern-Based Fallback Rules
// =============================================================================

const DEFAULT_PATTERN_RULES: PatternRule[] = [
  // Tall objects (48px) - trees, buildings
  // Match at word boundary or after colon (for namespaced IDs like "mod:tree")
  {
    pattern: /(^|[:_\b])(tree|building|house|tower|pine|oak|birch)(?![a-z])/i,
    renderHeight: 48,
    heightClassification: "tall",
    canOccludePlayer: true
  },
  // Low objects (12px) - rocks, stones
  // Negative lookbehind for "c" to avoid matching "core" (contains "ore")
  {
    pattern: /(?<!c)(ore|rock|stone|boulder|pebble|gem)(?![a-z])/i,
    renderHeight: 12,
    heightClassification: "low",
    canOccludePlayer: false
  },
  // Medium objects (20px) - bushes, shrubs
  {
    pattern: /(^|[:_\b])(bush|shrub|flower|plant|grass|fern)(?![a-z])/i,
    renderHeight: 20,
    heightClassification: "medium",
    canOccludePlayer: false
  },
  // Very tall objects (64px) - large structures
  {
    pattern: /(^|[:_\b])(castle|mansion|large_tree|ancient_tree)(?![a-z])/i,
    renderHeight: 64,
    heightClassification: "tall",
    canOccludePlayer: true
  }
];

// Mutable copy for runtime modifications
let PATTERN_RULES: PatternRule[] = [...DEFAULT_PATTERN_RULES];

const DEFAULT_FALLBACK: Omit<VisualPackMetadata, "contentId"> = {
  renderHeight: 0,
  heightClassification: "flat",
  footprint: { widthTiles: 1, depthTiles: 1 },
  canOccludePlayer: false,
  occlusionAlpha: 0.4
};

// =============================================================================
// Validation
// =============================================================================

class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly value?: unknown
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

function validateV2Pack(pack: VisualPackV2): void {
  // Required fields
  if (!pack.contentId || typeof pack.contentId !== "string") {
    throw new ValidationError(
      "Missing or invalid required field: contentId",
      "contentId",
      pack.contentId
    );
  }

  if (typeof pack.renderHeight !== "number") {
    throw new ValidationError(
      "Missing or invalid required field: renderHeight (must be number)",
      "renderHeight",
      pack.renderHeight
    );
  }

  if (pack.renderHeight < 0 || pack.renderHeight > 128) {
    throw new ValidationError(
      `renderHeight must be between 0 and 128, got ${pack.renderHeight}`,
      "renderHeight",
      pack.renderHeight
    );
  }

  const validClassifications: HeightClassification[] = ["flat", "low", "medium", "tall"];
  if (!validClassifications.includes(pack.heightClassification)) {
    throw new ValidationError(
      `Invalid heightClassification: ${pack.heightClassification}. Must be one of: ${validClassifications.join(", ")}`,
      "heightClassification",
      pack.heightClassification
    );
  }

  if (!pack.footprint || typeof pack.footprint !== "object") {
    throw new ValidationError(
      "Missing or invalid required field: footprint",
      "footprint",
      pack.footprint
    );
  }

  if (
    typeof pack.footprint.widthTiles !== "number" ||
    typeof pack.footprint.depthTiles !== "number"
  ) {
    throw new ValidationError(
      "footprint must have numeric widthTiles and depthTiles",
      "footprint",
      pack.footprint
    );
  }

  // Optional field validation
  if (pack.occlusionAlpha !== undefined) {
    if (pack.occlusionAlpha < 0 || pack.occlusionAlpha > 1) {
      throw new ValidationError(
        `occlusionAlpha must be between 0.0 and 1.0, got ${pack.occlusionAlpha}`,
        "occlusionAlpha",
        pack.occlusionAlpha
      );
    }
  }

  // Validate layers if present
  if (pack.layers) {
    if (!Array.isArray(pack.layers)) {
      throw new ValidationError(
        "layers must be an array",
        "layers",
        pack.layers
      );
    }

    for (let i = 0; i < pack.layers.length; i++) {
      const layer = pack.layers[i];
      if (!layer.id || typeof layer.id !== "string") {
        throw new ValidationError(
          `Layer ${i}: missing or invalid id`,
          `layers[${i}].id`,
          layer.id
        );
      }
      if (typeof layer.renderHeight !== "number") {
        throw new ValidationError(
          `Layer ${i}: missing or invalid renderHeight`,
          `layers[${i}].renderHeight`,
          layer.renderHeight
        );
      }
      if (typeof layer.frame !== "number") {
        throw new ValidationError(
          `Layer ${i}: missing or invalid frame`,
          `layers[${i}].frame`,
          layer.frame
        );
      }
    }
  }
}

function v2ToMetadata(v2: VisualPackV2): VisualPackMetadata {
  const canOccludePlayer =
    v2.canOccludePlayer ?? v2.heightClassification === "tall";

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
// Pattern Matching
// =============================================================================

function matchPattern(contentId: string): PatternRule | undefined {
  return PATTERN_RULES.find(rule => rule.pattern.test(contentId));
}

function createV1Fallback(contentId: string): VisualPackMetadata {
  const patternMatch = matchPattern(contentId);

  if (patternMatch) {
    return {
      contentId,
      renderHeight: patternMatch.renderHeight,
      heightClassification: patternMatch.heightClassification,
      footprint: { widthTiles: 1, depthTiles: 1 },
      canOccludePlayer: patternMatch.canOccludePlayer,
      occlusionAlpha: 0.4
    };
  }

  return {
    contentId,
    ...DEFAULT_FALLBACK
  };
}

// =============================================================================
// Loader
// =============================================================================

export const VisualPackLoader = {
  /**
   * Load a visual pack with automatic version detection and routing.
   * 
   * @param pack - Unknown pack data (v1 or v2)
   * @returns Loaded metadata with version info
   * @throws ValidationError if v2 pack is invalid
   */
  load(pack: unknown): LoadResult {
    if (isVisualPackV2(pack)) {
      validateV2Pack(pack);
      return {
        metadata: v2ToMetadata(pack),
        version: 2,
        usedFallback: false
      };
    }

    // Handle v1 pack (or legacy pack without version)
    const contentId = extractContentId(pack);
    if (!contentId) {
      throw new ValidationError(
        "Cannot load visual pack: missing contentId and not a valid v2 pack"
      );
    }

    return {
      metadata: createV1Fallback(contentId),
      version: 1,
      usedFallback: true
    };
  },

  /**
   * Create a v1 fallback for a content ID using pattern matching.
   * 
   * @param contentId - The content ID to create fallback for
   * @returns Visual pack metadata with pattern-based defaults
   */
  createV1Fallback(contentId: string): VisualPackMetadata {
    return createV1Fallback(contentId);
  },

  /**
   * Get all pattern rules (for testing/documentation).
   */
  getPatternRules(): readonly PatternRule[] {
    return [...PATTERN_RULES];
  },

  /**
   * Add a custom pattern rule.
   * 
   * @param rule - Pattern rule to add
   * @param priority - If true, insert at beginning (checked first)
   */
  addPatternRule(rule: PatternRule, priority = false): void {
    if (priority) {
      PATTERN_RULES.unshift(rule);
    } else {
      PATTERN_RULES.push(rule);
    }
  },

  /**
   * Reset pattern rules to defaults (for testing).
   * @internal
   */
  _resetPatternRules(): void {
    // Deep clone to avoid shared references
    PATTERN_RULES = DEFAULT_PATTERN_RULES.map(rule => ({
      ...rule,
      pattern: new RegExp(rule.pattern.source, rule.pattern.flags)
    }));
  }
};

// =============================================================================
// Helpers
// =============================================================================

function extractContentId(pack: unknown): string | undefined {
  if (pack == null || typeof pack !== "object") {
    return undefined;
  }

  const obj = pack as Record<string, unknown>;
  
  if (typeof obj.contentId === "string") {
    return obj.contentId;
  }

  return undefined;
}

export { ValidationError };
