import { describe, it, expect, beforeEach } from "vitest";
import {
  FrustumCuller,
  createFrustumBoundsFromCamera,
  createFrustumBoundsFromTiles,
  type FrustumBounds
} from "./frustumCuller";
import type { SpatialObject } from "./spatialIndex";

describe("FrustumCuller", () => {
  let culler: FrustumCuller;

  beforeEach(() => {
    culler = new FrustumCuller(0.1); // 10% margin
  });

  describe("constructor", () => {
    it("should use default margin of 0.1", () => {
      const defaultCuller = new FrustumCuller();
      expect(defaultCuller.getMargin()).toBe(0.1);
    });

    it("should accept custom margin", () => {
      const customCuller = new FrustumCuller(0.2);
      expect(customCuller.getMargin()).toBe(0.2);
    });

    it("should clamp negative margin to 0", () => {
      const negativeCuller = new FrustumCuller(-0.1);
      expect(negativeCuller.getMargin()).toBe(0);
    });
  });

  describe("setMargin", () => {
    it("should update margin", () => {
      culler.setMargin(0.15);
      expect(culler.getMargin()).toBe(0.15);
    });

    it("should clamp negative margin to 0", () => {
      culler.setMargin(-0.5);
      expect(culler.getMargin()).toBe(0);
    });
  });

  describe("cull", () => {
    const viewBounds: FrustumBounds = {
      left: 0,
      right: 100,
      top: 0,
      bottom: 100
    };

    it("should return object fully inside frustum", () => {
      const objects: SpatialObject[] = [
        { id: "obj1", x: 40, y: 40, width: 20, height: 20 }
      ];

      const result = culler.cull(objects, viewBounds);

      expect(result.visibleCount).toBe(1);
      expect(result.visibleObjects[0].id).toBe("obj1");
    });

    it("should filter out object fully outside frustum", () => {
      const objects: SpatialObject[] = [
        { id: "obj1", x: 150, y: 150, width: 20, height: 20 }
      ];

      const result = culler.cull(objects, viewBounds);

      expect(result.visibleCount).toBe(0);
    });

    it("should include object partially inside frustum (intersects edge)", () => {
      const objects: SpatialObject[] = [
        { id: "obj1", x: 90, y: 40, width: 30, height: 20 } // Extends past right edge
      ];

      const result = culler.cull(objects, viewBounds);

      expect(result.visibleCount).toBe(1);
    });

    it("should handle object at each edge of frustum", () => {
      const objects: SpatialObject[] = [
        { id: "left", x: -5, y: 40, width: 10, height: 20 },    // Left edge with margin
        { id: "right", x: 95, y: 40, width: 10, height: 20 },  // Right edge with margin
        { id: "top", x: 40, y: -5, width: 20, height: 10 },    // Top edge with margin
        { id: "bottom", x: 40, y: 95, width: 20, height: 10 }  // Bottom edge with margin
      ];

      const result = culler.cull(objects, viewBounds);

      expect(result.visibleCount).toBe(4);
    });

    it("should cull multiple objects correctly", () => {
      const objects: SpatialObject[] = [
        { id: "visible1", x: 10, y: 10, width: 10, height: 10 },
        { id: "visible2", x: 50, y: 50, width: 10, height: 10 },
        { id: "hidden", x: 200, y: 200, width: 10, height: 10 },
        { id: "visible3", x: 80, y: 80, width: 10, height: 10 }
      ];

      const result = culler.cull(objects, viewBounds);

      expect(result.visibleCount).toBe(3);
      expect(result.totalChecked).toBe(4);
      expect(result.visibleObjects.map(o => o.id)).toContain("visible1");
      expect(result.visibleObjects.map(o => o.id)).toContain("visible2");
      expect(result.visibleObjects.map(o => o.id)).toContain("visible3");
      expect(result.visibleObjects.map(o => o.id)).not.toContain("hidden");
    });

    it("should handle empty input", () => {
      const result = culler.cull([], viewBounds);

      expect(result.visibleCount).toBe(0);
      expect(result.totalChecked).toBe(0);
      expect(result.visibleObjects).toEqual([]);
    });

    it("should handle single object", () => {
      const objects: SpatialObject[] = [
        { id: "single", x: 50, y: 50, width: 10, height: 10 }
      ];

      const result = culler.cull(objects, viewBounds);

      expect(result.visibleCount).toBe(1);
      expect(result.totalChecked).toBe(1);
    });

    it("should track culling time", () => {
      const objects: SpatialObject[] = [
        { id: "obj1", x: 50, y: 50, width: 10, height: 10 }
      ];

      const result = culler.cull(objects, viewBounds);

      expect(result.cullTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.cullTimeMs).toBe("number");
    });

    it("should apply margin expansion correctly", () => {
      // Object just outside default bounds but inside 10% margin
      const objects: SpatialObject[] = [
        { id: "edge", x: 105, y: 50, width: 10, height: 10 } // Just past right edge (100)
      ];

      // With 10% margin, visible area extends to 110 on right
      const result = culler.cull(objects, viewBounds);
      expect(result.visibleCount).toBe(1);
    });

    it("should cull objects outside expanded margin", () => {
      // Object well outside expanded bounds
      const objects: SpatialObject[] = [
        { id: "far", x: 150, y: 50, width: 10, height: 10 } // Well past 10% margin
      ];

      const result = culler.cull(objects, viewBounds);
      expect(result.visibleCount).toBe(0);
    });
  });

  describe("isVisible", () => {
    const viewBounds: FrustumBounds = {
      left: 0,
      right: 100,
      top: 0,
      bottom: 100
    };

    it("should return true for point inside frustum", () => {
      expect(culler.isVisible(50, 50, viewBounds)).toBe(true);
    });

    it("should return false for point outside frustum", () => {
      expect(culler.isVisible(150, 150, viewBounds)).toBe(false);
    });

    it("should return true for point within margin", () => {
      // Point at 105 is within 10% margin of 100-width frustum
      expect(culler.isVisible(105, 50, viewBounds)).toBe(true);
    });

    it("should handle point exactly at edge", () => {
      expect(culler.isVisible(0, 50, viewBounds)).toBe(true);
      expect(culler.isVisible(100, 50, viewBounds)).toBe(true);
    });
  });

  describe("isObjectVisible", () => {
    const viewBounds: FrustumBounds = {
      left: 0,
      right: 100,
      top: 0,
      bottom: 100
    };

    it("should return true for object inside frustum", () => {
      const obj: SpatialObject = { id: "obj", x: 40, y: 40, width: 20, height: 20 };
      expect(culler.isObjectVisible(obj, viewBounds)).toBe(true);
    });

    it("should return false for object outside frustum", () => {
      const obj: SpatialObject = { id: "obj", x: 150, y: 150, width: 20, height: 20 };
      expect(culler.isObjectVisible(obj, viewBounds)).toBe(false);
    });
  });

  describe("getStats", () => {
    it("should return current margin", () => {
      const stats = culler.getStats();
      expect(stats.margin).toBe(0.1);
    });

    it("should return last cull time after culling", () => {
      const objects: SpatialObject[] = [
        { id: "obj", x: 50, y: 50, width: 10, height: 10 }
      ];
      const bounds: FrustumBounds = { left: 0, right: 100, top: 0, bottom: 100 };
      
      culler.cull(objects, bounds);
      const stats = culler.getStats();
      
      expect(stats.lastCullTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("performance", () => {
    it("should cull 1000 objects in less than 0.1ms", () => {
      const objects: SpatialObject[] = [];
      for (let i = 0; i < 1000; i++) {
        objects.push({
          id: `obj${i}`,
          x: Math.random() * 1000,
          y: Math.random() * 1000,
          width: 16,
          height: 16
        });
      }

      const bounds: FrustumBounds = {
        left: 100,
        right: 300,
        top: 100,
        bottom: 300
      };

      const startTime = performance.now();
      const result = culler.cull(objects, bounds);
      const elapsedMs = performance.now() - startTime;

      expect(elapsedMs).toBeLessThan(0.1);
      expect(result.totalChecked).toBe(1000);
    });

    it("should demonstrate culling efficiency with result stats", () => {
      // Create 1000 objects spread across a large area
      const objects: SpatialObject[] = [];
      for (let i = 0; i < 1000; i++) {
        objects.push({
          id: `obj${i}`,
          x: (i % 50) * 32,  // Spread across 50x20 grid
          y: Math.floor(i / 50) * 32,
          width: 16,
          height: 16
        });
      }

      // Small view that only sees a fraction of objects
      const bounds: FrustumBounds = {
        left: 100,
        right: 200,
        top: 100,
        bottom: 200
      };

      const result = culler.cull(objects, bounds);

      // Should cull majority of objects (only ~9 visible in this small window)
      expect(result.visibleCount).toBeLessThan(result.totalChecked * 0.1);
      expect(result.cullTimeMs).toBeLessThan(0.5); // Including test overhead
    });
  });
});

describe("createFrustumBoundsFromCamera", () => {
  it("should convert Phaser camera worldView to frustum bounds", () => {
    const worldView = {
      x: 100,
      y: 200,
      width: 800,
      height: 600
    };

    const bounds = createFrustumBoundsFromCamera(worldView);

    expect(bounds.left).toBe(100);
    expect(bounds.top).toBe(200);
    expect(bounds.right).toBe(900);   // 100 + 800
    expect(bounds.bottom).toBe(800);  // 200 + 600
  });
});

describe("createFrustumBoundsFromTiles", () => {
  it("should convert tile coordinates to frustum bounds", () => {
    const bounds = createFrustumBoundsFromTiles(0, 0, 9, 9, 16);

    expect(bounds.left).toBe(0);
    expect(bounds.top).toBe(0);
    expect(bounds.right).toBe(160);  // (9 + 1) * 16
    expect(bounds.bottom).toBe(160); // (9 + 1) * 16
  });

  it("should handle non-zero origin", () => {
    const bounds = createFrustumBoundsFromTiles(5, 5, 14, 14, 16);

    expect(bounds.left).toBe(80);     // 5 * 16
    expect(bounds.top).toBe(80);      // 5 * 16
    expect(bounds.right).toBe(240);   // (14 + 1) * 16
    expect(bounds.bottom).toBe(240);  // (14 + 1) * 16
  });
});
