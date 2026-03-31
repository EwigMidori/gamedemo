// Coordinate System Types for Pseudo-3D Rendering
// Provides type-safe coordinate spaces to prevent mixing tile and world coordinates

// =============================================================================
// Branded Type Definitions
// =============================================================================

/**
 * Branded type for tile X coordinate (grid-based integer)
 * Prevents accidental mixing with world coordinates at compile time
 */
export type TileX = number & { readonly __brand: 'tileX' };

/**
 * Branded type for tile Y coordinate (grid-based integer)
 * Prevents accidental mixing with world coordinates at compile time
 */
export type TileY = number & { readonly __brand: 'tileY' };

/**
 * Grid-based integer coordinates for tile positions
 * Use factory function tileCoord() to create
 */
export interface TileCoord {
  readonly x: TileX;
  readonly y: TileY;
}

/**
 * Branded type for world X coordinate (pixel-based float)
 * Prevents accidental mixing with tile coordinates at compile time
 */
export type WorldX = number & { readonly __brand: 'worldX' };

/**
 * Branded type for world Y coordinate (pixel-based float)
 * Prevents accidental mixing with tile coordinates at compile time
 */
export type WorldY = number & { readonly __brand: 'worldY' };

/**
 * Pixel-based float coordinates for world positions
 * Use factory function worldCoord() to create
 */
export interface WorldCoord {
  readonly x: WorldX;
  readonly y: WorldY;
}

/**
 * Normalized depth value for pseudo-3D sorting (0 to 1 range)
 * 0 = furthest back, 1 = closest to camera
 * Use factory function depthValue() to create with validation
 */
export type DepthValue = number & { readonly __brand: 'depth' };

// =============================================================================
// Anchor Point Types
// =============================================================================

/**
 * Sprite anchor point configuration
 * Values are in normalized 0-1 range relative to sprite dimensions
 */
export interface AnchorPoint {
  readonly x: number;
  readonly y: number;
}

/**
 * Standard bottom-center anchor for pseudo-3D sprites
 * Origin at bottom center aligns gameplay position with visual position
 * for natural depth sorting based on Y-coordinate
 */
export const ANCHOR_BOTTOM_CENTER: AnchorPoint = { x: 0.5, y: 1.0 };

/**
 * Standard center anchor for traditional sprites
 * Origin at center of sprite
 */
export const ANCHOR_CENTER: AnchorPoint = { x: 0.5, y: 0.5 };

/**
 * Top-left anchor for UI elements
 */
export const ANCHOR_TOP_LEFT: AnchorPoint = { x: 0.0, y: 0.0 };

/**
 * Bottom-left anchor for ground-aligned UI
 */
export const ANCHOR_BOTTOM_LEFT: AnchorPoint = { x: 0.0, y: 1.0 };

// =============================================================================
// Tile Size Type
// =============================================================================

/**
 * Tile size wrapper for type-safe tile/world conversions
 */
export interface TileSize {
  readonly value: number;
}

/**
 * Create a TileSize instance
 * @param value - Size in pixels (must be positive)
 * @returns TileSize instance
 */
export function createTileSize(value: number): TileSize {
  if (value <= 0) {
    throw new Error(`TileSize must be positive, got ${value}`);
  }
  return { value };
}

/**
 * Default tile size (16 pixels)
 */
export const DEFAULT_TILE_SIZE: TileSize = createTileSize(16);

/**
 * Phaser default tile size (16 pixels) - alias for semantic clarity
 */
export const PHASER_DEFAULT_TILE_SIZE: TileSize = createTileSize(16);

// =============================================================================
// World Bounds Type
// =============================================================================

/**
 * World bounds for depth normalization calculations
 */
