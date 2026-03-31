import { describe, it, expect, beforeEach } from "vitest";
import {
  LayeredRenderPipeline,
  FrustumCullStage,
  DepthSortStage,
  OcclusionStage,
  type PipelineConfig,
  type RenderContext,
  type PipelineEntity,
  DEFAULT_PIPELINE_CONFIG
} from "./renderPipeline";

describe("LayeredRenderPipeline", () => {
  let pipeline: LayeredRenderPipeline;
  let context: RenderContext;

  beforeEach(() => {
    pipeline = new LayeredRenderPipeline();
    context = {
      camera: { x: 0, y: 0, width: 100, height: 100, zoom: 1 },
      playerPosition: { x: 50, y: 50 },
      frameCount: 0
    };
  });

  describe("constructor", () => {
    it("should use default config", () => {
      const config = pipeline.getConfig();
      expect(config.enableFrustumCull).toBe(true);
      expect(config.enableDepthSort).toBe(true);
      expect(config.enableOcclusion).toBe(true);
      expect(config.frustumMargin).toBe(0.1);
    });

    it("should accept custom config", () => {
      const customPipeline = new LayeredRenderPipeline({
        enableFrustumCull: false,
        frustumMargin: 0.2
      });
      const config = customPipeline.getConfig();
      expect(config.enableFrustumCull).toBe(false);
      expect(config.frustumMargin).toBe(0.2);
      expect(config.enableDepthSort).toBe(true); // Default
    });
  });

  describe("process", () => {
    it("should process entities through all stages", () => {
      const entities: PipelineEntity[] = [
        { id: "1", x: 10, y: 10, width: 10, height: 10, type: "resource" },
        { id: "2", x: 50, y: 50, width: 10, height: 10, type: "resource" },
        { id: "3", x: 90, y: 90, width: 10, height: 10, type: "resource" }
      ];

      const result = pipeline.process(entities, context);

      expect(result.finalEntities.length).toBeGreaterThan(0);
      expect(result.stageTimings.has("frustumCull")).toBe(true);
      expect(result.stageTimings.has("depthSort")).toBe(true);
      expect(result.entitiesAtEachStage.has("input")).toBe(true);
    });

    it("should filter entities through frustum culling stage", () => {
      const entities: PipelineEntity[] = [
        { id: "visible", x: 10, y: 10, width: 10, height: 10, type: "resource" },
        { id: "hidden", x: 200, y: 200, width: 10, height: 10, type: "resource" }
      ];

      const result = pipeline.process(entities, context);

      // Only the visible entity should remain after frustum cull
      const ids = result.finalEntities.map(e => e.id);
      expect(ids).toContain("visible");
      expect(ids).not.toContain("hidden");
    });

    it("should sort entities by depth", () => {
      const entities: PipelineEntity[] = [
        { id: "front", x: 10, y: 80, width: 10, height: 10, type: "resource" },
        { id: "back", x: 10, y: 20, width: 10, height: 10, type: "resource" },
        { id: "middle", x: 10, y: 50, width: 10, height: 10, type: "resource" }
      ];

      const result = pipeline.process(entities, context);

      // Should be sorted by Y (back to front: low Y to high Y)
      const ids = result.finalEntities.map(e => e.id);
      expect(ids.indexOf("back")).toBeLessThan(ids.indexOf("front"));
      expect(ids.indexOf("middle")).toBeGreaterThan(ids.indexOf("back"));
      expect(ids.indexOf("middle")).toBeLessThan(ids.indexOf("front"));
    });

    it("should track timing for each stage", () => {
      const entities: PipelineEntity[] = [
        { id: "1", x: 10, y: 10, width: 10, height: 10, type: "resource" }
      ];

      const result = pipeline.process(entities, context);

      expect(result.totalTimeMs).toBeGreaterThanOrEqual(0);
      for (const [_, timing] of result.stageTimings) {
        expect(timing).toBeGreaterThanOrEqual(0);
      }
    });

    it("should handle empty input", () => {
      const result = pipeline.process([], context);

      expect(result.finalEntities).toEqual([]);
      expect(result.totalTimeMs).toBeGreaterThanOrEqual(0);
    });

    it("should handle single entity", () => {
      const entities: PipelineEntity[] = [
        { id: "single", x: 50, y: 50, width: 10, height: 10, type: "resource" }
      ];

      const result = pipeline.process(entities, context);

      expect(result.finalEntities.length).toBe(1);
      expect(result.finalEntities[0].id).toBe("single");
    });
  });

  describe("stage management", () => {
    it("should return all stage names", () => {
      const names = pipeline.getStageNames();
      expect(names).toContain("frustumCull");
      expect(names).toContain("depthSort");
      expect(names).toContain("occlusion");
    });

    it("should get a stage by name", () => {
      const stage = pipeline.getStage("frustumCull");
      expect(stage).toBeDefined();
      expect(stage?.name).toBe("frustumCull");
    });

    it("should return undefined for unknown stage", () => {
      const stage = pipeline.getStage("unknown");
      expect(stage).toBeUndefined();
    });

    it("should add a custom stage", () => {
      const customStage: import("./renderPipeline").RenderStage = {
        name: "custom",
        enabled: true,
        process: (entities) => entities,
        getLastTimingMs: () => 0,
        setEnabled: () => {}
      };

      pipeline.addStage(customStage);
      expect(pipeline.getStageNames()).toContain("custom");
    });

    it("should remove a stage by name", () => {
      pipeline.removeStage("occlusion");
      expect(pipeline.getStageNames()).not.toContain("occlusion");
    });
  });

  describe("configuration", () => {
    it("should update config", () => {
      pipeline.setConfig({ frustumMargin: 0.2 });
      expect(pipeline.getConfig().frustumMargin).toBe(0.2);
    });

    it("should disable stages via config", () => {
      pipeline.setConfig({ enableFrustumCull: false });
      
      const entities: PipelineEntity[] = [
        { id: "far", x: 200, y: 200, width: 10, height: 10, type: "resource" }
      ];

      // With frustum culling disabled, far entity should remain
      const result = pipeline.process(entities, context);
      expect(result.finalEntities.map(e => e.id)).toContain("far");
    });
  });

  describe("statistics", () => {
    it("should track last result", () => {
      const entities: PipelineEntity[] = [
        { id: "1", x: 10, y: 10, width: 10, height: 10, type: "resource" }
      ];

      pipeline.process(entities, context);
      const lastResult = pipeline.getLastResult();

      expect(lastResult).not.toBeNull();
      expect(lastResult?.finalEntities.length).toBe(1);
    });

    it("should calculate average timing", () => {
      const entities: PipelineEntity[] = [
        { id: "1", x: 10, y: 10, width: 10, height: 10, type: "resource" }
      ];

      // Process multiple times
      for (let i = 0; i < 10; i++) {
        pipeline.process(entities, context);
      }

      const avg = pipeline.getAverageTimeMs();
      expect(avg).toBeGreaterThanOrEqual(0);
    });

    it("should reset timing history", () => {
      const entities: PipelineEntity[] = [
        { id: "1", x: 10, y: 10, width: 10, height: 10, type: "resource" }
      ];

      pipeline.process(entities, context);
      pipeline.resetTimingHistory();

      expect(pipeline.getAverageTimeMs()).toBe(0);
    });
  });

  describe("performance", () => {
    it("should process 1000 entities in less than 8ms", () => {
      const entities: PipelineEntity[] = [];
      for (let i = 0; i < 1000; i++) {
        entities.push({
          id: `obj${i}`,
          x: Math.random() * 200,
          y: Math.random() * 200,
          width: 16,
          height: 16,
          type: "resource"
        });
      }

      const startTime = performance.now();
      const result = pipeline.process(entities, context);
      const elapsedMs = performance.now() - startTime;

      expect(elapsedMs).toBeLessThan(8);
      expect(result.totalTimeMs).toBeLessThan(8);
    });

    it("should show entity reduction at each stage", () => {
      // Create entities spread across world
      const entities: PipelineEntity[] = [];
      for (let i = 0; i < 500; i++) {
        entities.push({
          id: `obj${i}`,
          x: (i % 25) * 20,
          y: Math.floor(i / 25) * 20,
          width: 16,
          height: 16,
          type: "resource"
        });
      }

      const result = pipeline.process(entities, context);

      // Should show entity count at each stage
      const inputCount = result.entitiesAtEachStage.get("input");
      const frustumCount = result.entitiesAtEachStage.get("frustumCull");
      
      expect(inputCount).toBe(500);
      // Frustum culling should reduce count (only ~25 entities visible in 100x100 view)
      expect(frustumCount).toBeLessThan(inputCount!);
    });
  });
});

