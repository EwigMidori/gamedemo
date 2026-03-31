/**
 * Height Validator
 * 
 * Validates visual pack metadata at mod load time to catch errors early.
 * Ensures height consistency, valid footprint dimensions, and proper alpha values.
 * 
 * @see HEIGHT-01, HEIGHT-02, FOOTPRINT-01
 */

import type { VisualPackMetadata } from "@gamedemo/mod-api";
import { HEIGHT_RANGES } from "@gamedemo/mod-api";

// =============================================================================
// Validation Result Types
// =============================================================================

/** Single validation error with context */
export interface HeightValidationError {
  contentId: string;
  field: string;
  value: unknown;
  message: string;
}

/** Complete validation result */
export interface HeightValidationResult {
  valid: boolean;
  errors: HeightValidationError[];
  warnings: HeightValidationError[];
}

// =============================================================================
// Validation Rules
// =============================================================================

/** Validation rule functions for visual pack metadata */
export const HeightValidationRules = {
  /** Validate renderHeight matches heightClassification range */
  validateHeightConsistency(metadata: VisualPackMetadata): HeightValidationError | null {
    const range = HEIGHT_RANGES[metadata.heightClassification];
    if (metadata.renderHeight < range.min || metadata.renderHeight > range.max) {
      return {
        contentId: metadata.contentId,
        field: "renderHeight",
        value: metadata.renderHeight,
        message: `renderHeight (${metadata.renderHeight}) does not match heightClassification "${metadata.heightClassification}" (expected ${range.min}-${range.max === Infinity ? '∞' : range.max})`
      };
    }
    return null;
  },

  /** Validate renderHeight is non-negative */
  validateHeightNonNegative(metadata: VisualPackMetadata): HeightValidationError | null {
    if (metadata.renderHeight < 0) {
      return {
        contentId: metadata.contentId,
        field: "renderHeight",
        value: metadata.renderHeight,
        message: `renderHeight must be non-negative, got ${metadata.renderHeight}`
      };
    }
    return null;
  },

  /** Validate footprint dimensions are positive */
  validateFootprintDimensions(metadata: VisualPackMetadata): HeightValidationError | null {
    if (metadata.footprint.widthTiles <= 0) {
      return {
        contentId: metadata.contentId,
        field: "footprint.widthTiles",
        value: metadata.footprint.widthTiles,
        message: `footprint.widthTiles must be positive, got ${metadata.footprint.widthTiles}`
      };
    }
    if (metadata.footprint.depthTiles <= 0) {
      return {
        contentId: metadata.contentId,
        field: "footprint.depthTiles",
        value: metadata.footprint.depthTiles,
        message: `footprint.depthTiles must be positive, got ${metadata.footprint.depthTiles}`
      };
    }
    return null;
  },

  /** Validate occlusionAlpha is in valid range */
  validateOcclusionAlpha(metadata: VisualPackMetadata): HeightValidationError | null {
    if (metadata.occlusionAlpha !== undefined) {
      if (metadata.occlusionAlpha < 0 || metadata.occlusionAlpha > 1) {
        return {
          contentId: metadata.contentId,
          field: "occlusionAlpha",
          value: metadata.occlusionAlpha,
          message: `occlusionAlpha must be 0-1, got ${metadata.occlusionAlpha}`
        };
      }
    }
    return null;
  }
};

// =============================================================================
// Height Validator Class
// =============================================================================

/** Validates visual pack metadata at mod load time */
export class HeightValidator {
  private errors: HeightValidationError[] = [];
  private warnings: HeightValidationError[] = [];

  validate(metadata: VisualPackMetadata): void {
    const rules = [
      HeightValidationRules.validateHeightNonNegative,
      HeightValidationRules.validateHeightConsistency,
      HeightValidationRules.validateFootprintDimensions,
      HeightValidationRules.validateOcclusionAlpha
    ];

    for (const rule of rules) {
      const error = rule(metadata);
      if (error) {
        this.errors.push(error);
      }
    }
  }

  addWarning(error: HeightValidationError): void {
    this.warnings.push(error);
  }

  getResult(): HeightValidationResult {
    return {
      valid: this.errors.length === 0,
      errors: [...this.errors],
      warnings: [...this.warnings]
    };
  }

  /** Validate multiple visual packs at once */
  static validateAll(metadataArray: VisualPackMetadata[]): HeightValidationResult {
    const validator = new HeightValidator();
    for (const metadata of metadataArray) {
      validator.validate(metadata);
    }
    return validator.getResult();
  }
}
