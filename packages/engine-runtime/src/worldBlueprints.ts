import type {
  WorldBlueprint,
  WorldTile
} from "@gamedemo/engine-core";
import type { AssembledRuntime } from "./runtimeTypes";

function createEmpty(
  width: number,
  height: number,
  fallbackTerrainId: string
): WorldBlueprint {
  const tiles: WorldTile[] = [];

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      tiles.push({ x, y, terrainId: fallbackTerrainId });
    }
  }

  return { width, height, tiles };
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
