import type { RuntimeSystem, RuntimeSessionState, RuntimeAction } from "@gamedemo/engine-core";
import { RuntimeWorldBlueprints } from "./worldBlueprints";
import type { AssembledRuntime } from "./runtimeTypes";

/**
 * System for dynamic world generation
 * Monitors player position and expands world when approaching boundaries
 */
export const WorldGenerationSystem: RuntimeSystem = {
  id: "runtime:world-generation",
  
  update(deltaTime: number, state: RuntimeSessionState): void {
    const world = state.world;
    const playerX = state.player.x;
    const playerY = state.player.y;
    
    // Expansion threshold - expand when player is within 60 tiles of boundary
    // This accounts for maximum zoom (0.5x) where visible range is ~40+ tiles
    const EXPANSION_THRESHOLD = 60;
    // Expansion size - add 48 tiles in each direction (2x visible range)
    const EXPANSION_SIZE = 48;
    
    let needsExpansion = false;
    let newOriginX = world.originX;
    let newOriginY = world.originY;
    let newWidth = world.width;
    let newHeight = world.height;
    
    // Check left boundary
    if (playerX - world.originX < EXPANSION_THRESHOLD) {
      newOriginX -= EXPANSION_SIZE;
      newWidth += EXPANSION_SIZE;
      needsExpansion = true;
    }
    
    // Check right boundary
    if (world.originX + world.width - playerX < EXPANSION_THRESHOLD) {
      newWidth += EXPANSION_SIZE;
      needsExpansion = true;
    }
    
    // Check top boundary
    if (playerY - world.originY < EXPANSION_THRESHOLD) {
      newOriginY -= EXPANSION_SIZE;
      newHeight += EXPANSION_SIZE;
      needsExpansion = true;
    }
    
    // Check bottom boundary
    if (world.originY + world.height - playerY < EXPANSION_THRESHOLD) {
      newHeight += EXPANSION_SIZE;
      needsExpansion = true;
    }
    
    if (needsExpansion) {
      expandWorld(state, newOriginX, newOriginY, newWidth, newHeight);
    }
  }
};

/**
 * Expand the world by generating new terrain in the expanded area
 */
function expandWorld(
  state: RuntimeSessionState,
  newOriginX: number,
  newOriginY: number,
  newWidth: number,
  newHeight: number
): void {
  const oldWorld = state.world;
  const oldTiles = new Map(oldWorld.tiles.map(t => [`${t.x},${t.y}`, t]));
  
  // Create new tiles for expanded area
  const newTiles: typeof oldWorld.tiles = [];
  const fallbackTerrainId = oldWorld.tiles[0]?.terrainId ?? "core:grass";
  
  for (let y = newOriginY; y < newOriginY + newHeight; y++) {
    for (let x = newOriginX; x < newOriginX + newWidth; x++) {
      const key = `${x},${y}`;
      const existingTile = oldTiles.get(key);
      
      if (existingTile) {
        // Keep existing tile
        newTiles.push(existingTile);
      } else {
        // Generate new tile using noise-based generation
        const terrainId = generateTerrainForPosition(x, y, fallbackTerrainId);
        newTiles.push({ x, y, terrainId });
      }
    }
  }
  
  // Update world
  state.world = {
    ...oldWorld,
    originX: newOriginX,
    originY: newOriginY,
    width: newWidth,
    height: newHeight,
    tiles: newTiles
  };
  
  console.log('[World Expanded]', {
    from: { originX: oldWorld.originX, originY: oldWorld.originY, width: oldWorld.width, height: oldWorld.height },
    to: { originX: newOriginX, originY: newOriginY, width: newWidth, height: newHeight },
    newTilesAdded: newTiles.length - oldWorld.tiles.length
  });
}

/**
 * Generate terrain type for a position using simple noise
 */
function generateTerrainForPosition(x: number, y: number, fallback: string): string {
  // Simple noise function based on coordinates
  const noise = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  const value = noise - Math.floor(noise);
  
  // Determine terrain based on noise value
  if (value < 0.6) return "core:grass";
  if (value < 0.75) return "core:dirt";
  if (value < 0.9) return "core:sand";
  return "core:water";
}
