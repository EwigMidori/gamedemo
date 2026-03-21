import { MOD_API_VERSION, type WorldBlueprint } from "@gamedemo/engine-core";
import type { GameModModule } from "@gamedemo/mod-api";

function withTerrain(
  blueprint: WorldBlueprint,
  matcher: (x: number, y: number) => boolean,
  terrainId: string
): WorldBlueprint {
  return {
    ...blueprint,
    tiles: blueprint.tiles.map((tile) =>
      matcher(tile.x, tile.y) ? { ...tile, terrainId } : tile
    )
  };
}

export const coreWorldgenMod: GameModModule = {
  manifest: {
    id: "core:worldgen",
    version: "0.1.0",
    apiVersion: MOD_API_VERSION,
    dependsOn: [{ id: "core:base" }]
  },
  install(context) {
    context.content.registerTerrain({
      id: "core:sand",
      label: "Sand",
      walkable: true,
      tags: ["ground", "shore"]
    });

    context.worldgen.register({
      id: "core:shoreline-layout",
      order: 10,
      description: "Creates the first deterministic shoreline preview layout.",
      generate(blueprint) {
        let next = withTerrain(
          blueprint,
          (_x, y) => y > Math.floor(blueprint.height * 0.7),
          "core:water"
        );

        next = withTerrain(
          next,
          (_x, y) => y === Math.floor(blueprint.height * 0.7),
          "core:sand"
        );

        next = withTerrain(
          next,
          (x, y) =>
            y < Math.floor(blueprint.height * 0.7) &&
            (x + y) % 7 === 0,
          "core:sand"
        );

        return next;
      }
    });
  }
};