export interface WorldBounds {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a TileX branded value
 * @param value - Integer tile X coordinate
 */
export function tileX(value: number): TileX {
  return value as TileX;
}

/**
 * Create a TileY branded value
 * @param value - Integer tile Y coordinate
 */
export function tileY(value: number): TileY {
  return value as TileY;
}

/**
 * Create a WorldX branded value
 * @param value - Float world X coordinate in pixels
 */
export function worldX(value: number): WorldX {
  return value as WorldX;
}

/**
 * Create a WorldY branded value
 * @param value - Float world Y coordinate in pixels
 */
export function worldY(value: number): WorldY {
  return value as WorldY;
}

/**
 * Create a TileCoord from raw numbers
 * @param x - Tile X coordinate (integer)
 * @param y - Tile Y coordinate (integer)
 * @returns Branded TileCoord
 */
export function tileCoord(x: number, y: number): TileCoord {
  return { x: tileX(x), y: tileY(y) };
}

/**
 * Create a WorldCoord from raw numbers
 * @param x - World X coordinate in pixels (float)
 * @param y - World Y coordinate in pixels (float)
 * @returns Branded WorldCoord
 */
export function worldCoord(x: number, y: number): WorldCoord {
  return { x: worldX(x), y: worldY(y) };
}

/**
 * Create a DepthValue with validation
 * Depth values must be in 0-1 range (normalized depth for sorting)
 * @param value - Depth value (0 = back, 1 = front)
 * @returns Branded DepthValue
 * @throws Error if value is outside 0-1 range
 */
export function depthValue(value: number): DepthValue {
  if (value < 0 || value > 1) {
    throw new Error(`DepthValue must be in range [0, 1], got ${value}`);
  }
  return value as DepthValue;
}

// =============================================================================
// Coordinate Conversion Utilities
// =============================================================================

/**
 * Coordinate conversion utilities namespace
 * Provides type-safe conversions between tile and world coordinate spaces
 */
export const CoordinateConverters = {
  /**
   * Convert TileCoord to WorldCoord (center of tile by default)
   * @param tile - Tile coordinate to convert
   * @param tileSize - Size of tiles in pixels
   * @param options - Optional configuration
   * @param options.center - If true (default), returns center of tile; if false, returns top-left corner
   * @returns World coordinate in pixels
   */
  tileToWorld(
    tile: TileCoord,
    tileSize: TileSize,
    options?: { center?: boolean }
  ): WorldCoord {
    const offset = options?.center !== false ? tileSize.value * 0.5 : 0;
    return worldCoord(
      tile.x * tileSize.value + offset,
      tile.y * tileSize.value + offset
    );
  },

  /**
   * Convert WorldCoord to TileCoord (floors to tile grid)
   * @param world - World coordinate in pixels
   * @param tileSize - Size of tiles in pixels
   * @returns Tile coordinate (grid indices)
   */
  worldToTile(world: WorldCoord, tileSize: TileSize): TileCoord {
    return tileCoord(
      Math.floor(world.x / tileSize.value),
      Math.floor(world.y / tileSize.value)
    );
  },

  /**
   * Calculate normalized depth value from world position
   * Used for pseudo-3D depth sorting
   * @param world - World coordinate
   * @param heightOffset - Additional height offset (e.g., for tall objects)
   * @param worldBounds - Bounds of the world for normalization
   * @returns Normalized depth value (0 = back/far, 1 = front/near)
   */
  worldToDepth(
    world: WorldCoord,
    heightOffset: number,
    worldBounds: WorldBounds
  ): DepthValue {
    // Depth = y + heightOffset, normalized to 0-1
    const rawDepth = world.y + heightOffset;
    const range = worldBounds.maxY - worldBounds.minY;
    if (range === 0) {
      return depthValue(0.5);
    }
    const normalized = (rawDepth - worldBounds.minY) / range;
    return depthValue(Math.max(0, Math.min(1, normalized)));
  },

  /**
   * Apply anchor point offset to world position
   * Adjusts world position based on sprite anchor for proper placement
   * @param world - Base world position (gameplay position)
   * @param spriteHeight - Height of the sprite in pixels
   * @param anchor - Anchor point configuration
   * @returns Adjusted world position for sprite placement
   */
  applyAnchorOffset(
    world: WorldCoord,
    spriteHeight: number,
    anchor: AnchorPoint
  ): WorldCoord {
    // Adjust world position based on anchor point
    // Bottom-center (0.5, 1.0): no offset needed - origin at bottom
    // Center (0.5, 0.5): offset up by half height
    const offsetY = (anchor.y - 1.0) * spriteHeight;
    return worldCoord(world.x, world.y + offsetY);
  },

  /**
   * Calculate distance between two world coordinates
   * @param a - First world coordinate
   * @param b - Second world coordinate
   * @returns Distance in pixels
   */
  worldDistance(a: WorldCoord, b: WorldCoord): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  },

  /**
   * Calculate Manhattan distance between two tile coordinates
   * @param a - First tile coordinate
   * @param b - Second tile coordinate
   * @returns Manhattan distance in tiles
   */
  tileManhattanDistance(a: TileCoord, b: TileCoord): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  },

  /**
   * Check if two tile coordinates are equal
   * @param a - First tile coordinate
   * @param b - Second tile coordinate
   * @returns True if coordinates are equal
   */
  tileEquals(a: TileCoord, b: TileCoord): boolean {
    return a.x === b.x && a.y === b.y;
  },

  /**
   * Check if two world coordinates are equal (exact match)
   * @param a - First world coordinate
   * @param b - Second world coordinate
   * @returns True if coordinates are exactly equal
   */
  worldEquals(a: WorldCoord, b: WorldCoord): boolean {
    return a.x === b.x && a.y === b.y;
  },

  /**
   * Round world coordinate to nearest tile center
   * @param world - World coordinate
   * @param tileSize - Size of tiles in pixels
   * @returns World coordinate at center of nearest tile
   */
  worldToTileCenter(world: WorldCoord, tileSize: TileSize): WorldCoord {
    const tile = CoordinateConverters.worldToTile(world, tileSize);
    return CoordinateConverters.tileToWorld(tile, tileSize, { center: true });
  },
};

// =============================================================================
// Utility Types
// =============================================================================

/**
 * Type guard to check if value is a valid TileCoord
 */
export function isTileCoord(value: unknown): value is TileCoord {
  return (
    typeof value === 'object' &&
    value !== null &&
    'x' in value &&
    'y' in value &&
    typeof (value as TileCoord).x === 'number' &&
    typeof (value as TileCoord).y === 'number'
  );
}

/**
 * Type guard to check if value is a valid WorldCoord
 */
export function isWorldCoord(value: unknown): value is WorldCoord {
  return (
    typeof value === 'object' &&
    value !== null &&
    'x' in value &&
    'y' in value &&
    typeof (value as WorldCoord).x === 'number' &&
    typeof (value as WorldCoord).y === 'number'
  );
}

/**
 * Clone a TileCoord
 */
export function cloneTileCoord(tile: TileCoord): TileCoord {
  return tileCoord(tile.x, tile.y);
}

/**
 * Clone a WorldCoord
 */
export function cloneWorldCoord(world: WorldCoord): WorldCoord {
  return worldCoord(world.x, world.y);
}

/**
 * Add offset to TileCoord
 */
export function tileCoordAdd(tile: TileCoord, dx: number, dy: number): TileCoord {
  return tileCoord(tile.x + dx, tile.y + dy);
}

/**
 * Add offset to WorldCoord
 */
export function worldCoordAdd(world: WorldCoord, dx: number, dy: number): WorldCoord {
  return worldCoord(world.x + dx, world.y + dy);
}
