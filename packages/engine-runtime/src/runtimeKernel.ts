import type { GameModManifest } from "@gamedemo/mod-api";
import type { RuntimeProfile } from "@gamedemo/engine-core";
import type { AssembledRuntime } from "./runtimeTypes";
import { RuntimeAssembly } from "./runtimeAssembly";

export const RuntimeKernel = {
  createProfile(manifests: ReadonlyArray<GameModManifest>): RuntimeProfile {
    return RuntimeAssembly.createProfile(manifests);
  },

  async assembleProfile(
    modules: Parameters<typeof RuntimeAssembly.assembleProfile>[0]
  ): Promise<AssembledRuntime> {
    return RuntimeAssembly.assembleProfile(modules);
  }
};
