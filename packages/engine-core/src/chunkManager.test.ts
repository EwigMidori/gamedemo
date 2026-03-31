import { describe, it, expect, beforeEach } from "vitest";
import {
  ChunkManager,
  DEFAULT_CHUNK_CONFIG,
  defaultChunkGenerator,
  calculateChunkCount,
  calculateChunksInRadius,
  type ChunkCoord,
  type ChunkManagerConfig
} from "./chunkManager";

describe("ChunkManager", () => {
  let manager: ChunkManager;

  beforeEach(() => {
    manager = new ChunkManager();
  });

  describe("constructor", () => {
    it("should use default config", () => {
      const config = manager.getConfig();
      expect(config.chunkSize).toBe(64);
      expect(config.loadRadius).toBe(2);
      expect(config.unloadDistance).toBe(8);
      expect(config.maxConcurrentLoads).toBe(4);
    });

    it("should accept custom config", () => {
      const customManager = new ChunkManager({
        chunkSize: 32,
        loadRadius: 3
      });
      const config = customManager.getConfig();
      expect(config.chunkSize).toBe(32);
      expect(config.loadRadius).toBe(3);
      expect(config.unloadDistance).toBe(8); // Default
    });
  });

  describe("worldToChunk", () => {
    it("should convert world coordinates to chunk coordinates", () => {
      const coord = manager.worldToChunk(0, 0);
      expect(coord.cx).toBe(0);
      expect(coord.cy).toBe(0);
    });

    it("should handle positive coordinates", () => {
      const coord = manager.worldToChunk(100, 100);
      expect(coord.cx).toBe(1); // 100 / 64 = 1.56, floor = 1
      expect(coord.cy).toBe(1);
    });

    it("should handle negative coordinates correctly", () => {
      const coord = manager.worldToChunk(-1, -1);
      expect(coord.cx).toBe(-1);
      expect(coord.cy).toBe(-1);
    });

    it("should handle exact chunk boundaries", () => {
      const coord = manager.worldToChunk(64, 64);
      expect(coord.cx).toBe(1);
      expect(coord.cy).toBe(1);
    });
  });

  describe("chunkToWorld", () => {
    it("should convert chunk coordinates to world coordinates", () => {
      const world = manager.chunkToWorld({ cx: 0, cy: 0 });
      expect(world.x).toBe(0);
      expect(world.y).toBe(0);
    });

    it("should handle non-zero chunks", () => {
      const world = manager.chunkToWorld({ cx: 2, cy: 3 });
      expect(world.x).toBe(128); // 2 * 64
      expect(world.y).toBe(192); // 3 * 64
    });
  });

  describe("update", () => {
    it("should load chunks around player", () => {
      const result = manager.update(0, 0);

      // With radius 2, should load 5x5 = 25 chunks
      expect(result.loading.length).toBeGreaterThan(0);
      // Some chunks should be queued
    });

    it("should queue chunks for async loading", () => {
      manager.update(0, 0);
      const stats = manager.getStats();

      expect(stats.queueLength + stats.loadingCount).toBeGreaterThan(0);
    });

    it("should unload distant chunks", async () => {
      // Load chunks around (0, 0)
      await manager.preloadAround(0, 0);
      
      const initialCount = manager.getStats().loadedCount;
      expect(initialCount).toBeGreaterThan(0);

      // Move far away
      const result = manager.update(1000, 1000);

      expect(result.unloaded.length).toBeGreaterThan(0);
    });

    it("should track loaded chunks", async () => {
      await manager.forceLoadChunk({ cx: 0, cy: 0 });
      
      expect(manager.isChunkLoaded({ cx: 0, cy: 0 })).toBe(true);
      expect(manager.isChunkLoaded({ cx: 1, cy: 1 })).toBe(false);
    });

    it("should respect max concurrent loads", () => {
      // Create manager with limited concurrency
      const limitedManager = new ChunkManager({
        maxConcurrentLoads: 1
      });

      limitedManager.update(0, 0);
      const stats = limitedManager.getStats();

      expect(stats.loadingCount).toBeLessThanOrEqual(1);
    });
  });

  describe("getChunksAround", () => {
    it("should return chunks in radius", () => {
      const chunks = manager.getChunksAround({ cx: 0, cy: 0 });

      // With default radius 2, should return 5x5 = 25 chunks
      expect(chunks.length).toBe(25);

      // Should include center
      expect(chunks.some(c => c.cx === 0 && c.cy === 0)).toBe(true);

      // Should include corners of radius
      expect(chunks.some(c => c.cx === -2 && c.cy === -2)).toBe(true);
      expect(chunks.some(c => c.cx === 2 && c.cy === 2)).toBe(true);
    });

    it("should return correct count for different radii", () => {
      expect(manager.getChunksAround({ cx: 0, cy: 0 }).length).toBe(25); // radius 2

      const r3Manager = new ChunkManager({ loadRadius: 3 });
      expect(r3Manager.getChunksAround({ cx: 0, cy: 0 }).length).toBe(49); // radius 3: 7x7
    });
  });

  describe("forceLoadChunk", () => {
    it("should load chunk immediately", async () => {
      const chunk = await manager.forceLoadChunk({ cx: 5, cy: 5 });

      expect(chunk.coord.cx).toBe(5);
      expect(chunk.coord.cy).toBe(5);
      expect(chunk.loaded).toBe(true);
    });

    it("should return existing chunk if already loaded", async () => {
      const chunk1 = await manager.forceLoadChunk({ cx: 1, cy: 1 });
      const chunk2 = await manager.forceLoadChunk({ cx: 1, cy: 1 });

      expect(chunk1).toBe(chunk2);
    });
  });

  describe("preloadAround", () => {
    it("should preload chunks around position", async () => {
      await manager.preloadAround(32, 32); // Center of chunk (0,0)

      const stats = manager.getStats();
      expect(stats.loadedCount).toBe(25); // 5x5 grid
    });
  });

  describe("getStats", () => {
    it("should return initial stats", () => {
      const stats = manager.getStats();

      expect(stats.loadedCount).toBe(0);
      expect(stats.loadingCount).toBe(0);
      expect(stats.totalMemoryEstimate).toBe(0);
    });

    it("should track memory estimate", async () => {
      await manager.forceLoadChunk({ cx: 0, cy: 0 });

      const stats = manager.getStats();
      expect(stats.totalMemoryEstimate).toBeGreaterThan(0);
    });

    it("should track loaded/unloaded this frame", async () => {
      await manager.forceLoadChunk({ cx: 0, cy: 0 });
      
      // Move far away to trigger unload
      manager.update(1000, 1000);
      
      const stats = manager.getStats();
      expect(stats.chunksUnloadedThisFrame).toBeGreaterThan(0);
    });
  });

  describe("configuration", () => {
    it("should update config", () => {
      manager.setConfig({ chunkSize: 32 });
      expect(manager.getConfig().chunkSize).toBe(32);
    });

    it("should preserve unchanged values", () => {
      manager.setConfig({ loadRadius: 3 });
      expect(manager.getConfig().chunkSize).toBe(64); // Unchanged
    });
  });

  describe("clear", () => {
    it("should clear all chunks", async () => {
      await manager.forceLoadChunk({ cx: 0, cy: 0 });
      await manager.forceLoadChunk({ cx: 1, cy: 1 });

      manager.clear();

      expect(manager.getStats().loadedCount).toBe(0);
      expect(manager.isChunkLoaded({ cx: 0, cy: 0 })).toBe(false);
    });
  });

  describe("getLoadedBounds", () => {
    it("should return null when no chunks loaded", () => {
      expect(manager.getLoadedBounds()).toBeNull();
    });

    it("should return bounds of loaded chunks", async () => {
      await manager.forceLoadChunk({ cx: 0, cy: 0 });
      await manager.forceLoadChunk({ cx: 1, cy: 1 });

      const bounds = manager.getLoadedBounds();
      expect(bounds).not.toBeNull();
      expect(bounds!.minX).toBe(0);
      expect(bounds!.minY).toBe(0);
      expect(bounds!.maxX).toBe(128); // 2 chunks * 64
      expect(bounds!.maxY).toBe(128);
    });
  });

  describe("memory estimation", () => {
    it("should estimate memory for world size", () => {
      const memory = ChunkManager.estimateMemoryForWorld(1000, 1000, 64, 16);

      // 1000x1000 world with 64x64 chunks = ~250x250 chunks
      // Each chunk has 64*64 tiles, each tile 16 bytes
      expect(memory).toBeGreaterThan(0);
    });

    it("should scale with world size", () => {
      const mem1 = ChunkManager.estimateMemoryForWorld(100, 100, 64, 16);
      const mem2 = ChunkManager.estimateMemoryForWorld(200, 200, 64, 16);

      expect(mem2).toBeGreaterThan(mem1);
    });
  });

  describe("1000x1000 world", () => {
    it("should handle large world coordinates", () => {
      const coord = manager.worldToChunk(1000, 1000);
      expect(coord.cx).toBe(15); // 1000 / 64 = 15.625
      expect(coord.cy).toBe(15);
    });

    it("should calculate correct number of chunks", () => {
      const { total } = calculateChunkCount(1000, 1000, 64);
      expect(total).toBe(256); // 16x16 grid
    });

    it("should load chunks in 5x5 radius", async () => {
      const centerManager = new ChunkManager({ loadRadius: 2 });
      await centerManager.preloadAround(500, 500);

      const stats = centerManager.getStats();
      expect(stats.loadedCount).toBe(25); // 5x5
    });
  });
});

