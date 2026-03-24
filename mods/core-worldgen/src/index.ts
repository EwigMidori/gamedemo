import { MOD_API_VERSION } from "@gamedemo/engine-core";
import type { GameModModule } from "@gamedemo/mod-api";
import { VanillaWorldSeed } from "@gamedemo/vanilla-domain";
import { ExpandingWorldSystem } from "./expandingWorldSystem";

class CoreWorldgenInstaller {
  private readonly seed = new VanillaWorldSeed();

  install(context: Parameters<GameModModule["install"]>[0]): void {
    context.systems.register(ExpandingWorldSystem.create());
    context.worldgen.register({
      id: "core:prototype-noise-world",
      order: 10,
      description: "Fills the world using deterministic terrain noise shaped after the original prototype.",
      generate: (blueprint) => this.seed.fillTerrain(blueprint)
    });
  }
}

const installer = new CoreWorldgenInstaller();

export const coreWorldgenMod: GameModModule = {
  manifest: {
    id: "core:worldgen",
    version: "0.1.0",
    apiVersion: MOD_API_VERSION,
    dependsOn: [{ id: "core:base" }]
  },
  install(context) {
    installer.install(context);
  }
};