describe("FrustumCullStage", () => {
  let stage: FrustumCullStage;
  let context: RenderContext;

  beforeEach(() => {
    stage = new FrustumCullStage(0.1);
    context = {
      camera: { x: 0, y: 0, width: 100, height: 100, zoom: 1 },
      playerPosition: { x: 50, y: 50 },
      frameCount: 0
    };
  });

  it("should cull entities outside frustum", () => {
    const entities: PipelineEntity[] = [
      { id: "inside", x: 10, y: 10, width: 10, height: 10, type: "resource" },
      { id: "outside", x: 200, y: 200, width: 10, height: 10, type: "resource" }
    ];

    const result = stage.process(entities, context);

    expect(result.map(e => e.id)).toContain("inside");
    expect(result.map(e => e.id)).not.toContain("outside");
  });

  it("should include entities within margin", () => {
    // Entity at 105 is within 10% margin of 100-width frustum
    const entities: PipelineEntity[] = [
      { id: "edge", x: 95, y: 50, width: 20, height: 10, type: "resource" }
    ];

    const result = stage.process(entities, context);

    expect(result.map(e => e.id)).toContain("edge");
  });
});

describe("DepthSortStage", () => {
  let stage: DepthSortStage;
  let context: RenderContext;

  beforeEach(() => {
    stage = new DepthSortStage();
    context = {
      camera: { x: 0, y: 0, width: 100, height: 100, zoom: 1 },
      playerPosition: { x: 50, y: 50 },
      frameCount: 0
    };
  });

  it("should sort by Y position", () => {
    const entities: PipelineEntity[] = [
      { id: "front", x: 0, y: 80, width: 10, height: 10, type: "resource" },
      { id: "back", x: 0, y: 20, width: 10, height: 10, type: "resource" }
    ];

    const result = stage.process(entities, context);

    expect(result[0].id).toBe("back");
    expect(result[1].id).toBe("front");
  });

  it("should preserve all entities", () => {
    const entities: PipelineEntity[] = [
      { id: "a", x: 10, y: 10, width: 10, height: 10, type: "resource" },
      { id: "b", x: 20, y: 20, width: 10, height: 10, type: "resource" },
      { id: "c", x: 30, y: 30, width: 10, height: 10, type: "resource" }
    ];

    const result = stage.process(entities, context);

    expect(result.length).toBe(3);
    expect(result.map(e => e.id).sort()).toEqual(["a", "b", "c"]);
  });
});

