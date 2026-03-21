import { MOD_API_VERSION } from "@gamedemo/engine-core";
import type { GameModModule } from "@gamedemo/mod-api";

export const coreUiHudMod: GameModModule = {
  manifest: {
    id: "core:ui-hud",
    version: "0.1.0",
    apiVersion: MOD_API_VERSION,
    dependsOn: [{ id: "core:base" }, { id: "core:worldgen" }]
  },
  install(context) {
    context.ui.register({
      id: "core:session-status",
      title: "Session",
      body: `${context.profile.length} core mods resolved`
    });

    context.ui.register({
      id: "core:controls",
      title: "Controls",
      body: "RMB confirms the primary action. KeyK opens the command palette."
    });
  }
};
