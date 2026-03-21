import { MOD_API_VERSION } from "@gamedemo/engine-core";
import type { GameModModule } from "@gamedemo/mod-api";

export const vanillaBundleMod: GameModModule = {
  manifest: {
    id: "bundle:vanilla",
    version: "0.1.0",
    apiVersion: MOD_API_VERSION,
    dependsOn: [
      { id: "core:base" },
      { id: "core:worldgen" },
      { id: "core:ui-hud" },
      { id: "core:inventory" },
      { id: "core:player" },
      { id: "core:gathering" },
      { id: "core:survival" },
      { id: "core:building" },
      { id: "core:crafting" }
    ]
  },
  install(context) {
    context.ui.register({
      id: "bundle:vanilla-summary",
      title: "Vanilla Bundle",
      body: "Default profile composed from first-party core mods."
    });
  }
};