describe("OcclusionStage", () => {
  let stage: OcclusionStage;
  let context: RenderContext;

  beforeEach(() => {
    stage = new OcclusionStage(2);
    context = {
      camera: { x: 0, y: 0, width: 100, height: 100, zoom: 1 },
      playerPosition: { x: 50, y: 50 },
      frameCount: 0
    };
  });

  it("should only run on correct frames", () => {
    const entities: PipelineEntity[] = [
      { id: "1", x: 50, y: 50, width: 10, height: 10, type: "structure" }
    ];

    // Frame 0 - should run
    context.frameCount = 0;
    stage.process(entities, context);
    expect(stage.getLastTimingMs()).toBeGreaterThanOrEqual(0);

    // Frame 1 - should skip
    context.frameCount = 1;
    stage.process(entities, context);
    expect(stage.getLastTimingMs()).toBe(0);
  });

  it("should mark entities occluding player", () => {
    const entities: PipelineEntity[] = [
      { id: "occluding", x: 45, y: 55, width: 20, height: 10, type: "structure" },
      { id: "notOccluding", x: 10, y: 10, width: 10, height: 10, type: "resource" }
    ];

    context.frameCount = 0;
    const result = stage.process(entities, context);

    const occluding = result.find(e => e.id === "occluding");
    const notOccluding = result.find(e => e.id === "notOccluding");

    expect(occluding?.visible).toBe(false);
    expect(notOccluding?.visible).toBe(true);
  });
});

describe("DEFAULT_PIPELINE_CONFIG", () => {
  it("should have correct defaults", () => {
    expect(DEFAULT_PIPELINE_CONFIG.enableFrustumCull).toBe(true);
    expect(DEFAULT_PIPELINE_CONFIG.enableDepthSort).toBe(true);
    expect(DEFAULT_PIPELINE_CONFIG.enableOcclusion).toBe(true);
    expect(DEFAULT_PIPELINE_CONFIG.frustumMargin).toBe(0.1);
    expect(DEFAULT_PIPELINE_CONFIG.occlusionCheckInterval).toBe(2);
  });
});
