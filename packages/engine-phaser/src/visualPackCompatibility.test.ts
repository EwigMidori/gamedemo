/**
 * VisualPackCompatibility Tests
 * 
 * TDD test cases for backward compatibility adapter.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  VisualPackCompatibility,
  type AdaptationResult,
  type CompatibilityLogger
} from "./visualPackCompatibility";
import type { VisualPackV2, VisualPackMetadata } from "@gamedemo/mod-api";

describe("VisualPackCompatibility", () => {
  const createMockLogger = (): CompatibilityLogger & { messages: string[] } => {
    const messages: string[] = [];
    return {
      warn: vi.fn((msg: string) => messages.push(`WARN: ${msg}`)),
      info: vi.fn((msg: string) => messages.push(`INFO: ${msg}`)),
      debug: vi.fn((msg: string) => messages.push(`DEBUG: ${msg}`)),
      messages
    };
  };

  describe("v2 pack adaptation", () => {
    it("should adapt v2 pack with all explicit fields", () => {
      const v2Pack: VisualPackV2 = {
        visualPackVersion: 2,
        contentId: "test:custom_tree",
        renderHeight: 64,
        heightClassification: "tall",
        footprint: { widthTiles: 1, depthTiles: 1 },
        canOccludePlayer: true,
        occlusionAlpha: 0.5
      };

      const result = VisualPackCompatibility.adapt(v2Pack);

      expect(result.source).toBe("v2-explicit");
      expect(result.metadata.contentId).toBe("test:custom_tree");
      expect(result.metadata.renderHeight).toBe(64);
      expect(result.metadata.canOccludePlayer).toBe(true);
      expect(result.metadata.occlusionAlpha).toBe(0.5);
      expect(result.warnings).toHaveLength(0);
    });

    it("should apply defaults for optional v2 fields", () => {
      const v2Pack: VisualPackV2 = {
        visualPackVersion: 2,
        contentId: "test:simple",
        renderHeight: 48,
        heightClassification: "tall",
        footprint: { widthTiles: 1, depthTiles: 1 }
      };

      const result = VisualPackCompatibility.adapt(v2Pack);

      expect(result.metadata.canOccludePlayer).toBe(true); // tall default
      expect(result.metadata.occlusionAlpha).toBe(0.4); // default
    });

    it("should log INFO when v2 pack loads successfully", () => {
      const logger = createMockLogger();
      const v2Pack: VisualPackV2 = {
        visualPackVersion: 2,
        contentId: "test:logged",
        renderHeight: 48,
        heightClassification: "tall",
        footprint: { widthTiles: 1, depthTiles: 1 }
      };

      VisualPackCompatibility.adapt(v2Pack, logger);

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("test:logged")
      );
    });

    it("should log warnings for validation issues", () => {
      const logger = createMockLogger();
      const v2Pack: VisualPackV2 = {
        visualPackVersion: 2,
        contentId: "test:short_tall",
        renderHeight: 10, // Too short for tall
        heightClassification: "tall",
        footprint: { widthTiles: 1, depthTiles: 1 }
      };

      const result = VisualPackCompatibility.adapt(v2Pack, logger);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(logger.warn).toHaveBeenCalled();
    });
  });

  describe("v1 pack adaptation", () => {
    it("should adapt v1 pack with explicit height field", () => {
      const v1Pack = {
        contentId: "legacy:object",
        height: 32
      };

      const result = VisualPackCompatibility.adapt(v1Pack);

      expect(result.source).toBe("v1-adapted");
      expect(result.metadata.renderHeight).toBe(32);
      expect(result.metadata.heightClassification).toBe("medium");
    });

    it("should adapt v1 pack with frames array", () => {
      const v1Pack = {
        contentId: "legacy:animated",
        frames: [
          { height: 16 },
          { height: 32 },
          { height: 24 }
        ]
      };

      const result = VisualPackCompatibility.adapt(v1Pack);

      expect(result.source).toBe("v1-adapted");
      expect(result.metadata.renderHeight).toBe(32); // Max height
      expect(result.metadata.heightClassification).toBe("medium");
    });

    it("should fall back to pattern matching for minimal v1 pack", () => {
      const v1Pack = {
        contentId: "mod:my_tree"
      };

      const result = VisualPackCompatibility.adapt(v1Pack);

      expect(result.source).toBe("pattern-fallback");
      expect(result.metadata.renderHeight).toBe(48);
      expect(result.metadata.heightClassification).toBe("tall");
    });

    it("should log WARN when using pattern fallback", () => {
      const logger = createMockLogger();
      const v1Pack = {
        contentId: "mod:needs_fallback"
      };

      VisualPackCompatibility.adapt(v1Pack, logger);

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("pattern-based fallback")
      );
    });

    it("should NOT log ERROR for valid v1 packs", () => {
      const logger = createMockLogger();
      const v1Pack = {
        contentId: "mod:valid_legacy"
      };

      VisualPackCompatibility.adapt(v1Pack, logger);

      // Should not have any error logs
      const errorCalls = logger.messages.filter(m => m.startsWith("ERROR"));
      expect(errorCalls).toHaveLength(0);
    });
  });

  describe("getEffectiveConfig", () => {
    it("should return complete metadata with all defaults", () => {
      const v2Pack: VisualPackV2 = {
        visualPackVersion: 2,
        contentId: "test:partial",
        renderHeight: 48,
        heightClassification: "tall",
        footprint: { widthTiles: 1, depthTiles: 1 }
      };

      const config = VisualPackCompatibility.getEffectiveConfig(v2Pack);

      expect(config.canOccludePlayer).toBe(true); // tall default
      expect(config.occlusionAlpha).toBe(0.4); // default
    });

    it("should use explicit values when provided", () => {
      const v2Pack: VisualPackV2 = {
        visualPackVersion: 2,
        contentId: "test:explicit",
        renderHeight: 48,
        heightClassification: "tall",
        footprint: { widthTiles: 2, depthTiles: 2 },
        canOccludePlayer: false, // Override tall default
        occlusionAlpha: 0.6
      };

      const config = VisualPackCompatibility.getEffectiveConfig(v2Pack);

      expect(config.canOccludePlayer).toBe(false);
      expect(config.occlusionAlpha).toBe(0.6);
      expect(config.footprint.widthTiles).toBe(2);
    });
  });

  describe("isLegacyPack", () => {
    it("should return true for v1 pack", () => {
      const v1Pack = { contentId: "legacy:item" };
      expect(VisualPackCompatibility.isLegacyPack(v1Pack)).toBe(true);
    });

    it("should return true for pack without version", () => {
      const noVersion = { contentId: "test:item", height: 10 };
      expect(VisualPackCompatibility.isLegacyPack(noVersion)).toBe(true);
    });

    it("should return false for v2 pack", () => {
      const v2Pack: VisualPackV2 = {
        visualPackVersion: 2,
        contentId: "test:item",
        renderHeight: 10,
        heightClassification: "low",
        footprint: { widthTiles: 1, depthTiles: 1 }
      };
      expect(VisualPackCompatibility.isLegacyPack(v2Pack)).toBe(false);
    });

    it("should return false for invalid pack", () => {
      expect(VisualPackCompatibility.isLegacyPack(null)).toBe(false);
      expect(VisualPackCompatibility.isLegacyPack("string")).toBe(false);
      expect(VisualPackCompatibility.isLegacyPack({})).toBe(false);
    });
  });

  describe("createPatternFallback", () => {
    it("should create tree fallback", () => {
      const metadata = VisualPackCompatibility.createPatternFallback("mod:pine");

      expect(metadata.renderHeight).toBe(48);
      expect(metadata.heightClassification).toBe("tall");
      expect(metadata.canOccludePlayer).toBe(true);
    });

    it("should create rock fallback", () => {
      const metadata = VisualPackCompatibility.createPatternFallback("mod:stone");

      expect(metadata.renderHeight).toBe(12);
      expect(metadata.heightClassification).toBe("low");
      expect(metadata.canOccludePlayer).toBe(false);
    });

    it("should create bush fallback", () => {
      const metadata = VisualPackCompatibility.createPatternFallback("mod:bush");

      expect(metadata.renderHeight).toBe(20);
      expect(metadata.heightClassification).toBe("medium");
      expect(metadata.canOccludePlayer).toBe(false);
    });

    it("should create flat fallback for unknown patterns", () => {
      const metadata = VisualPackCompatibility.createPatternFallback("mod:unknown");

      expect(metadata.renderHeight).toBe(0);
      expect(metadata.heightClassification).toBe("flat");
      expect(metadata.canOccludePlayer).toBe(false);
    });
  });

  describe("tall classification defaults", () => {
    it("should default canOccludePlayer to true for tall objects", () => {
      const v2Pack: VisualPackV2 = {
        visualPackVersion: 2,
        contentId: "test:tall",
        renderHeight: 48,
        heightClassification: "tall",
        footprint: { widthTiles: 1, depthTiles: 1 }
      };

      const result = VisualPackCompatibility.adapt(v2Pack);

      expect(result.metadata.canOccludePlayer).toBe(true);
    });

    it("should default canOccludePlayer to false for non-tall objects", () => {
      const v2Pack: VisualPackV2 = {
        visualPackVersion: 2,
        contentId: "test:medium",
        renderHeight: 24,
        heightClassification: "medium",
        footprint: { widthTiles: 1, depthTiles: 1 }
      };

      const result = VisualPackCompatibility.adapt(v2Pack);

      expect(result.metadata.canOccludePlayer).toBe(false);
    });
  });

  describe("layer support", () => {
    it("should handle v2 pack with layers", () => {
      const v2Pack: VisualPackV2 = {
        visualPackVersion: 2,
        contentId: "test:layered",
        renderHeight: 48,
        heightClassification: "tall",
        footprint: { widthTiles: 1, depthTiles: 1 },
        layers: [
          { id: "trunk", renderHeight: 16, frame: 0 },
          { id: "canopy", renderHeight: 32, frame: 1 }
        ]
      };

      const result = VisualPackCompatibility.adapt(v2Pack);

      expect(result.source).toBe("v2-explicit");
      expect(result.metadata.renderHeight).toBe(48);
    });

    it("should validate layer sum matches renderHeight", () => {
      const logger = createMockLogger();
      const v2Pack: VisualPackV2 = {
        visualPackVersion: 2,
        contentId: "test:mismatched",
        renderHeight: 50, // Doesn't match layer sum (16+32=48)
        heightClassification: "tall",
        footprint: { widthTiles: 1, depthTiles: 1 },
        layers: [
          { id: "trunk", renderHeight: 16, frame: 0 },
          { id: "canopy", renderHeight: 32, frame: 1 }
        ]
      };

      const result = VisualPackCompatibility.adapt(v2Pack, logger);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("sum");
    });
  });

  describe("error handling", () => {
    it("should throw for invalid pack format", () => {
      expect(() => VisualPackCompatibility.adapt(null)).toThrow();
      expect(() => VisualPackCompatibility.adapt("string")).toThrow();
      expect(() => VisualPackCompatibility.adapt({})).toThrow();
    });

    it("should include helpful error message", () => {
      expect(() => VisualPackCompatibility.adapt({})).toThrow(
        /v2 packs require visualPackVersion: 2/i
      );
    });
  });
});
