/**
 * ModTestHarness - Test utilities for mod loading and verification
 * 
 * Provides a test container with mocked registries for isolated mod testing.
 * 
 * @module mod-test-utils/modTestHarness
 */

import type {
  GameModModule,
  ModInstallContext,
  SystemRegistry,
  CommandRegistry,
  CommandResolverRegistry,
  ActionRegistry,
  WorldObjectRegistry,
  WorldObjectInteractionRegistry,
  InventorySelectionRegistry,
  InventoryInteractionRegistry,
  CombinedInteractionRegistry,
  WorldgenRegistry,
  UiRegistry,
  SessionRegistry
} from "@gamedemo/mod-api";
import { ContentRegistry } from "@gamedemo/engine-content";
import type { ContentRegistryBuilder } from "@gamedemo/engine-content";
import type {
  RuntimeSystem,
  RuntimeCommand,
  RuntimeCommandResolver,
  RuntimeAction,
  RuntimeWorldObjectProvider,
  RuntimeWorldObjectInteractionProvider,
  RuntimeInventorySelectionProvider,
  RuntimeInventoryInteractionProvider,
  RuntimeCombinedInteractionProvider,
  WorldgenStage,
  RuntimeUiPanel,
  SessionBootstrapper,
  RuntimeProfileEntry
} from "@gamedemo/engine-core";

// =============================================================================
// Mock Registries
// =============================================================================

interface MockRegistry<T> {
  getRegistrations(): T[];
}

function createMockSystemRegistry(): SystemRegistry & MockRegistry<RuntimeSystem> {
  const registrations: RuntimeSystem[] = [];
  return {
    register(system: RuntimeSystem): void {
      registrations.push(system);
    },
    getRegistrations(): RuntimeSystem[] {
      return [...registrations];
    }
  };
}

function createMockCommandRegistry(): CommandRegistry & MockRegistry<RuntimeCommand> {
  const registrations: RuntimeCommand[] = [];
  return {
    register(command: RuntimeCommand): void {
      registrations.push(command);
    },
    getRegistrations(): RuntimeCommand[] {
      return [...registrations];
    }
  };
}

function createMockResolverRegistry(): CommandResolverRegistry & MockRegistry<RuntimeCommandResolver> {
  const registrations: RuntimeCommandResolver[] = [];
  return {
    register(resolver: RuntimeCommandResolver): void {
      registrations.push(resolver);
    },
    getRegistrations(): RuntimeCommandResolver[] {
      return [...registrations];
    }
  };
}

function createMockActionRegistry(): ActionRegistry & MockRegistry<RuntimeAction> {
  const registrations: RuntimeAction[] = [];
  return {
    register(action: RuntimeAction): void {
      registrations.push(action);
    },
    getRegistrations(): RuntimeAction[] {
      return [...registrations];
    }
  };
}

function createMockWorldObjectRegistry(): WorldObjectRegistry & MockRegistry<RuntimeWorldObjectProvider> {
  const registrations: RuntimeWorldObjectProvider[] = [];
  return {
    register(provider: RuntimeWorldObjectProvider): void {
      registrations.push(provider);
    },
    getRegistrations(): RuntimeWorldObjectProvider[] {
      return [...registrations];
    }
  };
}

function createMockInteractionRegistry(): WorldObjectInteractionRegistry & MockRegistry<RuntimeWorldObjectInteractionProvider> {
  const registrations: RuntimeWorldObjectInteractionProvider[] = [];
  return {
    register(provider: RuntimeWorldObjectInteractionProvider): void {
      registrations.push(provider);
    },
    getRegistrations(): RuntimeWorldObjectInteractionProvider[] {
      return [...registrations];
    }
  };
}

function createMockSelectionRegistry(): InventorySelectionRegistry & MockRegistry<RuntimeInventorySelectionProvider> {
  const registrations: RuntimeInventorySelectionProvider[] = [];
  return {
    register(provider: RuntimeInventorySelectionProvider): void {
      registrations.push(provider);
    },
    getRegistrations(): RuntimeInventorySelectionProvider[] {
      return [...registrations];
    }
  };
}

