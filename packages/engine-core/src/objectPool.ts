/**
 * Generic Object Pool for Efficient Memory Management
 * 
 * Eliminates GC pressure by reusing objects instead of creating/destroying.
 * Pre-allocates objects at startup and manages their lifecycle.
 * 
 * Features:
 * - Configurable initial/min/max sizes
 * - Automatic expansion when exhausted (with logging)
 * - Hit rate tracking (>95% target)
 * - Zero GC pressure under steady-state operation
 */

/**
 * Configuration for object pool
 */
export interface PoolConfig<T> {
  /** Initial number of objects to pre-allocate */
  initialSize: number;
  /** Minimum objects to keep in pool */
  minSize: number;
  /** Maximum pool size (hard limit) */
  maxSize: number;
  /** Factory function to create new objects */
  factory: () => T;
  /** Reset function to prepare object for reuse */
  reset: (obj: T) => void;
  /** Optional callback when pool expands */
  onExpand?: (newSize: number) => void;
}

/**
 * Pool statistics for monitoring
 */
export interface PoolStats {
  /** Total objects allocated (available + in use) */
  totalAllocated: number;
  /** Objects currently available in pool */
  available: number;
  /** Objects currently in use */
  inUse: number;
  /** Number of successful acquires from pool */
  hitCount: number;
  /** Number of times factory was called (misses) */
  missCount: number;
  /** Number of times pool expanded */
  expansionCount: number;
  /** Hit rate as percentage (0-1) */
  hitRate: number;
}

/**
 * Generic object pool for efficient memory management
 * 
 * @example
 * ```typescript
 * const pool = new ObjectPool<Phaser.GameObjects.Image>({
 *   initialSize: 100,
 *   minSize: 50,
 *   maxSize: 500,
 *   factory: () => scene.add.image(0, 0, 'texture'),
 *   reset: (sprite) => {
 *     sprite.setVisible(false);
 *     sprite.setPosition(0, 0);
 *   }
 * });
 * 
 * const sprite = pool.acquire();
 * // ... use sprite ...
 * pool.release(sprite);
 * ```
 */
export class ObjectPool<T> {
  private available: T[] = [];
  private inUse = new Set<T>();
  private config: PoolConfig<T>;
  private stats = {
    hitCount: 0,
    missCount: 0,
    expansionCount: 0
  };

  /**
   * Create a new object pool
   */
  constructor(config: PoolConfig<T>) {
    this.validateConfig(config);
    this.config = config;
    this.preAllocate(config.initialSize);
  }

  /**
   * Acquire an object from the pool
   * @returns Object from pool (preferably) or newly created
   */
  acquire(): T {
    if (this.available.length > 0) {
      this.stats.hitCount++;
      const obj = this.available.pop()!;
      this.inUse.add(obj);
      return obj;
    }

    this.stats.missCount++;

    // Auto-expand if under max
    const currentSize = this.available.length + this.inUse.size;
    if (currentSize < this.config.maxSize) {
      this.expand();
      return this.acquire();
    }

    // Pool exhausted - create temporary (not tracked)
    console.warn('[ObjectPool] Pool exhausted, creating temporary object');
    return this.config.factory();
  }

  /**
   * Release an object back to the pool
   * @param obj - Object to return to pool
   */
  release(obj: T): void {
    if (!this.inUse.has(obj)) {
      console.warn('[ObjectPool] Releasing object not from pool');
      return;
    }

    this.inUse.delete(obj);
    this.config.reset(obj);

    // Don't exceed max, but keep at least min
    if (this.available.length < this.config.maxSize) {
      this.available.push(obj);
    }
  }

  /**
   * Get current pool statistics
   */
  getStats(): PoolStats {
    const total = this.stats.hitCount + this.stats.missCount;
    return {
      totalAllocated: this.available.length + this.inUse.size,
      available: this.available.length,
      inUse: this.inUse.size,
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
      expansionCount: this.stats.expansionCount,
      hitRate: total > 0 ? this.stats.hitCount / total : 0
    };
  }

