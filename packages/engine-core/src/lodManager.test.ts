import { describe, it, expect, beforeEach } from "vitest";
import {
  LODManager,
  DEFAULT_LOD_CONFIG,
  DEFAULT_LOD_SETTINGS,
  hasShadows,
  hasAnimation,
  hasAlpha,
  type LODConfig,
  type LODSettings
} from "./lodManager";

describe("LODManager", () => {
  let manager: LODManager;

  beforeEach(() => {
    manager = new LODManager();
  });

  describe("constructor", () => {
    it("should use default config", () => {
      const config = manager.getConfig();
      expect(config.nearThreshold).toBe(200);
      expect(config.mediumThreshold).toBe(500);
      expect(config.transitionHysteresis).toBe(20);
    });

    it("should accept custom config", () => {
      const customManager = new LODManager({
        nearThreshold: 150,
        mediumThreshold: 400
      });
      const config = customManager.getConfig();
      expect(config.nearThreshold).toBe(150);
      expect(config.mediumThreshold).toBe(400);
      expect(config.transitionHysteresis).toBe(20); // Default
    });
  });

  describe("getLODForEntity", () => {
    it("should return near for close entities", () => {
      const lod = manager.getLODForEntity(100, 100, 100, 100, "entity1");
      expect(lod).toBe("near");
    });

    it("should return near for entities at threshold boundary", () => {
      // Distance of 199 should be near
      const lod = manager.getLODForEntity(0, 0, 0, 199, "entity1");
      expect(lod).toBe("near");
    });

    it("should return medium for medium distance entities", () => {
      // Distance of 300 should be medium
      const lod = manager.getLODForEntity(0, 0, 0, 300, "entity1");
      expect(lod).toBe("medium");
    });

    it("should return far for distant entities", () => {
      // Distance of 600 should be far
      const lod = manager.getLODForEntity(0, 0, 0, 600, "entity1");
      expect(lod).toBe("far");
    });

    it("should handle diagonal distances correctly", () => {
      // Entity at (100, 100), camera at (0, 0)
      // Distance = sqrt(100^2 + 100^2) = ~141
      const lod = manager.getLODForEntity(100, 100, 0, 0, "entity1");
      expect(lod).toBe("near");
    });
  });

  describe("hysteresis", () => {
    it("should not switch levels immediately at threshold", () => {
      // Start with entity near camera (near LOD)
      let lod = manager.getLODForEntity(0, 0, 0, 0, "entity1");
      expect(lod).toBe("near");

      // Move just past threshold (200 + small amount)
      lod = manager.getLODForEntity(0, 0, 0, 210, "entity1");
      // Should stay near due to hysteresis
      expect(lod).toBe("near");

      // Move past threshold + hysteresis
      lod = manager.getLODForEntity(0, 0, 0, 230, "entity1");
      // Now should switch to medium
      expect(lod).toBe("medium");
    });

    it("should maintain level when jittering around threshold", () => {
      // Start at medium distance
      manager.getLODForEntity(0, 0, 0, 300, "entity1");

      // Jitter around threshold
      for (let i = 0; i < 10; i++) {
        const y = 195 + Math.random() * 10; // Around 200 threshold
        const lod = manager.getLODForEntity(0, 0, 0, y, "entity1");
        // Should stay at medium due to hysteresis
        expect(lod).toBe("medium");
      }
    });

    it("should allow switch back after sufficient movement", () => {
      // Start far away (far LOD)
      manager.getLODForEntity(0, 0, 0, 600, "entity1");

      // Move close (well below threshold - hysteresis)
      const lod = manager.getLODForEntity(0, 0, 0, 100, "entity1");
      expect(lod).toBe("near");
    });

    it("should track different entities independently", () => {
      // Entity 1 stays near
      manager.getLODForEntity(0, 0, 0, 0, "entity1");
      
      // Entity 2 is far
      manager.getLODForEntity(0, 0, 0, 600, "entity2");

      const lod1 = manager.getLODForEntity(0, 0, 0, 0, "entity1");
      const lod2 = manager.getLODForEntity(0, 0, 0, 600, "entity2");

      expect(lod1).toBe("near");
      expect(lod2).toBe("far");
    });
  });

  describe("getSettingsForLOD", () => {
    it("should return correct settings for near level", () => {
      const settings = manager.getSettingsForLOD("near");
      expect(settings.shadowEnabled).toBe(true);
      expect(settings.animationEnabled).toBe(true);
      expect(settings.alphaEnabled).toBe(true);
      expect(settings.scale).toBe(1.0);
    });

    it("should return correct settings for medium level", () => {
      const settings = manager.getSettingsForLOD("medium");
      expect(settings.shadowEnabled).toBe(false);
      expect(settings.animationEnabled).toBe(false);
      expect(settings.alphaEnabled).toBe(true);
      expect(settings.scale).toBe(1.0);
    });

    it("should return correct settings for far level", () => {
      const settings = manager.getSettingsForLOD("far");
      expect(settings.shadowEnabled).toBe(false);
      expect(settings.animationEnabled).toBe(false);
      expect(settings.alphaEnabled).toBe(false);
      expect(settings.scale).toBe(0.5);
    });

    it("should apply custom settings", () => {
      const customManager = new LODManager({}, {
        far: { scale: 0.3, shadowEnabled: true }
      });

      const settings = customManager.getSettingsForLOD("far");
      expect(settings.scale).toBe(0.3);
      expect(settings.shadowEnabled).toBe(true);
      expect(settings.animationEnabled).toBe(false); // Default for far
    });
  });

  describe("getLODSelection", () => {
    it("should return complete selection with distance", () => {
      const selection = manager.getLODSelection(100, 0, 0, 0, "entity1");

      expect(selection.level).toBe("near");
      expect(selection.distance).toBe(100);
      expect(selection.settings.shadowEnabled).toBe(true);
    });
  });

  describe("processEntities", () => {
    it("should process multiple entities", () => {
      const entities = [
        { id: "near", x: 0, y: 0 },
        { id: "medium", x: 0, y: 300 },
        { id: "far", x: 0, y: 600 }
      ];

      const results = manager.processEntities(entities, 0, 0);

      expect(results.get("near")).toBe("near");
      expect(results.get("medium")).toBe("medium");
      expect(results.get("far")).toBe("far");
    });

    it("should return empty map for empty input", () => {
      const results = manager.processEntities([], 0, 0);
      expect(results.size).toBe(0);
    });
  });

  describe("processEntitiesWithSettings", () => {
    it("should return selections with settings", () => {
      const entities = [
        { id: "entity1", x: 0, y: 100 }
      ];

      const results = manager.processEntitiesWithSettings(entities, 0, 0);
      const selection = results.get("entity1");

      expect(selection).toBeDefined();
      expect(selection?.level).toBe("near");
      expect(selection?.settings.shadowEnabled).toBe(true);
    });
  });

  describe("configuration", () => {
    it("should update config", () => {
      manager.setConfig({ nearThreshold: 150 });
      expect(manager.getConfig().nearThreshold).toBe(150);
    });

    it("should preserve unchanged config values", () => {
      manager.setConfig({ nearThreshold: 150 });
      expect(manager.getConfig().mediumThreshold).toBe(500); // Unchanged
    });

    it("should set custom settings", () => {
      manager.setCustomSettings({
        near: { scale: 1.2 }
      });

      const settings = manager.getSettingsForLOD("near");
      expect(settings.scale).toBe(1.2);
      expect(settings.shadowEnabled).toBe(true); // Default preserved
    });
  });

  describe("clear", () => {
    it("should clear all hysteresis state", () => {
      // Establish some state
      manager.getLODForEntity(0, 0, 0, 0, "entity1");
      
      // Clear all
      manager.clear();
      
      const stats = manager.getStats();
      expect(stats.trackedEntityCount).toBe(0);
    });

    it("should clear specific entity", () => {
      // Establish state for two entities
      manager.getLODForEntity(0, 0, 0, 0, "entity1");
      manager.getLODForEntity(0, 0, 0, 0, "entity2");
      
      // Clear only entity1
      manager.clearEntity("entity1");
      
      const stats = manager.getStats();
      expect(stats.trackedEntityCount).toBe(1);
    });
  });

  describe("calculateDistance", () => {
    it("should calculate Euclidean distance", () => {
      const distance = manager.calculateDistance(0, 0, 3, 4);
      expect(distance).toBe(5); // 3-4-5 triangle
    });

    it("should handle same position", () => {
      const distance = manager.calculateDistance(100, 100, 100, 100);
      expect(distance).toBe(0);
    });

    it("should handle negative coordinates", () => {
      const distance = manager.calculateDistance(-3, -4, 0, 0);
      expect(distance).toBe(5);
    });
  });

  describe("getStats", () => {
    it("should return tracked entity count", () => {
      manager.getLODForEntity(0, 0, 0, 0, "entity1");
      manager.getLODForEntity(0, 0, 0, 0, "entity2");
      
      const stats = manager.getStats();
      expect(stats.trackedEntityCount).toBe(2);
    });

    it("should return current config", () => {
      const stats = manager.getStats();
      expect(stats.config.nearThreshold).toBe(200);
    });
  });
});