function createMockInventoryInteractionRegistry(): InventoryInteractionRegistry & MockRegistry<RuntimeInventoryInteractionProvider> {
  const registrations: RuntimeInventoryInteractionProvider[] = [];
  return {
    register(provider: RuntimeInventoryInteractionProvider): void {
      registrations.push(provider);
    },
    getRegistrations(): RuntimeInventoryInteractionProvider[] {
      return [...registrations];
    }
  };
}

function createMockCombinedRegistry(): CombinedInteractionRegistry & MockRegistry<RuntimeCombinedInteractionProvider> {
  const registrations: RuntimeCombinedInteractionProvider[] = [];
  return {
    register(provider: RuntimeCombinedInteractionProvider): void {
      registrations.push(provider);
    },
    getRegistrations(): RuntimeCombinedInteractionProvider[] {
      return [...registrations];
    }
  };
}

function createMockWorldgenRegistry(): WorldgenRegistry & MockRegistry<WorldgenStage> {
  const registrations: WorldgenStage[] = [];
  return {
    register(stage: WorldgenStage): void {
      registrations.push(stage);
    },
    getRegistrations(): WorldgenStage[] {
      return [...registrations];
    }
  };
}

function createMockUiRegistry(): UiRegistry & MockRegistry<RuntimeUiPanel> {
  const registrations: RuntimeUiPanel[] = [];
  return {
    register(panel: RuntimeUiPanel): void {
      registrations.push(panel);
    },
    getRegistrations(): RuntimeUiPanel[] {
      return [...registrations];
    }
  };
}

function createMockSessionRegistry(): SessionRegistry & MockRegistry<SessionBootstrapper> {
  const registrations: SessionBootstrapper[] = [];
  return {
    registerBootstrap(bootstrap: SessionBootstrapper): void {
      registrations.push(bootstrap);
    },
    updateState(): void {
      // No-op for testing
    },
    getRegistrations(): SessionBootstrapper[] {
      return [...registrations];
    }
  };
}

// =============================================================================
// Test Container
// =============================================================================

export interface TestContainer extends ModInstallContext {
  readonly content: ContentRegistryBuilder;
  readonly systems: SystemRegistry & MockRegistry<RuntimeSystem>;
  readonly commands: CommandRegistry & MockRegistry<RuntimeCommand>;
  readonly commandResolvers: CommandResolverRegistry & MockRegistry<RuntimeCommandResolver>;
  readonly actions: ActionRegistry & MockRegistry<RuntimeAction>;
  readonly worldObjects: WorldObjectRegistry & MockRegistry<RuntimeWorldObjectProvider>;
  readonly worldObjectInteractions: WorldObjectInteractionRegistry & MockRegistry<RuntimeWorldObjectInteractionProvider>;
  readonly inventorySelections: InventorySelectionRegistry & MockRegistry<RuntimeInventorySelectionProvider>;
  readonly inventoryInteractions: InventoryInteractionRegistry & MockRegistry<RuntimeInventoryInteractionProvider>;
  readonly combinedInteractions: CombinedInteractionRegistry & MockRegistry<RuntimeCombinedInteractionProvider>;
  readonly worldgen: WorldgenRegistry & MockRegistry<WorldgenStage>;
  readonly ui: UiRegistry & MockRegistry<RuntimeUiPanel>;
  readonly session: SessionRegistry & MockRegistry<SessionBootstrapper>;
}

export type MockRegistryType = 
  | MockRegistry<RuntimeSystem>
  | MockRegistry<RuntimeCommand>
  | MockRegistry<RuntimeCommandResolver>
  | MockRegistry<RuntimeAction>
  | MockRegistry<RuntimeWorldObjectProvider>
  | MockRegistry<RuntimeWorldObjectInteractionProvider>
  | MockRegistry<RuntimeInventorySelectionProvider>
  | MockRegistry<RuntimeInventoryInteractionProvider>
  | MockRegistry<RuntimeCombinedInteractionProvider>
  | MockRegistry<WorldgenStage>
  | MockRegistry<RuntimeUiPanel>
  | MockRegistry<SessionBootstrapper>;

