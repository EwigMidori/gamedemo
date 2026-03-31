// Spatial Indexing for Efficient Object Queries
// Uses uniform grid (spatial hash) for O(1) insertion and fast range queries

import type { WorldX, WorldY } from "./coordinates";
import type { FrustumBounds } from "./frustumCuller";

/**
 * Object stored in the spatial index
 */
export interface SpatialObject {
  id: string;
  x: WorldX;
  y: WorldY;
  width: number;
  height: number;
}

/**
 * Axis-aligned bounding box for spatial queries
 */
export interface SpatialQueryBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Result of a spatial query with timing metrics
 */
export interface SpatialQueryResult {
  objects: ReadonlyArray<SpatialObject>;
  queryTimeMs: number;
}

/**
 * Performance statistics for the spatial index
 */
export interface SpatialIndexStats {
  objectCount: number;
  cellCount: number;
  averageObjectsPerCell: number;
}

/**
 * Uniform grid spatial index for efficient 2D object queries
 * 
 * Design decisions:
 * - String cell keys (e.g., "3,7") for fast Map lookups in V8
 * - Set for deduplication when objects span multiple cells
 * - Precise AABB intersection test for final filtering
 * - Tracks query time for performance monitoring
 * 
 * Cell size recommendation: 2-4x the average object size
 * For 16px tiles with mixed objects, 64px is a good default
 */
export class SpatialIndex {
  private cells = new Map<string, Set<SpatialObject>>();
  private objectToCells = new Map<string, Set<string>>();
  private readonly cellSize: number;

  /**
   * Create a spatial index with specified cell size
   * @param cellSize - Size of grid cells in pixels (default: 64)
   */
  constructor(cellSize: number = 64) {
    this.cellSize = cellSize;
  }

  /**
   * Insert an object into the spatial index
   * If an object with the same ID exists, it will be removed first
   */
  insert(object: SpatialObject): void {
    this.remove(object.id);

    const cellKeys = this.getCellsForBounds(
      object.x,
      object.y,
      object.width,
      object.height
    );

    const trackedCells = new Set<string>();
    for (const key of cellKeys) {
      let cell = this.cells.get(key);
      if (!cell) {
        cell = new Set();
        this.cells.set(key, cell);
      }
      cell.add(object);
      trackedCells.add(key);
    }

    this.objectToCells.set(object.id, trackedCells);
  }

  /**
   * Remove an object from the spatial index
   * @returns true if object was found and removed, false otherwise
   */
  remove(objectId: string): boolean {
    const cellKeys = this.objectToCells.get(objectId);
    if (!cellKeys) return false;

    for (const key of cellKeys) {
      const cell = this.cells.get(key);
      if (cell) {
        for (const obj of cell) {
          if (obj.id === objectId) {
            cell.delete(obj);
            break;
          }
        }
        if (cell.size === 0) {
          this.cells.delete(key);
        }
      }
    }

    this.objectToCells.delete(objectId);
    return true;
  }

  /**
   * Query all objects intersecting the given bounds
   * Returns deduplicated results with query timing
   */
  query(bounds: SpatialQueryBounds): SpatialQueryResult {
    const startTime = performance.now();
    const results = new Set<SpatialObject>();

    const cellKeys = this.getCellsForBounds(
      bounds.minX,
      bounds.minY,
      bounds.maxX - bounds.minX,
      bounds.maxY - bounds.minY
    );

    for (const key of cellKeys) {
      const cell = this.cells.get(key);
      if (cell) {
        for (const obj of cell) {
          if (this.intersectsBounds(obj, bounds)) {
            results.add(obj);
          }
        }
      }
    }

    return {
      objects: [...results],
      queryTimeMs: performance.now() - startTime
    };
  }

  /**
   * Query objects at a specific point
   * Convenience wrapper around query()
   */
  queryPoint(x: number, y: number): SpatialQueryResult {
    return this.query({
      minX: x,
      minY: y,
      maxX: x,
      maxY: y
    });
  }

  /**
   * Query using FrustumBounds (optimized for camera culling)
   * Converts FrustumBounds to SpatialQueryBounds internally
   */
  queryByBounds(bounds: FrustumBounds): SpatialQueryResult {
    return this.query({
      minX: bounds.left,
      minY: bounds.top,
      maxX: bounds.right,
      maxY: bounds.bottom
    });
  }

  /**
   * Insert multiple objects efficiently
   * Useful for initial world loading
   * @returns Number of objects successfully inserted
   */
  insertBatch(objects: SpatialObject[]): number {
    let inserted = 0;
    for (const obj of objects) {
      this.insert(obj);
      inserted++;
    }
    return inserted;
  }

  /**
   * Get statistics for performance monitoring
   */
  getStats(): SpatialIndexStats {
    let totalObjects = 0;
    for (const cell of this.cells.values()) {
      totalObjects += cell.size;
    }
    return {
      objectCount: this.objectToCells.size,
      cellCount: this.cells.size,
      averageObjectsPerCell: this.cells.size > 0 ? totalObjects / this.cells.size : 0
    };
  }

  /**
   * Clear all objects from the index
   */
  clear(): void {
    this.cells.clear();
    this.objectToCells.clear();
  }

  /**
   * Get all cell keys that overlap with the given bounds
   */
  private getCellsForBounds(x: number, y: number, w: number, h: number): string[] {
    const keys: string[] = [];
    const startCellX = Math.floor(x / this.cellSize);
    const startCellY = Math.floor(y / this.cellSize);
    const endCellX = Math.floor((x + w) / this.cellSize);
    const endCellY = Math.floor((y + h) / this.cellSize);

    for (let cx = startCellX; cx <= endCellX; cx++) {
      for (let cy = startCellY; cy <= endCellY; cy++) {
        keys.push(`${cx},${cy}`);
      }
    }
    return keys;
  }

  /**
   * Check if an object intersects with query bounds (AABB test)
   */
  private intersectsBounds(obj: SpatialObject, bounds: SpatialQueryBounds): boolean {
    return !(
      obj.x + obj.width < bounds.minX ||
      obj.x > bounds.maxX ||
      obj.y + obj.height < bounds.minY ||
      obj.y > bounds.maxY
    );
  }
}
