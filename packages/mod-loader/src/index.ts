import type { GameModModule } from "@gamedemo/mod-api";

export interface RuntimeProfileDefinition {
  id: string;
  label: string;
  rootMods: string[];
  description?: string;
}

export type WorkspaceModCatalog = Record<string, GameModModule>;
export type ExternalModCatalog = Record<string, GameModModule>;

interface ExternalModModuleLike {
  default?: GameModModule | { manifest: GameModModule["manifest"]; install: GameModModule["install"] };
  manifest?: GameModModule["manifest"];
  install?: GameModModule["install"];
  mod?: GameModModule;
}

function normalizeExternalModule(
  sourceUrl: string,
  moduleValue: ExternalModModuleLike
): GameModModule {
  if (moduleValue.mod) return moduleValue.mod;
  if (
    moduleValue.default &&
    typeof moduleValue.default === "object" &&
    "manifest" in moduleValue.default &&
    "install" in moduleValue.default
  ) {
    return moduleValue.default as GameModModule;
  }
  if (moduleValue.manifest && moduleValue.install) {
    return {
      manifest: moduleValue.manifest,
      install: moduleValue.install
    };
  }

  throw new Error(`External mod ${sourceUrl} does not export a valid GameModModule.`);
}

export const ModCatalogs = {
  createWorkspace(modules: ReadonlyArray<GameModModule>): WorkspaceModCatalog {
    return Object.fromEntries(modules.map((module) => [module.manifest.id, module]));
  },

  merge(...catalogs: Array<Record<string, GameModModule>>): WorkspaceModCatalog {
    const merged: WorkspaceModCatalog = {};

    for (const catalog of catalogs) {
      for (const [id, module] of Object.entries(catalog)) {
        if (merged[id]) {
          throw new Error(`Duplicate mod id in merged catalog: ${id}`);
        }
        merged[id] = module;
      }
    }

    return merged;
  },

  resolveProfileModules(
    catalog: WorkspaceModCatalog,
    profile: RuntimeProfileDefinition
  ): GameModModule[] {
    const resolved: GameModModule[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const visit = (modId: string): void => {
      if (visited.has(modId)) return;
      if (visiting.has(modId)) {
        throw new Error(`Profile ${profile.id} contains circular dependency at ${modId}`);
      }

      const module = catalog[modId];
      if (!module) {
        throw new Error(`Profile ${profile.id} references unknown mod ${modId}`);
      }

      visiting.add(modId);
      for (const dependency of module.manifest.dependsOn ?? []) {
        visit(dependency.id);
      }
      visiting.delete(modId);
      visited.add(modId);
      resolved.push(module);
    };

    for (const modId of profile.rootMods) {
      visit(modId);
    }

    return resolved;
  },

  createExternal(modules: ReadonlyArray<GameModModule>): ExternalModCatalog {
    return this.createWorkspace(modules);
  }
};

export const RuntimeProfiles = {
  getDefinition(
    profiles: ReadonlyArray<RuntimeProfileDefinition>,
    profileId: string
  ): RuntimeProfileDefinition {
    const profile = profiles.find((entry) => entry.id === profileId);
    if (!profile) {
      throw new Error(`Unknown runtime profile: ${profileId}`);
    }
    return profile;
  }
};

export const ExternalMods = {
  async load(urls: ReadonlyArray<string>): Promise<GameModModule[]> {
    const modules: GameModModule[] = [];

    for (const url of urls) {
      const trimmed = url.trim();
      if (!trimmed) continue;
      const imported = await import(/* @vite-ignore */ trimmed) as ExternalModModuleLike;
      modules.push(normalizeExternalModule(trimmed, imported));
    }

    return modules;
  }
};
