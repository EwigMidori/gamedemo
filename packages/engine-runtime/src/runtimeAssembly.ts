import {
  ContentRegistry,
  type ContentRegistryBuilder
} from "@gamedemo/engine-content";
import {
  MOD_API_VERSION,
  type RuntimeAction,
  type RuntimeCombinedInteractionProvider,
  type RuntimeCommand,
  type RuntimeCommandResolver,
  type RuntimeInventoryInteractionProvider,
  type RuntimeInventorySelectionProvider,
  type RuntimeProfile,
  type RuntimeProfileEntry,
  type RuntimeSessionState,
  type RuntimeSystem,
  type RuntimeUiPanel,
  type RuntimeWorldObjectInteractionProvider,
  type RuntimeWorldObjectProvider,
  type SessionBootstrapper,
  type WorldgenStage
} from "@gamedemo/engine-core";
import type {
  GameModManifest,
  GameModModule,
  ModInstallContext
} from "@gamedemo/mod-api";
import type { AssembledRuntime } from "./runtimeTypes";
import { RuntimeSessionFactory } from "./runtimeSessionFactory";

class RuntimeSystemRegistry {
  private readonly entries: RuntimeSystem[] = [];
  register(system: RuntimeSystem): void {
    if (this.entries.some((entry) => entry.id === system.id)) {
      throw new Error(`Duplicate runtime system id registered: ${system.id}`);
    }
    this.entries.push(system);
  }
  snapshot(): RuntimeSystem[] {
    return [...this.entries];
  }
}

class RuntimeCommandRegistry {
  private readonly entries: RuntimeCommand[] = [];
  register(command: RuntimeCommand): void {
    if (this.entries.some((entry) => entry.id === command.id)) {
      throw new Error(`Duplicate runtime command id registered: ${command.id}`);
    }
    this.entries.push(command);
  }
  snapshot(): RuntimeCommand[] {
    return [...this.entries];
  }
}

class RuntimeCommandResolverRegistry {
  private readonly entries: RuntimeCommandResolver[] = [];
  register(resolver: RuntimeCommandResolver): void {
    if (this.entries.some((entry) => entry.id === resolver.id)) {
      throw new Error(`Duplicate runtime command resolver id registered: ${resolver.id}`);
    }
    this.entries.push(resolver);
  }
  snapshot(): RuntimeCommandResolver[] {
    return [...this.entries];
  }
}

class RuntimeActionRegistry {
  private readonly entries: RuntimeAction[] = [];
  register(action: RuntimeAction): void {
    if (this.entries.some((entry) => entry.id === action.id)) {
      throw new Error(`Duplicate runtime action id registered: ${action.id}`);
    }
    this.entries.push(action);
  }
  snapshot(): RuntimeAction[] {
    return [...this.entries];
  }
}

class RuntimeWorldObjectRegistry {
  private readonly entries: RuntimeWorldObjectProvider[] = [];
  register(provider: RuntimeWorldObjectProvider): void {
    if (this.entries.some((entry) => entry.id === provider.id)) {
      throw new Error(`Duplicate runtime world object provider id registered: ${provider.id}`);
    }
    this.entries.push(provider);
  }
  snapshot(): RuntimeWorldObjectProvider[] {
    return [...this.entries];
  }
}

class RuntimeWorldObjectInteractionRegistry {
  private readonly entries: RuntimeWorldObjectInteractionProvider[] = [];
  register(provider: RuntimeWorldObjectInteractionProvider): void {
    if (this.entries.some((entry) => entry.id === provider.id)) {
      throw new Error(`Duplicate runtime world object interaction id registered: ${provider.id}`);
    }
    this.entries.push(provider);
  }
  snapshot(): RuntimeWorldObjectInteractionProvider[] {
    return [...this.entries];
  }
}

class RuntimeInventorySelectionRegistry {
  private readonly entries: RuntimeInventorySelectionProvider[] = [];
  register(provider: RuntimeInventorySelectionProvider): void {
    if (this.entries.some((entry) => entry.id === provider.id)) {
      throw new Error(`Duplicate runtime inventory selection id registered: ${provider.id}`);
    }
    this.entries.push(provider);
  }
  snapshot(): RuntimeInventorySelectionProvider[] {
    return [...this.entries];
  }
}

