import type { SpatialObject } from "./spatialIndex";

/**
 * Frustum bounds in world coordinates
 */
export interface FrustumBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * Result of frustum culling operation with performance metrics
 */
export interface CullingResult {
  visibleObjects: SpatialObject[];
  totalChecked: number;
  visibleCount: number;
  cullTimeMs: number;
}

/**
 * Frustum culler for efficient visibility testing
 * 
 * Uses configurable margin to prevent objects popping at screen edges.
 * Margin is applied as a percentage of frustum dimensions (0.1 = 10%).
 * 
 * Performance target: < 0.05ms for 1000 objects
 */
export class FrustumCuller {
  private margin: number;
  private lastCullTimeMs = 0;

  /**
   * Create a frustum culler with specified margin
   * @param margin - Margin as percentage of frustum size (default: 0.1 = 10%)
   */
  constructor(margin: number = 0.1) {
    this.margin = Math.max(0, margin);
  }

  /**
   * Cull objects against the frustum bounds
   * @param objects - All objects to test
   * @param cameraView - Camera frustum bounds
   * @returns Culling result with visible objects and metrics
   */
  cull(objects: SpatialObject[], cameraView: FrustumBounds): CullingResult {
    const startTime = performance.now();
    const expandedBounds = this.expandBounds(cameraView);
    
    const visibleObjects: SpatialObject[] = [];
    
    for (const obj of objects) {
      if (this.intersectsFrustum(obj, expandedBounds)) {
        visibleObjects.push(obj);
      }
    }
    
    this.lastCullTimeMs = performance.now() - startTime;
    
    return {
      visibleObjects,
      totalChecked: objects.length,
      visibleCount: visibleObjects.length,
      cullTimeMs: this.lastCullTimeMs
    };
  }

  /**
   * Test if a single point is visible in the frustum
   * @param worldX - World X coordinate
   * @param worldY - World Y coordinate
   * @param cameraView - Camera frustum bounds
   * @returns true if visible
   */
  isVisible(worldX: number, worldY: number, cameraView: FrustumBounds): boolean {
    const expandedBounds = this.expandBounds(cameraView);
    return (
      worldX >= expandedBounds.left &&
      worldX <= expandedBounds.right &&
      worldY >= expandedBounds.top &&
      worldY <= expandedBounds.bottom
    );
  }

  /**
   * Test if an object is visible in the frustum
   * @param obj - Object to test
   * @param cameraView - Camera frustum bounds
   * @returns true if visible
   */
  isObjectVisible(obj: SpatialObject, cameraView: FrustumBounds): boolean {
    return this.intersectsFrustum(obj, this.expandBounds(cameraView));
  }

  /**
   * Get current culler configuration and stats
   */
  getStats(): { margin: number; lastCullTimeMs: number } {
    return {
      margin: this.margin,
      lastCullTimeMs: this.lastCullTimeMs
    };
  }

  /**
   * Update the margin setting
   */
  setMargin(margin: number): void {
    this.margin = Math.max(0, margin);
  }

  /**
   * Get current margin
   */
  getMargin(): number {
    return this.margin;
  }

  /**
   * Expand bounds by the configured margin
   */
  private expandBounds(bounds: FrustumBounds): FrustumBounds {
    const width = bounds.right - bounds.left;
    const height = bounds.bottom - bounds.top;
    const marginX = width * this.margin;
    const marginY = height * this.margin;

    return {
      left: bounds.left - marginX,
      right: bounds.right + marginX,
      top: bounds.top - marginY,
      bottom: bounds.bottom + marginY
    };
  }

  /**
   * Test AABB intersection with frustum bounds
   */
  private intersectsFrustum(obj: SpatialObject, bounds: FrustumBounds): boolean {
    // AABB intersection test
    return !(
      obj.x + obj.width < bounds.left ||
      obj.x > bounds.right ||
      obj.y + obj.height < bounds.top ||
      obj.y > bounds.bottom
    );
  }
}

/**
 * Create frustum bounds from camera world view (Phaser camera format)
 * Properly handles camera zoom for correct visibility calculations.
 */
export function createFrustumBoundsFromCamera(
  worldView: { x: number; y: number; width: number; height: number },
  zoom: number = 1
): FrustumBounds {
  // Adjust bounds based on zoom level
  // When zoom < 1 (zoomed out), we see more of the world
  // When zoom > 1 (zoomed in), we see less
  const adjustedWidth = worldView.width / zoom;
  const adjustedHeight = worldView.height / zoom;
  
  return {
    left: worldView.x,
    right: worldView.x + adjustedWidth,
    top: worldView.y,
    bottom: worldView.y + adjustedHeight
  };
}

/**
 * Convert tile coordinates to frustum bounds for tile-based culling
 */
export function createFrustumBoundsFromTiles(
  leftTile: number,
  topTile: number,
  rightTile: number,
  bottomTile: number,
  tileSize: number
): FrustumBounds {
  return {
    left: leftTile * tileSize,
    right: (rightTile + 1) * tileSize,
    top: topTile * tileSize,
    bottom: (bottomTile + 1) * tileSize
  };
}