describe("DEFAULT_LOD_CONFIG", () => {
  it("should have correct default thresholds", () => {
    expect(DEFAULT_LOD_CONFIG.nearThreshold).toBe(200);
    expect(DEFAULT_LOD_CONFIG.mediumThreshold).toBe(500);
    expect(DEFAULT_LOD_CONFIG.transitionHysteresis).toBe(20);
  });
});

describe("DEFAULT_LOD_SETTINGS", () => {
  it("should have correct near settings", () => {
    expect(DEFAULT_LOD_SETTINGS.near.shadowEnabled).toBe(true);
    expect(DEFAULT_LOD_SETTINGS.near.animationEnabled).toBe(true);
    expect(DEFAULT_LOD_SETTINGS.near.alphaEnabled).toBe(true);
    expect(DEFAULT_LOD_SETTINGS.near.scale).toBe(1.0);
  });

  it("should have correct medium settings", () => {
    expect(DEFAULT_LOD_SETTINGS.medium.shadowEnabled).toBe(false);
    expect(DEFAULT_LOD_SETTINGS.medium.animationEnabled).toBe(false);
    expect(DEFAULT_LOD_SETTINGS.medium.alphaEnabled).toBe(true);
    expect(DEFAULT_LOD_SETTINGS.medium.scale).toBe(1.0);
  });

  it("should have correct far settings", () => {
    expect(DEFAULT_LOD_SETTINGS.far.shadowEnabled).toBe(false);
    expect(DEFAULT_LOD_SETTINGS.far.animationEnabled).toBe(false);
    expect(DEFAULT_LOD_SETTINGS.far.alphaEnabled).toBe(false);
    expect(DEFAULT_LOD_SETTINGS.far.scale).toBe(0.5);
  });
});

describe("utility functions", () => {
  describe("hasShadows", () => {
    it("should return true for near", () => {
      expect(hasShadows("near")).toBe(true);
    });

    it("should return false for medium and far", () => {
      expect(hasShadows("medium")).toBe(false);
      expect(hasShadows("far")).toBe(false);
    });
  });

  describe("hasAnimation", () => {
    it("should return true for near", () => {
      expect(hasAnimation("near")).toBe(true);
    });

    it("should return false for medium and far", () => {
      expect(hasAnimation("medium")).toBe(false);
      expect(hasAnimation("far")).toBe(false);
    });
  });

  describe("hasAlpha", () => {
    it("should return true for near and medium", () => {
      expect(hasAlpha("near")).toBe(true);
      expect(hasAlpha("medium")).toBe(true);
    });

    it("should return false for far", () => {
      expect(hasAlpha("far")).toBe(false);
    });
  });
});
