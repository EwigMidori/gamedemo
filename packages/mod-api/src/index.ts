import type { ContentRegistryBuilder } from "@gamedemo/engine-content";
import type {
  MOD_API_VERSION,
  RuntimeAction,
  RuntimeCombinedInteractionProvider,
  RuntimeCommand,
  RuntimeCommandResolver,
  RuntimeInventoryInteractionProvider,
  RuntimeInventorySelectionProvider,
  RuntimeProfileEntry,
  RuntimeSessionState,
  RuntimeSystem,
  RuntimeUiPanel,
  RuntimeWorldObjectInteractionProvider,
  RuntimeWorldObjectProvider,
  SessionBootstrapper,
  WorldgenStage
} from "@gamedemo/engine-core";

export interface ModDependency {
  id: string;
  versionRange?: string;
}

export interface GameModManifest extends RuntimeProfileEntry {
  apiVersion: string;
  dependsOn?: ModDependency[];
  optionalDependsOn?: ModDependency[];
  loadBefore?: string[];
  loadAfter?: string[];
}

export interface SystemRegistry {
  register(system: RuntimeSystem): void;
}

export interface CommandRegistry {
  register(command: RuntimeCommand): void;
}

export interface CommandResolverRegistry {
  register(resolver: RuntimeCommandResolver): void;
}

export interface ActionRegistry {
  register(action: RuntimeAction): void;
}

export interface WorldObjectRegistry {
  register(provider: RuntimeWorldObjectProvider): void;
}

export interface WorldObjectInteractionRegistry {
  register(provider: RuntimeWorldObjectInteractionProvider): void;
}

export interface InventorySelectionRegistry {
  register(provider: RuntimeInventorySelectionProvider): void;
}

export interface InventoryInteractionRegistry {
  register(provider: RuntimeInventoryInteractionProvider): void;
}

export interface CombinedInteractionRegistry {
  register(provider: RuntimeCombinedInteractionProvider): void;
}

export interface WorldgenRegistry {
  register(stage: WorldgenStage): void;
}

export interface UiRegistry {
  register(panel: RuntimeUiPanel): void;
}

export interface SessionRegistry {
  registerBootstrap(bootstrap: SessionBootstrapper): void;
  updateState(mutator: (state: RuntimeSessionState) => void): void;
}

export interface ModInstallContext {
  readonly profile: ReadonlyArray<RuntimeProfileEntry>;
  readonly apiVersion: typeof MOD_API_VERSION;
  readonly content: ContentRegistryBuilder;
  readonly systems: SystemRegistry;
  readonly commands: CommandRegistry;
  readonly commandResolvers: CommandResolverRegistry;
  readonly actions: ActionRegistry;
  readonly worldObjects: WorldObjectRegistry;
  readonly worldObjectInteractions: WorldObjectInteractionRegistry;
  readonly inventorySelections: InventorySelectionRegistry;
  readonly inventoryInteractions: InventoryInteractionRegistry;
  readonly combinedInteractions: CombinedInteractionRegistry;
  readonly worldgen: WorldgenRegistry;
  readonly ui: UiRegistry;
  readonly session: SessionRegistry;
}

export interface GameModModule {
  manifest: GameModManifest;
  install(context: ModInstallContext): void | Promise<void>;
}
