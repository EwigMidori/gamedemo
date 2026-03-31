/**
 * Chunk-based World Streaming System
 * 
 * Manages large worlds (1000×1000+) by dividing into chunks and streaming
 * content around the player. Unloads distant chunks to maintain bounded memory.
 * 
 * Features:
 * - 64×64 tile chunks (configurable)
 * - 5×5 load radius around player (configurable)
 * - Async loading simulation
 * - Distant chunk unloading (>8 chunks away)
 * - Memory usage tracking
 */

import type { WorldX, WorldY } from "./coordinates";

/**
 * Chunk coordinates (chunk grid, not world tiles)
 */
export interface ChunkCoord {
  /** Chunk X coordinate */
  cx: number;
  /** Chunk Y coordinate */
  cy: number;
}

/**
 * Tile data within a chunk
 */
export interface ChunkTile {
  /** Local X within chunk (0 to chunkSize-1) */
  localX: number;
  /** Local Y within chunk (0 to chunkSize-1) */
  localY: number;
  /** Terrain type ID */
  terrainId: string;
}

/**
 * Entity data within a chunk
 */
export interface ChunkEntity {
  id: string;
  type: string;
  localX: number;
  localY: number;
  data?: unknown;
}

/**
 * Chunk data container
 */
export interface Chunk {
  /** Chunk coordinates */
  coord: ChunkCoord;
  /** Tiles in this chunk */
  tiles: ChunkTile[];
  /** Entities in this chunk */
  entities: ChunkEntity[];
  /** Whether chunk is fully loaded */
  loaded: boolean;
  /** Whether chunk is currently loading */
  loading: boolean;
  /** Frame count when last accessed */
  lastAccessed: number;
  /** Estimated memory usage in bytes */
  memoryEstimate: number;
}

/**
 * Chunk manager configuration
 */
export interface ChunkManagerConfig {
  /** Tiles per chunk dimension (default: 64) */
  chunkSize: number;
  /** Chunks to load in each direction (default: 2 = 5×5 grid) */
  loadRadius: number;
  /** Distance to unload chunks (default: 8) */
  unloadDistance: number;
  /** Max concurrent async loads (default: 4) */
  maxConcurrentLoads: number;
}

/**
 * Default chunk manager configuration
 */
export const DEFAULT_CHUNK_CONFIG: ChunkManagerConfig = {
  chunkSize: 64,
  loadRadius: 2,
  unloadDistance: 8,
  maxConcurrentLoads: 4
};

/**
 * Result of chunk update operation
 */
export interface ChunkLoadResult {
  /** Chunks that finished loading this frame */
  loaded: ChunkCoord[];
  /** Chunks that were unloaded this frame */
  unloaded: ChunkCoord[];
  /** Chunks currently loading */
  loading: ChunkCoord[];
}

/**
 * Statistics for chunk manager
 */
export interface ChunkManagerStats {
  /** Number of loaded chunks */
  loadedCount: number;
  /** Number of chunks currently loading */
  loadingCount: number;
  /** Number of chunks in load queue */
  queueLength: number;
  /** Total estimated memory usage in bytes */
  totalMemoryEstimate: number;
  /** Number of chunks loaded this frame */
  chunksLoadedThisFrame: number;
  /** Number of chunks unloaded this frame */
  chunksUnloadedThisFrame: number;
}

/**
 * Chunk generator function type
 */
export type ChunkGenerator = (coord: ChunkCoord, chunkSize: number) => Promise<Chunk>;

/**
 * Default chunk generator (creates empty chunks)
 */
export const defaultChunkGenerator: ChunkGenerator = async (coord, chunkSize) => {
  return {
    coord,
    tiles: [],
    entities: [],
    loaded: true,
    loading: false,
    lastAccessed: 0,
    memoryEstimate: 16 * 1024 // 16KB estimate for empty chunk
  };
};

/**
 * Manages chunked world streaming for large maps
 * 
 * @example
 * ```typescript
 * const chunkManager = new ChunkManager({
 *   chunkSize: 64,
 *   loadRadius: 2,
 *   unloadDistance: 8
 * });
 * 
 * // Each frame, update based on player position
 * const result = chunkManager.update(playerX, playerY);
 * ```
 */
