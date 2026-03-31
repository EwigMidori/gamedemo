/**
 * VisualPackLoader Tests
 * 
 * TDD test cases for version gating and pattern-based fallback.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { VisualPackLoader, ValidationError, type LoadResult } from "./visualPackLoader";
import type { VisualPackV2 } from "@gamedemo/mod-api";

describe("VisualPackLoader", () => {
  beforeEach(() => {
    // Reset pattern rules to defaults before each test
    VisualPackLoader._resetPatternRules();
  });

  describe("v2 pack loading", () => {
    it("should load valid v2 pack with all fields", () => {
      const v2Pack: VisualPackV2 = {
        visualPackVersion: 2,
        contentId: "test:new_tree",
        renderHeight: 48,
        heightClassification: "tall",
        footprint: { widthTiles: 1, depthTiles: 1 },
        canOccludePlayer: true,
        occlusionAlpha: 0.5,
        layers: [
          { id: "trunk", renderHeight: 20, frame: 0 },
          { id: "canopy", renderHeight: 28, frame: 1 }
        ]
      };

      const result = VisualPackLoader.load(v2Pack);

      expect(result.version).toBe(2);
      expect(result.usedFallback).toBe(false);
      expect(result.metadata.contentId).toBe("test:new_tree");
      expect(result.metadata.renderHeight).toBe(48);
      expect(result.metadata.heightClassification).toBe("tall");
      expect(result.metadata.canOccludePlayer).toBe(true);
      expect(result.metadata.occlusionAlpha).toBe(0.5);
    });

    it("should load v2 pack with defaults for optional fields", () => {
      const v2Pack: VisualPackV2 = {
        visualPackVersion: 2,
        contentId: "test:simple_rock",
        renderHeight: 12,
        heightClassification: "low",
        footprint: { widthTiles: 1, depthTiles: 1 }
      };

      const result = VisualPackLoader.load(v2Pack);

      expect(result.metadata.canOccludePlayer).toBe(false); // low = no occlusion
      expect(result.metadata.occlusionAlpha).toBe(0.4); // default
    });

    it("should default canOccludePlayer to true for tall objects", () => {
      const v2Pack: VisualPackV2 = {
        visualPackVersion: 2,
        contentId: "test:tall_thing",
        renderHeight: 48,
        heightClassification: "tall",
        footprint: { widthTiles: 1, depthTiles: 1 }
        // canOccludePlayer not specified
      };

      const result = VisualPackLoader.load(v2Pack);

      expect(result.metadata.canOccludePlayer).toBe(true);
    });

    it("should throw on missing contentId", () => {
      const invalidPack = {
        visualPackVersion: 2,
        renderHeight: 48,
        heightClassification: "tall",
        footprint: { widthTiles: 1, depthTiles: 1 }
      };

      expect(() => VisualPackLoader.load(invalidPack)).toThrow(ValidationError);
      expect(() => VisualPackLoader.load(invalidPack)).toThrow("contentId");
    });

    it("should throw on missing renderHeight", () => {
      const invalidPack = {
        visualPackVersion: 2,
        contentId: "test:bad",
        heightClassification: "tall",
        footprint: { widthTiles: 1, depthTiles: 1 }
      };

      expect(() => VisualPackLoader.load(invalidPack)).toThrow(ValidationError);
      expect(() => VisualPackLoader.load(invalidPack)).toThrow("renderHeight");
    });

    it("should throw on renderHeight out of range", () => {
      const invalidPack: VisualPackV2 = {
        visualPackVersion: 2,
        contentId: "test:too_tall",
        renderHeight: 200,
        heightClassification: "tall",
        footprint: { widthTiles: 1, depthTiles: 1 }
      };

      expect(() => VisualPackLoader.load(invalidPack)).toThrow(ValidationError);
      expect(() => VisualPackLoader.load(invalidPack)).toThrow("128");
    });

    it("should throw on invalid heightClassification", () => {
      const invalidPack = {
        visualPackVersion: 2,
        contentId: "test:bad",
        renderHeight: 48,
        heightClassification: "huge", // invalid
        footprint: { widthTiles: 1, depthTiles: 1 }
      };

      expect(() => VisualPackLoader.load(invalidPack)).toThrow(ValidationError);
      expect(() => VisualPackLoader.load(invalidPack)).toThrow("heightClassification");
    });

    it("should throw on occlusionAlpha out of range", () => {
      const invalidPack: VisualPackV2 = {
        visualPackVersion: 2,
        contentId: "test:bad",
        renderHeight: 48,
        heightClassification: "tall",
        footprint: { widthTiles: 1, depthTiles: 1 },
        occlusionAlpha: 1.5
      };

      expect(() => VisualPackLoader.load(invalidPack)).toThrow(ValidationError);
      expect(() => VisualPackLoader.load(invalidPack)).toThrow("occlusionAlpha");
    });

    it("should throw on invalid layer without id", () => {
      const invalidPack = {
        visualPackVersion: 2,
        contentId: "test:bad",
        renderHeight: 48,
        heightClassification: "tall",
        footprint: { widthTiles: 1, depthTiles: 1 },
        layers: [{ renderHeight: 20, frame: 0 }] // missing id
      };

      expect(() => VisualPackLoader.load(invalidPack)).toThrow(ValidationError);
      expect(() => VisualPackLoader.load(invalidPack)).toThrow("id");
    });

    it("should throw on invalid layer without frame", () => {
      const invalidPack = {
        visualPackVersion: 2,
        contentId: "test:bad",
        renderHeight: 48,
        heightClassification: "tall",
        footprint: { widthTiles: 1, depthTiles: 1 },
        layers: [{ id: "trunk", renderHeight: 20 }] // missing frame
      };

      expect(() => VisualPackLoader.load(invalidPack)).toThrow(ValidationError);
      expect(() => VisualPackLoader.load(invalidPack)).toThrow("frame");
    });
  });

  describe("v1 pack fallback", () => {
    it("should load v1 pack with pattern-based tree defaults", () => {
      const v1Pack = {
        contentId: "core:tree"
      };

      const result = VisualPackLoader.load(v1Pack);

      expect(result.version).toBe(1);
      expect(result.usedFallback).toBe(true);
      expect(result.metadata.contentId).toBe("core:tree");
      expect(result.metadata.renderHeight).toBe(48);
      expect(result.metadata.heightClassification).toBe("tall");
      expect(result.metadata.canOccludePlayer).toBe(true);
    });

    it("should load v1 pack with pattern-based rock defaults", () => {
      const v1Pack = {
        contentId: "core:rock"
      };

      const result = VisualPackLoader.load(v1Pack);

      expect(result.metadata.renderHeight).toBe(12);
      expect(result.metadata.heightClassification).toBe("low");
      expect(result.metadata.canOccludePlayer).toBe(false);
    });

    it("should load v1 pack with pattern-based bush defaults", () => {
      const v1Pack = {
        contentId: "core:berry_bush"
      };

      const result = VisualPackLoader.load(v1Pack);

      // berry_bush should match the bush pattern (medium, 20px)
      // NOT the rock pattern (low, 12px)
      expect(result.metadata.renderHeight).toBe(20);
      expect(result.metadata.heightClassification).toBe("medium");
      expect(result.metadata.canOccludePlayer).toBe(false);
    });

    it("should use flat defaults for unknown contentId patterns", () => {
      const v1Pack = {
        contentId: "core:unknown_item"
      };

      const result = VisualPackLoader.load(v1Pack);

      // Should use flat defaults since no pattern matches
      expect(result.metadata.renderHeight).toBe(0);
      expect(result.metadata.heightClassification).toBe("flat");
      expect(result.metadata.canOccludePlayer).toBe(false);
    });

    it("should throw on v1 pack without contentId", () => {
      const invalidPack = {
        frame: 0
      };

      expect(() => VisualPackLoader.load(invalidPack)).toThrow(ValidationError);
    });
  });

  describe("createV1Fallback", () => {
    it("should create tree fallback", () => {
      const metadata = VisualPackLoader.createV1Fallback("mod:pine_tree");

      expect(metadata.contentId).toBe("mod:pine_tree");
      expect(metadata.renderHeight).toBe(48);
      expect(metadata.heightClassification).toBe("tall");
      expect(metadata.canOccludePlayer).toBe(true);
      expect(metadata.occlusionAlpha).toBe(0.4);
    });

    it("should create rock fallback", () => {
      const metadata = VisualPackLoader.createV1Fallback("mod:stone_ore");

      expect(metadata.renderHeight).toBe(12);
      expect(metadata.heightClassification).toBe("low");
      expect(metadata.canOccludePlayer).toBe(false);
    });

    it("should create default fallback for unmatched patterns", () => {
      const metadata = VisualPackLoader.createV1Fallback("mod:mystery");

      expect(metadata.renderHeight).toBe(0);
      expect(metadata.heightClassification).toBe("flat");
      expect(metadata.canOccludePlayer).toBe(false);
    });
  });

  describe("pattern rules", () => {
    it("should return all pattern rules", () => {
      const rules = VisualPackLoader.getPatternRules();

      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(r => r.pattern.test("tree"))).toBe(true);
      expect(rules.some(r => r.pattern.test("rock"))).toBe(true);
    });

    it("should add custom pattern rule", () => {
      VisualPackLoader.addPatternRule({
        pattern: /custom_test/i,
        renderHeight: 100,
        heightClassification: "tall",
        canOccludePlayer: true
      });

      const metadata = VisualPackLoader.createV1Fallback("mod:custom_test");
      expect(metadata.renderHeight).toBe(100);
    });

    it("should add priority pattern rule first", () => {
      VisualPackLoader.addPatternRule({
        pattern: /priority_test/i,
        renderHeight: 99,
        heightClassification: "low",
        canOccludePlayer: false
      }, true);

      const rules = VisualPackLoader.getPatternRules();
      expect(rules[0].pattern.test("priority_test")).toBe(true);
    });
  });

  describe("version detection", () => {
    it("should detect v2 by visualPackVersion field", () => {
      const v2Pack = {
        visualPackVersion: 2,
        contentId: "test:item",
        renderHeight: 10,
        heightClassification: "low" as const,
        footprint: { widthTiles: 1, depthTiles: 1 }
      };

      const result = VisualPackLoader.load(v2Pack);
      expect(result.version).toBe(2);
    });

    it("should detect v1 by absence of visualPackVersion", () => {
      const v1Pack = {
        contentId: "test:item"
      };

      const result = VisualPackLoader.load(v1Pack);
      expect(result.version).toBe(1);
    });

    it("should treat non-2 version as v1", () => {
      const v3Pack = {
        visualPackVersion: 3,
        contentId: "test:item"
      };

      const result = VisualPackLoader.load(v3Pack);
      expect(result.version).toBe(1);
      expect(result.usedFallback).toBe(true);
    });
  });
});
