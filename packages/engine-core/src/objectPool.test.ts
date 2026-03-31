import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  ObjectPool,
  ObjectPoolGroup,
  createObjectPool,
  type PoolConfig,
  type PoolStats
} from "./objectPool";

interface TestObject {
  id: number;
  value: string;
  active: boolean;
}

describe("ObjectPool", () => {
  let pool: ObjectPool<TestObject>;
  let config: PoolConfig<TestObject>;

  beforeEach(() => {
    let idCounter = 0;
    config = {
      initialSize: 10,
      minSize: 5,
      maxSize: 50,
      factory: () => ({ id: ++idCounter, value: "", active: false }),
      reset: (obj) => {
        obj.value = "";
        obj.active = false;
      }
    };
    pool = new ObjectPool(config);
  });

  describe("constructor", () => {
    it("should pre-allocate initial size", () => {
      const stats = pool.getStats();
      expect(stats.totalAllocated).toBe(10);
      expect(stats.available).toBe(10);
      expect(stats.inUse).toBe(0);
    });

    it("should accept zero initial size", () => {
      const zeroPool = new ObjectPool({ ...config, initialSize: 0 });
      const stats = zeroPool.getStats();
      expect(stats.totalAllocated).toBe(0);
    });

    it("should throw on invalid config", () => {
      expect(() => new ObjectPool({ ...config, maxSize: 0 })).toThrow();
      expect(() => new ObjectPool({ ...config, minSize: -1 })).toThrow();
      expect(() => new ObjectPool({ ...config, minSize: 100, maxSize: 50 })).toThrow();
    });
  });

  describe("acquire", () => {
    it("should return object from pool", () => {
      const obj = pool.acquire();
      expect(obj).toBeDefined();
      expect(typeof obj.id).toBe('number');
    });

    it("should mark object as in-use", () => {
      pool.acquire();
      const stats = pool.getStats();
      expect(stats.inUse).toBe(1);
      expect(stats.available).toBe(9);
    });

    it("should increment hit count when using pooled object", () => {
      pool.acquire();
      const stats = pool.getStats();
      expect(stats.hitCount).toBe(1);
      expect(stats.missCount).toBe(0);
    });

    it("should auto-expand when pool exhausted", () => {
      // Acquire all 10 initial objects
      for (let i = 0; i < 10; i++) {
        pool.acquire();
      }

      // Next acquire should trigger expansion
      const obj = pool.acquire();
      expect(obj).toBeDefined();

      const stats = pool.getStats();
      expect(stats.expansionCount).toBeGreaterThan(0);
      expect(stats.totalAllocated).toBeGreaterThan(10);
    });

    it("should create temporary when at max size", () => {
      const smallPool = new ObjectPool({
        initialSize: 2,
        minSize: 2,
        maxSize: 3,
        factory: config.factory,
        reset: config.reset
      });

      // Acquire up to max
      smallPool.acquire();
      smallPool.acquire();
      smallPool.acquire();

      // This should create temporary
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const obj = smallPool.acquire();
      
      expect(obj).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith('[ObjectPool] Pool exhausted, creating temporary object');
      consoleSpy.mockRestore();
    });
  });

  describe("release", () => {
    it("should return object to pool", () => {
      const obj = pool.acquire();
      pool.release(obj);

      const stats = pool.getStats();
      expect(stats.inUse).toBe(0);
      expect(stats.available).toBe(10);
    });

    it("should call reset on released object", () => {
      const obj = pool.acquire();
      obj.active = true;
      obj.value = "test";
      
      pool.release(obj);
      
      expect(obj.active).toBe(false);
      expect(obj.value).toBe("");
    });

    it("should warn on releasing unmanaged object", () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const unmanaged = { id: 999, value: "", active: false };
      
      pool.release(unmanaged as TestObject);
      
      expect(consoleSpy).toHaveBeenCalledWith('[ObjectPool] Releasing object not from pool');
      consoleSpy.mockRestore();
    });

    it("should not exceed max size", () => {
      const smallPool = new ObjectPool({
        ...config,
        maxSize: 5,
        initialSize: 5
      });

      const objs: TestObject[] = [];
      for (let i = 0; i < 5; i++) {
        objs.push(smallPool.acquire());
      }

      // Release all
      for (const obj of objs) {
        smallPool.release(obj);
      }

      const stats = smallPool.getStats();
      expect(stats.available).toBeLessThanOrEqual(5);
    });
  });

  describe("stats", () => {
    it("should track hit rate correctly", () => {
      // 3 hits, 1 miss (when expanding)
      pool.acquire();
      pool.acquire();
      pool.acquire();

      const stats = pool.getStats();
      expect(stats.hitCount).toBe(3);
      expect(stats.hitRate).toBe(1); // All hits so far
    });

    it("should calculate hit rate with misses", () => {
      // Drain pool
      const objs: TestObject[] = [];
      for (let i = 0; i < 15; i++) {
        objs.push(pool.acquire());
      }

      const stats = pool.getStats();
      // 10 hits from initial, 5 misses/expansions
      expect(stats.hitRate).toBeLessThan(1);
      expect(stats.hitRate).toBeGreaterThan(0);
    });

    it("should reset stats", () => {
      pool.acquire();
      pool.acquire();
      
      pool.resetStats();
      
      const stats = pool.getStats();
      expect(stats.hitCount).toBe(0);
      expect(stats.missCount).toBe(0);
      expect(stats.hitRate).toBe(0);
    });
  });

  describe("clear", () => {
    it("should reset in-use objects", () => {
      const obj = pool.acquire();
      obj.active = true;
      
      pool.clear();
      
      expect(pool.getStats().inUse).toBe(0);
    });

    it("should trim to min size", () => {
      // Create pool with 20 objects
      const largePool = new ObjectPool({
        ...config,
        initialSize: 20,
        minSize: 5
      });

      largePool.clear();
      
      const stats = largePool.getStats();
      expect(stats.available).toBe(5);
      expect(stats.totalAllocated).toBe(5);
    });
  });

  describe("warmup", () => {
    it("should expand to min size if below", () => {
      const smallPool = new ObjectPool({
        ...config,
        initialSize: 2,
        minSize: 10
      });

      expect(smallPool.getStats().available).toBe(2);
      
      smallPool.warmup();
      
      expect(smallPool.getStats().available).toBe(10);
    });

    it("should not expand if at or above min size", () => {
      pool.warmup(); // Already at initial 10, min is 5
      
      const stats = pool.getStats();
      expect(stats.available).toBe(10);
    });
  });

  describe("isManaged", () => {
    it("should return true for acquired objects", () => {
      const obj = pool.acquire();
      expect(pool.isManaged(obj)).toBe(true);
    });

    it("should return true for available objects", () => {
      const obj = pool.acquire();
      pool.release(obj);
      expect(pool.isManaged(obj)).toBe(true);
    });

    it("should return false for unmanaged objects", () => {
      const unmanaged = { id: 999, value: "", active: false };
      expect(pool.isManaged(unmanaged)).toBe(false);
    });
  });

  describe("getConfig", () => {
    it("should return config values", () => {
      const cfg = pool.getConfig();
      expect(cfg.initialSize).toBe(10);
      expect(cfg.minSize).toBe(5);
      expect(cfg.maxSize).toBe(50);
    });
  });

  describe("onExpand callback", () => {
    it("should be called on expansion", () => {
      const onExpand = vi.fn();
      const poolWithCallback = new ObjectPool({
        ...config,
        onExpand
      });

      // Drain and trigger expansion
      for (let i = 0; i < 15; i++) {
        poolWithCallback.acquire();
      }

      expect(onExpand).toHaveBeenCalled();
    });
  });

  describe("hit rate target", () => {
    it("should achieve >95% hit rate with typical usage", () => {
      // Acquire and release in steady state
      const objs: TestObject[] = [];
      
      // Warm up
      for (let i = 0; i < 100; i++) {
        objs.push(pool.acquire());
      }
      for (const obj of objs) {
        pool.release(obj);
      }
      objs.length = 0;
      pool.resetStats();

      // Steady state: acquire and release
      for (let cycle = 0; cycle < 50; cycle++) {
        for (let i = 0; i < 20; i++) {
          objs.push(pool.acquire());
        }
        for (const obj of objs) {
          pool.release(obj);
        }
        objs.length = 0;
      }

      const stats = pool.getStats();
      expect(stats.hitRate).toBeGreaterThan(0.95);
    });
  });
});