export class ChunkManager {
  private chunks = new Map<string, Chunk>(); // Key: "cx,cy"
  private config: ChunkManagerConfig;
  private frameCount = 0;
  private loadQueue: ChunkCoord[] = [];
  private loading = new Set<string>();
  private chunkGenerator: ChunkGenerator;

  // Stats tracking
  private chunksLoadedThisFrame = 0;
  private chunksUnloadedThisFrame = 0;

  /**
   * Create a new chunk manager
   */
  constructor(
    config?: Partial<ChunkManagerConfig>,
    chunkGenerator?: ChunkGenerator
  ) {
    this.config = { ...DEFAULT_CHUNK_CONFIG, ...config };
    this.chunkGenerator = chunkGenerator ?? defaultChunkGenerator;
  }

  /**
   * Update chunk loading based on player position
   * Call this each frame
   * 
   * @param playerX - Player world X position (in tiles)
   * @param playerY - Player world Y position (in tiles)
   * @returns Result of this update cycle
   */
  update(playerX: number, playerY: number): ChunkLoadResult {
    this.frameCount++;
    this.chunksLoadedThisFrame = 0;
    this.chunksUnloadedThisFrame = 0;

    const playerChunk = this.worldToChunk(playerX, playerY);
    const result: ChunkLoadResult = { loaded: [], unloaded: [], loading: [] };

    // Determine which chunks should be loaded
    const desiredChunks = this.getChunksInRadius(playerChunk);

    // Unload distant chunks
    for (const [key, chunk] of this.chunks) {
      const distance = this.chunkDistance(chunk.coord, playerChunk);

      if (distance > this.config.unloadDistance) {
        this.unloadChunk(chunk);
        result.unloaded.push(chunk.coord);
        this.chunksUnloadedThisFrame++;
      } else {
        // Update last accessed
        chunk.lastAccessed = this.frameCount;
      }
    }

    // Queue new chunks for loading
    for (const coord of desiredChunks) {
      const key = this.chunkKey(coord);
      if (!this.chunks.has(key) && !this.loading.has(key)) {
        this.loadQueue.push(coord);
      }
    }

    // Process load queue (async simulation)
    this.processLoadQueue(result);

    return result;
  }

  /**
   * Convert world tile coordinates to chunk coordinates
   */
  worldToChunk(worldX: number, worldY: number): ChunkCoord {
    return {
      cx: Math.floor(worldX / this.config.chunkSize),
      cy: Math.floor(worldY / this.config.chunkSize)
    };
  }

  /**
   * Convert chunk coordinates to world tile coordinates (top-left)
   */
  chunkToWorld(coord: ChunkCoord): { x: number; y: number } {
    return {
      x: coord.cx * this.config.chunkSize,
      y: coord.cy * this.config.chunkSize
    };
  }

  /**
   * Get chunk if loaded
   */
  getChunk(coord: ChunkCoord): Chunk | undefined {
    return this.chunks.get(this.chunkKey(coord));
  }

  /**
   * Check if chunk is loaded
   */
  isChunkLoaded(coord: ChunkCoord): boolean {
    const chunk = this.chunks.get(this.chunkKey(coord));
    return chunk?.loaded ?? false;
  }

  /**
   * Check if chunk is currently loading
   */
  isChunkLoading(coord: ChunkCoord): boolean {
    return this.loading.has(this.chunkKey(coord));
  }

  /**
   * Get all loaded chunks
   */
  getLoadedChunks(): Chunk[] {
    return [...this.chunks.values()].filter(c => c.loaded);
  }

  /**
   * Get chunks in load radius around a center chunk
   */
  getChunksAround(centerCoord: ChunkCoord): ChunkCoord[] {
    return this.getChunksInRadius(centerCoord);
  }

  /**
   * Force load a specific chunk (for testing/warmup)
   */
  async forceLoadChunk(coord: ChunkCoord): Promise<Chunk> {
    const key = this.chunkKey(coord);

    if (this.chunks.has(key)) {
      return this.chunks.get(key)!;
    }

    const chunk = await this.loadChunkData(coord);
    this.chunks.set(key, chunk);
    this.chunksLoadedThisFrame++;
    return chunk;
  }

