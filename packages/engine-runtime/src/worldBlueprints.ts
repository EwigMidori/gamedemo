import type {
  WorldBlueprint,
  WorldTile
} from "@gamedemo/engine-core";
import type { AssembledRuntime } from "./runtimeTypes";

function createEmpty(
  width: number,
  height: number,
  fallbackTerrainId: string,
  originX = -Math.floor(width * 0.5),
  originY = -Math.floor(height * 0.5)
): WorldBlueprint {
  const tiles: WorldTile[] = [];

  for (let localY = 0; localY < height; localY += 1) {
    for (let localX = 0; localX < width; localX += 1) {
      tiles.push({ x: originX + localX, y: originY + localY, terrainId: fallbackTerrainId });
    }
  }

  return { originX, originY, width, height, tiles };
}

function build(
  runtime: AssembledRuntime,
  width = 24,
  height = 14
): WorldBlueprint {
  const fallbackTerrainId = runtime.content.terrains[0]?.id ?? "core:void";
  let blueprint = createEmpty(width, height, fallbackTerrainId);

  for (const stage of runtime.worldgen) {
    blueprint = stage.generate(blueprint);
  }

  return blueprint;
}

export const RuntimeWorldBlueprints = {
  createEmpty,
  build
};
