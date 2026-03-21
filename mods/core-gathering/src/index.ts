import {
  MOD_API_VERSION
} from "@gamedemo/engine-core";
import type { GameModModule } from "@gamedemo/mod-api";
import { GatheringActions } from "./actions";
import { GatheringInteractions } from "./interactions";
import { GatheringProviders } from "./provider";
import { GatheringResolvers } from "./resolver";

export const coreGatheringMod: GameModModule = {
  manifest: {
    id: "core:gathering",
    version: "0.1.0",
    apiVersion: MOD_API_VERSION,
    dependsOn: [{ id: "core:base" }, { id: "core:player" }]
  },
  install(context) {
    context.session.registerBootstrap((state) => {
      state.resources.push(
        { id: "resource-1", resourceId: "resource:tree", x: 8, y: 8, depleted: false },
        { id: "resource-2", resourceId: "resource:stone", x: 11, y: 10, depleted: false },
        { id: "resource-3", resourceId: "resource:tree", x: 14, y: 7, depleted: false },
        { id: "resource-4", resourceId: "resource:tree", x: 18, y: 12, depleted: false },
        { id: "resource-5", resourceId: "resource:stone", x: 21, y: 14, depleted: false },
        { id: "resource-6", resourceId: "resource:tree", x: 24, y: 9, depleted: false },
        { id: "resource-7", resourceId: "resource:stone", x: 27, y: 16, depleted: false },
        { id: "resource-8", resourceId: "resource:tree", x: 30, y: 11, depleted: false },
        { id: "resource-9", resourceId: "resource:tree", x: 16, y: 18, depleted: false },
        { id: "resource-10", resourceId: "resource:stone", x: 22, y: 20, depleted: false },
        { id: "resource-11", resourceId: "resource:tree", x: 28, y: 21, depleted: false },
        { id: "resource-12", resourceId: "resource:stone", x: 33, y: 13, depleted: false }
      );
    });

    context.actions.register(GatheringActions.gatherNearest);
    context.commandResolvers.register(GatheringResolvers.interaction);
    context.worldObjects.register(GatheringProviders.resourceObjects);
    context.worldObjectInteractions.register(GatheringInteractions.resourceActions);
    context.ui.register({
      id: "gathering:status",
      title: "Gathering",
      body: "Move next to resources and use Gather."
    });
  }
};