describe("DEFAULT_CHUNK_CONFIG", () => {
  it("should have correct defaults", () => {
    expect(DEFAULT_CHUNK_CONFIG.chunkSize).toBe(64);
    expect(DEFAULT_CHUNK_CONFIG.loadRadius).toBe(2);
    expect(DEFAULT_CHUNK_CONFIG.unloadDistance).toBe(8);
    expect(DEFAULT_CHUNK_CONFIG.maxConcurrentLoads).toBe(4);
  });
});

describe("defaultChunkGenerator", () => {
  it("should create empty chunk", async () => {
    const chunk = await defaultChunkGenerator({ cx: 0, cy: 0 }, 64);

    expect(chunk.coord.cx).toBe(0);
    expect(chunk.coord.cy).toBe(0);
    expect(chunk.tiles).toEqual([]);
    expect(chunk.entities).toEqual([]);
    expect(chunk.loaded).toBe(true);
  });
});

describe("calculateChunkCount", () => {
  it("should calculate chunks for exact fit", () => {
    const result = calculateChunkCount(128, 128, 64);
    expect(result.chunksX).toBe(2);
    expect(result.chunksY).toBe(2);
    expect(result.total).toBe(4);
  });

  it("should round up for partial chunks", () => {
    const result = calculateChunkCount(100, 100, 64);
    expect(result.chunksX).toBe(2);
    expect(result.chunksY).toBe(2);
    expect(result.total).toBe(4);
  });

  it("should handle 1000x1000", () => {
    const result = calculateChunkCount(1000, 1000, 64);
    expect(result.chunksX).toBe(16); // ceil(1000/64) = 16
    expect(result.chunksY).toBe(16);
    expect(result.total).toBe(256);
  });
});

describe("calculateChunksInRadius", () => {
  it("should calculate correct count", () => {
    expect(calculateChunksInRadius(0)).toBe(1);    // 1x1
    expect(calculateChunksInRadius(1)).toBe(9);    // 3x3
    expect(calculateChunksInRadius(2)).toBe(25);   // 5x5
    expect(calculateChunksInRadius(3)).toBe(49);   // 7x7
  });
});