describe("createObjectPool", () => {
  it("should create pool with defaults", () => {
    const pool = createObjectPool(
      () => ({ value: 0 }),
      (obj) => { obj.value = 0; }
    );

    const config = pool.getConfig();
    expect(config.initialSize).toBe(50);
    expect(config.minSize).toBe(25);
    expect(config.maxSize).toBe(200);
  });

  it("should accept custom options", () => {
    const pool = createObjectPool(
      () => ({ value: 0 }),
      (obj) => { obj.value = 0; },
      { initialSize: 10, maxSize: 100 }
    );

    const config = pool.getConfig();
    expect(config.initialSize).toBe(10);
    expect(config.maxSize).toBe(100);
    expect(config.minSize).toBe(25); // Default
  });
});

describe("ObjectPoolGroup", () => {
  let group: ObjectPoolGroup;
  let spritePool: ObjectPool<{ id: number }>;
  let shadowPool: ObjectPool<{ id: number }>;

  beforeEach(() => {
    group = new ObjectPoolGroup();
    let id1 = 0, id2 = 100;
    
    spritePool = createObjectPool(
      () => ({ id: ++id1 }),
      () => {},
      { initialSize: 5 }
    );
    
    shadowPool = createObjectPool(
      () => ({ id: ++id2 }),
      () => {},
      { initialSize: 5 }
    );

    group.register("sprites", spritePool);
    group.register("shadows", shadowPool);
  });

  describe("register and get", () => {
    it("should register pools by name", () => {
      const retrieved = group.get<{ id: number }>("sprites");
      expect(retrieved).toBe(spritePool);
    });

    it("should return undefined for unknown pool", () => {
      expect(group.get("unknown")).toBeUndefined();
    });
  });

  describe("getAllStats", () => {
    it("should return stats for all pools", () => {
      const stats = group.getAllStats();
      
      expect(stats.has("sprites")).toBe(true);
      expect(stats.has("shadows")).toBe(true);
      expect(stats.get("sprites")?.available).toBe(5);
      expect(stats.get("shadows")?.available).toBe(5);
    });
  });

  describe("clearAll", () => {
    it("should clear all pools", () => {
      // Acquire some objects
      spritePool.acquire();
      shadowPool.acquire();

      group.clearAll();

      expect(spritePool.getStats().inUse).toBe(0);
      expect(shadowPool.getStats().inUse).toBe(0);
    });
  });

  describe("warmupAll", () => {
    it("should warmup all pools", () => {
      group.warmupAll();
      // Just verify no errors thrown
      expect(group.getAllStats().size).toBe(2);
    });
  });
});