/**
 * Create a test container with mocked registries.
 * 
 * @returns Test container implementing ModInstallContext
 */
export function createTestContainer(profile: RuntimeProfileEntry[] = []): TestContainer {
  const content = ContentRegistry.createBuilder();

  return {
    profile,
    apiVersion: "1.0.0" as const,
    content,
    systems: createMockSystemRegistry(),
    commands: createMockCommandRegistry(),
    commandResolvers: createMockResolverRegistry(),
    actions: createMockActionRegistry(),
    worldObjects: createMockWorldObjectRegistry(),
    worldObjectInteractions: createMockInteractionRegistry(),
    inventorySelections: createMockSelectionRegistry(),
    inventoryInteractions: createMockInventoryInteractionRegistry(),
    combinedInteractions: createMockCombinedRegistry(),
    worldgen: createMockWorldgenRegistry(),
    ui: createMockUiRegistry(),
    session: createMockSessionRegistry()
  };
}

// =============================================================================
// Mod Test Harness
// =============================================================================

export interface LoadResult {
  mod: GameModModule;
  success: boolean;
  error?: Error;
}

/**
 * Test harness for loading and verifying mods.
 * 
 * Usage:
 * ```typescript
 * const harness = new ModTestHarness();
 * await harness.loadMod("./mods/my-mod/src/index.ts");
 * const content = harness.getRegisteredContent();
 * ```
 */
export class ModTestHarness {
  private container: TestContainer;
  private loadedMods: Map<string, GameModModule> = new Map();
  private errors: Error[] = [];

  constructor(profile: RuntimeProfileEntry[] = []) {
    this.container = createTestContainer(profile);
  }

  /**
   * Load a mod module.
   * 
   * @param modulePath - Path to mod module
   * @returns Promise resolving when mod is loaded
   * @throws Error if mod fails to load
   */
  async loadMod(modulePath: string): Promise<void> {
    try {
      const mod = await import(modulePath);
      const modModule: GameModModule = mod.default || mod[Object.keys(mod)[0]];

      if (!modModule || !modModule.manifest || !modModule.install) {
        throw new Error(`Invalid mod module at ${modulePath}: missing manifest or install`);
      }

      await modModule.install(this.container);
      this.loadedMods.set(modModule.manifest.id, modModule);
    } catch (e) {
      const error = e as Error;
      this.errors.push(error);
      throw error;
    }
  }

  /**
   * Get the test container.
   * 
   * @returns Test container with all registries
   */
  getContainer(): TestContainer {
    return this.container;
  }

  /**
   * Get registered content snapshot.
   * 
   * @returns Content snapshot from content registry
   */
  getRegisteredContent() {
    return this.container.content.snapshot();
  }

  /**
   * Get all registered visual packs.
   * 
   * @returns Array of visual pack metadata
   */
  getVisualPacks() {
    return this.container.content.getAllVisualPacks();
  }

  /**
   * Get visual pack for specific content ID.
   * 
   * @param contentId - Content ID to look up
   * @returns Visual pack metadata or undefined
   */
  getVisualPack(contentId: string) {
    return this.container.content.getVisualPack(contentId);
  }

  /**
   * Get all captured errors.
   * 
   * @returns Array of errors caught during loading
   */
  getErrors(): Error[] {
    return [...this.errors];
  }

  /**
   * Check if a mod was loaded successfully.
   * 
   * @param modId - Mod ID to check
   * @returns True if mod is loaded
   */
  hasMod(modId: string): boolean {
    return this.loadedMods.has(modId);
  }

  /**
   * Get loaded mod by ID.
   * 
   * @param modId - Mod ID
   * @returns Game mod module or undefined
   */
  getMod(modId: string): GameModModule | undefined {
    return this.loadedMods.get(modId);
  }

  /**
   * Get all loaded mod IDs.
   * 
   * @returns Array of loaded mod IDs
   */
  getLoadedModIds(): string[] {
    return [...this.loadedMods.keys()];
  }

  /**
   * Clear all loaded mods and errors.
   */
  clear(): void {
    this.loadedMods.clear();
    this.errors = [];
  }
}