  /**
   * Get chunk manager statistics
   */
  getStats(): ChunkManagerStats {
    const loaded = this.getLoadedChunks();
    return {
      loadedCount: loaded.length,
      loadingCount: this.loading.size,
      queueLength: this.loadQueue.length,
      totalMemoryEstimate: loaded.reduce((sum, c) => sum + c.memoryEstimate, 0),
      chunksLoadedThisFrame: this.chunksLoadedThisFrame,
      chunksUnloadedThisFrame: this.chunksUnloadedThisFrame
    };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<ChunkManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ChunkManagerConfig {
    return { ...this.config };
  }

  /**
   * Set chunk generator
   */
  setChunkGenerator(generator: ChunkGenerator): void {
    this.chunkGenerator = generator;
  }

  /**
   * Clear all chunks
   */
  clear(): void {
    this.chunks.clear();
    this.loadQueue = [];
    this.loading.clear();
  }

  /**
   * Preload chunks around a position (for scene startup)
   */
  async preloadAround(worldX: number, worldY: number): Promise<void> {
    const center = this.worldToChunk(worldX, worldY);
    const coords = this.getChunksInRadius(center);

    // Load all chunks in radius
    await Promise.all(
      coords.map(coord => this.forceLoadChunk(coord))
    );
  }

  /**
   * Get total world bounds of all loaded chunks
   */
  getLoadedBounds(): { minX: number; minY: number; maxX: number; maxY: number } | null {
    const loaded = this.getLoadedChunks();
    if (loaded.length === 0) return null;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const chunk of loaded) {
      const world = this.chunkToWorld(chunk.coord);
      minX = Math.min(minX, world.x);
      minY = Math.min(minY, world.y);
      maxX = Math.max(maxX, world.x + this.config.chunkSize);
      maxY = Math.max(maxY, world.y + this.config.chunkSize);
    }

    return { minX, minY, maxX, maxY };
  }

  /**
   * Estimate memory usage for a given world size
   */
  static estimateMemoryForWorld(
    worldWidth: number,
    worldHeight: number,
    chunkSize: number = 64,
    bytesPerTile: number = 16
  ): number {
    const chunksX = Math.ceil(worldWidth / chunkSize);
    const chunksY = Math.ceil(worldHeight / chunkSize);
    const totalChunks = chunksX * chunksY;
    const tilesPerChunk = chunkSize * chunkSize;
    return totalChunks * tilesPerChunk * bytesPerTile;
  }

  private getChunksInRadius(center: ChunkCoord): ChunkCoord[] {
    const coords: ChunkCoord[] = [];
    const r = this.config.loadRadius;

    for (let dx = -r; dx <= r; dx++) {
      for (let dy = -r; dy <= r; dy++) {
        coords.push({ cx: center.cx + dx, cy: center.cy + dy });
      }
    }

    return coords;
  }

  private chunkDistance(a: ChunkCoord, b: ChunkCoord): number {
    return Math.max(Math.abs(a.cx - b.cx), Math.abs(a.cy - b.cy));
  }

  private chunkKey(coord: ChunkCoord): string {
    return `${coord.cx},${coord.cy}`;
  }

  private processLoadQueue(result: ChunkLoadResult): void {
    const toLoad = Math.min(
      this.loadQueue.length,
      this.config.maxConcurrentLoads - this.loading.size
    );

    for (let i = 0; i < toLoad; i++) {
      const coord = this.loadQueue.shift()!;
      const key = this.chunkKey(coord);

      this.loading.add(key);
      result.loading.push(coord);

      // Simulate async load
      this.loadChunkData(coord).then(chunk => {
        this.chunks.set(key, chunk);
        this.loading.delete(key);
        this.chunksLoadedThisFrame++;
        result.loaded.push(coord);
      });
    }
  }

  private async loadChunkData(coord: ChunkCoord): Promise<Chunk> {
    return this.chunkGenerator(coord, this.config.chunkSize);
  }

  private unloadChunk(chunk: Chunk): void {
    const key = this.chunkKey(chunk.coord);
    this.chunks.delete(key);
  }
}

/**
 * Calculate the number of chunks needed for a world size
 */
export function calculateChunkCount(
  worldWidth: number,
  worldHeight: number,
  chunkSize: number
): { chunksX: number; chunksY: number; total: number } {
  const chunksX = Math.ceil(worldWidth / chunkSize);
  const chunksY = Math.ceil(worldHeight / chunkSize);
  return { chunksX, chunksY, total: chunksX * chunksY };
}

/**
 * Calculate chunks in a load radius
 */
export function calculateChunksInRadius(radius: number): number {
  const diameter = radius * 2 + 1;
  return diameter * diameter;
}
