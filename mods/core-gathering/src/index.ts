import { MOD_API_VERSION } from "@gamedemo/engine-core";
import type { GameModModule } from "@gamedemo/mod-api";
import { VanillaWorldSeed } from "@gamedemo/vanilla-domain";
import { GatheringActions } from "./actions";
import { GatheringInteractions } from "./interactions";
import { GatheringProviders } from "./provider";
import { GatheringResolvers } from "./resolver";
import { GatheringSystems } from "./system";

class CoreGatheringInstaller {
  private readonly seed = new VanillaWorldSeed();

  install(context: Parameters<GameModModule["install"]>[0]): void {
    context.systems.register({
      id: "gathering:initial-resource-seed",
      phase: "simulation",
      description: "Seeds prototype resources once the generated world is available.",
      run: ({ state }) => {
        if (state.world.tiles.length === 0 || state.resources.length > 0) {
          return;
        }
        this.seed.seedResources(state);
      }
    });
    context.systems.register(GatheringSystems.resourceRespawn);
    context.systems.register(GatheringSystems.dropMotion);
    context.systems.register(GatheringSystems.dropCollection);
    context.systems.register(GatheringSystems.plantedResourceGrowth);
    context.actions.register(GatheringActions.gatherNearest);
    context.actions.register(GatheringActions.plantSelectedItem);
    context.actions.register(GatheringActions.breakResource);
    context.commandResolvers.register(GatheringResolvers.interaction);
    context.worldObjects.register(GatheringProviders.resourceObjects);
    context.worldObjects.register(GatheringProviders.gatherTileObjects);
    context.worldObjectInteractions.register(GatheringInteractions.resourceActions);
    context.worldObjectInteractions.register(GatheringInteractions.plantTileActions);
    context.ui.register({
      id: "gathering:status",
      title: "Gathering",
      body: "Original prototype resources are now seeded procedurally across the world."
    });
  }
}

const installer = new CoreGatheringInstaller();

export const coreGatheringMod: GameModModule = {
  manifest: {
    id: "core:gathering",
    version: "0.1.0",
    apiVersion: MOD_API_VERSION,
    dependsOn: [{ id: "core:base" }, { id: "core:player" }, { id: "core:worldgen" }]
  },
  install(context) {
    installer.install(context);
  }
};
