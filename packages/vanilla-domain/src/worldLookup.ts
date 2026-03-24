import type {
  ContentSnapshot,
  ResourceDef,
  RuntimeSessionState,
  StructureDef,
  TerrainDef,
  WorldBlueprint,
  WorldTile
} from "@gamedemo/engine-core";

const worldTileIndexKey = Symbol("worldTileIndex");
const contentIndexKey = Symbol("contentIndex");

interface WorldTileIndexCache {
  tileMap: Map<string, WorldTile>;
  indexedTileCount: number;
}

interface ContentIndexCache {
  terrainMap: Map<string, TerrainDef>;
  resourceMap: Map<string, ResourceDef>;
  structureMap: Map<string, StructureDef>;
}

type WorldWithCache = WorldBlueprint & { [worldTileIndexKey]?: WorldTileIndexCache };
type ContentWithCache = ContentSnapshot & { [contentIndexKey]?: ContentIndexCache };

export class VanillaWorldLookup {
  static tileAt(world: WorldBlueprint, x: number, y: number): WorldTile | null {
    const cache = this.ensureWorldCache(world);
    return cache.tileMap.get(this.tileKey(x, y)) ?? null;
  }

  static terrainAt(
    content: ContentSnapshot,
    state: RuntimeSessionState,
    x: number,
    y: number
  ): TerrainDef | null {
    const tile = this.tileAt(state.world, x, y);
    if (!tile) {
      return null;
    }
    return this.ensureContentCache(content).terrainMap.get(tile.terrainId) ?? null;
  }

  static resourceDef(content: ContentSnapshot, resourceId: string): ResourceDef | null {
    return this.ensureContentCache(content).resourceMap.get(resourceId) ?? null;
  }

  static structureDef(content: ContentSnapshot, structureId: string): StructureDef | null {
    return this.ensureContentCache(content).structureMap.get(structureId) ?? null;
  }

  private static ensureWorldCache(world: WorldBlueprint): WorldTileIndexCache {
    const cachedWorld = world as WorldWithCache;
    const cache = cachedWorld[worldTileIndexKey] ?? {
      tileMap: new Map<string, WorldTile>(),
      indexedTileCount: 0
    };
    if (cache.indexedTileCount < world.tiles.length) {
      for (let index = cache.indexedTileCount; index < world.tiles.length; index += 1) {
        const tile = world.tiles[index];
        cache.tileMap.set(this.tileKey(tile.x, tile.y), tile);
      }
      cache.indexedTileCount = world.tiles.length;
    }
    cachedWorld[worldTileIndexKey] = cache;
    return cache;
  }

  private static ensureContentCache(content: ContentSnapshot): ContentIndexCache {
    const cachedContent = content as ContentWithCache;
    if (cachedContent[contentIndexKey]) {
      return cachedContent[contentIndexKey];
    }
    const cache: ContentIndexCache = {
      terrainMap: new Map(content.terrains.map((entry) => [entry.id, entry])),
      resourceMap: new Map(content.resources.map((entry) => [entry.id, entry])),
      structureMap: new Map(content.structures.map((entry) => [entry.id, entry]))
    };
    cachedContent[contentIndexKey] = cache;
    return cache;
  }

  private static tileKey(x: number, y: number): string {
    return `${x},${y}`;
  }
}
