import { MOD_API_VERSION } from "@gamedemo/engine-core";
import type { GameModModule } from "@gamedemo/mod-api";

export const coreBaseMod: GameModModule = {
  manifest: {
    id: "core:base",
    version: "0.1.0",
    apiVersion: MOD_API_VERSION
  },
  install(context) {
    context.content.registerItem({
      id: "core:wood",
      label: "Wood",
      stackSize: 99,
      tags: ["resource", "material"]
    });

    context.content.registerItem({
      id: "core:stone",
      label: "Stone",
      stackSize: 99,
      tags: ["resource", "material"]
    });

    context.content.registerStructure({
      id: "core:campfire",
      label: "Campfire",
      blocksMovement: true,
      tags: ["station", "light-source"]
    });

    context.content.registerTerrain({
      id: "core:grass",
      label: "Grass",
      walkable: true,
      tags: ["ground", "outdoor"]
    });

    context.content.registerTerrain({
      id: "core:water",
      label: "Water",
      walkable: false,
      tags: ["ground", "liquid"]
    });

    context.systems.register({
      id: "core:bootstrap-clock",
      phase: "simulation",
      description: "Establishes the first shared simulation phase for core mods."
    });

    context.systems.register({
      id: "core:render-prep",
      phase: "renderPrepare",
      description: "Prepares stable runtime data for host-side rendering adapters."
    });

    context.commands.register({
      id: "core:open-command-palette",
      label: "Open command palette",
      binding: "KeyK"
    });

    context.commands.register({
      id: "core:confirm-pointer-action",
      label: "Confirm pointer action",
      binding: "MouseRight"
    });

    context.session.registerBootstrap((state) => {
      state.inventory.push(
        { itemId: "core:wood", quantity: 6 },
        { itemId: "core:stone", quantity: 4 }
      );
      state.logs.push("Core base inventory seeded.");
    });
  }
};