class RuntimeInventoryInteractionRegistry {
  private readonly entries: RuntimeInventoryInteractionProvider[] = [];
  register(provider: RuntimeInventoryInteractionProvider): void {
    if (this.entries.some((entry) => entry.id === provider.id)) {
      throw new Error(`Duplicate runtime inventory interaction id registered: ${provider.id}`);
    }
    this.entries.push(provider);
  }
  snapshot(): RuntimeInventoryInteractionProvider[] {
    return [...this.entries];
  }
}

class RuntimeCombinedInteractionRegistry {
  private readonly entries: RuntimeCombinedInteractionProvider[] = [];
  register(provider: RuntimeCombinedInteractionProvider): void {
    if (this.entries.some((entry) => entry.id === provider.id)) {
      throw new Error(`Duplicate runtime combined interaction id registered: ${provider.id}`);
    }
    this.entries.push(provider);
  }
  snapshot(): RuntimeCombinedInteractionProvider[] {
    return [...this.entries];
  }
}

class RuntimeWorldgenRegistry {
  private readonly entries: WorldgenStage[] = [];
  register(stage: WorldgenStage): void {
    if (this.entries.some((entry) => entry.id === stage.id)) {
      throw new Error(`Duplicate worldgen stage id registered: ${stage.id}`);
    }
    this.entries.push(stage);
  }
  snapshot(): WorldgenStage[] {
    return [...this.entries].sort((left, right) => left.order - right.order);
  }
}

class RuntimeUiRegistry {
  private readonly entries: RuntimeUiPanel[] = [];
  register(panel: RuntimeUiPanel): void {
    if (this.entries.some((entry) => entry.id === panel.id)) {
      throw new Error(`Duplicate UI panel id registered: ${panel.id}`);
    }
    this.entries.push(panel);
  }
  snapshot(): RuntimeUiPanel[] {
    return [...this.entries];
  }
}

class RuntimeSessionRegistry {
  private readonly bootstraps: SessionBootstrapper[] = [];
  private readonly eagerMutators: Array<(state: RuntimeSessionState) => void> = [];
  registerBootstrap(bootstrap: SessionBootstrapper): void {
    this.bootstraps.push(bootstrap);
  }
  updateState(mutator: (state: RuntimeSessionState) => void): void {
    this.eagerMutators.push(mutator);
  }
  createInitialState(): RuntimeSessionState {
    const state: RuntimeSessionState = {
      timeSeconds: 0,
      day: 1,
      world: { originX: 0, originY: 0, width: 0, height: 0, tiles: [] },
      player: {
        x: 3,
        y: 3,
        movementInput: {
          up: false,
          left: false,
          down: false,
          right: false,
          facing: "down",
          sprintFacing: null,
          sprintUntil: 0,
          lastTapAt: {
            up: Number.NEGATIVE_INFINITY,
            left: Number.NEGATIVE_INFINITY,
            down: Number.NEGATIVE_INFINITY,
            right: Number.NEGATIVE_INFINITY
          }
        },
        motion: null,
        moveTarget: null,
        movePath: []
      },
      needs: { hunger: 100, health: 100 },
      inventory: [],
      resources: [],
      placedStructures: [],
      plantedResources: [],
      droppedItems: [],
      logs: []
    };

    for (const bootstrap of this.bootstraps) bootstrap(state);
    for (const mutator of this.eagerMutators) mutator(state);
    return state;
  }
}

function toProfileEntry(manifest: GameModManifest): RuntimeProfileEntry {
  return { id: manifest.id, version: manifest.version };
}

function createProfile(manifests: ReadonlyArray<GameModManifest>): RuntimeProfile {
  return { mods: manifests.map(toProfileEntry) };
}

function createInstallContext(
  profile: RuntimeProfile,
  content: ContentRegistryBuilder,
  systems: RuntimeSystemRegistry,
  commands: RuntimeCommandRegistry,
  commandResolvers: RuntimeCommandResolverRegistry,
  actions: RuntimeActionRegistry,
  worldObjects: RuntimeWorldObjectRegistry,
  worldObjectInteractions: RuntimeWorldObjectInteractionRegistry,
  inventorySelections: RuntimeInventorySelectionRegistry,
  inventoryInteractions: RuntimeInventoryInteractionRegistry,
  combinedInteractions: RuntimeCombinedInteractionRegistry,
  worldgen: RuntimeWorldgenRegistry,
  ui: RuntimeUiRegistry,
  session: RuntimeSessionRegistry
): ModInstallContext {
  return {
    profile: profile.mods,
    apiVersion: MOD_API_VERSION,
    content,
    systems,
    commands,
    commandResolvers,
    actions,
    worldObjects,
    worldObjectInteractions,
    inventorySelections,
    inventoryInteractions,
    combinedInteractions,
    worldgen,
    ui,
    session
  };
}

