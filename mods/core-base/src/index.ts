import { MOD_API_VERSION } from "@gamedemo/engine-core";
import type { GameModModule } from "@gamedemo/mod-api";
import { VanillaCatalog, VanillaInventory } from "@gamedemo/vanilla-domain";

class CoreBaseInstaller {
  private readonly catalog = new VanillaCatalog();

  install(context: Parameters<GameModModule["install"]>[0]): void {
    this.catalog.register(context.content);
    this.registerCommands(context);
    context.session.registerBootstrap((state) => {
      const itemIndex = new Map(context.content.snapshot().items.map((entry) => [entry.id, entry]));
      state.inventory = [];
      const inventory = new VanillaInventory(state.inventory, itemIndex);
      inventory.normalizeSize(12);
      inventory.add("core:wood", 20);
      inventory.add("core:stone", 8);
      inventory.add("core:food", 10);
      state.needs.hunger = 100;
      state.needs.health = 100;
      state.logs.push("Frontier colony bootstrapped.");
    });
  }

  private registerCommands(context: Parameters<GameModModule["install"]>[0]): void {
    context.systems.register({
      id: "core:bootstrap-clock",
      phase: "simulation",
      description: "Establishes the shared simulation phase for prototype gameplay."
    });
    context.systems.register({
      id: "core:render-prep",
      phase: "renderPrepare",
      description: "Prepares stable runtime data for Phaser presentation."
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
  }
}

const installer = new CoreBaseInstaller();

export const coreBaseMod: GameModModule = {
  manifest: {
    id: "core:base",
    version: "0.1.0",
    apiVersion: MOD_API_VERSION
  },
  install(context) {
    installer.install(context);
  }
};