  /**
   * Reset statistics (useful for benchmarking)
   */
  resetStats(): void {
    this.stats = { hitCount: 0, missCount: 0, expansionCount: 0 };
  }

  /**
   * Clear pool and reset to minimum size
   * Use sparingly - this affects all in-use objects
   */
  clear(): void {
    // Reset all in-use objects (they're now orphaned)
    for (const obj of this.inUse) {
      this.config.reset(obj);
    }
    this.inUse.clear();

    // Trim to min size
    while (this.available.length > this.config.minSize) {
      const obj = this.available.pop();
      if (obj && typeof (obj as { destroy?: () => void }).destroy === 'function') {
        (obj as { destroy: () => void }).destroy();
      }
    }
  }

  /**
   * Warm up the pool by ensuring minimum size
   */
  warmup(): void {
    const currentSize = this.available.length + this.inUse.size;
    if (currentSize < this.config.minSize) {
      const toCreate = this.config.minSize - currentSize;
      this.preAllocate(toCreate);
      console.log(`[ObjectPool] Warmed up with ${toCreate} objects`);
    }
  }

  /**
   * Check if object is currently managed by this pool
   */
  isManaged(obj: T): boolean {
    return this.inUse.has(obj) || this.available.includes(obj);
  }

  /**
   * Get pool configuration
   */
  getConfig(): Readonly<PoolConfig<T>> {
    return { ...this.config };
  }

  private validateConfig(config: PoolConfig<T>): void {
    if (config.initialSize < 0) {
      throw new Error('initialSize must be >= 0');
    }
    if (config.minSize < 0) {
      throw new Error('minSize must be >= 0');
    }
    if (config.maxSize <= 0) {
      throw new Error('maxSize must be > 0');
    }
    if (config.minSize > config.maxSize) {
      throw new Error('minSize cannot exceed maxSize');
    }
    if (config.initialSize > config.maxSize) {
      throw new Error('initialSize cannot exceed maxSize');
    }
  }

  private preAllocate(count: number): void {
    for (let i = 0; i < count; i++) {
      this.available.push(this.config.factory());
    }
  }

  private expand(): void {
    const currentSize = this.available.length + this.inUse.size;
    const expansionSize = Math.min(
      Math.max(10, Math.floor(currentSize * 0.2)), // 20% growth, min 10
      this.config.maxSize - currentSize
    );

    if (expansionSize > 0) {
      this.preAllocate(expansionSize);
      this.stats.expansionCount++;
      this.config.onExpand?.(currentSize + expansionSize);
    }
  }
}

/**
 * Create a typed object pool with sensible defaults
 */
export function createObjectPool<T>(
  factory: () => T,
  reset: (obj: T) => void,
  options?: {
    initialSize?: number;
    minSize?: number;
    maxSize?: number;
    onExpand?: (newSize: number) => void;
  }
): ObjectPool<T> {
  return new ObjectPool<T>({
    initialSize: options?.initialSize ?? 50,
    minSize: options?.minSize ?? 25,
    maxSize: options?.maxSize ?? 200,
    factory,
    reset,
    onExpand: options?.onExpand
  });
}

/**
 * Pool group for managing multiple pools
 */
export class ObjectPoolGroup {
  private pools = new Map<string, ObjectPool<unknown>>();

  /**
   * Register a pool with a name
   */
  register<T>(name: string, pool: ObjectPool<T>): void {
    this.pools.set(name, pool as ObjectPool<unknown>);
  }

  /**
   * Get a pool by name
   */
  get<T>(name: string): ObjectPool<T> | undefined {
    return this.pools.get(name) as ObjectPool<T> | undefined;
  }

  /**
   * Get stats for all pools
   */
  getAllStats(): Map<string, PoolStats> {
    const stats = new Map<string, PoolStats>();
    for (const [name, pool] of this.pools) {
      stats.set(name, pool.getStats());
    }
    return stats;
  }

  /**
   * Clear all pools
   */
  clearAll(): void {
    for (const pool of this.pools.values()) {
      pool.clear();
    }
  }

  /**
   * Warm up all pools
   */
  warmupAll(): void {
    for (const pool of this.pools.values()) {
      pool.warmup();
    }
  }
}