function resolveModuleOrder(modules: ReadonlyArray<GameModModule>): GameModModule[] {
  const byId = new Map<string, GameModModule>();
  for (const module of modules) {
    if (byId.has(module.manifest.id)) {
      throw new Error(`Duplicate mod id detected: ${module.manifest.id}`);
    }
    byId.set(module.manifest.id, module);
  }

  const resolved: GameModModule[] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (module: GameModModule): void => {
    const modId = module.manifest.id;
    if (visited.has(modId)) return;
    if (visiting.has(modId)) {
      throw new Error(`Circular mod dependency detected at ${modId}`);
    }

    visiting.add(modId);
    for (const dependency of module.manifest.dependsOn ?? []) {
      const required = byId.get(dependency.id);
      if (!required) {
        throw new Error(`Mod ${modId} requires missing dependency ${dependency.id}`);
      }
      visit(required);
    }
    visiting.delete(modId);
    visited.add(modId);
    resolved.push(module);
  };

  for (const module of [...modules].sort((left, right) => left.manifest.id.localeCompare(right.manifest.id))) {
    visit(module);
  }

  return resolved;
}

async function assembleProfile(
  modules: ReadonlyArray<GameModModule>
): Promise<AssembledRuntime> {
  const orderedModules = resolveModuleOrder(modules);
  const manifests = orderedModules.map((module) => module.manifest);
  const profile = createProfile(manifests);
  const content = ContentRegistry.createBuilder();
  const systems = new RuntimeSystemRegistry();
  const commands = new RuntimeCommandRegistry();
  const commandResolvers = new RuntimeCommandResolverRegistry();
  const actions = new RuntimeActionRegistry();
  const worldObjects = new RuntimeWorldObjectRegistry();
  const worldObjectInteractions = new RuntimeWorldObjectInteractionRegistry();
  const inventorySelections = new RuntimeInventorySelectionRegistry();
  const inventoryInteractions = new RuntimeInventoryInteractionRegistry();
  const combinedInteractions = new RuntimeCombinedInteractionRegistry();
  const worldgen = new RuntimeWorldgenRegistry();
  const ui = new RuntimeUiRegistry();
  const session = new RuntimeSessionRegistry();
  const context = createInstallContext(
    profile,
    content,
    systems,
    commands,
    commandResolvers,
    actions,
    worldObjects,
    worldObjectInteractions,
    inventorySelections,
    inventoryInteractions,
    combinedInteractions,
    worldgen,
    ui,
    session
  );

  for (const module of orderedModules) {
    if (module.manifest.apiVersion !== MOD_API_VERSION) {
      throw new Error(
        `Mod ${module.manifest.id} targets api ${module.manifest.apiVersion}, expected ${MOD_API_VERSION}`
      );
    }
    await module.install(context);
  }

  const contentSnapshot = content.snapshot();
  const systemsSnapshot = systems.snapshot();
  const actionsSnapshot = actions.snapshot();
  const commandsSnapshot = commands.snapshot();
  const worldgenSnapshot = worldgen.snapshot();
  const uiSnapshot = ui.snapshot();

  return {
    profile,
    manifests,
    content: contentSnapshot,
    systems: systemsSnapshot,
    actions: actionsSnapshot,
    commands: commandsSnapshot,
    worldgen: worldgenSnapshot,
    uiPanels: uiSnapshot,
    createSession(initialState?: RuntimeSessionState) {
      return RuntimeSessionFactory.create({
        profile,
        manifests,
        content: contentSnapshot,
        systems: systemsSnapshot,
        actions: actionsSnapshot,
        commands: commandsSnapshot,
        worldgen: worldgenSnapshot,
        uiPanels: uiSnapshot,
        sessionRegistry: session,
        commandResolvers: commandResolvers.snapshot(),
        worldObjects: worldObjects.snapshot(),
        worldObjectInteractions: worldObjectInteractions.snapshot(),
        inventorySelections: inventorySelections.snapshot(),
        inventoryInteractions: inventoryInteractions.snapshot(),
        combinedInteractions: combinedInteractions.snapshot(),
        initialState
      });
    }
  };
}

export const RuntimeAssembly = {
  createProfile,
  assembleProfile
};
